import * as vscode from 'vscode';
import { registerCopyMdContents } from './copy-contents.js';
import { registerCopyMdTreeAndContents } from './copy-tree-and-contents.js';
import { registerCopyMdTree } from './copy-tree.js';

export const registerCommands = async (
  context: vscode.ExtensionContext,
  outputChannel: vscode.OutputChannel
) =>
  await Promise.all([
    registerCopyMdTree(context, outputChannel),
    registerCopyMdContents(context, outputChannel),
    registerCopyMdTreeAndContents(context, outputChannel),
  ]);
