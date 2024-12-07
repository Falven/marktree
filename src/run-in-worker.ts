// src/runInWorker.ts
import { spawn } from 'child_process';
import * as vscode from 'vscode';
import type { WorkerActions, WorkerReturn } from './types.js';

export function runInWorker<T extends WorkerReturn>(
  payload: WorkerActions,
  context: vscode.ExtensionContext
): Promise<T> {
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
            if (parsed.error) {
              reject(new Error(parsed.error));
            } else {
              // Cast parsed to T, trusting that the caller used correct action
              resolve(parsed as T);
            }
          } catch {
            reject(new Error('Invalid JSON from worker.'));
          }
        }
      }
    });

    child.stderr.on('data', data => {
      console.error(`Worker error: ${data}`);
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
