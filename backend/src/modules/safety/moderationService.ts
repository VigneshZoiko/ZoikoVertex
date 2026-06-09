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
import { runGroqModeration } from "./geminiModerator";
import { aggregateMatches } from "./riskScoring";
import { DEFAULT_THRESHOLDS } from "./types";
import type { ModerationInput, ModerationResult, MatchResult } from "./types";
import { GovernedModelGate } from "../prompts/GovernedModelGate";
import { trackUsage } from "../../domains/monitoring/usageController";

// Minimum input length where semantic moderation is worth a Groq call.
// Below this, the input is too short to convey context the local engine
// missed; we accept the local verdict directly.
const SEMANTIC_MIN_CHARS = 24;

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
  let groqMs: number | undefined;
  let reason: string | undefined;

  // ----- Phase 2: groq semantic fallback (gated) -----
  const shouldCallGroq =
    !input.localOnly &&
    !local.highConfidence &&
    content.length >= SEMANTIC_MIN_CHARS;

  let governanceHardBlock = false;
  let governanceBlockReason: string | undefined;

  if (shouldCallGroq) {
    const workspaceId = input.workspaceId || input.tenantId || "";
    const groqStart = Date.now();
    // The AI moderation step is a governed model call. A governed
    // 'safety_moderation' prompt authorizes it; if none resolves AND enforcement
    // is on in production, we MUST NOT fall back to a local verdict (which could
    // be "safe") — we hard-block. Local confidence cannot override this.
    const cap: { result: Awaited<ReturnType<typeof runGroqModeration>> } = { result: null };
    const governed = await GovernedModelGate.execute({
      useCaseKey: "safety_moderation",
      workspaceId,
      variables: { content },
      modelProvider: "groq",
      invoke: async () => {
        cap.result = await runGroqModeration(content);
        return cap.result ? cap.result.raw?.reason || "moderated" : "";
      },
    });
    groqMs = Date.now() - groqStart;

    if (governed.ok) {
      if (cap.result) {
        allMatches = [...allMatches, ...cap.result.matches];
        source = local.matches.length > 0 ? "hybrid" : "groq";
        modelUsed = cap.result.modelUsed;
        reason = cap.result.raw.reason;
        if (workspaceId) {
          const qty = cap.result.tokensUsed > 0 ? cap.result.tokensUsed : 384;
          trackUsage({ workspaceId, resourceType: 'AI_TOKENS', quantity: qty, costUsd: qty * 0.0000001, unit: 'tokens', referenceType: 'safety_moderation', metadata: { model: 'llama-3.3-70b-versatile', estimated: cap.result.tokensUsed === 0 } });
        }
      }
    } else {
      try {
        // Not enforced ⇒ records an advisory bypass and preserves legacy behavior.
        await GovernedModelGate.legacyInlineFallback("safety_moderation", workspaceId, `governed safety prompt unavailable: ${governed.code}`);
        const groq = await runGroqModeration(content);
        if (groq) {
          allMatches = [...allMatches, ...groq.matches];
          source = local.matches.length > 0 ? "hybrid" : "groq";
          modelUsed = groq.modelUsed;
          reason = groq.raw.reason;
          if (workspaceId) {
            const qty = groq.tokensUsed > 0 ? groq.tokensUsed : 384;
            trackUsage({ workspaceId, resourceType: 'AI_TOKENS', quantity: qty, costUsd: qty * 0.0000001, unit: 'tokens', referenceType: 'safety_moderation', metadata: { model: 'llama-3.3-70b-versatile', estimated: groq.tokensUsed === 0 } });
          }
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
      timings: { local: localMs, groq: groqMs, total: Date.now() - startedAt },
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
      groq: groqMs,
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
