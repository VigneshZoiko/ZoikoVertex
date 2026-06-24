import { describe, it, expect } from 'vitest';
import { getPolicyEngineHealth } from '../../services/operationsPolicy.service';

describe('getPolicyEngineHealth', () => {
  it('returns healthy by default', () => {
    const health = getPolicyEngineHealth();
    expect(health.healthy).toBe(true);
    expect(health.mode).toBe('local_deterministic');
    expect(health.version).toBeDefined();
  });

  it('returns disabled when env var is set', () => {
    process.env.OPERATIONS_POLICY_ENGINE_DISABLED = 'true';
    const health = getPolicyEngineHealth();
    expect(health.healthy).toBe(false);
    expect(health.mode).toBe('disabled');
    delete process.env.OPERATIONS_POLICY_ENGINE_DISABLED;
  });
});

describe('State transition validation (shared/validation)', () => {
  it('validates UUID format', async () => {
    const mod = await import('../../shared/validation');
    expect(mod.isUuid('not-a-uuid')).toBe(false);
    expect(mod.isUuid('')).toBe(false);
    expect(mod.isUuid(undefined)).toBe(false);
    expect(mod.isUuid(null as any)).toBe(false);
    expect(mod.isUuid('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    expect(mod.isUuid('550e8400e29b41d4a716446655440000')).toBe(false);
  });
});

describe('Evidence service canonicalization', () => {
  it('canonicalization produces deterministic JSON', async () => {
    const mod = await import('../../services/operationsEvidence.service');
    // canonicalize returns a stable string regardless of key ordering
    const obj1 = { b: 2, a: 1 };
    const obj2 = { a: 1, b: 2 };
    expect(mod.canonicalize(obj1)).toBe(mod.canonicalize(obj2));

    const nested = { z: { y: 3, x: [2, 1] }, w: null };
    const same = { w: null, z: { x: [2, 1], y: 3 } };
    expect(mod.canonicalize(nested)).toBe(mod.canonicalize(same));
  });
});
