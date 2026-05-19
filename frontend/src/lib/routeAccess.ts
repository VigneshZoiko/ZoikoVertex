// Single source of truth for role-based route access.
// Entries are matched longest-prefix-first so /library/upload
// can be more restrictive than /library.
// Routes NOT listed here are open to ALL authenticated users.

interface RouteRule {
  prefix: string;
  roles: string[];
}

export const ROUTE_RULES: RouteRule[] = [
  { prefix: '/superadmin',     roles: ['SUPERADMIN'] },
  { prefix: '/admin',          roles: ['ADMIN', 'WORKSPACE_OWNER', 'SECURITY_ADMIN', 'PRIVACY_ADMIN', 'SUPERADMIN'] },
  { prefix: '/access',         roles: ['ADMIN', 'WORKSPACE_OWNER', 'SECURITY_ADMIN', 'SUPERADMIN'] },
  { prefix: '/team',           roles: ['ADMIN', 'WORKSPACE_OWNER', 'SECURITY_ADMIN', 'SUPERADMIN'] },
  { prefix: '/agents',         roles: ['AGENT_ARCHITECT', 'AGENT_OPERATOR', 'ADMIN', 'WORKSPACE_OWNER', 'GOVERNANCE_ADMIN', 'SUPERADMIN'] },
  { prefix: '/governance',     roles: ['GOVERNANCE_ADMIN', 'ADMIN', 'WORKSPACE_OWNER', 'COMPLIANCE_REVIEWER', 'AUDITOR', 'REVIEWER', 'VALIDATOR', 'APPROVER', 'BRAND_REVIEWER', 'SECURITY_ADMIN', 'SUPERADMIN'] },
  { prefix: '/accounts',       roles: ['ADMIN', 'WORKSPACE_OWNER', 'DEVELOPER', 'PUBLISHER', 'CAMPAIGN_MANAGER', 'SUPERADMIN'] },
  { prefix: '/library/upload', roles: ['CREATOR', 'CAMPAIGN_MANAGER', 'ADMIN', 'WORKSPACE_OWNER', 'SUPERADMIN'] },
  { prefix: '/publish',        roles: ['PUBLISHER', 'CAMPAIGN_MANAGER', 'CREATOR', 'ADMIN', 'WORKSPACE_OWNER', 'SUPERADMIN'] },
];

export function canAccess(
  pathname: string,
  role: string | null,
  isSuperAdmin: boolean,
): boolean {
  if (isSuperAdmin) return true;
  if (!role) return false;

  const upper = role.toUpperCase();

  // Longest matching prefix wins (most specific rule takes priority)
  const match = ROUTE_RULES
    .filter(r => pathname === r.prefix || pathname.startsWith(r.prefix + '/'))
    .sort((a, b) => b.prefix.length - a.prefix.length)[0];

  if (!match) return true; // no rule → open to all authenticated users
  return match.roles.includes(upper);
}
