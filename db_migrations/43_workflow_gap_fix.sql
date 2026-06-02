-- ZoikoVertex — Migration 43: Workflow Module Gap Fix
-- Creates: routing_trail, agent_safety_policy_results

-- ─── routing_trail ─────────────────────────────────────────────────────────────
-- Cross-module routing history for workflow items routed between
-- validation_desk / review_queue / approvals / quality_audit / exceptions
CREATE TABLE IF NOT EXISTS routing_trail (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_module     TEXT NOT NULL,
  source_entity_id  TEXT NOT NULL,
  target_module     TEXT NOT NULL,
  target_entity_id  TEXT NOT NULL,
  target_item_id    TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'routed',
  routed_by         TEXT NOT NULL,
  workspace_id      UUID NOT NULL,
  tenant_id         UUID,
  metadata          JSONB DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_routing_trail_workspace ON routing_trail(workspace_id);
CREATE INDEX IF NOT EXISTS idx_routing_trail_source    ON routing_trail(source_module, source_entity_id);
CREATE INDEX IF NOT EXISTS idx_routing_trail_target    ON routing_trail(target_module, target_entity_id);
CREATE INDEX IF NOT EXISTS idx_routing_trail_created   ON routing_trail(created_at DESC);

-- ─── agent_safety_policy_results ───────────────────────────────────────────────
-- Policy check results captured during workflow step execution
CREATE TABLE IF NOT EXISTS agent_safety_policy_results (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id        UUID NOT NULL,
  severity        TEXT NOT NULL DEFAULT 'medium',
  pass_fail       BOOLEAN NOT NULL DEFAULT FALSE,
  blocked_terms   TEXT[] DEFAULT '{}',
  evidence_id     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_safety_policy_results_agent ON agent_safety_policy_results(agent_id);

SELECT 'Migration 43 — Workflow gap fix applied successfully' AS status;
