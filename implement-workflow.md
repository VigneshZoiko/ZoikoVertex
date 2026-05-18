# ZoikoVertex — Complete Implementation Workflow

---

## Table of Contents

1. [Platform Overview](#1-platform-overview)
2. [The 5 Operational Layers](#2-the-5-operational-layers)
3. [Layer 1 — Authority Layer (Agent Studio)](#3-layer-1--authority-layer-agent-studio)
4. [Layer 2 — Safety Layer (Autonomy Control Center)](#4-layer-2--safety-layer-autonomy-control-center)
5. [Layer 3 — Accountability Layer (Review & Approval Queue)](#5-layer-3--accountability-layer-review--approval-queue)
6. [Layer 4 — Evidence Layer (Audit, Forensic, Evidence Vault)](#6-layer-4--evidence-layer-audit-forensic-evidence-vault)
7. [Layer 5 — Execution Layer (Content Posting Flow)](#7-layer-5--execution-layer-content-posting-flow)
8. [How All Layers Connect — Full End-to-End Flow](#8-how-all-layers-connect--full-end-to-end-flow)
9. [Role-Based Workflows](#9-role-based-workflows)
10. [Page-by-Page Reference](#10-page-by-page-reference)
11. [API Endpoints Reference](#11-api-endpoints-reference)

---

## 1. Platform Overview

ZoikoVertex is an **enterprise AI marketing operating system** where autonomous AI agents create and publish content across social media, with humans keeping full governance control through 5 layered systems.

**Tech Stack:**
- **Frontend** — Next.js (React 19, TypeScript, Tailwind CSS)
- **Backend** — Node.js / Express 5, TypeScript
- **Database** — Supabase (PostgreSQL + Auth + Storage)
- **Queue** — BullMQ + Redis (job scheduling)
- **AI** — Google Gemini 2.5 Flash + OpenAI
- **Auth** — Supabase JWT tokens on every request
- **Deploy** — Vercel (frontend) + GitHub Actions (CI/CD)

**Social Platforms:** Facebook, Instagram, LinkedIn, TikTok, YouTube, Twitter/X, Pinterest, Threads

---

## 2. The 5 Operational Layers

```
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 1 — AUTHORITY LAYER                                      │
│  /agents/studio                                                 │
│  Who: AGENT_ARCHITECT, GOVERNANCE_ADMIN                         │
│  → Build, register, certify, and control AI agents             │
│  → Set agent identity, type, DRI, trust scores                 │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 2 — SAFETY LAYER                                         │
│  /agents/autonomy                                               │
│  Who: GOVERNANCE_ADMIN                                          │
│  → Set L0–L6 autonomy per agent                                │
│  → Configure HITL rules, emergency locks, negative knowledge   │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 3 — ACCOUNTABILITY LAYER                                 │
│  /queue  /governance/approvals  /governance/rules               │
│  Who: REVIEWER, VALIDATOR, APPROVER, BRAND_REVIEWER            │
│  → Human-in-the-loop review of every content intent            │
│  → Approve / Return / Reject / Escalate / Block                │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 4 — EVIDENCE LAYER                                       │
│  /governance/audit  /governance/evidence  /governance/forensic  │
│  Who: AUDITOR, COMPLIANCE_REVIEWER                              │
│  → Tamper-evident audit trail of all actions                   │
│  → Exportable evidence packs for legal/regulatory reporting    │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 5 — EXECUTION LAYER                                      │
│  /publish  /library  /calendar  /manage-posts                   │
│  Who: CREATOR, CAMPAIGN_MANAGER, PUBLISHER                      │
│  → Create media, write captions, submit posts                  │
│  → AI generates captions, schedules, fires to social platforms │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Layer 1 — Authority Layer (Agent Studio)

**Page:** `/agents/studio`
**Who operates it:** AGENT_ARCHITECT, ADMIN, GOVERNANCE_ADMIN
**Purpose:** The authority over which AI agents exist, what they can do, and their current certification level.

---

### What the Agent Studio Shows

```
Header bar:
  [KILL SWITCH] ← instantly suspends ALL agents in the workspace
  [Refresh]
  [Hire New Agent] ← opens Create Agent Wizard

Stats row:
  Active Agents | Certifications | Avg Trust Score | Risk Alerts

Agent Registry Table columns:
  Agent Identity  → Name + shortened Agent ID
  Type & DRI      → content / optimization / research / governance
                    + DRI (Directly Responsible Individual — the human owner)
  Autonomy        → L2 / L3 / L4 / L5 badge (color coded)
  Status          → ACTIVE / PAUSED / PENDING_CERTIFICATION / SUSPENDED
  Governance Scores:
    Trust Score %    → 0–100% (how reliable this agent is)
    Faithfulness %   → 0–100% (how closely it follows instructions)
  Last Activity   → "2 mins ago" / "Just now" / date
```

**Example agents from the system:**
| Agent | Type | DRI | Level | Status | Trust | Faithfulness |
|-------|------|-----|-------|--------|-------|-------------|
| Nexus Content Lead | content | Harsha R. | L4 | ACTIVE | 94% | 98% |
| Sentinel Optimizer | optimization | Minit S. | L3 | PAUSED | 88% | 92% |
| Vision Research Bot | research | Naresh K. | L5 | ACTIVE | 96% | 99% |
| Brand Guardian | governance | Harsha R. | L2 | PENDING_CERTIFICATION | 0% | 0% |

---

### Workflow: Creating a New Agent (AGENT_ARCHITECT)

```
Step 1: Click "Hire New Agent"
  → Create Agent Wizard modal opens
  → Fill in:
      Agent Name      (e.g. "Nexus Content Lead")
      Agent Type      (content / optimization / research / governance)
      DRI             (assign a human owner — the accountable person)
      Initial Level   (always starts L1 or L2 — cannot start at L3+)
      Knowledge Base  (optional — attach existing knowledge sets)
  → Submit → agent created with status PENDING_CERTIFICATION

Step 2: Agent starts at L1 (Assistive) or L2 (Creative Contributor)
  → At L1: suggestions only, human must approve everything
  → At L2: can generate drafts, human reviews before any publish

Step 3: AGENT_ARCHITECT runs Certification Sandbox
  → Click "Certify/Upgrade" (shield icon) on the agent row
  → CertificationSandbox modal opens
  → Test the agent against sample tasks
  → Trust score builds from test results
  → If trust score meets minimum threshold → eligible for upgrade

Step 4: GOVERNANCE_ADMIN approves level upgrade (L3 and above)
  → L3 needs: trust score ≥ 60%
  → L4 needs: trust score ≥ 70%
  → L5 needs: trust score ≥ 80%
  → L6 needs: trust score ≥ 90%
  → GOVERNANCE_ADMIN sets the new level via /agents/autonomy

Step 5: Agent becomes ACTIVE at new level
  → Agent can now execute within its autonomy boundaries
  → HITL rules define when it must still ask humans
```

---

### Agent Details Drawer

```
Click "View Details" (→ arrow icon) on any agent row:
  → AgentDetailsDrawer slides in from right
  → Shows:
      Full agent profile
      Current autonomy level + trust/faithfulness scores
      Execution history
      DRI contact
      Certification history
      Risk alerts (if any)
  → Actions available from drawer:
      Edit agent details
      Trigger re-certification
      View audit trail for this agent
```

---

### Global Kill Switch

```
Click "KILL SWITCH" button (red, top of page):
  → KillSwitchModal opens
  → Confirm reason for kill
  → ALL active agents suspended immediately workspace-wide
  → Status changes: ACTIVE → SUSPENDED
  → All in-progress workflows halted
  → AGENT_ARCHITECT + GOVERNANCE_ADMIN notified
  → Must be manually lifted per agent via /agents/autonomy
```

---

### Individual Agent Controls (per row)

```
[Certify/Upgrade icon] → Opens CertificationSandbox
[View Details arrow]   → Opens AgentDetailsDrawer
[Pause icon]           → Pauses that specific agent only
```

**API calls:**
- `GET /api/v1/agents?workspaceId={id}` — Fetch agent list
- `GET /api/v1/user/context` — Get workspace ID
- Kill switch, certification, details handled via modal components

---

## 4. Layer 2 — Safety Layer (Autonomy Control Center)

**Page:** `/agents/autonomy`
**Who operates it:** GOVERNANCE_ADMIN only
**Purpose:** Define the boundaries within which every agent operates. This layer cannot be bypassed by any other role.

---

### The Page Has 4 Tabs

```
[Agents] [Emergency Locks] [HITL Rules] [Negative Knowledge]
```

---

### Tab 1: Agents — Autonomy Level Control

**What it shows:**
```
Stats row:
  Total Agents | Active | Suspended | Avg Trust Score (%)

Level Reference bar (L0 → L6):
  L0 Disabled     (grey)   — no minimum trust
  L1 Assistive    (zinc)   — no minimum trust
  L2 Creative     (blue)   — no minimum trust
  L3 Guided       (amber)  — requires ≥ 60% trust
  L4 Validated    (green)  — requires ≥ 70% trust
  L5 Conditional  (teal)   — requires ≥ 80% trust
  L6 Enterprise   (indigo) — requires ≥ 90% trust

Agent cards (expandable):
  Agent name + type
  Status badge (ACTIVE / MONITORED / SUPERVISED / RESTRICTED / SUSPENDED)
  Trust score bar
  Current level badge (e.g. "L4 · Validated")
  Click ↓ to expand → shows full controls
```

**Expanded agent card shows:**
```
Trust Score panel:
  Score % with label:
    ≥90% → "Eligible L5/L6"
    ≥80% → "Stable"
    ≥70% → "Monitor"
    ≥60% → "Restrict High-Risk"
    <60%  → "Suspend Required"

Faithfulness Score panel:
  ≥92% → "Eligible for L5/L6"
  ≥85% → "Requires validation"
  <85%  → "Block from publishing"

Autonomy Level buttons (L0–L6):
  → Greyed out + disabled if trust score too low
  → Click to set new level
  → "Reason for change" text box (required — goes to audit)

Action buttons:
  [Suspend Agent] → sets L0 + SUSPENDED status immediately
  [Restore to L1] → available only if currently SUSPENDED
```

**API calls:**
- `PATCH /api/v1/autonomy/agents/{id}/level` — Change level
- `POST /api/v1/autonomy/agents/{id}/suspend` — Suspend agent
- `GET /api/v1/autonomy/stats` — Workspace-wide stats

---

### Tab 2: Emergency Locks

**Purpose:** Immediately stop autonomous agent activity at different scopes.

**Lock Levels:**
```
L1 — Agent Lock      → suspends one specific agent
L2 — Workflow Lock   → suspends a specific workflow
L3 — Workspace Lock  → suspends ALL agents in workspace
L4 — Enterprise Lock → suspends across enterprise (all workspaces)
```

**Create a lock:**
```
Click "Apply Emergency Lock" → form appears:
  Select lock level: L1 / L2 / L3 / L4
  Scope: (e.g. "Workspace", "Campaign: Brand Launch", "Agent: ag-001")
  Reason: (text — mandatory, goes to audit record)
  Click "Apply Lock" → lock immediately applied
```

**Active locks shown as:**
```
[L3 Workspace Lock] Brand Safety Incident
"All agents paused pending legal review of recent campaign content"
Applied: 18 May 2026, 14:32

[Lift] button → removes lock, agents resume
```

**API calls:**
- `GET /api/v1/autonomy/emergency-locks`
- `POST /api/v1/autonomy/emergency-locks`
- `DELETE /api/v1/autonomy/emergency-locks/{id}`

---

### Tab 3: HITL Rules (Human-in-the-Loop)

**Purpose:** Define when an agent's action MUST be routed to a human before proceeding.

**What a HITL rule looks like:**
```
[CONTENT_RISK_HIGH] → [ROUTE_TO_REVIEW] → Route to: VALIDATOR
[BRAND_RISK_DETECTED] → [REQUIRE_HUMAN] → Route to: BRAND_REVIEWER
[TRUST_SCORE_BELOW_60] → [SUSPEND_AGENT] → Route to: AGENT_ARCHITECT
[FAITHFULNESS_BELOW_85] → [BLOCK_OUTPUT] → Route to: GOVERNANCE_ADMIN
[MARKET_RISK_DETECTED] → [ESCALATE] → Route to: GOVERNANCE_ADMIN
[COLLUSION_FLAG] → [LOCK_WORKFLOW] → Route to: GOVERNANCE_ADMIN
```

**Create a HITL rule:**
```
Click "Add Rule" → form:
  Trigger     (e.g. RISK_HIGH)
  Action      (e.g. ROUTE_TO_REVIEW)
  Route to Role (e.g. VALIDATOR)
  Toggle ON/OFF per rule

Click "Create" → rule is active immediately
```

**Toggle switch** on each rule: enable/disable without deleting

**API calls:**
- `GET /api/v1/autonomy/hitl-rules`
- `POST /api/v1/autonomy/hitl-rules`
- `PUT /api/v1/autonomy/hitl-rules/{id}` (toggle enable/disable)
- `DELETE /api/v1/autonomy/hitl-rules/{id}`

---

### Tab 4: Negative Knowledge Sets (NKS)

**Purpose:** Define words, phrases, and claims the AI agents are NEVER allowed to output.

**Severity levels:**
```
BLOCK            → agent output is completely blocked (red)
ESCALATE         → flagged and routed to GOVERNANCE_ADMIN (orange)
WARN             → warning logged but output allowed (amber)
REQUIRE_APPROVAL → must get human approval before publish (blue)
```

**Create a Negative Knowledge Set:**
```
Click "Add Set" → form:
  Name             (e.g. "Healthcare Prohibited Claims")
  Scope            (e.g. "Healthcare Division, USA")
  Prohibited Terms (comma-separated list):
                   "cure, guaranteed, FDA-approved, clinically proven,
                    eliminates, treats, heals, miracle"
  Severity         BLOCK / ESCALATE / WARN / REQUIRE_APPROVAL
  Owner Role       (e.g. GOVERNANCE_ADMIN)

Submit → set active for all agents in scope
```

**Active sets shown as:**
```
Healthcare Prohibited Claims   [BLOCK]
cure · guaranteed · FDA-approved · clinically proven · +4 more
Scope: Healthcare Division · Owner: GOVERNANCE_ADMIN
```

**API calls:**
- `GET /api/v1/autonomy/negative-knowledge`
- `POST /api/v1/autonomy/negative-knowledge`
- `DELETE /api/v1/autonomy/negative-knowledge/{id}`

---

## 5. Layer 3 — Accountability Layer (Review & Approval Queue)

**Pages:** `/queue` `/governance/approvals` `/governance/rules`
**Who operates it:** REVIEWER, VALIDATOR, APPROVER, BRAND_REVIEWER, GOVERNANCE_ADMIN
**Purpose:** Every piece of content submitted goes through a human review chain matched to its risk level.

---

### The 5-Stage Approval Chain

```
Risk Score determines how many stages content must pass through:

0–20   LOW        → AUTO APPROVE (no human required)
20–40  STANDARD   → REVIEWER
40–60  ELEVATED   → REVIEWER → VALIDATOR
60–80  HIGH       → REVIEWER → VALIDATOR → APPROVER
80+    RESTRICTED → REVIEWER → VALIDATOR → APPROVER → GOVERNANCE_ADMIN
```

**Stage statuses in the database:**
```
PENDING_REVIEW        ← REVIEWER's queue
PENDING_MANAGER       ← MANAGER-level review
PENDING_VALIDATION    ← VALIDATOR's queue
PENDING_AUTHORIZATION ← APPROVER's queue
PENDING_GOVERNANCE    ← GOVERNANCE_ADMIN's queue (restricted content)
APPROVED              ← cleared for publishing
REJECTED              ← permanently denied
RETURNED              ← sent back to creator with feedback
GOVERNANCE_BLOCKED    ← blocked by governance policy
CANCELLED             ← creator cancelled
```

---

### Queue Page (`/queue`) — What Each Role Sees

```
REVIEWER sees:
  → PENDING_REVIEW items
  → PENDING_MANAGER items
  → Columns: Creator, Platform, Content preview, Media, Risk score, Time

VALIDATOR sees:
  → PENDING_VALIDATION items only
  → Items that already passed REVIEWER stage

APPROVER sees:
  → PENDING_AUTHORIZATION items
  → PENDING_ADMIN items
  → Highest-trust human gate before GOVERNANCE_ADMIN

GOVERNANCE_ADMIN sees:
  → PENDING_GOVERNANCE items (restricted/legal/compliance content)
  → All other pending statuses too

BRAND_REVIEWER sees:
  → PENDING_REVIEW items flagged with BRAND_RISK_DETECTED

ADMIN sees:
  → ALL pending items across all stages

CREATOR sees:
  → Only their own RETURNED items (revisions needed)
```

---

### Actions Available at Each Stage

```
REVIEWER actions on PENDING_REVIEW:
  [Approve]   → moves to PENDING_VALIDATION (if ELEVATED+)
                or APPROVED (if STANDARD)
  [Return]    → back to creator + types feedback note
  [Reject]    → permanently denied, creator notified
  [Escalate]  → bypasses to VALIDATOR directly

VALIDATOR actions on PENDING_VALIDATION:
  [Validate]  → moves to PENDING_AUTHORIZATION (if HIGH+)
                or APPROVED (if ELEVATED)
  [Return]    → back to creator with notes
  [Reject]    → permanently denied
  [Escalate]  → push to APPROVER

APPROVER actions on PENDING_AUTHORIZATION:
  [Authorize] → APPROVED (content cleared for publishing)
  [Block]     → GOVERNANCE_BLOCKED (cannot ever proceed)
  [Return]    → back to creator

GOVERNANCE_ADMIN actions on PENDING_GOVERNANCE:
  [Approve]   → final APPROVED
  [Block]     → permanent governance block
  [Return]    → back to creator with legal/compliance notes

Admin action (all statuses):
  POST /api/v1/governance/transition with:
    intentId, newStatus, feedback, userRole
```

---

### Approval Rules Page (`/governance/rules`)

**Who:** GOVERNANCE_ADMIN

```
Configure approval paths by:
  - Risk level threshold (0–20 / 20–40 / 40–60 / 60–80 / 80+)
  - Brand / market / division
  - Platform type (LinkedIn vs TikTok has different risk multipliers)
  - Content type (legal / financial / healthcare / political)

Set automatic approval thresholds:
  - Below score X → auto-approve without any human
  - Above score Y → always require GOVERNANCE_ADMIN
```

---

## 6. Layer 4 — Evidence Layer (Audit, Forensic, Evidence Vault)

**Pages:** `/governance/audit` `/governance/evidence` `/governance/forensic` `/integrations/identity-ledger`
**Who operates it:** AUDITOR, COMPLIANCE_REVIEWER, GOVERNANCE_ADMIN
**Purpose:** Tamper-evident, legally defensible records of every action taken in the platform.

---

### Audit Trail (`/governance/audit`)

```
Who: AUDITOR (read-only), COMPLIANCE_REVIEWER, GOVERNANCE_ADMIN

What it records (every action ever taken):
  - Who took the action (user ID + name)
  - What they did (approve, reject, upload, login, level change)
  - When (timestamp with timezone)
  - From where (IP address, device)
  - What changed (before/after state)
  - Which content/agent was affected

Examples of logged events:
  ✓ "GOVERNANCE_ADMIN changed agent Nexus to L4 — reason: certification passed"
  ✓ "REVIEWER returned intent abc-123 — feedback: 'Remove earnings reference'"
  ✓ "CREATOR uploaded media file xyz.mp4 to library"
  ✓ "AGENT_ARCHITECT applied Emergency L2 lock — reason: hallucination detected"
  ✓ "SUPERADMIN overrode approval on intent def-456"

AUDITOR cannot modify anything — read and export only
```

---

### Evidence Vault (`/governance/evidence`)

```
Who: AUDITOR, COMPLIANCE_REVIEWER

What it stores:
  One evidence pack per publish_intent, containing:
    - Original content (caption, media URLs)
    - Risk score + risk factors detected
    - Complete approval chain (who approved, when, their comments)
    - Platform publish result (success/failure, platform response)
    - Any governance blocks or HITL escalations triggered
    - All revisions and creator responses

Use cases:
  - Legal holds (freeze evidence pack so it cannot be deleted)
  - Regulatory audits (export evidence pack as PDF/JSON)
  - Dispute resolution (prove who approved what and when)
  - Brand safety reports (show governance decisions made)
```

---

### Forensic Hub (`/governance/forensic`)

```
Who: AUDITOR, COMPLIANCE_REVIEWER

Purpose: Deep incident investigation

What you can do:
  - Select a specific incident (date range, agent, content type)
  - Trace exactly what happened step by step
  - See every decision node in the approval chain
  - Identify where a policy violation originated
  - Export forensic report for legal team
```

---

### Identity Ledger (`/integrations/identity-ledger`)

```
Who: AUDITOR, DEVELOPER

Purpose: Who authenticated, when, and what API calls they made

Shows:
  - Every login event (user, IP, device, timestamp)
  - Every API key usage (which key, which endpoint, response code)
  - OAuth token refresh events (social platform connections)
  - Failed authentication attempts
```

---

## 7. Layer 5 — Execution Layer (Content Posting Flow)

**Pages:** `/publish` `/library` `/library/upload` `/calendar` `/manage-posts` `/review`
**Who operates it:** CREATOR, CAMPAIGN_MANAGER, PUBLISHER
**Purpose:** The actual content creation, AI generation, and publishing to social platforms.

---

### Phase 1 — Media Upload

**Who:** CREATOR, CAMPAIGN_MANAGER
**Where:** `/publish` → Media section OR `/library/upload` → then select from `/library`

```
Option A — Direct Upload on /publish:
  Drag-drop zone → accepts JPG, PNG, MP4, MOV
  Max sizes: images 50MB / videos 500MB

  On IMAGE upload:
    → AI (Gemini Vision) analyzes image automatically
    → Extracts: mood, themes, text, emotional depth
    → "Add AI Image Insight" button appears
    → AI Studio panel auto-opens

  On VIDEO upload:
    → System detects: width, height, duration, aspect ratio
    → Auto-detects vertical (9:16) orientation
    → Auto-switches YouTube type to "Short" if vertical + ≤3 min
    → Preview shown, no AI analysis

Option B — Library First:
  /library/upload → Title + drag-drop multiple files
  → Each file shows progress bar
  → Saved to Supabase Storage (media bucket)
  → POST /api/v1/library/upload creates library entry

  /library → Browse all assets
  → Click asset → /publish?assetUrls=[...]&assetType=...
  → Multi-file pack → carousel with thumbnail strip
  → Media Pack Manager lets creator select which files to include
```

---

### Phase 2 — Caption / Hashtags

**Who writes it:** CREATOR (manually) OR AI Agent (Gemini) OR both

```
Method A — AI Generates:
  AI Studio panel:
    Topic        → "New product launch - running shoes"
    Content Type → Entertainment / Educational / Promotional / etc.
    Tone         → Professional / Casual / Witty / Inspirational
    Length       → Short / Medium / Long
    Audience     → General / Gen Z / Professionals / etc.
    Style Mode   → MrBeast / Alex Hormozi / Apple / Nike / Startup / Minimal
    Emoji        → Toggle on/off

  Click "Generate" → POST /api/v1/ai/generate

  AI returns per-platform:
    Instagram → caption + hashtags (2200 char limit)
    Facebook  → longer caption (5000 char limit)
    X/Twitter → short punchy (280 char limit enforced)
    LinkedIn  → professional tone (3000 char limit)
    Threads   → conversational (500 char limit)
    Pinterest → discovery-focused (500 char limit)

  Also returns:
    Viral score (0–100)
    Sentiment score (Positive / Balanced)
    Suggested posting times

  Hashtags are INSIDE each platform caption
  (appended after main caption text, not a separate field)

Method B — Manual:
  Universal Mode → one textarea for all platforms
  Per-Platform Mode → separate tab per platform with char counters

Method C — AI + Manual (most common):
  Upload image → AI analyzes → "Add AI Image Insight" to Topic
  → Generate → AI writes captions
  → Creator edits and adds custom hashtags
```

---

### Phase 3 — Platform & Account Selection

**Who:** CREATOR, CAMPAIGN_MANAGER, PUBLISHER

```
"Post To" section shows all ACTIVE connected accounts:
  ☐ Facebook Page — Zoiko Brand
  ☐ Instagram Business — @zoikogroup
  ☐ LinkedIn Company — Zoiko Group
  ☐ TikTok — @zoikomarketing
  ☐ YouTube — Zoiko Channel
  ☐ Twitter/X — @zoikogroup
  ☐ Pinterest — Zoiko Board
  ☐ Threads — @zoikogroup

Per-platform post type selector:
  Instagram → Post / Reel / Story / Carousel
  YouTube   → Video / Short (auto-detected from media)
  TikTok    → Video / Photo Slide
  LinkedIn  → Post / Article / Document

Smart media metadata badge:
  "1920×1080 · Landscape (16:9) · 0.8MB"
  "720×1280 · Vertical (9:16) · 45s · 12.3MB"
```

---

### Phase 4 — Violation Check (Automatic)

**Who:** System — no human needed

```
BLOCKED (cannot submit):
  "Pinterest does not support video carousels"
  "Instagram Stories require vertical video"

WARNING (can submit, platform may downgrade):
  "YouTube Shorts require vertical orientation"
  "TikTok: carousel limited to 35 images"
```

---

### Phase 5 — Scheduling Decision

**Who:** CREATOR, CAMPAIGN_MANAGER, PUBLISHER

```
Option A — Publish Immediately (default)
Option B — AI Magic Schedule:
  Select Region: Global / US EST / US PST / UK Europe / Asia Pacific
  Select Age Group: All Ages / 18-24 Gen Z / 25-34 Millennials / Professionals
  Click "Get Best Times" → POST /api/v1/scheduler/recommend
  Returns time slots with confidence %:
    "09:00–11:00 · 95% confidence"
    "19:00–21:00 · 88% confidence"
  Click slot → time selected, post queued to BullMQ

Option C — Manual custom date + time
```

---

### Phase 6 — Submit to Governance

**Who:** CREATOR clicks "Publish Now"

```
Validation before submit:
  ✓ At least one account selected
  ✓ At least one caption written
  ✓ No hard-blocked platform violations

On submit:
  1. Local file (if any) → uploaded to Supabase Storage
  2. POST /api/v1/governance/submit called with:
       topic, content, mediaUrls, targetAccountIds, platformPostTypes

  3. Backend creates ONE publish_intent per account:
       Intent 1: platform=Instagram, caption=Instagram-specific caption
       Intent 2: platform=LinkedIn,  caption=LinkedIn-specific caption
       Intent 3: platform=X,         caption=X-specific caption

  Currently: status set APPROVED directly (testing mode)
  Production: risk classifier runs first
```

---

### Phase 7 — Risk Scoring (Automatic)

**Who:** System — risk classifier runs automatically on submit

```
Content scanned for trigger keywords:

Legal:       lawsuit, liability, regulation, compliance → +score
Financial:   earnings, stock, SEC, acquisition         → +score
Healthcare:  drug, diagnosis, FDA, prescription        → +score
Political:   election, candidate, government           → +score
Controversial: abortion, gun, religion, discrimination → +score

Platform multipliers:
  Twitter/X  × 1.2   (most public — higher risk)
  TikTok     × 1.15
  Threads    × 1.1
  YouTube    × 1.05
  Instagram  × 0.9
  LinkedIn   × 0.8   (professional — lower risk)
  Pinterest  × 0.85

NKS check:
  All Negative Knowledge Sets are also checked against content
  BLOCK terms → submission rejected immediately
  ESCALATE terms → routed to GOVERNANCE_ADMIN
  WARN terms → warning logged, proceed
  REQUIRE_APPROVAL → approval mandatory regardless of risk score

Final score 0–100 → approval path assigned:
  0–20  → AUTO_APPROVE → skip queue
  20–40 → STANDARD → REVIEWER
  40–60 → ELEVATED → REVIEWER + VALIDATOR
  60–80 → HIGH → REVIEWER + VALIDATOR + APPROVER
  80+   → RESTRICTED → full chain + GOVERNANCE_ADMIN
```

---

### Phase 8 — Accountability Layer Activates (Approval Chain)

```
Intent enters Layer 3 (Accountability Layer)

REVIEWER (at /queue):
  → Sees intent with content, media, risk score
  → [Approve] / [Return with notes] / [Reject] / [Escalate]
       ↓ if approved
VALIDATOR (at /queue):
  → Deeper accuracy + brand check
  → [Validate] / [Return] / [Reject] / [Escalate]
       ↓ if validated
APPROVER (at /governance/approvals):
  → Final human gate for high-risk
  → [Authorize] / [Block] / [Return]
       ↓ if authorized
GOVERNANCE_ADMIN (at /governance/approvals):
  → Legal/compliance review for restricted content
  → [Approve] / [Block] / [Return]
       ↓ if approved
Status → APPROVED
```

**Every action at every stage:**
- Logged to Audit Trail (Layer 4 — Evidence)
- Notification sent to relevant parties
- Timestamp + user ID + reason stored in evidence pack

---

### Phase 9 — Creator Revises (if RETURNED)

**Who:** CREATOR

```
Creator notified: "Your post was returned with feedback"

Via /review page:
  → Cards showing returned drafts with admin feedback highlighted
  → "Enter Workspace" → /publish?revisionId={id}

Via /publish page:
  → Amber banner: "X Tasks Awaiting Review"
  → Revision cards with "Edit Revision" buttons

After clicking "Edit Revision":
  → Draft Composer pre-filled with original content
  → Admin feedback shown in amber callout box
  → Creator edits caption, media, or platform selection
  → Clicks "Republish"
  → Goes through full approval chain again from start
```

---

### Phase 10 — Publishing (Post Goes Live)

**Who:** System (BullMQ) — automatic

```
On APPROVED status:
  → internalEventBus emits 'execution.requested' event
  → ExecutionController picks it up
  → Verifies OAuth token for each platform
  → Posts via platform APIs:
      Instagram  → Graph API
      Facebook   → Graph API
      LinkedIn   → LinkedIn API
      TikTok     → TikTok API
      YouTube    → YouTube Data API (with token auto-refresh)
      Twitter/X  → Twitter API v2
      Pinterest  → Pinterest API
      Threads    → Threads API
  → Status updated: APPROVED → PUBLISHED or FAILED

For SCHEDULED posts:
  → BullMQ job waits in Redis until scheduled_time
  → Worker fires at exact time → same execution
  → Status: SCHEDULED → PUBLISHED

Publish result logged to:
  → Evidence pack for this intent
  → Audit trail
  → Recent Posts panel on /publish (auto-polls at 3s + 8s)
```

---

### Phase 11 — Post-Publish Monitoring

**Who:** CREATOR, CAMPAIGN_MANAGER, ANALYST, PUBLISHER

```
/manage-posts (CREATOR):
  PUBLISHED (green)  → live on platform
  FAILED (red)       → error shown (token expired, API limit, etc.)
  RETURNED (orange)  → needs revision
  REJECTED (red)     → permanently denied

/publish sidebar → "Recent Posts" panel:
  → Last 8 posts with live status
  → Auto-refreshes at 3s and 8s after submit
  → FAILED posts show platform error reason

/analytics (ANALYST):
  → Engagement rate, reach, sentiment, platform breakdown, ROI

/calendar (PUBLISHER):
  → All scheduled/published posts visible on calendar
  → Can edit content or reschedule via modal
  → Can cancel upcoming scheduled posts
```

---

## 8. How All Layers Connect — Full End-to-End Flow

```
BEFORE CONTENT EXISTS — AGENT SETUP (Authority + Safety Layers)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
AGENT_ARCHITECT
  → /agents/studio → Creates agent → starts at L1/L2
  → /agents/prompts → Writes system prompts for the agent
  → /agents/knowledge → Attaches knowledge bases (PDFs, docs)
  → /agents/studio → Runs CertificationSandbox → trust score builds

GOVERNANCE_ADMIN
  → /agents/autonomy → Reviews trust score → upgrades agent to L3/L4/L5
  → /agents/autonomy → Sets HITL rules (when agent must ask a human)
  → /agents/autonomy → Creates Negative Knowledge Sets (prohibited terms)
  → /governance/policy → Writes content policies
  → /governance/rules → Sets approval paths by risk level

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CONTENT IS CREATED (Execution Layer)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATOR
  → /library/upload → Uploads image/video
  → /publish → Selects asset from library
  → /publish → AI Studio → fills topic, tone, audience
  → /publish → Clicks Generate → Gemini AI writes captions + hashtags
  → /publish → Edits AI output if needed
  → /publish → Selects target accounts and post types
  → /publish → Checks for platform violations
  → /publish → Picks schedule time (immediate / AI-recommended / manual)
  → /publish → Clicks "Publish Now" → submitted to governance

SYSTEM (automatic):
  → Risk classifier scans content → score 0–100
  → NKS checked (prohibited terms)
  → Approval path assigned based on score
  → Notifications sent to relevant reviewers

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CONTENT IS REVIEWED (Accountability Layer)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REVIEWER → /queue → Approve / Return / Reject / Escalate
VALIDATOR → /queue → Validate / Return / Reject
APPROVER → /governance/approvals → Authorize / Block / Return
GOVERNANCE_ADMIN → /governance/approvals → Final approve / Block

Every action → logged to audit trail automatically (Evidence Layer)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CONTENT IS PUBLISHED (Execution Layer)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SYSTEM (BullMQ):
  → APPROVED → execution.requested event fired
  → Platform APIs called → post goes live
  → Status → PUBLISHED / FAILED

PUBLISHER → /calendar → monitors scheduled posts
CREATOR → /manage-posts → monitors own post status
ANALYST → /analytics → reviews performance metrics

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EVIDENCE IS RECORDED (Evidence Layer — runs throughout)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
AUDITOR → /governance/audit → reads complete audit trail
COMPLIANCE_REVIEWER → /governance/evidence → exports evidence packs
AUDITOR → /governance/forensic → investigates specific incidents
AUDITOR → /integrations/identity-ledger → reviews API usage + logins
```

---

## 9. Role-Based Workflows

### SUPERADMIN
```
/superadmin          → All orgs/workspaces globally
/superadmin/analytics → Global platform metrics
/superadmin/tickets  → All support tickets, SLA tracking
→ Override any role, governance decision, approval
```

### WORKSPACE_OWNER
```
/admin/settings → Workspace setup
/admin/billing  → Plan + usage
/team           → Add members + roles
/accounts       → Connect social accounts
/dashboard      → Overview
/analytics      → ROI
/governance/approvals → Override any approval
/admin/crisis   → Emergency controls
```

### ADMIN (36 permissions)
```
All pages except superadmin
Full operational control
Can approve/reject any content via /governance/approvals
```

### GOVERNANCE_ADMIN
```
/agents/autonomy  → L0–L6 per agent, HITL rules, NKS, emergency locks
/governance/policy → Content policies
/governance/rules  → Approval paths
/governance/risk   → Risk thresholds
/governance/approvals → Handle PENDING_GOVERNANCE items
/governance/qa    → Quality audit
/governance/audit → Audit trail
```

### AGENT_ARCHITECT
```
/agents/studio    → Create + certify agents
/agents/workflows → Define execution workflows
/agents/prompts   → Write system prompts
/agents/knowledge → Attach knowledge bases
```

### AGENT_OPERATOR
```
/agents/operations → Live monitoring, pause/resume
/agents/workflows  → Monitor running workflows
/admin/crisis      → Activate crisis mode
/inbox             → Engagement inbox
```

### KNOWLEDGE_MANAGER
```
/agents/knowledge → Upload PDFs/docs, create knowledge sets
/agents           → View agent knowledge assignments
/governance/audit → Verify knowledge usage
```

### CAMPAIGN_MANAGER
```
/campaigns  → Create campaigns
/projects   → Organise content
/calendar   → Schedule calendar
/studio     → Brief agents
/library    → Manage assets
/publish    → Push content
/analytics  → Campaign ROI
```

### CREATOR
```
/library/upload → Upload media
/library        → Browse assets
/publish        → Write/generate content, submit posts
/review         → See returned drafts
/manage-posts   → Own post history
```

### REVIEWER
```
/queue → PENDING_REVIEW + PENDING_MANAGER items
Actions: Approve / Return / Reject / Escalate
```

### VALIDATOR
```
/queue → PENDING_VALIDATION items
Actions: Validate / Return / Reject / Escalate
```

### APPROVER
```
/governance/approvals → PENDING_AUTHORIZATION items
Actions: Authorize / Block / Return
```

### BRAND_REVIEWER
```
/queue → PENDING_REVIEW items flagged with BRAND_RISK_DETECTED
/governance/legal → Brand standards management
/governance/qa    → Quality audit
```

### PUBLISHER
```
/governance/approvals → See APPROVED items
/calendar             → Schedule approved content
/publish              → Final push to live
/inbox                → Monitor engagement
```

### COMPLIANCE_REVIEWER
```
/governance/risk     → Risk evaluations
/governance/audit    → Compliance gaps
/governance/evidence → Evidence vault
/queue               → PENDING_GOVERNANCE items
```

### AUDITOR (read-only)
```
/governance/audit        → Full audit trail
/governance/evidence     → Evidence packs
/governance/forensic     → Incident forensics
/integrations/identity-ledger → Identity + API audit
→ Cannot modify anything
```

### SECURITY_ADMIN
```
/admin/security → SSO, MFA, sessions
/team           → Member access review
/governance/audit → Security event logs
```

### PRIVACY_ADMIN
```
/admin/privacy       → PII management
/governance/audit    → Data access logs
→ Data retention, consent records, PII scrubbing
```

### DEVELOPER
```
/integrations/api          → API keys + webhooks
/accounts                  → OAuth connections
/integrations/data         → Data connectors
/integrations/health       → API health
/integrations/identity-ledger → API audit
```

### ANALYST
```
/analytics → Full performance dashboard (read-only)
/campaigns → Campaign performance view
/projects  → Project-level metrics
```

---

## 10. Page-by-Page Reference

### Public Pages

| Page | Purpose | Key Action |
|------|---------|------------|
| `/` | Landing, pricing (Free / $299 / $799 / Custom) | Request Demo → /signup |
| `/signup` | Register org + workspace | POST /api/v1/auth/signup-enterprise |
| `/login` | Authentication | supabase.auth.signInWithPassword() |
| `/reset-password` | Password recovery | supabase.auth.resetPasswordForEmail() |
| `/privacy` | Privacy policy (12 sections) | Static |
| `/terms` | Terms of service (18 sections) | Static |

### Dashboard

| Page | Purpose | Who |
|------|---------|-----|
| `/dashboard` | KPIs: Reach 124.5K, Posts 84, Pending 12, Growth 3,240 | All |
| `/profile` | Personal info, password, sessions, access log | All |
| `/analytics` | Performance forensics, engagement pulse, resonance matrix | ANALYST, ADMIN |
| `/support` | Submit support tickets | All |

### Media Engine

| Page | Purpose | Who |
|------|---------|-----|
| `/library` | Browse all uploaded assets | CREATOR, CAMPAIGN_MANAGER |
| `/library/upload` | Bulk upload images/videos | CREATOR, CAMPAIGN_MANAGER |
| `/publish` | Full publishing hub (compose, AI, schedule, approve) | CREATOR, ADMIN, PUBLISHER |
| `/calendar` | Monthly calendar, AI magic schedule | CAMPAIGN_MANAGER, PUBLISHER |
| `/manage-posts` | Creator's own post history + status | CREATOR |
| `/review` | Returned drafts with admin feedback | CREATOR |
| `/studio` | Content studio (under development) | — |
| `/inbox` | Engagement inbox (under development) | — |

### Authority Layer (Agents)

| Page | Purpose | Who |
|------|---------|-----|
| `/agents/studio` | Agent registry, create/certify agents, Kill Switch | AGENT_ARCHITECT, ADMIN |
| `/agents/workflows` | Build + monitor agent workflows | AGENT_ARCHITECT, OPERATOR |
| `/agents/prompts` | Write + version system prompts | AGENT_ARCHITECT |
| `/agents/knowledge` | Upload docs, manage RAG knowledge bases | AGENT_ARCHITECT, KNOWLEDGE_MANAGER |
| `/agents/operations` | Live agent monitoring, pause/resume, crisis | AGENT_OPERATOR |

### Safety Layer

| Page | Purpose | Who |
|------|---------|-----|
| `/agents/autonomy` | L0–L6 autonomy, HITL rules, emergency locks, NKS | GOVERNANCE_ADMIN only |

### Accountability Layer

| Page | Purpose | Who |
|------|---------|-----|
| `/queue` | Role-filtered approval queue | REVIEWER, VALIDATOR, APPROVER, BRAND_REVIEWER |
| `/governance/approvals` | Full approval management | GOVERNANCE_ADMIN, ADMIN |
| `/governance/rules` | Configure approval paths by risk level | GOVERNANCE_ADMIN |
| `/governance/qa` | Quality audit results | GOVERNANCE_ADMIN, VALIDATOR |
| `/governance/risk` | Risk flag monitoring | GOVERNANCE_ADMIN, COMPLIANCE_REVIEWER |
| `/governance/policy` | Content policy creation | GOVERNANCE_ADMIN |
| `/governance/legal` | Brand standards (voice, tone, visual) | GOVERNANCE_ADMIN, BRAND_REVIEWER |

### Evidence Layer

| Page | Purpose | Who |
|------|---------|-----|
| `/governance/audit` | Tamper-evident full audit trail | AUDITOR, COMPLIANCE_REVIEWER |
| `/governance/evidence` | Exportable evidence packs per intent | AUDITOR, COMPLIANCE_REVIEWER |
| `/governance/forensic` | Deep incident forensic analysis | AUDITOR, COMPLIANCE_REVIEWER |
| `/integrations/identity-ledger` | Identity + API usage audit | AUDITOR, DEVELOPER |

### Integrations & Infrastructure

| Page | Purpose | Who |
|------|---------|-----|
| `/accounts` | Connected social accounts, OAuth | ADMIN, DEVELOPER, PUBLISHER |
| `/integrations/api` | API keys, webhook config | DEVELOPER, ADMIN |
| `/integrations/data` | External data connectors | DEVELOPER, ADMIN |
| `/integrations/health` | API connection health monitoring | All |

### Team & Access

| Page | Purpose | Who |
|------|---------|-----|
| `/team` | Add/remove members, change roles | ADMIN, WORKSPACE_OWNER |
| `/access/roles` | 21 roles, permissions, org units | ADMIN, WORKSPACE_OWNER |
| `/access/partners` | External collaborator management | ADMIN, WORKSPACE_OWNER |

### Admin

| Page | Purpose | Who |
|------|---------|-----|
| `/admin/settings` | Workspace name, logo, branding | WORKSPACE_OWNER |
| `/admin/billing` | Plan, usage, payment | WORKSPACE_OWNER, ADMIN |
| `/admin/security` | SSO, MFA, session management | SECURITY_ADMIN |
| `/admin/privacy` | PII, data retention, consent | PRIVACY_ADMIN |
| `/admin/notifications` | Configure notification events | ADMIN |
| `/admin/crisis` | Emergency pause ALL agents | ADMIN, AGENT_OPERATOR |

### SuperAdmin

| Page | Purpose | Who |
|------|---------|-----|
| `/superadmin` | All orgs/workspaces, override anything | SUPERADMIN |
| `/superadmin/analytics` | Global platform metrics | SUPERADMIN |
| `/superadmin/tickets` | All support tickets, SLA tracking | SUPERADMIN |

---

## 11. API Endpoints Reference

### Authentication
```
supabase.auth.signInWithPassword()          Login
POST /api/v1/auth/signup-enterprise         Register org + user
supabase.auth.resetPasswordForEmail()       Password reset
```

### User
```
GET /api/v1/user/context                    Get role + workspace_id
```

### Agents
```
GET    /api/v1/agents?workspaceId={id}      List agents
POST   /api/v1/agents                       Create agent
```

### Autonomy (Safety Layer)
```
GET    /api/v1/autonomy/stats               Workspace agent stats
PATCH  /api/v1/autonomy/agents/{id}/level   Change autonomy level
POST   /api/v1/autonomy/agents/{id}/suspend Suspend agent

GET    /api/v1/autonomy/emergency-locks     List active locks
POST   /api/v1/autonomy/emergency-locks     Create lock
DELETE /api/v1/autonomy/emergency-locks/{id} Lift lock

GET    /api/v1/autonomy/hitl-rules          List HITL rules
POST   /api/v1/autonomy/hitl-rules          Create HITL rule
PUT    /api/v1/autonomy/hitl-rules/{id}     Toggle enable/disable
DELETE /api/v1/autonomy/hitl-rules/{id}     Delete rule

GET    /api/v1/autonomy/negative-knowledge  List NKS
POST   /api/v1/autonomy/negative-knowledge  Create NKS
DELETE /api/v1/autonomy/negative-knowledge/{id} Delete NKS
```

### Governance & Approvals (Accountability Layer)
```
GET    /api/v1/governance/intents           User's post history
GET    /api/v1/governance/queue             Approval queue
POST   /api/v1/governance/submit            Submit post intent
POST   /api/v1/governance/transition        Approve/reject/return
DELETE /api/v1/governance/intents/{id}      Delete post
```

### AI (Execution Layer)
```
POST   /api/v1/ai/analyze-image             Gemini Vision analysis
POST   /api/v1/ai/generate                  Generate captions + hashtags
```

### Scheduler
```
GET    /api/v1/scheduler/posts?limit=N      Fetch scheduled posts
POST   /api/v1/scheduler/posts              Create scheduled post
PUT    /api/v1/scheduler/posts/{id}         Edit scheduled post
DELETE /api/v1/scheduler/posts/{id}         Cancel scheduled post
POST   /api/v1/scheduler/recommend          AI time recommendations
```

### Media & Library
```
GET    /api/v1/library?search=...&type=...  Browse assets
POST   /api/v1/library/upload               Create library entry
DELETE /api/v1/library/{id}                 Delete asset
supabase.storage.from('media').upload()     Upload file to storage
```

### Support
```
POST   /api/v1/support/tickets              Submit support ticket
```
