import * as vscode from 'vscode';
import {
  DEFAULT_ADDITIONAL_IGNORES,
  DEFAULT_GITIGNORE,
  DEFAULT_IGNORE_BINARY,
  DEFAULT_IGNORE_FILES,
} from '../config.js';
import { runInWorker } from '../utils/run-in-worker.js';

export const copyMdFiles =
  (context: vscode.ExtensionContext, outputChannel: vscode.OutputChannel) =>
  async (uri: vscode.Uri) => {
    if (!uri) {
      const message = 'No file or folder selected.';
      outputChannel.appendLine(message);
      vscode.window.showErrorMessage(message);
      return;
    }

    let message = 'Copying file contents to clipboard as Markdown.';
    outputChannel.appendLine(message);

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
          selectedPath: uri.fsPath,
          workspaceRoot: workspaceFolders[0].uri.fsPath,
          ignoreFiles: vscode.workspace
            .getConfiguration('marktree')
            .get<boolean>('gitignore', DEFAULT_GITIGNORE)
            ? DEFAULT_IGNORE_FILES
            : [],
          ignoreBinary: vscode.workspace
            .getConfiguration('marktree')
            .get<boolean>('ignoreBinary', DEFAULT_IGNORE_BINARY),
          additionalIgnores: vscode.workspace
            .getConfiguration('marktree')
            .get<string[]>('additionalIgnores', DEFAULT_ADDITIONAL_IGNORES),
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

    message = 'File contents copied to clipboard as Markdown.';
    outputChannel.appendLine(message);
    vscode.window.showInformationMessage(message);
  };