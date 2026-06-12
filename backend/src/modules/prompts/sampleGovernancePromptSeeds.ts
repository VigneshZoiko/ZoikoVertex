import * as crypto from 'crypto';
import { deterministicId } from './governedPromptSeeds';

// ─────────────────────────────────────────────────────────────────────────────
// Sample governance REGISTRY seeds.
//
// These five prompts populate the Prompt Governance registry (/agents/prompts)
// with one governed prompt per runtime decision possibility the Test Center
// classifier produces (see promptController.classifyTestDescription →
// POSSIBILITIES). Their names match the classifier's `governed_prompt` labels
// exactly, so a Test Center run resolves its "Governed Prompt" to a real row.
//
// They are distinct from GOVERNED_PROMPT_SEEDS (the runtime use_case_key prompts
// the resolver consumes and the phase4 tests assert against). These do NOT carry
// a use_case_key, so the GovernedPromptResolver never surfaces them at runtime —
// they exist purely as registry/demonstration content.
//
// Every row is marked metadata.governance_sample = true and audited by the seed
// script, so the seed origin is auditable and not a silent governance bypass.
// Tenant scoping: workspace_id AND tenant_id are both set to the target workspace.
// Idempotent: deterministic row ids → upsert on conflict, never duplicates.
// ─────────────────────────────────────────────────────────────────────────────

export type SampleRiskTier = 'tier_1_low' | 'tier_2_medium' | 'tier_3_high' | 'tier_4_critical';
export type SampleStatus =
  | 'draft'
  | 'internal_test'
  | 'review_requested'
  | 'approved_for_staging'
  | 'production_pending'
  | 'production_active'
  | 'paused'
  | 'retired'
  | 'archived';

/** The five runtime decision possibilities the Test Center classifier emits. */
export interface WorkflowPossibility {
  id: number;
  key: string;
  label: string;
}

export interface SampleGovernancePromptSeed {
  /** Stable slug for deterministic ids (NOT a runtime use_case_key). */
  slug: string;
  name: string;
  /** Canonical `prompt_type` enum value (see PROMPT_TYPE_MAP values). */
  promptType: string;
  purpose: string;
  possibility: WorkflowPossibility;
  riskTier: SampleRiskTier;
  status: SampleStatus;
  versionNumber: number;
  body: string;
  knowledgeSources?: string[];
}

const BASIC_CONTENT_BODY = `You are a brand-safe social content generator. The input contains no factual claims, regulated topics, or policy-sensitive material.

Produce engaging, on-brand copy for {{platform}} about: {{topic}}.

Rules:
- Do NOT invent statistics, endorsements, awards, or claims.
- Stay within the platform's character and formatting limits.
- Tone: {{tone}}.

Return the post text only.`;

const FACTUAL_CLAIM_VALIDATOR_BODY = `You are a factual-claim validator. A factual claim was detected and NO supporting knowledge-base evidence is available for this workspace.

Claim under review: "{{content}}"

You MUST NOT publish the claim as fact. Instead:
1. Rewrite the content to remove or soften the unverifiable claim.
2. State plainly what evidence (source, document, citation) would be required to substantiate it.

Respond in STRICT JSON:
{ "safe_rewrite": "string", "required_evidence": ["string"], "publishable": false }`;

const KNOWLEDGE_VERIFICATION_BODY = `You are a knowledge-grounded verification assistant. A factual claim was detected AND matching knowledge-base evidence was found.

Claim: "{{content}}"
Approved evidence: {{knowledge_context}}

Verify the claim STRICTLY against the provided evidence and cite it. Do NOT use outside knowledge. If the evidence does not fully support the claim, downgrade to PARTIAL and cite the gap.

Respond in STRICT JSON:
{ "verdict": "SUPPORTED" | "PARTIAL" | "UNSUPPORTED", "citations": ["string"], "notes": "string" }`;

const HIGH_RISK_REVIEW_BODY = `You are a high-risk content reviewer for regulated categories (legal, financial, healthcare, political).

The content falls into a high-risk category and MUST NOT auto-publish.

Content: "{{content}}"
Platform: {{platform}}

Summarize the specific regulatory exposure, list the disclosures or approvals required, and route to a {{reviewer_role}} for human review.

Respond in STRICT JSON:
{ "risk_category": "string", "exposure": "string", "required_disclosures": ["string"], "route_to": "{{reviewer_role}}", "decision": "review" }`;

const POLICY_VIOLATION_BODY = `You are a policy-enforcement refusal handler. The content violates platform or company policy (prohibited claims, offensive material, restricted topics, or safety rules).

Content under review: "{{content}}"

Block publication. Return a clear, non-judgmental refusal naming which policy was violated and offering safe alternatives, WITHOUT restating the violating content.

Respond in STRICT JSON:
{ "decision": "block", "policy_violated": "string", "explanation": "string", "safe_alternatives": ["string"] }`;

// Possibilities mirror promptController.classifyTestDescription → POSSIBILITIES.
export const SAMPLE_GOVERNANCE_PROMPT_SEEDS: SampleGovernancePromptSeed[] = [
  {
    slug: 'basic_content_generator',
    name: 'Basic Content Generator',
    promptType: 'task_instruction',
    purpose: 'Generate brand-safe social copy for posts that contain no factual claims, regulated topics, or policy-sensitive material.',
    possibility: { id: 1, key: 'BASIC_POST', label: 'Basic Post' },
    riskTier: 'tier_1_low',
    status: 'production_active',
    versionNumber: 1,
    body: BASIC_CONTENT_BODY,
  },
  {
    slug: 'factual_claim_validator',
    name: 'Factual Claim Validator',
    promptType: 'safety_rule',
    purpose: 'Catch factual claims that have no supporting knowledge-base evidence and produce a safe rewrite plus the evidence required to substantiate them.',
    possibility: { id: 3, key: 'FACTUAL_CLAIM_NO_KB', label: 'Factual Claim + No Knowledge' },
    riskTier: 'tier_2_medium',
    status: 'production_active',
    versionNumber: 1,
    body: FACTUAL_CLAIM_VALIDATOR_BODY,
  },
  {
    slug: 'knowledge_verification_prompt',
    name: 'Knowledge Verification Prompt',
    promptType: 'task_instruction',
    purpose: 'Verify a detected factual claim strictly against matched, approved knowledge-base sources and require citations.',
    possibility: { id: 2, key: 'FACTUAL_CLAIM_KB_FOUND', label: 'Factual Claim + Knowledge Found' },
    riskTier: 'tier_2_medium',
    status: 'production_active',
    versionNumber: 1,
    body: KNOWLEDGE_VERIFICATION_BODY,
    knowledgeSources: ['Approved Product Knowledge Base'],
  },
  {
    slug: 'high_risk_review_prompt',
    name: 'High-Risk Review Prompt',
    promptType: 'escalation_instruction',
    purpose: 'Hold content in regulated high-risk categories (legal, financial, healthcare, political) for mandatory human review and route it to the right reviewer.',
    possibility: { id: 4, key: 'HIGH_RISK_CLAIM', label: 'High-Risk Claim' },
    riskTier: 'tier_3_high',
    status: 'review_requested',
    versionNumber: 1,
    body: HIGH_RISK_REVIEW_BODY,
  },
  {
    slug: 'policy_violation_prompt',
    name: 'Policy Violation Prompt',
    promptType: 'refusal_logic',
    purpose: 'Block content that violates platform or company policy and return a clear, safe refusal with alternatives.',
    possibility: { id: 5, key: 'POLICY_VIOLATION', label: 'Policy Violation' },
    riskTier: 'tier_4_critical',
    status: 'production_active',
    versionNumber: 1,
    body: POLICY_VIOLATION_BODY,
  },
];

export interface SampleGovernancePromptFixtures {
  prompts: any[];
  prompt_versions: any[];
  prompt_deployments: any[];
  prompt_evidence_links: any[];
}

/**
 * Build the registry rows for every sample seed in a workspace. Produces a
 * prompt + its current version + (for production_active seeds) a production
 * deployment + a governance receipt evidence link. Pure + deterministic so the
 * seed script and any tests share one source of truth.
 */
export function buildSampleGovernancePromptFixtures(
  workspaceId: string,
  seeds: SampleGovernancePromptSeed[] = SAMPLE_GOVERNANCE_PROMPT_SEEDS,
): SampleGovernancePromptFixtures {
  const fixtures: SampleGovernancePromptFixtures = {
    prompts: [],
    prompt_versions: [],
    prompt_deployments: [],
    prompt_evidence_links: [],
  };
  const ts = '2025-01-01T00:00:00Z';

  for (const seed of seeds) {
    const promptId = deterministicId(`sample-prompt:${workspaceId}:${seed.slug}`);
    const versionId = deterministicId(`sample-version:${workspaceId}:${seed.slug}`);
    const bodyHash = crypto.createHash('sha256').update(seed.body).digest('hex');
    const receiptHash = crypto.createHash('sha256').update(`sample-receipt:${versionId}:${seed.body}`).digest('hex');
    const isProduction = seed.status === 'production_active';

    fixtures.prompts.push({
      id: promptId,
      workspace_id: workspaceId,
      tenant_id: workspaceId,
      name: seed.name,
      description: seed.purpose,
      prompt_type: seed.promptType,
      risk_tier: seed.riskTier,
      status: seed.status,
      current_version_id: versionId,
      owner_name: 'Governance Seed',
      knowledge_sources: seed.knowledgeSources || [],
      created_at: ts,
      updated_at: ts,
      metadata: {
        bootstrap: true,
        governance_sample: true,
        purpose: seed.purpose,
        workflow_possibility: seed.possibility,
      },
    });

    fixtures.prompt_versions.push({
      id: versionId,
      prompt_id: promptId,
      version_number: seed.versionNumber,
      body: seed.body,
      body_hash: bodyHash,
      created_by: 'governance-sample',
      created_at: ts,
    });

    if (isProduction) {
      fixtures.prompt_deployments.push({
        id: deterministicId(`sample-deploy:${workspaceId}:${seed.slug}`),
        prompt_version_id: versionId,
        environment: 'production',
        deployed_by: 'governance-sample',
        created_at: ts,
      });
    }

    fixtures.prompt_evidence_links.push({
      id: deterministicId(`sample-receipt:${workspaceId}:${seed.slug}`),
      prompt_id: promptId,
      prompt_version_id: versionId,
      workspace_id: workspaceId,
      tenant_id: workspaceId,
      event_type: 'prompt.governance_sample.seeded',
      vault_item_id: deterministicId(`sample-receiptvault:${workspaceId}:${seed.slug}`),
      evidence_hash: receiptHash,
      risk_level: seed.riskTier,
      reason: `Sample governance prompt seeded for possibility '${seed.possibility.key}' (${seed.name})`,
      metadata: { bootstrap: true, governance_sample: true, receipt_hash: receiptHash, workflow_possibility: seed.possibility },
      created_at: ts,
    });
  }

  return fixtures;
}
