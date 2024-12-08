import { z } from 'zod';

// Action Types and Schemas

const WorkerActionTypeSchema = z.enum([
  'scanDirectory',
  'readFiles',
  'scanAndReadDirectory',
]);
export type WorkerActionType = z.infer<typeof WorkerActionTypeSchema>;

const BaseActionSchema = z.object({
  action: WorkerActionTypeSchema,
  workspaceRoot: z.string(),
  gitignore: z.boolean(),
});
export type WorkerAction = z.infer<typeof BaseActionSchema>;

const ScanDirectoryActionSchema = BaseActionSchema.extend({
  action: z.literal('scanDirectory'),
  dir: z.string(),
});
export type ScanDirectoryAction = z.infer<typeof ScanDirectoryActionSchema>;

const ReadFilesActionSchema = BaseActionSchema.extend({
  action: z.literal('readFiles'),
  files: z.array(z.string()),
});
export type ReadFilesAction = z.infer<typeof ReadFilesActionSchema>;

const ScanAndReadDirectoryActionSchema = BaseActionSchema.extend({
  action: z.literal('scanAndReadDirectory'),
  dir: z.string(),
});
export type ScanAndReadDirectoryAction = z.infer<
  typeof ScanAndReadDirectoryActionSchema
>;

const WorkerActionsSchema = z.union([
  ScanDirectoryActionSchema,
  ReadFilesActionSchema,
  ScanAndReadDirectoryActionSchema,
]);
export type WorkerActions = z.infer<typeof WorkerActionsSchema>;

// Result Types and Schemas

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
export type ScanDirectoryResult = z.infer<typeof ScanDirectoryResultSchema>;

const ReadFilesResultSchema = WorkerResultSchema.extend({
  type: z.literal('readFiles'),
  results: z.array(FileResultSchema),
});
export type ReadFilesResult = z.infer<typeof ReadFilesResultSchema>;

const ScanAndReadDirectoryResultSchema = WorkerResultSchema.extend({
  type: z.literal('scanAndReadDirectory'),
  treeLines: z.array(z.string()),
  files: z.array(z.string()),
  fileResults: z.array(FileResultSchema),
});
export type ScanAndReadDirectoryResult = z.infer<
  typeof ScanAndReadDirectoryResultSchema
>;

const WorkerErrorResultSchema = z.object({
  error: z.string(),
});
export type WorkerErrorResult = z.infer<typeof WorkerErrorResultSchema>;

const WorkerResultsSchema = z.union([
  ScanDirectoryResultSchema,
  ReadFilesResultSchema,
  ScanAndReadDirectoryResultSchema,
  WorkerErrorResultSchema,
]);
export type WorkerResults = z.infer<typeof WorkerResultsSchema>;

// Exporting Schemas

export {
  BaseActionSchema,
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

