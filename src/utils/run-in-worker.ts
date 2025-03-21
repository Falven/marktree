import { Worker } from 'node:worker_threads';
import type { ExtensionContext, OutputChannel } from 'vscode';
import type { WorkerRequest } from '../schema.js';

export const runInWorker = (
  payload: WorkerRequest,
  context: ExtensionContext,
  outputChannel: OutputChannel
): Promise<number> => {
  const workerPath = context.asAbsolutePath('out/worker.js');
  return new Promise((resolve, reject) => {
    const worker = new Worker(workerPath, {
      workerData: payload,
    });

    let filesCount = 0;

    worker.once('message', msg => {
      if (typeof msg.filesCount === 'number') {
        filesCount = msg.filesCount;
      }
    });

    const { threadId } = worker;
    const { type } = payload;
    outputChannel.appendLine(
      `Worker thread type: ${type}, tid: ${threadId} started.`
    );

    worker.once('error', async (err: Error) => {
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
      resolve(filesCount);
    });
  });
};
