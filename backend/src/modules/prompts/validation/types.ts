// ─────────────────────────────────────────────────────────────────────────────
// Post-Validation Agent contracts
//
// The post-validation pipeline is a registry of single-purpose agents. Each
// agent inspects ONE facet of a post (text, image, keyword rules, platform
// limits, …), is independently testable/skippable, and returns a typed verdict.
// The orchestrator runs the applicable agents and aggregates worst-verdict-wins.
// ─────────────────────────────────────────────────────────────────────────────

import type { KnowledgeMatch } from '../PostGovernanceService.types';

/** A single agent's verdict on the artifact it owns. */
export type AgentVerdict = 'PASS' | 'REVIEW' | 'BLOCK';

/** Stable identifiers for the six governed validation agents. */
export type AgentKey =
  | 'general_content'
  | 'image_validation'
  | 'approval_rules'
  | 'policy_check'
  | 'evidence_kb'
  | 'platform_compliance';

/** The post artifacts an agent may inspect. */
export interface PostInput {
  /** Short caption / user intent description. */
  description: string;
  /** Main body copy / caption (defaults to description when a post has only one text blob). */
  content: string;
  /** Optional heading / title. */
  heading?: string;
  /** Explicit keywords/tags attached to the post (separate from hashtags). */
  keywords: string[];
  /** Hashtags found on / attached to the post. */
  hashtags: string[];
  /** @mentions found on / attached to the post. */
  mentions: string[];
  /** Links / URLs found in the post. */
  links: string[];
  /** Image / media URLs attached to the post. */
  imageUrls: string[];
  /** Target platform (linkedin, instagram, x, …) — drives platform compliance. */
  platform: string;
  /** Workspace scope for tenant-configured rules + KB lookups. */
  workspaceId: string;
  /** Optional tenant id (approval rules are tenant-scoped). */
  tenantId?: string;
}

/**
 * The complete set of text artifacts on a post — title, caption, description,
 * keywords, hashtags, and mentions — joined into one searchable string. The
 * General Content, Policy, and Approval Rules agents all inspect this same set
 * so no text artifact is ever checked by one agent but missed by another.
 */
export function postText(post: PostInput): string {
  return [
    post.heading || '',
    post.content || '',
    post.description || '',
    (post.keywords || []).join(' '),
    (post.hashtags || []).join(' '),
    (post.mentions || []).join(' '),
  ]
    .join(' ')
    .trim();
}

/** The result a single agent emits for the orchestrator to aggregate. */
export interface AgentFinding {
  agentKey: AgentKey;
  /** Display label — matches the seeded agent name in Agent Studio. */
  label: string;
  artifact: string;
  verdict: AgentVerdict;
  /** 0..100 risk score for this artifact. */
  score: number;
  reason: string;
  /** Risk categories this agent activated (healthcare, policy_safety, …). */
  categories?: Record<string, boolean>;
  /** KB evidence sources (Evidence agent only). */
  evidence?: KnowledgeMatch[];
  /** Free-form agent-specific signals the orchestrator may read. */
  details?: Record<string, unknown>;
  /** True when the agent did not apply to this post (e.g. no image). */
  skipped?: boolean;
}

/** The contract every validation agent implements. */
export interface ValidationAgent {
  readonly key: AgentKey;
  readonly label: string;
  readonly artifact: string;
  /** Skip the agent when its artifact is absent (e.g. no images on the post). */
  appliesTo(post: PostInput): boolean;
  /** Inspect the owned artifact and return a typed verdict. Must never throw. */
  run(post: PostInput): Promise<AgentFinding>;
}

/** Helper to build a "did not run" finding. */
export function skippedFinding(
  agent: Pick<ValidationAgent, 'key' | 'label' | 'artifact'>,
  reason: string,
): AgentFinding {
  return {
    agentKey: agent.key,
    label: agent.label,
    artifact: agent.artifact,
    verdict: 'PASS',
    score: 0,
    reason,
    skipped: true,
  };
}
