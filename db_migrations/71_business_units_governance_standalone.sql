-- ============================================================
-- ZoikoVertex — Business Units Governance (standalone)
-- Safe to run even if business_units already exists
-- ============================================================

-- ── 1. CREATE BASE TABLE if not exists ──
CREATE TABLE IF NOT EXISTS business_units (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  description  TEXT,
  color        TEXT NOT NULL DEFAULT '#6366f1',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by   UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_business_units_workspace ON business_units(workspace_id);

-- ── 2. ADD GOVERNANCE COLUMNS (safe — IF NOT EXISTS via DO block) ──
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='business_units' AND column_name='owner_id') THEN
    ALTER TABLE business_units ADD COLUMN owner_id uuid REFERENCES workspace_members(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='business_units' AND column_name='status') THEN
    ALTER TABLE business_units ADD COLUMN status text NOT NULL DEFAULT 'ACTIVE';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='business_units' AND column_name='unit_type') THEN
    ALTER TABLE business_units ADD COLUMN unit_type text NOT NULL DEFAULT 'department';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='business_units' AND column_name='parent_id') THEN
    ALTER TABLE business_units ADD COLUMN parent_id uuid REFERENCES business_units(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='business_units' AND column_name='updated_at') THEN
    ALTER TABLE business_units ADD COLUMN updated_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='business_units' AND column_name='updated_by') THEN
    ALTER TABLE business_units ADD COLUMN updated_by uuid REFERENCES users(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='business_units' AND column_name='archived_at') THEN
    ALTER TABLE business_units ADD COLUMN archived_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='business_units' AND column_name='archived_by') THEN
    ALTER TABLE business_units ADD COLUMN archived_by uuid REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_business_units_owner  ON business_units (owner_id);
CREATE INDEX IF NOT EXISTS idx_business_units_status ON business_units (status);
CREATE INDEX IF NOT EXISTS idx_business_units_parent ON business_units (parent_id);

-- updated_at trigger
CREATE EXTENSION IF NOT EXISTS moddatetime;
DROP TRIGGER IF EXISTS business_units_updated_at ON business_units;
CREATE TRIGGER business_units_updated_at
  BEFORE UPDATE ON business_units
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

-- ── 3. RLS ──
ALTER TABLE business_units ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "workspace_members_can_view_units" ON business_units;
CREATE POLICY "workspace_members_can_view_units"
  ON business_units FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "admins_can_insert_units" ON business_units;
CREATE POLICY "admins_can_insert_units"
  ON business_units FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM workspace_members WHERE user_id = auth.uid() AND workspace_id = business_units.workspace_id AND role IN ('WORKSPACE_OWNER', 'ADMIN')));

DROP POLICY IF EXISTS "admins_can_update_units" ON business_units;
CREATE POLICY "admins_can_update_units"
  ON business_units FOR UPDATE
  USING (EXISTS (SELECT 1 FROM workspace_members WHERE user_id = auth.uid() AND workspace_id = business_units.workspace_id AND role IN ('WORKSPACE_OWNER', 'ADMIN')));

DROP POLICY IF EXISTS "admins_can_delete_units" ON business_units;
CREATE POLICY "admins_can_delete_units"
  ON business_units FOR DELETE
  USING (EXISTS (SELECT 1 FROM workspace_members WHERE user_id = auth.uid() AND workspace_id = business_units.workspace_id AND role IN ('WORKSPACE_OWNER', 'ADMIN')));

-- ── 4. BUSINESS UNIT MEMBERS ──
CREATE TABLE IF NOT EXISTS business_unit_members (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_unit_id  uuid NOT NULL REFERENCES business_units(id) ON DELETE CASCADE,
  member_id         uuid NOT NULL REFERENCES workspace_members(id) ON DELETE CASCADE,
  role_in_unit      text NOT NULL DEFAULT 'member',
  assigned_by       uuid REFERENCES users(id) ON DELETE SET NULL,
  assigned_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE(business_unit_id, member_id)
);

CREATE INDEX IF NOT EXISTS idx_bu_members_unit   ON business_unit_members (business_unit_id);
CREATE INDEX IF NOT EXISTS idx_bu_members_member ON business_unit_members (member_id);

ALTER TABLE business_unit_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view_unit_members"
  ON business_unit_members FOR SELECT
  USING (business_unit_id IN (SELECT id FROM business_units WHERE workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())));

CREATE POLICY "insert_unit_members"
  ON business_unit_members FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM workspace_members WHERE user_id = auth.uid() AND workspace_id = (SELECT workspace_id FROM business_units WHERE id = business_unit_id) AND role IN ('WORKSPACE_OWNER', 'ADMIN')));

CREATE POLICY "delete_unit_members"
  ON business_unit_members FOR DELETE
  USING (EXISTS (SELECT 1 FROM workspace_members WHERE user_id = auth.uid() AND workspace_id = (SELECT workspace_id FROM business_units WHERE id = business_unit_id) AND role IN ('WORKSPACE_OWNER', 'ADMIN')));

-- ── 5. BUSINESS UNIT BRANDS ──
CREATE TABLE IF NOT EXISTS business_unit_brands (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_unit_id  uuid NOT NULL REFERENCES business_units(id) ON DELETE CASCADE,
  brand_id          uuid NOT NULL,
  linked_by         uuid REFERENCES users(id) ON DELETE SET NULL,
  linked_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE(business_unit_id, brand_id)
);

CREATE INDEX IF NOT EXISTS idx_bu_brands_unit  ON business_unit_brands (business_unit_id);

ALTER TABLE business_unit_brands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view_unit_brands"
  ON business_unit_brands FOR SELECT
  USING (business_unit_id IN (SELECT id FROM business_units WHERE workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())));

CREATE POLICY "insert_unit_brands"
  ON business_unit_brands FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM workspace_members WHERE user_id = auth.uid() AND workspace_id = (SELECT workspace_id FROM business_units WHERE id = business_unit_id) AND role IN ('WORKSPACE_OWNER', 'ADMIN')));

CREATE POLICY "delete_unit_brands"
  ON business_unit_brands FOR DELETE
  USING (EXISTS (SELECT 1 FROM workspace_members WHERE user_id = auth.uid() AND workspace_id = (SELECT workspace_id FROM business_units WHERE id = business_unit_id) AND role IN ('WORKSPACE_OWNER', 'ADMIN')));

-- ── 6. BUSINESS UNIT ACTIVITY LOG ──
CREATE TABLE IF NOT EXISTS business_unit_activity_log (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_unit_id  uuid NOT NULL REFERENCES business_units(id) ON DELETE CASCADE,
  workspace_id      uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  actor_id          uuid REFERENCES users(id) ON DELETE SET NULL,
  actor_name        text NOT NULL DEFAULT 'system',
  actor_role        text NOT NULL DEFAULT 'system',
  event_type        text NOT NULL,
  description       text NOT NULL DEFAULT '',
  before_state      jsonb NOT NULL DEFAULT '{}'::jsonb,
  after_state       jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bu_activity_unit     ON business_unit_activity_log (business_unit_id);
CREATE INDEX IF NOT EXISTS idx_bu_activity_workspace ON business_unit_activity_log (workspace_id);
CREATE INDEX IF NOT EXISTS idx_bu_activity_created   ON business_unit_activity_log (created_at DESC);

ALTER TABLE business_unit_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view_unit_activity"
  ON business_unit_activity_log FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));

-- ── 7. BUSINESS UNIT EVIDENCE SCOPE ──
CREATE TABLE IF NOT EXISTS business_unit_evidence_scope (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_unit_id  uuid NOT NULL REFERENCES business_units(id) ON DELETE CASCADE,
  evidence_id       uuid NOT NULL,
  scope_type        text NOT NULL DEFAULT 'restricted',
  linked_by         uuid REFERENCES users(id) ON DELETE SET NULL,
  linked_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE(business_unit_id, evidence_id)
);

CREATE INDEX IF NOT EXISTS idx_bu_evidence_unit ON business_unit_evidence_scope (business_unit_id);

ALTER TABLE business_unit_evidence_scope ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view_unit_evidence_scope"
  ON business_unit_evidence_scope FOR SELECT
  USING (business_unit_id IN (SELECT id FROM business_units WHERE workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())));
