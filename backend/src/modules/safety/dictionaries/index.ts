// ============================================================
// Dictionary aggregator. The local engine imports ALL_PATTERNS
// once at startup and indexes them. Adding a new pattern file
// only requires importing it here and spreading it into the
// array.
// ============================================================

import type { SafetyPattern } from "../types";

import { OFFENSIVE_PATTERNS } from "./offensive";
import { HATE_PATTERNS } from "./hate";
import { SEXUAL_PATTERNS } from "./sexual";
import { VIOLENCE_PATTERNS } from "./violence";
import { SELF_HARM_PATTERNS } from "./selfHarm";
import { REGULATED_CLAIM_PATTERNS } from "./regulatedClaims";
import { CONFIDENTIAL_PATTERNS } from "./confidential";
import { COMPETITOR_PATTERNS, PROMPT_INJECTION_PATTERNS } from "./competitor";

export const ALL_PATTERNS: SafetyPattern[] = [
  ...OFFENSIVE_PATTERNS,
  ...HATE_PATTERNS,
  ...SEXUAL_PATTERNS,
  ...VIOLENCE_PATTERNS,
  ...SELF_HARM_PATTERNS,
  ...REGULATED_CLAIM_PATTERNS,
  ...CONFIDENTIAL_PATTERNS,
  ...COMPETITOR_PATTERNS,
  ...PROMPT_INJECTION_PATTERNS,
];

export {
  OFFENSIVE_PATTERNS,
  HATE_PATTERNS,
  SEXUAL_PATTERNS,
  VIOLENCE_PATTERNS,
  SELF_HARM_PATTERNS,
  REGULATED_CLAIM_PATTERNS,
  CONFIDENTIAL_PATTERNS,
  COMPETITOR_PATTERNS,
  PROMPT_INJECTION_PATTERNS,
};
