# MarkTree

![Copy MD Tree](images/logo.png)

Like the extension? [Contribute](https://github.com/Falven/marktree) or consider

<a href="https://www.buymeacoffee.com/lkpUiU42EN" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-violet.png" alt="Buy Me A Coffee" style="height: 40px !important;width: 150px !important;" ></a>

MarkTree enables you to quickly copy workspace directory structures and file contents as Markdown. With a single click, you can generate a neatly formatted Markdown tree of your project’s relevant folders and files in code blocks in a format perfect for LLMs.

## Features

- **Copy Md Tree:** Copies a directory’s tree structure as Markdown.
- **Copy Md Files:** Copies the contents of all nested files as Markdown code blocks.
- **Copy Md Tree & Files:** Copies both the directory tree and file contents as Markdown.
- **.gitignore:** MarkTree can optionally respect your workspace’s `.gitignore` files, so you can copy only the files you want to share (Also allows additional entries via settings).
- **Binary files:** MarkTree can optionally skip binary files when copying directory contents.
- **Customizable:** Add or remove any of the three commands from the context menu.

### Copy MD Tree

```sh
/Users/falven/Source/turborepo/examples/basic/packages/lib
├── src
│   └── index.ts
├── package.json
└── tsconfig.json

2 directories, 3 files
```

![Copy Md Tree](images/copy_md_tree.gif)

## Copy MD Files

src/index.ts
```ts
export const multiply = (a: number, b: number) => {
  console.log("Breakpoint in multiply");
  return a + b;
};

```

package.json
```json
{
  "name": "@repo/lib",
  "version": "0.0.0",
  "type": "module",
  "private": true,
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "scripts": {
    "dev": "tsc --watch",
    "build": "tsc",
    "clean": "rm -rf dist",
    "lint": "eslint . --max-warnings 0",
    "check-types": "tsc --noEmit"
  },
  "devDependencies": {
    "@repo/eslint-config": "workspace:*",
    "@repo/typescript-config": "workspace:*",
    "@types/node": "^20.11.24",
    "typescript": "5.5.4"
  }
}

```

tsconfig.json
```json
{
  "extends": "@repo/typescript-config/base.json",
  "compilerOptions": {
    "outDir": "dist",
    "sourceRoot": "../../packages/lib/src",
  },
  "include": [
    "src"
  ],
  "exclude": [
    "node_modules",
    "dist"
  ]
}

```

![Copy Md Files](images/copy_md_files.gif)

### Copy Md Tree & Files

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
  console.log("Breakpoint in multiply");
  return a + b;
};

```

package.json
```json
{
  "name": "@repo/lib",
  "version": "0.0.0",
  "type": "module",
  "private": true,
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "scripts": {
    "dev": "tsc --watch",
    "build": "tsc",
    "clean": "rm -rf dist",
    "lint": "eslint . --max-warnings 0",
    "check-types": "tsc --noEmit"
  },
  "devDependencies": {
    "@repo/eslint-config": "workspace:*",
    "@repo/typescript-config": "workspace:*",
    "@types/node": "^20.11.24",
    "typescript": "5.5.4"
  }
}

```

tsconfig.json
```json
{
  "extends": "@repo/typescript-config/base.json",
  "compilerOptions": {
    "outDir": "dist",
    "sourceRoot": "../../packages/lib/src",
  },
  "include": [
    "src"
  ],
  "exclude": [
    "node_modules",
    "dist"
  ]
}

```

![Copy Md Tree & Files](images/copy_md_tree_and_files.gif)

## Requirements

No special dependencies are required. Just install and start copying Markdown trees and files!

## Known Issues

No known issues at this time. Please report any problems on our GitHub repository.

---

**Enjoy using MarkTree! 🌳**
