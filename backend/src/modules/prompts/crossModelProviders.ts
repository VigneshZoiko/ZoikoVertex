/**
 * Cross-Model Evaluation taxonomy (Phase 6.3).
 *
 * Prompt Governance real model validation is intentionally scoped to a
 * **2-provider matrix**: Google Gemini and Groq. OpenAI and Anthropic are
 * NOT supported here (Phases 1–5 still use the OpenAI SDK as a generic
 * HTTP client for Groq, but the Prompt Governance evaluation surface
 * does not register or compare against them).
 *
 * CrossModelComparisonService and the Phase 6 dashboards use this module
 * to drive real cross-model comparison and to present consistent labels /
 * units across scorecards and dashboards.
 */
export type ProviderId = 'google' | 'groq';

export type MetricId = 'quality' | 'safety' | 'faithfulness' | 'latency' | 'cost' | 'consistency';

export interface ProviderConfig {
  id: ProviderId;
  displayName: string;
  modelId: string;
  /** USD per 1K input tokens (rough; used for cost scoring only) */
  inputCostPer1K: number;
  /** USD per 1K output tokens */
  outputCostPer1K: number;
  /** Provider weights per metric (1.0 = default; can be tuned) */
  metricWeights: Record<MetricId, number>;
}

export const PROVIDER_CONFIGS: Record<ProviderId, ProviderConfig> = {
  google: {
    id: 'google',
    displayName: 'Google Gemini 2.5 Flash',
    modelId: 'gemini-2.5-flash',
    inputCostPer1K: 0.0005,
    outputCostPer1K: 0.0015,
    metricWeights: { quality: 1.0, safety: 1.0, faithfulness: 1.0, latency: 1.0, cost: 1.0, consistency: 1.0 },
  },
  groq: {
    id: 'groq',
    displayName: 'Groq Llama 3.3 70B',
    modelId: 'llama-3.3-70b-versatile',
    inputCostPer1K: 0.00059,
    outputCostPer1K: 0.00079,
    metricWeights: { quality: 0.9, safety: 1.0, faithfulness: 0.9, latency: 1.0, cost: 1.0, consistency: 1.0 },
  },
};

export const PROVIDER_LIST: ProviderConfig[] = [
  PROVIDER_CONFIGS.google,
  PROVIDER_CONFIGS.groq,
];

export const METRIC_LIST: MetricId[] = ['quality', 'safety', 'faithfulness', 'latency', 'cost', 'consistency'];

export const METRIC_DISPLAY: Record<MetricId, { label: string; unit: string; higherIsBetter: boolean }> = {
  quality: { label: 'Quality', unit: '0-100', higherIsBetter: true },
  safety: { label: 'Safety', unit: '0-100', higherIsBetter: true },
  faithfulness: { label: 'Faithfulness', unit: '0-100', higherIsBetter: true },
  latency: { label: 'Latency', unit: 'ms (lower=better)', higherIsBetter: false },
  cost: { label: 'Cost', unit: 'USD (lower=better)', higherIsBetter: false },
  consistency: { label: 'Consistency', unit: '0-100', higherIsBetter: true },
};

/**
 * Cost estimate (USD) for a single (inputTokens, outputTokens) call against a
 * provider. Used by CrossModelComparisonService when computing the cost metric
 * for a candidate run.
 */
export function estimateCostUsd(provider: ProviderId, inputTokens: number, outputTokens: number): number {
  const cfg = PROVIDER_CONFIGS[provider];
  return Number(((inputTokens / 1000) * cfg.inputCostPer1K + (outputTokens / 1000) * cfg.outputCostPer1K).toFixed(6));
}
