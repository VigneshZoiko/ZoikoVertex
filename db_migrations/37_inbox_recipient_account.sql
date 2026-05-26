-- Migration 37: Store which connected account received each inbox message
-- Adds recipient_account_handle (username/page handle) and recipient_account_name (display name)

ALTER TABLE inbox_messages
  ADD COLUMN IF NOT EXISTS recipient_account_handle TEXT NULL,
  ADD COLUMN IF NOT EXISTS recipient_account_name   TEXT NULL;
