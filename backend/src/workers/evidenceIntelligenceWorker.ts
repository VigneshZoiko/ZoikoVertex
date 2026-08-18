// Evidence Intelligence Worker
// Monitors audit events, auto-creates forensic cases for high/critical events,
// preserves evidence, assigns reviewers. Human resolves — AI detects.

import { supabaseAdmin } from '../shared/supabase';
import { createCase, addEvidence, applyLegalHold } from '../services/forensicHub.service';
import { preserveEvidence } from '../services/evidenceVault.service';
import { logger } from '../shared/logger';
import { randomUUID } from 'crypto';
import OpenAI from 'openai';
import { env } from '../config/env';

const POLL_INTERVAL_MS = 2 * 60 * 1000;  // 2 minutes
const LOOKBACK_HOURS = 24;
const DEDUP_TTL_MS = 7 * 24 * 60 * 60 * 1000;  // 7 days
const DEDUP_PRUNE_EVERY = 50;  // prune after every N additions
const MAX_AI_RETRIES = 3;
const AI_RETRY_BASE_MS = 1500;  // exponential: 1.5s, 3s, 6s

// Audit event category → forensic case type
const CASE_TYPE_MAP: Record<string, string> = {
  ai_agent:          'ai_agent_misfire',
  content_lifecycle: 'unauthorized_publish',
  approval:          'policy_override_review',
  policy_governance: 'policy_override_review',
  system_security:   'security_incident',
  user_identity:     'security_incident',
  chain_integrity:   'chain_integrity_alert',
};

// Case type → roles to assign + notify
const REVIEWER_ROLES: Record<string, string[]> = {
  ai_agent_misfire:       ['GOVERNANCE_ADMIN', 'SECURITY_ADMIN'],
  unauthorized_publish:   ['COMPLIANCE_REVIEWER', 'GOVERNANCE_ADMIN'],
  policy_override_review: ['GOVERNANCE_ADMIN', 'COMPLIANCE_REVIEWER'],
  security_incident:      ['SECURITY_ADMIN', 'WORKSPACE_OWNER'],
  evidence_request:       ['COMPLIANCE_REVIEWER', 'GOVERNANCE_ADMIN'],
  chain_integrity_alert:  ['SECURITY_ADMIN', 'WORKSPACE_OWNER'],
  brand_regulatory_risk:  ['COMPLIANCE_REVIEWER'],
};

// ─── Bounded dedup Map: eventId → processed_at (ms) ─────────────────────────
// Prevents re-processing across polls without an unbounded memory leak.
const processedEventIds = new Map<string, number>();
let addCount = 0;

function markProcessed(eventId: string): void {
  processedEventIds.set(eventId, Date.now());
  addCount++;
  if (addCount % DEDUP_PRUNE_EVERY === 0) {
    const cutoff = Date.now() - DEDUP_TTL_MS;
    for (const [id, ts] of processedEventIds) {
      if (ts < cutoff) processedEventIds.delete(id);
    }
  }
}

// ─── Groq client ─────────────────────────────────────────────────────────────

let groqClient: OpenAI | null = null;

function getGroqClient(): OpenAI | null {
  if (!env.GROQ_API_KEY) return null;
  if (!groqClient) {
    groqClient = new OpenAI({ apiKey: env.GROQ_API_KEY, baseURL: 'https://api.groq.com/openai/v1' });
  }
  return groqClient;
}

interface AiCaseAnalysis {
  title: string;
  summary: string;
  case_type: string;
  severity_confirmed: string;
  auto_hold: boolean;
  reviewer_note: string;
}

async function analyzeWithAi(event: any): Promise<AiCaseAnalysis | null> {
  const client = getGroqClient();
  if (!client) return null;

  const prompt = `You are an evidence intelligence agent for an enterprise social media governance platform.
Analyze this governance/security event and generate a forensic investigation case.

Event:
- Category: ${event.event_category}
- Type: ${event.event_type}
- Title: ${event.event_title}
- Summary: ${event.event_summary || '(none)'}
- Risk Level: ${event.risk_level}
- Status: ${event.status}
- Actor type: ${(event.actor as any)?.actor_type || 'unknown'}
- Timestamp: ${event.timestamp_utc}

Return STRICT JSON only — no prose, no markdown:
{
  "title": "<concise case title, max 8 words>",
  "summary": "<2-3 sentences: what happened, why it is a risk, what the investigator should verify>",
  "case_type": "<one of: ai_agent_misfire | unauthorized_publish | policy_override_review | security_incident | evidence_request | chain_integrity_alert | brand_regulatory_risk | operational_failure>",
  "severity_confirmed": "<critical | high | medium | low>",
  "auto_hold": <true if critical severity or involves PII/legal/regulated content exposure>,
  "reviewer_note": "<one sentence: the single most important thing the human reviewer must verify>"
}`;

  for (let attempt = 1; attempt <= MAX_AI_RETRIES; attempt++) {
    try {
      const res = await client.chat.completions.create({
        model: 'openai/gpt-oss-120b',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 400,
        temperature: 0,
      });
      const text = res.choices[0]?.message?.content?.trim() || '';
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) {
        // Malformed response — retry
        if (attempt < MAX_AI_RETRIES) {
          await new Promise(r => setTimeout(r, AI_RETRY_BASE_MS * attempt));
          continue;
        }
        return null;
      }
      return JSON.parse(match[0]) as AiCaseAnalysis;
    } catch (err) {
      if (attempt < MAX_AI_RETRIES) {
        logger.warn({ err, attempt }, `[evidence-intelligence] Groq attempt ${attempt} failed, retrying in ${AI_RETRY_BASE_MS * attempt}ms`);
        await new Promise(r => setTimeout(r, AI_RETRY_BASE_MS * attempt));
      } else {
        logger.warn({ err }, '[evidence-intelligence] Groq analysis failed after all retries, using rule-based fallback');
      }
    }
  }
  return null;
}

function ruleBasedFallback(event: any): AiCaseAnalysis {
  const caseType = CASE_TYPE_MAP[event.event_category] || 'security_incident';
  return {
    title: `${(event.event_title || 'Governance Event').substring(0, 60)} — Auto-Detected`,
    summary: `Automated detection: ${event.event_summary || event.event_title}. Risk level: ${event.risk_level}. Status: ${event.status}. Requires human review and resolution decision.`,
    case_type: caseType,
    severity_confirmed: event.risk_level || 'high',
    auto_hold: event.risk_level === 'critical',
    reviewer_note: `Verify the ${event.event_category} event is correctly classified and determine if escalation is required.`,
  };
}

// ─── Seed dedup Set from DB on restart ───────────────────────────────────────

async function seedProcessedIds(): Promise<void> {
  const cutoff = new Date(Date.now() - DEDUP_TTL_MS).toISOString();
  const { data } = await supabaseAdmin
    .from('forensic_cases')
    .select('source_event_ids')
    .eq('source', 'ai_agent')
    .gte('created_at', cutoff);

  if (data) {
    for (const row of data) {
      for (const id of (row.source_event_ids as string[] || [])) {
        processedEventIds.set(id, Date.now());
      }
    }
  }
}

// ─── Per-workspace processing ─────────────────────────────────────────────────

async function processWorkspace(workspaceId: string): Promise<void> {
  const cutoff = new Date(Date.now() - LOOKBACK_HOURS * 60 * 60 * 1000).toISOString();

  const base = supabaseAdmin
    .from('audit_events')
    .select('*')
    .eq('workspace_id', workspaceId)
    .gte('timestamp_utc', cutoff)
    .neq('event_category', 'evidence_legal');  // avoid self-referential loop

  // Arm 1: high/critical with actionable (failed / blocked / overridden) status
  const [arm1, arm2] = await Promise.all([
    base
      .in('risk_level', ['high', 'critical'])
      .in('status', ['failed', 'blocked', 'overridden'])
      .order('timestamp_utc', { ascending: false })
      .limit(15),
    // Arm 2: critical-only with success (dangerous successful actions also need investigation)
    base
      .eq('risk_level', 'critical')
      .eq('status', 'success')
      .order('timestamp_utc', { ascending: false })
      .limit(5),
  ]);

  // Merge arms, remove duplicates, filter out our own emitted events
  const seen = new Set<string>();
  const events = [...(arm1.data || []), ...(arm2.data || [])]
    .filter(e => {
      if (seen.has(e.event_id)) return false;
      seen.add(e.event_id);
      const actorId = (e.actor as any)?.actor_id;
      return actorId !== 'evidence-intelligence-agent';
    });

  if (events.length === 0) return;

  for (const event of events) {
    if (processedEventIds.has(event.event_id)) continue;
    markProcessed(event.event_id); // mark before async work to prevent races

    try {
      await processEvent(workspaceId, event);
    } catch (err) {
      logger.error({ err, eventId: event.event_id }, '[evidence-intelligence] Failed to process event');
    }
  }
}

async function processEvent(workspaceId: string, event: any): Promise<void> {
  // AI analysis with rule-based fallback
  const analysis = (await analyzeWithAi(event)) ?? ruleBasedFallback(event);

  // 1. Create forensic case
  const newCase = await createCase({
    workspace_id: workspaceId,
    tenant_id: workspaceId,
    case_type: analysis.case_type,
    title: analysis.title,
    summary: `${analysis.summary}\n\nReviewer note: ${analysis.reviewer_note}`,
    severity: analysis.severity_confirmed,
    source: 'ai_agent',
    source_event_ids: [event.event_id],
    actor_id: 'evidence-intelligence-agent',
  });

  logger.info(
    { caseId: newCase.case_id, eventId: event.event_id, severity: analysis.severity_confirmed },
    '[evidence-intelligence] Case created'
  );

  // 2. Preserve triggering event to vault
  try {
    await preserveEvidence({
      source_type: 'audit_event',
      source_id: event.event_id,
      source_system: 'audit_trail',
      source_timestamp_utc: event.timestamp_utc,
      risk_level: event.risk_level,
      sensitivity: event.risk_level === 'critical' ? 'restricted' : 'confidential',
      contains_ai_output: event.event_category === 'ai_agent',
      preservation_reason: `Auto-preserved by Evidence Intelligence Agent for case ${newCase.case_id}`,
      preserved_by: 'evidence-intelligence-agent',
      retention_class: event.risk_level === 'critical' ? 'legal_hold' : 'extended',
      workspace_id: workspaceId,
      tenant_id: workspaceId,
      payload: JSON.stringify(event),
      metadata: { forensic_case_id: newCase.case_id, auto_preserved: true },
    });
  } catch (err) {
    logger.warn({ err }, '[evidence-intelligence] Vault preserve failed (non-blocking)');
  }

  // 3. Add triggering event as primary evidence on the case
  try {
    await addEvidence({
      case_id: newCase.id,
      source_type: 'audit_event',
      source_id: event.event_id,
      relevance: 'primary',
      added_by: 'evidence-intelligence-agent',
      added_reason: 'Triggering event — auto-added by Evidence Intelligence Agent',
      metadata: { auto_added: true, risk_level: event.risk_level },
    });
  } catch { /* non-blocking */ }

  // 4. Gather temporally related events (±10 min, same workspace)
  const windowStart = new Date(new Date(event.timestamp_utc).getTime() - 10 * 60 * 1000).toISOString();
  const windowEnd   = new Date(new Date(event.timestamp_utc).getTime() + 10 * 60 * 1000).toISOString();

  try {
    const { data: related } = await supabaseAdmin
      .from('audit_events')
      .select('event_id, event_type, event_title, risk_level, timestamp_utc')
      .eq('workspace_id', workspaceId)
      .gte('timestamp_utc', windowStart)
      .lte('timestamp_utc', windowEnd)
      .neq('event_id', event.event_id)
      .neq('event_category', 'evidence_legal')
      .limit(10);

    if (related && related.length > 0) {
      for (const rel of related) {
        try {
          await addEvidence({
            case_id: newCase.id,
            source_type: 'audit_event',
            source_id: rel.event_id,
            relevance: 'contextual',
            added_by: 'evidence-intelligence-agent',
            added_reason: 'Temporally related event (±10 min window) — auto-added',
            metadata: { auto_added: true, correlation: 'temporal_proximity' },
          });
        } catch { /* skip individual failures */ }
      }
      logger.info({ caseId: newCase.case_id, count: related.length }, '[evidence-intelligence] Related events added');
    }
  } catch { /* non-blocking */ }

  // 5. Auto-apply legal hold for critical cases
  if (analysis.auto_hold || analysis.severity_confirmed === 'critical') {
    try {
      await applyLegalHold(
        newCase.id,
        `Auto-applied by Evidence Intelligence Agent. ${analysis.summary.substring(0, 200)}`,
        'evidence-intelligence-agent',
        'ai_auto_hold'
      );
      logger.info({ caseId: newCase.case_id }, '[evidence-intelligence] Legal hold auto-applied');
    } catch (err) {
      logger.warn({ err }, '[evidence-intelligence] Legal hold failed (non-blocking)');
    }
  }

  // 6. Find reviewers, assign + notify
  const reviewerRoles = REVIEWER_ROLES[analysis.case_type] ?? ['GOVERNANCE_ADMIN'];
  try {
    const { data: reviewers } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('workspace_id', workspaceId)
      .in('role', reviewerRoles)
      .limit(5);

    if (reviewers && reviewers.length > 0) {
      // Assign to first matching reviewer
      await supabaseAdmin
        .from('forensic_cases')
        .update({ owner_user_id: reviewers[0].id })
        .eq('id', newCase.id);

      // Notify all matching reviewers
      const notifType = analysis.severity_confirmed === 'critical' ? 'ERROR' : 'WARNING';
      for (const reviewer of reviewers) {
        await supabaseAdmin.from('notifications').insert({
          id: randomUUID(),
          user_id: reviewer.id,
          title: `New Case: ${analysis.title}`,
          body: `${analysis.severity_confirmed.toUpperCase()} severity case auto-detected and assigned to you. ${analysis.reviewer_note}`,
          type: notifType,
          link: `/evidence/forensic-hub/cases/${newCase.id}`,
          read: false,
        });
      }

      logger.info(
        { caseId: newCase.case_id, reviewerCount: reviewers.length },
        '[evidence-intelligence] Reviewers assigned and notified'
      );
    }
  } catch (err) {
    logger.warn({ err }, '[evidence-intelligence] Reviewer assignment failed (non-blocking)');
  }
}

// ─── Poll loop ────────────────────────────────────────────────────────────────

let running = false;

async function poll(): Promise<void> {
  if (running) return;
  running = true;

  try {
    await seedProcessedIds();

    const { data: workspaces } = await supabaseAdmin
      .from('workspaces')
      .select('id')
      .eq('status', 'ACTIVE')
      .limit(50);

    if (!workspaces || workspaces.length === 0) return;

    for (const { id } of workspaces) {
      await processWorkspace(id);
    }
  } catch (err) {
    logger.error({ err }, '[evidence-intelligence] Poll error');
  } finally {
    running = false;
  }
}

export function initEvidenceIntelligenceWorker(): void {
  poll().catch(err => logger.error({ err }, '[evidence-intelligence] Initial poll failed'));
  setInterval(() => {
    poll().catch(err => logger.error({ err }, '[evidence-intelligence] Scheduled poll failed'));
  }, POLL_INTERVAL_MS);
  logger.info('[evidence-intelligence-worker] Started — polling every 2 min for high/critical events');
}
