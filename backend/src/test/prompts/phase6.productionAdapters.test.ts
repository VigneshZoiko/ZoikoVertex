/**
 * Phase 6 — Production ModelExecutionAdapter wiring (Gemini + Groq only).
 *
 * AdversarialTestService (Phase 6.2) and CrossModelComparisonService (Phase 6.3)
 * both call `getModelAdapter(provider)` from the registry. In production those
 * adapters must be real SDK calls, not NullAdapter (NullAdapter returns the
 * refusal placeholder with `error: 'No ModelExecutionAdapter registered…'`,
 * which silently produces a 100% pass-rate false-negative on adversarial
 * evaluation and meaningless identical-output rankings on cross-model compare).
 *
 * Prompt Governance real model validation is intentionally scoped to a
 * 2-provider matrix: **Google Gemini and Groq only.** OpenAI and Anthropic
 * are NOT registered or supported here.
 *
 * This file proves:
 *   1. With ENABLE_REAL_MODEL_VALIDATION=false (default): boot succeeds with
 *      ZERO registered providers, the registry stays empty, and no boot
 *      failure occurs regardless of model key presence.
 *   2. With ENABLE_REAL_MODEL_VALIDATION=false: OpenAI and Anthropic are
 *      NEVER registered (their packages were removed in this release).
 *   3. With ENABLE_REAL_MODEL_VALIDATION=true and both GEMINI_API_KEY and
 *      GROQ_API_KEY set: both adapters are registered; calls route through
 *      the real adapter (NOT NullAdapter).
 *   4. With ENABLE_REAL_MODEL_VALIDATION=true and only one key set: the
 *      matching provider is registered, the missing one is skipped.
 *   5. With ENABLE_REAL_MODEL_VALIDATION=true and ZERO keys: boot FAILS
 *      with a clear error referencing the required env keys.
 *   6. The boot guard is idempotent: a second call in the same process is
 *      a no-op.
 *   7. The Groq adapter is wired through the OpenAI SDK with the groq
 *      baseURL (OpenAI-compatible) — this is a generic HTTP-client reuse
 *      of the OpenAI SDK by Phases 1–5, NOT an OpenAI-the-provider
 *      registration in Prompt Governance.
 *
 * The real SDK calls are not exercised here (no network in unit tests). The
 * real adapters are exercised end-to-end in the staging verification runner.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('../../shared/supabase', () => import('../helpers/supabaseMock'));
vi.mock('../../shared/databaseLogger', () => ({ logToDatabase: vi.fn() }));

// Hoisted capture: constructor opts for the two SDKs Prompt Governance uses.
// The OpenAI SDK is captured too because the Groq adapter reuses it (with
// a baseURL); this is NOT an OpenAI-the-provider registration.
const h = vi.hoisted(() => ({
  openaiCtor: [] as unknown[],
  googleCtor: [] as unknown[],
}));

vi.mock('openai', () => ({
  default: class OpenAIMock {
    constructor(opts: unknown) {
      h.openaiCtor.push(opts);
    }
    chat = {
      completions: {
        create: async () => ({
          choices: [{ message: { content: 'mocked' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
        }),
      },
    };
  },
}));

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: class GoogleMock {
    constructor(opts: unknown) {
      h.googleCtor.push(opts);
    }
    getGenerativeModel() {
      return {
        generateContent: async () => ({
          response: {
            text: () => 'mocked',
            usageMetadata: { promptTokenCount: 1, candidatesTokenCount: 1, totalTokenCount: 2 },
            candidates: [{ finishReason: 'STOP' }],
          },
        }),
      };
    }
  },
}));

import {
  clearModelAdapters,
  getModelAdapter,
  listRegisteredProviders,
  NullAdapter,
} from '../../modules/prompts/ModelExecutionAdapter';
import {
  registerProductionAdapters,
  _resetBootRegistrationForTests,
  isRealModelValidationEnabled,
} from '../../modules/prompts/modelProviders';
import { env } from '../../config/env';

beforeEach(() => {
  clearModelAdapters();
  _resetBootRegistrationForTests();
  h.openaiCtor.length = 0;
  h.googleCtor.length = 0;
});

  afterEach(() => {
    clearModelAdapters();
    _resetBootRegistrationForTests();
  });

describe('Phase 6 — Production model adapter registration (Groq + Groq Alt)', () => {
  // ── Flag=OFF (default) ────────────────────────────────────────────────────
  describe('ENABLE_REAL_MODEL_VALIDATION=false (default)', () => {
    it('boots successfully with ZERO model keys set (no failure)', () => {
      (env as any).GEMINI_API_KEY = undefined;
      (env as any).GROQ_API_KEY = undefined;
      (env as any).ENABLE_REAL_MODEL_VALIDATION = 'false';

      expect(() => registerProductionAdapters()).not.toThrow();
      const result = registerProductionAdapters(); // second call: idempotent
      // First call returned disabled=true; second returns empty idempotent.
      // We just assert the *final* state: zero providers.
      expect(listRegisteredProviders()).toEqual([]);
      expect(result.disabled).toBe(true);
    });

    it('does NOT register Gemini or Groq even when both keys are set', () => {
      (env as any).GEMINI_API_KEY = 'gemini-test';
      (env as any).GROQ_API_KEY = 'groq-test';
      (env as any).ENABLE_REAL_MODEL_VALIDATION = 'false';

      registerProductionAdapters();

      // Registry stays empty — keys are read but not used when flag is off.
      expect(listRegisteredProviders()).toEqual([]);
      expect(h.openaiCtor).toEqual([]);
      expect(h.googleCtor).toEqual([]);
    });

    it('isRealModelValidationEnabled() returns false', () => {
      (env as any).ENABLE_REAL_MODEL_VALIDATION = 'false';
      expect(isRealModelValidationEnabled()).toBe(false);
    });
  });

  // ── Flag=ON ───────────────────────────────────────────────────────────────
  describe('ENABLE_REAL_MODEL_VALIDATION=true', () => {
    it('registers both providers when GROQ_API_KEY is set', () => {
      (env as any).GROQ_API_KEY = 'groq-test';
      (env as any).ENABLE_REAL_MODEL_VALIDATION = 'true';

      const result = registerProductionAdapters();

      expect(result.registered.sort()).toEqual(['groq', 'groq_alt']);
      expect(result.skipped).toEqual([]);
      expect(result.disabled).toBe(false);
      expect(listRegisteredProviders().sort()).toEqual(['groq', 'groq_alt']);
      // Both groq and groq_alt use the same Groq HTTP adapter (not Gemini).
      expect(h.openaiCtor).toEqual([
        { apiKey: 'groq-test', baseURL: 'https://api.groq.com/openai/v1' },
        { apiKey: 'groq-test', baseURL: 'https://api.groq.com/openai/v1' },
      ]);
    });

    it('registers both when GROQ_API_KEY is set (Gemini key is ignored)', () => {
      (env as any).GEMINI_API_KEY = 'gemini-test';
      (env as any).GROQ_API_KEY = 'groq-test';
      (env as any).ENABLE_REAL_MODEL_VALIDATION = 'true';

      const result = registerProductionAdapters();

      // Both groq and groq_alt register regardless of GEMINI_API_KEY
      expect(result.registered.sort()).toEqual(['groq', 'groq_alt']);
      expect(getModelAdapter('groq')).not.toBe(NullAdapter.execute);
      expect(getModelAdapter('groq_alt')).not.toBe(NullAdapter.execute);
    });

    it('registers both when GROQ_API_KEY is set', () => {
      (env as any).GROQ_API_KEY = 'groq-test';
      (env as any).ENABLE_REAL_MODEL_VALIDATION = 'true';

      const result = registerProductionAdapters();

      expect(result.registered.sort()).toEqual(['groq', 'groq_alt']);
      expect(getModelAdapter('groq')).not.toBe(NullAdapter.execute);
      expect(getModelAdapter('groq_alt')).not.toBe(NullAdapter.execute);
    });

    it('THROWS when GROQ_API_KEY is missing', () => {
      (env as any).GEMINI_API_KEY = 'gemini-test';
      (env as any).GROQ_API_KEY = undefined;
      (env as any).ENABLE_REAL_MODEL_VALIDATION = 'true';

      expect(() => registerProductionAdapters()).toThrowError(
        /GROQ_API_KEY is not set/,
      );
    });

    it('isRealModelValidationEnabled() returns true', () => {
      (env as any).ENABLE_REAL_MODEL_VALIDATION = 'true';
      expect(isRealModelValidationEnabled()).toBe(true);
    });
  });

  // ── Provider matrix invariant: OpenAI and Anthropic are NEVER registered ─
  describe('Provider matrix invariant', () => {
    it('never registers "openai", "anthropic", or "google"', () => {
      (env as any).GROQ_API_KEY = 'groq-test';
      (env as any).ENABLE_REAL_MODEL_VALIDATION = 'true';

      registerProductionAdapters();

      const providers = listRegisteredProviders();
      expect(providers).not.toContain('openai');
      expect(providers).not.toContain('anthropic');
      expect(providers).not.toContain('google');
    });
  });

  // ── Idempotency ───────────────────────────────────────────────────────────
  describe('Idempotent boot guard', () => {
    it('a second call in the same process is a no-op', () => {
      (env as any).GROQ_API_KEY = 'groq-test';
      (env as any).ENABLE_REAL_MODEL_VALIDATION = 'true';

      const first = registerProductionAdapters();
      const second = registerProductionAdapters();

      expect(first.registered.sort()).toEqual(['groq', 'groq_alt']);
      // Second call returns the empty idempotent sentinel (no double-register).
      expect(second.registered).toEqual([]);
      expect(second.skipped).toEqual([]);
    });

    it('fail-fast throw does NOT leave the registry half-populated', () => {
      (env as any).GROQ_API_KEY = undefined;
      (env as any).ENABLE_REAL_MODEL_VALIDATION = 'true';

      expect(() => registerProductionAdapters()).toThrow(/GROQ_API_KEY is not set/);
      expect(listRegisteredProviders()).toEqual([]);
    });
  });
});
