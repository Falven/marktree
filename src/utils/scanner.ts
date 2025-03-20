import ignore from 'ignore';
import * as fs from 'node:fs';
import * as path from 'node:path';

export type ScanResult = {
  treeLines: string[];
  files: string[];
};

type ScanEntry = {
  dirs: string[];
  files: string[];
};

export const scan = async (
  absPath: string,
  absWorkspaceRoot: string,
  ignoreFiles: string[],
  additionalIgnores: string[]
): Promise<ScanResult> => {
  if (!absPath.startsWith(absWorkspaceRoot)) {
    throw new Error(
      `The directory ${absPath} is not inside workspaceRoot ${absWorkspaceRoot}`
    );
  }

  const stat = await fs.promises.stat(absPath);
  const isDirectory = stat.isDirectory();

  const parentPatterns: string[] = [];
  await accumulatePatternsUpTo(
    absWorkspaceRoot,
    absPath,
    ignoreFiles,
    parentPatterns
  );

  parentPatterns.push(additionalIgnores.join('\n'));

  const dirMap = new Map<string, ScanEntry>();

  if (isDirectory) {
    await gatherEntries(absPath, parentPatterns, dirMap, ignoreFiles);
  } else {
    dirMap.set(absPath, { dirs: [], files: [] });
  }

  const treeLines: string[] = [path.relative(absWorkspaceRoot, absPath)];
  const files: string[] = [];
  const visited = new Set<string>([absPath]);

  const buildEntriesForDir = (
    dir: string
  ): Array<{ name: string; isDir: boolean }> => {
    const entry = dirMap.get(dir);
    if (!entry) {
      return [];
    }
    return [
      ...entry.dirs.map(d => ({ name: d, isDir: true })),
      ...entry.files.map(f => ({ name: f, isDir: false })),
    ];
  };

  const stack: Array<{
    dir: string;
    entries: Array<{ name: string; isDir: boolean }>;
    index: number;
    prefix: string;
  }> = [
    {
      dir: absPath,
      entries: buildEntriesForDir(absPath),
      index: 0,
      prefix: '',
    },
  ];

  let dirsCount = isDirectory ? 1 : 0;
  let filesCount = 0;

  if (!isDirectory) {
    filesCount = 1;
    files.push(absPath);
  }

  while (stack.length > 0) {
    const frame = stack[stack.length - 1];
    if (frame && frame.index < frame.entries.length) {
      const entry = frame.entries[frame.index];
      const isLast = frame.index === frame.entries.length - 1;
      const part0 = isLast ? '└── ' : '├── ';
      const part1 = isLast ? '    ' : '│   ';
      const fullPath = path.join(frame.dir, entry.name);

      treeLines.push(
        frame.prefix + part0 + path.relative(absWorkspaceRoot, fullPath)
      );

      if (entry.isDir) {
        if (!visited.has(fullPath)) {
          visited.add(fullPath);
          dirsCount++;
          stack.push({
            dir: fullPath,
            entries: buildEntriesForDir(fullPath),
            index: 0,
            prefix: frame.prefix + part1,
          });
        }
      } else {
        filesCount++;
        files.push(fullPath);
      }
      frame.index++;
    } else {
      stack.pop();
    }
  }

  treeLines.push(`\n${dirsCount} directories, ${filesCount} files`);
  return { treeLines, files };
};

const accumulatePatternsUpTo = async (
  absWorkspaceRoot: string,
  absDirectory: string,
  ignoreFiles: string[],
  parentPatterns: string[]
): Promise<void> => {
  const relPath = path.relative(absWorkspaceRoot, absDirectory);
  const segments = relPath ? relPath.split(path.sep) : [];

  const dirsToCheck = [absWorkspaceRoot];
  let currentDir = absWorkspaceRoot;
  for (const segment of segments) {
    currentDir = path.join(currentDir, segment);
    dirsToCheck.push(currentDir);
  }

  const allResults = await Promise.all(
    dirsToCheck.map(dir => readIgnoreFiles(dir, ignoreFiles))
  );

  for (const contents of allResults) {
    parentPatterns.push(...contents);
  }
};

const readIgnoreFiles = async (
  dir: string,
  ignoreFiles: string[]
): Promise<string[]> => {
  const contents: string[] = [];

  await Promise.all(
    ignoreFiles.map(async fileName => {
      const filePath = path.join(dir, fileName);
      try {
        const content = await fs.promises.readFile(filePath, 'utf-8');
        contents.push(content);
      } catch {}
    })
  );

  return contents;
};

const gatherEntries = async (
  startDir: string,
  parentPatterns: string[],
  dirMap: Map<string, ScanEntry>,
  ignoreFiles: string[]
): Promise<void> => {
  type DirFrame = {
    dir: string;
    patternLength: number;
  };

  const stack: DirFrame[] = [
    { dir: startDir, patternLength: parentPatterns.length },
  ];

  while (stack.length > 0) {
    const frame = stack.pop();
    if (!frame) {
      continue;
    }
    const dir = frame.dir;

    parentPatterns.length = frame.patternLength;

    const thisDirPatterns = await readIgnoreFiles(dir, ignoreFiles);
    const oldLength = parentPatterns.length;
    parentPatterns.push(...thisDirPatterns);

    const currentIg = ignore();
    if (parentPatterns.length > 0) {
      currentIg.add(parentPatterns.join('\n'));
    }

    if (!dirMap.has(dir)) {
      dirMap.set(dir, { dirs: [], files: [] });
    }

    let entries: fs.Dirent[];
    try {
      entries = await fs.promises.readdir(dir, { withFileTypes: true });
    } catch {
      parentPatterns.length = oldLength;
      continue;
    }

    entries.sort((a, b) => {
      const aIsDir = a.isDirectory() ? 0 : 1;
      const bIsDir = b.isDirectory() ? 0 : 1;
      if (aIsDir !== bIsDir) {
        return aIsDir - bIsDir;
      }
      return a.name.localeCompare(b.name);
    });

    const parentEntry = dirMap.get(dir);
    if (!parentEntry) {
      parentPatterns.length = oldLength;
      continue;
    }

    for (const entry of entries) {
      const entryName = entry.name;
      const isDirectory = entry.isDirectory();
      const relativePath = isDirectory ? `${entryName}/` : entryName;

      if (currentIg.ignores(relativePath)) {
        continue;
      }

      if (isDirectory) {
        if (!parentEntry.dirs.includes(entryName)) {
          parentEntry.dirs.push(entryName);
        }
        const fullPath = path.join(dir, entryName);
        stack.push({
          dir: fullPath,
          patternLength: parentPatterns.length,
        });
      } else {
        if (!parentEntry.files.includes(entryName)) {
          parentEntry.files.push(entryName);
        }
      }
    }

    parentPatterns.length = oldLength;
  }
};
