# ZoikoVertex — Knowledge Base Page Build Contract

**Document 4 | Complete Product, UX, Governance, Runtime, Evidence, and Engineering Specification**

| | |
|---|---|
| **Prepared for** | ZoikoVertex Engineering, Product, AI Governance, Security, QA, and AI Solutions Teams |
| **Language** | American English |
| **Classification** | Internal Build Contract |
| **Status** | Final Version |
| **Version** | 1.0 |
| **Date** | 19 May 2026 |

---

> **Build Doctrine**
> The Knowledge Base page must operate as the governed source-of-truth layer for ZoikoVertex agents, workflows, prompts, policies, brands, evidence, and runtime decisions. It is not a file repository. It is the controlled knowledge infrastructure that determines what agents are allowed to know, cite, retrieve, use, ignore, escalate, and evidence.

---

## Table of Contents

1. [Executive Build Decision](#1-executive-build-decision)
2. [Engineer Request — Exact Implementation Format](#2-engineer-request--exact-implementation-format)
3. [Page Purpose and Product Boundary](#3-page-purpose-and-product-boundary)
4. [Primary Users and Jobs to Be Done](#4-primary-users-and-jobs-to-be-done)
5. [Knowledge Base Information Architecture](#5-knowledge-base-information-architecture)
6. [Core Functionality Requirements](#6-core-functionality-requirements)
7. [Source Ingestion, Parsing, and Normalization](#7-source-ingestion-parsing-and-normalization)
8. [Taxonomy, Metadata, and Knowledge Object Model](#8-taxonomy-metadata-and-knowledge-object-model)
9. [Retrieval, Grounding, and Agent-Use Controls](#9-retrieval-grounding-and-agent-use-controls)
10. [Governance, Approval, and Publishing Workflow](#10-governance-approval-and-publishing-workflow)
11. [Versioning, Expiry, Review, and Retention](#11-versioning-expiry-review-and-retention)
12. [Evidence, Citation, and Audit Requirements](#12-evidence-citation-and-audit-requirements)
13. [Quality, Safety, and Conflict Controls](#13-quality-safety-and-conflict-controls)
14. [UX, UI, and Interaction Requirements](#14-ux-ui-and-interaction-requirements)
15. [Data Model and Engineering Objects](#15-data-model-and-engineering-objects)
16. [API, Events, and Integration Requirements](#16-api-events-and-integration-requirements)
17. [Security, Permissions, and Tenant Isolation](#17-security-permissions-and-tenant-isolation)
18. [Notifications, SLAs, and Operational Escalation](#18-notifications-slas-and-operational-escalation)
19. [Analytics, Metrics, and Admin Reporting](#19-analytics-metrics-and-admin-reporting)
20. [QA Scenarios and Acceptance Criteria](#20-qa-scenarios-and-acceptance-criteria)
21. [Implementation Phasing](#21-implementation-phasing)
22. [Final Engineering Handoff Checklist](#22-final-engineering-handoff-checklist)

---

## 1. Executive Build Decision

> **Decision:** Build Knowledge Base as the governed enterprise knowledge layer for ZoikoVertex. The page must let authorized teams ingest, classify, approve, publish, retrieve, test, monitor, retire, and evidence knowledge used by agents, prompts, workflows, policy controls, and brand-governed execution.

| Build Question | Final Decision |
|---|---|
| What is the page? | A controlled knowledge management and retrieval-governance surface for agentic marketing execution, workflow automation, prompt grounding, policy interpretation, brand governance, and evidence-backed outputs. |
| What is it **not**? | Not a generic document drive, content dump, shared folder, wiki clone, or uncontrolled RAG upload screen. |
| Primary value | Stops agents from using stale, unapproved, conflicting, private, off-brand, unsupported, or prohibited knowledge while giving teams traceable source control. |
| Core users | AI operations leads, knowledge managers, prompt engineers, workflow owners, brand reviewers, compliance reviewers, security administrators, and QA teams. |
| Engineering priority | Source integrity, retrieval accuracy, permission filtering, version immutability, citation traceability, conflict handling, freshness controls, and evidence completeness. |

### Non-Negotiable Build Rules

- Every knowledge item must have an **owner, tenant, scope, category, status, source type, source authority, review date, access policy, retrieval policy, and evidence record**.
- Agents must **not** retrieve or use knowledge unless the item is approved, active, permission-compatible, context-compatible, and within freshness limits.
- Knowledge Base must support **tenant-level, brand-level, workspace-level, workflow-level, agent-level, role-level, locale-level, and channel-level** access controls.
- Every upload, edit, approval, publication, retrieval, citation, conflict, retirement, and deletion request must write to the **Evidence Vault**.

---

## 2. Engineer Request — Exact Implementation Format

> **Implementation Note:** The following section is written in the exact operational format requested by the AI solutions engineer. It can be copied directly into the engineering backlog, ticket system, or implementation brief.

### Agent Studio

**What it must do:** Allow admins to create and manage agent identities, assigned roles, capabilities, tool access, channel permissions, brand restrictions, safety boundaries, knowledge access, workflow permissions, escalation behavior, and operating mode. Must show which knowledge collections each agent can use and whether retrieval is mandatory, optional, blocked, or approval-gated.

**What needs to be implemented:**
- Agent profile, agent role, capability map
- Tool permission matrix
- Knowledge access selector (allowed/blocked knowledge collections)
- Approved prompt assignment, workflow assignment
- Risk tier, operating mode, reviewer assignment, activation status
- Evidence logging
- Offensive words and platform-specific compliance checks for agents authorized to create or review public content

---

### Agent Operations

**What it must do:** Show live and historical agent execution, active tasks, failed tasks, blocked actions, escalations, retrieval events, knowledge citations used, policy violations, approval queues, runtime warnings, and rollback triggers.

**What needs to be implemented:**
- Operations dashboard, task run log, runtime trace viewer
- Retrieval trace, citation trace
- Failure reason, blocked action reason
- Escalation panel, human override panel
- Agent pause/resume, emergency stop
- Deployment rollback link
- Evidence Vault event writing

---

### Workflows

**What it must do:** Define process flows across planning, content generation, review, approval, publishing, monitoring, escalation, and reporting. Each workflow node must be able to require specific prompts, knowledge collections, policy checks, reviewer approvals, output schemas, and evidence capture.

**What needs to be implemented:**
- Workflow builder, node configuration
- Trigger rules, condition logic
- Prompt attachment, knowledge collection attachment
- Human approval gates, policy gate, brand gate, platform gate, schedule/publish gate
- Exception routing, SLA timers
- Workflow version history

---

### Prompt Governance

**What it must do:** Control prompt creation, review, testing, approval, deployment, versioning, monitoring, and rollback. Define which prompts can be used by which agents, workflows, tools, channels, brands, locales, and risk tiers.

**What needs to be implemented:**
- Prompt editor, prompt metadata, prompt test suites
- Risk classification, reviewer workflow, approval status
- Deployment environment, active version, rollback, prompt comparison
- Runtime performance metrics
- Policy mapping, knowledge dependency mapping
- Evidence Vault logging

---

### Knowledge Base *(Primary Subject of This Document)*

**What it must do:** Manage source-of-truth content used by agents, prompts, workflows, and policy checks. Support ingestion, classification, chunking, approval, publishing, retrieval permissions, citations, freshness review, conflict detection, and retirement.

**What needs to be implemented:**
- File upload, URL ingestion (where approved), manual article creation, connector ingestion (future)
- Parsing, OCR fallback (only when necessary), chunking, embeddings
- Metadata tagging, taxonomy, collection management
- Access permissions, retrieval rules, source authority score
- Review date, expiration date
- Conflict flags, citation records, retrieval logs
- Evidence Vault logging

---

## 3. Page Purpose and Product Boundary

| Area | Required Boundary |
|---|---|
| Knowledge scope | Brand guidelines, product facts, legal-safe claims, campaign rules, customer-approved materials, competitor notes, audience personas, platform policies, workflow SOPs, governance policies, compliance rules, localization guidance, FAQs, tone rules, and approved reference documents. |
| Excluded from this page | Live social drafts, media asset editing, user identity management, billing, unrelated document storage, raw customer personal data not required for execution, and unapproved scraped web content. |
| Relationship to Prompt Governance | Prompt Governance decides *how* agents should reason and behave. Knowledge Base decides *which source material* agents are allowed to retrieve and rely on. |
| Relationship to Workflows | Workflows orchestrate steps. Knowledge Base supplies approved source context to workflow nodes and defines retrieval restrictions per step. |
| Relationship to Evidence Vault | Evidence Vault stores immutable records of knowledge changes, approvals, retrieval, citations, conflicts, and runtime use. Knowledge Base remains the operational control surface. |
| Relationship to Policy Center | Policy Center defines rules. Knowledge Base stores approved policy content and maps knowledge items to policies that control agent behavior. |

---

## 4. Primary Users and Jobs to Be Done

| User Role | Primary Job | Must Be Able To |
|---|---|---|
| **Knowledge Manager** | Maintain trusted knowledge collections for brands, workflows, and agents. | Create collections, ingest sources, assign metadata, monitor review dates, resolve conflicts, and retire stale content. |
| **AI Operations Lead** | Ensure agents use only approved and context-relevant knowledge. | View retrieval health, blocked retrievals, stale sources, collection coverage, agent dependencies, and incident history. |
| **Prompt Engineer** | Ground prompts in approved sources. | Attach knowledge collections to prompts, test retrieval outcomes, inspect citations, and identify missing or conflicting sources. |
| **Workflow Owner** | Make workflow nodes context-aware and auditable. | Assign required knowledge to nodes, configure fallback behavior, and define when missing knowledge triggers escalation. |
| **Compliance Reviewer** | Control legal, regulatory, and claim-sensitive knowledge. | Approve source use, mark restricted claims, require citations, set expiry dates, and block high-risk retrieval. |
| **Brand Reviewer** | Protect brand consistency. | Approve brand voice sources, terminology rules, banned claims, preferred phrasing, and channel-specific language. |
| **Security Administrator** | Protect access and tenant boundaries. | Configure collection permissions, sensitivity levels, retention rules, export rights, and deletion controls. |

---

## 5. Knowledge Base Information Architecture

| Area | Required Content / Behavior |
|---|---|
| **Top summary cards** | Total sources, approved sources, stale sources, sources requiring review, active collections, retrieval errors, conflict flags, and high-risk restricted items. |
| **Primary tabs** | Collections, Sources, Review Queue, Conflicts, Retrieval Logs, Agent Access, Taxonomy, Settings. |
| **Collection view** | Collection name, owner, tenant/brand scope, description, source count, status, risk tier, last reviewed, next review, agents using it, workflows using it, and active retrieval policy. |
| **Source detail view** | Source preview, extracted text, chunks, metadata, permissions, review history, citations, dependencies, conflicts, embeddings status, and runtime retrieval history. |
| **Review queue** | Items pending approval, stale review, failed parsing, conflicting claims, missing owner, expired documents, blocked source, and security review required. |
| **Retrieval logs** | Search query, agent, prompt, workflow, retrieved chunks, cited sources, blocked items, reason codes, latency, confidence, and user or system action taken. |
| **Settings** | Taxonomy values, source type rules, review cycle defaults, chunking defaults, embedding model settings, citation policy, and retention policy. |

---

## 6. Core Functionality Requirements

| Function | Required Implementation |
|---|---|
| **Create collection** | Create named knowledge collections with owner, scope, description, category, risk tier, retrieval mode, review cadence, permitted agents, workflows, prompts, and channels. |
| **Add source** | Upload documents, create manual articles, add approved URLs, and support future connector ingestion with clear source-type identification. |
| **Parse and normalize** | Extract text, tables where feasible, headings, metadata, document structure, language, dates, and source references. Flag parsing failures. |
| **Chunk and embed** | Chunk content by semantic structure, preserve source references, create embeddings, store chunk IDs, and allow re-embedding when models or chunking rules change. |
| **Classify and tag** | Assign source type, product, brand, market, locale, platform, policy area, claim type, sensitivity, authority level, and review cycle. |
| **Approve and publish** | Route sources through required review based on risk tier, source type, sensitivity, and intended agent use. |
| **Attach to agents** | Define which agents can retrieve which collections, under what conditions, and whether retrieval requires citation or approval. |
| **Attach to prompts** | Map prompts to required, optional, blocked, or fallback knowledge collections. |
| **Attach to workflows** | Map workflow nodes to required collections and escalation rules when required knowledge is unavailable. |
| **Search and filter** | Search sources, chunks, metadata, collections, conflicts, review status, and runtime retrieval logs. |
| **Conflict detection** | Detect contradictory claims, duplicate sources, outdated versions, overlapping authority, and inconsistent metadata. |
| **Retire source** | Retire or archive stale, replaced, revoked, expired, or unsupported sources without deleting evidence history. |

---

## 7. Source Ingestion, Parsing, and Normalization

| Requirement | Implementation Detail |
|---|---|
| **Supported inputs** | PDF, DOCX, PPTX, TXT, CSV, Markdown, HTML page capture, manual article, and approved future connectors (Google Drive, SharePoint, Notion, Confluence, DAM, CRM, product documentation repositories). |
| **Upload validation** | Validate file type, file size, malware scan status, tenant authorization, duplicate fingerprint, source owner, required metadata, and sensitivity before processing. |
| **Parsing pipeline** | Extract text, headings, document structure, tables where reliable, links, dates, named products, jurisdictions, platforms, and claim-bearing passages. |
| **OCR rule** | Use OCR **only** when text extraction fails or scanned content is detected. Flag OCR-derived content as lower confidence until reviewed. |
| **Normalization** | Convert source content into consistent document objects, sections, chunks, metadata fields, citation anchors, and processing status. |
| **Failure handling** | Show failed reason, retry action, manual correction action, assign owner, and prevent publication until processing is resolved. |

---

## 8. Taxonomy, Metadata, and Knowledge Object Model

| Metadata Field | Required Purpose |
|---|---|
| **Tenant ID / Workspace ID** | Guarantees tenant isolation and workspace-level governance. |
| **Brand / Product / Business Unit** | Controls brand-specific retrieval and prevents cross-brand contamination. |
| **Collection ID** | Groups knowledge for agent, prompt, workflow, and policy use. |
| **Source Authority** | Ranks whether source is official, legal-approved, product-approved, customer-approved, third-party reference, or draft/internal. |
| **Sensitivity Level** | Controls access, retrieval, export, citation, and logging requirements. |
| **Risk Tier** | Determines review requirements, citation requirements, and runtime restrictions. |
| **Locale / Jurisdiction** | Prevents agents from applying the wrong market, law, platform rule, or regional expression. |
| **Channel / Platform** | Controls channel-specific wording, policy, and formatting guidance. |
| **Review Date / Expiry Date** | Prevents stale knowledge from being used without review. |
| **Status** | Draft, Processing, Review Required, Approved, Active, Restricted, Expired, Retired, Rejected, Quarantined. |
| **Retrieval Policy** | Allowed, blocked, mandatory, optional, citation-required, approval-gated, or fallback-only. |
| **Evidence ID** | Links each source and version to immutable audit evidence. |

---

## 9. Retrieval, Grounding, and Agent-Use Controls

> **Runtime Rule:** Agents must retrieve from Knowledge Base through the governed retrieval service only. They must not access raw source files directly, bypass permissions, use expired sources, or cite unapproved chunks.

| Control | Required Behavior |
|---|---|
| **Permission filter** | Before retrieval, filter by tenant, workspace, user role, agent permission, workflow context, brand, locale, and sensitivity. |
| **Context filter** | Retrieve only knowledge that matches the agent task, prompt dependency, workflow node, platform, campaign, market, and channel. |
| **Freshness filter** | Block or warn on expired, stale, review-overdue, revoked, superseded, or quarantined sources. |
| **Authority ranking** | Prefer official and approved sources over lower-authority references. Escalate when lower-authority sources conflict with official sources. |
| **Citation requirement** | For claim-sensitive outputs, require source citation, source ID, chunk ID, and retrieval event ID. |
| **Missing knowledge behavior** | If required knowledge is missing, the agent must pause, request human input, or route to the configured fallback path. |
| **Conflicting knowledge behavior** | If retrieved sources conflict, the agent must not improvise. It must flag conflict, cite the conflicting items internally, and escalate. |
| **Retrieval trace** | Store query, filters, results, chunk IDs, source IDs, blocked items, reason codes, latency, and downstream action. |

---

## 10. Governance, Approval, and Publishing Workflow

| Stage | Required Controls |
|---|---|
| **Draft** | Source can be uploaded or created but cannot be used by production agents. Required metadata gaps are visible. |
| **Processing** | Parsing, chunking, embedding, duplicate detection, classification, and quality checks run. Failed items stay blocked. |
| **Review Required** | Reviewer is assigned based on risk tier, source type, sensitivity, jurisdiction, brand, and intended use. |
| **Approved** | Reviewer approves source content and metadata. Approval record is written to Evidence Vault. |
| **Active** | Source becomes retrievable only for approved agents, prompts, workflows, brands, locales, and channels. |
| **Restricted** | Source may be visible to admins but cannot be used by agents unless a condition is met or human approval is granted. |
| **Expired** | Source is blocked from runtime retrieval until reviewed and reapproved. |
| **Retired** | Source is no longer usable but remains preserved for historical evidence and prior-output traceability. |
| **Quarantined** | Source is immediately blocked due to security, legal, privacy, corruption, or severe conflict risk. |

---

## 11. Versioning, Expiry, Review, and Retention

| Area | Requirement |
|---|---|
| **Versioning** | Every source edit creates a new version. Prior versions remain read-only and linked to outputs that used them. |
| **Diff view** | Show content differences, metadata changes, reviewer changes, retrieval policy changes, and status changes between versions. |
| **Expiry** | High-risk legal, compliance, claims, product pricing, platform policy, and regulated-industry sources require explicit expiry or review dates. |
| **Scheduled review** | System must notify owner and reviewer before review due date, at due date, and after overdue threshold. |
| **Retention** | Retired knowledge remains available to audit prior decisions and outputs for the retention period configured by tenant policy. |
| **Deletion control** | Hard deletion requires elevated permission and must preserve evidence metadata where legally permissible. |

---

## 12. Evidence, Citation, and Audit Requirements

| Evidence Event | Required Payload |
|---|---|
| **Source created** | User, timestamp, tenant, source ID, collection ID, file fingerprint or article ID, metadata, source type, and initial status. |
| **Source processed** | Parser version, chunking settings, embedding model, processing result, warnings, failed sections, and extracted metadata. |
| **Source approved** | Reviewer, approval timestamp, approval comments, risk tier, active scope, and Evidence ID. |
| **Source changed** | Before/after diff, changed fields, user, reason, review requirement, and version ID. |
| **Source retrieved** | Agent, prompt, workflow, query, filters, chunk IDs, source IDs, blocked source IDs, and runtime action. |
| **Source cited** | Output ID, citation anchors, source version, chunk IDs, and generation run ID. |
| **Conflict detected** | Conflicting source IDs, conflicting claim summary, severity, owner, and resolution status. |
| **Source retired/quarantined** | Actor, reason, affected agents/prompts/workflows, prior retrieval count, and rollback or replacement reference. |

---

## 13. Quality, Safety, and Conflict Controls

| Control | Required Implementation |
|---|---|
| **Duplicate detection** | Detect identical files, near-duplicate content, superseded documents, and repeated manual articles. |
| **Claim detection** | Identify claim-bearing passages such as performance, pricing, legal, compliance, security, certifications, integrations, and regulated statements. |
| **Unsupported claim flag** | Flag claims that lack approved evidence or conflict with legal-safe messaging. |
| **PII and sensitive data scan** | Identify personal data, customer confidential data, credentials, secrets, and regulated data before publication. |
| **Toxic/offensive language scan** | Detect offensive terms, discriminatory language, unsafe content, and platform-sensitive phrasing where sources can influence public content. |
| **Staleness detection** | Flag outdated dates, old platform policy references, expired pricing, discontinued products, and obsolete competitor claims. |
| **Conflict resolution** | Provide conflict owner, severity, source authority comparison, recommended action, and block rules until resolved where severity requires it. |
| **Retrieval evaluation** | Test whether expected sources are retrieved for defined queries and whether prohibited sources are blocked. |

---

## 14. UX, UI, and Interaction Requirements

| Screen / Component | Required UX Behavior |
|---|---|
| **Knowledge Base landing** | Show status summary, urgent review items, conflicts, stale sources, recently active collections, retrieval health, and quick actions. |
| **Create collection flow** | Keep form short at first; progressively request advanced governance settings after basic collection details are saved. |
| **Source upload flow** | Show processing steps, required metadata, blocking errors, parsing status, duplicate warnings, and next required action. |
| **Source detail page** | Use clear hierarchy: summary → status → source preview → metadata → access → chunks → citations → dependencies → review history → audit. |
| **Review queue** | Prioritize by risk, overdue status, production dependency, affected agents, affected workflows, and unresolved conflicts. |
| **Conflict screen** | Show conflicting passages side by side with source authority, dates, owners, affected agents, and resolution action. |
| **Retrieval logs** | Allow filtering by agent, workflow, prompt, collection, source, blocked reason, date, channel, and output ID. |
| **Empty states** | Explain what is missing and provide one primary action: create collection, upload source, assign reviewer, or run retrieval test. |
| **Error states** | Explain failure in operational language, show what is blocked, and provide retry, replace, assign owner, or escalate action. |

---

## 15. Data Model and Engineering Objects

### KnowledgeCollection
```
id, tenant_id, workspace_id, name, description, owner_id, scope, risk_tier,
status, retrieval_policy, review_cadence, created_at, updated_at
```

### KnowledgeSource
```
id, collection_id, source_type, title, owner_id, version, status,
authority_level, sensitivity_level, locale, jurisdiction, product, brand,
channel, review_date, expiry_date, evidence_id
```

### KnowledgeChunk
```
id, source_id, version_id, chunk_index, text, heading_path, token_count,
embedding_id, citation_anchor, hash, sensitivity_level
```

### KnowledgeEmbedding
```
id, chunk_id, model_id, vector_store_id, embedding_version,
created_at, reembed_required
```

### KnowledgeAccessPolicy
```
id, collection_id, source_id, allowed_agents, allowed_prompts,
allowed_workflows, allowed_roles, allowed_channels, restrictions
```

### RetrievalEvent
```
id, tenant_id, agent_id, prompt_id, workflow_id, query, filters,
returned_chunks, blocked_chunks, reason_codes, latency_ms, output_id, evidence_id
```

### KnowledgeReview
```
id, source_id, reviewer_id, review_type, decision, comments,
due_date, completed_at, evidence_id
```

### KnowledgeConflict
```
id, source_ids, chunk_ids, severity, summary, owner_id,
status, resolution, created_at, resolved_at
```

---

## 16. API, Events, and Integration Requirements

| Area | Required Capability |
|---|---|
| **Knowledge CRUD API** | Create, read, update, approve, publish, restrict, retire, quarantine, and list collections, sources, chunks, reviews, and conflicts. |
| **Ingestion API** | Accept files, manual articles, approved URLs, and future connector payloads with validation and processing status callbacks. |
| **Retrieval API** | Return permission-filtered chunks with source IDs, citations, authority scores, freshness status, and blocked reason codes. |
| **Dependency API** | Return which agents, prompts, workflows, and policy controls depend on a source or collection. |

### Evidence Events

| Event Name | Trigger |
|---|---|
| `knowledge.created` | New source added |
| `knowledge.processed` | Parsing/chunking/embedding completed |
| `knowledge.approved` | Reviewer approves source |
| `knowledge.published` | Source activated for runtime |
| `knowledge.retrieved` | Agent retrieves a chunk |
| `knowledge.cited` | Source is cited in an output |
| `knowledge.conflict_detected` | Conflicting knowledge identified |
| `knowledge.retired` | Source retired |
| `knowledge.quarantined` | Source immediately blocked |

### Integration Dependencies
Agent Studio · Agent Operations · Workflows · Prompt Governance · Policy Center · Evidence Vault · Identity/RBAC · Notifications · Analytics · Future connector services

---

## 17. Security, Permissions, and Tenant Isolation

| Security Area | Requirement |
|---|---|
| **Tenant isolation** | No source, chunk, embedding, retrieval log, citation, or evidence event may cross tenants unless explicitly governed by enterprise multi-tenant hierarchy rules. |
| **RBAC** | Separate permissions for view, upload, edit, approve, publish, retire, export, delete, configure retrieval, and view retrieval logs. |
| **ABAC** | Apply context-based controls for brand, business unit, locale, jurisdiction, sensitivity, risk tier, and workflow context. |
| **Secrets protection** | Detect and block API keys, credentials, tokens, private keys, passwords, and sensitive configuration values during ingestion. |
| **Sensitive content** | Allow restricted collections visible only to approved users and retrievable only by approved agents under approved workflow conditions. |
| **Export control** | Exporting source content, chunks, retrieval logs, or evidence bundles must require explicit permission and create an audit event. |
| **Data residency readiness** | Architecture must support future regional storage, regional vector indexes, and jurisdictional retention controls. |

---

## 18. Notifications, SLAs, and Operational Escalation

| Trigger | Notification / Action |
|---|---|
| **Source needs review** | Notify owner and reviewer with source link, risk tier, due date, and affected agents or workflows. |
| **Source overdue** | Escalate to AI operations lead after configured SLA threshold. Block runtime use where policy requires. |
| **Conflict detected** | Notify source owners, collection owner, compliance reviewer, and workflow owner where production dependencies exist. |
| **Parsing failed** | Notify uploader with failure reason, retry action, and manual correction route. |
| **High-risk source approved** | Notify AI operations lead before activation where production agents are affected. |
| **Source expired** | Block or warn based on policy, notify owner, and list affected prompts, agents, and workflows. |
| **Quarantine event** | Immediately notify security/admin, AI operations, source owner, and all affected workflow owners. |

---

## 19. Analytics, Metrics, and Admin Reporting

| Metric | Purpose |
|---|---|
| **Approved source coverage** | Shows whether agents and workflows have enough approved knowledge to execute safely. |
| **Stale source rate** | Measures operational risk from outdated knowledge. |
| **Retrieval success rate** | Measures whether agents can find required knowledge for tasks. |
| **Blocked retrieval rate** | Shows permission, freshness, conflict, or policy blocks affecting execution. |
| **Citation compliance rate** | Measures whether claim-sensitive outputs include required evidence. |
| **Conflict volume and age** | Shows unresolved knowledge contradictions and governance backlog. |
| **Review SLA performance** | Measures owner and reviewer responsiveness. |
| **Agent dependency map** | Shows which agents and workflows rely on each collection or source. |
| **Top retrieved sources** | Identifies critical knowledge assets and candidates for higher review cadence. |
| **Unused approved sources** | Identifies stale or unnecessary knowledge clutter. |

---

## 20. QA Scenarios and Acceptance Criteria

| Scenario | Acceptance Criteria |
|---|---|
| **Upload approved PDF** | System accepts file, scans it, parses it, creates chunks, requests metadata, assigns review, and blocks runtime use until approved. |
| **Missing required metadata** | System prevents review submission and clearly identifies missing fields. |
| **Duplicate file uploaded** | System flags duplicate, shows existing source, and allows cancel, replace, or create new version based on permission. |
| **Expired source retrieval** | Runtime retrieval blocks source or warns based on configured policy, and writes reason code to retrieval log. |
| **Agent lacks access** | Retrieval service excludes unauthorized chunks and records blocked reason without exposing restricted content. |
| **Required knowledge missing** | Workflow node pauses or escalates according to configuration. Agent must not improvise. |
| **Conflict detected** | System flags conflict, assigns owner, blocks high-risk use where required, and shows side-by-side source comparison. |
| **Source cited in output** | Output stores citation references, source version, chunk IDs, retrieval event ID, and evidence link. |
| **Source retired after use** | Prior outputs retain historical trace to the retired source version. New retrieval excludes retired source. |
| **Quarantine source** | System immediately blocks runtime use, alerts required owners, and logs quarantine event. |
| **Tenant isolation test** | User from another tenant cannot view, retrieve, cite, export, or infer source content. |
| **Reviewer approval test** | Only authorized reviewer can approve the source for active retrieval in the specified scope. |

---

## 21. Implementation Phasing

### Phase 1 — Core Knowledge Control

**Build scope:** Collections, upload, manual article, metadata, parsing, chunking, review status, approval, active/retired states, RBAC, and Evidence Vault events.

**Exit criteria:** Approved sources can be created, reviewed, activated, searched, and audited. Runtime use can be blocked until approval.

---

### Phase 2 — Governed Retrieval

**Build scope:** Vector retrieval, permission filtering, freshness filtering, citation anchors, retrieval logs, prompt/workflow/agent dependencies, and required knowledge behavior.

**Exit criteria:** Agents can retrieve only approved permitted chunks and produce citation trace for claim-sensitive outputs.

---

### Phase 3 — Conflict and Quality Controls

**Build scope:** Duplicate detection, claim detection, sensitive-data scan, offensive-language scan, conflict detection, stale-source warnings, and review SLAs.

**Exit criteria:** High-risk knowledge issues are flagged before production use and routed to accountable owners.

---

### Phase 4 — Enterprise Readiness

**Build scope:** Connectors, multi-region readiness, advanced taxonomy, dependency graph, evidence bundles, export controls, and analytics dashboards.

**Exit criteria:** Enterprise customers can govern large, multi-brand, multi-market knowledge operations with defensible evidence.

---

## 22. Final Engineering Handoff Checklist

| Checklist Item | Required Before Release |
|---|---|
| **Collections** | Create, edit, view, approve, activate, restrict, retire, and audit collections. |
| **Sources** | Upload, parse, normalize, classify, review, approve, publish, version, expire, retire, and quarantine sources. |
| **Chunks and embeddings** | Create chunk records, citation anchors, embeddings, status, and re-embedding controls. |
| **Metadata** | Required metadata enforced before review and before activation. |
| **RBAC and ABAC** | Permissions tested across tenant, role, sensitivity, brand, locale, agent, prompt, and workflow context. |
| **Retrieval service** | Permission-filtered, freshness-filtered, authority-ranked retrieval with logs and reason codes. |
| **Citations** | Citations capture source ID, version ID, chunk ID, retrieval event ID, and output ID. |
| **Conflicts** | Conflict detection, owner assignment, severity, blocking rule, and resolution workflow implemented. |
| **Evidence Vault** | All material actions produce evidence events with required payload. |
| **Notifications** | Review, expiry, conflict, parsing failure, quarantine, and overdue alerts implemented. |
| **Analytics** | Coverage, staleness, retrieval, citation, conflict, review SLA, and dependency metrics available. |
| **QA** | All acceptance scenarios pass, including tenant isolation, stale source blocking, unauthorized retrieval blocking, and prior-output traceability. |

---

> **Final Build Standard**
> This document is the implementation-grade contract for the ZoikoVertex Knowledge Base page. A release should **not** be accepted if:
> - Sources can reach agents without approval
> - Retrieval can bypass permissions
> - Citations cannot trace to source versions
> - Stale or conflicting knowledge is not controlled
> - Evidence events are missing

---

*Confidential — Product, UX, Governance, Runtime, Evidence, and Engineering Handoff*