import * as crypto from 'crypto';
import { supabaseAdmin } from '../../shared/supabase';
import { PromptAuditService } from './PromptAuditService';
import { PromptEvidenceService } from './PromptEvidenceService';
import { FailClosedGuard } from './FailClosedGuard';
import { computePDIBand, deriveAutonomyLevel } from './pdiBands';

export interface GovernanceReceipt {
  receiptId: string;
  receiptHash: string;
  promptId: string;
  promptVersionId: string;
  promptVersion: number;
  promptBody: string;
  policySnapshot: Record<string, unknown>;
  approvalSnapshot: Record<string, unknown>;
  deploymentSnapshot: Record<string, unknown>;
  rollbackPlan: {
    rollbackToVersionId: string | null;
    rollbackToVersionNumber: number | null;
    rollbackProcedure: string;
  };
  evidenceReferences: string[];
  actorChain: Array<{
    actorId: string;
    actorName: string;
    role: string;
    action: string;
    timestamp: string;
  }>;
  governanceResults: {
    threeKeyCompleted: boolean;
    threeKeyCount: number;
    sodPassed: boolean;
    sodCheckCount: number;
    pdiScore: number | null;
    evaluationPassed: boolean;
    evaluationScore: number | null;
  };
  constraintShadowHash: string;
  evaluationResult: Record<string, unknown>;
  pdiScore: number | null;
  timestamps: {
    created: string;
    approvalCompleted: string | null;
    deploymentCompleted: string | null;
  };
  receiptStatus: 'pending' | 'sealed' | 'exported';
}

export class GovernanceReceiptService {
  static async generate(
    promptId: string,
    promptVersionId: string,
    workspaceId: string,
    actorId?: string,
  ): Promise<GovernanceReceipt> {
    const receiptId = `GR-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    const { data: prompt } = await supabaseAdmin
      .from('prompts')
      .select('*')
      .eq('id', promptId)
      .single();

    const { data: version } = await supabaseAdmin
      .from('prompt_versions')
      .select('*')
      .eq('id', promptVersionId)
      .single();

    const { data: approvals } = await supabaseAdmin
      .from('prompt_approvals')
      .select('*')
      .eq('prompt_version_id', promptVersionId)
      .order('created_at', { ascending: false });

    const { data: deployments } = await supabaseAdmin
      .from('prompt_deployments')
      .select('*')
      .eq('prompt_version_id', promptVersionId)
      .order('created_at', { ascending: false });

    const { data: evidenceLinks } = await supabaseAdmin
      .from('prompt_evidence_links')
      .select('vault_item_id')
      .eq('prompt_version_id', promptVersionId);

    const { data: priorVersion } = await supabaseAdmin
      .from('prompt_versions')
      .select('id, version_number')
      .eq('prompt_id', promptId)
      .lt('version_number', version?.version_number || 1)
      .order('version_number', { ascending: false })
      .limit(1)
      .maybeSingle();

    // ── Governance results ──────────────────────────────────────────────
    const { data: constraintShadows } = await supabaseAdmin
      .from('prompt_constraint_shadows')
      .select('shadow_hash, status')
      .eq('version_id', promptVersionId)
      .order('created_at', { ascending: false })
      .limit(1);

    const latestShadow = constraintShadows?.[0] || null;
    const constraintShadowHash = latestShadow?.shadow_hash || 'unlocked_or_missing';

    const { data: threeKeyApprovals } = await supabaseAdmin
      .from('prompt_approvals')
      .select('reviewer_role, decision')
      .eq('prompt_version_id', promptVersionId)
      .eq('decision', 'APPROVED');

    const threeKeyCount = threeKeyApprovals?.length || 0;
    const threeKeyCompleted = threeKeyCount >= 3;

    const { data: sodRecords } = await supabaseAdmin
      .from('prompt_audit_ledger')
      .select('event_type')
      .eq('version_id', promptVersionId)
      .eq('event_type', 'prompt.separation_of_duties.blocked');

    const sodPassed = !sodRecords || sodRecords.length === 0;

    const { data: latestEval } = await supabaseAdmin
      .from('prompt_test_runs')
      .select('pass_fail, score_summary')
      .eq('prompt_version_id', promptVersionId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const evaluationPassed = latestEval?.pass_fail === 'PASS';
    const evaluationScore = latestEval?.score_summary?.overall_score ?? null;

    const { data: pdiRecords } = await supabaseAdmin
      .from('prompt_audit_ledger')
      .select('after_state')
      .eq('version_id', promptVersionId)
      .eq('event_type', 'prompt.defensibility_index.computed')
      .order('created_at', { ascending: false })
      .limit(1);

    const pdiScore = (pdiRecords?.[0]?.after_state as any)?.pdi_score ?? null;
    const pdiBand = pdiScore !== null ? computePDIBand(pdiScore) : null;
    const autonomyLevel = pdiBand ? deriveAutonomyLevel(pdiBand) : null;

    // ── Actor chain ─────────────────────────────────────────────────────
    const actorChain: GovernanceReceipt['actorChain'] = [];
    if (version?.created_by) {
      actorChain.push({ actorId: version.created_by, actorName: version.created_by, role: 'author', action: 'version.created', timestamp: version.created_at });
    }
    (approvals || []).forEach((a: any) => {
      actorChain.push({ actorId: a.reviewer_id, actorName: a.reviewer_id, role: a.reviewer_role, action: `approval.${a.decision}`, timestamp: a.created_at });
    });
    (deployments || []).forEach((d: any) => {
      actorChain.push({ actorId: d.deployed_by, actorName: d.deployed_by, role: 'deployer', action: `deployment.${d.environment}`, timestamp: d.created_at });
    });

    const approvalCompleted = approvals?.find((a: any) => a.decision === 'APPROVED')?.created_at || null;
    const deploymentCompleted = deployments?.find((d: any) => d.environment === 'production')?.created_at || null;

    const governanceResults = {
      threeKeyCompleted,
      threeKeyCount,
      sodPassed,
      sodCheckCount: sodRecords?.length || 0,
      pdiScore,
      pdiBand,
      autonomyLevel,
      evaluationPassed,
      evaluationScore,
    };

    const receiptContent = {
      receiptId,
      promptId,
      promptVersionId,
      promptVersion: version?.version_number || 0,
      promptBody: version?.body || '',
      policySnapshot: {
        riskTier: prompt?.risk_tier,
        status: prompt?.status,
        knowledgeSources: prompt?.knowledge_sources,
        toolsPermitted: prompt?.tools_permitted,
      },
      approvalSnapshot: {
        approvalCount: approvals?.length || 0,
        approvals: (approvals || []).map((a: any) => ({
          reviewerId: a.reviewer_id,
          reviewerRole: a.reviewer_role,
          decision: a.decision,
          timestamp: a.created_at,
        })),
      },
      deploymentSnapshot: {
        deploymentCount: deployments?.length || 0,
        deployments: (deployments || []).map((d: any) => ({
          environment: d.environment,
          deployedBy: d.deployed_by,
          timestamp: d.created_at,
        })),
      },
      rollbackPlan: {
        rollbackToVersionId: priorVersion?.id || null,
        rollbackToVersionNumber: priorVersion?.version_number || null,
        rollbackProcedure: priorVersion?.id
          ? `Rollback to version ${priorVersion.version_number} (${priorVersion.id}) via deployment reversal`
          : 'No prior version available for rollback; must clone to draft',
      },
      evidenceReferences: (evidenceLinks || []).map((el: any) => el.vault_item_id).filter(Boolean),
      actorChain,
      governanceResults,
      constraintShadowHash,
      pdiBand,
      autonomyLevel,
      timestamps: { created: new Date().toISOString(), approvalCompleted, deploymentCompleted },
      receiptStatus: 'sealed',
    };

    const receiptHash = crypto.createHash('sha256').update(JSON.stringify(receiptContent)).digest('hex');

    // Fail-closed: evidence insert must succeed
    await FailClosedGuard.guardEvidenceWrite(
      'prompt.governance_receipt.generated',
      {
        receipt_id: receiptId,
        receipt_hash: receiptHash,
        version_number: version?.version_number,
        governance_results: governanceResults,
        constraint_shadow_hash: constraintShadowHash,
      },
      {
        operation: 'governance_receipt.generate',
        workspaceId,
        promptId,
        promptVersionId,
        actorId,
        criticality: 'critical',
        throwOnEvidenceFailure: true,
        throwOnAuditFailure: false,
      },
    );

    await supabaseAdmin.from('prompt_evidence_links').insert({
      prompt_id: promptId,
      prompt_version_id: promptVersionId,
      workspace_id: workspaceId,
      tenant_id: workspaceId,
      event_type: 'prompt.governance_receipt.generated',
      vault_item_id: receiptId,
      evidence_hash: receiptHash,
      risk_level: prompt?.risk_tier || 'medium',
      reason: `Governance receipt generated: ${receiptId}`,
      metadata: { receipt_hash: receiptHash, version_number: version?.version_number, governance_results: governanceResults, constraint_shadow_hash: constraintShadowHash },
    });

    await PromptAuditService.record({
      event_type: 'prompt.governance_receipt.generated',
      workspace_id: workspaceId,
      prompt_id: promptId,
      version_id: promptVersionId,
      reason: `Governance receipt ${receiptId} generated`,
      after_state: { receipt_id: receiptId, receipt_hash: receiptHash, actor_count: actorChain.length },
    });

    return {
      ...receiptContent,
      receiptHash,
      constraintShadow: latestShadow || {},
      evaluationResult: latestEval || {},
      pdiScore,
      pdiBand,
      autonomyLevel,
      governanceResults,
      constraintShadowHash,
    } as unknown as GovernanceReceipt;
  }

  static async seal(receiptId: string, workspaceId: string): Promise<void> {
    await PromptEvidenceService.record({
      event_type: 'prompt.governance_receipt.sealed',
      workspace_id: workspaceId,
      reason: `Governance receipt ${receiptId} sealed and finalized`,
      payload: { receipt_id: receiptId, sealed_at: new Date().toISOString() },
    });

    await PromptAuditService.record({
      event_type: 'prompt.governance_receipt.sealed',
      workspace_id: workspaceId,
      reason: `Governance receipt ${receiptId} sealed`,
      after_state: { receipt_id: receiptId, sealed_at: new Date().toISOString() },
    });
  }
}
