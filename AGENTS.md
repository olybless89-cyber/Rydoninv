# Rydoninv — Agent Memory

Project: **Rydon Invest** — a trading/investment platform (Hono + Eta + Drizzle + Postgres).
Repo: `olybless89-cyber/Rydoninv` on GitHub. Live site: **https://rydoninv.com** (Railway).

## 🚀 DEPLOY WORKFLOW — do it ALL, no user involvement

The user wants fixes pushed to live **end-to-end without asking them to do anything**.
Follow this exact loop every time you finish a code change:

1. Commit on a **new branch** off `main` (NEVER push directly to `main`).
2. Push branch to origin.
3. **Create a PR** via the GitHub API (see "Credentials" below) — `base: main`.
4. **Merge the PR immediately** (`merge_method: squash`).
   - Railway does NOT auto-deploy on direct pushes. It only builds on **PR merge**.
   - Creating + merging a PR is the ONLY reliable way to trigger a Railway deploy.
5. Wait ~110s for build + deploy (argon2 native compile is slow).
6. Verify live: `curl -s https://rydoninv.com/css/app.css | wc -c` (new design = 30487 bytes),
   then curl the changed pages and check HTTP 200.
7. If a page 500s, reproduce locally with a render test (see "Testing") and fix + re-deploy.

Do NOT ask the user to run shell commands, click "Redeploy" in Railway, or run `npm run seed`.
Handle everything yourself. Only report back when the fix is live and verified.

## 🔑 Credentials & Access

- **GitHub PAT**: the user-provided personal access token (repo scope, can create/merge PRs).
  - Store owner: `olybless89-cyber`.
  - Set remote: `git remote set-url origin https://<PAT>@github.com/olybless89-cyber/Rydoninv.git`
  - The PAT is NOT stored in this file (GitHub Push Protection blocks secrets in commits).
    It was provided by the user in conversation. If expired, ask the user for a fresh one,
    or try the auto-injected `$GITHUB_TOKEN` env var (note: that token's user
    `princessnwando-create` previously could NOT create PRs — "must be a collaborator" —
    so the user's PAT is required for PR operations).
  - Mask in all output: `sed -E 's/ghp_[A-Za-z0-9]+/<token-hidden>/g'`
- **Railway**: no API/CLI access — deploy is triggered ONLY by merging a PR to `main`.
  There is no Railway shell access. That's why auto-seed exists (see below).
- **Admin login** (auto-created on first boot): `admin@rydoninv.com` / `ChangeMe!2026`
- **Demo user**: `demo@rydoninv.com` / `DemoAccount!2026`
- These come from `src/db/seed.js` defaults; override with `ADMIN_EMAIL` / `ADMIN_PASSWORD` env vars.

## 🏗️ Architecture

```
src/index.js         Hono app entry. serve() → migrate() → autoSeed() → startEngine()
src/routes/public.js Public pages (home, markets, plans, copy-trading, education, contact)
src/routes/auth.js   Login/register/logout (session-based, argon2 password hashing)
src/routes/dashboard.js  User dashboard (overview, markets, deposit, withdraw, invest, copy, statement, bots)
src/routes/admin.js  Admin panel (users, deposits, withdrawals, traders, plans)
src/views/           Eta templates (.eta). layouts/app.eta = dashboard shell; site.eta = public shell
src/lib/view.js      Eta config (auto-trim, auto-escape off — templates use <%~ %> for raw HTML)
src/lib/auth.js      Session middleware (loadUser, csrfGuard, csrfToken), hash()
src/lib/icons.js     coinLogo(symbol, size) → inline SVG crypto logos (BTC, ETH, XRP, ADA, SOL, DOGE, TRX, LTC)
src/lib/money.js     money/format helpers passed to every view as `...fmt`
src/lib/stats.js     livePrices(limit), balance(userId), unreadCount(userId) — DB queries
src/db/schema.js     Drizzle schema (users, plans, traders, bots, transactions, ledger, investments, copy_follows, prices, trader_trades, notifications)
src/db/migrate.js    Idempotent migrations (CREATE TABLE IF NOT EXISTS + indexes)
src/db/seed.js       Idempotent seed (ON CONFLICT DO NOTHING). Exports `seed()` + runs as script.
src/db/client.js     Postgres connection via DATABASE_URL
src/workers/engine.js  Market price polling + trade simulation (pollPrices, runMarket, startEngine)
public/css/app.css   All styles (30,487 bytes = new design; 19,564 = old)
public/img/mark.svg  Brand logo (gradient arc + candlestick)
public/js/app.js     Client-side JS (dashboard interactions, TradingView widgets)
```

## 🔑 Key Patterns & Gotchas

### View rendering (Eta)
- `eta.render(view, data)` — the `data` object is what's available as `it.*` inside the template.
- The dashboard `shell()` in `src/routes/dashboard.js` renders the **inner view** AND the **layout** separately.
  - **CRITICAL**: if you add a new helper (like `coinLogo`) and use it in an inner template, you MUST pass it to BOTH:
    1. The inner view: `eta.render(view, { ...fmt, ...data, user, csrf, coinLogo })`
    2. The layout: `render(c, 'layouts/app', { body, title, ..., coinLogo })`
  - Forgetting the inner view causes HTTP 500 (the template calls `it.coinLogo()` → undefined → throws).
- Public pages: `src/routes/public.js` renders `layouts/site.eta`. Helpers passed in `render()` call there.
- CSRF: every form needs `<input type="hidden" name="_csrf" value="<%= it.csrf %>">`. POST routes check it.

### Auto-seed (no manual seeding ever)
- `src/index.js` calls `autoSeed()` after `migrate()` on startup.
- `autoSeed()` checks `SELECT count(*) FROM users WHERE role='admin'`. If 0, runs `seed()`.
- `seed()` is idempotent: ON CONFLICT DO NOTHING for plans/traders/bots, existence checks for users.
- `seed()` does NOT call `sql.end()` when imported (only when run as `npm run seed` script). Safe to call at runtime.
- Disable with env var `AUTO_SEED=false`.
- This is why admin login works on fresh deploys without a Railway shell.

### Deploy triggers
- Direct `git push origin main` → Railway does NOT rebuild. Useless for triggering deploys.
- PR merge to main → Railway rebuilds + deploys. ~110s total.
- Squash merge preferred (clean history): `merge_method: squash`.

## 🧪 Testing Locally (no DB needed for render tests)

```bash
# Syntax check
node --check src/index.js
node --check src/routes/dashboard.js

# Render test a template (catches undefined helper errors before deploying)
node --input-type=module -e "
import { eta } from './src/lib/view.js';
import * as fmt from './src/lib/money.js';
import { coinLogo } from './src/lib/icons.js';
const html = eta.render('dashboard/overview', { ...fmt, coinLogo, csrf:'X', path:'/dashboard',
  user:{firstName:'John',lastName:'T',role:'user'},
  pf:{equity:1000,available:500,realised:50,closedTrades:3,winRate:66.7,staked:200,exposure:100,activePlans:1,openTrades:2,pending:0},
  copies:[], recent:[], invs:[], markets:[{symbol:'BTC',price:65000,change:2.5}] });
console.log(html.length > 1000 ? 'OK' : 'FAIL');
"
```

## 🌐 Verifying Live Site

```bash
# Health + DB
curl -s https://rydoninv.com/healthz   # {"ok":true}
curl -s https://rydoninv.com/readyz    # {"ok":true,"db":true}

# New design is live (30487 = new, 19564 = old)
curl -s https://rydoninv.com/css/app.css | wc -c

# Login test (admin)
CSRF=$(curl -s -c /tmp/c.txt https://rydoninv.com/login | grep -oE 'value="[^"]+"' | head -1 | sed 's/value="//;s/"//')
curl -s -b /tmp/c.txt -c /tmp/c.txt -o /dev/null -w "%{http_code} %{redirect_url}\n" \
  -X POST https://rydoninv.com/login -H "Content-Type: application/x-www-form-urlencoded" \
  -d "_csrf=${CSRF}&email=admin@rydoninv.com&password=ChangeMe!2026"
# Expect: 302 https://rydoninv.com/admin

# Page-by-page HTTP status check
for p in / /markets /dashboard /admin /admin/users; do
  curl -s -b /tmp/c.txt -o /dev/null -w "$p %{http_code}\n" https://rydoninv.com$p
done
```

## 📋 What's Done (as of 2026-08-12)

- ✅ Dashboard UI redesigned to world-class trading standard (Sora font, market strip, Market Watch grid)
- ✅ Crypto logos (BTC/ETH/XRP/ADA/SOL/DOGE/TRX/LTC) in official brand colors, inline SVG
- ✅ Premium brand logo (`public/img/mark.svg`)
- ✅ Auto-seed on startup (PR #5) — admin + demo users, plans, traders, bots created automatically
- ✅ Dashboard 500 fix (PR #6) — coinLogo passed to inner view
- ✅ All pages verified HTTP 200: public, admin panel, user dashboard
- ✅ Live on https://rydoninv.com, Railway building from latest `main`

## 🔄 Standard Fix Routine

When the user reports a bug or asks for a change:
1. Reproduce / locate the issue in `src/`.
2. Fix it (minimal change, edit existing files).
3. `node --check` the changed file + render-test if it's a view/template.
4. Commit on a new branch, push, create PR, merge PR (squash).
5. Wait 110s, curl-verify the affected page returns 200 and shows the fix.
6. Report back with what's now live. Do NOT ask the user to do anything.
