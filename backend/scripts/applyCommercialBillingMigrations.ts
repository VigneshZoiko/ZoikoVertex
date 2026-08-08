/**
 * applyCommercialBillingMigrations.ts
 *
 * Applies ZV-COM-BILL-001 migrations 84 / 85 / 86 against a target Supabase
 * database, then runs the RLS coverage check.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * SAFETY: the script REFUSES to run against the known production project
 * (wcudapbmavuyafllfyft — the one render.yaml deploys). Pass --allow-production
 * ONLY if you are certain the connection string is staging.
 *
 * USAGE (staging):
 *   cd backend
 *   DATABASE_URL="postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres" \
 *     npx ts-node scripts/applyCommercialBillingMigrations.ts --yes
 *
 * Or with discrete PG vars:
 *   PGHOST=... PGPORT=5432 PGUSER=... PGPASSWORD=... PGDATABASE=postgres \
 *     npx ts-node scripts/applyCommercialBillingMigrations.ts --yes
 *
 * Without --yes the script prints the target database and waits for a typed
 * confirmation before applying anything.
 *
 * Exits: 0 = migrations applied + RLS check clean | 2 = RLS issues found
 *        1 = connection/apply error
 */
import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

// The Supabase project ref that render.yaml deploys as production. The script
// refuses to run against any connection string containing this ref.
const KNOWN_PRODUCTION_REF = 'wcudapbmavuyafllfyft'.toLowerCase();
const MIGRATION_FILES = ['84_commercial_billing_standard.sql', '85_user_role_billing_admin.sql', '86_account_requests_invite_expiry.sql'];

const args = process.argv.slice(2);
const FLAG_YES = args.includes('--yes');
const FLAG_ALLOW_PROD = args.includes('--allow-production');

function buildConfig() {
  if (process.env.DATABASE_URL) return { connectionString: process.env.DATABASE_URL };
  return {
    host: process.env.PGHOST || 'localhost',
    port: Number(process.env.PGPORT || 5432),
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || '',
    database: process.env.PGDATABASE || 'postgres',
  };
}

async function main(): Promise<number> {
  const cfg = buildConfig();
  const client = new Client(cfg);
  await client.connect();

  // ── Preflight: print target so you can verify it is staging ────────────────
  const info = await client.query(
    `SELECT current_database() AS db, current_user AS usr, inet_server_addr() AS addr, version() AS ver`
  );
  const row = info.rows[0];
  const host = (typeof cfg === 'object' && 'host' in cfg && cfg.host) || (cfg as any).connectionString || '?';
  console.log('\n══════════════════════════════════════════════════════════════');
  console.log('  TARGET DATABASE');
  console.log('──────────────────────────────────────────────────────────────');
  console.log(`  host      : ${String(host).replace(/\/\/[^@]*@/, '//***@')}`);
  console.log(`  database  : ${row.db}`);
  console.log(`  user      : ${row.usr}`);
  console.log(`  server    : ${row.addr || 'unknown'}`);
  console.log(`  postgres  : ${String(row.ver).split(' ')[1] || '?'}`);
  console.log('══════════════════════════════════════════════════════════════\n');

  // ── Production guard ───────────────────────────────────────────────────────
  const hostStr = String(host).toLowerCase();
  if (hostStr.includes(KNOWN_PRODUCTION_REF) && !FLAG_ALLOW_PROD) {
    console.error('❌ Refusing: this connection string targets the project render.yaml deploys as PRODUCTION.');
    console.error('   If this is genuinely staging, re-run with --allow-production after verifying.');
    await client.end();
    return 1;
  }
  if (FLAG_ALLOW_PROD) {
    console.warn('⚠  --allow-production set: running against a host matching the known production ref.');
  }
  if (!FLAG_YES) {
    const readline = require('readline');
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const answer = await new Promise<string>((resolve) => {
      rl.question('Type the database name above to confirm this is the intended target, then press Enter: ', resolve);
    });
    rl.close();
    if (answer.trim().toLowerCase() !== String(row.db).toLowerCase()) {
      console.error('❌ Confirmation mismatch — aborting without changes.');
      await client.end();
      return 1;
    }
  }

  // ── Apply migrations in order, each in its own transaction ─────────────────
  const migrationsDir = path.resolve(__dirname, '..', '..', 'db_migrations');
  console.log(`Applying migrations from: ${migrationsDir}\n`);
  for (const file of MIGRATION_FILES) {
    const fullPath = path.join(migrationsDir, file);
    if (!fs.existsSync(fullPath)) {
      console.error(`❌ Missing migration file: ${fullPath}`);
      await client.end();
      return 1;
    }
    const sql = fs.readFileSync(fullPath, 'utf8');
    process.stdout.write(`  ▶ ${file} ... `);
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('COMMIT');
      console.log('OK');
    } catch (err: any) {
      await client.query('ROLLBACK');
      console.error('FAILED');
      console.error(`    ${String(err.message).split('\n').slice(0, 4).join('\n    ')}`);
      await client.end();
      return 1;
    }
  }

  // ── Verify schema landed ───────────────────────────────────────────────────
  console.log('\n── Schema verification ──────────────────────────────────────────');
  const schemaChecks: Array<[string, string]> = [
    ['workspaces.billing_classification', `SELECT 1 FROM information_schema.columns WHERE table_name='workspaces' AND column_name='billing_classification'`],
    ['workspaces.subscription_status', `SELECT 1 FROM information_schema.columns WHERE table_name='workspaces' AND column_name='subscription_status'`],
    ['workspaces.trial_starts_at', `SELECT 1 FROM information_schema.columns WHERE table_name='workspaces' AND column_name='trial_starts_at'`],
    ['workspace_members.identity_class', `SELECT 1 FROM information_schema.columns WHERE table_name='workspace_members' AND column_name='identity_class'`],
    ['wallets.last_payment_failed_at', `SELECT 1 FROM information_schema.columns WHERE table_name='wallets' AND column_name='last_payment_failed_at'`],
    ['account_requests.expires_at', `SELECT 1 FROM information_schema.columns WHERE table_name='account_requests' AND column_name='expires_at'`],
    ['account_requests.identity_class', `SELECT 1 FROM information_schema.columns WHERE table_name='account_requests' AND column_name='identity_class'`],
    ['user_role enum includes BILLING_ADMIN', `SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid=t.oid WHERE t.typname='user_role' AND e.enumlabel='BILLING_ADMIN'`],
  ];
  let allOk = true;
  for (const [label, q] of schemaChecks) {
    const r = await client.query(q);
    const ok = (r.rowCount ?? 0) > 0;
    if (!ok) allOk = false;
    console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}`);
  }

  // ── RLS coverage check (scripts/check_rls_coverage.sql logic) ──────────────
  console.log('\n── RLS coverage check ───────────────────────────────────────────');
  const rls = await client.query(`
    WITH table_list AS (
      SELECT schemaname, tablename FROM pg_catalog.pg_tables
      WHERE schemaname = 'public' AND tablename NOT LIKE 'pg_%' AND tablename NOT LIKE '_prisma_%'
    ), rls_enabled AS (
      SELECT schemaname, tablename FROM pg_catalog.pg_tables
      WHERE schemaname = 'public' AND rowsecurity = true
    ), policy_counts AS (
      SELECT pol.schemaname, pol.tablename, COUNT(*) AS policy_count
      FROM pg_catalog.pg_policies pol WHERE pol.schemaname = 'public'
      GROUP BY pol.schemaname, pol.tablename
    )
    SELECT tl.tablename,
      CASE WHEN re.tablename IS NULL THEN 'NO_RLS' ELSE 'RLS_ENABLED' END AS rls_status,
      COALESCE(pc.policy_count, 0) AS policy_count
    FROM table_list tl
    LEFT JOIN rls_enabled re ON tl.schemaname = re.schemaname AND tl.tablename = re.tablename
    LEFT JOIN policy_counts pc ON tl.schemaname = pc.schemaname AND tl.tablename = pc.tablename
    WHERE re.tablename IS NULL OR pc.policy_count IS NULL OR pc.policy_count = 0
    ORDER BY tl.tablename
  `);

  if (rls.rows.length === 0) {
    console.log('  ✓ RLS coverage clean — every public table has RLS enabled with ≥1 policy.');
  } else {
    allOk = false;
    console.log(`  ✗ ${rls.rows.length} table(s) without RLS policies:`);
    for (const t of rls.rows) {
      console.log(`    - ${t.tablename} (${t.rls_status}, ${t.policy_count} policies)`);
    }
    console.log('\n  The new tables added by migration 84 (none) / new columns do not require');
    console.log('  policy changes, but any table listed above needs ALTER TABLE ... ENABLE ROW LEVEL SECURITY;');
  }

  await client.end();

  if (!allOk) {
    console.error('\n❌ Verification found issues (see FAIL rows above).');
    return 2;
  }
  console.log('\n✅ Migrations 84/85/86 applied and verified against target.');
  return 0;
}

main().then((code) => process.exit(code)).catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
