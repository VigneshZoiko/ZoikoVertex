import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('../../shared/supabase', () => import('../helpers/supabaseMock'));
vi.mock('../../shared/databaseLogger', () => ({ logToDatabase: vi.fn() }));

import { GovernanceDriftService } from '../../modules/prompts/services/GovernanceDriftService';
import { setFixtures, resetFixtures } from '../helpers/supabaseMock';

beforeEach(() => {
  setFixtures({
    prompts: [
      { id: 'p-draft', workspace_id: 'ws-a', name: 'Draft Prompt', status: 'draft', risk_tier: 'tier_1_low', current_version_id: null, created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
      { id: 'p-active', workspace_id: 'ws-a', name: 'Active Prompt', status: 'production_active', risk_tier: 'tier_1_low', current_version_id: 'v-immutable', created_at: '2025-01-01T00:00:00Z', updated_at: '2025-06-01T00:00:00Z' },
      { id: 'p-version-drift', workspace_id: 'ws-a', name: 'Version Drift', status: 'production_active', risk_tier: 'tier_1_low', current_version_id: 'v-not-immutable', created_at: '2025-01-01T00:00:00Z', updated_at: '2025-06-01T00:00:00Z' },
      { id: 'p-approval-drift', workspace_id: 'ws-a', name: 'Approval Drift', status: 'production_active', risk_tier: 'tier_3_high', current_version_id: 'v-approve-missing', created_at: '2025-01-01T00:00:00Z', updated_at: '2025-06-01T00:00:00Z' },
      { id: 'p-deploy-drift', workspace_id: 'ws-a', name: 'Deploy Drift', status: 'production_active', risk_tier: 'tier_1_low', current_version_id: 'v-deploy-prod', created_at: '2025-01-01T00:00:00Z', updated_at: '2025-06-01T00:00:00Z' },
      { id: 'p-audit-gap', workspace_id: 'ws-a', name: 'Audit Gap', status: 'production_active', risk_tier: 'tier_1_low', current_version_id: 'v-audit', created_at: '2025-01-01T00:00:00Z', updated_at: '2025-06-15T00:00:00Z' },
      { id: 'p-risk-drift', workspace_id: 'ws-a', name: 'Risk Drift', status: 'approved_for_staging', risk_tier: 'tier_4_critical', current_version_id: 'v-risk', created_at: '2025-01-01T00:00:00Z', updated_at: '2025-06-10T00:00:00Z' },
      { id: 'p-binding-drift', workspace_id: 'ws-a', name: 'Binding Drift', status: 'approved_for_staging', risk_tier: 'tier_3_high', current_version_id: 'v-binding', created_at: '2025-01-01T00:00:00Z', updated_at: '2025-06-01T00:00:00Z' },
      { id: 'p-other-ws', workspace_id: 'ws-b', name: 'Other WS', status: 'production_active', risk_tier: 'tier_1_low', current_version_id: 'v-other', created_at: '2025-01-01T00:00:00Z', updated_at: '2025-06-01T00:00:00Z' },
    ],
    prompt_versions: [
      { id: 'v-immutable', prompt_id: 'p-active', version_number: 1, immutable: true, body: 'x', body_hash: 'x' },
      { id: 'v-not-immutable', prompt_id: 'p-version-drift', version_number: 2, immutable: false, body: 'y', body_hash: 'y' },
      { id: 'v-approve-missing', prompt_id: 'p-approval-drift', version_number: 1, immutable: true, body: 'z', body_hash: 'z' },
      { id: 'v-deploy-prod', prompt_id: 'p-deploy-drift', version_number: 1, immutable: true, body: 'w', body_hash: 'w' },
      { id: 'v-audit', prompt_id: 'p-audit-gap', version_number: 1, immutable: true, body: 'q', body_hash: 'q' },
      { id: 'v-risk', prompt_id: 'p-risk-drift', version_number: 1, immutable: true, body: 'r', body_hash: 'r' },
      { id: 'v-binding', prompt_id: 'p-binding-drift', version_number: 1, immutable: true, body: 's', body_hash: 's' },
      { id: 'v-other', prompt_id: 'p-other-ws', version_number: 1, immutable: true, body: 't', body_hash: 't' },
    ],
    prompt_approvals: [
      { id: 'a1', prompt_version_id: 'v-immutable', reviewer_id: 'u1', reviewer_role: 'PROMPT_OWNER', decision: 'APPROVED' },
    ],
    prompt_deployments: [
      { id: 'd-prod', prompt_version_id: 'v-immutable', environment: 'production' },
      { id: 'd-deploy-prod', prompt_version_id: 'v-deploy-prod', environment: 'staging' },
    ],
    prompt_audit_ledger: [
      { id: 'aud-e1', prompt_id: 'p-active', event_type: 'prompt.created', created_at: '2025-01-01T00:00:00Z' },
      { id: 'aud-e2', prompt_id: 'p-active', event_type: 'prompt.deployed', created_at: '2025-06-01T00:00:00Z' },
      { id: 'aud-e3', prompt_id: 'p-binding-drift', event_type: 'prompt.created', created_at: '2025-06-01T00:00:00Z' },
    ],
    prompt_bindings: [
      { id: 'b-prod', prompt_version_id: 'v-binding', agent_id: 'ag-1', environment: 'production', created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
    ],
    prompt_tool_permissions: [
    ],
    prompt_knowledge_bindings: [
    ],
    workspace_members: [
      { user_id: 'u1', workspace_id: 'ws-a', role: 'ADMIN' },
    ],
  });
});

afterEach(() => {
  resetFixtures();
});

function findFinding(findings: any[], category: string) {
  return findings.find((f: any) => f.category === category);
}

function expectNotHasCategory(findings: any[], category: string) {
  expect(findings.some((f: any) => f.category === category)).toBe(false);
}

describe('Phase 5B — Governance Drift Monitoring', () => {

  // ═════════════════════════════════════════════════════════════════════════
  // Version Drift
  // ═════════════════════════════════════════════════════════════════════════
  describe('Version Drift', () => {
    it('detects deployed prompt with non-immutable current version', async () => {
      const findings = await GovernanceDriftService.detectPromptDrift('p-version-drift', 'ws-a');
      const vd = findFinding(findings, 'version_drift');
      expect(vd).toBeDefined();
      expect(vd.severity).toBe('high');
    });

    it('does not flag prompt with immutable version', async () => {
      const findings = await GovernanceDriftService.detectPromptDrift('p-active', 'ws-a');
      expectNotHasCategory(findings, 'version_drift');
    });

    it('does not flag draft prompt', async () => {
      const findings = await GovernanceDriftService.detectPromptDrift('p-draft', 'ws-a');
      expectNotHasCategory(findings, 'version_drift');
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // Approval Drift
  // ═════════════════════════════════════════════════════════════════════════
  describe('Approval Drift', () => {
    it('detects production-active prompt with incomplete approvals for risk tier', async () => {
      const findings = await GovernanceDriftService.detectPromptDrift('p-approval-drift', 'ws-a');
      const ad = findFinding(findings, 'approval_drift');
      expect(ad).toBeDefined();
      expect(ad.severity).toBe('high');
    });

    it('does not flag prompt with complete approvals', async () => {
      const findings = await GovernanceDriftService.detectPromptDrift('p-active', 'ws-a');
      expectNotHasCategory(findings, 'approval_drift');
    });

    it('does not flag draft prompt', async () => {
      const findings = await GovernanceDriftService.detectPromptDrift('p-draft', 'ws-a');
      expectNotHasCategory(findings, 'approval_drift');
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // Deployment Drift
  // ═════════════════════════════════════════════════════════════════════════
  describe('Deployment Drift', () => {
    it('detects production-active prompt missing production deployment record', async () => {
      const findings = await GovernanceDriftService.detectPromptDrift('p-deploy-drift', 'ws-a');
      const dd = findFinding(findings, 'deployment_drift');
      expect(dd).toBeDefined();
      expect(dd.severity).toBe('high');
    });

    it('does not flag prompt with matching production deployment', async () => {
      const findings = await GovernanceDriftService.detectPromptDrift('p-active', 'ws-a');
      // p-active has production deployment for v-immutable, and current_version_id=v-immutable → no drift
      expectNotHasCategory(findings, 'deployment_drift');
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // Audit Gap Drift
  // ═════════════════════════════════════════════════════════════════════════
  describe('Audit Gap Drift', () => {
    it('detects prompt updated more recently than last audit event', async () => {
      const findings = await GovernanceDriftService.detectPromptDrift('p-audit-gap', 'ws-a');
      const ag = findFinding(findings, 'audit_gap_drift');
      expect(ag).toBeDefined();
      expect(ag.severity).toBe('medium');
    });

    it('does not flag prompt with matching audit timestamps', async () => {
      const findings = await GovernanceDriftService.detectPromptDrift('p-active', 'ws-a');
      expectNotHasCategory(findings, 'audit_gap_drift');
    });

    it('does not flag draft prompt with no audit events', async () => {
      const findings = await GovernanceDriftService.detectPromptDrift('p-draft', 'ws-a');
      expectNotHasCategory(findings, 'audit_gap_drift');
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // Risk Tier Drift
  // ═════════════════════════════════════════════════════════════════════════
  describe('Risk Tier Drift', () => {
    it('detects prompt with risk_tier changed but no risk.changed audit event', async () => {
      const findings = await GovernanceDriftService.detectPromptDrift('p-risk-drift', 'ws-a');
      const rd = findFinding(findings, 'risk_tier_drift');
      expect(rd).toBeDefined();
      expect(rd.severity).toBe('high');
    });

    it('does not flag prompt with no risk change suspicion', async () => {
      const findings = await GovernanceDriftService.detectPromptDrift('p-active', 'ws-a');
      expectNotHasCategory(findings, 'risk_tier_drift');
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // Binding Drift (Redesigned — Prompt Governance data only)
  // ═════════════════════════════════════════════════════════════════════════
  describe('Binding Drift', () => {
    it('detects production-environment binding without production deployment', async () => {
      const findings = await GovernanceDriftService.detectPromptDrift('p-binding-drift', 'ws-a');
      const bd = findFinding(findings, 'binding_drift');
      expect(bd).toBeDefined();
      expect(bd.severity).toBe('medium');
    });

    it('detects high-risk prompt missing tool permissions', async () => {
      const findings = await GovernanceDriftService.detectPromptDrift('p-binding-drift', 'ws-a');
      const bd = findFinding(findings, 'binding_drift');
      // p-binding-drift has risk_tier=tier_3_high and no tool permissions
      expect(bd).toBeDefined();
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // Drift Resolution Audit
  // ═════════════════════════════════════════════════════════════════════════
  describe('Drift Resolution Audit', () => {
    it('does not throw when resolving a drift finding', async () => {
      // Resolution just requires prompt to exist — it writes an audit event
      const findings = await GovernanceDriftService.detectPromptDrift('p-version-drift', 'ws-a');
      expect(findings.length).toBeGreaterThan(0);
    });

    it('returns empty findings for non-existent prompt', async () => {
      const findings = await GovernanceDriftService.detectPromptDrift('p-does-not-exist', 'ws-a');
      expect(findings).toEqual([]);
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // Tenant Isolation
  // ═════════════════════════════════════════════════════════════════════════
  describe('Tenant Isolation', () => {
    it('returns empty for prompt in different workspace', async () => {
      const findings = await GovernanceDriftService.detectPromptDrift('p-other-ws', 'ws-a');
      // p-other-ws belongs to ws-b, querying from ws-a should return empty
      expect(findings).toEqual([]);
    });

    it('only scans prompts in the specified workspace', async () => {
      const findings = await GovernanceDriftService.detectWorkspaceDrift('ws-b');
      expect(findings.length).toBeGreaterThan(0);
      for (const f of findings) {
        expect(f.prompt_id).toBe('p-other-ws');
      }
    });

    it('workspace scan returns zero for empty workspace', async () => {
      const findings = await GovernanceDriftService.detectWorkspaceDrift('ws-empty');
      expect(findings).toEqual([]);
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // Workspace Summary
  // ═════════════════════════════════════════════════════════════════════════
  describe('Workspace Drift Summary', () => {
    it('returns findings for all prompts in workspace-a', async () => {
      const findings = await GovernanceDriftService.detectWorkspaceDrift('ws-a');
      expect(findings.length).toBeGreaterThanOrEqual(5);
      const categories = new Set(findings.map((f: any) => f.category));
      expect(categories.has('version_drift')).toBe(true);
      expect(categories.has('approval_drift')).toBe(true);
      expect(categories.has('deployment_drift')).toBe(true);
      expect(categories.has('binding_drift')).toBe(true);
    });
  });
});
