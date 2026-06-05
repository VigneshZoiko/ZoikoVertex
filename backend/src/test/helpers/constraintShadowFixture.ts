// ─────────────────────────────────────────────────────────────────────────────
// Test helper: build a GOVERNANCE-VALID locked Constraint Shadow fixture row.
//
// The row is valid the same way a real locked shadow is — it is NOT a bypass:
//   • compiled_shadow = the canonical rule set for the risk tier
//   • shadow_hash      = ConstraintShadowService.computeShadowHash(compiled_shadow)
//                        (the exact production hash → verifyIntegrity() passes)
//   • status = 'locked' → isLocked() passes
//   • rules == getRulesForTier(tier) → isStale() returns false
//
// So DeploymentGateService Gate 8 and RuntimeVariableGovernanceService pass
// because the shadow is genuinely compiled, locked, hash-intact, and current —
// exactly the conditions enforcement requires. Changing the tier, tampering with
// compiled_shadow, or setting status:'compiled' will (correctly) fail the gate.
// ─────────────────────────────────────────────────────────────────────────────

import { ConstraintShadowService } from '../../modules/prompts/ConstraintShadowService';

export interface LockedShadowFixtureOptions {
  versionId: string;
  promptId?: string;
  workspaceId?: string;
  riskTier?: string;
  id?: string;
  lockedBy?: string;
  lockedAt?: string;
  createdAt?: string;
}

export function lockedShadowFixture(opts: LockedShadowFixtureOptions) {
  const riskTier = opts.riskTier || 'tier_2_medium';
  const rules = ConstraintShadowService.getRulesForTier(riskTier);
  const compiled_shadow = { risk_tier: riskTier, rules };
  const shadow_hash = ConstraintShadowService.computeShadowHash(compiled_shadow);
  const ts = opts.createdAt || '2025-01-01T00:00:00Z';
  return {
    id: opts.id || `cs-${opts.versionId}`,
    prompt_id: opts.promptId || 'p1',
    version_id: opts.versionId,
    workspace_id: opts.workspaceId || 'ws-a',
    risk_tier: riskTier,
    compiled_shadow,
    shadow_hash,
    status: 'locked' as const,
    locked_at: opts.lockedAt || ts,
    locked_by: opts.lockedBy || 'user-locker',
    created_at: ts,
    updated_at: ts,
  };
}

/** A compiled-but-NOT-locked shadow (Gate 8 must still block on this). */
export function compiledShadowFixture(opts: LockedShadowFixtureOptions) {
  return { ...lockedShadowFixture(opts), status: 'compiled' as const, locked_at: null, locked_by: null };
}
