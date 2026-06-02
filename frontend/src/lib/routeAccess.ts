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
  // Platform owner
  { prefix: '/superadmin', roles: ['SUPERADMIN'] },

  // Admin / system
  { prefix: '/admin/billing', roles: ['WORKSPACE_OWNER', 'SUPERADMIN'] },
  { prefix: '/admin/security', roles: ['ADMIN', 'WORKSPACE_OWNER', 'SECURITY_ADMIN', 'SUPERADMIN'] },
  { prefix: '/admin/privacy', roles: ['ADMIN', 'WORKSPACE_OWNER', 'PRIVACY_ADMIN', 'SUPERADMIN'] },
  { prefix: '/admin/status', roles: ['ADMIN', 'WORKSPACE_OWNER', 'DEVELOPER', 'SUPERADMIN'] },
  { prefix: '/admin/notifications', roles: ['ADMIN', 'WORKSPACE_OWNER', 'GOVERNANCE_ADMIN', 'AGENT_ARCHITECT', 'AGENT_OPERATOR', 'KNOWLEDGE_MANAGER', 'CAMPAIGN_MANAGER', 'CREATOR', 'REVIEWER', 'VALIDATOR', 'APPROVER', 'PUBLISHER', 'COMPLIANCE_REVIEWER', 'AUDITOR', 'ANALYST', 'SECURITY_ADMIN', 'PRIVACY_ADMIN', 'BRAND_REVIEWER', 'DEVELOPER', 'EXTERNAL_COLLABORATOR', 'VIEWER', 'SUPERADMIN'] },
  { prefix: '/admin', roles: ['ADMIN', 'WORKSPACE_OWNER', 'SECURITY_ADMIN', 'PRIVACY_ADMIN', 'SUPERADMIN'] },

  // Access control
  { prefix: '/access', roles: ['ADMIN', 'WORKSPACE_OWNER', 'SECURITY_ADMIN', 'SUPERADMIN'] },
  { prefix: '/team', roles: ['ADMIN', 'WORKSPACE_OWNER', 'SECURITY_ADMIN', 'SUPERADMIN'] },

  // Infrastructure / integrations
  { prefix: '/integrations/api', roles: ['ADMIN', 'WORKSPACE_OWNER', 'DEVELOPER', 'SUPERADMIN'], plan: 'api_webhooks' },
  { prefix: '/integrations/data', roles: ['ADMIN', 'WORKSPACE_OWNER', 'DEVELOPER', 'SUPERADMIN'], plan: 'data_connectors' },
  { prefix: '/integrations/identity-ledger', roles: ['ADMIN', 'WORKSPACE_OWNER', 'DEVELOPER', 'AUDITOR', 'SUPERADMIN'], plan: 'identity_ledger' },
  { prefix: '/integrations/health', roles: ['ADMIN', 'WORKSPACE_OWNER', 'DEVELOPER', 'SUPERADMIN'] },
  { prefix: '/accounts', roles: ['ADMIN', 'WORKSPACE_OWNER', 'DEVELOPER', 'PUBLISHER', 'CAMPAIGN_MANAGER', 'SUPERADMIN'] },
  { prefix: '/resources', roles: ['ADMIN', 'WORKSPACE_OWNER', 'DEVELOPER', 'SUPERADMIN'] },

  // Evidence layer
  { prefix: '/evidence/audit-trail', roles: ['ADMIN', 'WORKSPACE_OWNER', 'GOVERNANCE_ADMIN', 'AUDITOR', 'COMPLIANCE_REVIEWER', 'VALIDATOR', 'SUPERADMIN'], plan: 'audit_trail' },
  { prefix: '/evidence/forensic-hub', roles: ['ADMIN', 'WORKSPACE_OWNER', 'GOVERNANCE_ADMIN', 'AUDITOR', 'COMPLIANCE_REVIEWER', 'SECURITY_ADMIN', 'SUPERADMIN'], plan: 'forensic_hub' },
  { prefix: '/evidence/evidence-vault', roles: ['ADMIN', 'WORKSPACE_OWNER', 'GOVERNANCE_ADMIN', 'AUDITOR', 'COMPLIANCE_REVIEWER', 'SUPERADMIN'], plan: 'evidence_vault' },
  { prefix: '/evidence', roles: ['ADMIN', 'WORKSPACE_OWNER', 'GOVERNANCE_ADMIN', 'AUDITOR', 'COMPLIANCE_REVIEWER', 'SUPERADMIN'], plan: 'evidence_vault' },

  // Safety layer / governance
  { prefix: '/governance/brand-library', roles: ['GOVERNANCE_ADMIN', 'ADMIN', 'WORKSPACE_OWNER', 'BRAND_REVIEWER', 'SUPERADMIN'], plan: 'brand_standards' },
  { prefix: '/governance/legal', roles: ['GOVERNANCE_ADMIN', 'ADMIN', 'WORKSPACE_OWNER', 'COMPLIANCE_REVIEWER', 'AUDITOR', 'SUPERADMIN'], plan: 'legal_holds' },
  { prefix: '/governance/forensic', roles: ['GOVERNANCE_ADMIN', 'ADMIN', 'WORKSPACE_OWNER', 'COMPLIANCE_REVIEWER', 'AUDITOR', 'SECURITY_ADMIN', 'SUPERADMIN'], plan: 'forensic_hub' },
  { prefix: '/governance', roles: ['GOVERNANCE_ADMIN', 'ADMIN', 'WORKSPACE_OWNER', 'COMPLIANCE_REVIEWER', 'AUDITOR', 'REVIEWER', 'VALIDATOR', 'APPROVER', 'BRAND_REVIEWER', 'SECURITY_ADMIN', 'SUPERADMIN'], plan: 'governance' },
  { prefix: '/admin/crisis', roles: ['GOVERNANCE_ADMIN', 'ADMIN', 'WORKSPACE_OWNER', 'SECURITY_ADMIN', 'SUPERADMIN'], plan: 'crisis_console' },

  // Accountability layer
  { prefix: '/queue', roles: ['ADMIN', 'WORKSPACE_OWNER', 'GOVERNANCE_ADMIN', 'REVIEWER', 'VALIDATOR', 'APPROVER', 'BRAND_REVIEWER', 'CAMPAIGN_MANAGER', 'COMPLIANCE_REVIEWER', 'SUPERADMIN'], plan: 'review_queue' },
  { prefix: '/validation', roles: ['ADMIN', 'WORKSPACE_OWNER', 'GOVERNANCE_ADMIN', 'VALIDATOR', 'APPROVER', 'COMPLIANCE_REVIEWER', 'SUPERADMIN'], plan: 'review_queue' },
  { prefix: '/exceptions', roles: ['ADMIN', 'WORKSPACE_OWNER', 'GOVERNANCE_ADMIN', 'SUPERADMIN'], plan: 'approvals' },

  // Authority layer / agents
  { prefix: '/agents/operations', roles: ['ADMIN', 'WORKSPACE_OWNER', 'GOVERNANCE_ADMIN', 'AGENT_OPERATOR', 'CAMPAIGN_MANAGER', 'REVIEWER', 'VALIDATOR', 'APPROVER', 'COMPLIANCE_REVIEWER', 'AUDITOR', 'SECURITY_ADMIN', 'BRAND_REVIEWER', 'VIEWER', 'SUPERADMIN'] },
  { prefix: '/agents', roles: ['AGENT_ARCHITECT', 'AGENT_OPERATOR', 'ADMIN', 'WORKSPACE_OWNER', 'GOVERNANCE_ADMIN', 'KNOWLEDGE_MANAGER', 'SUPERADMIN'], plan: 'agents' },

  // Media engine
  { prefix: '/campaigns', roles: ['ADMIN', 'WORKSPACE_OWNER', 'CAMPAIGN_MANAGER', 'CREATOR', 'PUBLISHER', 'REVIEWER', 'VIEWER', 'EXTERNAL_COLLABORATOR', 'SUPERADMIN'], plan: 'campaigns' },
  { prefix: '/calendar', roles: ['ADMIN', 'WORKSPACE_OWNER', 'CAMPAIGN_MANAGER', 'CREATOR', 'PUBLISHER', 'VIEWER', 'SUPERADMIN'], plan: 'calendar' },
  { prefix: '/inbox', roles: ['ADMIN', 'WORKSPACE_OWNER', 'AGENT_OPERATOR', 'CAMPAIGN_MANAGER', 'PUBLISHER', 'GOVERNANCE_ADMIN', 'SUPERADMIN'], plan: 'inbox' },
  { prefix: '/publish', roles: ['PUBLISHER', 'CAMPAIGN_MANAGER', 'CREATOR', 'ADMIN', 'WORKSPACE_OWNER', 'SUPERADMIN'], plan: 'publishing' },
  { prefix: '/library/upload', roles: ['CREATOR', 'CAMPAIGN_MANAGER', 'ADMIN', 'WORKSPACE_OWNER', 'SUPERADMIN'] },

  // Command
  { prefix: '/operations', roles: ['ADMIN', 'WORKSPACE_OWNER', 'GOVERNANCE_ADMIN', 'AGENT_ARCHITECT', 'AGENT_OPERATOR', 'CAMPAIGN_MANAGER', 'PUBLISHER', 'SUPERADMIN'] },
  { prefix: '/analytics', roles: ['ADMIN', 'WORKSPACE_OWNER', 'CAMPAIGN_MANAGER', 'AUDITOR', 'COMPLIANCE_REVIEWER', 'PUBLISHER', 'SUPERADMIN'] },

  // Support is intentionally not listed; it falls through to "open to all".
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

export function canAccessSimple(
  pathname: string,
  role: string | null,
  isSuperAdmin: boolean,
  planType?: string | null,
): boolean {
  return canAccess(pathname, role, isSuperAdmin, planType).allowed;
}
