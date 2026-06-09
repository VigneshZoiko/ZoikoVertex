import { PromptAuditService } from './PromptAuditService';

export type ParameterPolicyType = 'allow' | 'block' | 'transform' | 'escalate';

export interface ParameterPolicy {
  id: string;
  name: string;
  policyType: ParameterPolicyType;
  parameterPattern: string;
  conditions?: {
    allowedValues?: unknown[];
    blockedValues?: unknown[];
    maxLength?: number;
    minLength?: number;
    allowedPattern?: string;
    blockedPattern?: string;
  };
  escalationRole?: string;
  enabled: boolean;
  applicableTiers: string[];
}

export interface ParameterPolicyResult {
  policy: ParameterPolicy;
  applied: boolean;
  action: 'allowed' | 'blocked' | 'transformed' | 'escalated';
  reason: string;
}

const BUILT_IN_POLICIES: ParameterPolicy[] = [
  {
    id: 'param-url-1', name: 'URL Parameter Safety', policyType: 'allow', parameterPattern: 'url|link|href|redirect',
    conditions: { allowedPattern: '^https?://', maxLength: 2048, blockedPattern: 'javascript:|data:|vbscript:' },
    enabled: true, applicableTiers: ['tier_2_medium', 'tier_3_high', 'tier_4_critical'],
  },
  {
    id: 'param-html-1', name: 'HTML Content Block', policyType: 'block', parameterPattern: 'html|markup|content_body',
    conditions: { blockedPattern: '<script|<iframe|<embed|<object' },
    enabled: true, applicableTiers: ['tier_3_high', 'tier_4_critical'],
  },
  {
    id: 'param-pii-1', name: 'PII Parameter Guard', policyType: 'block', parameterPattern: 'ssn|social_security|credit_card|phone_number',
    conditions: { allowedPattern: 'REDACTED|\\*{3,}' },
    escalationRole: 'GOVERNANCE_ADMIN', enabled: true, applicableTiers: ['tier_3_high', 'tier_4_critical'],
  },
  {
    id: 'param-exec-1', name: 'Execution Command Guard', policyType: 'block', parameterPattern: 'command|exec|shell|system_cmd',
    conditions: { blockedPattern: 'rm|del|format|shutdown|mkfs|dd' },
    enabled: true, applicableTiers: ['tier_4_critical'],
  },
  {
    id: 'param-auth-1', name: 'Authentication Token Guard', policyType: 'block', parameterPattern: 'token|api_key|secret|password|credential',
    conditions: { allowedPattern: '^\\*{3,}$|^$' },
    escalationRole: 'SECURITY_ADMIN', enabled: true, applicableTiers: ['tier_2_medium', 'tier_3_high', 'tier_4_critical'],
  },
];

export class ParameterPolicyService {
  static getBuiltInPolicies(): ParameterPolicy[] {
    return BUILT_IN_POLICIES;
  }

  static async evaluateParameter(
    parameterName: string,
    value: unknown,
    riskTier: string,
  ): Promise<ParameterPolicyResult[]> {
    const results: ParameterPolicyResult[] = [];
    const strValue = String(value ?? '');

    for (const policy of BUILT_IN_POLICIES) {
      if (!policy.enabled) continue;
      if (!policy.applicableTiers.includes(riskTier)) continue;

      const matchesParam = new RegExp(policy.parameterPattern, 'i').test(parameterName);
      if (!matchesParam) continue;

      if (policy.policyType === 'block') {
        if (policy.conditions?.blockedPattern && new RegExp(policy.conditions.blockedPattern, 'i').test(strValue)) {
          results.push({ policy, applied: true, action: 'blocked', reason: `Parameter ${parameterName} contains blocked pattern` });
          continue;
        }
        if (policy.conditions?.allowedPattern && !new RegExp(policy.conditions.allowedPattern).test(strValue)) {
          results.push({ policy, applied: true, action: 'blocked', reason: `Parameter ${parameterName} does not match allowed pattern` });
          continue;
        }
      }

      if (policy.conditions?.maxLength && strValue.length > policy.conditions.maxLength) {
        if (policy.policyType === 'block') {
          results.push({ policy, applied: true, action: 'blocked', reason: `Parameter ${parameterName} exceeds max length ${policy.conditions.maxLength}` });
          continue;
        }
      }

      results.push({ policy, applied: true, action: 'allowed', reason: `Parameter ${parameterName} passed policy checks` });
    }

    if (results.length === 0) {
      results.push({
        policy: { id: 'default-allow', name: 'Default Allow', policyType: 'allow', parameterPattern: '.*', enabled: true, applicableTiers: [] },
        applied: true, action: 'allowed', reason: 'No matching policies for this parameter',
      });
    }

    return results;
  }

  static async evaluateParameters(
    parameters: Record<string, unknown>,
    riskTier: string,
    promptVersionId?: string,
  ): Promise<{ allowed: boolean; results: ParameterPolicyResult[]; blockedParams: string[] }> {
    const allResults: ParameterPolicyResult[] = [];
    const blockedParams: string[] = [];

    for (const [name, value] of Object.entries(parameters)) {
      const results = await this.evaluateParameter(name, value, riskTier);
      allResults.push(...results);
      const hasBlock = results.some((r) => r.action === 'blocked');
      if (hasBlock) blockedParams.push(name);
    }

    const allowed = blockedParams.length === 0;

    if (!allowed && promptVersionId) {
      await PromptAuditService.record({
        event_type: 'prompt.parameter.policy_blocked',
        version_id: promptVersionId,
        risk_level: riskTier,
        reason: `Parameter policy blocked: ${blockedParams.join(', ')}`,
        after_state: { blocked_params: blockedParams, result_count: allResults.length },
      });
    }

    return { allowed, results: allResults, blockedParams };
  }
}
