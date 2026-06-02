ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS deletion_warning_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_organizations_inactive
  ON organizations (last_active_at)
  WHERE deleted_at IS NULL AND status != 'DELETED';

CREATE INDEX IF NOT EXISTS idx_organizations_deletion_warning
  ON organizations (deletion_warning_sent_at)
  WHERE deleted_at IS NULL AND status != 'DELETED';

NOTIFY pgrst, 'reload schema';
