ZOIKOVERTEX
Canonical Domain & Bounded Context Specification


1. Purpose of This Document
This document defines the canonical domains and bounded contexts for ZoikoVertex. It is not a product narrative, a general architecture essay, or a UI guide. It is the enforceable backend structure that determines how the system is decomposed, what each domain owns, how domains interact, and which constraints are mandatory at build time.
2. System Principle
ZoikoVertex is a governed, decision-driven, event-based execution system. It is not a free-form automation layer, nor a conventional martech application where services can act independently. The entire system must operate through a controlled flow in which actions are proposed, classified, validated, governed, executed, emitted as events, and traced to financial outcomes.
All meaningful actions must originate from either a classified system decision or an authorized human instruction.
No service may execute a governed action outside the approved system flow.
No domain may mutate another domain’s data directly.
Every governed action must be traceable from trigger to financial outcome.
3. Domain Map
The refined domain structure is below. The previous draft was directionally correct but incomplete because it lacked an explicit coordination layer and did not sufficiently harden the execution, CRM, and financial boundaries.

4. Domain Definitions
4.1 Organisation & Identity Domain
This domain provides the organizational boundary within which every other domain operates. It is responsible for authentication, authorization, tenant structure, role assignment, organization-level settings, and identity-scoped access to internal and external system capabilities.
Owns: tenant, workspace, organization, user, role, permission set, session state, API credential reference.
May expose: identity tokens, authorization context, org-scoped configuration, actor identity for traceability.
Must not own: campaign state, content objects, financial calculations, decision logic.
Mandatory request context: all internal requests must carry org_id and auth_context.
4.2 Content & Asset Domain
This domain owns the lifecycle of content and creative assets before they are executed in channels. It is the source of truth for text, image, video, asset variants, templates, asset metadata, lineage, and version history.
Owns: asset files, content records, content variants, template references, version lineage, asset tags.
Must support: multi-variant generation, performance tagging, compliance hint tagging, historical version comparison.
Must not own: publishing, campaign deployment, channel metric ingestion, attribution.
Constraint: execution services may consume content, but may not mutate canonical content records directly.
4.3 Campaign & Execution Domain
This domain is the execution orchestrator for campaigns and actions. It owns campaign state, scheduling state, execution jobs, job lifecycle, action receipts, retry state, and execution outcomes. It does not decide what should happen; it performs what has been cleared to happen.
Owns: campaign records, schedules, execution jobs, execution state, retry metadata, platform action receipts.
Must support: execution queueing, job lifecycle transitions, retries, failure capture, idempotent execution references.
Must not own: decision scoring, policy interpretation, autonomous risk assessment.
Hard constraint: execution is permitted only where decision_status = APPROVED and governance_status = PASSED.
4.4 Channel & Platform Domain
This domain abstracts external systems such as Meta, LinkedIn, TikTok, Google, email providers, analytics tools, and similar channel endpoints. It isolates platform-specific constraints and exposes a normalized capability surface to the rest of the system.
Owns: platform definitions, account bindings, connector capability metadata, rate-limit state, channel-specific mapping rules.
Must expose normalized capabilities such as publish_content(), launch_ad(), fetch_metrics(), pause_campaign(), update_budget().
Must not own: business campaign logic, decision criteria, financial calculations.
Hard constraint: no other domain may call external APIs directly; all such interactions must flow through this domain.
4.5 Audience & Behavioural Intelligence Domain
This domain replaces the underpowered 'CRM-only' concept from the earlier draft. It is the behavioural intelligence surface of the platform. It owns contacts, segments, lifecycle status, engagement history, audience scoring, and commercial relevance signals that influence decisions and attribution.
Owns: contacts, audience segments, behavioural events, lead signals, engagement history, segment membership, audience scores.
Must support: predictive segmentation, lifecycle tracking, engagement-event aggregation, commercial-priority scoring.
Must not own: campaign deployment, spend movement, formal attribution logic.
Architectural purpose: this domain provides richer commercial context than a conventional contact database.
4.6 Decision Engine Domain
This domain is the decision authority of the system. It creates structured, classified decisions based on data context, optimization signals, policy inputs, and bounded intelligence outputs. It must be deterministic where rules require determinism and probabilistic where optimization requires probabilistic ranking.
Owns: decision objects, decision classes, confidence scores, risk scores, decision rationale, admissibility state.
Decision types include: channel selection, content selection, timing, budget allocation, pause/scale, approval routing.
Must not execute actions directly.
Every decision must include: decision_id, action_type, target_entity, confidence_score, risk_score, required_approval_level, valid_until.
4.7 Governance & Policy Domain
This domain is the hard enforcement layer of the system. In the earlier draft, governance existed as a principle; in this refined version it is a mandatory architectural gate. No governed action may bypass it.
Owns: policy records, policy hierarchy, approval workflows, evaluation outcomes, audit evidence, override records, governance status.
Outputs only three operative states: APPROVED, REJECTED, ESCALATED.
Must be stateless in evaluation logic but stateful in audit and approval recording.
Policy classes include: legal compliance, brand rules, budget limits, platform constraints, market rules, autonomy thresholds.
4.8 Attribution & Revenue Intelligence Domain
This domain owns financial and revenue intelligence. The earlier draft treated financials too abstractly. This refined version defines it as the revenue intelligence engine responsible for proving value, tracking spend, measuring outcomes, and feeding profitability logic back into decisioning.
Owns: spend tracking, conversion records, revenue events, attribution chains, ROI snapshots, margin models, reconciliation outputs.
Must support: campaign profitability scoring, channel ROI comparison, margin-aware optimization feedback, finance-ready reporting.
Must not own: channel execution, policy approval, campaign scheduling.
Architectural purpose: this is where marketing activity becomes economically legible.
4.9 Orchestration Domain
This domain did not exist in the first draft and is now explicitly added because it is required. It coordinates the system flow, enforces sequencing, handles retries and escalation, and prevents orchestration logic from leaking into other services.
Owns: workflow state, sequence control, retry orchestration, timeout state, escalation routing, process coordination.
Must support the mandatory system flow from trigger to attribution.
Must not replace the Decision Engine, Governance Engine, or Execution Domain.
Architectural necessity: without a dedicated orchestration domain, coordination logic fragments across services and becomes unmanageable.
5. Enforceable Interaction Model
The system interaction model is not optional guidance. It is the mandatory control path.
No execution without governance.
No governance without a classified decision or authorized human action.
No decision without data context.
No domain may skip orchestration for governed actions.
No financial reporting without event-backed execution or outcome evidence.
6. Read/Write Authority Model
The earlier version stated data ownership but did not make it operational enough. This section fixes that.
6.1 Write Rule
Only the owning domain may create or mutate its authoritative records.
6.2 Read Rule
Non-owning domains may consume data only through exposed APIs, explicit query services, read models, or subscribed events.
6.3 Shared Database Rule
There must be no shared write access across domains. Shared infrastructure is acceptable; shared authority is not.
6.4 Examples
The Execution Domain may read approved content metadata, but may not change canonical content records.
The Decision Domain may consume behavioural scores, but may not mutate contact profiles directly.
The Revenue Intelligence Domain may consume campaign and execution events, but may not alter campaign state.
The Governance Domain may block execution, but may not rewrite a decision object’s underlying rationale.
7. Synchronous vs Asynchronous Flows
The earlier version did not sufficiently separate real-time and deferred behaviours. This distinction is critical for system stability and developer expectations.

8. Updated Service Map
The service names below are logical service candidates aligned to the refined domain model. They define backend decomposition intent rather than mandatory deployment topology on day one.

9. Hard System Constraints
These are not recommendations. They are architectural constraints.
Governance is non-bypassable at system level.
Decision classification determines the execution path.
All governed flows must pass through orchestration.
No service owns more than one core domain.
Every significant action must emit an event.
Financial impact must be traceable through events and execution receipts.
External platform calls may only be made through the Channel & Platform Domain.
A domain may never directly mutate another domain’s authoritative state.
10. Failure Modes and Preventive Design
A domain document that does not define failure risks is incomplete. The table below expands the earlier draft into engineering-relevant failure handling.

11. What This Document Fixes Compared with the Earlier Draft
Introduces a dedicated Orchestration Domain, which was previously missing.
Hardens Governance from a stated principle into an enforceable system gate.
Upgrades Audience & CRM into a Behavioural Intelligence Domain suitable for real decision-making.
Upgrades Financial logic into a Revenue Intelligence Domain with profitability and reconciliation relevance.
Makes Decision objects operational by requiring explicit fields and execution eligibility state.
Clarifies synchronous versus asynchronous behaviour to reduce implementation ambiguity.
Converts data ownership from a conceptual rule into an enforceable read/write authority model.
12. Final CTO Position
ZoikoVertex must be built as a controlled system of execution, not as a loose collection of marketing services. This domain model is the first hard boundary that makes that possible. If domain ownership is blurred, governance becomes fragile. If orchestration is omitted, logic leaks everywhere. If financial intelligence is treated as reporting instead of system truth, the product loses its core economic claim.

Purpose: This document defines the full domain decomposition, ownership model, interaction rules, system flow, enforcement constraints, and failure-prevention logic required to build ZoikoVertex as a governed, decision-driven execution system. It is the backend source of truth for domain boundaries and service design.
Architectural consequence: If this document is wrong or ignored, governance becomes porous, decisioning becomes inconsistent, and later service extraction becomes materially more expensive.
Domain | Primary Responsibility
Organisation & Identity | Tenants, users, roles, authentication, organization-level configuration.
Content & Asset | Content objects, variants, templates, asset lineage, content metadata.
Campaign & Execution | Campaign state, scheduling, execution jobs, action receipts, retries.
Channel & Platform | External platform abstraction, account bindings, API capability surface.
Audience & Behavioural Intelligence | Contacts, segments, engagement history, lifecycle state, scoring.
Decision Engine | Decision generation, scoring, classification, confidence, admissibility.
Governance & Policy | Policy evaluation, approvals, constraints, audit evidence, enforcement gate.
Attribution & Revenue Intelligence | Spend, revenue, attribution paths, ROI, margin impact, reconciliation.
Orchestration | Workflow coordination, sequencing, retries, escalation flow, cross-domain control.
Required system path: Trigger → Orchestration → Decision → Governance → Execution → Event → Attribution
Flow Type | Typical Scope
Synchronous | Authentication, authorization, decision validation, governance checks, approval actions, high-signal UI reads.
Asynchronous | Execution jobs, attribution processing, analytics projections, agent workflows, retries, simulation jobs.
Engineering rule: Anything that changes public-facing execution or governance state must be explicit about whether it is blocking, deferred, or eventually consistent.
Domain | Logical Service
Organisation & Identity | identity-service
Content & Asset | content-service
Campaign & Execution | execution-service
Channel & Platform | platform-adapter-service
Audience & Behavioural Intelligence | audience-intelligence-service
Decision Engine | decision-engine-service
Governance & Policy | policy-engine-service
Attribution & Revenue Intelligence | revenue-intelligence-service
Orchestration | orchestration-service
Failure Mode | Preventive Mechanism
Infinite decision loops | Decision TTL, max retry limit, orchestration loop guards, decision replay protection.
Budget overrun | Governance budget caps, real-time spend validation, execution pre-flight checks.
Platform API failure | Queue retry strategy, channel adapter fallback state, execution receipt tracking.
Governance bottlenecks | Parallel policy evaluation where safe, policy cache, SLA escalation pathways.
Execution without approval | Mandatory governance token or approval reference required by execution-service.
Stale behavioural data | Decision confidence reduction and freshness-aware decision scoring.
Untraceable financial impact | Event emission required for execution state changes and downstream attribution.
Conclusion: This document is the foundation for all subsequent backend architecture work. Policy & Governance, Decisioning, Data Architecture, Events, Queues, APIs, Agents, and Execution must all conform to the boundaries and constraints established here.