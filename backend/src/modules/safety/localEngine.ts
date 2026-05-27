// ============================================================
// Local Deterministic Safety Engine
//
// Two-phase matching:
//   1. Regex-based patterns (precise, e.g. credit cards, SSN)
//   2. Normalized substring search against a precomputed index
//      of word-pattern entries.
//
// The index is built once at module load and shared across all
// callers. Re-indexing is intentionally O(n) over the patterns;
// the cost is negligible for the catalog size we ship.
// ============================================================

import { normalizeForMatching } from "./normalize";
import { ALL_PATTERNS } from "./dictionaries";
import type { MatchResult, SafetyPattern } from "./types";

// ------------------------------------------------------------
// Indexed patterns — split into regex and string buckets for
// dispatch efficiency. Each pattern's canonical match-form is
// pre-normalized so the matcher never normalizes on the hot path.
// ------------------------------------------------------------
interface IndexedPattern extends SafetyPattern {
  normalized: string;
}

const REGEX_PATTERNS: SafetyPattern[] = [];
const STRING_PATTERNS: IndexedPattern[] = [];

for (const p of ALL_PATTERNS) {
  if (p.regex) {
    REGEX_PATTERNS.push(p);
  } else {
    STRING_PATTERNS.push({
      ...p,
      normalized: normalizeForMatching(p.pattern, {
        // Patterns themselves are already canonical English — we only
        // collapse repeats/separators on inputs, not on the rules.
        collapseRepeats: false,
        collapseSeparators: false,
      }),
    });
  }
}

// ------------------------------------------------------------
// Boundary helpers — local matching deliberately respects word
// boundaries unless the pattern is multi-token. Patterns that
// contain a space (e.g. "ignore previous instructions") are
// matched as-is; single tokens require alphanumeric boundaries.
// ------------------------------------------------------------
function isWordBoundary(s: string, pos: number): boolean {
  if (pos < 0 || pos >= s.length) return true;
  const ch = s.charCodeAt(pos);
  // Alphanumeric ranges: 0-9 (48-57), A-Z (65-90), a-z (97-122)
  const isAlnum =
    (ch >= 48 && ch <= 57) ||
    (ch >= 65 && ch <= 90) ||
    (ch >= 97 && ch <= 122);
  return !isAlnum;
}

function findAllOccurrences(
  haystack: string,
  needle: string,
  needWordBoundary: boolean,
): Array<{ start: number; end: number }> {
  if (!needle) return [];
  const matches: Array<{ start: number; end: number }> = [];
  let from = 0;
  while (from <= haystack.length - needle.length) {
    const idx = haystack.indexOf(needle, from);
    if (idx < 0) break;
    const end = idx + needle.length;
    if (
      !needWordBoundary ||
      (isWordBoundary(haystack, idx - 1) && isWordBoundary(haystack, end))
    ) {
      matches.push({ start: idx, end });
    }
    from = idx + 1;
  }
  return matches;
}

// ------------------------------------------------------------
// Public API
// ------------------------------------------------------------
export interface LocalEngineResult {
  matches: MatchResult[];
  /** True when the matcher has high-confidence hits (severity ≥ high
   *  OR ≥ 2 medium hits). Used by orchestrator to short-circuit Gemini. */
  highConfidence: boolean;
}

export function runLocalEngine(input: string): LocalEngineResult {
  if (!input) {
    return { matches: [], highConfidence: false };
  }

  const matches: MatchResult[] = [];

  // ----- Phase 1: regex patterns (operate on RAW input) -----
  // Regex patterns are typically structural (credit card, SSN, token)
  // and don't benefit from normalization — formatting IS the signal.
  for (const p of REGEX_PATTERNS) {
    const re = p.regex!;
    // Make the regex stateless by reading without /g semantics.
    const m = input.match(new RegExp(re.source, re.flags.replace("g", "")));
    if (m && m.index !== undefined) {
      matches.push({
        pattern: p.pattern,
        category: p.category,
        severity: p.severity,
        score: p.score,
        matchedText: m[0],
        position: { start: m.index, end: m.index + m[0].length },
        source: "local",
      });
    }
  }

  // ----- Phase 2: normalized string patterns -----
  const normalized = normalizeForMatching(input);
  for (const p of STRING_PATTERNS) {
    const isPhrase = p.pattern.includes(" ");
    const needWordBoundary = p.wholeWord ?? !isPhrase;
    const occurrences = findAllOccurrences(
      normalized,
      p.normalized,
      needWordBoundary,
    );
    for (const occ of occurrences) {
      matches.push({
        pattern: p.pattern,
        category: p.category,
        severity: p.severity,
        score: p.score,
        matchedText: normalized.slice(occ.start, occ.end),
        position: occ,
        source: "local",
      });
    }
  }

  // ----- Confidence heuristic -----
  // Critical or high-severity hit ⇒ confident block.
  // Two or more medium hits ⇒ confident review.
  const hasCriticalOrHigh = matches.some(
    (m) => m.severity === "critical" || m.severity === "high",
  );
  const mediumCount = matches.filter((m) => m.severity === "medium").length;
  const highConfidence = hasCriticalOrHigh || mediumCount >= 2;

  return { matches, highConfidence };
}
