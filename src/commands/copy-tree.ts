import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { runInWorker } from '../run-in-worker.js';
import type { ScanDirectoryAction, ScanDirectoryResult } from '../schema.js';

export const copyMdTree =
  (context: vscode.ExtensionContext, outputChannel: vscode.OutputChannel) =>
  async (uri: vscode.Uri) => {
    if (!uri) {
      const message = 'No file or folder selected.';
      outputChannel.appendLine(message);
      vscode.window.showErrorMessage(message);
      return;
    }

    outputChannel.appendLine(`copyMdTree invoked on: ${uri.fsPath}`);
    const stats = fs.statSync(uri.fsPath);

    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      const message = 'No workspace folder found.';
      outputChannel.appendLine(message);
      vscode.window.showErrorMessage(message);
      return;
    }

    if (stats.isDirectory()) {
      const payload: ScanDirectoryAction = {
        action: 'scanDirectory',
        dir: uri.fsPath,
        workspaceRoot: workspaceFolders[0].uri.fsPath,
        ignoredPaths: context.globalState.get<Set<string> | undefined>(
          'marktree.ignoredPaths',
          undefined
        ),
      };
      const { treeLines } = await runInWorker<ScanDirectoryResult>(
        payload,
        context,
        outputChannel
      );
      const treeOutput = treeLines.join('\n');

      await vscode.env.clipboard.writeText(`\`\`\`sh\n${treeOutput}\n\`\`\``);
      outputChannel.appendLine(
        'Markdown tree copied to clipboard successfully.'
      );
      vscode.window.showInformationMessage(
        'Markdown tree copied to clipboard!'
      );
    } else {
      const fileName = path.basename(uri.fsPath);

      await vscode.env.clipboard.writeText(`- ${fileName}`);
      outputChannel.appendLine(`File name (${fileName}) copied as Markdown.`);
      vscode.window.showInformationMessage('File name copied as Markdown!');
    }
  };
