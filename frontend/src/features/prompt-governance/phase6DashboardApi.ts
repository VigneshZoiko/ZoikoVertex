import { api } from "@/lib/api";

/**
 * Phase 6.5 dashboard API client.
 *
 * Three read-only rollup views consumed by EvaluationDashboard /
 * AdversarialDashboard / DriftDashboard. Backend:
 *   GET /api/v1/prompts/dashboard/evaluation   (govView)
 *   GET /api/v1/prompts/dashboard/adversarial  (govView)
 *   GET /api/v1/prompts/dashboard/drift        (govView)
 *
 * All three return { success, data, generated_at }. Unwrap to `data`.
 */

async function unwrap<T>(path: string): Promise<T> {
  const r: any = await api.get(path);
  if (r && r.success === false) {
    throw new Error(r.error || r.data?.error?.message || "Request failed");
  }
  return (r?.data ?? r) as T;
}

// ── Evaluation view ─────────────────────────────────────────────────────────
export type PDIBand = "EXCELLENT" | "STRONG" | "MODERATE" | "WEAK";
// Prompt Governance real model validation is intentionally scoped to a
// 2-provider matrix (Gemini + Groq). OpenAI and Anthropic are NOT supported.
export type ProviderId = "google" | "groq";

export interface EvaluationPDIPoint {
  prompt_id: string | null;
  version_id: string | null;
  score: number;
  band: PDIBand;
  at: string;
}
export interface EvaluationPassPoint {
  pass_fail: string;
  score: number;
  at: string;
}
export interface CrossModelRanking {
  provider: ProviderId;
  wins: number;
}
export interface EvaluationView {
  workspace_id: string;
  generated_at: string;
  /**
   * True when ENABLE_REAL_MODEL_VALIDATION=true at boot. The dashboard
   * renders a "Validation Disabled" notice when this is false.
   */
  validation_enabled: boolean;
  /** Provider ids currently registered in the boot-time adapter registry. */
  registered_providers: ProviderId[];
  pdi: {
    summary: {
      total_computed: number;
      average_score: number;
      band_distribution: Record<PDIBand, number>;
    };
    trend: EvaluationPDIPoint[];
  };
  evaluation: {
    total_runs: number;
    pass_rate: number;
    passed: number;
    failed: number;
    warnings: number;
    trend: EvaluationPassPoint[];
  };
  cross_model: {
    rankings: CrossModelRanking[];
    providers_evaluated: number;
    most_recent_winner: ProviderId | null;
    last_evaluation_at: string | null;
  };
}

// ── Adversarial view ─────────────────────────────────────────────────────────
export type AdversarialCategoryId =
  | "prompt_injection"
  | "jailbreak"
  | "data_extraction"
  | "policy_bypass"
  | "role_override"
  | "harmful_content"
  | "sensitive_disclosure"
  | "encoding_attack"
  | "context_overflow"
  | "consistency_probe";

export interface AdversarialCategoryStats {
  total: number;
  passed: number;
  failed: number;
  warnings: number;
  pass_rate: number;
}
export interface AdversarialSeverityStats {
  total: number;
  failed: number;
}
export interface AdversarialView {
  workspace_id: string;
  generated_at: string;
  /**
   * True when ENABLE_REAL_MODEL_VALIDATION=true at boot. The dashboard
   * renders a "Validation Disabled" notice when this is false.
   */
  validation_enabled: boolean;
  /** Provider ids currently registered in the boot-time adapter registry. */
  registered_providers: ProviderId[];
  summary: {
    total_attacks: number;
    passed: number;
    failed: number;
    pass_rate: number;
    bypasses_detected: number;
  };
  by_category: Record<AdversarialCategoryId, AdversarialCategoryStats>;
  by_severity: Record<string, AdversarialSeverityStats>;
  category_metadata: Record<AdversarialCategoryId, { label: string; description: string }>;
  recent_attacks: Array<{
    prompt_id: string | null;
    version_id: string | null;
    category: string;
    severity: string;
    verdict: string;
    bypass_detected: boolean;
    at: string;
  }>;
}

// ── Drift view ───────────────────────────────────────────────────────────────
export type BehavioralDriftCategory =
  | "output_quality"
  | "rejection_rate"
  | "hallucination"
  | "faithfulness"
  | "brand_alignment"
  | "policy_trigger"
  | "tone_shift"
  | "length_drift"
  | "vocabulary_shift"
  | "format_drift";

export interface DriftView {
  workspace_id: string;
  generated_at: string;
  /**
   * True when ENABLE_REAL_MODEL_VALIDATION=true at boot. Drift detection
   * does not call model adapters directly (it inspects runtime traces).
   * The flag is exposed for dashboard UI consistency.
   */
  validation_enabled: boolean;
  /** Provider ids currently registered in the boot-time adapter registry. */
  registered_providers: ProviderId[];
  summary: {
    total_findings: number;
    prompts_with_drift: number;
    by_severity: { low: number; medium: number; high: number; critical: number };
  };
  by_category: Record<
    BehavioralDriftCategory,
    { total: number; by_severity: Record<string, number> }
  >;
  incidents: Array<{
    incident_id: string;
    prompt_id: string;
    version_id: string;
    category: BehavioralDriftCategory;
    severity: string;
    drift_score: number;
    opened_at: string;
  }>;
  reports: Array<{
    prompt_id: string;
    version_id: string;
    drift_score: number;
    findings_count: number;
    opened_at: string;
    report_url?: string;
  }>;
}

// ── API surface ─────────────────────────────────────────────────────────────
export const phase6DashboardApi = {
  getEvaluation: () =>
    unwrap<EvaluationView>("/api/v1/prompts/dashboard/evaluation"),
  getAdversarial: () =>
    unwrap<AdversarialView>("/api/v1/prompts/dashboard/adversarial"),
  getDrift: () => unwrap<DriftView>("/api/v1/prompts/dashboard/drift"),
};
