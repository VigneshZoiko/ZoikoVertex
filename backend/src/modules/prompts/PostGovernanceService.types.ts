// ─────────────────────────────────────────────────────────────────────────────
// Shared post-governance types.
//
// Extracted into their own module so the validation/ agents and the
// PostGovernanceService can both import them without a circular dependency
// (PostGovernanceService → orchestrator → agents → types).
// ─────────────────────────────────────────────────────────────────────────────

export type GovernanceDecision = 'APPROVE' | 'REVIEW' | 'BLOCK';

export interface Possibility {
  id: number;
  key: string;
  label: string;
}

export interface KnowledgeMatch {
  id: string;
  title: string;
  citation_reference?: string;
  match_action?: 'approve' | 'review' | 'block';
}

export interface GovernanceResult {
  decision: GovernanceDecision;
  possibility: Possibility;
  governed_prompt: { label: string };
  reason: string;
  risk: { level: string; score: number; categories: Record<string, boolean> };
  knowledge: { checked: boolean; status: string; matches?: KnowledgeMatch[] };
  steps: { step: number; name: string; result: string }[];
  evidence_event_id?: string;
  prompt_id?: string;
  prompt_status?: string;
  // When decision is BLOCK, the agent key that drove it (e.g. 'approval_rules').
  blocking_agent_key?: string;
  // For an Approval-Rules block: the customer keyword(s) that matched, surfaced
  // on the post card / run as the blocked word(s). No governed prompt is attached.
  approval_block?: { keywords: string[] };
}

export interface PromptActivationRecord {
  prompt_id: string;
  previous_status: string;
  new_status: string;
  linked_workflow: string;
  linked_agent: string;
  last_used_at: string;
}

export const POSSIBILITIES: Possibility[] = [
  { id: 1, key: 'BASIC_POST', label: 'Basic Post' },
  { id: 2, key: 'FACTUAL_CLAIM_KB_FOUND', label: 'Factual Claim + Knowledge Found' },
  { id: 3, key: 'FACTUAL_CLAIM_NO_KB', label: 'Factual Claim + No Knowledge' },
  { id: 4, key: 'HIGH_RISK_CLAIM', label: 'High-Risk Claim' },
  { id: 5, key: 'POLICY_VIOLATION', label: 'Policy Violation' },
];

export const POSSIBILITY_BY_KEY: Record<string, Possibility> = Object.fromEntries(
  POSSIBILITIES.map((p) => [p.key, p]),
);

export const PROMPT_LABELS: Record<string, string> = {
  BASIC_POST: 'Basic Content Generator',
  FACTUAL_CLAIM_KB_FOUND: 'Knowledge Verification Prompt',
  FACTUAL_CLAIM_NO_KB: 'Factual Claim Validator',
  HIGH_RISK_CLAIM: 'High-Risk Review Prompt',
  POLICY_VIOLATION: 'Policy Violation Prompt',
};
