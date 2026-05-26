/* eslint-disable @typescript-eslint/no-explicit-any */
import { Response, NextFunction } from 'express';
import { supabaseAdmin } from '../../shared/supabase';
import { AuthRequest } from '../../shared/authMiddleware';
import { PromptService } from './PromptService';
import { PromptVersionService } from './PromptVersionService';
import { PromptTestService } from './PromptTestService';
import { PromptApprovalService } from './PromptApprovalService';
import { PromptDeploymentService } from './PromptDeploymentService';
import { PromptBindingService } from './PromptBindingService';
import { getParam, getQueryValue } from '../../shared/request';

export class PromptController {

  private static async getWorkspaceId(userId: string | undefined): Promise<string> {
    if (!userId) throw new Error('Unauthorized');
    const { data: member } = await supabaseAdmin
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();
    if (!member) throw new Error('Workspace not found');
    return member.workspace_id;
  }

  // ─── Prompt CRUD ────────────────────────────────────────────────────────

  static async listPrompts(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const workspaceId = await PromptController.getWorkspaceId(req.user?.id);
      const data = await PromptService.list(workspaceId, {
        status: getQueryValue(req, 'status'),
        risk_tier: getQueryValue(req, 'risk_tier'),
        prompt_type: getQueryValue(req, 'prompt_type'),
      });
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async getPrompt(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await PromptService.getById(getParam(req, 'id'));
      if (!data) return res.status(404).json({ error: 'Prompt not found' });
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async createPrompt(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const workspaceId = await PromptController.getWorkspaceId(req.user?.id);
      const data = await PromptService.create({
        ...req.body,
        workspace_id: workspaceId,
        owner_id: req.user?.id,
        owner_name: req.user?.email || req.user?.id,
        created_by: req.user?.id,
      });
      await PromptVersionService.create({
        prompt_id: data.id,
        body: req.body.body || req.body.initial_body || `Prompt draft for ${data.name}\n\nPurpose: ${data.description || 'Define the governed instruction set.'}`,
        variables_json: req.body.variables_json,
        guardrails_json: req.body.guardrails_json,
        model_routes_json: req.body.model_routes_json,
        change_summary: 'Initial draft version',
        created_by: req.user?.id,
      });
      await PromptTestService.createSuite({
        prompt_id: data.id,
        suite_name: 'Default Governance Suite',
        required_for_risk_tier: [data.risk_tier || 'TIER_2_MEDIUM'],
        scenario_count: 1,
        evaluator_config: { bootstrap: true },
      }).catch(() => null);
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async updatePrompt(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await PromptService.update(getParam(req, 'id'), req.body);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async getPromptStats(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const workspaceId = await PromptController.getWorkspaceId(req.user?.id);
      const stats = await PromptService.getStats(workspaceId);
      res.json({ success: true, data: stats });
    } catch (error) {
      next(error);
    }
  }

  static async clonePrompt(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await PromptService.clone(getParam(req, 'id'), req.user?.id);
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  // ─── Lifecycle Actions ──────────────────────────────────────────────────

  static async pausePrompt(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await PromptService.updateStatus(getParam(req, 'id'), 'PAUSED');
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async resumePrompt(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await PromptService.updateStatus(getParam(req, 'id'), 'PRODUCTION_ACTIVE');
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async archivePrompt(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await PromptService.updateStatus(getParam(req, 'id'), 'ARCHIVED');
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async retirePrompt(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await PromptService.updateStatus(getParam(req, 'id'), 'RETIRED');
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  // ─── Versions ───────────────────────────────────────────────────────────

  static async listVersions(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await PromptVersionService.listByPrompt(getParam(req, 'id'));
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async createVersion(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await PromptVersionService.create({
        prompt_id: getParam(req, 'id'),
        body: req.body.body || '',
        variables_json: req.body.variables_json,
        guardrails_json: req.body.guardrails_json,
        model_routes_json: req.body.model_routes_json,
        change_summary: req.body.change_summary || '',
        created_by: req.user?.id,
      });
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async getVersion(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await PromptVersionService.getById(getParam(req, 'versionId'));
      if (!data) return res.status(404).json({ error: 'Version not found' });
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  // ─── Lifecycle State Transitions ────────────────────────────────────────

  static async submitForReview(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const promptId = getParam(req, 'id');
      await PromptService.updateStatus(promptId, 'REVIEW_REQUESTED');
      const data = await PromptService.getById(promptId);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async approveVersion(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const versionId = getParam(req, 'versionId');
      const version = await PromptVersionService.getById(versionId);
      if (!version) return res.status(404).json({ error: 'Version not found' });

      // Derive reviewer_role from authenticated user first, then body fallback, then default
      const reviewerRole = req.user?.role
        ? req.user.role.toUpperCase().replace(/\s+/g, '_')
        : req.body.reviewer_role || 'PROMPT_OWNER';

      await PromptApprovalService.create({
        prompt_version_id: versionId,
        reviewer_id: req.user?.id,
        reviewer_role: reviewerRole,
        decision: 'APPROVED',
        decision_reason: req.body.comments || '',
      });

      await PromptService.updateStatus(version.prompt_id, 'APPROVED_STAGING');

      res.json({ success: true, message: 'Version approved for staging' });
    } catch (error) {
      next(error);
    }
  }

  static async rejectVersion(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const versionId = getParam(req, 'versionId');
      const version = await PromptVersionService.getById(versionId);
      if (!version) return res.status(404).json({ error: 'Version not found' });

      // Derive reviewer_role from authenticated user first, then body fallback, then default
      const reviewerRole = req.user?.role
        ? req.user.role.toUpperCase().replace(/\s+/g, '_')
        : req.body.reviewer_role || 'PROMPT_OWNER';

      await PromptApprovalService.create({
        prompt_version_id: versionId,
        reviewer_id: req.user?.id,
        reviewer_role: reviewerRole,
        decision: 'REJECTED',
        decision_reason: req.body.comments || '',
      });

      await PromptService.updateStatus(version.prompt_id, 'DRAFT');

      res.json({ success: true, message: 'Version rejected' });
    } catch (error) {
      next(error);
    }
  }

  static async deployVersion(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const versionId = getParam(req, 'versionId');
      const version = await PromptVersionService.getById(versionId);
      if (!version) return res.status(404).json({ error: 'Version not found' });

      const environment = req.body.environment || 'staging';

      await PromptDeploymentService.create({
        prompt_version_id: versionId,
        environment,
        scope_json: req.body.scope || {},
        deployed_by: req.user?.id,
        release_note: req.body.release_note || '',
      });

      if (environment === 'production') {
        await PromptService.updateStatus(version.prompt_id, 'PRODUCTION_ACTIVE');
        await PromptVersionService.markImmutable(versionId);
      } else if (environment === 'staging') {
        await PromptService.updateStatus(version.prompt_id, 'APPROVED_STAGING');
      }

      res.json({ success: true, message: `Deployed to ${environment}` });
    } catch (error) {
      next(error);
    }
  }

  // ─── Rollback ───────────────────────────────────────────────────────────

  static async rollbackPrompt(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const promptId = getParam(req, 'id');
      const prompt = await PromptService.getById(promptId);
      if (!prompt) return res.status(404).json({ error: 'Prompt not found' });

      // Find the last production deployment that has rollback target
      const { data: deployments } = await supabaseAdmin
        .from('prompt_deployments')
        .select('*')
        .eq('environment', 'production')
        .order('created_at', { ascending: false })
        .limit(1);

      if (!deployments?.[0]) return res.status(400).json({ error: 'No production deployments to rollback from' });

      const result = await PromptDeploymentService.rollback(deployments[0].id, req.user?.id);
      await PromptService.updateStatus(promptId, 'PRODUCTION_ACTIVE');

      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  // ─── Tests ──────────────────────────────────────────────────────────────

  static async listTestSuites(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await PromptTestService.listSuites(getParam(req, 'id'));
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async createTestSuite(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await PromptTestService.createSuite({
        prompt_id: getParam(req, 'id'),
        ...req.body,
      });
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async listTestRuns(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await PromptTestService.listRuns(getParam(req, 'versionId'));
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async runTests(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const versionId = getParam(req, 'versionId');
      const version = await PromptVersionService.getById(versionId);
      if (!version) return res.status(404).json({ error: 'Version not found' });

      const { data: suites } = await supabaseAdmin
        .from('prompt_test_suites')
        .select('id, suite_name')
        .eq('prompt_id', version.prompt_id);

      const ensuredSuites = suites && suites.length > 0
        ? suites
        : [await PromptTestService.createSuite({
            prompt_id: version.prompt_id,
            suite_name: 'Default Governance Suite',
            required_for_risk_tier: ['TIER_1_LOW', 'TIER_2_MEDIUM', 'TIER_3_HIGH', 'TIER_4_CRITICAL'],
            scenario_count: 1,
            evaluator_config: { bootstrap: true },
          })];

      const runs = await Promise.all(ensuredSuites.map(async (suite: any) => {
        return PromptTestService.createRun({
          prompt_version_id: versionId,
          suite_id: suite.id,
          environment: req.body.environment || 'draft',
          score_summary: req.body.score_summary || { score: 85 },
          run_metadata: { triggered_by: req.user?.id, automated: false },
          created_by: req.user?.id,
        });
      }));

      const allPass = runs.every(r => r.pass_fail === 'PASS');
      if (allPass && version.prompt_id) {
        await PromptService.updateStatus(version.prompt_id, 'INTERNAL_TEST');
      }

      res.status(201).json({ success: true, data: runs });
    } catch (error) {
      next(error);
    }
  }

  // ─── Approvals ──────────────────────────────────────────────────────────

  static async listApprovals(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const versionId = getParam(req, 'versionId');
      const data = await PromptApprovalService.listByVersion(versionId);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async getApprovalStats(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await PromptApprovalService.getApprovalStats();
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  // ─── Deployments ────────────────────────────────────────────────────────

  static async listDeployments(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const versionId = getParam(req, 'versionId');
      const data = await PromptDeploymentService.listByVersion(versionId);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  // ─── Bindings ───────────────────────────────────────────────────────────

  static async listBindings(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const versionId = getParam(req, 'versionId');
      const data = await PromptBindingService.listByVersion(versionId);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async createBinding(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const versionId = getParam(req, 'versionId');
      const data = await PromptBindingService.create({
        prompt_version_id: versionId,
        ...req.body,
      });
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async listKnowledgeBindings(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const versionId = getParam(req, 'versionId');
      const data = await PromptBindingService.listKnowledgeBindings(versionId);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async createKnowledgeBinding(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const versionId = getParam(req, 'versionId');
      const data = await PromptBindingService.createKnowledgeBinding({
        prompt_version_id: versionId,
        ...req.body,
      });
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async listToolPermissions(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const versionId = getParam(req, 'versionId');
      const data = await PromptBindingService.listToolPermissions(versionId);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async createToolPermission(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const versionId = getParam(req, 'versionId');
      const data = await PromptBindingService.createToolPermission({
        prompt_version_id: versionId,
        ...req.body,
      });
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}
