// ============================================================
// Scan Logger — persists Gemini Vision scan results to a
// rotating JSONL file for developer inspection.
// File: backend/logs/image_scans.jsonl
// Each line is one JSON object (one image scan result).
// ============================================================

import fs from 'fs';
import path from 'path';
import { logger } from '../../shared/logger';

export interface ScanLogEntry {
  ts: string;
  mediaId?: string;
  imageUrl: string;
  mimeType: string;
  bytes: number;
  modelUsed: string;
  skipped: boolean;
  extractedText: string;
  sensitiveCategories: Record<string, number>;
  violations: Array<{
    type: string;
    category: string;
    action: string;
    description: string;
    matchedKeyword?: string;
    confidence: number;
  }>;
  safe: boolean;
  durationMs: number;
}

const LOG_DIR = path.join(process.cwd(), 'logs');
const LOG_FILE = path.join(LOG_DIR, 'image_scans.jsonl');

// Ensure log directory exists at module load
try {
  if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
} catch { /* non-blocking */ }

export function logScanResult(entry: ScanLogEntry): void {
  try {
    fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n', 'utf8');
  } catch (err) {
    logger.warn({ err }, '[scanLogger] Could not write scan log');
  }
}

export function readRecentScans(limit = 50): ScanLogEntry[] {
  try {
    if (!fs.existsSync(LOG_FILE)) return [];
    const lines = fs.readFileSync(LOG_FILE, 'utf8')
      .split('\n')
      .filter(Boolean)
      .slice(-limit);
    return lines.map(l => JSON.parse(l)).reverse();
  } catch {
    return [];
  }
}
