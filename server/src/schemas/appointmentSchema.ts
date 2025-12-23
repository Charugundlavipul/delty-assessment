import { z } from 'zod';

export const appointmentSchema = z.object({
    patient_id: z.string().uuid('Invalid patient id'),
    case_id: z.string().uuid('Invalid case id').optional(),
    scheduled_at: z.string().refine((date) => !isNaN(Date.parse(date)), {
        message: 'Invalid date format',
    }),
    status: z.enum(['Scheduled', 'Completed', 'Cancelled']).optional(),
    reason: z.string().optional(),
});

export const updateAppointmentSchema = appointmentSchema.partial();
