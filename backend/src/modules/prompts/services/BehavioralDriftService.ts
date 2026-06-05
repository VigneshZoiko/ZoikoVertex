import * as crypto from 'crypto';
import { randomUUID } from 'crypto';
import { supabaseAdmin } from '../../../shared/supabase';
import { PromptAuditService } from '../PromptAuditService';
import { PromptEvidenceService } from '../PromptEvidenceService';
import { PromptIncidentService } from './PromptIncidentService';

/**
 * BehavioralDriftService — Phase 6.4
 *
 * Distinct from GovernanceDriftService (which detects governance artifacts
 * that have drifted out of sync with each other). Behavioral drift
 * compares actual runtime behavior of a prompt against an approved
 * baseline and flags when the behavior has moved enough to require
 * attention.
 *
 * Five drift classes (MD-aligned):
 *   1. semantic_drift      — output meaning has shifted away from baseline
 *   2. response_drift      — response structure / length / format has shifted
 *   3. safety_drift        — safety posture has degraded (more refusals
 *                            dropped, more unsafe content emitted, more
 *                            runtime violations)
 *   4. quality_drift       — overall quality has dropped (heuristic
 *                            quality scorer, low-latency / cost anomalies)
 *   5. model_drift         — outputs vary wildly between model calls
 *                            (consistency collapse) or a different model
 *                            is being executed than the baseline
 *
 * Each drift detection produces:
 *   - a `BehavioralDriftFinding` (id, category, severity, scores, evidence)
 *   - a `prompt_behavioral_drift` audit event
 *   - an evidence record (sha256 of the baseline + current)
 *   - an open prompt_incident when severity >= 'high'
 *
 * Baseline model:
 *   Baselines are stored in `prompt_behavioral_baselines` with one row
 *   per (prompt_version_id, drift_category). The baseline is set by an
 *   explicit `recordBaseline` call (typically right after a version
 *   passes commissioning). The drift detection compares the most-recent
 *   N runtime traces against that baseline.
 */
export type BehavioralDriftCategory =
  | 'semantic_drift'
  | 'response_drift'
  | 'safety_drift'
  | 'quality_drift'
  | 'model_drift';

export type BehavioralDriftSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface BehavioralDriftFinding {
  id: string;
  prompt_id: string;
  prompt_version_id: string;
  workspace_id: string;
  category: BehavioralDriftCategory;
  severity: BehavioralDriftSeverity;
  title: string;
  description: string;
  baseline_score: number;
  current_score: number;
  drift_score: number;     // |current - baseline| normalized to 0-100
  threshold: number;        // configured threshold for this category
  evidence_refs: string[];
  baseline_id: string;
  sample_size: number;
  detected_at: string;
  incident_id: string | null;
}

export interface BehavioralDriftReport {
  prompt_id: string;
  prompt_version_id: string;
  workspace_id: string;
  findings: BehavioralDriftFinding[];
  summary: {
    total_findings: number;
    by_category: Record<BehavioralDriftCategory, number>;
    by_severity: Record<BehavioralDriftSeverity, number>;
    overall_drift_score: number;
    drift_detected: boolean;
  };
  detected_at: string;
}

export interface BehavioralDriftBaseline {
  id: string;
  prompt_version_id: string;
  category: BehavioralDriftCategory;
  workspace_id: string;
  baseline_score: number;
  baseline_payload: Record<string, unknown>;
  sample_size: number;
  recorded_at: string;
  recorded_by: string | null;
}

const THRESHOLDS: Record<BehavioralDriftCategory, number> = {
  semantic_drift: 25,
  response_drift: 30,
  safety_drift: 15,
  quality_drift: 20,
  model_drift: 30,
};

const SAMPLE_WINDOW = 50; // most-recent N runtime traces per version

function severityFromDriftScore(drift: number, threshold: number): BehavioralDriftSeverity {
  if (drift >= threshold * 2) return 'critical';
  if (drift >= threshold * 1.5) return 'high';
  if (drift >= threshold) return 'medium';
  return 'low';
}

function makeFindingId(): string {
  return `BDRIFT-${randomUUID().slice(0, 8).toUpperCase()}`;
}

export class BehavioralDriftService {
  // ════════════════════════════════════════════════════════════════════════
  // Baseline management
  // ════════════════════════════════════════════════════════════════════════

  /**
   * Persist a baseline for a (version, category) pair. Overwrites any
   * previous baseline for the same (version, category).
   */
  static async recordBaseline(input: {
    workspaceId: string;
    promptId: string;
    promptVersionId: string;
    category: BehavioralDriftCategory;
    baselineScore: number;
    baselinePayload: Record<string, unknown>;
    sampleSize: number;
    actorId?: string;
  }): Promise<BehavioralDriftBaseline> {
    const { data: existing } = await supabaseAdmin
      .from('prompt_behavioral_baselines')
      .select('id')
      .eq('prompt_version_id', input.promptVersionId)
      .eq('category', input.category)
      .maybeSingle();

    if (existing) {
      await supabaseAdmin
        .from('prompt_behavioral_baselines')
        .update({
          baseline_score: input.baselineScore,
          baseline_payload: input.baselinePayload,
          sample_size: input.sampleSize,
          recorded_at: new Date().toISOString(),
          recorded_by: input.actorId || null,
        })
        .eq('id', existing.id);
    } else {
      await supabaseAdmin.from('prompt_behavioral_baselines').insert({
        workspace_id: input.workspaceId,
        prompt_id: input.promptId,
        prompt_version_id: input.promptVersionId,
        category: input.category,
        baseline_score: input.baselineScore,
        baseline_payload: input.baselinePayload,
        sample_size: input.sampleSize,
        recorded_by: input.actorId || null,
      });
    }

    const baseline: BehavioralDriftBaseline = {
      id: existing?.id || `BASE-${randomUUID().slice(0, 8).toUpperCase()}`,
      prompt_version_id: input.promptVersionId,
      category: input.category,
      workspace_id: input.workspaceId,
      baseline_score: input.baselineScore,
      baseline_payload: input.baselinePayload,
      sample_size: input.sampleSize,
      recorded_at: new Date().toISOString(),
      recorded_by: input.actorId || null,
    };

    try {
      await PromptAuditService.record({
        event_type: 'prompt.behavioral_drift.baseline_recorded',
        workspace_id: input.workspaceId,
        prompt_id: input.promptId,
        version_id: input.promptVersionId,
        actor_id: input.actorId,
        reason: `Behavioral baseline recorded for ${input.category}: score=${input.baselineScore}, samples=${input.sampleSize}`,
        after_state: { baseline_id: baseline.id, category: input.category, baseline_score: input.baselineScore },
      });
    } catch {
      // non-blocking
    }

    return baseline;
  }

  /**
   * Get the active baseline for a (version, category). Returns null when no
   * baseline has been recorded yet — drift detection in that case skips
   * the category (no comparison possible).
   */
  static async getBaseline(promptVersionId: string, category: BehavioralDriftCategory): Promise<BehavioralDriftBaseline | null> {
    const { data } = await supabaseAdmin
      .from('prompt_behavioral_baselines')
      .select('*')
      .eq('prompt_version_id', promptVersionId)
      .eq('category', category)
      .order('recorded_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!data) return null;
    return {
      id: data.id,
      prompt_version_id: data.prompt_version_id,
      category: data.category,
      workspace_id: data.workspace_id,
      baseline_score: data.baseline_score,
      baseline_payload: data.baseline_payload || {},
      sample_size: data.sample_size || 0,
      recorded_at: data.recorded_at,
      recorded_by: data.recorded_by || null,
    };
  }

  // ════════════════════════════════════════════════════════════════════════
  // Drift detection
  // ════════════════════════════════════════════════════════════════════════

  /**
   * Detect behavioral drift across all 5 categories for a single
   * prompt version. Returns a structured report with per-category
   * findings and a rollup summary.
   */
  static async detectVersionDrift(input: {
    promptId: string;
    promptVersionId: string;
    workspaceId: string;
    sampleWindow?: number;
    actorId?: string;
  }): Promise<BehavioralDriftReport> {
    const sampleWindow = input.sampleWindow ?? SAMPLE_WINDOW;
    const findings: BehavioralDriftFinding[] = [];

    const samples = await BehavioralDriftService.getRecentTraces(input.promptVersionId, sampleWindow);

    for (const category of [
      'semantic_drift',
      'response_drift',
      'safety_drift',
      'quality_drift',
      'model_drift',
    ] as BehavioralDriftCategory[]) {
      const baseline = await BehavioralDriftService.getBaseline(input.promptVersionId, category);
      if (!baseline) continue;
      const current = BehavioralDriftService.computeCurrentScore(category, samples);
      if (current === null) continue;
      const driftScore = Math.round(Math.abs(current - baseline.baseline_score));
      const threshold = THRESHOLDS[category];
      const severity = severityFromDriftScore(driftScore, threshold);
      if (driftScore < threshold) continue;

      const evidenceRefs = await BehavioralDriftService.persistDriftEvidence({
        workspaceId: input.workspaceId,
        promptId: input.promptId,
        promptVersionId: input.promptVersionId,
        category,
        baseline,
        currentScore: current,
        sampleSize: samples.length,
      });

      let incidentId: string | null = null;
      if (severity === 'high' || severity === 'critical') {
        try {
          const result = await PromptIncidentService.openIncident({
            workspace_id: input.workspaceId,
            prompt_id: input.promptId,
            prompt_version_id: input.promptVersionId,
            severity,
            category: `behavioral_${category}`,
            trigger: `drift_score_${driftScore}`,
            detected_by: 'BehavioralDriftService',
            remediation: `Review the latest ${samples.length} runtime traces and re-evaluate the prompt baseline. Drift of ${driftScore} (threshold ${threshold}) on category ${category}.`,
            affected_scope: {
              baseline_score: baseline.baseline_score,
              current_score: current,
              drift_score: driftScore,
              sample_size: samples.length,
            },
            actor_id: input.actorId,
          });
          if (result.ok) incidentId = result.incident?.id || null;
        } catch {
          // non-blocking
        }
      }

      try {
        await PromptAuditService.record({
          event_type: 'prompt.behavioral_drift.detected',
          workspace_id: input.workspaceId,
          prompt_id: input.promptId,
          version_id: input.promptVersionId,
          actor_id: input.actorId,
          reason: `Behavioral drift (${category}): score ${current} vs baseline ${baseline.baseline_score} (drift ${driftScore}, severity ${severity})`,
          risk_level: severity,
          after_state: {
            category,
            baseline_score: baseline.baseline_score,
            current_score: current,
            drift_score: driftScore,
            threshold,
            sample_size: samples.length,
            incident_id: incidentId,
          },
        });
      } catch {
        // non-blocking
      }

      findings.push({
        id: makeFindingId(),
        prompt_id: input.promptId,
        prompt_version_id: input.promptVersionId,
        workspace_id: input.workspaceId,
        category,
        severity,
        title: `${category} drift detected (${severity})`,
        description: `Drift score ${driftScore} on ${category} exceeds threshold ${threshold}. Baseline ${baseline.baseline_score}, current ${current}, sample size ${samples.length}.`,
        baseline_score: baseline.baseline_score,
        current_score: current,
        drift_score: driftScore,
        threshold,
        evidence_refs: evidenceRefs,
        baseline_id: baseline.id,
        sample_size: samples.length,
        detected_at: new Date().toISOString(),
        incident_id: incidentId,
      });
    }

    // Summary
    const byCategory: Record<BehavioralDriftCategory, number> = {
      semantic_drift: 0,
      response_drift: 0,
      safety_drift: 0,
      quality_drift: 0,
      model_drift: 0,
    };
    const bySeverity: Record<BehavioralDriftSeverity, number> = {
      low: 0, medium: 0, high: 0, critical: 0,
    };
    let totalDrift = 0;
    for (const f of findings) {
      byCategory[f.category]++;
      bySeverity[f.severity]++;
      totalDrift += f.drift_score;
    }
    const overallDriftScore = findings.length > 0 ? Math.round(totalDrift / findings.length) : 0;

    return {
      prompt_id: input.promptId,
      prompt_version_id: input.promptVersionId,
      workspace_id: input.workspaceId,
      findings,
      summary: {
        total_findings: findings.length,
        by_category: byCategory,
        by_severity: bySeverity,
        overall_drift_score: overallDriftScore,
        drift_detected: findings.length > 0,
      },
      detected_at: new Date().toISOString(),
    };
  }

  /**
   * Detect drift across every production-active prompt version in a
   * workspace. Convenience for the dashboard view.
   */
  static async detectWorkspaceDrift(workspaceId: string): Promise<BehavioralDriftReport[]> {
    const { data: prompts } = await supabaseAdmin
      .from('prompts')
      .select('id, current_version_id')
      .eq('workspace_id', workspaceId)
      .in('status', ['production_active', 'commissioned', 'approved_for_staging', 'production_pending']);

    if (!prompts || prompts.length === 0) return [];
    const reports: BehavioralDriftReport[] = [];
    for (const p of prompts) {
      if (!p.current_version_id) continue;
      const report = await BehavioralDriftService.detectVersionDrift({
        promptId: p.id,
        promptVersionId: p.current_version_id,
        workspaceId,
      });
      if (report.findings.length > 0) reports.push(report);
    }
    return reports;
  }

  // ════════════════════════════════════════════════════════════════════════
  // Per-category scorers
  // ════════════════════════════════════════════════════════════════════════

  /**
   * Compute the current score (0-100) for a category given the most-recent
   * runtime traces. Returns null when there are no traces (caller skips).
   *
   * Each scorer emits a normalized 0-100 score where 100 = "no anomaly".
   * The drift detector then takes |current - baseline| as the drift score.
   *
   * The scorers are deliberately lightweight — they read fields already
   * captured by PromptRuntimeTraceService (response length, refusal flag,
   * violation flag, latency, finish_reason) and do not call an LLM.
   */
  static computeCurrentScore(
    category: BehavioralDriftCategory,
    samples: Array<Record<string, any>>,
  ): number | null {
    if (samples.length === 0) return null;
    switch (category) {
      case 'semantic_drift':
        return scoreSemanticDrift(samples);
      case 'response_drift':
        return scoreResponseDrift(samples);
      case 'safety_drift':
        return scoreSafetyDrift(samples);
      case 'quality_drift':
        return scoreQualityDrift(samples);
      case 'model_drift':
        return scoreModelDrift(samples);
    }
  }

  // ─── helpers ────────────────────────────────────────────────────────────

  private static async getRecentTraces(promptVersionId: string, limit: number): Promise<Array<Record<string, any>>> {
    const { data } = await supabaseAdmin
      .from('prompt_runtime_traces')
      .select('id, output_text, response_text, latency_ms, violation, finish_reason, model_id, provider, created_at')
      .eq('prompt_version_id', promptVersionId)
      .order('created_at', { ascending: false })
      .limit(limit);
    return data || [];
  }

  private static async persistDriftEvidence(input: {
    workspaceId: string;
    promptId: string;
    promptVersionId: string;
    category: BehavioralDriftCategory;
    baseline: BehavioralDriftBaseline;
    currentScore: number;
    sampleSize: number;
  }): Promise<string[]> {
    const refs: string[] = [];
    const evidenceHash = crypto
      .createHash('sha256')
      .update(JSON.stringify({
        baseline_id: input.baseline.id,
        baseline_score: input.baseline.baseline_score,
        current_score: input.currentScore,
        sample_size: input.sampleSize,
      }))
      .digest('hex');
    try {
      const r = await PromptEvidenceService.record({
        event_type: 'prompt.behavioral_drift.evidence',
        prompt_id: input.promptId,
        prompt_version_id: input.promptVersionId,
        workspace_id: input.workspaceId,
        reason: `Behavioral drift evidence (${input.category}): baseline ${input.baseline.baseline_score} -> current ${input.currentScore}`,
        payload: {
          category: input.category,
          baseline_id: input.baseline.id,
          baseline_score: input.baseline.baseline_score,
          current_score: input.currentScore,
          evidence_hash: evidenceHash,
          sample_size: input.sampleSize,
        },
      });
      if (r?.vault_item_id) refs.push(r.vault_item_id);
    } catch {
      // non-blocking
    }
    return refs;
  }
}

// ─── Per-category scorers ─────────────────────────────────────────────────

function scoreSemanticDrift(samples: Array<Record<string, any>>): number {
  // Output length divergence: how much the average response length in the
  // recent window deviates from the median length in the window. Lower
  // stability (i.e. high length variance) => lower score.
  const lengths = samples.map((s) => String(s.response_text || s.output_text || '').length);
  if (lengths.length < 2) return 100;
  const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const variance = lengths.reduce((s, l) => s + Math.pow(l - mean, 2), 0) / lengths.length;
  const std = Math.sqrt(variance);
  const cv = mean > 0 ? Math.min(std / mean, 1) : 0; // coefficient of variation, capped at 1
  return Math.round((1 - cv) * 100);
}

function scoreResponseDrift(samples: Array<Record<string, any>>): number {
  // Response format stability: ratio of samples that look like non-empty
  // structured output (>=30 chars) and end with terminal punctuation.
  if (samples.length === 0) return 100;
  const structured = samples.filter((s) => {
    const t = String(s.response_text || s.output_text || '').trim();
    return t.length >= 30 && /[\.\!\?\]]$/.test(t);
  }).length;
  return Math.round((structured / samples.length) * 100);
}

function scoreSafetyDrift(samples: Array<Record<string, any>>): number {
  // Safety posture: penalize violations, content_filter finishes, and
  // very short responses (refusals often come back < 30 chars).
  if (samples.length === 0) return 100;
  let score = 100;
  for (const s of samples) {
    if (s.violation === true) score -= 8;
    if (s.finish_reason === 'content_filter') score -= 5;
    const t = String(s.response_text || s.output_text || '').trim();
    if (t.length > 0 && t.length < 20) score -= 2; // possible refusal
  }
  return Math.max(0, Math.round(score / samples.length * (samples.length / Math.max(samples.length, 1))));
}

function scoreQualityDrift(samples: Array<Record<string, any>>): number {
  // Heuristic quality: weighted mix of length and latency.
  if (samples.length === 0) return 100;
  let lenScore = 0;
  let latScore = 0;
  const latencies = samples.map((s) => Number(s.latency_ms || 0));
  const maxLat = Math.max(...latencies, 1);
  for (const s of samples) {
    const t = String(s.response_text || s.output_text || '').trim();
    lenScore += t.length >= 50 ? 100 : Math.round((t.length / 50) * 100);
    const lat = Number(s.latency_ms || 0);
    latScore += Math.round((1 - Math.min(lat / maxLat, 1)) * 100);
  }
  return Math.round((lenScore + latScore) / (samples.length * 2));
}

function scoreModelDrift(samples: Array<Record<string, any>>): number {
  // Model drift: detect (a) multiple model_ids in the recent window
  // (i.e. the routing is split), and (b) high pairwise length variance
  // between consecutive samples (i.e. the model has become unstable).
  if (samples.length === 0) return 100;
  const modelIds = new Set(samples.map((s) => String(s.model_id || s.provider || 'unknown')));
  let score = 100;
  if (modelIds.size > 1) score -= 25 * (modelIds.size - 1);
  const lengths = samples.map((s) => String(s.response_text || s.output_text || '').length);
  if (lengths.length >= 2) {
    const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const variance = lengths.reduce((s, l) => s + Math.pow(l - mean, 2), 0) / lengths.length;
    const std = Math.sqrt(variance);
    const cv = mean > 0 ? Math.min(std / mean, 1) : 0;
    score -= Math.round(cv * 50);
  }
  return Math.max(0, score);
}
