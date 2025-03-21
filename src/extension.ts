import {
  commands,
  type ExtensionContext,
  type OutputChannel,
  window,
} from 'vscode';
import { copyActiveFileProblems } from './commands/copy-active-file-problems.js';
import { copyActiveFileMd } from './commands/copy-active-file.js';
import { copyMdFiles } from './commands/copy-files.js';
import { copyGitCommits } from './commands/copy-git-commits.js';
import { copyGitDiffStagedAsMd } from './commands/copy-git-diff-staged.js';
import { copyTabsToTheLeftAsMd } from './commands/copy-tabs-to-the-left.js';
import { copyTabsToTheRightAsMd } from './commands/copy-tabs-to-the-right.js';
import { copyTabsAsMd } from './commands/copy-tabs.js';
import { copyMdTreeAndFiles } from './commands/copy-tree-and-files.js';
import { copyMdTree } from './commands/copy-tree.js';
import { updateMDIgnores } from './commands/update-md-ignores.js';

let outputChannel: OutputChannel;

export const activate = async (context: ExtensionContext): Promise<void> => {
  outputChannel = window.createOutputChannel('MarkTree');

  context.subscriptions.push(
    commands.registerCommand(
      'extension.copyMdTree',
      copyMdTree(context, outputChannel)
    )
  );
  context.subscriptions.push(
    commands.registerCommand(
      'extension.copyMdFiles',
      copyMdFiles(context, outputChannel)
    )
  );
  context.subscriptions.push(
    commands.registerCommand(
      'extension.copyMdTreeAndFiles',
      copyMdTreeAndFiles(context, outputChannel)
    )
  );
  context.subscriptions.push(
    commands.registerCommand(
      'extension.copyActiveFileMd',
      copyActiveFileMd(context, outputChannel)
    )
  );
  context.subscriptions.push(
    commands.registerCommand(
      'extension.addToMdIgnores',
      updateMDIgnores(outputChannel, false)
    )
  );
  context.subscriptions.push(
    commands.registerCommand(
      'extension.removeFromMdIgnores',
      updateMDIgnores(outputChannel, true)
    )
  );
  context.subscriptions.push(
    commands.registerCommand(
      'extension.copyTabsAsMd',
      copyTabsAsMd(context, outputChannel)
    )
  );
  context.subscriptions.push(
    commands.registerCommand(
      'extension.copyTabsToTheLeftAsMd',
      copyTabsToTheLeftAsMd(context, outputChannel)
    )
  );
  context.subscriptions.push(
    commands.registerCommand(
      'extension.copyTabsToTheRightAsMd',
      copyTabsToTheRightAsMd(context, outputChannel)
    )
  );
  context.subscriptions.push(
    commands.registerCommand(
      'extension.copyGitStagedAsMd',
      copyGitDiffStagedAsMd(context, outputChannel)
    )
  );
  context.subscriptions.push(
    commands.registerCommand(
      'extension.copyGitCommitsAsMd',
      copyGitCommits(context, outputChannel)
    )
  );
  context.subscriptions.push(
    commands.registerCommand(
      'extension.copyActiveFileProblems',
      copyActiveFileProblems(context, outputChannel)
    )
  );

  outputChannel.appendLine('Extension activated.');
};

export const deactivate = (): void => {
  outputChannel.appendLine('Extension deactivated.');
};
