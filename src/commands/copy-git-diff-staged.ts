import * as vscode from 'vscode';
import {
  DEFAULT_SHOW_COPIED_MSG,
  DEFAULT_SHOW_COPYING_MSG,
} from '../config.js';
import type { GitExtension } from '../git.js';
import { runInWorker } from '../utils/run-in-worker.js';

export const copyGitDiffStagedAsMd =
  (context: vscode.ExtensionContext, outputChannel: vscode.OutputChannel) =>
  async () => {
    try {
      const config = vscode.workspace.getConfiguration('marktree');
      const showCopyingMsg = config.get<boolean>(
        'showCopyingMessage',
        DEFAULT_SHOW_COPYING_MSG
      );
      let message = 'Copying staged Git diffs to clipboard as Markdown.';
      outputChannel.appendLine(message);
      if (showCopyingMsg) {
        vscode.window.showInformationMessage(message);
      }

      const gitExtension =
        vscode.extensions.getExtension<GitExtension>('vscode.git')?.exports;
      if (!gitExtension) {
        const msg = 'Unable to find built-in Git extension.';
        outputChannel.appendLine(msg);
        vscode.window.showErrorMessage(msg);
        return;
      }

      const api = gitExtension.getAPI(1);
      if (api.repositories.length === 0) {
        const msg = 'No Git repositories found in the workspace.';
        outputChannel.appendLine(msg);
        vscode.window.showErrorMessage(msg);
        return;
      }

      const repository = api.repositories[0];
      const stagedResourceStates = repository.state.indexChanges;
      const stagedFiles = stagedResourceStates.map(change => change.uri.fsPath);

      if (stagedFiles.length === 0) {
        const msg = 'No staged files found.';
        outputChannel.appendLine(msg);
        vscode.window.showWarningMessage(msg);
        return;
      }

      try {
        await runInWorker(
          {
            type: 'shellExec',
            workspaceRoot: repository.rootUri.fsPath,
            shellCommands: [
              {
                command: 'git',
                args: ['diff', '--cached', '--', ...stagedFiles],
                cwd: repository.rootUri.fsPath,
              },
            ],
            ignoreFiles: [],
            additionalIgnores: [],
            ignoreBinary: false,
          },
          context,
          outputChannel
        );
      } catch (err) {
        const msg = `Error copying staged Git diffs to clipboard: ${String(err)}`;
        outputChannel.appendLine(msg);
        vscode.window.showErrorMessage(msg);
        return;
      }

      const showCopiedMsg = config.get<boolean>(
        'showCopiedMessage',
        DEFAULT_SHOW_COPIED_MSG
      );
      message = 'Staged Git diffs copied to clipboard as Markdown.';
      outputChannel.appendLine(message);
      if (showCopiedMsg) {
        vscode.window.showInformationMessage(message);
      }
    } catch (err) {
      if (err instanceof Error) {
        const errorMessage = err.stack ?? err.message;
        outputChannel.appendLine(errorMessage);
        vscode.window.showErrorMessage(
          'Error copying staged Git diffs. See output for details.'
        );
      } else {
        const errorMessage = String(err);
        outputChannel.appendLine(errorMessage);
        vscode.window.showErrorMessage(
          'Error copying staged Git diffs. See output for details.'
        );
      }
    }
  };