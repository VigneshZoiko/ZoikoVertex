# ZoikoVertex Document 6

# Agent Operations Page Build Contract

**Authority Layer Product, UX, Governance, Runtime, Evidence, and Engineering Specification**

**Final Version · American English**

---

| **Item** | **Definition** |
|---|---|
| Document purpose | Define exactly what the Agent Operations page must contain, what must be implemented, and how the page controls live agent activity, runtime governance, incident response, evidence capture, and operational accountability. |
| Primary users | Operations Lead, AI Governance Lead, Brand Governance Lead, Campaign Manager, Reviewer/Approver, Security Admin, Super Admin, Executive Viewer. |
| Engineering standard | Implementation-grade. Every visible control must connect to permissions, runtime state, policy enforcement, logs, evidence, alerts, or action outcomes. |
| Scope boundary | This page monitors and controls agent execution. It does not create agents, author prompts, build workflows, or manage knowledge sources except through linked detail panels and dependency references. |
| Required outcome | A user must be able to understand what agents are doing, identify risk, intervene quickly, prove what happened, and route operational work without leaving the page. |

---

> **Build Mandate** — Agent Operations is the command surface for live and scheduled agent activity. It must make runtime state, risk, ownership, next action, and evidence immediately visible. The page must prevent silent failures, uncontrolled publishing, unmanaged queue buildup, and untraceable agent decisions.

---

## 1. Page Definition

The Agent Operations page is the operational control room for ZoikoVertex agents after they have been designed, approved, and deployed. It must show the status of every active, scheduled, paused, failed, escalated, and completed agent run across brands, workspaces, channels, campaigns, and environments.

The page must support real-time monitoring, controlled intervention, issue triage, task routing, evidence inspection, queue management, incident escalation, emergency pause, and governance-safe recovery.

---

## 2. Required Page Functionality

| **Functional area** | **What the page should consist of** | **What needs to be implemented** |
|---|---|---|
| Operations dashboard | Live view of active agents, scheduled runs, pending approvals, failed jobs, escalations, restricted operations, and paused agents. | Dashboard cards, status counters, severity indicators, real-time refresh, environment selector, brand selector, workspace selector, and saved operational views. |
| Agent activity monitor | A table and card view of agent runs with owner, agent type, workflow, channel, task, runtime state, risk score, policy result, and next action. | Run list, filters, sortable columns, pagination, real-time updates, run detail drawer, bulk actions where permitted, and export of filtered operational logs. |
| Task queue management | Unified queue for content tasks, approval tasks, failed jobs, retry jobs, human-review tasks, publishing tasks, and exception tasks. | Queue tabs, assignment controls, SLA timers, priority rules, lock/claim behavior, reassignment, retry, cancel, hold, escalate, and resolution notes. |
| Runtime intervention | Human controls to pause, resume, stop, retry, reassign, hold, quarantine, or escalate an agent run. | Permission-gated action buttons, reason capture, confirmation modal, impact preview, immutable event log, and rollback/compensation path where applicable. |
| Risk and policy checks | Visibility into offensive language checks, prohibited claims, platform-specific rules, brand rules, legal/compliance rules, channel rules, audience-sensitivity rules, and drift warnings. | Policy result panel, flagged term/category display, severity, source rule, failed check reason, remediation path, reviewer routing, and no-bypass enforcement for blocking rules. |
| Evidence inspection | Every agent run must show what input was used, what prompt version was used, what knowledge sources were accessed, what model/tool was called, what policy checks ran, who approved, and what output was produced. | Evidence drawer, run timeline, prompt version link, knowledge source link, workflow version link, model/tool log, approval chain, decision rationale, output snapshot, and exportable evidence bundle. |
| Incident response | A controlled path for critical failures, platform rule breach, suspected hallucination, brand violation, unauthorized action, integration failure, or unsafe content risk. | Incident creation, severity levels, owner assignment, emergency pause, restricted mode, notification routing, root-cause fields, remediation record, and closure approval. |
| Operational analytics | Operational health, throughput, backlog, failure rate, policy-block rate, average approval time, agent productivity, rework rate, and escalation trends. | Charts, trend cards, drilldowns, CSV export, date range selector, brand/channel filters, and executive-safe summary metrics. |

---

## 3. Information Architecture and Layout

| **Zone** | **Required UI** | **Purpose** | **Primary action** |
|---|---|---|---|
| Top command bar | Workspace, brand, environment, date range, global search, refresh status, incident shortcut. | Keeps operational context visible and prevents cross-brand or cross-environment mistakes. | Search Runs |
| Operational health strip | Active agents, queued tasks, failed runs, escalations, restricted operations, policy blocks, SLA breaches. | Shows the operational state in one scan. | Open Critical Items |
| Live agent activity | Main table/card switcher with agent run records and risk indicators. | Provides the primary work surface for monitoring and intervention. | Open Run |
| Queue and exceptions panel | Side panel or tab set for approvals, failures, retries, human review, publishing holds, and incident items. | Prevents hidden work and unmanaged backlog. | Assign / Resolve |
| Run detail drawer | Timeline, inputs, prompt, knowledge, workflow, tool calls, policy checks, decisions, outputs, approvals, evidence. | Allows investigation without losing the operating context. | Create Incident |
| Control bar | Pause, resume, stop, retry, reassign, hold, quarantine, escalate, export evidence. | Supports fast, governed intervention. | Pause / Escalate |
| Analytics drawer | Throughput, backlog, failure, escalation, policy block, SLA and rework metrics. | Shows operational performance and reliability. | Export Report |

---

## 4. Runtime State Model

| **State** | **Meaning** | **Allowed actions** | **Evidence required** |
|---|---|---|---|
| Scheduled | Agent run is planned but has not started. | Open, reschedule, cancel, hold, inspect dependencies. | Schedule creator, trigger source, workflow version, agent version. |
| Queued | Run is waiting for capacity, dependency completion, approval, or policy clearance. | Open, reprioritize, assign, hold, cancel. | Queue time, priority, dependency reason, owner. |
| Running | Agent is actively processing a task. | Monitor, pause, stop, escalate, inspect live events. | Start time, runtime logs, model/tool calls, current step. |
| Waiting for Human Review | Agent output or decision requires review before continuation. | Approve, reject, request changes, reassign, escalate. | Reviewer, required approval rule, output snapshot, reason. |
| Policy Blocked | A non-bypassable rule has blocked continuation or publication. | Open evidence, remediate, route to policy owner, create incident. | Failed rule, severity, source policy, blocked output, timestamp. |
| Failed | Run ended because of error, timeout, integration issue, model/tool failure, or invalid dependency. | Retry, reassign, cancel, create incident, mark resolved. | Error code, failure source, retry history, owner notes. |
| Paused | Run is intentionally halted by authorized user, emergency control, policy gate, or system protection. | Resume where permitted, stop, escalate, inspect. | Pause reason, user/system actor, impact scope, timestamp. |
| Completed | Run completed all required steps and evidence capture. | Open, export evidence, duplicate where permitted, archive. | Final output, approvals, delivery result, evidence bundle ID. |
| Quarantined | Run or output is isolated due to suspected safety, brand, legal, data, or platform risk. | Investigate, assign, resolve, escalate, retire output. | Quarantine reason, affected assets, restricted access log. |

---

## 5. Agent Run Record Requirements

Every row in the operations table must be more than a status label. It must contain enough information for the user to know ownership, severity, timing, dependency, risk, and the next action.

| **Field** | **Requirement** |
|---|---|
| Run ID | Unique, copyable identifier linked to the full run detail and evidence bundle. |
| Agent name and type | Name, role, category, version, owner, and deployment environment. |
| Workflow and task | Workflow name, workflow version, step name, trigger source, task objective, and current step. |
| Brand, workspace, channel | Clear tenant, brand, campaign, platform/channel, and environment context. |
| Status and severity | State badge plus severity level: normal, attention, warning, critical, blocked. |
| Policy result | Pass, warning, blocked, pending review, or not applicable, with link to result details. |
| SLA timer | Time elapsed, due time, breach indicator, and responsible owner. |
| Next action | One primary next action per record, not a cluster of competing actions. |
| Evidence status | Captured, partial, failed, locked, or export-ready. |
| Last event | Most recent meaningful event with timestamp and actor. |

---

## 6. Detail Drawer Requirements

| **Tab** | **Must show** | **Must allow** |
|---|---|---|
| Overview | Agent, task objective, current status, owner, severity, timing, brand, campaign, channel, dependencies. | Assign owner, change priority, open linked agent/workflow/prompt/knowledge records. |
| Timeline | Chronological events, state changes, policy gates, approvals, pauses, retries, errors, tool calls, output delivery. | Filter events, copy event ID, export timeline. |
| Inputs | User request, campaign brief, source content, constraints, platform target, audience, locale, attached assets. | View only unless user has edit permission and run state permits changes. |
| Prompt | Prompt template, prompt version, variables, system constraints, approval status, test status. | Open Prompt Governance record. |
| Knowledge | Knowledge sources accessed, retrieval snippets, source versions, freshness, confidence, permission scope. | Open Knowledge Base source and flag stale or incorrect source. |
| Policy | Rules evaluated, pass/warn/block outcome, severity, failed terms/categories, platform-specific restrictions, brand/legal rules. | Send to reviewer, create incident, request policy update where permitted. |
| Output | Generated content, recommended action, publishing status, redactions, rejected versions, final version. | Approve, reject, request changes, hold, quarantine, export snapshot. |
| Evidence | Evidence bundle, hash/lock status, actor chain, approval chain, system logs, delivery receipts, exports. | Download evidence bundle where permitted and record export reason. |

---

## 7. Governance and Intervention Controls

| **Control** | **When it appears** | **Implementation requirement** |
|---|---|---|
| Pause Run | Running, queued, scheduled, or waiting states. | Requires permission, reason, optional duration, impact preview, and audit entry. |
| Resume Run | Paused state only. | Requires reason, dependency check, policy recheck where needed, and audit entry. |
| Stop Run | Running, queued, scheduled, or paused states. | Requires reason, confirmation, downstream impact warning, and output invalidation where applicable. |
| Retry Run | Failed state only, or completed with failed downstream delivery. | Requires retry scope, dependency validation, duplicate-publication guard, retry count limit, and error linkage. |
| Quarantine Output | Output exists and presents safety, legal, brand, policy, or platform risk. | Locks output, restricts visibility, blocks publishing, creates evidence event, and routes to reviewer. |
| Escalate | Critical, blocked, breached, disputed, or unresolved items. | Creates escalation record with severity, owner, due time, notification routing, and evidence link. |
| Emergency Pause | Systemic failure, platform rule breach, unsafe output risk, compromised integration, or executive/security decision. | Applies to selected agent, workflow, channel, brand, or workspace; requires elevated permission and mandatory incident record. |
| Restricted Operations Mode | When risk is elevated but full shutdown is not required. | Allows read, review, remediation, and approval; blocks new autonomous external actions until cleared. |

---

## 8. Policy and Platform Safety Checks

Agent Operations must display policy outcomes in plain operational language. It must not hide risk inside logs or force engineers to inspect raw system output to understand what failed.

| **Check category** | **Examples** | **Required page behavior** |
|---|---|---|
| Offensive and prohibited language | Profanity, slurs, harassment, hate, adult content, unsafe threats, culturally sensitive wording. | Show category, severity, platform impact, source text segment where safe, and remediation path. |
| Platform-specific rules | LinkedIn professional tone, X character limits and sensitive content, Meta ad claims, YouTube metadata, TikTok restrictions. | Show target platform, failed rule, blocking/warning status, and required correction. |
| Brand governance | Brand voice violation, wrong product claim, unsupported metric, wrong visual asset, competitor mention issue. | Route to Brand Governance Lead or request revision. |
| Legal and compliance | Regulated claims, privacy issue, personal data exposure, IP/copyright concern, misleading guarantee. | Block or route to required approver based on severity and policy type. |
| Knowledge grounding | Unsupported claim, stale source, missing citation/evidence, low confidence retrieval, source conflict. | Hold output and require source correction, reviewer decision, or knowledge base update. |
| Autonomy boundary | Agent attempts action beyond approved authority, wrong channel, wrong brand, wrong environment, unauthorized tool use. | Stop run, create evidence event, and escalate if critical. |

---

## 9. Permissions Matrix

| **Role** | **May do** | **Must not do** |
|---|---|---|
| Super Admin | View all operations, pause/resume/stop, emergency pause, assign incidents, export evidence, configure operational permissions. | Delete immutable evidence or bypass non-bypassable policy blocks. |
| AI Governance Lead | Inspect run logic, approve technical recovery, review autonomy breaches, quarantine outputs, request prompt/workflow fixes. | Publish or approve brand/legal-sensitive output without required business approver. |
| Operations Lead | Manage queues, assign owners, retry failed jobs, resolve operational issues, monitor SLAs and backlog. | Override legal, security, or brand governance blocks. |
| Brand Governance Lead | Review brand-sensitive outputs, approve/reject brand exceptions, request revision, quarantine brand-risk content. | Change agent runtime permissions or system policies. |
| Campaign Manager | View campaign-related runs, approve permitted campaign outputs, request revisions, monitor publishing tasks. | Access unrelated brands/workspaces or override blocked policy decisions. |
| Reviewer/Approver | Review assigned items, approve, reject, comment, request changes, escalate assigned cases. | Retry jobs, pause agents globally, edit policies, or export full system evidence unless granted. |
| Security Admin | Investigate security, access, integration, anomaly, and unauthorized action issues; apply restricted mode where permitted. | Approve marketing content or change brand strategy decisions. |
| Executive Viewer | View summary health, critical incidents, operational metrics, and evidence-ready summaries. | Operate runtime controls or alter queues. |

---

## 10. Evidence and Audit Requirements

- Every state change must capture actor, role, timestamp, prior state, new state, reason, source IP/device where available, and affected scope.

- Every intervention must capture reason, impact preview, confirmation event, system result, and any downstream compensation action.

- Every policy block must capture rule ID, rule version, severity, policy owner, blocked content snapshot where safe, and remediation outcome.

- Every retry must preserve the original failure evidence and create a new linked run attempt rather than overwriting the failed run.

- Evidence bundles must be exportable by authorized roles only and must record export user, reason, timestamp, and bundle scope.

- No user interface action may delete or silently mutate an agent run history, timeline, approval chain, or evidence bundle.

---

## 11. Engineering Implementation Contract

| **Layer** | **Required implementation** |
|---|---|
| Frontend | Responsive operations dashboard, virtualized run table, detail drawer, queue tabs, action modals, saved views, real-time indicators, empty/error/loading states, and accessible keyboard navigation. |
| Backend services | Agent run service, operations queue service, runtime control service, policy result service, incident service, evidence service, notification service, audit service, reporting service. |
| Realtime transport | WebSocket or server-sent events for status changes, queue changes, critical alerts, run timeline updates, and emergency pause state. Polling fallback required. |
| Event model | agent.run.created, run.started, run.paused, run.resumed, run.stopped, run.failed, run.retry_requested, policy.blocked, review.requested, incident.created, evidence.locked, output.quarantined. |
| Data storage | Operational records in transactional store; immutable audit/evidence ledger; searchable index for run logs and incidents; object storage for evidence artifacts. |
| Authorization | Tenant-scoped, brand-scoped, workspace-scoped, environment-scoped, and role-scoped permissions enforced server-side, not only through UI hiding. |
| Integrations | Publishing platforms, model gateway, prompt registry, knowledge base, workflow engine, policy engine, approval engine, notification channels, and evidence vault. |
| Observability | Structured logs, metrics, traces, queue depth, latency, error rate, retry rate, policy block rate, SLA breach rate, and alert health. |

---

## 12. Data Model Minimum Fields

| **Entity** | **Minimum fields** |
|---|---|
| AgentRun | id, tenant_id, workspace_id, brand_id, environment, agent_id, agent_version, workflow_id, workflow_version, task_id, status, severity, owner_id, priority, created_at, started_at, completed_at, due_at, last_event_at. |
| RunEvent | id, run_id, event_type, actor_type, actor_id, previous_state, new_state, reason, payload_ref, created_at, correlation_id. |
| PolicyResult | id, run_id, policy_id, policy_version, outcome, severity, failed_rule, affected_output_ref, remediation_required, created_at. |
| QueueItem | id, run_id, queue_type, priority, assignee_id, team_id, due_at, status, claimed_by, claimed_at, resolved_at. |
| Incident | id, run_id, severity, category, owner_id, status, created_by, created_at, due_at, root_cause, remediation, closed_by, closed_at. |
| EvidenceBundle | id, run_id, status, hash, locked_at, exported_by, exported_at, export_reason, storage_ref. |
| RuntimeControlAction | id, run_id, action_type, requested_by, approved_by, reason, impact_scope, result, created_at. |

---

## 13. API Minimums

| **Endpoint / capability** | **Purpose** |
|---|---|
| GET /operations/runs | List and filter agent runs across permitted workspace, brand, channel, state, severity, owner, and date range. |
| GET /operations/runs/{id} | Return full run summary, status, dependencies, current state, and permitted actions. |
| GET /operations/runs/{id}/timeline | Return immutable timeline events for the run. |
| POST /operations/runs/{id}/pause | Pause a run with reason, impact scope, and audit event. |
| POST /operations/runs/{id}/resume | Resume a paused run after dependency and policy checks. |
| POST /operations/runs/{id}/stop | Stop a run and record downstream impact. |
| POST /operations/runs/{id}/retry | Create a linked retry attempt without overwriting original failure evidence. |
| POST /operations/runs/{id}/quarantine | Quarantine output or run artifacts and restrict access. |
| POST /operations/incidents | Create an incident linked to run evidence. |
| GET /operations/queues | Return queue items by type, priority, owner, SLA, and state. |
| POST /operations/queues/{id}/assign | Assign or reassign a queue item. |
| GET /operations/evidence/{bundle_id} | Retrieve evidence bundle metadata and export permissions. |
| POST /operations/evidence/{bundle_id}/export | Export evidence bundle and record export reason. |

---

## 14. Error, Empty, and Edge States

| **Scenario** | **Required behavior** |
|---|---|
| No active runs | Show a useful empty state with links to scheduled runs, agent catalog, workflow health, and recent completed runs. |
| Realtime connection lost | Show degraded mode banner, last refresh time, manual refresh control, and polling fallback. |
| User lacks permission | Disable action, show permission reason, and suggest correct owner or escalation path. |
| Action fails | Show failure reason, do not change visible state unless confirmed by backend, record attempted action where applicable. |
| Stale run state | Refresh before executing critical action and warn user if state changed. |
| Duplicate publishing risk | Block retry or require explicit duplicate prevention confirmation before downstream delivery retry. |
| Evidence capture partial | Mark evidence as partial, show missing artifact, create remediation task, and block final evidence-ready label. |
| Policy engine unavailable | Fail closed for external actions, permit investigation, and show restricted operations state. |
| Model/tool provider outage | Show affected agents/workflows, route to retry queue, and prevent repeated uncontrolled retry loops. |

---

## 15. Operational Metrics

| **Metric** | **Definition** | **Use** |
|---|---|---|
| Active runs | Number of runs currently executing. | Capacity and live operations health. |
| Queue depth | Open queue items by type and priority. | Backlog management. |
| Failure rate | Failed runs divided by total runs for selected period. | Reliability monitoring. |
| Retry success rate | Successful retries divided by retry attempts. | Recovery effectiveness. |
| Policy block rate | Blocked outputs divided by evaluated outputs. | Governance risk trend. |
| Human review time | Average time from review request to decision. | Approval bottleneck detection. |
| SLA breach rate | Breached queue items divided by due items. | Operational accountability. |
| Incident closure time | Average time from incident creation to approved closure. | Risk response performance. |
| Evidence completeness | Runs with complete evidence divided by completed runs. | Audit readiness. |

---

## 16. Acceptance Criteria

- The page shows live, queued, scheduled, failed, blocked, paused, escalated, quarantined, and completed agent runs in one coherent operational surface.

- Every agent run record displays owner, status, severity, policy result, evidence status, SLA state, and one clear next action.

- The user can open a run detail drawer and inspect timeline, input, prompt version, knowledge sources, workflow version, policy checks, output, approvals, and evidence without leaving the page.

- Pause, resume, stop, retry, quarantine, escalation, and emergency pause actions are permission-gated, reason-captured, server-enforced, and audit-logged.

- Policy blocks and platform rule failures are visible in operational language, with remediation routing and no silent bypass.

- Failed runs preserve original evidence and create linked retry attempts instead of overwriting history.

- Evidence exports are permission-gated and recorded with user, reason, timestamp, and bundle scope.

- Realtime status updates are implemented with a polling fallback and visible degraded-mode behavior.

- The page handles empty states, stale state, insufficient permission, provider outage, policy-engine outage, partial evidence, and duplicate delivery risk.

- Engineering can test the page through defined APIs, event types, data fields, permissions, and acceptance criteria.

---

## 17. Engineer Build Checklist

| **Build item** | **Done when** |
|---|---|
| Operations dashboard | Health strip, run list, filters, saved views, and refresh behavior are functional. |
| Run detail drawer | All required tabs display linked runtime, governance, and evidence data. |
| Queue management | Queue tabs, assignment, SLA timers, retry, hold, and escalation paths work. |
| Runtime controls | Pause, resume, stop, retry, quarantine, and escalation are implemented with permission and reason capture. |
| Policy visibility | Policy results, blocking rules, severity, platform-specific rules, and remediation routing display correctly. |
| Evidence capture | Run timeline, approval chain, prompt/knowledge/workflow version links, and export bundle metadata are available. |
| Incidents | Incident creation, severity, assignment, remediation, and closure are linked to runs. |
| Realtime updates | Status and queue changes appear without manual refresh, with fallback when realtime is unavailable. |
| Audit logs | Every critical action creates immutable audit events. |
| Access control | Tenant, brand, workspace, environment, and role scoping are enforced server-side. |
| Testing | Unit, integration, permission, error-state, realtime, evidence, and acceptance tests are complete. |

---

> **Final Engineering Instruction** — Build Agent Operations as a controlled operating room, not as a reporting table. The page succeeds only when an authorized user can see what is happening, understand why it is happening, intervene safely, prove the action, and recover from failure without losing governance integrity.

---

*Confidential — ZoikoVertex Authority Layer Specification*