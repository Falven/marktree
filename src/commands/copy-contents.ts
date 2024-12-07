import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { guessLanguageByExtension } from '../lang.js';
import { runInWorker } from '../run-in-worker.js';
import type {
  WorkerReadFilesResult,
  WorkerScanDirectoryResult,
} from '../types.js';

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

      outputChannel.appendLine(`copyMdContents invoked on: ${uri.fsPath}`);
      const stats = fs.statSync(uri.fsPath);

      let files: string[];
      if (stats.isDirectory()) {
        const { files: scannedFiles } =
          await runInWorker<WorkerScanDirectoryResult>(
            { action: 'scanDirectory', dir: uri.fsPath },
            context
          );
        outputChannel.appendLine(
          `Found ${scannedFiles.length} file(s) in directory. Spawning worker to read files...`
        );
        files = scannedFiles;
      } else {
        files = [uri.fsPath];
      }

      try {
        const results = await runInWorker<WorkerReadFilesResult>(
          { action: 'readFiles', files },
          context
        );

        let markdown = '';
        for (const result of results.results) {
          if (result.error) {
            outputChannel.appendLine(
              `Error reading ${result.file}: ${result.error}`
            );
            continue;
          }

          const relPath = stats.isDirectory()
            ? path.relative(uri.fsPath, result.file)
            : path.basename(result.file);
          const lang = guessLanguageByExtension(result.file);
          markdown += `${relPath}\n\`\`\`${lang}\n${result.content}\n\`\`\`\n\n`;
        }

        await vscode.env.clipboard.writeText(markdown);
        outputChannel.appendLine(
          'All readable file contents copied to clipboard (via worker).'
        );
        vscode.window.showInformationMessage(
          'All readable file contents copied to clipboard!'
        );
      } catch (err: any) {
        outputChannel.appendLine(`Error from worker: ${err.message}`);
        vscode.window.showErrorMessage(`Error from worker: ${err.message}`);
      }
    }
  );

  context.subscriptions.push(copyMdContents);
};
