export interface BindingViolation {
  binding_id: string;
  type: string;
  detail: string;
}

export interface BindingPolicyEvaluation {
  violations: BindingViolation[];
  allowed_bindings: number;
  blocked_bindings: number;
}

export class PromptBindingPolicyService {
  static evaluateBindings(
    bindings: any[],
    allowedEnvironments?: string[],
    maxBindings?: number,
  ): BindingPolicyEvaluation {
    const violations: BindingViolation[] = [];
    let allowed = 0;
    let blocked = 0;

    for (const b of bindings || []) {
      let bindingOk = true;

      if (allowedEnvironments && allowedEnvironments.length > 0) {
        const env = String(b.environment || '').toLowerCase();
        if (!allowedEnvironments.some((e) => e.toLowerCase() === env)) {
          violations.push({
            binding_id: b.id,
            type: 'disallowed_environment',
            detail: `Binding ${b.id} targets environment '${env}' which is not in the allowed list.`,
          });
          bindingOk = false;
        }
      }

      if (bindingOk) allowed++;
      else blocked++;
    }

    if (maxBindings != null && bindings.length > maxBindings) {
      violations.push({
        binding_id: '__total__',
        type: 'max_bindings_exceeded',
        detail: `Total bindings (${bindings.length}) exceed the maximum allowed (${maxBindings}).`,
      });
    }

    return { violations, allowed_bindings: allowed, blocked_bindings: blocked };
  }
}
