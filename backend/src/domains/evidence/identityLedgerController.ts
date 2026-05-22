import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../shared/authMiddleware';
import { supabaseAdmin } from '../../shared/supabase';
import { createAuditEvent } from '../../services/auditTrail.service';
import * as identityLedgerService from '../../services/identityLedger.service';

async function getViewerContext(req: AuthRequest): Promise<identityLedgerService.ViewerContext> {
  const userId = req.user?.id;
  if (!userId) {
    throw new Error('Unauthorized');
  }

  if (req.user?.is_superadmin) {
    return {
      user_id: userId,
      workspace_role: 'SUPERADMIN',
      is_superadmin: true,
    };
  }

  const workspaceId = req.user?.workspace_id;
  if (!workspaceId) {
    return {
      user_id: userId,
      workspace_role: req.user?.role || null,
      is_superadmin: false,
    };
  }

  const { data: member, error } = await supabaseAdmin
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;

  return {
    user_id: userId,
    workspace_role: member?.role || req.user?.role || null,
    is_superadmin: false,
  };
}

async function logIdentityLedgerAccess(params: {
  workspace_id: string;
  user_id: string;
  event_type: 'identity_ledger.viewed' | 'authority_proof.generated' | 'identity.chain_verified';
  object_type: string;
  object_id: string;
  summary: string;
}) {
  try {
    await createAuditEvent({
      workspace_id: params.workspace_id,
      tenant_id: 'default',
      event_category: params.event_type === 'identity.chain_verified' ? 'system_security' : 'user_identity',
      event_type: params.event_type,
      event_title: params.summary,
      event_summary: params.summary,
      actor: { actor_id: params.user_id, actor_type: 'human_user' },
      object: { object_type: params.object_type, object_id: params.object_id },
      authority: { permission_used: 'identity-ledger:view' },
      risk_level: 'low',
      status: 'success',
      evidence_state: 'not_preserved',
      retention_class: 'REGULATED',
    });
  } catch {
    // Identity access logging is best-effort and must not block the response path.
  }
}

export async function listActors(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const workspaceId = req.user?.workspace_id;
    const userId = req.user?.id;
    if (!workspaceId || !userId) return res.status(400).json({ error: 'Workspace ID and user required' });

    const viewer = await getViewerContext(req);
    const { actor_type, state, role, authority_class, risk_level, source, search, limit, offset } = req.query as Record<string, string | undefined>;

    const result = await identityLedgerService.listActors({
      workspace_id: workspaceId,
      actor_type,
      state,
      role,
      authority_class,
      risk_level,
      source,
      search,
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
      viewer,
    });

    logIdentityLedgerAccess({
      workspace_id: workspaceId,
      user_id: userId,
      event_type: 'identity_ledger.viewed',
      object_type: 'identity_actor_list',
      object_id: 'workspace',
      summary: 'Identity Ledger actor list viewed',
    });

    res.json({ success: true, data: result.actors, total: result.total });
  } catch (error) {
    next(error);
  }
}

export async function getActor(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const workspaceId = req.user?.workspace_id;
    const userId = req.user?.id;
    if (!workspaceId || !userId) return res.status(400).json({ error: 'Workspace ID and user required' });

    const viewer = await getViewerContext(req);
    const result = await identityLedgerService.getActorDetail({
      workspace_id: workspaceId,
      actor_id: req.params.actorId as string,
      viewer,
    });

    if (!result) return res.status(404).json({ error: 'Actor not found' });

    logIdentityLedgerAccess({
      workspace_id: workspaceId,
      user_id: userId,
      event_type: 'identity_ledger.viewed',
      object_type: 'identity_actor',
      object_id: req.params.actorId as string,
      summary: `Identity Ledger actor viewed: ${req.params.actorId as string}`,
    });

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function getActorTimeline(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const workspaceId = req.user?.workspace_id;
    const userId = req.user?.id;
    if (!workspaceId || !userId) return res.status(400).json({ error: 'Workspace ID and user required' });

    const viewer = await getViewerContext(req);
    const { point_in_time, limit } = req.query as Record<string, string | undefined>;
    const result = await identityLedgerService.getActorTimeline({
      workspace_id: workspaceId,
      actor_id: req.params.actorId as string,
      point_in_time,
      limit: limit ? parseInt(limit, 10) : 50,
      viewer,
    });

    if (!result) return res.status(404).json({ error: 'Actor not found' });

    logIdentityLedgerAccess({
      workspace_id: workspaceId,
      user_id: userId,
      event_type: 'identity_ledger.viewed',
      object_type: 'identity_actor_timeline',
      object_id: req.params.actorId as string,
      summary: `Identity Ledger timeline viewed: ${req.params.actorId as string}`,
    });

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function getAuthoritySnapshot(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const workspaceId = req.user?.workspace_id;
    const userId = req.user?.id;
    if (!workspaceId || !userId) return res.status(400).json({ error: 'Workspace ID and user required' });

    const viewer = await getViewerContext(req);
    const result = await identityLedgerService.getAuthoritySnapshotDetail({
      workspace_id: workspaceId,
      snapshot_id: req.params.snapshotId as string,
      viewer,
    });

    if (!result) return res.status(404).json({ error: 'Authority snapshot not found' });

    logIdentityLedgerAccess({
      workspace_id: workspaceId,
      user_id: userId,
      event_type: 'authority_proof.generated',
      object_type: 'identity_authority_snapshot',
      object_id: req.params.snapshotId as string,
      summary: `Authority snapshot viewed: ${req.params.snapshotId as string}`,
    });

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function getAuthorityAtEvent(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const workspaceId = req.user?.workspace_id;
    const userId = req.user?.id;
    if (!workspaceId || !userId) return res.status(400).json({ error: 'Workspace ID and user required' });

    const viewer = await getViewerContext(req);
    const result = await identityLedgerService.getAuthorityAtEvent({
      workspace_id: workspaceId,
      audit_event_id: req.params.auditEventId as string,
      viewer,
    });

    if (!result) return res.status(404).json({ error: 'Authority proof not found' });

    logIdentityLedgerAccess({
      workspace_id: workspaceId,
      user_id: userId,
      event_type: 'authority_proof.generated',
      object_type: 'audit_event',
      object_id: req.params.auditEventId as string,
      summary: `Authority at event viewed: ${req.params.auditEventId as string}`,
    });

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function verifyLedgerChain(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const workspaceId = req.user?.workspace_id;
    const userId = req.user?.id;
    if (!workspaceId || !userId) return res.status(400).json({ error: 'Workspace ID and user required' });

    const result = await identityLedgerService.verifyIdentityLedgerChain({
      workspace_id: workspaceId,
      created_by: userId,
    });

    logIdentityLedgerAccess({
      workspace_id: workspaceId,
      user_id: userId,
      event_type: 'identity.chain_verified',
      object_type: 'identity_ledger_chain',
      object_id: String(result.verification_id),
      summary: 'Identity Ledger chain verification run',
    });

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function listDelegations(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const tenantId = (req.user as any)?.tenant_id || 'default';
    const status = req.query.status as string | undefined;
    const result = await identityLedgerService.listDelegations({ tenant_id: tenantId, status });
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function createDelegation(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const tenantId = (req.user as any)?.tenant_id || 'default';
    const { delegator_id, delegatee_id, scope, expires_at, reason } = req.body;
    const result = await identityLedgerService.createDelegation({
      tenant_id: tenantId,
      delegator_id,
      delegatee_id,
      scope,
      expires_at,
      reason
    });
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function revokeDelegation(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(400).json({ error: 'User required' });
    const result = await identityLedgerService.revokeDelegation({
      id: req.params.id as string,
      revoked_by: userId
    });
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function listBreakGlass(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const tenantId = (req.user as any)?.tenant_id || 'default';
    const status = req.query.status as string | undefined;
    const result = await identityLedgerService.listBreakGlassSessions({ tenant_id: tenantId, status });
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function requestBreakGlass(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const tenantId = (req.user as any)?.tenant_id || 'default';
    const userId = req.user?.id;
    if (!userId) return res.status(400).json({ error: 'User required' });
    const { reason, elevated_roles } = req.body;
    const result = await identityLedgerService.requestBreakGlass({
      tenant_id: tenantId,
      actor_id: userId,
      reason,
      elevated_roles
    });
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function activateBreakGlass(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const result = await identityLedgerService.activateBreakGlass({ id: req.params.id as string });
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function endBreakGlass(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const result = await identityLedgerService.endBreakGlass({ id: req.params.id as string });
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function reviewBreakGlass(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(400).json({ error: 'User required' });
    const { status, notes } = req.body;
    const result = await identityLedgerService.reviewBreakGlass({
      id: req.params.id as string,
      reviewer_id: userId,
      status,
      notes
    });
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function exportLedger(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const workspaceId = req.user?.workspace_id;
    res.json({ success: true, data: { status: 'exported', workspace_id: workspaceId } });
  } catch (error) {
    next(error);
  }
}

export async function preserveToVault(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const workspaceId = req.user?.workspace_id;
    res.json({ success: true, data: { status: 'preserved_to_vault', workspace_id: workspaceId } });
  } catch (error) {
    next(error);
  }
}
