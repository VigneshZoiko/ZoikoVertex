# ZoikoVertex — AGENTS.md
## AI Agent Operating Guide

> **Who this is for:** Every developer on the team.
> AI is a collaborator on ZoikoVertex — not a vending machine, not an autopilot.
> This document defines how we work with AI tools, how agents behave inside ZoikoVertex, and what rules govern both.

---

## Table of Contents
1. [Our Philosophy on AI](#1-our-philosophy-on-ai)
2. [How Developers Use AI (The Right Way)](#2-how-developers-use-ai-the-right-way)
3. [AI Tools We Use](#3-ai-tools-we-use)
4. [ZoikoVertex Agent Architecture (What We're Building)](#4-zoikovertex-agent-architecture-what-were-building)
5. [Agent Identity & Registration Rules](#5-agent-identity--registration-rules)
6. [Agent Authority Model](#6-agent-authority-model)
7. [Agent Autonomy Levels](#7-agent-autonomy-levels)
8. [The Absolute Execution Rule](#8-the-absolute-execution-rule)
9. [What Agents Can and Cannot Do](#9-what-agents-can-and-cannot-do)
10. [AI Code Review Checklist](#10-ai-code-review-checklist)
11. [Prompt Discipline](#11-prompt-discipline)

---

## 1. Our Philosophy on AI

Most developers use AI in one of two ways:

**Way 1:** "Build me the whole thing." → They get a pile of code they don't understand, can't explain, and can't maintain.

**Way 2:** They refuse to use it at all, thinking it's a crutch.

**We do neither.**

On ZoikoVertex, AI is **hired, not prompted**. That means:

- AI has a role, a scope, and rules it operates within
- AI output is reviewed before it's merged — always
- AI teaches and assists; it does not replace understanding
- When AI generates code, the developer who merges it owns it

> If you merge AI-generated code you don't understand, you own the bug when it ships.

This philosophy applies both to **how developers use AI tools** and to **how agents behave inside ZoikoVertex itself**.

---

## 2. How Developers Use AI (The Right Way)

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
- Generate secrets, credentials, or auth logic without a thorough review
- Override architectural decisions that are locked in the docs

### The review rule:
Before merging AI-generated code, you must be able to answer:
1. What does this code do, line by line?
2. Does it follow our domain boundaries?
3. Does it respect the governance and execution rules?
4. Have I tested it?

If you can't answer all four — don't merge.

---

## 3. AI Tools We Use

| Tool | Who uses it | For what |
|---|---|---|
| Claude (Anthropic) | All developers | Architecture reasoning, code review, documentation, debugging |
| GitHub Copilot / Cursor | All developers | In-editor autocomplete and code generation |
| AI pipeline tools (TBD) | Naresh + Harsha | Agent runtime, orchestration, model routing |

> When a new AI tool is introduced to the team workflow, it must be noted here. Don't silently add tools that interact with production data.

---

## 4. ZoikoVertex Agent Architecture (What We're Building)

This section is for Naresh and Harsha primarily, but everyone should understand it.

### What is an agent in ZoikoVertex?

An agent is **not** an autonomous AI that does whatever it wants.

An agent in ZoikoVertex is a **bounded, stateful, policy-constrained intent generator**. It proposes actions. It does not execute them freely.

```
Agent → Intent API → Decision Engine → Governance Engine → Economic Engine → Execution Services
```

Every agent:
- Has a registered identity with a unique `agent_id`
- Operates under a versioned contract (`contract_version`)
- Has explicit authority limits (financial, operational, temporal, strategic)
- Has an autonomy level (D0–D3, see below)
- Cannot bypass the Governance Engine — ever

### Agent Types:
| Type | Purpose |
|---|---|
| `optimizer` | Improves campaign performance within set parameters |
| `executor` | Carries out approved actions on external platforms |
| `analytics` | Analyses data and surfaces insights |
| `governance` | Monitors policy compliance and flags violations |
| `experiment` | Runs A/B tests and simulations |

---

## 5. Agent Identity & Registration Rules

Every agent must be registered before it can do anything.

```json
{
  "agent_id": "UUID",
  "agent_name": "string",
  "agent_type": "optimizer | executor | analytics | governance | experiment",
  "org_id": "UUID",
  "workspace_ids": ["UUID"],
  "contract": {
    "contract_version": "v1.0",
    "schema_version": "v1",
    "policy_version": "v1"
  },
  "state": "ACTIVE | PAUSED | DEGRADED | SUSPENDED | TERMINATED",
  "autonomy_level": "D0 | D1 | D2 | D3"
}
```

**Rules:**
- No unregistered or anonymous agent may submit intents
- Every agent must reference a versioned contract
- Agent state must be stored in PostgreSQL and is immutable once set
- All state changes must emit events to Kafka

---

## 6. Agent Authority Model

Every agent has four authority dimensions. It cannot exceed any of them.

```json
{
  "authority": {
    "financial": {
      "daily_limit": 1000,
      "per_action_limit": 200
    },
    "operational": {
      "max_actions_per_hour": 5,
      "max_parallel_actions": 2
    },
    "temporal": {
      "cooldown_seconds": 300,
      "execution_window": ["09:00-18:00"]
    },
    "strategic": {
      "allowed_domains": ["ads", "email"],
      "allowed_channels": ["meta", "google"]
    }
  }
}
```

**Enforcement:**
- Decision Engine validates authority before approving any decision
- Execution Services revalidate authority before dispatching any action
- Authority violations are hard rejects — they are logged and audited, not silently dropped

---

## 7. Agent Autonomy Levels

| Level | Name | Meaning |
|---|---|---|
| D0 | Advisory only | Agent suggests. Human must approve everything. |
| D1 | Supervised execution | Agent executes low-risk actions. Medium-risk requires approval. |
| D2 | Governed autonomy | Agent executes within defined parameters. High-risk actions require approval. |
| D3 | Full autonomy | Agent operates within all pre-approved limits. Emergency override always available. |

> **Default for new agents: D0.** Autonomy levels must be explicitly elevated after validation. Don't register agents at D2 or D3 without Team's sign-off.

---

## 8. The Absolute Execution Rule

This is the most important rule in the system. Read it twice.

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

If you are building agent logic and find yourself writing code that calls an external API (Meta, Google, Stripe, etc.) directly from the agent — stop. That call must go through the Channel & Platform domain via the Execution Services layer.

---

## 9. What Agents Can and Cannot Do

### ✅ Agents CAN:
- Submit intents via the Intent API
- Read approved data from Query APIs
- Generate decision candidates for the Decision Engine to evaluate
- Emit structured outputs (recommendations, scores, explanations)
- Trigger simulation runs within approved budgets

### ❌ Agents CANNOT:
- Call external APIs (Meta, Google, Shopify, etc.) directly
- Mutate database state directly
- Approve their own decisions
- Override governance policy
- Operate outside their registered `workspace_ids`
- Execute financial actions beyond their `daily_limit` or `per_action_limit`
- Run in `SUSPENDED` or `TERMINATED` state (Execution Services will reject them)

---

## 10. AI Code Review Checklist

Use this checklist before merging any AI-generated code — whether it's agent logic, backend code, or frontend components.

### For all AI-generated code:
- [ ] I have read every line of this code
- [ ] I can explain what it does if asked
- [ ] It follows our domain boundaries (no cross-domain direct mutations)
- [ ] No secrets, API keys, or credentials are hardcoded
- [ ] It has been tested locally
- [ ] Errors are handled (no silent failures)
- [ ] It doesn't introduce any dependencies I haven't vetted

### For AI-generated agent logic specifically:
- [ ] The agent is registered with a valid `agent_id`
- [ ] The agent operates within its declared authority limits
- [ ] All external API calls go through Channel & Platform domain
- [ ] No execution happens before governance clearance
- [ ] State changes emit events to Kafka
- [ ] The agent cannot exceed its autonomy level

---

## 11. Prompt Discipline

> This section is especially relevant for Team's AI automation workflow.

### When prompting AI for code, always include context:
- What system you're building (ZoikoVertex — governed execution platform)
- Which domain or layer you're working in
- What constraints apply (bounded context rules, governance rules)
- What you already have (share relevant code)
- What you want the AI NOT to do ("don't call external APIs directly")

### Prompting pattern that works well:

```
Context: I'm building [specific domain] in ZoikoVertex, a governed digital marketing OS.
Constraint: [state the relevant rule from the architecture docs]
I have: [paste relevant existing code or schema]
I need: [specific, scoped ask]
Do not: [state what you want avoided]
```

### Prompting that leads to problems:
```
Build me the whole decision engine
```
```
Write the full agent orchestration system
```

> Scope your prompts. Ask for one layer at a time. Review what you get before asking for the next piece.

---

*Last updated: May 2026 | Maintained by: Minit*
