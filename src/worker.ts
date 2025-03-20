import * as childProcess from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { parentPort, workerData } from 'node:worker_threads';
import { type WorkerRequest, WorkerRequestSchema } from './schema.js';
import {
  buildMarkdownContent,
  buildShellExecContent,
} from './utils/markdown.js';
import { type ScanResult, scan } from './utils/scanner.js';

(async () => {
  const validation = WorkerRequestSchema.safeParse(workerData);
  if (!validation.success) {
    throw new Error(`Invalid WorkerRequest: ${validation.error.message}`);
  }
  const request = validation.data as WorkerRequest;

  let scanningPromise: Promise<ScanResult> = Promise.resolve({
    treeLines: [],
    files: [],
  });

  switch (request.type) {
    case 'tree': {
      scanningPromise = scan(
        request.workspaceRoot,
        request.selectedPath,
        request.ignoreFiles,
        request.additionalIgnores
      );
      break;
    }
    case 'readFilesPaths': {
      scanningPromise = Promise.resolve({
        treeLines: [],
        files: request.paths,
      });
      break;
    }
    case 'readFilesSelected': {
      scanningPromise = scan(
        request.workspaceRoot,
        request.selectedPath,
        request.ignoreFiles,
        request.additionalIgnores
      );
      break;
    }
    case 'treeAndReadFilesPaths': {
      scanningPromise = (async (): Promise<ScanResult> => {
        const combinedTreeLines: string[] = [];
        const combinedFiles: string[] = [];
        for (const p of request.paths) {
          const result = await scan(
            request.workspaceRoot,
            p,
            request.ignoreFiles,
            request.additionalIgnores
          );
          combinedTreeLines.push(...result.treeLines);
          combinedFiles.push(...result.files);
        }
        return { treeLines: combinedTreeLines, files: combinedFiles };
      })();
      break;
    }
    case 'treeAndReadFilesSelected': {
      scanningPromise = scan(
        request.workspaceRoot,
        request.selectedPath,
        request.ignoreFiles,
        request.additionalIgnores
      );
      break;
    }
    case 'shellExec': {
      break;
    }
  }

  const clipboardyPromise = import('clipboardy');
  const binaryExtensionsPromise =
    request.type === 'tree' || request.type === 'shellExec'
      ? Promise.resolve(null)
      : import('binary-extensions');

  const [scanResult, { default: clipboardy }, binaryExtensionsModule] =
    await Promise.all([
      scanningPromise,
      clipboardyPromise,
      binaryExtensionsPromise,
    ]);

  let markdown = '';
  let filesCount = 0;

  switch (request.type) {
    case 'tree': {
      markdown = buildMarkdownContent(
        [],
        request.workspaceRoot,
        scanResult.treeLines
      );
      filesCount = scanResult.files.length;
      break;
    }
    case 'readFilesPaths':
    case 'readFilesSelected':
    case 'treeAndReadFilesPaths':
    case 'treeAndReadFilesSelected': {
      const { treeLines, files } = scanResult;
      let binaryExtensionsSet: Set<string> | undefined;
      if (request.ignoreBinary && binaryExtensionsModule) {
        binaryExtensionsSet = new Set(binaryExtensionsModule.default || []);
      }
      const fileResults = await Promise.all(
        files.map(async filePath => {
          try {
            const ext = path.extname(filePath).toLowerCase().slice(1);
            if (binaryExtensionsSet?.has(ext)) {
              return { file: filePath, content: null, isBinary: true };
            }
            const content = await fs.promises.readFile(filePath, 'utf-8');
            return { file: filePath, content };
          } catch (err) {
            if (err instanceof Error) {
              return { file: filePath, content: null, error: err.message };
            }
            return { file: filePath, content: null, error: String(err) };
          }
        })
      );
      filesCount = fileResults.length;
      if (
        request.type === 'readFilesPaths' ||
        request.type === 'readFilesSelected'
      ) {
        markdown = buildMarkdownContent(fileResults, request.workspaceRoot);
      } else {
        markdown = buildMarkdownContent(
          fileResults,
          request.workspaceRoot,
          treeLines
        );
      }
      break;
    }
    case 'shellExec': {
      filesCount = 0;
      if (!request.shellCommands?.length) {
        throw new Error('No shell commands provided for "shellExec".');
      }
      const results = request.shellCommands.map(cmd => {
        const displayCmd = `${cmd.command} ${cmd.args.join(' ')}`;
        let output = '';
        try {
          output = childProcess.execSync(displayCmd, {
            cwd: cmd.cwd ?? request.workspaceRoot ?? process.cwd(),
            encoding: 'utf-8',
          });
        } catch (err) {
          if (err instanceof Error) {
            output = err.message;
          } else {
            output = String(err);
          }
        }
        return { cmd: displayCmd, output };
      });
      const combined = buildShellExecContent(results);
      if (!combined.trim()) {
        throw new Error('No output from shellExec commands.');
      }
      markdown = combined;
      break;
    }
  }

  if (!markdown) {
    throw new Error('No Markdown content to copy.');
  }

  parentPort?.postMessage({ filesCount });
  await clipboardy.write(markdown);
})();
