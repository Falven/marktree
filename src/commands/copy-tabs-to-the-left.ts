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

export const copyTabsToTheLeftAsMd =
  (context: vscode.ExtensionContext, outputChannel: vscode.OutputChannel) =>
  async () => {
    const config = vscode.workspace.getConfiguration('marktree');
    const showCopyingMsg = config.get<boolean>(
      'showCopyingMessage',
      DEFAULT_SHOW_COPYING_MSG
    );
    let message = 'Copying open tabs to the left as Markdown.';
    outputChannel.appendLine(message);
    if (showCopyingMsg) {
      vscode.window.showInformationMessage(message);
    }

    let fileUris: vscode.Uri[];
    try {
      fileUris = await getFileUrisFromTabs('left');
    } catch (unknownErr) {
      if (unknownErr instanceof Error) {
        const msg = unknownErr.message;
        outputChannel.appendLine(msg);
        vscode.window.showErrorMessage(msg);
      } else {
        const msg = String(unknownErr);
        outputChannel.appendLine(msg);
        vscode.window.showErrorMessage(msg);
      }
      return;
    }

    if (fileUris.length === 0) {
      const emptyMsg = 'No tabs to the left found.';
      outputChannel.appendLine(emptyMsg);
      vscode.window.showErrorMessage(emptyMsg);
      return;
    }

    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      const errorMsg = 'No workspace folder found.';
      outputChannel.appendLine(errorMsg);
      vscode.window.showErrorMessage(errorMsg);
      return;
    }

    let copiedCount = 0;
    try {
      copiedCount = await runInWorker(
        {
          type: 'readFilesPaths',
          paths: fileUris.map(uri => uri.fsPath) as [string, ...string[]],
          workspaceRoot: workspaceFolders[0].uri.fsPath,
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
    } catch (unknownErr) {
      const msg =
        'Error copying open tabs to the left as Markdown. See output for details.';
      outputChannel.appendLine(String(unknownErr));
      vscode.window.showErrorMessage(msg);
      return;
    }

    const showCopiedMsg = config.get<boolean>(
      'showCopiedMessage',
      DEFAULT_SHOW_COPIED_MSG
    );
    message =
      copiedCount === 1
        ? '1 open tab to the left copied to clipboard as Markdown.'
        : `${copiedCount} open tabs to the left copied to clipboard as Markdown.`;
    outputChannel.appendLine(message);
    if (showCopiedMsg) {
      vscode.window.showInformationMessage(message);
    }
  };
