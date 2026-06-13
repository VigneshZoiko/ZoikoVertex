import { supabaseAdmin } from '../shared/supabase';
import { createAuditEvent } from '../services/auditTrail.service';
import { logger } from '../shared/logger';

export function initVaultWorker() {
  const SHARE_EXPIRY_INTERVAL = 120_000; // 2 minutes
  let shareRunning = false;

  // ─── Share Expiry Checker ──────────────────────────────────────────────────

  async function checkExpiredShares() {
    if (shareRunning) return;
    shareRunning = true;

    try {
      const now = new Date().toISOString();
      const { data: expiredShares } = await supabaseAdmin
        .from('vault_shares')
        .select('id, share_id, package_id, workspace_id, tenant_id, created_by')
        .eq('revoked', false)
        .lt('expires_at', now);

      if (!expiredShares || expiredShares.length === 0) {
        shareRunning = false;
        return;
      }

      for (const share of expiredShares) {
        await supabaseAdmin
          .from('vault_shares')
          .update({
            revoked: true,
            revoked_at: now,
            revoked_by: 'system',
          })
          .eq('id', share.id);

        await createAuditEvent({
          workspace_id: share.workspace_id,
          event_category: 'evidence_legal',
          event_type: 'evidence.share_revoked',
          event_title: 'Share Auto-Revoked (Expired)',
          event_summary: `Share ${share.share_id} auto-revoked due to expiry.`,
          actor: { actor_id: 'system', actor_type: 'system' },
          object: { object_type: 'vault_share', object_id: share.share_id },
          risk_level: 'low',
          status: 'success',
          evidence_state: 'preserved',
          retention_class: 'EXTENDED' as const,
        });
      }
    } catch (err) {
      logger.error({ err }, '[vault-worker] Share expiry check error');
    } finally {
      shareRunning = false;
    }
  }

  // ─── Start ──────────────────────────────────────────────────────────────────

  checkExpiredShares();
  setInterval(checkExpiredShares, SHARE_EXPIRY_INTERVAL);

  logger.info('[vault-worker] Started (share expiry every 120s)');
}

export function initDlpScanWorker() {
  const DLP_SCAN_INTERVAL = 300_000; // 5 minutes
  let workerRunning = false;

  async function processPendingScans() {
    if (workerRunning) return;
    workerRunning = true;

    try {
      const { data: pendingPackages } = await supabaseAdmin
        .from('vault_packages')
        .select('id, package_id, workspace_id, tenant_id')
        .eq('status', 'sealed')
        .limit(10);

      if (!pendingPackages || pendingPackages.length === 0) {
        workerRunning = false;
        return;
      }

      for (const pkg of pendingPackages) {
        // Check if scan already exists
        const { data: existing } = await supabaseAdmin
          .from('vault_dlp_scans')
          .select('id')
          .eq('package_id', pkg.id)
          .limit(1);

        if (existing && existing.length > 0) continue;

        // Fetch all item IDs, then fetch all evidence items in one query
        const { data: pkgItems } = await supabaseAdmin
          .from('vault_package_items')
          .select('item_id')
          .eq('package_id', pkg.id);

        const findings: any[] = [];
        let scanStatus = 'passed';
        let detectionCategory: string | null = null;

        if (pkgItems && pkgItems.length > 0) {
          const itemIds = pkgItems.map((pi: any) => pi.item_id).filter(Boolean);
          const { data: evidenceItems } = await supabaseAdmin
            .from('vault_evidence_items')
            .select('id, source_type, contains_pii')
            .in('id', itemIds);

          for (const item of evidenceItems || []) {
            if (item?.contains_pii) {
              findings.push({
                type: 'pii',
                field: 'evidence_content',
                severity: 'medium',
                item_id: item.id,
              });
            }
          }
        }

        if (findings.length > 0) {
          scanStatus = 'flagged';
          detectionCategory = 'pii';
        }

        const now = new Date().toISOString();
        await supabaseAdmin.from('vault_dlp_scans').insert({
          package_id: pkg.id,
          tenant_id: pkg.tenant_id,
          scan_status: scanStatus,
          detection_category: detectionCategory,
          findings,
          scan_report: findings.length > 0
            ? `Found ${findings.length} item(s) requiring redaction.`
            : 'No issues detected.',
          scanned_by_worker: 'dlp_worker',
          completed_at: now,
        });

        if (scanStatus === 'flagged') {
          await createAuditEvent({
            workspace_id: pkg.workspace_id,
            event_category: 'evidence_legal',
            event_type: 'evidence.export_blocked',
            event_title: 'DLP Scan Flagged Package',
            event_summary: `Package ${pkg.package_id} DLP scan found ${findings.length} issue(s).`,
            actor: { actor_id: 'system', actor_type: 'system' },
            object: { object_type: 'vault_package', object_id: pkg.package_id },
            risk_level: 'high',
            status: 'blocked',
            evidence_state: 'preserved',
            retention_class: 'REGULATED' as const,
          });
        }
      }
    } catch (err) {
      logger.error({ err }, '[dlp-worker] Pending scan error');
    } finally {
      workerRunning = false;
    }
  }

  processPendingScans();
  setInterval(processPendingScans, DLP_SCAN_INTERVAL);
  logger.info('[dlp-worker] Started (pending scans every 5m)');
}
