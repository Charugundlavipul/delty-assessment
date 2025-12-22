import { Router, Request, Response } from 'express';
import { supabase } from '../src/config/supabaseClient';
import { authenticateUser } from '../src/middleware/auth';
import { patientSchema, updatePatientSchema } from '../src/schemas/patientSchema';
import { z, ZodError } from 'zod';
import { createClient } from '@supabase/supabase-js';

// Helper interface for Authenticated Request
interface AuthRequest extends Request {
    user?: any;
}

const router = Router();

// Apply auth middleware to all patient routes
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
}

/**
 * GET /api/patients
 * Fetch paginated list of patients
 */
router.get('/', async (req: Request, res: Response) => {
    const scopedClient = getScopedClient(req);

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;
    const status = req.query.status as string | undefined;
    const offset = (page - 1) * limit;

    try {
        let query = scopedClient
            .from('patients')
            .select('*', { count: 'exact' })
            .range(offset, offset + limit - 1)
            .order('created_at', { ascending: false });

        // RLS handles the user_id filtering automatically now since we pass the token,
        // but explicit filtering is still good practice for performance/safety.
        query = query.eq('user_id', (req as AuthRequest).user.id);

        if (search) {
            query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,diagnosis.ilike.%${search}%`);
        }
        if (status && status !== 'All') {
            query = query.eq('status', status);
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
 * GET /api/patients/stats
 * Fetch patient stats for dashboard cards
 */
router.get('/stats', async (req: Request, res: Response) => {
    const scopedClient = getScopedClient(req);

    try {
        const userId = (req as AuthRequest).user.id;
        const countQuery = (status?: string) => {
            let q = scopedClient.from('patients').select('id', { count: 'exact', head: true }).eq('user_id', userId);
            if (status) q = q.eq('status', status);
            return q;
        };

        const [total, admitted, stable, critical, discharged] = await Promise.all([
            countQuery(),
            countQuery('Admitted'),
            countQuery('Stable'),
            countQuery('Critical'),
            countQuery('Discharged'),
        ]);

        const errors = [total, admitted, stable, critical, discharged].find((r) => r.error);
        if (errors?.error) throw errors.error;

        const totalCount = total.count || 0;
        const dischargedCount = discharged.count || 0;
        const activeCount = totalCount - dischargedCount;

        res.json({
            total: totalCount,
            admitted: admitted.count || 0,
            stable: stable.count || 0,
            critical: critical.count || 0,
            discharged: dischargedCount,
            active: activeCount < 0 ? 0 : activeCount,
            closed: dischargedCount,
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /api/patients
 * Create a new patient
 */
router.post('/', async (req: Request, res: Response) => {
    const scopedClient = getScopedClient(req);

    try {
        const validatedData = patientSchema.parse(req.body);

        const { data, error } = await scopedClient
            .from('patients')
            .insert({
                first_name: validatedData.first_name,
                last_name: validatedData.last_name,
                dob: validatedData.dob,
                status: validatedData.status,
                diagnosis: validatedData.diagnosis,
                attachment_path: validatedData.attachment_url, // Explicitly map
                user_id: (req as AuthRequest).user.id,
            })
            .select()
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
 * PATCH /api/patients/:id/status
 * Update patient status
 */
router.patch('/:id/status', async (req: Request, res: Response) => {
    const scopedClient = getScopedClient(req);
    const statusSchema = z.object({
        status: z.enum(['Admitted', 'Discharged', 'Critical', 'Stable']),
    });

    try {
        const { id } = req.params;
        const { status } = statusSchema.parse(req.body);

        const { data, error } = await scopedClient
            .from('patients')
            .update({ status })
            .eq('id', id)
            .eq('user_id', (req as AuthRequest).user.id)
            .select()
            .single();

        if (error) throw error;
        if (!data) return res.status(404).json({ error: 'Patient not found' });

        res.json(data);
    } catch (err: any) {
        if (err instanceof ZodError) {
            return res.status(400).json({ error: 'Validation Error', details: err.issues });
        }
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/patients/:id/attachment
 * Get a signed URL for the attachment
 */
router.get('/:id/attachment', async (req: Request, res: Response) => {
    const scopedClient = getScopedClient(req);

    try {
        const { id } = req.params;

        const { data, error } = await scopedClient
            .from('patients')
            .select('attachment_path')
            .eq('id', id)
            .eq('user_id', (req as AuthRequest).user.id)
            .single();

        if (error) throw error;
        if (!data || !data.attachment_path) return res.status(404).json({ error: 'Attachment not found' });

        const { data: signed, error: signedError } = await scopedClient
            .storage
            .from('file_bucket')
            .createSignedUrl(data.attachment_path, 60 * 10);

        if (signedError) throw signedError;

        res.json({ url: signed.signedUrl });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * PUT /api/patients/:id
 * Update an existing patient
 */
router.put('/:id', async (req: Request, res: Response) => {
    const scopedClient = getScopedClient(req);

    try {
        const validatedData = updatePatientSchema.parse(req.body);
        const { id } = req.params;

        // Note: We use manual mapping here if needed, but partial updates might not contain all fields
        const updatePayload: any = { ...validatedData };
        if (Object.prototype.hasOwnProperty.call(validatedData, 'attachment_url')) {
            if (validatedData.attachment_url !== undefined) {
                updatePayload.attachment_path = validatedData.attachment_url;
            }
            delete updatePayload.attachment_url;
        }

        const { data, error } = await scopedClient
            .from('patients')
            .update(updatePayload)
            .eq('id', id)
            .eq('user_id', (req as AuthRequest).user.id)
            .select()
            .single();

        if (error) throw error;
        if (!data) return res.status(404).json({ error: 'Patient not found' });

        res.json(data);
    } catch (err: any) {
        if (err instanceof ZodError) {
            return res.status(400).json({ error: 'Validation Error', details: err.issues });
        }
        res.status(500).json({ error: err.message });
    }
});

/**
 * DELETE /api/patients/:id
 * Delete a patient
 */
router.delete('/:id', async (req: Request, res: Response) => {
    const scopedClient = getScopedClient(req);

    try {
        const { id } = req.params;

        const { error } = await scopedClient
            .from('patients')
            .delete()
            .eq('id', id)
            .eq('user_id', (req as AuthRequest).user.id);

        if (error) throw error;
        res.json({ message: 'Patient deleted successfully' });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
