import { z } from 'zod';

export const LearnerCreateSchema = z.strictObject({
  name: z.string().trim().min(2).max(60),
  // Trim + lowercase BEFORE the format check (z.email() alone would reject padding).
  email: z.string().trim().toLowerCase().pipe(z.email()),
});

export const LearnerSchema = z.strictObject({
  ...LearnerCreateSchema.shape,
  id: z.uuid(),
  createdAt: z.iso.datetime(),
});

export type LearnerCreateInput = z.infer<typeof LearnerCreateSchema>;
