import { supabaseAdmin } from '../../shared/supabase';
import { logger } from '../../shared/logger';
import {
  runPostValidation,
  toPostInput,
  findingsToSteps,
} from './validation/orchestrator';
import {
  POSSIBILITY_BY_KEY,
  PROMPT_LABELS,
} from './PostGovernanceService.types';

// ─────────────────────────────────────────────────────────────────────────────
// Post Governance Service
//
// Thin façade over the post-validation orchestrator (validation/). It:
//   1. Normalizes a post into a PostInput and runs the six governed agents
//      (General Content, Image, Approval Rules, Policy, Evidence/KB, Platform).
//   2. Maps the aggregated outcome onto the five governance possibilities.
//   3. Activates the matching governed prompt (DRAFT → PRODUCTION_ACTIVE),
//      tracks workflow/agent/usage, and records a test run.
//
// The detection logic itself lives in the individual agents; this file owns the
// prompt-record lifecycle and the public GovernanceResult contract.
// ─────────────────────────────────────────────────────────────────────────────

export type {
  GovernanceDecision,
  Possibility,
  KnowledgeMatch,
  GovernanceResult,
  PromptActivationRecord,
} from './PostGovernanceService.types';

import type {
  GovernanceResult,
  PromptActivationRecord,
} from './PostGovernanceService.types';

// ── Prompt name → canonical slug mapping for DB lookups ──────────────
const PROMPT_SLUG_BY_KEY: Record<string, string> = {
  BASIC_POST: 'basic_content_generator',
  FACTUAL_CLAIM_KB_FOUND: 'knowledge_verification_prompt',
  FACTUAL_CLAIM_NO_KB: 'factual_claim_validator',
  HIGH_RISK_CLAIM: 'high_risk_review_prompt',
  POLICY_VIOLATION: 'policy_violation_prompt',
};

/**
 * Prompt name → linked agent name mapping (from the spec).
 */
const PROMPT_AGENT: Record<string, string> = {
  BASIC_POST: 'General Content Agent',
  FACTUAL_CLAIM_KB_FOUND: 'Evidence / KB Agent',
  FACTUAL_CLAIM_NO_KB: 'General Content Agent',
  HIGH_RISK_CLAIM: 'Policy Check Agent',
  POLICY_VIOLATION: 'Policy Check Agent',
};

/**
 * Prompt name → linked workflow name.
 */
const PROMPT_WORKFLOW: Record<string, string> = {
  BASIC_POST: 'Post Governance Workflow',
  FACTUAL_CLAIM_KB_FOUND: 'Post Governance Workflow',
  FACTUAL_CLAIM_NO_KB: 'Post Governance Workflow',
  HIGH_RISK_CLAIM: 'Post Governance Workflow',
  POLICY_VIOLATION: 'Post Governance Workflow',
};

export class PostGovernanceService {

  /**
   * Classify a post description through the six-agent validation pipeline and
   * return a decision with the full evidence trail. Also activates the matching
   * governed prompt. Signature preserved for existing callers; richer post
   * artifacts (images, hashtags, links) can be passed via the optional `extra`.
   */
  static async classify(
    description: string,
    platform: string,
    workspaceId: string,
    extra?: {
      content?: string;
      heading?: string;
      hashtags?: string[];
      links?: string[];
      imageUrls?: string[];
      tenantId?: string;
    },
  ): Promise<GovernanceResult> {
    const post = toPostInput({ description, platform, workspaceId, ...(extra || {}) });
    const outcome = await runPostValidation(post);

    const possibility =
      POSSIBILITY_BY_KEY[outcome.possibilityKey] || POSSIBILITY_BY_KEY.BASIC_POST;
    const promptLabel = PROMPT_LABELS[outcome.possibilityKey] || PROMPT_LABELS.BASIC_POST;

    const result: GovernanceResult = {
      decision: outcome.decision,
      possibility,
      governed_prompt: { label: promptLabel },
      reason: outcome.reason,
      risk: outcome.risk,
      knowledge: outcome.knowledge,
      steps: findingsToSteps(outcome.findings),
    };

    await PostGovernanceService.activatePrompt(result, workspaceId);
    return result;
  }

  /**
   * Activate (or record usage on) the prompt matching the classified
   * possibility. Sets status to PRODUCTION_ACTIVE, updates linked workflow
   * + agent, and records last_used_at. If decision is BLOCK, records a
   * failed test run.
   */
  static async activatePrompt(
    result: GovernanceResult,
    workspaceId: string,
  ): Promise<PromptActivationRecord | null> {
    const possKey = result.possibility.key;
    const promptName = result.governed_prompt.label;
    const slug = PROMPT_SLUG_BY_KEY[possKey];
    if (!slug) return null;

    try {
      const { data: existing } = await supabaseAdmin
        .from('prompts')
        .select('id, name, status, linked_agent, linked_workflow, linked_agent_id, linked_workflow_id')
        .eq('workspace_id', workspaceId)
        .eq('name', promptName)
        .limit(1)
        .maybeSingle();

      if (!existing) {
        logger.warn({ name: promptName, workspaceId }, '[PostGovernance] Prompt not found for activation');
        return null;
      }

      const previousStatus = existing.status || 'draft';
      const now = new Date().toISOString();

      const agentName = PROMPT_AGENT[possKey] || existing.linked_agent || '';
      const workflowName = PROMPT_WORKFLOW[possKey] || existing.linked_workflow || '';
      const canActivate = previousStatus === 'draft' || previousStatus === 'paused' || previousStatus === 'retired' || previousStatus === 'archived';

      const update: Record<string, unknown> = {
        linked_agent: agentName,
        linked_workflow: workflowName,
        updated_at: now,
      };

      if (canActivate) {
        update.status = 'production_active';
      }

      if (result.decision === 'BLOCK' && previousStatus !== 'production_active') {
        update.status = 'production_active';
      }

      const { error: updateErr } = await supabaseAdmin
        .from('prompts')
        .update(update)
        .eq('id', existing.id);

      if (updateErr) {
        logger.warn({ err: updateErr, promptId: existing.id }, '[PostGovernance] Failed to update prompt status');
        return null;
      }

      // Best-effort: write usage metadata if the column exists
      try {
        const nowIso = now;
        const { data: currentMeta } = await supabaseAdmin
          .from('prompts')
          .select('metadata')
          .eq('id', existing.id)
          .limit(1)
          .maybeSingle();
        if (currentMeta) {
          const meta: Record<string, unknown> = currentMeta.metadata || {};
          meta.last_used_at = nowIso;
          // `working_since` marks the moment this prompt last did real work on a
          // post. The registry derives a live "Working" (green) state from how
          // recent this is — so the prompt visibly lights up while it governs a
          // post and settles back to "Active" once idle.
          meta.working_since = nowIso;
          meta.last_possibility = possKey;
          meta.last_decision = result.decision;
          meta.last_reason = result.reason;
          // The full validation chain — every agent the post passed through, in
          // order, with its verdict — so the Prompt Governance page can show all
          // agents instead of a single linked agent.
          meta.validation_agents = (result.steps || []).map((s) => ({
            name: s.name,
            result: s.result,
          }));
          meta.usage_count = ((meta.usage_count as number) || 0) + 1;
          // Wire the Knowledge Base sources this prompt actually consulted, so the
          // registry can show the live prompt → agent → workflow → KB-source chain
          // with real values rather than a static placeholder.
          if (result.knowledge?.checked) {
            meta.last_kb_status = result.knowledge.status;
            meta.linked_knowledge_sources = (result.knowledge.matches || []).map((m) => ({
              id: m.id,
              title: m.title,
              match_action: m.match_action || null,
            }));
          }
          if (result.decision === 'BLOCK') {
            meta.last_blocked_at = nowIso;
            meta.block_count = ((meta.block_count as number) || 0) + 1;
          }
          await supabaseAdmin.from('prompts').update({ metadata: meta }).eq('id', existing.id);
        }
      } catch {
        // metadata column may not exist yet; this is non-critical
      }

      // Record a test run
      await PostGovernanceService.recordTestRun(
        existing.id,
        workspaceId,
        result.decision,
        result.possibility.key,
      );

      logger.info(
        { promptId: existing.id, name: promptName, status: (update.status as string) || 'production_active', previousStatus, decision: result.decision },
        '[PostGovernance] Prompt activated',
      );

      return {
        prompt_id: existing.id,
        previous_status: previousStatus,
        new_status: (update.status as string) || 'production_active',
        linked_workflow: workflowName,
        linked_agent: agentName,
        last_used_at: now,
      };
    } catch (err) {
      logger.warn({ err, possKey }, '[PostGovernance] activatePrompt failed');
      return null;
    }
  }

  /**
   * Record a governance test run for the prompt. Passed for APPROVE,
   * Failed for BLOCK, Pending for REVIEW.
   */
  private static async recordTestRun(
    promptId: string,
    workspaceId: string,
    decision: string,
    possibilityKey: string,
  ): Promise<void> {
    try {
      const passFail = decision === 'APPROVE' ? 'PASS' : decision === 'BLOCK' ? 'FAIL' : 'PENDING';
      const score = decision === 'APPROVE' ? 95 : decision === 'BLOCK' ? 15 : 50;

      // Write the test run to the SAME version the registry/Test Center reads
      // (prompts.current_version_id). Fall back to the latest version only when
      // current_version_id is unset. A mismatch here is why blocked posts never
      // surfaced as failed tests in the Governance Test Center.
      const { data: promptRow } = await supabaseAdmin
        .from('prompts')
        .select('current_version_id')
        .eq('id', promptId)
        .maybeSingle();

      let versionId: string | undefined = promptRow?.current_version_id || undefined;
      if (!versionId) {
        const { data: version } = await supabaseAdmin
          .from('prompt_versions')
          .select('id')
          .eq('prompt_id', promptId)
          .order('version_number', { ascending: false })
          .limit(1)
          .maybeSingle();
        versionId = version?.id;
      }

      if (!versionId) return;

      await supabaseAdmin.from('prompt_test_runs').insert({
        prompt_version_id: versionId,
        pass_fail: passFail,
        score_summary: { score, decision, possibility: possibilityKey },
        environment: 'production',
        created_at: new Date().toISOString(),
      });
    } catch (err) {
      logger.warn({ err, promptId }, '[PostGovernance] recordTestRun failed');
    }
  }

  /**
   * Called when an operation finishes or is blocked. Moves the prompt
   * back to DRAFT (normal finish) or records a failed test (blocked).
   */
  static async finishOperation(
    promptId: string,
    workspaceId: string,
    outcome: 'completed' | 'blocked' | 'failed',
  ): Promise<void> {
    try {
      const now = new Date().toISOString();
      const { data: existing } = await supabaseAdmin
        .from('prompts')
        .select('metadata')
        .eq('id', promptId)
        .eq('workspace_id', workspaceId)
        .maybeSingle();

      if (!existing) return;

      const metadata: Record<string, unknown> = existing.metadata || {};
      metadata.last_finished_at = now;
      metadata.last_outcome = outcome;

      if (outcome === 'completed') {
        metadata.completion_count = ((metadata.completion_count as number) || 0) + 1;
      } else {
        metadata.fail_count = ((metadata.fail_count as number) || 0) + 1;
        await PostGovernanceService.recordTestRun(promptId, workspaceId, outcome === 'blocked' ? 'BLOCK' : 'REVIEW', 'unknown');
      }

      await supabaseAdmin
        .from('prompts')
        .update({ status: 'draft', metadata, updated_at: now })
        .eq('id', promptId);

      logger.info({ promptId, outcome }, '[PostGovernance] Operation finished, prompt returned to draft');
    } catch (err) {
      logger.warn({ err, promptId }, '[PostGovernance] finishOperation failed');
    }
  }
}
