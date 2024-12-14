import * as vscode from 'vscode';
import { copyMdFiles } from './copy-files.js';

export const copyActiveFileMd =
  (context: vscode.ExtensionContext, outputChannel: vscode.OutputChannel) =>
  async () => {
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
      vscode.window.showErrorMessage('No active file to copy.');
      return;
    }
    const fileUri = activeEditor.document.uri;
    await copyMdFiles(context, outputChannel)(fileUri);
  };
