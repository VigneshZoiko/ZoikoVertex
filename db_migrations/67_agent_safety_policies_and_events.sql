-- ZoikoVertex — Migration 67: Agent Safety Policies & Enforcement Events
-- Run in Supabase SQL Editor
-- Safe to run multiple times (idempotent)

-- ─── agent_safety_policies ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_safety_policies (
  id                  TEXT PRIMARY KEY,
  rule_id             TEXT NULL,
  workspace_id        UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  status              TEXT NOT NULL DEFAULT 'Draft',
  domain              TEXT NOT NULL,
  risk_category       TEXT NOT NULL,
  severity            TEXT NOT NULL,
  trigger_condition   TEXT NOT NULL,
  enforcement_action  TEXT NOT NULL,
  agent_impact        TEXT NOT NULL DEFAULT 'Medium',
  evidence_required   TEXT NOT NULL,
  escalation_path     TEXT NOT NULL,
  version             TEXT NOT NULL DEFAULT '1.0.0',
  author_id           UUID NOT NULL,
  approver_id         UUID NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── agent_enforcement_events ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_enforcement_events (
  id               TEXT PRIMARY KEY,
  rule_id          TEXT NULL,
  actor            TEXT NOT NULL,
  agent_id         UUID NULL,
  workspace_id     UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  input_reference  TEXT NULL,
  output_reference TEXT NULL,
  decision         TEXT NOT NULL,
  reason_code      TEXT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_enforcement_events_workspace ON agent_enforcement_events(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_enforcement_events_decision ON agent_enforcement_events(workspace_id, decision);
CREATE INDEX IF NOT EXISTS idx_agent_safety_policies_workspace   ON agent_safety_policies(workspace_id, status);

ALTER TABLE agent_safety_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_enforcement_events ENABLE ROW LEVEL SECURITY;

-- ─── Seed data (dev only, idempotent) ───────────────────────────────────────
INSERT INTO agent_safety_policies (id, rule_id, workspace_id, status, domain, risk_category, severity, trigger_condition, enforcement_action, agent_impact, evidence_required, escalation_path, version, author_id)
SELECT
  'POL-1715000000001', 'RUL-COM-001', w.id, 'Active', 'Compliance', 'Financial Claims', 'Critical',
  'payload contains "guarantee" OR "risk-free" OR "100% ROI"', 'Block', 'High', 'true',
  'Immediate escalation to Compliance Officer', '1.0.0', COALESCE((SELECT id FROM public.users LIMIT 1), '00000000-0000-0000-0000-000000000000')
FROM workspaces w
WHERE EXISTS (SELECT 1 FROM workspaces)
  AND NOT EXISTS (SELECT 1 FROM agent_safety_policies WHERE rule_id = 'RUL-COM-001');

INSERT INTO agent_safety_policies (id, rule_id, workspace_id, status, domain, risk_category, severity, trigger_condition, enforcement_action, agent_impact, evidence_required, escalation_path, version, author_id)
SELECT
  'POL-1715000000002', 'RUL-BRD-001', w.id, 'Active', 'Brand', 'Brand Safety', 'High',
  'payload contains "competitor" OR "alternative to"', 'Warn', 'Medium', 'true',
  'Notify Brand Manager for review', '1.0.0', COALESCE((SELECT id FROM public.users LIMIT 1), '00000000-0000-0000-0000-000000000000')
FROM workspaces w
WHERE EXISTS (SELECT 1 FROM workspaces)
  AND NOT EXISTS (SELECT 1 FROM agent_safety_policies WHERE rule_id = 'RUL-BRD-001');

INSERT INTO agent_safety_policies (id, rule_id, workspace_id, status, domain, risk_category, severity, trigger_condition, enforcement_action, agent_impact, evidence_required, escalation_path, version, author_id)
SELECT
  'POL-1715000000003', 'RUL-PII-001', w.id, 'Active', 'Compliance', 'Data Privacy', 'Critical',
  'payload contains "SSN" OR "PII" OR "personal data"', 'Quarantine', 'High', 'true',
  'Immediate escalation to Data Protection Officer', '2.0.0', COALESCE((SELECT id FROM public.users LIMIT 1), '00000000-0000-0000-0000-000000000000')
FROM workspaces w
WHERE EXISTS (SELECT 1 FROM workspaces)
  AND NOT EXISTS (SELECT 1 FROM agent_safety_policies WHERE rule_id = 'RUL-PII-001');

-- Seed enforcement events
INSERT INTO agent_enforcement_events (id, rule_id, actor, agent_id, workspace_id, input_reference, output_reference, decision, reason_code, created_at)
SELECT
  'ENF-1715000001001', 'RUL-COM-001', 'system', NULL, w.id, 'Content: "Get 100% ROI guaranteed"', NULL,
  'Block', 'Matched financial claim trigger. Executing rule action: Block', NOW() - INTERVAL '2 hours'
FROM workspaces w
WHERE EXISTS (SELECT 1 FROM workspaces)
  AND NOT EXISTS (SELECT 1 FROM agent_enforcement_events WHERE id = 'ENF-1715000001001');

INSERT INTO agent_enforcement_events (id, rule_id, actor, agent_id, workspace_id, input_reference, output_reference, decision, reason_code, created_at)
SELECT
  'ENF-1715000001002', 'RUL-BRD-001', '00000000-0000-0000-0000-000000000000', NULL, w.id,
  'Content: "Better than competitor X"', NULL,
  'Warn', 'Brand policy violation: competitor reference detected', NOW() - INTERVAL '5 hours'
FROM workspaces w
WHERE EXISTS (SELECT 1 FROM workspaces)
  AND NOT EXISTS (SELECT 1 FROM agent_enforcement_events WHERE id = 'ENF-1715000001002');

INSERT INTO agent_enforcement_events (id, rule_id, actor, agent_id, workspace_id, input_reference, output_reference, decision, reason_code, created_at)
SELECT
  'ENF-1715000001003', 'RUL-PII-001', 'system', NULL, w.id,
  'Content: "Please provide your SSN for verification"', NULL,
  'Quarantine', 'Potential PII detected. Payload strictly quarantined for forensic review.', NOW() - INTERVAL '24 hours'
FROM workspaces w
WHERE EXISTS (SELECT 1 FROM workspaces)
  AND NOT EXISTS (SELECT 1 FROM agent_enforcement_events WHERE id = 'ENF-1715000001003');

SELECT 'Migration 67 — agent_safety_policies and agent_enforcement_events tables + seed data created' AS status;
