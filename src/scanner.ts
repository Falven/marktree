import * as fs from 'fs';
import * as path from 'path';
import { shouldIgnore } from './gitignore.js';

export const scanDirectory = (
  directory: string
): { treeLines: string[]; files: string[] } => {
  const counts = { dirs: 1, files: 0 };
  const treeLines: string[] = [];
  const files: string[] = [];

  treeLines.push(directory);

  interface Frame {
    dir: string;
    prefix: string;
    entries: fs.Dirent[];
    index: number;
  }

  const initialEntries = fs.readdirSync(directory, { withFileTypes: true });
  const stack: Frame[] = [
    { dir: directory, prefix: '', entries: initialEntries, index: 0 },
  ];

  while (stack.length > 0) {
    const frame = stack[stack.length - 1];
    const { dir, prefix, entries, index } = frame;
    const len = entries.length;

    if (index < len) {
      const entry = entries[index];
      frame.index++;

      const name = entry.name;
      if (name.charAt(0) === '.') {
        continue;
      }

      const fullPath = path.join(dir, name);
      if (shouldIgnore(fullPath)) {
        continue;
      }

      const isLast = index === len - 1;
      const part0 = isLast ? '└── ' : '├── ';
      const part1 = isLast ? '    ' : '│   ';
      treeLines.push(prefix + part0 + name);

      if (entry.isDirectory()) {
        counts.dirs++;
        const childDir = path.join(dir, name);
        const childEntries = fs.readdirSync(childDir, { withFileTypes: true });
        stack.push({
          dir: childDir,
          prefix: prefix + part1,
          entries: childEntries,
          index: 0,
        });
      } else {
        counts.files++;
        files.push(fullPath);
      }
    } else {
      stack.pop();
    }
  }

  treeLines.push(`\n${counts.dirs} directories, ${counts.files} files`);
  return { treeLines, files };
};

export const guessLanguageByExtension = (filePath: string): string => {
  const ext = path.extname(filePath).toLowerCase().replace('.', '');
  return '';
};
