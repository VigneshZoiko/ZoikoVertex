-- Track OAuth token expiry and status on connected_accounts
-- Enables proactive background refresh before tokens expire silently

ALTER TABLE connected_accounts
  ADD COLUMN IF NOT EXISTS token_expires_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS token_status      TEXT NOT NULL DEFAULT 'active';
  -- token_status values: 'active' | 'expiring_soon' | 'refresh_failed' | 'disconnected'

-- Index so the refresh worker can quickly find accounts needing attention
CREATE INDEX IF NOT EXISTS idx_connected_accounts_token_expires
  ON connected_accounts (token_expires_at ASC)
  WHERE token_status <> 'disconnected';
