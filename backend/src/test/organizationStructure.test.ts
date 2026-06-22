import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

let src = '';
beforeAll(() => {
  src = readFileSync(resolve(__dirname, '../server.ts'), 'utf8');
});

describe('Organization Structure — route registration', () => {
  const ROUTES = [
    { method: 'GET',    path: '/api/v1/units/stats',            purpose: 'Unit statistics' },
    { method: 'GET',    path: '/api/v1/units',                  purpose: 'List units (optionally filtered by parent_id)' },
    { method: 'GET',    path: '/api/v1/units/:id',              purpose: 'Get single unit' },
    { method: 'GET',    path: '/api/v1/units/:id/children',     purpose: 'Get direct children' },
    { method: 'POST',   path: '/api/v1/units',                  purpose: 'Create a unit' },
    { method: 'PUT',    path: '/api/v1/units/:id',              purpose: 'Update a unit' },
    { method: 'POST',   path: '/api/v1/units/:id/archive',      purpose: 'Archive a unit' },
    { method: 'POST',   path: '/api/v1/units/:id/restore',      purpose: 'Restore a unit' },
    { method: 'DELETE', path: '/api/v1/units/:id',              purpose: 'Delete a unit' },
    { method: 'GET',    path: '/api/v1/units/:id/members',      purpose: 'List unit members' },
    { method: 'GET',    path: '/api/v1/units/:id/members/available', purpose: 'List available members to add' },
    { method: 'POST',   path: '/api/v1/units/:id/members',      purpose: 'Add a member to unit' },
    { method: 'DELETE', path: '/api/v1/units/:id/members/:memberId', purpose: 'Remove a member from unit' },
    { method: 'GET',    path: '/api/v1/units/:id/brands',       purpose: 'List unit brands' },
    { method: 'POST',   path: '/api/v1/units/:id/brands',       purpose: 'Link brand to unit' },
    { method: 'DELETE', path: '/api/v1/units/:id/brands/:brandId', purpose: 'Unlink brand from unit' },
    { method: 'GET',    path: '/api/v1/units/:id/activity',     purpose: 'Get unit activity log' },
    { method: 'GET',    path: '/api/v1/units/:id/evidence-scope',   purpose: 'Get unit evidence scope' },
    { method: 'POST',   path: '/api/v1/units/:id/evidence-scope',   purpose: 'Set unit evidence scope' },
    { method: 'DELETE', path: '/api/v1/units/:id/evidence-scope/:scopeId', purpose: 'Delete unit evidence scope' },
  ];

  for (const ep of ROUTES) {
    const routePattern = ep.path.replace(/:id/g, ':id').replace(/:memberId/g, ':memberId').replace(/:brandId/g, ':brandId').replace(/:scopeId/g, ':scopeId');
    const methodPrefix = ep.method.toLowerCase();
    const routeLiteral = `app.${methodPrefix}('${routePattern}`;
    it(`registers ${ep.method} ${ep.path} — ${ep.purpose}`, () => {
      expect(src.indexOf(routeLiteral)).toBeGreaterThan(-1);
    });
  }

  it('protects all units endpoints with authenticate middleware', () => {
    const unitLines = src.split('\n').filter((l) =>
      /app\.(get|post|put|delete)\('\/api\/v1\/units/.test(l),
    );
    expect(unitLines.length).toBeGreaterThan(0);
    for (const l of unitLines) {
      expect(l).toContain('authenticate');
    }
  });

  it('protects mutating unit endpoints with ADMIN or WORKSPACE_OWNER role', () => {
    const mutatingEndpoints = [
      "app.post('/api/v1/units'",
      "app.put('/api/v1/units/:id'",
      "app.post('/api/v1/units/:id/archive'",
      "app.post('/api/v1/units/:id/restore'",
      "app.delete('/api/v1/units/:id'",
      "app.post('/api/v1/units/:id/members'",
      "app.delete('/api/v1/units/:id/members/:memberId'",
      "app.post('/api/v1/units/:id/brands'",
      "app.delete('/api/v1/units/:id/brands/:brandId'",
      "app.post('/api/v1/units/:id/evidence-scope'",
      "app.delete('/api/v1/units/:id/evidence-scope/:scopeId'",
    ];
    for (const ep of mutatingEndpoints) {
      const line = src.split('\n').find((l) => l.includes(ep));
      expect(line, `Missing route: ${ep}`).toBeDefined();
      expect(line).toContain("requireRole('ADMIN', 'WORKSPACE_OWNER')");
    }
  });

  it('places /api/v1/units/stats before /api/v1/units/:id', () => {
    const statsIdx = src.indexOf("app.get('/api/v1/units/stats'");
    const idIdx = src.indexOf("app.get('/api/v1/units/:id'");
    expect(statsIdx).toBeGreaterThan(-1);
    expect(idIdx).toBeGreaterThan(-1);
    expect(statsIdx).toBeLessThan(idIdx);
  });

  it('places /api/v1/units/:id/members/available before /api/v1/units/:id/members', () => {
    const lines = src.split('\n');
    const availIdx = lines.findIndex(l => l.includes("app.get('/api/v1/units/:id/members/available'"));
    const membersIdx = lines.findIndex(l => l.includes("app.get('/api/v1/units/:id/members'") && !l.includes('available'));
    expect(availIdx).toBeGreaterThan(-1);
    expect(membersIdx).toBeGreaterThan(-1);
    expect(availIdx).toBeLessThan(membersIdx);
  });
});

describe('Organization Structure — controller exports', () => {
  const controllerPath = resolve(__dirname, '../domains/identity/unitsController.ts');
  const ctrl = readFileSync(controllerPath, 'utf8');

  const EXPECTED_EXPORTS = [
    'listUnits', 'getUnit', 'getUnitStats', 'getUnitChildren',
    'createUnit', 'updateUnit', 'archiveUnit', 'deleteUnit', 'restoreUnit',
    'getUnitMembers', 'addUnitMember', 'removeUnitMember',
    'getUnitBrands', 'linkUnitBrand', 'unlinkUnitBrand',
    'getUnitActivity',
    'getUnitEvidenceScope', 'setUnitEvidenceScope', 'deleteUnitEvidenceScope',
    'getAvailableMembers',
  ];

  for (const fn of EXPECTED_EXPORTS) {
    it(`exports ${fn}`, () => {
      expect(ctrl).toContain(`export const ${fn} =`);
    });
  }

  it('validates parent_id on create (validateParentUnit referenced)', () => {
    expect(ctrl).toContain('validateParentUnit');
  });

  it('prevents circular references on parent_id update', () => {
    expect(ctrl.toLowerCase()).toContain('circular');
  });

  it('logs unit activity on create/update/archive/restore/delete', () => {
    expect(ctrl).toContain('business_unit_activity_log');
  });
});

describe('Business Unit ID — cross-domain wiring', () => {
  const checkWiring = (domainPath: string, filename: string, label: string) => {
    const content = readFileSync(resolve(__dirname, domainPath, filename), 'utf8');
    it(`${label} references business_unit_id`, () => {
      expect(content).toContain('business_unit_id');
    });
  };

  checkWiring('../domains/campaigns', 'campaignsController.ts', 'Campaigns controller');
  checkWiring('../domains/agents', 'agentController.ts', 'Agents controller');
  checkWiring('../domains/agents', 'workflowController.ts', 'Workflow controller');
  checkWiring('../domains/governance', 'governanceController.ts', 'Governance controller');
  checkWiring('../domains/decisions', 'approvalV2Controller.ts', 'Approval V2 controller');
  checkWiring('../services', 'approval.service.ts', 'Approval service');
  checkWiring('../services', 'approvalRules.service.ts', 'Approval rules service');
  checkWiring('../services', 'workflowTemplate.service.ts', 'Workflow template service');

  it('all migrations reference business_unit_id', () => {
    const migrations = [
      resolve(__dirname, '../../../db_migrations/74_wire_campaigns_business_unit.sql'),
      resolve(__dirname, '../../../db_migrations/75_wire_workflows_business_unit.sql'),
      resolve(__dirname, '../../../db_migrations/76_wire_agents_business_unit.sql'),
      resolve(__dirname, '../../../db_migrations/77_wire_governance_business_unit.sql'),
    ];
    for (const m of migrations) {
      const sql = readFileSync(m, 'utf8');
      expect(sql).toContain('business_unit_id');
    }
  });
});
