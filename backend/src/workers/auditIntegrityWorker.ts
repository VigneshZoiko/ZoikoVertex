import { supabaseAdmin } from '../shared/supabase';
import { verifyChainIntegrity, createAuditEvent } from '../services/auditTrail.service';
import { logger } from '../shared/logger';

export function initAuditIntegrityWorker() {
  const POLL_INTERVAL = 60_000;
  // Don't re-alarm the same workspace within this window even if blocks still fail.
  // Prevents the feedback loop where the failure event itself causes a new failure alarm.
  const ALARM_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes
  let running = false;

  // Track the last alarm time per workspace in-process to avoid DB round-trips
  const lastAlarmAt = new Map<string, number>();

  async function poll() {
    if (running) return;
    running = true;

    try {
      const { data: rows } = await supabaseAdmin
        .from('workspaces')
        .select('id')
        .eq('status', 'ACTIVE')
        .limit(50);

      if (!rows || rows.length === 0) return;

      for (const { id: workspaceId } of rows) {
        const result = await verifyChainIntegrity(workspaceId);

        if (result.failed_blocks === 0) continue;

        // Cooldown check — skip if we already fired an alarm recently
        const lastFired = lastAlarmAt.get(workspaceId) || 0;
        if (Date.now() - lastFired < ALARM_COOLDOWN_MS) {
          logger.warn({ failedBlocks: result.failed_blocks, workspaceId }, '[integrity-worker] Chain integrity failure (alarm suppressed — in cooldown)');
          continue;
        }

        // Also confirm no recent failure event in DB (covers server restarts)
        const cooldownCutoff = new Date(Date.now() - ALARM_COOLDOWN_MS).toISOString();
        const { data: recent } = await supabaseAdmin
          .from('audit_events')
          .select('id')
          .eq('workspace_id', workspaceId)
          .eq('event_type', 'chain.integrity_failure')
          .gte('created_at', cooldownCutoff)
          .limit(1);

        if (recent && recent.length > 0) {
          logger.warn({ failedBlocks: result.failed_blocks, workspaceId }, '[integrity-worker] Chain integrity failure (alarm suppressed — recent event exists)');
          lastAlarmAt.set(workspaceId, Date.now());
          continue;
        }

        logger.error({ failedBlocks: result.failed_blocks, workspaceId }, '[integrity-worker] Chain integrity FAILURE — emitting alarm');
        lastAlarmAt.set(workspaceId, Date.now());

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
    } catch (err) {
      logger.error({ err }, '[integrity-worker] Poll error');
    } finally {
      running = false;
    }
  }

  poll();
  setInterval(poll, POLL_INTERVAL);
  logger.info('[audit-integrity-worker] Started (poll every 60s, alarm cooldown 10 min)');
}
