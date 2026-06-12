/**
 * modelProviders.ts — production boot-time registration of real LLM adapters.
 *
 * Phase 6.2 (AdversarialTestService) and Phase 6.3 (CrossModelComparisonService)
 * both call `getModelAdapter(provider)` from ModelExecutionAdapter.ts. In tests
 * the registry is populated by test code with deterministic stubs. In production
 * the registry is populated HERE, at server boot, by reading env keys and
 * wiring two Groq model adapters (primary + fast/alt).
 *
 * Failure semantics match ModelExecutionAdapter.NullAdapter — adapters never
 * throw on model-side errors; they return a ModelExecutionResult with `error`
 * set so the caller can decide how to score a failure.
 *
 * Env contract:
 *   ENABLE_REAL_MODEL_VALIDATION  — master switch (default 'false').
 *                                   When 'false': server boots normally, no
 *                                   adapters are registered, and the real
 *                                   adversarial + cross-model services return
 *                                   a clear "skipped" status. Phase 1–5
 *                                   governance is unaffected.
 *                                   When 'true': GROQ_API_KEY MUST be set;
 *                                   boot fails if missing.
 *   GROQ_API_KEY  — registers both groq and groq_alt adapters if set and validation enabled
 */
import OpenAI from 'openai';
import { env } from '../../config/env';
import { logger } from '../../shared/logger';
import {
  ModelExecutionRequest,
  ModelExecutionResult,
  hashOutput,
  registerModelAdapter,
} from './ModelExecutionAdapter';
import { ProviderId, PROVIDER_CONFIGS } from './crossModelProviders';

type AdapterFn = (req: ModelExecutionRequest) => Promise<ModelExecutionResult>;

let _bootRegistered = false;

function nowIso(): string {
  return new Date().toISOString();
}

function emptyResult(req: ModelExecutionRequest, error: string, latencyMs: number): ModelExecutionResult {
  return {
    output: '',
    outputHash: hashOutput(''),
    latencyMs,
    finishReason: 'error',
    provider: req.provider,
    modelId: req.modelId,
    error,
    executedAt: nowIso(),
  };
}

function makeGroqAdapter(apiKey: string): AdapterFn {
  const client = new OpenAI({ apiKey, baseURL: 'https://api.groq.com/openai/v1' });
  return async (req: ModelExecutionRequest): Promise<ModelExecutionResult> => {
    const start = Date.now();
    try {
      const c = await client.chat.completions.create({
        model: req.modelId,
        messages: [
          { role: 'system', content: req.systemPrompt },
          { role: 'user', content: req.userMessage },
        ],
        temperature: req.temperature ?? 0,
        max_tokens: req.maxTokens ?? 1024,
      });
      const output = c.choices?.[0]?.message?.content ?? '';
      return {
        output,
        outputHash: hashOutput(output),
        latencyMs: Date.now() - start,
        finishReason: c.choices?.[0]?.finish_reason ?? 'unknown',
        usage: c.usage
          ? {
              inputTokens: c.usage.prompt_tokens ?? 0,
              outputTokens: c.usage.completion_tokens ?? 0,
              totalTokens: c.usage.total_tokens ?? 0,
            }
          : undefined,
        provider: req.provider,
        modelId: req.modelId,
        error: null,
        executedAt: nowIso(),
      };
    } catch (err) {
      return emptyResult(req, err instanceof Error ? err.message : String(err), Date.now() - start);
    }
  };
}

export interface ProductionAdapterRegistration {
  registered: ProviderId[];
  skipped: ProviderId[];
  /** True when ENABLE_REAL_MODEL_VALIDATION=false; the registry is empty. */
  disabled: boolean;
}

export function isRealModelValidationEnabled(): boolean {
  return env.ENABLE_REAL_MODEL_VALIDATION === 'true';
}

export function registerProductionAdapters(): ProductionAdapterRegistration {
  if (_bootRegistered) {
    return { registered: [], skipped: [], disabled: !isRealModelValidationEnabled() };
  }

  const registered: ProviderId[] = [];
  const skipped: ProviderId[] = [];
  const validationEnabled = isRealModelValidationEnabled();

  const expected: ProviderId[] = ['groq', 'groq_alt'];
  for (const id of expected) {
    if (!PROVIDER_CONFIGS[id]) {
      throw new Error(
        `registerProductionAdapters: provider "${id}" missing from PROVIDER_CONFIGS. ` +
          `Phase 6.3 taxonomy drift — fix crossModelProviders.ts before booting.`
      );
    }
  }

  if (!validationEnabled) {
    _bootRegistered = true;
    logger.info(
      { registered, skipped: expected, disabled: true, env: env.NODE_ENV },
      '[ModelProviders] Real model validation disabled (ENABLE_REAL_MODEL_VALIDATION=false). ' +
        'Phase 6 adversarial + cross-model evaluation will return skipped status. ' +
        'Phase 1–5 governance is unaffected.'
    );
    return { registered, skipped: expected, disabled: true };
  }

  if (!env.GROQ_API_KEY) {
    _bootRegistered = true;
    throw new Error(
      'ENABLE_REAL_MODEL_VALIDATION=true but GROQ_API_KEY is not set. ' +
        'Set GROQ_API_KEY, or set ENABLE_REAL_MODEL_VALIDATION=false to disable ' +
        'real model validation (Phase 1–5 governance is unaffected).'
    );
  }

  // Both groq and groq_alt use the same API key — different model IDs
  registerModelAdapter('groq', makeGroqAdapter(env.GROQ_API_KEY));
  registered.push('groq');

  registerModelAdapter('groq_alt', makeGroqAdapter(env.GROQ_API_KEY));
  registered.push('groq_alt');

  _bootRegistered = true;

  logger.info(
    { registered, skipped, disabled: false, env: env.NODE_ENV },
    '[ModelProviders] Production adapters registered (Groq primary + Groq alt)'
  );

  return { registered, skipped, disabled: false };
}

export function _resetBootRegistrationForTests(): void {
  _bootRegistered = false;
}
