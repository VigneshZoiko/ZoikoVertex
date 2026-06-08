import type { SafetyPattern } from "../types";

// Slurs and hate-speech targets — every entry is critical-severity
// because in a governed B2B platform there is no acceptable use case
// for these terms in agent output. The local list is deliberately
// narrow; ambiguous/contextual hate is handled by the semantic fallback.
export const HATE_PATTERNS: SafetyPattern[] = [
  { pattern: "nigger",   category: "hate_speech", severity: "critical", score: 1.0 },
  { pattern: "nigga",    category: "hate_speech", severity: "critical", score: 0.95 },
  { pattern: "faggot",   category: "hate_speech", severity: "critical", score: 1.0 },
  { pattern: "tranny",   category: "hate_speech", severity: "critical", score: 0.95 },
  { pattern: "retard",   category: "hate_speech", severity: "high",     score: 0.85 },
  { pattern: "spastic",  category: "hate_speech", severity: "high",     score: 0.8 },
  { pattern: "raghead",  category: "hate_speech", severity: "critical", score: 0.95 },
  { pattern: "chink",    category: "hate_speech", severity: "critical", score: 0.95 },
  { pattern: "spic",     category: "hate_speech", severity: "critical", score: 0.95 },
  { pattern: "gook",     category: "hate_speech", severity: "critical", score: 0.95 },
  { pattern: "kike",     category: "hate_speech", severity: "critical", score: 1.0 },
  { pattern: "wetback",  category: "hate_speech", severity: "critical", score: 0.95 },
  { pattern: "nazi",     category: "hate_speech", severity: "high",     score: 0.7 },
  { pattern: "white power", category: "hate_speech", severity: "critical", score: 1.0 },
  { pattern: "gas the",  category: "hate_speech", severity: "critical", score: 1.0 },
];
