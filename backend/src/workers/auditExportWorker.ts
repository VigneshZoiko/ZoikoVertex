import { supabaseAdmin } from '../shared/supabase';
import { listAuditEvents, verifyChainIntegrity, createAuditEvent, applyFieldAccess } from '../services/auditTrail.service';
import { createHash } from 'crypto';

interface ExportJob {
  id: string;
  workspace_id: string;
  requested_by: string;
  reason: string;
  format: 'csv' | 'json' | 'pdf';
  filters: Record<string, string | undefined>;
  status: string;
  file_url: string | null;
  manifest_hash: string | null;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
}

async function processExportJob(job: ExportJob): Promise<void> {
  await supabaseAdmin.from('audit_export_jobs').update({ status: 'PROCESSING' }).eq('id', job.id);

  try {
    const result = await listAuditEvents({
      workspace_id: job.workspace_id,
      limit: 10000,
      date_from: job.filters.date_from,
      date_to: job.filters.date_to,
      event_category: job.filters.event_category,
      risk_level: job.filters.risk_level,
      status: job.filters.status,
      retention_class: job.filters.retention_class,
      actor_id: job.filters.actor_id,
    });

    const events = result.events;

    const filteredEvents = events.map(e => applyFieldAccess(e as any, 'ADMIN', job.requested_by, true) as any);

    let fileContent: string;
    let mimeType: string;

    if (job.format === 'csv') {
      const headers = ['event_id', 'event_type', 'event_title', 'event_summary', 'timestamp_utc', 'risk_level', 'status', 'evidence_state', 'retention_class', 'actor_name', 'actor_type', 'object_type', 'object_id', 'hash', 'prev_hash', 'block_number'];
      const rows = filteredEvents.map((e: any) => [
        e.event_id, e.event_type, e.event_title, e.event_summary,
        e.timestamp_utc, e.risk_level, e.status, e.evidence_state,
        e.retention_class, e.actor?.actor_name || '', e.actor?.actor_type || '',
        e.object?.object_type || '', e.object?.object_id || '',
        e.hash, e.prev_hash || '', String(e.block_number),
      ].map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(','));
      fileContent = [headers.join(','), ...rows].join('\n');
      mimeType = 'text/csv';
    } else {
      fileContent = JSON.stringify(filteredEvents, null, 2);
      mimeType = 'application/json';
    }

    const sortedHashes = filteredEvents
      .sort((a: any, b: any) => a.block_number - b.block_number)
      .map((e: any) => e.hash || '')
      .join('');
    const manifestHash = 'sha256:' + createHash('sha256').update(sortedHashes).digest('hex');

    const chainVerification = await verifyChainIntegrity(job.workspace_id);

    const base64 = Buffer.from(fileContent).toString('base64');
    const fileUrl = `data:${mimeType};base64,${base64}`;

    await supabaseAdmin.from('audit_export_jobs').update({
      status: 'COMPLETED',
      file_url: fileUrl,
      manifest_hash: manifestHash,
      completed_at: new Date().toISOString(),
    }).eq('id', job.id);

    await createAuditEvent({
      workspace_id: job.workspace_id,
      event_category: 'evidence_legal',
      event_type: 'evidence.exported',
      event_title: 'Audit Events Exported',
      event_summary: `${filteredEvents.length} events exported as ${job.format.toUpperCase()}`,
      actor: { actor_id: job.requested_by, actor_type: 'human_user' },
      object: { object_type: 'audit_export', object_id: job.id },
      retention_class: 'EXTENDED',
      risk_level: 'low',
      status: 'success',
      evidence_state: 'preserved',
      authority: { permission_used: 'audit.export' },
      correlation: { manifest_hash: manifestHash, chain_status: chainVerification.failed_blocks > 0 ? 'compromised' : 'intact', event_count: String(filteredEvents.length) },
    } as any);

  } catch (err: any) {
    await supabaseAdmin.from('audit_export_jobs').update({
      status: 'FAILED',
      error_message: err.message || 'Export processing failed',
      completed_at: new Date().toISOString(),
    }).eq('id', job.id);
  }
}

export function initAuditExportWorker() {
  const POLL_INTERVAL = 30_000;
  let running = false;

  async function poll() {
    if (running) return;
    running = true;

    try {
      const { data: jobs } = await supabaseAdmin
        .from('audit_export_jobs')
        .select('*')
        .eq('status', 'PENDING')
        .order('created_at', { ascending: true })
        .limit(5);

      if (jobs && jobs.length > 0) {
        console.log(`[audit-export-worker] Processing ${jobs.length} export job(s)`);
        for (const job of jobs) {
          await processExportJob(job as ExportJob);
        }
      }
    } catch (err) {
      console.error('[audit-export-worker] Poll error:', err);
    } finally {
      running = false;
    }
  }

  poll();
  setInterval(poll, POLL_INTERVAL);
  console.log('[audit-export-worker] Started (poll every 30s)');
}
