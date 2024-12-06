import * as fs from 'fs';
import ignore from 'ignore';
import * as path from 'path';

let ig: ReturnType<typeof ignore> | null = null;
let workspaceRoot: string | undefined;

export const initializeIgnore = (
  workspaceFolder: string | undefined,
  gitignoreEnabled: boolean
): void => {
  workspaceRoot = workspaceFolder;
  if (!workspaceFolder || !gitignoreEnabled) {
    ig = null;
    return;
  }

  ig = ignore();
  const gitignoreFiles = findAllGitignoreFiles(workspaceFolder);

  for (const gitignoreFile of gitignoreFiles) {
    const gitignoreContent = fs.readFileSync(gitignoreFile, 'utf-8');
    const relativeDir = path.relative(
      workspaceFolder,
      path.dirname(gitignoreFile)
    );
    const transformedLines = transformGitignoreLines(
      gitignoreContent.split('\n'),
      relativeDir
    );
    ig.add(transformedLines);
  }
};

export const shouldIgnore = (fullPath: string): boolean => {
  if (!ig || !workspaceRoot) {return false;}
  const rel = path.relative(workspaceRoot, fullPath);
  return ig.ignores(rel);
};

const findAllGitignoreFiles = (dir: string): string[] => {
  let result: string[] = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      result = result.concat(findAllGitignoreFiles(fullPath));
    } else if (item.name === '.gitignore') {
      result.push(fullPath);
    }
  }

  return result;
};

const transformGitignoreLines = (
  lines: string[],
  relativeDir: string
): string[] => {
  const transformed: string[] = [];

  for (let line of lines) {
    line = line.trim();
    if (!line || line.startsWith('#')) {
      transformed.push(line);
      continue;
    }

    if (relativeDir) {
      if (line.startsWith('/')) {
        line = relativeDir + line;
      } else {
        line = path.join(relativeDir, line);
      }
    }
    transformed.push(line);
  }

  return transformed;
};
