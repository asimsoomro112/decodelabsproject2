import { z } from 'zod';

export const CourseCreateSchema = z.strictObject({
  title: z.string().trim().min(3).max(80),
  description: z.string().trim().max(500).optional(),
  level: z.enum(['beginner', 'intermediate', 'advanced']),
  seats: z.number().int().min(1).max(500),
  startDate: z.iso.date(), // syntactic: must be YYYY-MM-DD; "not in the past" is Layer 2 (422)
});

export const CourseSchema = z.strictObject({
  ...CourseCreateSchema.shape,
  id: z.uuid(),
  createdAt: z.iso.datetime(),
});

export type CourseCreateInput = z.infer<typeof CourseCreateSchema>;
