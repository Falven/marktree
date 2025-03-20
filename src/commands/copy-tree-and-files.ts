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

export const copyMdTreeAndFiles =
  (context: vscode.ExtensionContext, outputChannel: vscode.OutputChannel) =>
  async (firstUri?: vscode.Uri, allUris?: vscode.Uri[]) => {
    let uris: vscode.Uri[] = [];
    if (allUris && allUris.length > 0) {
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
    let message =
      'Copying directory tree and file contents to clipboard as Markdown.';
    outputChannel.appendLine(message);
    if (showCopyingMsg) {
      vscode.window.showInformationMessage(message);
    }
    const folder = vscode.workspace.getWorkspaceFolder(uris[0]);
    if (!folder) {
      const msg = 'No workspace folder found.';
      outputChannel.appendLine(msg);
      vscode.window.showErrorMessage(msg);
      return;
    }
    const workspaceRoot = folder.uri.fsPath;
    let copiedCount = 0;
    try {
      if (uris.length > 1) {
        copiedCount = await runInWorker(
          {
            type: 'treeAndReadFilesPaths',
            paths: uris.map(u => u.fsPath) as [string, ...string[]],
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
      } else {
        const singlePath = uris[0].fsPath;
        copiedCount = await runInWorker(
          {
            type: 'treeAndReadFilesSelected',
            selectedPath: singlePath,
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
      }
    } catch (err) {
      if (err instanceof Error) {
        const errorMessage = err.stack ?? err.message;
        outputChannel.appendLine(errorMessage);
        vscode.window.showErrorMessage(
          'Error copying the Markdown directory tree and file contents. See output for details.'
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
        ? 'Directory tree and 1 file content copied to clipboard as Markdown.'
        : `Directory tree and ${copiedCount} file contents copied to clipboard as Markdown.`;
    outputChannel.appendLine(message);
    if (showCopiedMsg) {
      vscode.window.showInformationMessage(message);
    }
  };
