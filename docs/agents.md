# ZoikoVertex — AGENTS.md
## AI Agent Operating Guide

> **Who this is for:** Every developer on the team.
> AI is a governed collaborator on ZoikoVertex — not an autopilot, not a vending machine.
> This document defines how developers use AI tools and how agents behave inside ZoikoVertex.

---

## Table of Contents
1. [Our Philosophy on AI](#1-our-philosophy-on-ai)
2. [How Developers Use AI](#2-how-developers-use-ai)
3. [AI Tools We Use](#3-ai-tools-we-use)
4. [ZoikoVertex Agent Architecture](#4-zoikovertex-agent-architecture)
5. [Agent Types](#5-agent-types)
6. [Agent Identity & Registration](#6-agent-identity--registration)
7. [Agent Authority Model](#7-agent-authority-model)
8. [Agent Autonomy Levels (L0–L6)](#8-agent-autonomy-levels-l0l6)
9. [Human-in-the-Loop (HITL) Triggers](#9-human-in-the-loop-hitl-triggers)
10. [The Absolute Execution Rule](#10-the-absolute-execution-rule)
11. [What Agents Can and Cannot Do](#11-what-agents-can-and-cannot-do)
12. [Kill Switch System](#12-kill-switch-system)
13. [Multi-Agent Coordination](#13-multi-agent-coordination)
14. [Agent Trust & Performance Model](#14-agent-trust--performance-model)
15. [AI Code Review Checklist](#15-ai-code-review-checklist)
16. [Prompt Discipline](#16-prompt-discipline)

---

## 1. Our Philosophy on AI

Most systems treat AI in one of two ways:

**Way 1:** "Build me the whole thing." → Pile of code no one understands or can maintain.

**Way 2:** Refuse to use it, thinking it's a crutch.

**We do neither.**

On ZoikoVertex, AI is **hired, not prompted**. That means:

- AI has a role, a scope, and rules it operates within
- AI output is reviewed before it's merged — always
- AI agents propose actions — they do not execute freely
- When AI generates code, the developer who merges it owns it

> If you merge AI-generated code you don't understand, you own the bug when it ships.

This applies to both **how developers use AI tools** and **how agents behave inside ZoikoVertex**.

---

## 2. How Developers Use AI

### ✅ DO use AI for:
- Generating boilerplate (schemas, CRUD stubs, test scaffolds)
- Explaining unfamiliar code or concepts
- Drafting a first version of logic you then review and refine
- Writing documentation or commit messages
- Debugging with context ("here's the error, here's the function")
- Code review suggestions

### ❌ DO NOT use AI to:
- Generate entire features without reading what was produced
- Bypass understanding of a domain you haven't learned yet
- Generate secrets, credentials, or auth logic without thorough review
- Override architectural decisions that are locked in the docs

### Before merging AI-generated code, you must be able to answer:
1. What does this code do, line by line?
2. Does it follow our domain boundaries?
3. Does it respect governance and execution rules?
4. Have I tested it?

If you can't answer all four — don't merge.

---

## 3. AI Tools We Use

| Tool | Who uses it | For what |
|---|---|---|
| Claude (Anthropic) | All developers | Architecture reasoning, code review, documentation, debugging |
| GitHub Copilot / Cursor | All developers | In-editor autocomplete and code generation |
| AI pipeline tools (TBD) | Naresh + Harsha | Agent runtime, orchestration, model routing |

> When a new AI tool is introduced, note it here. Don't silently add tools that interact with production data.

---

## 4. ZoikoVertex Agent Architecture

### What is an agent in ZoikoVertex?

An agent is **not** an autonomous AI that does whatever it wants.

An agent is a **bounded, stateful, policy-constrained intent generator**. It proposes actions. It does not execute them freely.

```
Agent → Intent API → Decision Engine → Governance Engine → Economic Engine → Execution Services
```

Every agent:
- Has a registered identity with a unique `agent_id`
- Operates under a versioned contract (`contract_version`)
- Has explicit authority limits across four dimensions
- Has an autonomy level (L0–L6)
- Cannot bypass the Governance Engine — ever
- Cannot execute actions without a `decision_status = APPROVED` and `governance_status = PASSED`

---

## 5. Agent Types

| Type | Purpose |
|---|---|
| `content` | Generates and manages content objects |
| `creative_brief` | Drafts creative direction and briefs |
| `research` | Analyses data and surfaces insights |
| `optimization` | Improves campaign performance within set parameters |
| `response` | Handles response generation for specific triggers |
| `governance` | Monitors policy compliance and flags violations |
| `brand_alignment` | Enforces brand standards and content rules |
| `publishing` | Manages publishing schedules and channel execution |
| `reporting` | Generates performance reports and summaries |
| `workflow` | Coordinates multi-step workflow execution |
| `supervisory` | Oversees and reviews other agents (enterprise only) |

---

## 6. Agent Identity & Registration

Every agent must be registered before it can do anything. No unregistered or anonymous agent may submit intents.

### Canonical Agent Object

```json
{
  "agent_id": "UUID",
  "agent_name": "string",
  "agent_type": "content | optimization | governance | workflow | supervisory | ...",
  "org_id": "UUID",
  "workspace_ids": ["UUID"],
  "contract": {
    "contract_version": "v1.0",
    "schema_version": "v1",
    "policy_version": "v1"
  },
  "state": "DRAFT | PENDING_CERTIFICATION | ACTIVE | PAUSED | DEGRADED | SUSPENDED | TERMINATED",
  "autonomy_level": "L0 | L1 | L2 | L3 | L4 | L5 | L6",
  "dri": "user_id",
  "trust_score": 0.0
}
```

### Registration Rules
- Every agent must reference a versioned contract
- Agent state is stored in PostgreSQL and state changes are immutable log entries
- All state changes must emit events to Kafka
- New agents default to `L0` — autonomy must be explicitly elevated
- Elevation above `L3` requires team sign-off and agent certification

### Agent Lifecycle
```
DRAFT → PENDING_CERTIFICATION → ACTIVE → PAUSED → SUSPENDED → TERMINATED
                                    ↑           ↓
                                DEGRADED ←──────┘
```

---

## 7. Agent Authority Model

Every agent has four authority dimensions. It cannot exceed any of them.

```json
{
  "authority": {
    "financial": {
      "daily_limit": 1000,
      "per_action_limit": 200,
      "blast_radius_cap": 5000
    },
    "operational": {
      "max_actions_per_hour": 5,
      "max_parallel_actions": 2,
      "max_execution_depth": 3
    },
    "temporal": {
      "cooldown_seconds": 300,
      "execution_window": ["09:00-18:00"]
    },
    "strategic": {
      "allowed_domains": ["content", "campaigns"],
      "allowed_channels": ["meta", "google"]
    }
  }
}
```

**Enforcement:**
- Decision Engine validates authority before approving any decision
- Execution Services revalidate authority before dispatching any action
- Authority violations are hard rejects — logged and audited, not silently dropped
- Financial blast radius is computed before any spend action proceeds

---

## 8. Agent Autonomy Levels (L0–L6)

| Level | Name | Meaning |
|---|---|---|
| L0 | Fully Manual | Agent suggests. Human approves everything. Default for new agents. |
| L1 | Supervised Advisory | Agent advises with reasoning. Human decision required for all actions. |
| L2 | Supervised Execution | Agent executes low-risk actions. Medium/high risk requires human approval. |
| L3 | Governed Autonomy | Agent executes within defined parameters. High-risk requires approval. |
| L4 | Delegated Autonomy | Agent executes all actions within pre-approved authority. Human audits after. |
| L5 | Full Autonomy (scoped) | Agent operates within all pre-approved limits. Emergency override always available. |
| L6 | Strategic Autonomy | Enterprise only. Supervisory agents with cross-agent coordination authority. |

> **Default for new agents: L0.** Levels L4+ require formal certification and team sign-off.

---

## 9. Human-in-the-Loop (HITL) Triggers

These conditions always route to a human, regardless of agent autonomy level:

| Trigger | Condition |
|---|---|
| Financial threshold | Action exceeds per-action limit or daily limit |
| Novel action | Agent encounters action type it has not previously executed |
| Trust score drop | Agent trust score falls below threshold (< 0.6) |
| Policy conflict | Proposed action conflicts with active governance policy |
| Irreversibility flag | Action cannot be undone (e.g. published content, sent budget) |
| Blast radius exceeded | Projected impact exceeds pre-approved blast radius cap |
| Collusion detection | System detects agent-human rubber-stamping pattern |
| Emergency lock | Any Level 1–4 emergency autonomy lock is active |

HITL reviews are surfaced in the approval queue in the UI. Agents in `PAUSED` or `SUSPENDED` state cannot submit new intents.

---

## 10. The Absolute Execution Rule

This is the most important rule in the system.

```
No agent may call external APIs directly.
No agent may mutate system state directly.
No agent may cause financial or operational execution outside the governed system path.
```

The only valid execution path is:

```
Agent → Intent API → Decision Engine → Governance Engine → Economic Engine → Execution Services
```

**Any code that allows an agent to bypass one of these layers is a defect, not a feature.**

If you are building agent logic and find yourself writing code that calls Meta, Google, Stripe, or any external API directly from the agent — stop. That call must go through the Channel & Platform domain via the Execution Services layer.

---

## 11. What Agents Can and Cannot Do

### ✅ Agents CAN:
- Submit intents via the Intent API
- Read approved data from Query APIs
- Generate decision candidates for the Decision Engine to evaluate
- Emit structured outputs (recommendations, scores, explanations)
- Trigger simulation runs within approved budgets
- Coordinate with other agents via Orchestration layer (not direct calls)

### ❌ Agents CANNOT:
- Call external APIs (Meta, Google, Shopify, etc.) directly
- Mutate database state directly
- Approve their own decisions
- Override governance policy
- Operate outside their registered `workspace_ids`
- Execute financial actions beyond `daily_limit` or `per_action_limit`
- Run in `SUSPENDED` or `TERMINATED` state (Execution Services will reject)
- Review their own output (creator/approver separation is enforced)
- Supervise themselves (recursive supervision is blocked)

---

## 12. Kill Switch System

Four levels of emergency control available to authorised operators:

| Level | Scope | Who Can Trigger |
|---|---|---|
| Level 1 — Agent pause | Pauses a single agent | DRI, Workspace Admin |
| Level 2 — Workspace freeze | Suspends all agents in a workspace | Workspace Admin, Org Admin |
| Level 3 — Org-wide lock | Halts all autonomous execution in an org | Org Admin, Platform Owner |
| Level 4 — Global kill | Stops all agent execution across the platform | Platform Owner only |

Kill switch actions are logged, immutable, and emit events. Active kill switches surface in the Control API and admin UI.

---

## 13. Multi-Agent Coordination

Agents coordinate via the Orchestration domain — not by calling each other directly.

```
Workflow Instance → Orchestration Engine → Stage 1 Agent → Stage 2 Agent → ...
                                          ↓ (each stage)
                                    Intent API → Decision Engine → Governance → Execution
```

### Rules:
- Supervisory agents (L6 only) may review and gate other agents' outputs
- No agent may trigger another agent directly — all coordination goes through Workflow Instances
- Each stage in a workflow has its own governance gate
- Partial execution is handled by the compensation model — completed stages are not re-run

---

## 14. Agent Trust & Performance Model

Every agent accumulates a **Trust Score** (0.0–1.0) based on:

| Signal | Weight |
|---|---|
| Governance pass rate | High |
| Decision acceptance rate | High |
| Human override rate | High (negative) |
| Faithfulness to source data | High |
| Financial accuracy | Medium |
| Execution error rate | Medium (negative) |

Trust scores gate autonomy elevation. An agent's autonomy level cannot be elevated unless its trust score exceeds the threshold for the target level.

**Faithfulness Score:** Tracks whether agent outputs are grounded in source data and policy — not hallucinated or fabricated. Required for all content and recommendation outputs.

---

## 15. AI Code Review Checklist

Use before merging any AI-generated code — agent logic, backend code, or frontend components.

### For all AI-generated code:
- [ ] I have read every line of this code
- [ ] I can explain what it does if asked
- [ ] It follows our domain boundaries (no cross-domain direct mutations)
- [ ] No secrets, API keys, or credentials are hardcoded
- [ ] It has been tested locally
- [ ] Errors are handled (no silent failures)
- [ ] No unvetted new dependencies introduced

### For AI-generated agent logic specifically:
- [ ] Agent is registered with a valid `agent_id`
- [ ] Agent operates within its declared authority limits
- [ ] All external API calls go through Channel & Platform domain
- [ ] No execution happens before Decision Engine + Governance clearance
- [ ] State changes emit events to Kafka
- [ ] Agent cannot exceed its autonomy level
- [ ] HITL triggers are properly implemented
- [ ] Kill switch signals are respected

---

## 16. Prompt Discipline

> Especially relevant for Naresh and Harsha's AI automation workflow.

### When prompting AI for code, always include:
- What system you're building (ZoikoVertex — governed agentic digital marketing OS)
- Which domain or layer you're working in
- What constraints apply (bounded context rules, governance rules)
- What you already have (share relevant code)
- What you want the AI NOT to do ("don't call external APIs directly")

### Prompting pattern that works:

```
Context: I'm building [specific domain] in ZoikoVertex, a governed agentic digital marketing OS.
Constraint: [state the relevant rule from the architecture docs]
I have: [paste relevant existing code or schema]
I need: [specific, scoped ask]
Do not: [state what you want avoided]
```

### Prompting that causes problems:
```
Build me the whole decision engine
Write the full agent orchestration system
```

> Scope your prompts. Ask for one layer at a time. Review before asking for the next piece.

---

*Last updated: May 2026 | Maintained by: Minit*
