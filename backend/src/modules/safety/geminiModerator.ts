// ============================================================
// Gemini Semantic Moderation Adapter
//
// Strict-JSON contract. Only invoked by the orchestrator when
// the local engine returns no high-confidence hit and the
// content is non-trivially long. Designed so that the system
// degrades gracefully if Gemini is unavailable, rate-limited,
// or returns malformed JSON — caller-side null guards required.
// ============================================================

import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "../../config/env";
import { logger } from "../../shared/logger";
import type { MatchResult, SafetyCategory, Severity } from "./types";
import { SAFETY_CATEGORIES } from "./types";

const MODEL_ID = "gemini-2.5-flash";

// What we ask Gemini to return. Kept very narrow on purpose —
// every additional field is one more parse path that can break.
interface GeminiVerdict {
  safe: boolean;
  categories: Partial<Record<SafetyCategory, number>>;
  severity: Severity;
  reason?: string;
}

export interface GeminiModerationResult {
  matches: MatchResult[];
  raw: GeminiVerdict;
  modelUsed: string;
}

// ------------------------------------------------------------
// Prompt builder. Pinned to a small, well-known set of category
// names so the model can't invent buckets the rest of the system
// doesn't recognize. The temperature is 0 to maximize determinism.
// ------------------------------------------------------------
function buildPrompt(content: string): string {
  return `You are a content-safety classifier for an enterprise governance platform.
Analyze the CONTENT block below and return STRICT JSON only — no prose, no markdown, no code fences.

ALLOWED CATEGORY KEYS (use only these):
${SAFETY_CATEGORIES.join(", ")}

Each category value is a probability from 0.0 to 1.0. Omit categories that are 0.

Output schema (exact keys):
{
  "safe": <boolean>,
  "categories": { "<category_key>": <0..1>, ... },
  "severity": "low" | "medium" | "high" | "critical",
  "reason": "<one-sentence justification, max 140 chars>"
}

CONTENT:
${content}`;
}

// ------------------------------------------------------------
// Tolerant JSON parser — Gemini occasionally wraps JSON in
// markdown code fences despite instructions. Strip those before
// parsing, then JSON.parse. Returns null on any failure so the
// orchestrator can fall back to local-only mode.
// ------------------------------------------------------------
function parseStrict(text: string): GeminiVerdict | null {
  if (!text) return null;
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  try {
    const parsed = JSON.parse(cleaned);
    if (typeof parsed !== "object" || parsed === null) return null;
    if (typeof parsed.safe !== "boolean") return null;
    if (!parsed.categories || typeof parsed.categories !== "object") return null;
    // Filter category keys against allow-list; drop unknown.
    const allowed = new Set<string>(SAFETY_CATEGORIES);
    const filtered: Partial<Record<SafetyCategory, number>> = {};
    for (const [k, v] of Object.entries(parsed.categories)) {
      if (allowed.has(k) && typeof v === "number" && v >= 0 && v <= 1) {
        filtered[k as SafetyCategory] = v;
      }
    }
    const severity: Severity = ["low", "medium", "high", "critical"].includes(parsed.severity)
      ? parsed.severity
      : parsed.safe
        ? "low"
        : "medium";
    return {
      safe: parsed.safe,
      categories: filtered,
      severity,
      reason: typeof parsed.reason === "string" ? parsed.reason.slice(0, 200) : undefined,
    };
  } catch {
    return null;
  }
}

// ------------------------------------------------------------
// Map Gemini's probability map into MatchResult objects so the
// orchestrator can merge them with local matches uniformly.
// ------------------------------------------------------------
function toMatches(verdict: GeminiVerdict): MatchResult[] {
  const out: MatchResult[] = [];
  for (const [cat, prob] of Object.entries(verdict.categories)) {
    if (prob && prob > 0) {
      out.push({
        pattern: "<semantic>",
        category: cat as SafetyCategory,
        severity: verdict.severity,
        score: prob,
        matchedText: verdict.reason || "<semantic moderation>",
        position: { start: 0, end: 0 },
        source: "gemini",
      });
    }
  }
  return out;
}

// ------------------------------------------------------------
// Public API — returns null when Gemini is unavailable so the
// orchestrator falls back to local-only confidence.
// ------------------------------------------------------------
export async function runGeminiModeration(
  content: string,
): Promise<GeminiModerationResult | null> {
  if (!env.GEMINI_API_KEY) {
    return null;
  }

  try {
    const client = new GoogleGenerativeAI(env.GEMINI_API_KEY);
    const model = client.getGenerativeModel({
      model: MODEL_ID,
      generationConfig: { temperature: 0, maxOutputTokens: 256 },
    });
    const resp = await model.generateContent(buildPrompt(content));
    const text = resp.response.text();
    const verdict = parseStrict(text);
    if (!verdict) {
      logger.warn({ rawSnippet: text.slice(0, 120) }, "[safety] Gemini returned unparseable JSON");
      return null;
    }
    return {
      matches: toMatches(verdict),
      raw: verdict,
      modelUsed: MODEL_ID,
    };
  } catch (err) {
    logger.warn({ err }, "[safety] Gemini moderation failed; falling back to local-only");
    return null;
  }
}
