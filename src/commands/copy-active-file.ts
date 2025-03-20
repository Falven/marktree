import * as vscode from 'vscode';
import { copyMdFiles } from './copy-files.js';

export const copyActiveFileMd =
  (context: vscode.ExtensionContext, outputChannel: vscode.OutputChannel) =>
  async () => {
    try {
      const activeEditor = vscode.window.activeTextEditor;
      if (!activeEditor) {
        vscode.window.showErrorMessage('No active file to copy.');
        return;
      }
      const fileUri = activeEditor.document.uri;
      await copyMdFiles(context, outputChannel)(fileUri);
    } catch (err) {
      if (err instanceof Error) {
        const msg = err.stack ?? err.message;
        outputChannel.appendLine(msg);
        vscode.window.showErrorMessage(
          'Error copying the active file as Markdown. See output for details.'
        );
      } else {
        const msg = String(err);
        outputChannel.appendLine(msg);
        vscode.window.showErrorMessage(
          'Error copying the active file as Markdown. See output for details.'
        );
      }
    }
  };
