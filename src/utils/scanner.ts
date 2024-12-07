import walk from 'ignore-walk';
import * as fs from 'node:fs';
import * as path from 'node:path';

interface ScanResult {
  treeLines: string[];
  files: string[];
}

interface Frame {
  dir: string;
  entries: { name: string; isDir: boolean }[];
  index: number;
  prefix: string;
}

export async function scanDirectory(
  directory: string,
  workspaceRoot: string,
  ignoreFiles = ['.gitignore'],
  includeEmpty = false,
  follow = false
): Promise<ScanResult> {
  const allIncludedPaths = await walk({
    path: workspaceRoot,
    ignoreFiles,
    includeEmpty,
    follow,
  });

  const absWorkspaceRoot = path.resolve(workspaceRoot);
  const absDirectory = path.resolve(directory);

  // Filter to paths under absDirectory
  const filtered = allIncludedPaths
    .map(rel => path.join(absWorkspaceRoot, rel))
    .filter(
      fullPath =>
        fullPath === absDirectory ||
        fullPath.startsWith(absDirectory + path.sep)
    );

  // Ensure absDirectory is included
  if (!filtered.includes(absDirectory)) {
    filtered.push(absDirectory);
  }

  // Map: directory full path -> { dirs: string[], files: string[] }
  const dirMap = new Map<string, { dirs: string[]; files: string[] }>();
  dirMap.set(absDirectory, { dirs: [], files: [] });

  for (const fullPath of filtered) {
    const stat = await fs.promises.stat(fullPath);
    // Get the relative path from absDirectory to this entry
    const relativePath = path.relative(absDirectory, fullPath);

    if (!relativePath) {
      // This is the root directory itself
      continue;
    }

    // Split the relative path into segments
    const parts = relativePath.split(path.sep);

    // Walk down the directory tree, ensuring each sub-directory is present in dirMap
    let currentDir = absDirectory;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;

      // Ensure currentDir is in dirMap
      if (!dirMap.has(currentDir)) {
        dirMap.set(currentDir, { dirs: [], files: [] });
      }

      if (isLast) {
        // This is the last part of the path
        if (stat.isDirectory()) {
          // Add this directory to its parent's dirs array
          ensureDir(dirMap, currentDir, part);
          // Create an entry for this directory in the map
          const newDirPath = path.join(currentDir, part);
          if (!dirMap.has(newDirPath)) {
            dirMap.set(newDirPath, { dirs: [], files: [] });
          }
        } else {
          // It's a file. Add it to parent's files array
          dirMap.get(currentDir)!.files.push(part);
        }
      } else {
        // Not the last part, means this segment must be a directory
        ensureDir(dirMap, currentDir, part);

        // Move down into this directory
        const newDirPath = path.join(currentDir, part);
        if (!dirMap.has(newDirPath)) {
          dirMap.set(newDirPath, { dirs: [], files: [] });
        }
        currentDir = newDirPath;
      }
    }
  }

  // Now generate the ASCII tree
  const treeLines: string[] = [absDirectory];
  const files: string[] = [];
  const visited = new Set<string>([absDirectory]);

  let dirsCount = 1;
  let filesCount = 0;

  function getSortedEntries(dir: string): { name: string; isDir: boolean }[] {
    const entry = dirMap.get(dir);
    if (!entry) {return [];}
    const { dirs, files } = entry;
    dirs.sort((a, b) => a.localeCompare(b));
    files.sort((a, b) => a.localeCompare(b));

    return [
      ...dirs.map(d => ({ name: d, isDir: true })),
      ...files.map(f => ({ name: f, isDir: false })),
    ];
  }

  const stack: Frame[] = [
    {
      dir: absDirectory,
      entries: getSortedEntries(absDirectory),
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
            entries: getSortedEntries(fullPath),
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
}

function ensureDir(
  dirMap: Map<string, { dirs: string[]; files: string[] }>,
  parent: string,
  dirname: string
) {
  const parentEntry = dirMap.get(parent);
  if (parentEntry && !parentEntry.dirs.includes(dirname)) {
    parentEntry.dirs.push(dirname);
  }
}
