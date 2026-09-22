-- Migration 90: Website Lead Capture
-- Requires: pgcrypto (gen_random_uuid), uuid-ossp (uuid_generate_v4), moddatetime extension
-- Single public intake table for all marketing-site forms (request-demo,
-- contact-sales, 48-hour audit, demo library, resources hub, privacy requests).
-- Serves as durable fallback when CRM/email delivery is unavailable.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS moddatetime;

CREATE TABLE IF NOT EXISTS public.website_leads (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  source        TEXT        NOT NULL,             -- 'request_demo' | 'contact_sales' | 'audit_request' | 'demo_library' | 'resource_download' | 'privacy_request'
  status        TEXT        NOT NULL DEFAULT 'new' CHECK (status IN ('new','in_review','contacted','qualified','converted','spam','closed')),
  priority      TEXT        NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high')),
  full_name     TEXT        NOT NULL,
  email         TEXT        NOT NULL,
  company       TEXT,
  phone         TEXT,
  country       TEXT,
  payload       JSONB       NOT NULL DEFAULT '{}',  -- form-specific fields (role, company_size, interest, challenge, toolkits, privacy topics…)
  consent       BOOLEAN     NOT NULL DEFAULT false, -- marketing contact consent captured at submit time
  source_url    TEXT,
  user_agent    TEXT,
  ip_hash       TEXT,                              -- hashed IP for abuse forensics, never raw IP
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_website_leads_source     ON public.website_leads (source);
CREATE INDEX IF NOT EXISTS idx_website_leads_status     ON public.website_leads (status);
CREATE INDEX IF NOT EXISTS idx_website_leads_created_at ON public.website_leads (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_website_leads_email      ON public.website_leads (email);

-- Public INSERT only — no anon SELECT/UPDATE/DELETE. All back-office reads and
-- status changes go through the backend service role, mirroring enterpriseSignupController.
ALTER TABLE public.website_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "website_leads_public_insert" ON public.website_leads;
CREATE POLICY "website_leads_public_insert" ON public.website_leads
  FOR INSERT TO anon
  WITH CHECK (true);

-- Keep updated_at fresh on back-office edits.
DROP TRIGGER IF EXISTS website_leads_touch_updated_at ON public.website_leads;
CREATE TRIGGER website_leads_touch_updated_at
  BEFORE UPDATE ON public.website_leads
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

COMMENT ON TABLE public.website_leads IS
  'Public marketing-site lead intake (request demo, contact sales, audit, demo library, resources, privacy). Anonymous INSERT only; reads via service role.';

-- ─── Cookie consent evidence log (page 2 item 13 — Cookie Preferences) ────────
-- Append-only record of every consent decision so the company can prove
-- when and what the visitor accepted/rejected (GDPR/ePrivacy evidence).
CREATE TABLE IF NOT EXISTS public.cookie_consents (
  id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  consent_id     TEXT        NOT NULL,               -- client-generated id; one visitor's consent thread
  action         TEXT        NOT NULL CHECK (action IN ('accept_all','reject_non_essential','save_preference')),
  preferences    JSONB       NOT NULL DEFAULT '{}',  -- per-category booleans, e.g. {"essential":true,"analytics":false,"marketing":false}
  policy_version TEXT        NOT NULL DEFAULT '1.0', -- version of the cookie policy shown at decision time
  source_url     TEXT,
  user_agent     TEXT,
  ip_hash        TEXT,                               -- hashed IP (same scheme as website_leads)
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cookie_consents_consent_id ON public.cookie_consents (consent_id);
CREATE INDEX IF NOT EXISTS idx_cookie_consents_created_at ON public.cookie_consents (created_at DESC);

ALTER TABLE public.cookie_consents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cookie_consents_public_insert" ON public.cookie_consents;
CREATE POLICY "cookie_consents_public_insert" ON public.cookie_consents
  FOR INSERT TO anon
  WITH CHECK (true);

COMMENT ON TABLE public.cookie_consents IS
  'Append-only cookie consent evidence (accept_all / reject_non_essential / save_preference). Anonymous INSERT only; no UPDATE/DELETE by design.';

-- Sanity check
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'website_leads') THEN
    RAISE EXCEPTION 'website_leads table was not created';
  END IF;
END $$;
