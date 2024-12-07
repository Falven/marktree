import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { runInWorker } from '../run-in-worker.js';
import type { WorkerScanDirectoryResult } from '../types.js';

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

      outputChannel.appendLine(`copyMdTree invoked on: ${uri.fsPath}`);
      const stats = fs.statSync(uri.fsPath);

      let markdown = '';
      if (stats.isDirectory()) {
        const { treeLines } = await runInWorker<WorkerScanDirectoryResult>(
          { action: 'scanDirectory', dir: uri.fsPath },
          context
        );
        const treeOutput = treeLines.join('\n');
        markdown = `\`\`\`sh\n${treeOutput}\n\`\`\``;

        await vscode.env.clipboard.writeText(markdown);
        outputChannel.appendLine(
          'Markdown tree copied to clipboard successfully.'
        );
        vscode.window.showInformationMessage(
          'Markdown tree copied to clipboard!'
        );
      } else {
        const fileName = path.basename(uri.fsPath);
        markdown = `- ${fileName}`;

        await vscode.env.clipboard.writeText(markdown);
        outputChannel.appendLine(`File name (${fileName}) copied as Markdown.`);
        vscode.window.showInformationMessage('File name copied as Markdown!');
      }
    }
  );

  context.subscriptions.push(copyMdTree);
};
