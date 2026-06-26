# Evidence Layer — How It Works

> **Simple explanation:** The Evidence Layer is your platform's **black box recorder + investigation desk + evidence locker** all in one. Every important action is automatically recorded, nothing can be erased, and serious events trigger investigations.

---

## The Three Pages (What You See)

| Page | What It Is |
|---|---|
| **Activity Log** | A live feed of everything important that happened — who did what, when, and whether it succeeded or failed |
| **Investigations** | Cases opened automatically when something serious happens (blocked publish, policy violation, security event) |
| **Evidence Vault** | A secure locker where you preserve specific records permanently, apply legal holds, and package evidence for export |

---

## What Data Comes In (INPUT)

Data flows into the Evidence Layer from **every part of the platform**. It's all automatic — nobody has to manually "log" anything.

### 1. The Activity Log receives events from everywhere

Every time any of these happens, the system **automatically writes an audit event**:

| Source | Examples of What Triggers It |
|---|---|
| **AI Agents** | Agent creates content, edits a post, gets blocked by a policy, publishes something |
| **Users** | Someone logs in, approves/rejects content, changes settings, overrides a policy |
| **Approvals** | An approval chain completes, gets rejected, escalated, or overridden |
| **Publishing** | A post is scheduled, published, archived, or fails to publish |
| **Safety System** | A policy rule blocks an action, an exception is logged, a safety signal fires |
| **Governance** | Roles change, permissions update, break-glass activated |
| **Security** | Failed login attempt, API key generated/revoked, suspicious activity detected |
| **The Evidence system itself** | When evidence is preserved, a legal hold is applied, a case is opened/closed — even those actions get logged |

### 2. The Evidence Intelligence Worker watches the Activity Log

A background robot runs **every 2 minutes** and scans recent audit events. It looks for:

- **High/Critical events that FAILED or were BLOCKED** (e.g. "Publish blocked by policy")
- **Critical events that SUCCEEDED** (e.g. a dangerous action that went through)

When it finds one, it:
1. Asks **Groq (AI)** to analyze the event and suggest a title, severity, and case type
2. **Creates an investigation case** automatically
3. **Preserves the event** as evidence in the Vault
4. **Finds related events** (within ±10 minutes) and attaches them as context
5. **Auto-applies legal hold** if it's critical enough
6. **Assigns** the first available reviewer
7. **Notifies** them

> **Result:** Every time something important or risky happens, a case gets auto-created — you don't need to do anything.

### 3. Evidence Vault receives items from anywhere

Evidence can be:
- **Auto-preserved** by the Intelligence Worker when a case is created
- **Manually preserved** by clicking "Preserve" in the Vault (you provide a source ID and reason)
- **Preserved from Investigations** by sending case evidence to the vault

---

## What Happens Inside (CONTROL)

### The Activity Log is a tamper-evident chain

Every event references the previous event's hash (like a mini blockchain):

```
Event 1 → Event 2 → Event 3 → Event 4
  hash=A    hash=B    hash=C    hash=D
            prev=A    prev=B    prev=C
```

This means:
- **Nothing can be edited or deleted** — it's append-only
- **Any tampering is detectable** — the system can verify the chain and report broken links

The **Identity Ledger** connects actors (humans, AI agents, system accounts) to their actions. So every event shows **who** did it, **what** their role was at that exact moment, and what authority they used.

### Investigations track the full lifecycle

Each case has:
- **Timeline** — every action taken on the case (created, assigned, evidence added, notes, closed)
- **Evidence** — items attached to the case for review
- **Legal hold** — can freeze a case so nothing can be deleted
- **Status flow** — New → Triage → Investigation → Legal Review → Remediation → Validation → Closed
- **SLA** — critical cases must be resolved in 15 minutes, high in 3 business days

### Evidence Vault controls retention

Items in the vault can be:
- **Preserved** — stored with a reason and retention date
- **Sealed** — made tamper-evident with cryptographic proof
- **Legal hold** — frozen by legal order, cannot be deleted or altered
- **Packaged** — grouped into export bundles (regulatory response, litigation, board report, etc.)
- **Exported** — with a manifest, hashes, and audit trail

---

## What Data Goes Out (OUTPUT)

### What users can see

| Page | Data Displayed |
|---|---|
| **Activity Log** | Events sorted by risk (critical first), with title, summary, actor, time ago, and result (success/failed/blocked) |
| **Activity Log detail** | Full story in plain English: what happened, by who, when, and the result |
| **Investigations list** | Open cases with severity dot, title, type, status, date |
| **Investigations detail** | Case info (severity/status/type/owner), activity feed (timeline + evidence merged), Apply Hold / Close Case buttons |
| **Evidence Vault** | Tabs: Evidence items (type/source/status/reason/date), Legal Holds (matter/scope/reason/status), Packages (title/type/status/items) |

### What can be exported

- **Audit trail exports** — JSON/CSV of audit events
- **Evidence packages** — PDF/JSON/ZIP bundles with manifest, hashes, and integrity proof
- **Case exports** — full investigation records with timeline, evidence, notes, tasks, and closure
- **Export receipts** — proof of what was exported and when

### What integrations use this data

- **SIEM systems** — critical forensic cases can be routed to external security monitoring
- **EventBridge** — internal event bus that fires when cases are created/closed (other systems can listen)
- **Webhooks** — external systems can subscribe to audit events

---

## Summary Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      Everywhere in the Platform                 │
│  (Agents, Users, Approvals, Publishing, Safety, Security...)    │
└─────────────────────────┬───────────────────────────────────────┘
                          │  (auto-logs events)
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                     ACTIVITY LOG                                 │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Tamper-evident chain of every important action             │ │
│  │  actor · action · object · result · timestamp               │ │
│  └──────────────────────┬─────────────────────────────────────┘ │
└─────────────────────────┼────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│  Evidence Intelligence Worker (runs every 2 min)                │
│  Scans for high/critical events → creates cases                 │
└────────────┬─────────────────────────────────────┬──────────────┘
             │                                     │
             ▼                                     ▼
┌──────────────────────────┐     ┌──────────────────────────────┐
│    INVESTIGATIONS         │     │    EVIDENCE VAULT            │
│  (Forensic Hub)          │     │  (Evidence locker)           │
│                          │     │                              │
│  Cases with:             │────►│  Items preserved here         │
│  • Timeline              │     │  • Legal holds               │
│  • Evidence              │     │  • Packages/Exports           │
│  • Notes/Tasks           │     │  • Chain-of-custody          │
│  • Status tracking       │     │                              │
│  • SLA enforcement       │     │                              │
└──────────────────────────┘     └──────────────────────────────┘
```

---

## The Key Principle in One Sentence

> **Everything is recorded automatically. If it matters, it gets logged. If it's risky, a case gets opened. If you need to keep it, it goes in the vault. Nothing can be erased.**
