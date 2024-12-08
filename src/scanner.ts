import * as fs from 'fs';
import * as path from 'path';

interface ScanResult {
  treeLines: string[];
  files: string[];
}

interface Frame {
  dir: string;
  prefix: string;
}

export const scanDirectory = async (
  directory: string,
  workspaceRoot: string,
  ignoredPaths: Set<string> | undefined
): Promise<ScanResult> => {
  const counts = { dirs: 1, files: 0 };
  const treeLines: string[] = [];
  const files: string[] = [];

  treeLines.push(directory);

  const stack: Frame[] = [{ dir: directory, prefix: '' }];
  const visited = new Set<string>([directory]);

  while (stack.length > 0) {
    const frame = stack.pop()!;
    const { dir, prefix } = frame;

    let entries: fs.Dirent[];
    try {
      entries = await fs.promises.readdir(dir, { withFileTypes: true });
    } catch (err) {
      console.error(`Error reading directory: ${dir}`, err);
      continue;
    }

    if (ignoredPaths) {
      entries = entries.filter(entry => {
        const fullPath = path.join(dir, entry.name);
        const rel = path.relative(workspaceRoot, fullPath);
        return !ignoredPaths.has(rel);
      });
    }

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
        if (!visited.has(fullPath)) {
          visited.add(fullPath);
          counts.dirs++;
          stack.push({
            dir: fullPath,
            prefix: prefix + part1,
          });
        }
      } else {
        counts.files++;
        files.push(fullPath);
      }
    }
  }

  treeLines.push(`\n${counts.dirs} directories, ${counts.files} files`);

  return { treeLines, files };
};
