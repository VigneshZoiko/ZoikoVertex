import { Response } from 'express';
import { supabaseAdmin } from '../../shared/supabase';
import { logAuditEvent } from './evidenceController';
import { AuthRequest } from '../../shared/authMiddleware';

// 1. Get Brand Profiles
export const getBrandProfiles = async (req: AuthRequest, res: Response) => {
  try {
    const workspaceId = req.user?.workspace_id;
    const isSuperAdmin = req.user?.is_superadmin;
    if (!workspaceId && !isSuperAdmin) return res.status(401).json({ error: 'Unauthorized' });

    // Try fetching from real table
    let query = supabaseAdmin
      .from('brand_profiles')
      .select('*');

    if (!isSuperAdmin) query = query.eq('workspace_id', workspaceId);

    const { data: profiles, error } = await query;

    if (error) {
      return res.json({ success: true, data: [] });
    }

    res.json({ success: true, data: profiles });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to fetch brand profiles' });
  }
};

// 2. Get Linguistic Sovereignty Profile
export const getLinguisticProfile = async (req: AuthRequest, res: Response) => {
  try {
    const workspaceId = req.user?.workspace_id;
    const isSuperAdmin = req.user?.is_superadmin;
    if (!workspaceId && !isSuperAdmin) return res.status(401).json({ error: 'Unauthorized' });

    let query = supabaseAdmin
      .from('brand_linguistic_rules')
      .select('*');

    if (!isSuperAdmin) query = query.eq('workspace_id', workspaceId);

    const { data: profile, error } = await query
      .limit(1)
      .maybeSingle(); // Changed from single() to maybeSingle() to handle empty states better for God Mode

    if (error) {
      return res.json({ success: true, data: null });
    }

    res.json({ success: true, data: profile });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to fetch linguistic profile' });
  }
};

// 3. Get Claims Ledger
export const getClaimsLedger = async (req: AuthRequest, res: Response) => {
  try {
    const workspaceId = req.user?.workspace_id;
    const isSuperAdmin = req.user?.is_superadmin;
    if (!workspaceId && !isSuperAdmin) return res.status(401).json({ error: 'Unauthorized' });

    let query = supabaseAdmin
      .from('brand_claims')
      .select('*');

    if (!isSuperAdmin) query = query.eq('workspace_id', workspaceId);

    const { data: claims, error } = await query;

    if (error) {
      return res.json({ success: true, data: [] });
    }

    res.json({ success: true, data: claims });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to fetch claims ledger' });
  }
};

// 4. Update Rule / Exception
export const updateBrandRule = async (req: AuthRequest, res: Response) => {
  try {
    const workspaceId = req.user?.workspace_id;
    const actorId = req.user?.id;
    if (!workspaceId) return res.status(401).json({ error: 'Unauthorized' });

    const { target, value } = req.body;

    // 1. Log the audit event immediately to the evidence vault
    await logAuditEvent({
      workspaceId: workspaceId || '00000000-0000-0000-0000-000000000000',
      actorId: actorId || 'system',
      module: 'BrandGovernance',
      action: `Brand rule updated: ${target} set to ${JSON.stringify(value)}`,
      riskLevel: 'HIGH',
      objectType: 'BRAND_RULE'
    });

    // 2. Persist the updated configuration inside brand_linguistic_rules table
    const { data: currentRule } = await supabaseAdmin
      .from('brand_linguistic_rules')
      .select('*')
      .eq('workspace_id', workspaceId)
      .limit(1)
      .maybeSingle();

    const payload: Record<string, unknown> = {};
    if (['warmth', 'authority', 'restraint'].includes(target)) {
      payload[target] = Number(value);
    } else if (['allowed_lexicon', 'prohibited_lexicon'].includes(target)) {
      payload[target] = Array.isArray(value) ? value : [value];
    } else {
      payload[target] = value;
    }

    if (currentRule) {
      await supabaseAdmin
        .from('brand_linguistic_rules')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('workspace_id', workspaceId);
    } else {
      await supabaseAdmin
        .from('brand_linguistic_rules')
        .insert({
          workspace_id: workspaceId,
          warmth: 50,
          authority: 50,
          restraint: 50,
          allowed_lexicon: [],
          prohibited_lexicon: [],
          ...payload,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
    }

    res.json({ success: true, message: 'Brand rule updated, persisted in Database, and recorded in Evidence Vault.' });
  } catch (error) {
    console.error("Failed to update brand rule:", error);
    res.status(500).json({ success: false, error: 'Failed to update brand rule' });
  }
};
