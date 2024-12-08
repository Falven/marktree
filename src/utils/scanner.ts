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

export const scanDirectory = async (
  absDirectory: string,
  absWorkspaceRoot: string,
  ignoreFiles: string[],
  additionalIgnores: string[]
): Promise<ScanResult> => {
  if (!absDirectory.startsWith(absWorkspaceRoot)) {
    throw new Error(
      `The directory ${absDirectory} is not inside workspaceRoot ${absWorkspaceRoot}`
    );
  }

  const parentPatterns: string[] = [];
  await accumulatePatternsUpTo(
    absWorkspaceRoot,
    absDirectory,
    ignoreFiles,
    parentPatterns
  );

  parentPatterns.push(...additionalIgnores);

  const dirMap = new Map<string, ScanEntry>();
  await iterativeGatherEntries(
    absDirectory,
    parentPatterns,
    dirMap,
    ignoreFiles
  );

  const treeLines: string[] = [absDirectory];
  const files: string[] = [];
  const visited = new Set<string>([absDirectory]);

  let dirsCount = 1;
  let filesCount = 0;

  const buildEntriesForDir = (
    dir: string
  ): { name: string; isDir: boolean }[] => {
    const entry = dirMap.get(dir);
    if (!entry) {
      return [];
    }
    return [
      ...entry.dirs.map(d => ({ name: d, isDir: true })),
      ...entry.files.map(f => ({ name: f, isDir: false })),
    ];
  };

  type Frame = {
    dir: string;
    entries: { name: string; isDir: boolean }[];
    index: number;
    prefix: string;
  };

  const stack: Frame[] = [
    {
      dir: absDirectory,
      entries: buildEntriesForDir(absDirectory),
      index: 0,
      prefix: '',
    },
  ];

  while (stack.length > 0) {
    const frame = stack[stack.length - 1];
    if (frame.index < frame.entries.length) {
      const entry = frame.entries[frame.index];
      const isLast = frame.index === frame.entries.length - 1;
      const part0 = isLast ? '└── ' : '├── ';
      const part1 = isLast ? '    ' : '│   ';
      const fullPath = path.join(frame.dir, entry.name);

      treeLines.push(frame.prefix + part0 + entry.name);

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
      } catch {
        // no file or unreadable, ignore
      }
    })
  );

  return contents;
};

const iterativeGatherEntries = async (
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
    const frame = stack.pop()!;
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

    const parentEntry = dirMap.get(dir)!;

    for (const entry of entries) {
      const entryName = entry.name;
      const isDirectory = entry.isDirectory();
      const relativePath = isDirectory ? entryName + '/' : entryName;

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
