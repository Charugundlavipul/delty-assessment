import { Router, Request, Response } from 'express';
import { authenticateUser } from '../middleware/auth';
import { caseSchema, updateCaseSchema } from '../schemas/caseSchema';
import { ZodError, z } from 'zod';
import { createClient } from '@supabase/supabase-js';

interface AuthRequest extends Request {
    user?: any;
}

const router = Router();

router.use(authenticateUser);

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
 * GET /api/cases
 * Fetch paginated list of cases
 */
router.get('/', async (req: Request, res: Response) => {
    const scopedClient = getScopedClient(req);

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 5;
    const status = req.query.status as string | undefined;
    const admitType = req.query.admit_type as string | undefined;
    const patientId = req.query.patient_id as string | undefined;
    const search = req.query.search as string;
    const offset = (page - 1) * limit;

    try {
        let query = scopedClient
            .from('cases')
            .select('*, patients (id, first_name, last_name, dob)', { count: 'exact' })
            .range(offset, offset + limit - 1)
            .order('started_at', { ascending: false });

        query = query.eq('user_id', (req as AuthRequest).user.id);

        if (status && status !== 'All') {
            if (['Active', 'Upcoming', 'Closed'].includes(status)) {
                query = query.eq('status', status);
            } else if (status === 'Open') {
                query = query.in('status', ['Active', 'Upcoming']);
            } else {
                query = query.eq('status', status);
            }
        }

        if (admitType && admitType !== 'All') {
            query = query.eq('admit_type', admitType);
        }

        if (patientId) {
            query = query.eq('patient_id', patientId);
        }

        if (search) {
            query = query.or(`diagnosis.ilike.%${search}%,admit_reason.ilike.%${search}%`);
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
 * GET /api/cases/:id
 * Fetch case details
 */
router.get('/:id', async (req: Request, res: Response) => {
    const scopedClient = getScopedClient(req);

    try {
        const { id } = req.params;
        const userId = (req as AuthRequest).user.id;

        const { data: caseData, error: caseError } = await scopedClient
            .from('cases')
            .select('*, patients (id, first_name, last_name, dob)')
            .eq('id', id)
            .eq('user_id', userId)
            .single();

        if (caseError) throw caseError;
        if (!caseData) return res.status(404).json({ error: 'Case not found' });

        const { data: appointments, error: apptError } = await scopedClient
            .from('appointments')
            .select('*')
            .eq('case_id', id)
            .eq('user_id', userId)
            .order('scheduled_at', { ascending: false });

        if (apptError) throw apptError;

        const { data: notes, error: notesError } = await scopedClient
            .from('visit_notes')
            .select('*, appointments (id, scheduled_at, status)')
            .eq('case_id', id)
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (notesError) throw notesError;

        res.json({
            case: caseData,
            appointments: appointments || [],
            notes: notes || [],
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /api/cases
 * Create a new case
 */
router.post('/', async (req: Request, res: Response) => {
    const scopedClient = getScopedClient(req);

    try {
        const validatedData = caseSchema.parse(req.body);

        const { data, error } = await scopedClient
            .from('cases')
            .insert({
                patient_id: validatedData.patient_id,
                status: validatedData.status || 'Active',
                admit_type: validatedData.admit_type || 'Routine',
                admit_reason: validatedData.admit_reason,
                diagnosis: validatedData.diagnosis,
                attachment_path: validatedData.attachment_url,
                started_at: validatedData.started_at,
                user_id: (req as AuthRequest).user.id,
            })
            .select('*, patients (id, first_name, last_name, dob)')
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
 * PUT /api/cases/:id
 * Update a case
 */
router.put('/:id', async (req: Request, res: Response) => {
    const scopedClient = getScopedClient(req);

    try {
        const validatedData = updateCaseSchema.parse(req.body);
        const { id } = req.params;

        const updatePayload: any = { ...validatedData };
        if (Object.prototype.hasOwnProperty.call(validatedData, 'attachment_url')) {
            if (validatedData.attachment_url !== undefined) {
                updatePayload.attachment_path = validatedData.attachment_url;
            }
            delete updatePayload.attachment_url;
        }

        const { data, error } = await scopedClient
            .from('cases')
            .update(updatePayload)
            .eq('id', id)
            .eq('user_id', (req as AuthRequest).user.id)
            .select('*, patients (id, first_name, last_name, dob)')
            .single();

        if (error) throw error;
        if (!data) return res.status(404).json({ error: 'Case not found' });

        res.json(data);
    } catch (err: any) {
        if (err instanceof ZodError) {
            return res.status(400).json({ error: 'Validation Error', details: err.issues });
        }
        res.status(500).json({ error: err.message });
    }
});

/**
 * PATCH /api/cases/:id/status
 * Update case status
 */
router.patch('/:id/status', async (req: Request, res: Response) => {
    const scopedClient = getScopedClient(req);
    const statusSchema = z.object({
        status: z.enum(['Active', 'Upcoming', 'Closed']),
    });

    try {
        const { id } = req.params;
        const { status } = statusSchema.parse(req.body);

        const { data, error } = await scopedClient
            .from('cases')
            .update({ status })
            .eq('id', id)
            .eq('user_id', (req as AuthRequest).user.id)
            .select('*, patients (id, first_name, last_name, dob)')
            .single();

        if (error) throw error;
        if (!data) return res.status(404).json({ error: 'Case not found' });

        res.json(data);
    } catch (err: any) {
        if (err instanceof ZodError) {
            return res.status(400).json({ error: 'Validation Error', details: err.issues });
        }
        res.status(500).json({ error: err.message });
    }
});

/**
 * DELETE /api/cases/:id
 * Delete a case
 */
router.delete('/:id', async (req: Request, res: Response) => {
    const scopedClient = getScopedClient(req);

    try {
        const { id } = req.params;

        const { error } = await scopedClient
            .from('cases')
            .delete()
            .eq('id', id)
            .eq('user_id', (req as AuthRequest).user.id);

        if (error) throw error;
        res.json({ message: 'Case deleted successfully' });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/cases/:id/attachment
 * Get a signed URL for the case attachment
 */
router.get('/:id/attachment', async (req: Request, res: Response) => {
    const scopedClient = getScopedClient(req);

    try {
        const { id } = req.params;

        const { data, error } = await scopedClient
            .from('cases')
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
 * POST /api/cases/:id/notes
 * Create a note for a case (optional appointment_id)
 */
router.post('/:id/notes', async (req: Request, res: Response) => {
    const scopedClient = getScopedClient(req);
    const noteSchema = z.object({
        note: z.string().min(1, 'Note is required'),
        appointment_id: z.string().uuid().optional(),
    });

    try {
        const { id } = req.params;
        const userId = (req as AuthRequest).user.id;
        const validated = noteSchema.parse(req.body);

        const { data: caseData, error: caseError } = await scopedClient
            .from('cases')
            .select('patient_id')
            .eq('id', id)
            .eq('user_id', userId)
            .single();

        if (caseError) throw caseError;
        if (!caseData) return res.status(404).json({ error: 'Case not found' });

        if (validated.appointment_id) {
            const { data: appt, error: apptError } = await scopedClient
                .from('appointments')
                .select('id')
                .eq('id', validated.appointment_id)
                .eq('case_id', id)
                .eq('user_id', userId)
                .single();

            if (apptError) throw apptError;
            if (!appt) return res.status(404).json({ error: 'Appointment not found for case' });
        }

        const { data, error } = await scopedClient
            .from('visit_notes')
            .insert({
                patient_id: caseData.patient_id,
                case_id: id,
                appointment_id: validated.appointment_id ?? null,
                note: validated.note,
                user_id: userId,
            })
            .select('*, appointments (id, scheduled_at, status)')
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

export default router;
