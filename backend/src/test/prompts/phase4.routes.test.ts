import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Static guard over server.ts for Phase 4 routes: verifies registration, auth,
// the runtime-trace service scope, and that static collection routes precede the
// parameterized /prompts/:id route (no shadowing). Pure source analysis — no app.

let src = '';
beforeAll(() => {
  src = readFileSync(resolve(__dirname, '../../server.ts'), 'utf8');
});

const idIdx = () => src.indexOf("app.get('/api/v1/prompts/:id'");
const idxOf = (literal: string) => src.indexOf(literal);

describe('Phase 4 route registration', () => {
  it('registers all Phase 4 routes', () => {
    const routes = [
      "app.post('/api/v1/prompts/runtime-traces'",
      "app.get('/api/v1/prompts/:id/runtime-traces'",
      "app.get('/api/v1/prompts/versions/:versionId/runtime-traces'",
      "app.get('/api/v1/prompts/incidents/:incidentId'",
      "app.patch('/api/v1/prompts/incidents/:incidentId'",
      "app.post('/api/v1/prompts/incidents/:incidentId/close'",
      "app.post('/api/v1/prompts/:id/incidents'",
      "app.get('/api/v1/prompts/:id/incidents'",
      "app.post('/api/v1/prompts/:id/evidence/export'",
      "app.get('/api/v1/prompts/:id/evidence/export/:exportId'",
    ];
    for (const r of routes) expect(src.includes(r)).toBe(true);
  });

  it('gates every Phase 4 route with authenticate', () => {
    const lines = src.split('\n').filter((l) =>
      /app\.(get|post|patch)\('\/api\/v1\/prompts\/(runtime-traces|incidents\/:incidentId|:id\/(runtime-traces|incidents|evidence\/export)|versions\/:versionId\/runtime-traces)/.test(l),
    );
    expect(lines.length).toBeGreaterThanOrEqual(8);
    for (const l of lines) expect(l).toContain('authenticate');
  });

  it('protects runtime-trace ingestion with the write:prompt_runtime_trace scope', () => {
    const line = src.split('\n').find((l) => l.includes("app.post('/api/v1/prompts/runtime-traces'"));
    expect(line).toBeDefined();
    expect(line).toContain("scopeGuard('write:prompt_runtime_trace')");
  });

  it('registers static runtime-traces ingestion BEFORE /prompts/:id', () => {
    expect(idIdx()).toBeGreaterThan(-1);
    expect(idxOf("app.post('/api/v1/prompts/runtime-traces'")).toBeGreaterThan(-1);
    expect(idxOf("app.post('/api/v1/prompts/runtime-traces'")).toBeLessThan(idIdx());
  });

  it('registers static incident routes BEFORE /prompts/:id', () => {
    for (const r of [
      "app.get('/api/v1/prompts/incidents/:incidentId'",
      "app.patch('/api/v1/prompts/incidents/:incidentId'",
      "app.post('/api/v1/prompts/incidents/:incidentId/close'",
    ]) {
      expect(idxOf(r)).toBeGreaterThan(-1);
      expect(idxOf(r)).toBeLessThan(idIdx());
    }
  });

  it('evidence export routes coexist with /:id/evidence (no shadow, distinct paths)', () => {
    expect(idxOf("app.get('/api/v1/prompts/:id/evidence'")).toBeGreaterThan(-1);
    expect(idxOf("app.post('/api/v1/prompts/:id/evidence/export'")).toBeGreaterThan(-1);
    expect(idxOf("app.get('/api/v1/prompts/:id/evidence/export/:exportId'")).toBeGreaterThan(-1);
  });

  it('leaves existing Phase 3B routes registered', () => {
    for (const r of [
      "app.get('/api/v1/prompts/dependents'",
      "app.get('/api/v1/prompts/governance-dashboard'",
      "app.get('/api/v1/prompts/:id/governance-snapshot'",
      "app.get('/api/v1/prompts/versions/:versionId/impact'",
    ]) {
      expect(src.includes(r)).toBe(true);
    }
  });
});
