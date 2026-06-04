export class PromptApprovalPolicyService {
  static requiredApprovalRoles(riskTier: string): string[] {
    const risk = String(riskTier || '').toLowerCase();
    if (risk === 'tier_4_critical') return ['PROMPT_OWNER', 'COMPLIANCE_REVIEWER', 'SECURITY_ADMIN'];
    if (risk === 'tier_3_high') return ['PROMPT_OWNER', 'BRAND_REVIEWER', 'COMPLIANCE_REVIEWER'];
    if (risk === 'tier_2_medium') return ['PROMPT_OWNER', 'BRAND_REVIEWER'];
    return ['PROMPT_OWNER'];
  }

  static canRoleSatisfy(requiredRole: string, reviewerRole: string): boolean {
    // PROMPT_OWNER is always satisfied by the prompt owner's approval
    if (requiredRole === 'PROMPT_OWNER') return true;
    // Exact match or GOVERNANCE_ADMIN can satisfy BRAND_REVIEWER
    return reviewerRole === requiredRole || (requiredRole === 'BRAND_REVIEWER' && reviewerRole === 'GOVERNANCE_ADMIN');
  }

  static normalizeReviewerRole(role: string | null | undefined): string {
    return String(role || 'PROMPT_OWNER').toUpperCase().replace(/\s+/g, '_');
  }

  static computeRequiredRoles(riskTier: string, hypotheticalMapping: Record<string, string[]>): string[] {
    for (const [tier, roles] of Object.entries(hypotheticalMapping)) {
      if (tier.toLowerCase() === String(riskTier || '').toLowerCase()) return roles;
    }
    return this.requiredApprovalRoles(riskTier);
  }
}
