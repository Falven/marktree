// Keys are file extensions without the leading '.'.
// Values are the code block language identifiers commonly used in Markdown code fences.
export const knownLangs: Record<string, string> = {
  // Web and scripting
  js: 'javascript',
  jsx: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  vue: 'vue',
  py: 'python',
  php: 'php',
  rb: 'ruby',
  go: 'go',
  rs: 'rust',
  sh: 'bash',
  bash: 'bash',
  zsh: 'bash',
  ps1: 'powershell',

  // C-family
  c: 'c',
  h: 'c',
  cpp: 'cpp',
  cxx: 'cpp',
  hpp: 'cpp',
  cs: 'csharp', // C#
  java: 'java',
  kt: 'kotlin', // Kotlin
  swift: 'swift',
  scala: 'scala',

  // Markup and data files
  md: 'markdown',
  markdown: 'markdown',
  json: 'json',
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
  env: '', // no specific syntax, plaintext is fine
  dart: 'dart',
  r: 'r',
  lua: 'lua',
  erl: 'erlang',
  ex: 'elixir',
  exs: 'elixir',
  elm: 'elm',
};
