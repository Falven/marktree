import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { guessLanguageByExtension } from '../lang.js';
import { runInWorker } from '../run-in-worker.js';
import type {
  ReadFilesAction,
  ReadFilesResult,
  ScanDirectoryAction,
  ScanDirectoryResult,
} from '../schema.js';

export const copyMdContents =
  (context: vscode.ExtensionContext, outputChannel: vscode.OutputChannel) =>
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

    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      const message = 'No workspace folder found.';
      outputChannel.appendLine(message);
      vscode.window.showErrorMessage(message);
      return;
    }

    let files: string[];
    if (stats.isDirectory()) {
      const payload: ScanDirectoryAction = {
        action: 'scanDirectory',
        dir: uri.fsPath,
        workspaceRoot: workspaceFolders[0].uri.fsPath,
        gitignore: vscode.workspace
          .getConfiguration('marktree')
          .get<boolean>('gitignore', true),
      };
      const { files: scannedFiles } = await runInWorker<ScanDirectoryResult>(
        payload,
        context,
        outputChannel
      );
      outputChannel.appendLine(
        `Found ${scannedFiles.length} file(s) in directory. Spawning worker to read files...`
      );
      files = scannedFiles;
    } else {
      files = [uri.fsPath];
    }

    try {
      const payload: ReadFilesAction = {
        action: 'readFiles',
        files,
        workspaceRoot: workspaceFolders[0].uri.fsPath,
        gitignore: vscode.workspace
          .getConfiguration('marktree')
          .get<boolean>('gitignore', true),
      };
      const results = await runInWorker<ReadFilesResult>(
        payload,
        context,
        outputChannel
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
  };
