import * as path from 'node:path';
import { type FileResult } from '../schema.js';
import { guessLanguageByExtension } from './lang.js';

/**
 * Builds a Markdown string from a list of file results.
 * If treeLines are provided, they will be added at the start as a code block.
 * If a basePath is provided, paths will be shown relative to it. Otherwise, only file basenames are shown.
 *
 * @param fileResults The results of reading files (file paths and contents/errors)
 * @param outputChannel A VS Code output channel for logging
 * @param basePath The base directory path to use when determining relative paths, or undefined to just use basenames
 * @param treeLines Optional array of directory tree lines to prepend.
 * @returns A Markdown string representing the directory tree (if any) and file contents.
 */
export function buildMarkdownContent(
  fileResults: FileResult[],
  basePath?: string,
  treeLines?: string[]
): string {
  const initialMarkdown =
    treeLines && treeLines.length > 0
      ? `\`\`\`sh\n${treeLines.join('\n')}\n\`\`\`\n\n`
      : '';

  return fileResults.reduce((markdown, result) => {
    if (result.error) {
      return markdown;
    }

    const displayPath = basePath
      ? path.relative(basePath, result.file)
      : path.basename(result.file);

    const lang = guessLanguageByExtension(result.file);
    return (
      markdown + `${displayPath}\n\`\`\`${lang}\n${result.content}\n\`\`\`\n\n`
    );
  }, initialMarkdown);
}
