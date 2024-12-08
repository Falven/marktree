import * as vscode from 'vscode';
import { copyMdTree } from './copy-tree.js';

export const registerCommands = async (
  context: vscode.ExtensionContext,
  outputChannel: vscode.OutputChannel
) => {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'extension.copyMdTree',
      copyMdTree(context, outputChannel)
    )
  );
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'extension.copyMdContents',
      copyMdTree(context, outputChannel)
    )
  );
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'extension.copyMdTreeAndContents',
      copyMdTree(context, outputChannel)
    )
  );
};
