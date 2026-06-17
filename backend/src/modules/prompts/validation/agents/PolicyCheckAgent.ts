// ─────────────────────────────────────────────────────────────────────────────
// Agent 4 — Policy Check Agent
//
// Main purpose: enforce PLATFORM / SYSTEM policy — the content that is never
// allowed to publish regardless of customer config. Two tiers:
//   • Prohibited/unsafe content (violence, hate, self-harm, …) → hard BLOCK
//   • Regulated high-risk domains (medical, legal, financial, …) → REVIEW
//
// This is distinct from the Approval Rules Agent, which enforces the words
// THIS customer banned. Policy Check enforces what is universally disallowed.
// ─────────────────────────────────────────────────────────────────────────────

import type { AgentFinding, PostInput, ValidationAgent } from '../types';
import {
  HIGH_RISK_PATTERNS,
  VIOLENCE_SAFETY_PATTERNS,
  detectPatterns,
} from '../patterns';
import { postText } from '../types';

export class PolicyCheckAgent implements ValidationAgent {
  readonly key = 'policy_check' as const;
  readonly label = 'Policy Check Agent';
  readonly artifact = 'all-text';

  appliesTo(post: PostInput): boolean {
    return Boolean(postText(post));
  }

  async run(post: PostInput): Promise<AgentFinding> {
    // Scan ALL text artifacts (title, caption, description, keywords, hashtags,
    // mentions) for prohibited or high-risk content.
    const text = postText(post);

    // ── Tier 1: prohibited / unsafe content → hard BLOCK ──────────────
    const safetyMatches = detectPatterns(text, VIOLENCE_SAFETY_PATTERNS);
    if (safetyMatches.length > 0) {
      return {
        agentKey: this.key,
        label: this.label,
        artifact: this.artifact,
        verdict: 'BLOCK',
        score: 95,
        reason: `Post contains prohibited content: ${safetyMatches.slice(0, 4).join(', ')}`,
        categories: { policy_safety: true },
        details: { kind: 'safety', matches: safetyMatches },
      };
    }

    // ── Tier 2: regulated high-risk domains → REVIEW ──────────────────
    const highRiskMatches = detectPatterns(text, HIGH_RISK_PATTERNS);
    if (highRiskMatches.length > 0) {
      const categories: Record<string, boolean> = {};
      for (const m of highRiskMatches) {
        const lower = m.toLowerCase();
        if (/(cure|treat|diagnos|medical|disease|symptom|clinical|therapy|surgery|prescription|medication|drug)/i.test(lower)) categories.healthcare = true;
        if (/(legal|attorney|lawyer|lawsuit|regulatory)/i.test(lower)) categories.legal = true;
        if (/(financial|investment|securities|stock|retirement|insurance|loan|mortgage)/i.test(lower)) categories.financial = true;
        if (/(compliance|HIPAA|GDPR|privacy)/i.test(lower)) categories.compliance = true;
      }
      return {
        agentKey: this.key,
        label: this.label,
        artifact: this.artifact,
        verdict: 'REVIEW',
        score: 75,
        reason: `High-risk content detected: ${Object.keys(categories).join(', ') || 'regulated domain'}`,
        categories,
        details: { kind: 'high_risk', matches: highRiskMatches },
      };
    }

    return {
      agentKey: this.key,
      label: this.label,
      artifact: this.artifact,
      verdict: 'PASS',
      score: 5,
      reason: 'No safety violations or high-risk domains detected.',
      details: { kind: 'none' },
    };
  }
}
