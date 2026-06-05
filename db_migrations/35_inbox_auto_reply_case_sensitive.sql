-- Migration 35: Add is_case_sensitive to inbox_auto_reply_rules
-- Run in Supabase SQL Editor

ALTER TABLE inbox_auto_reply_rules
  ADD COLUMN IF NOT EXISTS is_case_sensitive BOOLEAN NOT NULL DEFAULT false;
