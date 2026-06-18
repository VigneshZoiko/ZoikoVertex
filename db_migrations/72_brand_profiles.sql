-- ============================================================
-- ZoikoVertex — Brand Profiles & Linguistic Sovereignty Tables
-- ============================================================

-- ── 1. BRAND PROFILES ──
-- Global brand voice templates (workspace_id = null = available to all)
-- Workspaces can create their own scoped profiles by setting workspace_id
CREATE TABLE IF NOT EXISTS brand_profiles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  description   TEXT,
  status        TEXT NOT NULL DEFAULT 'DRAFT',
  audience      TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_brand_profiles_workspace ON brand_profiles(workspace_id);

ALTER TABLE brand_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_members_can_view_brand_profiles"
  ON brand_profiles FOR SELECT
  USING (
    workspace_id IS NULL OR
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- ── 2. LINGUISTIC SOVEREIGNTY RULES ──
CREATE TABLE IF NOT EXISTS brand_linguistic_rules (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id        UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  warmth_index        INTEGER NOT NULL DEFAULT 65,
  authority_index     INTEGER NOT NULL DEFAULT 85,
  restraint_index     INTEGER NOT NULL DEFAULT 75,
  allowed_lexicon     TEXT[] NOT NULL DEFAULT '{}',
  prohibited_lexicon  TEXT[] NOT NULL DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id)
);

ALTER TABLE brand_linguistic_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_members_can_view_linguistic_rules"
  ON brand_linguistic_rules FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- ── 3. CLAIMS SUBSTANTIATION LEDGER ──
CREATE TABLE IF NOT EXISTS brand_claims (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  claim         TEXT NOT NULL,
  category      TEXT NOT NULL DEFAULT 'GENERAL',
  anchor        TEXT NOT NULL,
  expires       DATE,
  status        TEXT NOT NULL DEFAULT 'VERIFIED',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by    UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_brand_claims_workspace ON brand_claims(workspace_id);

ALTER TABLE brand_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_members_can_view_claims"
  ON brand_claims FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- ── 4. SEED GLOBAL BRAND PROFILES ──
INSERT INTO brand_profiles (id, name, description, status, audience) VALUES
  (
    'a0000000-0000-0000-0000-000000000001',
    'Corporate Authority',
    'Default institutional voice. Calm, expertise-driven, highly restrained. Designed for financial compliance and shareholder reporting.',
    'ACTIVE',
    'Enterprise Partners, Institutional Investors, Regulators'
  ),
  (
    'a0000000-0000-0000-0000-000000000002',
    'Community Catalyst',
    'Developer community channel voice. Highly warm, engaging, technical, and educational. Geared towards open-source builders.',
    'ACTIVE',
    'Developers, Builders, Independent Creators'
  ),
  (
    'a0000000-0000-0000-0000-000000000003',
    'Executive Insight',
    'Thought-leadership profile for C-suite executive agents. Focuses on macroeconomic indicators and long-term technological projections.',
    'DRAFT',
    'CXOs, Strategic Advisors, Tech Analysts'
  )
ON CONFLICT (id) DO NOTHING;
