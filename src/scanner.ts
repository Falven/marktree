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
 * collecting file paths. It respects .gitignore patterns and skips ignored files/directories. Hidden files
 * and directories are not filtered out.
 *
 * **Key Features:**
 * - Uses a depth-first approach with a stack, processing all directories currently available in parallel per iteration.
 * - Limits concurrency with p-limit to avoid overwhelming the file system.
 * - Does not sort entries, presenting them in the order that the filesystem provides.
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

  while (stack.length > 0) {
    const currentBatch = stack.splice(0, stack.length);

    outputChannel.appendLine(
      `Processing ${currentBatch.length} directories in parallel...`
    );

    const batchResults = await Promise.all(
      currentBatch.map(async frame => {
        const { dir, prefix } = frame;
        try {
          const entries = await limit(() =>
            fs.promises.readdir(dir, { withFileTypes: true })
          );
          return { dir, prefix, entries };
        } catch (err) {
          outputChannel.appendLine(
            `Failed to read directory: ${dir}, Error: ${
              err instanceof Error ? err.message : String(err)
            }`
          );
          return { dir, prefix, entries: [] as fs.Dirent[] };
        }
      })
    );

    for (const { dir, prefix, entries: rawEntries } of batchResults) {
      // Filter only by ignore rules, not by hidden files/dirs
      let entries = rawEntries.filter(entry => {
        const fullPath = path.join(dir, entry.name);
        return !shouldIgnore(fullPath);
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
    }
  }

  treeLines.push(`\n${counts.dirs} directories, ${counts.files} files`);
  outputChannel.appendLine(`Scan complete. Found ${counts.dirs} directories and ${counts.files} files.`);
  return { treeLines, files };
};

/**
 * Guesses the programming language based on a file's extension.
 * Falls back to 'plaintext' if the extension is not recognized.
 *
 * @param filePath The full path of the file
 * @returns A string representing the guessed language.
 */
export const guessLanguageByExtension = (filePath: string): string => {
  const ext = path.extname(filePath).toLowerCase().replace('.', '');
  return knownLangs[ext] || 'plaintext';
};
