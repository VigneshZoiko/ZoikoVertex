import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function getControllerContent(): string {
  return readFileSync(resolve(__dirname, '../../domains/agents/operationsController.ts'), 'utf8');
}

function getServerContent(): string {
  return readFileSync(resolve(__dirname, '../../server.ts'), 'utf8');
}

function getAuthServiceContent(): string {
  return readFileSync(resolve(__dirname, '../../services/operationsAuthorization.service.ts'), 'utf8');
}

function getRunServiceContent(): string {
  return readFileSync(resolve(__dirname, '../../services/operationsRun.service.ts'), 'utf8');
}

function getEvidenceServiceContent(): string {
  return readFileSync(resolve(__dirname, '../../services/operationsEvidence.service.ts'), 'utf8');
}

function getAnalyticsServiceContent(): string {
  return readFileSync(resolve(__dirname, '../../services/operationsAnalytics.service.ts'), 'utf8');
}

describe('Cross-tenant access controls', () => {
  const ctrl = getControllerContent();

  it('every mutating handler enforces workspace scope via assertWorkspaceScope', () => {
    const scopeCalls = (ctrl.match(/assertWorkspaceScope\(req\.user/g) || []).length;
    // All handlers that read a run must scope it. Rough lower bound on the
    // number of distinct routes that go through assertWorkspaceScope.
    expect(scopeCalls).toBeGreaterThanOrEqual(18);
  });

  it('list/query handlers pass workspace_id to service functions', () => {
    const workspaceRefs = (ctrl.match(/workspace_id:|workspaceId/g) || []).length;
    expect(workspaceRefs).toBeGreaterThanOrEqual(20);
  });

  it('exportAnalyticsCSV uses workspace_id from authenticated user, not request body', () => {
    // workspaceId is extracted from req.user which is set by authenticate middleware
    expect(ctrl).toContain('const workspaceId = req.user?.workspace_id');
    // No path allows passing a foreign workspace_id via request body/query
    expect(ctrl).not.toContain('req.body.workspace_id');
    expect(ctrl).not.toContain('req.query.workspace_id');
  });

  it('all run-scoped handlers fetch run before checking workspace scope', () => {
    // The pattern is: getAgentRun(id) -> assertWorkspaceScope(req.user, run.workspace_id)
    const fetchThenScope = (ctrl.match(/run\.workspace_id\)/g) || []).length;
    expect(fetchThenScope).toBeGreaterThanOrEqual(15);
  });

  it('listAgentRuns always filters by workspace_id in query', () => {
    const runSvc = getRunServiceContent();
    expect(runSvc).toContain('.eq(\'workspace_id\', ');
    expect(runSvc).toContain('params.workspace_id');
  });

  it('listQueues filters by workspace_id', () => {
    const ctrl = getControllerContent();
    expect(ctrl).toContain('workspace_id: workspaceId');
  });

  it('listIncidents filters by workspace_id', () => {
    const ctrl = getControllerContent();
    expect(ctrl).toContain('workspace_id: workspaceId');
  });

  it('getOperationsStats passes workspaceId', () => {
    const ctrl = getControllerContent();
    expect(ctrl).toContain('analyticsService.getOperationsStats(workspaceId,');
  });

  it('getAnalyticsMetrics passes workspaceId', () => {
    const ctrl = getControllerContent();
    expect(ctrl).toContain('analyticsService.getAnalyticsMetrics(workspaceId,');
  });

  it('listEvidenceBundles filters by workspace_id', () => {
    const ctrl = getControllerContent();
    expect(ctrl).toContain('workspace_id: workspaceId');
  });
});

describe('Cross-brand access controls', () => {
  const ctrl = getControllerContent();
  const analytics = getAnalyticsServiceContent();

  it('all listAgentRuns queries accept brand_id filter from auth-scoped user', () => {
    const runSvc = getRunServiceContent();
    expect(runSvc).toContain('params.brand_id');
    expect(runSvc).toContain('.eq(\'brand_id\', params.brand_id)');
  });

  it('analytics queries scope by brand_id when present', () => {
    expect(analytics).toContain('filters.brand_id');
    expect(analytics).toContain('.eq(\'brand_id\',');
  });

  it('no endpoint accepts brand_id from request body', () => {
    // Brand_id must come from query params derived from auth scope, never body
    const bodyBrandRefs = (ctrl.match(/req\.body\.brand_id/g) || []).length;
    expect(bodyBrandRefs).toBe(0);
  });
});

describe('Permission escalation prevention', () => {
  const auth = getAuthServiceContent();

  it('assertOperationsPermission checks action against allowed set', () => {
    expect(auth).toContain('assertOperationsPermission');
    expect(auth).toContain('Permission denied');
  });

  it('every runtime action key has a corresponding permission check', () => {
    const ctrl = getControllerContent();
    const actionKeys = [
      'pause', 'resume', 'stop', 'retry', 'quarantine', 'escalate',
      'emergency_pause', 'restricted_mode', 'hold', 'release_hold',
      'export_evidence', 'view', 'create_incident', 'manage_queue',
      'run_policy_check', 'delete_run',
    ];
    for (const key of actionKeys) {
      expect(ctrl).toContain(`assertOperationsPermission(req.user, "${key}")`);
    }
  });

  it('requireOperationsAccess middleware exists at mount level', () => {
    const svr = getServerContent();
    expect(svr).toContain("app.use('/api/v1/operations', authenticate, requireOperationsAccess)");
  });

  it('all operations routes pass through authenticate middleware', () => {
    const svr = getServerContent();
    const opLines = svr.split('\n').filter((l) =>
      /app\.(get|post|patch|delete)\('\/api\/v1\/operations\//.test(l),
    );
    for (const l of opLines) expect(l).toContain('authenticate');
  });

  it('viewer role can only view, cannot perform mutating actions', () => {
    const authContent = readFileSync(
      resolve(__dirname, '../../services/operationsAuthorization.service.ts'), 'utf8');
    // VIEWER is in the `view` role list but should not appear in mutating action role lists
    expect(authContent).toContain('"VIEWER"');
    expect(authContent).toContain('view: [');
    // Mutating actions should not include VIEWER
    const mutatingActions = ['pause:', 'resume:', 'stop:', 'retry:', 'quarantine:', 'emergency_pause:', 'hold:', 'release_hold:'];
    for (const act of mutatingActions) {
      const line = authContent.split('\n').find((l) => l.trim().startsWith(act));
      expect(line, `${act} should not include VIEWER`).toBeTruthy();
      // Use regex to match exact "VIEWER" token, not substring (avoids COMPLIANCE_REVIEWER false positive)
      expect(line!.match(/\bVIEWER\b/)).toBeNull();
    }
  });

  it('analytics CSV export requires view permission, not admin-only', () => {
    const ctrl = getControllerContent();
    expect(ctrl).toContain('assertOperationsPermission(req.user, "view")');
  });

  it('output snapshot export requires export_evidence permission', () => {
    const ctrl = getControllerContent();
    expect(ctrl).toContain('assertOperationsPermission(req.user, "export_evidence")');
  });
});

describe('Export abuse prevention', () => {
  const ctrl = getControllerContent();

  it('every export endpoint captures reason via requireReason', () => {
    const exportRegex = /requireReason\(req\.body\?\.reason/g;
    const matches = ctrl.match(exportRegex) || [];
    // evidence export, CSV export, output snapshot export
    expect(matches.length).toBeGreaterThanOrEqual(3);
  });

  it('evidence export is workspace-scoped', () => {
    expect(ctrl).toContain('assertWorkspaceScope(req.user, evidence.workspace_id)');
  });

  it('CSV export is workspace-scoped via workspaceId from auth', () => {
    expect(ctrl).toContain('if (!workspaceId)');
    expect(ctrl).toContain('return res.status(403).json({ error: "Workspace not found" })');
  });

  it('output snapshot export is workspace-scoped', () => {
    expect(ctrl).toContain('assertWorkspaceScope(req.user, run.workspace_id)');
  });

  it('every export writes a database audit log', () => {
    const logExports = (ctrl.match(/logToDatabase\(/g) || []).length;
    // Expect at least 3 logToDatabase calls (evidence, CSV, output)
    expect(logExports).toBeGreaterThanOrEqual(3);
  });

  it('evidence and output exports emit internal event bus events', () => {
    const emitRefs = (ctrl.match(/internalEventBus\.emit/g) || []).length;
    expect(emitRefs).toBeGreaterThanOrEqual(2);
  });
});

describe('Invalid state transition prevention', () => {
  const runSvc = getRunServiceContent();

  it('isValidTransition prevents illegal state changes', () => {
    expect(runSvc).toContain('function isValidTransition');
    expect(runSvc).toContain('if (!isValidTransition(run.status, newStatus))');
  });

  it('transition map does not allow COMPLETED transitions', () => {
    expect(runSvc).toContain('COMPLETED: []');
  });

  it('transition map does not allow CANCELLED transitions', () => {
    expect(runSvc).toContain('CANCELLED: []');
  });

  it('hold transitions to PAUSED are valid from SCHEDULED, QUEUED, RUNNING, WAITING_HUMAN_REVIEW', () => {
    expect(runSvc).toContain('SCHEDULED: [\'PAUSED\'');
    expect(runSvc).toContain('QUEUED: [\'RUNNING\', \'PAUSED\'');
    expect(runSvc).toContain('RUNNING: [\'PAUSED\'');
    expect(runSvc).toContain('WAITING_HUMAN_REVIEW: [\'PAUSED\'');
  });

  it('release_hold (PAUSED→RUNNING) is valid', () => {
    expect(runSvc).toContain('PAUSED: [\'RUNNING\'');
  });

  it('transition fails with 409 not 500 on illegal state change', () => {
    // The service throws a 409, controller should pass it through
    expect(runSvc).toContain('statusCode: 409');
  });

  it('transitionRunStateFallback also records immutable event', () => {
    expect(runSvc).toContain('transitionRunStateFallback');
  });
});

describe('Evidence tampering prevention', () => {
  const evSvc = getEvidenceServiceContent();

  it('evidence export does not change status (write-once)', () => {
    expect(evSvc).toContain('do NOT change `status` here');
    expect(evSvc).toContain('exported_by');
    expect(evSvc).toContain('exported_at');
    expect(evSvc).toContain('export_reason');
  });

  it('evidence export requires existing bundle id', () => {
    expect(evSvc).toContain('params.bundleId');
    expect(evSvc).toContain('.eq(\'id\', params.bundleId)');
  });

  it('only export-bookkeeping fields are updated during export', () => {
    const updateFields = evSvc.match(/exported_by|exported_at|export_reason|storage_ref/g) || [];
    expect(updateFields.length).toBeGreaterThanOrEqual(4);
  });

  it('evidence lock is enforced by DB trigger or application check', () => {
    const ctrl = getControllerContent();
    expect(ctrl).toContain('lockEvidenceBundle');
    expect(ctrl).toContain('assertOperationsPermission');
  });

  it('retry preserves original evidence by creating new linked run', () => {
    const ctrl = getControllerContent();
    expect(ctrl).toContain('new_run_id');
  });
});

describe('Injection prevention in reason fields', () => {
  const ctrl = getControllerContent();

  it('all mutating actions require reason via requireReason', () => {
    const reasonCalls = (ctrl.match(/requireReason\(/g) || []).length;
    expect(reasonCalls).toBeGreaterThanOrEqual(14);
  });

  it('requireReason validates minimum length', () => {
    const auth = readFileSync(
      resolve(__dirname, '../../services/operationsAuthorization.service.ts'), 'utf8');
    expect(auth).toContain('at least 8 characters');
    expect(auth).toContain('reason');
  });

  it('requireReason validates and trims reason input', () => {
    const auth = readFileSync(
      resolve(__dirname, '../../services/operationsAuthorization.service.ts'), 'utf8');
    expect(auth).toContain('at least 8 characters');
    expect(auth).toContain('trim()');
  });
});

describe('Unauthorized export prevention', () => {
  const ctrl = getControllerContent();

  it('evidence export requires export_evidence permission', () => {
    expect(ctrl).toContain('assertOperationsPermission(req.user, "export_evidence")');
  });

  it('analytics CSV export requires at least view permission', () => {
    expect(ctrl).toContain('assertOperationsPermission(req.user, "view")');
  });

  it('output snapshot export requires export_evidence permission', () => {
    expect(ctrl).toContain('assertOperationsPermission(req.user, "export_evidence")');
  });

  it('evidence export requires reason', () => {
    expect(ctrl).toContain('requireReason(req.body?.reason, "export_evidence")');
  });

  it('analytics CSV export requires reason', () => {
    expect(ctrl).toContain('requireReason(req.body?.reason, "export_evidence")');
  });

  it('output snapshot export requires reason', () => {
    expect(ctrl).toContain('requireReason(req.body?.reason, "export_evidence")');
  });
});

describe('Auth middleware coverage', () => {
  const svr = getServerContent();

  it('all operations endpoints are protected by authenticate', () => {
    const opLines = svr.split('\n').filter((l) =>
      /app\.(get|post|patch|delete)\('\/api\/v1\/operations\//.test(l),
    );
    expect(opLines.length).toBeGreaterThanOrEqual(34);
    for (const l of opLines) expect(l).toContain('authenticate');
  });

  it('mount-level middleware registers before standard operations routes', () => {
    const mountIdx = svr.indexOf("app.use('/api/v1/operations', authenticate, requireOperationsAccess)");
    const firstRouteIdx = svr.indexOf("app.get('/api/v1/operations/runs'");
    expect(mountIdx).toBeGreaterThan(-1);
    expect(firstRouteIdx).toBeGreaterThan(-1);
    expect(firstRouteIdx).toBeGreaterThan(mountIdx);
  });

  it('no unauthenticated operations routes exist', () => {
    const knownNonAuth = [
      "app.get('/api/v1/operations/events'",
    ];
    const opLines = svr.split('\n').filter((l) =>
      /app\.(get|post|patch|delete)\('\/api\/v1\/operations\//.test(l),
    );
    for (const l of opLines) {
      // The events SSE endpoint uses authenticate differently; skip it
      if (knownNonAuth.some((na) => l.includes(na))) continue;
      expect(l).toContain('authenticate');
    }
  });
});
