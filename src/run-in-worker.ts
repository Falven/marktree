import { spawn } from 'child_process';
import * as vscode from 'vscode';
import {
  WorkerActionsSchema,
  WorkerResultsSchema,
  type WorkerActions,
  type WorkerResults,
} from './schema.js';

export function runInWorker<T extends WorkerResults>(
  payload: WorkerActions,
  context: vscode.ExtensionContext,
  outputChannel: vscode.OutputChannel
): Promise<T> {
  const payloadCheck = WorkerActionsSchema.safeParse(payload);
  if (!payloadCheck.success) {
    return Promise.reject(
      new Error(`Invalid WorkerAction: ${payloadCheck.error.message}`)
    );
  }

  return new Promise((resolve, reject) => {
    const workerPath = context.asAbsolutePath('out/worker.js');

    const child = spawn(process.execPath, [workerPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      detached: true,
    });

    outputChannel.appendLine(`Spawned worker with PID: ${child.pid}`);

    let buffer = '';
    child.stdout.setEncoding('utf-8');

    child.stdout.on('data', (data: string) => {
      buffer += data;
      if (buffer.includes('\n')) {
        const lines = buffer.split('\n').filter(line => line.trim() !== '');
        buffer = '';
        for (const line of lines) {
          let parsed: unknown;
          try {
            parsed = JSON.parse(line);
          } catch {
            reject(new Error('Invalid JSON from worker.'));
            return;
          }

          const resultCheck = WorkerResultsSchema.safeParse(parsed);
          if (!resultCheck.success) {
            reject(
              new Error(`Invalid WorkerResult: ${resultCheck.error.message}`)
            );
            return;
          }

          const result = resultCheck.data as T;

          if ('error' in result) {
            reject(new Error(result.error));
          } else {
            resolve(result);
          }
        }
      }
    });

    child.stderr.on('data', data => {
      console.error(`Worker ${child.pid} error: ${data}`);
    });

    child.on('error', error => {
      reject(new Error(`Worker ${child.pid} process error: ${error.message}`));
    });

    child.on('close', code => {
      if (code !== 0) {
        reject(new Error(`Worker ${child.pid} exited with code: ${code}`));
      }
    });

    child.stdin.write(JSON.stringify(payload) + '\n');
  });
}
