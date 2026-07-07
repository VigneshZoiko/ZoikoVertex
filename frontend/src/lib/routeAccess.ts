// Single source of truth for role-based + plan-based route access.
// Longest-prefix-first so /library/upload can be more restrictive than /library.
// Routes NOT listed here are open to ALL authenticated users.

import { type Plan, type Feature, FEATURE_MIN_PLAN, PLAN_RANK, normalisePlan } from "@/lib/planFeatures";

interface RouteRule {
  prefix: string;
  roles: string[];
  plan?: Feature;
}

export const ROUTE_RULES: RouteRule[] = [
  // ── Platform Owner ─────────────────────────────────────────────────────────
  { prefix: '/superadmin',                    roles: ['SUPERADMIN'] },

  // ── Admin / System ────────────────────────────────────────────────────────
  { prefix: '/admin/billing',                 roles: ['WORKSPACE_OWNER', 'SUPERADMIN'] },
  { prefix: '/admin/security',                roles: ['ADMIN', 'WORKSPACE_OWNER', 'SECURITY_ADMIN', 'SUPERADMIN'] },
  { prefix: '/admin/privacy',                 roles: ['ADMIN', 'WORKSPACE_OWNER', 'PRIVACY_ADMIN', 'SUPERADMIN'] },
  { prefix: '/admin/status',                  roles: ['ADMIN', 'WORKSPACE_OWNER', 'DEVELOPER', 'SUPERADMIN'] },
  { prefix: '/admin/notifications',           roles: ['ADMIN','WORKSPACE_OWNER','VIEWER','SUPERADMIN'] },
  { prefix: '/admin/settings',                roles: ['WORKSPACE_OWNER', 'SUPERADMIN'] },
  { prefix: '/admin',                         roles: ['ADMIN', 'WORKSPACE_OWNER', 'SUPERADMIN'] },

  // ── Access Control ────────────────────────────────────────────────────────
  { prefix: '/access',                        roles: ['WORKSPACE_OWNER', 'SUPERADMIN'] },
  { prefix: '/team',                          roles: ['ADMIN', 'WORKSPACE_OWNER', 'SECURITY_ADMIN', 'SUPERADMIN'] },

  // ── Infrastructure / Integrations ─────────────────────────────────────────
  { prefix: '/integrations/api',              roles: ['ADMIN', 'WORKSPACE_OWNER', 'DEVELOPER', 'SUPERADMIN'],                                                                                                      plan: 'api_webhooks' },
  { prefix: '/integrations/data',             roles: ['ADMIN', 'WORKSPACE_OWNER', 'DEVELOPER', 'SUPERADMIN'],                                                                                                      plan: 'data_connectors' },
  { prefix: '/integrations/identity-ledger',  roles: ['ADMIN', 'WORKSPACE_OWNER', 'DEVELOPER', 'AUDITOR', 'SUPERADMIN'],                                                                                           plan: 'identity_ledger' },
  { prefix: '/integrations/health',           roles: ['ADMIN', 'WORKSPACE_OWNER', 'DEVELOPER', 'SUPERADMIN'] },
  { prefix: '/integrations',                  roles: ['ADMIN', 'WORKSPACE_OWNER', 'DEVELOPER', 'SUPERADMIN'] },
  { prefix: '/accounts',                      roles: ['ADMIN', 'WORKSPACE_OWNER', 'DEVELOPER', 'SUPERADMIN'] },
  { prefix: '/resources',                     roles: ['ADMIN', 'WORKSPACE_OWNER', 'DEVELOPER', 'SUPERADMIN'] },

  // ── Evidence Layer ────────────────────────────────────────────────────────
  { prefix: '/evidence/audit-trail',          roles: ['ADMIN', 'WORKSPACE_OWNER', 'GOVERNANCE_ADMIN', 'KNOWLEDGE_MANAGER', 'AUDITOR', 'COMPLIANCE_REVIEWER', 'VALIDATOR', 'SUPERADMIN'],                    plan: 'audit_trail' },
  { prefix: '/evidence/forensic-hub',         roles: ['ADMIN', 'WORKSPACE_OWNER', 'AUDITOR', 'COMPLIANCE_REVIEWER', 'SECURITY_ADMIN', 'SUPERADMIN'],                                                           plan: 'forensic_hub' },
  { prefix: '/evidence/evidence-vault',       roles: ['ADMIN', 'WORKSPACE_OWNER', 'AUDITOR', 'COMPLIANCE_REVIEWER', 'SUPERADMIN'],                                                                                plan: 'evidence_vault' },
  { prefix: '/evidence/identity-ledger',      roles: ['ADMIN', 'WORKSPACE_OWNER', 'AUDITOR', 'COMPLIANCE_REVIEWER', 'SECURITY_ADMIN', 'SUPERADMIN'],                                                              plan: 'identity_ledger' },
  { prefix: '/evidence',                      roles: ['ADMIN', 'WORKSPACE_OWNER', 'AUDITOR', 'COMPLIANCE_REVIEWER', 'SUPERADMIN'],                                                                                plan: 'evidence_vault' },

  // ── Safety Layer / Governance ─────────────────────────────────────────────
  { prefix: '/governance/brand-library',      roles: ['GOVERNANCE_ADMIN', 'ADMIN', 'WORKSPACE_OWNER', 'SUPERADMIN'],                                                                                          plan: 'brand_standards' },
  { prefix: '/governance/safety',             roles: ['ADMIN', 'WORKSPACE_OWNER', 'BRAND_REVIEWER', 'COMPLIANCE_REVIEWER', 'SECURITY_ADMIN', 'SUPERADMIN'],                                                        plan: 'governance' },
  { prefix: '/governance/reviews',            roles: ['ADMIN', 'WORKSPACE_OWNER', 'APPROVER', 'COMPLIANCE_REVIEWER', 'SUPERADMIN'],                                                                                plan: 'governance' },
  { prefix: '/governance/rules',              roles: ['ADMIN', 'WORKSPACE_OWNER', 'GOVERNANCE_ADMIN', 'SUPERADMIN'],                                                                                                plan: 'governance' },
  { prefix: '/governance/legal',              roles: ['GOVERNANCE_ADMIN', 'ADMIN', 'WORKSPACE_OWNER', 'COMPLIANCE_REVIEWER', 'AUDITOR', 'SUPERADMIN'],                                                              plan: 'legal_holds' },
  { prefix: '/governance/forensic',           roles: ['GOVERNANCE_ADMIN', 'ADMIN', 'WORKSPACE_OWNER', 'COMPLIANCE_REVIEWER', 'AUDITOR', 'SECURITY_ADMIN', 'SUPERADMIN'],                                           plan: 'forensic_hub' },
  { prefix: '/governance',                    roles: ['GOVERNANCE_ADMIN', 'ADMIN', 'WORKSPACE_OWNER', 'COMPLIANCE_REVIEWER', 'AUDITOR', 'SUPERADMIN'], plan: 'governance' },

  // ── Admin / Crisis ────────────────────────────────────────────────────────
  { prefix: '/admin/crisis',                  roles: ['GOVERNANCE_ADMIN', 'ADMIN', 'WORKSPACE_OWNER', 'SUPERADMIN'],                                                                                          plan: 'crisis_console' },

  // ── Accountability Layer ──────────────────────────────────────────────────
  { prefix: '/review-queue',                  roles: ['ADMIN', 'WORKSPACE_OWNER', 'MANAGER', 'REVIEWER', 'VALIDATOR', 'APPROVER', 'BRAND_REVIEWER', 'COMPLIANCE_REVIEWER', 'SUPERADMIN'],                         plan: 'review_queue' },
  { prefix: '/validation',                    roles: ['ADMIN', 'WORKSPACE_OWNER', 'VALIDATOR', 'APPROVER', 'SUPERADMIN'],                                                                                          plan: 'review_queue' },

  // ── Authority Layer / Agents ──────────────────────────────────────────────
  // Specific sub-page rules must come BEFORE the /agents catch-all (longest prefix wins)
  { prefix: '/agents/studio',                 roles: ['AGENT_ARCHITECT', 'KNOWLEDGE_MANAGER', 'ADMIN', 'WORKSPACE_OWNER', 'SUPERADMIN'],                                                                         plan: 'agents' },
  { prefix: '/agents/operations',             roles: ['AGENT_OPERATOR', 'ADMIN', 'WORKSPACE_OWNER', 'SUPERADMIN'],                                                                                               plan: 'agents' },
  { prefix: '/agents/workflows',              roles: ['AGENT_ARCHITECT', 'ADMIN', 'WORKSPACE_OWNER', 'GOVERNANCE_ADMIN', 'SUPERADMIN'],                                                                          plan: 'agents' },
  { prefix: '/agents/prompts',                roles: ['AGENT_ARCHITECT', 'ADMIN', 'WORKSPACE_OWNER', 'GOVERNANCE_ADMIN', 'SUPERADMIN'],                                                                          plan: 'agents' },
  { prefix: '/agents/knowledge',              roles: ['KNOWLEDGE_MANAGER', 'ADMIN', 'WORKSPACE_OWNER', 'GOVERNANCE_ADMIN', 'SUPERADMIN'],                                                                        plan: 'agents' },
  { prefix: '/agents/autonomy',               roles: ['AGENT_ARCHITECT', 'ADMIN', 'WORKSPACE_OWNER', 'SUPERADMIN'],                                                                                              plan: 'agents' },
  { prefix: '/agents',                        roles: ['AGENT_ARCHITECT', 'AGENT_OPERATOR', 'ADMIN', 'WORKSPACE_OWNER', 'GOVERNANCE_ADMIN', 'SUPERADMIN'],                                                        plan: 'agents' },

  // ── Media Engine ──────────────────────────────────────────────────────────
  { prefix: '/campaigns',                     roles: ['ADMIN', 'WORKSPACE_OWNER', 'CAMPAIGN_MANAGER', 'MANAGER', 'CREATOR', 'PUBLISHER', 'ANALYST', 'VIEWER', 'SUPERADMIN'],            plan: 'campaigns' },
  { prefix: '/calendar',                      roles: ['ADMIN', 'WORKSPACE_OWNER', 'CAMPAIGN_MANAGER', 'MANAGER', 'CREATOR', 'PUBLISHER', 'VIEWER', 'SUPERADMIN'],                                               plan: 'calendar' },
  { prefix: '/inbox',                         roles: ['ADMIN', 'WORKSPACE_OWNER', 'PUBLISHER', 'SUPERADMIN'],                                                                                                      plan: 'inbox' },
  { prefix: '/publish',                       roles: ['PUBLISHER', 'CAMPAIGN_MANAGER', 'CREATOR', 'ADMIN', 'WORKSPACE_OWNER', 'SUPERADMIN'],                                                                       plan: 'publishing' },
  { prefix: '/drafts',                        roles: ['ADMIN', 'WORKSPACE_OWNER', 'PUBLISHER', 'CAMPAIGN_MANAGER', 'CREATOR', 'SUPERADMIN'] },
  { prefix: '/returned',                      roles: ['ADMIN', 'WORKSPACE_OWNER', 'CREATOR', 'PUBLISHER', 'CAMPAIGN_MANAGER', 'SUPERADMIN'] },
  { prefix: '/library/upload',                roles: ['CREATOR', 'CAMPAIGN_MANAGER', 'ADMIN', 'WORKSPACE_OWNER', 'SUPERADMIN'] },
  { prefix: '/library',                       roles: ['ADMIN', 'WORKSPACE_OWNER', 'CAMPAIGN_MANAGER', 'MANAGER', 'CREATOR', 'PUBLISHER', 'REVIEWER', 'AUDITOR', 'VIEWER', 'SUPERADMIN'] },

  // ── Command ───────────────────────────────────────────────────────────────
  { prefix: '/operations',                    roles: ['ADMIN', 'WORKSPACE_OWNER', 'GOVERNANCE_ADMIN', 'AGENT_ARCHITECT', 'CAMPAIGN_MANAGER', 'PUBLISHER', 'SUPERADMIN'] },
  { prefix: '/analytics',                     roles: ['ADMIN', 'WORKSPACE_OWNER', 'CAMPAIGN_MANAGER', 'AUDITOR', 'COMPLIANCE_REVIEWER', 'PUBLISHER', 'SUPERADMIN'] },
  { prefix: '/linkedin',                      roles: ['ADMIN', 'WORKSPACE_OWNER', 'PUBLISHER', 'CAMPAIGN_MANAGER', 'CREATOR', 'SUPERADMIN'] },

  // ── Support (open to all authenticated) ───────────────────────────────────
  // /support is intentionally NOT listed — falls through to "open to all"
];

export type AccessResult =
  | { allowed: true }
  | { allowed: false; reason: 'role' }
  | { allowed: false; reason: 'plan'; requiredPlan: Plan; feature: Feature };

export function canAccess(
  pathname: string,
  role: string | null,
  isSuperAdmin: boolean,
  planType?: string | null,
): AccessResult {
  if (isSuperAdmin) return { allowed: true };
  if (!role) return { allowed: false, reason: 'role' };

  const upper = role.toUpperCase();

  const match = ROUTE_RULES
    .filter(r => pathname === r.prefix || pathname.startsWith(r.prefix + '/'))
    .sort((a, b) => b.prefix.length - a.prefix.length)[0];

  if (!match) return { allowed: true };

  if (!match.roles.includes(upper)) return { allowed: false, reason: 'role' };

  if (match.plan) {
    const plan = normalisePlan(planType);
    const minPlan = FEATURE_MIN_PLAN[match.plan];
    if (PLAN_RANK[plan] < PLAN_RANK[minPlan]) {
      return { allowed: false, reason: 'plan', requiredPlan: minPlan, feature: match.plan };
    }
  }

  return { allowed: true };
}

// ponytail: `canAccessSimple` was dead code (zero consumers), removed.
