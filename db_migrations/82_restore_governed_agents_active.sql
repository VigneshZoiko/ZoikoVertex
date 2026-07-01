-- Restore all 6 governed validation agents to ACTIVE (Live) status.
--
-- These agents run automatically inside the Post Governance pipeline and must
-- always be ACTIVE. If any were manually paused via the Agent Studio UI they
-- will not fire during governance checks, silently breaking safety/compliance.
-- This migration resets them unconditionally.
--
-- Agents covered (keyed by name set in AGENT_CATALOG / seedValidationAgents.ts):
--   • Image Validation Agent
--   • General Content Agent
--   • Approval Rules Agent
--   • Policy Check Agent
--   • Evidence KB Agent
--   • Platform Compliance Agent

UPDATE public.agents
SET
  status     = 'ACTIVE',
  updated_at = NOW()
WHERE name IN (
  'Image Validation Agent',
  'General Content Agent',
  'Approval Rules Agent',
  'Policy Check Agent',
  'Evidence / KB Agent',
  'Platform Compliance Agent'
)
AND status != 'ACTIVE';
