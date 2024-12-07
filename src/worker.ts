import * as fs from 'node:fs';
import { buildMarkdownContent } from './utils/markdown.js';
import { scanDirectory } from './utils/scanner.js';

(async () => {
  const args = process.argv.slice(2);
  // Expecting args: <type> <path> <workspaceRoot> <gitignore>
  if (args.length < 4) {
    console.error('Not enough arguments provided.');
    process.exit(1);
  }

  const [type, dirPath, workspaceRoot, gitignoreStr] = args;
  const gitignore = gitignoreStr === 'true';

  try {
    const { treeLines, files } = await scanDirectory(
      dirPath,
      workspaceRoot,
      gitignore ? ['.gitignore'] : []
    );

    const { default: clipboardy } = await import('clipboardy');

    let markdown = '';

    if (type === 'tree') {
      markdown = buildMarkdownContent([], undefined, treeLines);
    } else {
      const fileResults = await Promise.all(
        files.map(async file => {
          try {
            const content = await fs.promises.readFile(file, 'utf-8');
            return { file, content };
          } catch (err: any) {
            return { file, content: null, error: err.message };
          }
        })
      );

      if (type === 'readFiles') {
        markdown = buildMarkdownContent(fileResults, dirPath);
      } else if (type === 'treeAndReadFiles') {
        markdown = buildMarkdownContent(fileResults, dirPath, treeLines);
      } else {
        console.error(`Invalid request type: ${type}`);
        process.exit(1);
      }
    }

    if (!markdown) {
      console.error('No content to copy.');
      process.exit(1);
    }

    await clipboardy.write(markdown);
    process.exit(0);
  } catch (err: any) {
    console.error(err.message || String(err));
    process.exit(1);
  }
})();
