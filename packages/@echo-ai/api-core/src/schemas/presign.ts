import { z } from 'zod';

export const PresignCreateSchema = z.object({
  filename: z.string().min(1),
  contentType: z.string().min(1),
  size: z.number().int().nonnegative().optional(),
});

export type PresignCreateBody = z.infer<typeof PresignCreateSchema>;

