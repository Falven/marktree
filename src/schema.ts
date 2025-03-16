import { z } from 'zod';

export const FileResultSchema = z.object({
  file: z.string(),
  content: z.string().nullable().optional(),
  isBinary: z.boolean().optional(),
  error: z.string().optional(),
});
export type FileResult = z.infer<typeof FileResultSchema>;

const baseSchema = z.object({
  workspaceRoot: z.string().nonempty(),
  ignoreFiles: z.array(z.string()).optional().default([]),
  additionalIgnores: z.array(z.string()).optional().default([]),
  ignoreBinary: z.boolean().optional().default(false),
});

const ShellCommandSchema = z.object({
  command: z.string(),
  args: z.array(z.string()).default([]),
  cwd: z.string().optional(),
});

const WorkerRequestTreeSchema = baseSchema.extend({
  type: z.literal('tree'),
  selectedPath: z.string().nonempty(),
});

const WorkerRequestReadFilesPathsSchema = baseSchema.extend({
  type: z.literal('readFilesPaths'),
  paths: z.array(z.string()).nonempty(),
  selectedPath: z.undefined(),
});

const WorkerRequestReadFilesSelectedSchema = baseSchema.extend({
  type: z.literal('readFilesSelected'),
  paths: z.undefined(),
  selectedPath: z.string().nonempty(),
});

const WorkerRequestTreeAndReadFilesPathsSchema = baseSchema.extend({
  type: z.literal('treeAndReadFilesPaths'),
  paths: z.array(z.string()).nonempty(),
  selectedPath: z.undefined(),
});

const WorkerRequestTreeAndReadFilesSelectedSchema = baseSchema.extend({
  type: z.literal('treeAndReadFilesSelected'),
  paths: z.undefined(),
  selectedPath: z.string().nonempty(),
});

const WorkerRequestShellExecSchema = baseSchema.extend({
  type: z.literal('shellExec'),
  shellCommands: z.array(ShellCommandSchema).nonempty(),
});

export const WorkerRequestSchema = z.discriminatedUnion('type', [
  WorkerRequestTreeSchema,
  WorkerRequestReadFilesPathsSchema,
  WorkerRequestReadFilesSelectedSchema,
  WorkerRequestTreeAndReadFilesPathsSchema,
  WorkerRequestTreeAndReadFilesSelectedSchema,
  WorkerRequestShellExecSchema,
]);

export type WorkerRequest = z.infer<typeof WorkerRequestSchema>;
