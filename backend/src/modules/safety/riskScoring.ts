// ============================================================
// Risk Scoring — aggregates per-match scores into a category
// breakdown and an overall risk number, then maps to a verdict.
//
// Scoring philosophy:
//   - Per-category score saturates at 1.0 (multiple low-confidence
//     hits don't compound past a single high-confidence hit).
//   - Overall risk is the weighted MAX of category scores, not
//     the sum — one critical category alone should block.
//   - Severity badge is the worst severity among matched categories.
// ============================================================

import type {
  MatchResult,
  SafetyCategory,
  Severity,
  Verdict,
} from "./types";
import { CATEGORY_WEIGHTS, DEFAULT_THRESHOLDS } from "./types";

const SEVERITY_RANK: Record<Severity, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

const SEVERITY_FROM_RANK: Severity[] = ["low", "low", "medium", "high", "critical"];

export interface AggregatedScores {
  categoryScores: Partial<Record<SafetyCategory, number>>;
  overallRisk: number;
  severity: Severity;
  verdict: Verdict;
}

export function aggregateMatches(
  matches: MatchResult[],
  thresholds: { review: number; block: number } = DEFAULT_THRESHOLDS,
): AggregatedScores {
  // ----- 1. Bucket scores by category, saturating at 1.0 -----
  const byCategory = new Map<SafetyCategory, number>();
  let worstRank = 0;

  for (const m of matches) {
    const current = byCategory.get(m.category) ?? 0;
    // Use max-with-soft-bonus: one strong hit dominates, but
    // multiple weaker hits in the same category nudge upward.
    const combined = Math.min(1, Math.max(current, m.score) + (current > 0 ? 0.05 : 0));
    byCategory.set(m.category, combined);

    if (SEVERITY_RANK[m.severity] > worstRank) {
      worstRank = SEVERITY_RANK[m.severity];
    }
  }

  // ----- 2. Compute overall risk = weighted max -----
  let overallRisk = 0;
  const categoryScores: Partial<Record<SafetyCategory, number>> = {};
  for (const [cat, score] of byCategory) {
    const weighted = score * CATEGORY_WEIGHTS[cat];
    categoryScores[cat] = Number(score.toFixed(3));
    if (weighted > overallRisk) overallRisk = weighted;
  }
  overallRisk = Number(overallRisk.toFixed(3));

  // ----- 3. Map to verdict -----
  let verdict: Verdict = "safe";
  if (overallRisk >= thresholds.block) verdict = "block";
  else if (overallRisk >= thresholds.review) verdict = "review";

  const severity =
    worstRank === 0 ? "low" : SEVERITY_FROM_RANK[worstRank] ?? "low";

  return { categoryScores, overallRisk, severity, verdict };
}
