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
  async (uri?: vscode.Uri) => {
    if (!uri) {
      const activeEditor = vscode.window.activeTextEditor;
      if (!activeEditor) {
        vscode.window.showErrorMessage(
          'No folder or file selected in explorer or active editor.'
        );
        return;
      }
      uri = activeEditor.document.uri;
    }

    const config = vscode.workspace.getConfiguration('marktree');
    const showCopyingMsg = config.get<boolean>(
      'showCopyingMessage',
      DEFAULT_SHOW_COPYING_MSG
    );

    let message = 'Copying directory tree to clipboard as Markdown.';
    outputChannel.appendLine(message);
    if (showCopyingMsg) {
      vscode.window.showInformationMessage(message);
    }

    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      const msg = 'No workspace folder found.';
      outputChannel.appendLine(msg);
      vscode.window.showErrorMessage(msg);
      return;
    }
    const workspaceRoot = workspaceFolders[0].uri.fsPath;

    try {
      await runInWorker(
        {
          type: 'tree',
          selectedPath: uri.fsPath,
          workspaceRoot: workspaceRoot,
          ignoreFiles: config.get<boolean>('gitignore', DEFAULT_GITIGNORE)
            ? DEFAULT_IGNORE_FILES
            : [],
          ignoreBinary: config.get<boolean>(
            'ignoreBinary',
            DEFAULT_IGNORE_BINARY
          ),
          additionalIgnores: config.get<string[]>(
            'additionalIgnores',
            DEFAULT_ADDITIONAL_IGNORES
          ),
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

    const showCopiedMsg = config.get<boolean>(
      'showCopiedMessage',
      DEFAULT_SHOW_COPIED_MSG
    );

    message = 'Directory tree copied to clipboard as Markdown.';
    outputChannel.appendLine(message);
    if (showCopiedMsg) {
      vscode.window.showInformationMessage(message);
    }
  };
