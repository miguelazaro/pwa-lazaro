import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
    }

    try {
        const entry = req.body;
        console.log('[API] entry recibida:', entry);

        return res.status(200).json({ ok: true });
    } catch (e: unknown) {
        console.error('[API] error:', e);
        return res.status(500).json({ ok: false, error: 'Server error' });
    }
}