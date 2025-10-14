// server.js
import 'dotenv/config';            // 👈 carga .env automáticamente
import express from 'express';
import cors from 'cors';
import webpush from 'web-push';

const app = express();
const PORT = process.env.PORT || 3000;

// ========== CORS ==========
const ALLOWED = ['http://localhost:5172', 'http://localhost:5173', 'http://localhost:5174'];
app.use(cors({
  origin(origin, cb) {
    // permite herramientas (curl, Postman) sin origin
    if (!origin) return cb(null, true);
    if (ALLOWED.includes(origin)) return cb(null, true);
    return cb(new Error('Not allowed by CORS: ' + origin));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
}));

app.use(express.json());

// ========== LOG de todas las requests ==========
app.use((req, _res, next) => {
  console.log('🔍 BACKEND - Petición:', {
    method: req.method,
    url: req.originalUrl,
    body: req.body,
  });
  next();
});

// ========== VAPID / web-push ==========
const PUB = process.env.VAPID_PUBLIC_KEY;
const PRIV = process.env.VAPID_PRIVATE_KEY;

if (!PUB || !PRIV) {
  console.warn('⚠️  Falta configurar VAPID_PUBLIC_KEY y/o VAPID_PRIVATE_KEY. Genera claves con `npx web-push generate-vapid-keys` y ponlas en tu .env.');
} else {
  try {
    webpush.setVapidDetails('mailto:you@example.com', PUB, PRIV);
  } catch (e) {
    console.warn('⚠️  webpush.setVapidDetails falló (probables claves inválidas):', e?.message || e);
  }
}

// memoria temporal de subscripciones (demo)
const subscriptions = new Set();

// ========== Rutas básicas / demo ==========
app.get('/', (_req, res) => {
  res.send('API OK. Usa POST /api/entries, POST /api/push/subscribe y POST /api/push/test');
});

// Recibe entradas de la PWA (Background Sync)
app.post('/api/entries', (req, res) => {
  console.log('✅ /api/entries recibido:', req.body);
  res.status(200).json({
    ok: true,
    message: 'Entrada recibida correctamente',
    data: req.body,
    timestamp: new Date().toISOString(),
  });
});

// Suscripción a Push (desde el frontend)
app.post('/api/push/subscribe', (req, res) => {
  const sub = req.body;
  if (!sub || !sub.endpoint) {
    return res.status(400).json({ ok: false, error: 'Suscripción inválida' });
  }
  subscriptions.add(sub);
  console.log('🔔 Nueva suscripción registrada. Total:', subscriptions.size);
  res.json({ ok: true });
});

// Enviar notificación de prueba a todos los suscriptores
app.post('/api/push/test', async (req, res) => {
  if (!PUB || !PRIV) {
    return res.status(500).json({ ok: false, error: 'VAPID no configuradas en el backend' });
  }
  const payload = JSON.stringify({
    title: 'Hola desde el backend 👋',
    body: 'Esto es una notificación de prueba',
    url: '/',
  });

  let sent = 0;
  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(sub, payload);
      sent++;
    } catch (err) {
      console.warn('❌ Error enviando a un sub. Se eliminará.', err?.statusCode, err?.message);
      subscriptions.delete(sub);
    }
  }
  res.json({ ok: true, sent, remaining: subscriptions.size });
});

// (Opcional) health
app.get('/health', (_req, res) => res.json({ ok: true }));

// ⚠️ IMPORTANTE: nada de rutas '*' (causa el error de path-to-regexp).
// Si quieres un 404 genérico, usa middleware final sin patrón:
app.use((req, res) => {
  res.status(404).json({ ok: false, error: 'Ruta no encontrada' });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor backend en http://localhost:${PORT}`);
  console.log('📝 POST /api/entries | POST /api/push/subscribe | POST /api/push/test');
  console.log('🌐 CORS permitido para:', ALLOWED.join(', '));
});
