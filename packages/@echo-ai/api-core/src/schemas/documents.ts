import { z } from 'zod';

export const DocumentCreateSchema = z.object({
  key: z.string().min(1),
  filename: z.string().min(1),
  filetype: z.string().optional().nullable(),
  filesize: z.number().int().nonnegative().optional().nullable(),
  documentId: z.string().optional(),
});

export const DocumentListQuerySchema = z.object({
  q: z.string().optional(),
  limit: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : undefined))
    .pipe(z.number().int().min(1).max(100).optional()),
  sortKey: z.enum(['createdAt', 'updatedAt', 'filename', 'filesize']).optional(),
  sortDir: z.enum(['asc', 'desc']).optional(),
  cursor: z.string().optional(),
});

export type DocumentCreateBody = z.infer<typeof DocumentCreateSchema>;
export type DocumentListQuery = z.infer<typeof DocumentListQuerySchema>;

