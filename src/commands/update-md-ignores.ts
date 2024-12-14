import * as fs from 'node:fs';
import path from 'path';
import * as vscode from 'vscode';
import {
  DEFAULT_ADDITIONAL_IGNORES,
  DEFAULT_UPDATE_MD_IGNORES_MESSAGE,
} from '../config.js';

export const updateMDIgnores =
  (
    outputChannel: vscode.OutputChannel,
    remove: boolean
  ) =>
  async (uri: vscode.Uri) => {
    const config = vscode.workspace.getConfiguration('marktree');
    const ignores = config.get<string[]>(
      'additionalIgnores',
      DEFAULT_ADDITIONAL_IGNORES
    );

    const stat = await fs.promises.stat(uri.fsPath);
    const isDirectory = stat.isDirectory();
    const baseName = path.basename(uri.fsPath);
    let ignore = isDirectory ? `${baseName}/` : baseName;

    if (remove) {
      outputChannel.appendLine(`Removing '${baseName}' from MD ignores.`);
      const index = ignores.indexOf(baseName);
      if (index > -1) {
        ignores.splice(index, 1);
      }
    } else {
      outputChannel.appendLine(`Adding '${baseName}' to MD ignores.`);
      if (!ignores.includes(ignore)) {
        ignores.push(ignore);
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
    if (showUpdatedMessage) {
      vscode.window.showInformationMessage(
        remove
          ? `Removed '${baseName}' from MD ignores.`
          : `Added '${baseName}' to MD ignores.`
      );
    }
  };
