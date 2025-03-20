import * as vscode from 'vscode';
import {
  DEFAULT_SHOW_COPIED_MSG,
  DEFAULT_SHOW_COPYING_MSG,
} from '../config.js';
import type { GitExtension } from '../git.js';
import { runInWorker } from '../utils/run-in-worker.js';

export const copyGitCommits =
  (context: vscode.ExtensionContext, outputChannel: vscode.OutputChannel) =>
  async () => {
    try {
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
      const repoRoot = repository.rootUri.fsPath;
      const maxEntries = 200;
      let commits = [];

      try {
        commits = await repository.log({ maxEntries });
      } catch (err) {
        const msg = 'Failed to retrieve Git commits.';
        outputChannel.appendLine(String(err));
        vscode.window.showErrorMessage(msg);
        return;
      }

      if (commits.length === 0) {
        vscode.window.showWarningMessage('No commits found.');
        return;
      }

      const items = commits.map(commit => {
        const shortHash = commit.hash.slice(0, 7);
        const detail = commit.commitDate
          ? new Date(commit.commitDate).toLocaleString()
          : undefined;
        return {
          label: shortHash,
          description: commit.message,
          detail,
          commit,
        };
      });

      const picks = await vscode.window.showQuickPick(items, {
        canPickMany: true,
        placeHolder: 'Select commits to copy diffs.',
        ignoreFocusOut: true,
      });
      if (!picks || picks.length === 0) {
        vscode.window.showInformationMessage('No commits selected.');
        return;
      }

      const config = vscode.workspace.getConfiguration('marktree');
      const showCopyingMsg = config.get<boolean>(
        'showCopyingMessage',
        DEFAULT_SHOW_COPYING_MSG
      );
      let message = `Copying Git diffs for ${picks.length} selected commit${
        picks.length > 1 ? 's' : ''
      }...`;
      outputChannel.appendLine(message);
      if (showCopyingMsg) {
        vscode.window.showInformationMessage(message);
      }

      try {
        const shellCommands = picks.map(pick => ({
          command: 'git',
          args: ['show', pick.commit.hash, '-p'],
          cwd: repoRoot,
        })) as [
          { command: string; args: string[]; cwd?: string },
          ...{ command: string; args: string[]; cwd?: string }[]
        ];

        await runInWorker(
          {
            type: 'shellExec',
            workspaceRoot: repoRoot,
            shellCommands,
            ignoreFiles: [],
            additionalIgnores: [],
            ignoreBinary: false,
          },
          context,
          outputChannel
        );
      } catch (err: unknown) {
        const msg =
          err instanceof Error
            ? err.message
            : 'Error copying Git diffs for the selected commits.';
        outputChannel.appendLine(String(err));
        vscode.window.showErrorMessage(msg);
        return;
      }

      const showCopiedMsg = config.get<boolean>(
        'showCopiedMessage',
        DEFAULT_SHOW_COPIED_MSG
      );
      message = `Git diffs for ${picks.length} commit${
        picks.length > 1 ? 's' : ''
      } copied to clipboard.`;
      outputChannel.appendLine(message);
      if (showCopiedMsg) {
        vscode.window.showInformationMessage(message);
      }
    } catch (err) {
      if (err instanceof Error) {
        const errorMessage = err.stack ?? err.message;
        outputChannel.appendLine(errorMessage);
        vscode.window.showErrorMessage(
          'Error copying Git commit diffs. See output for details.'
        );
      } else {
        const errorMessage = String(err);
        outputChannel.appendLine(errorMessage);
        vscode.window.showErrorMessage(
          'Error copying Git commit diffs. See output for details.'
        );
      }
    }
  };
