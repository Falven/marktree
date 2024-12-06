import * as vscode from 'vscode';
import { registerCommands } from './commands/index.js';
import { initializeIgnore } from './gitignore.js';

let outputChannel: vscode.OutputChannel;

export function activate(context: vscode.ExtensionContext): void {
  outputChannel = vscode.window.createOutputChannel('MarkTree');
  outputChannel.show();
  outputChannel.appendLine('MarkTree extension activated.');

  const config = vscode.workspace.getConfiguration('marktree');
  const gitignoreEnabled = config.get<boolean>('gitignore', true);
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
  initializeIgnore(workspaceFolder, gitignoreEnabled);

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('marktree.gitignore')) {
        const updatedConfig = vscode.workspace.getConfiguration('marktree');
        const updatedGitignoreEnabled = updatedConfig.get<boolean>(
          'gitignore',
          true
        );
        const updatedWorkspaceFolder =
          vscode.workspace.workspaceFolders?.[0].uri.fsPath;
        initializeIgnore(updatedWorkspaceFolder, updatedGitignoreEnabled);
        outputChannel.appendLine(
          `marktree.gitignore changed to ${updatedGitignoreEnabled}. Re-initialized ignore logic.`
        );
      }
    })
  );

  registerCommands(context, outputChannel);
}

export function deactivate(): void {
  outputChannel.appendLine('MarkTree extension deactivated.');
}
