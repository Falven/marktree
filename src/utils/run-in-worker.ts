import { Worker } from 'node:worker_threads';
import * as vscode from 'vscode';
import { type WorkerRequest } from '../schema.js';

export const runInWorker = (
  payload: WorkerRequest,
  context: vscode.ExtensionContext,
  outputChannel: vscode.OutputChannel
): Promise<void> => {
  const workerPath = context.asAbsolutePath('out/worker.js');
  return new Promise((resolve, reject) => {
    const worker = new Worker(workerPath, {
      workerData: payload,
    });

    const { threadId } = worker;
    const { type } = payload;
    outputChannel.appendLine(
      `Worker thread type: ${type}, tid: ${threadId} started.`
    );

    worker.once('error', async err => {
      outputChannel.appendLine(
        `Worker thread type: ${type}, tid: ${threadId} encountered an error: ${err.message}`
      );
      await worker.terminate();
      reject(err);
    });

    worker.once('exit', async code => {
      outputChannel.appendLine(
        `Worker thread type: ${type}, tid: ${threadId} exited with code ${code}.`
      );
      await worker.terminate();
      resolve();
    });
  });
};
