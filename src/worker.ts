import * as fs from 'fs';
import { scanDirectory } from './scanner.js';

process.stdin.setEncoding('utf-8');
process.stdin.on('data', async (data: string) => {
  data = data.trim();
  if (!data) {
    return;
  }

  let message: { action?: string; dir?: string; files?: string[] };
  try {
    message = JSON.parse(data);
  } catch (err) {
    process.stdout.write(
      JSON.stringify({ error: 'Invalid JSON input' }) + '\n'
    );
    return;
  }

  if (!message.action) {
    process.stdout.write(
      JSON.stringify({ error: 'No action specified' }) + '\n'
    );
    return;
  }

  if (message.action === 'scanDirectory') {
    if (!message.dir) {
      process.stdout.write(
        JSON.stringify({ error: 'No directory specified' }) + '\n'
      );
      return;
    }

    try {
      const result = await scanDirectory(message.dir);
      process.stdout.write(JSON.stringify(result) + '\n');
    } catch (err: any) {
      process.stdout.write(JSON.stringify({ error: err.message }) + '\n');
    }
  } else if (message.action === 'readFiles') {
    if (!message.files || !Array.isArray(message.files)) {
      process.stdout.write(
        JSON.stringify({ error: 'No valid files array provided' }) + '\n'
      );
      return;
    }

    const results = await readFiles(message.files);
    process.stdout.write(JSON.stringify({ results }) + '\n');
  } else if (message.action === 'scanAndReadDirectory') {
    if (!message.dir) {
      process.stdout.write(
        JSON.stringify({ error: 'No directory specified' }) + '\n'
      );
      return;
    }

    try {
      const { treeLines, files } = await scanDirectory(message.dir);
      const fileResults = await readFiles(files);
      process.stdout.write(
        JSON.stringify({ treeLines, files, fileResults }) + '\n'
      );
    } catch (err: any) {
      process.stdout.write(JSON.stringify({ error: err.message }) + '\n');
    }
  } else {
    process.stdout.write(JSON.stringify({ error: 'Unknown action' }) + '\n');
  }
});

async function readFiles(
  files: string[]
): Promise<{ file: string; content: string | null; error?: string }[]> {
  const results: { file: string; content: string | null; error?: string }[] =
    [];
  for (const file of files) {
    try {
      const content = await fs.promises.readFile(file, 'utf-8');
      results.push({ file, content });
    } catch (err: any) {
      results.push({ file, content: null, error: err.message });
    }
  }
  return results;
}
