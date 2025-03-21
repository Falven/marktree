import { basename, join, relative } from 'node:path';
import type { Diagnostic, TextDocument } from 'vscode';
import type { FileResult } from '../schema.js';
import { guessLanguageByExtension } from './lang.js';

export function buildMarkdownContent(
  fileResults: FileResult[],
  workspaceRoot: string,
  treeLines?: string[]
): string {
  const workspaceName = basename(workspaceRoot);
  const initialMarkdown =
    treeLines && treeLines.length > 0
      ? `\`\`\`sh\n${treeLines.join('\n')}\n\`\`\`\n\n`
      : '';

  return fileResults.reduce((markdown, result) => {
    const relPath = relative(workspaceRoot, result.file);
    const displayPath = join(workspaceName, relPath);

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
  diagnostics: readonly Diagnostic[],
  document: TextDocument,
  linesContext = 2
): string {
  enum DiagnosticSeverity {
    Error = 0,
    Warning = 1,
    Information = 2,
    Hint = 3,
  }

  const lines: string[] = [`# Problems for ${filePath}\n\n`];

  diagnostics.forEach((diag, index) => {
    const severityName = DiagnosticSeverity[diag.severity] ?? 'Unknown';
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

    lines.push(`## Issue ${index + 1} of ${diagnostics.length}\n\n`);
    lines.push(`- **Severity**: ${severityName}\n`);
    lines.push(`- **Line**: ${line}, **Column**: ${col}\n`);
    lines.push(`- **Source**: ${source}\n`);
    lines.push(`- **Message**: ${diag.message}\n`);
    if (code) {
      lines.push(`- **Code**: \`${code}\`\n`);
    }

    lines.push(`\n\`\`\`ts\n`);
    for (let i = startLine; i <= endLine; i++) {
      const lineNumber = i + 1;
      const lineText = document.lineAt(i).text;
      lines.push(`${lineNumber}  ${lineText}\n`);
    }
    lines.push(`\`\`\`\n\n`);
  });

  return lines.join('');
}
