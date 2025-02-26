import * as childProcess from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { workerData } from 'node:worker_threads';

import { WorkerRequest, WorkerRequestSchema } from './schema.js';
import { buildMarkdownContent } from './utils/markdown.js';
import { scan } from './utils/scanner.js';

(async () => {
  const validation = WorkerRequestSchema.safeParse(workerData);
  if (!validation.success) {
    throw new Error(`Invalid WorkerRequest: ${validation.error.message}`);
  }
  const request = validation.data as WorkerRequest;

  let scanningPromise: Promise<{ treeLines: string[]; files: string[] }> =
    Promise.resolve({ treeLines: [], files: [] });

  if (request.type === 'tree') {
    scanningPromise = scan(
      request.selectedPath!,
      request.workspaceRoot!,
      request.ignoreFiles || [],
      request.additionalIgnores || []
    );
  } else if (
    request.type === 'readFiles' ||
    request.type === 'treeAndReadFiles'
  ) {
    if (
      request.type === 'readFiles' &&
      request.paths &&
      request.paths.length > 0
    ) {
      scanningPromise = Promise.resolve({
        treeLines: [],
        files: request.paths,
      });
    } else {
      scanningPromise = scan(
        request.selectedPath!,
        request.workspaceRoot!,
        request.ignoreFiles || [],
        request.additionalIgnores || []
      );
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

  switch (request.type) {
    case 'tree': {
      markdown = buildMarkdownContent([], undefined, scanResult.treeLines);
      break;
    }

    // ------------------------------------------------------------------------
    case 'readFiles':
    case 'treeAndReadFiles': {
      const { treeLines, files } = scanResult;

      let binaryExtensionsSet: Set<string> | undefined;
      if (request.ignoreBinary && binaryExtensionsModule) {
        binaryExtensionsSet = new Set(binaryExtensionsModule.default || []);
      }

      const fileResults = await Promise.all(
        files.map(async file => {
          try {
            const ext = path.extname(file).toLowerCase().slice(1);
            if (binaryExtensionsSet?.has(ext)) {
              return { file, content: null, isBinary: true };
            }
            const content = await fs.promises.readFile(file, 'utf-8');
            return { file, content };
          } catch (err: any) {
            return { file, content: null, error: err.message };
          }
        })
      );

      if (request.type === 'readFiles') {
        markdown = buildMarkdownContent(fileResults, request.selectedPath);
      } else {
        markdown = buildMarkdownContent(
          fileResults,
          request.selectedPath,
          treeLines
        );
      }
      break;
    }

    case 'shellExec': {
      if (!request.shellCommands || request.shellCommands.length === 0) {
        throw new Error('No shell commands provided for "shellExec".');
      }

      let combined = '';
      for (const cmd of request.shellCommands) {
        const displayCmd = `${cmd.command} ${cmd.args.join(' ')}`;
        let output = '';
        try {
          output = childProcess.execSync(displayCmd, {
            cwd: cmd.cwd ?? request.workspaceRoot ?? process.cwd(),
            encoding: 'utf-8',
          });
        } catch (err: any) {
          output = `Error: ${err.message || String(err)}`;
        }
        combined += `\n**Command**: \`${displayCmd}\`\n\n\`\`\`diff\n${output}\n\`\`\`\n`;
      }

      if (!combined.trim()) {
        throw new Error('No output from shellExec commands.');
      }
      markdown = combined.trim() + '\n';
      break;
    }
  }

  if (!markdown) {
    throw new Error('No Markdown content to copy.');
  }

  await clipboardy.write(markdown);
})();
