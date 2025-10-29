import { z } from 'zod';

export const DocumentCreateSchema = z.object({
  key: z.string().min(1),
  filename: z.string().min(1),
  filetype: z.string().optional().nullable(),
  filesize: z.number().int().nonnegative().optional().nullable(),
  documentId: z.string().optional(),
  tags: z
    .array(z.string().min(1))
    .optional()
    .transform((value) =>
      value ? value.map((tag) => tag.trim()).filter(Boolean) : undefined,
    ),
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
  tags: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((value) => {
      if (!value) return undefined;
      const list = Array.isArray(value) ? value : [value];
      const cleaned = list.map((tag) => tag.trim()).filter(Boolean);
      return cleaned.length > 0 ? cleaned : undefined;
    }),
});

export type DocumentCreateBody = z.infer<typeof DocumentCreateSchema>;
export type DocumentListQuery = z.infer<typeof DocumentListQuerySchema>;
