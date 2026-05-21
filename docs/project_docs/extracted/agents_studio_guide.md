# ZoikoVertex | Authority Layer Build Contract

> **ZOIKOVERTEX**
> **Document 5 — Agent Studio Page Build Contract**
> *Authority Layer Product, UX, Governance, Runtime, Evidence, and Engineering Specification*

---

## Document Metadata

| Field | Details |
|---|---|
| **Document Purpose** | Define exactly what the Agent Studio page must contain, what must be implemented, and how it must operate inside the ZoikoVertex Authority Layer. |
| **Primary Users** | Super Admin, AI Governance Lead, Brand Governance Lead, Campaign Owner, Compliance Reviewer, Security Admin, Integration Engineer, Auditor. |
| **Engineering Standard** | Implementation-grade. No decorative features. Every surface must map to a control, runtime action, evidence record, or measurable business outcome. |
| **Product Standard** | Agent Studio is not a prompt playground. It is the governed workspace for creating, testing, approving, publishing, pausing, retiring, and evidencing AI agents. |
| **Version** | Final v1.0 — 19 May 2026 — American English |

---

## FINAL BUILD CONTRACT

---

## 1. Engineer Implementation Summary — Exact Page Format

> Use this section as the direct implementation brief for the engineering team.

| Page | Functionality | What Needs to Be Implemented |
|---|---|---|
| **Agent Studio** | Create, configure, test, govern, approve, publish, pause, and retire AI agents used by ZoikoVertex. Agent Studio must show each agent as a governed digital worker with identity, role, permissions, platform scope, brand rules, safety rules, knowledge access, prompt version, workflow assignments, runtime limits, evidence history, and deployment status. | Agent catalog, create agent wizard, agent profile, role and objective setup, platform/channel scope, brand voice binding, prohibited content checks, platform policy checks, prompt binding, knowledge base binding, tool permission controls, workflow assignments, HITL approval requirements, sandbox testing, simulation results, risk score, evidence logs, publish controls, pause/kill switch, rollback, retirement workflow, audit export. |
| **Agent Operations** | Monitor live and scheduled agent activity across brands, workspaces, channels, campaigns, workflows, and risk states. Operations must show whether agents are active, blocked, awaiting review, failed, paused, rate-limited, or escalated. | Live agent status board, active tasks, queue view, errors, escalations, approvals pending, runtime health, API/tool failures, content risk alerts, evidence packets, human override actions, emergency pause, restricted mode, SLA timers, retry management, operator notes, handoff trail. |
| **Workflows** | Assign agents to approved workflow paths with defined triggers, steps, approvals, escalation logic, failure handling, and publishing permissions. | Workflow selection, workflow role mapping, trigger rules, step ownership, approval gates, fallback steps, escalation policy, evidence requirements, workflow test run, workflow version lock, deployment status, change approval. |
| **Knowledge Base** | Control which approved knowledge sources each agent can use, how fresh the sources must be, what sources are blocked, and what citations/evidence must be attached to generated outputs. | Knowledge source selection, dataset permissions, retrieval scope, freshness rules, citation rules, restricted-source blocking, confidence thresholds, source lineage, document expiry, indexing status, access tests, evidence attachment. |
| **Prompt Governance** | Bind each agent to approved prompts, prompt versions, prompt tests, policy checks, and release gates before deployment. | Prompt assignment, prompt version history, prompt test suite, forbidden-claim checks, platform-specific moderation checks, policy simulation, approval status, rollback prompt, prompt drift monitoring, release evidence. |

---

## 2. Product Doctrine

- Agent Studio must make every agent **understandable, controllable, testable, auditable, and reversible** before it can operate in production.

- No agent may publish, approve, respond, schedule, modify, or execute externally unless it has:
  - A named owner
  - Approved role
  - Bounded permissions
  - Attached knowledge
  - Approved prompt version
  - Workflow assignment
  - Runtime policy
  - Evidence trail

- The page must **reduce engineering ambiguity**: every CTA must either create, test, approve, deploy, pause, roll back, retire, or evidence an agent.

- The interface must **prioritize safe activation**: status, risk, approval state, deployment scope, and next required action must always be visible.

- Agent Studio must **support SMB activation** without weakening enterprise governance. Defaults should be simple, but controls must scale to regulated multi-brand environments.

---

## 3. Page Information Architecture

| Zone | Required UI | Purpose | Primary CTA |
|---|---|---|---|
| **Header Command Bar** | Workspace selector, brand selector, environment selector, search, filters, Create Agent, Import Agent Template | Keeps the user oriented and prevents cross-brand/cross-environment mistakes. | Create Agent |
| **Agent Catalog** | Agent cards/table with name, type, owner, status, risk, channels, knowledge, prompt version, workflows, last activity | Gives a fast operational view of all governed agents. | Open Agent |
| **Agent Detail Panel** | Identity, role, objectives, boundaries, tools, channels, workflows, prompts, knowledge, testing, evidence | Turns each agent into a governed digital worker record. | Test Agent |
| **Governance Panel** | Risk tier, approvals, policy checks, prohibited actions, compliance notes, HITL requirements | Stops unsafe agents before production use. | Request Approval |
| **Runtime Panel** | Environment, schedules, rate limits, token budgets, tool permissions, platform scopes, retry rules | Controls how the agent behaves when live. | Deploy to Production |
| **Evidence Panel** | Creation record, changes, tests, approvals, deployments, overrides, incidents, rollback, retirement | Creates defensible audit history for internal review, customers, regulators, and procurement. | Export Evidence |

---

## 4. Roles and Permission Model

| Role | May Do | Must Not Do |
|---|---|---|
| **Super Admin** | Create, approve, deploy, pause, retire, assign owners, override non-regulatory blocks when permitted. | Bypass immutable evidence, delete audit history, bypass legal/compliance blocks. |
| **AI Governance Lead** | Approve agent design, prompt binding, test results, risk tier, and release readiness. | Publish externally without required commercial or brand approval where policy requires it. |
| **Brand Governance Lead** | Approve brand voice, claim boundaries, tone rules, and platform-specific content posture. | Change security permissions, knowledge access, or compliance rules. |
| **Campaign Owner** | Request agents, assign campaigns, review outputs, request workflow deployment. | Grant tools, bypass approval gates, or deploy unapproved agents. |
| **Compliance Reviewer** | Review risk, policy exceptions, evidence records, restricted claims, regulated-content issues. | Alter agent logic or prompts without change control. |
| **Security Admin** | Manage tool permissions, integrations, API scopes, credential boundaries, and environment access. | Approve marketing claims or brand positioning. |
| **Auditor** | View evidence, test outcomes, approvals, incidents, versions, and exports. | Modify agents or runtime controls. |

---

## 5. Agent Lifecycle States

| State | Meaning | Allowed Actions | Exit Condition |
|---|---|---|---|
| **Draft** | Agent exists but is not approved. | Edit, bind prompt, bind knowledge, assign owner, run sandbox tests. | Required fields complete and tests passed. |
| **In Review** | Agent is awaiting governance, brand, compliance, or security approval. | Review, comment, request changes, reject, approve. | All required approvers approve. |
| **Approved** | Agent passed checks but is not live. | Deploy, schedule, assign workflow, export evidence. | Deployment command issued. |
| **Live** | Agent can operate within approved runtime boundaries. | Monitor, pause, restrict, roll back, update through change request. | Paused, restricted, retired, or updated. |
| **Restricted** | Agent can operate only in safe mode or review-only mode. | Investigate, correct, rerun tests, request release. | Risk cleared and approval restored. |
| **Paused** | Agent cannot execute new runtime actions. | Resume, edit, retire, export evidence. | Authorized resume or retirement. |
| **Retired** | Agent is permanently removed from active use, with record preserved. | View, clone, export evidence. | No production exit; clone creates new draft. |

---

## 6. Required Agent Studio Functionality

### 6.1 Agent Catalog

- View all agents by brand, workspace, environment, status, risk tier, owner, platform scope, assigned workflow, prompt version, knowledge source, and last activity.
- Support **table and card views**. Table view is default for enterprise users; card view may be used for SMB simplicity.
- Filters must include: status, owner, risk, channel, workflow, knowledge source, prompt version, and environment.
- Every row must show a clear **next action**: Complete Setup, Run Tests, Request Approval, Deploy, Review Alert, Pause, or Export Evidence.

---

### 6.2 Create Agent Wizard

| Step | Description |
|---|---|
| **Step 1 — Agent Identity** | Name, description, owner, team, brand, workspace, environment. |
| **Step 2 — Role and Objective** | Agent type, job-to-be-done, success metrics, prohibited outcomes. |
| **Step 3 — Channel Scope** | LinkedIn, X, Facebook, Instagram, TikTok, YouTube, blog/CMS, internal only, or future channels. |
| **Step 4 — Prompt Binding** | Approved prompt, prompt version, tests, rollback prompt. |
| **Step 5 — Knowledge Binding** | Approved datasets, retrieval scope, freshness requirements, citation rules. |
| **Step 6 — Tool Permissions** | Read, draft, recommend, schedule, publish, reply, escalate, analyze, export. Default must be **least privilege**. |
| **Step 7 — Governance** | Risk tier, approval path, HITL requirements, restricted actions, escalation owners. |
| **Step 8 — Sandbox Test** | Sample tasks, offensive-language checks, unsafe-claim checks, platform-policy checks, brand voice checks, hallucination/source checks. |
| **Step 9 — Release Decision** | Save draft, request approval, or deploy after approval. |

---

### 6.3 Agent Profile

- Must be the **single source of truth** for agent identity, purpose, scope, permissions, workflows, prompts, knowledge, runtime controls, test results, approvals, and evidence.
- Must show a **prominent status ribbon** and risk indicator at the top.
- Must include a **production readiness checklist** that blocks deployment until all mandatory controls are passed.
- Must expose **change history** and current live version without making users search the audit log.

---

### 6.4 Safety and Content Controls

- Implement prohibited words and prohibited themes checks per brand, jurisdiction, and platform.
- Implement the following detection categories:
  - Offensive language
  - Hate/harassment
  - Sexual content
  - Violence/self-harm
  - Regulated claims
  - Competitor risk
  - Confidential data leakage
- Platform-specific checks must account for: channel rules, character limits, hashtag rules, media rules, link rules, and restricted ad/category rules where applicable.
- Blocked outputs must show: **reason, policy reference, severity, owner, and next available action**.

---

### 6.5 Testing and Simulation

- Support **sandbox tasks** before approval and **live replay simulations** after incidents or major changes.
- Test suites must include: content generation, comment response, scheduling recommendation, brand compliance, source citation, escalation, refusal, and failure-mode tests.
- Each test must produce:
  - Pass/fail status
  - Risk notes
  - Evidence ID
  - Timestamp
  - Prompt version
  - Knowledge snapshot
  - Model used
  - Reviewer notes
- **No agent can enter Approved or Live state if mandatory tests fail.**

---

## 7. Governance Gates

| Gate | Required Control | Blocking Rule |
|---|---|---|
| **Identity Gate** | Agent must have name, owner, brand, workspace, purpose, and risk tier. | Cannot save as review-ready without complete identity. |
| **Scope Gate** | Channels, workflows, permissions, and environment must be defined. | Cannot test or approve an agent with undefined external scope. |
| **Prompt Gate** | Agent must use an approved prompt version with passing tests. | Cannot deploy with draft, expired, rejected, or untested prompt. |
| **Knowledge Gate** | Agent must use approved knowledge sources with access rights and freshness rules. | Cannot cite or retrieve from unapproved, expired, or unauthorized sources. |
| **Safety Gate** | Offensive, prohibited, unsupported, confidential, and platform-policy checks must pass. | Cannot approve if any mandatory safety check fails. |
| **Approval Gate** | Required owners must approve according to risk tier and workflow. | Cannot deploy without full required approval path. |
| **Runtime Gate** | Rate limits, tool scopes, schedules, logging, rollback, and emergency pause must be configured. | Cannot go live without bounded runtime controls. |
| **Evidence Gate** | Agent must create immutable evidence for creation, tests, approvals, deployment, changes, incidents, and retirement. | Cannot deploy if evidence capture fails. |

---

## 8. Runtime Controls

| Runtime Control | Implementation Requirement |
|---|---|
| **Environment Separation** | Agents must clearly separate sandbox, staging, and production. Production deployment must be an explicit action. |
| **Least Privilege Tools** | Default permissions must be read-only or draft-only until specific permissions are approved. |
| **Action Classes** | Support: Recommend Only, Draft Only, Schedule With Approval, Publish With Approval, Auto-Publish Low Risk, Reply With Approval, and Blocked. |
| **Rate Limits** | Configure per-agent and per-channel limits for output volume, API calls, replies, scheduling changes, and token spend. |
| **Budget Controls** | Show daily and monthly usage limits, token consumption, cost estimate, and overage behavior. |
| **Escalation** | Route blocked or uncertain outputs to named humans with reason, evidence, and SLA timer. |
| **Failure Behavior** | Define retry, fallback model, safe refusal, draft-only fallback, queue hold, and alert rules. |
| **Emergency Controls** | Super Admin and authorized governance roles must be able to pause one agent, all agents in a brand, or all production agents. |
| **Rollback** | Every production agent must have last approved version, rollback prompt, rollback knowledge snapshot, and rollback evidence record. |

---

## 9. Data Model and Evidence Requirements

| Object | Minimum Fields |
|---|---|
| **Agent** | `agent_id`, `tenant_id`, `workspace_id`, `brand_id`, `name`, `description`, `owner_id`, `agent_type`, `status`, `risk_tier`, `environment`, `created_at`, `updated_at` |
| **Agent Version** | `agent_version_id`, `agent_id`, `prompt_version_id`, `knowledge_snapshot_id`, `workflow_ids`, `tool_permissions`, `runtime_policy_id`, `change_reason`, `approved_by`, `approved_at` |
| **Permission Set** | `permission_set_id`, `agent_id`, `action_class`, `platforms`, `tools`, `scopes`, `rate_limits`, `spend_limits`, `approval_required`, `created_by` |
| **Safety Policy Result** | `result_id`, `agent_id`, `test_id`, `policy_id`, `severity`, `pass_fail`, `blocked_terms`, `platform`, `evidence_id`, `reviewer_notes` |
| **Deployment** | `deployment_id`, `agent_version_id`, `environment`, `status`, `deployed_by`, `deployed_at`, `rollback_version_id`, `deployment_notes` |
| **Evidence Record** | `evidence_id`, `event_type`, `actor_id`, `agent_id`, `object_version`, `timestamp`, `decision`, `reason`, `input_hash`, `output_hash`, `model_id`, `prompt_version`, `knowledge_snapshot`, `policy_results` |
| **Incident** | `incident_id`, `agent_id`, `severity`, `trigger`, `affected_channel`, `output_id`, `status`, `owner_id`, `remediation`, `evidence_id`, `closed_at` |

---

## 10. Engineering Interfaces

| Interface | Required Endpoint or Event |
|---|---|
| **Agent CRUD** | `POST /agents`, `GET /agents`, `GET /agents/{id}`, `PATCH /agents/{id}`, `POST /agents/{id}/clone` |
| **Versioning** | `POST /agents/{id}/versions`, `GET /agents/{id}/versions`, `POST /agents/{id}/rollback` |
| **Testing** | `POST /agents/{id}/tests/run`, `GET /agents/{id}/tests`, `GET /tests/{test_id}/evidence` |
| **Approval** | `POST /agents/{id}/approval/request`, `POST /approvals/{id}/approve`, `POST /approvals/{id}/reject` |
| **Deployment** | `POST /agents/{id}/deploy`, `POST /agents/{id}/pause`, `POST /agents/{id}/resume`, `POST /agents/{id}/retire` |
| **Evidence** | `GET /agents/{id}/evidence`, `POST /evidence/export`, `GET /evidence/{id}` |
| **Events** | `agent.created`, `agent.updated`, `agent.test_passed`, `agent.test_failed`, `agent.approval_requested`, `agent.approved`, `agent.rejected`, `agent.deployed`, `agent.paused`, `agent.restricted`, `agent.rollback`, `agent.retired`, `agent.incident_opened` |

---

## 11. Required UX States and Empty States

| State | Required Behavior |
|---|---|
| **First-Time Empty State** | Explain what Agent Studio is, show three templates, and provide Create Agent as the primary action. |
| **Incomplete Setup** | Show missing setup steps and block review submission until mandatory fields are complete. |
| **Tests Failed** | Show failed tests, severity, reason, policy reference, remediation guidance, and rerun action. |
| **Approval Pending** | Show approvers, SLA, current queue position, and allow non-destructive comments. |
| **Deployment Blocked** | Show exact blocking gates and prevent ambiguous error messages. |
| **Live Risk Alert** | Show severity, affected channel, output, reason, pause option, escalation owner, and evidence link. |
| **No Permission** | Explain missing permission and show request-access path without exposing restricted data. |
| **Integration Failure** | Show platform/API affected, retry state, fallback state, owner, and incident evidence. |
| **Archived/Retired Agent** | Show read-only profile, retirement reason, evidence, clone option, and no production actions. |

---

## 12. Required Agent Templates

| Template | Default Permissions | Default Governance |
|---|---|---|
| **Content Research Agent** | Read approved knowledge, analyze sources, produce briefs. No publishing. | Brand review optional; compliance review required for regulated categories. |
| **Content Drafting Agent** | Draft posts, captions, outlines, newsletters, and campaign copy. No external action. | Brand approval required before use in workflow. |
| **Social Response Agent** | Draft replies and escalation recommendations. No auto-reply by default. | Human review required; auto-reply only for approved low-risk responses. |
| **Scheduling Recommendation Agent** | Recommend schedule and channel sequencing. No posting unless approved. | Campaign owner approval required. |
| **Compliance Review Agent** | Check claims, prohibited language, source support, risk, and policy fit. | Governance-owned; cannot approve its own output as final. |
| **Performance Insight Agent** | Analyze campaign results and propose optimizations. | Read-only analytics permissions; no budget or publishing control. |
| **SMB Starter Agent** | Simple draft, schedule recommendation, and brand-safe social posts for small teams. | Governed defaults; low setup friction; no unsafe auto-publish. |
| **Enterprise Governance Agent** | Cross-brand policy review, evidence bundling, and risk reporting. | Restricted to governance roles; full evidence capture required. |

---

## 13. Build Acceptance Criteria

| Area | Acceptance Criterion |
|---|---|
| **Navigation** | User can reach Agent Studio from Authority Layer navigation and return to dashboard without losing context. |
| **Catalog** | User can view, search, filter, sort, and open agents across workspaces subject to permissions. |
| **Creation** | User can create an agent through the wizard and cannot bypass mandatory gates. |
| **Governance** | Risk tier, approvals, prompt binding, knowledge binding, safety checks, and runtime controls are enforced before deployment. |
| **Testing** | Sandbox tests generate structured pass/fail results and evidence records. |
| **Deployment** | Only approved agents can be deployed to production; deployment creates evidence. |
| **Runtime Control** | Authorized users can pause, restrict, resume, roll back, and retire agents. |
| **Evidence** | Every material action is written to the Evidence Vault with actor, timestamp, object version, decision, and reason. |
| **Security** | RBAC, tenant isolation, workspace isolation, brand isolation, and environment separation are enforced. |
| **Performance** | Catalog loads quickly for normal workspaces and supports pagination or virtualization for enterprise-scale tenants. |
| **Accessibility** | Forms, tables, status indicators, errors, and critical actions are usable by keyboard and screen reader users. |
| **Mobile/Tablet** | Critical review, pause, approval, and incident actions work on tablet and mobile; complex configuration may remain desktop-first. |

---

## 14. Non-Negotiable Engineering Rules

> These rules are absolute. No exceptions.

- **No production agent** without owner, status, risk tier, prompt version, knowledge scope, tool permissions, workflow assignment, runtime policy, and evidence capture.

- **No hidden approvals.** The user must always see who must approve, what is pending, and what blocks deployment.

- **No silent failures.** Failed checks must produce reason, severity, owner, and next action.

- **No deletion of evidence records.** Corrections must be appended, not overwritten.

- **No cross-tenant, cross-brand, or cross-workspace leakage** of prompts, knowledge, outputs, evidence, or permissions.

- **No broad tool access by default.** Permissions must be explicit, limited, and reviewable.

- **No direct publish path** for high-risk, regulated, legal, medical, financial, employment, or crisis-sensitive content unless policy explicitly permits it with human approval.

- **No prompt or knowledge update** may alter a live agent without versioning, testing, approval, and rollback.

---

## 15. Engineering Handoff Checklist

| Item | Complete When |
|---|---|
| **Agent Catalog** | Search, filters, status, risk, owner, workflow, channel, prompt, knowledge, and next action display correctly. |
| **Create Wizard** | All required steps exist and validation prevents incomplete review submission. |
| **Agent Profile** | Identity, scope, prompt, knowledge, workflow, governance, runtime, evidence, and incidents are visible. |
| **Safety Checks** | Offensive words, prohibited claims, platform rules, brand rules, source support, and confidential-data checks are implemented. |
| **Approval Flow** | Approval routing changes by risk tier, agent type, channel, and workspace policy. |
| **Runtime Controls** | Deploy, pause, restrict, resume, rollback, retire, and emergency pause work with evidence. |
| **Evidence Vault Integration** | All create, edit, test, approve, deploy, pause, incident, rollback, and retire events are recorded. |
| **API/Event Contracts** | Required endpoints and events are implemented or stubbed with agreed payloads. |
| **QA Scenarios** | Engineering has tested first-time setup, blocked deployment, failed safety test, approval, live incident, rollback, and retirement. |
| **Release Readiness** | Product, AI governance, security, and engineering sign off before production release. |

---

> *End of Document 5 — Agent Studio Page Build Contract*
>
> **Confidential** — Product, UX, Governance, Runtime, Evidence, and Engineering Specification