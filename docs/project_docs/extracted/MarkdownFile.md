**ZoikoVertex Safety Layer**

**Document 03 - Policy Control Matrix & Guardrail Enforcement Engine**

Detailed Wireframe and Engineering Build Specification

| Field | Locked Build Direction |
| --- | --- |
| Sequence Position | Safety Layer Document 03, immediately after Document 02 - Risk Intake & Classification Engine |
| Primary Purpose | Translate classified risk signals into visible policy controls, executable guardrails, escalation rules, and safe-action outcomes before any agent, workflow, or publishing surface can proceed. |
| Audience | Product, engineering, UX, QA, security, compliance, legal, and implementation teams. |
| Design Standard | Fortune 10 quality; Tier-0 governance; tactile engineering specification; no abstract filler. |

**Critical refinement applied:** This document is not a generic policy page. It is the Safety Layer control plane that binds risk classifications to enforceable UI states, backend rules, approval paths, agent permissions, evidence requirements, and release-blocking decisions. The engineering team must treat it as a deterministic execution surface, not merely a compliance reference screen.

# 1\. Page Mission

The Policy Control Matrix & Guardrail Enforcement Engine is the operational center where ZoikoVertex converts safety rules into executable controls. It must show which policy is active, which risk category triggered it, what the system will allow, warn, block, escalate, or quarantine, and what evidence must be retained for later audit.

*   Make every safety decision traceable from intake signal to policy rule to guardrail action.
*   Give authorized administrators a tactile way to inspect, simulate, approve, version, and deploy safety controls.
*   Prevent agents from bypassing brand, legal, regulatory, platform, and executive restrictions.
*   Expose enough operational detail for engineers, auditors, and enterprise buyers without overwhelming non-technical users.

# 2\. Position in the Safety Layer Sequence

| Step | Document | System Role | Status |
| --- | --- | --- | --- |
| 01 | Safety Layer Overview | Defines the Safety Layer operating doctrine, navigation, core surfaces, and global control model. | Completed |
| 02 | Risk Intake & Classification Engine | Captures, normalizes, scores, and classifies risk signals before control enforcement. | Completed |
| 03 | Policy Control Matrix & Guardrail Enforcement Engine | Maps classified risks to enforceable controls and visible agent constraints. | This document |
| 04 | Human Review, Escalation & Override Console | Routes blocked, high-risk, or exception cases to accountable human decision-makers. | Next |
| 05 | Evidence, Audit & Forensic Review Hub | Packages safety decisions, policy versions, user actions, approvals, and output evidence. | Later |

# 3\. Primary User Roles and Access Rules

| Role | Allowed Actions | Restrictions |
| --- | --- | --- |
| Super Admin | Create, clone, edit, retire, simulate, approve, and deploy policy rules across tenants, workspaces, brands, and jurisdictions. | Cannot delete published policy history or audit records. |
| Safety Officer | Review policy conflicts, validate guardrail behavior, recommend policy changes, approve selected deployment scopes. | Cannot override legal hold, sanctions, regulated-claim blocks, or executive emergency pause. |
| Legal / Compliance Reviewer | Inspect rule rationale, evidence obligations, jurisdictional applicability, and escalation requirements. | Cannot alter runtime agent permissions without delegated admin authority. |
| Brand Governance Lead | Review brand-voice, cultural-sensitivity, claims, tone, and asset usage controls. | Cannot approve legal, financial, medical, or regulated statements alone. |
| Engineer / QA | Run simulations, inspect payload mapping, validate API states, and test expected UI behavior. | Cannot publish live policy changes unless granted deployment authority. |
| Agent Operator | View policy reason codes and corrective guidance when an action is restricted. | Cannot modify policy rules or suppress guardrail enforcement. |

# 4\. Required Page Architecture

| Zone | Component | Purpose | Engineering Notes |
| --- | --- | --- | --- |
| A | Safety Header | Shows page title, policy deployment status, tenant, workspace, environment, last policy version, and emergency status. | Must read from policy_version_service and emergency_pause_state. |
| B | Control Summary Strip | Displays active rules, high-risk rules, pending approvals, conflicts, blocked actions today, and simulation failures. | Cards are clickable filters; numbers must not be decorative. |
| C | Policy Control Matrix | Main table mapping risk category, policy rule, severity, action type, impacted agent permissions, escalation path, and evidence obligation. | Server-side pagination, filters, column pinning, CSV export for authorized roles only. |
| D | Guardrail Builder Drawer | Create or edit rule using structured fields: trigger, condition, threshold, action, escalation, evidence, scope, effective date. | No freeform-only rules. Natural language can assist, but stored rule must be structured. |
| E | Policy Simulation Panel | Tests a proposed or existing rule against sample content, live risk events, and historical cases. | Simulation must produce pass, warn, block, escalate, quarantine, or conflict. |
| F | Conflict & Dependency Panel | Shows rule overlaps, hierarchy conflicts, missing approvers, outdated jurisdictions, and contradictory actions. | Must block deployment when critical conflicts exist. |
| G | Deployment Footer | Shows save draft, submit for approval, deploy, rollback, retire, and view audit trail. | Deployment actions must require role permission plus version comment. |

# 5\. Above-the-Fold Wireframe

| Element | Exact UX Requirement | Acceptance Criteria |
| --- | --- | --- |
| Page Title | Policy Control Matrix & Guardrail Enforcement | Title visible at top-left; no vague title such as Settings or Rules. |
| Status Badge | Active Version: vX.X | Environment: Production/Sandbox | Last Deployed By | Timestamp | Badge updates from backend; timestamp uses tenant timezone. |
| Emergency Indicator | Displays Normal, Restricted Operations, or Emergency Pause | If Emergency Pause is active, all deploy and edit actions are visually secondary to the emergency state. |
| Primary CTA | Create Guardrail Rule | Visible only for authorized users; opens structured builder drawer. |
| Secondary CTA | Run Simulation | Available for authorized product, QA, safety, and legal users. |
| Tertiary CTA | View Audit Trail | Deep-links to evidence hub filtered by policy version and page context. |

# 6\. Control Summary Strip

| Card | Metric | Click Behavior | Engineering Source |
| --- | --- | --- | --- |
| Active Controls | Number of currently active guardrail rules | Filters matrix to status=active | policy_rules.status |
| Blocked Today | Actions blocked in last 24 hours | Opens events filtered to action=block | safety_event_log |
| Escalations Pending | Cases waiting for human review | Routes to escalation queue | review_case_service |
| Policy Conflicts | Critical, major, minor conflicts | Opens conflict panel | policy_conflict_service |
| Simulation Failures | Rules failing test cases | Filters simulation panel to failures | simulation_result_store |
| Draft Changes | Unpublished changes | Filters matrix to status=draft | policy_version_service |

# 7\. Policy Control Matrix - Required Columns

| Column | Definition | Required Behavior |
| --- | --- | --- |
| Rule ID | Immutable identifier for the policy rule. | Clickable; opens rule detail drawer. |
| Policy Domain | Brand, Legal, Regulatory, Platform, Security, Executive, Jurisdiction, Customer Contract, or Cultural Safety. | Filterable multi-select. |
| Risk Category | Risk class from Document 02 intake classification. | Must reference canonical taxonomy, not free text. |
| Severity | Low, Medium, High, Critical, Restricted. | Color badge allowed; text must remain visible for accessibility. |
| Trigger Condition | Structured condition that activates the rule. | Human-readable summary plus technical condition view. |
| Enforcement Action | Allow, Warn, Require Review, Block, Quarantine, Redact, Escalate, Pause Agent, Pause Workflow. | Must map to runtime action enum. |
| Agent Impact | Which agent roles, permissions, workflows, or channels are constrained. | Shows affected agents and action scope. |
| Evidence Required | What must be captured when the rule fires. | Links to evidence schema. |
| Escalation Path | Who must review when action requires human decision. | Must show SLA and fallback owner. |
| Status | Draft, Pending Approval, Active, Retired, Superseded, Rollback Active. | Status is system-controlled after deployment. |
| Version | Published version and effective date. | Version history must be immutable. |

# 8\. Guardrail Builder Drawer

The builder must be tactile. Engineers must not create a blank text box pretending to be a rule engine. Every deployed guardrail must be stored as structured policy logic with human-readable explanations layered above it.

| Step | Fields | Validation Rule |
| --- | --- | --- |
| 1. Scope | Tenant, workspace, brand, product, channel, jurisdiction, customer segment, agent type. | At least one scope dimension required; production-wide rules require elevated approval. |
| 2. Trigger | Risk category, keyword/semantic class, claim type, asset type, workflow state, external platform, audience, confidence threshold. | Must map to normalized risk taxonomy and signal schema. |
| 3. Condition | IF / AND / OR blocks with threshold, duration, count, confidence, or jurisdiction rule. | Nested logic allowed; circular logic prohibited. |
| 4. Action | Allow, warn, require review, block, quarantine, redact, escalate, pause agent, pause workflow. | Critical rules cannot use allow-only action. |
| 5. Rationale | Plain-English reason, business risk, legal/compliance basis, owner, review cadence. | Required before submission. |
| 6. Evidence | Event snapshot, prompt, model output, source content, policy version, actor, timestamp, decision path. | Evidence schema required for every warn/block/escalate/quarantine. |
| 7. Approval | Approver group, minimum approvals, separation-of-duties rule, expiry, fallback owner. | Rules affecting regulated output require legal/compliance approval. |
| 8. Deployment | Sandbox, limited rollout, production, scheduled effective date, rollback plan. | Production deployment requires successful simulation or documented exception. |

# 9\. Policy Simulation Panel

| Simulation Type | Purpose | Output Required |
| --- | --- | --- |
| Sample Payload Test | Run a proposed rule against manually entered or uploaded content. | Decision result, matched condition, confidence score, action, evidence preview. |
| Historical Replay | Replay previous safety events against the new rule. | Count of would-allow, would-warn, would-block, would-escalate, false-positive candidates. |
| Agent Workflow Test | Check whether an agent workflow can proceed under the rule. | Allowed steps, blocked steps, escalation requirement, affected permissions. |
| Jurisdiction Test | Validate whether the rule behaves differently by market or regulatory zone. | Country/state output, legal basis tag, policy pack reference. |
| Conflict Test | Detect contradictions with active rules. | Conflict severity, affected rule IDs, recommended resolution. |

# 10\. Enforcement Decision States

| State | Meaning | UI Treatment | Runtime Behavior |
| --- | --- | --- | --- |
| Allow | No active restriction triggered. | Neutral status with policy trace available. | Agent continues. Event logged only if configured. |
| Warn | Risk present but not release-blocking. | Yellow warning with reason and suggested correction. | Agent may proceed only if workflow allows warning acknowledgement. |
| Require Review | Human approval required before action can continue. | Case creation modal with reviewer group and SLA. | Workflow pauses until decision. |
| Block | Action cannot proceed under current policy. | Red block state with reason code and remediation path. | Agent action denied; evidence captured. |
| Quarantine | Output, asset, or workflow is isolated for review. | Quarantine banner with restricted access indicator. | Item removed from publish/action queue. |
| Redact | Sensitive or prohibited portion removed before continuation. | Before/after diff with redaction reason. | Sanitized payload forwarded; original preserved in evidence vault. |
| Escalate | Higher authority required due to severity or conflict. | Escalation path shown with accountable owner. | Case routed; SLA timer starts. |
| Pause Agent / Workflow | Agent or workflow is temporarily suspended. | Restricted Operations badge. | Runtime permission revoked until cleared. |

# 11\. Backend Contract

| Service / Object | Required Data | Non-Negotiable Rule |
| --- | --- | --- |
| policy_rules | rule_id, version_id, domain, scope, trigger, condition, action, evidence_schema, owner, status. | No rule can be active without version, owner, scope, action, and evidence mapping. |
| policy_versions | version_id, changelog, approvers, deployment_state, effective_at, rollback_target. | Published versions are immutable. |
| risk_taxonomy | risk_category, severity, signal_source, confidence bands. | Must align with Document 02. |
| enforcement_events | event_id, rule_id, actor, agent_id, input_ref, output_ref, decision, timestamp, reason_code. | Every warn, block, escalate, quarantine, redact, and pause must create an event. |
| approval_policy | required_approvers, separation_of_duties, approval_sla, fallback_owner. | Author cannot be sole approver for high-risk production rules. |
| simulation_results | simulation_id, payload, rule_set, outcome, conflicts, false_positive_flags. | Simulation results attach to approval package. |
| audit_log | actor, action, before, after, IP/device metadata where permitted, timestamp. | No destructive deletion. Retention follows enterprise policy. |

# 12\. API and Event Requirements

| Endpoint / Event | Purpose | Expected Result |
| --- | --- | --- |
| GET /safety/policies | List policy rules with filters and pagination. | Returns scoped rules and permission-aware fields. |
| POST /safety/policies/draft | Create draft structured guardrail rule. | Returns rule_id and validation state. |
| POST /safety/policies/{id}/simulate | Run simulation against payload or replay set. | Returns decision, matched clauses, conflicts, evidence preview. |
| POST /safety/policies/{id}/submit | Submit draft for approval. | Creates approval package and locks deploy fields. |
| POST /safety/policies/{id}/deploy | Deploy approved version. | Activates rule and emits policy.deployed event. |
| POST /safety/policies/{id}/rollback | Rollback to prior version. | Activates rollback version and emits policy.rollback event. |
| policy.enforcement.triggered | Runtime event when a guardrail fires. | Creates safety event, updates dashboard, and routes workflow action. |
| policy.conflict.detected | Event when rules contradict or overlap materially. | Blocks deployment if critical. |

# 13\. Empty, Error, and Edge States

| State | Required UX | Engineering Requirement |
| --- | --- | --- |
| No Rules Configured | Show onboarding panel with Create Guardrail Rule, Import Policy Pack, and Run Sandbox Simulation. | Only visible for new workspace or empty policy domain. |
| No Permission | Show restricted-access message and request-access CTA where enterprise workflow allows. | Never expose hidden rule details through API. |
| Conflict Blocking Deployment | Show exact conflict IDs, severity, and resolution path. | Deployment button disabled until critical conflicts are resolved. |
| Simulation Timeout | Show timeout state with retry and diagnostic code. | Do not mark simulation as passed. |
| Stale Policy Version | Show warning if current UI is behind active runtime version. | Force refresh before edit or deploy. |
| Emergency Pause Active | Show page-wide banner; restrict deploy/edit actions based on emergency policy. | Runtime state overrides local UI action permissions. |
| Jurisdiction Missing | Show missing jurisdiction mapping warning. | Production deployment blocked for affected scope. |

# 14\. QA Acceptance Checklist

| Area | Acceptance Test |
| --- | --- |
| Sequence Integrity | Document title and internal references clearly identify this as Safety Layer Document 03 after Risk Intake & Classification. |
| Matrix Functionality | Filters, sorting, pagination, status badges, rule drawer, and evidence links work with seeded data. |
| Builder Validation | A user cannot save a production rule without scope, trigger, condition, action, rationale, evidence, owner, and approval rule. |
| Simulation | Each simulation type returns deterministic outputs and stores results against the rule version. |
| Conflict Handling | Critical conflicts block deployment and display exact reason codes. |
| Permissions | Unauthorized users cannot create, edit, deploy, rollback, or view restricted rule details. |
| Auditability | Every draft, edit, submission, approval, deployment, rollback, retirement, and runtime enforcement event is logged. |
| Accessibility | All status colors have text labels; tables support keyboard navigation; drawer focus is trapped; screen-reader labels are present. |
| Performance | Matrix loads within enterprise SLA with 10,000 policy records using server-side pagination. |
| Security | No policy details leak across tenant, workspace, or brand boundaries. |

# 15\. Final Engineering Instruction

Build this page as the enforceable safety control plane. The user interface must be clear enough for a tactile engineering team and governance officers, but the backend must remain deterministic, versioned, auditable, and non-bypassable. No rule should exist only as copy. No warning should exist without a reason code. No block should exist without an evidence trail. No deployment should exist without a version, owner, and approval record.