# ZOIKOVERTEX

## Document 2

## Workflows Page

Complete product, UX, governance, runtime, evidence, and engineering build contract

| **Field** | **Detail** |
|---|---|
| Prepared for | Kamani Shashi and ZoikoVertex AI Solutions Engineering |
| Prepared by | Global CTO / Global Head of AI advisory layer |
| Language | American English |
| Document status | Final implementation-grade build contract |
| Page scope | Workflows page only |
| Build principle | Governed workflow execution with approvals, policy checks, runtime visibility, and evidence capture |

---

## 1. Executive Build Instruction

> **Core Direction**
> The Workflows page must be the governed execution layer for ZoikoVertex. It is not a generic automation builder. It must let authorized users design, approve, simulate, run, monitor, pause, audit, and improve AI-assisted workflows across brands, platforms, campaigns, agents, prompts, knowledge sources, and policy controls.

The page must make the next required action obvious, show ownership and risk at every stage, prevent unsafe production changes, and generate evidence for every material workflow decision. The engineering team should build this page as a control plane where business users can operate confidently and governance users can prove what happened.

---

## 2. Exact Engineering Format Requested

### *workflows*

### what functionality the page should consist of

- Create, view, edit, duplicate, approve, activate, pause, retire, and roll back governed workflow templates.
- Build workflow steps for content creation, review, approval, scheduling, publishing, moderation, reporting, campaign handoff, incident response, and evidence packaging.
- Show each workflow as a clear step-by-step path with trigger, owner, agent action, prompt, knowledge lookup, policy check, human review, approval gate, platform action, notification, and evidence capture.
- Support reusable workflow templates by brand, campaign type, platform, region, language, risk level, content type, and business unit.
- Require approval gates before sensitive claims, public publishing, live replies, crisis communications, deletion/moderation actions, legal/compliance wording, and high-risk autonomous execution.
- Allow simulation before activation using sample inputs, selected agent, selected prompt, knowledge sources, policy rules, and expected output.
- Show workflow status: Draft, Testing, Pending Approval, Approved, Active, Paused, Blocked, Deprecated, Retired, or Failed.
- Show workflow health: active runs, pending approvals, failed steps, breached SLAs, blocked policy checks, stale knowledge dependencies, prompt drift alerts, and rollback availability.
- Provide runtime monitoring for every workflow instance with status, current step, responsible owner, blocker, deadline, risk score, confidence score, and next action.
- Generate an evidence bundle for every workflow run, including input, agent, prompt version, knowledge sources, policy results, approvals, human edits, output, platform result, and timestamps.

### what need to be implemented

- Workflow template library with search, filters, status chips, owner, risk level, linked agents, linked prompts, linked knowledge sources, last updated date, active runs, and health indicators.
- Workflow builder with controlled nodes: Trigger, Agent Action, Prompt Execution, Knowledge Lookup, Policy Check, Human Review, Approval Gate, Schedule, Publish, Moderate, Notify, Escalate, Evidence Capture, Delay, Branch, End.
- Step configuration panel for owner, SLA, required role, input, output, dependencies, policy requirements, evidence requirements, fallback owner, and escalation rule.
- Conditional logic engine for brand, platform, content type, risk score, confidence score, claim type, jurisdiction, language, approval status, campaign priority, and policy result.
- Approval-gate engine with role-based approvals, one-step approval, two-step approval, three-key approval for critical risk, delegated approval, fallback owner, SLA breach escalation, and rejection reason capture.
- Workflow simulation engine that runs sample scenarios and returns pass, warning, block, escalation, missing dependency, or failed integration results.
- Workflow versioning with Draft, Test, Approved, Active, Paused, Deprecated, Retired, and Rollback states. Live workflows must not be directly edited.
- Workflow instance runtime log with every step transition, actor, timestamp, input, output, reason code, system decision, human decision, policy result, and evidence reference.
- Dependency map showing linked agents, prompts, knowledge sources, policy packs, platform connectors, campaigns, and downstream workflows.
- Evidence service integration that creates immutable evidence records for workflow design changes, approvals, simulations, runtime actions, failures, overrides, and publishing events.
- Permission checks for create, edit, approve, activate, pause, retire, roll back, export evidence, and override actions.
- Notification events for pending approval, failed step, blocked policy result, overdue SLA, emergency pause, stale knowledge source, prompt drift, and successful completion.

---

## 3. Page Objective and Non-Negotiables

> **Layout Rule**
> The layout must reduce decision friction. High-risk items, blocked steps, pending approvals, and failed runs must be visible before low-priority configuration details.

| **Objective** | **Required Implementation** |
|---|---|
| Governed execution | Every workflow must route AI actions through permissions, policy checks, approval gates, runtime controls, and evidence capture. |
| Operational clarity | Users must see what is running, what is blocked, who owns the next action, and what decision is required. |
| Safe autonomy | Autonomous steps must be limited by risk level, approved scope, agent permissions, workflow conditions, and rollback rules. |
| Version discipline | Active workflow templates cannot be edited directly. Changes must create a draft version, pass simulation, receive approval, and then deploy. |
| Evidence by default | Design changes, simulations, approvals, overrides, runtime actions, and platform results must create traceable evidence records. |
| Business usability | The page must work for campaign managers, brand leads, approvers, governance admins, engineers, and auditors without forcing them into engineering tools. |

---

## 4. Primary User Roles and Jobs

| **Role** | **Primary Jobs on Workflows Page** | **Controls Needed** |
|---|---|---|
| Global Admin | Oversee all workflows, assign permissions, pause production activity, approve critical changes, and restore prior versions. | Full access, emergency controls, evidence export, rollback. |
| AI Governance Admin | Design governance structure, policy gates, approval rules, risk routing, simulation requirements, and evidence requirements. | Builder access, policy mapping, approval design, simulation and audit access. |
| Campaign Manager | Create campaign workflow drafts, run simulations, request approvals, monitor active campaign workflows, and resolve blocked tasks. | Template creation, request approval, runtime monitoring, limited edits. |
| Brand Lead | Review brand-sensitive content and workflow outputs before publication or campaign release. | Assigned approvals, brand-specific evidence, edit/request-change actions. |
| Legal / Compliance Reviewer | Review regulated claims, disclosures, crisis content, public replies, and high-risk actions. | Compliance queue, evidence view, approve/reject/escalate authority. |
| Engineer | Maintain integrations, diagnose failed workflow steps, view technical logs, and repair connector issues. | Technical diagnostics, sandbox tests, no unilateral production release. |
| Auditor | Review workflow history, approvals, evidence bundles, exceptions, overrides, and policy results. | Read-only audit access and export permissions. |

---

## 5. Required Page Layout

| **Area** | **Required Components** | **Purpose** |
|---|---|---|
| Header | Page title, tenant selector, brand selector, environment badge, search, Create Workflow CTA, emergency pause indicator. | Confirms operating context and gives immediate access to the primary action. |
| Control Strip | Active workflows, pending approvals, blocked runs, failed runs, SLA breaches, stale dependencies, critical risk items. | Surfaces what needs attention immediately. |
| Left Navigation | Templates, Active Runs, Approvals, Simulations, Dependencies, Evidence, Settings. | Keeps the page organized without hiding critical work. |
| Template Library | Searchable workflow cards/table with owner, status, risk, linked agent, active runs, health, last modified, and actions. | Lets users find, inspect, and manage workflows quickly. |
| Builder Canvas | Node-based workflow path with step cards, condition branches, warnings, and current configuration state. | Makes complex workflow logic understandable and controllable. |
| Configuration Panel | Step settings, owner, SLA, approval role, policy checks, evidence requirement, fallback, and escalation. | Keeps editing close to the selected step. |
| Runtime Panel | Instance list with current step, owner, blocker, deadline, risk, confidence, action needed. | Turns workflow operations into a manageable queue. |
| Evidence Drawer | Prompt version, knowledge sources, policy checks, approvals, outputs, platform response, timestamps. | Provides audit context without leaving the page. |
| Action Bar | Save Draft, Simulate, Send for Approval, Activate, Pause, Retire, Roll Back, Export Evidence. | Keeps decision actions consistent and controlled. |

---

## 6. Workflow Lifecycle

| **State** | **Meaning** | **Allowed Actions** | **Exit Condition** |
|---|---|---|---|
| Draft | Workflow is being created or edited and is not available for production use. | Edit, duplicate, delete draft, simulate, send for review. | Simulation completed or sent for approval. |
| Testing | Workflow is being tested with sample cases and policy checks. | Run tests, fix issues, view results, send for approval. | Pass required tests or return to draft. |
| Pending Approval | Workflow requires authorized review before activation. | Approve, reject, request changes, escalate. | Approved or sent back. |
| Approved | Workflow is approved but not yet active in production. | Activate, schedule activation, archive approval record. | Activated or expired. |
| Active | Workflow can run production instances. | Monitor, pause, create new version, retire, roll back to prior approved version. | Paused, retired, or replaced. |
| Paused | Workflow is temporarily stopped but configuration and evidence are preserved. | Resume, inspect, create fix version, retire. | Resumed or retired. |
| Blocked | Workflow cannot proceed because a required dependency or policy check failed. | Resolve blocker, rerun check, escalate, pause. | Blocker resolved or workflow paused. |
| Deprecated | Workflow is no longer preferred but may remain available for historical reference. | View, duplicate as new draft, retire. | Retired or duplicated. |
| Retired | Workflow cannot be used for new runs but records remain available. | View history, export evidence. | Permanent record state. |

---

## 7. Workflow Builder Requirements

### 7.1 Node Types

| **Node** | **Functionality** | **Must Implement** |
|---|---|---|
| Trigger | Starts a workflow from manual action, schedule, campaign event, content request, platform event, or API. | Trigger type, source, required input, validation, owner, risk default. |
| Agent Action | Assigns an approved agent to draft, analyze, summarize, moderate, classify, recommend, or prepare output. | Agent selection, allowed action, mode, risk cap, fallback action. |
| Prompt Execution | Runs a specific approved prompt version. | Prompt ID, version, inputs, expected output, allowed tools, timeout. |
| Knowledge Lookup | Retrieves approved knowledge sources for grounding. | Source scope, brand, jurisdiction, freshness, sensitivity, retrieval limits. |
| Policy Check | Evaluates content, action, claim, platform, brand, and risk rules. | Policy pack, severity, pass/warn/block logic, reason codes. |
| Human Review | Routes an item to a responsible reviewer before continuation. | Reviewer role, SLA, decision options, edit rights, required comments. |
| Approval Gate | Blocks progress until an authorized decision is recorded. | Approval type, role, quorum, escalation, rejection handling. |
| Schedule | Schedules approved output for a future date/time. | Date/time, timezone, platform readiness, collision check, reschedule rules. |
| Publish / External Action | Executes an approved platform action. | Connector, platform validation, final policy check, result capture. |
| Notify | Sends internal notifications to owners, reviewers, or escalation groups. | Channel, recipient rule, urgency, template, evidence link. |
| Escalate | Raises blocked, risky, failed, or overdue items to higher authority. | Escalation reason, target role, SLA, severity, evidence bundle. |
| Evidence Capture | Creates or updates the workflow evidence bundle. | Record type, linked objects, hash, export eligibility, retention rule. |
| Branch | Routes workflow based on condition. | Condition builder, default path, fail-safe path, validation. |
| Delay | Waits until a time, event, or condition is met. | Duration, trigger, max wait, escalation after timeout. |
| End | Closes the workflow with status and evidence. | Completion status, summary, evidence closure, reporting update. |

### 7.2 Builder Behaviors

- Show incomplete steps with a clear missing-item indicator and a direct path to fix the missing field.
- Prevent activation if the workflow has no owner, no trigger, missing approval gates for high-risk paths, missing policy checks, missing evidence capture, or invalid linked dependencies.
- Warn when a workflow uses stale knowledge, deprecated prompts, paused agents, disabled connectors, or unapproved policy packs.
- Allow users to duplicate a workflow template and edit the duplicate without changing the original active workflow.
- Show impact analysis before publishing a new version: affected brands, agents, campaigns, scheduled content, active runs, and dependent workflows.
- Provide autosave for drafts, but require explicit submission for approval and explicit activation for production.
- Support comments on workflow drafts, review decisions, simulation failures, and runtime incidents.

---

## 8. Runtime Operations Requirements

| **Runtime Item** | **Visible Data** | **Available User Actions** | **System Action** |
|---|---|---|---|
| Active run | Workflow name, instance ID, current step, owner, SLA, risk score, confidence score, status, blocker. | Open, assign, pause, escalate, view evidence. | Update status, log event, notify owner. |
| Pending approval | Approver role, submitted by, content/action, risk, policy result, source grounding, deadline. | Approve, reject, edit if permitted, request changes, escalate. | Record decision, continue or route back, update evidence. |
| Blocked step | Block reason, failed policy, missing dependency, severity, affected output, recommended fix. | Resolve, rerun check, request help, escalate, pause. | Log reason code, notify owner, preserve state. |
| Failed connector | Platform, action attempted, error, retry eligibility, last successful connection, affected workflow. | Retry, switch to manual, escalate to engineer, pause workflow. | Record failure, apply retry policy, alert engineering. |
| SLA breach | Step, owner, deadline, duration overdue, downstream impact, risk level. | Reassign, escalate, extend with reason, pause. | Notify fallback owner, create breach event. |
| Policy warning | Warning severity, policy name, reason, suggested mitigation. | Accept with reason if permitted, edit, request review, escalate. | Capture decision and reason in evidence. |
| Emergency pause | Scope, triggered by, reason, affected workflows, affected agents, recovery owner. | Confirm pause, resume with authorization, export evidence. | Stop execution safely, preserve evidence, notify stakeholders. |

---

## 9. Governance Rules

| **Rule** | **Required Behavior** | **Reason** |
|---|---|---|
| No direct production edits | Active workflows can only be changed through a new draft version that is tested, approved, and deployed. | Prevents uncontrolled changes. |
| High-risk gates are mandatory | Critical workflow paths must include approval gates, policy checks, and evidence capture before external action. | Prevents unsafe autonomy. |
| Every output must be grounded where required | Workflows using factual, pricing, product, legal, compliance, or regulated claims must include knowledge lookup and source trace. | Reduces unsupported claims. |
| Policy failures must block or escalate | Critical policy failures stop the workflow. Warnings require mitigation or authorized acceptance with reason. | Makes risk handling explicit. |
| Approvals must be role-based | Approval authority comes from role, brand scope, risk level, and assigned responsibility. | Prevents unauthorized approvals. |
| Overrides require reason capture | Override, resume, rollback, and emergency actions require reason, actor, timestamp, scope, and evidence link. | Maintains audit defensibility. |
| Expired dependencies must not run silently | Stale prompts, expired knowledge, paused agents, and disabled connectors must warn or block based on risk level. | Prevents hidden operational failure. |
| Evidence cannot be optional | Material workflow actions must generate evidence automatically and attach it to the workflow instance. | Creates a defensible record. |

---

## 10. Workflow Data Model

| **Object** | **Minimum Fields** |
|---|---|
| Workflow Template | workflow_id, tenant_id, name, description, type, status, owner_id, business_unit_id, brand_ids, platforms, risk_level, created_by, updated_by, created_at, updated_at, current_version_id, active_from, retired_at. |
| Workflow Version | version_id, workflow_id, version_number, state, change_summary, change_reason, created_by, approved_by, approved_at, activated_by, activated_at, rollback_from, rollback_reason. |
| Workflow Step | step_id, version_id, step_type, name, description, owner_role, owner_user_id, sequence, conditions, input_schema, output_schema, required_policy_checks, required_evidence, sla_minutes, fallback_owner, escalation_rule. |
| Workflow Edge | edge_id, version_id, from_step_id, to_step_id, condition, default_path, fail_safe_path, branch_label. |
| Workflow Instance | instance_id, workflow_id, version_id, status, trigger_type, trigger_source, started_by, current_step_id, priority, risk_score, confidence_score, started_at, due_at, completed_at, paused_at, evidence_bundle_id. |
| Step Run | step_run_id, instance_id, step_id, status, input_ref, output_ref, actor_type, actor_id, started_at, completed_at, error_code, reason_code, policy_result_id, evidence_ref. |
| Approval Record | approval_id, instance_id, step_id, required_role, approver_id, decision, decision_reason, edited_output_ref, requested_changes, decided_at, evidence_ref. |
| Simulation Run | simulation_id, workflow_version_id, scenario_name, sample_input_ref, result, warnings, blocks, failed_steps, created_by, created_at, evidence_ref. |
| Dependency Record | dependency_id, workflow_version_id, dependency_type, dependency_id_ref, required_status, current_status, last_checked_at, impact_level. |

---

## 11. API and Backend Services

| **Service / Endpoint Group** | **Required Responsibility** |
|---|---|
| Workflow Template Service | Create, update, duplicate, list, search, filter, archive, retire, and retrieve workflow templates. |
| Workflow Version Service | Create draft versions, compare versions, submit for approval, activate, pause, deprecate, retire, and roll back. |
| Workflow Builder Service | Validate nodes, edges, conditions, required fields, dependencies, and activation readiness. |
| Workflow Runtime Service | Start instances, execute steps, transition statuses, pause/resume runs, retry failed steps, and close workflows. |
| Approval Service | Route approvals, enforce role authority, record decisions, manage SLAs, fallback owners, and escalations. |
| Simulation Service | Run sample scenarios against agents, prompts, knowledge, policy rules, and connector validations. |
| Policy Engine Integration | Evaluate workflow steps and outputs against content, brand, platform, legal, compliance, and risk policies. |
| Evidence Service Integration | Create and link evidence records for design changes, simulations, approvals, runtime actions, failures, overrides, and platform responses. |
| Dependency Service | Check status of linked agents, prompts, knowledge sources, policy packs, connectors, campaigns, and downstream workflows. |
| Notification Service | Send alerts for pending approvals, failed steps, blocked policy checks, SLA breaches, stale dependencies, emergency pause, and completion. |
| Audit Event Service | Record normalized action events across user, agent, workflow, policy, evidence, and platform activity. |
| Export Service | Generate workflow evidence bundles, approval histories, incident timelines, and audit-ready exports. |

---

## 12. Front-End Components

| **Component** | **Purpose** | **Required States** |
|---|---|---|
| Workflow Summary Cards | Show operational volume and risk at the top of the page. | Normal, warning, critical, loading, empty. |
| Template Table / Cards | Display workflow templates with fast actions. | Draft, testing, pending approval, active, paused, blocked, retired. |
| Builder Canvas | Visualize and edit workflow nodes and branches. | Editing, read-only, invalid, simulation mode, approval mode. |
| Node Card | Represent each workflow step. | Configured, incomplete, warning, blocked, running, complete, failed. |
| Step Configuration Drawer | Edit selected node settings. | Editable, locked, requires permission, validation error. |
| Runtime Instance Table | Monitor active and historical workflow runs. | Active, waiting, blocked, failed, completed, paused. |
| Approval Queue | Show review-required items. | Pending, overdue, approved, rejected, changes requested, escalated. |
| Simulation Panel | Test workflow before activation. | Ready, running, passed, warning, blocked, failed. |
| Dependency Map | Show linked agents, prompts, knowledge, policies, connectors, campaigns. | Healthy, stale, paused, missing, deprecated, critical failure. |
| Evidence Drawer | Show audit record without leaving the workflow page. | Available, partial, pending, export-ready, restricted. |
| Action Confirmation Modal | Confirm high-impact actions. | Activate, pause, resume, retire, rollback, override, emergency pause. |

---

## 13. Validation, Error, and Empty States

### 13.1 Validation Rules

- A workflow cannot activate without a trigger, owner, start step, end step, valid path, evidence capture, and required approval gates.
- A workflow cannot activate if any linked agent is paused, unapproved, or missing required permissions for the assigned action.
- A workflow cannot activate if any linked prompt is draft, deprecated, retired, or missing required test approval.
- A workflow cannot activate if any required knowledge source is expired, restricted, unapproved, or outside the workflow scope.
- A workflow cannot activate if any publish or platform-action step lacks a final policy check and platform-readiness validation.
- A workflow cannot retire if active runs are still in progress unless an authorized user chooses a controlled stop path.

### 13.2 Error States

| **Error** | **Message Behavior** | **Recovery Action** |
|---|---|---|
| Missing dependency | Explain which dependency is missing and where it is required. | Open dependency, replace dependency, save as draft. |
| Policy block | Show policy name, severity, reason code, affected step, and recommendation. | Edit, route to reviewer, escalate, or pause. |
| Approval overdue | Show owner, deadline, elapsed time, downstream impact, and fallback path. | Reassign, escalate, extend with reason. |
| Connector failure | Show platform, action, error type, retry status, and technical reference. | Retry, switch to manual, notify engineering. |
| Simulation failed | Show failed step, sample case, output, policy result, and fix recommendation. | Edit workflow, prompt, policy, or dependency and rerun. |
| Permission denied | Explain that the user lacks authority and identify the required role. | Request access or route to authorized user. |

### 13.3 Empty States

- No workflows yet: explain the purpose of workflows and show Create Workflow and Use Template actions.
- No active runs: show that there are no workflows currently running and provide a link to the template library.
- No approvals pending: confirm that the queue is clear and show recently approved/rejected items.
- No simulation history: explain that workflows should be simulated before activation and show Run Simulation.
- No evidence yet: explain that evidence appears after simulation, approval, activation, or runtime activity.

---

## 14. Reporting and Metrics

| **Metric** | **Definition** | **Why It Matters** |
|---|---|---|
| Workflow completion rate | Percentage of workflow instances completed successfully. | Measures execution reliability. |
| Average approval time | Time from approval request to decision. | Shows review bottlenecks. |
| Blocked-run rate | Percentage of runs stopped by policy, missing dependencies, or failed connectors. | Shows governance and configuration issues. |
| SLA breach rate | Percentage of workflow steps completed after deadline. | Shows operational discipline. |
| Policy failure rate | Number and percentage of warnings and blocks by workflow type. | Shows risk trends. |
| Override rate | Frequency of authorized overrides with reason codes. | Shows pressure points and control quality. |
| Rollback usage | Number of rollbacks by workflow and reason. | Shows deployment stability. |
| Evidence completeness | Percentage of completed runs with full evidence bundles. | Shows audit readiness. |
| Dependency health | Count of stale prompts, expired knowledge, paused agents, or failing connectors linked to workflows. | Prevents operational failure. |

---

## 15. Acceptance Criteria

| **Area** | **Acceptance Criteria** |
|---|---|
| Template Library | Users can search, filter, view, duplicate, pause, retire, and inspect workflows by status, owner, risk, brand, platform, agent, and health. |
| Builder | Users can create a valid workflow with nodes, branches, approvals, policies, dependencies, evidence requirements, and escalation rules. |
| Validation | The system blocks activation when required governance, ownership, policy, dependency, or evidence controls are missing. |
| Simulation | Users can run a simulation, see pass/warn/block/fail results, inspect the failed step, and fix the issue. |
| Approvals | Approvals are routed to authorized roles, record decisions, capture comments, and update workflow or runtime state. |
| Runtime Monitoring | Users can see active runs, current step, owner, blocker, deadline, risk, confidence, and next available action. |
| Evidence | Every material design, approval, simulation, runtime, failure, override, publishing, pause, and rollback action creates evidence. |
| Versioning | Active workflows cannot be directly edited. New changes create a draft version that must be tested and approved. |
| Rollback | Authorized users can restore a prior approved version with reason capture and evidence logging. |
| Permissions | Unauthorized actions are hidden or disabled with a clear reason and required role. |
| Performance | Primary page views should load quickly with paginated or virtualized lists for large tenants. |
| Audit | Auditors can view workflow history and export evidence without edit authority. |

---

## 16. Build Sequence for Engineering

- Create workflow data models, statuses, lifecycle rules, and permission model.
- Build Workflow Template Library with search, filters, status, owner, risk, linked resources, and health indicators.
- Build Workflow Builder shell with nodes, edges, configuration drawer, validation messages, autosave, and draft handling.
- Implement required node types: Trigger, Agent Action, Prompt Execution, Knowledge Lookup, Policy Check, Human Review, Approval Gate, Schedule, Publish, Notify, Escalate, Evidence Capture, Branch, Delay, and End.
- Connect workflow builder to Agent Studio, Prompt Governance, Knowledge Base, Policy Engine, Evidence Service, and Platform Connector Service.
- Implement simulation engine with sample inputs, pass/warn/block/fail results, reason codes, and evidence records.
- Implement approval routing, rejection, requested changes, escalation, SLA tracking, and fallback owners.
- Build runtime monitoring for workflow instances and step runs, including active, blocked, failed, waiting, paused, and completed states.
- Add dependency map and stale dependency alerts for agents, prompts, knowledge sources, policies, connectors, and campaigns.
- Implement versioning, activation, pause, resume, retire, rollback, and export evidence workflows.
- Add metrics, notifications, audit views, and operational dashboards after core workflow creation and runtime controls are stable.

---

## 17. Final Engineer-Facing Instruction

> **Implementation Summary**
> Build the Workflows page as ZoikoVertex's governed execution engine. A workflow must not merely automate tasks. It must define who owns the task, which agent is allowed to act, which prompt and knowledge are used, which policies are checked, when humans must approve, what happens when something fails, and what evidence proves the decision. The page is production-ready only when users can design, simulate, approve, run, monitor, pause, roll back, and audit workflows from one controlled interface.

---

*ZoikoVertex | Document 2 | Workflows Page Build Contract*