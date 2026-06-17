// ─────────────────────────────────────────────────────────────────────────────
// Agent 6 — Platform Compliance Agent
//
// Main purpose: answer "will the target platform actually accept this post, or
// reject/truncate it?" BEFORE it hits the platform API. Pure deterministic
// rules (no LLM): caption length, hashtag count, and image count against each
// platform's hard limits.
//
//   • any hard limit exceeded → BLOCK (with the specific limit that failed)
//   • within limits            → PASS
// ─────────────────────────────────────────────────────────────────────────────

import type { AgentFinding, PostInput, ValidationAgent } from '../types';

interface PlatformLimits {
  label: string;
  maxChars: number;
  maxHashtags: number;
  maxImages: number;
}

// Conservative published limits per platform. Unknown platforms fall back to a
// generous default so the agent never blocks a post on a platform we don't model.
const PLATFORM_LIMITS: Record<string, PlatformLimits> = {
  x:         { label: 'X (Twitter)', maxChars: 280,   maxHashtags: 30, maxImages: 4 },
  twitter:   { label: 'X (Twitter)', maxChars: 280,   maxHashtags: 30, maxImages: 4 },
  threads:   { label: 'Threads',     maxChars: 500,   maxHashtags: 30, maxImages: 10 },
  instagram: { label: 'Instagram',   maxChars: 2200,  maxHashtags: 30, maxImages: 10 },
  tiktok:    { label: 'TikTok',      maxChars: 2200,  maxHashtags: 30, maxImages: 35 },
  linkedin:  { label: 'LinkedIn',    maxChars: 3000,  maxHashtags: 30, maxImages: 9 },
  facebook:  { label: 'Facebook',    maxChars: 63206, maxHashtags: 30, maxImages: 80 },
};

const DEFAULT_LIMITS: PlatformLimits = {
  label: 'Generic',
  maxChars: 3000,
  maxHashtags: 30,
  maxImages: 10,
};

export class PlatformComplianceAgent implements ValidationAgent {
  readonly key = 'platform_compliance' as const;
  readonly label = 'Platform Compliance Agent';
  readonly artifact = 'platform';

  appliesTo(_post: PostInput): boolean {
    // Always runs — every post targets some platform.
    return true;
  }

  async run(post: PostInput): Promise<AgentFinding> {
    const limits = PLATFORM_LIMITS[(post.platform || '').toLowerCase()] || DEFAULT_LIMITS;
    // The published caption is the visible body (heading + description/content).
    const caption = `${post.heading ? post.heading + ' ' : ''}${post.content || post.description || ''}`;
    const charCount = caption.length;
    const hashtagCount = post.hashtags.length;
    const imageCount = post.imageUrls.length;

    const violations: string[] = [];
    if (charCount > limits.maxChars) {
      violations.push(`caption is ${charCount} chars (max ${limits.maxChars} on ${limits.label})`);
    }
    if (hashtagCount > limits.maxHashtags) {
      violations.push(`${hashtagCount} hashtags (max ${limits.maxHashtags} on ${limits.label})`);
    }
    if (imageCount > limits.maxImages) {
      violations.push(`${imageCount} images (max ${limits.maxImages} on ${limits.label})`);
    }

    if (violations.length > 0) {
      return {
        agentKey: this.key,
        label: this.label,
        artifact: this.artifact,
        verdict: 'BLOCK',
        score: 80,
        reason: `${limits.label} will reject this post: ${violations.join('; ')}.`,
        categories: { platform_limit: true },
        details: { platform: limits.label, charCount, hashtagCount, imageCount, violations },
      };
    }

    return {
      agentKey: this.key,
      label: this.label,
      artifact: this.artifact,
      verdict: 'PASS',
      score: 5,
      reason: `Within ${limits.label} limits (${charCount}/${limits.maxChars} chars, ${hashtagCount}/${limits.maxHashtags} tags).`,
      details: { platform: limits.label, charCount, hashtagCount, imageCount },
    };
  }
}
