import pLimit from '@common.js/p-limit';
import fg from 'fast-glob';
import * as fs from 'fs';
import ignore from 'ignore';
import * as path from 'path';
import * as vscode from 'vscode';

let ig: ReturnType<typeof ignore> | null = null;
let workspaceRoot: string | undefined;

/**
 * Transforms lines from a `.gitignore` file by trimming, handling commented/empty lines,
 * and optionally prefixing them with a relative directory for proper scoping.
 *
 * @param lines An array of raw lines from a `.gitignore` file.
 * @param relativeDir A relative directory path to prepend to each non-commented, non-empty line.
 * @returns A new array of transformed lines.
 */
const transformGitignoreLines = (
  lines: string[],
  relativeDir: string
): string[] => {
  return lines.map(originalLine => {
    let line = originalLine.trim();

    // If line is empty or a comment, return as is.
    if (!line || line.startsWith('#')) {
      return line;
    }

    // Otherwise, prepend relativeDir if needed
    if (relativeDir) {
      return line.startsWith('/')
        ? relativeDir + line
        : path.join(relativeDir, line);
    }

    return line;
  });
};

/**
 * Initializes the `ignore` instance by finding and adding all patterns from `.gitignore` files
 * in the given workspace. This function:
 *  - Checks whether `.gitignore` processing should occur based on `workspaceFolder` and `gitignoreEnabled`.
 *  - Finds all `.gitignore` files using `fast-glob`.
 *  - Reads each `.gitignore` file (with limited concurrency), transforms their lines, and adds them to the `ignore` instance.
 *
 * @param workspaceFolder The root folder of the workspace.
 * @param gitignoreEnabled Whether `.gitignore` support is enabled.
 * @param outputChannel A VS Code output channel for logging progress and actions.
 * @returns A promise that resolves once the `.gitignore` files have been processed and added.
 */
export const initializeIgnore = async (
  workspaceFolder: string | undefined,
  gitignoreEnabled: boolean,
  outputChannel: vscode.OutputChannel
): Promise<void> => {
  workspaceRoot = workspaceFolder;

  if (!workspaceFolder || !gitignoreEnabled) {
    ig = null;
    outputChannel.appendLine(
      `Not initializing .gitignore processing: workspaceFolder or gitignore is disabled.`
    );
    return;
  }

  outputChannel.appendLine(
    `Initializing ignore with workspace: ${workspaceFolder}`
  );

  ig = ignore();

  outputChannel.appendLine(`Finding all .gitignore files using fast-glob...`);

  const gitignoreFiles = await fg('**/.gitignore', {
    cwd: workspaceFolder,
    dot: true,
    absolute: true,
  });

  outputChannel.appendLine(
    `Found ${gitignoreFiles.length} .gitignore files. Processing them with concurrency limit...`
  );

  const limit = pLimit(10);

  await Promise.all(
    gitignoreFiles.map(gitignoreFile =>
      limit(async () => {
        const gitignoreContent = await fs.promises.readFile(
          gitignoreFile,
          'utf-8'
        );
        const relativeDir = path.relative(
          workspaceFolder,
          path.dirname(gitignoreFile)
        );
        const transformedLines = transformGitignoreLines(
          gitignoreContent.split('\n'),
          relativeDir
        );

        ig!.add(transformedLines);
        outputChannel.appendLine(`Added patterns from: ${gitignoreFile}`);
      })
    )
  );

  outputChannel.appendLine(`All .gitignore files have been processed.`);
};

/**
 * Determines if a given file path should be ignored based on the currently loaded
 * `.gitignore` patterns.
 *
 * @param fullPath The full file path to test.
 * @returns `true` if the path should be ignored, otherwise `false`.
 */
export const shouldIgnore = (fullPath: string): boolean => {
  if (!ig || !workspaceRoot) {
    return false;
  }
  const rel = path.relative(workspaceRoot, fullPath);
  return ig.ignores(rel);
};
