-- Add refresh_token column to connected_accounts for OAuth token refresh support
-- Required for YouTube (Google tokens expire after 1 hour)
ALTER TABLE connected_accounts
  ADD COLUMN IF NOT EXISTS refresh_token TEXT;
