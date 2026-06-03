import { supabaseAdmin } from '../src/shared/supabase';
import crypto from 'crypto';

// ─── Mirror of buildLedgerEntryHash from identityLedger.service.ts ──────────

function stableSort(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableSort);
  if (value && typeof value === 'object' && value.constructor === Object) {
    const sortedEntries = Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, inner]) => [key, stableSort(inner)]);
    return Object.fromEntries(sortedEntries);
  }
  return value;
}

function stableStringify(value: unknown): string {
  return JSON.stringify(stableSort(value));
}

function computeHash(value: unknown): string {
  return crypto.createHash('sha256').update(stableStringify(value)).digest('hex');
}

function buildLedgerEntryHash(input: {
  tenant_id: string;
  workspace_id: string;
  data_residency: string;
  schema_version: string;
  entry_type: string;
  entry_category: string;
  timestamp_utc: string;
  actor_id: string;
  actor_type: string;
  source: Record<string, unknown>;
  authority_change: Record<string, unknown>;
  session_context: Record<string, unknown>;
  approvals: unknown[];
  linked_authority_snapshot_id: string | null;
  risk: Record<string, unknown>;
  retention: Record<string, unknown>;
  prev_hash: string | null;
}): string {
  return computeHash(input);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const workspaceId = '00000000-0000-0000-0000-000000000000';

  // Fetch all entries ordered by timestamp_utc, then created_at
  const { data: entries, error } = await supabaseAdmin
    .from('identity_ledger_entries')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('timestamp_utc', { ascending: true })
    .order('created_at', { ascending: true })
    .limit(50000);

  if (error) { console.error('Fetch error:', error); process.exit(1); }
  if (!entries?.length) { console.log('No entries found'); return; }

  console.log(`Found ${entries.length} entries`);

  let repaired = 0;
  let alreadyCorrect = 0;
  let errors = 0;
  let previousHash: string | null = null;

  for (const entry of entries) {
    const expectedHash = buildLedgerEntryHash({
      tenant_id: entry.tenant_id,
      workspace_id: entry.workspace_id,
      data_residency: entry.data_residency,
      schema_version: entry.schema_version,
      entry_type: entry.entry_type,
      entry_category: entry.entry_category,
      timestamp_utc: entry.timestamp_utc,
      actor_id: entry.actor_id,
      actor_type: entry.actor_type,
      source: entry.source || {},
      authority_change: entry.authority_change || {},
      session_context: entry.session_context || {},
      approvals: entry.approvals || [],
      linked_authority_snapshot_id: entry.linked_authority_snapshot_id,
      risk: entry.risk || {},
      retention: entry.retention || {},
      prev_hash: previousHash,
    });

    const needsRepair: boolean = entry.hash !== expectedHash || entry.prev_hash !== previousHash;

    if (needsRepair) {
      const { error: updateError } = await supabaseAdmin
        .from('identity_ledger_entries')
        .update({
          hash: expectedHash,
          prev_hash: previousHash,
        })
        .eq('id', entry.id);

      if (updateError) {
        console.error(`  Update failed at ${entry.ledger_entry_id}:`, updateError.message);
        errors++;
      } else {
        repaired++;
        if (repaired <= 3 || repaired % 500 === 0) {
          console.log(`  ${entry.ledger_entry_id}: hash fixed`);
        }
      }
    } else {
      alreadyCorrect++;
    }

    // Use the CORRECT hash for the next entry's prev_hash linkage
    previousHash = expectedHash;
  }

  console.log(`\nDone: ${repaired} repaired, ${alreadyCorrect} already correct, ${errors} errors`);
  process.exit(errors > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
