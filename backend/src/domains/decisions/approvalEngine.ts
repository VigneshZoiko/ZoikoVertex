import { supabaseAdmin } from '../../shared/supabase';

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
  approval_path: string[];
}

interface CacheEntry {
  rules: ApprovalRule[];
  timestamp: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000;
const ruleCache = new Map<string, CacheEntry>();

export class ApprovalEngine {
  private static async loadRules(tenantId: string): Promise<ApprovalRule[]> {
    const cached = ruleCache.get(tenantId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.rules;
    }

    const { data: rules, error } = await supabaseAdmin
      .from('approval_rules')
      .select(`
        id,
        rule_name,
        rule_priority,
        risk_classification,
        json_config,
        approval_rule_scopes (
          brand_id,
          campaign_id,
          source_module,
          item_type,
          platform,
          jurisdiction,
          department_id,
          user_role,
          restricted_mode_status
        ),
        approval_rule_paths (
          id,
          path_type,
          approval_rule_stages (
            stage_order,
            approver_role
          )
        )
      `)
      .eq('tenant_id', tenantId)
      .eq('rule_status', 'ACTIVE')
      .order('rule_priority', { ascending: true });

    if (error) {
      console.error('[ApprovalEngine] Failed to load rules:', error);
      return [];
    }

    const result: ApprovalRule[] = (rules || []).map((rule: any) => {
      const conditions: ApprovalRule['conditions'] = {};
      const scope = rule.approval_rule_scopes?.[0];

      if (scope) {
        if (scope.brand_id) conditions.brand = scope.brand_id;
        if (scope.campaign_id) conditions.campaign_category = scope.campaign_id;
        if (scope.source_module) conditions.content_type = scope.source_module;
        if (scope.item_type) conditions.content_type = scope.item_type;
        if (scope.platform) conditions.platform = scope.platform;
        if (scope.jurisdiction) {
          conditions.market = scope.jurisdiction;
          conditions.region = scope.jurisdiction;
        }
        if (scope.department_id) conditions.department = scope.department_id;
        if (scope.user_role) conditions.role = scope.user_role;
        if (scope.restricted_mode_status) conditions.risk_level = 'RESTRICTED';
      }

      if (rule.risk_classification && !conditions.risk_level) {
        conditions.risk_level = rule.risk_classification;
      }

      if (rule.json_config?.conditions) {
        Object.assign(conditions, rule.json_config.conditions);
      }

      const pathRules = rule.approval_rule_paths?.[0];
      const stages = pathRules?.approval_rule_stages || [];
      const approval_path = (stages as any[])
        .sort((a: any, b: any) => a.stage_order - b.stage_order)
        .map((s: any) => s.approver_role)
        .filter(Boolean);

      return {
        id: rule.id,
        name: rule.rule_name || 'Untitled Rule',
        conditions,
        approval_path: approval_path.length > 0 ? approval_path : ['MANAGER'],
      };
    });

    ruleCache.set(tenantId, { rules: result, timestamp: Date.now() });
    return result;
  }

  static async getApprovalPath(
    intentData: Record<string, string | undefined>,
    tenantId?: string,
  ): Promise<string[]> {
    let rules: ApprovalRule[] = [];

    if (tenantId) {
      rules = await this.loadRules(tenantId);
    }

    if (rules.length === 0) {
      return this.fallbackPath(intentData);
    }

    const matchingRules = rules.filter(rule => {
      return Object.entries(rule.conditions).every(([key, value]) => {
        return intentData[key] === value;
      });
    });

    matchingRules.sort((a, b) => {
      const aConditions = Object.keys(a.conditions).length;
      const bConditions = Object.keys(b.conditions).length;
      if (aConditions !== bConditions) return bConditions - aConditions;

      const aRisk = this.riskPriority(a.conditions.risk_level);
      const bRisk = this.riskPriority(b.conditions.risk_level);
      return bRisk - aRisk;
    });

    if (matchingRules.length > 0) {
      return matchingRules[0].approval_path;
    }

    return this.fallbackPath(intentData);
  }

  private static riskPriority(riskLevel?: string): number {
    switch (riskLevel?.toUpperCase()) {
      case 'RESTRICTED': return 100;
      case 'CRITICAL':   return 90;
      case 'HIGH':       return 80;
      case 'MEDIUM':     return 50;
      case 'LOW':        return 10;
      default:           return 0;
    }
  }

  private static fallbackPath(intentData: Record<string, string | undefined>): string[] {
    if (intentData.risk_level === 'HIGH' || intentData.risk_level === 'CRITICAL') {
      return ['MANAGER', 'ADMIN', 'LEGAL_REVIEWER'];
    }
    if (intentData.region === 'EU') {
      return ['MANAGER', 'COMPLIANCE_OFFICER'];
    }
    if (intentData.platform === 'twitter' && intentData.campaign_category === 'FINANCIAL') {
      return ['FINANCIAL_VALIDATOR', 'ADMIN'];
    }
    return ['MANAGER'];
  }

  static canUserApprove(userRole: string, requiredRole: string, isSuperAdmin: boolean = false): boolean {
    if (isSuperAdmin) return true;
    if (userRole === 'ADMIN') return true;
    return userRole === requiredRole;
  }
}
