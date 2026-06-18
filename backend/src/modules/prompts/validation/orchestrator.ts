// ─────────────────────────────────────────────────────────────────────────────
// Post-Validation Orchestrator
//
// The post flows through the six governed agents as a SEQUENTIAL CHAIN —
// agent 1 → agent 2 → … → agent 6. Every agent takes its turn and runs ONLY
// its own assigned check; no agent short-circuits the others. The final
// decision is computed only AFTER all six have inspected the post.
//
// Chain order:
//   1. Policy Check Agent          (platform/system safety + high-risk)
//   2. Approval Rules Agent        (tenant blocked-word rules)
//   3. Platform Compliance Agent   (length / hashtag / image limits)
//   4. Image Validation Agent      (visual safety + image-OCR words)
//   5. General Content Agent       (claim detection)
//   6. Evidence / KB Agent         (verifies a claim against the KB)
//
// Aggregation after all agents have checked (worst-verdict-wins):
//   • any BLOCK   → BLOCK  (POLICY_VIOLATION)
//   • else any REVIEW → REVIEW (HIGH_RISK_CLAIM / FACTUAL_CLAIM_NO_KB / POLICY_VIOLATION)
//   • else claim + KB support → APPROVE (FACTUAL_CLAIM_KB_FOUND)
//   • else → APPROVE (BASIC_POST)
// ─────────────────────────────────────────────────────────────────────────────

import type { AgentFinding, AgentKey, PostInput, ValidationAgent } from './types';
import { skippedFinding } from './types';
import {
  generalContentAgent,
  imageValidationAgent,
  approvalRulesAgent,
  policyCheckAgent,
  evidenceKbAgent,
  platformComplianceAgent,
} from './registry';
import {
  extractHashtags,
  extractLinks,
  extractMentions,
} from './patterns';
import type {
  GovernanceDecision,
  KnowledgeMatch,
} from '../PostGovernanceService.types';
import { logger } from '../../../shared/logger';

// The fixed order the post travels through. Evidence/KB is last because it
// depends on whether the General Content Agent (upstream) detected a claim.
const VALIDATION_CHAIN: ValidationAgent[] = [
  policyCheckAgent,
  approvalRulesAgent,
  platformComplianceAgent,
  imageValidationAgent,
  generalContentAgent,
  evidenceKbAgent,
];

export interface OrchestrationOutcome {
  decision: GovernanceDecision;
  possibilityKey: string;
  reason: string;
  risk: { level: string; score: number; categories: Record<string, boolean> };
  knowledge: { checked: boolean; status: string; matches?: KnowledgeMatch[] };
  findings: AgentFinding[];
  // When decision is BLOCK, which agent's verdict drove it. Lets downstream
  // (PostGovernanceService / Workflows) special-case an Approval-Rules block —
  // the customer's own keyword rule — and NOT attach a governed prompt to it.
  blockingAgentKey?: AgentKey;
}

/** Build a normalized PostInput from loosely-typed publish payloads. */
export function toPostInput(params: {
  description: string;
  platform: string;
  workspaceId: string;
  content?: string;
  heading?: string;
  keywords?: string[];
  hashtags?: string[];
  mentions?: string[];
  links?: string[];
  imageUrls?: string[];
  tenantId?: string;
}): PostInput {
  const description = params.description || '';
  const content = params.content || description;
  // Scan the entire visible text (title + caption + description) for any
  // artifacts not passed explicitly, so hashtags/mentions/links inside the copy
  // are still picked up.
  const text = `${params.heading || ''} ${content} ${description}`;
  return {
    description,
    content,
    heading: params.heading,
    keywords: params.keywords || [],
    hashtags: params.hashtags && params.hashtags.length ? params.hashtags : extractHashtags(text),
    mentions: params.mentions && params.mentions.length ? params.mentions : extractMentions(text),
    links: params.links && params.links.length ? params.links : extractLinks(text),
    imageUrls: params.imageUrls || [],
    platform: params.platform || 'linkedin',
    workspaceId: params.workspaceId,
    tenantId: params.tenantId,
  };
}

function safeRun(agent: { run: (p: PostInput) => Promise<AgentFinding>; key: string; label: string }, post: PostInput) {
  return agent.run(post).catch((err): AgentFinding => {
    logger.warn({ err, agent: agent.key }, '[orchestrator] agent threw — treating as PASS');
    return {
      agentKey: agent.key as AgentFinding['agentKey'],
      label: agent.label,
      artifact: 'unknown',
      verdict: 'PASS',
      score: 0,
      reason: 'Agent error — skipped (fail open).',
      skipped: true,
    };
  });
}

function notApplicableReason(key: AgentKey): string {
  switch (key) {
    case 'image_validation':
      return 'No images attached to the post.';
    default:
      return 'No applicable content for this agent.';
  }
}

export async function runPostValidation(post: PostInput): Promise<OrchestrationOutcome> {
  const findings: AgentFinding[] = [];

  // ── Sequential chain: the post visits every agent, one after another ──
  for (const agent of VALIDATION_CHAIN) {
    // The Evidence / KB Agent only has something to verify once the General
    // Content Agent (earlier in the chain) has flagged a claim. It still takes
    // its turn — it just reports "nothing to verify" instead of calling the KB.
    if (agent.key === 'evidence_kb') {
      const general = findings.find((f) => f.agentKey === 'general_content');
      if (!general?.details?.hasClaim) {
        findings.push({
          agentKey: 'evidence_kb',
          label: agent.label,
          artifact: agent.artifact,
          verdict: 'PASS',
          score: 0,
          reason: 'No claim to verify — Knowledge Base check not needed.',
          skipped: true,
        });
        continue;
      }
    }

    if (!agent.appliesTo(post)) {
      findings.push(skippedFinding(agent, notApplicableReason(agent.key)));
      continue;
    }

    findings.push(await safeRun(agent, post));
  }

  return aggregate(findings);
}

/**
 * Compute the final governance outcome AFTER all agents have checked the post.
 * Worst-verdict-wins, mapped onto the five governance possibilities.
 */
function aggregate(findings: AgentFinding[]): OrchestrationOutcome {
  const byKey = (k: AgentKey) => findings.find((f) => f.agentKey === k);

  const categories: Record<string, boolean> = {};
  for (const f of findings) {
    if (f.categories) Object.assign(categories, f.categories);
  }

  const general = byKey('general_content');
  const policy = byKey('policy_check');
  const image = byKey('image_validation');
  const approval = byKey('approval_rules');
  const evidence = byKey('evidence_kb');

  const hasClaim = Boolean(general?.details?.hasClaim);
  const kbMatches = evidence?.evidence || [];
  const knowledge = hasClaim
    ? {
        checked: !evidence?.skipped,
        status: (evidence?.details?.kbStatus as string) || (kbMatches.length ? 'Evidence found' : 'No evidence found'),
        matches: kbMatches,
      }
    : { checked: false, status: 'Not needed' };

  const realBlocks = findings.filter((f) => f.verdict === 'BLOCK' && !f.skipped);
  const realReviews = findings.filter((f) => f.verdict === 'REVIEW' && !f.skipped);

  // ── BLOCK: any agent blocked ──────────────────────────────────────────
  if (realBlocks.length > 0) {
    // An Approval-Rules block (the customer's own keyword rule) takes precedence
    // as the reported blocker so the UI can show "Blocked due to Approval Rules"
    // and avoid wiring a governed prompt; otherwise report the first blocker.
    const primaryBlock =
      realBlocks.find((b) => b.agentKey === 'approval_rules') || realBlocks[0];
    return {
      decision: 'BLOCK',
      possibilityKey: 'POLICY_VIOLATION',
      reason: realBlocks.map((b) => b.reason).join(' | '),
      risk: {
        level: 'Critical',
        score: Math.max(90, ...realBlocks.map((b) => b.score)),
        categories,
      },
      knowledge: { checked: knowledge.checked, status: 'Not checked' },
      findings,
      blockingAgentKey: primaryBlock.agentKey,
    };
  }

  // ── REVIEW: any agent asked for review ────────────────────────────────
  if (realReviews.length > 0) {
    const isHighRisk =
      (policy?.verdict === 'REVIEW' && policy.details?.kind === 'high_risk') ||
      image?.verdict === 'REVIEW';
    const isClaimNoKb =
      hasClaim && !!evidence && !evidence.skipped && evidence.verdict === 'REVIEW';

    let possibilityKey = 'HIGH_RISK_CLAIM';
    if (isHighRisk) possibilityKey = 'HIGH_RISK_CLAIM';
    else if (isClaimNoKb) possibilityKey = 'FACTUAL_CLAIM_NO_KB';
    else if (approval?.verdict === 'REVIEW') possibilityKey = 'POLICY_VIOLATION';

    return {
      decision: 'REVIEW',
      possibilityKey,
      reason: realReviews.map((r) => r.reason).join(' | '),
      risk: {
        level: possibilityKey === 'HIGH_RISK_CLAIM' ? 'High' : 'Medium',
        score: Math.max(55, ...realReviews.map((r) => r.score)),
        categories,
      },
      knowledge,
      findings,
    };
  }

  // ── APPROVE: every agent passed ───────────────────────────────────────
  if (hasClaim && kbMatches.length > 0) {
    return {
      decision: 'APPROVE',
      possibilityKey: 'FACTUAL_CLAIM_KB_FOUND',
      reason: 'All agents passed. Claim is supported by the Knowledge Base.',
      risk: { level: 'Low', score: 20, categories },
      knowledge,
      findings,
    };
  }

  return {
    decision: 'APPROVE',
    possibilityKey: 'BASIC_POST',
    reason: 'All agents passed — no policy, safety, approval-rule, image, claim, or platform issues.',
    risk: { level: 'Low', score: 10, categories },
    knowledge,
    findings,
  };
}

/** Map agent findings into the legacy `steps[]` trace the UI renders. */
export function findingsToSteps(findings: AgentFinding[]): { step: number; name: string; result: string }[] {
  return findings.map((f, i) => ({
    step: i + 1,
    name: f.label,
    result: f.skipped ? `Skipped — ${f.reason}` : `${f.verdict} — ${f.reason}`,
  }));
}
