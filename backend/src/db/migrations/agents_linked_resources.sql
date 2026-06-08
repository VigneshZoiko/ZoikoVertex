-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: agents_linked_resources
-- Adds the linked_prompts, linked_workflows, linked_policies,
-- linked_knowledge_sources, and linked_channels array columns to the agents
-- table that the Wizard POST /api/v1/agents endpoint inserts into.
--
-- Run this ONCE against your Supabase SQL editor:
--   https://app.supabase.com → SQL Editor → New query → paste → Run
-- ─────────────────────────────────────────────────────────────────────────────

-- Add linked resource columns (text arrays so both UUIDs and free-text names
-- entered in the wizard are stored without type coercion failures).

ALTER TABLE agents
  ADD COLUMN IF NOT EXISTS linked_prompts          text[]  NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS linked_workflows        text[]  NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS linked_policies         text[]  NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS linked_knowledge_sources text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS linked_channels         text[]  NOT NULL DEFAULT '{}';

-- Back-fill any existing rows so the NOT NULL constraint is satisfied
-- (safe to run even after the ALTER since DEFAULT '{}' handles new rows).
UPDATE agents
SET
  linked_prompts           = COALESCE(linked_prompts,           '{}'),
  linked_workflows         = COALESCE(linked_workflows,         '{}'),
  linked_policies          = COALESCE(linked_policies,          '{}'),
  linked_knowledge_sources = COALESCE(linked_knowledge_sources, '{}'),
  linked_channels          = COALESCE(linked_channels,          '{}')
WHERE
  linked_prompts           IS NULL
  OR linked_workflows       IS NULL
  OR linked_policies        IS NULL
  OR linked_knowledge_sources IS NULL
  OR linked_channels         IS NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- Optional: GIN indexes for fast array containment queries
-- e.g.  SELECT * FROM agents WHERE 'some-prompt-id' = ANY(linked_prompts);
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_agents_linked_prompts
  ON agents USING GIN (linked_prompts);

CREATE INDEX IF NOT EXISTS idx_agents_linked_workflows
  ON agents USING GIN (linked_workflows);

CREATE INDEX IF NOT EXISTS idx_agents_linked_policies
  ON agents USING GIN (linked_policies);

CREATE INDEX IF NOT EXISTS idx_agents_linked_knowledge_sources
  ON agents USING GIN (linked_knowledge_sources);
