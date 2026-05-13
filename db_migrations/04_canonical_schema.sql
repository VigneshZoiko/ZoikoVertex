-- ZoikoVertex — Canonical Domain Schema
-- Migration 04: All 9 bounded context domains + event outbox
-- Does NOT modify or drop any tables from migrations 01–03
-- Run in Supabase SQL Editor

-- ─── DOMAIN 1: Organisation & Identity ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS organizations (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name           TEXT NOT NULL,
  legal_name     TEXT NULL,
  -- status: 'ACTIVE' | 'SUSPENDED' | 'TRIAL' | 'CHURNED'
  status         TEXT NOT NULL DEFAULT 'TRIAL',
  -- plan_type: 'FREE' | 'STARTER' | 'GROWTH' | 'ENTERPRISE'
  plan_type      TEXT NOT NULL DEFAULT 'FREE',
  default_currency CHAR(3) NOT NULL DEFAULT 'USD',
  primary_region TEXT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workspaces (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id      UUID NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  -- type: 'BRAND' | 'AGENCY' | 'PERSONAL'
  type        TEXT NOT NULL DEFAULT 'BRAND',
  region_code TEXT NULL,
  -- status: 'ACTIVE' | 'ARCHIVED' | 'SUSPENDED'
  status      TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- workspaces already existed — add canonical columns if missing
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS org_id      UUID NULL REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS type        TEXT NOT NULL DEFAULT 'BRAND';
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS region_code TEXT NULL;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS status      TEXT NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS roles (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id     UUID NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  -- scope: 'SYSTEM' | 'ORG' | 'WORKSPACE'
  scope      TEXT NOT NULL DEFAULT 'WORKSPACE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS role_permissions (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role_id        UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_key TEXT NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- canonical users table separate from Supabase auth.users
CREATE TABLE IF NOT EXISTS domain_users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  auth_user_id  UUID NULL, -- reference to auth.users(id)
  email         TEXT NOT NULL,
  full_name     TEXT NOT NULL,
  -- status: 'ACTIVE' | 'INVITED' | 'SUSPENDED' | 'DEACTIVATED'
  status        TEXT NOT NULL DEFAULT 'INVITED',
  last_login_at TIMESTAMPTZ NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(org_id, email)
);

CREATE TABLE IF NOT EXISTS memberships (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES domain_users(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  role_id      UUID NOT NULL REFERENCES roles(id),
  -- status: 'ACTIVE' | 'SUSPENDED' | 'REMOVED'
  status       TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, workspace_id)
);

-- ─── DOMAIN 2: Content & Asset ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS content_assets (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  workspace_id  UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  -- asset_type: 'IMAGE' | 'VIDEO' | 'COPY' | 'TEMPLATE' | 'DOCUMENT'
  asset_type    TEXT NOT NULL,
  -- source_type: 'UPLOADED' | 'AI_GENERATED' | 'IMPORTED' | 'URL'
  source_type   TEXT NOT NULL,
  -- status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED' | 'DELETED'
  status        TEXT NOT NULL DEFAULT 'DRAFT',
  title         TEXT NULL,
  canonical_uri TEXT NOT NULL,
  created_by    UUID NULL REFERENCES domain_users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS content_variants (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  asset_id         UUID NOT NULL REFERENCES content_assets(id) ON DELETE CASCADE,
  -- variant_type: 'PLATFORM_CUT' | 'TONE_VARIANT' | 'LANGUAGE_VARIANT' | 'SIZE_VARIANT'
  variant_type     TEXT NOT NULL,
  version_no       INT NOT NULL DEFAULT 1,
  content_hash     TEXT NOT NULL,
  performance_tag  TEXT NULL,
  compliance_hint  TEXT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS asset_versions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  asset_id        UUID NOT NULL REFERENCES content_assets(id) ON DELETE CASCADE,
  version_no      INT NOT NULL,
  version_payload JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS asset_usage_links (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  asset_id            UUID NOT NULL REFERENCES content_assets(id) ON DELETE CASCADE,
  -- linked_entity_type: 'CAMPAIGN' | 'EXECUTION_JOB' | 'PUBLISH_INTENT'
  linked_entity_type  TEXT NOT NULL,
  linked_entity_id    UUID NOT NULL,
  -- usage_type: 'PRIMARY' | 'THUMBNAIL' | 'VARIANT'
  usage_type          TEXT NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── DOMAIN 3: Channel & Platform ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS channels (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  workspace_id  UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  -- platform_name: 'meta' | 'google' | 'tiktok' | 'linkedin' | 'pinterest' | 'threads' | 'instagram'
  platform_name TEXT NOT NULL,
  -- channel_type: 'SOCIAL' | 'PAID' | 'EMAIL' | 'SMS'
  channel_type  TEXT NOT NULL DEFAULT 'SOCIAL',
  -- status: 'ACTIVE' | 'DISCONNECTED' | 'ERROR' | 'PENDING_AUTH'
  status        TEXT NOT NULL DEFAULT 'PENDING_AUTH',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS platform_accounts (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  channel_id          UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  external_account_id TEXT NOT NULL,
  -- auth_status: 'VALID' | 'EXPIRED' | 'REVOKED' | 'PENDING'
  auth_status         TEXT NOT NULL DEFAULT 'PENDING',
  last_sync_at        TIMESTAMPTZ NULL,
  -- health_status: 'HEALTHY' | 'DEGRADED' | 'UNREACHABLE'
  health_status       TEXT NOT NULL DEFAULT 'HEALTHY',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS connector_bindings (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  platform_account_id UUID NOT NULL REFERENCES platform_accounts(id) ON DELETE CASCADE,
  -- connector_type: 'OAUTH2' | 'API_KEY' | 'SERVICE_ACCOUNT'
  connector_type      TEXT NOT NULL,
  credentials_ref     UUID NOT NULL,
  mapping_config      JSONB NOT NULL DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS capability_maps (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  platform_account_id UUID NOT NULL REFERENCES platform_accounts(id) ON DELETE CASCADE,
  publish_content     BOOLEAN NOT NULL DEFAULT FALSE,
  launch_ad           BOOLEAN NOT NULL DEFAULT FALSE,
  update_budget       BOOLEAN NOT NULL DEFAULT FALSE,
  pause_campaign      BOOLEAN NOT NULL DEFAULT FALSE,
  fetch_metrics       BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── DOMAIN 4: Audience & Behavioural Intelligence ───────────────────────────

CREATE TABLE IF NOT EXISTS contacts (
  id                         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id                     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  workspace_id               UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  external_ref               TEXT NULL,
  email_hash_or_identifier   TEXT NULL,
  -- lifecycle_stage: 'UNKNOWN' | 'PROSPECT' | 'LEAD' | 'CUSTOMER' | 'CHURNED'
  lifecycle_stage            TEXT NOT NULL DEFAULT 'UNKNOWN',
  -- status: 'ACTIVE' | 'SUPPRESSED' | 'UNSUBSCRIBED'
  status                     TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audience_segments (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id           UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  workspace_id     UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  segment_name     TEXT NOT NULL,
  definition_json  JSONB NOT NULL DEFAULT '{}',
  -- refresh_mode: 'STATIC' | 'DYNAMIC' | 'MANUAL'
  refresh_mode     TEXT NOT NULL DEFAULT 'MANUAL',
  last_computed_at TIMESTAMPTZ NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contact_segment_memberships (
  contact_id  UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  segment_id  UUID NOT NULL REFERENCES audience_segments(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (contact_id, segment_id)
);

CREATE TABLE IF NOT EXISTS behavioural_scores (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  -- subject_type: 'CONTACT' | 'SEGMENT' | 'CAMPAIGN'
  subject_type  TEXT NOT NULL,
  subject_id    UUID NOT NULL,
  -- score_type: 'ENGAGEMENT' | 'CHURN_RISK' | 'PURCHASE_INTENT' | 'LTV'
  score_type    TEXT NOT NULL,
  score_value   NUMERIC NOT NULL,
  model_version TEXT NOT NULL,
  computed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lifecycle_states (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id  UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  state_name  TEXT NOT NULL,
  entered_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  exited_at   TIMESTAMPTZ NULL
);

-- ─── DOMAIN 6: Decision Engine (defined before Domain 5 — campaigns FK decisions) ──

CREATE TABLE IF NOT EXISTS decisions (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id               UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  workspace_id         UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  -- decision_type: 'CONTENT_PUBLISH' | 'BUDGET_MOVE' | 'CAMPAIGN_PAUSE' | 'AUDIENCE_UPDATE' | 'AD_LAUNCH'
  decision_type        TEXT NOT NULL,
  binding              BOOLEAN NOT NULL DEFAULT TRUE,
  -- action_type mirrors decision_type values
  action_type          TEXT NOT NULL,
  -- target_entity_type: 'PUBLISH_INTENT' | 'CAMPAIGN' | 'EXECUTION_JOB' | 'AUDIENCE_SEGMENT'
  target_entity_type   TEXT NOT NULL,
  target_entity_id     UUID NULL,
  selected_option_json JSONB NOT NULL DEFAULT '{}',
  confidence_score     NUMERIC NOT NULL DEFAULT 0,
  risk_score           NUMERIC NOT NULL DEFAULT 0,
  -- decision_class: 'ROUTINE' | 'ELEVATED' | 'HIGH_RISK' | 'RESTRICTED' | 'BLOCKED'
  decision_class       TEXT NOT NULL DEFAULT 'ROUTINE',
  expected_cost        NUMERIC NULL,
  expected_revenue     NUMERIC NULL,
  valid_until          TIMESTAMPTZ NULL,
  -- status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'ESCALATED' | 'EXPIRED'
  status               TEXT NOT NULL DEFAULT 'PENDING',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS decision_candidates (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  decision_id       UUID NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
  candidate_payload JSONB NOT NULL DEFAULT '{}',
  candidate_score   NUMERIC NULL,
  filtered_out      BOOLEAN NOT NULL DEFAULT FALSE,
  filtered_reason   TEXT NULL
);

CREATE TABLE IF NOT EXISTS scoring_snapshots (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  decision_id        UUID NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
  feature_values     JSONB NOT NULL DEFAULT '{}',
  weight_set_version TEXT NOT NULL,
  score_breakdown    JSONB NOT NULL DEFAULT '{}',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS decision_explanations (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  decision_id      UUID NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
  -- explanation_type: 'RISK_RATIONALE' | 'CONFIDENCE_BASIS' | 'POLICY_MATCH' | 'OVERRIDE_REASON'
  explanation_type TEXT NOT NULL,
  explanation_text TEXT NOT NULL,
  model_version    TEXT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── DOMAIN 5: Campaign & Execution ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS campaigns (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  workspace_id  UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  -- campaign_type: 'PAID_ADS' | 'ORGANIC' | 'EMAIL' | 'MIXED'
  campaign_type TEXT NOT NULL DEFAULT 'ORGANIC',
  -- status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED'
  status        TEXT NOT NULL DEFAULT 'DRAFT',
  objective     TEXT NOT NULL,
  budget_total  NUMERIC NULL,
  budget_daily  NUMERIC NULL,
  start_at      TIMESTAMPTZ NULL,
  end_at        TIMESTAMPTZ NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS campaign_channel_links (
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  channel_id  UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  -- status: 'ACTIVE' | 'PAUSED' | 'REMOVED'
  status      TEXT NOT NULL DEFAULT 'ACTIVE',
  PRIMARY KEY (campaign_id, channel_id)
);

CREATE TABLE IF NOT EXISTS campaign_schedules (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id      UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  -- schedule_type: 'ONE_TIME' | 'RECURRING' | 'CONTINUOUS'
  schedule_type    TEXT NOT NULL,
  schedule_payload JSONB NOT NULL DEFAULT '{}',
  -- status: 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'
  status           TEXT NOT NULL DEFAULT 'PENDING',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS execution_jobs (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id            UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  campaign_id       UUID NULL REFERENCES campaigns(id),
  decision_id       UUID NOT NULL REFERENCES decisions(id),
  -- action_type: 'PUBLISH_CONTENT' | 'LAUNCH_AD' | 'UPDATE_BUDGET' | 'PAUSE_CAMPAIGN' | 'SEND_EMAIL'
  action_type       TEXT NOT NULL,
  target_channel_id UUID NULL REFERENCES channels(id),
  -- status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'RETRYING'
  status            TEXT NOT NULL DEFAULT 'QUEUED',
  attempt_count     INT NOT NULL DEFAULT 0,
  queued_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at        TIMESTAMPTZ NULL,
  finished_at       TIMESTAMPTZ NULL
);

CREATE TABLE IF NOT EXISTS execution_receipts (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  execution_job_id     UUID NOT NULL REFERENCES execution_jobs(id) ON DELETE CASCADE,
  platform_receipt_ref TEXT NULL,
  -- result_status: 'SUCCESS' | 'PARTIAL_SUCCESS' | 'FAILURE' | 'PLATFORM_ERROR'
  result_status        TEXT NOT NULL,
  result_payload       JSONB NULL,
  recorded_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── DOMAIN 7: Governance & Policy ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS policies (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id       UUID NULL REFERENCES organizations(id) ON DELETE CASCADE,
  workspace_id UUID NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  -- policy_type: 'BRAND_SAFETY' | 'SPEND_CONTROL' | 'COMPLIANCE' | 'CONTENT_GATE' | 'AUDIENCE_PROTECTION'
  policy_type  TEXT NOT NULL,
  -- policy_scope: 'GLOBAL' | 'ORG' | 'WORKSPACE'
  policy_scope TEXT NOT NULL DEFAULT 'ORG',
  -- status: 'ACTIVE' | 'DRAFT' | 'ARCHIVED'
  status       TEXT NOT NULL DEFAULT 'DRAFT',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS policy_versions (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  policy_id            UUID NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
  version_no           INT NOT NULL,
  condition_expression JSONB NOT NULL DEFAULT '{}',
  -- enforcement_action: 'BLOCK' | 'ESCALATE' | 'WARN' | 'LOG_ONLY'
  enforcement_action   TEXT NOT NULL DEFAULT 'BLOCK',
  priority             INT NOT NULL DEFAULT 0,
  is_active            BOOLEAN NOT NULL DEFAULT FALSE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS policy_evaluations (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id                UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  decision_id           UUID NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
  policy_version_id     UUID NOT NULL REFERENCES policy_versions(id),
  -- result: 'PASSED' | 'FAILED' | 'ESCALATED' | 'WARNED'
  result                TEXT NOT NULL,
  matched_conditions_json JSONB NULL,
  evaluated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS approvals (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id         UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  decision_id    UUID NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
  -- status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'ESCALATED' | 'EXPIRED'
  status         TEXT NOT NULL DEFAULT 'PENDING',
  -- approval_level: 'REVIEWER' | 'VALIDATOR' | 'GOVERNANCE_ADMIN' | 'FINAL_APPROVER'
  approval_level TEXT NOT NULL,
  requested_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at    TIMESTAMPTZ NULL
);

CREATE TABLE IF NOT EXISTS approval_actions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  approval_id UUID NOT NULL REFERENCES approvals(id) ON DELETE CASCADE,
  actor_id    UUID NOT NULL,
  -- action_type: 'APPROVED' | 'REJECTED' | 'ESCALATED' | 'RETURNED' | 'OVERRIDDEN'
  action_type TEXT NOT NULL,
  reason      TEXT NULL,
  acted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS governance_tokens (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  decision_id UUID NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
  policy_hash TEXT NOT NULL,
  nonce       TEXT NOT NULL,
  issued_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at  TIMESTAMPTZ NOT NULL,
  -- status: 'VALID' | 'USED' | 'EXPIRED' | 'REVOKED'
  status      TEXT NOT NULL DEFAULT 'VALID'
);

-- ─── DOMAIN 8: Attribution & Revenue Intelligence ────────────────────────────

CREATE TABLE IF NOT EXISTS margin_profiles (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id         UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  -- subject_type: 'CAMPAIGN' | 'CHANNEL' | 'PRODUCT' | 'WORKSPACE'
  subject_type   TEXT NOT NULL,
  subject_id     UUID NOT NULL,
  margin_value   NUMERIC NOT NULL,
  -- margin_type: 'GROSS' | 'NET' | 'CONTRIBUTION'
  margin_type    TEXT NOT NULL DEFAULT 'GROSS',
  effective_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  effective_to   TIMESTAMPTZ NULL
);

CREATE TABLE IF NOT EXISTS attribution_paths (
  id                         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id                     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  conversion_ref             TEXT NOT NULL,
  touchpoint_sequence_json   JSONB NOT NULL DEFAULT '[]',
  attribution_model_version  TEXT NOT NULL,
  -- confidence_band: 'HIGH' | 'MEDIUM' | 'LOW' | 'UNATTRIBUTED'
  confidence_band            TEXT NULL,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS roi_snapshots (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id              UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  -- subject_type: 'CAMPAIGN' | 'CHANNEL' | 'WORKSPACE' | 'AD_GROUP'
  subject_type        TEXT NOT NULL,
  subject_id          UUID NOT NULL,
  roi_value           NUMERIC NULL,
  roas_value          NUMERIC NULL,
  cpa_value           NUMERIC NULL,
  revenue_value       NUMERIC NULL,
  margin_impact       NUMERIC NULL,
  -- methodology_version must be set — ROI calculations must never be untraceable
  methodology_version TEXT NOT NULL,
  snapshot_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reconciliation_runs (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id           UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  -- run_type: 'SPEND_RECONCILIATION' | 'REVENUE_RECONCILIATION' | 'ATTRIBUTION_RECOMPUTE'
  run_type         TEXT NOT NULL,
  variance_summary JSONB NOT NULL DEFAULT '{}',
  -- status: 'RUNNING' | 'COMPLETED' | 'FAILED' | 'PARTIAL'
  status           TEXT NOT NULL DEFAULT 'RUNNING',
  started_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at     TIMESTAMPTZ NULL
);

-- ─── DOMAIN 9: Orchestration ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS workflow_instances (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  -- workflow_type: 'CONTENT_PUBLISH' | 'CAMPAIGN_LAUNCH' | 'APPROVAL_ESCALATION' | 'BUDGET_REALLOCATION'
  workflow_type TEXT NOT NULL,
  -- status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'
  status        TEXT NOT NULL DEFAULT 'PENDING',
  trace_id      UUID NOT NULL DEFAULT uuid_generate_v4(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orchestration_steps (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_instance_id UUID NOT NULL REFERENCES workflow_instances(id) ON DELETE CASCADE,
  step_name            TEXT NOT NULL,
  -- step_status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'SKIPPED'
  step_status          TEXT NOT NULL DEFAULT 'PENDING',
  started_at           TIMESTAMPTZ NULL,
  completed_at         TIMESTAMPTZ NULL,
  payload_ref          JSONB NULL
);

CREATE TABLE IF NOT EXISTS workflow_failures (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_instance_id UUID NOT NULL REFERENCES workflow_instances(id) ON DELETE CASCADE,
  -- failure_type: 'STEP_ERROR' | 'TIMEOUT' | 'POLICY_BLOCK' | 'DEPENDENCY_FAILURE'
  failure_type         TEXT NOT NULL,
  failure_reason       TEXT NOT NULL,
  recorded_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── EVENT OUTBOX ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS outbox_events (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  aggregate_type TEXT NOT NULL,
  aggregate_id   UUID NOT NULL,
  event_name     TEXT NOT NULL,
  payload        JSONB NOT NULL DEFAULT '{}',
  -- status: 'PENDING' | 'PUBLISHED' | 'FAILED'
  status         TEXT NOT NULL DEFAULT 'PENDING',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at   TIMESTAMPTZ NULL
);

-- ─── INDEXES ──────────────────────────────────────────────────────────────────

-- organizations
CREATE INDEX IF NOT EXISTS idx_organizations_status ON organizations(status);

-- workspaces
CREATE INDEX IF NOT EXISTS idx_workspaces_org_id ON workspaces(org_id);

-- domain_users
CREATE INDEX IF NOT EXISTS idx_domain_users_org_id ON domain_users(org_id);
CREATE INDEX IF NOT EXISTS idx_domain_users_auth_user_id ON domain_users(auth_user_id);

-- memberships
CREATE INDEX IF NOT EXISTS idx_memberships_user_id ON memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_workspace_id ON memberships(workspace_id);

-- roles / permissions
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);

-- content_assets
CREATE INDEX IF NOT EXISTS idx_content_assets_org_workspace ON content_assets(org_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_content_assets_status ON content_assets(status);

-- content_variants
CREATE INDEX IF NOT EXISTS idx_content_variants_asset_id ON content_variants(asset_id);

-- asset_usage_links
CREATE INDEX IF NOT EXISTS idx_asset_usage_entity ON asset_usage_links(linked_entity_type, linked_entity_id);

-- channels
CREATE INDEX IF NOT EXISTS idx_channels_org_workspace ON channels(org_id, workspace_id);

-- platform_accounts
CREATE INDEX IF NOT EXISTS idx_platform_accounts_channel_id ON platform_accounts(channel_id);

-- contacts
CREATE INDEX IF NOT EXISTS idx_contacts_org_workspace ON contacts(org_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_contacts_lifecycle_stage ON contacts(lifecycle_stage);

-- audience_segments
CREATE INDEX IF NOT EXISTS idx_audience_segments_org_workspace ON audience_segments(org_id, workspace_id);

-- behavioural_scores
CREATE INDEX IF NOT EXISTS idx_behavioural_scores_subject ON behavioural_scores(subject_type, subject_id);

-- decisions (core query pattern: fetch active decisions by org + status ordered newest first)
CREATE INDEX IF NOT EXISTS idx_decisions_org_status ON decisions(org_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_decisions_workspace ON decisions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_decisions_target_entity ON decisions(target_entity_type, target_entity_id);

-- decision_candidates
CREATE INDEX IF NOT EXISTS idx_decision_candidates_decision_id ON decision_candidates(decision_id);

-- scoring_snapshots
CREATE INDEX IF NOT EXISTS idx_scoring_snapshots_decision_id ON scoring_snapshots(decision_id);

-- campaigns
CREATE INDEX IF NOT EXISTS idx_campaigns_org_workspace ON campaigns(org_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);

-- execution_jobs (core query: fetch pending retry jobs)
CREATE INDEX IF NOT EXISTS idx_execution_jobs_status_queued ON execution_jobs(status, queued_at);
CREATE INDEX IF NOT EXISTS idx_execution_jobs_decision_id ON execution_jobs(decision_id);
CREATE INDEX IF NOT EXISTS idx_execution_jobs_org_id ON execution_jobs(org_id);

-- execution_receipts
CREATE INDEX IF NOT EXISTS idx_execution_receipts_job_id ON execution_receipts(execution_job_id);

-- policies
CREATE INDEX IF NOT EXISTS idx_policies_org_id ON policies(org_id);
CREATE INDEX IF NOT EXISTS idx_policies_status ON policies(status);

-- policy_versions
CREATE INDEX IF NOT EXISTS idx_policy_versions_policy_id ON policy_versions(policy_id);
CREATE INDEX IF NOT EXISTS idx_policy_versions_active ON policy_versions(policy_id, is_active);

-- policy_evaluations (core query: fetch governance history for a decision)
CREATE INDEX IF NOT EXISTS idx_policy_evaluations_decision_id ON policy_evaluations(decision_id);
CREATE INDEX IF NOT EXISTS idx_policy_evaluations_org_id ON policy_evaluations(org_id);

-- approvals (core query: fetch approval queue by org + severity + SLA)
CREATE INDEX IF NOT EXISTS idx_approvals_org_status ON approvals(org_id, status, requested_at);
CREATE INDEX IF NOT EXISTS idx_approvals_decision_id ON approvals(decision_id);

-- governance_tokens
CREATE INDEX IF NOT EXISTS idx_governance_tokens_decision_id ON governance_tokens(decision_id);
CREATE INDEX IF NOT EXISTS idx_governance_tokens_status ON governance_tokens(status, expires_at);

-- roi_snapshots (core query: fetch ROI by campaign/channel over time window)
CREATE INDEX IF NOT EXISTS idx_roi_snapshots_subject ON roi_snapshots(org_id, subject_type, subject_id, snapshot_at DESC);

-- attribution_paths
CREATE INDEX IF NOT EXISTS idx_attribution_paths_org_id ON attribution_paths(org_id);
CREATE INDEX IF NOT EXISTS idx_attribution_paths_conversion_ref ON attribution_paths(conversion_ref);

-- workflow_instances
CREATE INDEX IF NOT EXISTS idx_workflow_instances_org_id ON workflow_instances(org_id);
CREATE INDEX IF NOT EXISTS idx_workflow_instances_trace_id ON workflow_instances(trace_id);
CREATE INDEX IF NOT EXISTS idx_workflow_instances_status ON workflow_instances(status);

-- orchestration_steps
CREATE INDEX IF NOT EXISTS idx_orchestration_steps_workflow_id ON orchestration_steps(workflow_instance_id);

-- outbox_events (core query: fetch unsent events for publisher worker)
CREATE INDEX IF NOT EXISTS idx_outbox_events_status_created ON outbox_events(status, created_at);
CREATE INDEX IF NOT EXISTS idx_outbox_events_aggregate ON outbox_events(aggregate_type, aggregate_id);

SELECT 'Migration 04 — canonical schema applied successfully' AS status;
