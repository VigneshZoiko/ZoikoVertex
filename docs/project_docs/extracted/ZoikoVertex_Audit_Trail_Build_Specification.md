**ZoikoVertex | Evidence Layer | Audit Trail Build Specification**

**ZoikoVertex**

**Audit Trail**

**Evidence Layer | Module 1 of 4**

Full Engineering Build Specification, Wireframes, Governance Rules, Data Model, APIs, Acceptance Criteria, and Release Gates

|<p>**LOCKED DOCTRINE**</p><p>The Audit Trail is not an activity feed. It is the cryptographically chained record of authority and evidence: who did what, when, where, under which authority, with which evidence, and what changed as a result.</p>|
| :- |

|**Field**|**Value**|
| :-: | :-: |
|Document Class|Engineering Build Specification|
|Product|ZoikoVertex|
|Layer|Evidence Layer|
|Module|Audit Trail|
|Revision|v2.0 Full Lock|
|Status|Locked for Engineering Build|
|Language|American English|
|Prepared for|ZoikoVertex Engineering, Product, Security, Compliance, Legal, and Design Teams|
|Confidentiality|Confidential - Zoiko Tech Inc.|
|Date|20 May 2026|


# **Table of Contents**
1\. Executive Lock

2\. Module Scope and Non-Negotiables

3\. Product Doctrine and Governance Positioning

4\. User Roles, Personas, and Permission Boundaries

5\. Information Architecture and Navigation

6\. Primary Audit Trail Page Wireframe

7\. Detail Drawer Wireframe

8\. Full Event Page Wireframe

9\. Filters, Saved Views, Search, and Bulk Actions

10\. Cryptographic Integrity Model

11\. Event Ingestion and Append-Only Write Path

12\. Retention, Sealing, Archiving, and Legal Hold

13\. Canonical Event Taxonomy

14\. Sensitive Events and Elevated Access Rules

15\. Field-Level Access Control Matrix

16\. Correlation Engine

17\. Evidence Actions: Preserve, Export, Create Investigation

18\. Real-Time Streaming and SIEM Integration

19\. API Surface

20\. Canonical AuditEvent Schema

21\. Storage, Indexing, Data Residency, and Scaling

22\. Security, Privacy, and Compliance Controls

23\. UX States, Empty States, Error States, and Accessibility

24\. Observability and Operations

25\. Performance Budgets

26\. Build Phases and Release Gates

27\. QA Plan and Acceptance Criteria

28\. Engineering Handoff Checklist

Appendix A. Event Type Registry

Appendix B. Export Package Manifest

Appendix C. Glossary

# **1. Executive Lock**
This full specification replaces the shorter locked document and is the canonical build reference for the ZoikoVertex Audit Trail module. The document is written for tactile engineers who build directly from specifications. It therefore defines the product behavior, user experience, permissions, data model, API surface, cryptographic integrity model, retention policy, release gates, QA paths, and acceptance criteria in explicit implementation language.

|<p>**ENGINEERING LOCK**</p><p>Do not build a generic activity log. Build a verifiable evidence system. Every event must be append-only, hash-chained, permission-filtered, exportable, preservable, correlated, and defensible under legal, compliance, security, and customer audit review.</p>|
| :- |

|**Decision Area**|**Locked Decision**|
| :-: | :-: |
|Module identity|Audit Trail - Evidence Layer Module 1 of 4.|
|Primary users|Admin, Security, Compliance, Legal, Campaign Manager, Publisher, Executive Viewer, External Auditor.|
|Default page purpose|Scan, filter, investigate, verify, preserve, export, and route audit events.|
|Data integrity posture|Per-tenant append-only event chain using canonical payload hashing and previous block hash linkage.|
|Default sort|Newest first. Default range: last 24 hours.|
|Primary disclosure model|Table -> detail drawer -> full event page -> evidence package.|
|Write model|Internal event bus only. No external audit-event creation endpoint.|
|Retention posture|Standard, Extended, Regulated, Legal Hold. Legal Hold overrides all automated expiration.|
|Accessibility standard|WCAG 2.2 AA minimum across desktop, tablet, and mobile.|
|No-go behavior|Silent redaction, silent data loss, mutable audit records, color-only risk indicators, cross-tenant query leakage, unaudited exports.|

# **2. Module Scope and Non-Negotiables**
## **2.1 What the Audit Trail Must Do**
- **Capture every meaningful event:** user, identity, content, AI agent, approval, policy, platform, evidence, legal, system, and security events.
- **Preserve chain-of-trust:** hash-chain events so record alteration is detectable, auditable, and operationally escalated.
- **Support human investigation:** make events scannable, searchable, filterable, correlated, and exportable without forcing users into raw logs.
- **Enforce role-aware evidence access:** apply field-level access control server-side before serialization.
- **Create bridge actions:** send selected events to Evidence Vault and create Forensic Hub investigations from selected events.
- **Feed enterprise security:** stream events to SIEM, SOC, and compliance tools through secure subscriptions.
- **Prove operations:** show verification status, hash position, retention class, chain status, export history, and evidence lifecycle status in UI.
## **2.2 Explicit Out of Scope for Module 1**
- Deep case management belongs to Forensic Hub. Audit Trail can create investigations but does not manage investigation workflows.
- Evidence package custody and legal bundle management belong to Evidence Vault. Audit Trail can preserve and export selected records.
- Identity chronology and role lineage belong to Identity Ledger. Audit Trail references actor role at event time but does not own identity history.
- Approval decision execution belongs to the Accountability Layer. Audit Trail records the decision trail and provides evidence context.
## **2.3 Non-Negotiable Engineering Rules**
1. **Append-only only:** No update or delete path may mutate an existing audit event. Corrections are new events that reference the prior event.
1. **Server-side authorization:** The API must never send restricted fields and rely on the browser to hide them.
1. **Tenant isolation:** Every read, write, stream, export, and correlation query must include tenant boundary enforcement.
1. **Export is auditable:** Every export creates its own audit event with reason, requester, filters, record count, destination, and hash manifest.
1. **Evidence actions require reason:** Preserve, legal hold, export, and investigation creation require reason capture when risk, legal, or regulated events are included.
1. **Integrity must be visible:** Every event detail must show hash, previous hash, block number, verification state, and last verified timestamp for authorized roles.
1. **No silent failure:** Failure to write an audit event for a governed action must block the originating action unless the action is classified as non-critical telemetry.
# **3. Product Doctrine and Governance Positioning**
ZoikoVertex is a governed autonomous agentic social media management platform. The Audit Trail is the evidentiary base for that promise. It must prove that every user, agent, approval, policy, override, platform connection, content lifecycle step, and evidence action happened under the right authority and left a defensible record.

|<p>**DOCTRINE QUESTION**</p><p>The Audit Trail must answer one question without ambiguity: who did what, when, where, under which authority, with which evidence, and what changed as a result?</p>|
| :- |

|**Weak Version**|**Tier-0 Version**|
| :-: | :-: |
|Activity log|Cryptographically verifiable evidence ledger|
|Events displayed in a table|Events displayed, correlated, preserved, exported, and independently verified|
|Admin can see everything|Access is scoped, redacted, hashed, denied, or full based on role and reason|
|Compliance can export CSV|Compliance can generate reasoned, signed, manifest-backed evidence bundles|
|AI action history|Agent action provenance including prompt version, model version, confidence, policy rule, approval chain, and evidence references|
|Filter by date|Investigate by event, actor, agent, object, risk, policy, workflow, approval chain, brand, campaign, and evidence state|

# **4. User Roles, Personas, and Permission Boundaries**
The Audit Trail must support different users without collapsing all evidence into an unrestricted super-user view. The UI should expose what each user can safely act on and explain why a field or event is hidden when redaction is permitted.

|**Role**|**Primary Goal**|**Core Capabilities**|**Hard Restrictions**|
| :-: | :-: | :-: | :-: |
|Admin|Operate workspace and support governance operations.|View broad event history, configure saved views, run verification, manage subscriptions when permitted.|Cannot remove legal hold without Legal role; cannot alter existing events.|
|Security|Detect integrity, access, anomaly, session, and platform security issues.|View IP, device, session, chain state, SIEM delivery, security alerts, and integrity failures.|Cannot view raw model output unless explicitly granted.|
|Compliance|Review policy, approval, regulated content, audit exports, and controls.|Filter regulated events, export evidence, preserve events, review policy triggers, view approval lineage.|Sensitive security identifiers may be redacted unless needed.|
|Legal|Manage legal hold, investigations, evidence access, and regulator-ready export.|View legal hold records, export packages, preservation state, privileged actions, and chain of custody.|Cannot bypass dual authorization for legal hold release.|
|Campaign Manager|Review campaign-related actions, approvals, overrides, and publishing events.|Scoped events by brand, campaign, content object, and approval workflow.|No device/session/IP visibility; no raw model output for unrelated items.|
|Publisher|Review own publishing, submission, and assigned content activity.|Self-scoped event visibility, publication status, basic evidence state.|No override details outside their scope; no sensitive user fields.|
|Executive Viewer|Review governance posture, risk trends, and major events.|High-level read-only view, metrics, material event summaries, trend exports.|No personal device data or raw sensitive content unless elevated.|
|External Auditor|Validate controls without unnecessary data exposure.|Read-only, scoped, hashed identifiers, export manifests, verification proofs.|No PII unless approved by Legal and Compliance with reason logged.|

# **5. Information Architecture and Navigation**
## **5.1 Placement**
The Audit Trail belongs under the Evidence Layer navigation group. It is the first Evidence Layer module because Forensic Hub, Evidence Vault, and Identity Ledger depend on audit-event context.

|**Sidebar Group**|**Module**|**Purpose**|**Primary Route**|
| :-: | :-: | :-: | :-: |
|Evidence Layer|Audit Trail|Governance-grade chronological event ledger.|/evidence/audit-trail|
|Evidence Layer|Forensic Hub|Investigation workbench for cases, timelines, and findings.|/evidence/forensic-hub|
|Evidence Layer|Evidence Vault|Preserved evidence packages, legal holds, custody, and exports.|/evidence/evidence-vault|
|Evidence Layer|Identity Ledger|Actor identity, role history, permission lineage, and access authority.|/evidence/identity-ledger|

## **5.2 Page-Level Navigation**
- Top-level page tabs: Events, Saved Views, Exports, Streaming, Integrity, Retention.
- Default tab: Events.
- Integrity tab: chain verification status, verification jobs, broken link incidents, external anchors when implemented.
- Exports tab: completed and pending export jobs with requester, reason, filters, record count, manifest hash, and download expiration.
- Streaming tab: webhook, SIEM, and Kafka/Kinesis subscriptions with delivery health and dead-letter status.
- Retention tab: tenant retention defaults, legal hold rules, expiry queues, sealed record counts, and cold archive status.
# **6. Primary Audit Trail Page Wireframe**
## **6.1 Screen Purpose**
The primary page is not a dashboard. It is an investigation-ready event workbench. Users must be able to arrive, understand the current state, filter quickly, identify risky actions, open details, preserve evidence, export records, create investigations, and verify the chain without losing context.
## **6.2 Page Layout**

|**Zone**|**Required UI Elements**|**Behavior**|
| :-: | :-: | :-: |
|Header|Title, subtitle, chain status badge, last verified timestamp, Verify Chain button.|Status badge must use icon + text. Verify Chain opens job confirmation and shows progress.|
|Risk Summary Strip|Events today, high-risk, critical, overrides, AI actions, evidence preserved, chain status.|Each metric is clickable and applies a filter. Do not use color-only meaning.|
|Filter Bar|Date range, event type, actor, object, risk, status, source, evidence state, more filters.|Active filters show as chips. Clear all always visible when any filter is active.|
|Search|Global audit search field with event ID, actor, object, campaign, agent, workflow, policy ID.|Enter triggers search. Supports quoted exact search and ID prefix search.|
|Saved Views|Dropdown for user/team/system saved views.|Admin can create team views; Compliance can create compliance views.|
|Event Table|Selectable rows, sticky headers, newest first, 50 rows/page.|Click row opens drawer. Checkbox selection enables bulk actions.|
|Bulk Action Bar|Preserve, Export, Create Investigation, Add Legal Hold where authorized.|Appears only after selection. Requires confirmation and reason where required.|
|Right Detail Drawer|Event summary, metadata, actor, object, change, chain, related events, actions.|Drawer opens without losing table scroll or filter state.|
|Pagination|Rows per page, next/previous, cursor position.|Use cursor pagination, not offset pagination, for high-volume stability.|

## **6.3 Table Columns**

|**Column**|**Content**|**Rules**|
| :-: | :-: | :-: |
|Select|Checkbox.|Hidden for users without bulk-action permissions.|
|Time|Local display + UTC tooltip.|Relative timestamp optional; absolute UTC mandatory in detail.|
|Event|Human title + machine event type.|Machine event type in subdued monospace.|
|Actor|Human user, AI agent, service account, or system.|Show role at event time where permitted.|
|Object|Object name and ID.|Click opens object if user has route permission.|
|Risk|Low, Medium, High, Critical.|Text + icon. Critical rows get subtle emphasis, not alarmist UI.|
|Status|Success, failed, blocked, pending, overridden, preserved, sealed.|Status chip must be screen-reader friendly.|
|Evidence|Not preserved, preserved, locked, legal hold, exported.|Click opens evidence lifecycle panel if permitted.|
|Hash|Short hash or verified icon.|Visible in compact form; full hash in drawer.|

## **6.4 Table Row Priority Treatment**
- Critical risk events: left red bar, Critical text chip, warning icon, row appears in Critical saved view.
- High-risk override events: amber/red chip, override reason required in drawer.
- Preserved events: lock icon + preserved state; vault ID visible to authorized roles.
- Sealed events: show hash-only metadata and explain payload is archived or sealed.
- Restricted events: show opaque row only when user is allowed to know that an event occurred but not allowed to inspect details.
# **7. Detail Drawer Wireframe**
The drawer is the default inspection surface. It must answer the doctrine question in less than ten seconds for an informed operator.

|**Drawer Section**|**Required Fields**|**Behavior**|
| :-: | :-: | :-: |
|Event Header|Event title, event type, risk, status, timestamp UTC, event ID.|Copy event ID button. Risk explanation visible.|
|Doctrine Summary|Who, did what, when, where, authority, evidence, change result.|One-sentence generated summary using stored event fields, not live AI generation.|
|Actor Panel|Actor type, actor name, role at event, identity status, session, IP/device based on access.|Use redacted/hashed/denied treatment per matrix.|
|Object Panel|Object type, object ID, object name, related campaign/brand/content/workflow.|Related object links respect route permissions.|
|Authority Panel|Permission, policy rule, approval chain, override authority, emergency mode flag.|Mandatory for approval, policy, AI, publishing, and evidence events.|
|Change Panel|Before/after diff, changed fields, reason, result.|Show field-level diff first; raw JSON under advanced disclosure.|
|AI Provenance|Agent ID, agent version, prompt version, model version, confidence, policy checks, tokens.|Only for AI/agent events; redacted where required.|
|Chain Integrity|Block number, hash, previous hash, chain status, last verified.|Show copy hash buttons. Provide Verify around this block action for authorized roles.|
|Related Events|Timeline generated by correlation rules.|Default top 10. Full timeline button opens full event page timeline tab.|
|Actions|Preserve, Export, Create Investigation, Add Legal Hold, Copy Link.|Action visibility is role + event-state based.|

## **7.1 Drawer Required Microcopy**
- For redacted fields: "Redacted by access policy. Field exists but value is hidden."
- For denied fields: do not show the field at all; log field denial internally as audit.field\_redacted only when debug mode is active or export masking occurs.
- For hashed fields: "Hashed for correlation only. Original value is not exposed in this view."
- For sealed records: "Payload sealed. Hash metadata remains available. Full payload requires approved archive retrieval."
- For legal hold: "Legal hold active. Retention expiration is suspended until hold is released by authorized Legal approval."
# **8. Full Event Page Wireframe**
The full event page is for deep review, external audit walkthroughs, legal review, and complex investigations. It is opened from the drawer and has a permanent route: /evidence/audit-trail/events/{event\_id}.

|**Tab**|**Purpose**|**Required Content**|
| :-: | :-: | :-: |
|Overview|Readable event summary.|Event header, doctrine summary, risk, status, evidence lifecycle, primary actions.|
|Timeline|Decision and related event timeline.|Correlation rule used, related events, approval chain, workflow sequence, filters.|
|Diff|Before/after and raw payload review.|Field diff, value redaction indicators, raw event JSON for authorized roles.|
|Authority|Permission and policy context.|Role at event, permission grant, policy rules triggered, override reason, approval chain.|
|Integrity|Cryptographic proof.|Hash, previous hash, block number, chain status, verification jobs, external anchors when available.|
|Evidence|Evidence lifecycle.|Vault status, vault ID, exports, legal hold, preservation reason, custody timeline.|
|Access Log|Who viewed or exported this event.|Audit.access records, export records, redaction applied, field access state.|

# **9. Filters, Saved Views, Search, and Bulk Actions**
## **9.1 Required Filters**

|**Filter**|**Type**|**Default**|**Notes**|
| :-: | :-: | :-: | :-: |
|Date range|Preset + custom|Last 24 hours|Presets: 1h, 24h, 7d, 30d, custom.|
|Event category|Multi-select|All|Eight canonical categories.|
|Event type|Multi-select searchable|All|Machine event types from registry.|
|Actor|Search select|All|Human, agent, service account, system.|
|Object|Search|All|Object ID/name; supports campaign/content/policy/approval rule.|
|Risk|Multi-select|All|Low, medium, high, critical.|
|Status|Multi-select|All|success, failed, blocked, pending, overridden, preserved, sealed.|
|Evidence state|Multi-select|All|not\_preserved, preserved, sealed, archived, legal\_hold.|
|Workflow run ID|Exact/prefix|Blank|Used for deterministic investigation.|
|Approval chain ID|Exact/prefix|Blank|Used by accountability layer.|
|Policy rule ID|Exact/prefix|Blank|Used for governance review.|
|Data residency|Select|Tenant default|Visible to Admin/Security/Compliance/Legal.|

## **9.2 Search Rules**
- Search must support exact event ID, block number, actor name, actor ID, object ID, campaign ID, brand ID, workflow run ID, approval chain ID, policy rule ID, and agent ID.
- Search must never expose existence of events outside the user permission scope. For single-event lookup outside scope, return 404, not 403.
- Search should display "showing permission-filtered results" when the user role can receive partial results.
- Search must be index-backed; do not run unbounded text search over raw payloads in the transactional store.
## **9.3 Bulk Actions**

|**Action**|**Who Can Use**|**Required Inputs**|**Hard Rules**|
| :-: | :-: | :-: | :-: |
|Preserve to Evidence Vault|Admin, Security, Compliance, Legal|Reason, retention class, optional case link.|Creates evidence.preserved event and vault record.|
|Export|Admin, Security, Compliance, Legal, External Auditor scoped|Reason for regulated/high/legal events, format, fields, date range.|Creates evidence.exported event; async over 10K records.|
|Create Investigation|Security, Compliance, Legal|Investigation type, severity, assignee, reason.|Creates Forensic Hub case and investigation.created event.|
|Add Legal Hold|Legal, authorized Compliance with Legal approval|Matter ID, reason, approver, scope.|No auto-release. Removal requires dual authorization.|
|Copy Event Links|All permitted viewers|None.|Links must not bypass permissions.|

# **10. Cryptographic Integrity Model**

|<p>**CORE TECHNICAL PRINCIPLE**</p><p>Append-only is not a UI label. It is a cryptographic property created by canonical payload hashing, previous hash linkage, continuous verification, and operational incident handling when the chain breaks.</p>|
| :- |

## **10.1 Chain Structure**
- Maintain a separate hash chain per tenant to preserve tenant isolation and reduce blast radius.
- Within a tenant, block\_number is monotonically increasing. If regional shards are required, use tenant\_id + region + chain\_id + block\_number.
- Each event hash is calculated from the canonicalized event payload, schema\_version, tenant\_id, block\_number, timestamp\_utc, and prev\_hash.
- prev\_hash links to the immediately preceding event in the same chain. The genesis event uses prev\_hash = null and event\_type = chain.genesis\_created.
- Any attempt to alter a prior event changes its hash and breaks every subsequent link.
## **10.2 Hash Formula**

|canonical\_payload = canonicalize\_json(event\_payload\_without\_hash\_fields)<br>string\_to\_hash = tenant\_id + chain\_id + block\_number + schema\_version + canonical\_payload + prev\_hash<br>hash = "sha256:" + SHA256(string\_to\_hash)|
| :- |

## **10.3 Canonicalization Rules**
- JSON keys sorted lexicographically.
- No insignificant whitespace.
- UTC timestamps normalized to ISO 8601 with millisecond precision.
- Null fields included only when the schema requires explicit null; optional missing fields are omitted consistently.
- Arrays preserve order when order is meaningful; otherwise sort by stable identifier before hashing.
- Do not hash UI-only derived labels that can change without altering the evidence record.
## **10.4 Chain Verification**

|**Verification Type**|**Trigger**|**Behavior**|**Output**|
| :-: | :-: | :-: | :-: |
|Continuous worker|Every 60 seconds or configured interval.|Verifies recent blocks and samples historical ranges.|Health status, last verified block, broken count.|
|Scheduled deep verification|Nightly.|Verifies full chain or tenant-defined segments.|Verification job record and summary.|
|User-triggered verification|Verify Chain button.|Creates verification job for selected range or full tenant chain.|Progress, result, downloadable verification report.|
|Export verification|Before evidence export.|Verifies records included in export package.|Manifest with event hashes and chain head.|

## **10.5 Chain Break Behavior**
1. Raise P0 security incident with chain ID, block number, suspected range, and verification job ID.
1. Freeze audit-ledger writes for affected chain unless emergency write buffer is explicitly enabled by Security.
1. Page SecOps and Custodian role immediately.
1. Display system banner to authorized Admin, Security, Compliance, and Legal users.
1. Start forensic snapshot of affected chain, indices, and storage replicas.
1. Create chain.integrity\_failure event in emergency integrity log or alternate chain if primary chain writes are frozen.
1. Do not allow exports from affected range until verified, unless Legal approves an export marked "integrity under investigation."
# **11. Event Ingestion and Append-Only Write Path**
Services do not write directly to the audit table. They emit normalized audit commands to the internal Audit Bus. The Audit Trail service validates, enriches, assigns retention, assigns block position, computes hash, writes the event, updates read indices, and emits downstream stream events.

|**Stage**|**Service Responsibility**|**Failure Behavior**|
| :-: | :-: | :-: |
|Emit|Originating service sends audit command with event\_type, actor, object, context, and idempotency\_key.|If governed action and emit fails, block action.|
|Validate|Audit service validates schema, required fields, tenant, event type, idempotency.|Reject invalid command; return non-retryable error if schema invalid.|
|Enrich|Attach role\_at\_event, data residency, received\_at, policy context, workflow keys.|If enrichment fails for required fields, block governed action.|
|Assign|Assign chain\_id, block\_number, prev\_hash, retention\_class.|Use transactional lock or ordered log partition per tenant chain.|
|Hash|Canonicalize payload and compute hash.|Reject event if canonicalization fails.|
|Persist|Write immutable event to ledger store and append immutable storage object if applicable.|Retry safely using idempotency\_key. No duplicate events.|
|Index|Update read store/search index asynchronously.|UI may show event after index catches up; ledger remains source of truth.|
|Stream|Deliver to webhooks/SIEM/Kafka based on subscriptions.|Queue retry; never roll back ledger write due to stream failure.|

## **11.1 Correction Pattern**
If an event contains incorrect metadata, do not edit the event. Create a correction event that references the original event ID, states the corrected value, explains the reason, and links to the authority that approved the correction. The UI must display the original event and correction event together.

|event\_type: audit.event\_corrected<br>references: { original\_event\_id: "AUD-2026-00018492" }<br>change: { field\_changed: "actor.role\_at\_event", previous\_value: "Campaign Manager", new\_value: "Senior Campaign Manager" }<br>correction\_reason: "Role mapping sync delay corrected after Identity Ledger verification."|
| :- |

# **12. Retention, Sealing, Archiving, and Legal Hold**

|**Class**|**Default Duration**|**Applies To**|**Expiry Behavior**|**Override Rules**|
| :-: | :-: | :-: | :-: | :-: |
|Standard|2 years|Routine login, logout, platform sync, low-risk content edits, non-sensitive operational events.|Seal payload to hash-only metadata; archive payload to cold storage when required.|Tenant may extend, not shorten below platform minimum.|
|Extended|7 years|Approvals, publishing, AI recommendations/actions, policy trigger outcomes, integration connection changes.|Seal + cold archive; hash and summary remain searchable.|Legal hold overrides.|
|Regulated|10 years|Regulatory-sensitive events, evidence exports, audit access, security incidents, policy overrides, financial/health/legal claims.|Seal + cold archive; retrieval requires elevated reason.|Regulated tenant defaults may force this class.|
|Legal Hold|Indefinite|Litigation, regulator inquiry, internal investigation, chain integrity failures, privileged evidence.|No automated expiry. All access and attempted release audited.|Release requires Legal approval and second approver when configured.|

## **12.1 Retention Assignment Rules**
- Use event registry default retention class unless tenant policy elevates it.
- Any event connected to active investigation inherits Legal Hold while the investigation hold is active.
- Any event included in an evidence package inherits the package retention rule when stricter.
- Policy overrides, emergency approvals, external publication, evidence exports, and audit access must never be Standard retention.
- AI prompt and raw model output retention must respect tenant privacy configuration while preserving sufficient provenance for audit.
## **12.2 Sealed Record UI**
A sealed record must remain discoverable by hash, event ID, block number, timestamp, category, type, and non-sensitive summary. Payload retrieval must be a controlled workflow, not an automatic drawer expansion.
# **13. Canonical Event Taxonomy**
Every audit event belongs to exactly one category and one machine-readable event type. Event type creation requires registry update, schema validation, default risk level, default retention class, and test coverage.

|**Category**|**Canonical Event Types**|
| :-: | :-: |
|User & Identity|user.login, user.logout, user.login\_failed, user.mfa\_changed, user.role\_changed, user.permission\_elevated, user.deactivated|
|Content Lifecycle|content.created, content.edited, content.submitted, content.approved\_for\_review, content.published, content.deleted, content.withdrawn|
|AI & Agent|ai.draft\_generated, ai.recommendation, ai.action\_requested, ai.action\_approved, ai.action\_rejected, ai.action\_blocked, ai.confidence\_low, ai.policy\_grounding\_failed|
|Approval|approval.started, approval.granted, approval.rejected, approval.escalated, approval.rule\_overridden, approval.emergency\_used, approval.quorum\_failed|
|Policy & Governance|policy.rule\_triggered, policy.rule\_failed, policy.override, policy.rule\_created, policy.rule\_edited, policy.emergency\_pause, policy.simulation\_run|
|Platform & Integration|platform.connected, platform.disconnected, platform.token\_refreshed, platform.webhook\_failed, integration.error, integration.sync\_failed, integration.permission\_changed|
|Evidence & Legal|evidence.preserved, evidence.exported, evidence.legal\_hold\_applied, evidence.legal\_hold\_released, investigation.created, chain.verification\_run, chain.integrity\_failure|
|System & Security|system.config\_changed, system.deployment, security.alert, security.incident, audit.access, audit.field\_redacted, audit.subscription\_changed|

## **13.1 Registry Metadata Required Per Event Type**
- event\_type, category, display title, description, default risk level, default retention class, required actor fields, required object fields, required authority fields, required evidence fields, PII classification, field redaction profile, streaming eligibility, export eligibility, and test fixture.
# **14. Sensitive Events and Elevated Access Rules**
Certain events are sensitive by default and must require elevated access, explicit reason capture, or Legal/Compliance review before export.

|**Sensitive Event Group**|**Examples**|**Elevated Rule**|
| :-: | :-: | :-: |
|Permission changes|user.role\_changed, user.permission\_elevated|Visible to Admin/Security/Compliance/Legal; export reason required.|
|Policy overrides|policy.override, approval.rule\_overridden|High-risk by default; preserve option prominent.|
|Emergency actions|approval.emergency\_used, policy.emergency\_pause|Legal/Compliance visibility; requires authority context.|
|Security incidents|security.alert, security.incident, chain.integrity\_failure|Security + Legal access; executive summary for Exec Viewer.|
|Audit access|audit.access, evidence.exported|Access to audit records is itself auditable.|
|Raw AI output|ai.draft\_generated with raw output|Restricted to authorized roles; redacted for most business users.|
|External publication|content.published|Extended or regulated retention depending on tenant sector.|
|Evidence/legal hold|evidence.legal\_hold\_applied, evidence.legal\_hold\_released|Legal approval required; all views audited.|
|Platform tokens|platform.token\_refreshed, integration.permission\_changed|Never expose token data; show metadata only.|
|PII-bearing changes|actor email/IP/device/session or customer data payload|Apply field matrix; export masking by default.|

Confidential | Zoiko Tech Inc. | For Engineering Lock | Page 
**ZoikoVertex | Evidence Layer | Audit Trail Build Specification**
# **15. Field-Level Access Control Matrix**
Field access must be enforced server-side before response serialization. The UI must not receive values it is not permitted to render. Access states: Full = value returned; Redacted = field exists and redaction marker returned; Hashed = stable hash returned for correlation; Denied = field absent from response.

|**Field**|**Admin**|**Security**|**Compliance**|**Legal**|**Campaign Mgr**|**Publisher**|**Exec Viewer**|**External Auditor**|
| :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: |
|event\_id, timestamp, type, summary|Full|Full|Full|Full|Full|Full|Full|Full|
|actor\_name, actor\_role|Full|Full|Full|Full|Full|Self only|Full|Hashed|
|actor\_email|Full|Full|Full|Full|Self only|Self only|Redacted|Hashed|
|ip\_address|Full|Full|Redacted|Full|Denied|Denied|Denied|Hashed|
|device\_fingerprint|Full|Full|Redacted|Redacted|Denied|Denied|Denied|Denied|
|session\_id|Full|Full|Hashed|Hashed|Denied|Denied|Denied|Denied|
|object\_id, related\_objects|Full|Full|Full|Full|Scoped|Scoped|Full|Full|
|before / after values|Full|Full|Full|Full|Scoped|Denied|Full|Full/Masked|
|policy\_rule\_id, override\_reason|Full|Full|Full|Full|Scoped|Denied|Full|Full|
|ai prompt\_id, model\_version|Full|Full|Full|Redacted|Redacted|Denied|Redacted|Hashed|
|raw model output content|Full|Redacted|Full|Full|Denied|Denied|Denied|Denied|
|hash, prev\_hash, block\_number|Full|Full|Full|Full|Full|Full|Full|Full|
|retention\_until, legal\_hold|Full|Full|Full|Full|Scoped|Denied|Summary|Full|
|export manifest hash|Full|Full|Full|Full|Denied|Denied|Summary|Full|

Confidential | Zoiko Tech Inc. | For Engineering Lock | Page 
**ZoikoVertex | Evidence Layer | Audit Trail Build Specification**
# **16. Correlation Engine**
Related events must be generated through deterministic rules, not vague similarity. The drawer and full event page must state which correlation rule produced the timeline when useful to elevated users.

|**Priority**|**Rule**|**Deterministic Query Logic**|**Default Limit**|
| :-: | :-: | :-: | :-: |
|1|Same workflow run|workflow\_run\_id equals target.workflow\_run\_id. Return ordered sequence from workflow start to terminal state.|50|
|2|Same content object lineage|object\_id or related\_object\_id matches target object lineage: campaign -> asset -> post. Time-windowed by lineage start/end.|50|
|3|Same approval chain|approval\_chain\_id equals target.approval\_chain\_id. Include submission, review, escalation, validation, override, rejection, approval.|50|
|4|Same actor narrow window|actor\_id equals target.actor\_id within +/- 15 minutes. Used for session reconstruction.|25|
|5|Same campaign or brand scope|campaign\_id or brand\_id matches target within +/- 2 hours. Broad fallback with permission filtering.|25|

## **16.1 Correlation Permission Rules**
- Correlation queries must run against denormalized read indices but results must still be permission-filtered before response.
- Restricted related events may display as opaque timeline items only where the user is allowed to know that an event occurred.
- Do not leak actor names, object names, IP, session, prompt, or raw content through related-event labels.
- Full timeline uses cursor pagination and preserves original target event context.
# **17. Evidence Actions: Preserve, Export, Create Investigation**
## **17.1 Preserve to Evidence Vault**
- Available from row selection, drawer, and full event page for authorized roles.
- Requires reason, retention class, optional matter ID, optional investigation link, and acknowledgement of custody impact.
- Creates Evidence Vault item with event IDs, hashes, retention state, actor, timestamp, and preservation reason.
- Creates evidence.preserved audit event referencing all preserved event IDs and vault ID.
## **17.2 Export**

|**Export Format**|**Use Case**|**Rules**|
| :-: | :-: | :-: |
|CSV|Operational review and large datasets.|No raw restricted fields unless explicitly included by role. Include manifest separately.|
|JSON|SIEM/compliance ingestion or technical review.|Canonical JSON lines preferred for large exports.|
|PDF|Legal/audit packet and executive walkthrough.|Include readable summary, filters, chain verification, manifest hash.|
|Evidence Bundle ZIP|Regulatory package.|Contains manifest.json, events.jsonl, summary.pdf, hashes.txt, verification\_report.pdf.|

## **17.3 Create Investigation**
- Create Forensic Hub investigation from one or more selected events.
- Required fields: investigation\_type, severity, title, assignee, reason, initial event list.
- System should suggest title from highest-risk event but allow editing.
- Created case must backlink to originating Audit Trail filter selection and event IDs.
- Investigation creation must not alter original audit events.
# **18. Real-Time Streaming and SIEM Integration**

|**Pattern**|**Destination**|**Security**|**Retry / Delivery**|**Notes**|
| :-: | :-: | :-: | :-: | :-: |
|Webhook Push|Customer HTTPS endpoint|HMAC-SHA256 signature; rotating secret.|5 attempts: 1m, 5m, 15m, 1h, 6h. Dead-letter after failure.|Best for product integrations.|
|SIEM Connector|Splunk, Datadog, Microsoft Sentinel, Elastic, Sumo Logic|OAuth/API key per connector; tenant-scoped.|Continuous delivery with backlog monitoring.|Support JSON, CEF, OCSF.|
|Kafka/Kinesis|Dedicated tenant stream/topic|SASL/SCRAM, IAM, or managed private link.|Consumer-driven; 7-day stream retention default.|High-volume enterprise tenants.|

## **18.1 Streaming Payload Rules**
- Streaming payloads must respect field-level access and tenant subscription scope.
- Include event\_id, event\_type, timestamp\_utc, risk, status, tenant\_id pseudonym where appropriate, object references, hash, prev\_hash, and schema\_version.
- Never stream raw tokens, secrets, platform access credentials, or unrestricted device fingerprints.
- Subscription creation, update, failure, and deletion are audit events.
# **19. API Surface**
The external Audit Trail API is read-heavy. Writes are internal through the Audit Bus. This prevents customers or compromised integrations from fabricating audit records.

|**Method**|**Endpoint**|**Purpose**|**Key Rules**|
| :-: | :-: | :-: | :-: |
|GET|/api/audit-events|List events with filters and cursor pagination.|Field access matrix applied. Default last 24h. Limit max 100.|
|GET|/api/audit-events/{event\_id}|Single event detail.|Return 404 outside scope to prevent enumeration.|
|GET|/api/audit-events/{event\_id}/related|Related events timeline.|Uses correlation rules and permission filtering.|
|GET|/api/audit-events/chain/verify|Check or trigger verification.|May return existing running job. Role-restricted.|
|POST|/api/audit-events/export|Create async export job.|Reason required for regulated/high/legal events.|
|POST|/api/audit-events/preserve|Send selected events to Evidence Vault.|Reason and retention class required.|
|POST|/api/audit-events/create-investigation|Create Forensic Hub investigation.|Requires investigation metadata and event selection.|
|GET|/api/audit-events/exports|List export jobs.|Scoped to role and tenant. External auditors see assigned exports.|
|POST|/api/audit-events/subscriptions|Create streaming subscription.|Admin/Security only unless tenant policy permits Compliance.|
|PATCH|/api/audit-events/subscriptions/{id}|Update streaming subscription.|Audit event created on change.|
|DELETE|/api/audit-events/subscriptions/{id}|Disable subscription.|Soft-delete; audit event required.|

## **19.1 API Error Rules**

|**Condition**|**Response**|**Reason**|
| :-: | :-: | :-: |
|Event outside tenant or permission scope|404|Avoid enumeration.|
|Known event but field restricted|200 with redaction markers|Allow safe review without leaking data.|
|Invalid filter|400 with field-level error|Help engineering and UI resolve quickly.|
|Export too large for sync|202 accepted|Async job required.|
|Chain verification already running|202 with existing job ID|Prevent duplicate jobs.|
|Ledger integrity incident active|423 locked for affected range|Prevent unsafe exports/actions.|

# **20. Canonical AuditEvent Schema**
The schema below is the implementation baseline. Additive optional fields are permitted through versioned schema changes. Existing fields must not be removed or repurposed.

|{<br>`  `"event\_id": "AUD-2026-00018492",<br>`  `"tenant\_id": "TEN-001",<br>`  `"workspace\_id": "WRK-001",<br>`  `"chain\_id": "chain\_eu\_west\_ten\_001",<br>`  `"block\_number": 4829182,<br>`  `"hash": "sha256:f021...7d9c",<br>`  `"prev\_hash": "sha256:8b3d...2c4f",<br>`  `"schema\_version": "1.0",<br>`  `"data\_residency": "eu-west",<br>`  `"event\_category": "approval",<br>`  `"event\_type": "approval.rule\_overridden",<br>`  `"event\_title": "Approval Rule Override",<br>`  `"event\_summary": "Daniel Price overrode AR-014 for CMP-042.",<br>`  `"timestamp\_utc": "2026-05-20T14:31:00.247Z",<br>`  `"received\_at": "2026-05-20T14:31:00.289Z",<br>`  `"actor": {<br>`    `"actor\_id": "USR-091",<br>`    `"actor\_type": "human\_user",<br>`    `"actor\_name": "Daniel Price",<br>`    `"role\_at\_event": "Campaign Manager",<br>`    `"session\_id": "SES-883910",<br>`    `"ip\_address": "203.0.113.42",<br>`    `"device\_fingerprint": "df\_8a7c3...",<br>`    `"geolocation\_country": "GB"<br>`  `},<br>`  `"object": {<br>`    `"object\_type": "approval\_rule",<br>`    `"object\_id": "AR-014",<br>`    `"object\_name": "Sensitive Claim Legal Review Rule"<br>`  `},<br>`  `"related\_objects": [<br>`    `{ "type": "campaign", "id": "CMP-042" },<br>`    `{ "type": "content", "id": "CNT-1029" }<br>`  `],<br>`  `"correlation": {<br>`    `"workflow\_run\_id": "wfr\_3392",<br>`    `"approval\_chain\_id": "ach\_8821",<br>`    `"campaign\_id": "CMP-042",<br>`    `"brand\_id": "brand\_a"<br>`  `},<br>`  `"authority": {<br>`    `"permission\_used": "approval.override",<br>`    `"policy\_rule\_id": "AR-014",<br>`    `"approval\_required": true,<br>`    `"override\_reason": "Time-sensitive correction",<br>`    `"override\_authority": "Emergency override permission"<br>`  `},<br>`  `"change": {<br>`    `"field\_changed": "approval\_required",<br>`    `"previous\_value": true,<br>`    `"new\_value": false,<br>`    `"change\_reason": "Time-sensitive correction"<br>`  `},<br>`  `"ai\_context": {<br>`    `"agent\_id": "AGT-004",<br>`    `"agent\_version": "1.8.2",<br>`    `"prompt\_version\_id": "prv\_018",<br>`    `"model\_version": "model\_high\_v3",<br>`    `"confidence\_level": 4,<br>`    `"tokens\_consumed": 3420<br>`  `},<br>`  `"risk": {<br>`    `"level": "high",<br>`    `"reasons": ["approval\_rule\_bypassed", "legal\_review\_skipped"]<br>`  `},<br>`  `"status": "overridden",<br>`  `"evidence": {<br>`    `"retention\_class": "regulated",<br>`    `"retention\_until": "2036-05-20T14:31:00Z",<br>`    `"vault\_status": "preserved",<br>`    `"vault\_id": "EV-2026-00091",<br>`    `"legal\_hold": false,<br>`    `"investigation\_links": []<br>`  `}<br>}|
| :- |

# **21. Storage, Indexing, Data Residency, and Scaling**

|**Concern**|**Required Implementation**|
| :-: | :-: |
|Ledger source of truth|Immutable append-only store/table partitioned by tenant\_id, chain\_id, and time. No UPDATE/DELETE permissions for application role.|
|Read model|Denormalized read store/search index optimized for filters and correlation. Rebuildable from ledger.|
|Idempotency|Every emitted event command requires idempotency\_key from origin service. Duplicate commands return existing event ID.|
|Ordering|Use per-tenant chain lock, ordered log partition, or sequence allocator. Do not rely on client timestamps for ordering.|
|Clock drift|received\_at - timestamp\_utc must be calculated and stored. Large drift creates warning metadata.|
|Data residency|Events stored, indexed, streamed, exported, and archived in tenant configured region unless contract permits transfer.|
|Cold archive|Archived payloads stored in encrypted object storage with manifest and retrieval workflow.|
|Search index rebuild|Rebuilds must not alter ledger. Rebuild job must verify record count and chain consistency.|
|High volume|Design for 10M+ events/day per large tenant in read model; streaming and export must be async/backpressure-aware.|

# **22. Security, Privacy, and Compliance Controls**
- All event payloads encrypted at rest and in transit.
- Secrets, tokens, OAuth refresh tokens, passwords, private keys, and raw credentials must never be stored in audit payloads.
- PII fields classified and access-controlled through the field matrix.
- Country-level geolocation is permitted; city-level or precise coordinates require explicit customer configuration and privacy review.
- Audit access must itself create audit.access events for elevated views, export previews, and retrieval of sealed payloads.
- External auditor access must be time-bound, scoped, reasoned, and revocable.
- Legal hold release must require dual approval where tenant governance policy enables it.
- Do not expose chain internals to unauthorized users; show high-level verified state only.
# **23. UX States, Empty States, Error States, and Accessibility**
## **23.1 Required States**

|**State**|**Required UX**|
| :-: | :-: |
|First load|Skeleton table with header and metric placeholders. Do not show blank white page.|
|No events|Explain no events match current date/filter. Provide Clear Filters and change date range actions.|
|No permission|Explain the user does not have access to this audit view. Do not reveal counts.|
|Filtered no results|Show active filters and a single Clear Filters action.|
|Export pending|Show async job state, estimated completion, and notification path.|
|Streaming backlog|Show degraded streaming warning to Admin/Security with subscription affected.|
|Chain verification running|Show progress, range, started by, and safe navigation away.|
|Chain break detected|Show P0 banner to authorized roles; disable unsafe exports/actions for affected range.|
|Index lag|Show "Some recent events may still be indexing" when read model lags ledger.|

## **23.2 Accessibility Requirements**
- WCAG 2.2 AA minimum.
- Every risk and status indicator must include text, not color alone.
- Keyboard access for filters, table, drawer, tabs, modal confirmations, and bulk actions.
- Focus trap in drawer and modals; focus returns to originating row on close.
- Table headers must be semantic and sticky without breaking screen reader navigation.
- Timestamp tooltips must have accessible equivalents.
- Export and preserve confirmation modals must be readable by screen readers and include clear action labels.
# **24. Observability and Operations**

|**Metric / Signal**|**Owner**|**Alert Threshold**|
| :-: | :-: | :-: |
|Audit write latency p95|Platform Engineering|>200ms for 5 minutes.|
|Audit write failures|Platform Engineering/SecOps|Any governed action write failure.|
|Chain verification failures|SecOps|Any broken link or verification exception.|
|Index lag|Platform Engineering|>2 minutes for high-volume tenants.|
|Export job failure rate|Platform Engineering|>2% over 30 minutes.|
|Streaming backlog|SecOps/Integrations|Backlog >10,000 events or >5 minutes old.|
|Webhook dead-letter count|Integrations|Any critical customer subscription dead-lettered.|
|Legal hold release|Legal/Compliance|Every release notification required.|
|Cross-tenant access attempt|SecOps|Any detected attempt.|

# **25. Performance Budgets**

|**Operation**|**P50 Target**|**P95 Acceptable**|**P99 Degraded**|**Failure Behavior**|
| :-: | :-: | :-: | :-: | :-: |
|Write audit event|<50ms|<200ms|<500ms|Block governed originating action; alert if sustained.|
|List events 50/page filtered|<200ms|<800ms|<2s|Show degraded banner; preserve filter state.|
|Single event detail|<100ms|<400ms|<1s|Retry once; show safe error.|
|Search by ID/actor/object|<300ms|<1s|<3s|Suggest narrowing filter.|
|Correlation timeline|<400ms|<1.5s|<4s|Return top results and allow async full timeline.|
|Verify 100K blocks|<5s|<15s|<60s|Background job; notify completion.|
|Export 10K PDF|<30s|<90s|<5min|Async job.|
|Export 100K JSON/CSV|<2min|<10min|<30min|Async download link.|
|SIEM stream delivery|<1s|<5s|<30s|Queue buffering; backlog alert.|

# **26. Build Phases and Release Gates**

|**Phase**|**Scope**|**Must Ship**|**Release Gate**|
| :-: | :-: | :-: | :-: |
|Phase 1 - Foundation|Audit capture, read, table, drawer, hash chain, retention, field matrix.|Append-only write path, hash chain, verification worker, table, basic filters, detail drawer, CSV/JSON export.|1M event load test; chain integrity verified; no cross-tenant leakage; WCAG core pass.|
|Phase 2 - Governance Depth|Correlation, saved views, advanced diff, streaming basics, export jobs.|Correlation engine, before/after diff, saved views, webhook, Splunk/Datadog connectors, PDF export.|SIEM p95 <5s; 100K export async success; deterministic correlation tests pass.|
|Phase 3 - Evidence Integration|Evidence Vault and Forensic Hub bridge actions, legal hold, chain of custody.|Preserve to Vault, Create Investigation, legal hold enforcement, evidence bundle ZIP, Sentinel/Elastic connectors.|End-to-end Evidence Layer test; legal hold override test; evidence bundle manifest verified.|
|Phase 4 - External Assurance|Optional enterprise hardening.|External chain anchoring, customer verification portal, private connectivity, custom retention.|Customer security design partner sign-off.|

# **27. QA Plan and Acceptance Criteria**
## **27.1 QA Test Categories**
- Unit tests: schema validation, canonicalization, hash calculation, field access policies, retention assignment.
- Integration tests: write path, Audit Bus, ledger persistence, read model indexing, SIEM streaming, export jobs.
- Security tests: cross-tenant access, role matrix, redaction, hashed fields, denied fields, legal hold release authorization.
- Performance tests: 1M, 10M, and sustained high-volume event workloads.
- UX tests: filtering, search, drawer, full page, modals, mobile event cards, keyboard navigation.
- Forensic tests: chain break simulation, archive retrieval, export manifest verification, preservation workflow.
- Regression tests: event registry additions, schema version compatibility, index rebuild accuracy.
## **27.2 Acceptance Criteria**
1. No code path can mutate or delete an existing audit event after creation.
1. Every event is hash-chained to its predecessor with reproducible canonicalization.
1. Chain break simulation triggers P0 incident workflow and freezes affected chain actions.
1. All four retention classes are implemented with correct legal hold override behavior.
1. Expired records seal to hash-only metadata and archive payload according to policy.
1. Field-level access matrix is enforced server-side and covered by automated tests.
1. Redacted, hashed, and denied fields behave differently and consistently.
1. Event taxonomy is registry-backed; unregistered event type is rejected.
1. Default event table loads last 24 hours newest first with cursor pagination.
1. Search supports event ID, actor, object, workflow, approval chain, policy, campaign, brand, and agent IDs.
1. Detail drawer preserves table position and filter state on close.
1. Full event page supports Overview, Timeline, Diff, Authority, Integrity, Evidence, and Access Log tabs.
1. Correlation engine implements all five deterministic rules and respects permissions.
1. Every export creates an audit event and includes a manifest hash.
1. Large exports run asynchronously and provide progress and completion notification.
1. Preserve to Evidence Vault requires reason and creates evidence.preserved audit event.
1. Create Investigation creates Forensic Hub case and investigation.created audit event.
1. Legal hold release requires Legal authority and logs all actions.
1. Webhook streaming uses HMAC-SHA256 signature and retry/dead-letter behavior.
1. SIEM events support JSON, CEF, and OCSF where implemented.
1. Streaming subscriptions are themselves auditable.
1. No raw secrets or tokens are stored in audit payloads.
1. Data residency is enforced for storage, indexing, streaming, export, and archive.
1. Performance budgets are met at agreed test volumes.
1. Observability dashboards include write latency, failures, verification, index lag, export failure, and streaming backlog.
1. Mobile supports search, filter, event cards, drawer/full page, export request, preserve, and investigation creation where authorized.
1. Risk and status indicators are never color-only.
1. Keyboard navigation and screen reader labels pass WCAG 2.2 AA test plan.
1. 404 is returned for event lookup outside permission scope to avoid enumeration.
1. Audit access events are created for elevated views and exports.
1. Index rebuild can be performed from ledger without changing ledger records.
1. Engineering, Security, Compliance, Legal, Product, and Design sign off independently.
# **28. Engineering Handoff Checklist**

|**Owner**|**Checklist**|
| :-: | :-: |
|Product|Confirm module scope, default user journeys, event registry ownership, and phase boundaries.|
|Design|Deliver responsive screens for table, drawer, full page, filters, exports, verify chain, preserve, investigation, legal hold.|
|Frontend|Build role-aware UI, table/drawer state preservation, accessible filters, async job states, mobile parity.|
|Backend|Build Audit Bus, validation, enrichment, chain assignment, hash calculation, ledger persistence, read API, export jobs.|
|Data|Design partitioning, indexing, read model, retention jobs, archive lifecycle, data residency controls.|
|Security|Validate cryptographic model, field access matrix, SIEM delivery, chain break incident workflow, cross-tenant tests.|
|Compliance|Validate retention, export fields, evidence package, audit access, redaction behavior, regulated event classes.|
|Legal|Validate legal hold, release authority, archive retrieval, export reason capture, evidence manifest, regulator-ready language.|
|QA|Create test suites for schema, performance, permissions, UX states, accessibility, exports, chain break, streaming.|
|DevOps|Implement observability, alerts, runbooks, incident handling, deployment migration, backfill strategy, load testing.|

# **Appendix A. Event Type Registry - Initial Build Set**

|**Category**|**Event Type**|**Default Risk**|**Default Retention**|
| :-: | :-: | :-: | :-: |
|User & Identity|user.login|Low|Standard|
|User & Identity|user.logout|Low|Standard|
|User & Identity|user.login\_failed|Low|Standard|
|User & Identity|user.mfa\_changed|Low|Standard|
|User & Identity|user.role\_changed|Medium|Standard|
|User & Identity|user.permission\_elevated|High|Regulated|
|User & Identity|user.deactivated|Low|Standard|
|Content Lifecycle|content.created|Low|Standard|
|Content Lifecycle|content.edited|Low|Standard|
|Content Lifecycle|content.submitted|Low|Standard|
|Content Lifecycle|content.approved\_for\_review|Low|Standard|
|Content Lifecycle|content.published|Medium|Extended|
|Content Lifecycle|content.deleted|Low|Standard|
|Content Lifecycle|content.withdrawn|Low|Standard|
|AI & Agent|ai.draft\_generated|Low|Extended|
|AI & Agent|ai.recommendation|Low|Extended|
|AI & Agent|ai.action\_requested|Low|Extended|
|AI & Agent|ai.action\_approved|Low|Extended|
|AI & Agent|ai.action\_rejected|Low|Extended|
|AI & Agent|ai.action\_blocked|High|Extended|
|AI & Agent|ai.confidence\_low|Low|Extended|
|AI & Agent|ai.policy\_grounding\_failed|Low|Extended|
|Approval|approval.started|Low|Extended|
|Approval|approval.granted|Low|Extended|
|Approval|approval.rejected|Low|Extended|
|Approval|approval.escalated|Low|Extended|
|Approval|approval.rule\_overridden|Low|Extended|
|Approval|approval.emergency\_used|Low|Regulated|
|Approval|approval.quorum\_failed|Low|Extended|
|Policy & Governance|policy.rule\_triggered|Medium|Extended|
|Policy & Governance|policy.rule\_failed|Low|Extended|
|Policy & Governance|policy.override|High|Regulated|
|Policy & Governance|policy.rule\_created|Low|Extended|
|Policy & Governance|policy.rule\_edited|Low|Extended|
|Policy & Governance|policy.emergency\_pause|Critical|Regulated|
|Policy & Governance|policy.simulation\_run|Low|Extended|
|Platform & Integration|platform.connected|Low|Extended|
|Platform & Integration|platform.disconnected|Low|Extended|
|Platform & Integration|platform.token\_refreshed|Low|Standard|
|Platform & Integration|platform.webhook\_failed|Low|Standard|
|Platform & Integration|integration.error|Low|Standard|
|Platform & Integration|integration.sync\_failed|Low|Standard|
|Platform & Integration|integration.permission\_changed|Low|Regulated|
|Evidence & Legal|evidence.preserved|Low|Standard|
|Evidence & Legal|evidence.exported|Medium|Regulated|
|Evidence & Legal|evidence.legal\_hold\_applied|High|Regulated|
|Evidence & Legal|evidence.legal\_hold\_released|High|Regulated|
|Evidence & Legal|investigation.created|Low|Extended|
|Evidence & Legal|chain.verification\_run|Low|Standard|
|Evidence & Legal|chain.integrity\_failure|Critical|Regulated|
|System & Security|system.config\_changed|Low|Standard|
|System & Security|system.deployment|Low|Standard|
|System & Security|security.alert|Low|Regulated|
|System & Security|security.incident|Critical|Regulated|
|System & Security|audit.access|Low|Standard|
|System & Security|audit.field\_redacted|Low|Standard|
|System & Security|audit.subscription\_changed|Low|Standard|

# **Appendix B. Export Package Manifest**
Every evidence export package must include a manifest that allows independent review of what was exported, why it was exported, who exported it, which filters were used, how many records were included, and whether the chain verified at the time of export.

|{<br>`  `"export\_id": "EXP-2026-000219",<br>`  `"tenant\_id": "TEN-001",<br>`  `"requested\_by": "USR-027",<br>`  `"requested\_at": "2026-05-20T16:14:12.001Z",<br>`  `"reason": "Regulatory review request",<br>`  `"filters": { "date\_from": "2026-05-01", "date\_to": "2026-05-20", "risk": ["high", "critical"] },<br>`  `"record\_count": 2184,<br>`  `"formats": ["summary.pdf", "events.jsonl", "hashes.txt"],<br>`  `"field\_redaction\_profile": "external\_auditor\_regulated\_v1",<br>`  `"chain\_verification": {<br>`    `"status": "verified",<br>`    `"verified\_at": "2026-05-20T16:15:03.000Z",<br>`    `"start\_block": 4810001,<br>`    `"end\_block": 4829183,<br>`    `"chain\_head\_hash": "sha256:5e8a...1b6f"<br>`  `},<br>`  `"manifest\_hash": "sha256:77c9...441a"<br>}|
| :- |

# **Appendix C. Glossary**

|**Term**|**Definition**|
| :-: | :-: |
|Audit Event|A canonical, append-only record of a meaningful user, system, agent, governance, evidence, or security action.|
|Hash Chain|A sequence of event hashes where each event includes the previous event hash, making alteration detectable.|
|Canonicalization|The deterministic process of serializing event payloads before hashing.|
|Retention Class|The policy class that determines how long an event payload is retained before sealing or archiving.|
|Legal Hold|A legal preservation state that suspends normal retention expiration.|
|Sealed Record|A record whose payload is no longer available in the hot store but whose metadata and hash remain available.|
|Field-Level Access Control|Server-side policy determining whether a field is full, redacted, hashed, or denied.|
|Correlation Engine|Deterministic rules that produce related-event timelines.|
|Evidence Vault|The module that preserves evidence packages, custody records, legal holds, and export artifacts.|
|Forensic Hub|The module that manages investigations, cases, timelines, findings, and investigative workflow.|
|Identity Ledger|The module that records actor identity, role history, permission lineage, and authority state over time.|

Confidential | Zoiko Tech Inc. | For Engineering Lock | Page 
