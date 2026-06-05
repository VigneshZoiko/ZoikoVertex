ZoikoVertex · Evidence Layer · Module 4 · Identity Ledger · FULL LOCKED

**ZoikoVertex** · Evidence Layer

**DOCUMENT 4 OF 4**

**Identity Ledger Build Specification**

*Authority Provenance, Identity Evidence, Delegation Control, Agent Identity, Impersonation Defense, Chain-of-Authority Reconstruction, and Engineering Acceptance Specification*

|<p>**LOCKED DOCTRINE**</p><p>The Identity Ledger must answer one question beyond dispute: who had the authority to act, under which identity, role, delegation, policy, session, agent configuration, and approval state at the exact moment the action occurred?</p>|
| :- |

|**Control Field**|**Locked Value**|
| :- | :- |
|Document Class|BUILD-SPEC / Engineering Lock|
|Module|Evidence Layer · Module 4 of 4 · Identity Ledger|
|Primary Owners|Engineering, Security, Compliance, Legal, Product, Design|
|Status|Full Locked Version · No Gaps|
|Revision|v1.0 · 2026|
|Confidentiality|Zoiko Tech Inc. · Internal / Controlled Distribution|

**Build Standard: Fortune 10 Quality · Tactile Engineering Ready**

# **1. Executive Lock**
This document is the full build specification for Module 4 of the ZoikoVertex Evidence Layer: the Identity Ledger. It is not a user directory, HR profile, access-control screen, or generic IAM integration. It is the authoritative evidence system that proves identity, authority, delegation, role state, authentication context, agent identity, and chain-of-authority at the moment an action occurred.

The Audit Trail records what happened. The Forensic Hub reconstructs what it means. The Evidence Vault preserves what must be defended. The Identity Ledger proves who or what had authority to act when the event occurred. Without the Identity Ledger, the other three modules can show activity, investigation, and evidence, but they cannot defensibly prove authority provenance.

|<p>**FINAL ENGINEERING DOCTRINE**</p><p>Identity is not enough. ZoikoVertex must prove authority at time of action. A user, AI agent, service account, external reviewer, or delegated operator may appear legitimate today while lacking authority at the moment of the disputed event. The Identity Ledger preserves the exact authority state that existed then — not the profile that exists now.</p>|
| :- |
## **1.1 What this document corrects from the prior draft**
- It defines the Identity Ledger as an evidence system, not a profile directory or IAM mirror.
- It specifies authority snapshots so later role changes cannot rewrite the authority state of historical events.
- It covers human users, AI agents, service accounts, external approvers, vendors, delegated actors, and emergency access.
- It adds cryptographic sealing and hash-linking of identity assertions, role snapshots, delegation grants, and break-glass sessions.
- It defines exactly how the Identity Ledger connects to Audit Trail, Forensic Hub, Evidence Vault, Policy Engine, Approval Workflow, Agent Studio, and Customer IAM.
- It gives engineers implementable schemas, lifecycle states, field access controls, APIs, performance targets, error states, abuse controls, and acceptance criteria.
## **1.2 Non-negotiable output**

|**Requirement**|**Engineering Interpretation**|
| :- | :- |
|Point-in-time proof|The system must reconstruct identity and authority exactly as they existed at the event timestamp.|
|Append-only authority history|Role, permission, policy, delegation, agent, and session evidence is never overwritten. Changes create new ledger entries.|
|Actor-type parity|Humans, AI agents, service accounts, systems, external reviewers, and delegated operators are all first-class actors.|
|Impersonation defense|Every sensitive identity event carries session, device, authentication, risk, and authority context.|
|Evidence-first UX|The UI must show “Authority at Event Time,” not merely current user status.|
|Integration discipline|IAM providers are sources of signals; the Identity Ledger remains the evidence authority for ZoikoVertex.|
|Legal defensibility|Delegation, emergency access, external access, and AI agent action must be reconstructable without relying on human memory.|
# **2. Evidence Layer Position**
The Identity Ledger is Module 4 of 4. It completes the Evidence Layer by binding every event, case, and preserved artifact to a provable actor identity and authority state. It must be designed as a system-of-record for authority evidence while remaining interoperable with external identity providers.

|**Module**|**Primary Question**|**Identity Ledger Dependency**|
| :- | :- | :- |
|Module 1 · Audit Trail|Who did what, when, where, under which authority, with which evidence, and what changed?|Requires actor authority snapshot, session identity, role-at-event, delegated authority, and agent identity proofs.|
|Module 2 · Forensic Hub|What happened, why did it happen, what was the sequence, and who is accountable?|Requires chain-of-authority reconstruction, impersonation checks, delegated action lineage, and conflict-of-interest signals.|
|Module 3 · Evidence Vault|What evidence must be preserved, sealed, exported, and defended?|Requires identity proofs, custody actor state, export authority, legal hold authority, and independent verifier data.|
|Module 4 · Identity Ledger|Who or what had authority to act at the exact time of action?|This document. It is the authority provenance layer for all other modules.|
## **2.1 Boundary with IAM**

|**Capability**|**Customer IAM / IdP**|**ZoikoVertex Identity Ledger**|
| :- | :- | :- |
|Authentication|Validates user identity through SSO, MFA, passwordless, OAuth, SAML, or OIDC.|Records authentication evidence, session context, assurance level, and linked authority state.|
|Provisioning|Creates, updates, and deactivates users through SCIM or manual admin action.|Records provisioning lineage, approver, source system, mapping result, and effective time.|
|Groups and roles|Supplies group claims, directory attributes, or entitlements.|Converts claims into point-in-time ZoikoVertex authority snapshots.|
|Access policy|Defines customer-side access conditions where applicable.|Enforces and records ZoikoVertex-specific authority, governance, delegation, and emergency-access state.|
|Evidence|Usually limited to logs that may rotate or be unavailable.|Preserves ledger-grade, queryable, sealed, and exportable authority evidence.|
# **3. Primary Users and Jobs-to-Be-Done**

|**User Type**|**Primary Job**|**What the Identity Ledger Must Show**|
| :- | :- | :- |
|Security Administrator|Validate whether access was legitimate and detect compromised or abnormal identity usage.|Session, MFA, device, IP, geolocation country, role changes, access anomalies, break-glass events, and failed authority checks.|
|Compliance Officer|Prove that regulated content or governed action was handled by an authorised person or agent.|Role-at-event, approval authority, delegation basis, policy constraint, and evidence export authorization.|
|Legal / General Counsel|Defend decisions and prove chain of authority during disputes or regulatory inquiries.|Immutable authority snapshots, delegation history, custody transfer, legal hold authority, and revocation timing.|
|Campaign Manager|Understand why an action was blocked, approved, escalated, or reassigned.|Scoped authority explanation, missing permission, active delegation, and accountable owner without exposing unnecessary security fields.|
|Executive Viewer|Assess governance posture across identities without handling raw identity risk data.|Aggregated identity risk, high-risk access, outstanding reviews, emergency access counts, and readiness score.|
|External Auditor|Verify control operation without gaining unnecessary access to personal data.|Hashed actor IDs, role class, authority proof, policy result, and sealed chain reference.|
|Engineering / Support|Debug identity mapping and permission defects safely.|Redacted support view with correlation IDs, connector errors, mapping status, and no raw sensitive content unless elevated.|
# **4. Canonical Actor Model**
Every entity that can cause, approve, block, delegate, export, preserve, publish, or modify something in ZoikoVertex must be represented as an actor in the Identity Ledger. The actor model is deliberately wider than a normal user model.

|**Actor Type**|**Examples**|**Ledger Requirement**|
| :- | :- | :- |
|human\_user|Employee, agency user, brand steward, approver, compliance officer|Full identity profile, authority snapshot, session proof, role-at-event, delegation and approval scope.|
|ai\_agent|Brand Guardian, Risk Classifier, Reply Agent, Scheduling Agent|Agent identity, owner, version, policy envelope, allowed actions, model/prompt reference, autonomy mode, human supervisor.|
|service\_account|Internal worker, integration worker, export job runner|Service identity, purpose, owner, scope, credential rotation state, callable actions, least-privilege mapping.|
|system|Policy Engine, Approval Workflow, Governance Gateway|System identity, release version, policy rule reference, triggered action, immutable source service.|
|external\_reviewer|External counsel, agency reviewer, customer approver|Invitation source, limited scope, expiry, authentication strength, evidence access boundary.|
|delegated\_actor|Assistant, temporary operator, emergency substitute|Delegator, delegatee, reason, scope, expiry, authority boundaries, revocation event.|
|break\_glass\_actor|Emergency admin or restricted operations operator|Emergency reason, approval path, timebox, enhanced recording, mandatory after-action review.|

|<p>**ENGINEERING RULE**</p><p>Never infer authority from the current user record when displaying or exporting historical evidence. Always read the authority\_snapshot\_id linked to the event. Current profile state is useful for administration, but it is not evidence for past authority.</p>|
| :- |
# **5. Core Ledger Concepts**

|**Concept**|**Definition**|**Why It Matters**|
| :- | :- | :- |
|Identity Assertion|A signed statement that a human, agent, service, or system identity existed and was mapped to a ZoikoVertex actor at a specific time.|Prevents ambiguity when external directories change, accounts are renamed, or contractors leave.|
|Authority Snapshot|Point-in-time copy of role, permissions, policies, delegations, restrictions, and approval scope.|Proves authority at the moment of action.|
|Session Assertion|Evidence of how the actor authenticated and from what session context the action occurred.|Supports impersonation analysis and access legitimacy.|
|Delegation Grant|Timeboxed authority transfer from one actor to another, with scope and reason.|Allows legitimate operational flexibility without losing accountability.|
|Break-Glass Session|Emergency privileged access with mandatory reason, timebox, supervision, and review.|Supports crisis handling while preventing silent privilege abuse.|
|Agent Authority Envelope|Allowed actions, autonomy mode, policy boundaries, supervisor, model, prompt, and tool scopes for an AI agent.|Prevents autonomous agents from becoming untraceable operators.|
|Custody Actor State|Identity state of the actor preserving, exporting, or transferring evidence.|Required for defensible chain of custody.|
# **6. System Architecture**
The Identity Ledger must be implemented as an append-only authority evidence service. It receives identity and authority events from IAM, SCIM, SSO, ZoikoVertex control-plane services, Agent Studio, Approval Workflow, Policy Engine, and Evidence Layer modules. It exposes point-in-time reads to Audit Trail, Forensic Hub, Evidence Vault, and UI surfaces.

|**Layer**|**Components**|**Build Requirement**|
| :- | :- | :- |
|Ingress|SSO/OIDC/SAML, SCIM, manual admin changes, role management, agent registry, service-account registry, delegation workflow, break-glass workflow|Normalize identity and authority signals into canonical ledger events.|
|Ledger Core|Append-only event store, authority snapshot builder, identity assertion signer, chain verifier, retention manager|Create sealed ledger entries and point-in-time authority snapshots.|
|Read Model|Authority-at-event index, actor timeline index, risk index, delegation index, agent authority index|Support fast UI queries and evidence reconstruction without touching raw event log for every request.|
|Controls|Field-level access matrix, tenant isolation, data residency, redaction, legal hold, retention class|Prevent overexposure of sensitive identity evidence.|
|Integrations|Audit Trail, Forensic Hub, Evidence Vault, Policy Engine, Approval Workflow, Agent Studio, SIEM|Provide authority proof to every governance and evidence workflow.|
|Exports|PDF evidence pack, JSON authority bundle, auditor view, SIEM stream, custody certificate|Make identity evidence defensible outside the product.|
## **6.1 Data flow**
1. Identity event enters from SSO, SCIM, Admin UI, Agent Studio, Policy Engine, Approval Workflow, or system service.
1. Identity Ledger normalizes the event into the canonical ledger schema and validates tenant, actor type, source, and timestamp.
1. The service computes hash, previous hash, authority impact, and retention class.
1. If the event changes authority, the snapshot builder creates a new authority\_snapshot\_id effective from that timestamp.
1. Audit Trail references the relevant authority\_snapshot\_id when the actor performs an action.
1. Forensic Hub uses the snapshot to reconstruct accountability and detect identity anomalies.
1. Evidence Vault stores the relevant authority proof when evidence is preserved, exported, or placed under legal hold.
# **7. Authority Snapshot Model**
The authority snapshot is the most important object in this module. It is generated whenever any factor changes that could affect authority: role, permission, group claim, policy envelope, approval scope, delegation, legal restriction, account status, agent version, service-account scope, or emergency access state.

|**Snapshot Field**|**Required Meaning**|
| :- | :- |
|authority\_snapshot\_id|Immutable ID linked to the exact authority state at a specific effective time.|
|actor\_id|Canonical ZoikoVertex actor ID.|
|actor\_type|human\_user, ai\_agent, service\_account, system, external\_reviewer, delegated\_actor, or break\_glass\_actor.|
|effective\_from / effective\_until|Time interval during which the snapshot is valid. effective\_until is null until superseded.|
|roles\_at\_time|All role names and role IDs assigned at the time.|
|permissions\_at\_time|Normalized permission set after role expansion, group claims, explicit grants, and restrictions.|
|policy\_constraints|Constraints active at the time: geography, campaign scope, brand scope, regulated-content limits, working mode, approval level.|
|delegation\_context|Delegator, reason, scope, expiry, and approval record if the authority came from delegation.|
|agent\_context|For AI agents: autonomy mode, tool scope, prompt/model version, supervisor, policy envelope.|
|source\_lineage|Source system, claim IDs, admin change event, SCIM event, or policy rule that produced the snapshot.|
|snapshot\_hash|Hash of canonical snapshot payload.|
|superseded\_by|Next snapshot ID where applicable.|

|<p>**POINT-IN-TIME RULE**</p><p>When an event occurs at 10:42:14 UTC, the system must resolve authority using the snapshot whose effective interval contains 10:42:14 UTC. It must not use the user’s current role, current directory group, or current account status.</p>|
| :- |
# **8. Identity Lifecycle States**

|**State**|**Meaning**|**Allowed Actions**|**Transition Trigger**|
| :- | :- | :- | :- |
|invited|Actor has been invited but has not accepted or completed authentication.|No production action. May view invitation acceptance page only.|Invitation accepted or expired.|
|active|Actor is verified and eligible to act within assigned authority.|Allowed actions within authority snapshot.|Role change, suspension, revocation, expiry, offboarding.|
|restricted|Actor remains valid but is limited by risk, policy, investigation, or pending review.|Only scoped or read-only actions. Sensitive actions blocked.|Risk clearance, compliance override, or escalation.|
|suspended|Actor cannot perform actions but historical identity remains visible to authorized roles.|No action. Account access blocked.|Admin suspension, automated risk rule, HR/contractor status, security incident.|
|revoked|Actor’s access is removed. Historical records remain.|No action. Can be referenced in evidence only.|Offboarding, contract end, invite cancellation.|
|expired|Timeboxed actor or delegation passed its expiry.|No action except audit/evidence view by authorized roles.|Expiry time reached.|
|break\_glass\_active|Emergency authority is active for a timeboxed window.|Only emergency-scoped actions. Mandatory enhanced audit and review.|Approved emergency activation.|
|under\_legal\_hold|Actor records related to investigation cannot be purged or sealed beyond legal hold rules.|Normal authority may vary; retention is frozen.|Legal hold placement or removal.|
# **9. Identity Event Taxonomy**
Every identity ledger event belongs to one category and one canonical event type. Event types are registered and versioned. No service may emit free-form identity events.

|**Category**|**Canonical Events**|**Default Retention**|
| :- | :- | :- |
|Identity Assertion|identity.created, identity.invited, identity.accepted, identity.verified, identity.renamed, identity.merged, identity.revoked|regulated|
|Authentication & Session|auth.login\_success, auth.login\_failed, auth.mfa\_challenge, auth.mfa\_changed, auth.session\_created, auth.session\_revoked|regulated|
|Role & Permission|role.assigned, role.removed, permission.granted, permission.revoked, authority.snapshot\_created, authority.snapshot\_superseded|regulated|
|Delegation|delegation.requested, delegation.approved, delegation.rejected, delegation.activated, delegation.expired, delegation.revoked|regulated|
|Break-Glass|breakglass.requested, breakglass.approved, breakglass.activated, breakglass.action\_taken, breakglass.ended, breakglass.review\_completed|legal\_hold eligible|
|Agent Identity|agent.created, agent.version\_changed, agent.scope\_changed, agent.supervisor\_changed, agent.autonomy\_changed, agent.disabled|regulated|
|Service Account|service\_account.created, credential.rotated, credential.expired, scope.changed, owner.changed, service\_account.disabled|regulated|
|External Access|external.invited, external.scope\_changed, external.accessed, external.expired, external.revoked|regulated|
|Risk & Anomaly|identity.risk\_flagged, impossible\_travel.detected, device\_changed, suspicious\_login, authority\_mismatch, impersonation\_suspected|legal\_hold eligible|
|Audit Access|identity\_ledger.viewed, identity\_ledger.exported, authority\_proof.generated, access\_redacted, field\_unmasked|regulated|
# **10. Sensitive Identity Events Requiring Elevated Access**

|**Event / Action**|**Minimum Authority**|**Mandatory Evidence Captured**|
| :- | :- | :- |
|Role assigned or removed|Admin + policy permission; dual approval for privileged roles|Actor, previous role, new role, reason, approver, source, timestamp, authority snapshot before and after.|
|Permission granted directly|Security Admin or System Owner|Reason, expiry if temporary, approver, risk classification, affected scope.|
|Delegation approved|Delegator + approver where policy requires|Delegator, delegatee, scope, expiry, business reason, conflicts check.|
|Break-glass activated|Emergency Admin + second approver except defined P0 exception|Emergency reason, timebox, requester, approver, session proof, post-review owner.|
|Agent autonomy upgraded|Agent Owner + Governance Admin|Old autonomy level, new autonomy level, model/prompt version, supervisor, tool scope, policy simulation result.|
|Service account scope widened|Security Admin + Service Owner|Purpose, owner, scope diff, credential state, expiry, rotation schedule.|
|External reviewer invited|Workspace Admin or Legal/Compliance authorised user|Scope, expiry, recipient, authentication requirement, evidence boundary.|
|Identity merged or linked|Security Admin|Before/after IDs, merge reason, conflict resolution, historical event remapping rule.|
|Ledger export generated|Compliance, Legal, Security, or External Auditor role|Reason, filter set, records included, redaction profile, recipient, export hash.|
|Field unmasked|Security or Legal elevated role|Field name, justification, case ID if applicable, approval basis, session proof.|
# **11. Primary UI Surfaces**
## **11.1 Identity Ledger Dashboard**

|**Area**|**Content**|**Engineering Notes**|
| :- | :- | :- |
|Header metrics|Active identities, restricted identities, privileged identities, AI agents, service accounts, open reviews, break-glass sessions|Numbers must be scoped by tenant and user permissions. Executive viewers see aggregate counts only.|
|Risk strip|High-risk identities, stale service accounts, expired delegations, unreviewed emergency access, external access expiring soon|Each metric links to filtered ledger view.|
|Identity table|Actor, actor type, current state, risk level, authority class, last action, last auth, active delegations, evidence status|Default sort: high risk first, then privileged, then recent change.|
|Filters|Actor type, state, role, authority class, risk, source system, data residency, last login, last role change, delegation status|Filters persist and support saved views.|
|Bulk actions|Export selected, request review, restrict access, revoke delegation, send to Evidence Vault|Bulk destructive or sensitive actions require confirmation and reason.|
## **11.2 Actor Detail Page**

|**Tab**|**Purpose**|**Required Content**|
| :- | :- | :- |
|Overview|Current identity posture|Actor type, state, roles, permissions summary, risk score, owner/supervisor, source system, last verified.|
|Authority Timeline|Point-in-time authority history|Snapshot intervals, role changes, grants, revocations, delegations, restrictions, source lineage.|
|Sessions|Authentication and session proof|Login attempts, MFA, device hash, IP/country, session expiry, suspicious events.|
|Delegations|Delegated authority in and out|Delegator, delegatee, scope, reason, expiry, approval, revocation, current state.|
|Agent / Service Context|Specialized context for non-human actors|Agent version, tool scope, autonomy level, supervisor; service account owner, credential rotation, scopes.|
|Evidence Links|Evidence Layer linkage|Audit events, investigations, evidence packages, legal holds, export history.|
|Raw Ledger|Elevated technical view|Canonical ledger entries, hashes, snapshot IDs, JSON view, source claims.|
## **11.3 Authority-at-Event Drawer**
Any Audit Trail, Forensic Hub, or Evidence Vault event that references an actor must expose an Authority-at-Event drawer. This is the core UX integration for this module.

|**Drawer Section**|**Content**|
| :- | :- |
|Actor at event time|Actor name, type, canonical ID, role at event, state at event, source identity.|
|Authority proof|Authority snapshot ID, roles, permissions, policy constraints, approval scope, delegation basis.|
|Session proof|Session ID, authentication assurance, MFA status, IP/country, device hash or redacted device state.|
|Current status warning|Clear warning if current role/state differs from event-time role/state.|
|Risk signals|Identity risk score at time, active anomaly flags, restricted status, policy mismatch.|
|Evidence actions|View actor timeline, preserve authority proof, export authority bundle, open related investigation.|

|<p>**UX RULE**</p><p>Do not display a historical event with only the current user title. Every event view must show “Role at event time” and, where different, “Current role now.” This prevents false interpretation during investigations and disputes.</p>|
| :- |
# **12. Field-Level Access Control Matrix**

|**Field**|**Admin**|**Security**|**Compliance**|**Legal**|**Campaign Mgr**|**Publisher**|**Exec Viewer**|**External Auditor**|
| :- | :- | :- | :- | :- | :- | :- | :- | :- |
|actor\_id, actor\_type, state|Full|Full|Full|Full|Full|Full|Full|Full|
|actor\_name, role\_at\_event|Full|Full|Full|Full|Scoped|Self/Scoped|Full|Hashed|
|actor\_email / external email|Full|Full|Full|Full|Scoped|Self only|Redacted|Hashed|
|current role / current state|Full|Full|Full|Full|Scoped|Self only|Aggregate|Hashed|
|permission set|Full|Full|Full|Full|Scoped summary|Denied|Summary|Summary|
|ip address|Redacted|Full|Redacted|Full|Denied|Denied|Denied|Hashed|
|device fingerprint|Redacted|Full|Redacted|Redacted|Denied|Denied|Denied|Denied|
|session\_id|Hashed|Full|Hashed|Hashed|Denied|Denied|Denied|Denied|
|MFA method / auth assurance|Summary|Full|Summary|Summary|Denied|Denied|Aggregate|Summary|
|risk score / anomaly reason|Summary|Full|Full|Full|Scoped summary|Denied|Aggregate|Summary|
|delegation reason|Full|Full|Full|Full|Scoped|Scoped|Summary|Summary|
|break-glass reason|Redacted|Full|Full|Full|Denied|Denied|Aggregate|Summary|
|agent prompt/model references|Full|Full|Full|Redacted|Scoped summary|Denied|Summary|Hashed|
|service-account secret metadata|Redacted|Full|Redacted|Redacted|Denied|Denied|Denied|Denied|
|hash, snapshot\_hash, chain ref|Full|Full|Full|Full|Full|Full|Full|Full|
## **12.1 Access semantics**

|**Access Level**|**Meaning**|
| :- | :- |
|Full|Complete field value returned to the client and available in exports.|
|Scoped|Visible only where the actor/object is within the user’s permitted workspace, brand, campaign, or team scope.|
|Self only|Visible only where the authenticated user is the actor being viewed.|
|Summary|High-level statement without raw identifiers or sensitive details.|
|Aggregate|Numerical aggregate only; no row-level personal data.|
|Redacted|Field exists and is marked redacted; value is never sent.|
|Hashed|Stable one-way hash returned for correlation but not identification.|
|Denied|Field is absent from response.|
# **13. Canonical Data Model**
The schemas below are implementation references. They are intentionally explicit so engineering can build the persistence layer, read models, APIs, event emitters, and test fixtures without interpretation gaps.
## **13.1 IdentityLedgerEntry**

|{<br>`  `"ledger\_entry\_id": "IDL-2026-00018492",<br>`  `"tenant\_id": "TEN-001",<br>`  `"workspace\_id": "WRK-001",<br>`  `"data\_residency": "eu-west",<br>`  `"schema\_version": "1.0",<br>`  `"entry\_type": "role.assigned",<br>`  `"entry\_category": "role\_permission",<br>`  `"timestamp\_utc": "2026-05-20T14:31:00.247Z",<br>`  `"received\_at": "2026-05-20T14:31:00.289Z",<br>`  `"source": {<br>`    `"source\_type": "admin\_ui",<br>`    `"source\_service": "access-control-service",<br>`    `"source\_event\_id": "src\_883910",<br>`    `"source\_actor\_id": "USR-091"<br>`  `},<br>`  `"actor": {<br>`    `"actor\_id": "USR-143",<br>`    `"actor\_type": "human\_user",<br>`    `"display\_name": "Maya Chen",<br>`    `"external\_identity\_id": "okta\_00u1abcd",<br>`    `"email\_hash": "sha256:...",<br>`    `"state\_before": "active",<br>`    `"state\_after": "active"<br>`  `},<br>`  `"authority\_change": {<br>`    `"change\_type": "role\_added",<br>`    `"role\_id": "ROLE-COMPLIANCE-APPROVER",<br>`    `"permission\_delta": ["approval.grant", "evidence.preserve"],<br>`    `"scope": {"brand\_ids": ["brand\_a"], "regions": ["GB", "US"]},<br>`    `"reason": "Temporary campaign approval coverage",<br>`    `"effective\_from": "2026-05-20T14:31:00Z",<br>`    `"effective\_until": "2026-05-27T23:59:59Z"<br>`  `},<br>`  `"session\_context": {<br>`    `"session\_id\_hash": "sha256:...",<br>`    `"auth\_assurance\_level": "mfa\_verified",<br>`    `"ip\_hash": "sha256:...",<br>`    `"geolocation\_country": "GB",<br>`    `"device\_hash": "sha256:..."<br>`  `},<br>`  `"approvals": [<br>`    `{"approver\_actor\_id": "USR-004", "approval\_event\_id": "AUD-2026-00018489"}<br>`  `],<br>`  `"linked\_authority\_snapshot\_id": "AUTH-2026-001728",<br>`  `"risk": {"level": "medium", "reasons": ["temporary\_privilege"]},<br>`  `"retention": {"class": "regulated", "legal\_hold": false, "retain\_until": "2036-05-20T14:31:00Z"},<br>`  `"hash": "sha256:f021...7d9c",<br>`  `"prev\_hash": "sha256:8b3d...2c4f"<br>}|
| :- |
## **13.2 AuthoritySnapshot**

|**Field**|**Type**|**Required**|**Notes**|
| :- | :- | :- | :- |
|authority\_snapshot\_id|string|Yes|Immutable ID used by Audit Trail events and evidence packages.|
|actor\_id|string|Yes|Canonical actor ID.|
|actor\_type|enum|Yes|human\_user, ai\_agent, service\_account, system, external\_reviewer, delegated\_actor, break\_glass\_actor.|
|effective\_from|datetime|Yes|Start of snapshot validity.|
|effective\_until|datetime/null|Yes|Closed when superseded.|
|roles\_at\_time|array|Yes|Role IDs and names as at effective time.|
|permissions\_at\_time|array|Yes|Expanded permissions after all grants and restrictions.|
|policy\_constraints|object|Yes|Region, brand, campaign, content type, regulated category, and approval restrictions.|
|delegation\_context|object/null|Conditional|Required if authority comes from delegation.|
|agent\_context|object/null|Conditional|Required for AI agent actors.|
|service\_account\_context|object/null|Conditional|Required for service accounts.|
|source\_lineage|array|Yes|SCIM, SSO claim, admin change, policy rule, or workflow event lineage.|
|snapshot\_hash|string|Yes|Hash of canonicalized snapshot payload.|
|created\_by\_ledger\_entry\_id|string|Yes|Ledger entry that created the snapshot.|
# **14. API Surface**

|**Method**|**Endpoint**|**Purpose**|**Notes**|
| :- | :- | :- | :- |
|GET|/api/identity-ledger/actors|List actors with filters for type, state, role, authority class, risk, source, and last activity.|Field matrix applied to every row.|
|GET|/api/identity-ledger/actors/{actor\_id}|Actor detail page data: overview, current state, risk, authority summary, evidence links.|404 outside scope to prevent enumeration.|
|GET|/api/identity-ledger/actors/{actor\_id}/timeline|Authority, identity, session, delegation, and risk timeline.|Paginated. Supports point-in-time filtering.|
|GET|/api/identity-ledger/authority-snapshots/{snapshot\_id}|Read exact authority snapshot.|Primary integration for Audit Trail and Evidence Vault.|
|GET|/api/identity-ledger/authority-at-event/{audit\_event\_id}|Resolve actor authority as at an Audit Trail event timestamp.|Returns event-time role and current-state difference warning.|
|POST|/api/identity-ledger/delegations|Request or create delegation according to policy.|Requires scope, reason, expiry, and approver where required.|
|POST|/api/identity-ledger/delegations/{id}/revoke|Revoke active delegation.|Creates ledger entry and authority snapshot.|
|POST|/api/identity-ledger/break-glass/request|Request emergency access.|Requires reason, scope, duration, and approval route.|
|POST|/api/identity-ledger/break-glass/{id}/activate|Activate approved emergency access.|Creates enhanced monitoring state.|
|POST|/api/identity-ledger/export|Generate identity or authority proof export.|Requires reason and redaction profile.|
|POST|/api/identity-ledger/preserve|Send selected identity ledger entries or authority proof to Evidence Vault.|Requires reason and retention class.|
|GET|/api/identity-ledger/chain/verify|Trigger or read ledger chain verification result.|Returns last verified block, broken links, and status.|
## **14.1 External write rule**

|<p>**NO EXTERNAL LEDGER WRITES**</p><p>Customer systems must never write final Identity Ledger entries directly. External systems provide identity signals through approved connectors. ZoikoVertex normalizes, validates, signs, and appends the canonical ledger entry internally. This prevents customer-side tampering and schema drift.</p>|
| :- |
# **15. Delegation and Break-Glass Control**
## **15.1 Delegation rules**

|**Rule**|**Requirement**|
| :- | :- |
|Timeboxed by default|All delegations require effective\_from and effective\_until. Open-ended delegation is prohibited unless explicitly approved by tenant governance policy.|
|Scoped authority|Delegation must specify brand, campaign, workspace, content class, approval level, and permitted actions.|
|No hidden delegation|Delegation appears in the delegatee’s authority snapshot, delegator’s history, and relevant Audit Trail events.|
|Conflict check|System checks conflicts of interest and segregation-of-duties rules before activation.|
|Revocation creates snapshot|Revoking delegation creates new authority snapshot immediately.|
|Delegation cannot exceed delegator authority|Delegatee cannot receive a permission that delegator does not possess at the time of grant.|
## **15.2 Break-glass rules**

|**Control**|**Requirement**|
| :- | :- |
|Reason required|Free-text reason plus selectable incident category required before activation.|
|Time limit|Default maximum: 60 minutes. Tenant-configurable lower limits allowed. Extensions require new approval.|
|Second approval|Required except for pre-defined P0 single-operator emergency route.|
|Enhanced audit|Every page view, search, export, role change, and evidence action is logged as high-risk.|
|Restricted scope|Emergency access is scoped to incident, workspace, region, and action category.|
|After-action review|Mandatory review must be completed within 48 hours. Failure appears as governance risk.|
|Legal hold eligible|Break-glass events are automatically eligible for legal hold and Evidence Vault preservation.|
# **16. AI Agent Identity and Authority Envelope**
ZoikoVertex must treat AI agents as accountable operational actors. An AI agent is not a background feature. It has identity, scope, owner, supervisor, version, tool permissions, policy envelope, and autonomy mode.

|**Agent Field**|**Requirement**|
| :- | :- |
|agent\_id|Permanent canonical actor ID. Does not change when model or prompt changes.|
|agent\_version|Specific deployed version at time of action.|
|owner\_actor\_id|Human owner accountable for configuration and lifecycle.|
|supervisor\_actor\_id|Human or governance queue responsible for oversight.|
|autonomy\_mode|recommend\_only, draft\_only, execute\_with\_approval, governed\_autonomous, restricted\_operations.|
|allowed\_tools|Explicit tool scopes, API operations, content actions, and evidence actions permitted.|
|policy\_envelope\_id|Governance envelope defining action boundaries and prohibited operations.|
|prompt\_version\_id|Prompt or instruction version active at the time of action.|
|model\_version|Model identifier or internal model class active at the time of action.|
|confidence\_policy|Minimum confidence thresholds and escalation rules.|
|kill\_switch\_state|Whether the agent was subject to emergency pause, tenant pause, or restricted mode.|

|<p>**AGENT GOVERNANCE RULE**</p><p>Every AI agent action shown in the Audit Trail must be resolvable to an Identity Ledger authority envelope. If the envelope cannot be resolved, the action is blocked or marked invalid. No orphan AI action is allowed.</p>|
| :- |
# **17. Security, Privacy, and Data Residency**

|**Control**|**Build Requirement**|
| :- | :- |
|Tenant isolation|All ledger entries, snapshots, read models, exports, and chain verification jobs are tenant-scoped.|
|Data residency|Identity ledger data remains in the tenant’s configured residency region. Cross-region support access requires explicit policy and logging.|
|PII minimization|Store raw personal data only where necessary. Use hashes for correlation, redaction for auditor views, and country-only geolocation.|
|Encryption|Encrypt at rest and in transit. Sensitive values must support envelope encryption and key rotation.|
|Access logging|Every Identity Ledger view, field unmask, export, preserve, and chain verification action is itself logged.|
|Support access|Support view is redacted by default. Elevated support requires reason, timebox, and approval.|
|Right-to-erasure boundary|Where lawful erasure applies, preserve non-identifying hash proofs and legal-hold exceptions. Do not break evidence integrity.|
|Legal hold override|Legal hold suspends purge/seal lifecycle for covered entries, snapshots, and exports.|
# **18. Performance Targets**

|**Operation**|**Target P50**|**Acceptable P95**|**Degraded P99**|**Failure Behavior**|
| :- | :- | :- | :- | :- |
|Append ledger entry|< 60ms|< 250ms|< 750ms|Block sensitive originating action if ledger write fails.|
|Create authority snapshot|< 100ms|< 400ms|< 1.5s|Queue retry for non-sensitive; block for privileged changes.|
|Resolve authority at event|< 80ms|< 250ms|< 800ms|Show degraded banner and retry once.|
|List actors, filtered 50/page|< 250ms|< 900ms|< 2.5s|Show degraded state and suggest filter narrowing.|
|Actor timeline|< 300ms|< 1.2s|< 4s|Paginate and lazy-load older records.|
|Export 10K ledger entries|< 45s|< 2min|< 6min|Async job with email/webhook delivery.|
|Chain verify 100K entries|< 6s|< 20s|< 90s|Background job, notify on completion.|
|SIEM stream event delivery|< 1s|< 5s|< 30s|Buffer, retry, and alert on backlog.|
# **19. Observability and Operational Controls**

|**Metric / Alert**|**Threshold**|**Owner**|
| :- | :- | :- |
|Ledger write failures|Any failure on privileged or evidence-related action; >0.1% rolling 5 minutes for all entries|Engineering + SecOps|
|Snapshot creation lag|P95 > 1s for 5 minutes|Engineering|
|Authority resolution errors|Any unresolved snapshot linked to live Audit Trail event|Engineering + Compliance|
|Chain verification failure|Any broken link or unexpected hash mismatch|P0 · SecOps + Engineering + Custodian|
|Stale service account|No owner review within configured review cycle|Security Admin|
|Expired delegation still active|Any occurrence|P1 · Security + Compliance|
|Break-glass review overdue|Any review older than 48 hours|Compliance + Legal|
|External access near expiry|7 days / 24 hours / expiry reached|Workspace Admin|
|SIEM delivery backlog|Backlog > 5 minutes or retry queue > threshold|Engineering + SecOps|
# **20. Error, Empty, and Edge States**

|**State**|**User Message**|**System Behavior**|
| :- | :- | :- |
|Authority snapshot missing|Authority proof unavailable. Action is blocked or marked unresolved until verified.|For sensitive action: block. For historical view: show unresolved state and create P1 engineering alert.|
|Identity provider unavailable|Identity provider is unavailable. Existing sessions follow tenant policy; new authority changes are paused.|Do not silently grant authority. Queue ingest and retry.|
|Role mapping conflict|Directory group claims map to conflicting ZoikoVertex roles.|Restrict actor, require admin review, log identity.risk\_flagged.|
|Expired delegation attempted|Delegated authority expired. Action blocked.|Show expiry and delegator. Offer request renewal if permitted.|
|Break-glass expired|Emergency access window ended.|Terminate emergency session and create review task.|
|Actor outside scope|Identity cannot be displayed.|Return 404 outside scope; log access attempt.|
|Redacted field|Field redacted by policy.|Show redaction label, not blank value.|
|Chain verification degraded|Ledger verification is delayed.|Show last successful verification and current job status.|
# **21. Build Phases**

|**Phase**|**Scope**|**Target Gate**|
| :- | :- | :- |
|Phase 1 · Ledger Foundation|Actor model, canonical ledger entries, authority snapshot builder, role/permission events, SSO/SCIM ingest, field access matrix, actor list, actor detail overview, authority-at-event read API, chain verification worker.|Authority snapshots resolve correctly for 1M audit-linked events; field matrix passes automated tests.|
|Phase 2 · Governance Depth|Delegation workflow, break-glass workflow, agent authority envelope, service-account registry, actor timeline, session proof, identity risk flags, support redaction, basic exports.|Delegation and break-glass scenarios pass end-to-end with evidence preservation.|
|Phase 3 · Evidence Integration|Evidence Vault preservation, Forensic Hub identity reconstruction, chain-of-authority exports, SIEM streaming, external auditor view, legal hold behavior, OCSF identity events.|Full Evidence Layer integration test passes across Audit Trail, Forensic Hub, Evidence Vault, and Identity Ledger.|
|Phase 4 · Advanced Assurance|Optional external chain-head anchoring, automated access certification, privilege recertification workflows, identity graph analytics, anomaly scoring improvements.|Command-tier readiness review; no blocker to Phase 1-3 launch.|
# **22. Acceptance Criteria**
The Identity Ledger ships only when all criteria below pass. Each criterion must have an automated or documented manual test path. Security, Compliance, Legal, Design, Product, and Engineering sign off independently.

|**#**|**Criterion**|**#**|**Criterion**|
| :- | :- | :- | :- |
|**01**|Actor model supports human users, AI agents, service accounts, systems, external reviewers, delegated actors, and break-glass actors.|**02**|Every authority-changing event creates a new authority snapshot; no historical snapshot is overwritten.|
|**03**|Audit Trail events link to authority\_snapshot\_id and display role-at-event, not current role only.|**04**|Authority-at-event API resolves correct snapshot using event timestamp and tenant scope.|
|**05**|Role changes, permission grants, suspensions, revocations, delegations, break-glass events, and agent scope changes are append-only.|**06**|Ledger entries are hash-chained and continuously verified.|
|**07**|Broken chain triggers P0 incident, freezes relevant ledger writes, and alerts SecOps and Engineering.|**08**|Field-level access matrix is enforced across UI, API, exports, and support views.|
|**09**|Redacted fields are labeled as redacted; denied fields are absent; hashed fields are stable but non-identifying.|**10**|Tenant isolation prevents cross-tenant identity lookup, exports, or correlation.|
|**11**|Data residency rules are enforced for storage, read models, exports, and backups.|**12**|SSO/OIDC/SAML and SCIM identity signals are normalized into canonical ledger events.|
|**13**|Role mapping conflicts restrict the actor and generate a review event.|**14**|Delegation cannot exceed delegator authority and must have reason, scope, effective period, and revocation path.|
|**15**|Expired delegations cannot authorize actions.|**16**|Break-glass activation requires reason, timebox, approval route, enhanced audit, and after-action review.|
|**17**|Break-glass expiry terminates emergency authority and creates review task.|**18**|AI agents have identity, owner, supervisor, autonomy mode, policy envelope, model/prompt references, and allowed tool scope.|
|**19**|AI agent action is blocked or marked invalid if no authority envelope can be resolved.|**20**|Service accounts have owner, purpose, scope, credential rotation state, and review cycle.|
|**21**|External reviewers have invitation source, authentication requirement, scope, expiry, and access boundary.|**22**|Identity risk events include impossible travel, suspicious login, device change, authority mismatch, and impersonation suspected.|
|**23**|Actor detail page contains overview, authority timeline, sessions, delegations, specialized context, evidence links, and raw ledger view.|**24**|Authority-at-event drawer is accessible from Audit Trail, Forensic Hub, and Evidence Vault views.|
|**25**|Exports require reason, redaction profile, filter set, and generate their own audit/ledger event.|**26**|Evidence Vault preservation works for selected ledger entries and authority snapshots.|
|**27**|Forensic Hub can reconstruct chain of authority for a case from linked identity snapshots.|**28**|Performance targets pass for write, snapshot creation, authority resolution, list, timeline, export, verification, and SIEM streaming.|
|**29**|Error states are explicit for missing snapshot, IDP outage, mapping conflict, expired delegation, and redaction.|**30**|Support access is redacted by default and elevated support requires reason, timebox, and approval.|
|**31**|Ledger API returns 404 outside scope to prevent identity enumeration.|**32**|All sensitive identity events require elevated authority and mandatory evidence fields.|
|**33**|Legal hold freezes purge/seal lifecycle for covered identity entries, snapshots, and exports.|**34**|Accessibility meets WCAG 2.2 AA for dashboard, tables, drawers, modals, exports, and mobile views.|
|**35**|Mobile view supports actor search, risk view, authority-at-event, delegation status, and evidence links without exposing restricted fields.|**36**|No external system can directly write canonical ledger entries; external systems only provide signals through approved connectors.|
# **23. Engineering Handoff Notes**

|<p>**BUILD PRIORITY**</p><p>The authority snapshot builder is the critical path. Build it before advanced UI. If the snapshot model is wrong, the product can display identity information but cannot prove authority. The Audit Trail, Forensic Hub, and Evidence Vault must all read from the same snapshot logic.</p>|
| :- |

|**Decision**|**Locked Position**|
| :- | :- |
|Identity source of truth|External IdP authenticates; Identity Ledger evidences ZoikoVertex authority.|
|Historical authority|Always snapshot-based, never current-role based.|
|AI agent accountability|AI agents are first-class actors with authority envelopes.|
|Delegation|Timeboxed, scoped, reasoned, visible, and revocable.|
|Break-glass|Emergency access is permitted only with enhanced audit and after-action review.|
|Privacy posture|Minimize raw PII; use hashes, redaction, and country-only geolocation.|
|Evidence posture|Every identity proof must be exportable, preservable, and reconstructable.|
# **24. Final Lock Statement**
The Identity Ledger completes the ZoikoVertex Evidence Layer. It turns identity from an administrative record into defensible proof of authority. It ensures that every human, AI agent, service account, system, external reviewer, delegation, and emergency operator can be traced to the authority they possessed at the moment they acted.

|<p>**FINAL STANDARD**</p><p>No governed autonomous social platform can claim Tier-0 governance if it cannot prove who or what had authority to act. ZoikoVertex must not merely log action. It must prove authority.</p>|
| :- |

© 2026 Zoiko Tech Inc. · Confidential · Engineering Build Specification
