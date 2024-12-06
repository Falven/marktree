// Keys are file extensions without the leading '.'.
// Values are short code block language identifiers commonly used in Markdown code fences.
export const knownLangs: Record<string, string> = {
  // JavaScript and derivatives
  js: 'js',
  mjs: 'js',
  cjs: 'js',
  jsx: 'js',

  // TypeScript and derivatives
  ts: 'ts',
  mts: 'ts',
  cts: 'ts',
  tsx: 'ts',
  'd.ts': 'ts',

  // Web and scripting
  vue: 'vue',
  py: 'py',
  php: 'php',
  rb: 'rb',
  go: 'go',
  rs: 'rs',
  sh: 'bash',
  bash: 'bash',
  zsh: 'bash',
  ps1: 'powershell',
  coffee: 'coffee',
  bat: 'batch',
  cmd: 'batch',

  // C-family and related
  c: 'c',
  h: 'c',
  cpp: 'cpp',
  cc: 'cpp',
  cxx: 'cpp',
  hpp: 'cpp',
  hh: 'cpp',
  hxx: 'cpp',
  cs: 'cs',
  java: 'java',
  kt: 'kt',
  swift: 'swift',
  scala: 'scala',

  // Functional and alternative ecosystems
  hs: 'hs',
  clj: 'clj',
  cljs: 'clj',
  cljc: 'clj',
  edn: 'clj',
  fs: 'fs',
  fsx: 'fs',
  vb: 'vb',
  groovy: 'groovy',
  nim: 'nim',
  cr: 'cr',
  r: 'r',
  lua: 'lua',
  erl: 'erl',
  ex: 'elixir',
  exs: 'elixir',
  elm: 'elm',
  dart: 'dart',
  m: 'matlab',
  mm: 'objc',
  ahk: 'ahk',

  // Markup and data files
  md: 'md',
  markdown: 'md',
  json: 'json',
  jsonl: 'json',
  yaml: 'yaml',
  yml: 'yaml',
  toml: 'toml',
  xml: 'xml',
  html: 'html',
  htm: 'html',

  // Stylesheets
  css: 'css',
  scss: 'scss',
  sass: 'scss',
  less: 'less',

  // Other formats
  sql: 'sql',
  csv: 'csv',
  tsv: 'csv',
  ini: 'ini',
};
