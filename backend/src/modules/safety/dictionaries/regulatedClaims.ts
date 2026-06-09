import type { SafetyPattern } from "../types";

// Regulated-claim phrases — FTC, FDA, financial-services, and
// medical guidance language that triggers compliance review.
// Always uses phrase-level matching (not single words) to avoid
// false positives on benign marketing copy.
export const REGULATED_CLAIM_PATTERNS: SafetyPattern[] = [
  { pattern: "fda approved",       category: "regulated_claims", severity: "high",   score: 0.85 },
  { pattern: "fda-approved",       category: "regulated_claims", severity: "high",   score: 0.85 },
  { pattern: "clinically proven",  category: "regulated_claims", severity: "high",   score: 0.85 },
  { pattern: "clinically tested",  category: "regulated_claims", severity: "medium", score: 0.55 },
  { pattern: "scientifically proven", category: "regulated_claims", severity: "high", score: 0.8 },
  { pattern: "miracle cure",       category: "regulated_claims", severity: "critical", score: 0.95 },
  { pattern: "guaranteed results", category: "regulated_claims", severity: "high",   score: 0.8 },
  { pattern: "guaranteed return",  category: "regulated_claims", severity: "high",   score: 0.85 },
  { pattern: "risk free investment", category: "regulated_claims", severity: "critical", score: 0.95 },
  { pattern: "no risk",            category: "regulated_claims", severity: "medium", score: 0.55 },
  { pattern: "double your money",  category: "regulated_claims", severity: "critical", score: 0.95 },
  { pattern: "get rich quick",     category: "regulated_claims", severity: "critical", score: 0.95 },
  { pattern: "cures cancer",       category: "regulated_claims", severity: "critical", score: 1.0 },
  { pattern: "cures diabetes",     category: "regulated_claims", severity: "critical", score: 1.0 },
  { pattern: "treats covid",       category: "regulated_claims", severity: "critical", score: 1.0 },
  { pattern: "lose weight fast",   category: "regulated_claims", severity: "high",     score: 0.75 },
  { pattern: "permanent results",  category: "regulated_claims", severity: "medium",   score: 0.5 },
];
     