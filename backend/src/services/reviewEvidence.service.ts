/**
 * reviewEvidence.service.ts
 *
 * Wires every review-queue action into the evidence vault:
 *   - Preserve: immutable snapshot of the action + item state
 *   - Collect:  group all evidence per review item in one collection
 *   - Package:  formal governance package (draft → sealed)
 *   - Hold:     legal hold while case is open, released on terminal actions
 *   - Anchor:   chain anchor for critical / terminal decisions
 *   - DLP:      scan for content violations on reject / escalate
 *   - Export:   internal export record on terminal actions
 *
 * All calls are non-throwing — callers wrap in try/catch so evidence never
 * blocks the review action itself.
 */

import { supabaseAdmin } from '../shared/supabase';
import * as evs from './evidenceVault.service';
import { logger } from '../shared/logger';

// ─── Finders ─────────────────────────────────────────────────────────────────

/** Find the evidence collection previously created for a review item. */
async function findCollection(reviewItemId: string, tenantId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from('vault_evidence_collections')
    .select('id')
    .eq('tenant_id', tenantId)
    .filter('scope', 'cs', JSON.stringify({ review_item_id: reviewItemId }))
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}

/** Find the most recent package linked to a collection. */
async function findPackage(collectionId: string, tenantId: string): Promise<{ id: string; status: string } | null> {
  const { data } = await supabaseAdmin
    .from('vault_packages')
    .select('id, status')
    .eq('tenant_id', tenantId)
    .eq('source_collection_id', collectionId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ?? null;
}

/** Find the active (unreleased) hold on a package. */
async function findActiveHold(packageId: string, tenantId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from('vault_holds')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('scope_id', packageId)
    .eq('released', false)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}

// ─── Core: preserve + link ────────────────────────────────────────────────────

interface PreserveAndLinkParams {
  item: any;
  action: string;
  evidence_type: string;
  sensitivity?: string;
  risk_level?: string;
  retention_class?: string;
  extra_metadata?: Record<string, unknown>;
  tenantId: string;
  workspaceId: string;
  userId: string;
  reason?: string;
  note?: string;
  auth: any;
}

/**
 * Preserve a snapshot of the action + item state, then add it to the
 * item's evidence collection (creating the collection if this is the first event).
 */
async function preserveAndLink(p: PreserveAndLinkParams): Promise<{ preserved_id: string; collection_id: string }> {
  const now = new Date().toISOString();
  const payload = JSON.stringify({
    review_item: {
      id: p.item.id,
      title: p.item.title,
      item_type: p.item.item_type,
      submitted_by: p.item.submitted_by,
      risk_level: p.item.risk_level,
      status_before: p.item.status,
      content_snapshot: p.item.content_snapshot ?? null,
      source_module: p.item.source_module ?? null,
      source_entity_id: p.item.source_entity_id ?? null,
    },
    action: {
      type: p.action,
      performed_by: p.userId,
      performed_at: now,
      reason: p.reason ?? null,
      note: p.note ?? null,
    },
    ...(p.extra_metadata ?? {}),
  });

  const preserved = await evs.preserveEvidence({
    source_type: 'social_payload',
    source_id: p.item.id,
    source_system: 'review-queue',
    source_timestamp_utc: now,
    evidence_type: p.evidence_type,
    risk_level: p.risk_level ?? p.item.risk_level ?? 'medium',
    sensitivity: p.sensitivity ?? 'confidential',
    contains_pii: false,
    contains_ai_output: !!(p.item as any).contains_ai_output,
    jurisdictions: ['internal'],
    payload,
    payload_size: Buffer.byteLength(payload, 'utf8'),
    mime_type: 'application/json',
    retention_class: p.retention_class ?? 'extended',
    preserved_by: p.userId,
    authority: `${p.action}_action`,
    preservation_reason:
      `"${p.item.title}" — ${p.action.replace(/_/g, ' ')}` +
      (p.reason ? `. Reason: ${p.reason}` : '') +
      (p.note ? `. Note: ${p.note}` : ''),
    workspace_id: p.workspaceId,
    tenant_id: p.tenantId,
    metadata: {
      review_item_id: p.item.id,
      review_item_title: p.item.title,
      item_type: p.item.item_type,
      action: p.action,
      performed_by: p.userId,
      submitted_by: p.item.submitted_by,
      risk_level: p.item.risk_level,
      content_urls: p.item.content_snapshot?.urls ?? null,
      file_type: p.item.content_snapshot?.file_type ?? null,
      reason: p.reason ?? null,
      note: p.note ?? null,
      auto_generated: true,
      source: `review_queue.${p.action}`,
      ...(p.extra_metadata ?? {}),
    },
  }, p.auth);

  // Find or create the collection for this review item
  let collectionId = await findCollection(p.item.id, p.tenantId);
  if (!collectionId) {
    const coll = await evs.createCollection({
      workspace_id: p.workspaceId,
      tenant_id: p.tenantId,
      title: `Review Evidence: ${p.item.title}`,
      description: `All evidence snapshots for review item "${p.item.title}" (${p.item.id})`,
      created_by: p.userId,
      created_reason: `Auto-created for review item ${p.item.id} on first action`,
      scope: {
        review_item_id: p.item.id,
        item_type: p.item.item_type,
        submitted_by: p.item.submitted_by,
      },
    }, p.auth);
    collectionId = coll.id;
  }

  await evs.addItemsToCollection(
    collectionId, [preserved.id], p.userId,
    `${p.action} evidence for review item ${p.item.id}`,
    p.auth,
  );

  return { preserved_id: preserved.id, collection_id: collectionId };
}

// ─── Base param type shared by all handlers ───────────────────────────────────

export interface ReviewEvidenceParams {
  item: any;
  tenantId: string;
  workspaceId: string;
  userId: string;
  reason?: string;
  note?: string;
  auth: any;
}

// ─── APPROVE: preserve → seal package → release hold → export → chain anchor ──

export async function recordApprove(p: ReviewEvidenceParams): Promise<void> {
  const { preserved_id, collection_id } = await preserveAndLink({
    ...p,
    action: 'approve',
    evidence_type: 'media_approval',
    sensitivity: 'confidential',
    retention_class: 'standard',
  });

  const pkg = await findPackage(collection_id, p.tenantId);
  if (!pkg) return; // no open case — lightweight approval, nothing to seal

  if (pkg.status !== 'sealed') {
    await evs.sealPackage(pkg.id, p.userId, p.auth);
  }

  const holdId = await findActiveHold(pkg.id, p.tenantId);
  if (holdId) {
    await evs.releaseHold(
      holdId, p.userId,
      `Review item "${p.item.title}" approved — case closed`,
      p.userId, p.auth,
    );
  }

  // Export record for approved content
  await evs.createExport({
    package_id: pkg.id,
    workspace_id: p.workspaceId,
    tenant_id: p.tenantId,
    requester_id: p.userId,
    disclosure_mode: 'internal_full',
    requester_reason: `Approval record for "${p.item.title}"`,
    delivery_method: 'internal',
  }, p.auth);

  // Chain anchor — tamper-evident proof of approval
  await evs.createChainAnchor({
    package_id: pkg.id,
    item_id: preserved_id,
    workspace_id: p.workspaceId,
    tenant_id: p.tenantId,
    anchor_provider: 'review-queue',
    anchor_data: {
      action: 'approve',
      review_item_id: p.item.id,
      approved_by: p.userId,
      item_title: p.item.title,
    },
    created_by: p.userId,
  }, p.auth);
}

// ─── REJECT: preserve → create package → seal → hold → DLP → chain anchor ────

export async function recordReject(p: ReviewEvidenceParams): Promise<void> {
  const { preserved_id, collection_id } = await preserveAndLink({
    ...p,
    action: 'reject',
    evidence_type: 'media_rejection',
    sensitivity: 'confidential',
    retention_class: 'extended',
  });

  // Always create a fresh package for rejections (case closed immediately)
  const existingPkg = await findPackage(collection_id, p.tenantId);
  let packageId = existingPkg?.id;

  if (!packageId || existingPkg?.status === 'sealed') {
    const pkg = await evs.createPackage({
      workspace_id: p.workspaceId,
      tenant_id: p.tenantId,
      package_type: 'security_incident',
      title: `Rejection: ${p.item.title}`,
      description: `Content rejected — "${p.item.title}". Reason: ${p.reason ?? 'Not specified'}`,
      source_collection_id: collection_id,
      item_ids: [preserved_id],
      created_by: p.userId,
      metadata: {
        review_item_id: p.item.id,
        rejected_by: p.userId,
        rejection_reason: p.reason ?? null,
        item_type: p.item.item_type,
      },
    }, p.auth);
    packageId = pkg.id;
  }

  // Seal immediately — rejection is a terminal state
  await evs.sealPackage(packageId, p.userId, p.auth);

  // Compliance hold on rejected content evidence (1-year review cycle)
  const now = new Date().toISOString();
  const reviewDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
  await evs.applyHold({
    workspace_id: p.workspaceId,
    tenant_id: p.tenantId,
    scope_type: 'package',
    scope_id: packageId,
    matter_ref: `REJECT-${p.item.id}`,
    jurisdiction: 'internal',
    reason: `Rejected content evidence hold — "${p.item.title}". Compliance retention.`,
    requester_id: p.userId,
    effective_date: now,
    review_date: reviewDate,
  }, p.auth);

  // DLP scan — check for policy violations in rejected content
  await evs.runDlpScan(packageId, p.userId, p.auth);

  // Chain anchor — tamper-evident proof of rejection
  await evs.createChainAnchor({
    package_id: packageId,
    item_id: preserved_id,
    workspace_id: p.workspaceId,
    tenant_id: p.tenantId,
    anchor_provider: 'review-queue',
    anchor_data: {
      action: 'reject',
      review_item_id: p.item.id,
      rejected_by: p.userId,
      rejection_reason: p.reason ?? null,
      item_title: p.item.title,
    },
    created_by: p.userId,
  }, p.auth);
}

// ─── REQUEST REVISION (RETURN): preserve → create package → apply hold ────────

export async function recordRequestRevision(p: ReviewEvidenceParams): Promise<void> {
  const { preserved_id, collection_id } = await preserveAndLink({
    ...p,
    action: 'request_revision',
    evidence_type: 'media_revision_request',
    sensitivity: 'confidential',
    retention_class: 'extended',
  });

  // Reuse existing package or create one
  const existingPkg = await findPackage(collection_id, p.tenantId);
  let packageId = existingPkg?.id;

  if (!packageId || existingPkg?.status === 'sealed') {
    const pkg = await evs.createPackage({
      workspace_id: p.workspaceId,
      tenant_id: p.tenantId,
      package_type: 'ai_governance',
      title: `Return Evidence: ${p.item.title}`,
      description: `Revision requested — "${p.item.title}". Note: ${p.note ?? 'No note'}`,
      source_collection_id: collection_id,
      item_ids: [preserved_id],
      created_by: p.userId,
      metadata: {
        review_item_id: p.item.id,
        returned_by: p.userId,
        return_note: p.note ?? null,
        item_type: p.item.item_type,
      },
    }, p.auth);
    packageId = pkg.id;
  }

  // Apply hold only if none is currently active
  const existingHold = await findActiveHold(packageId, p.tenantId);
  if (!existingHold) {
    const now = new Date().toISOString();
    const reviewDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    await evs.applyHold({
      workspace_id: p.workspaceId,
      tenant_id: p.tenantId,
      scope_type: 'package',
      scope_id: packageId,
      matter_ref: `RETURN-${p.item.id}`,
      jurisdiction: 'internal',
      reason: `Revision requested for "${p.item.title}" — hold until creator resubmits`,
      requester_id: p.userId,
      effective_date: now,
      review_date: reviewDate,
    }, p.auth);
  }
}

// ─── RESUBMIT: preserve → add to collection (case stays open) ─────────────────

export async function recordResubmit(p: ReviewEvidenceParams & { new_urls?: string[] }): Promise<void> {
  await preserveAndLink({
    ...p,
    action: 'resubmit',
    evidence_type: 'media_resubmission',
    sensitivity: 'confidential',
    retention_class: 'extended',
    extra_metadata: {
      new_urls: p.new_urls ?? [],
      resubmitted_by: p.userId,
    },
  });
}

// ─── ESCALATE: preserve → package → escalation hold → DLP → chain anchor ──────

export async function recordEscalate(p: ReviewEvidenceParams): Promise<void> {
  const { preserved_id, collection_id } = await preserveAndLink({
    ...p,
    action: 'escalate',
    evidence_type: 'media_escalation',
    sensitivity: 'confidential',
    risk_level: 'high',
    retention_class: 'regulated',
  });

  const existingPkg = await findPackage(collection_id, p.tenantId);
  let packageId = existingPkg?.id;

  if (!packageId || existingPkg?.status === 'sealed') {
    const pkg = await evs.createPackage({
      workspace_id: p.workspaceId,
      tenant_id: p.tenantId,
      package_type: 'security_incident',
      title: `Escalation: ${p.item.title}`,
      description: `Escalated — "${p.item.title}". Reason: ${p.reason ?? 'Not specified'}`,
      source_collection_id: collection_id,
      item_ids: [preserved_id],
      created_by: p.userId,
      metadata: {
        review_item_id: p.item.id,
        escalated_by: p.userId,
        escalation_reason: p.reason ?? null,
        item_type: p.item.item_type,
      },
    }, p.auth);
    packageId = pkg.id;
  }

  const existingHold = await findActiveHold(packageId, p.tenantId);
  if (!existingHold) {
    const now = new Date().toISOString();
    const reviewDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7-day review
    await evs.applyHold({
      workspace_id: p.workspaceId,
      tenant_id: p.tenantId,
      scope_type: 'package',
      scope_id: packageId,
      matter_ref: `ESCALATE-${p.item.id}`,
      jurisdiction: 'internal',
      reason: `Escalated content — "${p.item.title}". Admin review required.`,
      requester_id: p.userId,
      effective_date: now,
      review_date: reviewDate,
    }, p.auth);
  }

  // DLP scan — escalations often involve policy violations
  await evs.runDlpScan(packageId, p.userId, p.auth);

  await evs.createChainAnchor({
    package_id: packageId,
    item_id: preserved_id,
    workspace_id: p.workspaceId,
    tenant_id: p.tenantId,
    anchor_provider: 'review-queue',
    anchor_data: {
      action: 'escalate',
      review_item_id: p.item.id,
      escalated_by: p.userId,
      escalation_reason: p.reason ?? null,
      item_title: p.item.title,
    },
    created_by: p.userId,
  }, p.auth);
}

// ─── OVERRIDE: preserve → package → seal → compliance hold → chain anchor ─────

export async function recordOverride(p: ReviewEvidenceParams): Promise<void> {
  const { preserved_id, collection_id } = await preserveAndLink({
    ...p,
    action: 'override',
    evidence_type: 'media_override',
    sensitivity: 'confidential',
    retention_class: 'regulated',
  });

  const existingPkg = await findPackage(collection_id, p.tenantId);
  let packageId = existingPkg?.id;

  if (!packageId || existingPkg?.status === 'sealed') {
    const pkg = await evs.createPackage({
      workspace_id: p.workspaceId,
      tenant_id: p.tenantId,
      package_type: 'regulatory_response',
      title: `Override Evidence: ${p.item.title}`,
      description: `Decision overridden — "${p.item.title}". Reason: ${p.reason ?? 'Not specified'}`,
      source_collection_id: collection_id,
      item_ids: [preserved_id],
      created_by: p.userId,
      metadata: {
        review_item_id: p.item.id,
        overridden_by: p.userId,
        override_reason: p.reason ?? null,
        risk_acknowledgement: p.note ?? null,
        item_type: p.item.item_type,
      },
    }, p.auth);
    packageId = pkg.id;
  }

  if (existingPkg?.status !== 'sealed') {
    await evs.sealPackage(packageId, p.userId, p.auth);
  }

  // Compliance hold for override audit trail (90-day review)
  const now = new Date().toISOString();
  const reviewDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
  await evs.applyHold({
    workspace_id: p.workspaceId,
    tenant_id: p.tenantId,
    scope_type: 'package',
    scope_id: packageId,
    matter_ref: `OVERRIDE-${p.item.id}`,
    jurisdiction: 'internal',
    reason: `Override compliance evidence — "${p.item.title}". Retained for audit.`,
    requester_id: p.userId,
    effective_date: now,
    review_date: reviewDate,
  }, p.auth);

  await evs.createChainAnchor({
    package_id: packageId,
    item_id: preserved_id,
    workspace_id: p.workspaceId,
    tenant_id: p.tenantId,
    anchor_provider: 'review-queue',
    anchor_data: {
      action: 'override',
      review_item_id: p.item.id,
      overridden_by: p.userId,
      override_reason: p.reason ?? null,
      item_title: p.item.title,
    },
    created_by: p.userId,
  }, p.auth);
}

// ─── RELEASE: preserve → seal package → release hold → chain anchor ───────────

export async function recordRelease(p: ReviewEvidenceParams): Promise<void> {
  const { preserved_id, collection_id } = await preserveAndLink({
    ...p,
    action: 'release',
    evidence_type: 'media_release',
    sensitivity: 'confidential',
    retention_class: 'standard',
  });

  const pkg = await findPackage(collection_id, p.tenantId);
  if (!pkg) return;

  if (pkg.status !== 'sealed') {
    await evs.sealPackage(pkg.id, p.userId, p.auth);
  }

  const holdId = await findActiveHold(pkg.id, p.tenantId);
  if (holdId) {
    await evs.releaseHold(
      holdId, p.userId,
      `Review item "${p.item.title}" released to production — case closed`,
      p.userId, p.auth,
    );
  }

  await evs.createChainAnchor({
    package_id: pkg.id,
    item_id: preserved_id,
    workspace_id: p.workspaceId,
    tenant_id: p.tenantId,
    anchor_provider: 'review-queue',
    anchor_data: {
      action: 'release',
      review_item_id: p.item.id,
      released_by: p.userId,
      item_title: p.item.title,
    },
    created_by: p.userId,
  }, p.auth);
}

// ─── ASSIGN: preserve + add to collection ────────────────────────────────────

export async function recordAssign(p: ReviewEvidenceParams & { assigned_to?: string }): Promise<void> {
  await preserveAndLink({
    ...p,
    action: 'assign',
    evidence_type: 'media_assignment',
    sensitivity: 'internal',
    retention_class: 'standard',
    extra_metadata: { assigned_to: p.assigned_to ?? null },
  });
}

// ─── ADD NOTE: preserve + add to collection ───────────────────────────────────

export async function recordAddNote(p: ReviewEvidenceParams): Promise<void> {
  await preserveAndLink({
    ...p,
    action: 'add_note',
    evidence_type: 'media_reviewer_note',
    sensitivity: 'internal',
    retention_class: 'standard',
  });
}

// ─── CLAIM: preserve + add to collection ─────────────────────────────────────

export async function recordClaim(p: ReviewEvidenceParams): Promise<void> {
  await preserveAndLink({
    ...p,
    action: 'claim',
    evidence_type: 'media_claim',
    sensitivity: 'internal',
    retention_class: 'standard',
  });
}

// ─── UNCLAIM: preserve + add to collection ───────────────────────────────────

export async function recordUnclaim(p: ReviewEvidenceParams): Promise<void> {
  await preserveAndLink({
    ...p,
    action: 'unclaim',
    evidence_type: 'media_unclaim',
    sensitivity: 'internal',
    retention_class: 'standard',
  });
}

// ─── Wrapper: logs errors without re-throwing ─────────────────────────────────

export async function safeRecord(label: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
  } catch (err) {
    logger.error({ err, label }, `[ReviewEvidence] Failed to record evidence for ${label}`);
  }
}
