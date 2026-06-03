import { supabaseAdmin } from '../src/shared/supabase';
import { createHash } from 'crypto';

// ─── Mirror of computeEventHash / sortedJson from auditTrail.service.ts ─────

function sortedObject(obj: unknown): unknown {
  if (obj === null || obj === undefined) return null;
  if (Array.isArray(obj)) return obj.map(item => sortedObject(item));
  if (typeof obj !== 'object') return obj;
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== null && v !== undefined) {
      result[k] = sortedObject(v);
    }
  }
  const sorted: Record<string, unknown> = {};
  for (const k of Object.keys(result).sort()) {
    sorted[k] = result[k];
  }
  return sorted;
}

function sortedJson(obj: unknown): string {
  const sorted = sortedObject(obj);
  if (sorted === null || sorted === undefined) return '{}';
  return JSON.stringify(sorted);
}

function computeEventHash(input: {
  tenant_id: string;
  chain_id: string;
  block_number: number;
  schema_version: string;
  event_category: string;
  event_type: string;
  event_title: string;
  event_summary: string;
  actor: Record<string, unknown>;
  object: Record<string, unknown>;
  correlation: Record<string, unknown>;
  authority: Record<string, unknown>;
  change: Record<string, unknown>;
  ai_context: Record<string, unknown>;
  risk_level: string;
  status: string;
  retention_class: string;
  prev_hash: string | null;
}): string {
  const parts = [
    input.tenant_id,
    input.chain_id,
    String(input.block_number),
    input.schema_version,
    input.event_category,
    input.event_type,
    input.event_title,
    input.event_summary,
    sortedJson(input.actor),
    sortedJson(input.object),
    sortedJson(input.correlation),
    sortedJson(input.authority),
    sortedJson(input.change),
    sortedJson(input.ai_context),
    input.risk_level,
    input.status,
    input.retention_class,
    input.prev_hash || '',
  ];
  const stringToHash = parts.join('|');
  const hash = createHash('sha256').update(stringToHash).digest('hex');
  return `sha256:${hash}`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const tenantId = 'default';
  const chainId = 'primary';

  // 1. Fetch all events ordered by block_number
  const { data: events, error } = await supabaseAdmin
    .from('audit_events')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('chain_id', chainId)
    .order('block_number', { ascending: true })
    .limit(50000);

  if (error) { console.error('Fetch error:', error); process.exit(1); }
  if (!events?.length) { console.log('No events found'); return; }

  console.log(`Found ${events.length} events`);

  // 2. Recompute hashes and update where needed
  let repaired = 0;
  let alreadyCorrect = 0;
  let errors = 0;
  let prevHash: string | null = null;

  for (const event of events) {
    const actor = (event as any).actor as Record<string, unknown> || {};
    const object = (event as any).object as Record<string, unknown> || {};
    const correlation = (event as any).correlation as Record<string, unknown> || {};
    const authority = (event as any).authority as Record<string, unknown> || {};
    const change = (event as any).change as Record<string, unknown> || {};
    const aiContext = (event as any).ai_context as Record<string, unknown> || {};

    const correctHash = computeEventHash({
      tenant_id: event.tenant_id || 'default',
      chain_id: event.chain_id || 'primary',
      block_number: event.block_number,
      schema_version: event.schema_version || '1.0',
      event_category: event.event_category || '',
      event_type: event.event_type || '',
      event_title: event.event_title || '',
      event_summary: event.event_summary || '',
      actor,
      object,
      correlation,
      authority,
      change,
      ai_context: aiContext,
      risk_level: event.risk_level || 'low',
      status: event.status || 'success',
      retention_class: event.retention_class || 'STANDARD',
      prev_hash: prevHash,
    });

    if (event.hash !== correctHash || event.prev_hash !== prevHash) {
      const { error: updateError } = await supabaseAdmin
        .from('audit_events')
        .update({
          hash: correctHash,
          prev_hash: prevHash,
          integrity_check_at: new Date().toISOString(),
        })
        .eq('id', event.id);

      if (updateError) {
        console.error(`  Update failed at block ${event.block_number}:`, updateError.message);
        errors++;
      } else {
        repaired++;
        if (repaired <= 3 || repaired % 1000 === 0) {
          const old20 = event.hash?.substring(0, 20) || 'NULL';
          const new20 = correctHash.substring(0, 20);
          console.log(`  Block ${event.block_number}: ${old20}... -> ${new20}...`);
        }
      }
    } else {
      alreadyCorrect++;
    }

    prevHash = correctHash;
  }

  console.log(`\nDone: ${repaired} repaired, ${alreadyCorrect} already correct, ${errors} errors`);
  process.exit(errors > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
