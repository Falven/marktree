import {
  env,
  type ExtensionContext,
  languages,
  type OutputChannel,
  window,
  workspace,
} from 'vscode';
import {
  DEFAULT_SHOW_COPIED_MSG,
  DEFAULT_SHOW_COPYING_MSG,
} from '../config.js';
import { buildDiagnosticsMarkdown } from '../utils/markdown.js';

export const copyActiveFileProblems =
  (context: ExtensionContext, outputChannel: OutputChannel) => async () => {
    try {
      const activeEditor = window.activeTextEditor;
      if (!activeEditor) {
        window.showErrorMessage('No active editor to copy problems from.');
        return;
      }

      const document = activeEditor.document;
      const fileUri = document.uri;
      const diagnostics = languages.getDiagnostics(fileUri);

      if (!diagnostics || diagnostics.length === 0) {
        window.showInformationMessage(
          'No problems found for the current file.',
        );
        return;
      }

      const config = workspace.getConfiguration('marktree');
      const showCopyingMsg = config.get<boolean>(
        'showCopyingMessage',
        DEFAULT_SHOW_COPYING_MSG,
      );
      let message = `Copying ${diagnostics.length} problem(s) from active file...`;
      outputChannel.appendLine(message);
      if (showCopyingMsg) {
        window.showInformationMessage(message);
      }

      const markdown = buildDiagnosticsMarkdown(
        fileUri.fsPath,
        diagnostics,
        document,
        2,
      );

      await env.clipboard.writeText(markdown);

      const showCopiedMsg = config.get<boolean>(
        'showCopiedMessage',
        DEFAULT_SHOW_COPIED_MSG,
      );
      message = `Copied ${diagnostics.length} problem(s) with code snippets to clipboard.`;
      outputChannel.appendLine(message);
      if (showCopiedMsg) {
        window.showInformationMessage(message);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? (err.stack ?? err.message) : String(err);
      outputChannel.appendLine(errorMessage);
      window.showErrorMessage(
        'Error copying file problems. See output for details.',
      );
    }
  };
