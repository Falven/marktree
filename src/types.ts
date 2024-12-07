export type WorkerFileResult = {
  file: string;
  content: string | null;
  error?: string;
};

export type WorkerScanDirectoryResult = {
  treeLines: string[];
  files: string[];
};

export type WorkerReadFilesResult = {
  results: WorkerFileResult[];
};

export type WorkerScanAndReadDirectoryResult = {
  treeLines: string[];
  files: string[];
  fileResults: WorkerFileResult[];
};

export type WorkerActions =
  | { action: 'scanDirectory'; dir: string }
  | { action: 'readFiles'; files: string[] }
  | { action: 'scanAndReadDirectory'; dir: string };

export type WorkerReturn =
  | WorkerScanDirectoryResult
  | WorkerReadFilesResult
  | WorkerScanAndReadDirectoryResult
  | { error: string };
