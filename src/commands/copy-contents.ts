import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { guessLanguageByExtension, scanDirectory } from '../scanner.js';

export const registerCopyMdContents = (
  context: vscode.ExtensionContext,
  outputChannel: vscode.OutputChannel
) => {
  const copyMdContents = vscode.commands.registerCommand(
    'extension.copyMdContents',
    async (uri: vscode.Uri) => {
      if (!uri) {
        outputChannel.appendLine(
          'No file or folder selected for copyMdContents.'
        );
        vscode.window.showErrorMessage('No file or folder selected.');
        return;
      }

      const stats = fs.statSync(uri.fsPath);
      outputChannel.appendLine(`copyMdContents invoked on: ${uri.fsPath}`);

      if (stats.isDirectory()) {
        const { files } = scanDirectory(uri.fsPath);
        outputChannel.appendLine(
          `Found ${files.length} file(s) in directory. Spawning worker process...`
        );

        try {
          const results = await runInWorker(files, outputChannel, context);
          let markdown = '';
          for (const r of results) {
            if (r.error) {
              markdown += `Error reading ${r.file}: ${r.error}\n`;
            } else if (r.content !== null) {
              const relPath = path.relative(uri.fsPath, r.file);
              const lang = guessLanguageByExtension(r.file) || 'plaintext';
              markdown += `${relPath}\n\`\`\`${lang}\n${r.content}\n\`\`\`\n\n`;
            }
          }

          await vscode.env.clipboard.writeText(markdown);
          outputChannel.appendLine(
            'All file contents copied to clipboard (via worker).'
          );
          vscode.window.showInformationMessage(
            'All file contents copied to clipboard!'
          );
        } catch (err: any) {
          outputChannel.appendLine(`Error from worker: ${err.message}`);
          vscode.window.showErrorMessage(`Error from worker: ${err.message}`);
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
            `File contents for ${uri.fsPath} copied to clipboard (via worker).`
          );
          vscode.window.showInformationMessage(
            'File contents copied to clipboard!'
          );
        } catch (error: any) {
          outputChannel.appendLine(
            `Error from worker (single file): ${error.message}`
          );
          vscode.window.showErrorMessage(`Error from worker: ${error.message}`);
        }
      }
    }
  );

  context.subscriptions.push(copyMdContents);
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
