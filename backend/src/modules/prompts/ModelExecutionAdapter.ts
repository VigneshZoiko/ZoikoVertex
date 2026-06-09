/**
 * ModelExecutionAdapter — pluggable interface for invoking LLM models.
 *
 * AdversarialTestService and CrossModelComparisonService both need to execute
 * the prompt under test and capture the raw model response. In production this
 * calls the real provider SDK (Google Gemini, Groq). In tests and offline
 * environments a test-registered adapter is used that returns deterministic
 * fixtures.
 *
 * **Prompt Governance real model validation is intentionally scoped to a
 * 2-provider matrix (Gemini + Groq).** OpenAI and Anthropic are NOT supported
 * here. Phases 1–5 still use the OpenAI SDK as a generic HTTP client for
 * Groq, but that is outside the scope of this registry.
 *
 * Failure semantics:
 *   - Adapter must NEVER throw on model-side errors; it returns a
 *     `ModelExecutionResult` with `error` set.
 *   - Callers (adversarial runner) decide whether an error result is
 *     counted as a pass, fail, or warning.
 *   - Latency is wall-clock from request to final byte.
 *
 * Tenant isolation: each adapter implementation is responsible for stripping
 * tenant data from any request/response metadata it logs. The adapter
 * receives a tenantId in the request envelope; it MUST NOT echo it back
 * outside the LLM provider.
 */
export interface ModelExecutionRequest {
  /** Provider-specific model identifier (e.g. "gemini-2.5-flash") */
  modelId: string;
  /** Provider identifier — "groq" or "groq_alt" */
  provider: 'groq' | 'groq_alt';
  /** System prompt / instructions */
  systemPrompt: string;
  /** User / attack message */
  userMessage: string;
  /** Tenant scope (workspace_id) for logging isolation */
  tenantId: string;
  /** Max tokens for response */
  maxTokens?: number;
  /** Temperature (default 0 for deterministic adversarial eval) */
  temperature?: number;
  /** Optional model execution id for trace correlation */
  executionId?: string;
}

export interface ModelExecutionResult {
  /** Raw model output text. May be empty if the model refused. */
  output: string;
  /** SHA-256 of the raw output text. Empty-string responses have a stable hash. */
  outputHash: string;
  /** Wall-clock latency in milliseconds. */
  latencyMs: number;
  /** Provider-reported finish reason (e.g. "stop", "length", "content_filter") */
  finishReason: string;
  /** Token usage reported by the provider (if available) */
  usage?: { inputTokens: number; outputTokens: number; totalTokens: number };
  /** Provider identifier (echoed from request) */
  provider: string;
  /** Model identifier (echoed from request) */
  modelId: string;
  /** Adapter-level error (network, auth, quota, timeout). Caller decides handling. */
  error: string | null;
  /** Timestamp of execution start. */
  executedAt: string;
}

import * as crypto from 'crypto';

function hashOutput(output: string): string {
  return crypto.createHash('sha256').update(output).digest('hex');
}

/**
 * Default no-op adapter: returns a refused response. Used when no real adapter
 * is registered. Marked as such in the result so the caller can distinguish
 * a real refused model response from an "adapter missing" refusal.
 */
export class NullAdapter {
  static async execute(_request: ModelExecutionRequest): Promise<ModelExecutionResult> {
    const output = 'I cannot help with that request.';
    return {
      output,
      outputHash: hashOutput(output),
      latencyMs: 0,
      finishReason: 'content_filter',
      usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
      provider: _request.provider,
      modelId: _request.modelId,
      error: 'No ModelExecutionAdapter registered; returned refusal placeholder',
      executedAt: new Date().toISOString(),
    };
  }
}

/**
 * Registry of adapters by provider. Adversarial and cross-model runners resolve
 * an adapter at call time, falling back to NullAdapter when none is registered.
 */
type AdapterFn = (req: ModelExecutionRequest) => Promise<ModelExecutionResult>;

const adapterRegistry: Map<string, AdapterFn> = new Map();

export function registerModelAdapter(provider: string, fn: AdapterFn): void {
  adapterRegistry.set(provider, fn);
}

export function clearModelAdapters(): void {
  adapterRegistry.clear();
}

export function getModelAdapter(provider: string): AdapterFn {
  return adapterRegistry.get(provider) || NullAdapter.execute;
}

export function listRegisteredProviders(): string[] {
  return Array.from(adapterRegistry.keys());
}

export { hashOutput };
