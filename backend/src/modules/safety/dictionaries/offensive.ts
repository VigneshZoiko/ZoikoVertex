import type { SafetyPattern } from "../types";

// Offensive / profane language (general).
// Severity grade reflects business risk, not literal "badness".
// Score is the per-match contribution to category score (0..1).
export const OFFENSIVE_PATTERNS: SafetyPattern[] = [
  { pattern: "fuck",      category: "offensive_language", severity: "medium", score: 0.6 },
  { pattern: "shit",      category: "offensive_language", severity: "low",    score: 0.4 },
  { pattern: "bitch",     category: "offensive_language", severity: "medium", score: 0.55 },
  { pattern: "bastard",   category: "offensive_language", severity: "low",    score: 0.4 },
  { pattern: "asshole",   category: "offensive_language", severity: "medium", score: 0.55 },
  { pattern: "damn",      category: "offensive_language", severity: "low",    score: 0.2 },
  { pattern: "crap",      category: "offensive_language", severity: "low",    score: 0.2 },
  { pattern: "dick",      category: "offensive_language", severity: "low",    score: 0.4 },
  { pattern: "piss",      category: "offensive_language", severity: "low",    score: 0.3 },
  { pattern: "slut",      category: "offensive_language", severity: "high",   score: 0.7 },
  { pattern: "whore",     category: "offensive_language", severity: "high",   score: 0.7 },
  { pattern: "cunt",      category: "offensive_language", severity: "high",   score: 0.85 },
  { pattern: "motherfucker", category: "offensive_language", severity: "high", score: 0.8 },
  { pattern: "idiot",     category: "harassment",         severity: "low",    score: 0.25 },
  { pattern: "stupid",    category: "harassment",         severity: "low",    score: 0.2 },
];
