# ZoikoVertex — Project Guide
> **This is the single source of truth for every developer on this team.**
> Read this before writing a single line of code. If something conflicts with this document, this document wins — or raise it for review.

---

## Table of Contents
1. [What Is ZoikoVertex?](#1-what-is-zoikovertex)
2. [The Team](#2-the-team)
3. [Tech Stack](#3-tech-stack)
4. [System Architecture](#4-system-architecture)
5. [The Execution Flow (Memorise This)](#5-the-execution-flow-memorise-this)
6. [Bounded Contexts — Who Owns What](#6-bounded-contexts--who-owns-what)
7. [Repository Structure](#7-repository-structure)
8. [Environment Setup](#8-environment-setup)
9. [Phase 1 Status](#9-phase-1-status)
10. [Phase Roadmap by Developer](#10-phase-roadmap-by-developer)

---

## 1. What Is ZoikoVertex?

ZoikoVertex is a **governed, autonomous Digital Marketing Operating System**.

It is not a scheduler. It is not a CRM wrapper. It is not an AI plugin.

It is a **decision-and-execution system** that:
- Ingests fragmented marketing and business data
- Reasons over it using bounded, specialized AI agents
- Executes controlled marketing actions (ads, campaigns, budget moves)
- Proves financial impact with full traceability
- Remains explainable, reversible, and auditable at every step

Every autonomous action taken by the system is attributable, policy-aware, and governed. No agent acts freely. No API exposes raw mutations. The system is designed to be trusted by CFOs, CMOs, CTOs, and legal teams.

> **Architecture thesis:** ZoikoVertex is infrastructure, not a feature-centric SaaS app.

---

## 2. The Team

| Developer | Role | Primary Responsibility |
|---|---|---|
| **Minit** | Full Stack Engineer + AI Automation | Frontend, Backend (shared), Database (shared), DevOps (shared), AI workflow integration |
| **Vignesh** | Full Stack Engineer | Frontend, Backend (shared), Database (shared) |
| **Naresh** | AI Engineer | AI pipeline (shared), agent design, model integration |
| **Harsha** | AI Engineer | AI pipeline (shared), Decision Engine, agent orchestration |

### Ownership by Domain

| System Domain | Owner |
|---|---|
| Frontend UI | Minit + Vignesh |
| Backend APIs | Minit + Vignesh |
| Database / Data Model | Minit + Vignesh |
| AI Agent Pipeline | Naresh + Harsha |
| Decision Engine | Harsha |
| Governance Engine | Naresh + Harsha |
| DevOps / Repo Management | Minit |


---

## 3. Tech Stack

### Backend
| Layer | Technology |
|---|---|
| Primary language | TypeScript / Node.js (or as decided per service) |
| Primary database | PostgreSQL (OLTP — transactional state) |
| Event streaming | Kafka (async events, audit trail) |
| Cache / projections | Redis |
| Analytics / warehouse | ClickHouse (or BigQuery / Snowflake — TBD) |
| API style | REST over HTTPS, versioned at `/v1/` |
| Auth | JWT + RBAC, org-scoped every request |

### Frontend
| Layer | Technology |
|---|---|
| Framework | TBD — confirm with Minit + Vignesh |
| State management | TBD |
| API communication | REST, via Intent + Query API layer only |

### AI / Intelligence Plane
| Layer | Technology |
|---|---|
| Agent framework | TBD — confirm with Naresh + Harsha |
| LLM provider | TBD |
| Agent orchestration | Governed via Agent Operating Contract (see `AGENTS.md`) |
| Model routing | Bounded within Intelligence Plane only |

### DevOps
| Tool | Purpose |
|---|---|
| GitHub | Version control, PRs, code review |
| GitHub Actions | CI/CD (to be configured) |
| Environment files | `.env.local`, `.env.staging`, `.env.production` — **never committed** |

---

## 4. System Architecture

ZoikoVertex is built on a **Three-Plane Architecture Model**.

### 4.1 Control Plane
Governs the system. Handles identity, tenant config, policy management, autonomy settings, approval workflows, governance actions, and executive controls.

Prioritises: consistency, security, authorization, auditability, deterministic behaviour.

### 4.2 Data Plane
Carries operational load. Handles ingestion from third-party systems, event normalisation, telemetry, financial computations, attribution jobs, and high-volume updates.

Prioritises: throughput, retry isolation, connector resilience, scalable ingestion.

### 4.3 Intelligence Plane
Where agent reasoning, simulation, scoring, optimisation, and recommendation generation occur. It is **bounded and governed** — not a free AI sandbox.

Prioritises: policy-awareness, observability, model controls, confidence estimation.

> **Why three planes?** It prevents governance workflows from being entangled with high-volume ingestion and heavy AI compute. Reliability, security, incident isolation, and scaling are all cleaner this way.

### 4.4 Runtime Shape

| Runtime Area | Shape |
|---|---|
| Control Plane | Modular monolith (faster delivery, stronger consistency) |
| Data Plane | Async workers + event pipelines |
| Intelligence Plane | Bounded AI compute services |

---

## 5. The Execution Flow (Memorise This)

```
Agent → Intent API → Event Emission → Decision Engine → Governance Engine → Execution → Event Logging → Data Storage
```

**What this means in plain English:**

1. An agent or user submits an **intent** (e.g. "optimise this campaign")
2. The Intent API emits an **event**
3. The **Decision Engine** scores and classifies the action
4. The **Governance Engine** applies policy — this is a hard gate, it cannot be bypassed
5. Only after governance approval does **Execution** happen
6. Every action is **logged as an event** and written to **data storage**

> **Hard rule:** No agent, no API call, no shortcut may skip any step in this flow. Any code that allows bypassing is a defect, not a feature.

---

## 6. Bounded Contexts — Who Owns What

Each domain owns its data. No domain mutates another domain's data directly.

| Domain | What It Owns | What It Must NOT Do |
|---|---|---|
| Organisation & Identity | Users, tenants, workspaces, roles, auth, sessions | Own campaign logic or billing |
| Content & Asset | Content objects, variants, templates, asset versions | Publishing, campaign deployment, metrics |
| Campaign & Execution | Campaign state, schedules, execution jobs, receipts | Decision scoring, policy interpretation |
| Channel & Platform | External platform abstraction (Meta, Google, etc.), connector bindings | Business campaign logic, financial calculations |
| Audience & Behavioural Intelligence | Contacts, segments, engagement history, scoring | Campaign deployment, spend movement |
| Decision Engine | Decision objects, confidence scores, risk scores, rationale | Execute actions directly |
| Governance & Policy | Policy evaluation, approvals, audit evidence, enforcement | Be bypassable under any condition |
| Attribution & Revenue Intelligence | Spend, revenue, attribution paths, ROI, reconciliation | Own execution or campaign logic |
| Orchestration | Workflow coordination, sequencing, escalation | Hold business state |

> **Rule:** If you're writing code that reaches into another domain's database table directly — stop. It should go through that domain's API or event contract.

---

## 7. Repository Structure

> **Note:** This is the recommended structure. Confirm with the team before deviating.

```
zoikovertex/
├── apps/
│   ├── api/                  # Backend — Control Plane (modular monolith)
│   │   ├── src/
│   │   │   ├── domains/      # One folder per bounded context
│   │   │   │   ├── identity/
│   │   │   │   ├── campaigns/
│   │   │   │   ├── decisions/
│   │   │   │   ├── governance/
│   │   │   │   └── ...
│   │   │   ├── events/       # Event definitions and emitters
│   │   │   ├── queues/       # Kafka consumers and producers
│   │   │   └── shared/       # Shared types, middleware, utils
│   │   └── tests/
│   ├── web/                  # Frontend app
│   └── workers/              # Async data plane workers
├── packages/
│   ├── types/                # Shared TypeScript types
│   └── config/               # Shared config (non-secret)
├── ai/
│   ├── agents/               # Agent definitions and contracts
│   ├── pipelines/            # AI pipeline logic (Naresh + Harsha)
│   └── prompts/              # Prompt templates (versioned)
├── infra/                    # Infrastructure config (Docker, CI)
├── docs/                     # Architecture docs (the source docs live here)
├── GUIDE.md                  # This file
├── RULES.md                  # Git and collaboration rules
└── AGENTS.md                 # AI agent operating guide
```

---

## 8. Environment Setup

### Step 1 — Clone the repo
```bash
git clone https://github.com/your-org/zoikovertex.git
cd zoikovertex
```

### Step 2 — Install dependencies
```bash
npm install
```

### Step 3 — Set up environment variables
```bash
cp .env.example .env.local
# Fill in your values — ask team for secrets
```

> **Never commit `.env` files. Never. Ever.**

### Step 4 — Start local services (Docker)
```bash
docker-compose up -d
# This starts: PostgreSQL, Redis, Kafka (local)
```

### Step 5 — Run the API
```bash
npm run dev --workspace=apps/api
```

### Step 6 — Verify
- API running at `http://localhost:3000`
- Health check: `GET /health`

> If anything is broken in setup, ping Team. Do not guess your way through environment issues.

---

## 9. Phase 1 Status

**Phase 1 is LOCKED.**

The following architecture documents are finalised and must not be changed without a formal architectural review:

| # | Document | Status |
|---|---|---|
| 1 | Domain & Bounded Contexts | ✅ Locked |
| 2 | Governance Engine | ✅ Locked |
| 3 | Decision Engine | ✅ Locked |
| 4 | Data Model & Database Architecture | ✅ Locked |
| 5 | Event Taxonomy & Contracts | ✅ Locked |
| 6 | API Architecture | ✅ Locked |
| 7 | Agent Operating Contract | ✅ Locked |

> If you believe a locked doc needs to change, raise it with the Team. Do not silently deviate.

---

## 10. Phase Roadmap by Developer

> Detailed task-level roadmaps are in each developer's personal roadmap file. This is the high-level view.

### Minit (Full Stack + AI Automation)
- Phase 1: Repo setup, database schema (PostgreSQL), environment + CI skeleton
- Phase 2: Core API layer (Intent, Query, Control APIs), authentication, multi-tenancy
- Phase 3: Frontend foundations, AI workflow integration, PR review ownership

### Vignesh (Full Stack)
- Phase 1: Frontend setup, component library, routing
- Phase 2: UI-to-backend contract implementation, dashboard views, approval flows
- Phase 3: Integration with live API layer, performance optimisation

### Naresh (AI Engineer)
- Phase 1: Agent registration system, AI pipeline scaffolding
- Phase 2: Governance engine integration, policy enforcement layer
- Phase 3: Agent orchestration, cross-agent coordination

### Harsha (AI Engineer)
- Phase 1: Decision Engine core (scoring, classification, admissibility)
- Phase 2: Confidence estimation, risk scoring, decision rationale generation
- Phase 3: Simulation + forecasting loops, optimisation integration

---

*Last updated: May 2026 | Maintained by: Minit*
