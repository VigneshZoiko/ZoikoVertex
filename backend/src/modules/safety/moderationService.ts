// ============================================================
// Moderation Service — public API of the safety module.
//
// Orchestrates:
//   1. Local deterministic engine (always runs).
//   2. Optional Gemini semantic fallback, gated on confidence
//      heuristic + caller flag + key availability.
//   3. Score aggregation, evidence ID assignment, and a single
//      uniform ModerationResult.
//
// Cost optimization: Gemini is skipped entirely when the local
// engine is confident OR when content is shorter than a minimum
// length where semantic disambiguation adds no value.
// ============================================================

import crypto from "crypto";
import { runLocalEngine } from "./localEngine";
import { runGeminiModeration } from "./geminiModerator";
import { aggregateMatches } from "./riskScoring";
import { DEFAULT_THRESHOLDS } from "./types";
import type { ModerationInput, ModerationResult, MatchResult } from "./types";
import { GovernedModelGate } from "../prompts/GovernedModelGate";

// Minimum input length where semantic moderation is worth a Gemini call.
// Below this, the input is too short to convey context the local engine
// missed; we accept the local verdict directly.
const GEMINI_MIN_CHARS = 24;

function newEvidenceId(): string {
  return `safety-${Date.now()}-${crypto.randomBytes(6).toString("hex")}`;
}

export async function moderate(input: ModerationInput): Promise<ModerationResult> {
  const startedAt = Date.now();
  const thresholds = { ...DEFAULT_THRESHOLDS, ...(input.thresholds || {}) };
  const content = input.content || "";

  // ----- Phase 1: local -----
  const localStart = Date.now();
  const local = runLocalEngine(content);
  const localMs = Date.now() - localStart;

  let allMatches: MatchResult[] = [...local.matches];
  let source: ModerationResult["source"] = "local";
  let modelUsed: string | undefined;
  let geminiMs: number | undefined;
  let reason: string | undefined;

  // ----- Phase 2: gemini fallback (gated) -----
  const shouldCallGemini =
    !input.localOnly &&
    !local.highConfidence &&
    content.length >= GEMINI_MIN_CHARS;

  let governanceHardBlock = false;
  let governanceBlockReason: string | undefined;

  if (shouldCallGemini) {
    const workspaceId = input.workspaceId || input.tenantId || "";
    const geminiStart = Date.now();
    // The AI moderation step is a governed model call. A governed
    // 'safety_moderation' prompt authorizes it; if none resolves AND enforcement
    // is on in production, we MUST NOT fall back to a local verdict (which could
    // be "safe") — we hard-block. Local confidence cannot override this.
    const cap: { result: Awaited<ReturnType<typeof runGeminiModeration>> } = { result: null };
    const governed = await GovernedModelGate.execute({
      useCaseKey: "safety_moderation",
      workspaceId,
      variables: { content },
      modelProvider: "gemini",
      invoke: async () => {
        cap.result = await runGeminiModeration(content);
        return cap.result ? cap.result.raw?.reason || "moderated" : "";
      },
    });
    geminiMs = Date.now() - geminiStart;

    if (governed.ok) {
      if (cap.result) {
        allMatches = [...allMatches, ...cap.result.matches];
        source = local.matches.length > 0 ? "hybrid" : "gemini";
        modelUsed = cap.result.modelUsed;
        reason = cap.result.raw.reason;
      }
    } else {
      try {
        // Not enforced ⇒ records an advisory bypass and preserves legacy behavior.
        await GovernedModelGate.legacyInlineFallback("safety_moderation", workspaceId, `governed safety prompt unavailable: ${governed.code}`);
        const gemini = await runGeminiModeration(content);
        if (gemini) {
          allMatches = [...allMatches, ...gemini.matches];
          source = local.matches.length > 0 ? "hybrid" : "gemini";
          modelUsed = gemini.modelUsed;
          reason = gemini.raw.reason;
        }
      } catch {
        // Enforced production ⇒ hard block (fail-closed, not fail-open).
        governanceHardBlock = true;
        governanceBlockReason = `Safety moderation blocked: a governed prompt is required (${governed.code}).`;
      }
    }
  }

  // ----- Phase 3: aggregate -----
  const { categoryScores, overallRisk, severity, verdict } = aggregateMatches(
    allMatches,
    thresholds,
  );

  // ----- Phase 3b: governance hard block overrides any local "safe" verdict -----
  if (governanceHardBlock) {
    return {
      safe: false,
      verdict: "block",
      overallRisk: 1,
      severity: "critical",
      categoryScores: { ...categoryScores, platform_unsafe: 1 },
      matches: allMatches,
      source,
      evidenceId: newEvidenceId(),
      timestamp: new Date().toISOString(),
      reason: governanceBlockReason,
      modelUsed,
      timings: { local: localMs, gemini: geminiMs, total: Date.now() - startedAt },
    };
  }

  // ----- Phase 4: build evidence-stamped result -----
  return {
    safe: verdict === "safe",
    verdict,
    overallRisk,
    severity,
    categoryScores,
    matches: allMatches,
    source,
    evidenceId: newEvidenceId(),
    timestamp: new Date().toISOString(),
    reason,
    modelUsed,
    timings: {
      local: localMs,
      gemini: geminiMs,
      total: Date.now() - startedAt,
    },
  };
}

// ------------------------------------------------------------
// Convenience: synchronous-friendly local-only mode for hot paths
// like sandbox replay where Gemini latency is unacceptable.
// ------------------------------------------------------------
export function moderateLocalOnly(content: string): ModerationResult {
  const startedAt = Date.now();
  const { matches } = runLocalEngine(content);
  const { categoryScores, overallRisk, severity, verdict } = aggregateMatches(matches);
  return {
    safe: verdict === "safe",
    verdict,
    overallRisk,
    severity,
    categoryScores,
    matches,
    source: "local",
    evidenceId: newEvidenceId(),
    timestamp: new Date().toISOString(),
    timings: { local: Date.now() - startedAt, total: Date.now() - startedAt },
  };
}

// Re-exports for ergonomic consumer imports.
export type {
  ModerationInput,
  ModerationResult,
  MatchResult,
  SafetyCategory,
  Severity,
  Verdict,
} from "./types";
