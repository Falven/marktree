import { spawn } from 'node:child_process';
import * as vscode from 'vscode';
import { type WorkerRequest } from '../schema.js';

export const runInWorker = (
  payload: WorkerRequest,
  context: vscode.ExtensionContext,
  outputChannel: vscode.OutputChannel
): Promise<void> => {
  // Convert payload into arguments
  // For example, we can pass:
  //   worker.js <type> <path> <workspaceRoot> <gitignore>
  // Where gitignore is 'true' or 'false'
  const { type, path, workspaceRoot, gitignore } = payload;

  const workerPath = context.asAbsolutePath('out/worker.js');
  const args = [
    workerPath,
    type,
    path,
    workspaceRoot,
    gitignore ? 'true' : 'false',
  ];

  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      stdio: ['ignore', 'ignore', 'pipe'],
      detached: true,
    });

    outputChannel.appendLine(`Spawned worker with PID: ${child.pid}`);

    // Note: We could read child.stderr if we want to show error messages.
    let errorMessage = '';
    child.stderr.setEncoding('utf-8');
    child.stderr.on('data', data => {
      errorMessage += data;
    });

    child.on('error', error => {
      reject(new Error(`Worker process error: ${error.message}`));
    });

    child.on('close', code => {
      if (code === 0) {
        resolve();
      } else {
        const msg = errorMessage.trim() || `Worker exited with code: ${code}`;
        reject(new Error(msg));
      }
    });
  });
};
