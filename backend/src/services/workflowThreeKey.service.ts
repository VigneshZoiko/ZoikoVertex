import { supabaseAdmin } from '../shared/supabase';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';

// ─── Types ───────────────────────────────────────────────────────

export interface ApprovalChain {
  id: string;
  workflow_id: string;
  version_id: string;
  risk_level: string;
  status: 'pending' | 'in_progress' | 'approved' | 'rejected';
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ApprovalKey {
  id: string;
  chain_id: string;
  approval_sequence: number;
  required_role: string;
  approver_id: string | null;
  approver_name: string | null;
  decision: string | null;
  decision_reason: string | null;
  decided_at: string | null;
  evidence_ref: string | null;
  created_at: string | null;
}

// ─── Approval chain rules per risk level ──────────────────────
// Returns the required roles in order for the given risk level.

export function getRequiredApprovalChain(riskLevel: string): string[] {
  switch (riskLevel) {
    case 'low':
      return ['AGENT_ARCHITECT'];
    case 'medium':
      return ['AGENT_ARCHITECT', 'ADMIN'];
    case 'high':
      return ['AGENT_ARCHITECT', 'WORKSPACE_OWNER', 'GOVERNANCE_ADMIN'];
    case 'critical':
      return ['AGENT_ARCHITECT', 'WORKSPACE_OWNER', 'GOVERNANCE_ADMIN'];
    default:
      return ['AGENT_ARCHITECT'];
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- role helper retained for the Three-Key approval chain wiring
function getAdminOrOwnerRole(): string {
  return 'WORKSPACE_OWNER';
}

// ─── Initialize a Three-Key approval chain for a version ──────
// Called when a version is submitted for approval.

export async function initializeApprovalChain(params: {
  versionId: string;
  workflowId: string;
  riskLevel: string;
  createdBy: string;
}): Promise<{ chainId: string; keys: ApprovalKey[] }> {
  const chainId = uuidv4();
  const requiredRoles = getRequiredApprovalChain(params.riskLevel);

  const { error: chainError } = await supabaseAdmin
    .from('workflow_approval_chains')
    .insert({
      id: chainId,
      workflow_id: params.workflowId,
      version_id: params.versionId,
      risk_level: params.riskLevel,
      status: 'pending',
      created_by: params.createdBy,
    });
  if (chainError) throw chainError;

  const keys: ApprovalKey[] = [];
  for (let i = 0; i < requiredRoles.length; i++) {
    const keyId = uuidv4();
    const { error: keyError } = await supabaseAdmin
      .from('workflow_approval_keys')
      .insert({
        id: keyId,
        chain_id: chainId,
        approval_sequence: i + 1,
        required_role: requiredRoles[i],
      });
    if (keyError) throw keyError;
    keys.push({
      id: keyId,
      chain_id: chainId,
      approval_sequence: i + 1,
      required_role: requiredRoles[i],
      approver_id: null,
      approver_name: null,
      decision: null,
      decision_reason: null,
      decided_at: null,
      evidence_ref: null,
      created_at: null,
    });
  }

  await supabaseAdmin
    .from('workflow_approval_chains')
    .update({ status: 'in_progress' })
    .eq('id', chainId);

  return { chainId, keys };
}

// ─── Validate role against allowed roles ─────────────────────
// ADMIN and WORKSPACE_OWNER can satisfy each other's keys.

export function roleSatisfies(actualRole: string, requiredRole: string): boolean {
  const r = actualRole.toUpperCase();
  const req = requiredRole.toUpperCase();

  if (r === req) return true;

  // ADMIN and WORKSPACE_OWNER are interchangeable in approval chains
  if ((r === 'ADMIN' || r === 'WORKSPACE_OWNER') &&
      (req === 'ADMIN' || req === 'WORKSPACE_OWNER')) {
    return true;
  }

  // SUPERADMIN can satisfy any role
  if (r === 'SUPERADMIN') return true;

  // GOVERNANCE_ADMIN can satisfy AGENT_ARCHITECT for approval purposes
  if (r === 'GOVERNANCE_ADMIN' && req === 'AGENT_ARCHITECT') return true;

  return false;
}

// ─── Record a decision on a specific approval key ────────────
// Enforces: self-approval prevention, duplicate approval prevention,
// role validation, mandatory reason for rejection.

export async function recordKeyDecision(params: {
  chainId: string;
  approvalSequence: number;
  approverId: string;
  approverName: string;
  approverRole: string;
  decision: 'approved' | 'rejected' | 'changes_requested';
  reason?: string;
}): Promise<{ key: ApprovalKey; chainStatus: string }> {
  // 1. Fetch the chain
  const { data: chain, error: chainError } = await supabaseAdmin
    .from('workflow_approval_chains')
    .select('*')
    .eq('id', params.chainId)
    .single();
  if (chainError || !chain) {
    throw Object.assign(new Error('Approval chain not found'), { statusCode: 404 });
  }

  // 2. Fetch the key
  const { data: key, error: keyError } = await supabaseAdmin
    .from('workflow_approval_keys')
    .select('*')
    .eq('chain_id', params.chainId)
    .eq('approval_sequence', params.approvalSequence)
    .single();
  if (keyError || !key) {
    throw Object.assign(new Error('Approval key not found'), { statusCode: 404 });
  }

  // 3. Rule: role must satisfy required role
  if (!roleSatisfies(params.approverRole, key.required_role)) {
    throw Object.assign(
      new Error(`Role ${params.approverRole} cannot satisfy required role ${key.required_role}`),
      { statusCode: 403 },
    );
  }

  // 4. Rule: duplicate approval prevention
  if (key.decision != null) {
    throw Object.assign(new Error('This approval key has already been decided'), { statusCode: 409 });
  }

  // 5. Rule: self-approval prevention — creator cannot approve own workflow
  if (chain.created_by === params.approverId) {
    throw Object.assign(new Error('Self-approval is prohibited'), { statusCode: 403 });
  }

  // 6. Rule: same user cannot satisfy multiple keys in the same chain
  const { data: existingDecisions, error: existingError } = await supabaseAdmin
    .from('workflow_approval_keys')
    .select('approver_id')
    .eq('chain_id', params.chainId)
    .not('approver_id', 'is', null);
  if (existingError) throw existingError;
  if (existingDecisions && existingDecisions.some(d => d.approver_id === params.approverId)) {
    throw Object.assign(new Error('This user has already approved a key in this chain'), { statusCode: 409 });
  }

  // 7. Rule: mandatory reason for rejection
  if (params.decision !== 'approved' && !params.reason) {
    throw Object.assign(new Error('Reason is mandatory for rejection or change requests'), { statusCode: 400 });
  }

  // 8. Generate evidence reference
  const evidenceRef = generateEvidenceRef(params.chainId, params.approvalSequence, params.decision);

  // 9. Record the decision
  const now = new Date().toISOString();
  const { error: updateError } = await supabaseAdmin
    .from('workflow_approval_keys')
    .update({
      approver_id: params.approverId,
      approver_name: params.approverName,
      decision: params.decision,
      decision_reason: params.reason || null,
      decided_at: now,
      evidence_ref: evidenceRef,
    })
    .eq('id', key.id);
  if (updateError) throw updateError;

  // 10. Update chain status
  let chainStatus = 'in_progress';
  if (params.decision === 'rejected' || params.decision === 'changes_requested') {
    chainStatus = 'rejected';
  } else {
    const { data: allKeys } = await supabaseAdmin
      .from('workflow_approval_keys')
      .select('decision')
      .eq('chain_id', params.chainId);
    if (allKeys && allKeys.length > 0 && allKeys.every(k => k.decision === 'approved')) {
      chainStatus = 'approved';
    }
  }

  await supabaseAdmin
    .from('workflow_approval_chains')
    .update({ status: chainStatus })
    .eq('id', params.chainId);

  return {
    key: {
      ...key,
      approver_id: params.approverId,
      approver_name: params.approverName,
      decision: params.decision,
      decision_reason: params.reason || null,
      decided_at: now,
      evidence_ref: evidenceRef,
    },
    chainStatus,
  };
}

// ─── Validate approval quorum ──────────────────────────────────
// Checks if all required approvals are satisfied for a version.

export async function validateApprovalQuorum(params: {
  versionId: string;
}): Promise<{
  quorumSatisfied: boolean;
  totalKeys: number;
  approvedKeys: number;
  missingRoles: string[];
  chainId: string | null;
}> {
  const { data: chain } = await supabaseAdmin
    .from('workflow_approval_chains')
    .select('*')
    .eq('version_id', params.versionId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!chain) {
    return { quorumSatisfied: false, totalKeys: 0, approvedKeys: 0, missingRoles: [], chainId: null };
  }

  const { data: keys } = await supabaseAdmin
    .from('workflow_approval_keys')
    .select('*')
    .eq('chain_id', chain.id);

  const totalKeys = keys?.length || 0;
  const approvedKeys = keys?.filter(k => k.decision === 'approved')?.length || 0;
  const missingRoles = keys
    ?.filter(k => k.decision !== 'approved')
    ?.map(k => k.required_role) || [];

  return {
    quorumSatisfied: chain.status === 'approved' && approvedKeys === totalKeys,
    totalKeys,
    approvedKeys,
    missingRoles,
    chainId: chain.id,
  };
}

// ─── Check if workflow version is eligible for activation ──────
// Activation requires: approval quorum satisfied, evidence created,
// required roles completed, version approved.

export async function checkActivationEligibility(params: {
  versionId: string;
  workflowId: string;
}): Promise<{
  eligible: boolean;
  blockers: string[];
}> {
  const blockers: string[] = [];

  // 1. Check approval quorum
  const quorum = await validateApprovalQuorum({ versionId: params.versionId });
  if (!quorum.quorumSatisfied) {
    if (quorum.missingRoles.length > 0) {
      blockers.push(`Missing approvals from: ${quorum.missingRoles.join(', ')}`);
    } else {
      blockers.push('Approval chain not completed');
    }
  }

  // 2. Check that evidence references exist for all approved keys
  if (quorum.chainId) {
    const { data: keys } = await supabaseAdmin
      .from('workflow_approval_keys')
      .select('decision, evidence_ref')
      .eq('chain_id', quorum.chainId);

    const approvedWithoutEvidence = keys?.filter(
      k => k.decision === 'approved' && !k.evidence_ref
    );
    if (approvedWithoutEvidence && approvedWithoutEvidence.length > 0) {
      blockers.push('Evidence references missing for approved keys');
    }

    // 3. Check that no key is missing (all sequences decided)
    const undecided = keys?.filter(k => k.decision === null);
    if (undecided && undecided.length > 0) {
      blockers.push(`${undecided.length} approval key(s) still pending decision`);
    }
  }

  return {
    eligible: blockers.length === 0,
    blockers,
  };
}

// ─── Get the full approval chain for a version ────────────────

export async function getApprovalChain(versionId: string): Promise<{
  chain: ApprovalChain;
  keys: ApprovalKey[];
}> {
  const { data: chain } = await supabaseAdmin
    .from('workflow_approval_chains')
    .select('*')
    .eq('version_id', versionId)
    .single();
  if (!chain) {
    throw Object.assign(new Error('No approval chain found for this version'), { statusCode: 404 });
  }

  const { data: keys } = await supabaseAdmin
    .from('workflow_approval_keys')
    .select('*')
    .eq('chain_id', chain.id)
    .order('approval_sequence', { ascending: true });

  return { chain: chain as ApprovalChain, keys: (keys || []) as ApprovalKey[] };
}

// ─── Generate evidence reference hash ─────────────────────────

function generateEvidenceRef(chainId: string, sequence: number, decision: string): string {
  const input = `${chainId}:${sequence}:${decision}:${Date.now()}`;
  return crypto.createHash('sha256').update(input).digest('hex').slice(0, 16);
}

// ─── Get all pending approval chains for a workspace ──────────

export async function listPendingChains(params: {
  workspace_id: string;
  limit: number;
  offset: number;
}) {
  const { data, error, count } = await supabaseAdmin
    .from('workflow_approval_chains')
    .select('*, workflow_templates!inner(id, workspace_id, name)', { count: 'exact' })
    .eq('workflow_templates.workspace_id', params.workspace_id)
    .in('status', ['pending', 'in_progress'])
    .order('created_at', { ascending: false })
    .range(params.offset, params.offset + params.limit - 1);
  if (error) throw error;
  return { chains: data || [], total: count || 0 };
}
