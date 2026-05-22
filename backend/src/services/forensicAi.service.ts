import { supabaseAdmin } from '../shared/supabase';
import { getCase, getEnhancedTimeline, listEvidence, listActions, listNotes, listTasks, CaseNote } from './forensicHub.service';
import { emitForensicAuditEvent } from './forensicHub.service';
import { createSubscription, deliverToSubscription } from './auditTrailStreaming.service';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AiSummary {
  id: string; case_id: string; summary_type: string; content: string;
  citations: any[]; confidence_score: number | null; status: string;
  reviewed_by: string | null; reviewed_at: string | null;
  approved: boolean; rejection_reason: string | null;
  generated_by: string; created_at: string;
}

export interface AnomalyResult {
  id: string; case_id: string; anomaly_type: string; label: string;
  description: string | null; actors: string[]; policies: string[];
  events: string[]; severity: string; frequency: number;
}

// ─── AI Summary Draft ─────────────────────────────────────────────────────────

export async function generateCaseSummary(caseId: string, actorId: string): Promise<AiSummary> {
  const caseRec = await getCase(caseId);
  if (!caseRec) throw new Error('Case not found');

  const [evidence, actions, timeline, tasks, notes] = await Promise.all([
    listEvidence(caseId), listActions(caseId),
    getEnhancedTimeline(caseId), listTasks(caseId),
    supabaseAdmin.from('case_notes').select('*').eq('case_id', caseId).order('created_at', { ascending: false }),
  ]);

  const allNotes: CaseNote[] = notes.data || [];

  // Build structured content with citations
  const sections: string[] = [];
  const citations: any[] = [];

  sections.push(`CASE SUMMARY: ${caseRec.title}`);
  sections.push(`Type: ${caseRec.case_type} | Severity: ${caseRec.severity} | Status: ${caseRec.status}`);
  sections.push(`Description: ${caseRec.summary}`);

  // Evidence summary with citations
  const pinnedEvidence = evidence.filter(e => e.is_pinned);
  if (pinnedEvidence.length > 0) {
    sections.push(`\nKey Evidence (${pinnedEvidence.length} items):`);
    for (const e of pinnedEvidence) {
      sections.push(`- ${e.source_type}: ${e.source_id.substring(0, 16)} (${e.relevance})`);
      citations.push({ type: 'evidence', id: e.id, source: e.source_id, reason: e.added_reason });
    }
  }

  // Timeline summary
  const keyEvents = timeline.filter(t => t.confidence === 'deterministic');
  if (keyEvents.length > 0) {
    sections.push(`\nTimeline (${keyEvents.length} deterministic events):`);
    for (const e of keyEvents.slice(0, 10)) {
      sections.push(`- ${e.timestamp?.substring(0, 10)}: ${e.label} — ${e.actor}`);
      if (e.audit_event_id) citations.push({ type: 'audit_event', id: e.audit_event_id, label: e.label });
    }
    if (keyEvents.length > 10) sections.push(`- ... and ${keyEvents.length - 10} more events`);
  }

  // Participant summary
  if (caseRec.owner_user_id) {
    sections.push(`\nOwner: ${caseRec.owner_user_id}`);
  }

  // Task status
  const openTasks = tasks.filter(t => t.status !== 'completed');
  if (openTasks.length > 0) {
    sections.push(`\nOpen Tasks: ${openTasks.length}`);
    for (const t of openTasks) {
      sections.push(`- ${t.title} (assigned: ${t.owner_id})`);
    }
  }

  // Legal hold status
  if (caseRec.legal_hold_active) {
    sections.push(`\n⚠ Legal Hold Active — evidence retention overridden to legal_hold`);
  }

  // SLA status
  if (caseRec.sla_due_at) {
    const overdue = new Date(caseRec.sla_due_at) < new Date();
    sections.push(`\nSLA: ${overdue ? 'BREACHED' : 'Within target'} (due: ${caseRec.sla_due_at?.substring(0, 10)})`);
  }

  const content = sections.join('\n');

  const { data, error } = await supabaseAdmin.from('case_ai_summaries').insert({
    case_id: caseId, summary_type: 'case_summary', content,
    citations: JSON.parse(JSON.stringify(citations)),
    status: 'draft', generated_by: actorId,
  }).select().single();

  if (error) throw error;

  await emitForensicAuditEvent(
    'forensic.ai_summary_generated', caseRec.workspace_id, actorId,
    `AI Summary Generated: ${caseRec.case_id}`,
    `AI case summary draft generated with ${citations.length} citations.`,
    { object_type: 'forensic_case', object_id: caseRec.case_id },
    { field_changed: 'ai_summary', previous_value: null, new_value: 'draft_generated' },
    { permission_used: 'forensic.ai.summarize' }
  );

  return data;
}

export async function approveAiSummary(summaryId: string, actorId: string): Promise<AiSummary> {
  const { data: summary } = await supabaseAdmin.from('case_ai_summaries').select('*').eq('id', summaryId).single();
  if (!summary) throw new Error('AI summary not found');

  await supabaseAdmin.from('case_ai_summaries').update({
    status: 'approved', approved: true, reviewed_by: actorId, reviewed_at: new Date().toISOString(),
  }).eq('id', summaryId);

  const caseRec = await getCase(summary.case_id);
  if (caseRec) {
    await emitForensicAuditEvent(
      'forensic.ai_summary_approved', caseRec.workspace_id, actorId,
      `AI Summary Approved: ${caseRec.case_id}`,
      `AI case summary ${summaryId.substring(0, 8)} approved by ${actorId}.`,
      { object_type: 'forensic_case', object_id: caseRec.case_id },
      { field_changed: 'ai_summary_status', previous_value: 'draft', new_value: 'approved' },
      { permission_used: 'forensic.ai.approve' }
    );
  }

  const { data: updated } = await supabaseAdmin.from('case_ai_summaries').select('*').eq('id', summaryId).single();
  if (!updated) throw new Error('Summary not found after approval');
  return updated;
}

export async function rejectAiSummary(summaryId: string, reason: string): Promise<AiSummary> {
  await supabaseAdmin.from('case_ai_summaries').update({
    status: 'rejected', rejection_reason: reason,
  }).eq('id', summaryId);

  const { data: updated } = await supabaseAdmin.from('case_ai_summaries').select('*').eq('id', summaryId).single();
  if (!updated) throw new Error('Summary not found after rejection');
  return updated;
}

export async function listAiSummaries(caseId: string): Promise<AiSummary[]> {
  const { data, error } = await supabaseAdmin.from('case_ai_summaries')
    .select('*').eq('case_id', caseId).order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

// ─── Timeline Explanation ─────────────────────────────────────────────────────

export async function generateTimelineExplanation(caseId: string, actorId: string): Promise<string> {
  const timeline = await getEnhancedTimeline(caseId);
  if (timeline.length === 0) return 'No timeline events to explain.';

  const lines: string[] = [`Timeline Explanation for case ${caseId.substring(0, 8)}:`];
  lines.push(`${timeline.length} events total.`);

  const deterministic = timeline.filter(t => t.confidence === 'deterministic');
  const high = timeline.filter(t => t.confidence === 'high');
  const medium = timeline.filter(t => t.confidence === 'medium');

  lines.push(`\nConfidence breakdown: ${deterministic.length} deterministic, ${high.length} high, ${medium.length} medium.`);

  // Chronological gaps
  if (timeline.length > 1) {
    let gaps = 0;
    for (let i = 1; i < timeline.length; i++) {
      const diff = new Date(timeline[i].timestamp).getTime() - new Date(timeline[i - 1].timestamp).getTime();
      if (diff > 24 * 60 * 60 * 1000) { // > 24h gap
        gaps++;
        lines.push(`\n⚠ Gap detected: ${Math.round(diff / (24 * 60 * 60 * 1000))} day(s) between "${timeline[i - 1].label}" and "${timeline[i].label}"`);
      }
    }
    if (gaps === 0) lines.push('\nNo significant chronological gaps detected.');
  }

  // Actor activity
  const actorMap: Record<string, number> = {};
  for (const t of timeline) {
    actorMap[t.actor] = (actorMap[t.actor] || 0) + 1;
  }
  const topActors = Object.entries(actorMap).sort((a, b) => b[1] - a[1]).slice(0, 5);
  lines.push(`\nMost active actors: ${topActors.map(([a, c]) => `${a} (${c} events)`).join(', ')}`);

  // Pinned evidence events
  const pinned = timeline.filter(t => t.is_pinned);
  if (pinned.length > 0) lines.push(`\n📌 Pinned evidence events: ${pinned.length}`);

  return lines.join('\n');
}

// ─── Anomaly Detection ────────────────────────────────────────────────────────

export async function detectAnomalies(caseId: string, actorId: string): Promise<AnomalyResult[]> {
  const [evidence, actions, timeline] = await Promise.all([
    listEvidence(caseId), listActions(caseId), getEnhancedTimeline(caseId),
  ]);

  const results: AnomalyResult[] = [];
  const caseRec = await getCase(caseId);
  if (!caseRec) throw new Error('Case not found');

  // 1. Repeated actors
  const actorCount: Record<string, { count: number; actions: string[] }> = {};
  for (const a of actions) {
    if (!actorCount[a.actor_id]) actorCount[a.actor_id] = { count: 0, actions: [] };
    actorCount[a.actor_id].count++;
    actorCount[a.actor_id].actions.push(a.action_type);
  }
  for (const [actor, info] of Object.entries(actorCount)) {
    if (info.count >= 3) {
      const { data: existing } = await supabaseAdmin.from('case_anomalies')
        .select('id').eq('case_id', caseId).eq('anomaly_type', 'repeated_actor').eq('label', actor).maybeSingle();
      if (!existing) {
        const { data } = await supabaseAdmin.from('case_anomalies').insert({
          case_id: caseId, anomaly_type: 'repeated_actor', label: actor,
          description: `Actor ${actor} performed ${info.count} actions: ${info.actions.join(', ')}`,
          actors: [actor], severity: info.count >= 5 ? 'high' : 'medium', frequency: info.count,
        }).select().single();
        if (data) results.push(data);
      }
    }
  }

  // 2. Repeated evidence source types
  const sourceTypeCount: Record<string, number> = {};
  for (const e of evidence) {
    sourceTypeCount[e.source_type] = (sourceTypeCount[e.source_type] || 0) + 1;
  }
  for (const [sourceType, count] of Object.entries(sourceTypeCount)) {
    if (count >= 3) {
      const { data: existing } = await supabaseAdmin.from('case_anomalies')
        .select('id').eq('case_id', caseId).eq('anomaly_type', 'repeated_source').eq('label', sourceType).maybeSingle();
      if (!existing) {
        const { data } = await supabaseAdmin.from('case_anomalies').insert({
          case_id: caseId, anomaly_type: 'repeated_source', label: `${sourceType} (${count}x)`,
          description: `Source type "${sourceType}" appears ${count} times in evidence set.`,
          events: evidence.filter(e => e.source_type === sourceType).map(e => e.source_id),
          severity: 'medium', frequency: count,
        }).select().single();
        if (data) results.push(data);
      }
    }
  }

  // 3. High frequency of status changes (churn)
  const statusChanges = actions.filter(a => a.action_type === 'status_changed');
  if (statusChanges.length >= 3) {
    const { data: existing } = await supabaseAdmin.from('case_anomalies')
      .select('id').eq('case_id', caseId).eq('anomaly_type', 'status_churn').maybeSingle();
    if (!existing) {
      const { data } = await supabaseAdmin.from('case_anomalies').insert({
        case_id: caseId, anomaly_type: 'status_churn', label: `Status Churn (${statusChanges.length} changes)`,
        description: `Case status changed ${statusChanges.length} times, indicating potential instability.`,
        severity: statusChanges.length >= 5 ? 'high' : 'medium', frequency: statusChanges.length,
      }).select().single();
      if (data) results.push(data);
    }
  }

  // Emit anomaly event if findings
  if (results.length > 0) {
    await emitForensicAuditEvent(
      'forensic.anomaly_detected', caseRec.workspace_id, actorId,
      `Anomalies Detected: ${caseRec.case_id}`,
      `${results.length} anomaly patterns found in case data.`,
      { object_type: 'forensic_case', object_id: caseRec.case_id },
      { field_changed: 'anomalies_count', previous_value: 0, new_value: results.length },
      { permission_used: 'forensic.anomaly.detect' }
    );
  }

  return results;
}

export async function listAnomalies(caseId: string): Promise<AnomalyResult[]> {
  const { data, error } = await supabaseAdmin.from('case_anomalies')
    .select('*').eq('case_id', caseId).order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

// ─── Recommended Next Actions ─────────────────────────────────────────────────

export async function generateRecommendations(caseId: string, actorId: string): Promise<string[]> {
  const caseRec = await getCase(caseId);
  if (!caseRec) throw new Error('Case not found');

  const [evidence, tasks, actions, timeline] = await Promise.all([
    listEvidence(caseId), listTasks(caseId), listActions(caseId), getEnhancedTimeline(caseId),
  ]);

  const recommendations: string[] = [];

  // Based on status
  switch (caseRec.status) {
    case 'new':
      recommendations.push('Assign an investigator to begin triage.');
      recommendations.push('Confirm severity and set initial scope.');
      break;
    case 'triage':
      if (!caseRec.owner_user_id) recommendations.push('Assign an owner before proceeding to active investigation.');
      recommendations.push('Review source events and confirm evidence requirements.');
      break;
    case 'active_investigation':
      if (evidence.length === 0) recommendations.push('Add at least one evidence item from Audit Trail.');
      if (timeline.filter(t => t.confidence === 'deterministic').length === 0) recommendations.push('Add audit events for deterministic timeline correlation.');
      break;
    case 'awaiting_information':
      recommendations.push('Follow up on pending information request.');
      recommendations.push('Escalate if information is overdue beyond SLA.');
      break;
    case 'legal_review':
      recommendations.push('Complete legal privilege assessment.');
      recommendations.push('Determine if legal hold is required.');
      break;
    case 'legal_hold':
      recommendations.push('Verify all evidence items are preserved under hold.');
      recommendations.push('Prepare legal hold notification for affected parties.');
      break;
    case 'remediation':
      recommendations.push('Document remediation actions taken.');
      recommendations.push('Assign validation owner for closure preparation.');
      break;
    case 'validation':
      recommendations.push('Verify remediation evidence before closing.');
      recommendations.push('Prepare closure documentation with findings.');
      break;
    case 'escalated':
      recommendations.push('Schedule executive review of escalated case.');
      recommendations.push('Document escalation rationale and expected resolution timeline.');
      break;
  }

  // Evidence gaps
  if (caseRec.source === 'manual' && evidence.length === 0) {
    recommendations.push('This case was created manually — connect audit events or upload evidence.');
  }

  // Task completion
  const openTasks = tasks.filter(t => t.status !== 'completed');
  if (openTasks.length > 0) {
    recommendations.push(`${openTasks.length} open task(s) remain. Review and complete them before closure.`);
  }

  // SLA awareness
  if (caseRec.sla_due_at) {
    const slaDate = new Date(caseRec.sla_due_at);
    const isBreached = slaDate < new Date();
    if (isBreached) recommendations.push('⚠ SLA is breached — escalate immediately.');
    else {
      const hoursLeft = Math.round((slaDate.getTime() - Date.now()) / (1000 * 60 * 60));
      if (hoursLeft < 24) recommendations.push(`⚠ SLA due within ${hoursLeft} hour(s). Prioritize resolution.`);
    }
  }

  await emitForensicAuditEvent(
    'forensic.recommendations_generated', caseRec.workspace_id, actorId,
    `Recommendations Generated: ${caseRec.case_id}`,
    `${recommendations.length} recommendations generated for case.`,
    { object_type: 'forensic_case', object_id: caseRec.case_id },
    { field_changed: 'recommendations', previous_value: null, new_value: recommendations.length },
    { permission_used: 'forensic.recommendations.generate' }
  );

  return recommendations;
}

// ─── SIEM Routing ────────────────────────────────────────────────────────────

export async function routeToSiem(caseId: string, eventType: string, actorId: string): Promise<{ routed: number; subscriptions: number }> {
  const caseRec = await getCase(caseId);
  if (!caseRec) throw new Error('Case not found');

  const { data: subscriptions } = await supabaseAdmin
    .from('audit_subscriptions')
    .select('*')
    .eq('workspace_id', caseRec.workspace_id)
    .eq('subscription_type', 'siem')
    .eq('status', 'ACTIVE');

  if (!subscriptions || subscriptions.length === 0) {
    return { routed: 0, subscriptions: 0 };
  }

  const payload = {
    event_type: eventType,
    case_id: caseRec.case_id,
    case_title: caseRec.title,
    severity: caseRec.severity,
    status: caseRec.status,
    legal_hold: caseRec.legal_hold_active,
    sla_due_at: caseRec.sla_due_at,
    owner: caseRec.owner_user_id,
    workspace_id: caseRec.workspace_id,
    timestamp: new Date().toISOString(),
  };

  let routedCount = 0;
  for (const sub of subscriptions) {
    try {
      const eventPayload = {
        id: `forensic-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        source: 'forensic_hub',
        specversion: '1.0',
        type: eventType,
        subject: caseRec.case_id,
        time: new Date().toISOString(),
        data: payload,
      };

      await deliverToSubscription(sub.id, eventPayload);

      await supabaseAdmin.from('forensic_siem_routing').insert({
        case_id: caseId, subscription_id: sub.id, event_type: eventType,
        payload, status: 'delivered', delivered_at: new Date().toISOString(),
      });

      routedCount++;
    } catch (err: any) {
      await supabaseAdmin.from('forensic_siem_routing').insert({
        case_id: caseId, subscription_id: sub.id, event_type: eventType,
        payload, status: 'failed', error_message: err.message,
      });
    }
  }

  await emitForensicAuditEvent(
    'forensic.siem_routed', caseRec.workspace_id, actorId,
    `SIEM Routed: ${caseRec.case_id}`,
    `${routedCount}/${subscriptions.length} SIEM subscriptions received event.`,
    { object_type: 'forensic_case', object_id: caseRec.case_id },
    { field_changed: 'siem_routed', previous_value: null, new_value: routedCount },
    { permission_used: 'forensic.siem.route' }
  );

  return { routed: routedCount, subscriptions: subscriptions.length };
}

// ─── External Auditor Workspace ───────────────────────────────────────────────

export async function createAuditorSession(params: {
  case_id: string; export_id: string; auditor_id: string; workspace_id: string;
  expires_in_hours?: number;
}): Promise<any> {
  const token = `AUD-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 10)}`.toUpperCase();

  const { data, error } = await supabaseAdmin.from('auditor_sessions').insert({
    auditor_id: params.auditor_id, workspace_id: params.workspace_id,
    case_id: params.case_id, export_id: params.export_id,
    access_token: token,
    expires_at: new Date(Date.now() + (params.expires_in_hours || 72) * 60 * 60 * 1000).toISOString(),
  }).select().single();

  if (error) throw error;
  return data;
}

export async function verifyAuditorSession(token: string): Promise<any | null> {
  const { data } = await supabaseAdmin.from('auditor_sessions')
    .select('*, case:case_id(*), export:export_id(*)')
    .eq('access_token', token)
    .gte('expires_at', new Date().toISOString())
    .single();

  if (data) {
    await supabaseAdmin.from('auditor_sessions').update({
      last_accessed_at: new Date().toISOString(),
    }).eq('id', data.id);
  }

  return data;
}

export async function getSiemRoutingHistory(caseId: string): Promise<any[]> {
  const { data, error } = await supabaseAdmin.from('forensic_siem_routing')
    .select('*').eq('case_id', caseId).order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getExportNarrative(exportId: string): Promise<string> {
  const { data: exp } = await supabaseAdmin.from('case_exports').select('*').eq('id', exportId).single();
  if (!exp) throw new Error('Export not found');

  const caseRec = await getCase(exp.case_id);
  if (!caseRec) throw new Error('Case not found');

  const lines: string[] = [];
  lines.push(`EXPORT NARRATIVE — ${exp.package_type.replace(/_/g, ' ').toUpperCase()}`);
  lines.push(`Case: ${caseRec.title} (${caseRec.case_id})`);
  lines.push(`Type: ${caseRec.case_type} | Severity: ${caseRec.severity} | Status: ${caseRec.status}`);
  lines.push(`Format: ${exp.format} | Redaction: ${exp.redaction_profile}`);
  lines.push(`Generated: ${exp.generated_at || 'Pending'}`);
  lines.push(`\nSummary: ${caseRec.summary}`);

  if (exp.manifest) {
    lines.push(`\nManifest: ${caseRec.case_id}`);
    lines.push(`- Evidence items: ${exp.manifest.evidence_count || 0}`);
    lines.push(`- Timeline entries: ${exp.manifest.timeline_entries || 0}`);
    lines.push(`- Actions logged: ${exp.manifest.action_count || 0}`);
    if (exp.manifest.evidence_hashes?.length > 0) {
      lines.push(`- Evidence hashes: ${exp.manifest.evidence_hashes.length} entries`);
    }
    if (exp.manifest.legal_hold_active) {
      lines.push(`- Legal Hold: ACTIVE at time of export`);
    }
  }

  if (caseRec.closure) {
    lines.push(`\nClosure: ${caseRec.closure.outcome}`);
    lines.push(`Rationale: ${caseRec.closure.rationale}`);
  }

  return lines.join('\n');
}
