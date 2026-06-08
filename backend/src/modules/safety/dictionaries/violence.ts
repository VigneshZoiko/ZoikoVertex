import type { SafetyPattern } from "../types";

// Violence patterns. Note: "kill" / "shoot" alone are context-heavy
// ("kill the lights", "shoot the moon"), so they're rated LOW
// individually; the semantic fallback escalates when context shifts.
// Combined phrases (e.g. "kill yourself") are rated CRITICAL and
// belong in the self_harm list, not here.
export const VIOLENCE_PATTERNS: SafetyPattern[] = [
  { pattern: "murder",       category: "violence", severity: "high",     score: 0.8 },
  { pattern: "assault",      category: "violence", severity: "medium",   score: 0.5 },
  { pattern: "shoot up",     category: "violence", severity: "critical", score: 1.0 },
  { pattern: "bomb threat",  category: "violence", severity: "critical", score: 1.0 },
  { pattern: "make a bomb",  category: "violence", severity: "critical", score: 1.0 },
  { pattern: "build a bomb", category: "violence", severity: "critical", score: 1.0 },
  { pattern: "school shoot", category: "violence", severity: "critical", score: 1.0 },
  { pattern: "mass shoot",   category: "violence", severity: "critical", score: 1.0 },
  { pattern: "terrorist attack", category: "violence", severity: "high", score: 0.8 },
  { pattern: "torture",      category: "violence", severity: "high",     score: 0.7 },
  { pattern: "stab",         category: "violence", severity: "low",      score: 0.3 },
  { pattern: "decapitate",   category: "violence", severity: "high",     score: 0.85 },
  { pattern: "lynch",        category: "violence", severity: "critical", score: 0.95 },
  { pattern: "ethnic cleansing", category: "violence", severity: "critical", score: 1.0 },
];
