# ZoikoVertex — Project Guide
> **Single source of truth for every developer on this team.**
> Read before writing a single line of code. If something conflicts with this document, raise it for review — do not silently deviate.

---

## Table of Contents
1. [What Is ZoikoVertex?](#1-what-is-zoikovertex)
2. [Design Philosophy](#2-design-philosophy)
3. [The Team](#3-the-team)
4. [Tech Stack](#4-tech-stack)
5. [Three-Plane Architecture](#5-three-plane-architecture)
6. [The Execution Flow](#6-the-execution-flow)
7. [Bounded Contexts — Who Owns What](#7-bounded-contexts--who-owns-what)
8. [Repository Structure](#8-repository-structure)
9. [Environment Setup](#9-environment-setup)
10. [Phase 1 Status](#10-phase-1-status)
11. [Phase Roadmap by Developer](#11-phase-roadmap-by-developer)

---

## 1. What Is ZoikoVertex?

ZoikoVertex is a **multi-tenant, governed, agentic Digital Marketing Operating System**.

It is not a scheduler. It is not a CRM wrapper. It is not an AI plugin.

It is a **decision-and-execution system** that:
- Ingests fragmented marketing and business data
- Reasons over it using bounded, policy-constrained AI agents
- Executes controlled marketing actions (ads, campaigns, budget moves) only after governance clearance
- Proves financial impact with full attribution and traceability
- Remains explainable, reversible, and auditable at every step

Every autonomous action is attributable, policy-aware, and governed. No agent acts freely. No API exposes raw mutations. The system is designed to be trusted by CFOs, CMOs, CTOs, and legal teams.

> **Architecture thesis:** ZoikoVertex is infrastructure, not a feature-centric SaaS app. It is a governed execution substrate.

---

## 2. Design Philosophy

Every feature, flow, and screen must pass this test:

**If someone opens ZoikoVertex for the first time — with zero prior knowledge — should they immediately know what to do?**

The answer must always be **yes**.

### Core Principles

1. **No learning curve** — If a user needs a guide, we have failed
2. **Progressive disclosure** — Show only what matters, when it matters
3. **One clear action per screen** — No ambiguity, no clutter
4. **Context over documentation** — The UI itself explains what to do
5. **Governance visible, not hidden** — Every constraint and approval state is surfaced to users

> **Rule:** Before shipping any feature, test it with someone who has never seen the app. If they hesitate, go back and simplify.

---

## 3. The Team

| Developer | Role | Primary Responsibility |
|---|---|---|
| **Minit** | Full Stack + AI Automation | Frontend, Backend (shared), Database, DevOps, AI workflow integration |
| **Vignesh** | Full Stack | Frontend, Backend (shared), Database (shared) |
| **Naresh** | AI Engineer | AI pipeline, agent design, model integration, governance engine |
| **Harsha** | AI Engineer | AI pipeline, Decision Engine, agent orchestration |

### Domain Ownership

| Domain | Owner |
|---|---|
| Frontend UI | Minit + Vignesh |
| Backend APIs (Control Plane) | Minit + Vignesh |
| Database / Data Model | Minit + Vignesh |
| AI Agent Pipeline (Intelligence Plane) | Naresh + Harsha |
| Decision Engine | Harsha |
| Governance Engine | Naresh + Harsha |
| DevOps / Repo Management | Minit |

---

## 4. Tech Stack

### Backend (Control Plane — current)
| Layer | Technology |
|---|---|
| Language | TypeScript / Node.js |
| Database | PostgreSQL via Supabase (OLTP) |
| Cache | Redis |
| Event streaming | Kafka / Redpanda (async events, audit trail) |
| Analytics | ClickHouse (OLAP/warehouse — roadmap) |
| API style | REST over HTTPS, versioned at `/v1/` |
| Auth | JWT + RBAC + ABAC, org-scoped on every request |

### Intelligence Plane (roadmap)
| Layer | Technology |
|---|---|
| Agent framework | Python / FastAPI (target) |
| LLM provider | TBD — confirm with Naresh + Harsha |
| Model routing | Bounded within Intelligence Plane only |

### Frontend
| Layer | Technology |
|---|---|
| Framework | Next.js / React |
| State management | TBD |
| API communication | REST via Intent + Query API layer only — never direct DB access |

### DevOps
| Tool | Purpose |
|---|---|
| GitHub | Version control, PRs, code review |
| GitHub Actions | CI/CD (to be configured) |
| Supabase | Managed PostgreSQL + Auth |
| Environment files | `.env.local`, `.env.staging`, `.env.production` — **never committed** |

---

## 5. Three-Plane Architecture

ZoikoVertex is built on a **Three-Plane Architecture**.

### 5.1 Control Plane
Governs the system. Handles identity, tenant config, policy management, autonomy settings, approval workflows, governance enforcement, and executive controls.

Priorities: consistency, security, authorization, auditability, deterministic behaviour.

Runtime shape: **modular monolith** (faster delivery, stronger consistency).

### 5.2 Data Plane
Carries operational load. Handles ingestion from third-party systems, event normalisation, telemetry, financial computations, attribution jobs, and high-volume updates.

Priorities: throughput, retry isolation, connector resilience, scalable ingestion.

Runtime shape: **async workers + event pipelines**.

### 5.3 Intelligence Plane
Where agent reasoning, simulation, scoring, optimisation, and recommendation generation occur. **Bounded and governed** — not a free AI sandbox.

Priorities: policy-awareness, observability, model controls, confidence estimation, explainability.

Runtime shape: **bounded AI compute services**.

> **Why three planes?** Prevents governance workflows from entangling with high-volume ingestion and heavy AI compute. Reliability, security, incident isolation, and scaling are all cleaner this way.

---

## 6. The Execution Flow

```
Agent → Intent API → Decision Engine → Governance Engine → Economic Engine → Execution Services → Event Log → Data Storage
```

**In plain English:**

1. An agent or user submits an **intent** (e.g. "optimise this campaign budget")
2. The **Intent API** validates, logs, and emits an event
3. The **Decision Engine** scores, classifies, and assesses risk
4. The **Governance Engine** applies policy — this is a **hard gate, never bypassable**
5. The **Economic Engine** validates financial constraints and blast radius
6. Only after full clearance does **Execution** happen via platform connectors
7. Every action is **logged as an event** and written to data storage

> **Hard rule:** No agent, API call, or shortcut may skip any step. Code that allows bypass is a defect, not a feature.

### API Layers

| Layer | Purpose |
|---|---|
| Intent API | Receives and queues agent/user intents |
| Query API | Read-only access to system state and projections |
| Control API | Kill switches, budget freezes, autonomy mode changes, rollbacks |
| Integration API | External platform connectors (Meta, Google, etc.) |
| Webhook / Ingestion API | Inbound data from third-party platforms |
| Audit / Compliance API | Evidence export, explainability, decision traces |

---

## 7. Bounded Contexts — Who Owns What

Each domain owns its data. No domain mutates another domain's data directly. All cross-domain communication goes through APIs or event contracts.

| Domain | What It Owns | What It Must NOT Do |
|---|---|---|
| Organisation & Identity | Users, tenants, workspaces, roles, memberships, auth, sessions | Own campaign logic or billing |
| Content & Asset | Content objects, variants, templates, asset versions, usage links | Publishing, campaign deployment, metrics |
| Campaign & Execution | Campaign state, schedules, execution jobs, receipts | Decision scoring, policy interpretation |
| Channel & Platform | External platform abstraction (Meta, Google, etc.), connector bindings, capability maps | Business campaign logic, financial calculations |
| Audience & Behavioural Intelligence | Contacts, segments, engagement history, behavioural scores, lifecycle states | Campaign deployment, spend movement |
| Decision Engine | Decision objects, candidates, confidence scores, risk scores, rationale, scoring snapshots | Execute actions directly |
| Governance & Policy | Policy evaluation, approvals, audit evidence, governance tokens, enforcement | Be bypassable under any condition |
| Attribution & Revenue Intelligence | Spend, revenue, attribution paths, ROI snapshots, reconciliation runs, margin profiles | Own execution or campaign logic |
| Orchestration | Workflow instances, orchestration steps, escalation, workflow failures | Hold business state |

> **Rule:** If you're writing code that reaches into another domain's database table directly — stop. It must go through that domain's API or event contract.

---

## 8. Repository Structure

Current transitional layout (moving toward three-plane structure as Intelligence Plane is built out):

```
zoikovertex/
├── backend/                  # Control Plane — TypeScript/Node.js modular monolith
│   └── src/
│       ├── config/           # Environment and app config
│       ├── modules/          # Domain modules (one per bounded context)
│       │   ├── governance/
│       │   ├── identity/
│       │   ├── intelligence/ # Stub — will move to Intelligence Plane
│       │   ├── library/
│       │   ├── scheduler/
│       │   ├── social/       # Channel & Platform (current name, will refactor)
│       │   ├── superadmin/
│       │   ├── support/
│       │   ├── team/
│       │   └── user/
│       ├── services/         # Cross-cutting services (e.g. risk classifier)
│       ├── shared/           # Middleware, auth, error handler, logger, Supabase client
│       └── workers/          # Async workers (scheduler)
├── frontend/                 # Next.js / React
│   └── src/
│       ├── app/              # Next.js app router pages
│       ├── components/       # UI components
│       └── lib/              # API client, utilities, context
├── db_migrations/            # SQL migration files — apply via Supabase
├── docs/
│   ├── project_docs/         # Authoritative architecture .docx files (source of truth)
│   ├── agents.md             # AI agent operating guide
│   ├── guide.md              # This file
│   ├── roadmap.md            # Build roadmap and milestones
│   ├── rules.md              # Git and collaboration rules
│   └── skills.md             # Dev commands and procedures
└── README.md
```

> Architecture target (three-plane): see `docs/project_docs/` — the `.docx` files are the authoritative specifications.

---

## 9. Environment Setup

### Step 1 — Clone the repo
```bash
git clone https://github.com/your-org/zoikovertex.git
cd zoikovertex
```

### Step 2 — Install backend dependencies
```bash
cd backend && npm install
```

### Step 3 — Install frontend dependencies
```bash
cd frontend && npm install
```

### Step 4 — Set up environment variables
```bash
cp .env.example .env.local
# Fill in values — ask Minit for secrets
```

> **Never commit `.env` files. Never. Ever.**

### Step 5 — Start the backend
```bash
cd backend && npm run dev
# Runs on http://localhost:5005
```

### Step 6 — Start the frontend
```bash
cd frontend && npm run dev
# Runs on http://localhost:3000
```

### Step 7 — Verify
- Frontend: `http://localhost:3000`
- Backend health: `GET http://localhost:5005/api/v1/health`
- Requires Supabase instance with schema from `db_migrations/` applied

> If anything breaks in setup, ping Minit. Do not guess your way through environment issues.

---

## 10. Phase 1 Status

**Phase 1 architecture is LOCKED.**

The following specification documents are finalised and must not be changed without a formal architectural review:

| # | Document | Status |
|---|---|---|
| 1 | Domain & Bounded Contexts | ✅ Locked |
| 2 | Governance Engine | ✅ Locked |
| 3 | Decision Engine | ✅ Locked |
| 4 | Canonical Data Model & Database Architecture | ✅ Locked |
| 5 | Event Taxonomy & Contracts | ✅ Locked |
| 6 | API Architecture | ✅ Locked |
| 7 | Agent Operating Contract | ✅ Locked |

Source documents are in `docs/project_docs/`. If you believe a locked spec needs to change, raise it with the team. Do not silently deviate.

---

## 11. Phase Roadmap by Developer

> High-level view. Detailed task-level breakdown is in `docs/roadmap.md`.

### Minit (Full Stack + AI Automation)
- Phase 1: Repo setup, database schema (PostgreSQL), environment + CI skeleton, shared layer
- Phase 2: Core API layer (Intent, Query, Control APIs), authentication, multi-tenancy
- Phase 3: Frontend foundations, AI workflow integration, PR review ownership

### Vignesh (Full Stack)
- Phase 1: Frontend setup, component library, routing
- Phase 2: UI-to-backend contract implementation, dashboard views, approval flows
- Phase 3: Integration with live API layer, performance optimisation

### Naresh (AI Engineer)
- Phase 1: Agent registration system, AI pipeline scaffolding, governance engine integration
- Phase 2: Policy enforcement layer, agent operating contract implementation
- Phase 3: Agent orchestration, cross-agent coordination, supervisory agents

### Harsha (AI Engineer)
- Phase 1: Decision Engine core (scoring, classification, admissibility)
- Phase 2: Confidence estimation, risk scoring, decision rationale generation
- Phase 3: Simulation + forecasting loops, optimisation integration

---

*Last updated: May 2026 | Maintained by: Minit*
