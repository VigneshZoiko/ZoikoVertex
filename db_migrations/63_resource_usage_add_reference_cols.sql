-- Migration 63: Add reference_type and reference_id columns to resource_usage
-- These were in the original migration 51 definition but missing from the live table.
-- reference_type/reference_id are now also stored in metadata as a fallback,
-- but proper columns allow indexed queries.

ALTER TABLE resource_usage
  ADD COLUMN IF NOT EXISTS reference_id   UUID,
  ADD COLUMN IF NOT EXISTS reference_type TEXT;

CREATE INDEX IF NOT EXISTS idx_resource_usage_ref_type
  ON resource_usage (workspace_id, reference_type, timestamp DESC);
