/* eslint-disable @typescript-eslint/no-explicit-any */
import { internalEventBus } from '../shared/internalEventBus';
import { logger } from '../shared/logger';
import { createAuditEvent } from './auditTrail.service';
import { supabaseAdmin } from '../shared/supabase';

export function registerEventBridge(): void {
  // ─── Identity Ledger Events ────────────────────────────────────────────────
  internalEventBus.on('identity.authority_changed', async (payload: unknown) => {
    const { workspace_id, actor_id, tenant_id, entry_id, change_type } = payload as any;
    try {
      await createAuditEvent({
        workspace_id,
        org_id: tenant_id,
        event_category: 'user_identity',
        event_type: `identity.${change_type}`,
        event_summary: `Identity ledger entry: ${change_type}`,
        actor: { actor_id, actor_type: 'human_user' },
        object: { object_type: 'identity_ledger_entry', object_id: entry_id },
      });
    } catch (err) {
      logger.error({ err }, '[EventBridge] identity.authority_changed audit failed');
    }
  });

  // ─── Evidence Vault Events ─────────────────────────────────────────────────
  internalEventBus.on('vault.item_preserved', async (payload: unknown) => {
    const { workspace_id, tenant_id, actor_id, item_id, source_type } = payload as any;
    try {
      await createAuditEvent({
        workspace_id,
        org_id: tenant_id,
        event_category: 'evidence_legal',
        event_type: 'evidence.item_preserved',
        event_summary: `Evidence item ${item_id} preserved from ${source_type}`,
        actor: { actor_id, actor_type: 'human_user' },
        object: { object_type: 'evidence_item', object_id: item_id },
      });
    } catch (err) {
      logger.error({ err }, '[EventBridge] vault.item_preserved audit failed');
    }
  });

  internalEventBus.on('vault.hold_applied', async (payload: unknown) => {
    const { workspace_id, tenant_id, actor_id, hold_id } = payload as any;
    try {
      await createAuditEvent({
        workspace_id,
        org_id: tenant_id,
        event_category: 'evidence_legal',
        event_type: 'evidence.legal_hold_applied',
        event_summary: `Legal hold ${hold_id} applied`,
        actor: { actor_id, actor_type: 'human_user' },
        object: { object_type: 'legal_hold', object_id: hold_id },
      });
    } catch (err) {
      logger.error({ err }, '[EventBridge] vault.hold_applied audit failed');
    }
  });

  // ─── Knowledge Events ──────────────────────────────────────────────────────
  internalEventBus.on('knowledge.created', async (payload: unknown) => {
    const { source_id, collection_id, created_by } = payload as any;
    try {
      await createAuditEvent({
        workspace_id: collection_id || 'unknown',
        event_category: 'knowledge',
        event_type: 'knowledge.created',
        event_summary: `Knowledge source ${source_id} created`,
        actor: { actor_id: created_by || 'system', actor_type: 'human_user' },
        object: { object_type: 'knowledge_source', object_id: source_id },
      });
    } catch (err) {
      logger.error({ err }, '[EventBridge] knowledge.created audit failed');
    }
  });

  internalEventBus.on('knowledge.processed', async (payload: unknown) => {
    const { source_id, status, chunk_count, claim_count, auto_approved } = payload as any;
    try {
      await createAuditEvent({
        workspace_id: 'system',
        event_category: 'knowledge',
        event_type: 'knowledge.processed',
        event_summary: `Knowledge source ${source_id} processed: ${status}, ${chunk_count} chunks, ${claim_count} claims`,
        actor: { actor_id: 'system', actor_type: 'system' },
        object: { object_type: 'knowledge_source', object_id: source_id },
      });
      logger.info({ source_id, status, auto_approved }, 'Knowledge source processed');
    } catch (err) {
      logger.error({ err }, '[EventBridge] knowledge.processed audit failed');
    }
  });

  internalEventBus.on('knowledge.status_changed', async (payload: unknown) => {
    const { source_id, previous_status, new_status } = payload as any;
    try {
      await createAuditEvent({
        workspace_id: 'system',
        event_category: 'knowledge',
        event_type: `knowledge.status_${new_status}`,
        event_summary: `Knowledge source ${source_id}: ${previous_status} → ${new_status}`,
        actor: { actor_id: 'system', actor_type: 'system' },
        object: { object_type: 'knowledge_source', object_id: source_id },
      });
    } catch (err) {
      logger.error({ err }, '[EventBridge] knowledge.status_changed audit failed');
    }
  });

  internalEventBus.on('knowledge.retrieved', async (payload: unknown) => {
    const { retrieval_event_id, agent_id, query, returned_chunks, reason_codes, latency_ms, missing_knowledge, conflicts_found } = payload as any;
    try {
      await createAuditEvent({
        workspace_id: 'system',
        event_category: 'knowledge',
        event_type: 'knowledge.retrieved',
        event_summary: `Retrieval: "${query?.slice(0, 100)}" → ${returned_chunks} chunks, ${latency_ms}ms`,
        actor: { actor_id: agent_id || 'unknown', actor_type: 'ai_agent' },
        object: { object_type: 'retrieval_event', object_id: retrieval_event_id },
        metadata: { reason_codes, missing_knowledge, conflicts_found } as any,
      });
    } catch (err) {
      logger.error({ err }, '[EventBridge] knowledge.retrieved audit failed');
    }
  });

  internalEventBus.on('knowledge.cited', async (payload: unknown) => {
    const { source_id, chunk_id, output_id, agent_id } = payload as any;
    try {
      await createAuditEvent({
        workspace_id: 'system',
        event_category: 'knowledge',
        event_type: 'knowledge.cited',
        event_summary: `Source ${source_id} cited in output ${output_id}`,
        actor: { actor_id: agent_id || 'unknown', actor_type: 'ai_agent' },
        object: { object_type: 'knowledge_source', object_id: source_id },
        metadata: { chunk_id, output_id } as any,
      });
    } catch (err) {
      logger.error({ err }, '[EventBridge] knowledge.cited audit failed');
    }
  });

  internalEventBus.on('knowledge.conflict_detected', async (payload: unknown) => {
    const { conflict_id, source_ids, severity, summary } = payload as any;
    try {
      await createAuditEvent({
        workspace_id: 'system',
        event_category: 'knowledge',
        event_type: 'knowledge.conflict_detected',
        event_summary: `Conflict ${conflict_id}: ${summary?.slice(0, 200)}`,
        actor: { actor_id: 'system', actor_type: 'system' },
        object: { object_type: 'knowledge_conflict', object_id: conflict_id },
        metadata: { source_ids, severity } as any,
      });
      logger.warn({ conflict_id, source_ids, severity }, 'Knowledge conflict detected');
    } catch (err) {
      logger.error({ err }, '[EventBridge] knowledge.conflict_detected audit failed');
    }
  });

  internalEventBus.on('knowledge.source_expired', async (payload: unknown) => {
    const { workspace_id, source_id, collection_id, title } = payload as any;
    try {
      await createAuditEvent({
        workspace_id: workspace_id || 'unknown',
        event_category: 'knowledge',
        event_type: 'knowledge.source_expired',
        event_summary: `Source "${title}" (${source_id}) expired`,
        actor: { actor_id: 'system', actor_type: 'system' },
        object: { object_type: 'knowledge_source', object_id: source_id },
      });
    } catch (err) {
      logger.error({ err }, '[EventBridge] knowledge.source_expired audit failed');
    }
  });

  internalEventBus.on('knowledge.missing_escalated', async (payload: unknown) => {
    const { agent_id, query, collection_ids } = payload as any;
    try {
      await createAuditEvent({
        workspace_id: 'system',
        event_category: 'knowledge',
        event_type: 'knowledge.missing_escalated',
        event_summary: `Missing knowledge escalated: agent ${agent_id} queried "${query?.slice(0, 100)}"`,
        actor: { actor_id: agent_id || 'unknown', actor_type: 'ai_agent' },
        object: { object_type: 'query', object_id: query?.slice(0, 64) },
        metadata: { query, collection_ids } as any,
      });
    } catch (err) {
      logger.error({ err }, '[EventBridge] knowledge.missing_escalated audit failed');
    }
  });

  internalEventBus.on('knowledge.conflict_escalated', async (payload: unknown) => {
    const { agent_id, query, conflicting_source_ids } = payload as any;
    try {
      await createAuditEvent({
        workspace_id: 'system',
        event_category: 'knowledge',
        event_type: 'knowledge.conflict_escalated',
        event_summary: `Conflict escalated: agent ${agent_id}, ${conflicting_source_ids?.length} conflicting sources`,
        actor: { actor_id: agent_id || 'unknown', actor_type: 'ai_agent' },
        object: { object_type: 'conflict', object_id: query?.slice(0, 64) || 'unknown' },
        metadata: { query, conflicting_source_ids } as any,
      });
    } catch (err) {
      logger.error({ err }, '[EventBridge] knowledge.conflict_escalated audit failed');
    }
  });

  internalEventBus.on('knowledge.collection_created', async (payload: unknown) => {
    const { collection_id, workspace_id, name, created_by } = payload as any;
    try {
      await createAuditEvent({
        workspace_id: workspace_id || 'unknown',
        event_category: 'knowledge',
        event_type: 'knowledge.collection_created',
        event_summary: `Collection "${name}" (${collection_id}) created`,
        actor: { actor_id: created_by || 'system', actor_type: 'human_user' },
        object: { object_type: 'knowledge_collection', object_id: collection_id },
      });
    } catch (err) {
      logger.error({ err }, '[EventBridge] knowledge.collection_created audit failed');
    }
  });

  internalEventBus.on('knowledge.collection_approved', async (payload: unknown) => {
    const { collection_id, approved_by } = payload as any;
    try {
      await createAuditEvent({
        workspace_id: 'system',
        event_category: 'knowledge',
        event_type: 'knowledge.collection_approved',
        event_summary: `Collection ${collection_id} approved`,
        actor: { actor_id: approved_by || 'system', actor_type: 'human_user' },
        object: { object_type: 'knowledge_collection', object_id: collection_id },
      });
    } catch (err) {
      logger.error({ err }, '[EventBridge] knowledge.collection_approved audit failed');
    }
  });

  internalEventBus.on('knowledge.collection_status_changed', async (payload: unknown) => {
    const { collection_id, previous_status, new_status } = payload as any;
    try {
      await createAuditEvent({
        workspace_id: 'system',
        event_category: 'knowledge',
        event_type: `knowledge.collection_${new_status}`,
        event_summary: `Collection ${collection_id}: ${previous_status} → ${new_status}`,
        actor: { actor_id: 'system', actor_type: 'system' },
        object: { object_type: 'knowledge_collection', object_id: collection_id },
      });
    } catch (err) {
      logger.error({ err }, '[EventBridge] knowledge.collection_status_changed audit failed');
    }
  });

  internalEventBus.on('knowledge.evidence_bundle_created', async (payload: unknown) => {
    const { source_id, chunk_count, claim_count, version, workspace_id } = payload as any;
    try {
      await createAuditEvent({
        workspace_id: workspace_id || 'unknown',
        event_category: 'knowledge',
        event_type: 'knowledge.evidence_bundle_created',
        event_summary: `Evidence bundle for ${source_id} v${version}: ${chunk_count} chunks, ${claim_count} claims`,
        actor: { actor_id: 'system', actor_type: 'system' },
        object: { object_type: 'knowledge_source', object_id: source_id },
      });
    } catch (err) {
      logger.error({ err }, '[EventBridge] knowledge.evidence_bundle_created audit failed');
    }
  });

  internalEventBus.on('knowledge.connector_ingested', async (payload: unknown) => {
    const { workspace_id, collection_id, connector_type, imported, failed } = payload as any;
    try {
      await createAuditEvent({
        workspace_id: workspace_id || 'unknown',
        event_category: 'knowledge',
        event_type: 'knowledge.connector_ingested',
        event_summary: `Connector ${connector_type} ingested ${imported} sources (${failed} failed)`,
        actor: { actor_id: 'system', actor_type: 'system' },
        object: { object_type: 'connector', object_id: collection_id || 'unknown' },
        metadata: { connector_type, imported, failed } as any,
      });
    } catch (err) {
      logger.error({ err }, '[EventBridge] knowledge.connector_ingested audit failed');
    }
  });

  internalEventBus.on('knowledge.notification_sent', async (payload: unknown) => {
    const { workspace_id, notification_id, notification_type, severity, source_id, title } = payload as any;
    try {
      await createAuditEvent({
        workspace_id: workspace_id || 'unknown',
        event_category: 'knowledge',
        event_type: 'knowledge.notification_sent',
        event_summary: `Notification "${notification_type}": ${title?.slice(0, 100)}`,
        actor: { actor_id: 'system', actor_type: 'system' },
        object: { object_type: 'notification', object_id: notification_id || 'unknown' },
        metadata: { notification_type, severity, source_id } as any,
      });
    } catch (err) {
      logger.error({ err }, '[EventBridge] knowledge.notification_sent audit failed');
    }
  });

  internalEventBus.on('knowledge.approved', async (payload: unknown) => {
    const { source_id, reviewer_id, workspace_id, evidence_id } = payload as any;
    try {
      await createAuditEvent({
        workspace_id: workspace_id || 'system',
        event_category: 'knowledge',
        event_type: 'knowledge.approved',
        event_summary: `Knowledge source ${source_id} approved by ${reviewer_id}`,
        actor: { actor_id: reviewer_id || 'system', actor_type: 'human_user' },
        object: { object_type: 'knowledge_source', object_id: source_id },
        metadata: { evidence_id } as any,
      });
    } catch (err) {
      logger.error({ err }, '[EventBridge] knowledge.approved audit failed');
    }
  });

  internalEventBus.on('knowledge.published', async (payload: unknown) => {
    const { source_id, workspace_id, activated_by } = payload as any;
    try {
      await createAuditEvent({
        workspace_id: workspace_id || 'system',
        event_category: 'knowledge',
        event_type: 'knowledge.published',
        event_summary: `Knowledge source ${source_id} activated for runtime retrieval`,
        actor: { actor_id: activated_by || 'system', actor_type: 'human_user' },
        object: { object_type: 'knowledge_source', object_id: source_id },
      });
    } catch (err) {
      logger.error({ err }, '[EventBridge] knowledge.published audit failed');
    }
  });

  internalEventBus.on('knowledge.retired', async (payload: unknown) => {
    const { source_id, workspace_id, reason } = payload as any;
    try {
      await createAuditEvent({
        workspace_id: workspace_id || 'system',
        event_category: 'knowledge',
        event_type: 'knowledge.retired',
        event_summary: `Knowledge source ${source_id} retired: ${reason || 'no reason'}`,
        actor: { actor_id: 'system', actor_type: 'system' },
        object: { object_type: 'knowledge_source', object_id: source_id },
        metadata: { reason } as any,
      });
    } catch (err) {
      logger.error({ err }, '[EventBridge] knowledge.retired audit failed');
    }
  });

  internalEventBus.on('knowledge.quarantined', async (payload: unknown) => {
    const { source_id, reason } = payload as any;
    try {
      await createAuditEvent({
        workspace_id: 'system',
        event_category: 'knowledge',
        event_type: 'knowledge.quarantined',
        event_summary: `Source ${source_id} quarantined: ${reason?.join(', ') || 'no reason'}`,
        actor: { actor_id: 'system', actor_type: 'system' },
        object: { object_type: 'knowledge_source', object_id: source_id },
        metadata: { reason } as any,
      });
    } catch (err) {
      logger.error({ err }, '[EventBridge] knowledge.quarantined audit failed');
    }
  });

  internalEventBus.on('knowledge.exported', async (payload: unknown) => {
    const { workspace_id, exported_by, source_ids, format, count, exported_at } = payload as any;
    try {
      await createAuditEvent({
        workspace_id: workspace_id || 'system',
        event_category: 'knowledge',
        event_type: 'knowledge.exported',
        event_summary: `Exported ${count} source(s) in ${format} format`,
        actor: { actor_id: exported_by || 'system', actor_type: 'human_user' },
        object: { object_type: 'export', object_id: `export-${exported_at}` },
        metadata: { source_ids, format, count } as any,
      });
    } catch (err) {
      logger.error({ err }, '[EventBridge] knowledge.exported audit failed');
    }
  });

  internalEventBus.on('knowledge.changed', async (payload: unknown) => {
    const { source_id, changed_fields, previous_values, new_values, user_id, version } = payload as any;
    try {
      await createAuditEvent({
        workspace_id: 'system',
        event_category: 'knowledge',
        event_type: 'knowledge.changed',
        event_summary: `Source ${source_id} changed v${version}: ${changed_fields?.join(', ') || 'unknown fields'}`,
        actor: { actor_id: user_id || 'system', actor_type: 'human_user' },
        object: { object_type: 'knowledge_source', object_id: source_id },
        change: {
          field_changed: changed_fields?.join(', '),
          previous_value: previous_values,
          new_value: new_values,
        },
      });
    } catch (err) {
      logger.error({ err }, '[EventBridge] knowledge.changed audit failed');
    }
  });

  // ─── Forensic Hub Events ───────────────────────────────────────────────────
  internalEventBus.on('forensic.case_created', async (payload: unknown) => {
    const { workspace_id, tenant_id, actor_id, case_id, title } = payload as any;
    try {
      await createAuditEvent({
        workspace_id,
        org_id: tenant_id,
        event_category: 'evidence_legal',
        event_type: 'forensic.case_created',
        event_summary: `Forensic case created: ${title}`,
        actor: { actor_id, actor_type: 'human_user' },
        object: { object_type: 'forensic_case', object_id: case_id },
      });
    } catch (err) {
      logger.error({ err }, '[EventBridge] forensic.case_created audit failed');
    }
  });

  internalEventBus.on('forensic.case_closed', async (payload: unknown) => {
    const { workspace_id, actor_id, case_id } = payload as any;
    try {
      await createAuditEvent({
        workspace_id,
        event_category: 'evidence_legal',
        event_type: 'forensic.case_closed',
        event_summary: `Forensic case ${case_id} closed`,
        actor: { actor_id, actor_type: 'human_user' },
        object: { object_type: 'forensic_case', object_id: case_id },
      });
    } catch (err) {
      logger.error({ err }, '[EventBridge] forensic.case_closed audit failed');
    }
  });

  // ─── Review Queue Events ───────────────────────────────────────────────────
  internalEventBus.on('review.decision_made', async (payload: unknown) => {
    const { workspace_id, tenant_id, actor_id, item_id, decision } = payload as any;
    try {
      await createAuditEvent({
        workspace_id,
        org_id: tenant_id,
        event_category: 'approval',
        event_type: 'review.decision_made',
        event_summary: `Review item ${item_id}: ${decision}`,
        actor: { actor_id, actor_type: 'human_user' },
        object: { object_type: 'review_item', object_id: item_id },
      });
    } catch (err) {
      logger.error({ err }, '[EventBridge] review.decision_made audit failed');
    }
  });

  // ─── Approval Events ───────────────────────────────────────────────────────
  internalEventBus.on('approval.decision_made', async (payload: unknown) => {
    const { workspace_id, tenant_id, actor_id, item_id, decision } = payload as any;
    try {
      await createAuditEvent({
        workspace_id,
        org_id: tenant_id,
        event_category: 'approval',
        event_type: `approval.${decision}`,
        event_summary: `Approval item ${item_id}: ${decision}`,
        actor: { actor_id, actor_type: 'human_user' },
        object: { object_type: 'approval_item', object_id: item_id },
      });
    } catch (err) {
      logger.error({ err }, '[EventBridge] approval.decision_made audit failed');
    }
  });

  // ─── Validation Desk Events ────────────────────────────────────────────────
  internalEventBus.on('validation.status_changed', async (payload: unknown) => {
    const { workspace_id, tenant_id, actor_id, item_id, status } = payload as any;
    try {
      await createAuditEvent({
        workspace_id,
        org_id: tenant_id,
        event_category: 'approval',
        event_type: `validation.${status}`,
        event_summary: `Validation item ${item_id}: ${status}`,
        actor: { actor_id, actor_type: 'human_user' },
        object: { object_type: 'validation_item', object_id: item_id },
      });
    } catch (err) {
      logger.error({ err }, '[EventBridge] validation.status_changed audit failed');
    }
  });

  // ─── Quality Audit Events ──────────────────────────────────────────────────
  internalEventBus.on('quality.audit_completed', async (payload: unknown) => {
    const { workspace_id, tenant_id, actor_id, audit_item_id, result } = payload as any;
    try {
      await createAuditEvent({
        workspace_id,
        org_id: tenant_id,
        event_category: 'approval',
        event_type: `quality.${result}`,
        event_summary: `Quality audit ${audit_item_id}: ${result}`,
        actor: { actor_id, actor_type: 'human_user' },
        object: { object_type: 'quality_audit_item', object_id: audit_item_id },
      });
    } catch (err) {
      logger.error({ err }, '[EventBridge] quality.audit_completed audit failed');
    }
  });

  // ─── Approval Rules Events ─────────────────────────────────────────────────
  internalEventBus.on('approval_rules.conflict_detected', async (payload: unknown) => {
    const { workspace_id, tenant_id, actor_id, rule_id, conflict_count } = payload as any;
    try {
      await createAuditEvent({
        workspace_id,
        org_id: tenant_id,
        event_category: 'approval',
        event_type: 'approval_rule.conflict_detected',
        event_summary: `Rule ${rule_id}: ${conflict_count} conflict(s) detected`,
        actor: { actor_id, actor_type: 'human_user' },
        object: { object_type: 'approval_rule', object_id: rule_id },
      });
    } catch (err) {
      logger.error({ err }, '[EventBridge] approval_rules.conflict_detected audit failed');
    }
  });

  // ─── Exception Events ──────────────────────────────────────────────────────
  internalEventBus.on('exception.case_created', async (payload: unknown) => {
    const { workspace_id, tenant_id, actor_id, exception_id } = payload as any;
    try {
      await createAuditEvent({
        workspace_id,
        org_id: tenant_id,
        event_category: 'approval',
        event_type: 'exception.case_created',
        event_summary: `Exception case ${exception_id} created`,
        actor: { actor_id, actor_type: 'human_user' },
        object: { object_type: 'exception_case', object_id: exception_id },
      });
    } catch (err) {
      logger.error({ err }, '[EventBridge] exception.case_created audit failed');
    }
  });

  // ─── Gov Evidence Events ───────────────────────────────────────────────────
  internalEventBus.on('gov_evidence.hold_applied', async (payload: unknown) => {
    const { workspace_id, actor_id, hold_id, object_id } = payload as any;
    try {
      await createAuditEvent({
        workspace_id,
        event_category: 'evidence_legal',
        event_type: 'evidence.legal_hold_applied',
        event_summary: `Legal hold ${hold_id} applied to ${object_id}`,
        actor: { actor_id, actor_type: 'human_user' },
        object: { object_type: 'legal_hold', object_id: hold_id },
      });
    } catch (err) {
      logger.error({ err }, '[EventBridge] gov_evidence.hold_applied audit failed');
    }
  });

  // ─── Cross-Module Routing ──────────────────────────────────────────────────
  internalEventBus.on('exception.sent_to_validation', async (payload: unknown) => {
    const { exception_id } = payload as any;
    try {
      logger.info(`[EventBridge] Exception ${exception_id} routed to Validation Desk`);
    } catch (err) {
      logger.error({ err }, '[EventBridge] exception.sent_to_validation failed');
    }
  });

  internalEventBus.on('exception.sent_to_approvals', async (payload: unknown) => {
    const { exception_id } = payload as any;
    try {
      logger.info(`[EventBridge] Exception ${exception_id} routed to Approvals`);
    } catch (err) {
      logger.error({ err }, '[EventBridge] exception.sent_to_approvals failed');
    }
  });

  internalEventBus.on('exception.sent_to_quality_audit', async (payload: unknown) => {
    const { exception_id } = payload as any;
    try {
      logger.info(`[EventBridge] Exception ${exception_id} routed to Quality Audit`);
    } catch (err) {
      logger.error({ err }, '[EventBridge] exception.sent_to_quality_audit failed');
    }
  });

  logger.info('[EventBridge] All event listeners registered (including Knowledge)');
}
