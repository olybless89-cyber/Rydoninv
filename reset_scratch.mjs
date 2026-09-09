/* Scratch-DB reset for local verify runs.

   Wipes EVERY table (all 18) so a verify run starts from a perfectly
   clean slate — no stale rows left behind by earlier crashed runs in
   kyc_submissions / copy_positions / copy_follows / bot_runs / spot_positions /
   investments / trader_trades / ledger / mail_log / notifications / sessions / etc.

   Usage:  node reset_scratch.mjs   (requires DATABASE_URL, e.g. in .env)
   Then:   node src/db/migrate.js && node src/db/seed.js && RUN_ENGINE=false node src/index.js
*/
import 'dotenv/config';
import { sql } from './src/db/client.js';

const TABLES = [
  'users',
  'ledger',
  'transactions',
  'plans',
  'investments',
  'spot_positions',
  'traders',
  'trader_trades',
  'copy_follows',
  'copy_positions',
  'bots',
  'bot_runs',
  'prices',
  'sessions',
  'notifications',
  'kyc_submissions',
  'mail_log',
  'settings',
];

if (!process.env.DATABASE_URL) {
  console.error('[reset] DATABASE_URL is not set — nothing to do.');
  process.exit(1);
}

try {
  // Single statement, RESTART IDENTITY resets serial counters and CASCADE
  // handles any ordering/FK concerns automatically.
  await sql.unsafe(`truncate table ${TABLES.join(', ')} restart identity cascade`);
  console.log(`[reset] wiped ${TABLES.length} tables: ${TABLES.join(', ')}`);
} catch (e) {
  console.error('[reset] failed:', e.message);
  process.exit(1);
} finally {
  await sql.end({ timeout: 2 }).catch(() => {});
}