import { Router, Request, Response } from 'express';
import { authenticateUser } from '../middleware/auth';
import { doctorProfileSchema } from '../schemas/doctorSchema';
import { ZodError } from 'zod';
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
 * GET /api/doctors/me
 * Fetch current doctor's profile
 */
router.get('/me', async (req: Request, res: Response) => {
    const scopedClient = getScopedClient(req);

    try {
        const userId = (req as AuthRequest).user.id;
        const { data, error } = await scopedClient
            .from('doctors')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error && error.code !== 'PGRST116') throw error;

        res.json({ profile: data || null });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * PUT /api/doctors/me
 * Upsert current doctor's profile
 */
router.put('/me', async (req: Request, res: Response) => {
    const scopedClient = getScopedClient(req);

    try {
        const validated = doctorProfileSchema.parse(req.body);
        const userId = (req as AuthRequest).user.id;

        const displayName = validated.display_name?.trim() || null;

        const { data, error } = await scopedClient
            .from('doctors')
            .upsert({
                user_id: userId,
                display_name: displayName,
                title: validated.title,
                department: validated.department,
                avatar_url: validated.avatar_url,
                updated_at: new Date().toISOString(),
            })
            .select()
            .single();

        if (error) throw error;
        res.json({ profile: data });
    } catch (err: any) {
        if (err instanceof ZodError) {
            return res.status(400).json({ error: 'Validation Error', details: err.issues });
        }
        res.status(500).json({ error: err.message });
    }
});

export default router;
