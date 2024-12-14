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

export const copyOpenTabsAsMd =
  (context: vscode.ExtensionContext, outputChannel: vscode.OutputChannel) =>
  async () => {
    const config = vscode.workspace.getConfiguration('marktree');
    const showCopyingMsg = config.get<boolean>(
      'showCopyingMessage',
      DEFAULT_SHOW_COPYING_MSG
    );

    let message = 'Copying open tabs as Markdown.';
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

    // Get all currently visible text editors.
    const allTabs = vscode.window.tabGroups.all.flatMap(group => group.tabs);
    const fileUris: vscode.Uri[] = [];
    for (const tab of allTabs) {
      if (tab.input instanceof vscode.TabInputText) {
        const doc = tab.input;
        if (doc.uri.scheme === 'file') {
          fileUris.push(doc.uri);
        }
      }
    }

    if (fileUris.length === 0) {
      const msg = 'No file-based open tabs to copy.';
      outputChannel.appendLine(msg);
      vscode.window.showErrorMessage(msg);
      return;
    }

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
      if (err instanceof Error) {
        const errorMessage = err.stack ?? err.message;
        outputChannel.appendLine(errorMessage);
        vscode.window.showErrorMessage(
          'Error copying open tabs as Markdown. See output for details.'
        );
        return;
      }
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
