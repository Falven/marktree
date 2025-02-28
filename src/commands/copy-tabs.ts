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
import { getFileUrisFromTabs } from '../utils/tab-utils.js';

export const copyTabsAsMd =
  (context: vscode.ExtensionContext, outputChannel: vscode.OutputChannel) =>
  async () => {
    const config = vscode.workspace.getConfiguration('marktree');
    const showCopyingMsg = config.get<boolean>(
      'showCopyingMessage',
      DEFAULT_SHOW_COPYING_MSG
    );

    let message = 'Copying all open tabs as Markdown.';
    outputChannel.appendLine(message);
    if (showCopyingMsg) {
      vscode.window.showInformationMessage(message);
    }

    let fileUris: vscode.Uri[];
    try {
      fileUris = await getFileUrisFromTabs('all');
    } catch (err: any) {
      const msg = err.message || String(err);
      outputChannel.appendLine(msg);
      vscode.window.showErrorMessage(msg);
      return;
    }

    const workspaceRoot = vscode.workspace.workspaceFolders![0].uri.fsPath;

    try {
      await runInWorker(
        {
          type: 'readFiles',
          selectedPath: workspaceRoot,
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
          paths: fileUris.map(uri => uri.fsPath),
        },
        context,
        outputChannel
      );
    } catch (err) {
      const msg =
        'Error copying open tabs as Markdown. See output for details.';
      outputChannel.appendLine(String(err));
      vscode.window.showErrorMessage(msg);
      return;
    }

    const showCopiedMsg = config.get<boolean>(
      'showCopiedMessage',
      DEFAULT_SHOW_COPIED_MSG
    );
    message = 'Open tabs copied to clipboard as Markdown.';
    outputChannel.appendLine(message);
    if (showCopiedMsg) {
      vscode.window.showInformationMessage(message);
    }
  };
