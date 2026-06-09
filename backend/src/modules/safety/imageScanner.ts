// ============================================================
// Image Safety Scanner
// Primary:  Groq Vision (Llama 4 Scout / Llama 3.2 Vision)
// Fallback: Gemini Vision (gemini-1.5-flash / gemini-2.0-flash)
// Fails open — if all providers unavailable the image is safe.
// ============================================================

import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../../config/env';
import { logger } from '../../shared/logger';
import { logScanResult } from './scanLogger';

export interface KeywordRule {
  id: string;
  keywords: string[];
  action: 'BLOCK' | 'REQUEST_REVIEW';
}

export interface ImageViolation {
  type: 'sensitive_content' | 'keyword_match';
  category: string;
  description: string;
  action: 'BLOCK' | 'REQUEST_REVIEW';
  matchedKeyword?: string;
  confidence: number;
}

export interface ImageScanResult {
  violations: ImageViolation[];
  extractedText: string;
  sensitiveCategories: Record<string, number>;
  safe: boolean;
  skipped?: boolean;
  modelUsed?: string;
  durationMs?: number;
}

// ── Model lists ──────────────────────────────────────────────
const GROQ_MODELS = [
  'meta-llama/llama-4-scout-17b-16e-instruct',
  'llama-3.2-11b-vision-preview',
  'llama-3.2-90b-vision-preview',
];

const GEMINI_MODELS = [
  'gemini-1.5-flash',
  'gemini-2.0-flash',
  'gemini-2.0-flash-exp',
];

// ── Shared prompt ─────────────────────────────────────────────
const VISION_PROMPT = `You are an image safety classifier for an enterprise content governance platform.
Analyze this image and return STRICT JSON only — no prose, no markdown, no code fences.

Output schema (exact keys):
{
  "safe": <boolean>,
  "extracted_text": "<all visible text found in the image — empty string if none>",
  "sensitive_content": {
    "nudity": <0..1>,
    "violence": <0..1>,
    "gore": <0..1>,
    "hate_symbols": <0..1>,
    "drugs_alcohol": <0..1>,
    "self_harm": <0..1>,
    "graphic_content": <0..1>
  },
  "severity": "low" | "medium" | "high" | "critical",
  "reason": "<one-sentence justification, max 140 chars>"
}

Omit keys inside sensitive_content that score 0. Return only the JSON object.`;

const SENSITIVE_THRESHOLDS: Record<string, { threshold: number; label: string }> = {
  nudity:          { threshold: 0.5, label: 'Nudity / Adult Content' },
  violence:        { threshold: 0.6, label: 'Violence' },
  gore:            { threshold: 0.5, label: 'Graphic Gore' },
  hate_symbols:    { threshold: 0.5, label: 'Hate Symbols' },
  drugs_alcohol:   { threshold: 0.7, label: 'Drugs / Alcohol' },
  self_harm:       { threshold: 0.5, label: 'Self-Harm Content' },
  graphic_content: { threshold: 0.6, label: 'Graphic Content' },
};

// ── Provider calls ────────────────────────────────────────────

async function tryGroq(base64: string, mimeType: string): Promise<{ text: string; modelUsed: string }> {
  if (!env.GROQ_API_KEY) return { text: '', modelUsed: '' };

  const client = new OpenAI({
    baseURL: 'https://api.groq.com/openai/v1',
    apiKey: env.GROQ_API_KEY,
    timeout: 30_000,
  });

  for (const modelId of GROQ_MODELS) {
    try {
      const completion = await client.chat.completions.create({
        model: modelId,
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: VISION_PROMPT },
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } },
          ],
        }],
        temperature: 0,
        max_tokens: 512,
      });
      const text = completion.choices[0]?.message?.content || '';
      if (text) {
        logger.info({ modelId, chars: text.length }, '[imageScanner] Groq Vision response received');
        return { text, modelUsed: `groq/${modelId}` };
      }
    } catch (e: unknown) {
      const msg = (e instanceof Error ? e.message : String(e)).slice(0, 100);
      logger.warn(`[imageScanner] groq/${modelId} failed: ${msg}, trying next`);
    }
  }
  return { text: '', modelUsed: '' };
}

async function tryGemini(base64: string, mimeType: string): Promise<{ text: string; modelUsed: string }> {
  if (!env.GEMINI_API_KEY) return { text: '', modelUsed: '' };

  const client = new GoogleGenerativeAI(env.GEMINI_API_KEY);

  for (const modelId of GEMINI_MODELS) {
    try {
      const model = client.getGenerativeModel({
        model: modelId,
        generationConfig: { temperature: 0, maxOutputTokens: 512 },
      });
      const res = await model.generateContent([
        VISION_PROMPT,
        { inlineData: { mimeType, data: base64 } },
      ]);
      const text = res.response.text();
      if (text) {
        logger.info({ modelId, chars: text.length }, '[imageScanner] Gemini Vision response received');
        return { text, modelUsed: `gemini/${modelId}` };
      }
    } catch (e: unknown) {
      const msg = (e instanceof Error ? e.message : String(e)).slice(0, 100);
      logger.warn(`[imageScanner] gemini/${modelId} failed: ${msg}, trying next`);
    }
  }
  return { text: '', modelUsed: '' };
}

// ── Main scanner ──────────────────────────────────────────────

export async function scanImage(
  imageUrl: string,
  keywordRules: KeywordRule[] = [],
  mediaId?: string,
): Promise<ImageScanResult> {
  const empty: ImageScanResult = { violations: [], extractedText: '', sensitiveCategories: {}, safe: true };
  const startMs = Date.now();

  if (!env.GROQ_API_KEY && !env.GEMINI_API_KEY) {
    logger.warn('[imageScanner] No vision API key set — scan skipped');
    return { ...empty, skipped: true };
  }

  try {
    // Fetch image bytes
    const fetchRes = await fetch(imageUrl, { signal: AbortSignal.timeout(15_000) });
    if (!fetchRes.ok) {
      logger.warn({ imageUrl, status: fetchRes.status }, '[imageScanner] Could not fetch image');
      return { ...empty, skipped: true };
    }
    const buffer = await fetchRes.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    const mimeType = (fetchRes.headers.get('content-type') || 'image/jpeg').split(';')[0].trim();

    logger.info({ imageUrl: imageUrl.slice(0, 80), mimeType, bytes: buffer.byteLength }, '[imageScanner] Sending image to Vision API');

    // Try Groq first, then Gemini
    let rawText = '';
    let modelUsed = '';

    ({ text: rawText, modelUsed } = await tryGroq(base64, mimeType));
    if (!rawText) {
      logger.info('[imageScanner] Groq unavailable, trying Gemini fallback');
      ({ text: rawText, modelUsed } = await tryGemini(base64, mimeType));
    }

    if (!rawText) {
      logger.warn('[imageScanner] All vision providers unavailable — treating as safe');
      return { ...empty, skipped: true };
    }

    // Parse JSON response
    const cleaned = rawText.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    let parsed: any;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      logger.warn({ snippet: rawText.slice(0, 120) }, '[imageScanner] Unparseable JSON from vision API');
      return { ...empty, skipped: true };
    }

    const extractedText: string = typeof parsed.extracted_text === 'string' ? parsed.extracted_text : '';
    const sensitiveCategories: Record<string, number> = parsed.sensitive_content || {};
    const violations: ImageViolation[] = [];

    // ── 1. Sensitive content violations ─────────────────────────
    for (const [category, score] of Object.entries(sensitiveCategories)) {
      const cfg = SENSITIVE_THRESHOLDS[category];
      if (cfg && typeof score === 'number' && score >= cfg.threshold) {
        violations.push({
          type: 'sensitive_content',
          category,
          description: `${cfg.label} detected in image (${(score * 100).toFixed(0)}% confidence)`,
          action: 'BLOCK',
          confidence: score,
        });
      }
    }

    // ── 2. Keyword matches against extracted text ────────────────
    if (extractedText.trim()) {
      const lower = extractedText.toLowerCase();
      for (const rule of keywordRules) {
        for (const kw of rule.keywords) {
          if (kw && lower.includes(kw.toLowerCase())) {
            violations.push({
              type: 'keyword_match',
              category: 'keyword_rule',
              description: `Keyword "${kw}" found in image text`,
              action: rule.action,
              matchedKeyword: kw,
              confidence: 1.0,
            });
            break;
          }
        }
      }
    }

    const durationMs = Date.now() - startMs;

    // ── 3. Write scan log ────────────────────────────────────────
    logScanResult({
      ts: new Date().toISOString(),
      mediaId,
      imageUrl,
      mimeType,
      bytes: buffer.byteLength,
      modelUsed,
      skipped: false,
      extractedText,
      sensitiveCategories,
      violations: violations.map(v => ({
        type: v.type,
        category: v.category,
        action: v.action,
        description: v.description,
        matchedKeyword: v.matchedKeyword,
        confidence: v.confidence,
      })),
      safe: violations.length === 0,
      durationMs,
    });

    logger.info({
      imageUrl: imageUrl.slice(0, 80),
      modelUsed,
      extractedText: extractedText.slice(0, 200),
      violationCount: violations.length,
      safe: violations.length === 0,
      durationMs,
    }, '[imageScanner] Scan complete');

    return { violations, extractedText, sensitiveCategories, safe: violations.length === 0, modelUsed, durationMs };
  } catch (err) {
    logger.warn({ err, imageUrl }, '[imageScanner] Scan failed — treating as safe');
    return { ...empty, skipped: true };
  }
}
