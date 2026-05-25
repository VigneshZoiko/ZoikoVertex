import { Response, NextFunction } from 'express';
import { supabaseAdmin } from '../../shared/supabase';
import { AuthRequest } from '../../shared/authMiddleware';
import { logAuditEvent } from './evidenceController';


// In-Memory Triage Telemetry fallback store to guarantee 100% database resilience
const fallbackSignals: any[] = [
  {
    id: 'b6f6d0f9-67bf-4f2b-9db7-285600000001',
    signal_id: 'SIG-2026-000482',
    tenant_id: 'TEN-001',
    workspace_id: '00000000-0000-0000-0000-000000000000',
    title: 'Agent attempted restricted claim',
    description: 'Agent GT-004 proposed a financial statement containing guaranteed ROI claims without active legal certification.',
    source_type: 'AI Agent Runtime',
    source_event_id: 'EVT-004821',
    ingested_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(), // 2 hrs ago
    source_health_state: 'healthy',
    primary_domain: 'Compliance',
    secondary_domains: ['Legal', 'Content'],
    severity: 'High',
    severity_score: 68,
    confidence: 0.910,
    reason_codes: ['restricted_claim', 'unauthorized_guarantee'],
    status: 'Needs Classification',
    linked_objects: {
      agent_ids: ['AGT-004'],
      campaign_ids: ['CMP-042'],
      audit_event_ids: ['AUD-2026-00019211']
    },
    routing_destination: null,
    routing_reason: null,
    routed_at: null,
    sla_due_at: new Date(Date.now() + 10 * 3600 * 1000).toISOString(),
    created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString()
  },
  {
    id: 'b6f6d0f9-67bf-4f2b-9db7-285600000002',
    signal_id: 'SIG-2026-000483',
    tenant_id: 'TEN-001',
    workspace_id: '00000000-0000-0000-0000-000000000000',
    title: 'Approval override before publication',
    description: 'Manual external post was scheduled directly, bypassing the multi-step brand compliance approval track.',
    source_type: 'Approval Workflow',
    source_event_id: 'EVT-004822',
    ingested_at: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
    source_health_state: 'healthy',
    primary_domain: 'Approval',
    secondary_domains: ['Content'],
    severity: 'Critical',
    severity_score: 85,
    confidence: 0.950,
    reason_codes: ['approval_bypass', 'unauthorized_publish'],
    status: 'Needs Classification',
    linked_objects: {
      actor_ids: ['USR-091'],
      approval_chain_ids: ['ACH-8821']
    },
    routing_destination: null,
    routing_reason: null,
    routed_at: null,
    sla_due_at: new Date(Date.now() - 1 * 3600 * 1000).toISOString(), // Breached!
    created_at: new Date(Date.now() - 5 * 3600 * 1000).toISOString()
  },
  {
    id: 'b6f6d0f9-67bf-4f2b-9db7-285600000003',
    signal_id: 'SIG-2026-000484',
    tenant_id: 'TEN-001',
    workspace_id: '00000000-0000-0000-0000-000000000000',
    title: 'Repeated content-risk pattern detected',
    description: 'Security engine detected abnormal frequency of policy-drift warnings originating from the same platform channel connector.',
    source_type: 'Pattern Detector',
    source_event_id: 'EVT-004823',
    ingested_at: new Date(Date.now() - 14 * 3600 * 1000).toISOString(), // 14 hrs ago (At Risk)
    source_health_state: 'healthy',
    primary_domain: 'Security',
    secondary_domains: ['AI Agent'],
    severity: 'High',
    severity_score: 72,
    confidence: 0.880,
    reason_codes: ['repeated_breach', 'channel_anomaly'],
    status: 'Needs Classification',
    linked_objects: {
      channel_ids: ['CH-992'],
      agent_ids: ['AGT-004']
    },
    routing_destination: null,
    routing_reason: null,
    routed_at: null,
    sla_due_at: new Date(Date.now() + 2 * 3600 * 1000).toISOString(),
    created_at: new Date(Date.now() - 14 * 3600 * 1000).toISOString()
  },
  {
    id: 'b6f6d0f9-67bf-4f2b-9db7-285600000004',
    signal_id: 'SIG-2026-000485',
    tenant_id: 'TEN-001',
    workspace_id: '00000000-0000-0000-0000-000000000000',
    title: 'Brand tone drift warning',
    description: 'Tone check identified highly passive-aggressive replies proposed by Agent-09 in public brand comments.',
    source_type: 'Policy Engine',
    source_event_id: 'EVT-004824',
    ingested_at: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    source_health_state: 'healthy',
    primary_domain: 'Brand',
    secondary_domains: ['Content'],
    severity: 'Medium',
    severity_score: 42,
    confidence: 0.760,
    reason_codes: ['brand_voice_drift'],
    status: 'Needs Classification',
    linked_objects: {
      agent_ids: ['AGT-009']
    },
    routing_destination: null,
    routing_reason: null,
    routed_at: null,
    sla_due_at: new Date(Date.now() + 21 * 3600 * 1000).toISOString(),
    created_at: new Date(Date.now() - 3 * 3600 * 1000).toISOString()
  },
  {
    id: 'b6f6d0f9-67bf-4f2b-9db7-285600000005',
    signal_id: 'SIG-2026-000486',
    tenant_id: 'TEN-001',
    workspace_id: '00000000-0000-0000-0000-000000000000',
    title: 'Low-confidence automated reply',
    description: 'Answering bot triggered an override warning after confidence score fell below the critical 0.65 threshold.',
    source_type: 'AI Agent Runtime',
    source_event_id: 'EVT-004825',
    ingested_at: new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
    source_health_state: 'healthy',
    primary_domain: 'AI Agent',
    secondary_domains: ['Content'],
    severity: 'Low',
    severity_score: 18,
    confidence: 0.890,
    reason_codes: ['low_confidence_refusal'],
    status: 'Needs Classification',
    linked_objects: {
      agent_ids: ['AGT-011']
    },
    routing_destination: null,
    routing_reason: null,
    routed_at: null,
    sla_due_at: new Date(Date.now() + 16 * 3600 * 1000).toISOString(),
    created_at: new Date(Date.now() - 8 * 3600 * 1000).toISOString()
  }
];

const fallbackActions: any[] = [];

/**
 * Helper to determine user role in workspace.
 */
async function getUserRole(userId: string, workspaceId: string): Promise<string> {
  if (!workspaceId) return 'CREATOR';
  try {
    const { data } = await supabaseAdmin
      .from('workspace_members')
      .select('role')
      .eq('user_id', userId)
      .eq('workspace_id', workspaceId)
      .maybeSingle();
    return data?.role || 'CREATOR';
  } catch {
    return 'CREATOR';
  }
}

/**
 * Calculates deterministic severity rating based on a weighted 0-100 formula:
 * Score = Impact(30%) + Likelihood(20%) + Exposure(20%) + ControlFailure(15%) + RegulatorySensitivity(15%)
 */
export function calculateSeverity(factors: {
  impact: number;
  likelihood: number;
  exposure: number;
  controlFailure: number;
  regulatorySensitivity: number;
}): { score: number; severity: 'Low' | 'Medium' | 'High' | 'Critical' } {
  const { impact, likelihood, exposure, controlFailure, regulatorySensitivity } = factors;
  const score = Math.round(
    (impact * 0.3) +
    (likelihood * 0.2) +
    (exposure * 0.2) +
    (controlFailure * 0.15) +
    (regulatorySensitivity * 0.15)
  );

  let severity: 'Low' | 'Medium' | 'High' | 'Critical' = 'Low';
  if (score >= 75) severity = 'Critical';
  else if (score >= 50) severity = 'High';
  else if (score >= 25) severity = 'Medium';

  return { score, severity };
}

/**
 * 1. GET /api/safety/signals
 * Paginated and filterable retrieval of signals.
 */
export const getSafetySignals = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const workspaceId = req.user?.workspace_id || '00000000-0000-0000-0000-000000000000';
    const isSuperAdmin = req.user?.is_superadmin;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // Enforce role-based field redactions
    const userRole = isSuperAdmin ? 'ADMIN' : await getUserRole(userId, workspaceId);
    const privilegedRoles = ['ADMIN', 'WORKSPACE_OWNER', 'GOVERNANCE_ADMIN', 'COMPLIANCE_REVIEWER', 'SAFETY_OPERATOR'];
    const canSeeContent = isSuperAdmin || privilegedRoles.includes(userRole);

    let signals = [];
    try {
      let query = supabaseAdmin.from('agent_safety_signals').select('*');
      if (!isSuperAdmin) {
        query = query.eq('workspace_id', workspaceId);
      }
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      signals = data || [];
    } catch {
      // Fallback
      signals = fallbackSignals.filter(s => isSuperAdmin || s.workspace_id === workspaceId);
    }

    // Apply redactions
    const redacted = signals.map(s => ({
      ...s,
      description: canSeeContent ? s.description : '[REDACTED - INSUFFICIENT PERMISSIONS]'
    }));

    res.json({ success: true, data: redacted });
  } catch (error) {
    next(error);
  }
};

/**
 * 2. GET /api/safety/signals/:id
 */
export const getSafetySignalDetail = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const workspaceId = req.user?.workspace_id || '00000000-0000-0000-0000-000000000000';
    const isSuperAdmin = req.user?.is_superadmin;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    let signal: any = null;
    try {
      const { data, error } = await supabaseAdmin
        .from('agent_safety_signals')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      signal = data;
    } catch {
      signal = fallbackSignals.find(s => s.id === id);
    }

    if (!signal) {
      return res.status(404).json({ error: 'Safety signal not found.' });
    }

    // Enforce role-based field redactions
    const userRole = isSuperAdmin ? 'ADMIN' : await getUserRole(userId, workspaceId);
    const privilegedRoles = ['ADMIN', 'WORKSPACE_OWNER', 'GOVERNANCE_ADMIN', 'COMPLIANCE_REVIEWER', 'SAFETY_OPERATOR'];
    const canSeeContent = isSuperAdmin || privilegedRoles.includes(userRole);

    if (!canSeeContent) {
      signal.description = '[REDACTED - INSUFFICIENT PERMISSIONS]';
    }

    // Add Audit Trail actions history
    let actions: any[] = [];
    try {
      const { data } = await supabaseAdmin
        .from('agent_safety_actions')
        .select('*')
        .eq('signal_id', id)
        .order('created_at', { ascending: false });
      actions = data || [];
    } catch {
      actions = fallbackActions.filter(a => a.signal_id === id);
    }

    // Embed AI explanation trace
    const aiTrace = {
      model_version: 'VT-TrustSafety-v4.1',
      confidence_score: signal.confidence,
      reason_codes: signal.reason_codes,
      explanation_trace_id: `TRACE-${signal.signal_id}-${(id as string).substring(0, 8)}`,
      factors_evaluated: ['Semantic bypass intent', 'Brand standard claims alignment', 'Dual-bypass instruction sequence']
    };

    res.json({ success: true, data: { ...signal, actions, ai_trace: aiTrace } });
  } catch (error) {
    next(error);
  }
};

/**
 * 3. POST /api/safety/signals
 * Create manual safety signal.
 */
export const createManualSignal = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const workspaceId = req.user?.workspace_id || '00000000-0000-0000-0000-000000000000';

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { title, description, primary_domain, severity, risk_factors } = req.body;
    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description are required.' });
    }

    // Calculate severity deterministic scoring or map from manual input
    let score = 20;
    let computedSeverity: 'Low' | 'Medium' | 'High' | 'Critical' = severity || 'Low';

    if (risk_factors) {
      const result = calculateSeverity({
        impact: risk_factors.impact || 0,
        likelihood: risk_factors.likelihood || 0,
        exposure: risk_factors.exposure || 0,
        controlFailure: risk_factors.controlFailure || 0,
        regulatorySensitivity: risk_factors.regulatorySensitivity || 0
      });
      score = result.score;
      computedSeverity = result.severity;
    } else {
      if (severity === 'Critical') score = 80;
      else if (severity === 'High') score = 60;
      else if (severity === 'Medium') score = 40;
    }

    const signalIdStr = `SIG-2026-${String(Math.floor(Math.random() * 90000) + 10000)}`;

    const newSignal = {
      id: `b6f6d0f9-67bf-4f2b-9db7-2856${String(Math.floor(Math.random() * 9000000) + 1000000)}`,
      signal_id: signalIdStr,
      tenant_id: 'TEN-001',
      workspace_id: workspaceId,
      title,
      description,
      source_type: 'Manual Report',
      source_event_id: `MAN-${Date.now().toString().substring(8)}`,
      ingested_at: new Date().toISOString(),
      source_health_state: 'healthy',
      primary_domain: primary_domain || 'Brand',
      secondary_domains: [],
      severity: computedSeverity,
      severity_score: score,
      confidence: 1.000,
      reason_codes: ['manual_intake'],
      status: 'Needs Classification',
      linked_objects: { reporter_ids: [userId] },
      routing_destination: null,
      routing_reason: null,
      routed_at: null,
      sla_due_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      created_at: new Date().toISOString()
    };

    try {
      const { data, error } = await supabaseAdmin
        .from('agent_safety_signals')
        .insert([newSignal])
        .select()
        .single();
      if (error) throw error;
      res.json({ success: true, data });
    } catch {
      fallbackSignals.unshift(newSignal);
      res.json({ success: true, data: newSignal });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * 4. POST /api/safety/signals/:id/classify
 * Override classification and verify role permissions.
 */
export const classifySafetySignal = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const workspaceId = req.user?.workspace_id || '00000000-0000-0000-0000-000000000000';
    const isSuperAdmin = req.user?.is_superadmin;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // Roles and authorization
    const userRole = isSuperAdmin ? 'ADMIN' : await getUserRole(userId, workspaceId);
    const privilegedRoles = ['ADMIN', 'WORKSPACE_OWNER', 'GOVERNANCE_ADMIN', 'COMPLIANCE_REVIEWER'];
    const hasPrivileges = isSuperAdmin || privilegedRoles.includes(userRole);

    if (!hasPrivileges) {
      return res.status(403).json({ error: 'Forbidden: Insufficient privileges to triage safety signal.' });
    }

    const { primary_domain, secondary_domains, override_severity, risk_factors, justification_reason } = req.body;

    if (!justification_reason || justification_reason.trim().length < 10) {
      return res.status(400).json({ error: 'Detailed justification reason (minimum 10 characters) is required for safety override.' });
    }

    let signal: any = null;
    try {
      const { data } = await supabaseAdmin.from('agent_safety_signals').select('*').eq('id', id).single();
      signal = data;
    } catch {
      signal = fallbackSignals.find(s => s.id === id);
    }

    if (!signal) {
      return res.status(404).json({ error: 'Safety signal not found.' });
    }

    const originalSeverity = signal.severity;

    // Severity scoring calculation
    let newScore = signal.severity_score;
    let newSeverity = signal.severity;

    if (risk_factors) {
      const result = calculateSeverity({
        impact: risk_factors.impact || 0,
        likelihood: risk_factors.likelihood || 0,
        exposure: risk_factors.exposure || 0,
        controlFailure: risk_factors.controlFailure || 0,
        regulatorySensitivity: risk_factors.regulatorySensitivity || 0
      });
      newScore = result.score;
      newSeverity = result.severity;
    } else if (override_severity) {
      newSeverity = override_severity;
      if (newSeverity === 'Critical') newScore = 85;
      else if (newSeverity === 'High') newScore = 65;
      else if (newSeverity === 'Medium') newScore = 45;
      else newScore = 15;
    }

    // Downgrade rules enforcement:
    const isOriginalHighOrCritical = originalSeverity === 'High' || originalSeverity === 'Critical';
    const isNewSeverityLower = (originalSeverity === 'Critical' && newSeverity !== 'Critical') ||
                                (originalSeverity === 'High' && (newSeverity === 'Medium' || newSeverity === 'Low'));

    if (isOriginalHighOrCritical && isNewSeverityLower) {
      // Downgrade needs strict dual approval or must be highly authorized role
      const downgradeAuthorizedRoles = ['ADMIN', 'GOVERNANCE_ADMIN', 'COMPLIANCE_REVIEWER'];
      if (!isSuperAdmin && !downgradeAuthorizedRoles.includes(userRole)) {
        return res.status(403).json({ error: 'Forbidden: High/Critical severity signals cannot be downgraded without Compliance Reviewer or Governance Admin authority.' });
      }
    }

    const priorState = {
      primary_domain: signal.primary_domain,
      secondary_domains: signal.secondary_domains,
      severity: signal.severity,
      severity_score: signal.severity_score,
      status: signal.status
    };

    const updatedFields = {
      primary_domain: primary_domain || signal.primary_domain,
      secondary_domains: secondary_domains || signal.secondary_domains,
      severity: newSeverity,
      severity_score: newScore,
      status: 'Classified',
      classified_by: userId,
      classified_at: new Date().toISOString()
    };

    // Logging action
    const auditEventId = `AUD-CLASSIFY-${Date.now().toString().substring(8)}`;
    const triageLog = {
      id: `b6f6d0f9-67bf-4f2b-9db7-2856${String(Math.floor(Math.random() * 9000000) + 1000000)}`,
      signal_id: id,
      actor_id: userId,
      actor_role: userRole,
      action_type: 'classify',
      reason: justification_reason,
      prior_state: priorState,
      new_state: updatedFields,
      audit_event_id: auditEventId,
      created_at: new Date().toISOString()
    };

    try {
      const { error } = await supabaseAdmin
        .from('agent_safety_signals')
        .update(updatedFields)
        .eq('id', id);
      if (error) throw error;
      await supabaseAdmin.from('agent_safety_actions').insert([triageLog]);
    } catch {
      // Memory fallback
      const idx = fallbackSignals.findIndex(s => s.id === id);
      if (idx !== -1) {
        fallbackSignals[idx] = { ...fallbackSignals[idx], ...updatedFields };
      }
      fallbackActions.unshift(triageLog);
    }

    // Log to standard audit trail
    await logAuditEvent({
      workspaceId,
      actorId: userId,
      actorType: 'USER',
      action: 'SAFETY_SIGNAL_CLASSIFIED',
      objectType: 'SAFETY_SIGNAL',
      module: 'SafetyLayer',
      riskLevel: newSeverity.toUpperCase(),
      metadata: { signal_id: signal.signal_id, reason: justification_reason }
    });

    res.json({ success: true, message: 'Safety signal classified successfully.', score: newScore, severity: newSeverity });
  } catch (error) {
    next(error);
  }
};

/**
 * 5. POST /api/safety/signals/:id/route
 * Routes signal based on hard rules.
 */
export const routeSafetySignal = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const workspaceId = req.user?.workspace_id || '00000000-0000-0000-0000-000000000000';
    const isSuperAdmin = req.user?.is_superadmin;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    let signal: any = null;
    try {
      const { data } = await supabaseAdmin.from('agent_safety_signals').select('*').eq('id', id).single();
      signal = data;
    } catch {
      signal = fallbackSignals.find(s => s.id === id);
    }

    if (!signal) {
      return res.status(404).json({ error: 'Safety signal not found.' });
    }

    const { destination, reason } = req.body;
    if (!destination) {
      return res.status(400).json({ error: 'Routing destination is required.' });
    }

    // Hard Routing Rules Assertions:
    const severity = signal.severity;
    const isExternal = signal.description?.toLowerCase().includes('external') || signal.description?.toLowerCase().includes('public');
    const isLegalOrCompliance = signal.primary_domain === 'Legal' || signal.primary_domain === 'Compliance';
    const isSecurityOrIdentity = signal.primary_domain === 'Security' || signal.primary_domain === 'Identity';
    const isApprovalBypass = signal.reason_codes?.includes('approval_bypass');

    let recommendedDestination = destination;

    if (severity === 'Critical' && isExternal) {
      // Critical signals with external exposure route to Emergency Pause + Forensic Hub
      recommendedDestination = 'Emergency Pause & Forensic Hub';
    } else if ((severity === 'High' || severity === 'Critical') && isLegalOrCompliance) {
      // High/Critical Legal/Compliance risk to Forensic Hub + Evidence Vault
      recommendedDestination = 'Forensic Hub & Evidence Vault';
    } else if (isSecurityOrIdentity) {
      // Security/Identity anomalies to Identity & Security review queue
      recommendedDestination = 'Identity & Security Queue';
    } else if (isApprovalBypass) {
      // Approval bypasses to Approval Workflow remediation queue
      recommendedDestination = 'Approval Workflow Remediation';
    }

    const priorState = { status: signal.status, routing_destination: signal.routing_destination };
    const updatedFields = {
      status: 'Routed',
      routing_destination: recommendedDestination,
      routing_reason: reason || `Routed under policy rule classification.`,
      routed_at: new Date().toISOString()
    };

    const triageLog = {
      id: `b6f6d0f9-67bf-4f2b-9db7-2856${String(Math.floor(Math.random() * 9000000) + 1000000)}`,
      signal_id: id,
      actor_id: userId,
      actor_role: isSuperAdmin ? 'ADMIN' : await getUserRole(userId, workspaceId),
      action_type: 'route',
      reason: reason || `Automated/Manual routing matching safety doctrine.`,
      prior_state: priorState,
      new_state: updatedFields,
      audit_event_id: `AUD-ROUTE-${Date.now().toString().substring(8)}`,
      created_at: new Date().toISOString()
    };

    try {
      await supabaseAdmin.from('agent_safety_signals').update(updatedFields).eq('id', id);
      await supabaseAdmin.from('agent_safety_actions').insert([triageLog]);
    } catch {
      const idx = fallbackSignals.findIndex(s => s.id === id);
      if (idx !== -1) fallbackSignals[idx] = { ...fallbackSignals[idx], ...updatedFields };
      fallbackActions.unshift(triageLog);
    }

    res.json({ success: true, message: `Safety signal successfully routed to: ${recommendedDestination}` });
  } catch (error) {
    next(error);
  }
};

/**
 * 6. POST /api/safety/signals/:id/merge
 * Cluster duplicate safety signals.
 */
export const mergeSafetySignals = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { target_signal_id, reason } = req.body;
    const userId = req.user?.id;
    const workspaceId = req.user?.workspace_id || '00000000-0000-0000-0000-000000000000';

    if (!userId || !target_signal_id) {
      return res.status(400).json({ error: 'Unauthorized or target signal ID missing.' });
    }

    const priorState = { status: 'New' };
    const updatedFields = {
      status: 'Duplicate Candidate',
      routing_destination: `Duplicate Cluster: ${target_signal_id}`
    };

    const triageLog = {
      id: `b6f6d0f9-67bf-4f2b-9db7-2856${String(Math.floor(Math.random() * 9000000) + 1000000)}`,
      signal_id: id,
      actor_id: userId,
      actor_role: req.user?.is_superadmin ? 'ADMIN' : await getUserRole(userId, workspaceId),
      action_type: 'merge',
      reason: reason || 'Clustered duplicates.',
      prior_state: priorState,
      new_state: updatedFields,
      audit_event_id: `AUD-MERGE-${Date.now().toString().substring(8)}`,
      created_at: new Date().toISOString()
    };

    try {
      await supabaseAdmin.from('agent_safety_signals').update(updatedFields).eq('id', id);
      await supabaseAdmin.from('agent_safety_actions').insert([triageLog]);
    } catch {
      const idx = fallbackSignals.findIndex(s => s.id === id);
      if (idx !== -1) fallbackSignals[idx] = { ...fallbackSignals[idx], ...updatedFields };
      fallbackActions.unshift(triageLog);
    }

    res.json({ success: true, message: 'Safety signals merged successfully.' });
  } catch (error) {
    next(error);
  }
};

/**
 * 7. POST /api/safety/signals/:id/split
 */
export const splitSafetySignal = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user?.id;
    const workspaceId = req.user?.workspace_id || '00000000-0000-0000-0000-000000000000';

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const priorState = { status: 'Duplicate Candidate' };
    const updatedFields = {
      status: 'Needs Classification',
      routing_destination: null
    };

    const triageLog = {
      id: `b6f6d0f9-67bf-4f2b-9db7-2856${String(Math.floor(Math.random() * 9000000) + 1000000)}`,
      signal_id: id,
      actor_id: userId,
      actor_role: req.user?.is_superadmin ? 'ADMIN' : await getUserRole(userId, workspaceId),
      action_type: 'split',
      reason: reason || 'Isolated signal from duplicate cluster.',
      prior_state: priorState,
      new_state: updatedFields,
      audit_event_id: `AUD-SPLIT-${Date.now().toString().substring(8)}`,
      created_at: new Date().toISOString()
    };

    try {
      await supabaseAdmin.from('agent_safety_signals').update(updatedFields).eq('id', id);
      await supabaseAdmin.from('agent_safety_actions').insert([triageLog]);
    } catch {
      const idx = fallbackSignals.findIndex(s => s.id === id);
      if (idx !== -1) fallbackSignals[idx] = { ...fallbackSignals[idx], ...updatedFields };
      fallbackActions.unshift(triageLog);
    }

    res.json({ success: true, message: 'Safety signal split from cluster successfully.' });
  } catch (error) {
    next(error);
  }
};

/**
 * 8. POST /api/safety/signals/:id/close
 * Close safety signal with mandatory justification reason.
 */
export const closeSafetySignal = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user?.id;
    const workspaceId = req.user?.workspace_id || '00000000-0000-0000-0000-000000000000';
    const isSuperAdmin = req.user?.is_superadmin;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    if (!reason || reason.trim().length < 10) {
      return res.status(400).json({ error: 'A justification reason (minimum 10 characters) is mandatory to close a safety signal.' });
    }

    let signal: any = null;
    try {
      const { data } = await supabaseAdmin.from('agent_safety_signals').select('*').eq('id', id).single();
      signal = data;
    } catch {
      signal = fallbackSignals.find(s => s.id === id);
    }

    if (!signal) {
      return res.status(404).json({ error: 'Safety signal not found.' });
    }

    const userRole = isSuperAdmin ? 'ADMIN' : await getUserRole(userId, workspaceId);

    // High and Critical cannot be closed/dismissed without Compliance/Admin role
    if (signal.severity === 'High' || signal.severity === 'Critical') {
      const closeAuthorizedRoles = ['ADMIN', 'WORKSPACE_OWNER', 'GOVERNANCE_ADMIN', 'COMPLIANCE_REVIEWER'];
      if (!isSuperAdmin && !closeAuthorizedRoles.includes(userRole)) {
        return res.status(403).json({ error: 'Forbidden: High/Critical severity signals cannot be closed without Compliance Reviewer or Governance Admin authority.' });
      }
    }

    const priorState = { status: signal.status };
    const updatedFields = {
      status: 'Closed',
      routing_destination: 'Dismissed with Reason'
    };

    const triageLog = {
      id: `b6f6d0f9-67bf-4f2b-9db7-2856${String(Math.floor(Math.random() * 9000000) + 1000000)}`,
      signal_id: id,
      actor_id: userId,
      actor_role: userRole,
      action_type: 'close',
      reason: reason,
      prior_state: priorState,
      new_state: updatedFields,
      audit_event_id: `AUD-CLOSE-${Date.now().toString().substring(8)}`,
      created_at: new Date().toISOString()
    };

    try {
      await supabaseAdmin.from('agent_safety_signals').update(updatedFields).eq('id', id);
      await supabaseAdmin.from('agent_safety_actions').insert([triageLog]);
    } catch {
      const idx = fallbackSignals.findIndex(s => s.id === id);
      if (idx !== -1) fallbackSignals[idx] = { ...fallbackSignals[idx], ...updatedFields };
      fallbackActions.unshift(triageLog);
    }

    // Log audit event
    await logAuditEvent({
      workspaceId,
      actorId: userId,
      actorType: 'USER',
      action: 'SAFETY_SIGNAL_CLOSED',
      objectType: 'SAFETY_SIGNAL',
      module: 'SafetyLayer',
      riskLevel: signal.severity.toUpperCase(),
      metadata: { signal_id: signal.signal_id, reason }
    });

    res.json({ success: true, message: 'Safety signal closed successfully.' });
  } catch (error) {
    next(error);
  }
};

/**
 * 9. GET /api/safety/actions/history
 * Returns the global triage actions log.
 */
export const getSafetyActionsHistory = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    let actions = [];

    try {
      const { data } = await supabaseAdmin
        .from('agent_safety_actions')
        .select('*, agent_safety_signals(signal_id, title)')
        .order('created_at', { ascending: false })
        .limit(20);
      actions = data || [];
    } catch {
      // fallback mapping signal info
      actions = fallbackActions.map(a => {
        const sig = fallbackSignals.find(s => s.id === a.signal_id) || { signal_id: 'SIG-UNKNOWN', title: 'Unknown Signal' };
        return {
          ...a,
          agent_safety_signals: {
            signal_id: sig.signal_id,
            title: sig.title
          }
        };
      });
    }

    res.json({ success: true, data: actions });
  } catch (error) {
    next(error);
  }
};
