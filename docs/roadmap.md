# ZoikoVertex — Build Roadmap

> Source of truth: `docs/project_docs/ZoikoVertex_Backend_Documentation_Roadmap.docx` and `ZoikoVertex_Phase1_Architecture_Summary.docx`
> Phase 1 architecture is locked. Do not start implementation without the required spec documents for that phase.

---

## Phase 1: Core System Definition

**Status: Architecture LOCKED — Implementation in progress**

These are the foundation documents. Everything else depends on them being right.

### Architecture Documents (all locked)
- [x] Domain & Bounded Contexts
- [x] Governance Engine specification
- [x] Decision Engine specification
- [x] Canonical Data Model & Database Architecture
- [x] Event Taxonomy & Contracts
- [x] API Architecture
- [x] Agent Operating Contract

### Backend Infrastructure
- [x] Modular directory structure (`backend/src/modules/`)
- [x] Core dependency installation
- [x] Shared layer (Supabase client, auth middleware, error handler, logger)
- [ ] Database schema — apply all SQL files from `db_migrations/` to Supabase

### Identity & Organisation Domain
- [ ] Multi-tenant org model (organizations, workspaces, memberships)
- [ ] Role & permission model (RBAC + ABAC per spec)
- [ ] JWT auth with org-scoped enforcement on every request
- [ ] Workspace-scoped session model

### Governance & Policy Domain
- [ ] Policy schema and versioning
- [ ] Governance gate middleware (hard gate — not optional)
- [ ] Policy evaluation engine skeleton
- [ ] Approval queue model

### Decision Engine Skeleton
- [ ] Decision object schema
- [ ] Scoring and classification stubs
- [ ] Decision-to-governance coupling
- [ ] Admissibility check

### Event System
- [ ] Event schema definitions (Kafka topics)
- [ ] Outbox pattern implementation
- [ ] Event emission from all state-changing operations

---

## Phase 2: Intelligence & Execution Layer

**Status: Pending Phase 1 completion**

### Agent System
- [ ] Agent registration API
- [ ] Agent identity and contract versioning
- [ ] Autonomy level model (L0–L6) implementation
- [ ] Authority limit enforcement (financial, operational, temporal, strategic)
- [ ] HITL trigger framework
- [ ] Kill switch system (Level 1–4)
- [ ] Agent trust score tracking

### Intent API
- [ ] Intent submission endpoint (`POST /v1/intents/execute`)
- [ ] Intent validation and routing
- [ ] Async intent processing pipeline
- [ ] Intent-to-decision coupling

### Platform Connectors (Channel & Platform Domain)
- [ ] Connector abstraction layer
- [ ] Meta connector
- [ ] Google connector
- [ ] Connector capability map

### Intelligence Plane (Naresh + Harsha)
- [ ] Intelligence plane service setup (Python/FastAPI target)
- [ ] LLM provider integration and model routing
- [ ] Agent pipeline scaffolding
- [ ] Optimization engine foundation
- [ ] Simulation lab (isolated from production execution)

### Workflow Orchestration
- [ ] Workflow instance model
- [ ] Orchestration engine (stage sequencing, escalation)
- [ ] Multi-agent coordination via orchestration layer
- [ ] Workflow templates library

### Frontend — Core Flows
- [ ] Agent Studio UI (registry, create flow, identity profile)
- [ ] Autonomy control panel (HITL review queue)
- [ ] Workflow canvas
- [ ] Approval queue UI
- [ ] Intent submission and status tracking

---

## Phase 3: Financial, Enterprise & Production Readiness

**Status: Future**

### Attribution & Revenue Intelligence
- [ ] Attribution path model
- [ ] ROI snapshot and reconciliation runs
- [ ] Margin profile management
- [ ] Revenue intelligence dashboard

### Risk & Compliance
- [ ] Risk Command Center
- [ ] Evidence vault (immutable audit ledger)
- [ ] Compliance export APIs

### Brand & Content Governance
- [ ] Brand standards enforcement
- [ ] Prompt governance lifecycle management
- [ ] Content governance center

### Intelligence & Optimization (advanced)
- [ ] Predictive scoring system (12 score types)
- [ ] Best-time-to-post intelligence
- [ ] Platform and geographic recommendation engine
- [ ] Risk-adjusted ROI projections

### Production Readiness
- [ ] ClickHouse OLAP setup (analytical warehouse)
- [ ] Kafka/Redpanda production configuration
- [ ] Redis caching layer
- [ ] Rate limiting and circuit breakers
- [ ] Observability (structured logging, tracing, SRE metrics)
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Multi-region data residency strategy

---

## What Must NOT Be Faked

Per the Master Blueprint — these are non-negotiable. Never mock or simulate:

- ROI and revenue attribution (must be real financial reconciliation)
- Governance enforcement (not a soft check — hard gate)
- Agent autonomy controls (L0–L6 must actually restrict execution)
- Audit evidence (evidence vault must be immutable)
- Simulation validity (simulation lab must be isolated from production)

---

*Last updated: May 2026 | Maintained by: Minit*
