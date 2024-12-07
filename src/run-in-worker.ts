import { spawn } from 'child_process';
import * as vscode from 'vscode';

export function runInWorker(
  payload: object,
  context: vscode.ExtensionContext
): Promise<any> {
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
            if (parsed.treeLines && parsed.files && parsed.fileResults) {
              // scanAndReadDirectory result
              resolve(parsed);
            } else if (parsed.treeLines && parsed.files) {
              // scanDirectory result
              resolve(parsed);
            } else if (parsed.results) {
              // readFiles result
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
      // Optionally log or ignore
    });

    child.on('error', error => {
      reject(new Error(`Worker process error: ${error.message}`));
    });

    child.on('close', code => {
      if (code !== 0) {
        reject(new Error(`Worker exited with code ${code}`));
      }
    });

    child.stdin.write(JSON.stringify(payload) + '\n');
  });
}
