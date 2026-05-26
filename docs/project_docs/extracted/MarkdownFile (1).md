**ZoikoVertex**

**Safety Layer · Document 02**

**Risk Intake & Classification Engine**

Wireframe, Product Doctrine, Data Model, Workflow, API, Controls, and Engineering Acceptance Specification

| Control | Locked Value |
| --- | --- |
| Document class | Tier-1 / Engineering Build Specification |
| Sequence position | Safety Layer · 02 of 08 |
| Previous document | Document 01 · Safety Layer Overview |
| Next document | Document 03 · Policy Guardrails & Intervention Controls |
| Language | American English |
| Status | Final for engineering handoff |

This document is the absolute next document after the Safety Layer Overview. It must be read and built sequentially. It defines how ZoikoVertex receives safety signals, normalizes them, classifies them, assigns severity, routes them, and opens the correct downstream safety workflow without ambiguity for the engineering team.

# 1\. Executive Doctrine

The Safety Layer fails if unsafe or non-compliant activity reaches the wrong queue, receives the wrong severity, or waits for a human to notice it. The Risk Intake & Classification Engine is therefore the first operational control surface after the Safety Layer Overview. It is not a passive inbox. It is the decision gate that converts raw signals into governed, traceable, risk-scored safety objects.

*   Every inbound signal must become a normalized Safety Signal object before it is shown in the UI.
*   Every classification must carry a reason code, confidence score, evidence reference, and routing outcome.
*   Every severity decision must be reproducible from data, not from a private reviewer opinion.
*   Every override must require a reason and must write back to the Audit Trail and Evidence Layer.
*   No AI recommendation may silently close, downgrade, or suppress a safety signal without authorized human review where risk is High or Critical.

# 2\. Critical Refinements Incorporated

| Gap identified | Refinement locked for this version | Engineering effect |
| --- | --- | --- |
| The previous sequence risked confusing documents with modules. | Document numbering is explicit: Safety Layer Document 02, following Document 01 only. | Engineering receives one build target and one dependency chain. |
| Risk intake could be mistaken for a generic inbox. | The page is defined as a control engine with normalization, classification, severity scoring, and routing. | Back end must implement deterministic workflows, not a cosmetic list. |
| AI classification could become opaque. | Every classification must expose model suggestion, confidence, reason codes, evidence references, and human override trail. | Reviewers can defend why a signal was routed or escalated. |
| Severity thresholds were not tactile enough. | Severity bands, thresholds, examples, SLA triggers, and routing rules are defined. | Engineers can implement tests and rule fixtures. |
| Role-based access needed stronger enforcement. | Server-side permission gates, field-level redaction, and queue-specific action permissions are specified. | Restricted data never leaves the API. |
| Downstream handoffs were too loose. | Routing to Policy Guardrails, Human Review, Forensic Hub, Evidence Vault, or Emergency Pause is defined by rules. | No ambiguous escalation path. |

# 3\. Page Objective and Non-Negotiables

The Risk Intake & Classification page must let authorized operators see every relevant safety signal, understand why it exists, confirm or amend classification, and route it to the correct safety control without leaving the page.

| Non-Negotiable | Build Requirement |
| --- | --- |
| Single operational truth | All visible signals must come from the normalized Safety Signal store, not independent UI queries. |
| No silent downgrade | Any downgrade from Critical or High requires reason, role authority, and immutable audit event. |
| No unmanaged duplicate | Potential duplicates must be clustered and linked; reviewers may merge, split, or escalate with reasons. |
| No untraceable routing | Every routing action must capture actor, role, timestamp, reason, prior state, new state, and destination workflow. |
| No client-side security | Redaction and field restrictions must be enforced by the API before response payload. |
| No empty ambiguity | Empty states must explain whether there are no signals, insufficient permissions, filter mismatch, or source ingestion failure. |

# 4\. Primary User Roles

| Role | Primary Need | Permitted Actions | Restrictions |
| --- | --- | --- | --- |
| Safety Operations Lead | Monitor all queues and keep risk moving. | Classify, assign, escalate, route, merge, reopen, export operational view. | Cannot remove legal hold or delete signal history. |
| Compliance Officer | Validate policy and regulatory classification. | Confirm compliance risk, require remediation, send to Forensic Hub, request legal review. | Cannot suppress Critical signals without dual approval. |
| Legal Reviewer | Assess legal exposure and preservation needs. | Apply legal review flag, request Evidence Vault preservation, initiate legal-hold recommendation. | Cannot alter original signal payload. |
| Security Officer | Handle account, identity, integration, and anomalous behavior risks. | Escalate security signal, freeze token/session, request identity investigation. | Cannot edit compliance findings. |
| Brand Governance Lead | Assess brand, cultural, tone, reputational, and campaign risks. | Confirm brand risk, route to content intervention, request brand owner review. | Cannot close legal/security signals. |
| Executive Viewer | See material safety posture and critical exceptions. | Read-only dashboards, export executive summary where permitted. | No queue actions, no privileged fields. |

# 5\. Wireframe Architecture

The page is built as a five-zone operational workspace. Each zone has a specific job. Do not collapse these zones into a simple table; the value of the page is rapid triage with defensible classification.

| Zone | Screen Area | Purpose | Required Components |
| --- | --- | --- | --- |
| A | Top Command Band | Expose live risk posture and key actions. | Open Critical count, High count, SLA breaches, source health, Create Manual Signal, Bulk Classify, Export Queue View. |
| B | Left Filter Rail | Constrain the working queue. | Risk tier, source, case type, channel, brand, agent, policy rule, owner, SLA state, duplicate cluster, date range. |
| C | Signal Queue Table | Show normalized signals requiring action. | Severity, status, signal title, source, confidence, reason code, evidence count, owner, due time, destination workflow. |
| D | Right Classification Drawer | Classify without losing queue context. | Signal summary, AI suggestion, reason codes, evidence preview, related objects, reviewer decision, routing action. |
| E | Bottom Activity Strip | Prove what changed. | Last 20 actions, status transitions, duplicate merges, escalations, overrides, API/audit event IDs. |

# 6\. Text Wireframe — Desktop

┌──────────────────────────────────────────────────────────────────────────────┐  
│ ZOIKOVERTEX · SAFETY LAYER · RISK INTAKE & CLASSIFICATION │  
│ Critical 07 · High 24 · SLA Breaches 03 · Ingestion Healthy · Last sync 08s │  
│ \[Create Manual Signal\] \[Bulk Classify\] \[Export Queue View\] \[Source Health\] │  
├──────────────┬───────────────────────────────────────────────┬───────────────┤  
│ FILTER RAIL │ SIGNAL QUEUE │ CLASSIFICATION │  
│ Risk Tier │ Sev │ Signal │ Source │ Confidence │ Due │ Owner │ DRAWER │  
│ Source │ CR │ Agent attempted restricted claim │ AI suggestion │  
│ Channel │ HI │ Approval override before publication │ Reason codes │  
│ Brand │ HI │ Repeated content-risk pattern detected │ Evidence preview│  
│ Policy Rule │ MD │ Brand tone drift warning │ Linked objects │  
│ Agent │ LW │ Low-confidence automated reply │ Decision fields │  
│ Owner │ │ Route actions │  
│ SLA State │ │ Audit preview │  
├──────────────┴───────────────────────────────────────────────┴───────────────┤  
│ ACTIVITY STRIP: classified · escalated · preserved · routed · merged · audit │  
└──────────────────────────────────────────────────────────────────────────────┘

# 7\. Signal Source Taxonomy

| Source | Examples | Default Initial State | Minimum Required Metadata |
| --- | --- | --- | --- |
| AI Agent Runtime | Blocked action, refusal, low confidence, tool-use anomaly. | Needs Classification | agent_id, agent_version, workflow_run_id, model_route, confidence, action_attempted. |
| Policy Engine | Rule breach, restricted claim, prohibited channel, jurisdiction conflict. | Needs Classification | policy_rule_id, policy_version, jurisdiction, triggered_condition, object_id. |
| Approval Workflow | Bypass, emergency override, delayed review, improper sign-off. | Needs Classification | approval_chain_id, actor_id, approver_id, status, deadline, override_reason. |
| Channel / Integration | Publish mismatch, failed takedown, external platform rejection. | Needs Classification | channel_id, external_object_id, integration_id, error_code, timestamp. |
| Identity & Access | Suspicious login, role elevation, session mismatch, token abuse. | Needs Classification | identity_id, session_id, ip, device_id, role_change_id. |
| Manual Report | User-reported risk, executive escalation, customer complaint. | Needs Intake Review | reporter_id, narrative, attached evidence, affected object, requested urgency. |
| Pattern Detector | Cross-signal cluster, recurring actor anomaly, repeated policy breach. | Needs Classification | pattern_id, source_signal_ids, detector_name, trigger_threshold, cluster_summary. |

# 8\. Classification Model

Classification is a structured decision with four layers: risk domain, severity, confidence, and destination workflow. The UI must show each layer separately so reviewers can correct one element without corrupting the full classification record.

| Layer | Values | Rules |
| --- | --- | --- |
| Risk Domain | Brand, Legal, Compliance, Security, AI Agent, Approval, Content, Identity, Platform, Data. | Exactly one primary domain. Secondary domains allowed but must not drive routing unless promoted. |
| Severity | Low, Medium, High, Critical. | Severity is calculated from impact, likelihood, exposure, regulatory sensitivity, and active/public state. |
| Confidence | 0.00 to 1.00. | Below 0.65 requires human classification. Above 0.85 may auto-route only for Low or Medium risk. |
| Destination Workflow | Policy Guardrails, Human Review, Forensic Hub, Evidence Vault, Emergency Pause, Dismissed with Reason. | High and Critical cannot be dismissed without dual approval. Critical can trigger Emergency Pause. |

# 9\. Severity Scoring Formula

Severity must be deterministic, explainable, and tunable by authorized governance administrators. The first release uses a weighted score from 0 to 100.

| Factor | Weight | Inputs | High-Impact Examples |
| --- | --- | --- | --- |
| Impact | 30% | Public exposure, customer harm, legal exposure, financial risk, brand sensitivity. | Published regulated claim, misleading statement, data disclosure. |
| Likelihood | 20% | Confidence, recurrence, active automation, known pattern, prior incidents. | Same agent or actor involved in repeat escalations. |
| Exposure | 20% | Audience size, channel reach, campaign importance, tenant tier, external visibility. | Public social post, paid campaign, investor-facing content. |
| Control failure | 15% | Approval bypass, policy override, missing reviewer, failed guardrail. | Emergency override used after legal rule triggered. |
| Regulatory sensitivity | 15% | Jurisdiction, sector pack, legal hold relevance, notification obligation. | Healthcare, financial services, employment, privacy, consumer protection. |
| Score Band | Severity | Required Behavior |
| --- | --- | --- |
| 0–24 | Low | Queue for normal review; auto-route permitted when confidence is at least 0.85. |
| 25–49 | Medium | Human review required before closure; may route to Policy Guardrails. |
| 50–74 | High | Owner assignment required; SLA begins immediately; no silent downgrade. |
| 75–100 | Critical | Immediate escalation; possible Emergency Pause; preservation recommendation generated. |

# 10\. Classification Drawer Requirements

| Panel | Fields / Controls | Engineering Notes |
| --- | --- | --- |
| Signal Summary | Title, normalized description, source, created time, affected brand/channel/object. | Summary is generated from normalized object, not raw event payload. |
| AI Suggestion | Suggested domain, severity, confidence, top reason codes, model/prompt version. | Must show “Why this was suggested.” No black-box label. |
| Evidence Preview | Linked audit events, screenshots/assets where permitted, policy snapshot, agent transcript excerpt. | Restricted evidence appears as opaque entry with role reason. |
| Decision Fields | Primary domain, secondary domains, severity, owner, due date, routing destination, decision reason. | All required before classification can be submitted. |
| Actions | Classify, Escalate, Send to Forensic Hub, Preserve to Vault, Apply Pause Recommendation, Dismiss with Reason. | Buttons show only when role and signal state permit. |
| Audit Preview | Before/after state, actor, reason, generated audit event type. | Reviewer sees what will be recorded before submitting. |

# 11\. Status Workflow

| Status | Meaning | Allowed Next Statuses | Blocked Conditions |
| --- | --- | --- | --- |
| New | Normalized signal created; not yet touched. | Needs Classification, Duplicate Candidate, Auto-Routed. | Cannot close. |
| Needs Classification | Requires human or authorized auto-classification. | Classified, Escalated, Duplicate Candidate, Dismissed with Reason. | Critical cannot dismiss without dual approval. |
| Classified | Domain, severity, reason, and route set. | Routed, Escalated, Reclassified, Closed. | High/Critical cannot close without owner. |
| Routed | Sent to downstream workflow. | In Review, Preserved, Forensic Case Created, Closed. | Cannot change route without reclassification reason. |
| Escalated | Requires higher authority. | In Review, Emergency Pause Recommended, Forensic Case Created. | Cannot downgrade without authorized reviewer. |
| Duplicate Candidate | Likely duplicate or related signal. | Merged, Split, Classified. | Cannot delete; merge/split must retain source. |
| Closed | No further safety action required or downstream workflow complete. | Reopened. | Requires closure reason and final classification. |

# 12\. Routing Rules

| Condition | Destination | Required Payload |
| --- | --- | --- |
| Severity Critical and public/external exposure true | Emergency Pause + Forensic Hub | signal_id, affected_object_id, severity_score, source_events, proposed pause scope, reason codes. |
| High or Critical legal/compliance risk | Forensic Hub + Evidence Vault recommendation | case_type, linked audit events, policy snapshot, custody recommendation. |
| Low or Medium policy mismatch | Policy Guardrails queue | policy_rule_id, classification reason, suggested control update. |
| Security or identity anomaly | Identity/Security review queue | identity_id, session_id, device/ip metadata, access-risk reason. |
| Approval bypass or override | Approval Workflow remediation | approval_chain_id, actor_id, approver_id, deadline, override reason. |
| Manual report lacks evidence | Human Intake Review | reporter, narrative, affected object, request for evidence. |
| Potential duplicate | Duplicate resolution queue | cluster_id, candidate_signal_ids, similarity reasons. |

# 13\. Data Model — SafetySignal

{  
"signal\_id": "SIG-2026-000482",  
"schema\_version": "1.0",  
"tenant\_id": "TEN-001",  
"workspace\_id": "WRK-001",  
"source": {  
"source\_type": "policy\_engine",  
"source\_event\_id": "AUD-2026-00019211",  
"ingested\_at": "2026-05-20T15:42:11Z",  
"source\_health\_state": "healthy"  
},  
"classification": {  
"primary\_domain": "approval",  
"secondary\_domains": \["legal", "content"\],  
"severity": "high",  
"severity\_score": 68,  
"confidence": 0.91,  
"reason\_codes": \["approval\_override", "external\_publication", "restricted\_claim"\],  
"classified\_by": "USR-022",  
"classified\_at": "2026-05-20T15:45:30Z"  
},  
"linked\_objects": {  
"audit\_event\_ids": \["AUD-2026-00019211"\],  
"content\_ids": \["CNT-1029"\],  
"campaign\_ids": \["CMP-042"\],  
"approval\_chain\_ids": \["ACH-8821"\],  
"policy\_rule\_ids": \["AR-014"\],  
"agent\_ids": \["AGT-004"\],  
"identity\_ids": \["USR-091"\]  
},  
"routing": {  
"destination": "forensic\_hub",  
"route\_reason": "High-risk approval override before external publication",  
"routed\_at": "2026-05-20T15:47:00Z",  
"downstream\_object\_id": "INV-2026-000142"  
},  
"sla": {  
"started\_at": "2026-05-20T15:42:11Z",  
"due\_at": "2026-05-20T17:42:11Z",  
"status": "on\_track"  
},  
"audit": {  
"created\_audit\_event\_id": "AUD-2026-00019215",  
"last\_action\_audit\_event\_id": "AUD-2026-00019220"  
}  
}

# 14\. API Surface

| Method | Endpoint | Purpose | Audit Event |
| --- | --- | --- | --- |
| GET | /api/safety/signals | List signals with filters and access-controlled fields. | safety.signal_list_viewed |
| GET | /api/safety/signals/{id} | Read one signal with drawer payload. | safety.signal_viewed |
| POST | /api/safety/signals | Create manual signal. | safety.signal_created_manual |
| POST | /api/safety/signals/{id}/classify | Submit classification or reclassification. | safety.signal_classified |
| POST | /api/safety/signals/{id}/route | Route to downstream workflow. | safety.signal_routed |
| POST | /api/safety/signals/{id}/escalate | Escalate to named role or emergency path. | safety.signal_escalated |
| POST | /api/safety/signals/{id}/merge | Merge duplicate signals into cluster. | safety.signal_merged |
| POST | /api/safety/signals/{id}/split | Split signal from duplicate cluster. | safety.signal_split |
| POST | /api/safety/signals/{id}/close | Close with reason and final classification. | safety.signal_closed |
| POST | /api/safety/signals/{id}/reopen | Reopen closed signal. | safety.signal_reopened |

# 15\. Empty, Error, and Permission States

| State | User Message | System Behavior |
| --- | --- | --- |
| No signals | No safety signals match this view. | Show source health, clear filters action, and last ingestion timestamp. |
| No permission | You do not have access to this queue or signal. | Return 404 for scoped object access where enumeration risk exists. |
| Source ingestion delayed | Signals may be delayed because one or more sources are unhealthy. | Show source health drawer and affected connectors. |
| Classification conflict | This signal was updated by another reviewer. | Force refresh; preserve the user draft separately. |
| Restricted evidence | Evidence exists but is restricted for your role. | Show opaque evidence row and request-access workflow where allowed. |
| Action blocked | This action requires additional authorization. | Explain missing authority; do not show hidden data. |

# 16\. Security and Governance Controls

*   All list and detail responses must apply tenant isolation, workspace isolation, role permissions, and field-level redaction server-side.
*   High and Critical severity signals cannot be bulk-closed, bulk-dismissed, or bulk-downgraded.
*   Bulk classification is allowed only for Low and Medium signals where source, domain, and reason codes match.
*   Every manual signal must require source narrative, affected object, reason, reporter, and optional evidence attachment.
*   Every AI-generated classification suggestion must store model, prompt version, confidence, and explanation trace ID.
*   All action endpoints must be idempotent where retry is possible and must protect against duplicate downstream case creation.
*   All queue exports must be watermarked, scoped, and logged with export reason and field set.

# 17\. Performance and Accessibility Targets

| Area | Target |
| --- | --- |
| Queue load | p50 under 250ms for first 100 signals; p95 under 900ms with filters. |
| Drawer open | p50 under 300ms for normalized payload; evidence previews lazy-loaded. |
| Classification submit | p50 under 350ms, excluding downstream case creation; async routing supported. |
| Real-time updates | Queue updates within 5 seconds of signal creation or action event. |
| Accessibility | WCAG 2.2 AA; keyboard action path for filtering, drawer review, classification, and routing. |
| Mobile | Mobile supports queue review, drawer read, classify, escalate, and route for authorized roles. |

# 18\. Acceptance Criteria

1.  01\. Safety Signal objects are created only after normalization and schema validation.
2.  02\. Page loads from the normalized Safety Signal store, not raw event sources.
3.  03\. Filters are combinable and preserve URL state.
4.  04\. Signal queue displays severity, status, source, confidence, due time, owner, and destination workflow.
5.  05\. Classification drawer opens without losing queue context.
6.  06\. AI suggestion includes confidence, reason codes, model route, and explanation trace.
7.  07\. Reviewer can classify primary domain, secondary domains, severity, owner, and routing destination.
8.  08\. High and Critical downgrades require authorized role and reason.
9.  09\. Critical external-exposure signals trigger emergency escalation recommendation.
10.  10\. Duplicate candidates can be merged or split with preserved lineage.
11.  11\. Every action endpoint emits an Audit Trail event.
12.  12\. Field-level redaction is enforced by the API, not the UI.
13.  13\. Restricted evidence appears opaque and never exposes hidden fields.
14.  14\. Manual signal creation requires reporter, narrative, affected object, and reason.
15.  15\. Bulk classification is blocked for High and Critical signals.
16.  16\. Routing to Forensic Hub creates or links downstream case without duplicates.
17.  17\. Routing to Evidence Vault recommendation includes required evidence references.
18.  18\. SLA starts at signal creation and updates after classification and routing.
19.  19\. SLA breach escalates to configured owner chain.
20.  20\. Queue exports require reason, scope, watermark, and audit record.
21.  21\. Empty, error, and permission states are distinct and tested.
22.  22\. Mobile supports core review and permitted actions.
23.  23\. Accessibility passes WCAG 2.2 AA for queue, drawer, controls, and modals.
24.  24\. Performance targets pass under realistic tenant data volume.

# 19\. Engineering Handoff

This document is complete when engineering can build the Risk Intake & Classification Engine without needing additional product interpretation. The next document in the sequence is Safety Layer Document 03: Policy Guardrails & Intervention Controls. Do not begin Document 03 until Document 02 is approved and locked.