// ============================================================
// Groq Semantic Moderation Adapter (LLM fallback)
//
// Strict-JSON contract. Invoked by the orchestrator ONLY when the
// local dictionary engine finds nothing (or is not confident) — it
// is the "if the word list can't find anything, ask the model"
// fallback. Groq exposes an OpenAI-compatible chat-completions API,
// so we reuse the OpenAI SDK with a different baseURL (same pattern
// as modelProviders.ts / inboxClassifier.ts).
//
// Designed to degrade gracefully: returns null whenever Groq is
// unavailable, rate-limited, or returns malformed JSON — the caller
// MUST null-guard and fall back to the local verdict.
// ============================================================

import OpenAI from "openai";
import { env } from "../../config/env";
import { logger } from "../../shared/logger";
import type { MatchResult, SafetyCategory, Severity } from "./types";
import { SAFETY_CATEGORIES } from "./types";

// Groq model preference order. Primary is the larger, more accurate
// model; we fall back to the fast model if the primary is unavailable.
const GROQ_MODELS = ["openai/gpt-oss-120b", "openai/gpt-oss-20b"];

const SEVERITIES: Severity[] = ["low", "medium", "high", "critical"];

// A single offensive/unsafe term the model flagged, with its rating.
// This is the "report" detail the dictionary couldn't produce.
interface FlaggedTerm {
  term: string;
  category: SafetyCategory;
  severity: Severity;
  score: number; // 0..1
}

// What we ask Groq to return. Mirrors the Gemini contract plus a
// per-term breakdown so the caller can show exactly which words
// were detected and how they were rated.
interface GroqVerdict {
  safe: boolean;
  categories: Partial<Record<SafetyCategory, number>>;
  severity: Severity;
  reason?: string;
  flaggedTerms: FlaggedTerm[];
}

export interface GroqModerationResult {
  matches: MatchResult[];
  raw: GroqVerdict;
  modelUsed: string;
}

// ------------------------------------------------------------
// Prompt builder. Pinned to the known category set so the model
// can't invent buckets the rest of the system doesn't recognize.
// We explicitly ask it to detect AND rate individual offensive
// words/phrases so the verdict doubles as a report.
// ------------------------------------------------------------
function buildSystemPrompt(): string {
  return `You are a content-safety classifier for an enterprise governance platform.
The deterministic word-list check found nothing conclusive, so YOU are the fallback:
detect any offensive, unsafe, or policy-violating language — including obfuscated,
misspelled, leetspeak, slang, coded, or contextually harmful phrasing the word list
would miss — then RATE it.

ALLOWED CATEGORY KEYS (use only these):
${SAFETY_CATEGORIES.join(", ")}

Return STRICT JSON only — no prose, no markdown, no code fences. Exact schema:
{
  "safe": <boolean>,
  "categories": { "<category_key>": <0.0..1.0>, ... },
  "severity": "low" | "medium" | "high" | "critical",
  "reason": "<one-sentence justification, max 140 chars>",
  "flaggedTerms": [
    { "term": "<the exact word/phrase>", "category": "<category_key>", "severity": "low|medium|high|critical", "score": <0.0..1.0> }
  ]
}

Rules:
- Each category value and each term score is a probability from 0.0 to 1.0.
- Omit categories that are 0. If the content is clean, set safe=true and flaggedTerms=[].
- Score reflects confidence-weighted harm: mild profanity ~0.3-0.5, strong profanity/slurs ~0.7-1.0.`;
}

// ------------------------------------------------------------
// Tolerant JSON parser — strip code fences (some models add them
// despite instructions), parse, then validate + clamp every field
// against the allow-list. Returns null on any failure so the
// orchestrator can fall back to local-only mode.
// ------------------------------------------------------------
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

    const allowed = new Set<string>(SAFETY_CATEGORIES);

    // categories: clamp to allow-list + [0,1] range.
    const categories: Partial<Record<SafetyCategory, number>> = {};
    if (parsed.categories && typeof parsed.categories === "object") {
      for (const [k, v] of Object.entries(parsed.categories)) {
        if (allowed.has(k) && typeof v === "number" && v >= 0 && v <= 1) {
          categories[k as SafetyCategory] = v;
        }
      }
    }

    const severity: Severity = SEVERITIES.includes(parsed.severity)
      ? parsed.severity
      : parsed.safe
        ? "low"
        : "medium";

    // flaggedTerms: keep only well-formed, allow-listed entries.
    const flaggedTerms: FlaggedTerm[] = [];
    if (Array.isArray(parsed.flaggedTerms)) {
      for (const t of parsed.flaggedTerms) {
        if (
          t &&
          typeof t.term === "string" &&
          t.term.trim() &&
          allowed.has(t.category) &&
          typeof t.score === "number" &&
          t.score >= 0 &&
          t.score <= 1
        ) {
          flaggedTerms.push({
            term: t.term.trim().slice(0, 120),
            category: t.category as SafetyCategory,
            severity: SEVERITIES.includes(t.severity) ? t.severity : severity,
            score: t.score,
          });
        }
      }
    }

    return {
      safe: parsed.safe,
      categories,
      severity,
      reason: typeof parsed.reason === "string" ? parsed.reason.slice(0, 200) : undefined,
      flaggedTerms,
    };
  } catch {
    return null;
  }
}

// ------------------------------------------------------------
// Map Groq's verdict into MatchResult objects so the orchestrator
// can merge them with local matches uniformly. Prefer per-term
// matches (richer report); fall back to per-category matches when
// the model gave category probabilities but no term breakdown.
// ------------------------------------------------------------
function toMatches(verdict: GroqVerdict): MatchResult[] {
  const out: MatchResult[] = [];

  for (const t of verdict.flaggedTerms) {
    if (t.score > 0) {
      out.push({
        pattern: t.term,
        category: t.category,
        severity: t.severity,
        score: t.score,
        matchedText: t.term,
        position: { start: 0, end: 0 },
        source: "groq",
      });
    }
  }

  // Add category-level matches for any category the model scored but
  // did not attribute to a specific term (so risk still aggregates).
  const termCategories = new Set(verdict.flaggedTerms.map((t) => t.category));
  for (const [cat, prob] of Object.entries(verdict.categories)) {
    if (prob && prob > 0 && !termCategories.has(cat as SafetyCategory)) {
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

// ------------------------------------------------------------
// Public API — returns null when Groq is unavailable so the
// orchestrator falls back to local-only confidence.
// ------------------------------------------------------------
export async function runGroqModeration(
  content: string,
): Promise<GroqModerationResult | null> {
  if (!env.GROQ_API_KEY) {
    return null;
  }

  try {
    const client = new OpenAI({
      apiKey: env.GROQ_API_KEY,
      baseURL: "https://api.groq.com/openai/v1",
    });

    let text = "";
    let usedModel = GROQ_MODELS[0];
    for (const modelId of GROQ_MODELS) {
      try {
        const resp = await client.chat.completions.create({
          model: modelId,
          messages: [
            { role: "system", content: buildSystemPrompt() },
            { role: "user", content: `CONTENT:\n${content}` },
          ],
          temperature: 0,
          max_tokens: 512,
          response_format: { type: "json_object" },
        });
        text = resp.choices?.[0]?.message?.content ?? "";
        usedModel = modelId;
        break;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        // Decommissioned / unavailable / rate-limited model ⇒ try next.
        if (
          msg.includes("503") ||
          msg.includes("429") ||
          msg.includes("decommissioned") ||
          msg.includes("does not exist") ||
          msg.includes("overloaded")
        ) {
          logger.warn(`[safety] Groq ${modelId} unavailable, trying next model`);
          continue;
        }
        throw e;
      }
    }

    if (!text) return null; // All models unavailable — skip moderation gracefully.

    const verdict = parseStrict(text);
    if (!verdict) {
      logger.warn({ rawSnippet: text.slice(0, 120) }, "[safety] Groq returned unparseable JSON");
      return null;
    }

    return {
      matches: toMatches(verdict),
      raw: verdict,
      modelUsed: usedModel,
    };
  } catch (err) {
    logger.warn({ err }, "[safety] Groq moderation failed; falling back to local-only");
    return null;
  }
}
