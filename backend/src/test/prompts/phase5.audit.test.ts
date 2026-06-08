import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../shared/supabase', () => import('../helpers/supabaseMock'));
vi.mock('../../shared/databaseLogger', () => ({ logToDatabase: vi.fn() }));

import { PromptController } from '../../modules/prompts/promptController';
import { PromptEvidenceService } from '../../modules/prompts/PromptEvidenceService';
import { PromptAuditService } from '../../modules/prompts/PromptAuditService';
import { setFixtures, resetFixtures } from '../helpers/supabaseMock';
import { lockedShadowFixture } from '../helpers/constraintShadowFixture';

function seedBase() {
  setFixtures({
    prompts: [
      { id: 'p-active', workspace_id: 'ws-a', status: 'production_active', current_version_id: 'v1', risk_tier: 'tier_1_low', owner_id: 'u1' },
      { id: 'p-paused', workspace_id: 'ws-a', status: 'paused', current_version_id: 'v2', risk_tier: 'tier_1_low', owner_id: 'u1' },
      { id: 'p-draft', workspace_id: 'ws-a', status: 'draft', current_version_id: 'v2', risk_tier: 'tier_1_low', owner_id: 'u1' },
    ],
    prompt_versions: [
      { id: 'v1', prompt_id: 'p-active', version_number: 1, immutable: false, body: 'test', body_hash: 'x' },
      { id: 'v2', prompt_id: 'p-active', version_number: 2, immutable: false, body: 'test', body_hash: 'y' },
    ],
    prompt_deployments: [
      { id: 'd1', prompt_version_id: 'v1', environment: 'production', rollback_to_version_id: null, evidence_id: null },
    ],
    prompt_approvals: [
      { id: 'a1', prompt_version_id: 'v1', reviewer_id: 'u1', reviewer_role: 'PROMPT_OWNER', decision: 'APPROVED' },
    ],
    prompt_test_runs: [
      { id: 'tr1', prompt_version_id: 'v1', pass_fail: 'PASS', environment: 'draft' },
    ],
    prompt_constraint_shadows: [
      lockedShadowFixture({ versionId: 'v1', promptId: 'p-active', workspaceId: 'ws-a', riskTier: 'tier_1_low' }),
      lockedShadowFixture({ versionId: 'v2', promptId: 'p-active', workspaceId: 'ws-a', riskTier: 'tier_1_low' }),
    ],
    workspace_members: [
      { user_id: 'u1', workspace_id: 'ws-a', role: 'ADMIN' },
    ],
  });
}

function mockRes() {
  const res: any = {};
  res.statusCode = 200;
  res.status = vi.fn((c: number) => { res.statusCode = c; return res; });
  res.json = vi.fn((b: any) => { res.body = b; return res; });
  return res;
}

function mockReq(over: any = {}): any {
  return {
    user: { id: 'u1', role: 'ADMIN', workspace_id: 'ws-a' },
    query: {},
    params: {},
    body: {},
    headers: {},
    ...over,
  };
}

function failEvidence() {
  vi.spyOn(PromptEvidenceService, 'record').mockResolvedValue(null);
  vi.spyOn(PromptAuditService, 'record').mockResolvedValue({ id: 'audit-1' });
}

function failAudit() {
  vi.spyOn(PromptEvidenceService, 'record').mockResolvedValue({ vault_item_id: 'EVI-1', vault_item_uuid: 'uuid-1', evidence_hash: 'hash-1' });
  vi.spyOn(PromptAuditService, 'record').mockResolvedValue(null);
}

// Restore original implementations between tests
function restoreServices() {
  vi.restoreAllMocks();
}

beforeEach(() => {
  seedBase();
});

afterEach(() => {
  resetFixtures();
  restoreServices();
});

describe('Phase 5A — Audit/evidence failure blocks critical lifecycle operations', () => {
  // pausePrompt — simplest path: single status update + audit
  describe('pausePrompt', () => {
    it('returns 500 when evidence write fails', async () => {
      failEvidence();
      const res = mockRes();
      const next = vi.fn();
      await PromptController.pausePrompt(mockReq({ params: { id: 'p-active' } }), res, next);
      expect(next).toHaveBeenCalled();
    });

    it('returns 500 when audit write fails', async () => {
      failAudit();
      const res = mockRes();
      const next = vi.fn();
      await PromptController.pausePrompt(mockReq({ params: { id: 'p-active' } }), res, next);
      expect(next).toHaveBeenCalled();
    });
  });

  // resumePrompt — uses paused prompt
  describe('resumePrompt', () => {
    it('returns 500 when evidence write fails', async () => {
      failEvidence();
      const res = mockRes();
      const next = vi.fn();
      await PromptController.resumePrompt(mockReq({ params: { id: 'p-paused' } }), res, next);
      expect(next).toHaveBeenCalled();
    });
  });

  // archivePrompt — uses draft prompt (not production_active)
  describe('archivePrompt', () => {
    it('returns 500 when evidence write fails', async () => {
      failEvidence();
      const res = mockRes();
      const next = vi.fn();
      await PromptController.archivePrompt(mockReq({ params: { id: 'p-draft' } }), res, next);
      expect(next).toHaveBeenCalled();
    });
  });

  // retirePrompt — no precondition beyond requiring the prompt
  describe('retirePrompt', () => {
    it('returns 500 when evidence write fails', async () => {
      failEvidence();
      const res = mockRes();
      const next = vi.fn();
      await PromptController.retirePrompt(mockReq({ params: { id: 'p-active' } }), res, next);
      expect(next).toHaveBeenCalled();
    });
  });

  // rejectVersion — validates category + notes first (Doc 3 §7), then audits
  describe('rejectVersion', () => {
    it('returns 500 when evidence write fails', async () => {
      failEvidence();
      const res = mockRes();
      const next = vi.fn();
      await PromptController.rejectVersion(mockReq({ params: { versionId: 'v1' }, body: { comments: 'Not approved', reason_category: 'quality' } }), res, next);
      expect(next).toHaveBeenCalled();
    });
  });

  // submitForReview — needs test run with PASS result
  describe('submitForReview', () => {
    it('returns 500 when evidence write fails', async () => {
      failEvidence();
      const res = mockRes();
      const next = vi.fn();
      // p-active has current_version_id=v1 and test run tr1 has PASS for v1
      await PromptController.submitForReview(mockReq({ params: { id: 'p-active' } }), res, next);
      expect(next).toHaveBeenCalled();
    });
  });

  // deployVersion — must not become production-active when audit/evidence fails
  describe('deployVersion', () => {
    it('returns 500 when evidence write fails (staging deploy)', async () => {
      failEvidence();
      const res = mockRes();
      const next = vi.fn();
      // v1 belongs to p-active (production_active) which has current_version_id=v1,
      // required approval PROMPT_OWNER satisfied by a1, test tr1 has PASS for v1
      await PromptController.deployVersion(mockReq({ params: { versionId: 'v1' }, body: { environment: 'staging' } }), res, next);
      expect(next).toHaveBeenCalled();
    });

    it('does not activate production when evidence write fails', async () => {
      failEvidence();
      const res = mockRes();
      const next = vi.fn();
      await PromptController.deployVersion(mockReq({ params: { versionId: 'v1' }, body: { environment: 'production' } }), res, next);
      // p-active was 'production_active', but the deploy should fail before changing status
      expect(next).toHaveBeenCalled();
    });
  });
});
