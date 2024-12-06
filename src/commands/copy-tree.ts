import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { scanDirectory } from '../scanner.js';

export const registerCopyMdTree = (
  context: vscode.ExtensionContext,
  outputChannel: vscode.OutputChannel
) => {
  const copyMdTree = vscode.commands.registerCommand(
    'extension.copyMdTree',
    async (uri: vscode.Uri) => {
      if (!uri) {
        outputChannel.appendLine('No file or folder selected for copyMdTree.');
        vscode.window.showErrorMessage('No file or folder selected.');
        return;
      }

      const stats = fs.statSync(uri.fsPath);
      outputChannel.appendLine(`copyMdTree invoked on: ${uri.fsPath}`);

      if (stats.isDirectory()) {
        const { treeLines } = scanDirectory(uri.fsPath);
        const treeOutput = treeLines.join('\n');
        const markdownTree = `\`\`\`sh\n${treeOutput}\n\`\`\``;
        vscode.env.clipboard.writeText(markdownTree).then(() => {
          outputChannel.appendLine(
            'Markdown tree copied to clipboard successfully.'
          );
          vscode.window.showInformationMessage(
            'Markdown tree copied to clipboard!'
          );
        });
      } else {
        const fileName = path.basename(uri.fsPath);
        const markdown = `- ${fileName}`;
        vscode.env.clipboard.writeText(markdown).then(() => {
          outputChannel.appendLine(
            `File name (${fileName}) copied as Markdown.`
          );
          vscode.window.showInformationMessage('File name copied as Markdown!');
        });
      }
    }
  );

  context.subscriptions.push(copyMdTree);
};
