-- Migration 59: Add ads_data JSONB column to campaigns
-- Stores the array of ad objects (multi-ad support) from the campaign wizard

ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS ads_data JSONB;
