import {
    env,
    window,
    workspace,
    type ExtensionContext,
    type OutputChannel,
    type TextEditor,
} from 'vscode';
import {
    DEFAULT_SHOW_COPIED_MSG,
    DEFAULT_SHOW_COPYING_MSG,
} from '../config.js';
import { buildMarkdownContent } from '../utils/markdown.js';

export const copySelected =
  (context: ExtensionContext, outputChannel: OutputChannel) => async () => {
    try {
      const editor: TextEditor | undefined = window.activeTextEditor;
      if (!editor) {
        window.showErrorMessage('No active text editor to copy from.');
        return;
      }

      const document = editor.document;
      const config = workspace.getConfiguration('marktree');
      const showCopyingMsg = config.get<boolean>(
        'showCopyingMessage',
        DEFAULT_SHOW_COPYING_MSG
      );

      const selectedTexts = editor.selections.map(selection =>
        document.getText(selection)
      );
      const combinedText = selectedTexts.join('\n');

      if (!combinedText.trim()) {
        window.showErrorMessage('No text selected to copy.');
        return;
      }

      let message = 'Copying selected text as Markdown code block...';
      outputChannel.appendLine(message);
      if (showCopyingMsg) {
        window.showInformationMessage(message);
      }

      const folder = workspace.getWorkspaceFolder(document.uri);
      const workspaceRoot = folder?.uri.fsPath || '';
      const fileResults = [
        {
          file: document.uri.fsPath,
          content: combinedText,
        },
      ];
      const markdown = buildMarkdownContent(fileResults, workspaceRoot);

      await env.clipboard.writeText(markdown);

      const showCopiedMsg = config.get<boolean>(
        'showCopiedMessage',
        DEFAULT_SHOW_COPIED_MSG
      );
      message = 'Selected text copied to clipboard as Markdown.';
      outputChannel.appendLine(message);
      if (showCopiedMsg) {
        window.showInformationMessage(message);
      }
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.stack ?? err.message : String(err);
      outputChannel.appendLine(errorMsg);
      window.showErrorMessage(
        'Error copying selected text as Markdown. See output for details.'
      );
    }
  };
