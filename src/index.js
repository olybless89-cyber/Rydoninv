import 'dotenv/config';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { compress } from 'hono/compress';

import { loadUser, csrfGuard, csrfToken } from './lib/auth.js';
import { pub } from './routes/public.js';
import { auth } from './routes/auth.js';
import { dash } from './routes/dashboard.js';
import { admin } from './routes/admin.js';
import { startEngine } from './workers/engine.js';
import { migrate } from './db/migrate.js';
import { sql } from './db/client.js';

const app = new Hono();

app.use('*', logger());
app.use('*', compress());
app.use('*', secureHeaders({
  // TradingView needs inline scripts and its own frames; everything else is locked down.
  contentSecurityPolicy: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'", 'https://s3.tradingview.com', 'https://unpkg.com', 'https://www.tradingview-widget.com'],
    styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
    fontSrc: ["'self'", 'https://fonts.gstatic.com'],
    imgSrc: ["'self'", 'data:', 'https:'],
    connectSrc: ["'self'", 'https://api.binance.com', 'https://api.coingecko.com', 'https:'],
    frameSrc: ['https://www.tradingview-widget.com', 'https://s.tradingview.com', 'https://www.tradingview.com'],
  },
  crossOriginEmbedderPolicy: false,
}));

app.use('/css/*', serveStatic({ root: './public' }));
app.use('/js/*',  serveStatic({ root: './public' }));
app.use('/img/*', serveStatic({ root: './public' }));

// Infra routes mounted before the global auth/CSRF middleware so they
// work without a session: healthcheck (liveness), DB readiness, and the
// one-time token-gated seed endpoint.
app.get('/healthz', (c) => c.json({ ok: true, ts: Date.now() }));

app.get('/readyz', async (c) => {
  try { await sql`select 1`; return c.json({ ok: true, db: true, ts: Date.now() }); }
  catch (e) { return c.json({ ok: false, db: false, error: e.message }, 503); }
});

// One-time setup: seeds plans, traders, bots, admin + demo users, and
// market prices. Gated by SETUP_TOKEN so it can't be triggered by
// anonymous visitors. Use it once after first deploy, then leave it.
app.post('/setup', async (c) => {
  const token = process.env.SETUP_TOKEN;
  if (!token) return c.json({ ok: false, error: 'SETUP_TOKEN env var is not configured' }, 503);
  const sent = c.req.header('x-setup-token') || c.req.query('token');
  if (sent !== token) return c.json({ ok: false, error: 'invalid setup token' }, 403);
  try {
    const { seed } = await import('./db/seed.js');
    await seed();
    return c.json({ ok: true, message: 'seed complete — admin and demo users, plans, traders created' });
  } catch (e) {
    return c.json({ ok: false, error: e.message, stack: e.stack?.split('\n').slice(0, 5) }, 500);
  }
});

app.use('*', loadUser);
app.use('*', csrfGuard);
app.use('*', async (c, next) => { c.set('csrf', csrfToken(c)); await next(); });

// Order matters: public routes (auth + pub) must be mounted before the
// auth-protected routers, otherwise their `*` guard middleware would
// shadow public pages like /, /markets, /plans and force a login redirect.
app.route('/', auth);
app.route('/', pub);
app.route('/', dash);
app.route('/', admin);

app.notFound((c) => c.html(
  `<!doctype html><meta charset="utf-8"><title>Not found</title>
   <link rel="stylesheet" href="/css/app.css">
   <div style="min-height:100vh;display:grid;place-items:center;text-align:center;padding:20px">
     <div><h1 style="font-size:4rem;margin:0">404</h1>
     <p class="muted">That page doesn't exist.</p>
     <a class="btn btn-primary" href="/">Back to home</a></div>
   </div>`, 404));

app.onError((err, c) => {
  console.error('[error]', err);
  return c.html(
    `<!doctype html><meta charset="utf-8"><title>Something broke</title>
     <link rel="stylesheet" href="/css/app.css">
     <div style="min-height:100vh;display:grid;place-items:center;text-align:center;padding:20px">
       <div><h1>Something broke on our side</h1>
       <p class="muted">The error is logged. Try again in a moment.</p>
       <a class="btn btn-primary" href="/">Back to home</a></div>
     </div>`, 500);
});

const port = Number(process.env.PORT || 3000);

// Start serving immediately. Migration runs in the background so a DB
// problem doesn't kill the container (and put Railway in a restart loop
// that hides the real error). The DB status is visible on /readyz.
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`[web] listening on :${info.port}`);
  migrate()
    .then(async () => {
      console.log('[web] schema ready');
      await autoSeed(); // create admin + demo + plans/traders/bots if DB is empty
      if (process.env.RUN_ENGINE !== 'false') startEngine();
    })
    .catch((err) => console.error('[web] migration failed (check DATABASE_URL):', err.message));
});

// Auto-seed: if there's no admin user yet, run the seed script so the
// app is usable immediately after the first deploy — no shell, no
// SETUP_TOKEN, no manual step. The seed is idempotent (ON CONFLICT DO
// NOTHING + existence checks), so this is safe on every boot.
async function autoSeed() {
  if (process.env.AUTO_SEED === 'false') return;
  try {
    const [{ count }] = await sql`select count(*)::int count from users where role = 'admin'`;
    if (count > 0) { console.log('[seed] admin already present — skipping auto-seed'); return; }
    console.log('[seed] no admin found — running auto-seed (creates admin, demo, plans, traders, bots)…');
    const { seed } = await import('./db/seed.js');
    await seed();
    console.log('[seed] auto-seed complete');
  } catch (e) {
    console.error('[seed] auto-seed failed (non-fatal):', e.message);
  }
}

const bye = async () => { console.log('[web] shutting down'); await sql.end({ timeout: 5 }); process.exit(0); };
process.on('SIGTERM', bye);
process.on('SIGINT', bye);
