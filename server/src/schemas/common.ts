import { z } from 'zod';

export const UuidParamSchema = z.strictObject({
  id: z.uuid(),
});

const paginationFields = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
};

export const CourseQuerySchema = z.strictObject({
  ...paginationFields,
  level: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  q: z.string().trim().min(1).max(100).optional(),
});

export const LearnerQuerySchema = z.strictObject({
  ...paginationFields,
  q: z.string().trim().min(1).max(100).optional(),
});

export type CourseQuery = z.infer<typeof CourseQuerySchema>;
export type LearnerQuery = z.infer<typeof LearnerQuerySchema>;
