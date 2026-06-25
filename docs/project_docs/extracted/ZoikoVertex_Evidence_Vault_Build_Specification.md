**ZoikoVertex | Evidence Layer | Module 3 of 4 | Evidence Vault | FULL LOCKED**

|<p></p><p></p><p></p><p>**ZoikoVertex Evidence Vault**</p><p>Document 3 of 4 - Evidence Layer Build Contract</p><p>Authority Layer Product, UX, Governance, Runtime, Evidence and Engineering Specification</p><p></p><p></p><p>**FULL LOCKED VERSION - ZERO GAPS**</p><p></p><p></p>|
| :- |

|**Doc Class**|Engineering Build Specification|
| :- | :- |
|**Module**|Evidence Layer M3 - Evidence Vault|
|**Status**|Locked for Engineering Build|
|**Audience**|Product, Engineering, Security, Compliance, Legal, Design|
|**Owner**|Zoiko Tech Inc.|
|**Version**|v1.0 - 2026|

|<p></p><p></p><p></p><p>Confidential - Not for external circulation without written authorization.</p>|
| :- |

# **Executive Lock**
**Document 3 is the Evidence Vault.** It is not a folder, archive, or attachment repository. It is the controlled legal-preservation system for regulator-ready, litigation-ready, customer-ready evidence packages created from the Audit Trail, Forensic Hub, Identity Ledger, platform content, approvals, AI decisions, governance events, social-platform payloads, and investigation records.

|<p>**EVIDENCE VAULT DOCTRINE**</p><p>The Evidence Vault must answer one question clearly: what evidence was preserved, by whom, under which authority, in what exact state, with which cryptographic proof, under which retention or legal-hold obligation, and how can it be reproduced without alteration?</p>|
| :- |

## **Critical Analysis Incorporated**
**1.** Claude correctly identified that evidence infrastructure must be verifiable, not merely visible. This document converts that principle into preservation receipts, package manifests, chain-of-custody records, hash verification, immutable storage, legal hold workflows, and controlled export procedures.

**2.** The prior Audit Trail and Forensic Hub modules are treated as source systems, not duplicated products. Evidence Vault receives, seals, packages, verifies, redacts, exports, and proves evidence. It does not replace investigation management or audit event browsing.

**3.** The tactile engineering gap is removed: every major function now has roles, state transitions, data objects, API endpoints, retention behavior, failure modes, acceptance criteria, performance targets, and security controls.

**4.** The design doctrine is clear: minimum cognitive load for operators, maximum evidentiary rigor underneath. Users see simple vault actions; the system performs preservation, hashing, manifests, legal hold checks, redaction, and custody accounting in the background.
## **Module Boundary**

|**Module**|**Primary Job**|**Evidence Vault Relationship**|
| :-: | :-: | :-: |
|**Module 1 - Audit Trail**|Capture and verify event history|Primary event source; selected audit events can be preserved into vault packages.|
|**Module 2 - Forensic Hub**|Run investigations, timelines, findings, and case decisions|Investigation cases send evidence bundles to the Vault for preservation and legal-grade export.|
|**Module 3 - Evidence Vault**|Preserve, seal, verify, redact, retain, and export evidence|This specification. System of record for preserved evidence packages.|
|**Module 4 - Identity Ledger**|Prove actor identity, authority, delegation, consent, and role-at-time|Identity proof is attached to evidence packages when actor authority is material.|

# **1. Product Doctrine and Non-Negotiables**
**1.** The Vault is append-only for preserved evidence. Corrections are made through new records, not mutation.

**2.** Every evidence item must have a content hash. Every evidence package must have a manifest hash. Every export must have an export receipt.

**3.** No evidence can be deleted while subject to legal hold, regulatory hold, investigation lock, or customer contractual retention.

**4.** Every view, download, export, redaction, hold, release, package creation, and verification run must create a new audit event.

**5.** A package must be reproducible: the same inputs, same versions, same redaction policy, same manifest and same hash proof must be available later.

**6.** The Vault must support defensibility without over-claiming. It preserves integrity evidence; legal admissibility remains jurisdiction-specific and counsel-led.

**7.** Field-level access and redaction are enforced server-side. The front end must never receive values it is not authorized to display.

**8.** The Vault must degrade safely: if preservation integrity cannot be verified, package generation fails closed.
## **Who Sees It**

|**Role**|**Default Access**|**Primary Permissions**|
| :-: | :-: | :-: |
|**Admin**|Manage vault settings and tenant policies|Configure retention defaults, storage regions, integrations, role permissions, alerts. Cannot bypass legal hold.|
|**Legal / General Counsel**|Full legal evidence oversight|Place/release legal holds, approve legal exports, review chain-of-custody, approve hold removal.|
|**Compliance Officer**|High access with regulatory scope|Preserve evidence, create regulatory packages, apply compliance retention, run verification.|
|**Security / SecOps**|Security evidence access|Preserve incidents, verify integrity, stream to SIEM, review security metadata.|
|**Forensic Analyst**|Investigation-linked access|Send case evidence, create investigation packages, view package state and related proof.|
|**Campaign Manager**|Scoped operational access|Request preservation or export for campaigns within scope; cannot release holds.|
|**Publisher**|Limited scoped access|See vault status for their own content; request preservation where allowed.|
|**External Auditor**|Restricted read-only access|View approved packages through time-bound secure access; cannot see raw restricted fields unless granted.|
|**Executive Viewer**|Summary visibility|See high-level counts, risk, status and board-ready summaries; no raw PII by default.|

## **Plan and Tier Controls**

|**Capability**|**Team / Standard**|**Business / Governed**|**Enterprise / Sovereign**|**Command / Bespoke**|
| :-: | :-: | :-: | :-: | :-: |
|**Manual evidence preservation**|Yes|Yes|Yes|Yes|
|**Bulk preservation**|Limited|Yes|Yes|Yes|
|**Legal hold**|No or limited|Yes|Advanced|Advanced + bespoke workflows|
|**Regulatory package templates**|Basic|Yes|Advanced|Custom sector packs|
|**External auditor portal**|No|Limited|Yes|Custom|
|**SIEM / DLP integrations**|No|Selected|Full|Bespoke|
|**Private storage / customer-managed keys**|No|No|Available|Available / required|
|**Data residency controls**|Basic|Regional|Advanced|Contractual|
|**External chain anchoring**|No|No|Optional Phase 4|Optional Phase 4|

# **2. Core User Journeys**
### **Preserve Evidence from Audit Trail**
Authorized user selects audit events, clicks Preserve to Vault, enters reason, selects retention class, confirms legal sensitivity, and receives preservation receipt.
### **Preserve Evidence from Forensic Hub**
Forensic Analyst selects case artefacts, uses Send to Evidence Vault, chooses package type, attaches investigation context, and locks the bundle to the case.
### **Apply Legal Hold**
Legal user selects package, item, investigation, actor, campaign, or date range; applies hold reason, matter reference, jurisdiction, and authorized approver.
### **Create Evidence Package**
User selects items or case scope, chooses template, selects redaction policy, runs preview, confirms manifest, and generates export package.
### **Verify Integrity**
User or scheduled worker runs verification; system recalculates item hashes, manifest hash, custody chain and audit references; result is written as a new audit event.
### **Share with External Auditor**
Legal/Compliance creates read-only portal access with expiry, watermarking, download controls, and access logging.
### **Release Hold**
Legal reviews matter closure, confirms no active regulatory or contractual block, enters reason, obtains approval if required, and releases hold. Release itself is preserved.
# **3. Evidence Object Model**

|<p>**OBJECT HIERARCHY**</p><p>Evidence Item -> Evidence Collection -> Evidence Package -> Export Receipt. The Vault preserves individual items, groups them into collections, seals them into packages, and records every export or access as a receipt.</p>|
| :- |

|**Object**|**Definition**|**Immutable Fields**|**Mutable / Append-Only Fields**|
| :-: | :-: | :-: | :-: |
|**Evidence Item**|Atomic preserved artefact: audit event, social payload, approval record, AI output, screenshot, file, webhook payload, policy snapshot, identity proof.|item\_id, source\_type, source\_id, captured\_at, original\_hash, tenant\_id, data\_residency|vault\_status, retention metadata, legal-hold links, access logs, verification records|
|**Evidence Collection**|Logical grouping of evidence items, usually created from investigation, campaign, incident, actor, or date range.|collection\_id, creation scope, creator, initial item list hash|additional items via append event; never silent removal|
|**Evidence Package**|Sealed bundle created for legal, compliance, regulator, customer, board, or incident use.|package\_id, package\_manifest\_hash, package\_type, template\_version, redaction\_policy\_version|verification runs, exports, external access grants, annotations|
|**Package Manifest**|Machine-readable inventory of package contents, hashes, source references, redaction state, custody events, and versions.|manifest\_id, item list, hashes, schema version, generated\_at|None; corrections require new manifest version|
|**Export Receipt**|Record of package export/download/share event.|receipt\_id, package\_id, requester, approver, export\_hash, timestamp|Revocation status, access expiry, external-view logs|

## **Canonical Evidence Item Schema**
{\
`  `"item\_id": "EVI-2026-000918",\
`  `"schema\_version": "1.0",\
`  `"tenant\_id": "TEN-001",\
`  `"workspace\_id": "WRK-001",\
`  `"data\_residency": "eu-west",\
`  `"source": {\
`    `"source\_type": "audit\_event | forensic\_case | social\_payload | ai\_output | policy\_snapshot | identity\_proof | file | webhook\_payload",\
`    `"source\_id": "AUD-2026-00018492",\
`    `"source\_system": "audit\_trail",\
`    `"source\_timestamp\_utc": "2026-05-20T14:31:00.247Z"\
`  `},\
`  `"classification": {\
`    `"evidence\_type": "approval\_override",\
`    `"risk\_level": "high",\
`    `"sensitivity": "restricted",\
`    `"contains\_pii": true,\
`    `"contains\_ai\_output": false,\
`    `"jurisdictions": ["GB", "EU"]\
`  `},\
`  `"integrity": {\
`    `"original\_content\_hash": "sha256:...",\
`    `"normalized\_content\_hash": "sha256:...",\
`    `"metadata\_hash": "sha256:...",\
`    `"preservation\_receipt\_hash": "sha256:...",\
`    `"hash\_algorithm": "SHA-256",\
`    `"captured\_at\_utc": "2026-05-20T14:32:04.102Z"\
`  `},\
`  `"custody": {\
`    `"preserved\_by\_actor\_id": "USR-091",\
`    `"authority": "compliance\_preservation\_permission",\
`    `"reason": "High-risk approval override requiring regulator-ready evidence",\
`    `"origin\_ip\_hash": "sha256:..."\
`  `},\
`  `"retention": {\
`    `"retention\_class": "regulated",\
`    `"retention\_until": "2036-05-20T00:00:00Z",\
`    `"legal\_hold": false,\
`    `"hold\_ids": []\
`  `},\
`  `"vault\_state": "preserved",\
`  `"access\_policy\_id": "vault\_policy\_restricted\_v1"\
}
# **4. Preservation Workflow**

|**Step**|**System Action**|**Required Input**|**Failure Mode**|
| :-: | :-: | :-: | :-: |
|**1. Selection**|Receives selected records or scope from source module.|source\_type, source\_ids or query scope, actor context|Reject if source outside permission or tenant scope.|
|**2. Permission Check**|Evaluates role, scope, data residency, legal restrictions and policy conditions.|actor\_id, role\_at\_time, workspace, object scope|Fail closed; log denied preservation attempt.|
|**3. Evidence Capture**|Fetches original payload and metadata from source system using internal service account.|source reference, timestamp, schema version|Retry with bounded attempts; if source unavailable, create failed preservation audit event.|
|**4. Normalization**|Creates canonical normalized representation for hashing and reproducibility.|payload, metadata, source schema|Reject if schema unknown or malformed.|
|**5. Hashing**|Computes original hash, normalized hash, metadata hash and preservation receipt hash.|canonical payload|Reject on hash mismatch or unsupported algorithm.|
|**6. Retention Assignment**|Applies tenant default, event default, legal hold, regulation, or manual override.|retention class, reason, jurisdiction|Block if retention class conflicts with legal/regulatory policy.|
|**7. Storage Write**|Stores payload in immutable object storage with WORM or object-lock mode where available.|encrypted payload, metadata, hash proof|Fail closed; no receipt issued.|
|**8. Receipt Generation**|Returns preservation receipt with item\_id, hash, timestamp, authority and retention.|stored object reference|Receipt cannot be generated without successful storage verification.|
|**9. Audit Write**|Writes preservation event to Audit Trail and links source to vault item.|receipt and actor context|If audit write fails, preservation enters quarantine until reconciled.|

## **State Machine**

|**State**|**Meaning**|**Allowed Transitions**|
| :-: | :-: | :-: |
|**requested**|User/system requested preservation but capture has not completed.|capturing, rejected|
|**capturing**|Vault is fetching and normalizing evidence.|preserved, failed, quarantined|
|**preserved**|Evidence item is stored, hashed and receipt issued.|sealed, legal\_hold, archived|
|**sealed**|Evidence package or item is locked for package integrity.|legal\_hold, archived, superseded\_by\_new\_version|
|**legal\_hold**|Evidence cannot expire, archive-delete, or be removed.|hold\_released only by Legal|
|**archived**|Payload moved to cold archive; hash metadata remains hot.|restored, legal\_hold|
|**quarantined**|Preservation completed partially and requires reconciliation.|preserved, failed|
|**failed**|Preservation failed; no evidence claim issued.|retry\_requested|

# **5. Package Types and Templates**

|**Package Type**|**Purpose**|**Default Contents**|**Approval Requirement**|
| :-: | :-: | :-: | :-: |
|**Regulatory Response Package**|Respond to regulator, sector authority, or formal compliance request.|Manifest, selected evidence, custody log, source references, policy snapshots, redaction report, verification receipt.|Compliance + Legal approval.|
|**Litigation Hold Package**|Preserve evidence connected to legal matter.|Matter reference, all held items, identity proofs, chain-of-custody, access log, hold history.|Legal approval required.|
|**Customer Assurance Package**|Provide enterprise customer proof without overexposing sensitive internal data.|Summary, approved evidence excerpts, redacted records, verification statement, export receipt.|Compliance or Admin approval.|
|**Board / Executive Package**|Summarize critical incident or governance event for board review.|Executive summary, timeline, decisions, evidence references, risk assessment, remediation status.|Executive owner or Legal approval.|
|**Security Incident Package**|Preserve and export security incident evidence.|Security events, actor identity, IP/device metadata where authorized, SIEM references, remediation log.|Security + Legal when PII or external disclosure.|
|**AI Governance Package**|Prove AI action, prompt, model version, confidence, human approval, policy checks and final outcome.|Prompt/version metadata, model response hash, approval chain, policy evaluation, final content.|Compliance approval.|

## **Package Manifest Requirements**
**1.** Manifest must be machine-readable JSON and human-readable PDF.

**2.** Manifest must list every item\_id, source\_id, source system, source timestamp, hash, retention class, redaction status and package inclusion reason.

**3.** Manifest must include package\_template\_version and redaction\_policy\_version.

**4.** Manifest hash must be computed after the item list, metadata and redaction settings are finalized.

**5.** Any package regeneration creates a new manifest version and links to the prior version. Existing manifests are never overwritten.

**6.** Every package must show whether it is complete, redacted, partially redacted, or externally shared.
# **6. Redaction and Disclosure Controls**

|<p>**SERVER-SIDE REDACTION RULE**</p><p>Redaction is executed before export, share, preview download, or external portal rendering. The browser must never receive unredacted values for a user or recipient who is not authorized to see them.</p>|
| :- |

|**Redaction Class**|**Examples**|**Behavior**|
| :-: | :-: | :-: |
|**No redaction**|Public campaign metadata, event IDs, timestamps, package hashes|Displayed and exported in full.|
|**Masked**|Email, phone, user display name where partial proof is enough|Partially visible, e.g. ma\*\*\*@domain.com, with full value hash retained.|
|**Hashed**|IP address, device fingerprint, session ID for external recipients|Stable hash displayed for correlation without revealing raw value.|
|**Removed**|Prompt text, raw AI output, privileged legal notes, secrets, tokens|Field removed from export; manifest states field category was withheld.|
|**Substituted**|Personal data where role proof matters but name does not|Replaced with role-at-time or anonymous actor label.|
|**Legal privileged**|Attorney-client material, legal strategy, advice notes|Excluded unless Legal explicitly authorizes inclusion.|

## **Disclosure Modes**

|**Mode**|**Use Case**|**Output Controls**|
| :-: | :-: | :-: |
|**Internal Full**|Legal, Compliance, Security, authorized admin review|Full fields according to role matrix; watermark optional; all access logged.|
|**Internal Redacted**|Executive, campaign, operational review|PII and sensitive technical values masked or hashed.|
|**External Regulator**|Formal regulatory response|Legal-approved template, strict manifest, redaction report, download receipt.|
|**External Customer**|Customer assurance or incident evidence|Customer-safe redaction, no privileged material, no unrelated user data.|
|**External Auditor Portal**|Auditor review without bulk file transfer|Time-bound access, MFA, watermark, disabled or controlled downloads, full view logging.|

# **7. Retention, Legal Hold and Expiry**

|**Retention Class**|**Default Duration**|**Applies To**|**Expiry Behavior**|
| :-: | :-: | :-: | :-: |
|**Standard**|2 years|Routine preserved content, operational evidence, non-regulated activity.|Seal metadata; cold archive payload; preserve hash indefinitely.|
|**Extended**|7 years|Approval decisions, AI governance records, published content, customer assurance packages.|Seal and archive; restore-on-request through approved workflow.|
|**Regulated**|10 years|Regulatory, legal, security, formal compliance, sensitive claims, restricted sectors.|Seal, archive, retain hash and manifest indefinitely.|
|**Legal Hold**|Indefinite|Active litigation, threatened claim, regulator inquiry, formal investigation, counsel hold.|No expiry. No removal. Release requires Legal authority and audit event.|
|**Contractual Custom**|Per customer contract|Enterprise tenants with negotiated retention.|Policy-driven; cannot be shorter than legal/regulatory minimum.|

## **Legal Hold Rules**
**1.** Legal hold can be applied to item, package, investigation, campaign, actor, time range, source system, or query scope.

**2.** Legal hold must capture matter reference, jurisdiction, reason, requester, approver, effective date and review date.

**3.** Legal hold overrides retention expiry, archival deletion, customer deletion requests where lawful basis requires retention, and standard lifecycle jobs.

**4.** Release requires authorized Legal role, reason, confirmation that no linked matter remains active, and optional second approval for high-risk packages.

**5.** Hold application, modification, review and release are themselves evidence events and must be preserved.
# **8. Security Architecture**

|**Control**|**Implementation Requirement**|
| :-: | :-: |
|**Encryption at rest**|AES-256 or cloud-provider equivalent. Package payloads encrypted separately from metadata where possible.|
|**Encryption in transit**|TLS 1.2 minimum; TLS 1.3 preferred for all service-to-service and portal traffic.|
|**Key management**|KMS-backed keys per tenant or per region. Enterprise option for customer-managed keys. Key rotation logged and tested.|
|**Immutable storage**|Object lock / WORM where supported. Otherwise immutable application-layer controls plus hash verification and restricted privileged access.|
|**Tenant isolation**|Tenant ID enforced in every query, object path, index, stream and export job. Cross-tenant query returns zero results.|
|**Least privilege**|Vault service accounts receive source-read permissions only for preservation operations and cannot modify source records.|
|**Secrets handling**|No API tokens, credentials or platform secrets in evidence exports unless explicitly designated as security evidence and Legal-approved.|
|**Privileged access**|Break-glass access requires reason, time limit, approval, MFA and automatic audit logging.|
|**DLP scanning**|Exports scanned for secrets, excessive PII and policy-restricted terms before release.|
|**Malware scanning**|Uploaded files and exported packages scanned before storage and before external sharing.|

## **Integrity Model**
**1.** Each evidence item receives an original content hash, normalized content hash and metadata hash.

**2.** Each package receives a manifest hash computed from ordered item references, item hashes, metadata, template version and redaction policy version.

**3.** Each export receives an export hash computed from the final exported bytes.

**4.** Verification recalculates hashes and compares against stored values. Any mismatch creates a critical security event and blocks external sharing.

**5.** External chain anchoring is not required for MVP, but schema must support future anchor\_id, anchor\_provider and anchor\_timestamp fields.
# **9. UX Specification**
## **Primary Page Layout**

|**Region**|**Content**|**Behavior**|
| :-: | :-: | :-: |
|**Header**|Evidence Vault title, description, Vault health, Verify button, Create Package button.|Sticky at top on desktop. Verify button visible only to authorized roles.|
|**Metric Cards**|Preserved items, legal holds, packages awaiting approval, failed verifications, external shares.|Clicking metric applies relevant filter.|
|**Filter Bar**|Date, source module, evidence type, risk, package status, retention class, legal hold, owner, jurisdiction.|Filters persist per user and can be saved as views.|
|**Evidence Table**|Item/package list with status, source, risk, retention, hash status, hold state, owner and actions.|Default sort newest preserved first. Row opens detail drawer.|
|**Detail Drawer**|Summary, source, integrity, custody, retention, redaction, access history, related packages.|Drawer preserves table position on close.|
|**Bulk Action Bar**|Preserve, package, apply hold, export, verify, assign owner.|Sensitive actions require reason and confirmation.|

## **Detail Drawer Required Tabs**

|**Tab**|**Required Content**|
| :-: | :-: |
|**Summary**|Evidence item/package title, state, source, created by, created at, risk, sensitivity, legal hold badge, retention class.|
|**Integrity**|Original hash, normalized hash, manifest hash if applicable, last verification result, verification history, hash algorithm.|
|**Custody**|Preserved by, authority, reason, source module, custody events, all views/downloads/exports.|
|**Contents**|Preview where safe, item list, source links, related audit events, related case or campaign.|
|**Redaction**|Redaction policy, fields masked/removed/hashed, disclosure mode, redaction report.|
|**Retention & Holds**|Retention class, expiry, legal holds, hold matter references, hold reviews, release controls.|
|**Exports & Shares**|Export receipts, external portal access, expiry dates, recipients, download logs, revocation controls.|

## **Empty, Loading and Error States**

|**State**|**Required Copy / Behavior**|
| :-: | :-: |
|**Empty Vault**|No preserved evidence yet. Preserve evidence from Audit Trail, Forensic Hub, or connected platform events. Show guided actions by role.|
|**No Filter Results**|No evidence matches this view. Offer clear filters and saved view reset.|
|**Verification Pending**|Show spinner, job ID, estimated time and background notification promise.|
|**Verification Failed**|Show critical state, block export/share, identify failed item or manifest section, create incident link.|
|**Legal Hold Conflict**|Explain that action is blocked because evidence is under legal hold; show holder and matter reference to authorized users.|
|**Export Blocked by DLP**|Explain restricted content detected; provide redaction workflow and approval path.|
|**Permission Denied**|Do not reveal restricted item details. Show safe message and request-access option where allowed.|

# **10. API Surface**

|**Method**|**Endpoint**|**Purpose**|
| :-: | :-: | :-: |
|**GET**|/api/evidence-items|List evidence items with filters and cursor pagination.|
|**GET**|/api/evidence-items/{item\_id}|Read item detail subject to field-level access controls.|
|**POST**|/api/evidence-items/preserve|Preserve selected source records into Vault. Internal source validation required.|
|**POST**|/api/evidence-items/{item\_id}/verify|Run hash verification for one evidence item.|
|**POST**|/api/evidence-collections|Create evidence collection from items or source query.|
|**POST**|/api/evidence-packages|Create sealed evidence package from collection or investigation scope.|
|**GET**|/api/evidence-packages/{package\_id}/manifest|Return human-readable or JSON manifest.|
|**POST**|/api/evidence-packages/{package\_id}/verify|Verify package manifest and all included item hashes.|
|**POST**|/api/evidence-packages/{package\_id}/export|Create async export job with disclosure mode and redaction policy.|
|**POST**|/api/evidence-holds|Apply legal or regulatory hold to item/package/scope.|
|**POST**|/api/evidence-holds/{hold\_id}/release|Release hold with Legal authority and reason.|
|**POST**|/api/evidence-shares|Create external auditor portal share.|
|**DELETE**|/api/evidence-shares/{share\_id}|Revoke external portal share.|
|**GET**|/api/evidence-exports/{export\_id}/receipt|Return export receipt and download status.|
|**GET**|/api/evidence-vault/health|Return vault health, failed verifications, storage status, queue backlog, chain references.|

## **API Non-Negotiables**
**1.** All list endpoints must use cursor pagination, not offset pagination, at enterprise scale.

**2.** Every action endpoint must require idempotency keys to prevent duplicate preservation, export or hold operations.

**3.** Every sensitive action must require reason, actor context and authority evaluation.

**4.** Bulk operations must be asynchronous above configured thresholds and return job IDs.

**5.** All responses must be tenant-scoped and field-redacted server-side.

**6.** Export and share endpoints must require redaction policy and disclosure mode.
# **11. Performance and Scale Targets**

|**Operation**|**P50 Target**|**P95 Target**|**P99 / Degraded**|**Failure Behavior**|
| :-: | :-: | :-: | :-: | :-: |
|**Preserve single item**|< 300ms|< 1.5s|< 5s|Queue and show pending receipt.|
|**Preserve 1,000 items**|< 30s|< 2min|< 10min|Async job with progress and alert on failure.|
|**List evidence table**|< 200ms|< 800ms|< 2s|Show degraded banner and narrow-filter suggestion.|
|**Open detail drawer**|< 250ms|< 1s|< 3s|Retry once; safe error state.|
|**Verify single item**|< 500ms|< 2s|< 10s|Async fallback; block export until complete.|
|**Verify package up to 10K items**|< 30s|< 2min|< 10min|Async job; package locked during verification.|
|**Generate PDF package up to 1K pages**|< 60s|< 5min|< 15min|Async export delivery.|
|**Generate archive up to 100K records**|< 5min|< 30min|< 90min|Async export; progress and email/webhook.|
|**External portal page load**|< 500ms|< 1.5s|< 4s|Rate-limit and cache safe manifest views.|

# **12. Data Storage and Lifecycle**

|**Layer**|**Stores**|**Required Characteristics**|
| :-: | :-: | :-: |
|**Hot Metadata Store**|Item/package metadata, indexes, status, retention, hold flags, custody events.|Relational consistency, tenant isolation, fast filtered queries, audit references.|
|**Object Store**|Original payloads, normalized payloads, generated packages, manifests, redaction reports.|Immutable mode where possible, encrypted, region-scoped, versioned, malware-scanned.|
|**Search Index**|Searchable metadata, safe excerpts, non-sensitive labels.|No restricted raw values unless index is access-controlled and encrypted.|
|**Cold Archive**|Expired or aged payloads.|Lower-cost storage, restore workflow, hash metadata remains hot.|
|**Job Queue**|Bulk preservation, verification, exports, DLP scan, package generation.|Retry strategy, dead-letter queue, idempotency, observability.|
|**External Portal Store**|Share tokens, access sessions, watermarks, external view logs.|Short-lived, revocable, MFA-capable, rate-limited.|

## **Lifecycle Jobs**
**1.** Daily retention scanner identifies items nearing expiry and checks legal/regulatory hold blocks before any lifecycle action.

**2.** Archive job seals expired items, writes archive event, moves payload to cold storage and preserves hot hash metadata.

**3.** Verification worker runs scheduled item and package integrity checks according to risk and package type.

**4.** Share-expiry worker revokes external links automatically and writes access closure events.

**5.** Quarantine reconciliation worker resolves partial preservation states and escalates aged quarantine to SecOps.

**6.** DLP export worker scans generated packages before release and routes flagged packages for approval.
# **13. Event Logging Requirements**

|**Vault Event**|**Audit Event Type**|**Minimum Metadata**|
| :-: | :-: | :-: |
|**Item preserved**|evidence.item\_preserved|item\_id, source\_id, source\_type, actor, authority, reason, hashes, retention\_class.|
|**Package created**|evidence.package\_created|package\_id, package\_type, item\_count, manifest\_hash, template\_version.|
|**Package verified**|evidence.package\_verified|package\_id, result, manifest\_hash, failed\_items, verifier.|
|**Export requested**|evidence.export\_requested|package\_id, requester, reason, disclosure\_mode, redaction\_policy.|
|**Export completed**|evidence.export\_completed|export\_id, export\_hash, file\_count, size, recipient/access mode.|
|**External share created**|evidence.share\_created|share\_id, package\_id, recipient, expiry, controls.|
|**External package viewed**|evidence.share\_viewed|share\_id, viewer, timestamp, IP hash, package section.|
|**Legal hold applied**|evidence.legal\_hold\_applied|hold\_id, scope, matter\_ref, jurisdiction, approver.|
|**Legal hold released**|evidence.legal\_hold\_released|hold\_id, release\_reason, approver, release\_time.|
|**Redaction applied**|evidence.redaction\_applied|package\_id, policy\_version, fields\_redacted, approver.|
|**DLP blocked export**|evidence.export\_blocked|package\_id, detection\_category, reviewer, remediation\_state.|
|**Integrity failure**|evidence.integrity\_failure|item\_id/package\_id, expected\_hash, computed\_hash, severity, incident\_id.|

# **14. Integrations**

|**Integration**|**Purpose**|**Required Direction**|
| :-: | :-: | :-: |
|**Audit Trail**|Source and destination for every Vault action.|Read source events; write vault action events.|
|**Forensic Hub**|Case evidence preservation and investigation packages.|Receive case scopes; send package links and receipts.|
|**Identity Ledger**|Role-at-time, authority, delegation, MFA and actor proof.|Read identity proof; attach to packages when material.|
|**Policy Center**|Retention, disclosure, redaction, approval, DLP and export rules.|Evaluate policy before preserve/export/share/hold.|
|**Approval Workflow Engine**|Sensitive exports, legal holds, external shares and hold releases.|Trigger approvals; block until approved where required.|
|**SIEM / SOC**|Security package streaming and integrity alerts.|Send integrity failure, access anomaly, export events.|
|**DLP / Secret Scanner**|Detect restricted values in exports and package previews.|Scan before release; route exceptions.|
|**Cloud KMS**|Encryption and key lifecycle.|Encrypt/decrypt through approved KMS only.|
|**External Auditor Portal**|Controlled read-only disclosure.|Serve redacted package views and log every access.|

# **15. Build Phases**

|**Phase**|**Scope**|**Target Gate**|
| :-: | :-: | :-: |
|**Phase 1 - Vault Foundation**|Evidence item preservation, immutable storage, hashing, retention classes, basic table, detail drawer, manual preserve from Audit Trail and Forensic Hub, core audit events.|Preserve and verify 1M evidence items with zero cross-tenant leakage and deterministic hash checks.|
|**Phase 2 - Packages and Legal Hold**|Collections, packages, manifests, redaction policy, legal hold workflow, export receipts, async exports, package verification, saved views.|Generate regulator-ready package with manifest, redaction report, custody log and export receipt.|
|**Phase 3 - Enterprise Disclosure and Integrations**|External auditor portal, SIEM alerts, DLP scanning, customer-safe packages, advanced retention jobs, portal access logs, share revocation.|External portal review completed with full access logging, revocation, watermarking and DLP clearance.|
|**Phase 4 - Advanced Assurance**|External chain anchoring, customer-managed keys, custom regulatory templates, data-room style disclosure, bespoke sector controls.|Optional enterprise gate; not required for MVP but schema must support future fields.|

# **16. Acceptance Criteria**

|**#**|**Criterion**|**Pass Requirement**|
| :-: | :-: | :-: |
|**01**|Preservation Integrity|Every preserved item has original hash, normalized hash, metadata hash and preservation receipt hash.|
|**02**|No Silent Mutation|No code path mutates preserved payloads or package manifests after creation.|
|**03**|Correction Pattern|Corrections create new versions linked to prior records; prior versions remain accessible to authorized users.|
|**04**|Receipt Issuance|Preservation receipt generated only after storage write and hash verification succeed.|
|**05**|Legal Hold Enforcement|Legal hold blocks expiry, deletion, purge, customer deletion workflows where legally justified, and package removal.|
|**06**|Hold Release Control|Legal hold release requires authorized Legal role, reason and audit event.|
|**07**|Retention Lifecycle|Standard, Extended, Regulated, Legal Hold and Contractual Custom classes work as specified.|
|**08**|Package Manifest|Every package includes machine-readable and human-readable manifest.|
|**09**|Manifest Hash|Manifest hash changes when item list, metadata, template version or redaction policy changes.|
|**10**|Export Receipt|Every export has export hash, requester, approver, reason, disclosure mode and timestamp.|
|**11**|DLP Gate|External exports are blocked or routed when DLP detects restricted material.|
|**12**|Server-Side Redaction|Unauthorized raw values are never sent to the browser or external portal.|
|**13**|Access Logging|Every view, preview, download, export and external portal access is logged.|
|**14**|External Portal Controls|External shares support expiry, revocation, watermark, recipient identity and access logging.|
|**15**|Tenant Isolation|No tenant can access, export, search or infer another tenant’s evidence.|
|**16**|Data Residency|Evidence stored and processed in configured region unless contract permits otherwise.|
|**17**|Async Bulk Jobs|Large preservation, verification and export jobs run asynchronously with progress, retries and dead-letter handling.|
|**18**|Integrity Failure Handling|Hash mismatch blocks sharing/export and creates critical security event.|
|**19**|Quarantine State|Partial preservation enters quarantine, is visible to authorized roles and reconciles through workflow.|
|**20**|Policy Enforcement|Preserve/export/share/hold actions evaluate Policy Center rules before execution.|
|**21**|Approval Integration|Sensitive exports, share creation and hold release trigger Approval Workflow when configured.|
|**22**|Source Traceability|Every item links back to its source module, source record and source timestamp.|
|**23**|Identity Proof|Actor role-at-time and authority can be attached from Identity Ledger where material.|
|**24**|Search and Filter|Date, source, type, risk, hold, retention, owner, jurisdiction and status filters work at target latency.|
|**25**|Detail Drawer|Drawer contains Summary, Integrity, Custody, Contents, Redaction, Retention & Holds, Exports & Shares.|
|**26**|Mobile Parity|Mobile supports list, detail, verify status, request preserve, approve, and review packages where role permits.|
|**27**|Accessibility|WCAG 2.2 AA for tables, drawers, modals, portal pages and export status screens.|
|**28**|Audit Coverage|Every vault action writes an Audit Trail event with sufficient metadata.|
|**29**|Malware Scan|Uploaded and exported files are malware scanned before storage and external release.|
|**30**|Key Management|Encryption keys are KMS-backed, rotated and key events are logged.|
|**31**|Performance Targets|P50/P95 targets are met under representative enterprise load.|
|**32**|Disaster Recovery|Evidence metadata and object store can be restored with hash verification intact.|
|**33**|No Overclaiming|UI language avoids guaranteeing legal admissibility; states verified integrity and custody instead.|
|**34**|Phase Gate|Each build phase has test evidence, product sign-off, security sign-off, compliance sign-off and legal sign-off.|

# **17. Engineering Handoff Summary**

|<p>**BUILD INSTRUCTION**</p><p>Build the Evidence Vault as a defensible preservation system, not as a file library. The golden path is preserve -> hash -> store immutably -> receipt -> audit -> package -> verify -> redact -> export/share -> receipt. Every sensitive action must be policy-checked, permission-checked, logged and reproducible.</p>|
| :- |

## **Engineering Priorities**
**1.** Start with the preservation service, evidence object model, hash computation and immutable storage abstraction.

**2.** Implement idempotency and quarantine early; duplicate and partial preservation are inevitable in real systems.

**3.** Build server-side redaction and field-level access before any export or external portal work.

**4.** Treat package manifest generation as a core system, not a formatting task.

**5.** Wire Audit Trail events from day one. A Vault action that is not audited is a defect.

**6.** Keep Legal Hold logic centralized. Do not scatter hold checks across controllers.

**7.** Design for external chain anchoring, customer-managed keys and custom templates even if they ship later.
## **Final Lock Statement**
This document is locked as the full Document 3 of 4 for the ZoikoVertex Evidence Layer. It incorporates Claude’s core recommendations and converts them into a tactile, build-ready, Tier-0 engineering specification suitable for Product, Engineering, Security, Compliance, Legal and Design execution.
Confidential - Zoiko Tech Inc. - 2026 - Build Specification for Engineering, Security, Compliance and Legal
