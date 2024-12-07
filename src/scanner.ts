import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { shouldIgnore } from './gitignore.js';
import { knownLangs } from './lang.js';

interface ScanResult {
  treeLines: string[];
  files: string[];
}

interface Frame {
  dir: string;
  prefix: string;
}

/**
 * Asynchronously scans a directory and all subdirectories, building an ASCII-style tree representation.
 * It respects .gitignore patterns and skips ignored paths. Hidden files and directories are allowed.
 * Symlinks are displayed but not followed (like the `tree` command).
 *
 * **Key Features:**
 * - Depth-first approach using a stack.
 * - No concurrency limit (assume source repositories are not massive).
 * - No sorting of entries; rely on filesystem order.
 * - Minimal logging: only before and after the scan.
 * - Visited set to avoid re-processing the same directory (prevents loops).
 * - Avoids repeated path.join calls by manual string concatenation with path.sep.
 *
 * @param directory The directory to scan.
 * @param outputChannel The VS Code output channel for logging start and end of scan.
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
  const visited = new Set<string>([directory]);

  while (stack.length > 0) {
    const currentBatch = stack.splice(0, stack.length);

    const batchResults = await Promise.all(
      currentBatch.map(async frame => {
        const { dir, prefix } = frame;
        try {
          const entries = await fs.promises.readdir(dir, {
            withFileTypes: true,
          });
          return { dir, prefix, entries };
        } catch {
          // If we fail to read this directory, return an empty result
          return { dir, prefix, entries: [] as fs.Dirent[] };
        }
      })
    );

    for (const { dir, prefix, entries: rawEntries } of batchResults) {
      // Filter ignored paths
      const entries = rawEntries.filter(entry => {
        const fullPath = dir + path.sep + entry.name;
        return !shouldIgnore(fullPath);
      });

      const len = entries.length;
      for (let i = 0; i < len; i++) {
        const entry = entries[i];
        const name = entry.name;
        const isLast = i === len - 1;
        const part0 = isLast ? '└── ' : '├── ';
        const part1 = isLast ? '    ' : '│   ';
        const fullPath = dir + path.sep + name;

        treeLines.push(prefix + part0 + name);

        if (entry.isDirectory()) {
          // Check if we have visited this directory before
          if (!visited.has(fullPath)) {
            visited.add(fullPath);
            counts.dirs++;
            stack.push({
              dir: fullPath,
              prefix: prefix + part1,
            });
          }
        } else if (entry.isSymbolicLink()) {
          // Symlink: treat as file
          counts.files++;
          files.push(fullPath);
        } else {
          // Regular file
          counts.files++;
          files.push(fullPath);
        }
      }
    }
  }

  treeLines.push(`\n${counts.dirs} directories, ${counts.files} files`);
  outputChannel.appendLine(
    `Scan complete. Found ${counts.dirs} directories and ${counts.files} files.`
  );
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
