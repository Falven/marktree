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

export const copyMdFiles =
  (context: vscode.ExtensionContext, outputChannel: vscode.OutputChannel) =>
  async (firstUri?: vscode.Uri, allUris?: vscode.Uri[]) => {
    let uris: vscode.Uri[] = [];

    if (allUris) {
      uris = allUris;
    } else if (firstUri) {
      uris = [firstUri];
    } else {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders || workspaceFolders.length === 0) {
        vscode.window.showErrorMessage(
          'No folder selected or no workspace folder found.'
        );
        return;
      }
      uris = [workspaceFolders[0].uri];
    }

    if (uris.length === 0) {
      vscode.window.showErrorMessage('No folder or file selected.');
      return;
    }

    const config = vscode.workspace.getConfiguration('marktree');
    const showCopyingMsg = config.get<boolean>(
      'showCopyingMessage',
      DEFAULT_SHOW_COPYING_MSG
    );
    let message = 'Copying file contents to clipboard as Markdown.';
    outputChannel.appendLine(message);
    if (showCopyingMsg) {
      vscode.window.showInformationMessage(message);
    }

    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      const errorMsg = 'No workspace folder found.';
      outputChannel.appendLine(errorMsg);
      vscode.window.showErrorMessage(errorMsg);
      return;
    }
    const workspaceRoot = workspaceFolders[0].uri.fsPath;

    let copiedCount = 0;
    try {
      copiedCount = await runInWorker(
        {
          type: 'readFilesPaths',
          paths: uris.map(u => u.fsPath) as [string, ...string[]],
          workspaceRoot,
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
      if (unknownErr instanceof Error) {
        const errorMessage = unknownErr.stack ?? unknownErr.message;
        outputChannel.appendLine(errorMessage);
        vscode.window.showErrorMessage(
          'Error copying the Markdown file contents. See output for details.'
        );
      } else {
        const errorMessage = String(unknownErr);
        outputChannel.appendLine(errorMessage);
        vscode.window.showErrorMessage(
          'Error copying the Markdown file contents. See output for details.'
        );
      }
      return;
    }

    const showCopiedMsg = config.get<boolean>(
      'showCopiedMessage',
      DEFAULT_SHOW_COPIED_MSG
    );
    message =
      copiedCount === 1
        ? '1 file copied to clipboard as Markdown.'
        : `${copiedCount} files copied to clipboard as Markdown.`;
    outputChannel.appendLine(message);
    if (showCopiedMsg) {
      vscode.window.showInformationMessage(message);
    }
  };
