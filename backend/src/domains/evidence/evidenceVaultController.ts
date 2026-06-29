import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../shared/authMiddleware';
import { buildAuthContext } from '../../shared/serviceAuth';
import * as vaultService from '../../services/evidenceVault.service';

function getWorkspaceId(req: AuthRequest): string {
  if (!req.user?.workspace_id) throw Object.assign(new Error('Workspace ID is required'), { statusCode: 400 });
  return req.user.workspace_id;
}

// ─── GET /api/evidence-vault/items ────────────────────────────────────────────

export async function listEvidenceItems(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { source_type, vault_state, retention_class, legal_hold, risk_level, sensitivity, date_from, date_to, search, cursor, limit } = req.query as Record<string, string | undefined>;
    const result = await vaultService.listEvidenceItems({
      workspace_id: req.user?.workspace_id || undefined,
      source_type, vault_state, retention_class,
      legal_hold: legal_hold !== undefined ? legal_hold === 'true' : undefined,
      risk_level, sensitivity, date_from, date_to, search, cursor,
      limit: limit ? parseInt(limit) : 50,
    });
    res.json({ success: true, data: result.items, next_cursor: result.next_cursor, total: result.total });
  } catch (error) { next(error); }
}

// ─── GET /api/evidence-vault/items/:id ────────────────────────────────────────

export async function getEvidenceItem(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const result = await vaultService.getEvidenceItem(id);
    if (!result) return res.status(404).json({ success: false, error: 'Evidence item not found' });
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
}

// ─── POST /api/evidence-vault/items/preserve ──────────────────────────────────

export async function preserveEvidence(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { source_type, source_id, source_system, source_timestamp_utc, evidence_type, risk_level, sensitivity, contains_pii, contains_ai_output, jurisdictions, payload, payload_size, mime_type, retention_class, retention_until, authority, preservation_reason, metadata } = req.body;
    if (!source_type || !source_id || !source_system || !preservation_reason) {
      return res.status(400).json({ success: false, error: 'source_type, source_id, source_system, and preservation_reason are required' });
    }
    const auth = buildAuthContext(req.user);
    const result = await vaultService.preserveEvidence({
      source_type, source_id, source_system, source_timestamp_utc,
      evidence_type, risk_level, sensitivity,
      contains_pii, contains_ai_output, jurisdictions,
      payload, payload_size, mime_type,
      retention_class, retention_until,
      preserved_by: req.user!.id,
      authority: authority || undefined,
      preservation_reason,
      workspace_id: getWorkspaceId(req),
      tenant_id: getWorkspaceId(req),
      metadata,
    }, auth);
    res.status(201).json({ success: true, data: result });
  } catch (error) { next(error); }
}

// ─── POST /api/evidence-vault/items/:id/verify ────────────────────────────────

export async function verifyEvidenceItem(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const result = await vaultService.verifyEvidenceItem(id, req.user!.id);
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
}

// ─── POST /api/evidence-vault/collections ─────────────────────────────────────

export async function createCollection(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { title, description, scope, created_reason } = req.body;
    if (!title) return res.status(400).json({ success: false, error: 'title is required' });
    const auth = buildAuthContext(req.user);
    const result = await vaultService.createCollection({
      workspace_id: getWorkspaceId(req),
      tenant_id: getWorkspaceId(req),
      title, description, scope, created_reason,
      created_by: req.user!.id,
    }, auth);
    res.status(201).json({ success: true, data: result });
  } catch (error) { next(error); }
}

// ─── GET /api/evidence-vault/collections ──────────────────────────────────────

export async function listCollections(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { created_by, limit, offset } = req.query as Record<string, string | undefined>;
    const result = await vaultService.listCollections({
      workspace_id: req.user?.workspace_id || undefined,
      created_by,
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0,
    });
    res.json({ success: true, data: result.collections, total: result.total });
  } catch (error) { next(error); }
}

// ─── GET /api/evidence-vault/collections/:id ──────────────────────────────────

export async function getCollection(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const result = await vaultService.getCollection(id);
    if (!result) return res.status(404).json({ success: false, error: 'Collection not found' });
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
}

// ─── POST /api/evidence-vault/collections/:id/items ──────────────────────────

export async function addItemsToCollection(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const { item_ids, reason } = req.body;
    if (!item_ids || !Array.isArray(item_ids) || item_ids.length === 0) {
      return res.status(400).json({ success: false, error: 'item_ids array is required' });
    }
    const auth = buildAuthContext(req.user);
    const result = await vaultService.addItemsToCollection(id, item_ids, req.user!.id, reason, auth);
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
}

// ─── GET /api/evidence-vault/collections/:id/items ──────────────────────────

export async function getCollectionItems(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const result = await vaultService.getCollectionItems(id);
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
}

// ─── GET /api/evidence-vault/health ───────────────────────────────────────────

export async function getVaultHealth(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const result = await vaultService.getVaultHealth();
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
}

// ─── Phase 2: Packages ──────────────────────────────────────────────────────────

export async function createPackage(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { package_type, title, description, source_collection_id, item_ids, metadata } = req.body;
    if (!package_type || !title) {
      return res.status(400).json({ success: false, error: 'package_type and title are required' });
    }
    const auth = buildAuthContext(req.user);
    const result = await vaultService.createPackage({
      workspace_id: getWorkspaceId(req),
      tenant_id: getWorkspaceId(req),
      package_type, title, description, source_collection_id, item_ids, metadata,
      created_by: req.user!.id,
    }, auth);
    res.status(201).json({ success: true, data: result });
  } catch (error) { next(error); }
}

export async function listPackages(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { package_type, status, created_by, limit, offset } = req.query as Record<string, string | undefined>;
    const result = await vaultService.listPackages({
      workspace_id: req.user?.workspace_id || undefined,
      package_type, status, created_by,
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0,
    });
    res.json({ success: true, data: result.packages, total: result.total });
  } catch (error) { next(error); }
}

export async function getPackage(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const result = await vaultService.getPackage(id);
    if (!result) return res.status(404).json({ success: false, error: 'Package not found' });
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
}

export async function sealPackage(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const auth = buildAuthContext(req.user);
    const result = await vaultService.sealPackage(id, req.user!.id, auth);
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
}

export async function getPackageManifest(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const result = await vaultService.getPackageManifest(id);
    if (!result) return res.status(404).json({ success: false, error: 'Package not found' });
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
}

export async function verifyPackage(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const result = await vaultService.verifyPackage(id, req.user!.id);
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
}

// ─── Phase 2: Exports ────────────────────────────────────────────────────────────

export async function createExport(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { package_id, disclosure_mode, requester_reason, delivery_method, expires_at } = req.body;
    if (!package_id || !disclosure_mode) {
      return res.status(400).json({ success: false, error: 'package_id and disclosure_mode are required' });
    }
    const auth = buildAuthContext(req.user);
    const result = await vaultService.createExport({
      package_id, disclosure_mode, requester_reason, delivery_method, expires_at,
      workspace_id: getWorkspaceId(req),
      tenant_id: getWorkspaceId(req),
      requester_id: req.user!.id,
    }, auth);
    res.status(201).json({ success: true, data: result });
  } catch (error) { next(error); }
}

export async function listExports(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { package_id, requester_id, status, limit, offset } = req.query as Record<string, string | undefined>;
    const result = await vaultService.listExports({
      package_id, requester_id, status,
      workspace_id: req.user?.workspace_id || undefined,
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0,
    });
    res.json({ success: true, data: result.exports, total: result.total });
  } catch (error) { next(error); }
}

export async function getExportReceipt(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const result = await vaultService.getExportReceipt(id);
    if (!result) return res.status(404).json({ success: false, error: 'Export not found' });
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
}

// ─── Phase 2: Legal Holds ────────────────────────────────────────────────────────

export async function applyHold(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { scope_type, scope_id, scope_query, matter_ref, jurisdiction, reason, approver_id, effective_date, review_date } = req.body;
    if (!scope_type || !matter_ref || !reason || !effective_date) {
      return res.status(400).json({ success: false, error: 'scope_type, matter_ref, reason, and effective_date are required' });
    }
    const auth = buildAuthContext(req.user);
    const result = await vaultService.applyHold({
      workspace_id: getWorkspaceId(req),
      tenant_id: getWorkspaceId(req),
      scope_type, scope_id, scope_query, matter_ref, jurisdiction, reason,
      requester_id: req.user!.id, approver_id, effective_date, review_date,
    }, auth);
    res.status(201).json({ success: true, data: result });
  } catch (error) { next(error); }
}

export async function listHolds(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { scope_type, matter_ref, released, limit, offset } = req.query as Record<string, string | undefined>;
    const result = await vaultService.listHolds({
      workspace_id: req.user?.workspace_id || undefined,
      scope_type, matter_ref,
      released: released !== undefined ? released === 'true' : undefined,
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0,
    });
    res.json({ success: true, data: result.holds, total: result.total });
  } catch (error) { next(error); }
}

export async function releaseHold(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const { reason, authorized_by } = req.body;
    if (!reason) return res.status(400).json({ success: false, error: 'reason is required' });
    const auth = buildAuthContext(req.user);
    const result = await vaultService.releaseHold(id, req.user!.id, reason, authorized_by, auth);
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
}

export async function deleteHold(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const workspaceId = req.user?.workspace_id;
    if (!workspaceId) return res.status(400).json({ success: false, error: 'Workspace context missing' });
    await vaultService.deleteHold(id, workspaceId);
    res.json({ success: true });
  } catch (error) { next(error); }
}

// ─── Phase 2: Redaction Policies ─────────────────────────────────────────────────

export async function createRedactionPolicy(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { name, description, rules } = req.body;
    if (!name || !rules) {
      return res.status(400).json({ success: false, error: 'name and rules are required' });
    }
    const auth = buildAuthContext(req.user);
    const result = await vaultService.createRedactionPolicy({
      name, description, rules, created_by: req.user!.id,
    }, auth);
    res.status(201).json({ success: true, data: result });
  } catch (error) { next(error); }
}

export async function listRedactionPolicies(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const result = await vaultService.listRedactionPolicies();
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
}

// ─── Phase 3: External Shares ─────────────────────────────────────────────────────

export async function createShare(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { package_id, recipient_email, recipient_name, disclosure_mode, redaction_policy_id, expires_at, max_views, watermark, allow_download, require_mfa } = req.body;
    if (!package_id || !recipient_email || !expires_at) {
      return res.status(400).json({ success: false, error: 'package_id, recipient_email, and expires_at are required' });
    }
    const auth = buildAuthContext(req.user);
    const result = await vaultService.createShare({
      package_id, recipient_email, recipient_name, disclosure_mode, redaction_policy_id,
      expires_at, max_views, watermark, allow_download, require_mfa,
      workspace_id: getWorkspaceId(req),
      tenant_id: getWorkspaceId(req),
      created_by: req.user!.id,
    }, auth);
    res.status(201).json({ success: true, data: result });
  } catch (error) { next(error); }
}

export async function listShares(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { package_id, revoked, limit, offset } = req.query as Record<string, string | undefined>;
    const result = await vaultService.listShares({
      package_id,
      workspace_id: req.user?.workspace_id || undefined,
      revoked: revoked !== undefined ? revoked === 'true' : undefined,
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0,
    });
    res.json({ success: true, data: result.shares, total: result.total });
  } catch (error) { next(error); }
}

export async function getShare(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const result = await vaultService.getShare(id);
    if (!result) return res.status(404).json({ success: false, error: 'Share not found' });
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
}

export async function revokeShare(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const auth = buildAuthContext(req.user);
    const result = await vaultService.revokeShare(id, req.user!.id, auth);
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
}

export async function getShareAccessLogs(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const result = await vaultService.getShareAccessLogs(id);
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
}

// ─── Phase 3: DLP Scanning ────────────────────────────────────────────────────────

export async function runDlpScan(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { package_id } = req.body;
    if (!package_id) return res.status(400).json({ success: false, error: 'package_id is required' });
    const auth = buildAuthContext(req.user);
    const result = await vaultService.runDlpScan(package_id, req.user!.id, auth);
    res.status(201).json({ success: true, data: result });
  } catch (error) { next(error); }
}

export async function getDlpScan(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const result = await vaultService.getDlpScan(id);
    if (!result) return res.status(404).json({ success: false, error: 'Scan not found' });
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
}

export async function listDlpScans(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { package_id, scan_status, limit, offset } = req.query as Record<string, string | undefined>;
    const result = await vaultService.listDlpScans({
      package_id, scan_status,
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0,
    });
    res.json({ success: true, data: result.scans, total: result.total });
  } catch (error) { next(error); }
}

// ─── Phase 4: Async Jobs ─────────────────────────────────────────────────────────

export async function createAsyncJob(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { job_type, params, priority, max_retries, idempotency_key } = req.body;
    if (!job_type) return res.status(400).json({ success: false, error: 'job_type is required' });
    const auth = buildAuthContext(req.user);
    const result = await vaultService.createAsyncJob({
      job_type, params, priority, max_retries, idempotency_key,
      workspace_id: getWorkspaceId(req),
      tenant_id: getWorkspaceId(req),
      created_by: req.user!.id,
    }, auth);
    res.status(201).json({ success: true, data: result });
  } catch (error) { next(error); }
}

export async function listAsyncJobs(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { job_type, status, created_by, limit, offset } = req.query as Record<string, string | undefined>;
    const result = await vaultService.listAsyncJobs({
      job_type, status, created_by,
      workspace_id: req.user?.workspace_id || undefined,
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0,
    });
    res.json({ success: true, data: result.jobs, total: result.total });
  } catch (error) { next(error); }
}

export async function getAsyncJob(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const result = await vaultService.getAsyncJob(id, req.user?.workspace_id || undefined);
    if (!result) return res.status(404).json({ success: false, error: 'Job not found' });
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
}

// ─── Phase 4: Chain Anchoring ─────────────────────────────────────────────────────

export async function createChainAnchor(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { package_id, item_id, anchor_provider, anchor_data } = req.body;
    if (!anchor_provider) return res.status(400).json({ success: false, error: 'anchor_provider is required' });
    const auth = buildAuthContext(req.user);
    const result = await vaultService.createChainAnchor({
      package_id,
      item_id,
      workspace_id: getWorkspaceId(req),
      tenant_id: getWorkspaceId(req),
      anchor_provider,
      anchor_data,
      created_by: req.user!.id,
    }, auth);
    res.status(201).json({ success: true, data: result });
  } catch (error) { next(error); }
}

export async function listChainAnchors(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { package_id, status, limit, offset } = req.query as Record<string, string | undefined>;
    const result = await vaultService.listChainAnchors({
      workspace_id: req.user?.workspace_id || undefined,
      package_id, status,
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0,
    });
    res.json({ success: true, data: result.anchors, total: result.total });
  } catch (error) { next(error); }
}

export async function verifyChainAnchor(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const anchorId = req.params.anchorId as string;
    const workspaceId = req.user?.workspace_id;
    if (!workspaceId) return res.status(400).json({ success: false, error: 'Workspace ID required' });

    const result = await vaultService.verifyChainAnchor(anchorId, workspaceId);
    if (!result.anchor) return res.status(404).json({ success: false, error: 'Chain anchor not found' });

    res.json({ success: true, data: result });
  } catch (error) { next(error); }
}

// ─── Phase 4: Template Versions ───────────────────────────────────────────────────

export async function createTemplateVersion(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { package_type, template_version, schema } = req.body;
    if (!package_type || !template_version || !schema) {
      return res.status(400).json({ success: false, error: 'package_type, template_version, and schema are required' });
    }
    const auth = buildAuthContext(req.user);
    const result = await vaultService.createTemplateVersion({
      workspace_id: getWorkspaceId(req),
      tenant_id: getWorkspaceId(req),
      package_type,
      template_version,
      schema,
      created_by: req.user!.id,
    }, auth);
    res.status(201).json({ success: true, data: result });
  } catch (error) { next(error); }
}

export async function listTemplateVersions(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { package_type, is_active } = req.query as Record<string, string | undefined>;
    const result = await vaultService.listTemplateVersions({
      workspace_id: req.user?.workspace_id || undefined,
      package_type,
      is_active: is_active !== undefined ? is_active === 'true' : undefined,
    });
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
}
