import type { SafetyPattern } from "../types";

// Confidential data leakage. Phrase patterns catch human-written
// indicators; regex patterns catch structured PII/secrets that
// shouldn't appear in agent output verbatim.
export const CONFIDENTIAL_PATTERNS: SafetyPattern[] = [
  { pattern: "confidential",       category: "confidential_data_leakage", severity: "medium", score: 0.5 },
  { pattern: "internal only",      category: "confidential_data_leakage", severity: "medium", score: 0.55 },
  { pattern: "do not share",       category: "confidential_data_leakage", severity: "medium", score: 0.55 },
  { pattern: "for internal use",   category: "confidential_data_leakage", severity: "medium", score: 0.55 },
  { pattern: "trade secret",       category: "confidential_data_leakage", severity: "high",   score: 0.75 },
  { pattern: "social security number", category: "confidential_data_leakage", severity: "critical", score: 1.0 },
  { pattern: "ssn:",               category: "confidential_data_leakage", severity: "critical", score: 0.95 },
  { pattern: "passport number",    category: "confidential_data_leakage", severity: "high",   score: 0.85 },
  { pattern: "api key:",           category: "confidential_data_leakage", severity: "high",   score: 0.85 },
  { pattern: "private key",        category: "confidential_data_leakage", severity: "high",   score: 0.8 },
  { pattern: "bearer token",       category: "confidential_data_leakage", severity: "high",   score: 0.8 },

  // ---- Structured patterns (regex-driven) ----
  {
    pattern: "ssn",
    regex: /\b\d{3}-\d{2}-\d{4}\b/,
    category: "confidential_data_leakage",
    severity: "critical",
    score: 1.0,
  },
  {
    pattern: "credit_card_visa_mc",
    regex: /\b(?:4\d{12}(?:\d{3})?|5[1-5]\d{14})\b/,
    category: "confidential_data_leakage",
    severity: "critical",
    score: 1.0,
  },
  {
    pattern: "credit_card_amex",
    regex: /\b3[47]\d{13}\b/,
    category: "confidential_data_leakage",
    severity: "critical",
    score: 1.0,
  },
  {
    pattern: "openai_api_key",
    regex: /\bsk-[A-Za-z0-9]{20,}\b/,
    category: "confidential_data_leakage",
    severity: "critical",
    score: 1.0,
  },
  {
    pattern: "aws_access_key",
    regex: /\bAKIA[0-9A-Z]{16}\b/,
    category: "confidential_data_leakage",
    severity: "critical",
    score: 1.0,
  },
  {
    pattern: "jwt_token",
    regex: /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/,
    category: "confidential_data_leakage",
    severity: "high",
    score: 0.85,
  },
  {
    pattern: "iban",
    regex: /\b[A-Z]{2}\d{2}[A-Z0-9]{4,30}\b/,
    category: "confidential_data_leakage",
    severity: "high",
    score: 0.75,
  },
];
