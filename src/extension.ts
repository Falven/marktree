import * as vscode from 'vscode';
import { copyActiveFileMd } from './commands/copy-active-file.js';
import { copyMdFiles } from './commands/copy-files.js';
import { copyMdTreeAndFiles } from './commands/copy-tree-and-files.js';
import { copyMdTree } from './commands/copy-tree.js';
import { updateMDIgnores } from './commands/update-md-ignores.js';

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
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'extension.copyActiveFileMd',
      copyActiveFileMd(context, outputChannel)
    )
  );
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'extension.addToMDIgnores',
      updateMDIgnores(outputChannel, false)
    )
  );
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'extension.removeFromMDIgnores',
      updateMDIgnores(outputChannel, true)
    )
  );

  outputChannel.appendLine('Extension activated.');
};

export const deactivate = (): void => {
  outputChannel.appendLine('Extension deactivated.');
};
