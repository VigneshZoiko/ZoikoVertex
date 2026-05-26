-- 19_forensic_fixes.sql
-- Fixes for gaps found in Phases 1-3 audit

-- Add forensic.legal_hold_released event type
INSERT INTO public.event_type_registry (event_type, category, display_title, description, default_risk_level, default_retention_class)
VALUES
  ('forensic.legal_hold_released', 'evidence_legal', 'Legal Hold Released', 'Legal hold released from a forensic case.', 'medium', 'EXTENDED'),
  ('forensic.task_updated', 'evidence_legal', 'Task Updated', 'Investigation task status or completion updated.', 'low', 'EXTENDED'),
  ('forensic.case_updated', 'evidence_legal', 'Case Updated', 'Case fields updated via PATCH.', 'low', 'EXTENDED')
ON CONFLICT (event_type) DO NOTHING;
