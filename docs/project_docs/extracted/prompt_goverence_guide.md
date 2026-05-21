# ZoikoVertex — Prompt Governance Page Build Contract

**Document 3 | Complete Product, UX, Governance, Runtime, Evidence, and Engineering Specification**

| | |
|---|---|
| Prepared for | ZoikoVertex Engineering, Product, AI Governance, Security, and QA Teams |
| Language | American English |
| Classification | Internal Build Contract |
| Status | Final Version |
| Version | 1.0 |
| Date | 19 May 2026 |

---

> **Build Doctrine**
> The Prompt Governance page must operate as the control center for every prompt, instruction, agent behavior rule, tool-use pattern, model-routing condition, approval dependency, test result, evidence record, and runtime deployment status. It is not a prompt library. It is the governed instruction lifecycle system for ZoikoVertex.

---

## Table of Contents

1. [Executive Build Decision](#1-executive-build-decision)
2. [Page Purpose and Product Boundary](#2-page-purpose-and-product-boundary)
3. [Primary Users and Jobs to Be Done](#3-primary-users-and-jobs-to-be-done)
4. [Information Architecture and Page Structure](#4-information-architecture-and-page-structure)
5. [Core Functionality Requirements](#5-core-functionality-requirements)
6. [Prompt Lifecycle States and Control Logic](#6-prompt-lifecycle-states-and-control-logic)
7. [Governance Rules and Approval Model](#7-governance-rules-and-approval-model)
8. [Runtime Enforcement and Model Routing](#8-runtime-enforcement-and-model-routing)
9. [Testing, Evaluation, and Quality Gates](#9-testing-evaluation-and-quality-gates)
10. [Evidence, Audit, and Version History](#10-evidence-audit-and-version-history)
11. [Knowledge Base and Workflow Dependencies](#11-knowledge-base-and-workflow-dependencies)
12. [UX, Interaction, and Empty-State Requirements](#12-ux-interaction-and-empty-state-requirements)
13. [Data Model and Engineering Objects](#13-data-model-and-engineering-objects)
14. [API, Event, and Integration Requirements](#14-api-event-and-integration-requirements)
15. [Security, Permissions, and Tenant Isolation](#15-security-permissions-and-tenant-isolation)
16. [Notifications, SLAs, and Operational Escalation](#16-notifications-slas-and-operational-escalation)
17. [Analytics, Metrics, and Admin Reporting](#17-analytics-metrics-and-admin-reporting)
18. [QA Scenarios and Acceptance Criteria](#18-qa-scenarios-and-acceptance-criteria)
19. [Implementation Phasing](#19-implementation-phasing)
20. [Final Engineering Handoff Checklist](#20-final-engineering-handoff-checklist)
- [Appendix A — Engineer Format: Page Functionality and Implementation Items](#appendix-a--engineer-format-page-functionality-and-implementation-items)

---

## 1. Executive Build Decision

> **Decision**
> Build Prompt Governance as a governed instruction management and deployment-control surface. The page must let authorized teams create, test, approve, deploy, monitor, roll back, and evidence every prompt used by agents, workflows, tools, and knowledge-grounded tasks inside ZoikoVertex.

| Build Question | Final Decision |
|---|---|
| What is the page? | A lifecycle control center for prompts and agent instructions across drafting, testing, approval, deployment, monitoring, rollback, and audit. |
| What is it not? | It is not a simple prompt text editor, prompt inspiration board, or ungoverned library of reusable copy. |
| Primary value | Prevents unsafe, off-brand, non-compliant, hallucination-prone, untested, or unauthorized instructions from reaching production agents. |
| Core users | AI operations leads, prompt engineers, product owners, compliance reviewers, brand reviewers, security administrators, and engineering support. |
| Engineering priority | Control-state accuracy, version immutability, test reproducibility, approval integrity, runtime enforcement, rollback reliability, and evidence completeness. |

### Foundational Rules

- Every prompt must have an **owner, purpose, risk tier, applicable agent, applicable workflow, approved knowledge sources, test suite, deployment status, and version history**.
- No prompt may be promoted to production unless it **passes required tests and required approvals** for its risk tier.
- Runtime agents must only execute the **active approved version** assigned to their agent, workflow, tenant, brand, locale, and channel context.
- Every create, edit, test, approval, deployment, rollback, and runtime-use event must **write to the Evidence Vault**.

---

## 2. Page Purpose and Product Boundary

| Area | Required Boundary |
|---|---|
| Prompt governance scope | System prompts, developer prompts, agent role instructions, task instructions, channel instructions, tool-use instructions, escalation instructions, refusal logic, safety rules, localization instructions, and output-format constraints. |
| Excluded from this page | Raw knowledge documents, workflow diagrams, social post drafts, asset approvals, customer billing settings, user management, and model provider configuration except where referenced by prompt routing rules. |
| Relationship to Agent Studio | Agent Studio defines agent identity and capability boundaries. Prompt Governance controls the instruction sets those agents are allowed to use. |
| Relationship to Agent Operations | Agent Operations shows live execution health. Prompt Governance controls which prompt versions are active and provides rollback when prompt behavior creates operational risk. |
| Relationship to Workflows | Workflows define process orchestration. Prompt Governance attaches governed prompts to specific workflow nodes and execution conditions. |
| Relationship to Knowledge Base | Knowledge Base manages source material. Prompt Governance declares which sources a prompt may use and whether retrieval is mandatory, optional, or blocked. |

---

## 3. Primary Users and Jobs to Be Done

| User Role | Primary Job | Must Be Able To |
|---|---|---|
| AI Operations Lead | Control production prompt behavior across agents and tenants. | View status, risk, approvals, deployments, failures, rollback options, and drift signals. |
| Prompt Engineer | Design and improve governed prompt versions. | Create drafts, compare versions, run test suites, submit for review, and inspect runtime traces. |
| Compliance Reviewer | Prevent unlawful, unsafe, or unsupported outputs. | Review risk classification, policy mappings, claim controls, approval evidence, and escalation rules. |
| Brand Reviewer | Protect brand voice and market positioning. | Review tone, claims, terminology, prohibited phrases, localized expressions, and channel-specific constraints. |
| Security Admin | Protect tool access and data boundaries. | Approve tool-use instructions, check sensitive-data handling, restrict deployment rights, and review abuse-risk flags. |
| Engineering Support | Diagnose execution defects. | Inspect prompt identifiers, environment versions, routing rules, evaluation failures, logs, and rollback history. |

---

## 4. Information Architecture and Page Structure

> **Required Page Layout**
> The interface must prioritize fast status recognition, clear ownership, visible risk, controlled action, and immediate recovery. The user should never need to guess which prompt is active, who approved it, what it affects, or how to roll it back.

| Zone | Required Components | Implementation Notes |
|---|---|---|
| A. Header command bar | Page title, environment selector, tenant/brand scope, search, create prompt, import prompt, audit export. | Environment selector must clearly distinguish Draft, Staging, Production, and Archived. |
| B. Health summary strip | Total prompts, production prompts, drafts pending review, blocked prompts, failed tests, prompts with drift warnings. | Clickable metrics must filter the table. |
| C. Prompt registry table | Prompt name, type, owner, linked agent, linked workflow, risk tier, status, active version, last test, last approval, last deployed, actions. | Default sort: highest-risk and most urgent items first. |
| D. Filter rail | Status, risk tier, agent, workflow, brand, locale, channel, owner, approval state, test state, deployment state. | Filters must be combinable and reversible. |
| E. Prompt detail drawer/page | Overview, prompt body, variables, rules, tools, knowledge sources, tests, approvals, deployments, evidence, history. | Use a drawer for quick review and a full page for editing or formal review. |
| F. Compare and diff view | Side-by-side version diff, added/removed instructions, variable changes, policy changes, routing changes. | Must highlight risk-impacting changes separately from normal text edits. |
| G. Deployment controls | Deploy to staging, request production approval, deploy production, rollback, retire, clone, archive. | Production deployment must be gated by permissions and approval state. |

---

## 5. Core Functionality Requirements

| Functionality | What Must Be Implemented | Priority |
|---|---|---|
| Prompt creation | Create prompts from scratch, template, clone, import, or workflow-node requirement. | Required |
| Prompt classification | Classify by type, risk tier, agent, workflow, channel, locale, brand, model family, and tool access. | Required |
| Variable management | Define variables, allowed values, validation rules, fallback behavior, and examples. | Required |
| Guardrail attachment | Attach policy rules, prohibited instructions, claim rules, safety blocks, escalation triggers, and refusal rules. | Required |
| Knowledge binding | Assign approved knowledge bases, retrieval mode, source priority, citation requirement, freshness requirement, and restricted source exclusions. | Required |
| Tool-use permissions | Declare tools the prompt may call and conditions under which each tool may be used. | Required |
| Test suite | Run deterministic and scenario-based tests before approval. | Required |
| Review workflow | Submit, assign, approve, reject, request changes, waive with justification where policy allows. | Required |
| Deployment | Promote approved versions across draft, staging, pilot, production, and archive states. | Required |
| Rollback | Restore last known good version and capture incident reason. | Required |
| Runtime monitoring | Track performance, violations, drift, override rates, escalation rates, and user feedback. | Required |
| Evidence export | Export prompt package, approval chain, test results, runtime incidents, version diffs, and deployment records. | Required |

---

## 6. Prompt Lifecycle States and Control Logic

| Lifecycle State | Entry Condition | Allowed Actions | Exit Condition |
|---|---|---|---|
| **Draft** | New prompt created or cloned. | Edit, assign owner, add variables, bind knowledge, attach tests, delete if never submitted. | Submit for internal test or archive. |
| **Internal Test** | Draft marked ready for testing. | Run tests, edit if failed, view traces, generate test report. | Pass required test suite or return to draft. |
| **Review Requested** | Prompt passed required pre-review tests. | Reviewer comments, approve, reject, request changes. | All required approvals completed or prompt returned. |
| **Approved for Staging** | Approval chain complete for non-production environment. | Deploy to staging, run workflow simulation, compare outputs. | Pass staging simulation and request production deployment. |
| **Production Pending** | Production deployment requested. | Final review, schedule deployment, cancel request. | Deploy, reject, or return to staging. |
| **Production Active** | Version is live for defined scope. | Monitor, pause, rollback, create new version, export evidence. | Replaced, rolled back, paused, or retired. |
| **Paused** | Production version temporarily disabled. | Investigate, resume, rollback, create incident record. | Resume or rollback. |
| **Retired** | Prompt intentionally removed from production use. | View, clone, export evidence. | Archive or clone into new draft. |
| **Archived** | Inactive historical record preserved. | View and export only. | No production reactivation; must clone to draft. |

> **Control Rule**
> Archived and retired prompts must remain immutable. A previously retired prompt may not be reactivated directly; it must be cloned into a new draft so the approval and evidence chain remains clean.

---

## 7. Governance Rules and Approval Model

| Risk Tier | Examples | Minimum Controls | Approval Requirement |
|---|---|---|---|
| **Tier 1 — Low** | Formatting prompts, internal summary prompts, non-public helper prompts. | Owner, basic tests, version log. | Prompt owner approval. |
| **Tier 2 — Medium** | Brand copy prompts, channel captions, customer-facing drafts with human review. | Brand rules, source restrictions, hallucination tests, tone tests. | Owner + brand reviewer. |
| **Tier 3 — High** | Compliance-sensitive claims, paid advertising prompts, regulated-industry messaging, tool-use prompts. | Policy mapping, compliance tests, tool constraints, staging simulation. | Owner + brand + compliance reviewer. |
| **Tier 4 — Critical** | Autonomous publishing, crisis response, legal-sensitive content, external-facing agent actions. | Three-key approval, incident rollback, enhanced evidence, production change window. | Owner + compliance + security or executive approver. |

### Approval Governance Rules

- Approval requirements must be computed from **risk tier, channel, tool access, public visibility, regulated-claim exposure, and autonomous-action level**.
- Users may **not approve their own prompt** for production when the risk tier requires independent review.
- Every rejection must include a **reason category and actionable notes**.
- Every override must capture **approver, reason, policy basis, expiration, and affected scope**.
- Approval status must be **invalidated** when risk-impacting sections are changed after approval.

---

## 8. Runtime Enforcement and Model Routing

| Runtime Requirement | Implementation Detail |
|---|---|
| Approved-version lock | Runtime agents may only load production-active prompt versions for their assigned scope. Draft and staging prompts must not be callable by production agents. |
| Scope matching | Prompt selection must check tenant, workspace, brand, agent, workflow node, channel, locale, risk tier, model route, and effective date. |
| Model routing | Prompt may specify allowed model families, fallback models, refusal models, summarization models, or evaluator models. Unsupported routing must fail closed. |
| Tool gating | Tool instructions must be enforced at runtime by policy, not merely by text inside the prompt. |
| Knowledge retrieval | If retrieval is mandatory, the agent must not produce final output when approved sources are unavailable unless fallback rules explicitly permit escalation. |
| Runtime policy check | Generated output must pass policy, brand, claim, and safety checks before release or before handoff to a workflow approval node. |
| Kill switch | Admins must be able to pause a prompt version immediately across its affected scope. |
| Rollback | Rollback must restore a prior approved production version and record the incident, user, timestamp, reason, and affected executions. |

---

## 9. Testing, Evaluation, and Quality Gates

| Test Category | Required Tests | Pass Condition |
|---|---|---|
| Instruction adherence | Follows output format, role boundaries, variable rules, escalation rules, refusal rules. | No critical failure; no more than allowed minor format variance. |
| Safety and policy | Blocks prohibited claims, offensive content, unsafe advice, unauthorized commitments, restricted topics. | Zero critical violations. |
| Brand and tone | Uses approved vocabulary, avoids banned terms, matches channel style, avoids generic AI language. | Meets brand score threshold. |
| Grounding and citations | Uses approved sources, cites where required, avoids unsupported claims. | All material claims trace to approved source or are flagged for human review. |
| Tool-use behavior | Calls permitted tools only under correct conditions; does not fabricate tool results. | Zero unauthorized tool calls. |
| Localization | Respects region, language, cultural sensitivity, channel limits, and legal disclaimers. | Locale reviewer or automated suite passes required checks. |
| Regression | Compares current output to previous approved version across golden scenarios. | No unacceptable deterioration. |
| Adversarial | Tests jailbreaks, prompt injection, policy bypasses, hidden instructions, conflicting source content. | Zero high-risk bypasses. |

> **Testing Principle**
> A prompt cannot be approved because it looks good in a single sample. It must pass a defined test suite with stored inputs, outputs, evaluator scores, reviewer notes, and reproducible run metadata.

---

## 10. Evidence, Audit, and Version History

| Evidence Object | Must Capture |
|---|---|
| Prompt version record | Prompt ID, version number, author, created date, change summary, full prompt body hash, variables, linked rules, linked knowledge, linked tools. |
| Diff record | Text changes, variable changes, risk changes, approval changes, routing changes, tool-use changes, knowledge-source changes. |
| Test evidence | Test suite version, inputs, outputs, evaluator model, scores, pass/fail, reviewer notes, run timestamp, environment. |
| Approval evidence | Approver identity, role, approval decision, timestamp, comments, conditions, waiver reason, expiration where applicable. |
| Deployment evidence | Environment, scope, deployed by, deployed at, deployment window, release note, impacted agents/workflows. |
| Runtime evidence | Prompt version used, model used, tools called, knowledge retrieved, policy checks, output status, escalation or block reason. |
| Incident evidence | Trigger, detected by, affected version, affected scope, rollback decision, resolution owner, post-incident note. |

### Evidence Integrity Rules

- Version numbers must be **sequential and immutable** after deployment.
- Prompt body hashes must be stored so exported evidence can **prove the exact instruction set used**.
- Evidence export must be available by **prompt, agent, workflow, date range, incident, reviewer, tenant, brand, and deployment environment**.
- Audit records must be **append-only** and must not be editable through the UI.

---

## 11. Knowledge Base and Workflow Dependencies

| Dependency | Prompt Governance Requirement |
|---|---|
| Workflow node binding | Each prompt used in a workflow must show workflow name, node name, execution trigger, required input, expected output, and fallback behavior. |
| Knowledge source binding | Each prompt must define allowed knowledge base, collection, document type, freshness threshold, citation rule, and restricted source exclusions. |
| Agent binding | Each prompt must show which agent can use it, the agent role, allowed autonomy level, and human review requirement. |
| Policy binding | Each prompt must link to applicable rules in Policy Center and show whether rule changes require retesting. |
| Approval workflow binding | Prompt risk tier must determine the review sequence and required approvers. |
| Evidence Vault binding | Every lifecycle event must create an evidence object with a traceable ID. |

---

## 12. UX, Interaction, and Empty-State Requirements

| Interaction Area | Required UX Behavior |
|---|---|
| Create prompt | Offer five starting paths: blank prompt, template, clone, import, or create from workflow node. Ask only for required setup fields first. |
| Registry scan | Show status, owner, risk, test result, approval status, linked agent, linked workflow, active version, and deployment state without opening the record. |
| Prompt editor | Separate instruction body, variables, guardrails, knowledge, tools, tests, approvals, and deployment into clear tabs. |
| Risk indicators | Use direct status language: Draft, Failed Tests, Review Required, Approved for Staging, Production Active, Paused, Rollback Available. |
| Inline validation | Flag missing owner, missing risk tier, untested variables, unapproved tools, unavailable knowledge, and approval conflicts before submit. |
| Diff review | Highlight risk-impacting edits and require a change summary before review submission. |
| Empty state | Explain what Prompt Governance does, provide create prompt, import existing prompts, and view implementation guide actions. |
| Error state | Explain the block reason and recovery path: missing permission, failed tests, expired approval, unavailable knowledge, conflicting workflow binding. |
| Confirmation state | After deployment, show deployed version, scope, affected agents, rollback option, and evidence link. |

---

## 13. Data Model and Engineering Objects

| Object | Key Fields |
|---|---|
| `Prompt` | `id`, `tenant_id`, `name`, `description`, `prompt_type`, `owner_id`, `risk_tier`, `status`, `current_version_id`, `created_at`, `updated_at` |
| `PromptVersion` | `id`, `prompt_id`, `version_number`, `body`, `body_hash`, `variables_json`, `guardrails_json`, `model_routes_json`, `created_by`, `change_summary`, `immutable_after` |
| `PromptBinding` | `id`, `prompt_version_id`, `agent_id`, `workflow_id`, `workflow_node_id`, `channel_id`, `brand_id`, `locale`, `environment`, `effective_from`, `effective_to` |
| `PromptKnowledgeBinding` | `id`, `prompt_version_id`, `kb_id`, `collection_id`, `retrieval_mode`, `freshness_rule`, `citation_required`, `source_priority`, `restricted_sources` |
| `PromptToolPermission` | `id`, `prompt_version_id`, `tool_id`, `allowed_actions`, `conditions_json`, `approval_required`, `runtime_policy_id` |
| `PromptTestSuite` | `id`, `prompt_id`, `suite_name`, `suite_version`, `required_for_risk_tier`, `scenario_count`, `evaluator_config` |
| `PromptTestRun` | `id`, `prompt_version_id`, `suite_id`, `environment`, `pass_fail`, `score_summary`, `run_metadata`, `output_artifacts_uri` |
| `PromptApproval` | `id`, `prompt_version_id`, `reviewer_id`, `reviewer_role`, `decision`, `decision_reason`, `conditions`, `timestamp`, `expires_at` |
| `PromptDeployment` | `id`, `prompt_version_id`, `environment`, `scope_json`, `deployed_by`, `deployed_at`, `release_note`, `rollback_to_version_id` |
| `PromptRuntimeTrace` | `id`, `execution_id`, `prompt_version_id`, `model_id`, `input_hash`, `output_hash`, `policy_result`, `tool_calls`, `kb_sources`, `created_at` |

---

## 14. API, Event, and Integration Requirements

### REST API Endpoints

| Endpoint | Requirement |
|---|---|
| `GET /prompts` | Return filtered prompt registry with status, risk, owner, linked agent, workflow, last test, approval, and deployment summary. |
| `POST /prompts` | Create new prompt shell with required owner, name, prompt type, and risk tier. |
| `POST /prompts/{id}/versions` | Create a new draft version from blank, clone, import, or workflow node. |
| `POST /prompt-versions/{id}/test-runs` | Run selected test suite and return evidence ID. |
| `POST /prompt-versions/{id}/submit-review` | Submit version into approval workflow based on computed risk. |
| `POST /prompt-versions/{id}/approvals` | Approve, reject, or request changes with reviewer note. |
| `POST /prompt-versions/{id}/deploy` | Deploy approved version to staging, pilot, or production scope. |
| `POST /prompt-deployments/{id}/rollback` | Rollback to last known good approved version. |

### System Events

| Event | Trigger |
|---|---|
| `prompt.version.created` | Emitted when a new version is created. |
| `prompt.test.failed` | Emitted when required tests fail. |
| `prompt.approval.completed` | Emitted when all approvals are complete. |
| `prompt.deployed` | Emitted when a version is deployed to an environment. |
| `prompt.runtime.violation` | Emitted when runtime output violates policy, brand, tool, or knowledge rules. |
| `prompt.rollback.completed` | Emitted when rollback is completed. |

---

## 15. Security, Permissions, and Tenant Isolation

### Permission Matrix

| Permission | Allowed Capability |
|---|---|
| `prompt.view` | View prompt registry and prompt detail. |
| `prompt.create` | Create prompt shell and draft versions. |
| `prompt.edit.own` | Edit draft prompt versions owned by the user. |
| `prompt.edit.any` | Edit draft prompt versions across assigned tenant scope. |
| `prompt.test` | Run prompt tests and view non-sensitive results. |
| `prompt.review.brand` | Approve or reject brand review stage. |
| `prompt.review.compliance` | Approve or reject compliance review stage. |
| `prompt.review.security` | Approve or reject security/tool-use review stage. |
| `prompt.deploy.staging` | Deploy approved prompt to staging. |
| `prompt.deploy.production` | Deploy approved prompt to production. |
| `prompt.rollback` | Rollback production prompt to approved prior version. |
| `prompt.export.evidence` | Export prompt evidence packages. |
| `prompt.admin.override` | Apply controlled waivers, emergency pause, and permission escalation. |

### Security Enforcement Rules

- Tenant isolation must be enforced at **database query, object storage, event stream, evidence export, and runtime retrieval** layers.
- Users must only see prompts within their **authorized tenant, workspace, brand, and environment scope**.
- Production deployment and rollback actions require **step-up confirmation and event logging**.
- Secrets, tool credentials, model provider keys, and private data must **never be stored inside prompt text**.

---

## 16. Notifications, SLAs, and Operational Escalation

| Trigger | Notification Target | Expected Action |
|---|---|---|
| Prompt submitted for review | Required reviewers | Approve, reject, or request changes. |
| Test failed | Prompt owner and AI operations lead | Fix prompt, update variables, or adjust test only with approved justification. |
| Approval overdue | Reviewer, owner, AI operations lead | Complete review or reassign. |
| Production deployment completed | Owner, linked agent owner, linked workflow owner | Verify post-deployment telemetry. |
| Runtime violation detected | AI operations lead, compliance reviewer for high risk | Pause, investigate, rollback, or create incident. |
| Knowledge source unavailable | Prompt owner, knowledge owner, workflow owner | Repair source, enable fallback, or pause affected prompt. |
| Drift warning | Prompt owner, AI operations lead | Run regression suite and decide whether to revise prompt. |
| Emergency pause activated | Admin, owner, compliance, affected workflow owner | Confirm affected scope and recovery path. |

---

## 17. Analytics, Metrics, and Admin Reporting

| Metric | Definition | Why It Matters |
|---|---|---|
| Production prompt count | Number of active production prompt versions. | Shows operational footprint. |
| Prompt approval cycle time | Average time from submission to approval. | Identifies review bottlenecks. |
| Test failure rate | Percentage of prompt versions failing required suites. | Shows quality and readiness. |
| Runtime violation rate | Violations per 1,000 prompt executions. | Shows policy and safety risk. |
| Rollback rate | Rollbacks per deployment period. | Shows deployment quality. |
| Drift warning count | Prompts flagged for performance or behavior drift. | Shows maintenance burden. |
| Knowledge unavailable rate | Executions blocked or degraded because approved sources were unavailable. | Shows dependency reliability. |
| Unauthorized tool-call block count | Tool calls blocked by runtime policy. | Shows tool-use risk and prompt injection exposure. |
| Human escalation rate | Executions routed to human review. | Shows prompt clarity and autonomy suitability. |

---

## 18. QA Scenarios and Acceptance Criteria

| Scenario | Acceptance Criteria |
|---|---|
| Create a low-risk draft prompt | User can create, save, edit, test, submit, approve, and deploy to staging without unnecessary fields. |
| Create a high-risk tool-use prompt | System requires tool permissions, security review, compliance review, required tests, and production deployment approval. |
| Edit approved prompt before deployment | Approval status is invalidated when risk-impacting fields change. |
| Deploy production version | Only authorized user can deploy; deployment creates evidence record and active version lock. |
| Rollback production version | System restores previous approved version, records reason, emits event, and shows confirmation. |
| Runtime uses prompt | Runtime trace captures prompt version, model, knowledge sources, tool calls, policy result, and output status. |
| Knowledge source unavailable | Prompt follows fallback rule: block, escalate, or continue only if allowed. |
| Prompt injection attempt | Tool-use and knowledge rules prevent unauthorized instruction override. |
| Cross-tenant access attempt | User cannot view, bind, export, deploy, or trace prompts outside authorized tenant scope. |
| Evidence export | Export package includes prompt version, diff, approvals, tests, deployment, and runtime evidence. |

---

## 19. Implementation Phasing

| Phase | Build Scope | Exit Criteria |
|---|---|---|
| **Phase 1 — Registry and Drafting** | Prompt registry, create prompt, draft editor, variables, owner, risk tier, status, basic filters. | Users can create and manage draft prompts with required metadata. |
| **Phase 2 — Testing and Review** | Test suite runner, test evidence, approval workflow, reviewer comments, status transitions. | Required risk-tier approvals and tests gate staging deployment. |
| **Phase 3 — Binding and Deployment** | Agent, workflow, knowledge, tool, channel, brand, locale, and environment bindings; staging and production deployment. | Runtime can load approved active prompt version by scope. |
| **Phase 4 — Runtime Evidence and Rollback** | Runtime traces, evidence export, incident records, pause, rollback, deployment confirmation. | Production prompt incidents can be traced and remediated. |
| **Phase 5 — Advanced Governance** | Drift monitoring, adversarial testing, policy simulation, prompt scorecards, executive dashboard metrics. | Governance team can monitor prompt quality at scale. |

---

## 20. Final Engineering Handoff Checklist

| Area | Completion Requirement |
|---|---|
| Product | Prompt Governance is implemented as lifecycle infrastructure, not a prompt library. |
| UX | Registry, filters, detail, editor, diff, test, review, deployment, evidence, and rollback states are clear and action-oriented. |
| Governance | Risk tiers, approval chains, policy bindings, waiver controls, and override logs are enforced. |
| Runtime | Only approved production-active prompt versions can be executed by production agents. |
| Evidence | Every lifecycle and runtime event creates immutable audit evidence. |
| Security | Tenant isolation, RBAC, tool permissions, and secret-handling restrictions are enforced. |
| Testing | All required test suites, regression checks, adversarial tests, and acceptance scenarios are implemented. |
| Integrations | Agent Studio, Workflows, Knowledge Base, Policy Center, Evidence Vault, and Agent Operations dependencies are implemented. |
| Operations | Notifications, drift warnings, incident escalation, emergency pause, and rollback are implemented. |
| QA | Acceptance criteria are passed across low-risk, high-risk, production, rollback, and cross-tenant scenarios. |

> **Final Build Standard**
> This page is complete only when ZoikoVertex can prove which prompt was used, who approved it, what it was allowed to access, which tests it passed, where it was deployed, what it produced, what controls checked it, and how the organization can pause or roll it back immediately.

---

## Appendix A — Engineer Format: Page Functionality and Implementation Items

> **Purpose**
> This appendix mirrors the implementation format requested by the AI solutions engineer. It can be copied into the engineering task system without rewriting.

| Page Area | What Functionality the Page Should Consist Of | What Needs to Be Implemented |
|---|---|---|
| Prompt Governance | Create, edit, classify, test, approve, deploy, pause, rollback, archive, and export governed prompts. | Prompt registry, detail view, editor, lifecycle states, risk tiers, approval workflow, test runner, deployment controls, evidence export. |
| Agent Studio linkage | Bind prompt versions to specific agent identities, agent roles, capabilities, and autonomy levels. | Agent selector, agent compatibility validation, autonomy-level checks, production binding controls. |
| Agent Operations linkage | Show active prompt version used by live agents and allow incident-driven pause or rollback. | Runtime prompt lookup, execution trace link, violation event ingestion, pause/rollback actions. |
| Workflows linkage | Attach prompts to workflow nodes and define execution triggers, inputs, outputs, and fallback actions. | Workflow-node selector, input/output schema validation, node-level prompt binding, fallback rules. |
| Knowledge Base linkage | Restrict prompts to approved knowledge sources and define retrieval mode, freshness, and citation rules. | Knowledge source selector, retrieval mode field, freshness validation, citation enforcement, source unavailability handling. |
| Prompt body editor | Write and maintain prompt instructions without mixing metadata, variables, and governance controls into one free-text field. | Structured editor tabs: instructions, variables, guardrails, tools, knowledge, tests, approvals, deployments. |
| Offensive words and policy checks | Detect offensive words, unsafe instructions, restricted claims, banned terms, and channel-specific policy issues. | Pre-submit scanner, policy rule engine integration, severity labels, remediation notes, block/escalate actions. |
| Testing | Run prompt quality, policy, brand, grounding, tool-use, localization, regression, and adversarial tests. | Test suites, evaluator configuration, golden scenarios, test evidence records, pass/fail gates. |
| Approvals | Route prompt versions to the correct reviewers based on risk, channel, tool access, and production impact. | Risk-based approval matrix, reviewer assignment, decision notes, rejection workflow, waiver controls. |
| Deployment | Move approved prompt versions from draft to staging, pilot, production, paused, retired, or archived states. | Environment controls, deployment scope, active version lock, release note, deployment event. |
| Evidence | Prove every prompt decision, change, test, approval, deployment, runtime execution, and rollback. | Evidence Vault integration, immutable records, hash storage, export package, audit filters. |

---

*Confidential — Product, UX, Governance, Runtime, Evidence, and Engineering Handoff*