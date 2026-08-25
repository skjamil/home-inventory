import { z } from 'zod';

export const createCategorySchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(60),
  icon: z.string().max(40).optional(),
});

export const updateCategorySchema = createCategorySchema.partial();
