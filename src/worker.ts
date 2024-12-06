import * as fs from 'fs';
import walk from 'ignore-walk';
import { scanDirectory } from './scanner.js';
import {
  type FileResult,
  type ReadFilesResult,
  type ScanAndReadDirectoryResult,
  type ScanDirectoryResult,
  type WorkerErrorResult,
  WorkerActionsSchema,
} from './schema.js';

process.stdin.setEncoding('utf-8');
process.stdin.on('data', async (data: string) => {
  data = data.trim();
  if (!data) {
    return;
  }

  let message: unknown;
  try {
    message = JSON.parse(data);
  } catch (err) {
    returnError('Invalid JSON input');
    return;
  }

  const parseResult = WorkerActionsSchema.safeParse(message);
  if (!parseResult.success) {
    returnError(`Invalid action input: ${parseResult.error.message}`);
    return;
  }

  const actionMessage = parseResult.data;

  const { action, workspaceRoot, gitignore } = actionMessage;

  const ignoredPaths = gitignore
    ? new Set(
        await walk({
          path: actionMessage.workspaceRoot,
          ignoreFiles: ['.gitignore'],
        })
      )
    : undefined;

  try {
    if (action === 'scanDirectory') {
      const { dir } = actionMessage;
      const { treeLines, files } = await scanDirectory(
        dir,
        workspaceRoot,
        ignoredPaths
      );
      const result: ScanDirectoryResult = {
        type: 'scanDirectory',
        treeLines,
        files,
      };
      process.stdout.write(JSON.stringify(result) + '\n');
    } else if (action === 'readFiles') {
      const { files } = actionMessage;
      const results = await readFiles(files);
      const result: ReadFilesResult = {
        type: 'readFiles',
        results,
      };
      process.stdout.write(JSON.stringify(result) + '\n');
    } else if (action === 'scanAndReadDirectory') {
      const { dir } = actionMessage;

      const { treeLines, files } = await scanDirectory(
        dir,
        workspaceRoot,
        ignoredPaths
      );
      const fileResults = await readFiles(files);
      const result: ScanAndReadDirectoryResult = {
        type: 'scanAndReadDirectory',
        treeLines,
        files,
        fileResults,
      };
      process.stdout.write(JSON.stringify(result) + '\n');
    }
  } catch (err: any) {
    returnError(err.message);
  }
});

const readFiles = async (files: string[]): Promise<FileResult[]> =>
  await Promise.all(
    files.map(async file => {
      try {
        const content = await fs.promises.readFile(file, 'utf-8');
        return { file, content };
      } catch (err: any) {
        return { file, content: null, error: err.message };
      }
    })
  );

const returnError = (message: string): void => {
  const errorResult: WorkerErrorResult = { error: message };
  process.stdout.write(JSON.stringify(errorResult) + '\n');
};
