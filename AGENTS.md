# Rydon Invest — project notes

## Stack
Node.js + Hono (web) + Drizzle ORM + Postgres + Eta templates. Single-process.
- Entry: `src/index.js` — boots web server, runs migration, optionally starts engine (`RUN_ENGINE=false` to disable price-polling/engine worker).
- DB client: `src/db/client.js` exports `db` (drizzle) and `sql` (raw tagged template via postgres).
- Migrations: `src/db/migrate.js` (idempotent `create table if not exists` style). Run with `node src/db/migrate.js`.
- Seed: `src/db/seed.js` creates admin (`admin@rydoninv.com`) + demo client + plans/traders/prices.
- Auth: `src/lib/auth.js` — cookie session (`rr_sid`), CSRF token = HMAC of session id (stable per session), `csrfGuard` middleware on all POST/PUT/PATCH/DELETE.
- Views: `src/lib/view.js` — Eta render. Templates in `src/views/`. Layout wraps inner body via `<%~ it.body %>`.
- Static assets: `public/` (js/app.js, css).

## Key conventions
- All forms include `<input type="hidden" name="_csrf" value="<%= it.csrf %>">`.
- Eta raw output uses `<%~ %>` (needed for JSON in data attributes; `<%= %>` HTML-escapes).
- Admin routes in `src/routes/admin.js`, user routes in `src/routes/dashboard.js`.
- Mail: `src/lib/mail.js` renders `.eta` body wrapped by `views/mail/layout.eta`, logs to `mail_log` table, sends via nodemailer SMTP (lazy, only when `SMTP_URL` set). Fire-and-forget with `.catch()`.
- Settings: `src/lib/settings.js` — key/value store in `settings` table (jsonb). Wallet addresses stored under key `wallet_addresses`.
- Uploads: `src/lib/uploads.js` saves multipart image files (KYC photos) to `public/uploads/<subdir>` (gitignored except `.gitkeep`), served at `/uploads/*`. Max 5 MB, JPG/PNG/WebP only.
- Admin balance adjustments: `POST /admin/users/:id/adjust` takes `direction=add|deduct` + positive `amount` from the user edit page, or a signed `amount` (no direction) from the users-list quick form. Every adjustment is a ledger line, never a silent edit.

## Testing locally
Needs Postgres. Start one, set `DATABASE_URL` in `.env`, run `node src/db/migrate.js && node src/db/seed.js`, then `RUN_ENGINE=false node src/index.js`.
- CSRF note for curl: fetch the page with the cookie jar, grep the `_csrf` token, POST with the same jar. Token is stable per session.
- Smoke test: `node test/e2e.js` — exercises admin login, balance add/deduct, KYC photo upload + approve, registration welcome mail, deposit wallet embed, and a full investment accrual-to-maturity cycle. Requires the seeded DB and a running server.
