import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Configurar CORS
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

    // Responder inmediatamente a OPTIONS
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ ok: false, error: 'Método no permitido' });
    }

    try {
        const entry = req.body;
        console.log('✅ ENTRADA RECIBIDA EN API:', {
            id: entry.id,
            title: entry.title,
            pendingSync: entry.pendingSync,
            timestamp: new Date().toISOString()
        });

        // Simular procesamiento
        await new Promise(resolve => setTimeout(resolve, 100));

        return res.status(200).json({
            ok: true,
            message: 'Entrada recibida correctamente',
            receivedAt: new Date().toISOString(),
            entryId: entry.id
        });

    } catch (error) {
        console.error('❌ ERROR EN API:', error);
        return res.status(500).json({ ok: false, error: 'Error del servidor' });
    }
}