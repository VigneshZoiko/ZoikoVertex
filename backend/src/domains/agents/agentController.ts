import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../../shared/supabase';
import { logToDatabase } from '../../shared/databaseLogger';
import { AuthRequest } from '../../shared/authMiddleware';
import { getAgentCapabilities as fetchAgentCapabilities } from '../../services/agentCapability.service';
import { getAgentVersions as fetchAgentVersions, rollbackAgentVersion as doRollback } from '../../services/agentVersion.service';
import { runSandboxTests, getSandboxTestHistory } from '../../services/agentSandbox.service';
import { getAgentLinkedResources as fetchAgentLinkedResources, updateAgentLinkedResources as modifyAgentLinkedResources, getActivationChecklist as fetchActivationChecklist } from '../../services/agentLinkedResources.service';
import { getEvidenceBundles as fetchEvidenceBundles, getEvidenceBundle as fetchEvidenceBundle } from '../../services/agentEvidence.service';

const AGENT_SERVICE = 'AgentStudio';

export const MODE_TO_AUTONOMY: Record<string, string> = {
  draft_only: 'L0',
  recommend_only: 'L1',
  shadow: 'L2',
  human_approval_required: 'L3',
  limited_autonomy: 'L4',
};

export const approveAgent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params as { id: string };
    const { approval_id, notes } = req.body as { approval_id?: string; notes?: string };
    const userId = (req as AuthRequest).user?.id;
    const userRole = (req as AuthRequest).user?.role;

    await logToDatabase('info', AGENT_SERVICE, `Approval action on agent ${id}`, { approval_id, notes, userRole });

    if (!approval_id) {
      return res.status(400).json({ success: false, message: 'approval_id is required' });
    }

    let updatedAgent: unknown = null;

    try {
      const { data: approval, error: approvalError } = await supabaseAdmin
        .from('agent_approvals')
        .update({ status: 'APPROVED', reviewed_by: userId, reviewed_at: new Date().toISOString(), notes })
        .eq('id', approval_id)
        .eq('approver_role', userRole?.toUpperCase().replace(/\s+/g, '_'))
        .select()
        .single();

      if (approvalError) throw approvalError;

      if (!approval) {
        return res.status(403).json({ success: false, message: `You are not the assigned approver for this role.` });
      }

      const { data: pendingApprovals } = await supabaseAdmin
        .from('agent_approvals')
        .select('id')
        .eq('agent_id', id)
        .eq('status', 'PENDING');

      const allApproved = !pendingApprovals || pendingApprovals.length === 0;

      if (allApproved) {
        const { data: updated } = await supabaseAdmin
          .from('agents')
          .update({ status: 'APPROVED', updated_at: new Date().toISOString() })
          .eq('id', id)
          .select()
          .single();
        updatedAgent = updated;

        const { createAgentVersion } = await import('../../services/agentVersion.service');
        if (userId) {
          await createAgentVersion(id, userId, 'Agent approved', `All approvers approved. Agent moved to APPROVED state.`);
        }
      }
    } catch (dbErr) {
      await logToDatabase('warn', AGENT_SERVICE, `Approval table not available`, { error: dbErr });
    }

    await logToDatabase('info', AGENT_SERVICE, `Agent ${id} approval confirmed by ${userRole}`, { approval_id });

    res.status(200).json({
      success: true,
      message: updatedAgent ? 'Agent fully approved and ready for deployment.' : 'Approval recorded. Waiting for remaining approvers.',
      data: updatedAgent,
    });
  } catch (error) {
    next(error);
  }
};

export const rejectAgentApproval = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params as { id: string };
    const { approval_id, notes } = req.body as { approval_id?: string; notes?: string };
    const userId = (req as AuthRequest).user?.id;
    const userRole = (req as AuthRequest).user?.role;

    await logToDatabase('info', AGENT_SERVICE, `Agent ${id} rejected by ${userRole}`, { approval_id, notes });

    try {
      if (approval_id) {
        await supabaseAdmin
          .from('agent_approvals')
          .update({ status: 'REJECTED', reviewed_by: userId, reviewed_at: new Date().toISOString(), notes })
          .eq('id', approval_id)
          .eq('approver_role', userRole?.toUpperCase().replace(/\s+/g, '_'));
      }
    } catch {
      // Non-blocking
    }

    const { data: updated } = await supabaseAdmin
      .from('agents')
      .update({ status: 'DRAFT', updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    const { createAgentVersion } = await import('../../services/agentVersion.service');
    if (userId) {
      await createAgentVersion(id, userId, 'Approval rejected', `Agent rejected by ${userRole}. ${notes || 'No reason provided.'}`);
    }

    res.status(200).json({
      success: true,
      message: 'Agent approval rejected. Agent returned to DRAFT state.',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

export const updateRuntimeControls = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params as { id: string };
    const {
      rate_limit,
      token_budget,
      retry_policy,
      environment,
      channel_scope,
      escalation_owner,
      schedule,
    } = req.body as {
      rate_limit?: number;
      token_budget?: number;
      retry_policy?: number;
      environment?: string;
      channel_scope?: string[];
      escalation_owner?: string;
      schedule?: string;
    };
    const userId = (req as AuthRequest).user?.id;

    const runtime_controls = {
      rate_limit: rate_limit || 50,
      token_budget: token_budget || 10000,
      retry_policy: retry_policy || 3,
      environment: environment || 'production',
      channel_scope: channel_scope || [],
      escalation_owner: escalation_owner || null,
      schedule: schedule || null,
    };

    const { data: agent, error } = await supabaseAdmin
      .from('agents')
      .update({
        runtime_controls,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    const { createAgentVersion } = await import('../../services/agentVersion.service');
    if (userId) {
      await createAgentVersion(id, userId, 'Runtime controls updated', 'Updated rate limits, token budget, and runtime policies');
    }

    await logToDatabase('info', AGENT_SERVICE, `Runtime controls updated for agent ${id}`, runtime_controls);

    res.status(200).json({
      success: true,
      message: 'Runtime controls updated.',
      data: agent,
      runtime_controls,
    });
  } catch (error) {
    next(error);
  }
};

const CreateAgentSchema = z.object({
  name: z.string().min(3),
  purpose: z.string().optional(),
  type: z.string(),
  mode: z.string().optional().default('draft_only'),
  risk_level: z.string().optional().default('medium'),
  workspace_id: z.string(),
  org_id: z.string(),
  primary_dri_id: z.string(),
  backup_dri_id: z.string().optional(),
  assigned_brand: z.string().optional(),
  permitted_actions: z.array(z.string()).default([]),
  prohibited_actions: z.array(z.string()).default([]),
  linked_prompts: z.array(z.string()).default([]),
  linked_workflows: z.array(z.string()).default([]),
  linked_policies: z.array(z.string()).default([]),
  linked_knowledge_sources: z.array(z.string()).default([]),
  linked_channels: z.array(z.string()).default([]),
  evidence_required: z.boolean().default(true),
  approval_required: z.boolean().default(true),
});

export const cloneAgent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params as { id: string };
    const userId = (req as AuthRequest).user?.id;
    
    const { data: original, error: fetchError } = await supabaseAdmin
      .from('agents')
      .select('*')
      .eq('id', id)
      .single();
    
    if (fetchError) throw fetchError;
    
    const cloned = {
      name: `${original.name} (Copy)`,
      type: original.type,
      status: 'DRAFT',
      autonomy_level: 'L0',
      risk_level: original.risk_level,
      workspace_id: original.workspace_id,
      org_id: original.org_id,
      primary_dri_id: userId || original.primary_dri_id,
      backup_dri_id: null,
      assigned_brand: original.assigned_brand,
      markets: original.markets || [],
      permitted_actions: original.permitted_actions || [],
      prohibited_actions: original.prohibited_actions || [],
      linked_prompts: original.linked_prompts || [],
      linked_workflows: original.linked_workflows || [],
      linked_policies: original.linked_policies || [],
      linked_knowledge_sources: original.linked_knowledge_sources || [],
      linked_channels: original.linked_channels || [],
      evidence_required: original.evidence_required ?? true,
      approval_required: original.approval_required ?? true,
      trust_score: 0,
      faithfulness_score: 0,
    };
    
    const { data: newAgent, error: createError } = await supabaseAdmin
      .from('agents')
      .insert([cloned])
      .select()
      .single();
    
    if (createError) throw createError;
    
    const { createAgentVersion } = await import('../../services/agentVersion.service');
    if (userId) {
      await createAgentVersion(newAgent.id, userId, 'Agent cloned', `Cloned from agent ${id}`);
    }
    
    await logToDatabase('info', AGENT_SERVICE, `Agent ${id} cloned to ${newAgent.id}`, { originalId: id, cloneId: newAgent.id });
    
    res.status(201).json({
      success: true,
      message: 'Agent cloned successfully as new draft.',
      data: newAgent,
    });
  } catch (error) {
    next(error);
  }
};

export const deployAgent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params as { id: string };
    const { environment = 'production' } = req.body as { environment?: string };
    const userId = (req as AuthRequest).user?.id;
    let deploymentId: string | null = null;
    
    await logToDatabase('info', AGENT_SERVICE, `Deploying agent ${id} to ${environment}`, { environment });
    
    const { data: agent, error: fetchError } = await supabaseAdmin
      .from('agents')
      .select('*')
      .eq('id', id)
      .single();
    
    if (fetchError) throw fetchError;
    
    if (agent.status !== 'APPROVED' && agent.status !== 'ACTIVE') {
      return res.status(400).json({
        success: false,
        message: `Cannot deploy agent in ${agent.status} state. Agent must be in APPROVED or ACTIVE state.`,
      });
    }
    
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('agents')
      .update({
        status: 'ACTIVE',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();
    
    if (updateError) throw updateError;
    
    try {
      const { data: deployment, error: deployError } = await supabaseAdmin
        .from('agent_deployments')
        .insert([{
          agent_id: id,
          environment,
          status: 'DEPLOYED',
          deployed_by: userId,
          deployed_at: new Date().toISOString(),
          deployment_notes: `Deployed to ${environment} via Agent Studio`,
        }])
        .select()
        .single();
      if (deployError) throw deployError;
      deploymentId = deployment?.id || null;
    } catch (deployErr) {
      await logToDatabase('warn', AGENT_SERVICE, `Deployment record not written — table may not exist yet`, { error: deployErr });
    }
    
    const { createAgentVersion } = await import('../../services/agentVersion.service');
    if (userId) {
      await createAgentVersion(id, userId, `Deployed to ${environment}`, `Agent deployed to ${environment} environment`);
    }
    
    await logToDatabase('info', AGENT_SERVICE, `Agent ${id} deployed to ${environment}`, { environment, deployment_id: deploymentId });
    
    res.status(200).json({
      success: true,
      message: `Agent deployed to ${environment}.`,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

export const pauseAgent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params as { id: string };
    const { reason } = req.body as { reason?: string };
    const userId = (req as AuthRequest).user?.id;

    const { data: agent, error: fetchError } = await supabaseAdmin
      .from('agents')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    if (!['ACTIVE', 'APPROVED', 'IN_REVIEW'].includes(agent.status)) {
      return res.status(400).json({
        success: false,
        message: `Agent in ${agent.status} state cannot be paused.`,
      });
    }

    const { data: updated, error } = await supabaseAdmin
      .from('agents')
      .update({
        status: 'PAUSED',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    try {
      await supabaseAdmin
        .from('agent_deployments')
        .insert([{
          agent_id: id,
          environment: agent.runtime_controls?.environment || 'production',
          status: 'PAUSED',
          deployed_by: userId,
          deployed_at: new Date().toISOString(),
          deployment_notes: reason || 'Paused from Agent Studio',
        }]);
    } catch (deployErr) {
      await logToDatabase('warn', AGENT_SERVICE, 'Pause deployment record not written', { error: deployErr });
    }

    const { createAgentVersion } = await import('../../services/agentVersion.service');
    if (userId) {
      await createAgentVersion(id, userId, 'Agent paused', reason || 'Agent paused from Agent Studio');
    }

    await logToDatabase('info', AGENT_SERVICE, `Agent ${id} paused`, { reason });

    res.status(200).json({
      success: true,
      message: 'Agent paused successfully.',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

export const resumeAgent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params as { id: string };
    const { reason } = req.body as { reason?: string };
    const userId = (req as AuthRequest).user?.id;
    
    const { data: agent, error: fetchError } = await supabaseAdmin
      .from('agents')
      .select('*')
      .eq('id', id)
      .single();
    
    if (fetchError) throw fetchError;
    
    if (agent.status !== 'PAUSED') {
      return res.status(400).json({
        success: false,
        message: 'Agent must be in PAUSED state to resume.',
      });
    }
    
    const { data: updated, error } = await supabaseAdmin
      .from('agents')
      .update({
        status: 'ACTIVE',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    const { createAgentVersion } = await import('../../services/agentVersion.service');
    if (userId) {
      await createAgentVersion(id, userId, 'Agent resumed', reason || 'Agent resumed from paused state');
    }
    
    await logToDatabase('info', AGENT_SERVICE, `Agent ${id} resumed`, { reason });
    
    res.status(200).json({
      success: true,
      message: 'Agent resumed and is now active.',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

export const retireAgent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params as { id: string };
    const { reason } = req.body as { reason?: string };
    const userId = (req as AuthRequest).user?.id;
    
    const { data: agent, error: fetchError } = await supabaseAdmin
      .from('agents')
      .select('*')
      .eq('id', id)
      .single();
    
    if (fetchError) throw fetchError;
    
    if (agent.status === 'RETIRED') {
      return res.status(400).json({
        success: false,
        message: 'Agent is already retired.',
      });
    }
    
    const { data: updated, error } = await supabaseAdmin
      .from('agents')
      .update({
        status: 'RETIRED',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;

    try {
      await supabaseAdmin.from('agent_incidents').insert([{
        agent_id: id,
        severity: 'INFO',
        incident_type: 'RETIREMENT',
        description: reason || 'Agent retired from Agent Studio',
        status: 'CLOSED',
        owner_id: userId,
        remediation: 'Agent permanently retired. Clone to create new draft.',
        closed_at: new Date().toISOString(),
      }]);
    } catch (incErr) {
      await logToDatabase('warn', AGENT_SERVICE, `Retirement incident record not written — adding legacy fields to agent_incidents may be needed`, { error: incErr });
    }
    
    const { createAgentVersion } = await import('../../services/agentVersion.service');
    if (userId) {
      await createAgentVersion(id, userId, 'Agent retired', reason || 'Agent retired from Agent Studio');
    }
    
    await logToDatabase('info', AGENT_SERVICE, `Agent ${id} retired`, { reason });
    
    res.status(200).json({
      success: true,
      message: 'Agent retired. Record preserved for audit. Clone to create a new draft.',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

export const requestApproval = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params as { id: string };
    const { notes } = req.body as { notes?: string };
    const userId = (req as AuthRequest).user?.id;
    
    const { data: agent, error: fetchError } = await supabaseAdmin
      .from('agents')
      .select('*')
      .eq('id', id)
      .single();
    
    if (fetchError) throw fetchError;
    
    if (agent.status !== 'DRAFT') {
      return res.status(400).json({
        success: false,
        message: 'Only agents in DRAFT state can request approval.',
      });
    }
    
    const riskTier = agent.risk_level || 'medium';
    const agentType = agent.type || 'content';
    
    const APPROVAL_ROUTING: Record<string, { role: string; reason: string }[]> = {
      low: [{ role: 'CAMPAIGN_OWNER', reason: 'Standard approval for low-risk agents' }],
      medium: [
        { role: 'CAMPAIGN_OWNER', reason: 'Campaign owner must approve' },
        { role: 'GOVERNANCE_ADMIN', reason: 'AI governance lead must approve medium-risk agents' },
      ],
      high: [
        { role: 'CAMPAIGN_OWNER', reason: 'Campaign owner must approve' },
        { role: 'GOVERNANCE_ADMIN', reason: 'AI governance lead must approve high-risk agents' },
        { role: 'BRAND_GOVERNANCE', reason: 'Brand governance must approve brand voice and content posture' },
      ],
      critical: [
        { role: 'CAMPAIGN_OWNER', reason: 'Campaign owner must approve' },
        { role: 'GOVERNANCE_ADMIN', reason: 'AI governance lead must approve' },
        { role: 'BRAND_GOVERNANCE', reason: 'Brand governance must approve' },
        { role: 'COMPLIANCE_REVIEWER', reason: 'Compliance must review for regulated content' },
        { role: 'SECURITY_ADMIN', reason: 'Security admin must review tool permissions and API scopes' },
      ],
    };
    
    const approvers = APPROVAL_ROUTING[riskTier] || APPROVAL_ROUTING.medium;
    
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('agents')
      .update({
        status: 'IN_REVIEW',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();
    
    if (updateError) throw updateError;
    
    const approvalRequests = approvers.map(a => ({
      agent_id: id,
      approver_role: a.role,
      required_reason: a.reason,
      risk_tier: riskTier,
      agent_type: agentType,
      status: 'PENDING',
      requested_by: userId,
      requested_at: new Date().toISOString(),
      notes: notes || null,
    }));
    
    let requests: unknown[] = [];
    try {
      const result = await supabaseAdmin
        .from('agent_approvals')
        .insert(approvalRequests)
        .select();
      if (!result.error) requests = result.data || [];
    } catch (reqErr) {
      await logToDatabase('warn', AGENT_SERVICE, `Approval records not written — table may not exist yet`, { error: reqErr });
    }
    
    const { createAgentVersion } = await import('../../services/agentVersion.service');
    if (userId) {
      await createAgentVersion(id, userId, 'Approval requested', `Approval requested for ${riskTier} risk agent`);
    }
    
    await logToDatabase('info', AGENT_SERVICE, `Approval requested for agent ${id}`, {
      riskTier,
      approvers: approvers.map(a => a.role),
    });
    
    res.status(200).json({
      success: true,
      message: `Approval requested. ${approvers.length} approver(s) required.`,
      data: updated,
      approval_requests: requests,
      required_approvers: approvers,
    });
  } catch (error) {
    next(error);
  }
};

export const listAgents = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const isSuper = req.user?.is_superadmin;
    const userWorkspaceId = req.user?.workspace_id;
    const targetWorkspaceId = (req.query.workspaceId as string) || userWorkspaceId;
    const statusFilter = req.query.status as string;
    const riskFilter = req.query.risk_level as string;

    if (!targetWorkspaceId && !isSuper) {
      return res.status(400).json({ success: false, message: 'workspaceId is required' });
    }

    let query = supabaseAdmin
      .from('agents')
      .select(`
        *,
        primary_dri:users!primary_dri_id(full_name, email),
        backup_dri:users!backup_dri_id(full_name, email)
      `)
      .order('created_at', { ascending: false });

    if (!isSuper) {
      query = query.eq('workspace_id', targetWorkspaceId);
    } else if (req.query.workspaceId) {
      query = query.eq('workspace_id', req.query.workspaceId);
    }

    if (statusFilter) query = query.eq('status', statusFilter);
    if (riskFilter) query = query.eq('risk_level', riskFilter);

    const { data, error } = await query;
    if (error) throw error;

    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const getAgent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const { data: agent, error } = await supabaseAdmin
      .from('agents')
      .select(`
        *,
        primary_dri:users!primary_dri_id(full_name, email),
        backup_dri:users!backup_dri_id(full_name, email),
        artifacts:agent_artifacts(*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;

    res.status(200).json({ success: true, data: agent });
  } catch (error) {
    next(error);
  }
};

export const registerAgent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload = CreateAgentSchema.parse(req.body);
    const userId = (req as AuthRequest).user?.id;
    const mode = payload.mode || 'draft_only';
    const autonomyLevel = MODE_TO_AUTONOMY[mode] || 'L0';

    await logToDatabase('info', AGENT_SERVICE, `Registering agent: ${payload.name} in mode: ${mode} -> autonomy: ${autonomyLevel}`, { payload });

    const { data: agent, error } = await supabaseAdmin
      .from('agents')
      .insert([{
        name: payload.name,
        purpose: payload.purpose || null,
        type: payload.type,
        mode,
        workspace_id: payload.workspace_id,
        org_id: payload.org_id,
        primary_dri_id: payload.primary_dri_id,
        backup_dri_id: payload.backup_dri_id,
        assigned_brand: payload.assigned_brand,
        permitted_actions: payload.permitted_actions,
        prohibited_actions: payload.prohibited_actions,
        linked_prompts: payload.linked_prompts,
        linked_workflows: payload.linked_workflows,
        linked_policies: payload.linked_policies,
        linked_knowledge_sources: payload.linked_knowledge_sources,
        linked_channels: payload.linked_channels,
        evidence_required: payload.evidence_required,
        approval_required: payload.approval_required,
        status: 'DRAFT',
        autonomy_level: autonomyLevel,
        trust_score: 0.0,
        faithfulness_score: 0.0,
        risk_level: payload.risk_level || 'medium',
      }])
      .select()
      .single();

    if (error) throw error;

    if (userId) {
      const { createAgentVersion } = await import('../../services/agentVersion.service');
      await createAgentVersion(agent.id, userId, 'Agent created', 'Initial agent registration');
    }

    res.status(201).json({
      success: true,
      message: 'Agent registered successfully as DRAFT.',
      data: agent,
    });
  } catch (error) {
    next(error);
  }
};

export const certifyAgent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { level, evidence_score } = req.body;
    const userId = (req as AuthRequest).user?.id;

    await logToDatabase('info', AGENT_SERVICE, `Certifying agent ${id} to ${level}`, { level, evidence_score });

    const { data: agent, error: updateError } = await supabaseAdmin
      .from('agents')
      .update({
        autonomy_level: level,
        status: 'ACTIVE',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

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
        certified_at: new Date().toISOString(),
      }]);

    if (certError) throw certError;

    if (userId) {
      const { createAgentVersion } = await import('../../services/agentVersion.service');
      await createAgentVersion(id, userId, `Certified to ${level}`, `Agent certified from draft to ${level} autonomy level`);
    }

    res.status(200).json({
      success: true,
      message: `Agent successfully certified to ${level}.`,
      data: agent,
    });
  } catch (error) {
    next(error);
  }
};

export const updateAutonomy = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { autonomy_level } = req.body;
    const userId = (req as AuthRequest).user?.id;

    if (!['L0', 'L1', 'L2', 'L3', 'L4', 'L5', 'L6'].includes(autonomy_level)) {
      return res.status(400).json({ success: false, message: 'Invalid autonomy level. Valid: L0–L6' });
    }

    await logToDatabase('info', AGENT_SERVICE, `Manually updating agent ${id} autonomy to ${autonomy_level}`, { autonomy_level });

    const { data, error } = await supabaseAdmin
      .from('agents')
      .update({
        autonomy_level,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    if (userId) {
      const { createAgentVersion } = await import('../../services/agentVersion.service');
      await createAgentVersion(id, userId, `Autonomy update to ${autonomy_level}`, `Manually updated autonomy level to ${autonomy_level}`);
    }

    res.status(200).json({
      success: true,
      message: `Agent autonomy updated to ${autonomy_level}.`,
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const getAgentCapabilities = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const result = await fetchAgentCapabilities(id);
    res.status(200).json({ success: result.success, capabilities: result.capabilities });
  } catch (error) {
    next(error);
  }
};

export const getAgentVersions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const versions = await fetchAgentVersions(id);
    res.status(200).json({ success: true, versions });
  } catch (error) {
    next(error);
  }
};

export const rollbackAgent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params as { id: string };
    const { version_id } = req.body as { version_id: string };
    const userId = (req as AuthRequest).user?.id;

    if (!version_id) {
      return res.status(400).json({ success: false, message: 'version_id is required' });
    }

    const result = await doRollback(id, version_id, userId || 'system');
    res.status(200).json({ success: result.success, message: result.message });
  } catch (error) {
    next(error);
  }
};

export const runAgentSandbox = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params as { id: string };
    const { target_level, risk_level } = req.body as { target_level: string; risk_level?: string };

    if (!target_level) {
      return res.status(400).json({ success: false, message: 'target_level is required' });
    }

    const result = await runSandboxTests(id, target_level, risk_level || 'medium');
    if (!result.success) {
      return res.status(500).json({ success: false, message: 'Sandbox test failed' });
    }

    res.status(200).json({ success: true, ...result.result });
  } catch (error) {
    next(error);
  }
};

export const getAgentTestHistory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params as { id: string };
    const history = await getSandboxTestHistory(id);
    res.status(200).json({ success: true, tests: history });
  } catch (error) {
    next(error);
  }
};

export const getAgentLinkedResources = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params as { id: string };
    const resources = await fetchAgentLinkedResources(id);
    res.status(200).json({ success: true, resources });
  } catch (error) {
    next(error);
  }
};

export const updateLinkedResources = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params as { id: string };
    const { linked_prompts, linked_workflows, linked_policies, linked_knowledge_sources } = req.body;
    const userId = (req as AuthRequest).user?.id;

    const result = await modifyAgentLinkedResources(id, {
      linked_prompts,
      linked_workflows,
      linked_policies,
      linked_knowledge_sources,
    });

    if (result.success && userId) {
      const { createAgentVersion } = await import('../../services/agentVersion.service');
      await createAgentVersion(id, userId, 'Linked resources updated', 'Updated agent linked resources');
    }

    res.status(200).json({ success: result.success, message: result.message });
  } catch (error) {
    next(error);
  }
};

export const getChecklist = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params as { id: string };
    const checklist = await fetchActivationChecklist(id);
    res.status(200).json({ success: true, checklist });
  } catch (error) {
    next(error);
  }
};

export const getAgentEvidence = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params as { id: string };
    const bundles = await fetchEvidenceBundles(id);
    res.status(200).json({ success: true, evidence: bundles });
  } catch (error) {
    next(error);
  }
};

export const getEvidence = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { bundleId } = req.params as { bundleId: string };
    const bundle = await fetchEvidenceBundle(bundleId);
    if (!bundle) {
      return res.status(404).json({ success: false, message: 'Evidence bundle not found' });
    }
    res.status(200).json({ success: true, bundle });
  } catch (error) {
    next(error);
  }
};
