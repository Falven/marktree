# MarkTree

![Copy MD Tree](images/logo.png)

Like the extension? [Contribute](https://github.com/Falven/marktree) or consider

<a href="https://www.buymeacoffee.com/lkpUiU42EN" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-violet.png" alt="Buy Me A Coffee" style="height: 40px !important;width: 150px !important;" ></a>

MarkTree enables you to quickly copy workspace directory structures, file contents, and even sets of open tabs as Markdown. With a single click, you can generate a neatly formatted Markdown tree of your project’s relevant folders and files in code blocks in a format perfect for LLMs.

## Features

- **Copy Md Tree:** Copies a directory’s tree structure as Markdown.
- **Copy Md Files:** Copies the contents of files as Markdown code blocks.
- **Copy Md Tree & Files:** Copies both the directory tree and file contents as Markdown.
- **Copy Tabs:** Copies the contents of all currently open file-based tabs as Markdown.
- **Copy Tabs to the Right:** Copies only the open file-based tabs to the right of the current active tab.
- **Copy Tabs to the Left:** Copies only the open file-based tabs to the left of the current active tab.
- **Copy Problems from Active File:** Copies all errors/warnings (diagnostics) for the currently active file as Markdown, including relevant code snippets.
- **.gitignore Support:** MarkTree can optionally respect your workspace’s `.gitignore` files, so you can copy only the files you want to share (Also allows additional entries via settings).
- **Binary File Skipping:** MarkTree can optionally skip binary files when copying directory contents.
- **Copy Staged Git Changes:** MarkTree can gather the staged changes in your repository and copy them as Markdown diffs—perfect for reviewing or sharing partial commits.
- **Copy Git Diffs for Selected Commits:** Use a QuickPick to select multiple commits. MarkTree gathers the `git show` output for each commit and combines them into a single Markdown snippet.
- **Configurable Menus:** Add or remove any of the commands from your context menus, including the tab context menu.
- **Ignore Customization:** Add or remove ignores from a file’s context menu to fine-tune what files appear in your markdown output.

### Copying Open Tabs as Markdown

If you frequently work with multiple files at once, MarkTree allows you to copy the contents of all currently open file-based tabs as Markdown. This also includes commands to copy only those tabs located to the left or to the right of your currently active tab, providing fine-grained control over what you copy.

- **Copy All Tabs:** Copies all open file-based tabs.
- **Copy Tabs to the Right:** Useful if you want to copy a selection of files opened to the right of the current focus.
- **Copy Tabs to the Left:** Quickly capture the files you've opened to the left side.

### Copying Problems from the Active File

MarkTree can collect and copy all **diagnostics** (errors, warnings, etc.) for your currently active file—complete with **line numbers**, **messages**, and **code snippet** context.

When you run **Copy Problems from Active File**, you’ll get a Markdown snippet like:

```markdown
# Problems for /path/to/file.ts

## Issue 1 of 2

- **Severity**: Error
- **Line**: 12, **Column**: 5
- **Source**: eslint
- **Message**: Unexpected token
- **Code**: 1234

```ts
// Lines 10-14:
10  const foo = {
11    bar: 42
12    baz: 99 // <-- Missing comma
13  };
14

## Copying Md Tree

```sh
/Users/falven/Source/turborepo/examples/basic/packages/lib
├── src
│   └── index.ts
├── package.json
└── tsconfig.json

2 directories, 3 files
```

![Copy Md Tree](images/copy_md_tree.gif)

## Copying Md Files

When you copy files, each file's content is formatted as a code block with an automatically detected language:

src/index.ts

```ts
export const multiply = (a: number, b: number) => {
  console.log('Breakpoint in multiply');
  return a + b;
};
```

package.json

```json
{
  "name": "@repo/lib",
  "version": "0.0.0",
  "type": "module",
  ...
}
```

tsconfig.json

```json
{
  "extends": "@repo/typescript-config/base.json",
  "compilerOptions": {
    "outDir": "dist",
    "sourceRoot": "../../packages/lib/src"
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

![Copy Md Files](images/copy_md_files.gif)

### Copying Md Tree & Files Together

```sh
/Users/falven/Source/turborepo/examples/basic/packages/lib
├── src
│   └── index.ts
├── package.json
└── tsconfig.json

2 directories, 3 files
```

src/index.ts

```ts
export const multiply = (a: number, b: number) => {
  console.log('Breakpoint in multiply');
  return a + b;
};
```

package.json

```json
{
  "name": "@repo/lib",
  "version": "0.0.0",
  ...
}
```

tsconfig.json

```json
{
  "extends": "@repo/typescript-config/base.json",
  "compilerOptions": {
    "outDir": "dist",
    "sourceRoot": "../../packages/lib/src"
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

![Copy Md Tree & Files](images/copy_md_tree_and_files.gif)

## Requirements

No special dependencies are required. Just install and start copying Markdown trees and files!

## Known Issues

No known issues at this time. Please report any problems or feature requests on our [GitHub repository](https://github.com/Falven/marktree/issues).

---

**Enjoy using MarkTree! 🌳**
