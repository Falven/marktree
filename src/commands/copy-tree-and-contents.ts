import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { guessLanguageByExtension, scanDirectory } from '../scanner.js';

export const registerCopyMdTreeAndContents = (
  context: vscode.ExtensionContext,
  outputChannel: vscode.OutputChannel
) => {
  const copyMdTreeAndContents = vscode.commands.registerCommand(
    'extension.copyMdTreeAndContents',
    async (uri: vscode.Uri) => {
      if (!uri) {
        outputChannel.appendLine(
          'No file or folder selected for copyMdTreeAndContents.'
        );
        vscode.window.showErrorMessage('No file or folder selected.');
        return;
      }

      const stats = fs.statSync(uri.fsPath);
      outputChannel.appendLine(
        `copyMdTreeAndContents invoked on: ${uri.fsPath}`
      );

      if (stats.isDirectory()) {
        const { treeLines, files } = scanDirectory(uri.fsPath);
        outputChannel.appendLine(
          `Found ${files.length} file(s) in directory for tree and contents.`
        );

        const treeOutput = treeLines.join('\n');
        const lines: string[] = [];
        lines.push(`\`\`\`sh\n${treeOutput}\n\`\`\`\n\n`);

        if (files.length === 0) {
          outputChannel.appendLine(
            'No files found in the directory for tree and contents.'
          );
          lines.push('No files found in this directory.\n');
          const markdown = lines.join('');
          await vscode.env.clipboard.writeText(markdown);
          vscode.window.showInformationMessage(
            'Markdown tree and contents copied to clipboard! (No files)'
          );
        } else {
          try {
            const results = await runInWorker(files, outputChannel, context);
            for (const r of results) {
              const relPath = path.relative(uri.fsPath, r.file);
              const lang = guessLanguageByExtension(r.file) || 'plaintext';
              if (r.error) {
                lines.push(`Error reading ${relPath}: ${r.error}\n`);
              } else if (r.content !== null) {
                lines.push(
                  `${relPath}\n\`\`\`${lang}\n${r.content}\n\`\`\`\n\n`
                );
              }
            }

            const markdown = lines.join('');
            await vscode.env.clipboard.writeText(markdown);
            outputChannel.appendLine(
              'Markdown tree and contents copied to clipboard.'
            );
            vscode.window.showInformationMessage(
              'Markdown tree and contents copied to clipboard!'
            );
          } catch (error: any) {
            outputChannel.appendLine(`Error from worker: ${error.message}`);
            vscode.window.showErrorMessage(
              `Error from worker: ${error.message}`
            );
          }
        }
      } else {
        try {
          const results = await runInWorker(
            [uri.fsPath],
            outputChannel,
            context
          );
          const r = results[0];
          if (r.error) {
            throw new Error(r.error);
          }
          const lang = guessLanguageByExtension(uri.fsPath) || 'plaintext';
          const markdownContents = `${path.basename(
            uri.fsPath
          )}\n\`\`\`${lang}\n${r.content}\n\`\`\``;
          await vscode.env.clipboard.writeText(markdownContents);
          outputChannel.appendLine(
            `File contents for ${uri.fsPath} copied to clipboard (tree and contents mode).`
          );
          vscode.window.showInformationMessage(
            'File contents copied to clipboard!'
          );
        } catch (err: any) {
          outputChannel.appendLine(`Error from worker: ${err.message}`);
          vscode.window.showErrorMessage(`Error from worker: ${err.message}`);
        }
      }
    }
  );

  context.subscriptions.push(copyMdTreeAndContents);
};

const runInWorker = async (
  files: string[],
  outputChannel: vscode.OutputChannel,
  context: vscode.ExtensionContext
): Promise<{ file: string; content: string | null; error?: string }[]> => {
  return new Promise((resolve, reject) => {
    const workerPath = context.asAbsolutePath('out/worker.js');

    const child = spawn(process.execPath, [workerPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      detached: true,
    });

    let buffer = '';
    child.stdout.setEncoding('utf-8');
    child.stdout.on('data', (data: string) => {
      buffer += data;
      if (buffer.includes('\n')) {
        const lines = buffer.split('\n').filter(line => line.trim() !== '');
        buffer = '';
        for (const line of lines) {
          try {
            const parsed = JSON.parse(line);
            if (parsed.results) {
              resolve(parsed.results);
            } else if (parsed.error) {
              reject(new Error(parsed.error));
            }
          } catch {
            reject(new Error('Invalid JSON from worker.'));
          }
        }
      }
    });

    child.stderr.on('data', data => {
      outputChannel.appendLine(`Worker stderr: ${data}`);
    });

    child.on('error', error => {
      reject(new Error(`Worker process error: ${error.message}`));
    });

    child.on('close', code => {
      if (code !== 0) {
        reject(new Error(`Worker exited with code ${code}`));
      }
    });

    child.stdin.write(JSON.stringify({ files }) + '\n');
  });
};
