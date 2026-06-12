import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('5006'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  SUPABASE_URL: z.string().url(),
  SUPABASE_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  GROQ_API_KEY: z.string().optional(),
  // Optional Gemini fallback for AI classification (used only if Groq is
  // unavailable). Classification degrades gracefully when neither is set.
  GEMINI_API_KEY: z.string().optional(),
  // Phase 6 — Optional real model validation flag.
  // Default 'false': server starts normally without GROQ_API_KEY, Phase 6
  // real adversarial + cross-model evaluation short-circuit to a clear
  // "skipped" status, and all Phase 1–5 governance flows continue to work.
  // When 'true': GROQ_API_KEY MUST be set; boot fails if missing.
  // See modules/prompts/modelProviders.ts.
  ENABLE_REAL_MODEL_VALIDATION: z.string().default('false'),
  META_APP_ID: z.string().optional(),
  META_APP_SECRET: z.string().optional(),
  META_REDIRECT_URI: z.string().optional(),
  META_WEBHOOK_VERIFY_TOKEN: z.string().optional(),
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),
  LINKEDIN_CLIENT_ID: z.string().optional(),
  LINKEDIN_CLIENT_SECRET: z.string().optional(),
  LINKEDIN_REDIRECT_URI: z.string().optional(),
  PINTEREST_CLIENT_ID: z.string().optional(),
  PINTEREST_CLIENT_SECRET: z.string().optional(),
  PINTEREST_REDIRECT_URI: z.string().optional(),
  PINTEREST_API_BASE: z.string().url().optional(),
  THREADS_APP_ID: z.string().optional(),
  THREADS_APP_SECRET: z.string().optional(),
  THREADS_REDIRECT_URI: z.string().optional(),
  TWITTER_CLIENT_ID: z.string().optional(),
  TWITTER_CLIENT_SECRET: z.string().optional(),
  TWITTER_REDIRECT_URI: z.string().optional(),
  YOUTUBE_CLIENT_ID: z.string().optional(),
  YOUTUBE_CLIENT_SECRET: z.string().optional(),
  YOUTUBE_REDIRECT_URI: z.string().optional(),
  GOOGLE_ADS_DEVELOPER_TOKEN:    z.string().optional(),
  GOOGLE_ADS_CLIENT_ID:          z.string().optional(),
  GOOGLE_ADS_CLIENT_SECRET:      z.string().optional(),
  GOOGLE_ADS_REDIRECT_URI:       z.string().optional(),
  GOOGLE_ADS_LOGIN_CUSTOMER_ID:  z.string().optional(), // Agency MCC customer ID (10-digit, no dashes)
  REDIS_URL: z.string().optional(),
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  // Required for internal service-to-service calls to /api/v1/users/provision
  INTERNAL_SERVICE_SECRET: z.string().min(32).optional(),
  // Stripe billing
  STRIPE_SECRET_KEY:      z.string().optional(),
  STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET:  z.string().optional(),
  STRIPE_PRICE_GROWTH:    z.string().optional(),
  STRIPE_PRICE_SCALE:     z.string().optional(),
  // Deposit hold window in hours (default 48 = 2 days)
  DEPOSIT_HOLD_HOURS: z.string().default('48'),
  // Resend for email notifications
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default('ZoikoVertex <noreply@zoikovertex.com>'),
  // Slack webhook URL for workflow notifications
  SLACK_WEBHOOK_URL: z.string().optional(),
  // Phase 4 — Governed Prompt Execution. When 'true' AND NODE_ENV=production,
  // a model call site that still uses an inline prompt (no governed prompt
  // resolved) FAILS CLOSED. Default 'false' so rollout is deliberate and the
  // product is not broken before governed prompts are seeded per use-case.
  PROMPT_GOVERNANCE_ENFORCED: z.string().default('false'),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error('❌ Invalid environment variables:', JSON.stringify(result.error.format(), null, 2));
  process.exit(1);
}

export const env = result.data;
