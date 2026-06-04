import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Static guard over server.ts: verifies the Phase 3B dependency endpoints are
// registered, authenticated, and ordered so static collection routes precede the
// parameterized /prompts/:id route (no shadowing). Pure source analysis — no app.

let src = '';
beforeAll(() => {
  src = readFileSync(resolve(__dirname, '../../server.ts'), 'utf8');
});

const STATIC_ROUTES = [
  '/api/v1/prompts/dependents',
  '/api/v1/prompts/dependency-notifications/plan',
  '/api/v1/prompts/governance-dashboard',
];

const ID_ROUTES = [
  '/api/v1/prompts/:id/dependency-health',
  '/api/v1/prompts/:id/impact',
  '/api/v1/prompts/:id/governance-snapshot',
];

const VERSION_ROUTES = [
  '/api/v1/prompts/versions/:versionId/dependency-health',
  '/api/v1/prompts/versions/:versionId/impact',
];

describe('Phase 3B route registration', () => {
  it('registers all dependency endpoints', () => {
    for (const r of [...STATIC_ROUTES, ...ID_ROUTES, ...VERSION_ROUTES]) {
      expect(src.includes(`'${r}'`)).toBe(true);
    }
  });

  it('gates every dependency route with the authenticate middleware', () => {
    const lines = src.split('\n').filter((l) => /app\.get\('\/api\/v1\/prompts\/(dependents|dependency-notifications|governance-dashboard|:id\/(dependency-health|impact|governance-snapshot)|versions\/:versionId\/(dependency-health|impact))/.test(l));
    expect(lines.length).toBeGreaterThanOrEqual(8);
    for (const l of lines) expect(l).toContain('authenticate');
  });

  it('registers static collection routes BEFORE /prompts/:id (no shadowing)', () => {
    const idIdx = src.indexOf("app.get('/api/v1/prompts/:id'");
    expect(idIdx).toBeGreaterThan(-1);
    for (const r of STATIC_ROUTES) {
      const idx = src.indexOf(`'${r}'`);
      expect(idx).toBeGreaterThan(-1);
      expect(idx).toBeLessThan(idIdx);
    }
  });
});
