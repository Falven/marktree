import * as vscode from 'vscode';
import { registerCommands } from './commands/index.js';
import { initializeIgnore } from './gitignore.js';

let outputChannel: vscode.OutputChannel;

export const activate = async (
  context: vscode.ExtensionContext
): Promise<void> => {
  outputChannel = vscode.window.createOutputChannel('MarkTree');

  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    outputChannel.appendLine('No workspace folder found.');
    return;
  }

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('marktree.gitignore')) {
        const updatedConfig = vscode.workspace.getConfiguration('marktree');
        const updatedGitignoreEnabled = updatedConfig.get<boolean>(
          'gitignore',
          true
        );

        initializeIgnore(
          workspaceFolders[0].uri.fsPath,
          updatedGitignoreEnabled,
          outputChannel
        );

        outputChannel.appendLine(
          `marktree.gitignore setting changed to ${updatedGitignoreEnabled}. Re-initialized ignore logic.`
        );
      }
    })
  );

  const config = vscode.workspace.getConfiguration('marktree');
  const gitignoreEnabled = config.get<boolean>('gitignore', true);

  await initializeIgnore(
    workspaceFolders[0].uri.fsPath,
    gitignoreEnabled,
    outputChannel
  );

  await registerCommands(context, outputChannel);

  outputChannel.appendLine('Extension activated.');
};

export const deactivate = (): void => {
  outputChannel.appendLine('Extension deactivated.');
};
