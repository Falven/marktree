import * as vscode from 'vscode';
import { copyMdFiles } from './commands/copy-files.js';
import { copyMdTreeAndFiles } from './commands/copy-tree-and-files.js';
import { copyMdTree } from './commands/copy-tree.js';

let outputChannel: vscode.OutputChannel;

export const activate = async (
  context: vscode.ExtensionContext
): Promise<void> => {
  outputChannel = vscode.window.createOutputChannel('MarkTree');

  context.subscriptions.push(
    vscode.commands.registerCommand(
      'extension.copyMdTree',
      copyMdTree(context, outputChannel)
    )
  );
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'extension.copyMdFiles',
      copyMdFiles(context, outputChannel)
    )
  );
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'extension.copyMdTreeAndFiles',
      copyMdTreeAndFiles(context, outputChannel)
    )
  );

  outputChannel.appendLine('Extension activated.');
};

export const deactivate = (): void => {
  outputChannel.appendLine('Extension deactivated.');
};
