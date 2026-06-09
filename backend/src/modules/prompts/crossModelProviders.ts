/**
 * Cross-Model Evaluation taxonomy (Phase 6.3).
 *
 * Prompt Governance real model validation uses a 2-model matrix within
 * Groq: the primary high-quality model vs a fast/compact model.
 * This allows comparing quality vs speed trade-offs on the same provider.
 */
export type ProviderId = 'groq' | 'groq_alt';

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
  groq: {
    id: 'groq',
    displayName: 'Groq Llama 3.3 70B',
    modelId: 'llama-3.3-70b-versatile',
    inputCostPer1K: 0.00059,
    outputCostPer1K: 0.00079,
    metricWeights: { quality: 1.0, safety: 1.0, faithfulness: 1.0, latency: 1.0, cost: 1.0, consistency: 1.0 },
  },
  groq_alt: {
    id: 'groq_alt',
    displayName: 'Groq Llama 3.1 8B (Fast)',
    modelId: 'llama-3.1-8b-instant',
    inputCostPer1K: 0.00005,
    outputCostPer1K: 0.00008,
    metricWeights: { quality: 0.85, safety: 1.0, faithfulness: 0.85, latency: 1.0, cost: 1.0, consistency: 0.9 },
  },
};

export const PROVIDER_LIST: ProviderConfig[] = [
  PROVIDER_CONFIGS.groq,
  PROVIDER_CONFIGS.groq_alt,
];

export const METRIC_LIST: MetricId[] = ['quality', 'safety', 'faithfulness', 'latency', 'cost', 'consistency'];

export const METRIC_DISPLAY: Record<MetricId, { label: string; unit: string; higherIsBetter: boolean }> = {
  quality:      { label: 'Quality',      unit: '0-100',             higherIsBetter: true  },
  safety:       { label: 'Safety',       unit: '0-100',             higherIsBetter: true  },
  faithfulness: { label: 'Faithfulness', unit: '0-100',             higherIsBetter: true  },
  latency:      { label: 'Latency',      unit: 'ms (lower=better)', higherIsBetter: false },
  cost:         { label: 'Cost',         unit: 'USD (lower=better)',higherIsBetter: false },
  consistency:  { label: 'Consistency',  unit: '0-100',             higherIsBetter: true  },
};

export function estimateCostUsd(provider: ProviderId, inputTokens: number, outputTokens: number): number {
  const cfg = PROVIDER_CONFIGS[provider];
  return Number(((inputTokens / 1000) * cfg.inputCostPer1K + (outputTokens / 1000) * cfg.outputCostPer1K).toFixed(6));
}
