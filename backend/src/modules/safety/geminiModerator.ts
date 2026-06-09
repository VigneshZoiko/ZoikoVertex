// ============================================================
// Groq Semantic Moderation Adapter (replaces Gemini)
//
// Strict-JSON contract. Only invoked by the orchestrator when
// the local engine returns no high-confidence hit and the
// content is non-trivially long. Designed so that the system
// degrades gracefully if Groq is unavailable, rate-limited,
// or returns malformed JSON — caller-side null guards required.
// ============================================================

import OpenAI from "openai";
import { env } from "../../config/env";
import { logger } from "../../shared/logger";
import type { MatchResult, SafetyCategory, Severity } from "./types";
import { SAFETY_CATEGORIES } from "./types";

const GROQ_MODEL = "llama-3.3-70b-versatile";

interface GroqVerdict {
  safe: boolean;
  categories: Partial<Record<SafetyCategory, number>>;
  severity: Severity;
  reason?: string;
}

export interface GroqModerationResult {
  matches: MatchResult[];
  raw: GroqVerdict;
  modelUsed: string;
  tokensUsed: number;
}

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

function parseStrict(text: string): GroqVerdict | null {
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

function toMatches(verdict: GroqVerdict): MatchResult[] {
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
        source: "groq",
      });
    }
  }
  return out;
}

export async function runGroqModeration(
  content: string,
): Promise<GroqModerationResult | null> {
  if (!env.GROQ_API_KEY) return null;

  const client = new OpenAI({
    baseURL: "https://api.groq.com/openai/v1",
    apiKey: env.GROQ_API_KEY,
    timeout: 30_000,
  });

  try {
    const completion = await client.chat.completions.create({
      model: GROQ_MODEL,
      messages: [{ role: "user", content: buildPrompt(content) }],
      temperature: 0,
      max_tokens: 256,
    });
    const text = completion.choices[0]?.message?.content || "";
    if (!text) return null;
    const verdict = parseStrict(text);
    if (!verdict) {
      logger.warn({ rawSnippet: text.slice(0, 120) }, "[safety] Groq moderation returned unparseable JSON");
      return null;
    }
    return { matches: toMatches(verdict), raw: verdict, modelUsed: `groq/${GROQ_MODEL}`, tokensUsed: completion.usage?.total_tokens ?? 0 };
  } catch (err) {
    logger.warn({ err }, "[safety] Groq moderation failed; falling back to local-only");
    return null;
  }
}

// Backward-compat alias — moderationService still imports this name
export const runGeminiModeration = runGroqModeration;
