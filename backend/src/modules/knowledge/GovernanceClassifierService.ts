// ============================================================
// AI-assisted Governance Category classifier for Knowledge sources.
//
// Classifies source content into one of the 5 fixed governance categories
// (mirrors Prompt Governance's 5 governed prompts) and suggests a runtime
// match action. Groq is the primary provider (OpenAI-compatible chat API,
// same pattern as groqModerator.ts); Gemini is an OPTIONAL fallback used only
// when Groq is unavailable. Both degrade gracefully → returns null so the
// caller never blocks source creation.
// ============================================================

import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "../../config/env";
import { logger } from "../../shared/logger";

export type GovCategory =
  | "BASIC_CONTENT"
  | "CLAIM_VALIDATION"
  | "KNOWLEDGE_VERIFICATION"
  | "HIGH_RISK_REVIEW"
  | "POLICY_SAFETY";

export type GovMatchAction = "APPROVE" | "REVIEW" | "BLOCK";

export interface GovClassification {
  category: GovCategory;
  confidence: number; // 0..100
  reason: string;
  suggested_match_action: GovMatchAction;
  model_used: string;
}

const GOV_CATEGORIES: GovCategory[] = [
  "BASIC_CONTENT",
  "CLAIM_VALIDATION",
  "KNOWLEDGE_VERIFICATION",
  "HIGH_RISK_REVIEW",
  "POLICY_SAFETY",
];

const MATCH_ACTIONS: GovMatchAction[] = ["APPROVE", "REVIEW", "BLOCK"];

// Default action per category when the model omits/garbles it. Conservative:
// the riskier the category, the stricter the default.
const DEFAULT_ACTION: Record<GovCategory, GovMatchAction> = {
  BASIC_CONTENT: "APPROVE",
  CLAIM_VALIDATION: "REVIEW",
  KNOWLEDGE_VERIFICATION: "REVIEW",
  HIGH_RISK_REVIEW: "BLOCK",
  POLICY_SAFETY: "BLOCK",
};

const GROQ_MODELS = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"];
const GEMINI_MODEL = "gemini-1.5-flash";

// Pinned to the 5 categories with concrete examples so the model can't invent
// buckets. The platform maps each category to a governed prompt downstream.
function buildSystemPrompt(): string {
  return `You are a governance classifier for an enterprise Knowledge Base.
Classify the SOURCE CONTENT into exactly ONE of these 5 categories, choosing the
MOST RISK-SENSITIVE category that applies (escalate when in doubt):

- BASIC_CONTENT: brand tone, style guide, general marketing language, company culture, basic writing guidance.
- CLAIM_VALIDATION: factual/product claims — "best", "number one", "guaranteed", "proven", "certified", "improves", "reduces", "increases".
- KNOWLEDGE_VERIFICATION: pricing, product specifications, feature lists, product facts, integrations, company facts, numerical values, performance data.
- HIGH_RISK_REVIEW: medical/health claims, legal claims, financial claims, HR policy, compliance policy, privacy/security-sensitive language, regulated claims.
- POLICY_SAFETY: violence, harassment, abuse, hate speech, racism, sexual content, offensive terms, prohibited language, platform policy violations.

Return STRICT JSON only — no prose, no markdown, no code fences. Exact schema:
{
  "category": "BASIC_CONTENT" | "CLAIM_VALIDATION" | "KNOWLEDGE_VERIFICATION" | "HIGH_RISK_REVIEW" | "POLICY_SAFETY",
  "confidence": <integer 0-100>,
  "reason": "<one sentence citing the specific words/phrases that drove the decision, max 200 chars>",
  "suggested_match_action": "APPROVE" | "REVIEW" | "BLOCK"
}

Guidance: BASIC_CONTENT → usually APPROVE. CLAIM_VALIDATION / KNOWLEDGE_VERIFICATION → REVIEW.
HIGH_RISK_REVIEW → REVIEW or BLOCK. POLICY_SAFETY → BLOCK.`;
}

// Tolerant parse + validate/clamp against the allow-lists. Null on any failure.
function parseStrict(text: string, modelUsed: string): GovClassification | null {
  if (!text) return null;
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  try {
    const parsed = JSON.parse(cleaned);
    if (typeof parsed !== "object" || parsed === null) return null;

    const category = String(parsed.category || "").toUpperCase() as GovCategory;
    if (!GOV_CATEGORIES.includes(category)) return null;

    let confidence = Number(parsed.confidence);
    if (!Number.isFinite(confidence)) confidence = 50;
    confidence = Math.max(0, Math.min(100, Math.round(confidence)));

    const rawAction = String(parsed.suggested_match_action || "").toUpperCase() as GovMatchAction;
    const suggested_match_action = MATCH_ACTIONS.includes(rawAction) ? rawAction : DEFAULT_ACTION[category];

    const reason = typeof parsed.reason === "string" && parsed.reason.trim()
      ? parsed.reason.trim().slice(0, 240)
      : "No specific reason returned by the classifier.";

    return { category, confidence, reason, suggested_match_action, model_used: modelUsed };
  } catch {
    return null;
  }
}

async function classifyWithGroq(content: string): Promise<GovClassification | null> {
  if (!env.GROQ_API_KEY) return null;
  try {
    const client = new OpenAI({ apiKey: env.GROQ_API_KEY, baseURL: "https://api.groq.com/openai/v1", timeout: 30_000 });
    for (const modelId of GROQ_MODELS) {
      try {
        const resp = await client.chat.completions.create({
          model: modelId,
          messages: [
            { role: "system", content: buildSystemPrompt() },
            { role: "user", content: `SOURCE CONTENT:\n${content}` },
          ],
          temperature: 0,
          max_tokens: 300,
          response_format: { type: "json_object" },
        });
        const text = resp.choices?.[0]?.message?.content ?? "";
        const verdict = parseStrict(text, `groq/${modelId}`);
        if (verdict) return verdict;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes("503") || msg.includes("429") || msg.includes("decommissioned") || msg.includes("does not exist") || msg.includes("overloaded")) {
          logger.warn(`[gov-classifier] Groq ${modelId} unavailable, trying next model`);
          continue;
        }
        throw e;
      }
    }
    return null;
  } catch (err) {
    logger.warn({ err }, "[gov-classifier] Groq classification failed");
    return null;
  }
}

// OPTIONAL Gemini fallback — only runs if GEMINI_API_KEY is set and Groq failed.
async function classifyWithGemini(content: string): Promise<GovClassification | null> {
  if (!env.GEMINI_API_KEY) return null;
  try {
    const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: GEMINI_MODEL,
      generationConfig: { temperature: 0, responseMimeType: "application/json" },
    });
    const result = await model.generateContent(`${buildSystemPrompt()}\n\nSOURCE CONTENT:\n${content}`);
    const text = result.response.text() ?? "";
    return parseStrict(text, `gemini/${GEMINI_MODEL}`);
  } catch (err) {
    logger.warn({ err }, "[gov-classifier] Gemini fallback failed");
    return null;
  }
}

/**
 * Classify source content. Groq primary → Gemini optional fallback.
 * Returns null when no provider is configured or all fail (caller must
 * null-guard and NOT block source creation).
 */
export async function classifyGovernanceCategory(content: string): Promise<GovClassification | null> {
  const trimmed = (content || "").trim();
  if (!trimmed) return null;
  // Cap the payload — classification only needs a representative sample.
  const sample = trimmed.slice(0, 8000);
  const groq = await classifyWithGroq(sample);
  if (groq) return groq;
  return classifyWithGemini(sample);
}
