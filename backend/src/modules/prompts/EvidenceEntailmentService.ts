// ============================================================
// Evidence Entailment Service (Groq semantic verifier)
//
// Word-overlap can tell that a post and a KB source talk about the
// same subject — it CANNOT tell whether the source actually backs the
// claim. "Comp is the worst company" and "Comp is one of the best
// company" share every significant word yet mean the opposite.
//
// This service asks an LLM the only question that matters for
// evidence: does the source SUPPORT, CONTRADICT, or stay NEUTRAL to
// the post's claim? Only SUPPORT counts as proof. It catches sentiment
// flips, negation, and subtle mismatches overlap never can.
//
// Groq exposes an OpenAI-compatible chat-completions API, so we reuse
// the OpenAI SDK with a different baseURL — same pattern as
// groqModerator.ts / inboxClassifier.ts.
//
// Designed to degrade gracefully: returns null whenever Groq is
// unavailable, rate-limited, or returns malformed JSON. The caller
// MUST null-guard and fail safe (treat unverifiable as NOT evidence).
// ============================================================

import OpenAI from 'openai';
import { env } from '../../config/env';
import { logger } from '../../shared/logger';

// Primary is the larger, more accurate model; fall back to the fast one.
const GROQ_MODELS = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b'];

export type EntailmentRelation = 'SUPPORT' | 'CONTRADICT' | 'NEUTRAL';

export interface EntailmentVerdict {
  source_id: string;
  relation: EntailmentRelation;
  confidence: number; // 0..1
  reason: string;
}

export interface EvidenceCandidate {
  id: string;
  title: string;
  content: string;
}

// Keep each source excerpt bounded so a few candidates stay well within
// the token budget while still giving the model enough to judge.
const MAX_SOURCE_CHARS = 1500;
const MAX_CLAIM_CHARS = 2000;

function buildSystemPrompt(): string {
  return `You are an evidence-verification classifier for an enterprise content-governance platform.

A user wants to publish a POST that makes a claim. You are given one or more KNOWLEDGE BASE SOURCES that share wording with the post. Your ONLY job is to decide, for each source, whether it actually backs up the post's claim.

For each source decide the relation to the POST:
- "SUPPORT"   — the source asserts the same thing the post claims (same subject, same direction/meaning). It is genuine evidence.
- "CONTRADICT" — the source asserts the OPPOSITE, or is about a DIFFERENT subject/entity than the post claims. NOT evidence.
- "NEUTRAL"   — the source is merely related/on-topic but does not actually confirm the specific claim. NOT evidence.

Critical rules:
- Subject must match. If the post is about "Comp" but the source is about "Zoiko", that is CONTRADICT (different entity) even if every other word matches.
- Meaning must match. "worst" vs "best", presence of "not"/"never", or any reversal of sentiment/polarity is CONTRADICT, even when the words overlap heavily.
- Sharing keywords is NOT support. Only mark SUPPORT when the source genuinely confirms the claim's substance.

Return STRICT JSON only — no prose, no markdown, no code fences. Exact schema:
{
  "verdicts": [
    { "source_id": "<the id given>", "relation": "SUPPORT" | "CONTRADICT" | "NEUTRAL", "confidence": <0.0..1.0>, "reason": "<one sentence, max 160 chars>" }
  ]
}
Include exactly one verdict object per source provided, using the source_id verbatim.`;
}

function buildUserPrompt(claim: string, sources: EvidenceCandidate[]): string {
  const claimText = (claim || '').slice(0, MAX_CLAIM_CHARS);
  const sourceBlocks = sources
    .map(
      (s, i) =>
        `SOURCE ${i + 1}\nsource_id: ${s.id}\ntitle: ${s.title || '(untitled)'}\ncontent: ${(s.content || '').slice(0, MAX_SOURCE_CHARS)}`,
    )
    .join('\n\n');
  return `POST CLAIM:\n${claimText}\n\nKNOWLEDGE BASE SOURCES:\n${sourceBlocks}`;
}

function parseStrict(text: string, validIds: Set<string>): EntailmentVerdict[] | null {
  if (!text) return null;
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  try {
    const parsed = JSON.parse(cleaned);
    const rawVerdicts = Array.isArray(parsed) ? parsed : parsed?.verdicts;
    if (!Array.isArray(rawVerdicts)) return null;

    const relations = new Set<EntailmentRelation>(['SUPPORT', 'CONTRADICT', 'NEUTRAL']);
    const out: EntailmentVerdict[] = [];
    for (const v of rawVerdicts) {
      if (!v || typeof v !== 'object') continue;
      const sourceId = String(v.source_id ?? '');
      const relation = String(v.relation ?? '').toUpperCase() as EntailmentRelation;
      if (!validIds.has(sourceId) || !relations.has(relation)) continue;
      const confidence =
        typeof v.confidence === 'number' && v.confidence >= 0 && v.confidence <= 1
          ? v.confidence
          : 0.5;
      out.push({
        source_id: sourceId,
        relation,
        confidence,
        reason: typeof v.reason === 'string' ? v.reason.slice(0, 200) : '',
      });
    }
    return out;
  } catch {
    return null;
  }
}

/**
 * Verify which candidate KB sources genuinely SUPPORT the post's claim.
 *
 * Returns a map of source_id → verdict. Returns null when Groq is
 * unavailable or unparseable, so the caller can fail safe (route to
 * human review rather than auto-approving on an unverifiable match).
 */
export async function verifyEvidence(
  claim: string,
  candidates: EvidenceCandidate[],
): Promise<Map<string, EntailmentVerdict> | null> {
  if (!env.GROQ_API_KEY || candidates.length === 0) {
    return null;
  }

  const validIds = new Set(candidates.map((c) => c.id));

  try {
    const client = new OpenAI({
      apiKey: env.GROQ_API_KEY,
      baseURL: 'https://api.groq.com/openai/v1',
    });

    let text = '';
    let usedModel = GROQ_MODELS[0];
    for (const modelId of GROQ_MODELS) {
      try {
        const resp = await client.chat.completions.create({
          model: modelId,
          messages: [
            { role: 'system', content: buildSystemPrompt() },
            { role: 'user', content: buildUserPrompt(claim, candidates) },
          ],
          temperature: 0,
          max_tokens: 700,
          response_format: { type: 'json_object' },
        });
        text = resp.choices?.[0]?.message?.content ?? '';
        usedModel = modelId;
        break;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (
          msg.includes('503') ||
          msg.includes('429') ||
          msg.includes('decommissioned') ||
          msg.includes('does not exist') ||
          msg.includes('overloaded')
        ) {
          logger.warn(`[evidence-entailment] Groq ${modelId} unavailable, trying next model`);
          continue;
        }
        throw e;
      }
    }

    if (!text) return null;

    const verdicts = parseStrict(text, validIds);
    if (!verdicts) {
      logger.warn(
        { rawSnippet: text.slice(0, 160) },
        '[evidence-entailment] Groq returned unparseable JSON',
      );
      return null;
    }

    logger.info(
      {
        modelUsed: usedModel,
        verdicts: verdicts.map((v) => ({ id: v.source_id, rel: v.relation, conf: v.confidence })),
      },
      '[evidence-entailment] verified candidates',
    );

    return new Map(verdicts.map((v) => [v.source_id, v]));
  } catch (err) {
    logger.warn({ err }, '[evidence-entailment] Groq verification failed; caller must fail safe');
    return null;
  }
}
