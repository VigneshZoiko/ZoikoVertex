ZoikoVertex | Accountability Layer | Exceptions Wireframe

**ZOIKOVERTEX**

**Accountability Layer**

**Detailed Wireframe 6: Exceptions**

Final Refined Product, UX, Governance, and Engineering Specification

|**Field**|**Specification**|
| :- | :- |
|Module|Accountability Layer|
|Page|Exceptions|
|Sidebar Location|Accountability Layer > Exceptions|
|Build Status|New page from scratch|
|Primary Function|Manage abnormal, blocked, failed, conflicted, bypassed, overdue, escalated, unsafe, or policy-sensitive cases that cannot proceed through standard ZoikoVertex workflows.|
|Primary Users|Admin, Governance Admin, Compliance Reviewer, Legal Reviewer, Campaign Manager, Executive Reviewer, Agent Operator, System Owner|
|Language|American English|


# **1. Build Decision**
Build Exceptions as the governed case-resolution center for abnormal workflow events.

This page exists for cases where normal workflow cannot safely continue because an item is:

• blocked

• conflicted

• failed

• overdue

• escalated

• unsafe

• ambiguous

• outside policy

• missing evidence

• missing authority

• stuck between modules

• under Restricted Operations Mode

Do not build this as a passive error log. Build it as a permissioned, auditable, enterprise-grade exception desk where cases are triaged, assigned, investigated, escalated, remediated, resolved, closed, and evidenced.
# **2. Product Definition**
The Exceptions page captures cases that cannot proceed through normal workflow.

|**Source**|**Example Exception**|
| :- | :- |
|Review Queue|Reviewer flags abnormal, unsafe, unresolved, or out-of-scope item|
|Quality Audit|Audit failure, repeated defect, policy breach, quality issue|
|Validation Desk|Failed validation, blocked validation, stale validation, missing evidence, source conflict|
|Approvals|Missing approver, deadlock, authority gap, conflict of interest, callback failure|
|Approval Rules|Rule conflict, rule coverage gap, invalid rule path, missing fallback|
|Inbox & Engagement|Legal threat, harassment, discrimination, complaint, brand crisis, sensitive DM/comment|
|Media Engine|Publishing failure, platform rejection, unauthorized schedule change|
|Agent Studio / Agent Operations|Unsafe AI action, unauthorized autonomy request, anomalous agent behavior|
|AI Workflow Orchestration|Failed workflow, broken dependency, stuck automation, callback failure|
|Integrations|API failure, platform disconnect, webhook failure, permission failure|
|Restricted Mode|Crisis, legal hold, emergency control, brand pause, executive intervention|

Exceptions exists to prevent unsafe progression and provide a controlled route back to resolution.
# **3. Boundary With Other Accountability Pages**

|**Page**|**Function**|
| :- | :- |
|Review Queue|Ordinary human review and triage|
|Quality Audit|Quality inspection and post-decision audit|
|Validation Desk|Rule, claim, source, platform, and readiness validation|
|Approvals|Formal approve, reject, change request, or escalation decisions|
|Approval Rules|Configures approval routing logic|
|Exceptions|Resolves abnormal cases, blocked states, conflicts, failed callbacks, bypass attempts, overdue governance, and non-standard workflow issues|

Exceptions is the abnormal-case resolution layer.
# **4. Core User Outcomes**
1\. View all exception cases.

2\. Filter exceptions by severity, category, source, owner, SLA, risk, and status.

3\. Open a case and understand why it exists.

4\. See the source item, blocker, workflow state, validation state, approval state, related rules, evidence, and audit trail.

5\. Assign or reassign an owner.

6\. Classify category and severity.

7\. Add remediation steps.

8\. Escalate to Legal, Compliance, Executive, Security, Governance Admin, or System Admin.

9\. Send the case to Validation Desk.

10\. Send the case to Approvals.

11\. Send the case to Quality Audit.

12\. Return the item to source owner.

13\. Retry failed callbacks.

14\. Request controlled override where permitted.

15\. Approve or deny controlled override where authorized.

16\. Quarantine, cancel, archive, or return the item to workflow.

17\. Resolve with root cause, outcome, corrective action, and evidence.

18\. Preserve complete audit and evidence records.
# **5. Required Page Layout**
Use a three-panel enterprise case-desk layout.

|**Zone**|**Purpose**|
| :- | :- |
|Header|Page title, metrics, alerts, global actions, search, filters|
|Left Panel|Exception case list|
|Center Panel|Case detail workspace|
|Right Panel|Severity, owner, SLA, required authority, action controls, escalation, resolution|

The page must feel like a governance incident desk, not a generic admin table.
# **6. Header**
## **Page Title**
Exceptions
## **Page Description**
Resolve blocked, conflicted, failed, overdue, escalated, unsafe, or non-standard governance cases before they can return to normal workflow.
## **Header Actions**

|**Action**|**Behavior**|
| :- | :- |
|Create Exception|Manual case creation where authorized|
|Assign Owner|Assign selected exception|
|Escalate|Escalate to required authority|
|Send to Validation Desk|Route item for validation|
|Send to Approvals|Route item for formal approval decision|
|Send to Quality Audit|Route item for audit inspection|
|Retry Callback|Retry failed callback or downstream sync|
|Export Evidence|Export case evidence package|
|Restricted Mode Controls|Admin-only; visible during Restricted Operations Mode|

Disabled actions must display tooltip reasons.

|**Disabled Action**|**Tooltip**|
| :- | :- |
|Resolve Exception|Root cause and resolution note are required|
|Request Override|This exception type is non-overridable|
|Retry Callback|You do not have system permission|
|Close Exception|Exception must be resolved before closing|
|Archive Exception|Only closed exceptions can be archived|

# **7. Metric Cards**

|**Metric**|**Definition**|
| :- | :- |
|Open Exceptions|All unresolved exception cases|
|Critical|Critical severity cases|
|Assigned to Me|Cases owned by current user|
|Overdue|Cases past SLA|
|Rule Conflicts|Approval or validation rule conflict cases|
|Callback Failures|Workflow, source-module, or integration callback failures|
|Restricted Mode|Cases created during Restricted Operations Mode|
|Resolved Today|Cases resolved today|

Each card must be clickable and apply the matching filter.
# **8. Alert Strip**

|**Alert**|**Trigger**|
| :- | :- |
|Critical Exception Open|One or more critical cases exist|
|Restricted Mode Active|Restricted Operations Mode is active|
|SLA Breach|One or more cases are overdue|
|Rule Conflict Blocking Workflow|Rule ambiguity or contradiction blocks progression|
|Callback Failure Blocking Progression|Source module or downstream update failed|
|Owner Missing|Exception has no owner|
|Override Requested|Controlled override is pending|
|Legal / Compliance Review Required|Specialist authority required|
|Unsafe Agent Action|AI agent action flagged as unsafe, anomalous, or unauthorized|
|Evidence Gap|Required source, validation, approval, or audit evidence is missing|

# **9. Tabs**
1\. All Exceptions

2\. Assigned to Me

3\. Critical

4\. Overdue

5\. Rule Conflicts

6\. Validation Blocks

7\. Approval Blocks

8\. Callback Failures

9\. Restricted Mode

10\. Override Requests

11\. Resolved

12\. Archived
# **10. Default Sorting and Priority Routing**
Default sort order:

1\. Critical severity

2\. Restricted Mode cases

3\. Legal or compliance review required

4\. Unsafe agent action

5\. Overdue cases

6\. Rule conflicts blocking workflow

7\. Callback failures blocking progression

8\. Missing owner

9\. High severity

10\. Most recently created

Sortable fields: severity, status, source module, category, owner, SLA status, due date, risk level, created date, last activity, workflow impact, and restricted-mode status.

No critical or restricted-mode exception should be buried below routine operational cases.
# **11. Exception Categories**

|**Category**|**Description**|
| :- | :- |
|Validation Block|Failed, blocked, stale, or incomplete validation|
|Approval Block|Missing approver, conflict of interest, deadlock, authority gap|
|Rule Conflict|Conflicting, overlapping, missing, or invalid rules|
|Callback Failure|Source module or downstream workflow failed to update|
|Integration Failure|Platform, API, webhook, token, or permission failure|
|Policy Breach|Item violates configured policy|
|Evidence Gap|Missing source, unsupported claim, missing audit evidence|
|Quality Failure|Quality Audit failure requiring remediation|
|Sensitive Engagement|Legal threat, harassment, discrimination, complaint, public-risk message|
|Agent Safety|Unsafe, unauthorized, excessive, or anomalous AI agent action|
|Restricted Operation|Case created during crisis, brand pause, legal hold, or emergency mode|
|SLA Breach|Required action overdue|
|Manual Override Request|User requests controlled bypass|
|Unknown / Other|Requires manual classification|

# **12. Exception Statuses**

|**Status**|**Meaning**|
| :- | :- |
|New|Created but not triaged|
|Triage|Under initial classification|
|Assigned|Owner assigned|
|In Progress|Remediation or investigation underway|
|Waiting on Source|Waiting on source owner or source module|
|Waiting on Validation|Waiting on Validation Desk|
|Waiting on Approval|Waiting on Approvals|
|Escalated|Sent to higher authority or specialist|
|Override Requested|Controlled override requested|
|Override Approved|Controlled override approved|
|Override Denied|Controlled override denied|
|Blocked|Cannot proceed due to unresolved dependency|
|Resolved|Resolved with outcome and root cause|
|Closed|Finalized and no further action required|
|Archived|Historical record only|
|Cancelled|Withdrawn or source item cancelled|

# **13. Severity Levels**

|**Severity**|**Meaning**|
| :- | :- |
|Low|Minor workflow issue or non-critical case|
|Medium|Requires action before normal progression|
|High|Blocks important workflow, public-facing item, or governance-sensitive action|
|Critical|Legal, compliance, safety, executive, restricted-mode, crisis, or major workflow-blocking case|

Severity must affect sorting, SLA, escalation requirement, available actions, notification urgency, and closure requirements.
# **14. Left Panel - Exception Case List**
Each exception card must show:

• exception title

• exception ID

• category

• severity

• status

• source module

• source entity type

• source entity reference

• owner

• created by

• created date/time

• due date/time

• SLA status

• risk level

• restricted-mode badge

• last activity

• next required action
## **Required Badges**
• New

• Triage

• Assigned

• In Progress

• Escalated

• Blocked

• Overdue

• Critical

• High Risk

• Restricted Mode

• Legal Required

• Compliance Required

• Executive Required

• Owner Missing

• Rule Conflict

• Validation Block

• Approval Block

• Callback Failed

• Override Requested

• Agent Safety

• Evidence Gap

• Resolved

• Archived
## **Quick Actions**
Allowed: Open Exception, Assign Owner, Escalate, Send to Validation, Send to Approvals, Send to Quality Audit, Retry Callback, Export Evidence.

Not allowed: quick resolve, quick override approval, quick close, quick archive of unresolved cases. Resolution requires full inspection and outcome notes.
# **15. Center Panel - Exception Detail Workspace**
When a case is opened, show a structured case workspace.
## **Exception Header**
• exception title

• exception ID

• category

• severity

• status

• source module

• source entity

• owner

• created by

• created date/time

• due date/time

• SLA status

• risk level

• restricted-mode status

• escalation status

• workflow impact

• current blocker

• next required action
# **16. Workspace Tabs**
1\. Exception Summary

2\. Source Context

3\. Blocker Analysis

4\. Validation / Approval State

5\. Evidence

6\. Remediation Plan

7\. Escalation History

8\. Override Control

9\. Audit Trail

10\. Resolution
# **17. Exception Summary Tab**
• category

• severity

• status

• owner

• source module

• impacted workflow

• current blocker

• business impact

• risk level

• SLA status

• next required action

• recommended route

• required authority

• escalation requirement

• restricted-mode indicator
## **Recommended Route Values**
• Return to Source Owner

• Send to Validation Desk

• Send to Approvals

• Send to Approval Rules

• Send to Quality Audit

• Escalate to Legal

• Escalate to Compliance

• Escalate to Executive

• Escalate to Security

• Retry Callback

• Quarantine Item

• Cancel Item

• Archive

• Controlled Override
# **18. Source Context Tab**
• source module

• source item type

• source item title

• source item owner

• source workflow state

• source created date/time

• source last updated

• campaign

• platform/channel

• content or item preview

• related validation record

• related approval record

• related approval rule

• related audit record

• source item link

Source context must be read-only unless the user has edit permission in the source module.
# **19. Blocker Analysis Tab**
Show why the exception exists. Required blocker fields:

• blocker type

• blocker description

• blocker severity

• triggered by

• triggered timestamp

• related rule ID

• related validation ID

• related approval ID

• related callback ID

• blocking dependency

• required action to unblock

• owner required to unblock

• estimated impact

• automatic remediation available: yes/no
## **Blocker Types**
• Validation Failed

• Validation Blocked

• Revalidation Required

• Unsupported Claim

• Missing Source

• Source Conflict

• Missing Approver

• Approval Authority Gap

• Conflict of Interest

• Approval Deadlock

• Rule Conflict

• Rule Coverage Gap

• Callback Failure

• Integration Failure

• Policy Breach

• Agent Safety Trigger

• Restricted Mode Trigger

• SLA Breach

• Manual Override Needed

• Unknown
# **20. Validation / Approval State Tab**
## **Validation State**
• validation status

• validation score

• failed rules

• warning rules

• blocked rules

• manual-check status

• source-grounding status

• revalidation required: yes/no

• validation timestamp

• link to Validation Desk
## **Approval State**
• approval status

• approval rule matched

• approval path

• current stage

• required approver

• owner

• conflict status

• SLA status

• decision history

• link to Approvals
## **Rule State**
• approval rule ID/version

• validation rule ID/version, if applicable

• rule conflict summary

• precedence result

• replacement coverage result

• link to Approval Rules
# **21. Evidence Tab**
• source item snapshot

• content version

• validation result

• approval state

• rule conflict report

• callback failure payload

• integration response

• user action history

• agent action trace

• comments and notes

• remediation steps

• escalation notes

• override request and decision

• resolution record

Evidence must be immutable after resolution, except supplemental evidence may be added with a separate audit entry.
# **22. Remediation Plan Tab**
Users must be able to create and update remediation steps.

• remediation owner

• remediation action

• due date

• dependency

• target destination

• required validation

• required approval

• required evidence

• completion status

• notes
## **Remediation Actions**
• Fix content

• Add source

• Remove claim

• Revalidate item

• Assign approver

• Change approval path

• Resolve rule conflict

• Retry callback

• Reconnect integration

• Escalate to specialist

• Cancel source item

• Quarantine item

• Approve controlled override

• Archive exception

Remediation steps must create audit entries.
# **23. Escalation History Tab**
• escalation reason

• severity

• escalated by

• escalated to

• timestamp

• response status

• escalation note

• outcome

• SLA impact

Escalation targets: Legal, Compliance, Executive, Security, System Admin, Campaign Owner, Platform Owner, Governance Admin, External Support future.
# **24. Override Control Tab**
Controlled override must be treated as exceptional and high-friction.

• request override

• approve override

• deny override

• attach override rationale

• require senior approver

• require risk acknowledgement

• require evidence attachment

• require expiry date/time

• require post-override Quality Audit

• block override where non-overridable rule applies
## **Override Request Fields**
• override reason

• requested by

• requested outcome

• risk acknowledgement

• evidence attached

• expiry date/time

• approving authority

• post-override Quality Audit required

• source item destination after override
## **Non-Overridable Cases in MVP**
• blocked validation

• stale validation

• missing legal approval where required

• missing compliance approval where required

• active legal hold

• restricted mode without executive authority

• unsafe autonomous agent execution

• platform policy violation

• missing evidence for regulated claim

• unresolved security issue

• unresolved privacy or data exposure issue

Override decisions must always create audit entries.
# **25. Audit Trail Tab**
Every exception action must create an audit entry. Audit entries must show action, actor, timestamp, previous status, new status, source module, related entity, note, and metadata.
## **Required Audit Events**
• exception created

• category changed

• severity changed

• owner assigned

• owner reassigned

• status changed

• remediation added

• remediation completed

• sent to Validation Desk

• sent to Approvals

• sent to Quality Audit

• escalated

• override requested

• override approved

• override denied

• callback retried

• source item updated

• evidence exported

• exception resolved

• exception closed

• exception archived

Audit trail must never be editable or deletable.
# **26. Resolution Tab**
Resolution requires structured closure.

• resolution outcome

• resolution summary

• root cause

• corrective action

• preventive action

• final destination

• evidence attached

• post-resolution audit required

• resolved by

• resolved at
## **Resolution Outcomes**

|**Outcome**|**Meaning**|
| :- | :- |
|Returned to Workflow|Issue fixed and item returns to normal workflow|
|Sent to Validation Desk|Requires validation before proceeding|
|Sent to Approvals|Requires formal decision|
|Sent to Quality Audit|Requires audit before closure or after override|
|Escalated|Requires specialist or senior review|
|Source Item Cancelled|Underlying item cancelled|
|Item Quarantined|Item blocked from execution or publication|
|Override Approved|Controlled override permits limited progression|
|Override Denied|Exception remains blocked or source item cancelled|
|Rule Updated|Rule issue resolved by rule change|
|Callback Retried Successfully|Workflow resumed after callback success|
|Integration Fixed|Platform/API issue resolved|
|Archived Without Action|No further action required|

Resolution cannot occur without owner, category, severity, root cause, resolution outcome, resolution summary, and audit entry.
# **27. Right Panel - Exception Control Panel**
1\. Severity and status

2\. Owner and SLA

3\. Current blocker

4\. Recommended route

5\. Required authority

6\. Action controls

7\. Escalation controls

8\. Override controls

9\. Resolution controls
## **Primary Actions**
• Assign Owner

• Start Triage

• Mark In Progress

• Send to Validation Desk

• Send to Approvals

• Send to Quality Audit

• Escalate

• Retry Callback

• Request Override

• Resolve Exception

• Close Exception

• Archive
## **Secondary Actions**
• View Source Item

• View Rule

• View Validation Record

• View Approval Record

• Export Evidence

• Add Comment

• Add Remediation Step

Button availability must be backend-driven by permission, status, severity, source module, and restricted-mode state.
# **28. Permission Rules**
Backend must enforce permissions based on tenant, workspace, role, source module, exception category, severity, restricted-mode status, assigned owner, escalation target, override authority, legal authority, compliance authority, executive authority, and system/admin authority.

Users must not:

• resolve exceptions without ownership or permission

• approve overrides without required authority

• close legal/compliance cases without required review

• retry callbacks without system/admin permission

• change severity on restricted-mode cases without governance permission

• archive unresolved high or critical cases without governance note

• override non-overridable cases
# **29. SLA Rules**
• SLA policy matched

• due date/time

• time remaining

• overdue status

• escalation deadline

• breach reason

|**Severity**|**SLA**|
| :- | :- |
|Low|5 business days|
|Medium|2 business days|
|High|1 business day|
|Critical|4 business hours|

Restricted Mode SLA should be configurable and shorter than ordinary SLA. SLA breach must show alert, notify owner, notify escalation target, update audit trail, and optionally escalate automatically based on tenant policy.
# **30. Notifications**
Trigger notifications when:

• exception is created

• exception is assigned

• owner changes

• severity changes

• exception becomes overdue

• critical exception is created

• restricted-mode exception is created

• escalation is triggered

• override is requested

• override is approved

• override is denied

• callback retry fails

• remediation is due

• exception is resolved

• exception is closed

Notification channels: in-app, email optional, Slack/Teams future, webhook future.
# **31. Filters**
• status

• category

• severity

• source module

• owner

• created by

• campaign

• platform/channel

• SLA status

• overdue only

• restricted-mode only

• legal required

• compliance required

• executive required

• callback failure only

• validation block only

• approval block only

• rule conflict only

• override requested only

• agent safety only

• evidence gap only

• created date

• resolved date
# **32. Search**
• exception title

• exception ID

• category

• source module

• source item title

• source entity ID

• owner

• created by

• campaign

• platform

• blocker description

• rule name

• validation ID

• approval ID

• callback ID

• remediation notes

• resolution notes

• audit notes
# **33. Bulk Actions**
Allowed bulk actions: assign owner, escalate selected cases, export evidence, tag selected cases, send selected low/medium validation cases to Validation Desk, and archive resolved cases.

Do not allow bulk actions for critical cases, restricted-mode cases, override requests, legal/compliance escalation cases, unsafe agent action cases, unresolved high-risk cases, callback retries across mixed source modules, or resolution of active exceptions. No bulk resolve in MVP.
# **34. Empty States**

|**State**|**Copy**|
| :- | :- |
|No Exceptions|Title: No exceptions open. Body: Blocked, conflicted, failed, overdue, escalated, unsafe, or non-standard governance cases will appear here when normal workflow cannot safely continue. Button: View Resolved Exceptions|
|No Critical Exceptions|Title: No critical exceptions. Body: Critical legal, compliance, executive, restricted-mode, or safety cases will appear here.|
|No Assigned Exceptions|Title: No exceptions assigned to you. Body: Exception cases requiring your action will appear here.|
|No Callback Failures|Title: No callback failures. Body: Workflow or source-module callback failures will appear here if a downstream update cannot be completed.|

# **35. Error and Locked States**

|**State**|**Message**|
| :- | :- |
|Exceptions load failure|Exceptions could not be loaded. Try again.|
|Permission denied|You do not have permission to manage this exception.|
|Missing owner|Assign an owner before this exception can be resolved.|
|Resolution blocked|Complete required fields before resolving this exception.|
|Override blocked|This exception cannot be overridden under current policy.|
|Restricted mode locked|Restricted Mode limits available actions for this exception.|
|Callback retry failed|Callback retry failed. Review source module or integration state.|
|Source item unavailable|Source item could not be loaded.|
|Rule record unavailable|Related rule record could not be loaded.|
|Validation record unavailable|Related validation record could not be loaded.|
|Approval record unavailable|Related approval record could not be loaded.|
|Evidence export failed|Evidence package could not be exported. Try again.|
|Version conflict|This exception was updated by another user. Refresh before continuing.|

# **36. Data Objects**
## **Exception Case**
• id

• tenant\_id

• workspace\_id

• exception\_title

• exception\_category

• exception\_status

• severity

• risk\_level

• source\_module

• source\_entity\_type

• source\_entity\_id

• source\_owner\_id

• exception\_owner\_id

• created\_by

• created\_at

• due\_at

• resolved\_at

• closed\_at

• archived\_at

• restricted\_mode

• current\_blocker

• workflow\_impact

• recommended\_route

• required\_authority

• updated\_at
## **Exception Blocker**
• id

• exception\_id

• blocker\_type

• blocker\_description

• blocker\_severity

• triggered\_by

• triggered\_at

• related\_rule\_id

• related\_validation\_id

• related\_approval\_id

• related\_callback\_id

• blocking\_dependency

• required\_action

• required\_owner\_id

• automatic\_remediation\_available

• created\_at

• updated\_at
## **Exception Remediation**
• id

• exception\_id

• remediation\_owner\_id

• remediation\_action

• due\_at

• dependency

• target\_destination

• required\_validation

• required\_approval

• required\_evidence

• completion\_status

• notes

• created\_at

• completed\_at
## **Exception Escalation**
• id

• exception\_id

• escalation\_reason

• severity

• escalated\_by

• escalated\_to\_role

• escalated\_to\_user\_id

• escalated\_at

• response\_status

• escalation\_note

• outcome

• sla\_impact
## **Exception Override**
• id

• exception\_id

• override\_reason

• requested\_by

• requested\_outcome

• risk\_acknowledgement

• evidence\_attached

• expires\_at

• approving\_authority\_id

• override\_status

• override\_decision\_note

• decided\_by

• decided\_at

• post\_override\_quality\_audit\_required
## **Exception Evidence**
• id

• exception\_id

• evidence\_type

• evidence\_reference

• source\_module

• captured\_at

• created\_by

• created\_at
## **Exception Resolution**
• id

• exception\_id

• resolution\_outcome

• resolution\_summary

• root\_cause

• corrective\_action

• preventive\_action

• final\_destination

• evidence\_attached

• post\_resolution\_audit\_required

• resolved\_by

• resolved\_at
## **Exception Audit Log**
• id

• tenant\_id

• exception\_id

• action

• previous\_value

• new\_value

• performed\_by

• performed\_at

• note

• metadata
# **37. Backend Endpoints**
• GET exceptions

• GET exception detail

• POST create exception

• PATCH update exception

• PATCH assign exception owner

• PATCH update severity

• PATCH update status

• POST send to validation desk

• POST send to approvals

• POST send to quality audit

• POST escalate exception

• POST request override

• POST approve override

• POST deny override

• POST retry callback

• POST add remediation step

• PATCH complete remediation step

• POST resolve exception

• POST close exception

• POST archive exception

• GET exception evidence

• POST export exception evidence

• GET exception audit trail

• GET related source context

• GET related validation record

• GET related approval record

• GET related rule record
# **38. Frontend Components**
• ExceptionsPage

• ExceptionsHeader

• ExceptionMetricCards

• ExceptionAlertStrip

• ExceptionTabs

• ExceptionSearchBar

• ExceptionFilterDrawer

• ExceptionCaseList

• ExceptionCaseCard

• ExceptionDetailWorkspace

• ExceptionSummaryTab

• SourceContextTab

• BlockerAnalysisTab

• ValidationApprovalStateTab

• ExceptionEvidenceTab

• RemediationPlanTab

• EscalationHistoryTab

• OverrideControlTab

• ExceptionAuditTrailTab

• ResolutionTab

• ExceptionControlPanel

• AssignOwnerModal

• EscalationModal

• OverrideRequestModal

• OverrideDecisionModal

• RetryCallbackModal

• ResolutionModal

• EvidenceExportModal

• EmptyState

• ErrorState

• LockedState

• PermissionDeniedState
# **39. Non-Negotiable Governance Rules**
1\. Exceptions must be backend-permissioned.

2\. Every exception must have category, severity, status, source module, source entity, and current blocker.

3\. High and critical exceptions require an owner before resolution.

4\. Critical exceptions cannot be bulk-resolved.

5\. Restricted-mode exceptions require elevated permissions.

6\. Controlled override must require rationale, authority, risk acknowledgement, evidence, and audit entry.

7\. Non-overridable cases must remain blocked.

8\. Callback retry must preserve original failure evidence.

9\. Resolution requires root cause, outcome, corrective action, and resolution note.

10\. Closing requires completed resolution or governance note.

11\. Evidence must be preserved after resolution.

12\. Audit trail must never be deleted.

13\. Source context must remain linked.

14\. Legal/compliance-required cases cannot close without required review.

15\. Unsafe agent action cases cannot proceed without specialist review.

16\. Rule conflicts must not silently resolve.

17\. SLA breaches must create visible alerts.

18\. Post-override Quality Audit must be enforceable where required.

19\. Archived exceptions must remain searchable.

20\. Exceptions must feed learning back to Approval Rules, Validation Desk, Review Queue, Quality Audit, and Agent Operations where applicable.
# **40. MVP Scope**
## **MVP Must Include**
• Exceptions page shell

• Header

• Metric cards

• Alert strip

• Tabs

• Exception case list

• Exception detail workspace

• Exception summary

• Source context

• Blocker analysis

• Validation / approval state

• Evidence tab

• Remediation plan

• Escalation history

• Override control

• Audit trail

• Resolution tab

• Exception control panel

• Assign owner

• Escalate

• Send to Validation Desk

• Send to Approvals

• Send to Quality Audit

• Retry callback

• Request override

• Approve override

• Deny override

• Resolve exception

• Close exception

• Export evidence

• Filters

• Search

• Empty states

• Error states

• Locked states

• Backend-enforced permissions
## **MVP Can Exclude**
• AI-suggested remediation

• Cross-tenant exception analytics

• Advanced incident heatmaps

• External support ticket sync

• Automated root-cause classification

• Slack/Teams notifications

• Mobile optimization

• Advanced learning loops
# **41. Build Phases**

|**Phase**|**Build Items**|
| :- | :- |
|Phase 1 - Exception Desk Foundation|Page shell, header, metric cards, alert strip, tabs, exception list, cards, detail view, filters, search, empty/error/locked states|
|Phase 2 - Case Management|Assign owner, update status, update severity, remediation plan, escalation, comments/notes, SLA display, source context, blocker analysis|
|Phase 3 - Governance State and Evidence|Validation / approval state, rule state, evidence package, audit trail, export evidence, related source links|
|Phase 4 - Resolution and Override|Override request, approval, denial, retry callback, send to Validation Desk, Approvals, Quality Audit, resolution workflow, close exception, archive resolved exception|
|Phase 5 - Enterprise Expansion|AI remediation suggestions, root-cause classification, exception analytics, exception learning loop, automated rule-improvement suggestions, external support sync|

# **42. Acceptance Criteria**
1\. Users can view all exception cases.

2\. Users can filter and search exceptions.

3\. Users can open a case and see category, severity, status, owner, source module, blocker, and SLA.

4\. Users can assign or reassign owner.

5\. Users can update status where permitted.

6\. Users can update severity where permitted.

7\. Users can see source context.

8\. Users can see blocker analysis.

9\. Users can see validation and approval state.

10\. Users can see related rules and conflicts.

11\. Users can add remediation steps.

12\. Users can escalate cases.

13\. Users can send cases to Validation Desk.

14\. Users can send cases to Approvals.

15\. Users can send cases to Quality Audit.

16\. Users can retry failed callbacks.

17\. Users can request controlled override.

18\. Authorized users can approve or deny override.

19\. Non-overridable cases remain blocked.

20\. Users can resolve exceptions only with required closure fields.

21\. Users can close resolved exceptions.

22\. Users can archive closed exceptions.

23\. Users can export evidence package.

24\. Every action creates audit entry.

25\. Backend enforces permissions.

26\. Restricted-mode cases apply elevated controls.

27\. Empty, error, loading, locked, and permission-denied states are handled.

28\. The page contains no placeholder-only implementation after build.
# **43. Final Engineering Instruction**
Build Exceptions as ZoikoVertex’s governed abnormal-case resolution center.

The page must allow authorized users to identify, classify, assign, investigate, escalate, remediate, override where permitted, resolve, close, archive, and evidence abnormal cases that cannot safely proceed through normal workflow.

The first production-ready version must include:

• exception case list

• exception detail workspace

• source context

• blocker analysis

• validation and approval state

• evidence package

• remediation plan

• escalation history

• controlled override workflow

• resolution workflow

• audit trail

• assign owner

• update status

• update severity

• send to Validation Desk

• send to Approvals

• send to Quality Audit

• retry callback

• export evidence

• filters

• search

• locked states

• backend-enforced permissions

This page must be controlled, practical, auditable, permissioned, evidentiary, and enterprise-safe.
Confidential build specification for ZoikoVertex engineering team
