-- ============================================================
-- Meta Pixel CAPI Tracking
-- Tracks which pixels have had ZoikoVertex CAPI configured.
-- Written when a workspace generates an integration key.
-- Run once against your Supabase project.
-- ============================================================

CREATE TABLE IF NOT EXISTS meta_pixel_capi (
  pixel_id     TEXT        NOT NULL,
  workspace_id UUID        NOT NULL,
  enabled_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (pixel_id, workspace_id)
);

CREATE INDEX IF NOT EXISTS idx_meta_pixel_capi_workspace
  ON meta_pixel_capi (workspace_id);
