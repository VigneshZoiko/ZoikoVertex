-- ============================================================
-- ZoikoVertex — Business Units Governance & Organization Structure
-- ============================================================

-- ── 1. ENRICH business_units ──
ALTER TABLE business_units
  ADD COLUMN IF NOT EXISTS owner_id      uuid REFERENCES workspace_members(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS status        text NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN IF NOT EXISTS unit_type     text NOT NULL DEFAULT 'department',
  ADD COLUMN IF NOT EXISTS parent_id     uuid REFERENCES business_units(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_at    timestamptz,
  ADD COLUMN IF NOT EXISTS updated_by    uuid REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS archived_at   timestamptz,
  ADD COLUMN IF NOT EXISTS archived_by   uuid REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_business_units_owner    ON business_units (owner_id);
CREATE INDEX IF NOT EXISTS idx_business_units_status   ON business_units (status);
CREATE INDEX IF NOT EXISTS idx_business_units_parent   ON business_units (parent_id);

-- updated_at auto-trigger
CREATE EXTENSION IF NOT EXISTS moddatetime;
DROP TRIGGER IF EXISTS business_units_updated_at ON business_units;
CREATE TRIGGER business_units_updated_at
  BEFORE UPDATE ON business_units
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

-- ── 2. BUSINESS UNIT MEMBERS ──
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

CREATE POLICY "workspace_members_can_view_unit_members"
  ON business_unit_members FOR SELECT
  USING (
    business_unit_id IN (
      SELECT id FROM business_units WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "admins_can_manage_unit_members"
  ON business_unit_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE user_id = auth.uid()
        AND workspace_id = (SELECT workspace_id FROM business_units WHERE id = business_unit_id)
        AND role IN ('WORKSPACE_OWNER', 'ADMIN')
    )
  );

CREATE POLICY "admins_can_delete_unit_members"
  ON business_unit_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE user_id = auth.uid()
        AND workspace_id = (SELECT workspace_id FROM business_units WHERE id = business_unit_id)
        AND role IN ('WORKSPACE_OWNER', 'ADMIN')
    )
  );

-- ── 3. BUSINESS UNIT BRANDS ──
CREATE TABLE IF NOT EXISTS business_unit_brands (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_unit_id  uuid NOT NULL REFERENCES business_units(id) ON DELETE CASCADE,
  brand_id          uuid NOT NULL,
  linked_by         uuid REFERENCES users(id) ON DELETE SET NULL,
  linked_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE(business_unit_id, brand_id)
);

CREATE INDEX IF NOT EXISTS idx_bu_brands_unit  ON business_unit_brands (business_unit_id);
CREATE INDEX IF NOT EXISTS idx_bu_brands_brand ON business_unit_brands (brand_id);

ALTER TABLE business_unit_brands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_members_can_view_unit_brands"
  ON business_unit_brands FOR SELECT
  USING (
    business_unit_id IN (
      SELECT id FROM business_units WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "admins_can_manage_unit_brands"
  ON business_unit_brands FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE user_id = auth.uid()
        AND workspace_id = (SELECT workspace_id FROM business_units WHERE id = business_unit_id)
        AND role IN ('WORKSPACE_OWNER', 'ADMIN')
    )
  );

CREATE POLICY "admins_can_delete_unit_brands"
  ON business_unit_brands FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE user_id = auth.uid()
        AND workspace_id = (SELECT workspace_id FROM business_units WHERE id = business_unit_id)
        AND role IN ('WORKSPACE_OWNER', 'ADMIN')
    )
  );

-- ── 4. BUSINESS UNIT ACTIVITY LOG ──
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

CREATE INDEX IF NOT EXISTS idx_bu_activity_unit       ON business_unit_activity_log (business_unit_id);
CREATE INDEX IF NOT EXISTS idx_bu_activity_workspace   ON business_unit_activity_log (workspace_id);
CREATE INDEX IF NOT EXISTS idx_bu_activity_created     ON business_unit_activity_log (created_at DESC);

ALTER TABLE business_unit_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_members_can_view_unit_activity"
  ON business_unit_activity_log FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- ── 5. BUSINESS UNIT EVIDENCE SCOPE ──
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

CREATE POLICY "workspace_members_can_view_unit_evidence_scope"
  ON business_unit_evidence_scope FOR SELECT
  USING (
    business_unit_id IN (
      SELECT id FROM business_units WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
      )
    )
  );

-- ── 6. UPDATE RLS ON business_units ──
-- Allow admins to insert/update/archive
DROP POLICY IF EXISTS "workspace_members_can_view_units" ON business_units;

CREATE POLICY "workspace_members_can_view_units"
  ON business_units FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "admins_can_insert_units"
  ON business_units FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE user_id = auth.uid()
        AND workspace_id = business_units.workspace_id
        AND role IN ('WORKSPACE_OWNER', 'ADMIN')
    )
  );

CREATE POLICY "admins_can_update_units"
  ON business_units FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE user_id = auth.uid()
        AND workspace_id = business_units.workspace_id
        AND role IN ('WORKSPACE_OWNER', 'ADMIN')
    )
  );

CREATE POLICY "admins_can_delete_units"
  ON business_units FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE user_id = auth.uid()
        AND workspace_id = business_units.workspace_id
        AND role IN ('WORKSPACE_OWNER', 'ADMIN')
    )
  );
