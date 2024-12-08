import walk from 'ignore-walk';
import * as path from 'path';
import * as vscode from 'vscode';

export const initializeIgnore = async (
  outputChannel: vscode.OutputChannel
): Promise<Set<string> | undefined> => {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    const message = 'No workspace folder found.';
    outputChannel.appendLine(message);
    vscode.window.showErrorMessage(message);
    return;
  }
  const workspaceFolder = workspaceFolders[0].uri.fsPath;

  outputChannel.appendLine(
    `Initializing .gitignore processing on workspace: ${workspaceFolder}`
  );

  try {
    const ignoredPaths = new Set(
      await walk({
        path: workspaceFolder,
        ignoreFiles: ['.gitignore'],
      })
    );

    outputChannel.appendLine(`Found ${ignoredPaths.size} .gitignored entries.`);

    return ignoredPaths;
  } catch (err) {
    if (err instanceof Error) {
      outputChannel.appendLine(
        `Failed to initialize .gitignore processing: ${err.message}`
      );
    }
  }
};

export const shouldIgnore = (
  fullPath: string,
  workspaceRoot: string,
  ignoredPaths: Set<string>
): boolean => {
  const rel = path.relative(workspaceRoot, fullPath);
  return !ignoredPaths.has(rel);
};
