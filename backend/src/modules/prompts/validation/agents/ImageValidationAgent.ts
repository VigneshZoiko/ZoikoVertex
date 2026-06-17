// ─────────────────────────────────────────────────────────────────────────────
// Agent 2 — Image Validation Agent
//
// Main purpose: inspect every image/media URL on the post for unsafe visual
// content (nudity, violence, hate symbols, …) AND for blocked words appearing
// as TEXT inside the image (OCR). Wraps the existing Groq-Vision `scanImage`
// scanner and feeds it the same keyword rules the Approval Rules Agent uses, so
// a banned word baked into an image is caught just like one in the caption.
//
//   • any BLOCK violation         → BLOCK
//   • any REQUEST_REVIEW violation → REVIEW
//   • clean / scan skipped          → PASS (fails open — never blocks on infra)
// ─────────────────────────────────────────────────────────────────────────────

import type { AgentFinding, PostInput, ValidationAgent } from '../types';
import { skippedFinding } from '../types';
import { scanImage } from '../../../safety/imageScanner';
import { loadKeywordRules } from './ApprovalRulesAgent';

export class ImageValidationAgent implements ValidationAgent {
  readonly key = 'image_validation' as const;
  readonly label = 'Image Validation Agent';
  readonly artifact = 'image';

  appliesTo(post: PostInput): boolean {
    return Array.isArray(post.imageUrls) && post.imageUrls.length > 0;
  }

  async run(post: PostInput): Promise<AgentFinding> {
    if (!this.appliesTo(post)) {
      return skippedFinding(this, 'No images attached to the post.');
    }

    const keywordRules = await loadKeywordRules(post.workspaceId, post.tenantId);

    let hasBlock = false;
    let hasReview = false;
    const reasons: string[] = [];
    let scannedCount = 0;
    let skippedCount = 0;

    // Bound the number of images scanned per post to keep latency/cost sane.
    for (const url of post.imageUrls.slice(0, 6)) {
      const result = await scanImage(url, keywordRules, undefined, post.workspaceId);
      if (result.skipped) {
        skippedCount += 1;
        continue;
      }
      scannedCount += 1;
      for (const v of result.violations) {
        if (v.action === 'BLOCK') hasBlock = true;
        else hasReview = true;
        reasons.push(v.description);
      }
    }

    if (hasBlock) {
      return {
        agentKey: this.key,
        label: this.label,
        artifact: this.artifact,
        verdict: 'BLOCK',
        score: 92,
        reason: `Unsafe image content: ${reasons.slice(0, 3).join('; ')}`,
        categories: { unsafe_image: true },
        details: { scannedCount, skippedCount },
      };
    }

    if (hasReview) {
      return {
        agentKey: this.key,
        label: this.label,
        artifact: this.artifact,
        verdict: 'REVIEW',
        score: 55,
        reason: `Image needs review: ${reasons.slice(0, 3).join('; ')}`,
        categories: { image_review: true },
        details: { scannedCount, skippedCount },
      };
    }

    return {
      agentKey: this.key,
      label: this.label,
      artifact: this.artifact,
      verdict: 'PASS',
      score: 5,
      reason: scannedCount > 0
        ? `${scannedCount} image(s) scanned — no unsafe content.`
        : 'Image scan unavailable — treated as safe.',
      details: { scannedCount, skippedCount },
    };
  }
}
