import * as vscode from 'vscode';
import {
    DEFAULT_ADDITIONAL_IGNORES,
    DEFAULT_GITIGNORE,
    DEFAULT_IGNORE_BINARY,
    DEFAULT_IGNORE_FILES,
} from '../config';
import { runInWorker } from '../utils/run-in-worker';
import { scan } from '../utils/scanner';

export const copyMdAdvanced =
  (context: vscode.ExtensionContext, outputChannel: vscode.OutputChannel) =>
  async () => {
    const panel = vscode.window.createWebviewPanel(
      'marktreeAdvanced',
      'MarkTree: Advanced',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      }
    );

    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      vscode.window.showErrorMessage('No workspace folder found.');
      return;
    }
    const workspaceRoot = workspaceFolders[0].uri.fsPath;

    // Scan the current workspace root for a file/directory tree
    let scanned;
    try {
      scanned = await scan(
        workspaceRoot,
        workspaceRoot,
        DEFAULT_IGNORE_FILES,
        DEFAULT_ADDITIONAL_IGNORES
      );
    } catch (error) {
      vscode.window.showErrorMessage((error as Error).message);
      return;
    }

    const treeLines = scanned.treeLines;
    const files = scanned.files;

    // Convert the scanned tree into a structure we can display as checkboxes in HTML.
    // For simplicity, we will just show a flat list of files and directories.
    // A more advanced implementation would nest directories and allow toggling.
    // We can parse `treeLines` or just use the `files` array along with `scan` logic.

    // Note: For a true tree with collapsible directories, you'd need to reconstruct
    // the hierarchy yourself, or store it during scan. Below is a simplified approach.

    const html = getWebviewContent(treeLines, files);

    panel.webview.html = html;

    // Listen for messages from the webview
    panel.webview.onDidReceiveMessage(async message => {
      if (message.command === 'confirm') {
        const { copyTree, copyFiles, selectedPaths } = message.data;

        // Based on the user's selections, call the appropriate logic.
        // For example, if user selected both copyTree and copyFiles, you'd run something like:
        // run the 'treeAndReadFiles' worker request but limit to selected paths
        // If only copyTree is selected, run 'tree'.
        // If only copyFiles is selected, run 'readFiles'.

        let type: 'tree' | 'readFiles' | 'treeAndReadFiles';
        if (copyTree && copyFiles) {
          type = 'treeAndReadFiles';
        } else if (copyTree) {
          type = 'tree';
        } else {
          type = 'readFiles';
        }

        // Modify your worker call to handle only selectedPaths.
        // One approach: filter `files` to include only those selected.
        // For directories, you may need to re-scan or just include all files under them.
        // Here we assume selectedPaths are all files (or top-level directory).
        // For simplicity, assume all selectedPaths are files.

        const ignoreBinary = vscode.workspace
          .getConfiguration('marktree')
          .get<boolean>('ignoreBinary', DEFAULT_IGNORE_BINARY);

        try {
          await runInWorker(
            {
              type,
              selectedPath: workspaceRoot,
              workspaceRoot: workspaceRoot,
              ignoreFiles: vscode.workspace
                .getConfiguration('marktree')
                .get<boolean>('gitignore', DEFAULT_GITIGNORE)
                ? DEFAULT_IGNORE_FILES
                : [],
              ignoreBinary,
              additionalIgnores: vscode.workspace
                .getConfiguration('marktree')
                .get<string[]>('additionalIgnores', DEFAULT_ADDITIONAL_IGNORES),
            },
            context,
            outputChannel
          );
          vscode.window.showInformationMessage(
            `Copied according to your advanced selection.`
          );
        } catch (err) {
          vscode.window.showErrorMessage(
            `Error copying according to advanced selection: ${
              (err as Error).message
            }`
          );
        }

        panel.dispose();
      }
    });
  };

const getWebviewContent = (treeLines: string[], files: string[]): string => {
  // Create a list of checkboxes for files.
  // For directories, you could parse the tree lines and identify directories,
  // but let's keep it simple for now.
  const fileCheckboxes = files
    .map(f => {
      const label = f; // or path.relative(workspaceRoot, f)
      return `<div><input type="checkbox" class="entry-checkbox" value="${f}" checked> ${label}</div>`;
    })
    .join('\n');

  return /* html */ `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>MarkTree Advanced</title>
<style>
body {
  font-family: sans-serif;
  margin: 1em;
}
h1 {
  font-size: 1.2em;
}
</style>
</head>
<body>
<h1>Advanced Copy Options</h1>
<label><input type="checkbox" id="copyTree" checked> Copy Tree</label>
<br>
<label><input type="checkbox" id="copyFiles" checked> Copy Files</label>
<hr>
<h2>Select Directories and Files</h2>
<p>Uncheck items you don't want to include:</p>
<div id="entries">
${fileCheckboxes}
</div>

<button id="confirmBtn">Confirm</button>
<script>
const vscode = acquireVsCodeApi();

document.getElementById('confirmBtn').addEventListener('click', () => {
  const copyTree = document.getElementById('copyTree').checked;
  const copyFiles = document.getElementById('copyFiles').checked;

  const checkboxes = document.querySelectorAll('.entry-checkbox');
  const selectedPaths = [];
  checkboxes.forEach(cb => {
    if (cb.checked) {
      selectedPaths.push(cb.value);
    }
  });

  vscode.postMessage({
    command: 'confirm',
    data: {
      copyTree,
      copyFiles,
      selectedPaths
    }
  });
});
</script>
</body>
</html>`;
};
