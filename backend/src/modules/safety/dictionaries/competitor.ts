import type { SafetyPattern } from "../types";

// Competitor disparagement phrases. Lower severity by default
// because these are usually brand-policy violations rather than
// safety incidents; tenants override to escalate if needed.
export const COMPETITOR_PATTERNS: SafetyPattern[] = [
  { pattern: "competitors are wrong", category: "competitor_risk", severity: "medium", score: 0.5 },
  { pattern: "competitors fail",      category: "competitor_risk", severity: "medium", score: 0.5 },
  { pattern: "their product fails",   category: "competitor_risk", severity: "medium", score: 0.5 },
  { pattern: "their service sucks",   category: "competitor_risk", severity: "medium", score: 0.55 },
  { pattern: "don't use",             category: "competitor_risk", severity: "low",    score: 0.25 },
  { pattern: "stay away from",        category: "competitor_risk", severity: "low",    score: 0.3 },
  { pattern: "worst in the market",   category: "competitor_risk", severity: "medium", score: 0.5 },
  { pattern: "terrible service",      category: "competitor_risk", severity: "medium", score: 0.45 },
  { pattern: "scam",                  category: "competitor_risk", severity: "high",   score: 0.7 },
  { pattern: "fraudulent",            category: "competitor_risk", severity: "high",   score: 0.7 },
];

// Prompt injection patterns — for moderation of user-supplied
// content being fed BACK into an agent prompt. Catches the most
// common 2024-era attack surfaces.
export const PROMPT_INJECTION_PATTERNS: SafetyPattern[] = [
  { pattern: "ignore previous instructions", category: "prompt_injection", severity: "critical", score: 1.0 },
  { pattern: "ignore all previous",          category: "prompt_injection", severity: "critical", score: 1.0 },
  { pattern: "ignore the above",             category: "prompt_injection", severity: "high",     score: 0.85 },
  { pattern: "disregard your instructions",  category: "prompt_injection", severity: "critical", score: 1.0 },
  { pattern: "you are now",                  category: "prompt_injection", severity: "medium",   score: 0.55 },
  { pattern: "act as a",                     category: "prompt_injection", severity: "low",      score: 0.3 },
  { pattern: "pretend you are",              category: "prompt_injection", severity: "medium",   score: 0.55 },
  { pattern: "system prompt:",               category: "prompt_injection", severity: "high",     score: 0.85 },
  { pattern: "developer mode",               category: "prompt_injection", severity: "high",     score: 0.75 },
  { pattern: "jailbreak",                    category: "prompt_injection", severity: "critical", score: 0.95 },
  { pattern: "dan mode",                     category: "prompt_injection", severity: "high",     score: 0.85 },
  { pattern: "reveal your system",           category: "prompt_injection", severity: "critical", score: 0.95 },
  { pattern: "print your instructions",      category: "prompt_injection", severity: "critical", score: 0.95 },
];
