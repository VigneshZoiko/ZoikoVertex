ZOIKOVERTEX
Data Model & Database Architecture

1. Purpose of This Document
This document defines the full canonical data model and database architecture for ZoikoVertex. It translates the bounded contexts, governance logic, decision model, execution flow, and financial trust requirements into a data system that engineers can build without inventing structure on the fly.
It governs operational storage, event persistence, analytical storage, projection models, retention rules, schema evolution discipline, and data-security treatment. It also establishes which data belongs where, how it is queried, and how it remains trustworthy at scale.

2. Data Architecture Principles
One authoritative owner per entity. Every canonical entity must have one owning domain and one authoritative write path.
Separation of operational truth from analytical truth. Transactional systems, event history, warehouse analytics, and read projections must not be conflated.
Event-backed state transition. Meaningful changes must emit events that can drive workflows, projections, and replay.
Multi-tenancy is mandatory. Tenant-scoped entities must always carry org_id and, where required, workspace_id and region_id.
Append-heavy records remain reconstructable. Decisions, approvals, overrides, executions, and finance-facing records must support replay and audit.
Finance-facing outputs must be reconcilable. ROI, revenue attribution, and profit-impact views must be traceable to source events and methodology versions.
3. Data Architecture Layers

3.1 OLTP Layer
Stores authoritative records for organizations, users, campaigns, decisions, approvals, execution state, policies, and connector bindings.
Strong consistency required for governance-sensitive and execution-sensitive records.
3.2 Event Layer
Carries immutable events for decisions, governance outcomes, execution results, financial signals, and audit classes.
Must support replay, durable publication, downstream projections, and lag visibility.
3.3 OLAP / Warehouse Layer
Stores denormalized analytical facts and dimensions for ROI, attribution, trend reporting, campaign health, and executive summaries.
Eventual consistency is acceptable, but methodology versioning is mandatory for finance-facing results.
3.4 Cache / Projection Layer
Supports hot dashboard reads, approval queue views, campaign health summaries, decision quality snapshots, and platform ranking summaries.
Cache is never source of truth. Projections are disposable and rebuildable.
4. Domain Data Ownership

Non-owning domains may consume data through APIs, read models, or subscribed events. They may not directly mutate authoritative state held by another domain.
5. Entity Model
The entity model below is the minimum viable canonical set for ZoikoVertex as a governed autonomous digital marketing operating system. It is intentionally broader than a simple martech schema because governance, decisioning, and finance are first-class citizens in the product.
5.1 Organisation & Identity
organizations
id UUID PK
name TEXT NOT NULL
legal_name TEXT NULL
status TEXT NOT NULL
plan_type TEXT NOT NULL
default_currency CHAR(3) NOT NULL
primary_region TEXT NULL
created_at TIMESTAMP NOT NULL
updated_at TIMESTAMP NOT NULL
Rules: unique index on legal_name is optional and jurisdiction-dependent; status must use controlled enum values; plan_type drives entitlements elsewhere but is owned here.
workspaces
id UUID PK
org_id UUID NOT NULL FK -> organizations.id
name TEXT NOT NULL
type TEXT NOT NULL
region_code TEXT NULL
status TEXT NOT NULL
created_at TIMESTAMP NOT NULL
updated_at TIMESTAMP NOT NULL
users
id UUID PK
org_id UUID NOT NULL FK -> organizations.id
email TEXT NOT NULL
full_name TEXT NOT NULL
status TEXT NOT NULL
last_login_at TIMESTAMP NULL
created_at TIMESTAMP NOT NULL
updated_at TIMESTAMP NOT NULL
memberships
id UUID PK
user_id UUID NOT NULL FK -> users.id
workspace_id UUID NOT NULL FK -> workspaces.id
role_id UUID NOT NULL FK -> roles.id
status TEXT NOT NULL
created_at TIMESTAMP NOT NULL
5.2 Content & Asset
content_assets
id UUID PK
org_id UUID NOT NULL
workspace_id UUID NOT NULL
asset_type TEXT NOT NULL
source_type TEXT NOT NULL
status TEXT NOT NULL
title TEXT NULL
canonical_uri TEXT NOT NULL
created_by UUID NULL
created_at TIMESTAMP NOT NULL
updated_at TIMESTAMP NOT NULL
content_variants
id UUID PK
asset_id UUID NOT NULL FK -> content_assets.id
variant_type TEXT NOT NULL
version_no INT NOT NULL
content_hash TEXT NOT NULL
performance_tag TEXT NULL
compliance_hint TEXT NULL
created_at TIMESTAMP NOT NULL
asset_versions
id UUID PK
asset_id UUID NOT NULL FK -> content_assets.id
version_no INT NOT NULL
version_payload JSONB NOT NULL
created_at TIMESTAMP NOT NULL
asset_usage_links
id UUID PK
asset_id UUID NOT NULL FK -> content_assets.id
linked_entity_type TEXT NOT NULL
linked_entity_id UUID NOT NULL
usage_type TEXT NOT NULL
created_at TIMESTAMP NOT NULL
5.3 Channel & Platform
channels
id UUID PK
org_id UUID NOT NULL
workspace_id UUID NOT NULL
platform_name TEXT NOT NULL
channel_type TEXT NOT NULL
status TEXT NOT NULL
created_at TIMESTAMP NOT NULL
platform_accounts
id UUID PK
channel_id UUID NOT NULL FK -> channels.id
external_account_id TEXT NOT NULL
auth_status TEXT NOT NULL
last_sync_at TIMESTAMP NULL
health_status TEXT NOT NULL
created_at TIMESTAMP NOT NULL
updated_at TIMESTAMP NOT NULL
connector_bindings
id UUID PK
platform_account_id UUID NOT NULL FK -> platform_accounts.id
connector_type TEXT NOT NULL
credentials_ref UUID NOT NULL
mapping_config JSONB NOT NULL
created_at TIMESTAMP NOT NULL
updated_at TIMESTAMP NOT NULL
capability_maps
id UUID PK
platform_account_id UUID NOT NULL FK -> platform_accounts.id
publish_content BOOLEAN NOT NULL
launch_ad BOOLEAN NOT NULL
update_budget BOOLEAN NOT NULL
pause_campaign BOOLEAN NOT NULL
fetch_metrics BOOLEAN NOT NULL
updated_at TIMESTAMP NOT NULL
5.4 Audience & Behavioural Intelligence
contacts
id UUID PK
org_id UUID NOT NULL
workspace_id UUID NOT NULL
external_ref TEXT NULL
email_hash_or_identifier TEXT NULL
lifecycle_stage TEXT NOT NULL
status TEXT NOT NULL
created_at TIMESTAMP NOT NULL
updated_at TIMESTAMP NOT NULL
audience_segments
id UUID PK
org_id UUID NOT NULL
workspace_id UUID NOT NULL
segment_name TEXT NOT NULL
definition_json JSONB NOT NULL
refresh_mode TEXT NOT NULL
last_computed_at TIMESTAMP NULL
created_at TIMESTAMP NOT NULL
contact_segment_memberships
contact_id UUID NOT NULL FK -> contacts.id
segment_id UUID NOT NULL FK -> audience_segments.id
assigned_at TIMESTAMP NOT NULL
PRIMARY KEY(contact_id, segment_id)
behavioural_scores
id UUID PK
org_id UUID NOT NULL
subject_type TEXT NOT NULL
subject_id UUID NOT NULL
score_type TEXT NOT NULL
score_value NUMERIC NOT NULL
model_version TEXT NOT NULL
computed_at TIMESTAMP NOT NULL
lifecycle_states
id UUID PK
contact_id UUID NOT NULL FK -> contacts.id
state_name TEXT NOT NULL
entered_at TIMESTAMP NOT NULL
exited_at TIMESTAMP NULL
5.5 Campaign & Execution
campaigns
id UUID PK
org_id UUID NOT NULL
workspace_id UUID NOT NULL
name TEXT NOT NULL
campaign_type TEXT NOT NULL
status TEXT NOT NULL
objective TEXT NOT NULL
budget_total NUMERIC NULL
budget_daily NUMERIC NULL
start_at TIMESTAMP NULL
end_at TIMESTAMP NULL
created_at TIMESTAMP NOT NULL
updated_at TIMESTAMP NOT NULL
campaign_channel_links
campaign_id UUID NOT NULL FK -> campaigns.id
channel_id UUID NOT NULL FK -> channels.id
status TEXT NOT NULL
PRIMARY KEY(campaign_id, channel_id)
campaign_schedules
id UUID PK
campaign_id UUID NOT NULL FK -> campaigns.id
schedule_type TEXT NOT NULL
schedule_payload JSONB NOT NULL
status TEXT NOT NULL
created_at TIMESTAMP NOT NULL
execution_jobs
id UUID PK
org_id UUID NOT NULL
campaign_id UUID NULL FK -> campaigns.id
decision_id UUID NOT NULL FK -> decisions.id
action_type TEXT NOT NULL
target_channel_id UUID NULL FK -> channels.id
status TEXT NOT NULL
attempt_count INT NOT NULL DEFAULT 0
queued_at TIMESTAMP NOT NULL
started_at TIMESTAMP NULL
finished_at TIMESTAMP NULL
execution_receipts
id UUID PK
execution_job_id UUID NOT NULL FK -> execution_jobs.id
platform_receipt_ref TEXT NULL
result_status TEXT NOT NULL
result_payload JSONB NULL
recorded_at TIMESTAMP NOT NULL
5.6 Decision Engine
decisions
id UUID PK
org_id UUID NOT NULL
workspace_id UUID NOT NULL
decision_type TEXT NOT NULL
binding BOOLEAN NOT NULL
action_type TEXT NOT NULL
target_entity_type TEXT NOT NULL
target_entity_id UUID NULL
selected_option_json JSONB NOT NULL
confidence_score NUMERIC NOT NULL
risk_score NUMERIC NOT NULL
decision_class TEXT NOT NULL
expected_cost NUMERIC NULL
expected_revenue NUMERIC NULL
valid_until TIMESTAMP NULL
status TEXT NOT NULL
created_at TIMESTAMP NOT NULL
decision_candidates
id UUID PK
decision_id UUID NOT NULL FK -> decisions.id
candidate_payload JSONB NOT NULL
candidate_score NUMERIC NULL
filtered_out BOOLEAN NOT NULL DEFAULT FALSE
filtered_reason TEXT NULL
scoring_snapshots
id UUID PK
decision_id UUID NOT NULL FK -> decisions.id
feature_values JSONB NOT NULL
weight_set_version TEXT NOT NULL
score_breakdown JSONB NOT NULL
created_at TIMESTAMP NOT NULL
decision_explanations
id UUID PK
decision_id UUID NOT NULL FK -> decisions.id
explanation_type TEXT NOT NULL
explanation_text TEXT NOT NULL
model_version TEXT NULL
created_at TIMESTAMP NOT NULL
5.7 Governance & Policy
policies
id UUID PK
org_id UUID NULL
workspace_id UUID NULL
policy_type TEXT NOT NULL
policy_scope TEXT NOT NULL
status TEXT NOT NULL
created_at TIMESTAMP NOT NULL
updated_at TIMESTAMP NOT NULL
policy_versions
id UUID PK
policy_id UUID NOT NULL FK -> policies.id
version_no INT NOT NULL
condition_expression JSONB NOT NULL
enforcement_action TEXT NOT NULL
priority INT NOT NULL
is_active BOOLEAN NOT NULL
created_at TIMESTAMP NOT NULL
policy_evaluations
id UUID PK
org_id UUID NOT NULL
decision_id UUID NOT NULL FK -> decisions.id
policy_version_id UUID NOT NULL FK -> policy_versions.id
result TEXT NOT NULL
matched_conditions_json JSONB NULL
evaluated_at TIMESTAMP NOT NULL
approvals
id UUID PK
org_id UUID NOT NULL
decision_id UUID NOT NULL FK -> decisions.id
status TEXT NOT NULL
approval_level TEXT NOT NULL
requested_at TIMESTAMP NOT NULL
resolved_at TIMESTAMP NULL
approval_actions
id UUID PK
approval_id UUID NOT NULL FK -> approvals.id
actor_id UUID NOT NULL
action_type TEXT NOT NULL
reason TEXT NULL
acted_at TIMESTAMP NOT NULL
governance_tokens
id UUID PK
org_id UUID NOT NULL
decision_id UUID NOT NULL FK -> decisions.id
policy_hash TEXT NOT NULL
nonce TEXT NOT NULL
issued_at TIMESTAMP NOT NULL
expires_at TIMESTAMP NOT NULL
status TEXT NOT NULL
5.8 Attribution & Revenue Intelligence
margin_profiles
id UUID PK
org_id UUID NOT NULL
subject_type TEXT NOT NULL
subject_id UUID NOT NULL
margin_value NUMERIC NOT NULL
margin_type TEXT NOT NULL
effective_from TIMESTAMP NOT NULL
effective_to TIMESTAMP NULL
attribution_paths
id UUID PK
org_id UUID NOT NULL
conversion_ref TEXT NOT NULL
touchpoint_sequence_json JSONB NOT NULL
attribution_model_version TEXT NOT NULL
confidence_band TEXT NULL
created_at TIMESTAMP NOT NULL
roi_snapshots
id UUID PK
org_id UUID NOT NULL
subject_type TEXT NOT NULL
subject_id UUID NOT NULL
roi_value NUMERIC NULL
roas_value NUMERIC NULL
cpa_value NUMERIC NULL
revenue_value NUMERIC NULL
margin_impact NUMERIC NULL
methodology_version TEXT NOT NULL
snapshot_at TIMESTAMP NOT NULL
reconciliation_runs
id UUID PK
org_id UUID NOT NULL
run_type TEXT NOT NULL
variance_summary JSONB NOT NULL
status TEXT NOT NULL
started_at TIMESTAMP NOT NULL
completed_at TIMESTAMP NULL
5.9 Orchestration
workflow_instances
id UUID PK
org_id UUID NOT NULL
workflow_type TEXT NOT NULL
status TEXT NOT NULL
trace_id UUID NOT NULL
created_at TIMESTAMP NOT NULL
updated_at TIMESTAMP NOT NULL
orchestration_steps
id UUID PK
workflow_instance_id UUID NOT NULL FK -> workflow_instances.id
step_name TEXT NOT NULL
step_status TEXT NOT NULL
started_at TIMESTAMP NULL
completed_at TIMESTAMP NULL
payload_ref JSONB NULL
workflow_failures
id UUID PK
workflow_instance_id UUID NOT NULL FK -> workflow_instances.id
failure_type TEXT NOT NULL
failure_reason TEXT NOT NULL
recorded_at TIMESTAMP NOT NULL
6. Field-Level Contract Rules
Primary keys use UUIDs across canonical operational entities.
Timestamp fields use UTC and explicit *_at naming.
Status fields must use controlled enum sets documented in code and migrations.
JSONB is allowed only for bounded flexible payloads, not as a substitute for relational modeling where cross-entity joins matter.
Any field used in governance, execution, or finance decisions must not be nullable unless lifecycle requires temporary incompleteness.
7. Table-by-Table Indexing Strategy


8. Partitioning Strategy
Partitioning must be explicit, not aspirational.

Small reference tables such as roles, templates, or capability_maps do not need partitioning.
9. Transaction Boundary Rules
This was missing and is mandatory. Not every related state change belongs in one database transaction.
9.1 Must be atomic in a single transaction
Decision record creation plus transactional outbox write
Approval action creation plus approval-status update plus transactional outbox write
Governance token issuance plus decision/governance state transition plus outbox write
9.2 Must be asynchronous / eventually consistent
Execution side-effects in external platforms
Warehouse projections and analytical snapshots
Dashboard projections and cached summaries
Large attribution recomputations

10. Event / Outbox / CDC Strategy
ZoikoVertex cannot rely on a vague 'events table' model. It needs a formal publication approach.
10.1 Transactional outbox
outbox_events
------------
id UUID PK
aggregate_type TEXT NOT NULL
aggregate_id UUID NOT NULL
event_name TEXT NOT NULL
payload JSONB NOT NULL
status TEXT NOT NULL
created_at TIMESTAMP NOT NULL
published_at TIMESTAMP NULL
10.2 Publication rule
Canonical state change is committed first with an outbox row in the same transaction.
Publisher workers read unsent outbox rows, publish to broker, then mark as published.
Deduplication must be supported through event_id and consumer idempotency.
10.3 CDC option
CDC may be used selectively for analytics or projection pipelines, but must not replace explicit domain events for governance-critical actions.
11. Query Patterns
Data architecture must reflect actual product usage. The following queries are core and should drive indexes, projections, and caching.
Fetch active decisions by org and status, ordered by newest first.
Fetch approval queue by org, severity, SLA state, and requested_at.
Fetch campaign health summary by workspace.
Fetch latest executive profit-impact summary by org and date.
Fetch decision replay inputs by trace_id or decision_id.
Fetch governance evaluation history for a decision.
Fetch execution jobs pending retry by status and queued_at.
Fetch ROI snapshots by campaign or channel over time window.
12. Analytical Warehouse Model
12.1 Fact tables
fact_decisions
fact_executions
fact_spend
fact_revenue
fact_roi
fact_policy_evaluations
fact_approvals
12.2 Dimension tables
dim_time
dim_org
dim_workspace
dim_campaign
dim_channel
dim_content_asset
dim_audience_segment
dim_decision_type
dim_policy_type
12.3 Derived marts
executive_profit_impact_daily
campaign_health_daily
channel_efficiency_daily
decision_quality_daily
governance_latency_daily
13. Read Models and Projection Strategy
The frontend must consume stable projections and presentation APIs, not raw canonical tables.
executive_dashboard_projection
approval_queue_projection
governance_alert_projection
campaign_health_projection
platform_intelligence_projection
roi_workspace_projection
13.1 Projection rebuild model
Primary source of truth for projection rebuilds is the persisted event stream plus selected canonical snapshots.
Projection version must be tracked when business logic changes materially.
Stale projection thresholds must be visible and measurable.
Projection rebuild jobs must support backfill and selective replay.
14. Data Consistency Model

Cache must never be treated as source of truth. Projection freshness timestamps are mandatory for operator visibility.
15. Data Lifecycle, Retention, and Archival
15.1 Retention classes

15.2 Hot / warm / cold model
Hot: current campaigns, open approvals, recent decisions, live dashboards.
Warm: recent quarters of decision, ROI, and execution history used in normal operations.
Cold: archived telemetry, old event history, old evidence bundles, old model evaluation artifacts.
15.3 Archive destination
Archived cold data should move to lower-cost analytical or object storage while preserving traceability for audit and replay where required.
16. PII Boundary Model and Data Governance
Security mentions are not enough. The data architecture must define where sensitive data lives and how it is treated.
16.1 Sensitive classes
Contact identifiers and external refs
Revenue-linked customer records
Approval rationale and override reasons
Connector credential references
Potentially regulated content and audit evidence bundles
16.2 Rules
PII should remain in the transactional layer unless explicitly required elsewhere.
Analytical projections should use masked, hashed, or minimized identifiers whenever possible.
Logs must redact sensitive fields.
Exports and evidence bundles must respect tenant and role boundaries.
17. Multi-Region and Residency Strategy
ZoikoVertex must be region-aware even if region pinning is phased in later.
Tenant records must support region pinning metadata.
PII-sensitive or regulated data should support residency-aware storage boundaries in future state.
Analytical centralization is acceptable only where legal constraints allow it.
Projection layers may be region-local or centrally derived depending latency and residency requirements.
18. Financial Reconstruction Logic
The finance-facing model must be stronger than a generic 'financial_records' table.
Spend and revenue should be normalized from source systems into event-backed references or canonical financial ingest tables.
ROI snapshots must include methodology_version so that later model changes do not silently rewrite historic meaning.
Reconciliation runs must capture variance, unmatched records, and data-quality flags.
Unattributed revenue bucket must be explicit rather than hidden.

19. Schema Evolution and Naming Conventions
19.1 Schema evolution rules
Prefer additive changes over destructive changes.
All event schema changes require explicit versioning.
Finance-impacting and governance-impacting changes require migration notes and downstream impact review.
Read-model rebuild strategy is mandatory when canonical fields change meaning.
19.2 Naming rules
Tables use plural snake_case.
Primary keys use id.
Foreign keys use <entity>_id.
Timestamps use *_at naming and UTC values.
Status fields use controlled enums, not free text.
20. Failure Modes and Safeguards

21. Final CTO Position
This document defines what data exists, where it lives, who owns it, how it is queried, how it moves between transactional truth and analytical truth, and how it remains defensible under audit, governance, and scale. It is now suitable as the canonical data architecture baseline for ZoikoVertex.

Purpose: This document defines the full canonical data model, database architecture, storage separation, schema contracts, indexing, partitioning, transaction boundaries, event/outbox model, query patterns, projection strategy, data lifecycle, PII boundaries, financial reconstruction logic, multi-region posture, and schema evolution rules required to build ZoikoVertex as governed infrastructure.
Architectural consequence: If this document is weak, ZoikoVertex may look coherent in product demos while failing under real load, governance review, or finance scrutiny. If it is strong, the event model, APIs, projections, and ROI engine can all be built on stable foundations.
Layer | Purpose | Primary Technology Direction
OLTP | Transactional state, authoritative configuration, operational entities, decision/governance/execution records | PostgreSQL
Event Layer | Immutable domain events, audit events, async propagation, replay signals | Kafka plus durable event sink
OLAP / Warehouse | ROI analysis, trend reporting, historical performance, executive analytics | ClickHouse / BigQuery / Snowflake
Cache / Projection Layer | Low-latency dashboard views, approval queues, hot-path summaries, temporary coordination | Redis plus materialized projections
Domain | Authoritative Entities
Organisation & Identity | organizations, workspaces, users, roles, memberships, api_credentials_ref
Content & Asset | content_assets, content_variants, templates, asset_tags, asset_versions, asset_usage_links
Channel & Platform | channels, platform_accounts, connector_bindings, capability_maps, rate_limit_state_ref
Audience & Behavioural Intelligence | contacts, audience_segments, contact_segment_memberships, behavioural_scores, lifecycle_states
Campaign & Execution | campaigns, campaign_channel_links, campaign_schedules, execution_jobs, execution_receipts, retry_states
Decision Engine | decisions, decision_candidates, scoring_snapshots, decision_explanations, decision_invalidation_refs
Governance & Policy | policies, policy_versions, policy_evaluations, approvals, approval_actions, overrides, governance_tokens
Attribution & Revenue Intelligence | spend_events_ref, revenue_events_ref, attribution_paths, roi_snapshots, reconciliation_runs, margin_profiles
Orchestration | workflow_instances, orchestration_steps, workflow_failures, escalation_states
Table | Minimum Index Strategy
organizations | PK on id; optional unique on legal_name if business rules require
workspaces | PK on id; index on org_id; composite on org_id + status
users | PK on id; unique on org_id + email
content_assets | PK on id; index on org_id + workspace_id; index on status
content_variants | PK on id; index on asset_id; unique on asset_id + version_no
platform_accounts | PK on id; index on channel_id; index on health_status
contacts | PK on id; index on org_id + workspace_id; index on lifecycle_stage
campaigns | PK on id; index on org_id + workspace_id; index on status + start_at
execution_jobs | PK on id; index on decision_id; index on org_id + status + queued_at
decisions | PK on id; index on org_id + status; index on valid_until; index on decision_class
policy_evaluations | PK on id; index on decision_id; index on org_id + evaluated_at
approvals | PK on id; index on decision_id; index on org_id + status + requested_at
governance_tokens | PK on id; unique on decision_id + nonce; index on expires_at
roi_snapshots | PK on id; index on org_id + subject_type + subject_id; index on snapshot_at
workflow_instances | PK on id; index on org_id + workflow_type + status; unique on trace_id
Indexing rule: Indexes must be driven by operational and query patterns, not added reactively after production pain. Every table with org-scoped queries needs org-aware indexing.
Table / Data Class | Partition Strategy | Reason
decisions | Monthly or quarterly by created_at; optionally org-sharded at higher scale | High volume, audit retention, expiration scans
policy_evaluations | Monthly by evaluated_at | Heavy history, audit relevance
execution_jobs | Monthly by queued_at | Operational volume and historical lookup
roi_snapshots | Monthly by snapshot_at and org-aware clustering | Time-series reporting
event sink tables | Daily or weekly by occurred_at | High-ingest append pattern
reconciliation_runs | Monthly by started_at | Finance history and replay support
Outbox rule: Whenever a canonical OLTP write must produce an event, use a transactional outbox pattern rather than relying on best-effort publish after commit.
Area | Consistency Requirement
Decisions, approvals, governance tokens, execution state | Strong consistency
Analytics, historical ROI, trend reporting | Eventual consistency
Cache / projections | Best-effort freshness with rebuild capability
Retention Class | Typical Entities / Data
Audit-critical | decisions, policy_evaluations, approvals, overrides, governance_tokens, high-value events
Finance-critical | roi_snapshots, reconciliation_runs, attribution_paths, spend/revenue references
Operational | execution_jobs, retry_states, active campaign scheduling data
Analytical | warehouse facts and dimensions, historical performance marts
Ephemeral | cache entries, temporary coordination hints, rate-limit state
Finance rule: Every number shown to executives must be traceable back to source records, attribution method version, and snapshot time.
Failure Mode | Safeguard
Inconsistent state between execution and events | Execution receipt verification, reconciliation jobs, replay support
Event loss or delayed propagation | Broker durability, lag monitoring, deduplication, projection rebuilds
Financial mismatch | reconciliation_runs, methodology versioning, unattributed bucket
Stale projections | freshness timestamps, stale indicators, rebuild jobs
Cross-tenant leakage risk | org-scoped constraints, tenancy-aware indexes, access-layer enforcement
Conclusion: Document 5 should now formalize the event taxonomy and event contracts, because the data model is sufficiently hardened to support broker topics, payload contracts, publication rules, and replay semantics.