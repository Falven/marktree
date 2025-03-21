import ignore from 'ignore';
import { type Dirent, promises } from 'node:fs';
import { basename, join, relative, sep } from 'node:path';

export type ScanResult = {
  treeLines: string[];
  files: string[];
};

export async function scan(
  workspaceRoot: string,
  selectedPath: string,
  ignoreFiles: string[],
  additionalIgnores: string[]
): Promise<ScanResult> {
  const relativeParts = relative(workspaceRoot, selectedPath)
    .split(sep)
    .filter(Boolean);

  const stat = await promises.stat(selectedPath);
  const isFile = !stat.isDirectory();
  const directorySegments = isFile ? relativeParts.slice(0, -1) : relativeParts;

  const treeLines: string[] = [];
  const foundFiles: string[] = [];
  let dirCount = 0;
  let fileCount = 0;

  const rootName = basename(workspaceRoot);
  treeLines.push(rootName);
  dirCount++;

  // Initial ignore object (only additionalIgnores at the top)
  const topIgnore = ignore().add(additionalIgnores.join('\n'));

  await descendDirectory({
    currentDir: workspaceRoot,
    segmentIndex: 0,
    unlocked: directorySegments.length === 0,
    asciiPrefix: '',
    parentIgnore: topIgnore,
  });

  // If user selected a file, add a final line for it
  if (isFile && relativeParts.length > 0) {
    const fileName = basename(selectedPath);
    treeLines.push(`    └── ${fileName}`);
    fileCount++;
    foundFiles.push(selectedPath);
  }

  treeLines.push(`\n${dirCount} directories, ${fileCount} files`);
  return { treeLines, files: foundFiles };

  async function descendDirectory(params: {
    currentDir: string;
    segmentIndex: number;
    unlocked: boolean;
    asciiPrefix: string;
    parentIgnore: ReturnType<typeof ignore>;
  }): Promise<void> {
    const { currentDir, segmentIndex, unlocked, asciiPrefix, parentIgnore } =
      params;

    const localPatterns = await readIgnoreFiles(currentDir, ignoreFiles);
    const currentIgnore = ignore()
      .add(parentIgnore)
      .add(localPatterns.join('\n'));

    let entries: Dirent[];
    try {
      entries = await promises.readdir(currentDir, { withFileTypes: true });
    } catch {
      return;
    }

    let children = entries.map(e => {
      const full = join(currentDir, e.name);
      const rel = relative(workspaceRoot, full);
      return { dirent: e, fullPath: full, relPath: rel };
    });
    children = children.filter(child => !currentIgnore.ignores(child.relPath));

    children.sort((a, b) => {
      const aDir = a.dirent.isDirectory() ? 0 : 1;
      const bDir = b.dirent.isDirectory() ? 0 : 1;
      if (aDir !== bDir) {
        return aDir - bDir;
      }
      return a.dirent.name.localeCompare(b.dirent.name);
    });

    if (!unlocked && segmentIndex < directorySegments.length) {
      const needed = directorySegments[segmentIndex];
      const match = children.find(
        c => c.dirent.isDirectory() && c.dirent.name === needed
      );
      if (!match) {
        return;
      }

      treeLines.push(`${asciiPrefix}└── ${match.dirent.name}`);
      dirCount++;
      await descendDirectory({
        currentDir: match.fullPath,
        segmentIndex: segmentIndex + 1,
        unlocked: segmentIndex + 1 >= directorySegments.length,
        asciiPrefix: `${asciiPrefix}    `,
        parentIgnore: currentIgnore,
      });
      return;
    }

    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      const isLast = i === children.length - 1;
      const branch = isLast ? '└── ' : '├── ';
      const nextPrefix = isLast ? '    ' : '│   ';

      treeLines.push(asciiPrefix + branch + child.dirent.name);

      if (child.dirent.isDirectory()) {
        dirCount++;
        await descendDirectory({
          currentDir: child.fullPath,
          segmentIndex,
          unlocked: true,
          asciiPrefix: asciiPrefix + nextPrefix,
          parentIgnore: currentIgnore,
        });
      } else {
        fileCount++;
        foundFiles.push(child.fullPath);
      }
    }
  }
}

async function readIgnoreFiles(
  dir: string,
  ignores: string[]
): Promise<string[]> {
  const patterns: string[] = [];
  for (const ignoreFile of ignores) {
    const full = join(dir, ignoreFile);
    try {
      const data = await promises.readFile(full, 'utf-8');
      patterns.push(data);
    } catch {}
  }
  return patterns;
}
