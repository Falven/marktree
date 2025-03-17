import * as vscode from 'vscode';

export async function getFileUrisFromTabs(
  scope: 'all' | 'left' | 'right'
): Promise<vscode.Uri[]> {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    throw new Error('No workspace folder found.');
  }

  const activeGroup = vscode.window.tabGroups.activeTabGroup;
  if (!activeGroup) {
    throw new Error('No active tab group.');
  }

  const activeTab = activeGroup.activeTab;
  if (!activeTab) {
    throw new Error('No active tab.');
  }

  const allFileTabs: {
    tab: vscode.Tab;
    uri: vscode.Uri;
    group: vscode.TabGroup;
    index: number;
  }[] = [];

  for (const group of vscode.window.tabGroups.all) {
    group.tabs.forEach((tab, index) => {
      const input = tab.input;
      if (input instanceof vscode.TabInputText && input.uri.scheme === 'file') {
        allFileTabs.push({ tab, uri: input.uri, group, index });
      }
    });
  }

  if (allFileTabs.length === 0) {
    throw new Error('No file-based open tabs.');
  }

  const activeGroupTabs = vscode.window.tabGroups.activeTabGroup.tabs;
  const activeIndex = activeGroupTabs.indexOf(activeTab);
  if (activeIndex === -1) {
    throw new Error('Active tab not found in its group.');
  }

  let filteredUris: vscode.Uri[];

  switch (scope) {
    case 'all':
      filteredUris = allFileTabs.map(t => t.uri);
      break;

    case 'left': {
      const leftTabs = allFileTabs.filter(
        t => t.group === activeGroup && t.index < activeIndex
      );
      filteredUris = leftTabs.map(t => t.uri);
      break;
    }

    case 'right': {
      const rightTabs = allFileTabs.filter(
        t => t.group === activeGroup && t.index > activeIndex
      );
      filteredUris = rightTabs.map(t => t.uri);
      break;
    }

    default:
      filteredUris = [];
  }

  if (filteredUris.length === 0) {
    throw new Error(`No file-based open tabs found for scope "${scope}".`);
  }

  return filteredUris;
}
