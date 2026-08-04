/**
 * Plain module (no "use client") so server components such as the hero can
 * import these without React treating them as client references.
 */

export const CONSENT_VERSION = "v1.0";

export type CategoryId =
  | "necessary"
  | "analytics"
  | "personalization"
  | "marketing"
  | "integrations";

export type Consent = Record<CategoryId, boolean>;

/** Non-essential categories default to off until the visitor opts in. */
export const DEFAULT_CONSENT: Consent = {
  necessary: true,
  analytics: false,
  personalization: false,
  marketing: false,
  integrations: false,
};

export const ALL_ON: Consent = {
  necessary: true,
  analytics: true,
  personalization: true,
  marketing: true,
  integrations: true,
};

export const OPTIONAL_CATEGORIES: CategoryId[] = [
  "analytics",
  "personalization",
  "marketing",
  "integrations",
];
