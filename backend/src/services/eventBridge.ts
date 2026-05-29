/* eslint-disable @typescript-eslint/no-explicit-any */
import { internalEventBus } from '../shared/internalEventBus';
import { logger } from '../shared/logger';
import { createAuditEvent } from './auditTrail.service';

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

  // Exception sent to Validation → create an audit event
  internalEventBus.on('exception.sent_to_validation', async (payload: unknown) => {
    const { exception_id } = payload as any;
    try {
      logger.info(`[EventBridge] Exception ${exception_id} routed to Validation Desk`);
    } catch (err) {
      logger.error({ err }, '[EventBridge] exception.sent_to_validation failed');
    }
  });

  // Exception sent to Approvals
  internalEventBus.on('exception.sent_to_approvals', async (payload: unknown) => {
    const { exception_id } = payload as any;
    try {
      logger.info(`[EventBridge] Exception ${exception_id} routed to Approvals`);
    } catch (err) {
      logger.error({ err }, '[EventBridge] exception.sent_to_approvals failed');
    }
  });

  // Exception sent to Quality Audit
  internalEventBus.on('exception.sent_to_quality_audit', async (payload: unknown) => {
    const { exception_id } = payload as any;
    try {
      logger.info(`[EventBridge] Exception ${exception_id} routed to Quality Audit`);
    } catch (err) {
      logger.error({ err }, '[EventBridge] exception.sent_to_quality_audit failed');
    }
  });

  logger.info('[EventBridge] All cross-module event listeners registered');
}
