import ignore from 'ignore';
import * as fs from 'node:fs';
import * as path from 'node:path';

export type ScanResult = {
  treeLines: string[];
  files: string[];
};

type DirContent = {
  dirs: string[];
  files: string[];
};

export async function scan(
  selectedPath: string,
  absWorkspaceRoot: string,
  ignoreFiles: string[],
  additionalIgnores: string[]
): Promise<ScanResult> {
  const stats = await fs.promises.stat(selectedPath);
  const allSelections = [selectedPath];
  const selectionIsDir = stats.isDirectory();

  if (selectionIsDir) {
    const subPaths = await gatherAllSubPaths(
      selectedPath,
      ignoreFiles,
      additionalIgnores
    );
    for (const p of subPaths) {
      allSelections.push(p);
    }
  }

  const includedDirs = new Set<string>();
  const includedFiles = new Set<string>();
  for (const sel of allSelections) {
    const selStat = await fs.promises.stat(sel);
    if (selStat.isDirectory()) {
      addAncestors(absWorkspaceRoot, sel, includedDirs);
      includedDirs.add(sel);
    } else {
      addAncestors(absWorkspaceRoot, path.dirname(sel), includedDirs);
      includedFiles.add(sel);
    }
  }

  const treeLines: string[] = [];
  const files: string[] = [];

  const workspaceName = path.basename(absWorkspaceRoot);
  treeLines.push(workspaceName);

  const visited = new Set<string>([absWorkspaceRoot]);
  let dirsCount = includedDirs.has(absWorkspaceRoot) ? 1 : 0;
  let filesCount = 0;

  const stack: Array<{
    dir: string;
    children: string[];
    index: number;
    prefix: string;
  }> = [
    {
      dir: absWorkspaceRoot,
      children: sortedChildren(absWorkspaceRoot, includedDirs, includedFiles),
      index: 0,
      prefix: '',
    },
  ];

  while (stack.length) {
    const frame = stack[stack.length - 1];
    if (frame.index < frame.children.length) {
      const name = frame.children[frame.index];
      const isLast = frame.index === frame.children.length - 1;
      const part0 = isLast ? '└── ' : '├── ';
      const part1 = isLast ? '    ' : '│   ';
      const fullPath = path.join(frame.dir, name);
      frame.index++;

      const statHere = await fs.promises.stat(fullPath);
      treeLines.push(frame.prefix + part0 + name);

      if (statHere.isDirectory()) {
        if (!visited.has(fullPath)) {
          visited.add(fullPath);
          dirsCount++;
          stack.push({
            dir: fullPath,
            children: sortedChildren(fullPath, includedDirs, includedFiles),
            index: 0,
            prefix: frame.prefix + part1,
          });
        }
      } else {
        filesCount++;
        files.push(fullPath);
      }
    } else {
      stack.pop();
    }
  }

  treeLines.push(`\n${dirsCount} directories, ${filesCount} files`);
  return { treeLines, files };
}

async function gatherAllSubPaths(
  rootDir: string,
  ignoreFiles: string[],
  additionalIgnores: string[]
): Promise<string[]> {
  const out: string[] = [];
  const stack = [rootDir];
  const ig = ignore();
  ig.add(additionalIgnores.join('\n'));

  while (stack.length) {
    const dir = stack.pop();
    if (!dir) {
      break;
    }

    const contents = await fs.promises.readdir(dir, { withFileTypes: true });
    const localPatterns = await readIgnoreFiles(dir, ignoreFiles);
    const ig2 = ignore().add(localPatterns.join('\n')).add(ig);
    for (const ent of contents) {
      const name = ent.name;
      const rel = ent.isDirectory() ? `${name}/` : name;
      if (ig2.ignores(rel)) {
        continue;
      }
      const fullPath = path.join(dir, name);
      if (ent.isDirectory()) {
        out.push(fullPath);
        stack.push(fullPath);
      } else {
        out.push(fullPath);
      }
    }
  }
  return out;
}

function addAncestors(root: string, target: string, set: Set<string>) {
  const dirs = [];
  let current = target;
  while (current.length >= root.length) {
    dirs.push(current);
    if (current === root) {
      break;
    }
    current = path.dirname(current);
    if (current === '.' || current === '/') {
      break;
    }
  }
  for (const d of dirs) {
    set.add(d);
  }
}

function sortedChildren(
  dir: string,
  includedDirs: Set<string>,
  includedFiles: Set<string>
): string[] {
  const entry = fs.readdirSync(dir, { withFileTypes: true });
  const subDirs = entry
    .filter(e => e.isDirectory() && includedDirs.has(path.join(dir, e.name)))
    .map(e => e.name);
  const subFiles = entry
    .filter(e => !e.isDirectory() && includedFiles.has(path.join(dir, e.name)))
    .map(e => e.name);
  subDirs.sort();
  subFiles.sort();
  return [...subDirs, ...subFiles];
}

async function readIgnoreFiles(
  dir: string,
  ignoreFilesArr: string[]
): Promise<string[]> {
  const out: string[] = [];
  await Promise.all(
    ignoreFilesArr.map(async file => {
      const filePath = path.join(dir, file);
      try {
        const data = await fs.promises.readFile(filePath, 'utf-8');
        out.push(data);
      } catch {}
    })
  );
  return out;
}
