| ZoikoVertexSAFETY LAYER · DOCUMENT 01Safety Layer OverviewWireframe, Product Doctrine, System Boundaries, and Engineering Build SpecificationPurpose: Provide the first, canonical Safety Layer document for the ZoikoVertex engineering team. This document defines the Safety Layer as a non-bypassable control plane that prevents, detects, contains, escalates, and evidences unsafe agentic social media operations before they create enterprise risk.Status: Final for engineering build alignment · Language: American English · Standard: Fortune 10 / Tier-0 execution© 2026 Zoiko Tech Inc. · Confidential |
| --- |

**§ 00 Document Control**

| Document Name | ZoikoVertex Safety Layer — Document 01: Safety Layer Overview |
| --- | --- |
| Document Type | Wireframe + Engineering Build Specification |
| Layer | Safety Layer |
| Sequence Position | 01 of Safety Layer Component Documents |
| Audience | Engineering, Product, Design, Security, Compliance, QA, and Executive Review |
| Build Status | Final for component-level engineering alignment |
| Important Boundary | This is the first Safety Layer document only. It is not the Evidence Layer, Forensic Hub, Audit Trail, Evidence Vault, or Identity Ledger. |
| SEQUENCE LOCKThis file is Document 01 in the Safety Layer sequence. The engineering team must not build later Safety Layer components from this document alone. Later documents will specify the component-level screens, APIs, states, workflows, and acceptance criteria individually. |

**§ 01 Executive Definition**

The Safety Layer is the non-bypassable runtime control plane for ZoikoVertex. It sits between human users, AI agents, policy rules, approval workflows, publishing channels, integrations, data exports, and escalation systems. Its job is to prevent unsafe actions before execution, detect unsafe patterns during operation, contain active risk, escalate material issues to accountable humans, and write defensible evidence into the platform record.

| TIER-0 DOCTRINENo autonomous or human-triggered action that can affect a brand, regulated communication, external channel, customer data, approval status, or evidence state may execute unless the Safety Layer has evaluated it, classified its risk, applied the relevant guardrails, and recorded the decision outcome. |
| --- |

**§ 02 What the Engineer Must Build First**

Document 01 gives engineering the master surface and architecture spine for the Safety Layer. It defines what the Safety Layer is, where it sits in the platform, what components it owns, how the first overview screen behaves, and what must be true before component-level documents begin.

| Build Area | Purpose | Engineering Output | This Document Covers |
| --- | --- | --- | --- |
| Safety Layer Overview Surface | Give operators one command-level view of safety posture. | Dashboard shell, risk bands, component cards, queues, alerts, drill paths. | Yes |
| Safety Decision Pipeline | Make every risky action pass through intake, classification, guardrail evaluation, action decision, evidence write. | Decision lifecycle model and event contract. | Yes |
| Component Registry | List all Safety Layer components and define sequencing. | Component map and routing rules. | Yes |
| Governance Boundaries | Prevent confusion with Evidence Layer and Forensic Hub. | Clear ownership boundaries and integration points. | Yes |
| Component Deep Dives | Detailed screens for each individual component. | Separate component documents. | No — next documents only |

**§ 03 Safety Layer Component Sequence**

The following sequence is locked so the tactile engineering team can build one component at a time without confusion, overlap, or architecture drift. Document 01 is the overview. Each later document must be approved before the next begins.

| Doc | Component | Engineering Purpose |
| --- | --- | --- |
| 01 | Safety Layer Overview | Master overview screen, control-plane doctrine, component registry, build boundaries. |
| 02 | Risk Intake & Classification Engine | How events, actions, agent proposals, human overrides, and publishing attempts become safety-reviewed objects. |
| 03 | Guardrail Rules Engine | Policy, brand, legal, compliance, channel, and agent guardrails with deterministic enforcement. |
| 04 | Action Decision Gate | Allow, warn, require approval, block, quarantine, or escalate every material action. |
| 05 | Safety Command Center | Live safety queue for operators, reviewers, compliance owners, and executive visibility. |
| 06 | Emergency Pause & Restricted Operations Mode | Tenant, workspace, brand, campaign, channel, agent, and workflow-level containment controls. |
| 07 | Agent Behavior Safety Monitor | Runtime monitoring for agent drift, low confidence, repeated refusal, unsafe tool use, and authority mismatch. |
| 08 | Escalation & Human Accountability Workflows | SLA-based escalation, reviewer assignment, duty owner, executive escalation, and closure control. |
| 09 | Safety Evidence Writer | Safety decisions written into Audit Trail, Evidence Layer integration, and evidence preservation triggers. |
| 10 | Safety Settings & Policy Administration | Admin configuration, thresholds, defaults, role permissions, and tenant-level safety posture. |

**§ 04 Product Doctrine and Operating Laws**

The Safety Layer must be designed as a hard control plane, not as a passive alert system. Alerts inform. The Safety Layer decides, blocks, routes, contains, escalates, and evidences.

| Operating Law | Engineering Interpretation |
| --- | --- |
| Non-bypassable by default | No user, workflow, agent, integration, scheduler, or API may execute a material action outside the Safety Decision Pipeline. |
| Safety before autonomy | Agentic execution is permitted only inside an approved authority envelope; the Safety Layer verifies the envelope at runtime. |
| Evidence by design | Every safety evaluation, guardrail match, override, block, escalation, and containment action emits an auditable event. |
| Human accountability | Material risk must be assigned to a named human owner with SLA, role authority, and action history. |
| Least privilege runtime | Safety permissions must be evaluated server-side. UI controls are convenience only and never the enforcement mechanism. |
| Explainable decisions | Every allow, warn, block, quarantine, escalation, or approval requirement must display the reason and source rule. |
| Tenant isolation | No tenant, workspace, brand, or customer data can influence another tenant’s safety decision unless explicitly configured as a same-tenant hierarchy. |
| Fail safe | If the Safety Layer cannot classify or verify a material action, the default outcome is hold for review, not execution. |

**§ 05 Safety Layer System Boundary**

The Safety Layer is upstream of execution and downstream of intent. It evaluates intent before action, monitors behavior during runtime, and triggers evidence capture after decision. This boundary is essential: the Safety Layer is not the Forensic Hub. The Forensic Hub investigates what happened after risk exists. The Safety Layer reduces the probability, severity, and blast radius of risk before and during execution.

| Platform Area | Safety Layer Role | Owned By Safety Layer? | Integration Rule |
| --- | --- | --- | --- |
| Agent Studio | Checks agent authority envelope, tool permissions, confidence, and policy scope before execution. | Partial | Receives agent proposal; returns decision and constraints. |
| Approval Workflows | Requires approval for decisions above configured risk threshold. | Partial | Safety Layer can force approval or block override. |
| Content & Publishing | Evaluates content risk before schedule, publish, edit, reply, or delete. | Partial | No external channel action without safety decision. |
| Policy Center | Consumes active rules, thresholds, and regulated packs. | No | Policy Center authors rules; Safety Layer enforces them. |
| Evidence Layer | Writes safety events and preservation triggers. | No | Evidence Layer records; Safety Layer emits. |
| Forensic Hub | Receives escalated safety incidents for investigation. | No | Forensic Hub investigates; Safety Layer detects and escalates. |
| Executive Command Center | Receives safety posture metrics and material-risk summaries. | No | Safety Layer feeds dashboards and executive alerts. |

**§ 06 Document 01 Wireframe: Safety Layer Overview**

The first screen is a command-level overview for safety posture. It must let a compliance operator, product owner, or executive viewer understand current safety health in less than 30 seconds and drill into the right component in one click. This is not a marketing dashboard. It is an operational safety control surface.

| GLOBAL SAFETY BAR: Tenant · Workspace · Safety Posture · Active Mode · Critical Queue · Emergency Pause |
| --- |
| PAGE TITLE: Safety Layer Overview | Primary CTA: Review Critical Queue | Secondary: Configure Safety Rules |
| Safety Posture ScoreCurrent normalized posture | Critical HoldsBlocked / quarantined actions | Agent Safety HealthDrift, refusal, low confidence | SLA ExposureBreaches and at-risk items |
| COMPONENT REGISTRYRisk Intake · Guardrail Rules · Decision Gate · Command Center · Emergency Pause · Agent Monitor · Escalation · Evidence Writer · Settings | LIVE SAFETY QUEUECritical · High · Medium · Low · Awaiting Approval · Quarantined · Escalated |
| SAFETY DECISION PIPELINE VISUALIntent Captured → Risk Classified → Guardrails Evaluated → Decision Issued → Human Escalation if Required → Evidence Written → Runtime Monitored |
| TOP RULE HITSBrand claim risk · Regulated language · Channel restriction · Agent authority mismatch | CONTAINMENT & MODESNormal · Elevated Watch · Restricted Operations · Emergency Pause |
| FOOTER STRIP: Last safety evaluation · Active policy version · Evidence chain health · API latency · Data residency · Support escalation |

**Screen Zones and Required Behaviors**

| Zone | UI Element | Purpose | Default Behavior | Drill Path |
| --- | --- | --- | --- | --- |
| A | Global Safety Bar | Persistent status for posture, mode, critical queue, emergency state. | Visible on all Safety Layer screens. | Emergency Pause / Queue |
| B | Posture Cards | Four executive-level status indicators. | Refresh every 60 seconds and on new critical event. | Relevant filtered queue |
| C | Component Registry | Clickable cards for each Safety Layer component. | Shows health, backlog, last failure, owner. | Component detail document |
| D | Live Safety Queue | Operational queue for blocked, held, escalated, or approval-required actions. | Sorted by criticality, SLA, materiality, and recency. | Safety Command Center |
| E | Decision Pipeline | Shows volume and outcomes across the pipeline. | Click each stage to filter by status. | Decision Gate / Evidence Writer |
| F | Top Rule Hits | Shows most frequently triggered rules. | Displays count, severity, trend, impacted brands. | Guardrail Rules Engine |
| G | Containment Modes | Shows active mode and eligible containment actions. | Only authorized roles see action buttons. | Emergency Pause |

**§ 07 Canonical User Roles for Document 01**

The overview must render different action permissions based on role. The screen may show common posture information to many users, but action buttons must be server-authorized and field-level redacted.

| Role | Document 01 Overview Permissions |
| --- | --- |
| Executive Viewer | Sees posture, material risk, active mode, trend, and executive summaries. Cannot change rules or release holds. |
| Safety Operator | Works safety queue, reviews warnings, routes escalations, adds notes, and recommends disposition. |
| Compliance Officer | Approves regulated-risk disposition, reviews policy breaches, applies compliance actions. |
| Legal Counsel | Applies or recommends legal hold, reviews privileged escalation, approves counsel-sensitive exports. |
| Governance Admin | Configures safety thresholds, assigns owners, manages rules, and controls tenant safety posture. |
| Agent Architect | Reviews agent authority mismatch, drift, low confidence, and unsafe tool-use issues. |
| Security Officer | Reviews identity, session, abnormal behavior, integration, and containment triggers. |
| System Admin | Configures integrations and technical settings but cannot bypass safety decisions without governed override. |

**§ 08 Safety Decision Pipeline**

The overview must expose the Safety Decision Pipeline because it is the runtime spine of the layer. The pipeline below is the canonical processing order for material actions.

| Pipeline Stage | Engineering Requirement |
| --- | --- |
| 01 Intent Capture | A user, AI agent, workflow, scheduler, integration, API, or approval override proposes an action. |
| 02 Context Assembly | System gathers tenant, workspace, brand, campaign, channel, content, agent, policy, identity, jurisdiction, and historical context. |
| 03 Risk Classification | Action receives risk class: routine, monitored, material, high, critical. Classification reason is persisted. |
| 04 Guardrail Evaluation | Brand, legal, compliance, channel, agent-authority, data, approval, and security rules are evaluated. |
| 05 Decision Issuance | System returns allow, allow with warning, require approval, hold, block, quarantine, restricted-mode route, or emergency pause recommendation. |
| 06 Human Accountability | If review is required, the system assigns owner, SLA, escalation path, and required disposition fields. |
| 07 Evidence Write | Decision, rule hits, actor, object, risk class, and rationale are emitted to the Audit Trail and, where required, Evidence Layer. |
| 08 Runtime Monitoring | After execution or hold, system monitors outcome, error, channel discrepancy, agent drift, and repeat patterns. |

**§ 09 Safety Outcomes and UI Language**

The engineering team must use consistent outcome names across UI, API, logs, events, filters, and exports. These labels are not interchangeable.

| Outcome Code | Meaning | Required Behavior |
| --- | --- | --- |
| allow | Action is safe within active policy and authority. | Execution permitted; event written. |
| allow_with_warning | Action can proceed but carries non-blocking risk. | Warning shown; user acknowledgment required for material actions. |
| require_approval | Action cannot proceed without named human approval. | Approval workflow created or existing workflow updated. |
| hold_for_review | Action is paused pending safety review. | Queue item created with SLA and owner. |
| block | Action is prohibited by hard rule. | Execution refused; reason shown; appeal route if configured. |
| quarantine | Object is isolated from execution or publishing. | Object locked; only authorized roles can release. |
| restricted_mode_route | Action is routed under restricted operations controls. | Limited actions allowed; elevated logging enabled. |
| emergency_pause_recommendation | System recommends immediate pause due to critical risk pattern. | Authorized user must confirm or reject with reason. |

**§ 10 Overview Data Contract**

Document 01 requires a small but strict data contract. The overview must not be built from ad hoc dashboard queries. It must consume normalized safety posture objects and queue summaries so later components can reuse them.

| SafetyOverviewDTO {tenant_id: stringworkspace_id: string | nullevaluated_at: ISO-8601 UTCactive_mode: normal | elevated_watch | restricted_operations | emergency_pauseposture_score: number // 0-100, calculated server-sideposture_status: healthy | watch | degraded | criticalcritical_holds_count: numberhigh_risk_queue_count: numberapproval_required_count: numberquarantined_count: numberagent_safety_health: healthy | watch | degraded | criticalsla_exposure: { breached: number, at_risk: number, on_track: number }top_rule_hits: SafetyRuleHitSummary[]component_health: SafetyComponentHealth[]recent_material_decisions: SafetyDecisionSummary[]evidence_chain_health: verified | warning | degraded | unavailable} |
| --- |

**§ 11 API Surface for Document 01**

| Method | Endpoint | Purpose | Notes |
| --- | --- | --- | --- |
| GET | /api/safety/overview | Returns SafetyOverviewDTO for current tenant/workspace. | Field-level redaction and role-specific actions applied server-side. |
| GET | /api/safety/components | Returns component registry and health. | Used by overview component cards. |
| GET | /api/safety/queue/summary | Returns counts by risk, outcome, SLA, owner, and status. | No raw queue records in this endpoint. |
| GET | /api/safety/recent-decisions | Returns recent material decision summaries. | Restricted objects rendered opaque if outside permission. |
| POST | /api/safety/actions/review-critical-queue | Creates a filtered queue session for critical review. | Emits audit event. |
| POST | /api/safety/actions/request-emergency-pause | Submits emergency pause request or confirmation. | Requires authorized role and reason. |

**§ 12 Empty, Error, and Permission States**

| State | Required UI / System Behavior |
| --- | --- |
| No material events | Show healthy posture, zero counts, and “No material safety decisions in this workspace for the selected period.” |
| No permission for component | Show component card with locked label and short explanation; do not expose counts if counts reveal restricted risk. |
| Evidence chain unavailable | Show degraded evidence-chain status; disable export and high-risk release actions. |
| Safety API degraded | Show warning banner; block material action release until Safety Decision Pipeline is available. |
| Emergency pause active | Replace primary CTA with “Review Emergency Pause”; show active scope, owner, start time, reason, and next review deadline. |
| Restricted operations active | Show restricted-mode band and allowed actions; all other actions must be disabled server-side. |
| Component health unknown | Render gray card with “status unavailable”; do not show false healthy state. |

**§ 13 Security, Privacy, and Compliance Requirements**

| Requirement | Acceptance Interpretation |
| --- | --- |
| Server-side enforcement | The UI must never be the enforcement layer. Permission, redaction, action eligibility, and routing must be evaluated by backend services. |
| MFA for high-risk action | Emergency pause, hold release, quarantine release, threshold changes, and hard-rule overrides require MFA step-up. |
| Reason-required actions | Block override request, emergency pause, restricted-mode change, quarantine release, and threshold change require reason text. |
| Immutable safety decision event | Every decision outcome writes an immutable event with actor, context, rule hits, risk class, outcome, and timestamp. |
| Data minimization | Overview should show summaries by default; detailed personal data appears only on permitted drill-down surfaces. |
| API latency guard | If safety evaluation exceeds configured timeout for material actions, default is hold_for_review. |
| Auditability | Administrative changes to safety settings are separate audit events and must be visible in later Safety Settings document. |
| Accessibility | All cards, tables, queues, alerts, mode banners, and action buttons must meet WCAG 2.2 AA. |

**§ 14 Build Phases for Document 01 Only**

| Phase | Shippable Output |
| --- | --- |
| Phase 1 — Overview Shell | Build Safety Layer route, global safety bar, posture cards, component registry, mock data wiring, role-aware button visibility. |
| Phase 2 — Live Data Integration | Connect overview DTO, component health, queue summary, recent decisions, posture score, evidence chain status, and active mode. |
| Phase 3 — Action Wiring | Wire Review Critical Queue, Configure Safety Rules route, Emergency Pause request, component drill paths, audit events for overview actions. |
| Phase 4 — Hardening | Permission redaction, failure states, API latency fallbacks, accessibility, mobile responsiveness, and QA automation. |

**§ 15 Acceptance Criteria**

| No. | Acceptance Criterion |
| --- | --- |
| 01 | Safety Layer Overview route exists and is accessible only to authorized roles. |
| 02 | The page clearly identifies itself as Document 01 / Safety Layer Overview in product and engineering references. |
| 03 | Global Safety Bar shows tenant, workspace, active safety mode, posture status, and critical queue count. |
| 04 | Four posture cards render with live values: posture score, critical holds, agent safety health, and SLA exposure. |
| 05 | Component registry lists the nine remaining Safety Layer components with health status and drill paths. |
| 06 | Live Safety Queue summary sorts by criticality, SLA breach, materiality, and recency. |
| 07 | Decision Pipeline visual displays all eight stages and links to relevant filtered views. |
| 08 | Top Rule Hits widget shows rule name, severity, count, trend, and impacted scope. |
| 09 | Containment Modes widget shows normal, elevated watch, restricted operations, or emergency pause state. |
| 10 | All permission restrictions are enforced server-side and verified through API tests. |
| 11 | Restricted fields are omitted or rendered opaque; they are not hidden only with CSS. |
| 12 | Emergency pause request requires authorized role, MFA step-up, and reason. |
| 13 | Overview actions emit audit events with actor, action, timestamp, and reason where applicable. |
| 14 | If Safety API is degraded, material release actions are disabled and fail safe. |
| 15 | If evidence chain health is degraded, export and release actions dependent on evidence integrity are disabled. |
| 16 | All empty, error, and permission states listed in this document are implemented. |
| 17 | Mobile view preserves the global safety bar, posture cards, critical queue access, and emergency mode visibility. |
| 18 | Page meets WCAG 2.2 AA for keyboard navigation, contrast, focus states, table semantics, and alert announcements. |
| 19 | Performance target: overview API p50 under 300ms and p95 under 900ms for normal tenant scale. |
| 20 | QA confirms no cross-tenant data leakage through counts, labels, queue summaries, or drill paths. |
| 21 | The UI copy uses the exact outcome labels defined in this document. |
| 22 | Component drill paths do not expose unapproved later-component screens as production-ready functionality. |
| 23 | Design review confirms the screen works for tactile engineering implementation, not decorative dashboard presentation. |
| 24 | Product, Engineering, Security, Compliance, and Design sign off before Document 02 begins. |

**§ 16 Engineering Handoff Notes**

| BUILD INSTRUCTIONDo not begin Document 02 until this overview screen, component registry, boundary model, and Safety Decision Pipeline language are approved. This prevents the engineering team from mixing Safety Layer work with Evidence Layer, Forensic Hub, or general analytics surfaces. |
| --- |

**•** Use this document as the master reference for naming, outcome codes, screen zones, and component sequence.

**•** Build the overview as an operational command surface, not as a passive reporting dashboard.

**•** Keep all action enforcement server-side and treat UI buttons as expressions of permission, not permission itself.

**•** Route all material safety actions through the Safety Decision Pipeline.

**•** Emit audit events for all overview actions that affect mode, queue, component navigation, emergency pause, or settings routes.

**•** Hold Document 02 until this Document 01 is accepted by Product, Engineering, Security, Compliance, and Design.

| ZOIKOVERTEX SAFETY LAYEREnd of Document 01Safety Layer Overview · Wireframe & Engineering Build Specification · Ready for engineering review. |
| --- |