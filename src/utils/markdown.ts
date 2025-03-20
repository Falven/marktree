import * as path from 'node:path';
import * as vscode from 'vscode';
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

export function buildDiagnosticsMarkdown(
  filePath: string,
  diagnostics: readonly vscode.Diagnostic[],
  document: vscode.TextDocument,
  linesContext = 2
): string {
  let markdown = `# Problems for ${filePath}\n\n`;

  diagnostics.forEach((diag, index) => {
    const severityName = vscode.DiagnosticSeverity[diag.severity] ?? 'Unknown';
    const line = diag.range.start.line + 1;
    const col = diag.range.start.character + 1;
    const code =
      typeof diag.code === 'object' ? diag.code.value : diag.code ?? '';
    const source = diag.source || 'unknown';

    const startLine = Math.max(diag.range.start.line - linesContext, 0);
    const endLine = Math.min(
      diag.range.end.line + linesContext,
      document.lineCount - 1
    );
    const snippetRange = new vscode.Range(
      startLine,
      0,
      endLine,
      document.lineAt(endLine).range.end.character
    );
    const snippetText = document.getText(snippetRange);

    markdown += `## Issue ${index + 1} of ${diagnostics.length}\n\n`;
    markdown += `- **Severity**: ${severityName}\n`;
    markdown += `- **Line**: ${line}, **Column**: ${col}\n`;
    markdown += `- **Source**: ${source}\n`;
    markdown += `- **Message**: ${diag.message}\n`;
    if (code) {
      markdown += `- **Code**: \`${code}\`\n`;
    }

    markdown += `\n\`\`\`ts\n`;
    markdown += `// Lines ${startLine + 1}-${endLine + 1}:\n`;
    markdown += `${snippetText}\n`;
    markdown += `\`\`\`\n\n`;
  });

  return markdown;
}
