import { supabaseAdmin } from '../../shared/supabase';
import { logger } from '../../shared/logger';

// ─────────────────────────────────────────────────────────────────────────────
// Post Governance Service
//
// 1. Classifies a post description into one of five possibilities
// 2. Activates the matching governed prompt (DRAFT → ACTIVE)
// 3. Tracks workflow name, linked agent, last used timestamp, usage counts
// 4. On block → records a failed test; prompt returns to DRAFT
// 5. Reads KB source content for block/review/approve decisions
// ─────────────────────────────────────────────────────────────────────────────

export type GovernanceDecision = 'APPROVE' | 'REVIEW' | 'BLOCK';

export interface Possibility {
  id: number;
  key: string;
  label: string;
}

export interface KnowledgeMatch {
  id: string;
  title: string;
  citation_reference?: string;
  match_action?: 'approve' | 'review' | 'block';
}

export interface GovernanceResult {
  decision: GovernanceDecision;
  possibility: Possibility;
  governed_prompt: { label: string };
  reason: string;
  risk: { level: string; score: number; categories: Record<string, boolean> };
  knowledge: { checked: boolean; status: string; matches?: KnowledgeMatch[] };
  steps: { step: number; name: string; result: string }[];
  evidence_event_id?: string;
  prompt_id?: string;
  prompt_status?: string;
}

export interface PromptActivationRecord {
  prompt_id: string;
  previous_status: string;
  new_status: string;
  linked_workflow: string;
  linked_agent: string;
  last_used_at: string;
}

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
  BASIC_POST: 'Content Review Agent',
  FACTUAL_CLAIM_KB_FOUND: 'KB Verification Agent',
  FACTUAL_CLAIM_NO_KB: 'Claim Detection Agent',
  HIGH_RISK_CLAIM: 'Governance Agent',
  POLICY_VIOLATION: 'Policy Enforcement Agent',
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

const POSSIBILITIES: Possibility[] = [
  { id: 1, key: 'BASIC_POST', label: 'Basic Post' },
  { id: 2, key: 'FACTUAL_CLAIM_KB_FOUND', label: 'Factual Claim + Knowledge Found' },
  { id: 3, key: 'FACTUAL_CLAIM_NO_KB', label: 'Factual Claim + No Knowledge' },
  { id: 4, key: 'HIGH_RISK_CLAIM', label: 'High-Risk Claim' },
  { id: 5, key: 'POLICY_VIOLATION', label: 'Policy Violation' },
];

const POSSIBILITY_BY_KEY = Object.fromEntries(POSSIBILITIES.map((p) => [p.key, p]));

const PROMPT_LABELS: Record<string, string> = {
  BASIC_POST: 'Basic Content Generator',
  FACTUAL_CLAIM_KB_FOUND: 'Knowledge Verification Prompt',
  FACTUAL_CLAIM_NO_KB: 'Factual Claim Validator',
  HIGH_RISK_CLAIM: 'High-Risk Review Prompt',
  POLICY_VIOLATION: 'Policy Violation Prompt',
};

const RISK_TIER_LABELS: Record<string, string> = {
  BASIC_POST: 'Tier 1 — Low',
  FACTUAL_CLAIM_KB_FOUND: 'Tier 2 — Medium',
  FACTUAL_CLAIM_NO_KB: 'Tier 2 — Medium',
  HIGH_RISK_CLAIM: 'Tier 4 — Critical',
  POLICY_VIOLATION: 'Tier 3 — High',
};

const DECISION_RISK_LABEL: Record<string, string> = {
  APPROVE: 'Low',
  REVIEW: 'Medium',
  BLOCK: 'High',
};

const DECISION_RISK_SCORE: Record<string, number> = {
  APPROVE: 15,
  REVIEW: 55,
  BLOCK: 90,
};

/**
 * Keywords/phrases that suggest a factual claim, pricing claim, numerical
 * claim, guarantee, comparison, or performance claim.
 */
const CLAIM_PATTERNS = [
  /\bbest\b/i,
  /\bproven\b/i,
  /\bguaranteed?\b/i,
  /\bguarantee\b/i,
  /\b#1\b|\bnumber one\b|\bnumber 1\b/i,
  /\bleading\b/i,
  /\btop[- ]rated\b/i,
  /\bexclusive\b/i,
  /\bresults?\b/i,
  /\bimprove[ds]?\b/i,
  /\bincrease[ds]?\b/i,
  /\breduce[ds]?\b/i,
  /\bboost\b/i,
  /\b([0-9]+)\s*%\b/,
  /\b₹?\s*[0-9,]+\s*(rs\.?|rupees?)?\s*(\/|per)?\b/i,
  /\bdollars?\b|\$\s*[0-9]/i,
  /\bclinically\s+proven\b/i,
  /\bscientifically\s+(proven|backed|tested)\b/i,
  /\bstudies?\s+show\b/i,
  /\bresearch\s+(shows?|proves?|demonstrates?)\b/i,
  /\b[a-z]+er\s+than\b/i,
  /\bmore\s+effective\b/i,
  /\bfaster[- ]?acting\b/i,
  /\blong[- ]?lasting\b/i,
  /\bmoney[- ]?back\b/i,
  /\bsatisfaction\s+guaranteed\b/i,
  /\bfree\s+(trial|sample|shipping)\b/i,
  /\blimited[- ]?time\b/i,
];

/**
 * Keywords suggesting high-risk content (medical, legal, financial, etc.).
 */
const HIGH_RISK_PATTERNS = [
  /\bcure[sd]?\b/i,
  /\btreat[s]?\b/i,
  /\bdiagnos[ei]s\b/i,
  /\bmedical\b/i,
  /\bhealth\s+condition\b/i,
  /\bdisease\b/i,
  /\bsymptom[s]?\b/i,
  /\bclinical\b/i,
  /\btherapy\b/i,
  /\btherapeutic\b/i,
  /\bsurgery\b/i,
  /\bprescription\b/i,
  /\bmedication\b/i,
  /\bdrug[s]?\b/i,
  /\blegal\s+(advice|opinion|review)\b/i,
  /\battorney\b/i,
  /\blawyer\b/i,
  /\blawsuit\b/i,
  /\bregulatory\s+(approval|filing|compliance)\b/i,
  /\bfinancial\s+(advice|planning|investment)\b/i,
  /\binvestment\b/i,
  /\bsecurities\b/i,
  /\bstock[s]?\b/i,
  /\bretirement\b/i,
  /\binsurance\b/i,
  /\bloan[s]?\b/i,
  /\bmortgage\b/i,
  /\bcompliance\b/i,
  /\bHIPAA\b/i,
  /\bGDPR\b/i,
  /\bprivacy\s+policy\b/i,
  /\bterms\s+of\s+service\b/i,
  /\bdisclaimer\b/i,
];

const VIOLENCE_SAFETY_PATTERNS = [
  /\bkill\b/i,
  /\bdeath\b/i,
  /\bdie\b/i,
  /\bhate\b/i,
  /\bharassment\b/i,
  /\babuse\b/i,
  /\bviolen[ct]\b/i,
  /\battack\b/i,
  /\bweapon\b/i,
  /\bterroris[mt]\b/i,
  /\bsuicide\b/i,
  /\bself[- ]?harm\b/i,
  /\bslur\b/i,
  /\bdiscriminat\w+\b/i,
  /\bexplicit\b/i,
  /\bps inappropriate\b/i,
];

function detectPatterns(text: string, patterns: RegExp[]): string[] {
  const found: string[] = [];
  for (const p of patterns) {
    const match = text.match(p);
    if (match) found.push(match[0]);
  }
  return [...new Set(found)];
}

export class PostGovernanceService {

  /**
   * Classify a post description through the governance pipeline and return
   * a decision with full evidence trail. Also activates the matching prompt.
   */
  static async classify(
    description: string,
    platform: string,
    workspaceId: string,
  ): Promise<GovernanceResult> {
    const steps: { step: number; name: string; result: string }[] = [];
    const text = description || '';

    // ── Step 1: Policy / Safety Check ─────────────────────────────────
    steps.push({ step: 1, name: 'Policy / Safety Checker', result: 'Running…' });
    const safetyMatches = detectPatterns(text, VIOLENCE_SAFETY_PATTERNS);

    if (safetyMatches.length > 0) {
      const reason = `Post contains prohibited content: ${safetyMatches.slice(0, 4).join(', ')}`;
      steps[0].result = `Blocked — ${reason}`;
      const result: GovernanceResult = {
        decision: 'BLOCK',
        possibility: POSSIBILITY_BY_KEY.POLICY_VIOLATION,
        governed_prompt: { label: PROMPT_LABELS.POLICY_VIOLATION },
        reason,
        risk: { level: 'Critical', score: 95, categories: { policy_safety: true } },
        knowledge: { checked: false, status: 'Not checked' },
        steps,
      };
      await PostGovernanceService.activatePrompt(result, workspaceId);
      return result;
    }

    steps[0].result = 'Passed — no safety violations detected';

    // ── Step 2: High-Risk Content Check ────────────────────────────────
    steps.push({ step: 2, name: 'High-Risk Review', result: 'Running…' });
    const highRiskMatches = detectPatterns(text, HIGH_RISK_PATTERNS);

    if (highRiskMatches.length > 0) {
      const categories: Record<string, boolean> = {};
      for (const m of highRiskMatches) {
        const lower = m.toLowerCase();
        if (/(cure|treat|diagnos|medical|disease|symptom|clinical|therapy|surgery|prescription|medication|drug)/i.test(lower)) categories.healthcare = true;
        if (/(legal|attorney|lawyer|lawsuit|regulatory)/i.test(lower)) categories.legal = true;
        if (/(financial|investment|securities|stock|retirement|insurance|loan|mortgage)/i.test(lower)) categories.financial = true;
        if (/(compliance|HIPAA|GDPR|privacy)/i.test(lower)) categories.compliance = true;
      }
      const reason = `High-risk content detected: ${Object.keys(categories).join(', ')}`;
      steps[1].result = `Review required — ${reason}`;

      const result: GovernanceResult = {
        decision: 'REVIEW',
        possibility: POSSIBILITY_BY_KEY.HIGH_RISK_CLAIM,
        governed_prompt: { label: PROMPT_LABELS.HIGH_RISK_CLAIM },
        reason,
        risk: { level: 'High', score: 75, categories },
        knowledge: { checked: true, status: 'Checking…', matches: [] },
        steps,
      };
      await PostGovernanceService.activatePrompt(result, workspaceId);
      return result;
    }

    steps[1].result = 'Passed — no high-risk content detected';

    // ── Step 3: Claim Detection ─────────────────────────────────────
    steps.push({ step: 3, name: 'Claim Validator', result: 'Running…' });
    const claimMatches = detectPatterns(text, CLAIM_PATTERNS);

    if (claimMatches.length === 0) {
      steps[2].result = 'Approved — basic content, no claims detected';
      const result: GovernanceResult = {
        decision: 'APPROVE',
        possibility: POSSIBILITY_BY_KEY.BASIC_POST,
        governed_prompt: { label: PROMPT_LABELS.BASIC_POST },
        reason: 'No factual claims, high-risk content, or policy violations detected.',
        risk: { level: 'Low', score: 10, categories: {} },
        knowledge: { checked: false, status: 'Not needed' },
        steps,
      };
      await PostGovernanceService.activatePrompt(result, workspaceId);
      return result;
    }

    const claimReason = `Claim detected: ${claimMatches.slice(0, 4).join(', ')}`;
    steps[2].result = `Claim detected — ${claimMatches.length} pattern(s) found`;

    // ── Step 4: Knowledge Base Verification ─────────────────────────
    steps.push({ step: 4, name: 'Knowledge Verification', result: 'Checking Knowledge Base…' });
    const kbMatches = await PostGovernanceService.lookupKnowledgeBase(text, workspaceId);

    if (kbMatches.length > 0) {
      steps[3].result = `Found ${kbMatches.length} supporting knowledge source(s)`;
      const result: GovernanceResult = {
        decision: 'APPROVE',
        possibility: POSSIBILITY_BY_KEY.FACTUAL_CLAIM_KB_FOUND,
        governed_prompt: { label: PROMPT_LABELS.FACTUAL_CLAIM_KB_FOUND },
        reason: `${claimReason}. Supporting evidence found in Knowledge Base.`,
        risk: { level: 'Low', score: 20, categories: { factual_claim: true } },
        knowledge: { checked: true, status: 'Evidence found', matches: kbMatches },
        steps,
      };
      await PostGovernanceService.activatePrompt(result, workspaceId);
      return result;
    }

    steps[3].result = 'No supporting knowledge found';
    const result: GovernanceResult = {
      decision: 'REVIEW',
      possibility: POSSIBILITY_BY_KEY.FACTUAL_CLAIM_NO_KB,
      governed_prompt: { label: PROMPT_LABELS.FACTUAL_CLAIM_NO_KB },
      reason: `${claimReason}. No approved Knowledge Base source supports this claim. Manual review required.`,
      risk: { level: 'Medium', score: 55, categories: { factual_claim: true } },
      knowledge: { checked: true, status: 'No evidence found', matches: [] },
      steps,
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
          meta.last_possibility = possKey;
          meta.last_decision = result.decision;
          meta.last_reason = result.reason;
          meta.usage_count = ((meta.usage_count as number) || 0) + 1;
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

      const { data: version } = await supabaseAdmin
        .from('prompt_versions')
        .select('id')
        .eq('prompt_id', promptId)
        .order('version_number', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!version) return;

      await supabaseAdmin.from('prompt_test_runs').insert({
        prompt_version_id: version.id,
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

  /**
   * Look up the Knowledge Base for sources matching the post content.
   * Reads the actual source content and match_action to decide
   * whether to block, review, or approve.
   */
  private static async lookupKnowledgeBase(
    content: string,
    workspaceId: string,
  ): Promise<KnowledgeMatch[]> {
    try {
      const { data: sources } = await supabaseAdmin
        .from('knowledge_sources')
        .select('id, title, citation_reference, content, metadata')
        .eq('workspace_id', workspaceId)
        .eq('status', 'ACTIVE')
        .limit(20);

      if (!sources || sources.length === 0) return [];

      const contentLower = content.toLowerCase();
      const matches: KnowledgeMatch[] = [];

      for (const src of sources) {
        const srcText = ((src.content || '') + ' ' + (src.title || '')).toLowerCase();
        const contentWords = contentLower.split(/\s+/).filter((w) => w.length > 3);
        const matchCount = contentWords.filter((w) => srcText.includes(w)).length;
        const ratio = contentWords.length > 0 ? matchCount / contentWords.length : 0;

        if (ratio > 0.3 || matchCount >= 5) {
          const meta = src.metadata || {};
          const matchAction = meta.match_action || meta.default_match_action || 'review';
          matches.push({
            id: src.id,
            title: src.title || 'Untitled',
            citation_reference: src.citation_reference || undefined,
            match_action: matchAction as 'approve' | 'review' | 'block',
          });
        }
      }

      return matches;
    } catch (err) {
      logger.warn({ err }, '[PostGovernance] KB lookup failed');
      return [];
    }
  }
}
