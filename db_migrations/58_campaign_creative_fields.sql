-- Migration 58: Add missing creative/tracking fields to campaigns
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS tracking_pixel_id    TEXT,
  ADD COLUMN IF NOT EXISTS conversion_event     TEXT,
  ADD COLUMN IF NOT EXISTS welcome_message      TEXT,
  ADD COLUMN IF NOT EXISTS eu_beneficiary       TEXT,
  ADD COLUMN IF NOT EXISTS eu_payer             TEXT,
  ADD COLUMN IF NOT EXISTS eu_targeting         BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS device_type          TEXT DEFAULT 'all';
