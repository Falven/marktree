import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { guessLanguageByExtension } from '../lang';
import { runInWorker } from '../run-in-worker.js';

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

      const stats = fs.statSync(uri.fsPath);
      outputChannel.appendLine(
        `copyMdTreeAndContents invoked on: ${uri.fsPath}`
      );

      if (stats.isDirectory()) {
        // Single call for both tree and contents
        const { treeLines, files, fileResults } = await runInWorker(
          { action: 'scanAndReadDirectory', dir: uri.fsPath },
          context
        );

        outputChannel.appendLine(
          `Found ${files.length} file(s) in directory for tree and contents.`
        );

        const treeOutput = treeLines.join('\n');
        const lines: string[] = [];
        lines.push(`\`\`\`sh\n${treeOutput}\n\`\`\`\n\n`);

        if (files.length === 0) {
          outputChannel.appendLine(
            'No files found in the directory for tree and contents.'
          );
          lines.push('No files found in this directory.\n');
        } else {
          for (const r of fileResults) {
            const relPath = path.relative(uri.fsPath, r.file);
            const lang = guessLanguageByExtension(r.file) || 'plaintext';
            if (r.error) {
              lines.push(`Error reading ${relPath}: ${r.error}\n`);
            } else if (r.content !== null) {
              lines.push(`${relPath}\n\`\`\`${lang}\n${r.content}\n\`\`\`\n\n`);
            }
          }
        }

        const markdown = lines.join('');
        await vscode.env.clipboard.writeText(markdown);
        outputChannel.appendLine(
          'Markdown tree and contents copied to clipboard.'
        );
        vscode.window.showInformationMessage(
          'Markdown tree and contents copied to clipboard!'
        );
      } else {
        // Single file scenario: just read it directly
        const results = await runInWorker(
          { action: 'readFiles', files: [uri.fsPath] },
          context
        );
        const r = results[0];
        if (r.error) {
          outputChannel.appendLine(`Error from worker: ${r.error}`);
          vscode.window.showErrorMessage(`Error from worker: ${r.error}`);
          return;
        }
        const lang = guessLanguageByExtension(uri.fsPath) || 'plaintext';
        const markdownContents = `${path.basename(
          uri.fsPath
        )}\n\`\`\`${lang}\n${r.content}\n\`\`\``;
        await vscode.env.clipboard.writeText(markdownContents);
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
