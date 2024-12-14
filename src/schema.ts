import { z } from 'zod';

// Request Types and Schemas

export const WorkerRequestTypeSchema = z.enum([
  'tree',
  'readFiles',
  'treeAndReadFiles',
]);
export type WorkerRequestType = z.infer<typeof WorkerRequestTypeSchema>;

export const WorkerRequestSchema = z.object({
  type: WorkerRequestTypeSchema,
  selectedPath: z.string(),
  workspaceRoot: z.string(),
  ignoreFiles: z.array(z.string()),
  additionalIgnores: z.array(z.string()),
  ignoreBinary: z.boolean().optional(),
  paths: z.array(z.string()).optional(),
});
export type WorkerRequest = z.infer<typeof WorkerRequestSchema>;

// Result Types and Schemas

const FileResultSchema = z.object({
  file: z.string(),
  content: z.string().nullable(),
  isBinary: z.boolean().optional(),
  error: z.string().optional(),
});
export type FileResult = z.infer<typeof FileResultSchema>;

export const WorkerResponseSchema = z.object({
  error: z.string().optional(),
});
export type WorkerResponse = z.infer<typeof WorkerResponseSchema>;
