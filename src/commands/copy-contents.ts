import * as vscode from 'vscode';
import { runInWorker } from '../utils/run-in-worker.js';

export const copyMdContents =
  (context: vscode.ExtensionContext, outputChannel: vscode.OutputChannel) =>
  async (uri: vscode.Uri) => {
    if (!uri) {
      const message = 'No file or folder selected.';
      outputChannel.appendLine(message);
      vscode.window.showErrorMessage(message);
      return;
    }

    outputChannel.appendLine(`copyMdContents invoked on: ${uri.fsPath}`);

    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      const message = 'No workspace folder found.';
      outputChannel.appendLine(message);
      vscode.window.showErrorMessage(message);
      return;
    }

    try {
      await runInWorker(
        {
          type: 'readFiles',
          path: uri.fsPath,
          workspaceRoot: workspaceFolders[0].uri.fsPath,
          gitignore: vscode.workspace
            .getConfiguration('marktree')
            .get<boolean>('gitignore', true),
        },
        context,
        outputChannel
      );
    } catch (err) {
      if (err instanceof Error) {
        outputChannel.appendLine(err.message);
        vscode.window.showErrorMessage(
          'Error copying the Markdown file contents. See output for details.'
        );
        return;
      }
    }

    const message = 'File contents copied to clipboard as Markdown.';
    outputChannel.appendLine(message);
    vscode.window.showInformationMessage(message);
  };
