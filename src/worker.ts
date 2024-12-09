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
  } = validation.data;

  const [
    { treeLines, files },
    { default: clipboardy },
    { default: binaryExtensions },
  ] = await Promise.all([
    scan(selectedPath, workspaceRoot, ignoreFiles, additionalIgnores),
    import('clipboardy'),
    import('binary-extensions'),
  ]);

  let markdown = '';
  if (type === 'tree') {
    markdown = buildMarkdownContent([], undefined, treeLines);
  } else {
    const binaryExtensionsSet = ignoreBinary
      ? new Set(binaryExtensions)
      : undefined;

    const fileResults = await Promise.all(
      files.map(async file => {
        try {
          if (binaryExtensionsSet) {
            const ext = path.extname(file).toLowerCase().slice(1);
            if (binaryExtensionsSet.has(ext)) {
              // Known binary extension, don't read it; just mark it as binary
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
