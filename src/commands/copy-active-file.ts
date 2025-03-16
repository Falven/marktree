import * as vscode from 'vscode';
import {
  DEFAULT_SHOW_COPIED_MSG,
  DEFAULT_SHOW_COPYING_MSG,
} from '../config.js';
import { copyMdFiles } from './copy-files.js';

export const copyActiveFileMd =
  (context: vscode.ExtensionContext, outputChannel: vscode.OutputChannel) =>
  async () => {
    const config = vscode.workspace.getConfiguration('marktree');
    const showCopyingMsg = config.get<boolean>(
      'showCopyingMessage',
      DEFAULT_SHOW_COPYING_MSG
    );
    let message = 'Copying active file contents to clipboard as Markdown.';
    outputChannel.appendLine(message);
    if (showCopyingMsg) {
      vscode.window.showInformationMessage(message);
    }

    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
      vscode.window.showErrorMessage('No active file to copy.');
      return;
    }
    const fileUri = activeEditor.document.uri;
    await copyMdFiles(context, outputChannel)(fileUri);

    const showCopiedMsg = config.get<boolean>(
      'showCopiedMessage',
      DEFAULT_SHOW_COPIED_MSG
    );

    message = 'Active file copied to clipboard as Markdown.';
    outputChannel.appendLine(message);
    if (showCopiedMsg) {
      vscode.window.showInformationMessage(message);
    }
  };
