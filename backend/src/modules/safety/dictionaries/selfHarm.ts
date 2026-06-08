import type { SafetyPattern } from "../types";

// Self-harm patterns are always treated as CRITICAL because false
// negatives carry real-world harm risk. The local list is phrase-
// based (not single words) to minimize false positives on benign
// uses like "I'm dying of laughter" or "this project killed me".
export const SELF_HARM_PATTERNS: SafetyPattern[] = [
  { pattern: "kill yourself",   category: "self_harm", severity: "critical", score: 1.0 },
  { pattern: "kys",             category: "self_harm", severity: "critical", score: 1.0, wholeWord: true },
  { pattern: "commit suicide",  category: "self_harm", severity: "critical", score: 1.0 },
  { pattern: "how to suicide",  category: "self_harm", severity: "critical", score: 1.0 },
  { pattern: "end my life",     category: "self_harm", severity: "critical", score: 1.0 },
  { pattern: "end your life",   category: "self_harm", severity: "critical", score: 1.0 },
  { pattern: "cut yourself",    category: "self_harm", severity: "critical", score: 1.0 },
  { pattern: "self harm",       category: "self_harm", severity: "high",     score: 0.8 },
  { pattern: "self-harm",       category: "self_harm", severity: "high",     score: 0.8 },
  { pattern: "self mutilation", category: "self_harm", severity: "critical", score: 0.95 },
  { pattern: "hang yourself",   category: "self_harm", severity: "critical", score: 1.0 },
  { pattern: "overdose on",     category: "self_harm", severity: "critical", score: 1.0 },
  { pattern: "want to die",     category: "self_harm", severity: "high",     score: 0.85 },
  { pattern: "no reason to live", category: "self_harm", severity: "high",   score: 0.85 },
];
