import { promises } from 'node:fs';
import {
  type ExtensionContext,
  type OutputChannel,
  type Uri,
  window,
  workspace,
} from 'vscode';
import {
  DEFAULT_ADDITIONAL_IGNORES,
  DEFAULT_GITIGNORE,
  DEFAULT_IGNORE_BINARY,
  DEFAULT_IGNORE_FILES,
  DEFAULT_SHOW_COPIED_MSG,
  DEFAULT_SHOW_COPYING_MSG,
} from '../config.js';
import { runInWorker } from '../utils/run-in-worker.js';
import { resolveSelectionUris } from '../utils/uri-resolver.js';

export const copyMdFiles =
  (context: ExtensionContext, outputChannel: OutputChannel) =>
  async (firstUri?: Uri, allUris?: Uri[]) => {
    try {
      const uris = resolveSelectionUris(firstUri, allUris);
      if (uris.length === 0) {
        window.showErrorMessage('Please select a folder or file.');
        return;
      }

      const config = workspace.getConfiguration('marktree');
      const showCopyingMsg = config.get<boolean>(
        'showCopyingMessage',
        DEFAULT_SHOW_COPYING_MSG
      );
      let message = 'Copying file contents to clipboard as Markdown.';
      outputChannel.appendLine(message);
      if (showCopyingMsg) {
        window.showInformationMessage(message);
      }

      const folder = workspace.getWorkspaceFolder(uris[0]);
      if (!folder) {
        const errorMsg = 'No workspace folder found.';
        outputChannel.appendLine(errorMsg);
        window.showErrorMessage(errorMsg);
        return;
      }

      const workspaceRoot = folder.uri.fsPath;
      let copiedCount = 0;

      if (uris.length > 1) {
        copiedCount = await runInWorker(
          {
            type: 'treeAndReadFilesPaths',
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
      } else {
        const singlePath = uris[0].fsPath;
        const stat = await promises.stat(singlePath);
        if (stat.isDirectory()) {
          copiedCount = await runInWorker(
            {
              type: 'treeAndReadFilesSelected',
              selectedPath: singlePath,
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
        } else {
          copiedCount = await runInWorker(
            {
              type: 'readFilesPaths',
              paths: [singlePath],
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
        }
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
        window.showInformationMessage(message);
      }
    } catch (err) {
      if (err instanceof Error) {
        const errorMessage = err.stack ?? err.message;
        outputChannel.appendLine(errorMessage);
        window.showErrorMessage(
          'Error copying the Markdown file contents. See output for details.'
        );
      } else {
        const errorMessage = String(err);
        outputChannel.appendLine(errorMessage);
        window.showErrorMessage(
          'Error copying the Markdown file contents. See output for details.'
        );
      }
    }
  };
