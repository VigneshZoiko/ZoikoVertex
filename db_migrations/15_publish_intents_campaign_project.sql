-- Migration 15: Link publish_intents to campaigns and projects
-- Allows posts created in Publishing Hub to be tagged to a campaign/project

ALTER TABLE publish_intents
  ADD COLUMN IF NOT EXISTS campaign_id UUID NULL REFERENCES campaigns(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS project_id  UUID NULL REFERENCES projects(id)  ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS publish_intents_campaign_idx ON publish_intents(campaign_id);
CREATE INDEX IF NOT EXISTS publish_intents_project_idx  ON publish_intents(project_id);
