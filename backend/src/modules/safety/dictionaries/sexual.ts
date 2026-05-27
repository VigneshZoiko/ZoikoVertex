import type { SafetyPattern } from "../types";

// Sexual content — high-severity by default since this is enterprise
// content infrastructure. Anatomical terms used in a medical context
// will fire a local match but should be cleared by the Gemini fallback
// when context shows clinical intent.
export const SEXUAL_PATTERNS: SafetyPattern[] = [
  { pattern: "porn",       category: "sexual_content", severity: "high",     score: 0.85 },
  { pattern: "pornography", category: "sexual_content", severity: "high",    score: 0.85 },
  { pattern: "orgy",       category: "sexual_content", severity: "high",     score: 0.85 },
  { pattern: "prostitute", category: "sexual_content", severity: "high",     score: 0.8 },
  { pattern: "escort service", category: "sexual_content", severity: "high", score: 0.75 },
  { pattern: "xxx",        category: "sexual_content", severity: "high",     score: 0.8 },
  { pattern: "blowjob",    category: "sexual_content", severity: "critical", score: 0.95 },
  { pattern: "handjob",    category: "sexual_content", severity: "critical", score: 0.95 },
  { pattern: "anal sex",   category: "sexual_content", severity: "critical", score: 0.95 },
  { pattern: "oral sex",   category: "sexual_content", severity: "critical", score: 0.95 },
  { pattern: "cum on",     category: "sexual_content", severity: "critical", score: 0.95 },
  { pattern: "nude photo", category: "sexual_content", severity: "high",     score: 0.85 },
  { pattern: "naked photo", category: "sexual_content", severity: "high",    score: 0.85 },
  { pattern: "sexual act", category: "sexual_content", severity: "high",     score: 0.8 },
  // CSAM red-flag terms — always critical, never overrideable by tenant
  { pattern: "child porn", category: "sexual_content", severity: "critical", score: 1.0 },
  { pattern: "underage sex", category: "sexual_content", severity: "critical", score: 1.0 },
  { pattern: "minor nude", category: "sexual_content", severity: "critical", score: 1.0 },
];
