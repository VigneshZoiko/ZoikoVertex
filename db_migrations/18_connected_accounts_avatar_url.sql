-- Migration 18: Add avatar_url to connected_accounts
-- Run in Supabase SQL Editor

ALTER TABLE connected_accounts
  ADD COLUMN IF NOT EXISTS avatar_url TEXT NULL;
