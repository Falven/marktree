import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { guessLanguageByExtension } from '../lang.js';
import { runInWorker } from '../run-in-worker.js';
import type {
  ReadFilesAction,
  ReadFilesResult,
  ScanAndReadDirectoryAction,
  ScanAndReadDirectoryResult,
} from '../schema.js';

export const copyMdTreeAndContents =
  (context: vscode.ExtensionContext, outputChannel: vscode.OutputChannel) =>
  async (uri: vscode.Uri) => {
    if (!uri) {
      outputChannel.appendLine(
        'No file or folder selected for copyMdTreeAndContents.'
      );
      vscode.window.showErrorMessage('No file or folder selected.');
      return;
    }

    outputChannel.appendLine(`copyMdTreeAndContents invoked on: ${uri.fsPath}`);
    const stats = fs.statSync(uri.fsPath);

    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      const message = 'No workspace folder found.';
      outputChannel.appendLine(message);
      vscode.window.showErrorMessage(message);
      return;
    }

    if (stats.isDirectory()) {
      const payload: ScanAndReadDirectoryAction = {
        action: 'scanAndReadDirectory',
        dir: uri.fsPath,
        workspaceRoot: workspaceFolders[0].uri.fsPath,
        ignoredPaths: context.globalState.get<Set<string> | undefined>(
          'marktree.ignoredPaths',
          undefined
        ),
      };
      const { treeLines, files, fileResults } =
        await runInWorker<ScanAndReadDirectoryResult>(
          payload,
          context,
          outputChannel
        );

      outputChannel.appendLine(
        `Found ${files.length} file(s) in directory for tree and contents.`
      );

      // Add the tree
      const treeOutput = treeLines.join('\n');
      let markdown = `\`\`\`sh\n${treeOutput}\n\`\`\`\n\n`;

      // Add file contents only if we have files
      // (If no files, we just don't add anything)
      for (const r of fileResults) {
        const relPath = path.relative(uri.fsPath, r.file);
        const lang = guessLanguageByExtension(r.file);
        if (r.error) {
          // Log error, but do not add to markdown
          outputChannel.appendLine(`Error reading ${relPath}: ${r.error}`);
        } else if (r.content !== null) {
          markdown += `${relPath}\n\`\`\`${lang}\n${r.content}\n\`\`\`\n\n`;
        }
      }

      await vscode.env.clipboard.writeText(markdown);
      outputChannel.appendLine(
        'Markdown tree and contents copied to clipboard.'
      );
      vscode.window.showInformationMessage(
        'Markdown tree and contents copied to clipboard!'
      );
    } else {
      const payload: ReadFilesAction = {
        action: 'readFiles',
        files: [uri.fsPath],
        workspaceRoot: workspaceFolders[0].uri.fsPath,
        ignoredPaths: context.globalState.get<Set<string> | undefined>(
          'marktree.ignoredPaths',
          undefined
        ),
      };
      const { results } = await runInWorker<ReadFilesResult>(
        payload,
        context,
        outputChannel
      );

      const r = results[0];
      if (r.error) {
        outputChannel.appendLine(`Error from worker: ${r.error}`);
        vscode.window.showErrorMessage(`Error from worker: ${r.error}`);
        return;
      }

      const lang = guessLanguageByExtension(uri.fsPath);

      await vscode.env.clipboard.writeText(
        `${path.basename(uri.fsPath)}\n\`\`\`${lang}\n${r.content}\n\`\`\``
      );
      outputChannel.appendLine(
        `File contents for ${uri.fsPath} copied to clipboard (tree and contents mode).`
      );
      vscode.window.showInformationMessage(
        'File contents copied to clipboard!'
      );
    }
  };
