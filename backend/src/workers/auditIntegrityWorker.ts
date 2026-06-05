import { supabaseAdmin } from '../shared/supabase';
import { verifyChainIntegrity, createAuditEvent } from '../services/auditTrail.service';

export function initAuditIntegrityWorker() {
  const POLL_INTERVAL = 60_000;
  let running = false;

  async function poll() {
    if (running) return;
    running = true;

    try {
      // Fetch all distinct workspace IDs so every workspace gets integrity-checked,
      // not just whichever row happens to be first in workspace_members.
      const { data: rows } = await supabaseAdmin
        .from('workspaces')
        .select('id')
        .eq('status', 'ACTIVE');

      if (!rows || rows.length === 0) return;

      for (const { id: workspaceId } of rows) {
        const result = await verifyChainIntegrity(workspaceId);

        if (result.failed_blocks > 0) {
          console.error(`[integrity-worker] Chain integrity FAILURE: ${result.failed_blocks} broken block(s) in workspace ${workspaceId}`);

          await createAuditEvent({
            workspace_id: workspaceId,
            event_category: 'system_security',
            event_type: 'chain.integrity_failure',
            event_title: 'Chain Integrity Failure Detected',
            event_summary: `${result.failed_blocks} block(s) failed verification out of ${result.total_blocks} total blocks`,
            actor: { actor_id: 'system', actor_type: 'system' },
            object: { object_type: 'audit_chain', object_id: result.chain_id },
            risk_level: 'critical',
            status: 'failed',
            evidence_state: 'preserved',
            retention_class: 'REGULATED',
            authority: { permission_used: 'system.verify' },
            correlation: {
              failed_blocks: String(result.failed_blocks),
              total_blocks: String(result.total_blocks),
              chain_id: result.chain_id,
              tenant_id: result.tenant_id,
            },
          } as any);
        }
      }
    } catch (err) {
      console.error('[integrity-worker] Poll error:', err);
    } finally {
      running = false;
    }
  }

  poll();
  setInterval(poll, POLL_INTERVAL);
  console.log('[audit-integrity-worker] Started (poll every 60s)');
}
