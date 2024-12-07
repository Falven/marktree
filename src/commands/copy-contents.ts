import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { guessLanguageByExtension } from '../lang.js';
import { runInWorker } from '../run-in-worker.js';

export const registerCopyMdContents = (
  context: vscode.ExtensionContext,
  outputChannel: vscode.OutputChannel
) => {
  const copyMdContents = vscode.commands.registerCommand(
    'extension.copyMdContents',
    async (uri: vscode.Uri) => {
      if (!uri) {
        outputChannel.appendLine(
          'No file or folder selected for copyMdContents.'
        );
        vscode.window.showErrorMessage('No file or folder selected.');
        return;
      }

      const stats = fs.statSync(uri.fsPath);
      outputChannel.appendLine(`copyMdContents invoked on: ${uri.fsPath}`);

      if (stats.isDirectory()) {
        const { files } = await runInWorker(
          { action: 'scanDirectory', dir: uri.fsPath },
          context
        );
        outputChannel.appendLine(
          `Found ${files.length} file(s) in directory. Spawning worker to read files...`
        );

        try {
          const results = await runInWorker(
            { action: 'readFiles', files },
            context
          );
          let markdown = '';
          for (const r of results) {
            if (r.error) {
              markdown += `Error reading ${r.file}: ${r.error}\n`;
            } else if (r.content !== null) {
              const relPath = path.relative(uri.fsPath, r.file);
              const lang = guessLanguageByExtension(r.file) || 'plaintext';
              markdown += `${relPath}\n\`\`\`${lang}\n${r.content}\n\`\`\`\n\n`;
            }
          }

          await vscode.env.clipboard.writeText(markdown);
          outputChannel.appendLine(
            'All file contents copied to clipboard (via worker).'
          );
          vscode.window.showInformationMessage(
            'All file contents copied to clipboard!'
          );
        } catch (err: any) {
          outputChannel.appendLine(`Error from worker: ${err.message}`);
          vscode.window.showErrorMessage(`Error from worker: ${err.message}`);
        }
      } else {
        try {
          const results = await runInWorker(
            { action: 'readFiles', files: [uri.fsPath] },
            context
          );
          const r = results[0];
          if (r.error) {
            throw new Error(r.error);
          }
          const lang = guessLanguageByExtension(uri.fsPath) || 'plaintext';
          const markdownContents = `${path.basename(
            uri.fsPath
          )}\n\`\`\`${lang}\n${r.content}\n\`\`\``;
          await vscode.env.clipboard.writeText(markdownContents);
          outputChannel.appendLine(
            `File contents for ${uri.fsPath} copied to clipboard (via worker).`
          );
          vscode.window.showInformationMessage(
            'File contents copied to clipboard!'
          );
        } catch (error: any) {
          outputChannel.appendLine(
            `Error from worker (single file): ${error.message}`
          );
          vscode.window.showErrorMessage(`Error from worker: ${error.message}`);
        }
      }
    }
  );

  context.subscriptions.push(copyMdContents);
};
