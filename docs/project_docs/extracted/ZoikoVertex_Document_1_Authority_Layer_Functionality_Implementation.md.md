# ZoikoVertex — Authority Layer: Implementation Guide

> **Document Reference:** Document 1 — Authority Layer Functionality and Implementation Requirements
> **Prepared for:** Kamani Shashi & ZoikoVertex AI Solutions Engineering
> **Status:** Implementation-grade build contract
> **Scope:** Authority Layer page functionality and implementation requirements

---

## Table of Contents

1. [Build Doctrine](#1-build-doctrine)
2. [Shared Data Models](#2-shared-data-models)
3. [Authority Layer Shell](#3-authority-layer-shell)
4. [Permission Model (RBAC)](#4-permission-model-rbac)
5. [Shared Controls](#5-shared-controls-required-on-all-pages)
6. [Module: Agent Studio](#6-module-agent-studio)
7. [Module: Agent Operations](#7-module-agent-operations)
8. [Module: Workflows](#8-module-workflows)
9. [Module: Knowledge Base](#9-module-knowledge-base)
10. [Module: Prompt Governance](#10-module-prompt-governance)
11. [Backend Services & API Contracts](#11-backend-services--api-contracts)
12. [Safety & Governance Runtime Rules](#12-safety--governance-runtime-rules)
13. [Build Order](#13-build-order)
14. [Acceptance Criteria](#14-acceptance-criteria)

---

## 1. Build Doctrine

The Authority Layer is the **control, governance, and evidence surface** for ZoikoVertex AI agents. It is not a settings page. Every screen must answer:

- What is this agent **allowed** to do?
- What is it **doing right now**?
- **Why** is it doing it?
- What **evidence** supports the action?
- When does a **human** need to approve, pause, edit, escalate, or override?

### What Must NOT Be Built

| Anti-Pattern                                    | Rule                                                   |
| ----------------------------------------------- | ------------------------------------------------------ |
| Loose chatbot admin screen                      | Every action tied to policy and permission check       |
| Publish/reply/delete without checks             | No production action without policy clearance          |
| Risk signals hidden in secondary tabs           | Blockers and warnings always surfaced at primary level |
| Offensive-word check as the only safety control | Full governance chain required (see §12)               |
| Changes stored without version history          | All object changes create versioned audit records      |

---

## 2. Shared Data Models

Build these first. All modules depend on them.

### 2.1 Agent

```ts
interface Agent {
  agent_id: string;
  tenant_id: string;
  name: string;
  role: string;
  description: string;
  owner_id: string;
  status: AgentStatus;
  mode: AgentMode;
  risk_level: RiskLevel;
  supported_brands: string[];
  assigned_channels: string[];
  allowed_actions: AgentAction[];
  blocked_actions: AgentAction[];
  linked_prompts: string[]; // prompt_id[]
  linked_workflows: string[]; // workflow_id[]
  linked_policies: string[]; // policy_id[]
  linked_knowledge_sources: string[]; // source_id[]
  created_by: string;
  updated_by: string;
  version: number;
  last_test_result: TestResult;
}

type AgentStatus =
  | "incomplete_setup"
  | "ready_for_sandbox"
  | "approved_shadow"
  | "approved_assisted"
  | "approved_limited_autonomy"
  | "paused"
  | "disabled";

type AgentMode =
  | "draft_only"
  | "recommend_only"
  | "shadow"
  | "human_approval_required"
  | "limited_autonomy"
  | "paused"
  | "disabled";

type RiskLevel = "low" | "medium" | "high" | "critical";

type AgentAction =
  | "draft"
  | "recommend"
  | "schedule"
  | "publish"
  | "reply"
  | "moderate"
  | "escalate"
  | "analyze"
  | "report";
```

### 2.2 Workflow

```ts
interface Workflow {
  workflow_id: string;
  tenant_id: string;
  name: string;
  type: string;
  status: WorkflowStatus;
  owner_id: string;
  risk_level: RiskLevel;
  trigger: WorkflowTrigger;
  steps: WorkflowStep[];
  approvals: ApprovalGate[];
  conditions: ConditionalRule[];
  escalation_rules: EscalationRule[];
  evidence_requirements: EvidenceRequirement[];
  linked_agents: string[];
  linked_prompts: string[];
  version: number;
  active_from: Date | null;
  deprecated_at: Date | null;
}

type WorkflowStatus =
  | "draft"
  | "under_review"
  | "approved"
  | "active"
  | "deprecated"
  | "blocked"
  | "retired";
```

### 2.3 Prompt

```ts
interface Prompt {
  prompt_id: string;
  tenant_id: string;
  name: string;
  purpose: PromptPurpose;
  status: PromptStatus;
  owner_id: string;
  risk_level: RiskLevel;
  system_instruction: string; // LOCKED in production; draft branches only
  user_template: string;
  allowed_tools: string[];
  linked_knowledge_sources: string[];
  test_suite_id: string;
  approval_status: ApprovalStatus;
  version: number;
  active_from: Date | null;
}

type PromptPurpose =
  | "content_generation"
  | "reply_drafting"
  | "moderation"
  | "analysis"
  | "summarization"
  | "campaign_planning"
  | "escalation"
  | "evidence_generation"
  | "policy_interpretation";

type PromptStatus =
  | "draft"
  | "testing"
  | "pending_approval"
  | "approved"
  | "active"
  | "canary"
  | "deprecated"
  | "paused"
  | "retired";
```

### 2.4 Knowledge Source

```ts
interface KnowledgeSource {
  source_id: string;
  tenant_id: string;
  title: string;
  source_type: KnowledgeSourceType;
  owner_id: string;
  brand_id: string;
  jurisdiction: string;
  sensitivity: SensitivityLevel;
  status: KnowledgeStatus;
  review_date: Date;
  expiry_date: Date;
  approval_status: ApprovalStatus;
  chunks: Chunk[];
  embeddings_ref: string;
  source_quality_score: number; // 0.0 – 1.0
  version: number;
}

type KnowledgeSourceType =
  | "brand_guidelines"
  | "product_facts"
  | "pricing"
  | "legal_disclaimer"
  | "campaign_brief"
  | "tone_of_voice"
  | "platform_rules"
  | "customer_faq"
  | "approved_claims"
  | "prohibited_claims"
  | "source_document";

type KnowledgeStatus =
  | "draft"
  | "pending_review"
  | "approved"
  | "expired"
  | "restricted"
  | "deprecated"
  | "archived";
```

### 2.5 Policy Check

```ts
interface PolicyCheck {
  check_id: string;
  object_type: string;
  object_id: string;
  policy_id: string;
  policy_version: string;
  result: "pass" | "warning" | "block";
  severity: RiskLevel;
  reason_code: string;
  recommendation: string;
  checked_at: Date;
  evidence_ref: string;
}
```

### 2.6 Evidence Bundle

```ts
interface EvidenceBundle {
  bundle_id: string;
  object_type: string;
  object_id: string;
  input_ref: string;
  prompt_version: string;
  knowledge_refs: GroundingRef[];
  policy_results: PolicyCheck[];
  human_actions: HumanAction[];
  output_ref: string;
  platform_response: PlatformResponse | null;
  timestamps: Record<string, Date>;
  integrity_hash: string; // Immutable. SHA-256 of bundle at creation.
}

interface GroundingRef {
  source_id: string;
  snippet: string;
  relevance_score: number;
  output_dependency: boolean;
}
```

### 2.7 Operation Event

```ts
interface OperationEvent {
  event_id: string;
  tenant_id: string;
  actor_type: "user" | "agent" | "system";
  actor_id: string;
  action: string;
  target_type: string;
  target_id: string;
  previous_state: string;
  new_state: string;
  reason: string;
  device_metadata: DeviceMetadata | null; // Only where lawful
  timestamp: Date;
  evidence_ref: string;
}
```

---

## 3. Authority Layer Shell

Build the shell before any module. All modules render inside it.

### 3.1 Top Header

| Component                 | Requirement                                                          |
| ------------------------- | -------------------------------------------------------------------- |
| Page title                | "Authority Layer" — always visible                                   |
| Tenant / brand selector   | Scoped to user's permitted brands                                    |
| Environment indicator     | `PRODUCTION` / `STAGING` / `SANDBOX` — color-coded                   |
| Global search             | Searches agents, workflows, prompts, knowledge, evidence, operations |
| Notification count        | Badges for blocked, overdue, failed, escalated                       |
| Emergency Pause indicator | Visible immediately if any pause is active                           |

### 3.2 Control Summary Cards

Render at the top of every module entry page:

```
[ Active Agents ]  [ Pending Approvals ]  [ Blocked Items ]
[ High-Risk Actions ]  [ Failed Checks ]  [ Knowledge Alerts ]  [ Prompt Drift Alerts ]
```

Each card is clickable and filters the queue below.

### 3.3 Primary Navigation

```
Agent Studio | Agent Operations | Workflows | Knowledge Base | Prompt Governance | Policy Center | Evidence Vault | Settings
```

### 3.4 Shared Page Layout

```
┌─────────────────────────────────────────────────────┐
│  Top Header                                         │
├─────────────────────────────────────────────────────┤
│  Control Summary Cards                              │
├────────────────────┬────────────────────────────────┤
│  Queue Panel       │  Detail Panel                  │
│  (filterable list) │  - Risk score / confidence     │
│                    │  - Policy status               │
│                    │  - Source grounding            │
│                    │  - Approval history            │
│                    │  - Activity log                │
├────────────────────┴────────────────────────────────┤
│  Action Bar: Approve | Reject | Edit | Request Change│
│              Pause | Escalate | Rerun | Rollback    │
│              View Evidence                          │
├─────────────────────────────────────────────────────┤
│  Evidence Drawer (collapsible)                      │
│  - Prompt version, knowledge sources, policy checks │
│  - Reviewer actions, output, platform response      │
├─────────────────────────────────────────────────────┤
│  Guardrail Banner (shown when item has a blocker)   │
│  Emergency Controls (scoped pause)                  │
└─────────────────────────────────────────────────────┘
```

### 3.5 Emergency Controls

```ts
interface EmergencyPausePayload {
  scope: "agent" | "workflow" | "brand" | "platform" | "tenant";
  scope_id: string;
  reason: string; // Required. Minimum 20 characters.
  paused_by: string; // actor_id
  paused_at: Date;
  affected_objects: string[];
  recovery_steps: string;
}
```

- Requires confirmation dialog with scope selection and mandatory reason capture.
- Must **NOT** delete state. Preserves all evidence.
- Triggers `OperationEvent` with `action: 'emergency_pause'`.
- Sends notifications to all affected owners.

---

## 4. Permission Model (RBAC)

```ts
type Role =
  | "global_admin"
  | "ai_governance_admin"
  | "brand_lead"
  | "campaign_manager"
  | "reviewer_approver"
  | "analyst"
  | "engineer"
  | "auditor";
```

| Role                  | Permitted Authority                                                                                        |
| --------------------- | ---------------------------------------------------------------------------------------------------------- |
| `global_admin`        | Full configuration, emergency pause, approve critical, restore versions, manage permissions                |
| `ai_governance_admin` | Manage agent rules, prompt approvals, workflow governance, policy mappings, risk settings, evidence review |
| `brand_lead`          | Approve brand-specific content, knowledge, campaigns, tone outputs for assigned brand                      |
| `campaign_manager`    | Create campaign workflows, request agent actions, review outputs, schedule approved content                |
| `reviewer_approver`   | Approve or reject assigned items; cannot alter system config                                               |
| `analyst`             | View operations, reports, evidence, performance data; no release authority                                 |
| `engineer`            | Configure integrations, test sandbox; production changes require approval                                  |
| `auditor`             | Read-only: evidence, version history, approvals, exportable audit bundles                                  |

**Implementation rule:** Actions must be **hidden** for unauthorized roles, or rendered **disabled with a visible reason**. Never silently fail.

---

## 5. Shared Controls Required on All Pages

Every object across all modules must implement these controls:

| Control             | Requirement                                                                                                        |
| ------------------- | ------------------------------------------------------------------------------------------------------------------ |
| **Status**          | All objects expose: `draft`, `testing`, `pending_approval`, `active`, `paused`, `blocked`, `deprecated`, `retired` |
| **Owner**           | Every agent, workflow, prompt, and knowledge source has a named, accountable owner                                 |
| **Risk Level**      | `low` / `medium` / `high` / `critical`. Critical triggers stricter review and stronger evidence requirements       |
| **Version**         | Every change creates a version record: `author`, `timestamp`, `reason`, `change_summary`                           |
| **Approval Gate**   | High-risk objects require role-based approval before promotion                                                     |
| **Policy Check**    | Run brand, platform, legal, content-safety, and operational checks before any production action                    |
| **Evidence Bundle** | Capture input → source → prompt → policy → approval → output → platform result                                     |
| **Dependency Map**  | Show linked agents, prompts, workflows, policies, knowledge sources, campaigns                                     |
| **Search & Filter** | Filter by: status, brand, platform, risk, owner, date, agent, workflow, approval state                             |
| **Empty States**    | Explain what is missing and provide the next setup action                                                          |
| **Error States**    | Show failure reason, reason code, retry option, escalation path, evidence record                                   |
| **Permissions**     | Disabled actions show reason; unauthorized actions are hidden                                                      |

---

## 6. Module: Agent Studio

### 6.1 What This Page Does

Create, view, configure, test, and govern every AI agent used by ZoikoVertex. An agent cannot go live until identity, permissions, prompts, workflows, knowledge sources, approval gates, and evidence settings are all complete.

### 6.2 What to Implement

#### Agent Profile CRUD

- Required fields: `name`, `role`, `description`, `owner_id`, `supported_brands`, `assigned_channels`, `risk_level`
- Validated on save. Incomplete profiles are blocked from activation.
- Ownership is mandatory and linked to RBAC.

#### Role and Permission Matrix

- Per-agent permission configuration: `draft`, `recommend`, `schedule`, `publish`, `reply`, `moderate`, `escalate`, `analyze`, `report`
- Matrix is linked to RBAC — only roles with sufficient authority can grant high-risk permissions.
- Rendered as a locked table with inline edit for authorized roles.

#### Agent Capability Registry

```ts
interface AgentCapability {
  action: AgentAction;
  allowed_tools: string[];
  allowed_platforms: string[];
  workflow_steps: string[];
  risk_level: RiskLevel;
  requires_approval: boolean;
  evidence_required: boolean;
}
```

#### Agent Configuration Versioning

- Every save creates a new version record.
- Version history panel: `version`, `author`, `timestamp`, `reason`, `diff summary`
- Rollback to any prior version via authorized action (creates a new version, not an overwrite).

#### Sandbox Test Runner

Run before activation. Must include the following test case categories:

| Test Category              | Check                                                 |
| -------------------------- | ----------------------------------------------------- |
| Offensive language         | Detect hate speech, slurs, profanity                  |
| Harmful language           | Threat, abuse, self-harm framing                      |
| Unsupported claims         | Statements not grounded in approved knowledge sources |
| Regulated claims           | Legal, medical, financial, compliance claims          |
| Confidential data leakage  | PII, internal data, restricted content                |
| Brand drift                | Tone, voice, and positioning misalignment             |
| Platform format rules      | Character limits, media rules, hashtag rules          |
| Knowledge-source grounding | Output traceable to approved sources                  |

Test runner returns: `pass` / `warning` / `block` per category. All blocks must be resolved before activation.

#### Agent Mode Controls

```
Draft Only → Recommend Only → Shadow Mode → Human Approval Required → Limited Autonomy → Paused → Disabled
```

Mode transitions require authorization and create `OperationEvent` records.

#### Policy Attachment Engine

Attach per-agent:

- Brand rules
- Platform rules
- Jurisdiction rules
- Approval rules
- Claim rules

Changes to attached policies create a new agent version and trigger re-validation.

#### Activation Checklist

Block go-live until all of the following are complete:

```
☐ Identity fields complete
☐ Permissions configured
☐ At least one prompt attached
☐ Workflow template assigned
☐ Knowledge sources attached and approved
☐ Approval gates configured
☐ Evidence settings enabled
☐ Sandbox test suite passed (no blocks)
```

### 6.3 UI Components

- Agent list with status, risk badge, owner, mode, and last-test date
- Agent profile form with tabbed sections: Identity | Permissions | Linked Resources | Tests | Evidence | Version History
- Sandbox test panel with category results and evidence capture
- Activation checklist sidebar
- Risk controls panel: approval gate, allowed/restricted actions, escalation trigger, emergency stop status

---

## 7. Module: Agent Operations

### 7.1 What This Page Does

Monitor live and scheduled agent activity. Allow authorized users to take action on every item. Provide emergency controls. Make every operation traceable.

### 7.2 Queue Views

| Queue            | Description                             |
| ---------------- | --------------------------------------- |
| Pending Approval | Waiting on human decision               |
| Needs Review     | Risk score elevated or confidence low   |
| Failed           | Execution or platform error             |
| Escalated        | Routed to senior approver or human team |
| Scheduled        | Approved, queued for platform posting   |
| Published        | Successfully posted to platform         |
| Rejected         | Declined by reviewer                    |
| Paused           | Held by emergency or scheduled pause    |

### 7.3 Item Status Model

```ts
type OperationStatus =
  | "queued"
  | "processing"
  | "waiting_for_human"
  | "blocked"
  | "approved"
  | "rejected"
  | "scheduled"
  | "posted"
  | "failed"
  | "rolled_back"
  | "paused";
```

### 7.4 What to Implement

#### Operations Dashboard

- Filterable queue with priority indicators
- Columns: Agent name, brand, platform, action type, status, risk score, policy status, evidence status, assigned reviewer, created at
- Priority flag for: overdue approvals, critical risk, active platform errors

#### Action Panel

Per item, render actions based on role and item state:

| Action         | Condition                                                |
| -------------- | -------------------------------------------------------- |
| Approve        | Status: `waiting_for_human`, role has approve permission |
| Reject         | Status: `waiting_for_human` or `escalated`               |
| Edit           | Status: `waiting_for_human`, role has edit permission    |
| Request Change | Any pending item                                         |
| Escalate       | Any item; creates `OperationEvent`                       |
| Pause          | Any live or queued item                                  |
| Resume         | Status: `paused`                                         |
| Rerun          | Status: `failed` or `rolled_back`                        |
| Rollback       | Status: `posted` or `scheduled`                          |

#### Risk Scoring Service

Visible at item level and queue level.

```ts
interface RiskScore {
  overall: number; // 0–100
  policy_risk: number;
  content_risk: number;
  platform_risk: number;
  confidence_score: number;
  reason_codes: string[];
}
```

#### Policy-Check Integration

Policy Engine must be called before **any** external action. Result must be visible on the item detail before the action bar renders.

#### Platform-Readiness Checks

Before scheduling or posting, verify:

- Character limits
- Media attachment rules
- Hashtag limits
- Link rules
- Disclosure / sponsorship rules
- Formatting rules

#### Emergency Pause Control

See §3.5. Must be accessible directly from Operations without navigating to settings.

#### Immutable Audit Events

Every operation action creates an `OperationEvent` (see §2.7). These are write-once. No update or delete permitted.

#### Notification Triggers

| Event                | Notify                                       |
| -------------------- | -------------------------------------------- |
| Blocked action       | Item owner, assigned reviewer                |
| Overdue approval     | Reviewer + escalation owner after SLA breach |
| Failed platform post | Campaign manager, brand lead                 |
| Policy violation     | AI Governance Admin                          |
| Emergency pause      | All affected owners, Global Admin            |

---

## 8. Module: Workflows

### 8.1 What This Page Does

Create and manage governed workflow templates. Every workflow that touches a production action must pass through this module before being used by an agent.

### 8.2 What to Implement

#### Workflow Builder

Node types for the visual builder:

| Node Type          | Description                                       |
| ------------------ | ------------------------------------------------- |
| `trigger`          | Campaign event, schedule, API call, human request |
| `agent_action`     | Assigned agent executes configured action         |
| `human_review`     | Pause for human decision                          |
| `policy_check`     | Run Policy Engine inline                          |
| `knowledge_lookup` | Fetch from approved Knowledge Base                |
| `prompt_execution` | Run versioned, approved prompt                    |
| `approval`         | Role-based approval gate                          |
| `scheduling`       | Platform scheduling step                          |
| `publishing`       | Execute platform post via connector               |
| `escalation`       | Route to senior approver or human team            |
| `notification`     | Alert owner, reviewer, or team                    |
| `evidence_capture` | Snapshot state into Evidence Bundle               |
| `closeout`         | Archive workflow instance, emit final event       |

#### Workflow Template Library

Columns: Name, type, status, owner, risk level, last updated, linked agents

Templates are reusable and scoped by: brand, campaign type, platform, risk level, geography, industry context.

#### Workflow Versioning

```
draft → approved → active → deprecated → (rollback available)
```

- Unapproved workflow changes **cannot** affect live campaigns.
- Rollback creates a new version from prior approved state.

#### Approval-Gate Configuration

```ts
interface ApprovalGate {
  gate_id: string;
  required_role: Role;
  sla_hours: number;
  fallback_owner_id: string;
  escalation_rule: EscalationRule;
}
```

#### Conditional Logic

Conditions evaluated at runtime:

- Risk score threshold
- Platform type
- Claim type (`regulated`, `unsupported`, `approved`)
- Content type
- Brand
- Jurisdiction
- Campaign priority

#### Simulation Engine

Run before activation. Input: sample content + sample agent action.

Returns per step:

- `pass` — step would proceed
- `warning` — step would proceed with flag
- `block` — step would halt; reason code shown
- `escalation` — step would route to human

#### Runtime Execution Log

```ts
interface WorkflowRunLog {
  run_id: string;
  workflow_id: string;
  workflow_version: number;
  instance_id: string;
  started_at: Date;
  completed_at: Date | null;
  status: "running" | "completed" | "blocked" | "failed" | "escalated";
  step_logs: StepLog[];
  evidence_bundle_id: string;
}
```

#### Workflow Evidence Bundle

Generated at workflow closeout. Contains:

- Input (trigger data)
- Prompt version used
- Knowledge sources retrieved
- Policy check results per step
- Human approvals and decisions
- Final output
- Platform response (if published)

#### Template Permissions

Only `global_admin`, `ai_governance_admin`, and authorized `engineer` roles can publish or modify production workflow templates.

---

## 9. Module: Knowledge Base

### 9.1 What This Page Does

Create, ingest, organize, approve, and govern all knowledge sources used by agents and prompts. Prevent agents from acting on stale, unapproved, or restricted knowledge.

### 9.2 What to Implement

#### Knowledge Repository

Supported ingestion methods:

- File upload (PDF, DOCX, CSV, TXT, XLSX)
- Manual structured fact entry
- URL reference (fetched and snapshotted)
- API / source connector

#### Metadata Schema (Required on Every Source)

```ts
interface KnowledgeMetadata {
  owner_id: string;
  brand_id: string;
  product_id: string | null;
  jurisdiction: string;
  platform: string | null;
  source_type: KnowledgeSourceType;
  sensitivity: SensitivityLevel;
  review_date: Date;
  expiry_date: Date;
  approval_status: ApprovalStatus;
  permitted_use: PermittedUse[];
}
```

All fields are required. Sources with missing metadata are blocked from retrieval.

#### Document Parsing and Chunking Pipeline

1. Ingest raw document
2. Parse to clean text (strip formatting artifacts)
3. Chunk by semantic boundary (not fixed token count)
4. Index chunks with metadata inheritance
5. Generate embeddings → store reference in `embeddings_ref`

#### Approval Workflow

```
draft → pending_review → approved → active
                      ↓
                   rejected → draft (with reviewer notes)
```

A source only becomes available to production agents after reaching `approved` status.

#### Retrieval Permissions

At retrieval time, enforce:

- Brand match
- Role access level
- Tenant boundary
- Geographic/jurisdiction restriction
- Sensitivity clearance
- Workflow context

#### Conflict Detection and Stale-Source Alerts

| Alert             | Trigger                                                            |
| ----------------- | ------------------------------------------------------------------ |
| Duplication       | New source content overlaps >80% with existing approved source     |
| Outdated claim    | `expiry_date` passed or `review_date` >90 days ago                 |
| Conflicting facts | Semantic contradiction between two approved sources for same brand |
| Missing owner     | `owner_id` is null or user account deactivated                     |
| Weak quality      | `source_quality_score` below configured threshold                  |

#### Grounding Trace

```ts
interface GroundingTrace {
  trace_id: string;
  output_id: string;
  retrieved_sources: GroundingRef[]; // source_id, snippet, relevance_score
  output_dependency_map: Record<string, string[]>; // output_segment → source_ids
}
```

Stored in Evidence Bundle. Visible to reviewers from the item detail panel.

#### Source Usage Map

Per source, show:

- Agents that have it attached
- Prompts that reference it
- Workflows that depend on it
- Recent outputs grounded in it

Used for impact analysis before deprecation or archival.

---

## 10. Module: Prompt Governance

### 10.1 What This Page Does

Create, test, approve, version, deploy, monitor, and retire every prompt used by ZoikoVertex agents. Production prompts are locked. Changes require draft, test, approval, and controlled deployment.

### 10.2 What to Implement

#### Prompt Registry

Required metadata per prompt:

- `name`, `purpose`, `owner_id`, `risk_level`
- `status`, `version`, `active_from`
- `linked agents`, `linked workflows`, `linked knowledge sources`
- `test_suite_id`, `approval_status`

#### Prompt Editor

```
Production prompt → LOCKED (read-only display)
                 ↓
           Create Draft Branch
                 ↓
           Edit in Draft mode
                 ↓
           Submit for Testing
```

Draft branches are isolated from production until approved and deployed.

#### Test Suite Runner

```ts
interface PromptTestSuite {
  suite_id: string;
  prompt_id: string;
  prompt_version: number;
  test_cases: TestCase[];
  run_at: Date;
  overall_result: "pass" | "warning" | "block";
  pass_threshold: number; // Configurable per risk level
}

interface TestCase {
  case_id: string;
  category: TestCategory;
  sample_input: string;
  expected_behavior: string;
  actual_output: string;
  score: number;
  result: "pass" | "warning" | "fail";
}
```

Test categories: `hallucination_risk`, `unsupported_claims`, `offensive_language`, `brand_drift`, `platform_policy_fit`, `confidential_data_leakage`, `source_grounding`

#### Prompt Approval Workflow

```
draft → testing → pending_approval → approved → (canary) → active
                                   ↓
                                rejected → draft
```

Required reviewer role is determined by `risk_level`:

- `low` → `reviewer_approver`
- `medium` → `ai_governance_admin`
- `high` / `critical` → `global_admin`

#### Prompt Diff Viewer

Side-by-side comparison of any two versions. Highlight:

- Added instructions (green)
- Removed instructions (red)
- Changed instructions (yellow)

Used by approvers before promotion decisions.

#### Prompt Deployment States

```
draft → test → approved → canary → active → paused → deprecated → retired
```

`canary` = routed to a small % of traffic before full activation. Monitored for drift before full promotion.

#### Prompt Monitoring Metrics

```ts
interface PromptMetrics {
  prompt_id: string;
  prompt_version: number;
  window: "24h" | "7d" | "30d";
  rejection_rate: number;
  edit_rate: number;
  policy_failure_rate: number;
  escalation_rate: number;
  confidence_trend: TrendDirection;
  output_quality_trend: TrendDirection;
  source_grounding_failure_rate: number;
}
```

Alerts fire when any metric crosses configured thresholds. Alert → notify owner + `ai_governance_admin`.

#### Rollback Mechanism

```
Select prior approved version → Create new version from it → Submit for approval → Deploy
```

Rollback does not overwrite history. It creates a new version entry pointing to prior approved content.

---

## 11. Backend Services & API Contracts

### 11.1 Service Responsibilities

| Service                        | Responsibility                                                                                                |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| **Agent Service**              | CRUD agents, manage status, permissions, modes, versioning, linked resources, sandbox tests                   |
| **Workflow Service**           | Manage templates, workflow instances, step execution, approvals, escalation, runtime logs, status transitions |
| **Prompt Registry Service**    | Store prompt versions, test results, approvals, deployment states, dependency maps                            |
| **Knowledge Service**          | Ingest, parse, chunk, index, approve, retrieve, expire, archive, permission knowledge sources                 |
| **Policy Engine**              | Evaluate content, action, prompt, workflow, knowledge, platform, and role policy rules                        |
| **Evidence Service**           | Create immutable evidence bundles. Attach to objects, decisions, outputs, platform actions                    |
| **Audit Event Service**        | Record normalized user, agent, system, and platform events. Write-once                                        |
| **Notification Service**       | Notify owners and approvers about blocked, overdue, failed, escalated, and paused items                       |
| **Platform Connector Service** | Validate platform requirements. Execute approved external actions                                             |
| **Search/Index Service**       | Global search across agents, workflows, prompts, knowledge, evidence, operations                              |

### 11.2 Policy Engine Contract

Called **before** every production action. Must be synchronous for blocking decisions.

```ts
interface PolicyCheckRequest {
  object_type: string;
  object_id: string;
  action: string;
  content: string | null;
  agent_id: string;
  prompt_version: string | null;
  knowledge_refs: string[];
  platform: string;
  brand_id: string;
  jurisdiction: string;
  actor_id: string;
  actor_role: Role;
}

interface PolicyCheckResponse {
  check_id: string;
  result: "pass" | "warning" | "block";
  severity: RiskLevel;
  failed_policies: PolicyResult[];
  recommendation: string;
  evidence_ref: string;
  checked_at: Date;
}
```

If result is `block`, the calling service **must not** proceed with the action.

### 11.3 Evidence Service Contract

Called at every meaningful decision point.

```ts
interface CreateEvidenceBundleRequest {
  object_type: string;
  object_id: string;
  input: Record<string, unknown>;
  prompt_version: string;
  knowledge_refs: GroundingRef[];
  policy_results: PolicyCheck[];
  human_actions: HumanAction[];
  output: Record<string, unknown>;
  platform_response: PlatformResponse | null;
}
```

Returns `bundle_id` and `integrity_hash`. Bundle is immutable after creation.

---

## 12. Safety & Governance Runtime Rules

These rules are enforced at the service layer. UI cannot override them.

| Rule                                                     | Implementation                                                                                                                                                      |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Offensive-language check is mandatory but not sufficient | Content must also pass: `unsupported_claim`, `brand_tone`, `confidential_data`, `regulated_claim`, `platform_policy`, `source_grounding` checks                     |
| Production action requires policy clearance              | No `publish`, `reply`, `delete`, `edit`, `escalate`, or `moderate` action without a current passing policy result                                                   |
| High-risk activity requires human approval               | Sensitive claims, regulated topics, crisis content, legal/compliance wording, public replies, deletion/moderation require configured approval gates                 |
| Knowledge must be approved and current                   | Agents cannot use `expired`, `draft`, `restricted`, or `deprecated` sources unless the workflow explicitly permits it and records the reason in the evidence bundle |
| Prompt edits must be controlled                          | Production prompts are read-only. Changes require draft branch → test → approval → deployment → monitoring → rollback option                                        |
| Emergency pause must preserve evidence                   | Pause actions must not delete state. System records: who paused, scope, reason, affected objects, recovery steps                                                    |
| Every action must be explainable                         | Reviewers must see: prompt version, source grounding, policy status, risk result, and recommended action before any approval decision                               |

---

## 13. Build Order

Build in this sequence. Each step depends on the prior.

```
Step 1: Shared Data Models
        Agent, Workflow, Prompt, KnowledgeSource,
        PolicyCheck, EvidenceBundle, OperationEvent

Step 2: Authority Layer Shell
        Header, navigation, summary cards, queue panel,
        detail panel, action bar, evidence drawer,
        guardrail banner, emergency controls

Step 3: Agent Studio MVP
        Identity CRUD, permissions matrix, linked resources,
        sandbox test runner, activation checklist, versioning

Step 4: Agent Operations MVP
        Filterable queues, status model, approval actions,
        pause controls, policy results, evidence drawer

Step 5: Knowledge Base MVP
        Ingestion, metadata schema, approval workflow,
        retrieval permissions, source usage map

Step 6: Prompt Governance MVP
        Registry, draft editor, test suite runner,
        approval workflow, deployment states, rollback

Step 7: Workflows MVP
        Template builder, approval gates, conditional logic,
        simulation engine, runtime logs, evidence bundles

Step 8: Policy Engine + Evidence + Audit + Permission Services
        Connect all production actions to all four services

Step 9: Monitoring, alerts, and exportable audit bundles
        Add after primary operational flows are stable
```

---

## 14. Acceptance Criteria

A module is complete when every item in its row passes QA.

| Module                | Acceptance Criteria                                                                                                                                                                     |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Agent Studio**      | Create agent → configure identity and permissions → attach prompts/workflows/knowledge/policies → run sandbox checks → approve activation → pause → view evidence. All steps traceable. |
| **Agent Operations**  | See live queues → understand status and risk → approve/reject/edit/escalate/pause → open evidence for any operation. No action bypasses policy check.                                   |
| **Workflows**         | Create template → configure approvals and policy checks → simulate → activate → run → inspect runtime history. Unapproved changes cannot reach live campaigns.                          |
| **Knowledge Base**    | Add source → apply metadata → send for approval → index for retrieval → block expired sources → view dependency usage. No unapproved source reachable by production agents.             |
| **Prompt Governance** | Create draft → test → compare versions → approve → deploy → monitor → pause → rollback. Production prompts cannot be edited directly.                                                   |
| **Evidence**          | Every meaningful action produces an evidence bundle. Bundle is immutable. Linked to relevant object. Visible from the item detail panel.                                                |
| **Permissions**       | Unauthorized actions are hidden or disabled with visible reason. Role boundaries enforced at service layer, not just UI layer.                                                          |
| **Runtime Safety**    | No production action bypasses: role permission check, policy engine check, approval gate (where required), evidence capture.                                                            |
| **Usability**         | Users can identify priority work, complete common decisions without navigating away from the queue, recover from errors, and understand why something was blocked.                      |

---

_ZoikoVertex | Document 1 | Authority Layer Functionality and Implementation Requirements | Implementation Guide_
