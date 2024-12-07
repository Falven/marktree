import * as vscode from 'vscode';
import { copyMdContents } from './commands/copy-contents.js';
import { copyMdTreeAndContents } from './commands/copy-tree-and-contents.js';
import { copyMdTree } from './commands/copy-tree.js';

let outputChannel: vscode.OutputChannel;

export const activate = async (
  context: vscode.ExtensionContext
): Promise<void> => {
  outputChannel = vscode.window.createOutputChannel('MarkTree');
  outputChannel.show();

  context.subscriptions.push(
    vscode.commands.registerCommand(
      'extension.copyMdTree',
      copyMdTree(context, outputChannel)
    )
  );
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'extension.copyMdContents',
      copyMdContents(context, outputChannel)
    )
  );
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'extension.copyMdTreeAndContents',
      copyMdTreeAndContents(context, outputChannel)
    )
  );

  outputChannel.appendLine('Extension activated.');
};

export const deactivate = (): void => {
  outputChannel.appendLine('Extension deactivated.');
};
