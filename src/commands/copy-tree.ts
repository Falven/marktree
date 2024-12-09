import * as vscode from 'vscode';
import {
  DEFAULT_ADDITIONAL_IGNORES,
  DEFAULT_GITIGNORE,
  DEFAULT_IGNORE_BINARY,
  DEFAULT_IGNORE_FILES,
  DEFAULT_SHOW_COPIED_MSG,
  DEFAULT_SHOW_COPYING_MSG,
} from '../config.js';
import { runInWorker } from '../utils/run-in-worker.js';

export const copyMdTree =
  (context: vscode.ExtensionContext, outputChannel: vscode.OutputChannel) =>
  async (uri: vscode.Uri) => {
    const showCopyingMsg = vscode.workspace
      .getConfiguration('marktree')
      .get<boolean>('showCopyingMessage', DEFAULT_SHOW_COPYING_MSG);

    let message = 'Copying directory tree to clipboard as Markdown.';
    outputChannel.appendLine(message);
    if (showCopyingMsg) {
      vscode.window.showInformationMessage(message);
    }

    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      const message = 'No workspace folder found.';
      outputChannel.appendLine(message);
      vscode.window.showErrorMessage(message);
      return;
    }
    const workspaceRoot = workspaceFolders[0].uri.fsPath;

    try {
      await runInWorker(
        {
          type: 'tree',
          selectedPath: uri?.fsPath ?? workspaceRoot,
          workspaceRoot: workspaceRoot,
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
        const errorMessage = err.stack ?? err.message;
        outputChannel.appendLine(errorMessage);
        vscode.window.showErrorMessage(
          'Error copying the Markdown directory tree. See output for details.'
        );
        return;
      }
    }

    const showCopiedMsg = vscode.workspace
      .getConfiguration('marktree')
      .get<boolean>('showCopiedMessage', DEFAULT_SHOW_COPIED_MSG);

    message = 'Directory tree copied to clipboard as Markdown.';
    outputChannel.appendLine(message);
    if (showCopiedMsg) {
      vscode.window.showInformationMessage(message);
    }
  };
