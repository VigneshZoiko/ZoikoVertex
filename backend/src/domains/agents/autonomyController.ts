import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../../shared/supabase';
import { AuthRequest } from '../../shared/authMiddleware';
import { logToDatabase } from '../../shared/databaseLogger';
import { randomUUID } from 'crypto';

// ─── Spec-aligned Level Definitions ──────────────────────────────────────────

export const AUTONOMY_LEVELS: Record<string, { name: string; minTrust: number }> = {
  L0: { name: 'Disabled',                    minTrust: 0  },
  L1: { name: 'Assistive Mode',              minTrust: 0  },
  L2: { name: 'Creative Contributor',        minTrust: 0  },
  L3: { name: 'Guided Execution',            minTrust: 60 },
  L4: { name: 'Validated Autonomy',          minTrust: 70 },
  L5: { name: 'Conditional Autonomy',        minTrust: 80 },
  L6: { name: 'Governed Enterprise Autonomy', minTrust: 90 },
};

// ─── In-Memory Stores (graceful fallback when DB tables not yet created) ─────

interface EmergencyLock {
  id: string;
  level: string;
  scope: string;
  reason: string;
  created_by: string;
  created_at: string;
  workspace_id: string;
}

interface HITLRule {
  id: string;
  trigger: string;
  action: string;
  route_to_role: string;
  enabled: boolean;
  workspace_id: string;
  created_at: string;
}

interface NegativeKnowledgeSet {
  id: string;
  name: string;
  prohibited_terms: string[];
  scope: string;
  severity: string;
  owner_role: string;
  workspace_id: string;
  created_at: string;
}

const lockStore = new Map<string, EmergencyLock>();
const hitlStore = new Map<string, HITLRule>();
const nksStore  = new Map<string, NegativeKnowledgeSet>();

// Default HITL rules pre-loaded per workspace (first access)
const DEFAULT_HITL_RULES: Omit<HITLRule, 'workspace_id'>[] = [
  { id: 'hitl-high-risk',       trigger: 'CONTENT_RISK_HIGH',       action: 'ROUTE_TO_REVIEW',     route_to_role: 'VALIDATOR',        enabled: true,  created_at: new Date().toISOString() },
  { id: 'hitl-restricted',      trigger: 'CONTENT_RISK_RESTRICTED',  action: 'GOVERNANCE_REVIEW',   route_to_role: 'GOVERNANCE_ADMIN', enabled: true,  created_at: new Date().toISOString() },
  { id: 'hitl-faithfulness',    trigger: 'FAITHFULNESS_BELOW_85',    action: 'BLOCK_AND_REMEDIATE', route_to_role: 'VALIDATOR',        enabled: true,  created_at: new Date().toISOString() },
  { id: 'hitl-trust-low',       trigger: 'TRUST_SCORE_BELOW_60',     action: 'SUSPEND_AGENT',       route_to_role: 'AGENT_ARCHITECT',  enabled: true,  created_at: new Date().toISOString() },
  { id: 'hitl-brand-risk',      trigger: 'BRAND_RISK_DETECTED',      action: 'ROUTE_TO_REVIEW',     route_to_role: 'BRAND_REVIEWER',   enabled: true,  created_at: new Date().toISOString() },
  { id: 'hitl-market-risk',     trigger: 'MARKET_RISK_DETECTED',     action: 'ESCALATE',            route_to_role: 'GOVERNANCE_ADMIN', enabled: false, created_at: new Date().toISOString() },
  { id: 'hitl-collusion',       trigger: 'COLLUSION_FLAG',           action: 'LOCK_WORKFLOW',       route_to_role: 'GOVERNANCE_ADMIN', enabled: true,  created_at: new Date().toISOString() },
];

function getWorkspaceHITLRules(workspaceId: string): HITLRule[] {
  const existing = [...hitlStore.values()].filter(r => r.workspace_id === workspaceId);
  if (existing.length > 0) return existing;
  // Seed defaults
  const defaults = DEFAULT_HITL_RULES.map(r => ({ ...r, workspace_id: workspaceId }));
  defaults.forEach(r => hitlStore.set(r.id + ':' + workspaceId, r));
  return defaults;
}

// ─── Validators ───────────────────────────────────────────────────────────────

const LevelChangeSchema = z.object({
  level:  z.enum(['L0','L1','L2','L3','L4','L5','L6']),
  reason: z.string().min(5).max(500),
});

const SuspendSchema = z.object({
  reason: z.string().min(5).max(500),
});

const LockSchema = z.object({
  lock_level: z.enum(['L1','L2','L3','L4']),
  scope:      z.string().min(3),
  reason:     z.string().min(10).max(1000),
});

const HITLRuleSchema = z.object({
  trigger:       z.string().min(3),
  action:        z.string().min(3),
  route_to_role: z.string().min(3),
  enabled:       z.boolean().default(true),
});

const NKSSchema = z.object({
  name:             z.string().min(3),
  prohibited_terms: z.array(z.string()).min(1),
  scope:            z.string().default('All'),
  severity:         z.enum(['BLOCK','ESCALATE','WARN','REQUIRE_APPROVAL']).default('BLOCK'),
  owner_role:       z.string().default('GOVERNANCE_ADMIN'),
});

// ─── Handlers ─────────────────────────────────────────────────────────────────

export const getAutonomyStats = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { data: member } = await supabaseAdmin
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', userId)
      .maybeSingle();

    const workspaceId = member?.workspace_id;

    let agentQuery = supabaseAdmin.from('agents').select('id, name, type, status, autonomy_level, trust_score, faithfulness_score');
    if (workspaceId) agentQuery = agentQuery.eq('workspace_id', workspaceId);
    const { data: agents } = await agentQuery;

    const stats = {
      total: 0, active: 0, supervised: 0, suspended: 0,
      avg_trust: 0, avg_faithfulness: 0,
      by_level: { L0: 0, L1: 0, L2: 0, L3: 0, L4: 0, L5: 0, L6: 0 },
      active_locks: lockStore.size,
    };

    for (const a of agents || []) {
      stats.total++;
      if (['ACTIVE', 'MONITORED'].includes(a.status)) stats.active++;
      if (a.status === 'SUPERVISED') stats.supervised++;
      if (['SUSPENDED', 'DEAUTHORIZED'].includes(a.status)) stats.suspended++;
      stats.avg_trust += (a.trust_score || 0);
      stats.avg_faithfulness += (a.faithfulness_score || 0);
      const lvl = (a.autonomy_level || 'L0') as keyof typeof stats.by_level;
      if (stats.by_level[lvl] !== undefined) stats.by_level[lvl]++;
    }

    if (stats.total > 0) {
      stats.avg_trust = Math.round((stats.avg_trust / stats.total) * 100);
      stats.avg_faithfulness = Math.round((stats.avg_faithfulness / stats.total) * 100);
    }

    res.json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
};

export const updateAgentLevel = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const { level, reason } = LevelChangeSchema.parse(req.body);
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { data: agent, error: fetchErr } = await supabaseAdmin
      .from('agents').select('name, trust_score, autonomy_level, status').eq('id', id).single();
    if (fetchErr || !agent) return res.status(404).json({ error: 'Agent not found' });

    // Trust score enforcement
    const trustPct = Math.round((agent.trust_score || 0) * 100);
    const required = AUTONOMY_LEVELS[level].minTrust;
    if (trustPct < required) {
      return res.status(403).json({
        error: `Trust score ${trustPct}% is below the minimum ${required}% required for ${level} (${AUTONOMY_LEVELS[level].name})`,
      });
    }

    // Determine status based on level
    let newStatus = agent.status;
    if (level === 'L0') newStatus = 'SUSPENDED';
    else if (agent.status === 'SUSPENDED') newStatus = 'ACTIVE';

    const { data: updated, error: updateErr } = await supabaseAdmin
      .from('agents')
      .update({ autonomy_level: level, status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (updateErr) throw updateErr;

    await logToDatabase('info', 'Autonomy', `Agent ${agent.name} level changed to ${level}`, { agentId: id, level, reason, userId, from: agent.autonomy_level });

    res.json({ success: true, data: updated, message: `Agent updated to ${level} — ${AUTONOMY_LEVELS[level].name}` });
  } catch (error) {
    next(error);
  }
};

export const suspendAgent = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const { reason } = SuspendSchema.parse(req.body);
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { data: agent, error: fetchErr } = await supabaseAdmin
      .from('agents').select('name').eq('id', id).single();
    if (fetchErr || !agent) return res.status(404).json({ error: 'Agent not found' });

    const { data: updated, error: updateErr } = await supabaseAdmin
      .from('agents')
      .update({ autonomy_level: 'L0', status: 'SUSPENDED', updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (updateErr) throw updateErr;

    await logToDatabase('warn', 'Autonomy', `Agent ${agent.name} SUSPENDED — ${reason}`, { agentId: id, reason, userId });

    res.json({ success: true, data: updated, message: `Agent ${agent.name} suspended` });
  } catch (error) {
    next(error);
  }
};

export const createEmergencyLock = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { lock_level, scope, reason } = LockSchema.parse(req.body);
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { data: member } = await supabaseAdmin.from('workspace_members').select('workspace_id').eq('user_id', userId).maybeSingle();

    const lock: EmergencyLock = {
      id: randomUUID(),
      level: lock_level,
      scope,
      reason,
      created_by: userId,
      created_at: new Date().toISOString(),
      workspace_id: member?.workspace_id || 'unknown',
    };
    lockStore.set(lock.id, lock);

    // If L3/L4 workspace lock, suspend all active agents
    if (['L3', 'L4'].includes(lock_level) && member?.workspace_id) {
      await supabaseAdmin.from('agents')
        .update({ status: 'SUSPENDED', updated_at: new Date().toISOString() })
        .eq('workspace_id', member.workspace_id)
        .eq('status', 'ACTIVE');
    }

    await logToDatabase('warn', 'Autonomy', `Emergency Lock ${lock_level} applied — ${scope}`, { lock, userId });

    res.status(201).json({ success: true, data: lock });
  } catch (error) {
    next(error);
  }
};

export const listEmergencyLocks = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { data: member } = await supabaseAdmin.from('workspace_members').select('workspace_id').eq('user_id', userId).maybeSingle();
    const { data: userCtx } = await supabaseAdmin.from('users').select('is_superadmin').eq('id', userId).single();

    const locks = [...lockStore.values()].filter(l =>
      userCtx?.is_superadmin || l.workspace_id === member?.workspace_id
    );

    res.json({ success: true, data: locks });
  } catch (error) {
    next(error);
  }
};

export const liftEmergencyLock = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const lock = lockStore.get(id);
    if (!lock) return res.status(404).json({ error: 'Lock not found' });

    lockStore.delete(id);

    await logToDatabase('info', 'Autonomy', `Emergency Lock ${lock.level} lifted on ${lock.scope}`, { lockId: id, userId });

    res.json({ success: true, message: 'Emergency lock lifted' });
  } catch (error) {
    next(error);
  }
};

export const listHITLRules = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { data: member } = await supabaseAdmin.from('workspace_members').select('workspace_id').eq('user_id', userId).maybeSingle();
    const workspaceId = member?.workspace_id || 'global';

    const rules = getWorkspaceHITLRules(workspaceId);
    res.json({ success: true, data: rules });
  } catch (error) {
    next(error);
  }
};

export const upsertHITLRule = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const body = HITLRuleSchema.parse(req.body);
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { data: member } = await supabaseAdmin.from('workspace_members').select('workspace_id').eq('user_id', userId).maybeSingle();
    const workspaceId = String(member?.workspace_id || 'global');

    const ruleId = id || randomUUID();
    const key = ruleId + ':' + workspaceId;
    const rule: HITLRule = {
      id: ruleId,
      ...body,
      workspace_id: workspaceId,
      created_at: new Date().toISOString(),
    };
    hitlStore.set(key, rule);

    res.json({ success: true, data: rule });
  } catch (error) {
    next(error);
  }
};

export const deleteHITLRule = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { data: member } = await supabaseAdmin.from('workspace_members').select('workspace_id').eq('user_id', userId).maybeSingle();
    const key = id + ':' + (member?.workspace_id || 'global');
    hitlStore.delete(key);

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

export const listNegativeKnowledge = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { data: member } = await supabaseAdmin.from('workspace_members').select('workspace_id').eq('user_id', userId).maybeSingle();
    const items = [...nksStore.values()].filter(n => n.workspace_id === (member?.workspace_id || ''));
    res.json({ success: true, data: items });
  } catch (error) {
    next(error);
  }
};

export const createNegativeKnowledge = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const body = NKSSchema.parse(req.body);
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { data: member } = await supabaseAdmin.from('workspace_members').select('workspace_id').eq('user_id', userId).maybeSingle();

    const nks: NegativeKnowledgeSet = {
      id: randomUUID(),
      ...body,
      workspace_id: member?.workspace_id || 'unknown',
      created_at: new Date().toISOString(),
    };
    nksStore.set(nks.id, nks);

    await logToDatabase('info', 'Autonomy', `Negative Knowledge Set created: ${nks.name}`, { nks, userId });

    res.status(201).json({ success: true, data: nks });
  } catch (error) {
    next(error);
  }
};

export const deleteNegativeKnowledge = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    nksStore.delete(id);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};
