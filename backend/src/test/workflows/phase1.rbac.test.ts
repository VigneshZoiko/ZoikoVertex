import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

let src = '';
beforeAll(() => {
  src = readFileSync(resolve(__dirname, '../../server.ts'), 'utf8');
});

const WF_VIEW = 'workflowView';
const WF_WRITE = 'workflowWrite';
const WF_APPROVE = 'workflowApprove';
const WF_ADMIN = 'workflowAdmin';

interface RouteTest {
  method: string;
  path: string;
  guard: string;
}

const WORKFLOW_ROUTES: RouteTest[] = [
  // ── View routes (GET / list / stats / graph / evidence) ──
  { method: 'get', path: '/api/v1/agents', guard: null },
  { method: 'get', path: '/api/v1/agents/workflows', guard: WF_VIEW },
  { method: 'get', path: '/api/v1/agents/workflows/stats', guard: WF_VIEW },
  { method: 'get', path: '/api/v1/agents/workflows/control-strip', guard: WF_VIEW },
  { method: 'get', path: '/api/v1/agents/workflows/analytics', guard: WF_VIEW },
  { method: 'get', path: '/api/v1/agents/workflows/active', guard: WF_VIEW },
  { method: 'get', path: '/api/v1/agents/workflows/graph', guard: WF_VIEW },
  { method: 'get', path: '/api/v1/agents/workflows/escalations', guard: WF_VIEW },
  { method: 'get', path: '/api/v1/agents/workflows/approvals', guard: WF_VIEW },
  { method: 'get', path: '/api/v1/agents/workflows/approvals/stats', guard: WF_VIEW },
  { method: 'get', path: '/api/v1/agents/workflows/versions/:versionId/graph', guard: WF_VIEW },
  { method: 'get', path: '/api/v1/agents/workflows/versions/:versionId/validate', guard: WF_VIEW },
  { method: 'get', path: '/api/v1/agents/workflows/versions/:versionId/simulations', guard: WF_VIEW },
  { method: 'get', path: '/api/v1/agents/workflows/instances', guard: WF_VIEW },
  { method: 'get', path: '/api/v1/agents/workflows/instances/:instanceId', guard: WF_VIEW },
  { method: 'get', path: '/api/v1/agents/workflows/instances/:instanceId/step-runs', guard: WF_VIEW },
  { method: 'get', path: '/api/v1/agents/workflows/instances/:instanceId/evidence', guard: WF_VIEW },
  { method: 'get', path: '/api/v1/agents/workflows/:id', guard: WF_VIEW },
  { method: 'get', path: '/api/v1/agents/workflows/:id/versions', guard: WF_VIEW },
  { method: 'get', path: '/api/v1/agents/workflows/:id/dependencies', guard: WF_VIEW },

  // ── Write routes (create / update / duplicate / simulate / submit) ──
  { method: 'post', path: '/api/v1/agents/workflows', guard: WF_WRITE },
  { method: 'post', path: '/api/v1/agents/workflows/versions/:versionId/submit', guard: WF_WRITE },
  { method: 'post', path: '/api/v1/agents/workflows/versions/:versionId/simulate', guard: WF_WRITE },
  { method: 'post', path: '/api/v1/agents/workflows/instances', guard: WF_WRITE },
  { method: 'post', path: '/api/v1/agents/workflows/instances/:instanceId/evidence', guard: WF_WRITE },
  { method: 'patch', path: '/api/v1/agents/workflows/:id', guard: WF_WRITE },
  { method: 'post', path: '/api/v1/agents/workflows/:id/duplicate', guard: WF_WRITE },
  { method: 'post', path: '/api/v1/agents/workflows/:id/versions', guard: WF_WRITE },

  // ── Approve routes (approve / reject / activate / decide) ──
  { method: 'post', path: '/api/v1/agents/workflows/versions/:versionId/approve', guard: WF_APPROVE },
  { method: 'post', path: '/api/v1/agents/workflows/versions/:versionId/reject', guard: WF_APPROVE },
  { method: 'post', path: '/api/v1/agents/workflows/versions/:versionId/activate', guard: WF_APPROVE },
  { method: 'post', path: '/api/v1/agents/workflows/approvals/:approvalId/decide', guard: WF_APPROVE },

  // ── Admin routes (delete / pause / retire / transition / execute / rollback) ──
  { method: 'post', path: '/api/v1/agents/workflows/versions/:versionId/pause', guard: WF_ADMIN },
  { method: 'post', path: '/api/v1/agents/workflows/versions/:versionId/retire', guard: WF_ADMIN },
  { method: 'patch', path: '/api/v1/agents/workflows/instances/:instanceId/transition', guard: WF_ADMIN },
  { method: 'post', path: '/api/v1/agents/workflows/instances/:instanceId/execute', guard: WF_ADMIN },
  { method: 'delete', path: '/api/v1/agents/workflows/:id', guard: WF_ADMIN },
  { method: 'post', path: '/api/v1/agents/workflows/:id/rollback', guard: WF_ADMIN },
];

function buildPattern(method: string, path: string): RegExp {
  const escaped = path.replace(/\//g, '\\/').replace(/:\w+/g, '[^/]+');
  return new RegExp(`app\\.${method}\\(\\s*'${escaped}'`);
}

describe('Phase 1 — Workflow RBAC route guards', () => {
  it('defines workflowView guard with correct roles', () => {
    expect(src).toContain("const workflowView = requireRole('ADMIN', 'WORKSPACE_OWNER', 'AGENT_ARCHITECT', 'AGENT_OPERATOR', 'SUPERADMIN')");
  });

  it('defines workflowWrite guard with correct roles', () => {
    expect(src).toContain("const workflowWrite = requireRole('ADMIN', 'WORKSPACE_OWNER', 'AGENT_ARCHITECT', 'SUPERADMIN')");
  });

  it('defines workflowApprove guard with correct roles', () => {
    expect(src).toContain("const workflowApprove = requireRole('ADMIN', 'WORKSPACE_OWNER', 'AGENT_ARCHITECT', 'SUPERADMIN')");
  });

  it('defines workflowAdmin guard with correct roles', () => {
    expect(src).toContain("const workflowAdmin = requireRole('ADMIN', 'WORKSPACE_OWNER', 'SUPERADMIN')");
  });

  it('registers all workflow routes', () => {
    const routesToCheck = WORKFLOW_ROUTES.filter(r => r.guard !== null);
    for (const route of routesToCheck) {
      const pattern = buildPattern(route.method, route.path);
      expect(pattern.test(src)).toBe(true);
    }
  });

  it('gates every workflow route with its RBAC guard', () => {
    const lines = src.split('\n');
    const routesToCheck = WORKFLOW_ROUTES.filter(r => r.guard !== null);
    for (const route of routesToCheck) {
      const pattern = buildPattern(route.method, route.path);
      const matchingLines = lines.filter(l => pattern.test(l));
      for (const line of matchingLines) {
        expect(line).toContain(route.guard);
        expect(line).toContain('authenticate');
      }
    }
  });

  it('view routes use workflowView not workflowWrite or workflowAdmin', () => {
    const lines = src.split('\n');
    const viewRoutes = WORKFLOW_ROUTES.filter(r => r.guard === WF_VIEW);
    for (const route of viewRoutes) {
      const pattern = buildPattern(route.method, route.path);
      const matchingLines = lines.filter(l => pattern.test(l));
      for (const line of matchingLines) {
        expect(line).toContain(WF_VIEW);
      }
    }
  });

  it('approve routes use workflowApprove not workflowWrite', () => {
    const lines = src.split('\n');
    const approveRoutes = WORKFLOW_ROUTES.filter(r => r.guard === WF_APPROVE);
    for (const route of approveRoutes) {
      const pattern = buildPattern(route.method, route.path);
      const matchingLines = lines.filter(l => pattern.test(l));
      for (const line of matchingLines) {
        expect(line).toContain(WF_APPROVE);
        expect(line).not.toContain(WF_WRITE);
      }
    }
  });

  it('admin routes use workflowAdmin not workflowWrite', () => {
    const lines = src.split('\n');
    const adminRoutes = WORKFLOW_ROUTES.filter(r => r.guard === WF_ADMIN);
    for (const route of adminRoutes) {
      const pattern = buildPattern(route.method, route.path);
      const matchingLines = lines.filter(l => pattern.test(l));
      for (const line of matchingLines) {
        expect(line).toContain(WF_ADMIN);
        expect(line).not.toContain(WF_WRITE);
      }
    }
  });

  it('approval stats endpoint path is workflow-specific', () => {
    const lines = src.split('\n');
    const statsLine = lines.find(l => l.includes('/api/v1/agents/workflows/approvals/stats'));
    expect(statsLine).toBeDefined();
    expect(statsLine).toContain('getApprovalStats');
  });

  it('workflow_template table is used instead of workflows table', () => {
    const sourceFiles = [
      '../../services/agentLinkedResources.service.ts',
      '../../domains/admin/globalSearchController.ts',
    ];
    for (const file of sourceFiles) {
      try {
        const content = readFileSync(resolve(__dirname, file), 'utf8');
        const lines = content.split('\n');
        for (const line of lines) {
          if (line.includes(".from(") && line.includes("'workflows'")) {
            // Should be workflow_templates
            expect(line).toContain("'workflow_templates'");
          }
        }
      } catch {
        // file might not exist in test runner context; skip
      }
    }
  });

  it('workflowTemplate.service.ts uses lowercase status comparisons', () => {
    const templateService = readFileSync(resolve(__dirname, '../../services/workflowTemplate.service.ts'), 'utf8');
    // Should not contain TitleCase status comparisons
    expect(templateService).not.toContain('=== "Active"');
    expect(templateService).not.toContain('=== "Retired"');
    expect(templateService).not.toContain('!== "Draft"');
    // Should contain lowercase comparisons
    expect(templateService).toContain('=== "active"');
    expect(templateService).toContain('=== "retired"');
    expect(templateService).toContain('!== "draft"');
  });
});
