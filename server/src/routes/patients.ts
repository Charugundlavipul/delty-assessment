import { Router, Request, Response } from 'express';
import { authenticateUser } from '../middleware/auth';
import { patientSchema, updatePatientSchema } from '../schemas/patientSchema';
import { ZodError, z } from 'zod';
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
};

/**
 * GET /api/patients
 * Fetch paginated list of patients
 */
router.get('/', async (req: Request, res: Response) => {
    const scopedClient = getScopedClient(req);

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 5;
    const search = req.query.search as string;
    const offset = (page - 1) * limit;

    try {
        let query = scopedClient
            .from('patients')
            .select('*', { count: 'exact' })
            .range(offset, offset + limit - 1)
            .order('created_at', { ascending: false });

        query = query.eq('user_id', (req as AuthRequest).user.id);

        if (search) {
            query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%`);
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
        // Debugging: Log error to file
        const fs = require('fs');
        fs.appendFileSync('error.log', new Date().toISOString() + ' - GET /api/patients error: ' + err.message + '\n' + JSON.stringify(err) + '\n');
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
        const caseCountQuery = (status?: string) => {
            let q = scopedClient.from('cases').select('id', { count: 'exact', head: true }).eq('user_id', userId);
            if (status) q = q.eq('status', status);
            return q;
        };

        const patientCountQuery = (status?: string) => {
            let q = scopedClient.from('patients').select('id', { count: 'exact', head: true }).eq('user_id', userId);
            if (status) q = q.eq('status', status);
            return q;
        };

        const [totalPatients, activeCases, upcomingCases, closedCases] = await Promise.all([
            scopedClient.from('patients').select('id', { count: 'exact', head: true }).eq('user_id', userId),
            caseCountQuery('Active'),
            caseCountQuery('Upcoming'),
            caseCountQuery('Closed'),
        ]);

        const errors = [totalPatients, activeCases, upcomingCases, closedCases].find((r) => r.error);
        if (errors?.error) throw errors.error;

        const totalCount = totalPatients.count || 0;
        const activeCount = activeCases.count || 0;
        const closedCount = closedCases.count || 0;

        res.json({
            total: totalCount,
            active: activeCount,
            closed: closedCount,
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/patients/:id/profile
 * Fetch patient profile with appointments and visit notes
 */
router.get('/:id/profile', async (req: Request, res: Response) => {
    const scopedClient = getScopedClient(req);

    try {
        const { id } = req.params;
        const userId = (req as AuthRequest).user.id;

        const { data: patient, error: patientError } = await scopedClient
            .from('patients')
            .select('*')
            .eq('id', id)
            .eq('user_id', userId)
            .single();

        if (patientError) throw patientError;
        if (!patient) return res.status(404).json({ error: 'Patient not found' });

        const { data: appointments, error: apptError } = await scopedClient
            .from('appointments')
            .select('*, cases (id, status, started_at)')
            .eq('patient_id', id)
            .eq('user_id', userId)
            .order('scheduled_at', { ascending: false });

        if (apptError) throw apptError;

        const { data: cases, error: caseError } = await scopedClient
            .from('cases')
            .select('*')
            .eq('patient_id', id)
            .eq('user_id', userId)
            .order('started_at', { ascending: false });

        if (caseError) throw caseError;

        const { data: notes, error: notesError } = await scopedClient
            .from('visit_notes')
            .select('*, appointments (id, scheduled_at, status), cases (id, status, started_at)')
            .eq('patient_id', id)
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (notesError) throw notesError;

        res.json({ patient, appointments: appointments || [], cases: cases || [], notes: notes || [] });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /api/patients/:id/notes
 * Create a visit note for a patient (optionally tied to an appointment)
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

        if (validated.appointment_id) {
            const { data: appt, error: apptError } = await scopedClient
                .from('appointments')
                .select('id')
                .eq('id', validated.appointment_id)
                .eq('patient_id', id)
                .eq('user_id', userId)
                .single();

            if (apptError) throw apptError;
            if (!appt) return res.status(404).json({ error: 'Appointment not found' });
        }

        const { data, error } = await scopedClient
            .from('visit_notes')
            .insert({
                patient_id: id,
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
 * POST /api/patients
 * Create a new patient (and optional initial case)
 */
router.post('/', async (req: Request, res: Response) => {
    const scopedClient = getScopedClient(req);

    try {
        const validatedData = patientSchema.parse(req.body);

        // 1. Create Patient (Demographics only)
        const { data: patient, error: patientError } = await scopedClient
            .from('patients')
            .insert({
                first_name: validatedData.first_name,
                last_name: validatedData.last_name,
                dob: validatedData.dob,
                gender: validatedData.gender,
                phone: validatedData.phone,
                email: validatedData.email,
                address: validatedData.address,
                medical_history: validatedData.medical_history,
                allergies: validatedData.allergies,
                user_id: (req as AuthRequest).user.id,
            })
            .select()
            .single();

        if (patientError) throw patientError;

        // 2. Create Initial Case (if case details provided)
        // We do this if 'admit_type' or 'diagnosis' or 'admit_reason' is present,
        // effectively treating this as an 'Admit' event.
        if (validatedData.admit_type || validatedData.diagnosis || validatedData.admit_reason || validatedData.attachment_url) {
            const { error: caseError } = await scopedClient
                .from('cases')
                .insert({
                    patient_id: patient.id,
                    user_id: (req as AuthRequest).user.id,
                    status: 'Active', // Default status for new admission
                    admit_type: validatedData.admit_type || 'Routine',
                    admit_reason: validatedData.admit_reason,
                    diagnosis: validatedData.diagnosis,
                    attachment_path: validatedData.attachment_url,
                    started_at: new Date(),
                });

            if (caseError) {
                // Log warning but don't fail the patient creation? 
                // Alternatively, we could fail. ideally we use a transaction but supabase-js client is REST.
                console.error('Failed to create initial case for patient:', caseError);
            }
        }

        res.status(201).json(patient);
    } catch (err: any) {
        if (err instanceof ZodError) {
            return res.status(400).json({ error: 'Validation Error', details: err.issues });
        }
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

        // Only update demographic fields that exist on patients table
        const updatePayload: any = {
            first_name: validatedData.first_name,
            last_name: validatedData.last_name,
            dob: validatedData.dob,
            gender: validatedData.gender,
            phone: validatedData.phone,
            email: validatedData.email,
            address: validatedData.address,
            medical_history: validatedData.medical_history,
            allergies: validatedData.allergies
        };

        // Remove undefined keys
        Object.keys(updatePayload).forEach(key => updatePayload[key] === undefined && delete updatePayload[key]);

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
