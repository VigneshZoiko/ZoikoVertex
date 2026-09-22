-- ZoikoVertex — Migration 89: register Review Queue audit event types
-- Run in Supabase SQL Editor
-- Safe to run multiple times (idempotent)

-- BUG-06: Review Queue actions write to the Audit Trail through
-- create_audit_event with event_type values such as 'review.item.approved'.
-- Migration 14 installs the BEFORE INSERT trigger trg_validate_audit_event_type,
-- which rejects any event_type that is not present in event_type_registry —
-- and the registry only contains the 40 canonical Appendix-A types.
-- Every Review Queue audit write therefore failed with
-- "Invalid or inactive event_type: review.item.*", the error was swallowed by
-- logReviewAuditEvent, the action still returned success and the UI confirmed
-- it — but no audit_events row was ever created.
--
-- Same class of bug as workflowExport.service.ts (workflow.exported), which
-- was fixed by switching to a registered type. Review Queue keeps its precise
-- review.item.* vocabulary, so we register the types instead.

INSERT INTO public.event_type_registry (event_type, category, display_title, description, default_risk_level, default_retention_class) VALUES
  ('review.item.submitted',          'content_lifecycle', 'Review Item Submitted',          'Item created and submitted to the review queue',            'low',    'EXTENDED'),
  ('review.item.claimed',            'approval',          'Review Item Claimed',            'Reviewer claimed the item from the shared pool',            'low',    'EXTENDED'),
  ('review.item.unclaimed',          'approval',          'Review Item Unclaimed',          'Reviewer returned the item to the shared pool',             'low',    'EXTENDED'),
  ('review.item.assigned',           'approval',          'Review Item Assigned',           'Item assigned to a reviewer',                              'low',    'EXTENDED'),
  ('review.item.approved',           'approval',          'Review Item Approved',           'Item approved in the review queue',                        'low',    'EXTENDED'),
  ('review.item.rejected',           'approval',          'Review Item Rejected',           'Item rejected in the review queue',                        'low',    'EXTENDED'),
  ('review.item.revision_requested', 'content_lifecycle', 'Revision Requested',             'Item returned to the creator for revision',                'low',    'EXTENDED'),
  ('review.item.resubmitted',        'content_lifecycle', 'Review Item Resubmitted',        'Creator resubmitted the item for re-review',               'low',    'EXTENDED'),
  ('review.item.escalated',          'approval',          'Review Item Escalated',          'Item escalated for admin review',                          'medium', 'EXTENDED'),
  ('review.item.override',           'approval',          'Review Override Applied',        'Override applied to a review item',                        'high',   'REGULATED'),
  ('review.item.released',           'content_lifecycle', 'Review Item Released',           'Approved item released to production',                     'low',    'EXTENDED')
ON CONFLICT (event_type) DO NOTHING;

SELECT 'Migration 89 — Review Queue audit event types registered successfully' AS status;
