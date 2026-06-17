// ─────────────────────────────────────────────────────────────────────────────
// Agent 1 — General Content Agent (the common text agent)
//
// Main purpose: read ALL of the post's TEXT artifacts — title, caption,
// description, keywords, hashtags, and mentions — and decide the single question
// that drives the truthfulness path: does this post make a verifiable CLAIM?
//
//   • No claim  → PASS (basic post, safe to approve)
//   • Claim     → PASS, but flags details.hasClaim so the orchestrator runs the
//                 Evidence / KB Agent to substantiate it.
//
// It deliberately does NOT judge safety, banned words, images, or platform
// limits — those belong to the Policy, Approval Rules, Image, and Platform agents.
// ─────────────────────────────────────────────────────────────────────────────

import type { AgentFinding, PostInput, ValidationAgent } from '../types';
import { postText } from '../types';
import { CLAIM_PATTERNS, detectPatterns } from '../patterns';

export class GeneralContentAgent implements ValidationAgent {
  readonly key = 'general_content' as const;
  readonly label = 'General Content Agent';
  readonly artifact = 'title+caption+description+keywords+hashtags+mentions';

  appliesTo(post: PostInput): boolean {
    return Boolean(postText(post));
  }

  async run(post: PostInput): Promise<AgentFinding> {
    // Inspect the FULL set of text artifacts so a claim hidden in any of them
    // (title, caption, description, keywords, hashtags, mentions) is caught.
    const text = postText(post);

    const claims = detectPatterns(text, CLAIM_PATTERNS);
    const hasClaim = claims.length > 0;

    return {
      agentKey: this.key,
      label: this.label,
      artifact: this.artifact,
      verdict: 'PASS',
      score: hasClaim ? 30 : 10,
      reason: hasClaim
        ? `Claim detected — ${claims.length} pattern(s) found: ${claims.slice(0, 4).join(', ')}`
        : 'Basic content — no factual claims detected.',
      categories: hasClaim ? { factual_claim: true } : {},
      details: { hasClaim, claims },
    };
  }
}
