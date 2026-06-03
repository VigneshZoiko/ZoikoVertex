import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

let src = '';
beforeAll(() => {
  src = readFileSync(resolve(__dirname, '../../server.ts'), 'utf8');
});

const GOV_VIEW = 'govView';
const GOV_EDIT = 'govEdit';
const GOV_LIFECYCLE = 'govLifecycle';

interface RouteTest {
  method: string;
  path: string;
  guard: string;
}

const PROMPT_ROUTES: RouteTest[] = [
  // Static routes
  { method: 'get', path: '/api/v1/prompts/stats', guard: GOV_VIEW },
  { method: 'get', path: '/api/v1/prompts/approvals/stats', guard: GOV_VIEW },
  { method: 'get', path: '/api/v1/prompts/audit/:auditId', guard: GOV_VIEW },
  { method: 'get', path: '/api/v1/prompts/dependents', guard: GOV_VIEW },
  { method: 'get', path: '/api/v1/prompts/dependency-notifications/plan', guard: GOV_VIEW },
  { method: 'get', path: '/api/v1/prompts/governance-dashboard', guard: GOV_VIEW },
  { method: 'post', path: '/api/v1/prompts/runtime-traces', guard: GOV_EDIT },
  // Incidents
  { method: 'get', path: '/api/v1/prompts/incidents/:incidentId', guard: GOV_VIEW },
  { method: 'patch', path: '/api/v1/prompts/incidents/:incidentId', guard: GOV_LIFECYCLE },
  { method: 'post', path: '/api/v1/prompts/incidents/:incidentId/close', guard: GOV_LIFECYCLE },
  // Versions sub-routes
  { method: 'post', path: '/api/v1/prompts/versions/:versionId/approve', guard: GOV_LIFECYCLE },
  { method: 'post', path: '/api/v1/prompts/versions/:versionId/reject', guard: GOV_LIFECYCLE },
  { method: 'post', path: '/api/v1/prompts/versions/:versionId/deploy', guard: GOV_LIFECYCLE },
  { method: 'get', path: '/api/v1/prompts/versions/:versionId/tests/runs', guard: GOV_VIEW },
  { method: 'post', path: '/api/v1/prompts/versions/:versionId/tests/run', guard: GOV_EDIT },
  { method: 'get', path: '/api/v1/prompts/versions/:versionId/approvals', guard: GOV_VIEW },
  { method: 'get', path: '/api/v1/prompts/versions/:versionId/deployments', guard: GOV_VIEW },
  { method: 'get', path: '/api/v1/prompts/versions/:versionId/bindings', guard: GOV_EDIT },
  { method: 'post', path: '/api/v1/prompts/versions/:versionId/bindings', guard: GOV_EDIT },
  { method: 'get', path: '/api/v1/prompts/versions/:versionId/knowledge', guard: GOV_EDIT },
  { method: 'post', path: '/api/v1/prompts/versions/:versionId/knowledge', guard: GOV_EDIT },
  { method: 'get', path: '/api/v1/prompts/versions/:versionId/tools', guard: GOV_EDIT },
  { method: 'post', path: '/api/v1/prompts/versions/:versionId/tools', guard: GOV_EDIT },
  { method: 'get', path: '/api/v1/prompts/versions/:versionId/graph', guard: GOV_VIEW },
  { method: 'get', path: '/api/v1/prompts/versions/:versionId/dependency-health', guard: GOV_VIEW },
  { method: 'get', path: '/api/v1/prompts/versions/:versionId/impact', guard: GOV_VIEW },
  { method: 'get', path: '/api/v1/prompts/versions/:versionId/runtime-traces', guard: GOV_VIEW },
  // Binding edits
  { method: 'patch', path: '/api/v1/prompts/bindings/:bindingId', guard: GOV_EDIT },
  { method: 'delete', path: '/api/v1/prompts/bindings/:bindingId', guard: GOV_EDIT },
  { method: 'patch', path: '/api/v1/prompts/knowledge-bindings/:bindingId', guard: GOV_EDIT },
  { method: 'delete', path: '/api/v1/prompts/knowledge-bindings/:bindingId', guard: GOV_EDIT },
  { method: 'patch', path: '/api/v1/prompts/tool-permissions/:permissionId', guard: GOV_EDIT },
  { method: 'delete', path: '/api/v1/prompts/tool-permissions/:permissionId', guard: GOV_EDIT },
  // CRUD
  { method: 'get', path: '/api/v1/prompts', guard: GOV_VIEW },
  { method: 'post', path: '/api/v1/prompts', guard: GOV_EDIT },
  { method: 'get', path: '/api/v1/prompts/:id', guard: GOV_VIEW },
  { method: 'get', path: '/api/v1/prompts/:id/graph', guard: GOV_VIEW },
  { method: 'get', path: '/api/v1/prompts/:id/dependency-health', guard: GOV_VIEW },
  { method: 'get', path: '/api/v1/prompts/:id/impact', guard: GOV_VIEW },
  { method: 'get', path: '/api/v1/prompts/:id/governance-snapshot', guard: GOV_VIEW },
  { method: 'patch', path: '/api/v1/prompts/:id', guard: GOV_EDIT },
  { method: 'post', path: '/api/v1/prompts/:id/clone', guard: GOV_EDIT },
  // Lifecycle
  { method: 'post', path: '/api/v1/prompts/:id/pause', guard: GOV_LIFECYCLE },
  { method: 'post', path: '/api/v1/prompts/:id/resume', guard: GOV_LIFECYCLE },
  { method: 'post', path: '/api/v1/prompts/:id/archive', guard: GOV_LIFECYCLE },
  { method: 'post', path: '/api/v1/prompts/:id/retire', guard: GOV_LIFECYCLE },
  { method: 'post', path: '/api/v1/prompts/:id/submit-review', guard: GOV_LIFECYCLE },
  { method: 'post', path: '/api/v1/prompts/:id/rollback', guard: GOV_LIFECYCLE },
  // Evidence
  { method: 'get', path: '/api/v1/prompts/:id/evidence', guard: GOV_VIEW },
  { method: 'post', path: '/api/v1/prompts/:id/evidence/export', guard: GOV_VIEW },
  { method: 'get', path: '/api/v1/prompts/:id/evidence/export/:exportId', guard: GOV_VIEW },
  // Runtime evidence
  { method: 'get', path: '/api/v1/prompts/:id/runtime-traces', guard: GOV_VIEW },
  // Incidents under :id
  { method: 'post', path: '/api/v1/prompts/:id/incidents', guard: GOV_LIFECYCLE },
  { method: 'get', path: '/api/v1/prompts/:id/incidents', guard: GOV_VIEW },
  // Audit
  { method: 'get', path: '/api/v1/prompts/:id/audit', guard: GOV_VIEW },
  { method: 'get', path: '/api/v1/prompts/:id/audit/timeline', guard: GOV_VIEW },
  // Versions under :id
  { method: 'get', path: '/api/v1/prompts/:id/versions', guard: GOV_VIEW },
  { method: 'post', path: '/api/v1/prompts/:id/versions', guard: GOV_EDIT },
  { method: 'get', path: '/api/v1/prompts/:id/versions/:versionId', guard: GOV_VIEW },
  // Tests under :id
  { method: 'get', path: '/api/v1/prompts/:id/tests/suites', guard: GOV_VIEW },
  { method: 'post', path: '/api/v1/prompts/:id/tests/suites', guard: GOV_EDIT },
];

function buildPattern(method: string, path: string): RegExp {
  const escaped = path.replace(/\//g, '\\/');
  return new RegExp(`app\\.${method}\\(\\s*'${escaped}'`);
}

describe('Phase 5A — Prompt Governance RBAC route guards', () => {
  it('defines govView guard with correct roles', () => {
    expect(src).toContain("const govView = requireRole('ADMIN', 'GOVERNANCE_ADMIN', 'WORKSPACE_OWNER', 'AGENT_ARCHITECT', 'COMPLIANCE_REVIEWER', 'AUDITOR')");
  });

  it('defines govEdit guard with correct roles', () => {
    expect(src).toContain("const govEdit = requireRole('ADMIN', 'GOVERNANCE_ADMIN', 'WORKSPACE_OWNER', 'AGENT_ARCHITECT')");
  });

  it('defines govLifecycle guard with correct roles', () => {
    expect(src).toContain("const govLifecycle = requireRole('ADMIN', 'GOVERNANCE_ADMIN', 'WORKSPACE_OWNER', 'AGENT_ARCHITECT', 'COMPLIANCE_REVIEWER')");
  });

  it('registers all prompt governance routes', () => {
    for (const route of PROMPT_ROUTES) {
      const pattern = buildPattern(route.method, route.path);
      expect(pattern.test(src)).toBe(true);
    }
  });

  it('gates every prompt governance route with the correct RBAC guard', () => {
    const lines = src.split('\n');
    for (const route of PROMPT_ROUTES) {
      const pattern = buildPattern(route.method, route.path);
      const matchingLines = lines.filter(l => pattern.test(l));
      for (const line of matchingLines) {
        expect(line).toContain(route.guard);
        expect(line).toContain('authenticate');
      }
    }
  });

  it('lifecycle routes use govLifecycle not govEdit or govView', () => {
    const lifecyclePatterns = [
      '/api/v1/prompts/:id/pause',
      '/api/v1/prompts/:id/resume',
      '/api/v1/prompts/:id/archive',
      '/api/v1/prompts/:id/retire',
      '/api/v1/prompts/:id/submit-review',
      '/api/v1/prompts/:id/rollback',
      '/api/v1/prompts/versions/:versionId/approve',
      '/api/v1/prompts/versions/:versionId/reject',
      '/api/v1/prompts/versions/:versionId/deploy',
    ];
    const lines = src.split('\n');
    for (const p of lifecyclePatterns) {
      const pattern = new RegExp(p.replace(/\//g, '\\/').replace(/:\w+/g, '\\w+'));
      const matchingLines = lines.filter(l => pattern.test(l));
      for (const line of matchingLines) {
        expect(line).toContain(GOV_LIFECYCLE);
        expect(line).not.toContain(GOV_EDIT);
      }
    }
  });

  it('read-only GET routes use govView not govEdit', () => {
    const lines = src.split('\n');
    const readOnlyRoutes = PROMPT_ROUTES.filter(r => r.guard === GOV_VIEW && r.method === 'get');
    for (const route of readOnlyRoutes) {
      const pattern = buildPattern(route.method, route.path);
      const matchingLines = lines.filter(l => pattern.test(l));
      for (const line of matchingLines) {
        expect(line).toContain(GOV_VIEW);
        expect(line).not.toContain(GOV_EDIT);
      }
    }
  });
});
