# ZOIKOVERTEX: Technical Architecture Master Blueprint

## 1. Executive Architecture Statement
ZoikoVertex must be architected as a multi-tenant, governed, agentic Digital Marketing Operating System that can ingest fragmented business and marketing data, reason over it through bounded specialized agents, execute controlled actions, prove financial impact, and remain explainable, reversible, and enterprise-safe at every step.
This is not a conventional martech stack, social publishing tool, or AI layer added on top of a scheduling product. It is a decision-and-execution system that controls money, affects customer acquisition economics, and influences public-facing communications. As such, its architecture must be credible to the CFO, CMO, CTO, General Counsel, security teams, and enterprise procurement simultaneously.

## 2. Foundational Architectural Principles
* Build ZoikoVertex as infrastructure, not as a feature-centric SaaS application.
* Separate control-plane logic from high-throughput data-plane processing and from intelligence-plane reasoning.
* Use a modular monolith for core control-plane workflows in early stages, while isolating async and compute-heavy services from the start.
* Make every autonomous action attributable, policy-aware, reversible where possible, and fully auditable.
* Prefer bounded contexts and explicit contracts over convenience coupling.
* Treat financial trust, policy enforcement, and observability as first-class architecture requirements.
* Design for multi-tenancy, regionalization, and enterprise governance from day one, even if advanced features phase in later.
* Do not let the frontend promise capabilities the backend cannot prove.

## 3. Three-Plane Architecture Model
### 3.1 Control Plane
The control plane governs the system. It is responsible for user identity, tenant configuration, policy management, autonomy settings, approval routing, governance actions, executive controls, and the canonical orchestration of decisions.
* Identity and access management
* Tenant and workspace administration
* Autonomy mode and decision thresholds
* Approval workflows and human-in-command operations
* Policy authoring, publishing, and resolution
* Executive overrides and kill-switch actions
* Commercial entitlements and plan enforcement

### 3.2 Data Plane
The data plane carries the operational load. It handles ingestion from third-party systems, event normalization, telemetry, financial computations, attribution jobs, execution receipts, and high-volume updates that power read models and analytics.
* Connector ingestion pipelines
* Webhook and polling normalization
* Event enrichment and stream processing
* Execution job dispatch
* Attribution and ROI computation
* Dashboard aggregation pipelines
* Large-scale telemetry retention and querying

### 3.3 Intelligence Plane
The intelligence plane is where agent reasoning, simulation, optimization, scoring, recommendation generation, and explanation synthesis occur. It must be bounded, observable, policy-aware, and governed by model controls rather than treated as an unrestricted AI sandbox.
* Agent execution and tool use
* Simulation and forecasting
* Decision scoring
* Optimization loops
* Prompt and model routing
* Confidence estimation
* Explanation generation

## 4. Runtime Strategy and System Shape
ZoikoVertex should not start as full microservices. The right early-stage architecture is a modular monolith for the control plane, paired with isolated workers and bounded compute services for the data plane and intelligence plane.

## 5. Bounded Context Map
Bounded contexts define ownership, contracts, and anti-coupling rules.

## 6. Domain Dependency Rules
* Execution Services may depend on validated decisions and policy clearance, but may not independently reinterpret policy.
* Decision Engine may consume agent outputs, simulation results, and policy inputs, but may not mutate source-platform state.
* Agent Orchestration may coordinate agent runs, but may not directly override Governance Engine outcomes.
* Commercial & Billing may meter usage from execution and spend signals, but may not infer attribution logic independently.
* Read Models may denormalize and aggregate data for the UI, but may not become hidden systems of record.
* Integration Hub may normalize source data, but connector-specific schemas must not leak into the canonical business layer.

## 7. Service Candidates and Extraction Roadmap
The control plane should remain cohesive longer. High-throughput integrations, simulation, analytics, and potentially execution services are the earliest extraction candidates.

## 8. Identity, Access, and Tenant Architecture
* Support enterprise SSO via SAML/OAuth.
* Role-based access control with action-level permissioning.
* Multi-tenant by design.

## 9. Data and Storage Architecture
### 9.2 Canonical Entities
Tenant, Workspace, Brand, Region, User, Role, Membership, Connector, Connector Account, Sync Job, Webhook Event, Channel, Campaign, Ad Group / Ad Set, Ad / Creative Asset, Post / Published Asset, Message / Interaction, Lead Signal, Customer Segment, Audience Cohort, Product / SKU, Inventory Snapshot, Price Point, Margin Profile, Spend Event, Conversion Event, Revenue Event, Attribution Path, ROI Snapshot, Agent Run, Agent Output, Decision, Policy Evaluation, Approval Request, Approval Action, Execution Event, Override Event, Simulation Run, Forecast Output, Confidence Score, Model Evaluation Result.

## 10. Event Taxonomy and Event Platform
ZoikoVertex is event-driven internally.
### 10.1 Event Envelope
event_id, event_name, domain, tenant_id, workspace_id, trace_id, actor_type and actor_id, occurred_at, schema_version, classification, retention_class, payload.

## 11. Queue Topology and Workflow Model
### 11.2 Queue Rules
Every queue consumer must be idempotent or use idempotency keys. High-risk actions require dead-letter handling and alerting.

## 12. Agent Operating Model
### 12.1 Core Agents
Chief Strategy Agent, Platform Intelligence Agent, Creative Intelligence Agent, Execution Agent, Engagement Agent, Quantitative Ad Spend Agent, Revenue Forensic Agent, Compliance Sentry, Synthetic Audience Agent, Optimization Agent.

## 13. Agent Orchestration Architecture
Agents must run through orchestrated workflow graphs with explicit state transitions.
### 13.2 Standard Run Pattern
1. Strategy or trigger event initiates workflow.
2. Relevant agents produce bounded outputs.
3. Decision Engine consolidates proposals.
4. Policy and Governance Engine checks permissibility.
5. Human-in-Command workflow intervenes if thresholds require it.
6. Execution workers act on approved decisions.
7. Financial and Optimization layers evaluate outcomes.

## 14. Decision Architecture
Agents propose. The Decision Engine adjudicates. Governance constrains. Human-in-Command approves where required. Execution acts only on cleared decisions.

## 15. Policy and Governance Architecture
Formal policy hierarchy: Legal, Industry, Tenant-wide, Brand/Workspace, Campaign-specific, Agent runtime.

## 16. Human-in-Command Architecture
Human-in-the-loop is not enough. ZoikoVertex needs a full human-in-command subsystem with approval queues, role-based routing, and dual approval.

## 17. Model Governance and AI Operations
Model registry, prompt registry, evaluation pipeline, approval states, and drift detection.

## 18. Financial Attribution and ROI Engine
Auditable, explainable, and reconcilable ROI calculations.

## 19. Simulation and Forecasting Architecture
Creative response simulation, budget split scenario modeling, and channel-mix comparison.

## 20. Integration Architecture
Connector abstraction layer, credential vaulting, and health monitoring.

## 21. Security and Data Governance Architecture
Encryption, secret storage, least-privilege, and PII segregation.

## 22. Failure-Mode Architecture
Specifies degraded and exception behavior.

## 23. Observability, Reliability, and SRE Model
SLOs, error budgets, and backup/restore playbooks.

## 24. Commercial Architecture
Subscription and performance-based economics.

## 25. UI-to-Backend Contract Map

## 26. Phased Implementation Roadmap

## 27. Technology Direction
* Frontend: Next.js / React / TypeScript.
* Control plane: Python + FastAPI or equivalent. (Note: Existing project is Node.js/TS, I should clarify if I should stay on TS or switch to Python as per this doc, or if TS is the "equivalent").
* Primary transactional storage: PostgreSQL (Supabase used in existing code).
* Cache: Redis.
* Analytical storage: ClickHouse.
* Messaging: Kafka/Redpanda/RabbitMQ.

## 28. What Must Never Be Faked
ROI calculations, Attribution confidence, Simulation validity, Real-time claims, Autonomous decision capability, Governance depth, Compliance readiness.
