import * as path from 'node:path';
import type { FileResult } from '../schema.js';
import { guessLanguageByExtension } from './lang.js';

export function buildMarkdownContent(
  fileResults: FileResult[],
  workspaceRoot: string,
  treeLines?: string[]
): string {
  const workspaceName = path.basename(workspaceRoot);
  const initialMarkdown =
    treeLines && treeLines.length > 0
      ? `\`\`\`sh\n${treeLines.join('\n')}\n\`\`\`\n\n`
      : '';

  return fileResults.reduce((markdown, result) => {
    const relPath = path.relative(workspaceRoot, result.file);
    const displayPath = path.join(workspaceName, relPath);

    if (result.isBinary) {
      return `${markdown}${displayPath}\n(Binary file: content not displayed)\n\n`;
    }

    if (result.error) {
      return `${markdown}${displayPath}\n(Unreadable file: content not displayed)\n\n`;
    }

    if (result.content === null || result.content === undefined) {
      return `${markdown}${displayPath}\n(Empty file: no content to display)\n\n`;
    }

    const lang = guessLanguageByExtension(result.file);
    return `${markdown}${displayPath}\n\`\`\`${lang}\n${result.content}\n\`\`\`\n\n`;
  }, initialMarkdown);
}

export function buildShellExecContent(
  execs: { cmd: string; output: string }[]
): string {
  const lines = execs.map(({ cmd, output }) => {
    const trimmedOutput = output.trimEnd();
    return `$ ${cmd}\n${trimmedOutput}`;
  });
  return `\`\`\`sh\n${lines.join('\n\n')}\n\`\`\`\n`;
}
