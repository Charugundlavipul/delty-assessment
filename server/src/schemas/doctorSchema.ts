import { z } from 'zod';

export const doctorProfileSchema = z.object({
    display_name: z.string().optional(),
    title: z.string().optional(),
    department: z.string().optional(),
});
