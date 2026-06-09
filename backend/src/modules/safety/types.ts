// ============================================================
// ZoikoVertex — Safety & Moderation Engine — Core Types
//
// Single source of truth for moderation contracts. Every layer
// (dictionaries, local engine, Gemini adapter, orchestrator,
// HTTP responses) imports from here. No layer is allowed to
// invent its own private shapes — that's how drift starts.
// ============================================================

export const SAFETY_CATEGORIES = [
  "offensive_language",
  "hate_speech",
  "harassment",
  "sexual_content",
  "violence",
  "self_harm",
  "regulated_claims",
  "confidential_data_leakage",
  "competitor_risk",
  "prompt_injection",
  "platform_unsafe",
] as const;

export type SafetyCategory = (typeof SAFETY_CATEGORIES)[number];

export type Severity = "low" | "medium" | "high" | "critical";

export type Verdict = "safe" | "review" | "block";

export type ModerationSource = "local" | "groq" | "hybrid";

// ------------------------------------------------------------
// Pattern definition (lives inside dictionary files)
// ------------------------------------------------------------
export interface SafetyPattern {
  /** Canonical lowercase token or phrase to match. */
  pattern: string;
  /** Optional explicit regex; when present takes precedence over `pattern`. */
  regex?: RegExp;
  /** Common variants (leetspeak, separators, etc.) used to bias matching. */
  aliases?: string[];
  /** Whole-word match required (true by default). */
  wholeWord?: boolean;
  /** Category bucket the match contributes to. */
  category: SafetyCategory;
  /** Human-tier severity. */
  severity: Severity;
  /** Per-match contribution to category score (0..1). */
  score: number;
  /** Where this rule came from — global ruleset vs tenant override. */
  source?: "rule" | "tenant";
}

// ------------------------------------------------------------
// Match (output of the local matcher for a single hit)
// ------------------------------------------------------------
export interface MatchResult {
  pattern: string;
  category: SafetyCategory;
  severity: Severity;
  score: number;
  matchedText: string;
  position: { start: number; end: number };
  source: "local" | "groq";
}

// ------------------------------------------------------------
// Final moderation verdict (returned to callers)
// ------------------------------------------------------------
export interface ModerationResult {
  safe: boolean;
  verdict: Verdict;
  overallRisk: number; // 0..1
  severity: Severity;
  categoryScores: Partial<Record<SafetyCategory, number>>;
  matches: MatchResult[];
  source: ModerationSource;
  evidenceId: string;
  timestamp: string; // ISO 8601
  reason?: string;
  modelUsed?: string;
  /** Time spent in each layer, in ms. */
  timings?: { local?: number; groq?: number; total: number };
}

// ------------------------------------------------------------
// Inputs
// ------------------------------------------------------------
export interface ModerationInput {
  content: string;
  /** Agent / prompt / workflow ID for evidence trail. */
  subjectId?: string;
  /** Tenant context for tenant-specific rules. */
  tenantId?: string;
  /** Workspace context for governed safety-moderation resolution. Falls back to tenantId. */
  workspaceId?: string;
  /** Skip Groq semantic layer entirely (sandbox / replay). */
  localOnly?: boolean;
  /** Platform the content is destined for (e.g., "linkedin"). */
  platform?: string;
  /** Optional override of risk thresholds. */
  thresholds?: { review?: number; block?: number };
}

// ------------------------------------------------------------
// Risk thresholds (defaults; can be overridden per-call)
// ------------------------------------------------------------
export const DEFAULT_THRESHOLDS = {
  review: 0.31,
  block: 0.61,
} as const;

// ------------------------------------------------------------
// Category weights — multipliers applied when aggregating
// category scores into overall risk. Tune these per tenant /
// per platform later; for now defaults reflect "obvious harm
// outweighs subjective harm".
// ------------------------------------------------------------
export const CATEGORY_WEIGHTS: Record<SafetyCategory, number> = {
  offensive_language: 0.6,
  hate_speech: 1.0,
  harassment: 0.85,
  sexual_content: 0.95,
  violence: 1.0,
  self_harm: 1.0,
  regulated_claims: 0.8,
  confidential_data_leakage: 1.0,
  competitor_risk: 0.4,
  prompt_injection: 1.0,
  platform_unsafe: 0.7,
};
