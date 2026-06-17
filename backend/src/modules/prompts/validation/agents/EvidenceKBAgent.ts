// ─────────────────────────────────────────────────────────────────────────────
// Agent 5 — Evidence / KB Agent
//
// Main purpose: substantiate the claims the General Content Agent found. Runs a
// two-stage Knowledge Base check:
//   Stage 1 — cheap word-overlap PRE-FILTER to narrow the field to plausibly
//             related sources (meaning-blind; never the final word).
//   Stage 2 — Groq semantic ENTAILMENT (SUPPORT / CONTRADICT / NEUTRAL). Only
//             SUPPORT counts as evidence.
//
//   • SUPPORT match found → PASS (claim is backed by approved knowledge)
//   • no support / Groq unavailable → REVIEW (fail safe: never auto-approve an
//     unverified claim on word overlap alone)
//
// This agent only runs when a claim is present, so it is invoked by the
// orchestrator rather than on every post.
// ─────────────────────────────────────────────────────────────────────────────

import type { AgentFinding, PostInput, ValidationAgent } from '../types';
import type { KnowledgeMatch } from '../../PostGovernanceService.types';
import { GENERIC_STOPWORDS, tokenize } from '../patterns';
import { verifyEvidence } from '../../EvidenceEntailmentService';
import { supabaseAdmin } from '../../../../shared/supabase';
import { logger } from '../../../../shared/logger';

export class EvidenceKBAgent implements ValidationAgent {
  readonly key = 'evidence_kb' as const;
  readonly label = 'Evidence / KB Agent';
  readonly artifact = 'claim';

  // Always "applies", but the orchestrator only invokes it when a claim exists.
  appliesTo(post: PostInput): boolean {
    return Boolean((post.content || post.description || '').trim());
  }

  async run(post: PostInput): Promise<AgentFinding> {
    const claimText = `${post.heading || ''} ${post.description || ''} ${post.content || ''}`.trim();
    const matches = await this.lookupKnowledgeBase(claimText, post.workspaceId);

    if (matches.length > 0) {
      return {
        agentKey: this.key,
        label: this.label,
        artifact: this.artifact,
        verdict: 'PASS',
        score: 20,
        reason: `Supporting evidence found in Knowledge Base (${matches.length} source(s)).`,
        categories: { factual_claim: true },
        evidence: matches,
        details: { kbStatus: 'Evidence found' },
      };
    }

    return {
      agentKey: this.key,
      label: this.label,
      artifact: this.artifact,
      verdict: 'REVIEW',
      score: 55,
      reason: 'No approved Knowledge Base source supports this claim. Manual review required.',
      categories: { factual_claim: true },
      evidence: [],
      details: { kbStatus: 'No evidence found' },
    };
  }

  /**
   * Look up the Knowledge Base for sources that genuinely SUPPORT the claim.
   * Word-overlap pre-filter → Groq semantic entailment. Fails safe to [] (no
   * evidence) whenever Groq is unavailable, so the claim is routed to review.
   */
  private async lookupKnowledgeBase(
    content: string,
    workspaceId: string,
  ): Promise<KnowledgeMatch[]> {
    try {
      const { data: allSources } = await supabaseAdmin
        .from('knowledge_sources')
        .select('id, title, content, metadata, status')
        .eq('workspace_id', workspaceId)
        .limit(50);

      const USABLE_STATUSES = ['ACTIVE', 'APPROVED'];
      const sources = (allSources || []).filter((s: any) =>
        USABLE_STATUSES.includes(String(s.status || '').toUpperCase()),
      );
      if (sources.length === 0) return [];

      const contentWords = [
        ...new Set(tokenize(content).filter((w) => w.length > 3 && !GENERIC_STOPWORDS.has(w))),
      ];
      const namedEntities = [
        ...new Set(
          (content.match(/\b[A-Z][A-Za-z0-9'&-]{2,}\b/g) || [])
            .map((w) => w.toLowerCase())
            .filter((w) => !GENERIC_STOPWORDS.has(w)),
        ),
      ];

      // ── Stage 1: cheap word-overlap PRE-FILTER ───────────────────────
      const candidates: Array<{ src: any; match: KnowledgeMatch }> = [];
      for (const src of sources) {
        const srcText = ((src.content || '') + ' ' + (src.title || '')).toLowerCase();
        const matchCount = contentWords.filter((w) => srcText.includes(w)).length;
        const relevant =
          contentWords.length > 0 && (matchCount >= 1 || namedEntities.length > 0);
        if (relevant) {
          const meta = src.metadata || {};
          const matchAction = meta.match_action || meta.default_match_action || 'review';
          candidates.push({
            src,
            match: {
              id: src.id,
              title: src.title || 'Untitled',
              citation_reference: meta.citation_reference || meta.citation || undefined,
              match_action: matchAction as 'approve' | 'review' | 'block',
            },
          });
        }
      }
      if (candidates.length === 0) return [];

      // ── Stage 2: Groq semantic ENTAILMENT verification ───────────────
      const verdicts = await verifyEvidence(
        content,
        candidates.map((c) => ({
          id: c.src.id,
          title: c.src.title || '',
          content: c.src.content || '',
        })),
      );

      // Fail safe: cannot certify support without the model → no evidence.
      if (verdicts === null) {
        logger.warn(
          { candidateCount: candidates.length },
          '[evidence-kb-agent] semantic verification unavailable — failing safe to review',
        );
        return [];
      }

      return candidates
        .filter((c) => verdicts.get(c.src.id)?.relation === 'SUPPORT')
        .map((c) => c.match);
    } catch (err) {
      logger.warn({ err }, '[evidence-kb-agent] KB lookup failed');
      return [];
    }
  }
}
