-- Migration 09: API Keys and Webhook Endpoints
-- Enables workspace API key management and outbound webhook delivery

-- API Keys table
CREATE TABLE IF NOT EXISTS api_keys (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id  UUID        NOT NULL,
  name          TEXT        NOT NULL,
  key_prefix    TEXT        NOT NULL,       -- first 16 chars shown in UI
  key_hash      TEXT        NOT NULL,       -- SHA-256 of full key (never stored in plain)
  scopes        TEXT[]      NOT NULL DEFAULT '{}',
  is_active     BOOLEAN     NOT NULL DEFAULT true,
  last_used_at  TIMESTAMPTZ,
  created_by    UUID        NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_api_keys_workspace    ON api_keys (workspace_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash     ON api_keys (key_hash);
CREATE UNIQUE INDEX IF NOT EXISTS idx_api_keys_prefix_ws ON api_keys (key_prefix, workspace_id);

-- Webhook Endpoints table
CREATE TABLE IF NOT EXISTS webhook_endpoints (
  id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id      UUID        NOT NULL,
  name              TEXT        NOT NULL,
  url               TEXT        NOT NULL,
  secret            TEXT        NOT NULL,   -- HMAC-SHA256 signing secret
  events            TEXT[]      NOT NULL DEFAULT '{}',
  is_active         BOOLEAN     NOT NULL DEFAULT true,
  created_by        UUID        NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_triggered_at TIMESTAMPTZ,
  failure_count     INTEGER     NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_workspace ON webhook_endpoints (workspace_id);

-- Webhook Delivery Log table
CREATE TABLE IF NOT EXISTS webhook_delivery_log (
  id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  webhook_endpoint_id UUID        NOT NULL REFERENCES webhook_endpoints(id) ON DELETE CASCADE,
  event_type          TEXT        NOT NULL,
  payload             JSONB       NOT NULL DEFAULT '{}',
  status              TEXT        NOT NULL CHECK (status IN ('success', 'failed', 'pending')),
  response_status     INTEGER,
  response_body       TEXT,
  duration_ms         INTEGER,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_delivery_endpoint ON webhook_delivery_log (webhook_endpoint_id);
CREATE INDEX IF NOT EXISTS idx_webhook_delivery_created  ON webhook_delivery_log (created_at DESC);
