/**
 * Advanced Approval Engine for ZoikoVertex
 * 
 * Determines granular approval paths based on Brand, Market, Region, Platform, Risk, and Role.
 */

export interface ApprovalRule {
  id: string;
  name: string;
  conditions: {
    brand?: string;
    market?: string;
    region?: string;
    content_type?: string;
    platform?: string;
    risk_level?: string;
    department?: string;
    role?: string;
    campaign_category?: string;
  };
  approval_path: string[]; // Ordered list of required roles
}

const DEFAULT_RULES: ApprovalRule[] = [
  {
    id: 'rule-high-risk-global',
    name: 'High Risk Global Policy',
    conditions: { risk_level: 'HIGH' },
    approval_path: ['MANAGER', 'ADMIN', 'LEGAL_REVIEWER']
  },
  {
    id: 'rule-eu-compliance',
    name: 'EU Regional Compliance',
    conditions: { region: 'EU' },
    approval_path: ['MANAGER', 'COMPLIANCE_OFFICER']
  },
  {
    id: 'rule-financial-twitter',
    name: 'Twitter Financial Disclosure',
    conditions: { platform: 'twitter', campaign_category: 'FINANCIAL' },
    approval_path: ['FINANCIAL_VALIDATOR', 'ADMIN']
  },
  {
    id: 'rule-standard-flow',
    name: 'Standard Approval Flow',
    conditions: {},
    approval_path: ['MANAGER']
  }
];

export class ApprovalEngine {
  /**
   * Determine the required approval path for a given content intent
   */
  static getApprovalPath(intentData: Record<string, string | undefined>): string[] {
    // 1. Filter rules that match the intent conditions
    const matchingRules = DEFAULT_RULES.filter(rule => {
      return Object.entries(rule.conditions).every(([key, value]) => {
        return intentData[key] === value;
      });
    });

    // 2. Sort by specificity (more conditions = more specific)
    matchingRules.sort((a, b) => {
      return Object.keys(b.conditions).length - Object.keys(a.conditions).length;
    });

    // 3. Take the most specific rule's path
    if (matchingRules.length > 0) {
      return matchingRules[0].approval_path;
    }

    return ['MANAGER']; // Fallback
  }

  /**
   * Check if a user can approve for a specific step in the path
   */
  static canUserApprove(userRole: string, requiredRole: string, isSuperAdmin: boolean = false): boolean {
    if (isSuperAdmin) return true;
    if (userRole === 'ADMIN') return true; // Admins can approve anything within workspace
    return userRole === requiredRole;
  }
}
