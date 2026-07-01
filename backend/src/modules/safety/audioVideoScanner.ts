// ============================================================
// Audio / Video Safety Scanner
// Provider: Groq Whisper (whisper-large-v3) — transcription
//           + existing text moderation pipeline on transcript
//
// Audio-only: can result in available / pending_review / blocked
// Video:      transcript check + always routes to review for
//             visual content that cannot be scanned server-side
//
// Fails open — if Whisper unavailable the file routes to review.
// File size cap: 25 MB (Groq Whisper API limit).
// ============================================================

import OpenAI from 'openai';
import { env } from '../../config/env';
import { logger } from '../../shared/logger';
import { moderate } from './moderationService';
import { trackUsage } from '../../domains/monitoring/usageController';
import type { KeywordRule, ImageViolation } from './imageScanner';

const MAX_FETCH_BYTES = 25 * 1024 * 1024; // 25 MB — Groq Whisper hard limit

export interface AudioVideoScanResult {
  transcript: string;
  violations: ImageViolation[];
  safe: boolean;
  skipped?: boolean;
  reason?: string;
  modelUsed?: string;
  durationMs?: number;
  notes: string[];
}

const CATEGORY_MAP: Record<string, { label: string; action: 'BLOCK' | 'REQUEST_REVIEW' }> = {
  offensive_language: { label: 'Offensive Language',  action: 'BLOCK'          },
  sexual_content:     { label: 'Sexual Content',       action: 'BLOCK'          },
  violence:           { label: 'Violence',             action: 'BLOCK'          },
  self_harm:          { label: 'Self-Harm Content',    action: 'BLOCK'          },
  hate_speech:        { label: 'Hate Speech',          action: 'BLOCK'          },
  drugs_alcohol:      { label: 'Drugs / Alcohol',      action: 'REQUEST_REVIEW' },
  graphic_content:    { label: 'Graphic Content',      action: 'REQUEST_REVIEW' },
};

async function transcribeWithWhisper(
  buffer: ArrayBuffer,
  mimeType: string,
  ext: string,
): Promise<{ text: string; modelUsed: string } | null> {
  if (!env.GROQ_API_KEY) return null;

  const client = new OpenAI({
    baseURL: 'https://api.groq.com/openai/v1',
    apiKey: env.GROQ_API_KEY,
    timeout: 60_000,
  });

  try {
    const blob = new Blob([buffer], { type: mimeType });
    // Groq SDK needs a File-like object with a .name property
    const file = new File([blob], `media.${ext}`, { type: mimeType });

    const transcription = await client.audio.transcriptions.create({
      file: file as any,
      model: 'whisper-large-v3',
      response_format: 'json',
    });

    const text = (transcription as any).text ?? '';
    return { text, modelUsed: 'groq/whisper-large-v3' };
  } catch (err: unknown) {
    logger.warn(`[audioVideoScanner] Whisper transcription failed: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}

export async function scanAudioVideo(
  fileUrl: string,
  keywordRules: KeywordRule[] = [],
  mediaId?: string,
  workspaceId?: string,
): Promise<AudioVideoScanResult> {
  const startMs = Date.now();
  const notes: string[] = [];
  const empty: AudioVideoScanResult = { transcript: '', violations: [], safe: true, notes: [] };

  if (!env.GROQ_API_KEY) {
    logger.warn('[audioVideoScanner] No GROQ_API_KEY — scan skipped, routing to review');
    return { ...empty, skipped: true, reason: 'AI transcription unavailable — routed for human review.', notes };
  }

  try {
    // ── Fetch file (cap to 25 MB) ─────────────────────────────────────────────
    const fetchRes = await fetch(fileUrl, { signal: AbortSignal.timeout(30_000) });
    if (!fetchRes.ok) {
      logger.warn({ fileUrl, status: fetchRes.status }, '[audioVideoScanner] Could not fetch file');
      return { ...empty, skipped: true, reason: 'Could not fetch file for scanning.', notes };
    }

    const contentLength = parseInt(fetchRes.headers.get('content-length') || '0', 10);
    if (contentLength > MAX_FETCH_BYTES) {
      const sizeMB = (contentLength / 1024 / 1024).toFixed(1);
      notes.push(`[SKIP] File too large for AI scan (${sizeMB} MB > 25 MB limit). Routed to human review.`);
      return { ...empty, skipped: true, reason: `File too large for automated scan (${sizeMB} MB) — routed for human review.`, notes };
    }

    const buffer = await fetchRes.arrayBuffer();
    if (buffer.byteLength > MAX_FETCH_BYTES) {
      notes.push(`[SKIP] File too large for AI scan. Routed to human review.`);
      return { ...empty, skipped: true, reason: 'File too large for automated scan — routed for human review.', notes };
    }

    const mimeType = (fetchRes.headers.get('content-type') || 'audio/mpeg').split(';')[0].trim();
    const ext = fileUrl.split('?')[0].split('.').pop() || 'mp3';

    logger.info(
      { fileUrl: fileUrl.slice(0, 80), mimeType, bytes: buffer.byteLength },
      '[audioVideoScanner] Sending to Groq Whisper',
    );

    // ── Transcribe ────────────────────────────────────────────────────────────
    const result = await transcribeWithWhisper(buffer, mimeType, ext);

    if (!result || !result.text.trim()) {
      notes.push('[TRANSCRIPTION] Could not transcribe audio — no speech detected or model unavailable.');
      logger.warn('[audioVideoScanner] Empty transcript — routing to review');
      return {
        transcript: '',
        violations: [],
        safe: false,
        skipped: true,
        reason: 'Audio transcription returned no speech — routed for human review.',
        modelUsed: result?.modelUsed,
        durationMs: Date.now() - startMs,
        notes,
      };
    }

    const { text: transcript, modelUsed } = result;
    notes.push(
      `[TRANSCRIPT] Model: ${modelUsed} | ${Date.now() - startMs}ms\n` +
      `  "${transcript.slice(0, 300)}${transcript.length > 300 ? '…' : ''}"`,
    );

    const violations: ImageViolation[] = [];

    // ── Keyword match on transcript ───────────────────────────────────────────
    const lowerTranscript = transcript.toLowerCase();
    outer: for (const rule of keywordRules) {
      for (const kw of rule.keywords) {
        const lowerKw = kw.toLowerCase().trim();
        if (lowerKw && lowerTranscript.includes(lowerKw)) {
          violations.push({
            type: 'keyword_match',
            category: 'keyword_rule',
            description: `Blocked keyword "${kw}" detected in audio transcript`,
            action: rule.action,
            matchedKeyword: kw,
            confidence: 1.0,
          });
          notes.push(`[KEYWORD] Matched "${kw}" (action: ${rule.action}) in transcript`);
          break outer;
        }
      }
    }

    // ── Semantic text moderation on transcript ────────────────────────────────
    if (violations.length === 0) {
      const modResult = await moderate({
        content: transcript,
        tenantId: workspaceId || '',
        workspaceId: workspaceId || '',
      });
      const scores = modResult.categoryScores as Record<string, number>;

      const catSummary: string[] = [];
      for (const [cat, score] of Object.entries(scores)) {
        catSummary.push(`${cat}=${(score * 100).toFixed(0)}%`);
        const cfg = CATEGORY_MAP[cat];
        if (cfg && score > 0.6) {
          violations.push({
            type: 'sensitive_content',
            category: cat,
            description: `${cfg.label} detected in audio transcript (${(score * 100).toFixed(0)}% confidence)`,
            action: cfg.action,
            confidence: score,
          });
        }
      }
      notes.push(`[MODERATION] Transcript categories: ${catSummary.join(', ') || 'none'}`);
    }

    const durationMs = Date.now() - startMs;

    if (workspaceId) {
      trackUsage({
        workspaceId,
        resourceType: 'AI_TOKENS',
        quantity: 500,
        costUsd: 0.00005,
        unit: 'tokens',
        referenceType: 'audio_scan',
        metadata: { model: modelUsed, estimated: true, mediaId },
      });
    }

    logger.info({
      fileUrl: fileUrl.slice(0, 80),
      modelUsed,
      transcriptLength: transcript.length,
      violationCount: violations.length,
      safe: violations.length === 0,
      durationMs,
    }, '[audioVideoScanner] Scan complete');

    return { transcript, violations, safe: violations.length === 0, modelUsed, durationMs, notes };
  } catch (err) {
    logger.warn({ err, fileUrl }, '[audioVideoScanner] Scan failed — routing to review');
    return { ...empty, skipped: true, reason: 'Scan error — routed for human review.', notes };
  }
}
