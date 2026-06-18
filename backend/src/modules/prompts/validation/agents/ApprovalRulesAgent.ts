// ─────────────────────────────────────────────────────────────────────────────
// Agent 3 — Approval Rules Agent
//
// Main purpose: enforce the words THIS customer banned. Reads the
// tenant-configured `keyword_rules` on every enforceable row of the
// `approval_rules` table (any status except DISABLED/ARCHIVED/INVALID — see
// KEYWORD_RULE_OFF_STATUSES) and flags the post when its text contains a
// blocked keyword. The rule's own action decides the verdict:
//   • action BLOCK          → BLOCK
//   • action REQUEST_REVIEW  → REVIEW
//
// Distinct from the Policy Check Agent (universal/system policy). This agent is
// per-workspace and fully customer-editable. The same loaded keyword set is
// reused by the Image Validation Agent to scan text extracted from images.
// ─────────────────────────────────────────────────────────────────────────────

import type { AgentFinding, PostInput, ValidationAgent } from '../types';
import { postText } from '../types';
import { supabaseAdmin } from '../../../../shared/supabase';
import { logger } from '../../../../shared/logger';

export interface KeywordRule {
  id: string;
  keywords: string[];
  action: 'BLOCK' | 'REQUEST_REVIEW';
}

// Statuses that mean the rule is explicitly turned OFF and must NOT be enforced.
// Everything else (DRAFT, NEEDS_REVIEW, READY_TO_PUBLISH, ACTIVE,
// ACTIVE_WITH_DRAFT_CHANGES, CONFLICT_DETECTED) is enforced at publish time.
// Rationale: the Approval Rules page creates keyword rules as DRAFT and exposes
// no publish/activate action, so a DRAFT rule would otherwise NEVER enforce — a
// banned word like "zoiko" would silently pass through to the claim agents.
// This matches the Validation Desk test surface, which already includes DRAFT.
const KEYWORD_RULE_OFF_STATUSES = ['DISABLED', 'ARCHIVED', 'INVALID'];

/**
 * Load every enforceable keyword rule for the workspace.
 * Shared with the Image Validation Agent so the blocked-word list is fetched
 * from one place and matched against both post text and image-OCR text.
 * Fails safe to an empty list (so a DB/migration issue never hard-blocks posts).
 */
export async function loadKeywordRules(
  workspaceId: string,
  tenantId?: string,
): Promise<KeywordRule[]> {
  try {
    let query = supabaseAdmin
      .from('approval_rules')
      .select('id, keyword_rules, rule_status, workspace_id, tenant_id')
      .not('rule_status', 'in', `(${KEYWORD_RULE_OFF_STATUSES.join(',')})`);

    if (tenantId) query = query.eq('tenant_id', tenantId);
    else query = query.eq('workspace_id', workspaceId);

    const { data, error } = await query.limit(200);
    if (error) {
      // 42P01 (missing table) / 42703 (missing column) → migration not applied yet.
      logger.warn({ err: error.message || String(error) }, '[approval-rules-agent] keyword rule load failed; failing open');
      return [];
    }

    const rules: KeywordRule[] = [];
    for (const row of data || []) {
      const kr = (row as { keyword_rules?: unknown }).keyword_rules;
      if (!Array.isArray(kr)) continue;
      for (const entry of kr as Array<{ keywords?: unknown; action?: unknown }>) {
        const keywords = Array.isArray(entry?.keywords)
          ? (entry.keywords as unknown[]).map((k) => String(k)).filter(Boolean)
          : [];
        if (keywords.length === 0) continue;
        const action = entry?.action === 'BLOCK' ? 'BLOCK' : 'REQUEST_REVIEW';
        rules.push({ id: String((row as { id: string }).id), keywords, action });
      }
    }
    return rules;
  } catch (err) {
    logger.warn({ err }, '[approval-rules-agent] keyword rule load threw; failing open');
    return [];
  }
}

export class ApprovalRulesAgent implements ValidationAgent {
  readonly key = 'approval_rules' as const;
  readonly label = 'Approval Rules Agent';
  readonly artifact = 'text+image-ocr';

  appliesTo(post: PostInput): boolean {
    return Boolean(postText(post));
  }

  async run(post: PostInput): Promise<AgentFinding> {
    // Scan ALL text artifacts (title, caption, description, keywords, hashtags,
    // mentions) — a banned word anywhere in the post must be caught.
    const text = postText(post).toLowerCase();
    const rules = await loadKeywordRules(post.workspaceId, post.tenantId);

    // Collect EVERY matched keyword — never stop at the first hit. Dedupe so the
    // same keyword from multiple rules is reported once.
    const blocked = new Set<string>();
    const review = new Set<string>();

    for (const rule of rules) {
      for (const kw of rule.keywords) {
        const needle = kw.toLowerCase().trim();
        if (needle && text.includes(needle)) {
          if (rule.action === 'BLOCK') blocked.add(kw);
          else review.add(kw);
        }
      }
    }

    const blockedList = [...blocked];
    const reviewList = [...review];

    if (blockedList.length > 0) {
      return {
        agentKey: this.key,
        label: this.label,
        artifact: this.artifact,
        verdict: 'BLOCK',
        score: 90,
        reason: `Blocked keyword(s) from your Approval Rules found in post: ${blockedList.map((k) => `"${k}"`).join(', ')}`,
        categories: { approval_rule_block: true },
        details: {
          blockedKeywords: blockedList,
          reviewKeywords: reviewList,
          matchCount: blockedList.length + reviewList.length,
          ruleCount: rules.length,
        },
      };
    }

    if (reviewList.length > 0) {
      return {
        agentKey: this.key,
        label: this.label,
        artifact: this.artifact,
        verdict: 'REVIEW',
        score: 50,
        reason: `Approval Rules keyword(s) requiring review: ${reviewList.map((k) => `"${k}"`).join(', ')}`,
        categories: { approval_rule_review: true },
        details: { reviewKeywords: reviewList, matchCount: reviewList.length, ruleCount: rules.length },
      };
    }

    return {
      agentKey: this.key,
      label: this.label,
      artifact: this.artifact,
      verdict: 'PASS',
      score: 5,
      reason: rules.length > 0
        ? `No blocked keywords found (${rules.length} rule(s) checked).`
        : 'No approval keyword rules configured.',
      details: { ruleCount: rules.length },
    };
  }
}
