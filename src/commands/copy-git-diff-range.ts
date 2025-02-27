import * as vscode from 'vscode';
import {
    DEFAULT_SHOW_COPIED_MSG,
    DEFAULT_SHOW_COPYING_MSG,
} from '../config.js';
import { GitExtension } from '../git.js';
import { runInWorker } from '../utils/run-in-worker.js';

export const copyGitDiffRangeQuickPick =
  (context: vscode.ExtensionContext, outputChannel: vscode.OutputChannel) =>
  async () => {
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

    const maxEntries = 50;
    let commits = [];
    try {
      commits = await repository.log({ maxEntries });
    } catch (err) {
      const msg = 'Failed to retrieve Git commits via repository.log()';
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
      return {
        label: shortHash,
        description: commit.message,
        commit,
      };
    });

    const picks = await vscode.window.showQuickPick(items, {
      canPickMany: true,
      placeHolder: `Select exactly two commits (older first, then newer)`,
      ignoreFocusOut: true,
    });

    if (!picks || picks.length < 2) {
      vscode.window.showInformationMessage('No commits selected.');
      return;
    }
    if (picks.length > 2) {
      vscode.window.showInformationMessage(
        'Please select exactly two commits.'
      );
      return;
    }

    const pickA = picks[0];
    const pickB = picks[1];
    const indexA = commits.findIndex(c => c.hash === pickA.commit.hash);
    const indexB = commits.findIndex(c => c.hash === pickB.commit.hash);

    let startCommit = pickA.commit.hash;
    let endCommit = pickB.commit.hash;

    if (indexA < indexB) {
      startCommit = pickB.commit.hash;
      endCommit = pickA.commit.hash;
    }

    const config = vscode.workspace.getConfiguration('marktree');
    const showCopyingMsg = config.get<boolean>(
      'showCopyingMessage',
      DEFAULT_SHOW_COPYING_MSG
    );
    let message = `Copying Git diffs from ${startCommit.slice(
      0,
      7
    )} to ${endCommit.slice(0, 7)}...`;
    outputChannel.appendLine(message);
    if (showCopyingMsg) {
      vscode.window.showInformationMessage(message);
    }

    try {
      await runInWorker(
        {
          type: 'shellExec',
          workspaceRoot: repoRoot,
          shellCommands: [
            {
              command: 'git',
              args: ['log', `${startCommit}..${endCommit}`, '-p', '--oneline'],
              cwd: repoRoot,
            },
          ],
        },
        context,
        outputChannel
      );
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Error copying Git diffs for the selected commit range.';
      outputChannel.appendLine(String(err));
      vscode.window.showErrorMessage(msg);
      return;
    }

    const showCopiedMsg = config.get<boolean>(
      'showCopiedMessage',
      DEFAULT_SHOW_COPIED_MSG
    );
    message = `Git diffs from ${startCommit.slice(0, 7)}..${endCommit.slice(
      0,
      7
    )} copied to clipboard.`;
    outputChannel.appendLine(message);
    if (showCopiedMsg) {
      vscode.window.showInformationMessage(message);
    }
  };
