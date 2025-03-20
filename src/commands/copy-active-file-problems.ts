import * as vscode from 'vscode';
import {
    DEFAULT_SHOW_COPIED_MSG,
    DEFAULT_SHOW_COPYING_MSG,
} from '../config.js';
import { buildDiagnosticsMarkdown } from '../utils/markdown.js';

export const copyActiveFileProblems =
  (context: vscode.ExtensionContext, outputChannel: vscode.OutputChannel) =>
  async () => {
    try {
      const activeEditor = vscode.window.activeTextEditor;
      if (!activeEditor) {
        vscode.window.showErrorMessage(
          'No active editor to copy problems from.'
        );
        return;
      }

      const document = activeEditor.document;
      const fileUri = document.uri;
      const diagnostics = vscode.languages.getDiagnostics(fileUri);

      if (!diagnostics || diagnostics.length === 0) {
        vscode.window.showInformationMessage(
          'No problems found for the current file.'
        );
        return;
      }

      const config = vscode.workspace.getConfiguration('marktree');
      const showCopyingMsg = config.get<boolean>(
        'showCopyingMessage',
        DEFAULT_SHOW_COPYING_MSG
      );
      let message = `Copying ${diagnostics.length} problem(s) from active file...`;
      outputChannel.appendLine(message);
      if (showCopyingMsg) {
        vscode.window.showInformationMessage(message);
      }

      const markdown = buildDiagnosticsMarkdown(
        fileUri.fsPath,
        diagnostics,
        document,
        2
      );

      await vscode.env.clipboard.writeText(markdown);

      const showCopiedMsg = config.get<boolean>(
        'showCopiedMessage',
        DEFAULT_SHOW_COPIED_MSG
      );
      message = `Copied ${diagnostics.length} problem(s) with code snippets to clipboard.`;
      outputChannel.appendLine(message);
      if (showCopiedMsg) {
        vscode.window.showInformationMessage(message);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.stack ?? err.message : String(err);
      outputChannel.appendLine(errorMessage);
      vscode.window.showErrorMessage(
        'Error copying file problems. See output for details.'
      );
    }
  };
