import pLimit from '@common.js/p-limit';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { shouldIgnore } from './gitignore.js';
import { knownLangs } from './lang.js';

const limit = pLimit(10);

interface ScanResult {
  treeLines: string[];
  files: string[];
}

interface Frame {
  dir: string;
  prefix: string;
}

/**
 * Asynchronously scans a directory and all subdirectories, building an ASCII-style tree representation and
 * collecting file paths. It respects .gitignore patterns and skips hidden files/directories.
 *
 * **Key Features:**
 * - Uses a depth-first approach with a stack, but processes multiple directories in parallel batches for performance.
 * - Limits concurrency with p-limit to avoid overwhelming the file system.
 * - Maintains a stable order by sorting entries and processing them in sequence.
 * - Skips ignored and hidden files/directories early to save unnecessary work.
 * - Logs progress and actions using the provided output channel.
 *
 * @param directory The directory to scan.
 * @param outputChannel The VS Code output channel for logging progress and information.
 * @returns A promise that resolves to an object containing the ASCII tree lines and an array of discovered file paths.
 */
export const scanDirectory = async (
  directory: string,
  outputChannel: vscode.OutputChannel
): Promise<ScanResult> => {
  const counts = { dirs: 1, files: 0 };
  const treeLines: string[] = [];
  const files: string[] = [];

  outputChannel.appendLine(`Starting scan of: ${directory}`);
  treeLines.push(directory);

  const stack: Frame[] = [{ dir: directory, prefix: '' }];

  // Number of directories processed in parallel per iteration
  const batchSize = 5;

  while (stack.length > 0) {
    // Take a batch of directories from the stack
    const currentBatch: Frame[] = [];
    for (let i = 0; i < batchSize && stack.length > 0; i++) {
      currentBatch.push(stack.pop()!);
    }

    if (currentBatch.length === 0) {
      continue;
    }

    outputChannel.appendLine(
      `Processing batch of ${currentBatch.length} directories in parallel...`
    );

    // Read all directories in this batch in parallel
    const batchResults = await Promise.all(
      currentBatch.map(async frame => {
        const { dir, prefix } = frame;
        try {
          outputChannel.appendLine(`Reading directory: ${dir}`);
          const entries = await limit(() =>
            fs.promises.readdir(dir, { withFileTypes: true })
          );
          outputChannel.appendLine(
            `Read ${entries.length} entries from: ${dir}`
          );
          return { dir, prefix, entries };
        } catch (err) {
          outputChannel.appendLine(
            `Failed to read directory: ${dir}, error: ${
              err instanceof Error ? err.message : String(err)
            }`
          );
          return { dir, prefix, entries: [] as fs.Dirent[] };
        }
      })
    );

    for (const { dir, prefix, entries: rawEntries } of batchResults) {
      let entries = rawEntries.filter(entry => {
        if (entry.name.charAt(0) === '.') {
          return false;
        }
        const fullPath = path.join(dir, entry.name);
        if (shouldIgnore(fullPath)) {
          return false;
        }
        return true;
      });

      outputChannel.appendLine(
        `Filtered entries in ${dir}: ${rawEntries.length} -> ${entries.length} after hidden/ignore`
      );

      // Sort entries: directories first, then files, alphabetical
      entries.sort((a, b) => {
        const aIsDir = a.isDirectory() ? 0 : 1;
        const bIsDir = b.isDirectory() ? 0 : 1;
        if (aIsDir !== bIsDir) {
          return aIsDir - bIsDir;
        }
        return a.name.localeCompare(b.name);
      });

      const len = entries.length;
      for (let i = 0; i < len; i++) {
        const entry = entries[i];
        const name = entry.name;
        const isLast = i === len - 1;
        const part0 = isLast ? '└── ' : '├── ';
        const part1 = isLast ? '    ' : '│   ';
        const fullPath = path.join(dir, name);

        treeLines.push(prefix + part0 + name);

        if (entry.isDirectory()) {
          counts.dirs++;
          stack.push({
            dir: fullPath,
            prefix: prefix + part1,
          });
        } else {
          counts.files++;
          files.push(fullPath);
        }
      }

      if (len > 0) {
        outputChannel.appendLine(
          `Processed ${len} entries in directory: ${dir}`
        );
      } else {
        outputChannel.appendLine(`No entries to process in directory: ${dir}`);
      }
    }
  }

  outputChannel.appendLine(
    `Scan complete: ${counts.dirs} directories, ${counts.files} files`
  );
  treeLines.push(`\n${counts.dirs} directories, ${counts.files} files`);
  return { treeLines, files };
};

/**
 * Guesses the programming language based on a file's extension.
 * Falls back to 'plaintext' if the extension is not recognized.
 *
 * @param filePath The full path of the file.
 * @returns A string representing the guessed language.
 */
export const guessLanguageByExtension = (filePath: string): string => {
  const ext = path.extname(filePath).toLowerCase().replace('.', '');
  return knownLangs[ext] || 'plaintext';
};
