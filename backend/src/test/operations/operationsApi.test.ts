import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

let src = '';
beforeAll(() => {
  src = readFileSync(resolve(__dirname, '../../server.ts'), 'utf8');
});

describe('Operations API endpoint coverage', () => {
  const ALL_ENDPOINTS = [
    { method: 'GET', path: '/api/v1/operations/runs', purpose: 'List agent runs with filters' },
    { method: 'GET', path: '/api/v1/operations/runs/:id', purpose: 'Get run detail with policy, timeline, evidence' },
    { method: 'GET', path: '/api/v1/operations/runs/:id/timeline', purpose: 'Get immutable timeline events' },
    { method: 'GET', path: '/api/v1/operations/runs/:id/policy-results', purpose: 'Get policy check results' },
    { method: 'GET', path: '/api/v1/operations/runs/:id/control-log', purpose: 'Get runtime control action log' },
    { method: 'POST', path: '/api/v1/operations/runs/:id/pause', purpose: 'Pause a run with reason capture' },
    { method: 'POST', path: '/api/v1/operations/runs/:id/resume', purpose: 'Resume a paused run' },
    { method: 'POST', path: '/api/v1/operations/runs/:id/stop', purpose: 'Stop a run with downstream impact' },
    { method: 'POST', path: '/api/v1/operations/runs/:id/retry', purpose: 'Create linked retry preserving original evidence' },
    { method: 'POST', path: '/api/v1/operations/runs/:id/quarantine', purpose: 'Quarantine output/run artifacts' },
    { method: 'POST', path: '/api/v1/operations/runs/:id/emergency-pause', purpose: 'Emergency pause with elevated permission' },
    { method: 'POST', path: '/api/v1/operations/runs/:id/escalate', purpose: 'Escalate with incident linkage' },
    { method: 'POST', path: '/api/v1/operations/runs/:id/restricted-mode', purpose: 'Restricted operations mode' },
    { method: 'POST', path: '/api/v1/operations/runs/:id/policy-check', purpose: 'Run on-demand policy check' },
    { method: 'POST', path: '/api/v1/operations/runs/:id/start', purpose: 'Start a stopped run' },
    { method: 'DELETE', path: '/api/v1/operations/runs/:id', purpose: 'Archive run preserving history' },
    { method: 'GET', path: '/api/v1/operations/queues', purpose: 'List queue items by type/priority/SLA' },
    { method: 'POST', path: '/api/v1/operations/queues/:id/assign', purpose: 'Assign queue item to operator' },
    { method: 'POST', path: '/api/v1/operations/queues/:id/resolve', purpose: 'Resolve queue item' },
    { method: 'POST', path: '/api/v1/operations/incidents', purpose: 'Create incident linked to run' },
    { method: 'GET', path: '/api/v1/operations/incidents', purpose: 'List incidents' },
    { method: 'PATCH', path: '/api/v1/operations/incidents/:id/resolve', purpose: 'Resolve incident' },
    { method: 'GET', path: '/api/v1/operations/stats', purpose: 'Operations health statistics' },
    { method: 'GET', path: '/api/v1/operations/analytics', purpose: 'Operations analytics metrics' },
    { method: 'GET', path: '/api/v1/operations/evidence/:bundleId', purpose: 'Get evidence bundle' },
    { method: 'POST', path: '/api/v1/operations/evidence/:bundleId/export', purpose: 'Export evidence with reason' },
    { method: 'POST', path: '/api/v1/operations/evidence/:bundleId/lock', purpose: 'Lock evidence bundle' },
    { method: 'POST', path: '/api/v1/operations/evidence', purpose: 'Create evidence bundle' },
    { method: 'GET', path: '/api/v1/operations/evidence', purpose: 'List evidence bundles' },
    { method: 'GET', path: '/api/v1/operations/events', purpose: 'SSE realtime event stream' },
  ];

  for (const ep of ALL_ENDPOINTS) {
    const routePattern = ep.path.replace(/:id/g, ':id').replace(/:bundleId/g, ':bundleId');
    const methodPrefix = ep.method.toLowerCase();
    const routeLiteral = `app.${methodPrefix}('${routePattern}`;
    it(`registers ${ep.method} ${ep.path} - ${ep.purpose}`, () => {
      const idx = src.indexOf(routeLiteral);
      expect(idx).toBeGreaterThan(-1);
    });
  }

  it('protects all operations endpoints with authenticate middleware', () => {
    const opLines = src.split('\n').filter((l) =>
      /app\.(get|post|patch|delete)\('\/api\/v1\/operations\//.test(l),
    );
    for (const l of opLines) {
      expect(l).toContain('authenticate');
    }
  });

  it('protects all operations endpoints with requireOperationsAccess mount-level guard', () => {
    expect(src).toContain("app.use('/api/v1/operations', authenticate, requireOperationsAccess)");
  });

  it('demonstrates evidence export is permission-gated', () => {
    const ctrlContent = readFileSync(
      resolve(__dirname, '../../domains/agents/operationsController.ts'),
      'utf8',
    );
    expect(ctrlContent).toContain('assertOperationsPermission(req.user, "export_evidence")');
  });

  it('demonstrates emergency pause requires elevated permission', () => {
    const ctrlContent = readFileSync(
      resolve(__dirname, '../../domains/agents/operationsController.ts'),
      'utf8',
    );
    expect(ctrlContent).toContain('assertOperationsPermission(req.user, "emergency_pause")');
  });

  it('demonstrates retry requires reason capture', () => {
    const ctrlContent = readFileSync(
      resolve(__dirname, '../../domains/agents/operationsController.ts'),
      'utf8',
    );
    expect(ctrlContent).toContain('requireReason');
  });

  it('demonstrates retry preserves original evidence', () => {
    const ctrlContent = readFileSync(
      resolve(__dirname, '../../domains/agents/operationsController.ts'),
      'utf8',
    );
    expect(ctrlContent).toContain('new_run_id');
  });

  it('demonstrates hold action requires assertOperationsPermission', () => {
    const ctrlContent = readFileSync(
      resolve(__dirname, '../../domains/agents/operationsController.ts'), 'utf8');
    expect(ctrlContent).toContain('assertOperationsPermission(req.user, "hold")');
  });

  it('demonstrates release_hold action requires assertOperationsPermission', () => {
    const ctrlContent = readFileSync(
      resolve(__dirname, '../../domains/agents/operationsController.ts'), 'utf8');
    expect(ctrlContent).toContain('assertOperationsPermission(req.user, "release_hold")');
  });

  it('demonstrates hold and release_hold require reason capture', () => {
    const ctrlContent = readFileSync(
      resolve(__dirname, '../../domains/agents/operationsController.ts'), 'utf8');
    expect(ctrlContent).toContain('requireReason(req.body?.reason, "hold")');
    expect(ctrlContent).toContain('requireReason(req.body?.reason, "release_hold")');
  });

  it('demonstrates hold and release_hold enforce workspace scope', () => {
    const ctrlContent = readFileSync(
      resolve(__dirname, '../../domains/agents/operationsController.ts'), 'utf8');
    expect(ctrlContent.match(/assertWorkspaceScope\(req\.user, run\.workspace_id\)/g)?.length).toBeGreaterThanOrEqual(2);
  });
});



describe('LIVE agent operations route verification', () => {
  let livePageContent = '';
  let liveApiContent = '';

  beforeAll(() => {
    livePageContent = readFileSync(
      resolve(__dirname, '../../../../frontend/src/app/(dashboard)/agents/operations/page.tsx'), 'utf8');
    liveApiContent = readFileSync(
      resolve(__dirname, '../../../../frontend/src/lib/api.ts'), 'utf8');
  });

  it('shared api.ts has holdRun and releaseHoldRun methods', () => {
    expect(liveApiContent).toContain("holdRun");
    expect(liveApiContent).toContain("releaseHoldRun");
    expect(liveApiContent).toContain("/hold");
    expect(liveApiContent).toContain("/release-hold");
  });

  it('shared api.ts has exportAnalyticsCSV (postBlob) and exportOutputSnapshot', () => {
    expect(liveApiContent).toContain("exportAnalyticsCSV");
    expect(liveApiContent).toContain("exportOutputSnapshot");
    expect(liveApiContent).toContain("/analytics/export");
    expect(liveApiContent).toContain("/export-output");
  });

  it('live page has hold and release_hold in RuntimeActionType', () => {
    expect(livePageContent).toContain('"hold"');
    expect(livePageContent).toContain('"release_hold"');
  });

  it('live page calls api.holdRun and api.releaseHoldRun', () => {
    expect(livePageContent).toContain('api.holdRun');
    expect(livePageContent).toContain('api.releaseHoldRun');
  });

  it('live page has hold and release_hold confirmAction entries', () => {
    expect(livePageContent).toContain('"hold"');
    expect(livePageContent).toContain('"release_hold"');
    expect(livePageContent).toContain('"Hold Run"');
    expect(livePageContent).toContain('"Release Hold"');
  });

  it('live page has Emergency Pause button visible for critical runs', () => {
    expect(livePageContent).toContain('emergency_pause');
    expect(livePageContent).toContain('run.severity === "critical"');
  });

  it('live page has server action_gate checks on hold/release_hold/emergency_pause buttons', () => {
    expect(livePageContent).toContain('actionGate(run, "hold").allowed');
    expect(livePageContent).toContain('actionGate(run, "release_hold").allowed');
    expect(livePageContent).toContain('actionGate(run, "emergency_pause").allowed');
  });

  it('live page uses api.exportAnalyticsCSV (CSV endpoint, not JSON blob)', () => {
    expect(livePageContent).toContain('api.exportAnalyticsCSV');
    expect(livePageContent).toContain('.csv');
    expect(livePageContent).not.toContain('JSON.stringify(payload');
  });

  it('live page uses api.exportOutputSnapshot (server endpoint, not local txt)', () => {
    expect(livePageContent).toContain('api.exportOutputSnapshot');
    expect(livePageContent).toContain('requireReason');
    expect(livePageContent).toContain('"Export Snapshot"');
  });

  it('live page enforces minimum reason length (8 chars)', () => {
    expect(livePageContent).toContain('8 characters');
    expect(livePageContent).toContain('requireReason');
  });

  it('live page has deep-links for workflow, agent studio, and evidence vault', () => {
    expect(livePageContent).toContain('/agents/workflows');
    expect(livePageContent).toContain('/agents/studio?id=');
    expect(livePageContent).toContain('/evidence/evidence-vault/items/');
  });
});
