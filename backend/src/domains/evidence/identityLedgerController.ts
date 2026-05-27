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
    const userId = req.user?.id;
    if (!workspaceId || !userId) return res.status(400).json({ error: 'Workspace ID and user required' });

    const { actor_id, case_id } = req.body as { actor_id?: string; case_id?: string };

    let chain: unknown[] = [];
    if (actor_id) {
      const data = await identityLedgerService.reconstructIdentityChain({
        workspace_id: workspaceId,
        actor_id,
        case_id: case_id || 'export',
      });
      chain = Array.isArray(data) ? data : [data];
    } else {
      const actors = await identityLedgerService.listActors({
        workspace_id: workspaceId,
        viewer: { user_id: userId, workspace_role: req.user?.role, is_superadmin: !!req.user?.is_superadmin },
        limit: 1000,
      });
      for (const actor of (actors.actors || [])) {
        const snapshots = await identityLedgerService.reconstructIdentityChain({
          workspace_id: workspaceId,
          actor_id: (actor as Record<string, unknown>).actor_id as string,
          case_id: case_id || 'export',
        });
        chain.push(...(Array.isArray(snapshots) ? snapshots : [snapshots]));
      }
    }

    const exportPayload = {
      exported_at: new Date().toISOString(),
      workspace_id: workspaceId,
      exported_by: userId,
      actor_filter: actor_id || '*',
      authority_snapshot_count: chain.length,
      authority_snapshots: chain,
    };

    logIdentityLedgerAccess({
      workspace_id: workspaceId,
      user_id: userId,
      event_type: 'authority_proof.generated',
      object_type: 'identity_ledger_export',
      object_id: `${workspaceId}:${actor_id || 'all'}`,
      summary: `Identity Ledger export generated for actor: ${actor_id || 'all'}`,
    });

    res.json({ success: true, data: exportPayload });
  } catch (error) {
    next(error);
  }
}

export async function preserveToVault(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const workspaceId = req.user?.workspace_id;
    const userId = req.user?.id;
    if (!workspaceId || !userId) return res.status(400).json({ error: 'Workspace ID and user required' });

    const { ledger_entry_id, reason } = req.body as { ledger_entry_id?: string; reason?: string };
    if (!ledger_entry_id || !reason) {
      return res.status(400).json({ error: 'ledger_entry_id and reason are required' });
    }

    const result = await identityLedgerService.preserveToVault({
      workspace_id: workspaceId,
      ledger_entry_id,
      reason,
    });

    logIdentityLedgerAccess({
      workspace_id: workspaceId,
      user_id: userId,
      event_type: 'identity_ledger.viewed',
      object_type: 'identity_ledger_entry',
      object_id: ledger_entry_id,
      summary: `Identity ledger entry preserved to vault: ${ledger_entry_id}`,
    });

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

// ─── Service-Account Registry ─────────────────────────────────────────────────

export async function registerServiceAccount(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const workspaceId = req.user?.workspace_id;
    const userId = req.user?.id;
    if (!workspaceId || !userId) return res.status(400).json({ error: 'Workspace ID and user required' });

    const { actor_id, display_name, source_system, description, permissions, expires_at } = req.body;
    if (!actor_id || !display_name || !source_system) {
      return res.status(400).json({ error: 'actor_id, display_name, and source_system are required' });
    }

    const result = await identityLedgerService.registerServiceAccount({
      actor_id,
      workspace_id: workspaceId,
      tenant_id: 'default',
      display_name,
      source_system,
      description,
      permissions,
      expires_at,
      created_by: userId,
    });

    res.status(201).json({ success: true, data: result });
  } catch (error) { next(error); }
}

export async function listServiceAccounts(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const workspaceId = req.user?.workspace_id;
    if (!workspaceId) return res.status(400).json({ error: 'Workspace ID required' });

    const { source_system, state, limit, offset } = req.query as Record<string, string | undefined>;
    const result = await identityLedgerService.listServiceAccounts({
      workspace_id: workspaceId,
      source_system,
      state,
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0,
    });

    res.json({ success: true, data: result.accounts, total: result.total });
  } catch (error) { next(error); }
}

export async function revokeServiceAccount(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const workspaceId = req.user?.workspace_id;
    const userId = req.user?.id;
    if (!workspaceId || !userId) return res.status(400).json({ error: 'Workspace ID and user required' });

    const actorId = req.params.actorId as string;
    const { reason } = req.body as { reason?: string };

    const result = await identityLedgerService.revokeServiceAccount(actorId, workspaceId, userId, reason);
    if (!result) return res.status(404).json({ error: 'Service account not found' });

    res.json({ success: true, data: result });
  } catch (error) { next(error); }
}

// ─── Actor Timeline with Session Proof ───────────────────────────────────────

export async function getActorTimelineWithSessions(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const workspaceId = req.user?.workspace_id;
    const userId = req.user?.id;
    if (!workspaceId || !userId) return res.status(400).json({ error: 'Workspace ID and user required' });

    const viewer = await getViewerContext(req);
    const { limit } = req.query as Record<string, string | undefined>;
    const result = await identityLedgerService.getActorTimelineWithSessions({
      workspace_id: workspaceId,
      actor_id: req.params.actorId as string,
      limit: limit ? parseInt(limit) : 100,
      viewer,
    });

    if (!result) return res.status(404).json({ error: 'Actor not found' });
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
}

// ─── Identity Risk Flags ──────────────────────────────────────────────────────

export async function evaluateActorRiskFlags(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const workspaceId = req.user?.workspace_id;
    if (!workspaceId) return res.status(400).json({ error: 'Workspace ID required' });

    const actorId = req.params.actorId as string;
    const result = await identityLedgerService.evaluateActorRiskFlags(actorId, workspaceId);

    res.json({ success: true, data: result });
  } catch (error) { next(error); }
}

export async function setActorRiskFlags(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const workspaceId = req.user?.workspace_id;
    const userId = req.user?.id;
    if (!workspaceId || !userId) return res.status(400).json({ error: 'Workspace ID and user required' });

    const actorId = req.params.actorId as string;
    const { risk_flags, risk_level, reason } = req.body as { risk_flags?: string[]; risk_level?: string; reason?: string };

    if (!Array.isArray(risk_flags)) return res.status(400).json({ error: 'risk_flags array required' });

    const validLevels = ['low', 'medium', 'high', 'critical'] as const;
    const level = risk_level as typeof validLevels[number] | undefined;
    if (risk_level && !validLevels.includes(level!)) return res.status(400).json({ error: 'Invalid risk_level' });

    const result = await identityLedgerService.setActorRiskFlags({
      actor_id: actorId,
      workspace_id: workspaceId,
      risk_flags,
      risk_level: level,
      reason,
      set_by: userId,
    });

    if (!result) return res.status(404).json({ error: 'Actor not found' });
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
}
