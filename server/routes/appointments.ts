import { Router, Request, Response } from 'express';
import { authenticateUser } from '../middleware/auth';
import { appointmentSchema, updateAppointmentSchema } from '../schemas/appointmentSchema';
import { ZodError, z } from 'zod';
import { createClient } from '@supabase/supabase-js';

// Helper interface for Authenticated Request
interface AuthRequest extends Request {
    user?: any;
}

const router = Router();

// Apply auth middleware to all appointment routes
router.use(authenticateUser);

// Helper to create a scoped client for RLS
const getScopedClient = (req: Request) => {
    const authHeader = req.headers.authorization;
    const token = authHeader ? authHeader.split(' ')[1] : '';

    return createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_ANON_KEY!,
        { global: { headers: { Authorization: `Bearer ${token}` } } }
    );
};

/**
 * GET /api/appointments
 * Fetch paginated list of appointments
 */
router.get('/', async (req: Request, res: Response) => {
    const scopedClient = getScopedClient(req);

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 6;
    const status = req.query.status as string | undefined;
    const search = req.query.search as string;
    const offset = (page - 1) * limit;

    try {
        let query = scopedClient
            .from('appointments')
            .select('*, patients (id, first_name, last_name, status)', { count: 'exact' })
            .range(offset, offset + limit - 1)
            .order('scheduled_at', { ascending: true });

        query = query.eq('user_id', (req as AuthRequest).user.id);

        if (status && status !== 'All') {
            query = query.eq('status', status);
        }

        if (search) {
            query = query.or(`reason.ilike.%${search}%`);
        }

        const { data, count, error } = await query;

        if (error) throw error;

        res.json({
            data,
            pagination: {
                page,
                limit,
                total: count || 0,
                totalPages: Math.ceil((count || 0) / limit),
            },
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /api/appointments
 * Create a new appointment
 */
router.post('/', async (req: Request, res: Response) => {
    const scopedClient = getScopedClient(req);

    try {
        const validatedData = appointmentSchema.parse(req.body);

        const { data, error } = await scopedClient
            .from('appointments')
            .insert({
                patient_id: validatedData.patient_id,
                scheduled_at: validatedData.scheduled_at,
                status: validatedData.status || 'Scheduled',
                reason: validatedData.reason,
                user_id: (req as AuthRequest).user.id,
            })
            .select('*, patients (id, first_name, last_name, status)')
            .single();

        if (error) throw error;
        res.status(201).json(data);
    } catch (err: any) {
        if (err instanceof ZodError) {
            return res.status(400).json({ error: 'Validation Error', details: err.issues });
        }
        res.status(500).json({ error: err.message });
    }
});

/**
 * PUT /api/appointments/:id
 * Update an appointment
 */
router.put('/:id', async (req: Request, res: Response) => {
    const scopedClient = getScopedClient(req);

    try {
        const validatedData = updateAppointmentSchema.parse(req.body);
        const { id } = req.params;

        const { data, error } = await scopedClient
            .from('appointments')
            .update(validatedData)
            .eq('id', id)
            .eq('user_id', (req as AuthRequest).user.id)
            .select('*, patients (id, first_name, last_name, status)')
            .single();

        if (error) throw error;
        if (!data) return res.status(404).json({ error: 'Appointment not found' });

        res.json(data);
    } catch (err: any) {
        if (err instanceof ZodError) {
            return res.status(400).json({ error: 'Validation Error', details: err.issues });
        }
        res.status(500).json({ error: err.message });
    }
});

/**
 * PATCH /api/appointments/:id/status
 * Update appointment status
 */
router.patch('/:id/status', async (req: Request, res: Response) => {
    const scopedClient = getScopedClient(req);
    const statusSchema = z.object({
        status: z.enum(['Scheduled', 'Completed', 'Cancelled']),
    });

    try {
        const { id } = req.params;
        const { status } = statusSchema.parse(req.body);

        const { data, error } = await scopedClient
            .from('appointments')
            .update({ status })
            .eq('id', id)
            .eq('user_id', (req as AuthRequest).user.id)
            .select('*, patients (id, first_name, last_name, status)')
            .single();

        if (error) throw error;
        if (!data) return res.status(404).json({ error: 'Appointment not found' });

        res.json(data);
    } catch (err: any) {
        if (err instanceof ZodError) {
            return res.status(400).json({ error: 'Validation Error', details: err.issues });
        }
        res.status(500).json({ error: err.message });
    }
});

/**
 * DELETE /api/appointments/:id
 * Delete an appointment
 */
router.delete('/:id', async (req: Request, res: Response) => {
    const scopedClient = getScopedClient(req);

    try {
        const { id } = req.params;

        const { error } = await scopedClient
            .from('appointments')
            .delete()
            .eq('id', id)
            .eq('user_id', (req as AuthRequest).user.id);

        if (error) throw error;
        res.json({ message: 'Appointment deleted successfully' });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
