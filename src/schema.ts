import { z } from 'zod';

export const WorkerRequestTypeSchema = z.enum([
  'tree',
  'readFiles',
  'treeAndReadFiles',
  'shellExec',
]);
export type WorkerRequestType = z.infer<typeof WorkerRequestTypeSchema>;

const ShellCommandSchema = z.object({
  command: z.string(),
  args: z.array(z.string()).default([]),
  cwd: z.string().optional(),
});

export const WorkerRequestSchema = z.object({
  type: WorkerRequestTypeSchema,

  selectedPath: z.string().optional(),
  workspaceRoot: z.string().optional(),
  ignoreFiles: z.array(z.string()).optional(),
  additionalIgnores: z.array(z.string()).optional(),
  ignoreBinary: z.boolean().optional(),
  paths: z.array(z.string()).optional(),

  shellCommands: z.array(ShellCommandSchema).optional(),
});
export type WorkerRequest = z.infer<typeof WorkerRequestSchema>;
