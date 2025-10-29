import { z } from 'zod';

const nullableTrimmedString = z.preprocess(
  (value) => {
    if (value === undefined || value === null) return null;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed.length === 0 ? null : trimmed;
    }
    return value;
  },
  z.string().min(1).optional().nullable()
);

const referenceLinksSchema = z.preprocess(
  (value) => {
    if (value === undefined || value === null) return [];
    if (Array.isArray(value)) return value;
    return [value];
  },
  z.array(z.string().trim().min(1)).max(20)
);

const studyOrderSchema = z.coerce.number().int().min(0).max(1000);

export const StudyCreateSchema = z
  .object({
    title: z.string().trim().min(1, '제목은 필수입니다.'),
    parent_id: nullableTrimmedString,
    content: nullableTrimmedString,
    good_example: nullableTrimmedString,
    bad_example: nullableTrimmedString,
    study_order: studyOrderSchema,
    reference_links: referenceLinksSchema.optional().default([]),
  })
  .strip();

export const StudyUpdateSchema = z
  .object({
    title: z.string().trim().min(1, '제목은 필수입니다.').optional(),
    parent_id: nullableTrimmedString.optional(),
    content: nullableTrimmedString.optional(),
    good_example: nullableTrimmedString.optional(),
    bad_example: nullableTrimmedString.optional(),
    study_order: studyOrderSchema.optional(),
    reference_links: referenceLinksSchema.optional(),
    ai_suggestion: nullableTrimmedString.optional(),
  })
  .strip();
