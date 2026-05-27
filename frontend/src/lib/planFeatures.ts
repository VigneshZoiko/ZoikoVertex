// Canonical plan tier — order is significant (used for rank comparisons)
// DB values: FREE | STARTER | GROWTH | SCALE | ENTERPRISE
// Display:   Vertex Starter | Vertex Growth | Vertex Scale | Vertex Corporate
export type Plan = 'FREE' | 'STARTER' | 'GROWTH' | 'SCALE' | 'ENTERPRISE';

export const PLAN_RANK: Record<Plan, number> = {
  FREE:       0,
  STARTER:    1,
  GROWTH:     2,
  SCALE:      3,
  ENTERPRISE: 4,
};

export const PLAN_DISPLAY: Record<Plan, string> = {
  FREE:       'Vertex Starter',
  STARTER:    'Vertex Starter',
  GROWTH:     'Vertex Growth',
  SCALE:      'Vertex Scale',
  ENTERPRISE: 'Vertex Corporate',
};

export const PLAN_BADGE_COLOR: Record<Plan, string> = {
  FREE:       'text-zinc-400 bg-zinc-400/10 border-zinc-400/20',
  STARTER:    'text-zinc-400 bg-zinc-400/10 border-zinc-400/20',
  GROWTH:     'text-blue-400 bg-blue-400/10 border-blue-400/20',
  SCALE:      'text-violet-400 bg-violet-400/10 border-violet-400/20',
  ENTERPRISE: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
};

// All plan-gated features
// Features NOT listed here are available on all plans (FREE+)
export type Feature =
  // GROWTH+ features (most of the platform)
  | 'campaigns'           // Campaigns & Content Studio
  | 'publishing'          // Publishing Hub (live publish)
  | 'calendar'            // Full Calendar (preview in Starter)
  | 'inbox'               // Inbox & Engagement (preview in Starter)
  | 'agents'              // Agent Studio, Operations, Workflows, Prompts, Knowledge
  | 'review_queue'        // Review Queue, Validation Desk, Quality Audit
  | 'approvals'           // Approvals, Approval Rules, Exceptions
  | 'governance'          // Safety Overview, Policy Control Matrix, Approval Console
  | 'audit_trail'         // Standard Audit Trail
  | 'api_webhooks'        // API & Webhooks, Developer Console
  | 'data_connectors'     // Data Connectors
  // SCALE+ features
  | 'forensic_hub'        // Forensic Hub
  | 'evidence_vault'      // Evidence Vault (advanced packaging)
  | 'legal_holds'         // Legal Holds
  | 'crisis_console'      // Crisis Console
  | 'brand_standards'     // Full Brand Library & Standards
  // ENTERPRISE (Corporate) only
  | 'identity_ledger'     // Identity Ledger
  | 'sso';                // SSO / SAML / SCIM

export const FEATURE_MIN_PLAN: Record<Feature, Plan> = {
  // GROWTH+
  campaigns:       'GROWTH',
  publishing:      'GROWTH',
  calendar:        'GROWTH',
  inbox:           'GROWTH',
  agents:          'GROWTH',
  review_queue:    'GROWTH',
  approvals:       'GROWTH',
  governance:      'GROWTH',
  audit_trail:     'GROWTH',
  api_webhooks:    'GROWTH',
  data_connectors: 'GROWTH',
  // SCALE+
  forensic_hub:    'SCALE',
  evidence_vault:  'SCALE',
  legal_holds:     'SCALE',
  crisis_console:  'SCALE',
  brand_standards: 'SCALE',
  // ENTERPRISE
  identity_ledger: 'ENTERPRISE',
  sso:             'ENTERPRISE',
};

// Human-readable upgrade prompt for each feature lock
export const FEATURE_UPGRADE_REASON: Record<Feature, string> = {
  campaigns:       'Full Campaigns & Content Studio requires Vertex Growth.',
  publishing:      'Live Publishing Hub requires Vertex Growth.',
  calendar:        'Full Calendar & scheduling requires Vertex Growth.',
  inbox:           'Inbox & Engagement requires Vertex Growth.',
  agents:          'AI Agent Studio & Workflows require Vertex Growth.',
  review_queue:    'Review Queue & Validation require Vertex Growth.',
  approvals:       'Approval workflows require Vertex Growth.',
  governance:      'Policy & Governance controls require Vertex Growth.',
  audit_trail:     'Immutable Audit Trail requires Vertex Growth.',
  api_webhooks:    'API & Webhooks require Vertex Growth.',
  data_connectors: 'Data Connectors require Vertex Growth.',
  forensic_hub:    'Forensic Hub requires Vertex Scale.',
  evidence_vault:  'Evidence Vault & packaging require Vertex Scale.',
  legal_holds:     'Legal Holds require Vertex Scale.',
  crisis_console:  'Crisis Console requires Vertex Scale.',
  brand_standards: 'Full Brand Standards Library requires Vertex Scale.',
  identity_ledger: 'Identity Ledger requires Vertex Corporate.',
  sso:             'SSO / SAML / SCIM requires Vertex Corporate.',
};

// Convert raw DB plan string to canonical Plan type
export function normalisePlan(raw: string | null | undefined): Plan {
  const upper = (raw ?? 'FREE').toUpperCase();
  return (upper in PLAN_RANK ? upper : 'FREE') as Plan;
}

// Can a workspace on `current` plan use `feature`?
export function canUsePlan(current: Plan, feature: Feature): boolean {
  return PLAN_RANK[current] >= PLAN_RANK[FEATURE_MIN_PLAN[feature]];
}
