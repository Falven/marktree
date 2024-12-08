import * as vscode from 'vscode';
import { registerCommands } from './commands/index.js';
import { initializeIgnore } from './gitignore.js';

let outputChannel: vscode.OutputChannel;

export const activate = async (
  context: vscode.ExtensionContext
): Promise<void> => {
  outputChannel = vscode.window.createOutputChannel('MarkTree');

  const config = vscode.workspace.getConfiguration('marktree');
  const gitignoreEnabled = config.get<boolean>('gitignore', true);
  if (gitignoreEnabled) {
    context.globalState.update(
      'marktree.ignoredPaths',
      await initializeIgnore(outputChannel)
    );
  }

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(async e => {
      if (e.affectsConfiguration('marktree.gitignore')) {
        const updatedConfig = vscode.workspace.getConfiguration('marktree');
        const updatedGitignoreEnabled = updatedConfig.get<boolean>(
          'gitignore',
          true
        );

        context.globalState.update(
          'marktree.ignoredPaths',
          await initializeIgnore(outputChannel)
        );

        outputChannel.appendLine(
          `marktree.gitignore setting changed to ${updatedGitignoreEnabled}. Re-initialized ignore logic.`
        );
      }
    })
  );

  await registerCommands(context, outputChannel);

  outputChannel.appendLine('Extension activated.');
};

export const deactivate = (): void => {
  outputChannel.appendLine('Extension deactivated.');
};
