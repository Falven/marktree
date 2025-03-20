import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';
import {
  DEFAULT_ADDITIONAL_IGNORES,
  DEFAULT_UPDATE_MD_IGNORES_MESSAGE,
} from '../config.js';

export const updateMDIgnores =
  (outputChannel: vscode.OutputChannel, remove: boolean) =>
  async (firstUri?: vscode.Uri, allUris?: vscode.Uri[]) => {
    try {
      let uris: vscode.Uri[] = [];
      if (allUris && allUris.length > 0) {
        uris = allUris;
      } else if (firstUri) {
        uris = [firstUri];
      } else {
        vscode.window.showErrorMessage('No file or folder selected.');
        return;
      }

      const config = vscode.workspace.getConfiguration('marktree');
      const ignores = config.get<string[]>(
        'additionalIgnores',
        DEFAULT_ADDITIONAL_IGNORES
      );

      let changedCount = 0;
      for (const uri of uris) {
        let stat: fs.Stats;
        try {
          stat = await fs.promises.stat(uri.fsPath);
        } catch (err) {
          const msg = `Unable to stat ${uri.fsPath}: ${String(err)}`;
          outputChannel.appendLine(msg);
          vscode.window.showErrorMessage(msg);
          continue;
        }

        const isDirectory = stat.isDirectory();
        const baseName = path.basename(uri.fsPath);
        const ignoreValue = isDirectory ? `${baseName}/` : baseName;

        if (remove) {
          outputChannel.appendLine(`Removing '${baseName}' from MD ignores.`);
          const index = ignores.indexOf(baseName);
          if (index > -1) {
            ignores.splice(index, 1);
            changedCount++;
          }
        } else {
          outputChannel.appendLine(`Adding '${baseName}' to MD ignores.`);
          if (!ignores.includes(ignoreValue)) {
            ignores.push(ignoreValue);
            changedCount++;
          }
        }
      }

      config.update(
        'additionalIgnores',
        ignores,
        vscode.ConfigurationTarget.Workspace
      );

      const showUpdatedMessage = config.get<boolean>(
        'showAddedAndRemovedMDIgnoresMessage',
        DEFAULT_UPDATE_MD_IGNORES_MESSAGE
      );
      if (showUpdatedMessage && changedCount > 0) {
        const summaryMsg = remove
          ? `Removed ${changedCount} item${
              changedCount > 1 ? 's' : ''
            } from MD ignores.`
          : `Added ${changedCount} item${
              changedCount > 1 ? 's' : ''
            } to MD ignores.`;
        vscode.window.showInformationMessage(summaryMsg);
      }
    } catch (err) {
      if (err instanceof Error) {
        const errorMessage = err.stack ?? err.message;
        outputChannel.appendLine(errorMessage);
        vscode.window.showErrorMessage(
          'Error updating MD ignores. See output for details.'
        );
      } else {
        const errorMessage = String(err);
        outputChannel.appendLine(errorMessage);
        vscode.window.showErrorMessage(
          'Error updating MD ignores. See output for details.'
        );
      }
    }
  };
