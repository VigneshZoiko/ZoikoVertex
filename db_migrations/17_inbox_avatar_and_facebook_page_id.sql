-- Migration 17: Add sender_avatar_url to inbox_messages
--               Add page_id to connected_accounts (Facebook Page numeric ID)
-- Run in Supabase SQL Editor

ALTER TABLE inbox_messages
  ADD COLUMN IF NOT EXISTS sender_avatar_url TEXT NULL;

ALTER TABLE connected_accounts
  ADD COLUMN IF NOT EXISTS page_id TEXT NULL;
