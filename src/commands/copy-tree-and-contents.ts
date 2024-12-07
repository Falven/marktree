import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { guessLanguageByExtension } from '../lang.js';
import { runInWorker } from '../run-in-worker.js';
import type {
  WorkerReadFilesResult,
  WorkerScanAndReadDirectoryResult,
} from '../types.js';

export const registerCopyMdTreeAndContents = (
  context: vscode.ExtensionContext,
  outputChannel: vscode.OutputChannel
) => {
  const copyMdTreeAndContents = vscode.commands.registerCommand(
    'extension.copyMdTreeAndContents',
    async (uri: vscode.Uri) => {
      if (!uri) {
        outputChannel.appendLine(
          'No file or folder selected for copyMdTreeAndContents.'
        );
        vscode.window.showErrorMessage('No file or folder selected.');
        return;
      }

      outputChannel.appendLine(
        `copyMdTreeAndContents invoked on: ${uri.fsPath}`
      );
      const stats = fs.statSync(uri.fsPath);

      let markdown = '';

      if (stats.isDirectory()) {
        const { treeLines, files, fileResults } =
          await runInWorker<WorkerScanAndReadDirectoryResult>(
            { action: 'scanAndReadDirectory', dir: uri.fsPath },
            context
          );

        outputChannel.appendLine(
          `Found ${files.length} file(s) in directory for tree and contents.`
        );

        // Add the tree
        const treeOutput = treeLines.join('\n');
        markdown += `\`\`\`sh\n${treeOutput}\n\`\`\`\n\n`;

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
        const { results } = await runInWorker<WorkerReadFilesResult>(
          { action: 'readFiles', files: [uri.fsPath] },
          context
        );

        const r = results[0];
        if (r.error) {
          outputChannel.appendLine(`Error from worker: ${r.error}`);
          vscode.window.showErrorMessage(`Error from worker: ${r.error}`);
          return;
        }

        const lang = guessLanguageByExtension(uri.fsPath);
        markdown += `${path.basename(uri.fsPath)}\n\`\`\`${lang}\n${
          r.content
        }\n\`\`\``;

        await vscode.env.clipboard.writeText(markdown);
        outputChannel.appendLine(
          `File contents for ${uri.fsPath} copied to clipboard (tree and contents mode).`
        );
        vscode.window.showInformationMessage(
          'File contents copied to clipboard!'
        );
      }
    }
  );

  context.subscriptions.push(copyMdTreeAndContents);
};
