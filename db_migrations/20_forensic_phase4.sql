-- 20_forensic_phase4.sql
-- Phase 4: AI Assist, SIEM routing, External Auditor Workspace

-- AI summary storage
CREATE TABLE IF NOT EXISTS case_ai_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES forensic_cases(id) ON DELETE CASCADE,
  summary_type TEXT NOT NULL DEFAULT 'case_summary',
  content TEXT NOT NULL,
  citations JSONB DEFAULT '[]'::jsonb,
  confidence_score DECIMAL(3,2),
  status TEXT NOT NULL DEFAULT 'draft',
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  approved BOOLEAN DEFAULT false,
  rejection_reason TEXT,
  generated_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_case_ai_summaries_case ON case_ai_summaries(case_id);
CREATE INDEX IF NOT EXISTS idx_case_ai_summaries_type ON case_ai_summaries(summary_type);
CREATE INDEX IF NOT EXISTS idx_case_ai_summaries_status ON case_ai_summaries(status);

-- SIEM routing log (forensic-specific events pushed to SIEM subscriptions)
CREATE TABLE IF NOT EXISTS forensic_siem_routing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES forensic_cases(id) ON DELETE CASCADE,
  subscription_id UUID,
  event_type TEXT NOT NULL,
  payload JSONB,
  status TEXT NOT NULL DEFAULT 'pending',
  delivered_at TIMESTAMPTZ,
  error_message TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_forensic_siem_routing_case ON forensic_siem_routing(case_id);
CREATE INDEX IF NOT EXISTS idx_forensic_siem_routing_status ON forensic_siem_routing(status);

-- External auditor sessions
CREATE TABLE IF NOT EXISTS auditor_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auditor_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  case_id UUID REFERENCES forensic_cases(id) ON DELETE SET NULL,
  export_id UUID REFERENCES case_exports(id) ON DELETE SET NULL,
  access_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  last_accessed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auditor_sessions_token ON auditor_sessions(access_token);
CREATE INDEX IF NOT EXISTS idx_auditor_sessions_auditor ON auditor_sessions(auditor_id);

-- Anomaly detection results
CREATE TABLE IF NOT EXISTS case_anomalies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES forensic_cases(id) ON DELETE CASCADE,
  anomaly_type TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  actors TEXT[] DEFAULT '{}',
  policies TEXT[] DEFAULT '{}',
  events TEXT[] DEFAULT '{}',
  severity TEXT NOT NULL DEFAULT 'medium',
  frequency INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_case_anomalies_case ON case_anomalies(case_id);
CREATE INDEX IF NOT EXISTS idx_case_anomalies_type ON case_anomalies(anomaly_type);

-- RLS
ALTER TABLE case_ai_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE forensic_siem_routing ENABLE ROW LEVEL SECURITY;
ALTER TABLE auditor_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_anomalies ENABLE ROW LEVEL SECURITY;

-- Event type registry entries for Phase 4
INSERT INTO public.event_type_registry (event_type, category, display_title, description, default_risk_level, default_retention_class)
VALUES
  ('forensic.ai_summary_generated', 'evidence_legal', 'AI Summary Generated', 'AI-generated case summary draft created.', 'low', 'EXTENDED'),
  ('forensic.ai_summary_approved', 'evidence_legal', 'AI Summary Approved', 'AI summary approved by human reviewer.', 'medium', 'REGULATED'),
  ('forensic.anomaly_detected', 'evidence_legal', 'Anomaly Detected', 'Anomaly pattern detected in case data.', 'medium', 'EXTENDED'),
  ('forensic.siem_routed', 'evidence_legal', 'SIEM Routed', 'Forensic event routed to SIEM subscription.', 'low', 'EXTENDED'),
  ('forensic.auditor_accessed', 'evidence_legal', 'Auditor Accessed', 'External auditor accessed case package.', 'high', 'REGULATED'),
  ('forensic.recommendations_generated', 'evidence_legal', 'Recommendations Generated', 'AI-suggested next actions for case.', 'low', 'EXTENDED')
ON CONFLICT (event_type) DO NOTHING;
