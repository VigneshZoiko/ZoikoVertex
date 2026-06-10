
import type { SafetyPattern } from "../types";

export const CONFIDENTIAL_PATTERNS: SafetyPattern[] = [

  // ---------------------------------------------------------------------------
  // CLASSIFICATION LABELS
  // ---------------------------------------------------------------------------
  { pattern: "confidential",                  category: "confidential_data_leakage", severity: "medium",   score: 0.50 },
  { pattern: "strictly confidential",         category: "confidential_data_leakage", severity: "high",     score: 0.75 },
  { pattern: "highly confidential",           category: "confidential_data_leakage", severity: "high",     score: 0.80 },
  { pattern: "top secret",                    category: "confidential_data_leakage", severity: "critical", score: 0.95 },
  { pattern: "classified",                    category: "confidential_data_leakage", severity: "high",     score: 0.75 },
  { pattern: "restricted",                    category: "confidential_data_leakage", severity: "medium",   score: 0.55 },
  { pattern: "sensitive information",         category: "confidential_data_leakage", severity: "medium",   score: 0.60 },
  { pattern: "sensitive data",                category: "confidential_data_leakage", severity: "medium",   score: 0.60 },
  { pattern: "internal only",                 category: "confidential_data_leakage", severity: "medium",   score: 0.55 },
  { pattern: "for internal use",              category: "confidential_data_leakage", severity: "medium",   score: 0.55 },
  { pattern: "internal use only",             category: "confidential_data_leakage", severity: "medium",   score: 0.60 },
  { pattern: "not for distribution",          category: "confidential_data_leakage", severity: "high",     score: 0.75 },
  { pattern: "do not share",                  category: "confidential_data_leakage", severity: "medium",   score: 0.55 },
  { pattern: "do not distribute",             category: "confidential_data_leakage", severity: "high",     score: 0.70 },
  { pattern: "do not disclose",               category: "confidential_data_leakage", severity: "high",     score: 0.70 },
  { pattern: "do not forward",                category: "confidential_data_leakage", severity: "medium",   score: 0.60 },
  { pattern: "not for public release",        category: "confidential_data_leakage", severity: "high",     score: 0.75 },
  { pattern: "embargo",                       category: "confidential_data_leakage", severity: "high",     score: 0.70 },
  { pattern: "under nda",                     category: "confidential_data_leakage", severity: "high",     score: 0.80 },
  { pattern: "nda protected",                 category: "confidential_data_leakage", severity: "high",     score: 0.80 },
  { pattern: "proprietary",                   category: "confidential_data_leakage", severity: "medium",   score: 0.60 },
  { pattern: "proprietary information",       category: "confidential_data_leakage", severity: "high",     score: 0.75 },
  { pattern: "trade secret",                  category: "confidential_data_leakage", severity: "high",     score: 0.75 },
  { pattern: "intellectual property",         category: "confidential_data_leakage", severity: "medium",   score: 0.55 },
  { pattern: "copyright protected",           category: "confidential_data_leakage", severity: "medium",   score: 0.55 },
  { pattern: "attorney client privilege",     category: "confidential_data_leakage", severity: "critical", score: 0.90 },
  { pattern: "legally privileged",            category: "confidential_data_leakage", severity: "critical", score: 0.90 },
  { pattern: "privileged and confidential",   category: "confidential_data_leakage", severity: "critical", score: 0.95 },

  // ---------------------------------------------------------------------------
  // GOVERNMENT / NATIONAL SECURITY IDENTIFIERS
  // ---------------------------------------------------------------------------
  { pattern: "social security number",        category: "confidential_data_leakage", severity: "critical", score: 1.00 },
  { pattern: "ssn:",                          category: "confidential_data_leakage", severity: "critical", score: 0.95 },
  { pattern: "tax identification number",     category: "confidential_data_leakage", severity: "critical", score: 0.95 },
  { pattern: "tin:",                          category: "confidential_data_leakage", severity: "critical", score: 0.90 },
  { pattern: "national insurance number",     category: "confidential_data_leakage", severity: "critical", score: 0.95 },
  { pattern: "passport number",               category: "confidential_data_leakage", severity: "high",     score: 0.85 },
  { pattern: "passport no",                   category: "confidential_data_leakage", severity: "high",     score: 0.85 },
  { pattern: "driver license number",         category: "confidential_data_leakage", severity: "critical", score: 0.95 },
  { pattern: "drivers license",               category: "confidential_data_leakage", severity: "high",     score: 0.80 },
  { pattern: "dl number",                     category: "confidential_data_leakage", severity: "high",     score: 0.80 },
  { pattern: "voter id",                      category: "confidential_data_leakage", severity: "high",     score: 0.80 },
  { pattern: "national id number",            category: "confidential_data_leakage", severity: "critical", score: 0.95 },
  { pattern: "aadhar number",                 category: "confidential_data_leakage", severity: "critical", score: 1.00 },
  { pattern: "aadhaar",                       category: "confidential_data_leakage", severity: "critical", score: 1.00 },
  { pattern: "pan number",                    category: "confidential_data_leakage", severity: "critical", score: 0.95 },
  { pattern: "sin number",                    category: "confidential_data_leakage", severity: "critical", score: 0.95 },
  { pattern: "medicare number",               category: "confidential_data_leakage", severity: "critical", score: 0.95 },
  { pattern: "medicaid number",               category: "confidential_data_leakage", severity: "critical", score: 0.95 },

  // ---------------------------------------------------------------------------
  // FINANCIAL PII
  // ---------------------------------------------------------------------------
  { pattern: "credit card number",            category: "confidential_data_leakage", severity: "critical", score: 1.00 },
  { pattern: "card number",                   category: "confidential_data_leakage", severity: "critical", score: 0.90 },
  { pattern: "cvv",                           category: "confidential_data_leakage", severity: "critical", score: 0.95 },
  { pattern: "cvc",                           category: "confidential_data_leakage", severity: "critical", score: 0.95 },
  { pattern: "card expiry",                   category: "confidential_data_leakage", severity: "high",     score: 0.80 },
  { pattern: "expiration date",               category: "confidential_data_leakage", severity: "high",     score: 0.75 },
  { pattern: "bank account number",           category: "confidential_data_leakage", severity: "critical", score: 1.00 },
  { pattern: "account number",               category: "confidential_data_leakage", severity: "high",     score: 0.80 },
  { pattern: "routing number",               category: "confidential_data_leakage", severity: "critical", score: 1.00 },
  { pattern: "sort code",                     category: "confidential_data_leakage", severity: "critical", score: 0.95 },
  { pattern: "iban",                          category: "confidential_data_leakage", severity: "critical", score: 0.95 },
  { pattern: "swift code",                    category: "confidential_data_leakage", severity: "high",     score: 0.80 },
  { pattern: "bic code",                      category: "confidential_data_leakage", severity: "high",     score: 0.80 },
  { pattern: "pin number",                    category: "confidential_data_leakage", severity: "critical", score: 1.00 },
  { pattern: "atm pin",                       category: "confidential_data_leakage", severity: "critical", score: 1.00 },
  { pattern: "wire transfer details",         category: "confidential_data_leakage", severity: "critical", score: 0.95 },
  { pattern: "payroll data",                  category: "confidential_data_leakage", severity: "high",     score: 0.80 },
  { pattern: "salary information",            category: "confidential_data_leakage", severity: "high",     score: 0.75 },
  { pattern: "compensation details",          category: "confidential_data_leakage", severity: "high",     score: 0.75 },
  { pattern: "financial records",             category: "confidential_data_leakage", severity: "high",     score: 0.75 },
  { pattern: "tax returns",                   category: "confidential_data_leakage", severity: "high",     score: 0.80 },
  { pattern: "audit report",                  category: "confidential_data_leakage", severity: "high",     score: 0.75 },

  // ---------------------------------------------------------------------------
  // CREDENTIALS & SECRETS
  // ---------------------------------------------------------------------------
  { pattern: "api key:",                      category: "confidential_data_leakage", severity: "critical", score: 0.95 },
  { pattern: "api_key",                       category: "confidential_data_leakage", severity: "critical", score: 0.95 },
  { pattern: "secret key",                    category: "confidential_data_leakage", severity: "critical", score: 0.90 },
  { pattern: "secret_key",                    category: "confidential_data_leakage", severity: "critical", score: 0.90 },
  { pattern: "private key",                   category: "confidential_data_leakage", severity: "critical", score: 0.90 },
  { pattern: "private_key",                   category: "confidential_data_leakage", severity: "critical", score: 0.90 },
  { pattern: "bearer token",                  category: "confidential_data_leakage", severity: "critical", score: 0.90 },
  { pattern: "access token",                  category: "confidential_data_leakage", severity: "critical", score: 0.90 },
  { pattern: "refresh token",                 category: "confidential_data_leakage", severity: "critical", score: 0.90 },
  { pattern: "auth token",                    category: "confidential_data_leakage", severity: "critical", score: 0.90 },
  { pattern: "authorization token",           category: "confidential_data_leakage", severity: "critical", score: 0.90 },
  { pattern: "client secret",                 category: "confidential_data_leakage", severity: "critical", score: 0.95 },
  { pattern: "client_secret",                 category: "confidential_data_leakage", severity: "critical", score: 0.95 },
  { pattern: "oauth token",                   category: "confidential_data_leakage", severity: "critical", score: 0.90 },
  { pattern: "session token",                 category: "confidential_data_leakage", severity: "critical", score: 0.90 },
  { pattern: "session id",                    category: "confidential_data_leakage", severity: "high",     score: 0.80 },
  { pattern: "cookie value",                  category: "confidential_data_leakage", severity: "high",     score: 0.75 },
  { pattern: "password:",                     category: "confidential_data_leakage", severity: "critical", score: 1.00 },
  { pattern: "password =",                    category: "confidential_data_leakage", severity: "critical", score: 1.00 },
  { pattern: "passwd",                        category: "confidential_data_leakage", severity: "critical", score: 0.95 },
  { pattern: "my password is",               category: "confidential_data_leakage", severity: "critical", score: 1.00 },
  { pattern: "login credentials",             category: "confidential_data_leakage", severity: "critical", score: 0.95 },
  { pattern: "database credentials",          category: "confidential_data_leakage", severity: "critical", score: 1.00 },
  { pattern: "db password",                   category: "confidential_data_leakage", severity: "critical", score: 1.00 },
  { pattern: "connection string",             category: "confidential_data_leakage", severity: "critical", score: 0.95 },
  { pattern: "database url",                  category: "confidential_data_leakage", severity: "critical", score: 0.95 },
  { pattern: "encryption key",               category: "confidential_data_leakage", severity: "critical", score: 0.95 },
  { pattern: "decryption key",               category: "confidential_data_leakage", severity: "critical", score: 0.95 },
  { pattern: "signing key",                   category: "confidential_data_leakage", severity: "critical", score: 0.95 },
  { pattern: "webhook secret",               category: "confidential_data_leakage", severity: "critical", score: 0.95 },
  { pattern: "stripe secret",                category: "confidential_data_leakage", severity: "critical", score: 1.00 },
  { pattern: "twilio auth",                   category: "confidential_data_leakage", severity: "critical", score: 1.00 },
  { pattern: "sendgrid key",                  category: "confidential_data_leakage", severity: "critical", score: 1.00 },
  { pattern: "github token",                  category: "confidential_data_leakage", severity: "critical", score: 1.00 },
  { pattern: "slack token",                   category: "confidential_data_leakage", severity: "critical", score: 1.00 },
  { pattern: "discord token",                 category: "confidential_data_leakage", severity: "critical", score: 1.00 },
  { pattern: "google api key",               category: "confidential_data_leakage", severity: "critical", score: 1.00 },
  { pattern: "azure key",                     category: "confidential_data_leakage", severity: "critical", score: 1.00 },
  { pattern: "supabase key",                  category: "confidential_data_leakage", severity: "critical", score: 1.00 },
  { pattern: "service account key",          category: "confidential_data_leakage", severity: "critical", score: 1.00 },
  { pattern: "rsa private key",              category: "confidential_data_leakage", severity: "critical", score: 1.00 },
  { pattern: "begin private key",            category: "confidential_data_leakage", severity: "critical", score: 1.00 },
  { pattern: "begin rsa",                    category: "confidential_data_leakage", severity: "critical", score: 1.00 },
  { pattern: "-----begin",                   category: "confidential_data_leakage", severity: "critical", score: 1.00 },
  { pattern: "private_key_id",               category: "confidential_data_leakage", severity: "critical", score: 1.00 },

  // ---------------------------------------------------------------------------
  // HEALTH / MEDICAL
  // ---------------------------------------------------------------------------
  { pattern: "medical record",               category: "confidential_data_leakage", severity: "critical", score: 0.95 },
  { pattern: "medical history",              category: "confidential_data_leakage", severity: "critical", score: 0.95 },
  { pattern: "health record",                category: "confidential_data_leakage", severity: "critical", score: 0.95 },
  { pattern: "patient record",               category: "confidential_data_leakage", severity: "critical", score: 1.00 },
  { pattern: "patient data",                 category: "confidential_data_leakage", severity: "critical", score: 1.00 },
  { pattern: "diagnosis",                    category: "confidential_data_leakage", severity: "high",     score: 0.75 },
  { pattern: "prescription details",         category: "confidential_data_leakage", severity: "high",     score: 0.80 },
  { pattern: "lab results",                  category: "confidential_data_leakage", severity: "high",     score: 0.80 },
  { pattern: "test results",                 category: "confidential_data_leakage", severity: "high",     score: 0.75 },
  { pattern: "blood type",                   category: "confidential_data_leakage", severity: "medium",   score: 0.60 },
  { pattern: "health insurance id",          category: "confidential_data_leakage", severity: "critical", score: 0.95 },
  { pattern: "insurance policy number",      category: "confidential_data_leakage", severity: "critical", score: 0.95 },
  { pattern: "hipaa",                        category: "confidential_data_leakage", severity: "high",     score: 0.80 },
  { pattern: "phi data",                     category: "confidential_data_leakage", severity: "critical", score: 1.00 },
  { pattern: "protected health information", category: "confidential_data_leakage", severity: "critical", score: 1.00 },
  { pattern: "mental health record",         category: "confidential_data_leakage", severity: "critical", score: 1.00 },
  { pattern: "psychiatric record",           category: "confidential_data_leakage", severity: "critical", score: 1.00 },
  { pattern: "substance abuse record",       category: "confidential_data_leakage", severity: "critical", score: 1.00 },
  { pattern: "hiv status",                   category: "confidential_data_leakage", severity: "critical", score: 1.00 },
  { pattern: "genetic data",                 category: "confidential_data_leakage", severity: "critical", score: 1.00 },
  { pattern: "biometric data",               category: "confidential_data_leakage", severity: "critical", score: 1.00 },

  // ---------------------------------------------------------------------------
  // BUSINESS / CORPORATE SECRETS
  // ---------------------------------------------------------------------------
  { pattern: "merger plan",                  category: "confidential_data_leakage", severity: "critical", score: 0.95 },
  { pattern: "acquisition plan",             category: "confidential_data_leakage", severity: "critical", score: 0.95 },
  { pattern: "acquisition target",           category: "confidential_data_leakage", severity: "critical", score: 0.95 },
  { pattern: "strategic roadmap",            category: "confidential_data_leakage", severity: "high",     score: 0.80 },
  { pattern: "unreleased product",           category: "confidential_data_leakage", severity: "high",     score: 0.80 },
  { pattern: "product roadmap",              category: "confidential_data_leakage", severity: "high",     score: 0.75 },
  { pattern: "business strategy",            category: "confidential_data_leakage", severity: "high",     score: 0.75 },
  { pattern: "internal pricing",             category: "confidential_data_leakage", severity: "high",     score: 0.80 },
  { pattern: "pricing model",                category: "confidential_data_leakage", severity: "high",     score: 0.75 },
  { pattern: "cost structure",               category: "confidential_data_leakage", severity: "high",     score: 0.75 },
  { pattern: "profit margin",                category: "confidential_data_leakage", severity: "high",     score: 0.75 },
  { pattern: "revenue forecast",             category: "confidential_data_leakage", severity: "high",     score: 0.80 },
  { pattern: "board minutes",                category: "confidential_data_leakage", severity: "critical", score: 0.95 },
  { pattern: "board resolution",             category: "confidential_data_leakage", severity: "critical", score: 0.95 },
  { pattern: "investor relations",           category: "confidential_data_leakage", severity: "high",     score: 0.75 },
  { pattern: "non-public information",       category: "confidential_data_leakage", severity: "critical", score: 0.95 },
  { pattern: "insider information",          category: "confidential_data_leakage", severity: "critical", score: 1.00 },
  { pattern: "material non-public",          category: "confidential_data_leakage", severity: "critical", score: 1.00 },
  { pattern: "pre-announcement",             category: "confidential_data_leakage", severity: "critical", score: 0.90 },
  { pattern: "draft contract",               category: "confidential_data_leakage", severity: "high",     score: 0.80 },
  { pattern: "term sheet",                   category: "confidential_data_leakage", severity: "high",     score: 0.80 },
  { pattern: "letter of intent",             category: "confidential_data_leakage", severity: "high",     score: 0.80 },
  { pattern: "customer list",                category: "confidential_data_leakage", severity: "high",     score: 0.80 },
  { pattern: "client list",                  category: "confidential_data_leakage", severity: "high",     score: 0.80 },
  { pattern: "vendor list",                  category: "confidential_data_leakage", severity: "medium",   score: 0.65 },
  { pattern: "employee records",             category: "confidential_data_leakage", severity: "critical", score: 0.95 },
  { pattern: "hr records",                   category: "confidential_data_leakage", severity: "critical", score: 0.95 },
  { pattern: "personnel file",               category: "confidential_data_leakage", severity: "critical", score: 0.95 },
  { pattern: "background check",             category: "confidential_data_leakage", severity: "high",     score: 0.80 },
  { pattern: "performance review",           category: "confidential_data_leakage", severity: "high",     score: 0.75 },
  { pattern: "disciplinary record",          category: "confidential_data_leakage", severity: "high",     score: 0.80 },
  { pattern: "source code",                  category: "confidential_data_leakage", severity: "high",     score: 0.75 },
  { pattern: "proprietary algorithm",        category: "confidential_data_leakage", severity: "critical", score: 0.95 },
  { pattern: "training data",                category: "confidential_data_leakage", severity: "high",     score: 0.75 },
  { pattern: "model weights",                category: "confidential_data_leakage", severity: "critical", score: 0.95 },

  // ---------------------------------------------------------------------------
  // REGEX PATTERNS — STRUCTURED PII & SECRETS
  // ---------------------------------------------------------------------------

  // US SSN — 123-45-6789
  {
    pattern: "ssn_regex",
    regex: /\b\d{3}-\d{2}-\d{4}\b/,
    category: "confidential_data_leakage", severity: "critical", score: 1.00,
  },

  // Visa / Mastercard
  {
    pattern: "credit_card_visa_mc",
    regex: /\b(?:4\d{12}(?:\d{3})?|5[1-5]\d{14})\b/,
    category: "confidential_data_leakage", severity: "critical", score: 1.00,
  },

  // Amex
  {
    pattern: "credit_card_amex",
    regex: /\b3[47]\d{13}\b/,
    category: "confidential_data_leakage", severity: "critical", score: 1.00,
  },

  // Discover
  {
    pattern: "credit_card_discover",
    regex: /\b6(?:011|5\d{2})\d{12}\b/,
    category: "confidential_data_leakage", severity: "critical", score: 1.00,
  },

  // OpenAI / Anthropic-style API key  sk-...
  {
    pattern: "openai_api_key",
    regex: /\bsk-[A-Za-z0-9]{20,}\b/,
    category: "confidential_data_leakage", severity: "critical", score: 1.00,
  },

  // AWS Access Key ID
  {
    pattern: "aws_access_key",
    regex: /\bAKIA[0-9A-Z]{16}\b/,
    category: "confidential_data_leakage", severity: "critical", score: 1.00,
  },

  // AWS Secret Access Key (heuristic length)
  {
    pattern: "aws_secret_key",
    regex: /\b[A-Za-z0-9/+]{40}\b/,
    category: "confidential_data_leakage", severity: "critical", score: 0.90,
  },

  // Google API key  AIza...
  {
    pattern: "google_api_key",
    regex: /\bAIza[0-9A-Za-z\-_]{35}\b/,
    category: "confidential_data_leakage", severity: "critical", score: 1.00,
  },

  // GitHub Personal Access Token (classic)  ghp_...
  {
    pattern: "github_pat",
    regex: /\bghp_[A-Za-z0-9]{36}\b/,
    category: "confidential_data_leakage", severity: "critical", score: 1.00,
  },

  // GitHub fine-grained token  github_pat_...
  {
    pattern: "github_fine_grained_pat",
    regex: /\bgithub_pat_[A-Za-z0-9_]{82}\b/,
    category: "confidential_data_leakage", severity: "critical", score: 1.00,
  },

  // Stripe secret key  sk_live_... / sk_test_...
  {
    pattern: "stripe_secret_key",
    regex: /\bsk_(live|test)_[A-Za-z0-9]{24,}\b/,
    category: "confidential_data_leakage", severity: "critical", score: 1.00,
  },

  // Stripe publishable key  pk_live_... / pk_test_...
  {
    pattern: "stripe_publishable_key",
    regex: /\bpk_(live|test)_[A-Za-z0-9]{24,}\b/,
    category: "confidential_data_leakage", severity: "high",     score: 0.85,
  },

  // Twilio Account SID  AC...
  {
    pattern: "twilio_account_sid",
    regex: /\bAC[a-f0-9]{32}\b/,
    category: "confidential_data_leakage", severity: "critical", score: 1.00,
  },

  // Twilio Auth Token (32-char hex)
  {
    pattern: "twilio_auth_token",
    regex: /\b[a-f0-9]{32}\b/,
    category: "confidential_data_leakage", severity: "high",     score: 0.80,
  },

  // Slack Bot / User token  xoxb- / xoxp-
  {
    pattern: "slack_token",
    regex: /\bxox[bpoa]-[A-Za-z0-9\-]{10,}\b/,
    category: "confidential_data_leakage", severity: "critical", score: 1.00,
  },

  // Discord Bot Token
  {
    pattern: "discord_bot_token",
    regex: /\b[MN][A-Za-z0-9]{23}\.[A-Za-z0-9_-]{6}\.[A-Za-z0-9_-]{27}\b/,
    category: "confidential_data_leakage", severity: "critical", score: 1.00,
  },

  // JWT  eyJ...
  {
    pattern: "jwt_token",
    regex: /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/,
    category: "confidential_data_leakage", severity: "high",     score: 0.85,
  },

  // IBAN
  {
    pattern: "iban",
    regex: /\b[A-Z]{2}\d{2}[A-Z0-9]{4,30}\b/,
    category: "confidential_data_leakage", severity: "high",     score: 0.75,
  },

  // PEM private key block
  {
    pattern: "pem_private_key",
    regex: /-----BEGIN\s(?:RSA\s|EC\s|OPENSSH\s|DSA\s)?PRIVATE KEY-----/,
    category: "confidential_data_leakage", severity: "critical", score: 1.00,
  },

  // Generic high-entropy secret assignment  secret=... / key=...
  {
    pattern: "generic_secret_assignment",
    regex: /(?:secret|password|passwd|token|apikey|api_key)\s*[:=]\s*["']?[A-Za-z0-9+/\-_]{16,}["']?/i,
    category: "confidential_data_leakage", severity: "critical", score: 0.95,
  },

  // Database connection string  postgresql:// / mysql:// etc.
  {
    pattern: "db_connection_string",
    regex: /\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis|mssql):\/\/[^\s"']+/i,
    category: "confidential_data_leakage", severity: "critical", score: 1.00,
  },

  // Indian Aadhaar number  XXXX XXXX XXXX
  {
    pattern: "aadhaar_number",
    regex: /\b[2-9]\d{3}\s\d{4}\s\d{4}\b/,
    category: "confidential_data_leakage", severity: "critical", score: 1.00,
  },

  // Indian PAN  AAAAA9999A
  {
    pattern: "pan_number",
    regex: /\b[A-Z]{5}[0-9]{4}[A-Z]\b/,
    category: "confidential_data_leakage", severity: "critical", score: 0.95,
  },

  // UK National Insurance  AA 99 99 99 A
  {
    pattern: "uk_national_insurance",
    regex: /\b[A-CEGHJ-PR-TW-Z]{2}\d{6}[A-D]\b/,
    category: "confidential_data_leakage", severity: "critical", score: 1.00,
  },

  // IPv4 (internal RFC-1918 ranges — potential infra leak)
  {
    pattern: "internal_ipv4",
    regex: /\b(?:10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3})\b/,
    category: "confidential_data_leakage", severity: "medium",   score: 0.60,
  },

  // Supabase service role key  eyJ... with long payload (already caught by JWT but explicit label helps routing)
  {
    pattern: "supabase_service_key",
    regex: /\beyJ[A-Za-z0-9_-]{100,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/,
    category: "confidential_data_leakage", severity: "critical", score: 1.00,
  },
];
