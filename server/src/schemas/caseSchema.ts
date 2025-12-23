import { z } from 'zod';

export const caseSchema = z.object({
    patient_id: z.string().uuid('Invalid patient id'),
    status: z.enum(['Active', 'Upcoming', 'Closed']).optional(),
    admit_type: z.enum(['Emergency', 'Routine']).optional(),
    admit_reason: z.string().optional(),
    diagnosis: z.string().optional(),
    attachment_url: z.string().optional(),
    started_at: z.string().optional().refine((date) => !date || !isNaN(Date.parse(date)), {
        message: 'Invalid date format',
    }),
});

export const updateCaseSchema = caseSchema.partial();
