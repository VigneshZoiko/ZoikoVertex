import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../../shared/supabase';
import { logToDatabase } from '../../shared/databaseLogger';
import { AuthRequest } from '../../shared/authMiddleware';

const AGENT_SERVICE = 'AgentStudio';

const CreateAgentSchema = z.object({
  name: z.string().min(3),
  type: z.string(),
  workspace_id: z.string().uuid(),
  org_id: z.string().uuid(),
  primary_dri_id: z.string().uuid(),
  backup_dri_id: z.string().uuid().optional(),
  assigned_brand: z.string().optional(),
  platforms: z.array(z.string()).default([]),
  markets: z.array(z.string()).default([]),
});

/**
 * List all agents for a given workspace
 */
export const listAgents = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const isSuper = req.user?.is_superadmin;
    const userWorkspaceId = req.user?.workspace_id;
    const targetWorkspaceId = (req.query.workspaceId as string) || userWorkspaceId;
    
    if (!targetWorkspaceId && !isSuper) {
      return res.status(400).json({ success: false, message: 'workspaceId is required' });
    }

    let query = supabaseAdmin
      .from('agents')
      .select('*')
      .order('created_at', { ascending: false });

    if (!isSuper) {
      query = query.eq('workspace_id', targetWorkspaceId);
    } else if (req.query.workspaceId) {
      query = query.eq('workspace_id', req.query.workspaceId);
    }

    const { data: agents, error } = await query;
    if (error) throw error;

    if (!agents || agents.length === 0) {
      return res.status(200).json({ success: true, data: [] });
    }

    // Step 2: Fetch details for primary_dri and backup_dri manually
    const driIds = [
      ...new Set([
        ...agents.map(a => a.primary_dri_id).filter(Boolean),
        ...agents.map(a => a.backup_dri_id).filter(Boolean)
      ])
    ];

    let userMap: Record<string, { full_name: string; email: string }> = {};
    if (driIds.length > 0) {
      const { data: users } = await supabaseAdmin
        .from('users')
        .select('id, full_name, email')
        .in('id', driIds);

      (users || []).forEach(u => {
        userMap[u.id] = { full_name: u.full_name, email: u.email };
      });
    }

    const merged = agents.map(agent => ({
      ...agent,
      primary_dri: userMap[agent.primary_dri_id] || null,
      backup_dri: userMap[agent.backup_dri_id] || null
    }));

    res.status(200).json({
      success: true,
      data: merged
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get details of a single agent
 */
export const getAgent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const { data: agent, error } = await supabaseAdmin
      .from('agents')
      .select(`*, artifacts:agent_artifacts(*)`)
      .eq('id', id)
      .single();

    if (error) throw error;

    if (agent) {
      const driIds = [agent.primary_dri_id, agent.backup_dri_id].filter(Boolean);
      let userMap: Record<string, { full_name: string; email: string }> = {};
      
      if (driIds.length > 0) {
        const { data: users } = await supabaseAdmin
          .from('users')
          .select('id, full_name, email')
          .in('id', driIds);

        (users || []).forEach(u => {
          userMap[u.id] = { full_name: u.full_name, email: u.email };
        });
      }

      agent.primary_dri = userMap[agent.primary_dri_id] || null;
      agent.backup_dri = userMap[agent.backup_dri_id] || null;
    }

    res.status(200).json({
      success: true,
      data: agent
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Register a new agent (Phase 2 - Hire Flow)
 */
export const registerAgent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload = CreateAgentSchema.parse(req.body);
    
    await logToDatabase('info', AGENT_SERVICE, `Registering new agent: ${payload.name}`, { payload });

    const { data, error } = await supabaseAdmin
      .from('agents')
      .insert([{
        ...payload,
        status: 'DRAFT',
        autonomy_level: 'L0',
        trust_score: 0.0,
        faithfulness_score: 0.0
      }])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      success: true,
      message: 'Agent registered successfully as DRAFT.',
      data
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Upgrade agent autonomy level after certification
 */
export const certifyAgent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { level, evidence_score } = req.body;

    await logToDatabase('info', AGENT_SERVICE, `Certifying agent ${id} to ${level}`, { level, evidence_score });

    // 1. Update the agent's autonomy level and status
    const { data: agent, error: updateError } = await supabaseAdmin
      .from('agents')
      .update({ 
        autonomy_level: level,
        status: 'ACTIVE',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    // 2. Create a certification record
    const { data: latestArtifact } = await supabaseAdmin
      .from('agent_artifacts')
      .select('id')
      .eq('agent_id', id)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle();

    const { error: certError } = await supabaseAdmin
      .from('agent_certifications')
      .insert([{
        agent_id: id,
        artifact_id: latestArtifact?.id || null,
        certified_level: level,
        status: 'VALID',
        evidence_vault_ref: `score:${evidence_score}`,
        certified_at: new Date().toISOString()
      }]);

    if (certError) throw certError;

    res.status(200).json({
      success: true,
      message: `Agent successfully certified to ${level}.`,
      data: agent
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Manually update agent autonomy level (Admin/Manager only)
 */
export const updateAutonomy = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { autonomy_level } = req.body;

    if (!['L0', 'L1', 'L2', 'L3', 'L4', 'L5', 'L6'].includes(autonomy_level)) {
      return res.status(400).json({ success: false, message: 'Invalid autonomy level. Valid: L0–L6' });
    }

    await logToDatabase('info', AGENT_SERVICE, `Manually updating agent ${id} autonomy to ${autonomy_level}`, { autonomy_level });

    const { data, error } = await supabaseAdmin
      .from('agents')
      .update({ 
        autonomy_level,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.status(200).json({
      success: true,
      message: `Agent autonomy updated to ${autonomy_level}.`,
      data
    });
  } catch (error) {
    next(error);
  }
};

