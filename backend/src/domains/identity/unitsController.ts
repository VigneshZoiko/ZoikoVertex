import { Response, NextFunction } from 'express';
import { supabaseAdmin } from '../../shared/supabase';
import { AuthRequest } from '../../shared/authMiddleware';

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function logActivity(
  businessUnitId: string,
  workspaceId: string,
  actorId: string | undefined,
  actorName: string,
  actorRole: string,
  eventType: string,
  description: string,
  beforeState: Record<string, unknown> = {},
  afterState: Record<string, unknown> = {},
) {
  await supabaseAdmin.from('business_unit_activity_log').insert({
    business_unit_id: businessUnitId,
    workspace_id: workspaceId,
    actor_id: actorId,
    actor_name: actorName,
    actor_role: actorRole,
    event_type: eventType,
    description,
    before_state: beforeState,
    after_state: afterState,
  });
}

async function checkCampaignsOrEvidence(unitId: string): Promise<boolean> {
  const { count: campaignCount } = await supabaseAdmin
    .from('campaigns')
    .select('*', { count: 'exact', head: true })
    .eq('business_unit_id', unitId);

  const { count: evidenceCount } = await supabaseAdmin
    .from('business_unit_evidence_scope')
    .select('*', { count: 'exact', head: true })
    .eq('business_unit_id', unitId);

  const { count: historyCount } = await supabaseAdmin
    .from('business_unit_activity_log')
    .select('*', { count: 'exact', head: true })
    .eq('business_unit_id', unitId);

  return (campaignCount ?? 0) > 0 || (evidenceCount ?? 0) > 0 || (historyCount ?? 0) > 0;
}

// ─── GET /api/v1/units ────────────────────────────────────────────────────────

export const listUnits = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const workspaceId = req.user?.workspace_id;
    const isSuperAdmin = req.user?.is_superadmin;

    if (!isSuperAdmin && !workspaceId) {
      return res.status(403).json({ error: 'Workspace context missing' });
    }

    const { owner, type, status, search } = req.query;

    let query = supabaseAdmin
      .from('business_units')
      .select(`
        id, name, description, color, status, unit_type, parent_id,
        created_at, updated_at, archived_at,
        owner_id,
        workspace_id
      `)
      .order('created_at', { ascending: true });

    if (!isSuperAdmin) {
      query = query.eq('workspace_id', workspaceId);
    }

    if (status && status !== 'all') {
      query = query.eq('status', status as string);
    }
    if (type && type !== 'all') {
      query = query.eq('unit_type', type as string);
    }
    if (owner) {
      query = query.eq('owner_id', owner as string);
    }
    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    const { data: units, error } = await query;
    if (error) throw error;

    const unitList = units || [];
    const unitIds = unitList.map((u: { id: string }) => u.id);

    // Batch-fetch member counts (one query, not N)
    const memberCountMap = new Map<string, number>();
    if (unitIds.length > 0) {
      const { data: members } = await supabaseAdmin
        .from('business_unit_members')
        .select('business_unit_id')
        .in('business_unit_id', unitIds);
      const countMap = new Map<string, number>();
      for (const m of (members || [])) {
        countMap.set(m.business_unit_id, (countMap.get(m.business_unit_id) || 0) + 1);
      }
      for (const id of unitIds) memberCountMap.set(id, countMap.get(id) || 0);
    }

    // Batch-fetch brand counts (one query, not N)
    const brandCountMap = new Map<string, number>();
    if (unitIds.length > 0) {
      const { data: brands } = await supabaseAdmin
        .from('business_unit_brands')
        .select('business_unit_id')
        .in('business_unit_id', unitIds);
      const countMap = new Map<string, number>();
      for (const b of (brands || [])) {
        countMap.set(b.business_unit_id, (countMap.get(b.business_unit_id) || 0) + 1);
      }
      for (const id of unitIds) brandCountMap.set(id, countMap.get(id) || 0);
    }

    // Batch-fetch owner names
    const ownerIdSet = new Set(unitList.map(u => u.owner_id).filter(Boolean));
    const ownerNameMap = new Map<string, string>();
    if (ownerIdSet.size > 0) {
      const { data: ownerUsers } = await supabaseAdmin
        .from('users')
        .select('id, email')
        .in('id', [...ownerIdSet]);
      for (const u of (ownerUsers || [])) {
        ownerNameMap.set(u.id, u.email);
      }
    }

    const enriched = unitList.map((unit: { id: string; owner_id: string | null }) => ({
      ...unit,
      member_count: memberCountMap.get(unit.id) || 0,
      brand_count: brandCountMap.get(unit.id) || 0,
      owner_name: unit.owner_id ? (ownerNameMap.get(unit.owner_id) || null) : null,
    }));

    res.json({ success: true, data: enriched });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/v1/units/stats ──────────────────────────────────────────────────

export const getUnitStats = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const workspaceId = req.user?.workspace_id;
    const isSuperAdmin = req.user?.is_superadmin;

    if (!isSuperAdmin && !workspaceId) {
      return res.status(403).json({ error: 'Workspace context missing' });
    }

    let baseQuery = supabaseAdmin.from('business_units').select('id, status, owner_id', { count: 'exact', head: false });

    if (!isSuperAdmin) {
      baseQuery = baseQuery.eq('workspace_id', workspaceId);
    }

    const { data: all } = await baseQuery;
    const total = all?.length ?? 0;
    const active = all?.filter(u => u.status === 'ACTIVE').length ?? 0;
    const archived = all?.filter(u => u.status === 'ARCHIVED').length ?? 0;
    const noOwner = all?.filter(u => u.status === 'ACTIVE' && !u.owner_id).length ?? 0;

    let totalMembers = 0;
    if (all && all.length > 0) {
      const ids = all.map(u => u.id);
      const { data: memberCounts } = await supabaseAdmin
        .from('business_unit_members')
        .select('business_unit_id')
        .in('business_unit_id', ids);
      totalMembers = memberCounts?.length ?? 0;
    }

    res.json({
      success: true,
      data: { total, active, archived, noOwner, totalMembers },
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/v1/units/:id ────────────────────────────────────────────────────

export const getUnit = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const workspaceId = req.user?.workspace_id;
    const isSuperAdmin = req.user?.is_superadmin;
    const id = req.params.id as string;

    let query = supabaseAdmin
      .from('business_units')
      .select('*')
      .eq('id', id);

    if (!isSuperAdmin) {
      query = query.eq('workspace_id', workspaceId);
    }

    const { data: unit, error } = await query.single();
    if (error) return res.status(404).json({ error: 'Business unit not found' });

    let owner_name: string | null = null;
    if (unit.owner_id) {
      const { data: ownerUser } = await supabaseAdmin
        .from('users')
        .select('email')
        .eq('id', unit.owner_id)
        .single();
      if (ownerUser) owner_name = ownerUser.email;
    }

    res.json({ success: true, data: { ...unit, owner_name } });
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/v1/units ───────────────────────────────────────────────────────

export const createUnit = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const workspaceId = req.user?.workspace_id;
    const isSuperAdmin = req.user?.is_superadmin;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!isSuperAdmin && !workspaceId) {
      return res.status(403).json({ error: 'Workspace context missing' });
    }

    const { name, description, color, unit_type, owner_id, parent_id } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });

    const finalWorkspaceId = isSuperAdmin ? (req.body.target_workspace_id || workspaceId) : workspaceId;
    if (!finalWorkspaceId) return res.status(400).json({ error: 'Workspace required' });

    const { data, error } = await supabaseAdmin
      .from('business_units')
      .insert({
        workspace_id: finalWorkspaceId,
        name: name.trim(),
        description: description?.trim() || null,
        color: color || '#6366f1',
        unit_type: unit_type || 'department',
        owner_id: owner_id || null,
        parent_id: parent_id || null,
        status: 'ACTIVE',
        created_by: userId,
      })
      .select('*')
      .single();

    if (error) throw error;

    await logActivity(
      data.id, finalWorkspaceId, userId, req.user?.email || 'unknown', req.user?.role || 'unknown',
      'unit.created', `Created business unit "${name.trim()}"`,
      {}, { name: name.trim(), unit_type: unit_type || 'department' },
    );

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// ─── PUT /api/v1/units/:id ────────────────────────────────────────────────────

export const updateUnit = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const workspaceId = req.user?.workspace_id;
    const isSuperAdmin = req.user?.is_superadmin;
    const id = req.params.id as string;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    let query = supabaseAdmin.from('business_units').select('*').eq('id', id);
    if (!isSuperAdmin) query = query.eq('workspace_id', workspaceId);

    const { data: existing, error: fetchError } = await query.single();
    if (fetchError || !existing) return res.status(404).json({ error: 'Business unit not found' });

    const allowedFields = ['name', 'description', 'color', 'unit_type', 'owner_id', 'parent_id'];
    const updates: Record<string, unknown> = {};
    const beforeState: Record<string, unknown> = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        beforeState[field] = existing[field];
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    updates.updated_by = userId;

    const { data, error } = await supabaseAdmin
      .from('business_units')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;

    const changedFields = Object.keys(updates).filter(k => k !== 'updated_by').join(', ');
    await logActivity(
      id, existing.workspace_id, userId, req.user?.email || 'unknown', req.user?.role || 'unknown',
      'unit.updated', `Updated ${changedFields}`,
      beforeState, updates,
    );

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/v1/units/:id/archive ───────────────────────────────────────────

export const archiveUnit = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const workspaceId = req.user?.workspace_id;
    const isSuperAdmin = req.user?.is_superadmin;
    const id = req.params.id as string;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    let query = supabaseAdmin.from('business_units').select('*').eq('id', id);
    if (!isSuperAdmin) query = query.eq('workspace_id', workspaceId);

    const { data: existing, error: fetchError } = await query.single();
    if (fetchError || !existing) return res.status(404).json({ error: 'Business unit not found' });

    if (existing.status === 'ARCHIVED') {
      return res.status(400).json({ error: 'Business unit is already archived' });
    }

    // Archive instead of hard-delete
    const { data, error } = await supabaseAdmin
      .from('business_units')
      .update({
        status: 'ARCHIVED',
        archived_at: new Date().toISOString(),
        archived_by: userId,
        updated_by: userId,
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;

    await logActivity(
      id, existing.workspace_id, userId, req.user?.email || 'unknown', req.user?.role || 'unknown',
      'unit.archived', `Archived business unit "${existing.name}"`,
      { status: existing.status }, { status: 'ARCHIVED' },
    );

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// ─── DELETE /api/v1/units/:id ─────────────────────────────────────────────────

export const deleteUnit = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const workspaceId = req.user?.workspace_id;
    const isSuperAdmin = req.user?.is_superadmin;
    const id = req.params.id as string;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    let query = supabaseAdmin.from('business_units').select('*').eq('id', id);
    if (!isSuperAdmin) query = query.eq('workspace_id', workspaceId);

    const { data: existing, error: fetchError } = await query.single();
    if (fetchError || !existing) return res.status(404).json({ error: 'Business unit not found' });

    // If has campaigns or evidence, archive instead
    const hasDependentData = await checkCampaignsOrEvidence(id);
    if (hasDependentData) {
      const { data, error } = await supabaseAdmin
        .from('business_units')
        .update({
          status: 'ARCHIVED',
          archived_at: new Date().toISOString(),
          archived_by: userId,
          updated_by: userId,
        })
        .eq('id', id)
        .select('*')
        .single();

      if (error) throw error;

      await logActivity(
        id, existing.workspace_id, userId, req.user?.email || 'unknown', req.user?.role || 'unknown',
        'unit.archived', `Archived business unit "${existing.name}" (had campaigns/evidence)`,
        { status: existing.status }, { status: 'ARCHIVED', reason: 'has_dependent_data' },
      );

      return res.json({ success: true, data, archived: true, reason: 'Unit has campaigns or evidence — archived instead of deleted' });
    }

    // Hard-delete only if no dependent data
    const { error: deleteError } = await supabaseAdmin
      .from('business_units')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;

    res.json({ success: true, message: 'Business unit permanently deleted.' });
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/v1/units/:id/restore ───────────────────────────────────────────

export const restoreUnit = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const workspaceId = req.user?.workspace_id;
    const isSuperAdmin = req.user?.is_superadmin;
    const id = req.params.id as string;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    let query = supabaseAdmin.from('business_units').select('*').eq('id', id);
    if (!isSuperAdmin) query = query.eq('workspace_id', workspaceId);

    const { data: existing, error: fetchError } = await query.single();
    if (fetchError || !existing) return res.status(404).json({ error: 'Business unit not found' });

    if (existing.status !== 'ARCHIVED') {
      return res.status(400).json({ error: 'Only archived units can be restored' });
    }

    const { data, error } = await supabaseAdmin
      .from('business_units')
      .update({
        status: 'ACTIVE',
        archived_at: null,
        archived_by: null,
        updated_by: userId,
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;

    await logActivity(
      id, existing.workspace_id, userId, req.user?.email || 'unknown', req.user?.role || 'unknown',
      'unit.restored', `Restored business unit "${existing.name}"`,
      { status: existing.status }, { status: 'ACTIVE' },
    );

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// ─── Members ──────────────────────────────────────────────────────────────────

export const getUnitMembers = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const workspaceId = req.user?.workspace_id;
    const isSuperAdmin = req.user?.is_superadmin;
    const id = req.params.id as string;

    if (!isSuperAdmin && !workspaceId) {
      return res.status(403).json({ error: 'Workspace context missing' });
    }

    const { data, error } = await supabaseAdmin
      .from('business_unit_members')
      .select(`
        id, role_in_unit, assigned_at,
        member_id,
        workspace_members!inner(id, role, user_id)
      `)
      .eq('business_unit_id', id);

    if (error) throw error;

    // Enrich with user info
    const enriched = await Promise.all((data || []).map(async (m) => {
      const userId = (m.workspace_members as unknown as { user_id: string })?.user_id;
      let userName = 'Unknown';
      let userEmail = '';
      if (userId) {
        const { data: user } = await supabaseAdmin
          .from('users')
          .select('email')
          .eq('id', userId)
          .single();
        if (user) {
          userEmail = user.email;
          userName = user.email?.split('@')[0] ?? 'Unknown';
        }
      }
      return {
        id: m.id,
        member_id: m.member_id,
        role_in_unit: m.role_in_unit,
        assigned_at: m.assigned_at,
        user_id: userId,
        user_email: userEmail,
        user_name: userName,
        workspace_role: (m.workspace_members as unknown as { role: string })?.role,
      };
    }));

    res.json({ success: true, data: enriched });
  } catch (error) {
    next(error);
  }
};

export const addUnitMember = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const workspaceId = req.user?.workspace_id;
    const id = req.params.id as string;
    const { member_id, role_in_unit } = req.body;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!member_id) return res.status(400).json({ error: 'member_id is required' });

    const { data, error } = await supabaseAdmin
      .from('business_unit_members')
      .insert({
        business_unit_id: id,
        member_id,
        role_in_unit: role_in_unit || 'member',
        assigned_by: userId,
      })
      .select('*')
      .single();

    if (error) {
      if (error.code === '23505') return res.status(409).json({ error: 'Member already assigned to this unit' });
      throw error;
    }

    await logActivity(
      id, workspaceId!, userId, req.user?.email || 'unknown', req.user?.role || 'unknown',
      'unit.member.added', `Added member ${member_id} to unit`,
      {}, { member_id, role_in_unit: role_in_unit || 'member' },
    );

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const removeUnitMember = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const workspaceId = req.user?.workspace_id;
    const id = req.params.id as string;
    const memberId = req.params.memberId as string;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { error } = await supabaseAdmin
      .from('business_unit_members')
      .delete()
      .eq('business_unit_id', id)
      .eq('member_id', memberId);

    if (error) throw error;

    await logActivity(
      id, workspaceId!, userId, req.user?.email || 'unknown', req.user?.role || 'unknown',
      'unit.member.removed', `Removed member ${memberId} from unit`,
      { member_id: memberId }, {},
    );

    res.json({ success: true, message: 'Member removed from unit.' });
  } catch (error) {
    next(error);
  }
};

// ─── Brands ───────────────────────────────────────────────────────────────────

export const getUnitBrands = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;

    const { data, error } = await supabaseAdmin
      .from('business_unit_brands')
      .select('*')
      .eq('business_unit_id', id);

    if (error) throw error;

    res.json({ success: true, data: data || [] });
  } catch (error) {
    next(error);
  }
};

export const linkUnitBrand = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const workspaceId = req.user?.workspace_id;
    const id = req.params.id as string;
    const { brand_id } = req.body;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!brand_id) return res.status(400).json({ error: 'brand_id is required' });

    const { data, error } = await supabaseAdmin
      .from('business_unit_brands')
      .insert({
        business_unit_id: id,
        brand_id,
        linked_by: userId,
      })
      .select('*')
      .single();

    if (error) {
      if (error.code === '23505') return res.status(409).json({ error: 'Brand already linked to this unit' });
      throw error;
    }

    await logActivity(
      id, workspaceId!, userId, req.user?.email || 'unknown', req.user?.role || 'unknown',
      'unit.brand.linked', `Linked brand ${brand_id} to unit`,
      {}, { brand_id },
    );

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const unlinkUnitBrand = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const workspaceId = req.user?.workspace_id;
    const id = req.params.id as string;
    const brandId = req.params.brandId as string;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { error } = await supabaseAdmin
      .from('business_unit_brands')
      .delete()
      .eq('business_unit_id', id)
      .eq('brand_id', brandId);

    if (error) throw error;

    await logActivity(
      id, workspaceId!, userId, req.user?.email || 'unknown', req.user?.role || 'unknown',
      'unit.brand.unlinked', `Unlinked brand ${brandId} from unit`,
      { brand_id: brandId }, {},
    );

    res.json({ success: true, message: 'Brand unlinked from unit.' });
  } catch (error) {
    next(error);
  }
};

// ─── Activity Log ─────────────────────────────────────────────────────────────

export const getUnitActivity = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const workspaceId = req.user?.workspace_id;
    const isSuperAdmin = req.user?.is_superadmin;
    const id = req.params.id as string;

    let query = supabaseAdmin
      .from('business_unit_activity_log')
      .select('*')
      .eq('business_unit_id', id)
      .order('created_at', { ascending: false })
      .limit(100);

    if (!isSuperAdmin && workspaceId) {
      query = query.eq('workspace_id', workspaceId);
    }

    const { data, error } = await query;
    if (error) throw error;

    res.json({ success: true, data: data || [] });
  } catch (error) {
    next(error);
  }
};

// ─── Evidence Scope ───────────────────────────────────────────────────────────

export const getUnitEvidenceScope = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;

    const { data, error } = await supabaseAdmin
      .from('business_unit_evidence_scope')
      .select('*')
      .eq('business_unit_id', id);

    if (error) throw error;

    res.json({ success: true, data: data || [] });
  } catch (error) {
    next(error);
  }
};

export const setUnitEvidenceScope = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const workspaceId = req.user?.workspace_id;
    const id = req.params.id as string;
    const { evidence_id, scope_type } = req.body;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!evidence_id) return res.status(400).json({ error: 'evidence_id is required' });

    const { data, error } = await supabaseAdmin
      .from('business_unit_evidence_scope')
      .upsert({
        business_unit_id: id,
        evidence_id,
        scope_type: scope_type || 'restricted',
        linked_by: userId,
      }, { onConflict: 'business_unit_id,evidence_id' })
      .select('*')
      .single();

    if (error) throw error;

    await logActivity(
      id, workspaceId!, userId, req.user?.email || 'unknown', req.user?.role || 'unknown',
      'unit.evidence.scoped', `Set evidence scope for ${evidence_id} to ${scope_type || 'restricted'}`,
      {}, { evidence_id, scope_type: scope_type || 'restricted' },
    );

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const deleteUnitEvidenceScope = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const workspaceId = req.user?.workspace_id;
    const id = req.params.id as string;
    const scopeId = req.params.scopeId as string;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { data: scope, error: fetchError } = await supabaseAdmin
      .from('business_unit_evidence_scope')
      .select('evidence_id, scope_type')
      .eq('id', scopeId)
      .eq('business_unit_id', id)
      .single();

    if (fetchError) return res.status(404).json({ error: 'Evidence scope not found' });

    const { error: deleteError } = await supabaseAdmin
      .from('business_unit_evidence_scope')
      .delete()
      .eq('id', scopeId);

    if (deleteError) throw deleteError;

    await logActivity(
      id, workspaceId!, userId, req.user?.email || 'unknown', req.user?.role || 'unknown',
      'unit.evidence.scoped', `Removed evidence scope for ${scope.evidence_id}`,
      {}, { evidence_id: scope.evidence_id },
    );

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

// ─── Available members for assignment ─────────────────────────────────────────

export const getAvailableMembers = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const workspaceId = req.user?.workspace_id;
    const isSuperAdmin = req.user?.is_superadmin;

    if (!isSuperAdmin && !workspaceId) {
      return res.status(403).json({ error: 'Workspace context missing' });
    }

    const id = req.params.id as string;

    // Get all workspace members
    let memberQuery = supabaseAdmin
      .from('workspace_members')
      .select('id, role, user_id');

    if (!isSuperAdmin) {
      memberQuery = memberQuery.eq('workspace_id', workspaceId);
    }

    const { data: allMembers, error: memberError } = await memberQuery;
    if (memberError) throw memberError;

    // Get existing unit members
    const { data: existingMembers } = await supabaseAdmin
      .from('business_unit_members')
      .select('member_id')
      .eq('business_unit_id', id);

    const existingIds = new Set((existingMembers || []).map(m => m.member_id));

    // Filter out already assigned members
    const available = (allMembers || []).filter(m => !existingIds.has(m.id));

    // Enrich with user info
    const enriched = await Promise.all(available.map(async (m) => {
      const { data: user } = await supabaseAdmin
        .from('users')
        .select('email')
        .eq('id', m.user_id)
        .single();
      return {
        id: m.id,
        user_id: m.user_id,
        workspace_role: m.role,
        user_email: user?.email ?? 'Unknown',
        user_name: user?.email?.split('@')[0] ?? 'Unknown',
      };
    }));

    res.json({ success: true, data: enriched });
  } catch (error) {
    next(error);
  }
};
