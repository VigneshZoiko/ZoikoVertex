# ZOIKOVERTEX: Data Model & Database Architecture

## 1. Purpose
Defines operational storage, event persistence, analytical storage, and projection models.

## 2. Data Architecture Principles
* One authoritative owner per entity.
* Separation of operational and analytical truth.
* Event-backed state transition.
* Mandatory multi-tenancy (`org_id`).
* Reconcilable finance-facing outputs.

## 3. Data Architecture Layers
1. **OLTP Layer**: PostgreSQL (Authoritative records).
2. **Event Layer**: Kafka/RabbitMQ (Immutable events, outbox pattern).
3. **OLAP Layer**: ClickHouse (Analytics).
4. **Cache Layer**: Redis (Hot reads, projections).

## 5. Entity Model
### 5.1 Organisation & Identity
`organizations`, `workspaces`, `users`, `memberships`.
### 5.2 Content & Asset
`content_assets`, `content_variants`, `asset_versions`, `asset_usage_links`.
### 5.3 Channel & Platform
`channels`, `platform_accounts`, `connector_bindings`, `capability_maps`.
### 5.4 Audience & Behavioural Intelligence
`contacts`, `audience_segments`, `contact_segment_memberships`, `behavioural_scores`.
### 5.5 Campaign & Execution
`campaigns`, `campaign_channel_links`, `campaign_schedules`, `execution_jobs`, `execution_receipts`.
### 5.6 Decision Engine
`decisions`, `decision_candidates`, `scoring_snapshots`, `decision_explanations`.
### 5.7 Governance & Policy
`policies`, `policy_versions`, `policy_evaluations`, `approvals`, `approval_actions`, `governance_tokens`.
### 5.8 Attribution & Revenue Intelligence
`margin_profiles`, `attribution_paths`, `roi_snapshots`, `reconciliation_runs`.
### 5.9 Orchestration
`workflow_instances`, `orchestration_steps`, `workflow_failures`.

## 9. Transaction Boundary Rules
Atomic in one transaction: Decision/Approval creation + Outbox write.
Async: External side-effects, analytical projections.

## 10. Event / Outbox / CDC Strategy
Transactional outbox (`outbox_events`) is mandatory for domain events.
