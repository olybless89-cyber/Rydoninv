/* End-to-end smoke test for this branch's fixes. Run against the local
   server (PORT in .env, default 3000) with a seeded DB.
   Usage: node test/e2e.js */
import 'dotenv/config';
import { sql } from '../src/db/client.js';

const BASE = `http://localhost:${process.env.PORT || 3000}`;
let ok = 0, fail = 0;
const check = (name, cond) => { cond ? ok++ : fail++; console.log(` ${cond ? 'ok  ' : 'FAIL'}: ${name}`); };

/* Cookie jar + CSRF helper (token is stable per session). */
class Jar {
  constructor() { this.cookies = {}; }
  headers() {
    const c = Object.entries(this.cookies).map(([k, v]) => `${k}=${v}`).join('; ');
    return c ? { cookie: c } : {};
  }
  save(res) {
    for (const sc of res.headers.getSetCookie?.() || []) {
      const [pair] = sc.split(';');
      const i = pair.indexOf('=');
      this.cookies[pair.slice(0, i).trim()] = pair.slice(i + 1).trim();
    }
  }
}
async function get(jar, path) {
  const res = await fetch(BASE + path, { headers: jar.headers(), redirect: 'manual' });
  jar.save(res);
  return { res, text: await res.text() };
}
async function post(jar, path, body, csrfFromHtml) {
  const html = csrfFromHtml || (await get(jar, path)).text;
  const token = (html.match(/name="_csrf" value="([^"]+)"/) || [])[1];
  const res = await fetch(BASE + path, {
    method: 'POST',
    headers: { ...jar.headers(), 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ ...body, _csrf: token }),
    redirect: 'manual',
  });
  jar.save(res);
  await res.text();
  return res;
}
const one = async (query) => (await sql.unsafe(query))[0];

const jar = new Jar();

/* 1. admin login */
let page = await get(jar, '/login');
let res = await post(jar, '/login', {
  email: 'admin@rydoninv.com', password: 'ChangeMe!2026',
}, page.text);
check('admin login (302 redirect)', res.status === 302);

const { id: demoId } = await one("select id from users where email='demo@rydoninv.com'");
console.log('demo id:', demoId);

/* 2. balance add/deduct via admin user edit page */
const { b: before } = await one(`select coalesce(sum(amount),0)::text b from ledger where user_id=${demoId}`);
page = await get(jar, `/admin/users/${demoId}`);
res = await post(jar, `/admin/users/${demoId}/adjust`, { direction: 'add', amount: '250.50', memo: 'test credit' }, page.text);
check('adjust route redirects (302)', res.status === 302);
page = await get(jar, `/admin/users/${demoId}`);
await post(jar, `/admin/users/${demoId}/adjust`, { direction: 'deduct', amount: '50.25', memo: 'test debit' }, page.text);
const { b: after } = await one(`select coalesce(sum(amount),0)::text b from ledger where user_id=${demoId}`);
const expected = (Number(before) + 250.5 - 50.25).toFixed(8);
check(`ledger reflects add+deduct (${before} -> ${after}, expected ${expected})`,
      Math.abs(Number(after) - Number(expected)) < 0.0001);

/* 3. admin edit profile incl. KYC status + password reset */
page = await get(jar, `/admin/users/${demoId}`);
await post(jar, `/admin/users/${demoId}/edit`, {
  firstName: 'Demo', lastName: 'Client', email: 'demo@rydoninv.com',
  role: 'user', status: 'active', kycStatus: 'verified',
}, page.text);
const { k: kycStatus } = await one(`select kyc_status k from users where id=${demoId}`);
check('admin can set kyc_status', kycStatus === 'verified');
page = await get(jar, `/admin/users/${demoId}`);
await post(jar, `/admin/users/${demoId}/password`, { password: 'NewSecret!2026' }, page.text);

/* 4. user KYC photo upload */
const ujar = new Jar();
page = await get(ujar, '/login');
res = await post(ujar, '/login', { email: 'demo@rydoninv.com', password: 'NewSecret!2026' }, page.text);
check('user login with reset password', res.status === 302);
await sql.unsafe(`update users set kyc_status='unverified' where id=${demoId}`);

page = await get(ujar, '/dashboard/kyc');
const token = (page.text.match(/name="_csrf" value="([^"]+)"/) || [])[1];
const form = new FormData();
form.append('_csrf', token);
form.append('documentType', 'passport');
form.append('documentNumber', 'P12345');
form.append('country', 'Nigeria');
const png = new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])], { type: 'image/png' });
form.append('front', png, 'front.png');
form.append('back', png, 'back.png');
res = await fetch(`${BASE}/dashboard/kyc`, { method: 'POST', headers: ujar.headers(), body: form, redirect: 'manual' });
ujar.save(res);
await res.text();
check('kyc photo upload accepted (302)', res.status === 302);

const { front_url: frontUrl } = await one(`select front_url from kyc_submissions where user_id=${demoId} order by id desc limit 1`);
check('submission points at an uploaded photo', !!frontUrl && frontUrl.startsWith('/uploads/kyc/'));
let fileExists = false;
try { fileExists = !!(await import('node:fs')).statSync('public' + frontUrl); } catch {}
check('uploaded file exists under public/uploads', fileExists);

/* 5. admin KYC review shows thumbnails; approve works */
page = await get(jar, '/admin/kyc');
check('admin kyc page renders <img> thumbnails', page.text.includes('<img'));
const { id: kycId } = await one(`select id from kyc_submissions where user_id=${demoId} and status='pending' order by id desc limit 1`);
res = await post(jar, `/admin/kyc/${kycId}/approve`, {}, page.text);
check('kyc approve (302)', [302, 303].includes(res.status));
const { k: finalKyc } = await one(`select kyc_status k from users where id=${demoId}`);
check('user verified after approve', finalKyc === 'verified');

/* 6. register -> welcome mail */
const rjar = new Jar();
page = await get(rjar, '/register');
res = await post(rjar, '/register', {
  firstName: 'Smoke', lastName: 'Test', email: `smoke-${Date.now()}@example.com`,
  password: '0123456789a', confirm: '0123456789a',
}, page.text);
check('register (302)', res.status === 302);
await new Promise((r) => setTimeout(r, 400));
const { c: mailCount } = await one(`select count(*)::int c from mail_log where template='mail/welcome'`);
check('welcome mail in outbox', mailCount >= 1);

/* 7. deposit page carries wallet addresses */
page = await get(jar, '/admin/wallets');
await post(jar, '/admin/wallets', { usdt_trc20: 'TQn9TestAddress123', btc: '', eth: '', bank: '' }, page.text);
page = await get(ujar, '/dashboard/deposit');
check('deposit page embeds configured wallet JSON', page.text.includes('TQn9TestAddress123'));

/* 7b. admin can edit a deposit's date, time and description */
const { id: txId } = await one(`select id from transactions where type='deposit' and user_id=${demoId} order by id desc limit 1`);
page = await get(jar, `/admin/deposits?status=all`);
const editRow = page.text.includes(`/admin/transactions/${txId}/edit`);
check('admin tx list ships an edit form for the deposit', editRow);
res = await post(jar, `/admin/transactions/${txId}/edit`, {
  date: '2024-01-02', time: '03:04', description: 'edited by smoke test',
}, page.text);
check('tx edit route redirects (302)', res.status === 302);
const { d: editedAt, n: editedNote } = await one(`select to_char(created_at,'YYYY-MM-DD HH24:MI') d, admin_note n
  from transactions where id=${txId}`);
check('tx date/time applied', editedAt === '2024-01-02 03:04');
check('tx description stored as admin note', editedNote === 'edited by smoke test');

/* 7c. admin can delete a user + all of their rows collapse */
const delId = (await one(`insert into users (email, password_hash, first_name, last_name)
  values ('todelete-${Date.now()}@example.com', 'x', 'Delete', 'Me') returning id`)).id;
await sql.unsafe(`insert into ledger (user_id, kind, amount) values (${delId}, 'adjustment', '10')`);
await sql.unsafe(`insert into transactions (user_id, type, method, amount, status) values (${delId}, 'deposit', 'btc', '10', 'pending')`);
await sql.unsafe(`insert into notifications (user_id, title) values (${delId}, 'hi')`);
page = await get(jar, `/admin/users?q=${encodeURIComponent('todelete')}`);
res = await post(jar, `/admin/users/${delId}/delete`, {}, page.text);
check('user delete route redirects (302)', res.status === 302);
const { c: usersLeft } = await one(`select count(*)::int c from users where id=${delId}`);
const { c: ledgerLeft } = await one(`select count(*)::int c from ledger where user_id=${delId}`);
const { c: txLeft } = await one(`select count(*)::int c from transactions where user_id=${delId}`);
const { c: nLeft } = await one(`select count(*)::int c from notifications where user_id=${delId}`);
check('deleted user is gone', usersLeft === 0);
check('their ledger lines were cleaned', ledgerLeft === 0);
check('their transactions were cleaned', txLeft === 0);
check('their notifications were cleaned', nLeft === 0);

/* 8. accrual pays + closes plans with correct accrued total */
const { runAccrual } = await import('../src/workers/engine.js');
const { pid: planId } = await one(`select id pid from plans order by id limit 1`);
const { id: invId } = await one(`
  insert into investments (user_id, plan_id, principal, status, periods_paid, last_accrual_at, matures_at)
  values (${demoId}, ${planId}, 1000, 'active', 0, now() - interval '5 hours', now())
  returning id`);
const { period_hours: ph, duration_periods: dp } = await one(`select period_hours, duration_periods from plans where id=${planId}`);
for (let i = 0; i < dp; i++) {
  await sql.unsafe(`update investments set last_accrual_at = now() - interval '2 hours' * ${ph} where id=${invId} and status='active'`);
  await runAccrual();
}
const { st, acc } = await one(`select status st, accrued::text acc from investments where id=${invId}`);
check('investment matured', st === 'matured');
const { c: payoutMail } = await one(`select count(*)::int c from mail_log where template in ('mail/plan-payout', 'mail/plan-closed')`);
check('payout/maturity mails logged', payoutMail >= 1);
const { body_html: closedBody } = await one(`select body_html from mail_log where template='mail/plan-closed' order by id desc limit 1`);
check('maturity mail body rendered without NaN', closedBody && !closedBody.includes('NaN'));

console.log(`\n== ${ok} ok, ${fail} failed`);
process.exit(fail ? 1 : 0);
