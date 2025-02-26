import * as childProcess from 'node:child_process';
import * as path from 'node:path';
import * as vscode from 'vscode';
import {
    DEFAULT_SHOW_COPIED_MSG,
    DEFAULT_SHOW_COPYING_MSG,
} from '../config.js';

export const copyGitStagedAsMd =
  (context: vscode.ExtensionContext, outputChannel: vscode.OutputChannel) =>
  async () => {
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

    const gitExtension = vscode.extensions.getExtension('vscode.git')?.exports;
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
    const stagedFiles = stagedResourceStates.map(
      (change: any) => change.uri.fsPath
    );
    if (stagedFiles.length === 0) {
      const msg = 'No staged files found.';
      outputChannel.appendLine(msg);
      vscode.window.showWarningMessage(msg);
      return;
    }

    let markdown = '';
    for (const filePath of stagedFiles) {
      const workspaceFolder = vscode.workspace.getWorkspaceFolder(
        vscode.Uri.file(filePath)
      );
      const displayName = workspaceFolder
        ? path.relative(workspaceFolder.uri.fsPath, filePath)
        : path.basename(filePath);

      let diffHunk = '';
      try {
        diffHunk = childProcess.execSync(`git diff --cached -- "${filePath}"`, {
          cwd: workspaceFolder?.uri.fsPath,
          encoding: 'utf-8',
        });
      } catch (err) {
        diffHunk = `Unable to get staged diff for ${displayName}\n`;
      }

      markdown += `${displayName}\n\`\`\`diff\n${
        diffHunk || '(No diff)'
      }\n\`\`\`\n\n`;
    }

    if (!markdown.trim()) {
      const msg = 'No diffs found for staged files.';
      outputChannel.appendLine(msg);
      vscode.window.showWarningMessage(msg);
      return;
    }

    try {
      const { default: clipboardy } = await import('clipboardy');
      await clipboardy.write(markdown);
    } catch (err) {
      const msg = `Error writing staged diffs to clipboard: ${err}`;
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
  };
