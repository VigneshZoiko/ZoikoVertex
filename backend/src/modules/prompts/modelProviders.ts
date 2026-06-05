/**
 * modelProviders.ts — production boot-time registration of real LLM adapters.
 *
 * Phase 6.2 (AdversarialTestService) and Phase 6.3 (CrossModelComparisonService)
 * both call `getModelAdapter(provider)` from ModelExecutionAdapter.ts. In tests
 * the registry is populated by test code with deterministic stubs. In production
 * the registry is populated HERE, at server boot, by reading env keys and
 * wiring the matching provider SDKs (Google Gemini, Groq).
 *
 * **Prompt Governance real model validation is intentionally scoped to a
 * 2-provider matrix (Gemini + Groq).** OpenAI and Anthropic are NOT
 * registered or supported here.
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
 *                                   When 'true': at least one of GEMINI_API_KEY
 *                                   or GROQ_API_KEY MUST be set; boot fails
 *                                   with a clear error if both are missing.
 *   GEMINI_API_KEY   — registers a Google Gemini adapter if set and validation enabled
 *   GROQ_API_KEY     — registers a Groq adapter (OpenAI-compatible) if set and validation enabled
 *
 * Tenant isolation: adapters receive `tenantId` in the request envelope and
 * MUST NOT echo it outside the LLM provider. The provider SDKs in use do not
 * log request bodies by default; we do not wrap them in a logger that would
 * surface tenant IDs.
 */
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
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
  // Groq exposes an OpenAI-compatible chat completions endpoint, so we reuse
  // the OpenAI SDK with a different baseURL — same pattern used by
  // intelligenceController.ts and inboxClassifier.ts. The OpenAI SDK is a
  // dependency of Phases 1–5 and is also reused here as a generic HTTP
  // client. We do NOT register an OpenAI-the-provider adapter in Prompt
  // Governance — see crossModelProviders.ts.
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

function makeGoogleAdapter(apiKey: string): AdapterFn {
  const client = new GoogleGenerativeAI(apiKey);
  return async (req: ModelExecutionRequest): Promise<ModelExecutionResult> => {
    const start = Date.now();
    try {
      const model = client.getGenerativeModel({ model: req.modelId });
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: req.userMessage }] }],
        systemInstruction: { role: 'system', parts: [{ text: req.systemPrompt }] },
        generationConfig: {
          temperature: req.temperature ?? 0,
          maxOutputTokens: req.maxTokens ?? 1024,
        },
      });
      const output = result.response.text();
      const usage = result.response.usageMetadata;
      return {
        output,
        outputHash: hashOutput(output),
        latencyMs: Date.now() - start,
        finishReason: result.response.candidates?.[0]?.finishReason ?? 'unknown',
        usage: usage
          ? {
              inputTokens: usage.promptTokenCount ?? 0,
              outputTokens: usage.candidatesTokenCount ?? 0,
              totalTokens: usage.totalTokenCount ?? 0,
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

/**
 * Boot-time registration. Idempotent — calling twice in the same process is a
 * no-op (the adapter map is shared, so the second call would overwrite anyway;
 * this guard makes that explicit and keeps the boot log clean).
 *
 * Behavior matrix:
 *   ENABLE_REAL_MODEL_VALIDATION=false (default):
 *     - registers nothing
 *     - logs "validation disabled"
 *     - returns { registered: [], skipped: ['google', 'groq'], disabled: true }
 *     - does NOT throw regardless of model key presence
 *
 *   ENABLE_REAL_MODEL_VALIDATION=true:
 *     - requires GEMINI_API_KEY and/or GROQ_API_KEY
 *     - throws if both are missing
 *     - registers the providers whose key is set, skips the rest
 *
 * Returns the list of providers that successfully wired up, the list of
 * providers whose API key was missing, and a `disabled` flag for downstream
 * services to short-circuit when validation is off.
 */
export interface ProductionAdapterRegistration {
  registered: ProviderId[];
  skipped: ProviderId[];
  /** True when ENABLE_REAL_MODEL_VALIDATION=false; the registry is empty. */
  disabled: boolean;
}

/** True iff ENABLE_REAL_MODEL_VALIDATION=true at boot time. */
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

  // Sanity check: if PROVIDER_CONFIGS does not list these two, the registry
  // here has drifted from the cross-model taxonomy. Loud-fail so we do not
  // ship a broken Phase 6.3.
  const expected: ProviderId[] = ['google', 'groq'];
  for (const id of expected) {
    if (!PROVIDER_CONFIGS[id]) {
      throw new Error(
        `registerProductionAdapters: provider "${id}" missing from PROVIDER_CONFIGS. ` +
          `Phase 6.3 taxonomy drift — fix crossModelProviders.ts before booting.`
      );
    }
  }

  if (!validationEnabled) {
    // Validation disabled: register nothing, never throw. The Phase 6
    // services (runRealAdversarialSuite, runRealCrossModelComparison) will
    // short-circuit with a clear "skipped" status when they detect an empty
    // registry, instead of calling NullAdapter and producing a silent
    // false-positive pass.
    _bootRegistered = true;
    logger.info(
      { registered, skipped: expected, disabled: true, env: env.NODE_ENV },
      '[ModelProviders] Real model validation disabled (ENABLE_REAL_MODEL_VALIDATION=false). ' +
        'Phase 6 adversarial + cross-model evaluation will return skipped status. ' +
        'Phase 1–5 governance is unaffected.'
    );
    return { registered, skipped: expected, disabled: true };
  }

  // Validation enabled: register available providers; fail-closed if both missing.
  if (env.GEMINI_API_KEY) {
    registerModelAdapter('google', makeGoogleAdapter(env.GEMINI_API_KEY));
    registered.push('google');
  } else {
    skipped.push('google');
  }

  if (env.GROQ_API_KEY) {
    registerModelAdapter('groq', makeGroqAdapter(env.GROQ_API_KEY));
    registered.push('groq');
  } else {
    skipped.push('groq');
  }

  if (registered.length === 0) {
    _bootRegistered = true;
    throw new Error(
      'ENABLE_REAL_MODEL_VALIDATION=true but neither GEMINI_API_KEY nor GROQ_API_KEY is set. ' +
        'Set at least one of them, or set ENABLE_REAL_MODEL_VALIDATION=false to disable ' +
        'real model validation (Phase 1–5 governance is unaffected).'
    );
  }

  _bootRegistered = true;

  logger.info(
    { registered, skipped, disabled: false, env: env.NODE_ENV },
    '[ModelProviders] Production adapters registered'
  );

  return { registered, skipped, disabled: false };
}

/**
 * Reset the boot-registration guard. Used only by tests; never call from
 * production code paths. Tests that explicitly want to call
 * `registerProductionAdapters()` more than once in a single worker must
 * reset the flag between calls.
 */
export function _resetBootRegistrationForTests(): void {
  _bootRegistered = false;
}
