import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

let src = '';
beforeAll(() => {
  src = readFileSync(resolve(__dirname, '../../server.ts'), 'utf8');
});

const idxOf = (literal: string) => src.indexOf(literal);

const OPERATIONS_ROUTES = [
  "app.get('/api/v1/operations/runs'",
  "app.get('/api/v1/operations/events'",
  "app.get('/api/v1/operations/runs/:id'",
  "app.get('/api/v1/operations/runs/:id/timeline'",
  "app.post('/api/v1/operations/runs/:id/pause'",
  "app.post('/api/v1/operations/runs/:id/resume'",
  "app.post('/api/v1/operations/runs/:id/start'",
  "app.delete('/api/v1/operations/runs/:id'",
  "app.post('/api/v1/operations/runs/:id/stop'",
  "app.post('/api/v1/operations/runs/:id/retry'",
  "app.post('/api/v1/operations/runs/:id/quarantine'",
  "app.post('/api/v1/operations/runs/:id/emergency-pause'",
  "app.post('/api/v1/operations/runs/:id/escalate'",
  "app.post('/api/v1/operations/runs/:id/hold'",
  "app.post('/api/v1/operations/runs/:id/release-hold'",
  "app.post('/api/v1/operations/runs/:id/restricted-mode'",
  "app.post('/api/v1/operations/runs/:id/policy-check'",
  "app.get('/api/v1/operations/runs/:id/policy-results'",
  "app.get('/api/v1/operations/runs/:id/control-log'",
  "app.get('/api/v1/operations/queues'",
  "app.post('/api/v1/operations/queues/:id/assign'",
  "app.post('/api/v1/operations/queues/:id/resolve'",
  "app.post('/api/v1/operations/incidents'",
  "app.get('/api/v1/operations/incidents'",
  "app.patch('/api/v1/operations/incidents/:id/resolve'",
  "app.get('/api/v1/operations/stats'",
  "app.get('/api/v1/operations/analytics'",
  "app.get('/api/v1/operations/evidence/:bundleId'",
  "app.post('/api/v1/operations/evidence/:bundleId/export'",
  "app.post('/api/v1/operations/evidence'",
  "app.post('/api/v1/operations/evidence/:bundleId/lock'",
  "app.get('/api/v1/operations/evidence'",
  "app.post('/api/v1/operations/analytics/export'",
  "app.post('/api/v1/operations/runs/:id/export-output'",
];

describe('Operations route registration', () => {
  it('registers all 34 operations routes', () => {
    for (const route of OPERATIONS_ROUTES) {
      expect(src.includes(route)).toBe(true);
    }
  });

  it('gates every operations route with authenticate', () => {
    const opLines = src.split('\n').filter((l) =>
      /app\.(get|post|patch|delete)\('\/api\/v1\/operations\//.test(l),
    );
    expect(opLines.length).toBeGreaterThanOrEqual(OPERATIONS_ROUTES.length);
    for (const l of opLines) expect(l).toContain('authenticate');
  });

  it('registers mount-level requireOperationsAccess middleware', () => {
    expect(src.includes("app.use('/api/v1/operations', authenticate, requireOperationsAccess)")).toBe(true);
  });

  it('registers static collection routes before parameterized routes', () => {
    const runsIdx = idxOf("app.get('/api/v1/operations/runs'");
    const runsByIdIdx = idxOf("app.get('/api/v1/operations/runs/:id'");
    expect(runsIdx).toBeGreaterThan(-1);
    expect(runsByIdIdx).toBeGreaterThan(-1);
    expect(runsIdx).toBeLessThan(runsByIdIdx);
  });

  it('registers evidence collection before evidence/:bundleId', () => {
    const createEvidenceIdx = idxOf("app.post('/api/v1/operations/evidence'");
    const bundleEvidenceIdx = idxOf("app.post('/api/v1/operations/evidence/:bundleId/lock'");
    expect(createEvidenceIdx).toBeGreaterThan(-1);
    expect(bundleEvidenceIdx).toBeGreaterThan(-1);
    expect(createEvidenceIdx).toBeLessThan(bundleEvidenceIdx);
  });

  it('imports all required operations controller handlers', () => {
    const imports = [
      'listAgentRuns', 'getAgentRun', 'getRunTimeline',
      'pauseRun', 'resumeRun', 'stopRun', 'retryRun',
      'quarantineRun', 'listQueues', 'assignQueueItem',
      'resolveQueueItem', 'createIncident', 'listIncidents',
      'resolveIncident', 'getOperationsStats', 'exportEvidence',
      'emergencyPause', 'escalateRun', 'restrictedMode',
      'holdRun', 'releaseHoldRun',
      'exportAnalyticsCSV', 'exportOutputSnapshot',
      'getAnalyticsMetrics', 'subscribeOperationsEvents',
    ];
    for (const name of imports) {
      expect(src.includes(name)).toBe(true);
    }
  });

  it('leaves existing routes registered and untouched', () => {
    for (const route of [
      "app.get('/api/v1/agents'",
      "app.post('/api/v1/prompts'",
      "app.get('/api/v1/governance/queue'",
    ]) {
      expect(src.includes(route)).toBe(true);
    }
  });

  it('preserves Phase 4 prompt routes (no regressions)', () => {
    for (const route of [
      "app.post('/api/v1/prompts/runtime-traces'",
      "app.post('/api/v1/prompts/:id/evidence/export'",
    ]) {
      expect(src.includes(route)).toBe(true);
    }
  });
});
