import {
  window,
  workspace,
  type ExtensionContext,
  type OutputChannel,
  type Uri,
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
import { getFileUrisFromTabs } from '../utils/tab-utils.js';

export const copyTabsToTheRightAsMd =
  (context: ExtensionContext, outputChannel: OutputChannel) => async () => {
    try {
      const config = workspace.getConfiguration('marktree');
      const showCopyingMsg = config.get<boolean>(
        'showCopyingMessage',
        DEFAULT_SHOW_COPYING_MSG
      );
      let message = 'Copying open tabs to the right as Markdown.';
      outputChannel.appendLine(message);
      if (showCopyingMsg) {
        window.showInformationMessage(message);
      }

      let fileUris: Uri[];
      try {
        fileUris = await getFileUrisFromTabs('right');
      } catch (unknownErr) {
        if (unknownErr instanceof Error) {
          const msg = unknownErr.message;
          outputChannel.appendLine(msg);
          window.showErrorMessage(msg);
        } else {
          const msg = String(unknownErr);
          outputChannel.appendLine(msg);
          window.showErrorMessage(msg);
        }
        return;
      }

      if (fileUris.length === 0) {
        const emptyMsg = 'No tabs to the right found.';
        outputChannel.appendLine(emptyMsg);
        window.showErrorMessage(emptyMsg);
        return;
      }

      const folder = workspace.getWorkspaceFolder(fileUris[0]);
      if (!folder) {
        const errorMsg = 'No workspace folder found.';
        outputChannel.appendLine(errorMsg);
        window.showErrorMessage(errorMsg);
        return;
      }

      const workspaceRoot = folder.uri.fsPath;
      let copiedCount = 0;
      try {
        copiedCount = await runInWorker(
          {
            type: 'readFilesPaths',
            paths: fileUris.map(uri => uri.fsPath) as [string, ...string[]],
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
      } catch (unknownErr) {
        const msg =
          'Error copying open tabs to the right as Markdown. See output for details.';
        outputChannel.appendLine(String(unknownErr));
        window.showErrorMessage(msg);
        return;
      }

      const showCopiedMsg = config.get<boolean>(
        'showCopiedMessage',
        DEFAULT_SHOW_COPIED_MSG
      );
      message =
        copiedCount === 1
          ? '1 open tab to the right copied to clipboard as Markdown.'
          : `${copiedCount} open tabs to the right copied to clipboard as Markdown.`;
      outputChannel.appendLine(message);
      if (showCopiedMsg) {
        window.showInformationMessage(message);
      }
    } catch (err) {
      if (err instanceof Error) {
        const errorMessage = err.stack ?? err.message;
        outputChannel.appendLine(errorMessage);
        window.showErrorMessage(
          'Error copying tabs to the right as Markdown. See output for details.'
        );
      } else {
        const errorMessage = String(err);
        outputChannel.appendLine(errorMessage);
        window.showErrorMessage(
          'Error copying tabs to the right as Markdown. See output for details.'
        );
      }
    }
  };
