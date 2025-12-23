import { z } from 'zod';

export const patientSchema = z.object({
    first_name: z.string().min(1, 'First name is required'),
    last_name: z.string().min(1, 'Last name is required'),
    dob: z.string().refine((date) => !isNaN(Date.parse(date)), {
        message: 'Invalid date format',
    }),

    diagnosis: z.string().optional(),
    attachment_url: z.string().optional(), // Used if the client uploads separately and sends URL
    admit_type: z.enum(['Emergency', 'Routine']).optional(),
    admit_reason: z.string().optional(),
    gender: z.enum(['Male', 'Female', 'Other', 'Unknown']).optional(),
    phone: z.string().optional(),
    email: z.string().email().optional().or(z.literal('')),
    address: z.string().optional(),
    medical_history: z.string().optional(),
    allergies: z.string().optional(),
});

export const updatePatientSchema = patientSchema.partial();
