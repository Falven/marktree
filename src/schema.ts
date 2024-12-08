import { z } from 'zod';

const WorkerActionTypeSchema = z.enum([
  'scanDirectory',
  'readFiles',
  'scanAndReadDirectory',
]);
export type WorkerActionType = z.infer<typeof WorkerActionTypeSchema>;

const WorkerResultSchema = z.object({
  type: WorkerActionTypeSchema,
});
export type WorkerResult = z.infer<typeof WorkerResultSchema>;

const FileResultSchema = z.object({
  file: z.string(),
  content: z.string().nullable(),
  error: z.string().optional(),
});
export type FileResult = z.infer<typeof FileResultSchema>;

const ScanDirectoryResultSchema = WorkerResultSchema.extend({
  type: z.literal('scanDirectory'),
  treeLines: z.array(z.string()),
  files: z.array(z.string()),
});

const ReadFilesResultSchema = WorkerResultSchema.extend({
  type: z.literal('readFiles'),
  results: z.array(FileResultSchema),
});

const ScanAndReadDirectoryResultSchema = WorkerResultSchema.extend({
  type: z.literal('scanAndReadDirectory'),
  treeLines: z.array(z.string()),
  files: z.array(z.string()),
  fileResults: z.array(FileResultSchema),
});

const WorkerErrorResultSchema = z.object({
  error: z.string(),
});

const WorkerResultsSchema = z.union([
  ScanDirectoryResultSchema,
  ReadFilesResultSchema,
  ScanAndReadDirectoryResultSchema,
  WorkerErrorResultSchema,
]);

export type ScanDirectoryResult = z.infer<typeof ScanDirectoryResultSchema>;
export type ReadFilesResult = z.infer<typeof ReadFilesResultSchema>;
export type ScanAndReadDirectoryResult = z.infer<
  typeof ScanAndReadDirectoryResultSchema
>;
export type WorkerErrorResult = z.infer<typeof WorkerErrorResultSchema>;
export type WorkerResults = z.infer<typeof WorkerResultsSchema>;

const BaseActionSchema = z.object({
  action: WorkerActionTypeSchema,
  workspaceRoot: z.string(),
  ignoredPaths: z.set(z.string()).optional(),
});

const ScanDirectoryActionSchema = BaseActionSchema.extend({
  action: z.literal('scanDirectory'),
  dir: z.string(),
});

const ReadFilesActionSchema = BaseActionSchema.extend({
  action: z.literal('readFiles'),
  files: z.array(z.string()),
});

const ScanAndReadDirectoryActionSchema = BaseActionSchema.extend({
  action: z.literal('scanAndReadDirectory'),
  dir: z.string(),
});

const WorkerActionsSchema = z.union([
  ScanDirectoryActionSchema,
  ReadFilesActionSchema,
  ScanAndReadDirectoryActionSchema,
]);

export type WorkerAction = z.infer<typeof BaseActionSchema>;
export type ScanDirectoryAction = z.infer<typeof ScanDirectoryActionSchema>;
export type ReadFilesAction = z.infer<typeof ReadFilesActionSchema>;
export type ScanAndReadDirectoryAction = z.infer<
  typeof ScanAndReadDirectoryActionSchema
>;
export type WorkerActions = z.infer<typeof WorkerActionsSchema>;

export {
  FileResultSchema,
  ReadFilesActionSchema,
  ReadFilesResultSchema,
  ScanAndReadDirectoryActionSchema,
  ScanAndReadDirectoryResultSchema,
  ScanDirectoryActionSchema,
  ScanDirectoryResultSchema,
  WorkerActionsSchema,
  WorkerActionTypeSchema,
  WorkerErrorResultSchema,
  WorkerResultSchema,
  WorkerResultsSchema
};

