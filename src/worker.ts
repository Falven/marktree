import * as fs from 'node:fs';
import * as path from 'node:path';
import { workerData } from 'node:worker_threads';
import { WorkerRequestSchema } from './schema.js';
import { buildMarkdownContent } from './utils/markdown.js';
import { scan } from './utils/scanner.js';

(async () => {
  const validation = WorkerRequestSchema.safeParse(workerData);
  if (!validation.success) {
    throw new Error(`Invalid WorkerRequest: ${validation.error.message}`);
  }
  const {
    type,
    selectedPath,
    workspaceRoot,
    ignoreFiles,
    ignoreBinary,
    additionalIgnores,
    paths,
  } = validation.data;

  const scanningPromise =
    type === 'readFiles' && paths && paths.length > 0
      ? Promise.resolve({ treeLines: [], files: paths })
      : scan(selectedPath, workspaceRoot, ignoreFiles, additionalIgnores);

  const clipboardyPromise = import('clipboardy');

  const binaryExtensionsPromise =
    type === 'tree' ? Promise.resolve(null) : import('binary-extensions');

  const [scanResult, { default: clipboardy }, binaryExtensionsModule] =
    await Promise.all([
      scanningPromise,
      clipboardyPromise,
      binaryExtensionsPromise,
    ]);

  const { treeLines, files } = scanResult;
  let markdown = '';

  if (type === 'tree') {
    markdown = buildMarkdownContent([], undefined, treeLines);
  } else {
    const binaryExtensions = binaryExtensionsModule
      ? binaryExtensionsModule.default
      : undefined;

    const binaryExtensionsSet =
      ignoreBinary && binaryExtensions ? new Set(binaryExtensions) : undefined;

    const fileResults = await Promise.all(
      files.map(async file => {
        try {
          if (binaryExtensionsSet) {
            const ext = path.extname(file).toLowerCase().slice(1);
            if (binaryExtensionsSet.has(ext)) {
              return { file, content: null, isBinary: true };
            }
          }
          const content = await fs.promises.readFile(file, 'utf-8');
          return { file, content };
        } catch (err: any) {
          return { file, content: null, error: err.message };
        }
      })
    );

    if (type === 'readFiles') {
      markdown = buildMarkdownContent(fileResults, selectedPath);
    } else if (type === 'treeAndReadFiles') {
      markdown = buildMarkdownContent(fileResults, selectedPath, treeLines);
    }
  }

  if (!markdown) {
    throw new Error('No Markdown content to copy.');
  }

  await clipboardy.write(markdown);
})();
