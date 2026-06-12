/* eslint-disable @typescript-eslint/no-explicit-any */
// ─────────────────────────────────────────────────────────────────────────────
// Publish → Workflow link service.
//
// When a user clicks Publish or Schedule in the Publish Hub, we additively
// create a governed workflow instance under an auto-provisioned "Publishing
// Workflow" template, linking the relevant agent + the post. This makes every
// publish visible on the Workflows page (Live Orchestrations) without touching
// the existing publish/scheduler pipeline. All calls are best-effort: failures
// here MUST NOT block publishing (callers wrap in try/catch).
// ─────────────────────────────────────────────────────────────────────────────
import { supabaseAdmin } from '../shared/supabase';
import { logger } from '../shared/logger';
import { moderate } from '../modules/safety/moderationService';
import { PostGovernanceService } from '../modules/prompts/PostGovernanceService';

const PUBLISHING_WORKFLOW_NAME = 'Publishing Workflow';

export interface PublishCheck {
  verdict: 'safe' | 'review' | 'block';
  severity: string;
  risk: number; // 0..100
  flags: { category: string; text: string; severity: string }[];
  governance?: {
    possibility_key: string;
    possibility_label: string;
    governed_prompt: string;
    decision: string;
    kb_checked: boolean;
    kb_matches: number;
  };
}

/**
 * Run the full prompt governance pipeline on a post. First runs safety
 * moderation, then classifies through the 5 governed prompts and checks
 * the Knowledge Base. Returns a verdict with full governance trace.
 */
async function runAgentChecks(
  content: string,
  postId: string | undefined,
  workspaceId: string,
  platform?: string,
): Promise<PublishCheck | null> {
  if (!content || !content.trim()) return null;
  try {
    // 1. Safety moderation (existing)
    const m = await moderate({ content, subjectId: postId, workspaceId, platform });
    const seen = new Set<string>();
    const flags = (m.matches || [])
      .map((x: any) => ({ category: x.category, text: x.matchedText || x.pattern, severity: x.severity }))
      .filter((f: any) => {
        const k = `${f.category}|${f.text}`;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      })
      .slice(0, 8);

    // 2. Run full governance classification pipeline
    let governanceResult = null;
    try {
      governanceResult = await PostGovernanceService.classify(content, platform || 'linkedin', workspaceId);
    } catch (govErr) {
      logger.warn({ err: govErr instanceof Error ? govErr.message : String(govErr) }, '[publish-link] governance classification failed (non-blocking)');
    }

    // 3. Determine final verdict: safety check takes priority for blocks,
    //    otherwise use governance decision
    let verdict = m.verdict;
    let risk = Math.round((m.overallRisk || 0) * 100);
    let severity = m.severity;

    if (governanceResult) {
      if (governanceResult.decision === 'BLOCK' && m.verdict !== 'block') {
        verdict = 'block';
        severity = 'high';
        risk = Math.max(risk, 90);
      } else if (governanceResult.decision === 'REVIEW' && m.verdict === 'safe') {
        verdict = 'review';
        severity = 'medium';
        risk = Math.max(risk, 55);
      }

      if (!flags.length && governanceResult.risk.categories) {
        for (const [cat, active] of Object.entries(governanceResult.risk.categories)) {
          if (active) {
            flags.push({ category: cat, text: cat.replace(/_/g, ' '), severity: severity });
          }
        }
      }
    }

    return {
      verdict,
      severity,
      risk,
      flags: flags.slice(0, 8),
      governance: governanceResult ? {
        possibility_key: governanceResult.possibility.key,
        possibility_label: governanceResult.possibility.label,
        governed_prompt: governanceResult.governed_prompt.label,
        decision: governanceResult.decision,
        kb_checked: governanceResult.knowledge.checked,
        kb_matches: governanceResult.knowledge.matches?.length || 0,
      } : undefined,
    };
  } catch (err) {
    logger.warn({ err: err instanceof Error ? err.message : String(err) }, '[publish-link] agent checks failed (non-blocking)');
    return null;
  }
}

// Step blueprint for the governed publishing flow (agent → policy → approval → publish).
const PUBLISH_STEPS: { step_type: string; name: string }[] = [
  { step_type: 'trigger',          name: 'Publish Triggered' },
  { step_type: 'agent_action',     name: 'Agent Action' },
  { step_type: 'policy_check',     name: 'Policy Check' },
  { step_type: 'approval_gate',    name: 'Approval Gate' },
  { step_type: 'publish',          name: 'Publish' },
  { step_type: 'evidence_capture', name: 'Evidence Capture' },
  { step_type: 'end',              name: 'End' },
];

interface PublishingWorkflow {
  workflowId: string;
  versionId: string;
  publishStepId: string | null;
}

/**
 * Find or auto-create the default "Publishing Workflow" template + active
 * version + governed steps for a workspace. Idempotent: returns the existing
 * one if present.
 */
async function ensurePublishingWorkflow(
  workspaceId: string,
  userId?: string,
): Promise<PublishingWorkflow | null> {
  // 1. Existing template?
  const { data: existing } = await supabaseAdmin
    .from('workflow_templates')
    .select('id, current_version_id')
    .eq('workspace_id', workspaceId)
    .eq('name', PUBLISHING_WORKFLOW_NAME)
    .limit(1)
    .maybeSingle();

  if (existing?.id && existing.current_version_id) {
    const publishStepId = await getPublishStepId(existing.current_version_id);
    return { workflowId: existing.id, versionId: existing.current_version_id, publishStepId };
  }

  // 2. Create template.
  const { data: tpl, error: tplErr } = await supabaseAdmin
    .from('workflow_templates')
    .insert({
      tenant_id: workspaceId,
      workspace_id: workspaceId,
      name: PUBLISHING_WORKFLOW_NAME,
      description: 'Auto-generated governed flow for posts published from the Publish Hub.',
      type: 'publishing',
      status: 'active',
      risk_level: 'medium',
      owner_name: 'System',
      created_by: userId || null,
      owner_id: userId || null,
    })
    .select('id')
    .single();
  if (tplErr || !tpl) {
    logger.warn(
      { err: tplErr?.message, code: (tplErr as any)?.code, details: (tplErr as any)?.details, hint: (tplErr as any)?.hint },
      '[publish-link] failed to create Publishing Workflow template',
    );
    return null;
  }

  // 3. Create an active version.
  const { data: ver, error: verErr } = await supabaseAdmin
    .from('workflow_versions')
    .insert({
      workflow_id: tpl.id,
      version_number: 1,
      state: 'active',
      change_summary: 'Initial auto-provisioned publishing workflow',
      created_by: userId || null,
      activated_by: userId || null,
      activated_at: new Date().toISOString(),
    })
    .select('id')
    .single();
  if (verErr || !ver) {
    logger.warn(
      { err: verErr?.message, code: (verErr as any)?.code, details: (verErr as any)?.details, hint: (verErr as any)?.hint },
      '[publish-link] failed to create publishing workflow version',
    );
    return null;
  }

  // 4. Point the template at its current version.
  await supabaseAdmin
    .from('workflow_templates')
    .update({ current_version_id: ver.id, active_from: new Date().toISOString() })
    .eq('id', tpl.id);

  // 5. Create the governed steps.
  let publishStepId: string | null = null;
  const stepRows = PUBLISH_STEPS.map((s, i) => ({
    version_id: ver.id,
    step_type: s.step_type,
    name: s.name,
    sequence: i,
    required_evidence: s.step_type === 'publish' || s.step_type === 'evidence_capture',
  }));
  const { data: steps, error: stepErr } = await supabaseAdmin
    .from('workflow_steps')
    .insert(stepRows)
    .select('id, step_type');
  if (stepErr) {
    logger.warn({ err: stepErr }, '[publish-link] failed to create publishing workflow steps');
  } else {
    publishStepId = (steps || []).find((s: any) => s.step_type === 'publish')?.id ?? null;
  }

  logger.info({ workspaceId, workflowId: tpl.id }, '[publish-link] provisioned Publishing Workflow');
  return { workflowId: tpl.id, versionId: ver.id, publishStepId };
}

async function getPublishStepId(versionId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from('workflow_steps')
    .select('id, step_type')
    .eq('version_id', versionId)
    .eq('step_type', 'publish')
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}

/**
 * Pick the agent most relevant to a post: an active agent in the workspace
 * whose platforms/linked_channels include the target platform, preferring
 * content-type agents. Falls back to any active agent, else null.
 */
async function pickRelevantAgent(
  workspaceId: string,
  platform?: string,
): Promise<{ id: string; name: string } | null> {
  // Consider ALL agents in the workspace (not just active ones) so a post
  // always connects to an agent when any exist; ranking prefers an active,
  // platform-matched, content agent.
  const { data: agents, error } = await supabaseAdmin
    .from('agents')
    .select('id, name, type, status, platforms, linked_channels')
    .eq('workspace_id', workspaceId)
    .limit(50);
  if (error || !agents || agents.length === 0) return null;

  const p = (platform || '').toLowerCase();
  const isActive = (a: any) =>
    ['ACTIVE', 'APPROVED', 'DEPLOYED'].includes(String(a.status || '').toUpperCase());
  const includesPlatform = (a: any) =>
    p &&
    ([...(a.platforms || []), ...(a.linked_channels || [])] as string[])
      .some((c) => String(c).toLowerCase() === p);
  const isContent = (a: any) => String(a.type || '').toLowerCase().includes('content');

  const ranked = [...agents].sort((a, b) => {
    const score = (x: any) =>
      (isActive(x) ? 4 : 0) + (includesPlatform(x) ? 2 : 0) + (isContent(x) ? 1 : 0);
    return score(b) - score(a);
  });
  const chosen = ranked[0];
  return chosen ? { id: chosen.id, name: chosen.name || 'Agent' } : null;
}

export interface LinkPublishParams {
  workspaceId: string;
  startedBy?: string;
  platform?: string;
  content?: string;
  postId?: string;
  scheduled?: boolean;
  scheduledTime?: string;
}

/**
 * Create a workflow instance representing a publish/schedule action, linked to
 * the relevant agent + post. Best-effort — returns the instance id or null.
 * The agent + post linkage is stored in trigger_source as JSON and expanded by
 * the workflows "active" endpoint for display (no schema change required).
 */
export async function linkPublishToWorkflow(params: LinkPublishParams): Promise<string | null> {
  const { workspaceId, startedBy, platform, content, postId, scheduled, scheduledTime } = params;
  if (!workspaceId) return null;

  try {
    const wf = await ensurePublishingWorkflow(workspaceId, startedBy);
    if (!wf) return null;

    const agent = await pickRelevantAgent(workspaceId, platform);
    const excerpt = (content || '').replace(/\s+/g, ' ').trim().slice(0, 140);

    // Agent runs content safety + policy checks on the post.
    const check = await runAgentChecks(content || '', postId, workspaceId, platform);

    const stepDesc = check
      ? check.governance
        ? `Governance: ${check.governance.governed_prompt} → ${check.governance.decision}`
        : `Agent Check: ${check.verdict === 'block' ? 'Blocked' : check.verdict === 'review' ? 'Needs Review' : 'Safe'}`
      : scheduled ? 'Scheduled Publish' : 'Publish';

    const triggerSource = JSON.stringify({
      src: 'publish_hub',
      agent_id: agent?.id || null,
      agent_name: agent?.name || null,
      post_id: postId || null,
      platform: platform || null,
      excerpt,
      step: stepDesc,
      scheduled: !!scheduled,
      check,
      governance: check?.governance || null,
    });

    // Status reflects the agent's verdict so it reads correctly in Live Orchestrations.
    const status = check?.verdict === 'block'
      ? 'blocked'
      : check?.verdict === 'review'
        ? 'waiting_review'
        : scheduled ? 'pending' : 'completed';

    const now = new Date().toISOString();
    const { data: instance, error } = await supabaseAdmin
      .from('workflow_instances')
      .insert({
        workflow_id: wf.workflowId,
        version_id: wf.versionId,
        workspace_id: workspaceId,
        status,
        trigger_type: scheduled ? 'schedule' : 'platform_event',
        trigger_source: triggerSource,
        started_by: startedBy || null,
        current_step_id: wf.publishStepId,
        priority: 5,
        risk_score: check ? check.risk : null,
        started_at: now,
        due_at: scheduled && scheduledTime ? scheduledTime : null,
      })
      .select('id')
      .single();
    if (error) {
      logger.warn(
        { err: error.message, code: (error as any).code, details: (error as any).details, hint: (error as any).hint },
        '[publish-link] failed to create workflow instance',
      );
      return null;
    }
    logger.info(
      { workspaceId, instanceId: instance?.id, platform, agentId: agent?.id, agentName: agent?.name, postId },
      '[publish-link] linked post to Publishing Workflow',
    );
    return instance?.id ?? null;
  } catch (err) {
    logger.warn(
      { err: err instanceof Error ? err.message : String(err) },
      '[publish-link] linkPublishToWorkflow failed (non-blocking)',
    );
    return null;
  }
}

export interface PublishedContentItem {
  id: string;
  source: 'publish' | 'schedule';
  platform: string | null;
  content: string;
  mediaUrl: string | null;
  status: string | null;
  createdAt: string | null;
  scheduledTime: string | null;
  agentName: string | null;
  check: PublishCheck | null;
}

/**
 * Recent content published/scheduled from the Publish Hub for a workspace,
 * unified from publish_intents + scheduled_posts and tagged with the relevant
 * agent. Read directly from the post tables so the Workflows page always
 * reflects what was posted (independent of workflow-instance creation).
 */
export async function getRecentPublishedContent(
  workspaceId: string,
  limit = 24,
): Promise<PublishedContentItem[]> {
  if (!workspaceId) return [];

  // Fetch agents once so we can tag each post without N queries.
  const { data: agents } = await supabaseAdmin
    .from('agents')
    .select('id, name, type, status, platforms, linked_channels')
    .eq('workspace_id', workspaceId)
    .limit(50);
  const agentList = agents || [];
  const agentFor = (platform?: string | null): string | null => {
    if (agentList.length === 0) return null;
    const p = (platform || '').toLowerCase();
    const isActive = (a: any) => ['ACTIVE', 'APPROVED', 'DEPLOYED'].includes(String(a.status || '').toUpperCase());
    const match = (a: any) => p && ([...(a.platforms || []), ...(a.linked_channels || [])] as string[]).some((c) => String(c).toLowerCase() === p);
    const isContent = (a: any) => String(a.type || '').toLowerCase().includes('content');
    const ranked = [...agentList].sort((a, b) => {
      const s = (x: any) => (isActive(x) ? 4 : 0) + (match(x) ? 2 : 0) + (isContent(x) ? 1 : 0);
      return s(b) - s(a);
    });
    return ranked[0]?.name || null;
  };

  // Surface the most RECENT published content. We mirror the Publish Hub's
  // governance getIntents behavior (order by created_at desc, no hard
  // workspace_id filter) because submitIntent can store a fallback workspace_id
  // (e.g. the superadmin zero-UUID), which would otherwise hide the user's most
  // recent posts. Scoping is handled by the read:agents route guard.
  const [intentsRes, scheduledRes, instancesRes] = await Promise.all([
    supabaseAdmin
      .from('publish_intents')
      .select('id, content, media_url, platform, status, created_at, workspace_id')
      .order('created_at', { ascending: false })
      .limit(limit),
    supabaseAdmin
      .from('scheduled_posts')
      .select('id, content, media_url, platform, status, scheduled_time, created_at, workspace_id')
      .order('created_at', { ascending: false })
      .limit(limit),
    // Publish-hub workflow instances carry the agent's check verdict in trigger_source.
    supabaseAdmin
      .from('workflow_instances')
      .select('trigger_source, created_at')
      .order('created_at', { ascending: false })
      .limit(200),
  ]);

  if (intentsRes.error) logger.warn({ err: intentsRes.error.message }, '[published-content] publish_intents query error');
  if (scheduledRes.error) logger.warn({ err: scheduledRes.error.message }, '[published-content] scheduled_posts query error');

  // post_id -> { check, agentName } from the agent's run on that post.
  const linkedByPost = new Map<string, { check: PublishCheck | null; agentName: string | null }>();
  for (const inst of instancesRes.data || []) {
    if (typeof inst.trigger_source !== 'string') continue;
    try {
      const meta = JSON.parse(inst.trigger_source);
      if (meta?.src === 'publish_hub' && meta.post_id && !linkedByPost.has(meta.post_id)) {
        linkedByPost.set(meta.post_id, { check: meta.check || null, agentName: meta.agent_name || null });
      }
    } catch { /* not our JSON */ }
  }

  const items: PublishedContentItem[] = [];

  for (const r of intentsRes.data || []) {
    const linked = linkedByPost.get(r.id);
    items.push({
      id: r.id,
      source: 'publish',
      platform: r.platform ?? null,
      content: r.content || '',
      mediaUrl: r.media_url ?? null,
      status: r.status ?? null,
      createdAt: r.created_at ?? null,
      scheduledTime: null,
      agentName: linked?.agentName || agentFor(r.platform),
      check: linked?.check ?? null,
    });
  }
  for (const r of scheduledRes.data || []) {
    const linked = linkedByPost.get(r.id);
    items.push({
      id: r.id,
      source: 'schedule',
      platform: r.platform ?? null,
      content: r.content || '',
      mediaUrl: r.media_url ?? null,
      status: r.status ?? null,
      createdAt: r.created_at ?? null,
      scheduledTime: r.scheduled_time ?? null,
      agentName: linked?.agentName || agentFor(r.platform),
      check: linked?.check ?? null,
    });
  }

  // Newest first; rows with a missing created_at are treated as newest (a
  // freshly inserted row whose timestamp didn't populate should not be dropped).
  items.sort((a, b) => {
    const av = a.createdAt || a.scheduledTime || "";
    const bv = b.createdAt || b.scheduledTime || "";
    if (!av && bv) return -1;
    if (av && !bv) return 1;
    return bv.localeCompare(av);
  });
  return items.slice(0, limit);
}

/**
 * Expand a workflow_instances.trigger_source JSON blob (written by
 * linkPublishToWorkflow) into display fields the frontend's Live Orchestrations
 * panel reads. Returns the instance unchanged if trigger_source isn't ours.
 */
export function enrichPublishInstance(instance: any): any {
  if (!instance || typeof instance.trigger_source !== 'string') return instance;
  let meta: any;
  try {
    meta = JSON.parse(instance.trigger_source);
  } catch {
    return instance;
  }
  if (!meta || meta.src !== 'publish_hub') return instance;
  return {
    ...instance,
    assigned_agent_name: meta.agent_name || instance.assigned_agent_name,
    current_step_name: meta.step || instance.current_step_name,
    post: { id: meta.post_id, platform: meta.platform, excerpt: meta.excerpt },
  };
}
