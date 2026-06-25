ZoikoVertex | Accountability Layer | Approvals Wireframe

**ZoikoVertex**

**Accountability Layer**

**Detailed Wireframe 4: Approvals**

*Product, UX, Governance, and Engineering Specification*

|**Module**|Accountability Layer|
| :- | :- |
|**Page**|Approvals|
|**Sidebar Location**|Accountability Layer -> Approvals|
|**Build Status**|New page from scratch|
|**Primary Function**|Approval decision center for reviewing, approving, rejecting, requesting changes, escalating, and evidencing approval decisions for content, replies, campaigns, agent actions, workflow outputs, exceptions, and high-risk operations.|
|**Primary Users**|Admin, Approver, Campaign Manager, Compliance Reviewer, Legal Reviewer, Publisher, Agent Operator, Executive Reviewer|
|**Language**|American English|

# **1. Build Decision**
Build **Approvals** as the formal decision page for items that require authorized approval before progression, scheduling, publication, reply, execution, or closure.

It must not be built as:

|**Do Not Build As**|**Reason**|
| :- | :- |
|A duplicate of Review Queue|Review Queue is broader human review; Approvals is authority-based decisioning|
|A duplicate of Validation Desk|Validation checks rules; Approvals records accountable human or authorized approval decisions|
|A duplicate of Approval Rules|Approval Rules defines logic; Approvals executes decisions|
|A generic task list|Approval decisions must be auditable, permissioned, and evidence-backed|
|A simple approve/reject table|Enterprise approval requires context, conditions, history, routing, and evidence|

Build it as a **governed approval workbench**.
# **2. Product Definition**
The **Approvals** page is where authorized users make or review formal approval decisions.

It must support approvals for:

|**Approval Item Type**|**Examples**|
| :- | :- |
|Social content|Posts, captions, campaigns, media copy, scheduled content|
|Inbox engagement|Sensitive replies, escalated DMs, public comments, brand-risk responses|
|Campaign assets|Campaign brief, CTA, landing copy, ad copy, creative direction|
|Agent actions|AI agent recommendations, autonomous action requests, execution proposals|
|Workflow outputs|AI Workflow Orchestration outputs requiring approval|
|Exception outcomes|Items routed from Exceptions requiring decision|
|Validation overrides|Items that passed with warning or need formal authorization|
|Restricted operations|Items requiring elevated approval under restricted mode|
|Compliance-sensitive content|Legal, regulatory, financial, healthcare, employment, or public-risk items|
|Publishing actions|Items requiring final release permission before scheduling or publishing|

The purpose is simple:

**Approvals determines who has authorized an item to proceed, under what conditions, with what evidence, and with what accountability.**
# **3. Boundary With Other Accountability Pages**

|**Page**|**Primary Function**|
| :- | :- |
|Review Queue|General review and triage before decision|
|Quality Audit|Post-decision or sampled quality assessment|
|Validation Desk|Rule-checking before progression|
|Approvals|Formal accountable approval decisions|
|Approval Rules|Defines routing, authority, thresholds, and conditions|
|Exceptions|Handles abnormal cases, breaches, bypasses, and rule conflicts|

Approvals is the **decision execution layer**. Approval Rules is the **logic definition layer**.
# **4. Core User Outcomes**
Users must be able to:

1. View all items requiring approval.
1. See items assigned to them.
1. Open an approval item and inspect full context.
1. Review validation status, rule findings, risk classification, and source evidence.
1. View approval path and required approvers.
1. Approve an item.
1. Reject an item.
1. Request changes.
1. Escalate an item.
1. Approve with conditions where policy permits.
1. Record approval notes and decision rationale.
1. Confirm whether approval requirements are satisfied.
1. Prevent unauthorized or incomplete approvals.
1. Send approved items to the next workflow destination.
1. Preserve a complete approval trail.
# **5. Page Architecture**
Use a three-panel enterprise layout.

|**Area**|**Purpose**|
| :- | :- |
|Header|Page title, approval metrics, search, filters, primary actions|
|Left Panel|Approval item list|
|Center Panel|Approval workspace, item preview, evidence, validation, routing|
|Right Panel|Decision panel, approval path, required approvers, notes, timeline|

This page must feel like a **controlled decision desk**, not a content editing page.
# **6. Header**
## **6.1 Page Title**
**Approvals**
## **6.2 Page Description**
**Review and authorize content, replies, campaign assets, agent actions, workflow outputs, and escalated items before they proceed.**
## **6.3 Header Actions**

|**Button**|**Behavior**|
| :- | :- |
|Approve Selected|Disabled unless selected items are bulk-approval eligible|
|Assign Approver|Assigns item to eligible approver|
|Request Changes|Returns selected eligible item for revision|
|Escalate|Sends item to higher authority|
|Export Approval Record|Exports selected approval record|
|Approval Settings|Admin only; links to Approval Rules or settings|

Unavailable actions must be disabled with tooltip explanation.
# **7. Summary Metric Cards**
Display six cards.

|**Metric Card**|**Definition**|
| :- | :- |
|Pending Approval|Items waiting for approval|
|Assigned to Me|Items assigned to current user|
|Approved Today|Items approved today|
|Changes Requested|Items returned for revision|
|Escalated|Items escalated from approval|
|Overdue|Approval items past SLA|

Each card must be clickable and apply the relevant filter.
## **7.1 Alert Strip**
Show alert strip when applicable.

|**Alert**|**Trigger**|
| :- | :- |
|Critical Approvals Pending|High-risk or executive approval item pending|
|SLA Breach|One or more approvals overdue|
|Validation Failure Present|Item was routed despite failed validation|
|Missing Approver|Required approver has not been assigned|
|Blocked Approval Path|Approval cannot proceed due to rule conflict|
|Restricted Operations Mode|Elevated approval restrictions are active|

# **8. Approval Tabs**
Build these exact tabs:

1. Approval Queue
1. Assigned to Me
1. Waiting on Others
1. Approved
1. Rejected
1. Changes Requested
1. Escalated
1. Overdue
1. Conditional Approvals
1. Completed
# **9. Default Sorting Logic**
Default order must be:

1. Critical-risk approvals
1. Restricted Operations Mode approvals
1. Overdue approvals
1. Escalated approvals
1. Items nearing publication, response, or execution deadline
1. Items requiring current user decision
1. Items with missing approver
1. Items with validation warnings
1. Most recently submitted items

Users must be able to sort by:

- due date
- risk level
- approval status
- approval stage
- campaign
- platform
- source module
- assigned approver
- submitter
- item type
- validation status
- created date
- last activity
# **10. Supported Approval Item Types**

|**Item Type**|**Description**|
| :- | :- |
|Social Post|Content requiring approval before scheduling or publication|
|Inbox Reply|DM/comment/mention response requiring approval before send|
|Campaign Asset|Copy, CTA, brief, creative direction, or campaign content|
|Agent Action|AI agent action or recommendation requiring authorization|
|Workflow Output|Output from AI Workflow Orchestration requiring approval|
|Validation Override|Item requiring approval because validation warning was overridden|
|Exception Outcome|Exception case requiring formal approval|
|Restricted Operation|High-risk action under restricted operating conditions|
|Compliance-Sensitive Item|Legal, regulatory, public-risk, or sector-sensitive content|
|Publishing Action|Final approval to schedule, publish, reply, or execute|

# **11. Left Panel - Approval Item List**
## **11.1 Approval Item Card**
Each approval card must show:

- item title
- item type
- source module
- campaign, if available
- platform/channel
- approval status
- current approval stage
- required approval level
- assigned approver
- submitter
- validation status
- risk level
- due date/time
- SLA status
- last activity
- next required action
## **11.2 Required Badges**
Use badges for:

- Pending Approval
- Assigned to Me
- Waiting on Others
- Approved
- Rejected
- Changes Requested
- Escalated
- Conditional Approval
- Overdue
- High Risk
- Critical
- Validation Warning
- Validation Failed
- Override Used
- Restricted Mode
- Missing Approver
- Multi-Step Approval
- Final Approval
- AI Generated
- Agent Action
- Compliance Review
## **11.3 Quick Actions**
Allowed quick actions:

- Open Approval
- Assign Approver
- Request Changes
- Escalate
- Export Record

Do not allow quick approve or quick reject from the card.

Approval and rejection require full workspace inspection and decision note where required.
# **12. Center Panel - Approval Workspace**
When an item is opened, show the approval workspace.
## **12.1 Approval Header**
Display:

- item title
- item type
- source module
- campaign
- platform/channel
- approval status
- current approval stage
- required approval level
- assigned approver
- submitter
- risk level
- validation status
- due date/time
- SLA status
- submitted date/time
- approval rule matched
## **12.2 Item Preview by Type**
### **Social Post Approval Preview**
Show:

- post copy
- media attachments
- link preview
- hashtags
- mentions
- target platform
- scheduled publish time, if available
- platform preview
- campaign context
### **Inbox Reply Approval Preview**
Show:

- original incoming message
- conversation context
- AI draft reply
- human-edited reply
- proposed final reply
- sensitivity indicators
- escalation history, where applicable
### **Agent Action Approval Preview**
Show:

- agent name
- requested task
- proposed action
- expected system impact
- affected module
- execution risk
- required approval level
- rollback or containment note, if available
### **Workflow Output Approval Preview**
Show:

- originating workflow
- triggering event
- generated output
- downstream action
- validation dependency
- required next step
- automation impact
### **Campaign Asset Approval Preview**
Show:

- campaign objective
- audience
- content/copy
- CTA
- channel
- linked creative/media
- claim statements
- campaign governance context
# **13. Approval Workspace Tabs**
Build these tabs inside the workspace:

1. Approval Summary
1. Content / Item Preview
1. Validation Results
1. Source Grounding
1. Risk & Compliance
1. Approval Path
1. Decision History
1. Evidence
1. Comments
1. Next Destination
# **14. Approval Summary**
Show:

- approval status
- approval stage
- required approvers
- completed approvers
- pending approvers
- blocked approvers
- required approval level
- matched approval rule
- validation status
- risk level
- due date
- SLA status
- next required action
## **14.1 Approval Statuses**
Use these exact statuses:

|**Status**|**Meaning**|
| :- | :- |
|Pending Approval|Awaiting approval action|
|In Review|Approver has opened or started review|
|Waiting on Others|Current stage depends on another approver|
|Approved|Required approval has been granted|
|Rejected|Approval denied|
|Changes Requested|Returned for revision|
|Escalated|Sent to higher authority or specialist review|
|Conditional Approval|Approved subject to stated condition|
|Blocked|Approval cannot proceed due to rule, validation, or permission issue|
|Cancelled|Approval request withdrawn|
|Completed|Approval workflow finalized|
|Archived|Retained but removed from active queue|

# **15. Validation Results Tab**
Show the latest validation result from Validation Desk.

Must include:

- validation status
- validation score
- rule set version
- content snapshot version
- failed rule count
- warning count
- blocked rule count
- manual-check count
- source-grounding status
- platform-readiness status
- approval-readiness status
- validation timestamp
- link to Validation Desk item

Approval behavior:

|**Validation State**|**Approval Behavior**|
| :- | :- |
|Passed|Approval can proceed|
|Warning|Approval can proceed with visible warning if rule permits|
|Passed with Override|Approval can proceed with override banner|
|Failed|Approval should be blocked unless approval rule permits escalation-only handling|
|Blocked|Approval must be blocked|
|Revalidation Needed|Approval must be blocked until revalidated|
|Manual Check Required|Approval must be blocked until completed|

# **16. Source Grounding Tab**
Show:

- detected claims
- attached sources
- source status
- source confidence
- unsupported claims
- outdated sources
- conflicting sources
- grounding status
- required source actions

Approval must not proceed for unsupported regulated claims unless the item has been corrected, approved source support has been added, or an authorized escalation decision explicitly allows controlled handling.
# **17. Risk & Compliance Tab**
Show:

- risk level
- risk category
- compliance category
- jurisdiction, where applicable
- restricted operation indicator
- sensitive content indicators
- legal/compliance notes
- escalation requirements
- policy exceptions
- unresolved risks

Risk levels:

|**Risk Level**|**Meaning**|
| :- | :- |
|Low|Routine approval|
|Medium|Needs reviewer attention|
|High|Requires senior or specialist approval|
|Critical|Requires elevated or executive approval|

# **18. Approval Path Tab**
Show the configured approval path from Approval Rules.

Must display:

- matched approval rule
- rule version
- approval path type
- required roles
- required users, if assigned
- sequence order
- parallel approval group, if applicable
- quorum requirement, if applicable
- fallback approver
- escalation path
- SLA deadline
- current stage
- completed stages
- pending stages
- blocked stages
## **18.1 Approval Path Types**
Support:

|**Path Type**|**Meaning**|
| :- | :- |
|Single Approver|One approver required|
|Sequential|Approvers must decide in defined order|
|Parallel|Multiple approvers can decide at same time|
|Quorum|Minimum number of approvals required|
|Role-Based|Any authorized user in role can approve|
|Specialist Approval|Legal, compliance, executive, or brand specialist required|
|Conditional Approval|Approval allowed subject to conditions|
|Emergency Approval|Emergency path with elevated logging|
|Executive Approval|Senior approval required|

# **19. Decision History Tab**
Show chronological approval history:

- approval request created
- assigned approver
- approver opened item
- validation result attached
- comment added
- changes requested
- revised item returned
- approval granted
- conditional approval granted
- rejection recorded
- escalation triggered
- fallback approver assigned
- SLA breached
- approval completed
- callback failed
- callback retried

Every entry must show:

- action
- actor
- timestamp
- previous status
- new status
- decision note, where applicable
# **20. Evidence Tab**
Show evidence package:

- source item snapshot
- validation record
- approval rule matched
- approval path
- approver decision
- decision note
- source grounding
- risk classification
- content snapshot version
- final approved version
- downstream action result, where available

Evidence must be immutable after completion except for supplemental evidence added with a separate audit entry.
# **21. Comments Tab**
Comments must:

- be internal only unless specifically configured otherwise
- show author
- show timestamp
- support threaded discussion
- support mentions, if available
- be retained in approval history
- be required for rejection, changes requested, conditional approval, escalation, emergency approval, and override-sensitive approval
# **22. Next Destination Tab**
Show where the item will go after approval.

Possible destinations:

|**Destination**|**Use Case**|
| :- | :- |
|Content Scheduler|Approved post moves to scheduling|
|Publish Now|Approved item can be published immediately|
|Inbox & Engagement|Approved reply can be sent|
|Agent Execution|Approved agent action can execute|
|AI Workflow Orchestration|Workflow continues to next step|
|Quality Audit|Item selected for post-approval audit|
|Review Queue|Item returns for further review|
|Exceptions|Item moves to exception handling|
|Archive|No further action required|

Display:

- next module
- next action
- required conditions
- callback status
- downstream owner
- failure handling behavior
# **23. Right Panel - Approval Decision Panel**
The right panel must include:

1. Decision controls
1. Approval eligibility
1. Approval path progress
1. Required approvers
1. Validation risk summary
1. Decision note
1. Conditions, if applicable
1. Approval timeline
# **24. Approval Eligibility**
Before decision buttons are enabled, backend must calculate approval eligibility.

|**Eligibility State**|**Meaning**|
| :- | :- |
|Approval Eligible|Current user can approve|
|Rejection Eligible|Current user can reject|
|Changes Request Eligible|Current user can request changes|
|Conditional Approval Eligible|Current user can approve with conditions|
|Escalation Required|Must be escalated before decision|
|Waiting on Prior Stage|Sequential stage not ready|
|Missing Required Approver|Required approver not assigned|
|Validation Blocked|Validation state blocks approval|
|Revalidation Required|Item must be revalidated|
|Permission Denied|User lacks approval authority|
|Already Decided|Current user or workflow has already decided|
|Workflow Completed|Approval workflow is complete|

## **24.1 Button Behavior**

|**Condition**|**Button Behavior**|
| :- | :- |
|Approval Eligible|Enable Approve|
|Rejection Eligible|Enable Reject|
|Changes Request Eligible|Enable Request Changes|
|Conditional Approval Eligible|Enable Approve with Conditions|
|Escalation Required|Disable approve/reject; enable Escalate|
|Waiting on Prior Stage|Disable decision controls|
|Missing Required Approver|Disable approve; show assign approver action|
|Validation Blocked|Disable approve; show validation issue|
|Revalidation Required|Disable approve; show send to Validation Desk|
|Permission Denied|Hide or disable decision controls|
|Already Decided|Disable current user decision|
|Workflow Completed|Read-only mode|

# **25. Decision Controls**
Primary decision buttons:

- Approve
- Reject
- Request Changes
- Approve with Conditions
- Escalate

Secondary actions:

- Assign Approver
- Reassign
- Send to Validation Desk
- Send to Review Queue
- Export Approval Record
- View Source Item
## **25.1 Approve**
Approve requires:

- eligible user
- eligible workflow state
- completed prerequisite validations
- decision note where required by rule
- confirmation for high-risk or restricted items

When approved:

- approval decision is recorded
- approval path advances or completes
- source module is notified
- next destination callback is triggered
- approval timeline is updated
## **25.2 Reject**
Reject requires:

- rejection reason
- decision note
- eligible user
- severity/category, where applicable

When rejected:

- item status changes to Rejected
- source owner is notified
- normal progression stops
- timeline is updated

Rejection reasons:

- brand issue
- compliance issue
- unsupported claim
- incorrect source
- platform issue
- risk too high
- wrong audience
- poor quality
- wrong approval route
- other
## **25.3 Request Changes**
Request Changes requires:

- change instruction
- owner
- due date, where applicable
- decision note

When requested:

- status changes to Changes Requested
- source owner receives change request
- item must be revised and revalidated if content changes
- timeline is updated
## **25.4 Approve with Conditions**
Allowed only when rule permits.

Requires:

- condition text
- condition owner
- condition due date, if applicable
- decision note
- risk acknowledgement

When approved with conditions:

- status changes to Conditional Approval
- condition record is created
- source module receives condition
- next destination is allowed only if condition policy permits
- timeline is updated

Conditions may include:

- add disclaimer before publish
- replace unsupported source
- adjust copy before scheduling
- obtain final legal review
- restrict platform
- publish only after specified date/time
- attach evidence before release
## **25.5 Escalate**
Escalation requires:

- escalation reason
- target role or user
- severity
- decision note

Escalation reasons:

- high-risk content
- critical compliance concern
- legal ambiguity
- executive sensitivity
- failed validation
- approval route conflict
- restricted mode trigger
- approver conflict of interest
- missing authority
- urgent deadline

When escalated:

- status changes to Escalated
- target reviewer receives assignment
- current workflow stage is locked as required
- timeline is updated
# **26. Approval Path Progress**
Show visual path progress:

|**Element**|**Requirement**|
| :- | :- |
|Current stage|Clearly highlighted|
|Completed stage|Show approver, decision, timestamp|
|Pending stage|Show required role/user|
|Blocked stage|Show blocking reason|
|Escalated stage|Show escalation target|
|Conditional stage|Show condition summary|
|Final stage|Show completion state|

# **27. Required Approvers Panel**
Show:

- required role
- assigned user
- decision status
- due date
- SLA status
- fallback approver
- delegation status
- conflict indicator, if applicable

Approver statuses:

|**Status**|**Meaning**|
| :- | :- |
|Pending|No decision yet|
|In Review|Approver has opened item|
|Approved|Approved by approver|
|Rejected|Rejected by approver|
|Changes Requested|Changes requested by approver|
|Escalated|Escalated by approver|
|Skipped|Skipped due to rule logic|
|Reassigned|Moved to another approver|
|Timed Out|SLA expired|

# **28. SLA Rules**
Display:

- approval due date/time
- time remaining
- overdue badge
- escalation deadline
- SLA policy matched

UI behavior:

|**Condition**|**UI Behavior**|
| :- | :- |
|Due in more than 24 hours|Normal display|
|Due within 24 hours|Due Soon badge|
|Overdue|Overdue badge and escalation prompt|
|Critical and overdue|Critical Overdue badge and immediate escalation prompt|
|Restricted Mode overdue|Escalation required|

# **29. Permission Rules**
Approval permissions must be enforced by backend.

Permissions must consider:

- tenant
- workspace
- role
- approval level
- approval rule
- assigned approver
- delegation
- conflict of interest
- restricted mode
- item risk level
- source module
- campaign ownership

Users must not approve their own item if tenant policy prohibits self-approval.

Users must not approve items outside their approval authority.
# **30. Conflict of Interest Rules**
System must flag conflict where:

- approver created the item and self-approval is prohibited
- approver edited the item and independent review is required
- approver is campaign owner and separate compliance approval is required
- approver is also assigned as validator where separation of duties applies
- approver is restricted by tenant policy

When conflict exists:

- approval controls disabled for conflicted user
- conflict reason displayed
- fallback approver or escalation path shown
- audit entry created
# **31. Bulk Actions**
Allowed safe bulk actions:

- assign approver
- reassign approver
- export approval records
- request changes for same-rule issue
- escalate selected items
- approve low-risk items only where approval rule allows bulk approval

Do not allow bulk approval where:

- item is high or critical risk
- validation warning exists
- validation failed
- item is blocked
- manual check is required
- item requires sequential approval
- item requires specialist approval
- item uses restricted operation mode
- conflict of interest exists
- conditional approval is required

Bulk rejection should be disabled unless every selected item shares the same rejection reason and user confirms.
# **32. Filters**
Required filters:

- item type
- source module
- campaign
- platform/channel
- approval status
- approval stage
- required approval level
- assigned approver
- submitter
- validation status
- risk level
- due date
- overdue only
- assigned to me
- waiting on others
- escalated only
- conditional approvals only
- missing approver only
- restricted mode only
- self-approval conflict only
- source-grounding issue only
# **33. Search**
Search must cover:

- item title
- campaign name
- platform
- source module
- submitter
- assigned approver
- approval rule name
- approval path
- content text
- decision note
- comments
- rejection reason
- change request instruction
- source reference
- evidence reference
# **34. Empty States**
## **34.1 No Pending Approvals**
**Title:** No items waiting for approval.

**Body:** Items requiring formal authorization before publication, response, execution, or workflow progression will appear here.

**Button:** View Completed Approvals
## **34.2 No Items Assigned to Me**
**Title:** No approvals assigned to you.

**Body:** Approvals requiring your decision will appear here.
## **34.3 No Escalated Approvals**
**Title:** No escalated approvals.

**Body:** Approvals requiring elevated handling will appear here.
## **34.4 No Overdue Approvals**
**Title:** No overdue approvals.

**Body:** Approvals past their SLA deadline will appear here.
# **35. Error and Locked States**

|**State**|**Message**|
| :- | :- |
|Approval load failure|Approvals could not be loaded. Try again.|
|Permission denied|You do not have permission to approve this item.|
|Validation blocked|This item cannot be approved because validation blocks progression.|
|Revalidation required|This item changed after validation. Revalidate before approval.|
|Missing approver|This approval path requires an assigned approver.|
|Waiting on prior stage|This item is waiting for an earlier approval stage.|
|Conflict of interest|You cannot approve this item under the current approval policy.|
|Approval path conflict|This item cannot proceed because the approval path has a rule conflict.|
|Workflow completed|This approval workflow is complete and read-only.|
|Callback failed|Approval decision was saved, but the source module could not be updated. Retry callback.|

# **36. Notifications**
Trigger notifications when:

- approval request is created
- approver is assigned
- approver is reassigned
- item is opened by approver
- approval is granted
- item is rejected
- changes are requested
- conditional approval is granted
- item is escalated
- approval becomes overdue
- fallback approver is assigned
- approval workflow completes
- callback fails

Notification channels:

- in-app
- email, optional
- Slack/Teams, future
- webhook, future
# **37. Data Objects**
## **37.1 Approval Item**
Required fields:

- id
- tenant\_id
- source\_module
- source\_entity\_id
- item\_type
- title
- campaign\_id
- platform
- content\_snapshot
- content\_snapshot\_version
- approval\_status
- approval\_stage
- approval\_rule\_id
- approval\_rule\_version
- required\_approval\_level
- assigned\_approver\_id
- submitted\_by
- validation\_status
- risk\_level
- due\_at
- submitted\_at
- completed\_at
- archived\_at
- created\_at
- updated\_at
## **37.2 Approval Decision**
Required fields:

- id
- approval\_item\_id
- approver\_id
- decision
- decision\_reason
- decision\_note
- condition\_text
- condition\_owner
- condition\_due\_at
- decided\_at
- created\_at

Decision values:

- approved
- rejected
- changes\_requested
- conditional\_approval
- escalated
## **37.3 Approval Path**
Required fields:

- id
- approval\_item\_id
- path\_type
- current\_stage
- required\_roles
- required\_users
- quorum\_required
- fallback\_approver
- escalation\_target
- sla\_due\_at
- created\_at
- updated\_at
## **37.4 Approval Stage**
Required fields:

- id
- approval\_path\_id
- stage\_order
- stage\_type
- required\_role
- required\_user
- assigned\_user
- stage\_status
- completed\_by
- completed\_at
- due\_at
- created\_at
- updated\_at
## **37.5 Approval Comment**
Required fields:

- id
- approval\_item\_id
- comment\_body
- visibility
- created\_by
- created\_at

Visibility:

- internal\_only
## **37.6 Approval Evidence**
Required fields:

- id
- approval\_item\_id
- evidence\_type
- evidence\_reference
- source\_module
- captured\_at
- created\_at
## **37.7 Approval Audit Log**
Required fields:

- id
- tenant\_id
- approval\_item\_id
- action
- previous\_value
- new\_value
- performed\_by
- performed\_at
## **37.8 Approval Callback**
Required fields:

- id
- approval\_item\_id
- source\_module
- source\_entity\_id
- callback\_status
- callback\_payload
- last\_attempt\_at
- retry\_count
- created\_at
- updated\_at
# **38. Backend Endpoints**
Required endpoints:

- GET approval items
- GET approval item detail
- PATCH assign approver
- PATCH reassign approver
- POST approve item
- POST reject item
- POST request changes
- POST approve with conditions
- POST escalate approval
- POST cancel approval
- GET approval path
- GET approval decisions
- GET approval comments
- POST add approval comment
- GET approval evidence
- GET approval audit trail
- POST export approval record
- POST retry source callback
# **39. Source Module Callback Behavior**
When approval state changes, Approvals must notify the originating module.

|**Approval Outcome**|**Source Module Behavior**|
| :- | :- |
|Approved|Source item allowed to proceed to next destination|
|Rejected|Source item stops progression and records rejection|
|Changes Requested|Source item returned for revision|
|Conditional Approval|Source item proceeds only under configured condition policy|
|Escalated|Source item locked or rerouted to elevated review|
|Cancelled|Source item approval request closed|
|Completed|Source item approval record finalized|

Every callback must include:

- approval\_item\_id
- source\_module
- source\_entity\_id
- approval\_status
- approval\_decision
- approval\_rule\_id
- approval\_rule\_version
- approver
- decision\_note
- condition\_summary
- risk\_level
- validation\_status
- approved\_at
- audit\_log\_reference
- next\_destination
- next\_required\_action

If callback fails:

- show callback failure state
- create audit entry
- allow retry by authorized user
- do not delete approval decision
- do not silently progress the source item
# **40. Frontend Components**
Build these components:

- ApprovalsPage
- ApprovalsHeader
- ApprovalMetricCards
- ApprovalAlertStrip
- ApprovalTabs
- ApprovalFilterDrawer
- ApprovalSearchBar
- ApprovalItemCard
- ApprovalWorkspace
- ApprovalContentPreview
- ApprovalWorkspaceTabs
- ApprovalSummaryPanel
- ValidationResultsPanel
- SourceGroundingPanel
- RiskCompliancePanel
- ApprovalPathPanel
- DecisionHistoryPanel
- EvidencePanel
- CommentsPanel
- NextDestinationPanel
- ApprovalDecisionPanel
- ApprovalEligibilityPanel
- ApprovalPathProgress
- RequiredApproversPanel
- ApprovalTimeline
- DecisionNoteModal
- RejectModal
- RequestChangesModal
- ConditionalApprovalModal
- EscalationModal
- EmptyState
- ErrorState
- LockedState
- CallbackFailedState
# **41. Non-Negotiable Governance Rules**
1. Approvals must be permissioned by backend.
1. Approval cannot proceed if validation is blocked.
1. Approval cannot proceed if revalidation is required.
1. Approval cannot proceed if required approver is missing.
1. Approval cannot proceed if sequential prior stage is incomplete.
1. Approval cannot proceed where conflict of interest policy blocks user.
1. Rejection requires reason and decision note.
1. Request Changes requires instruction and owner.
1. Conditional Approval requires condition text, owner, and note.
1. Escalation requires target role or user and escalation reason.
1. Approval decision history must never be deleted.
1. Approval evidence must be preserved.
1. Completed approvals remain searchable and exportable.
1. Source module must be updated when approval state changes.
1. Callback failures must be visible and retryable.
1. Bulk approval must be heavily restricted.
1. Approver cannot approve outside assigned authority.
1. Emergency or restricted approvals require elevated logging.
1. Approval Rules version must be recorded on every approval item.
1. Content snapshot version must be recorded on every approval item.
# **42. MVP Scope**
## **42.1 MVP Must Include**
- Approvals page shell
- Header
- Metric cards
- Alert strip
- Approval tabs
- Approval item list
- Approval workspace
- Item preview
- Approval summary
- Validation results tab
- Risk and compliance tab
- Approval path tab
- Decision history tab
- Evidence tab
- Comments tab
- Next destination tab
- Decision panel
- Approval eligibility logic
- Approve
- Reject
- Request Changes
- Escalate
- Assign approver
- Reassign approver
- Filters
- Search
- Empty states
- Error states
- Locked states
- Callback failed state
- Backend-enforced permissions
- Source module callbacks
## **42.2 MVP Can Exclude**
- Advanced quorum approvals
- Advanced delegation workflows
- Full emergency approval simulation
- Slack/Teams notifications
- Advanced conditional approval automation
- Cross-workspace approval analytics
- Mobile optimization
- AI decision recommendations
# **43. Build Phases**
## **Phase 1 - Approval Foundation**
Build:

- page shell
- header
- metric cards
- alert strip
- approval tabs
- approval item list
- approval workspace
- filters
- search
- empty states
- error states
- locked states
## **Phase 2 - Decision Controls**
Build:

- approval decision panel
- approval eligibility logic
- approve
- reject
- request changes
- escalate
- assign approver
- reassign approver
- decision notes
- approval timeline
## **Phase 3 - Governance Context**
Build:

- validation results
- source grounding
- risk and compliance
- approval path
- required approvers
- decision history
- evidence
- comments
- next destination
## **Phase 4 - Workflow Integration**
Build:

- source module callbacks
- callback retry
- Review Queue integration
- Validation Desk integration
- Content Scheduler integration
- Inbox & Engagement integration
- Agent Execution integration
- Exceptions integration
## **Phase 5 - Enterprise Approval Controls**
Build:

- conditional approval automation
- quorum approval
- delegation
- fallback approver automation
- emergency approval
- approval analytics
- SLA escalation automation
# **44. Acceptance Criteria**
The Approvals page is acceptable when:

1. Users can view approval items.
1. Users can see items assigned to them.
1. Users can open an item and inspect full context.
1. Users can see approval status, stage, assigned approver, required approval level, and due date.
1. Users can view validation results linked to the item.
1. Users can view source grounding and risk context.
1. Users can view approval path and required approvers.
1. Users can approve only when eligible.
1. Users can reject only when eligible and with required reason and note.
1. Users can request changes with instruction and owner.
1. Users can escalate with reason and target reviewer.
1. Conditional approval is available only when rule permits.
1. Approval is blocked when validation is blocked.
1. Approval is blocked when revalidation is required.
1. Approval is blocked when required approver is missing.
1. Approval is blocked when prior sequential stage is incomplete.
1. Approval is blocked when conflict of interest applies.
1. Backend enforces approval permissions.
1. Every decision creates an audit entry.
1. Source module receives approval outcome.
1. Callback failure is visible and retryable.
1. Empty, error, loading, locked, callback failed, and permission-denied states are handled.
1. Completed approvals remain searchable and exportable.
1. The page contains no placeholder-only implementation after build.
# **45. Phase-Based Acceptance Criteria**
## **Phase 1 Acceptance**
Phase 1 is acceptable when:

- Approvals page loads successfully.
- Tabs display correct approval groups.
- Metric cards reflect approval data.
- Alert strip shows critical approval conditions.
- Approval items open into detail view.
- Filters and search work.
- Empty, loading, error, permission-denied, and locked states display correctly.
## **Phase 2 Acceptance**
Phase 2 is acceptable when:

- Approval eligibility is calculated by backend.
- Eligible users can approve.
- Eligible users can reject with reason and note.
- Eligible users can request changes with instruction and owner.
- Eligible users can escalate with reason and target reviewer.
- Ineligible users cannot approve.
- Approval timeline records every action.
## **Phase 3 Acceptance**
Phase 3 is acceptable when:

- Validation results are visible.
- Source grounding is visible.
- Risk and compliance context is visible.
- Approval path is visible.
- Required approvers are visible.
- Decision history is visible.
- Evidence is visible.
- Comments are visible.
- Next destination is visible.
## **Phase 4 Acceptance**
Phase 4 is acceptable when:

- Source module callbacks work.
- Failed callbacks can be retried.
- Review Queue integration works.
- Validation Desk integration works.
- Content Scheduler integration works.
- Inbox & Engagement integration works.
- Agent Execution integration works.
- Exceptions integration works.
## **Phase 5 Acceptance**
Phase 5 is acceptable when:

- Conditional approval automation works.
- Quorum approvals work.
- Delegation works.
- Fallback approver automation works.
- Emergency approval works.
- Approval analytics work.
- SLA escalation automation works.
# **46. Final Engineering Instruction**
Build **Approvals** as the formal decision center inside the Accountability Layer.

This page must allow authorized users to approve, reject, request changes, escalate, and conditionally approve items with full context, rule awareness, validation awareness, source evidence, approval path visibility, and immutable decision history.

The first production-ready version must include:

- approval item list
- approval workspace
- item preview
- approval summary
- validation results
- source grounding
- risk and compliance
- approval path
- required approvers
- decision history
- evidence
- comments
- next destination
- approval decision panel
- approval eligibility logic
- approve
- reject
- request changes
- escalate
- assign and reassign approver
- filters
- search
- locked states
- callback failed state
- backend-enforced permissions
- source module callbacks

This page must be **controlled, permissioned, explainable, evidentiary, and practical for enterprise approval governance**.
Confidential - Product, UX, Governance, and Engineering Specification
