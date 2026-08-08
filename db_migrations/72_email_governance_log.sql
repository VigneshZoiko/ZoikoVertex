-- 72_email_governance_log.sql
-- Governed email audit + idempotency store (Commercial Email Communications System, doc §1).
-- Every send records: template id/version, event id, stream, recipient + role, delivery basis,
-- status, provider message id, and idempotency key. Backend-only (service role); RLS denies all else.

CREATE TABLE IF NOT EXISTS email_log (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key      text,
  template_id          text,                 -- e.g. ZV-IAM-001 (null for legacy/ad-hoc sends)
  template_version     text,
  event_id             text,                 -- authoritative backend event that triggered the send
  stream               text NOT NULL DEFAULT 'transactional',  -- transactional|security|billing|legal|marketing
  recipient_email      text NOT NULL,
  recipient_role       text,
  delivery_basis       text,                 -- why this recipient is authorized to receive it
  subject              text,
  status               text NOT NULL,        -- sent|failed|skipped_no_client|skipped_duplicate|skipped_unauthorized
  provider             text NOT NULL DEFAULT 'resend',
  provider_message_id  text,
  error                text,
  created_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_log_idem      ON email_log (idempotency_key, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_log_recipient ON email_log (recipient_email, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_log_template  ON email_log (template_id, created_at DESC);

-- Backend writes via the service-role key (bypasses RLS). Enable RLS with no policies so
-- anon / authenticated clients cannot read the communication audit trail.
ALTER TABLE email_log ENABLE ROW LEVEL SECURITY;
