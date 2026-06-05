ZoikoVertex | Accountability Layer | Validation Desk 

**ZOIKOVERTEX** 

## **Accountability Layer** 

## **Detailed Wireframe 3 Validation Desk** 

_Final Refined Product, UX, Governance, and Engineering Specification_ 

|**Field**|**Specifcation**|
|---|---|
|Module|Accountability Layer|
|Page|Validation Desk|
|Sidebar Location|Accountability Layer -> Validation Desk|
|Build Status|New page from scratch|
|Primary Function|Rule-checking and readiness-validation center for testing content, replies,<br>campaign assets, agent actions, workfow outputs, and approval-bound items<br>before review, approval, scheduling, publication, response, or execution.|
|Primary Users|Admin, Campaign Manager, Validator, Compliance Reviewer, Agent Operator,<br>Publisher, Reviewer|
|Language|American English|
|Version|Final - build-ready|



_This document is locked as the build specification for the Validation Desk page. It is written for tactile engineering execution: clear objects, states, rules, components, endpoints, and acceptance criteria._ 

## **1. Build Decision** 

Build Validation Desk as the operational validation center inside the Accountability Layer. 

It must not be built as a duplicate of Review Queue, a duplicate of Quality Audit, a generic checklist, a passive validation report, a simple pass/fail screen, or a final approval page. 

It must be built as a rule-driven validation workspace where authorized users can inspect whether an item has passed, warned, failed, been blocked, become stale, or requires escalation before it moves forward. 

## **2. Product Definition** 

The Validation Desk determines whether an item is safe, compliant, brand-aligned, source-grounded, platform-ready, and approvalready. 

- AI-generated social posts 

- AI-assisted inbox replies 

- human-edited drafts 

- campaign copy and campaign assets 

- scheduled content 

- agent recommendations and autonomous agent actions 

- workflow outputs 

- revised and escalated items 

Confidential Engineering Wireframe - Final Build Specification 

ZoikoVertex | Accountability Layer | Validation Desk 

- approval-bound items 

- platform-specific content 

- factual claims and regulated claims 

- sensitive content 

- ● items requiring human review before release 

Core purpose: Validation Desk determines whether an item may proceed, must be revised, requires manual review, requires escalation, can be overridden, or must be blocked. 

## **3. Boundary With Other Accountability Pages** 

|**Page**|**Primary Function**|
|---|---|
|Review Queue|Human review and decision center for items awaiting reviewer action|
|Quality Audit|Post-review, post-publication, or sampled QA inspection|
|Validation Desk|Rule-checking center for readiness, safety, compliance, grounding, and<br>platform ft|
|Approvals|Approval decision tracking and approval state management|
|Approval Rules|Defnes approval routing, authority thresholds, and reviewer requirements|
|Exceptions|Handles workfow irregularities, breached rules, bypasses, and abnormal<br>cases|



Validation Desk does not approve work. It decides whether an item is valid enough to move to review, approval, revision, escalation, block, or execution. 

## **4. Core User Outcomes** 

1. View items requiring validation. 

2. Open a validation item and inspect full context. 

3. Run validation. 

4. Revalidate after changes. 

5. See validation results by category. 

6. Understand why an item passed, warned, failed, or was blocked. 

7. Inspect failed rules, warnings, manual checks, and blocking issues. 

8. Review source grounding for claims and factual assertions. 

9. Check brand, policy, compliance, platform, claim-safety, tone, and approval-readiness results. 

10. Request revision with specific instructions. 

11. Escalate serious validation failures. 

12. Apply permitted overrides where governance allows. 

13. Send eligible items to Review Queue. 

14. Send approval-ready items to Approvals. 

15. Block items that cannot proceed. 

16. Preserve a complete validation history and evidence trail. 

## **5. Page Architecture** 

|**Area**|**Purpose**|
|---|---|
|Header|Page title, metrics, search, flters, validation actions|
|Left Panel|Validation item list|
|Center Panel|Validation workspace, item preview, rule-category tabs|
|Right Panel|Validation score, failed rules, required actions, override panel, notes, timeline|



The page must feel like a rules engine operations desk, not a content editor. 

Confidential Engineering Wireframe - Final Build Specification 

ZoikoVertex | Accountability Layer | Validation Desk 

## **6. Header** 

|**Element**|**Requirement**|
|---|---|
|Page Title|Validation Desk|
|Page Description|Validate content, replies, agent actions, and workfow outputs against brand,<br>policy, compliance, source-grounding, platform, claim-safety, tone, and<br>approval-readiness rules before they proceed.|
|Disabled Actions|Unavailable actions must be disabled with tooltip explanation.|



|**Button**|**Behavior**|
|---|---|
|Run Validation|Runs validation on selected item|
|Revalidate|Reruns validation after content, source, rule, or platform change|
|Send to Review Queue|Sends eligible item to Review Queue|
|Send to Approvals|Sends approval-ready item to Approvals|
|Request Revision|Returns failed or warning item for correction|
|Escalate|Sends serious issue to elevated handling|
|Block Item|Blocks item where non-overridable rule fails|
|Export Record|Exports validation record and evidence|
|Validation Settings|Admin only|



## **7. Summary Metric Cards and Alert Strip** 

|**Metric Card**|**Defnition**|
|---|---|
|Pending Validation|Items waiting for validation|
|Passed|Items that passed validation|
|Warnings|Items with non-blocking warnings|
|Failed|Items that failed required checks|
|Blocked|Items blocked by non-overridable rules|
|Escalation Required|Items requiring elevated handling|



|**Alert**|**Trigger**|
|---|---|
|Critical Rule Failure|One or more critical rule failures exist|
|Source Grounding Failure|Claims lack required support|
|Platform Block|Platform policy or format requirement failed|
|Override Pending|Item requires authorized override decision|
|Revalidation Needed|Content, source, platform, approval, or rule set changed|
|Manual Check Required|Human validation is required before progression|



## **8. Validation Desk Tabs** 

- Validation Queue 

- Assigned to Me 

- Passed 

- Warnings 

Confidential Engineering Wireframe - Final Build Specification 

ZoikoVertex | Accountability Layer | Validation Desk 

- Failed 

- Blocked 

- Needs Revision 

- Manual Check 

- Escalation Required 

- Override Review 

- Revalidation Needed 

- Completed Validations 

## **9. Default Sorting Logic** 

Default order must prioritize the highest governance risk and operational urgency first. 

17. Blocked items 

18. Critical rule failures 

19. Manual-check items 

20. Escalation-required items 

21. Source-grounding failures 

22. Platform policy failures 

23. Unsupported regulated claims 

24. Failed validation items 

25. Items due for publication, response, or approval soon 

26. Revalidation-needed items 

27. Warning items 

28. Most recently submitted items 

Users must be able to sort by validation status, severity, source module, campaign, platform, submitted date, due date, risk level, failed rule count, warning count, blocked rule count, rule category, assigned validator, and submitted by. 

## **10. Supported Validation Item Types** 

|**Item Type**|**Description**|
|---|---|
|Social Post|Content requiring validation before review, scheduling, or publication|
|Inbox Reply|Engagement reply requiring validation before approval or send|
|Campaign Asset|Campaign copy, brief, caption, CTA, or creative direction|
|Agent Action|Agent recommendation or execution request requiring validation|
|Workfow Output|AI workfow result requiring readiness validation|
|Revision Item|Corrected item requiring revalidation|
|Escalated Item|Item requiring validation after elevated review|
|Approval-Bound Item|Item requiring validation before approval routing|
|Platform-Specifc Content|Item requiring platform formatting or policy validation|
|Source-Claim Item|Item containing claims requiring approved source support|



## **11. Left Panel - Validation Item List** 

Each validation item card must show: item title, item type, source module, campaign, platform/channel, validation status, highest severity, failed rule count, warning count, blocked rule count, manual-check count, source-grounding status, platform-readiness status, approval-readiness status, assigned validator, submitted by, submitted date/time, due date/time, and risk level. 

Confidential Engineering Wireframe - Final Build Specification 

ZoikoVertex | Accountability Layer | Validation Desk 

Required badges: Pending Validation, In Validation, Passed, Warning, Failed, Blocked, Needs Revision, Manual Check, Revalidation Needed, Source Failure, Platform Failure, Policy Failure, Compliance Failure, Brand Failure, Claim Safety Failure, Tone Risk, Override Eligible, Override Prohibited, Escalation Required, AI Generated, Human Edited, High Risk, Critical. 

Allowed quick actions: Open Validation, Run Validation, Revalidate, Assign Validator, Request Revision, Escalate, Export Record. Do not allow quick override from the card. Overrides require full workspace inspection. 

## **12. Center Panel - Validation Workspace** 

When an item is opened, show a validation workspace with an item-specific preview, validation context, rule-category tabs, and action controls. 

|**Preview Type**|**Must Show**|
|---|---|
|Social Post|Post copy, media attachments, link preview, hashtags, mentions, target<br>platform, scheduled publish time, audience/segment, platform preview|
|Inbox Reply|Original incoming message, conversation context, AI draft reply, human-edited<br>reply, fnal reply candidate, customer/user sensitivity indicators, escalation<br>history|
|Agent Action|Agent name, requested task, proposed action, expected system impact,<br>afected module, required approval level, risk classifcation, execution<br>constraints|
|Campaign Asset|Campaign objective, audience, content/copy, CTA, channel, claim statements,<br>linked creative/media, campaign policy context|
|Workfow Output|Originating workfow, triggering event, generated output, proposed<br>downstream action, validation dependency, required next step|



## **13. Validation Category Tabs** 

- Validation Summary 

- Brand Rules 

- Policy Rules 

- Compliance Checks 

- Source Grounding 

- Platform Readiness 

- Claim Safety 

- Tone and Sensitivity 

- Approval Readiness 

- Manual Checks 

- Rule History 

- Evidence 

## **14. Validation Summary and Statuses** 

The summary must show overall validation status, validation score, total checks run, passed count, warning count, failed count, blocked count, manual-check count, highest severity, validation run timestamp, validator, validation engine version, rule set version, and content snapshot version. 

|**Status**|**Meaning**|
|---|---|
|Pending Validation|Item has not been validated|
|In Validation|Validation is running or under inspection|



Confidential Engineering Wireframe - Final Build Specification 

ZoikoVertex | Accountability Layer | Validation Desk 

|**Status**|**Meaning**|
|---|---|
|Passed|No blocking failures; item may proceed|
|Warning|Non-blocking issues exist|
|Failed|One or more required checks failed|
|Blocked|Non-overridable governance rule failed|
|Needs Revision|Item must be corrected and revalidated|
|Manual Check Required|Human validation is required|
|Escalation Required|Elevated review is required|
|Override Eligible|Item may proceed only with authorized override|
|Passed with Override|Item passed after authorized override|
|Override Prohibited|Item cannot be overridden|
|Revalidation Needed|Content, source, platform, approval, or rules changed|
|Completed|Validation decision fnalized|
|Archived|Removed from active list but retained|



## **15. Rule Result Display** 

Each validation rule result must show rule name, rule category, rule result, severity, explanation, matched text or affected area, recommended fix, rule owner, rule version, rule set version, last updated date, manual-check requirement, and override eligibility. 

|**Rule Result**|**Meaning**|
|---|---|
|Passed|Rule satisfed|
|Warning|Issue found but not blocking|
|Failed|Required rule failed|
|Blocked|Non-overridable rule failed|
|Not Applicable|Rule does not apply to this item|
|Not Run|Rule could not be run|
|Manual Check Required|Human validation required|
|Resolved|Previously failed issue was corrected|
|Overridden|Authorized override applied|



|**Severity**|**Meaning**|
|---|---|
|Low|Minor issue|
|Medium|Material but non-critical issue|
|High|Serious issue requiring correction or escalation|
|Critical|Severe issue requiring block or elevated handling|



## **16. Brand Rules Validation** 

Validate against approved brand voice, tone profile, vocabulary rules, prohibited phrases, required disclaimers, approved positioning, claim style rules, CTA rules, competitor mention rules, and campaign-specific brand rules. Display pass/warning/fail status, matched text, explanation, recommended correction, related brand rule, and override eligibility. 

## **17. Policy Rules Validation** 

Validate against tenant policy rules, content governance rules, restricted topics, prohibited content, sensitive content handling, escalation triggers, approval-routing thresholds, Restricted Operations Mode if active, and campaign-specific policies. Display the matched policy rule, severity, required action, override eligibility, escalation requirement, and blocking status. 

Confidential Engineering Wireframe - Final Build Specification 

ZoikoVertex | Accountability Layer | Validation Desk 

## **18. Compliance Checks** 

Validate against compliance categories configured by tenant. Categories may include advertising claims, financial claims, healthcare or medical claims, data privacy, employment-related statements, regulated product references, legal disclaimers, consumer protection, geography-specific requirements, age-sensitive content, public company or investor-sensitive language, and sector-specific restrictions. Display compliance area, jurisdiction if applicable, rule result, explanation, missing disclaimer if applicable, required escalation if applicable, and override prohibition where applicable. 

## **19. Source Grounding** 

Source Grounding is mandatory for factual claims, statistics, comparisons, pricing statements, performance claims, regulated statements, product claims, legal or compliance-sensitive claims, and any statement configured by tenant policy as source-required. 

|**Grounding Status**|**Meaning**|
|---|---|
|Grounded|Claims supported by approved source|
|Partially Grounded|Some claims supported; some unsupported|
|Ungrounded|Required support missing|
|Source Outdated|Source is no longer acceptable|
|Source Confict|Sources confict|
|Manual Review Required|Human source review needed|



Unsupported regulated or factual claims must not proceed without correction, approved source support, or escalation. 

## **20. Platform Readiness** 

Validate platform-specific requirements including character limits, media format requirements, image/video requirements, link formatting, hashtag limits, mention rules, prohibited platform content, ad policy risk, accessibility text, scheduling eligibility, and API publishing readiness. 

Supported platform validations may include LinkedIn, Facebook, Instagram, X/Twitter if supported, TikTok if supported, YouTube if supported, Threads if supported, and other connected platforms. Display platform, requirement checked, status, issue, recommended fix, and blocking status. 

## **21. Claim Safety** 

Validate superiority claims, performance claims, pricing claims, savings claims, health claims, financial claims, legal claims, guaranteed outcome claims, competitor comparison claims, statistical claims, availability claims, and partnership claims. 

Flag unsupported, exaggerated, regulated, unverifiable, misleading, disclaimer-required, approval-required, and escalation-required claims. 

## **22. Tone and Sensitivity** 

Validate aggressive tone, offensive language, harassment risk, discrimination risk, cultural sensitivity, crisis sensitivity, tragedy/news sensitivity, political sensitivity, vulnerable audience sensitivity, customer harm risk, and brand safety concern. Display affected text, sensitivity category, severity, recommended adjustment, and escalation requirement. 

## **23. Approval Readiness** 

Validation Desk must determine whether the item is ready for approval routing. Show approval rule matched, required approval level, required reviewer role, validation prerequisite, escalation requirement, override permission, and next workflow destination. 

|**Approval Readiness Status**|**Meaning**|
|---|---|
|Ready for Review|Can be sent to Review Queue|
|Ready for Approval|Can be sent to Approvals|
|Revision Required|Must be corrected frst|
|Manual Check Required|Human validation required|
|Escalation Required|Must be escalated|
|Blocked|Cannot proceed|



Confidential Engineering Wireframe - Final Build Specification 

ZoikoVertex | Accountability Layer | Validation Desk 

|**Approval Readiness Status**|**Meaning**|
|---|---|
|Override Required|Can proceed only with authorized override|
|Revalidation Required|Validation is stale|



## **24. Manual Checks** 

Manual checks are required when automated validation cannot determine the result with sufficient confidence or where tenant policy requires human validation. 

|**Manual Check Example**|**Reason**|
|---|---|
|Ambiguous legal claim|Requires human judgment|
|Cultural sensitivity|Requires contextual review|
|Executive-sensitive content|Requires elevated scrutiny|
|Regulated claim interpretation|Requires compliance judgment|
|Source confict|Requires source resolution|
|Unclear platform policy risk|Requires manual platform assessment|
|Crisis-related language|Requires sensitivity review|
|High-risk brand judgment|Requires brand owner decision|
|Exceptional approval route|Requires workfow judgment|



Manual check completion requires assigned validator, result, note, timestamp, and audit entry. Results are Passed, Failed, Needs Revision, Escalation Required, or Not Applicable. 

## **25. Right Panel - Validation Control Panel** 

- Validation Score 

- Failed Rules 

- Source Grounding Summary 

- Required Actions 

- Override Panel 

- Manual Checks 

- Validator Notes 

- Validation Timeline 

## **26. Validation Score** 

Show a calculated validation score from 0-100. Passed checks increase score; warnings reduce score moderately; failed checks reduce score heavily; blocked rules force blocked state; missing required source grounding prevents proceed status; critical severity forces escalation or block regardless of score; stale validation prevents progression regardless of score. 

|**Score**|**Band**|**Behavior**|
|---|---|---|
|90-100|Strong|Proceed eligible|
|75-89|Acceptable with warnings|Proceed eligible if no blocking rule|
|60-74|Needs Revision|Revision recommended|
|40-59|Failed|Revision or escalation required|
|0-39|Critical Failure|Block or escalate|



Confidential Engineering Wireframe - Final Build Specification 

ZoikoVertex | Accountability Layer | Validation Desk 

## **27. Failed Rules Panel** 

Show all failed, blocked, warning, and manual-check rules. Each row must show rule name, category, severity, result, affected text, recommended fix, override eligibility, and action required. Actions: View Rule, Request Revision, Mark Manual Check Complete, Escalate, Add Note. 

## **28. Required Actions Panel** 

- Fix content 

- Add source 

- Replace source 

- Add disclaimer 

- Remove claim 

- Adjust tone 

- Change platform formatting 

- Complete manual check 

- Escalate for compliance review 

- Send to Review Queue 

- Send to Approvals 

- Block item 

- Apply authorized override 

- Revalidate item 

## **29. Override Panel** 

Overrides are allowed only where the user has permission, the rule permits override, the item is not blocked by a non-overridable condition, risk acknowledgement is completed, a validator note is provided, and the override is recorded in the validation audit log. 

|**Override May Be Allowed For**|**Override Must Not Be Allowed For**|
|---|---|
|Low-risk warning|Critical legal/compliance block|
|Medium-risk warning|Confrmed privacy breach|
|Manual-check exception|Prohibited content|
|Source-confdence warning|Safety threat|
|Platform formatting warning|Unsupported regulated claim|
|Internal brand-rule exception where policy permits|Platform-prohibited content|
||Active Restricted Operations Mode block|
||Non-overridable tenant policy rule|



Override must not erase the failed rule. The failed rule must remain visible as Overridden. 

## **30. Validator Notes** 

Notes must be internal only, show author and timestamp, support threaded comments, be included in validation history, and be required for override, escalation, manual check completion, revision request, and blocked-item handling. 

Confidential Engineering Wireframe - Final Build Specification 

ZoikoVertex | Accountability Layer | Validation Desk 

## **31. Validation Timeline** 

Show chronological history for item submitted, validation started, rule set applied, checks completed, warnings detected, failures detected, blocked rule triggered, manual check requested, manual check completed, note added, revision requested, revalidation run, override applied, escalated, blocked, sent to Review Queue, sent to Approvals, completed, callback failed, and callback retried. 

## **32. Validation Actions** 

|**Primary Actions**|**Secondary Actions**|
|---|---|
|Run Validation|Open Source Module|
|Revalidate|View Rule Set|
|Request Revision|View Rule History|
|Send to Review Queue|View Approval Rule Match|
|Send to Approvals|Download Validation Evidence|
|Escalate||
|Apply Override||
|Complete Manual Check||
|Block Item||
|Export Validation Record||



## **33. Action Rules** 

|**Action**|**Required Behavior**|
|---|---|
|Run Validation|Status changes to In Validation; rule set version is locked; content snapshot<br>version is recorded; validation results are created; timeline is updated.|
|Revalidate|Required when content, source, approval rule, platform requirement, policy<br>rule, brand rule, expiry, or revision changes. New run is created and prior<br>results are retained.|
|Request Revision|Requires failed or warning rule reference, revision instruction, assigned owner,<br>and validator note. Status changes to Needs Revision.|
|Send to Review Queue|Allowed only when item is Passed, Warning, or Passed with Override; no<br>blocked rule exists; manual checks are completed; grounding is satisfed or<br>validly escalated; validation is not stale.|
|Send to Approvals|Allowed only when approval readiness is Ready for Approval, required<br>validation checks are complete, no blocked rule exists, approval rule match<br>exists, and validation is not stale.|
|Escalate|Requires escalation reason, severity, target reviewer/team, and validator note.<br>Item is locked from normal progression.|
|Apply Override|Requires permission, override-eligible rule, override reason, risk<br>acknowledgement, and validator note. Status changes to Passed with Override<br>only if all remaining checks are eligible.|
|Complete Manual Check|Requires manual check result, validator note, timestamp, and audit entry.|
|Block Item|Applies when non-overridable, critical policy, prohibited content, platform-<br>prohibited, Restricted Operations Mode, or unresolved regulated-claim<br>condition exists.|



## **34. Validation Eligibility Logic** 

|**Eligibility State**|**Meaning**|
|---|---|
|Proceed Eligible|Item can move to Review Queue or Approvals|
|Warning Proceed Eligible|Item can proceed with visible warning|



Confidential Engineering Wireframe - Final Build Specification 

ZoikoVertex | Accountability Layer | Validation Desk 

|**Eligibility State**|**Meaning**|
|---|---|
|Revision Required|Item must be corrected and revalidated|
|Manual Check Required|Human validation must be completed|
|Escalation Required|Elevated review required|
|Override Eligible|Authorized override can allow progression|
|Override Prohibited|Item cannot be overridden|
|Blocked|Item cannot proceed|
|Revalidation Required|Validation is stale due to content, rule, platform, approval, or source change|



|**Condition**|**Button Behavior**|
|---|---|
|Proceed Eligible|Enable Send to Review Queue / Send to Approvals|
|Warning Proceed Eligible|Enable progression with warning banner|
|Revision Required|Disable progression; enable Request Revision|
|Manual Check Required|Disable progression until manual check complete|
|Escalation Required|Disable progression; enable Escalate|
|Override Eligible|Show Apply Override to authorized users|
|Override Prohibited|Hide Override; show reason|
|Blocked|Disable progression actions|
|Revalidation Required|Enable Revalidate only|



## **35. Filters and Search** 

Required filters: item type, source module, campaign, platform/channel, validation status, severity, rule category, failed rule, assigned validator, submitted by, risk level, source-grounding status, platform-readiness status, approval-readiness status, override eligible only, override prohibited only, blocked only, revalidation needed only, manual check required only, due date, overdue only. 

Search must cover item title, campaign name, platform, submitted by, validator, content text, rule name, rule category, failed rule explanation, recommended fix, validator notes, source reference, source module, approval rule match, and validation status. 

## **36. Bulk Actions** 

Allowed safe bulk actions: assign validator, run validation, export validation records, request revision for same-rule failures, and send passed items to Review Queue. 

Do not allow bulk override; bulk block without confirmation; or bulk progression where any item is blocked, requires manual check, requires escalation, has stale validation, or has unsupported regulated claim. 

## **37. Empty States** 

|**State**|**Title**|**Body / Action**|
|---|---|---|
|No Validation Items|No items waiting for validation.|Items requiring brand, policy, compliance, source,<br>platform, claim-safety, tone, or approval-readiness<br>validation will appear here. Button: View<br>Completed Validations|
|No Failed Validations|No failed validations.|Items that fail required validation checks will<br>appear here with rule details and recommended<br>fxes.|
|No Blocked Items|No blocked items.|Items blocked by non-overridable governance rules<br>will appear here.|
|No Override Reviews|No override reviews pending.|Items eligible for authorized override review will<br>appear here.|
|No Manual Checks|No manual checks pending.|Items requiring human validation will appear here.|



Confidential Engineering Wireframe - Final Build Specification 

ZoikoVertex | Accountability Layer | Validation Desk 

## **38. Error and Locked States** 

|**State**|**Message**|
|---|---|
|Validation load failure|Validation Desk could not be loaded. Try again.|
|Permission denied|You do not have permission to validate this item.|
|Rule engine unavailable|Validation rules could not be loaded. Try again.|
|Source unavailable|Source material could not be retrieved.|
|Validation failed to run|Validation could not be completed. Try again.|
|Stale validation|This item changed after validation. Revalidate before proceeding.|
|Override unavailable|This item cannot be overridden.|
|Progression blocked|This item cannot proceed because a blocking rule failed.|
|Manual check required|Manual validation must be completed before progression.|
|Callback failed|Validation outcome was saved, but the source module could not be updated.<br>Retry callback.|



## **39. Notifications** 

Trigger notifications when item is assigned for validation, validation is run, validation passes, validation fails, item is blocked, revision is requested, manual check is required, manual check is completed, override is applied, escalation is triggered, revalidation is required, item is sent to Review Queue, item is sent to Approvals, or callback fails. Channels: in-app, email optional, Slack/Teams future, webhook future. 

## **40. Data Objects** 

|**Object**|**Required Fields**|
|---|---|
|Validation Item|id, tenant_id, source_module, source_entity_id, item_type, title, campaign_id,<br>platform, content_snapshot, content_snapshot_version, validation_status,<br>highest_severity, failed_rule_count, warning_count, blocked_rule_count,<br>manual_check_count, source_grounding_status, platform_readiness_status,<br>approval_readiness_status, assigned_validator, submitted_by, risk_level,<br>due_at, submitted_at, validated_at, completed_at, archived_at, created_at,<br>updated_at|
|Validation Run|id, validation_item_id, rule_set_id, rule_set_version, validation_engine_version,<br>content_snapshot_version, run_status, started_at, completed_at, run_by,<br>result_summary|
|Validation Rule Result|id, validation_run_id, rule_id, rule_name, rule_category, rule_version,<br>rule_set_version, result, severity, explanation, afected_text,<br>recommended_fx, override_eligible, manual_check_required, created_at|
|Source Grounding Result|id, validation_run_id, claim_text, source_reference, source_status,<br>source_confdence, grounding_status, issue_summary, created_at|
|Validation Override|id, validation_item_id, validation_rule_result_id, override_reason,<br>risk_acknowledgement, overridden_by, overridden_at|
|Manual Check|id, validation_item_id, validation_rule_result_id, assigned_validator,<br>manual_check_result, note, completed_by, completed_at, created_at|
|Validator Note|id, validation_item_id, note_body, visibility, created_by, created_at. Visibility:<br>Internal only|
|Validation Audit Log|id, tenant_id, validation_item_id, action, previous_value, new_value,<br>performed_by, performed_at|
|Validation Callback|id, validation_item_id, source_module, source_entity_id, callback_status,<br>callback_payload, last_attempt_at, retry_count, created_at, updated_at|



## **41. Backend Endpoints** 

- GET validation items 

Confidential Engineering Wireframe - Final Build Specification 

ZoikoVertex | Accountability Layer | Validation Desk 

- GET validation item detail 

- POST run validation 

- POST revalidate item 

- PATCH assign validator 

- POST request revision 

- POST send to review queue 

- POST send to approvals 

- POST escalate validation 

- POST apply validation override 

- POST block item 

- POST complete manual check 

- POST add validator note 

- GET validation run results 

- GET source grounding results 

- GET rule history 

- GET validation audit trail 

- POST export validation record 

- POST retry source callback 

## **42. Source Module Callback Behavior** 

|**Validation Outcome**|**Source Module Behavior**|
|---|---|
|Passed|Source item marked validation-passed|
|Warning|Source item marked validation-warning|
|Failed|Source item marked validation-failed and returned for correction|
|Needs Revision|Source item reopened with validation instructions|
|Manual Check Required|Source item locked pending human validation|
|Escalation Required|Source item locked pending elevated review|
|Passed with Override|Source item proceeds with override fag|
|Blocked|Source item locked from progression|
|Revalidation Needed|Source item marked stale until revalidated|
|Sent to Review Queue|Review Queue item created or updated|
|Sent to Approvals|Approval item created or updated|



Every callback must include validation_item_id, source_module, source_entity_id, validation_status, validation_score, failed_rule_summary, source_grounding_status, platform_readiness_status, approval_readiness_status, override_status, manual_check_status, validator, validated_at, audit_log_reference, and next_required_action. 

If callback fails: show callback failure state, create audit entry, allow retry by authorized user, do not delete validation results, and do not silently progress the source item. 

Confidential Engineering Wireframe - Final Build Specification 

ZoikoVertex | Accountability Layer | Validation Desk 

## **43. Frontend Components** 

- ValidationDeskPage 

- ValidationDeskHeader 

- ValidationMetricCards 

- ValidationAlertStrip 

- ValidationTabs 

- ValidationFilterDrawer 

- ValidationSearchBar 

- ValidationItemCard 

- ValidationWorkspace 

- ValidationContentPreview 

- ValidationCategoryTabs 

- ValidationSummaryPanel 

- RuleResultList 

- SourceGroundingPanel 

- PlatformReadinessPanel 

- ApprovalReadinessPanel 

- ManualChecksPanel 

- ValidationControlPanel 

- FailedRulesPanel 

- RequiredActionsPanel 

- OverridePanel 

- ValidatorNotesPanel 

- ValidationTimeline 

- ValidationActionBar 

- OverrideModal 

- ManualCheckModal 

- BlockItemModal 

- EmptyState 

- ErrorState 

- LockedState 

- CallbackFailedState 

Confidential Engineering Wireframe - Final Build Specification 

ZoikoVertex | Accountability Layer | Validation Desk 

## **44. Non-Negotiable Governance Rules** 

29. Blocked items cannot proceed. 

30. Non-overridable rules cannot be overridden. 

31. Critical legal, privacy, safety, and platform-prohibited failures must block or escalate. 

32. Unsupported regulated claims cannot proceed without approved source, correction, or escalation. 

33. Stale validation cannot be used for progression. 

34. Revalidation must preserve prior validation history. 

35. Overrides require authorized role, reason, risk acknowledgement, note, and audit entry. 

36. Bulk override is prohibited. 

37. Manual-check items cannot proceed until manual check is completed. 

38. Every validation run must record rule set version. 

39. Every validation run must record content snapshot version. 

40. Every validation action must create an audit entry. 

41. Source content snapshot must be preserved. 

42. Backend must enforce permissions. 

43. Source module must be updated when validation outcome changes. 

44. Completed validations remain searchable and exportable. 

45. Failed callbacks must be retryable and visible. 

46. Override must not erase failed rule history. 

47. Rule failures must remain visible after override as Overridden. 

## **45. MVP Scope** 

|**MVP Must Include**|**MVP Can Exclude**|
|---|---|
|Validation Desk page shell|Advanced automated rule authoring|
|Header, metric cards, alert strip, and tabs|Full simulation mode|
|Validation item list and workspace|AI-generated fx suggestions beyond basic recommended fx text|
|Item preview and validation summary|Cross-platform creative rendering|
|Rule result list and validation score|Slack/Teams notifcations|
|Brand, policy, compliance, source grounding, platform readiness, claim safety,<br>tone, approval readiness, manual checks|Predictive validation scoring|
|Run validation, revalidate, request revision, send to Review Queue, send to<br>Approvals, escalate, block, override, manual check|Multi-jurisdiction advanced compliance packs|
|Validator notes, timeline, flters, search, empty/error/locked/callback states,<br>backend permissions|Mobile optimization and full validation trend reporting|



## **46. Build Phases** 

|**Phase**|**Build**|
|---|---|
|Phase 1 - Validation Foundation|Page shell, header, metric cards, alert strip, tabs, validation item list, validation<br>workspace, flters, search, empty states, error states, locked states|
|Phase 2 - Rule Results and Validation Runs|Run validation, revalidate, validation summary, rule result list, validation<br>status, validation score, failed rules panel, validator notes, validation timeline|
|Phase 3 - Governance Categories|Brand rules, policy rules, compliance checks, source grounding, platform<br>readiness, claim safety, tone and sensitivity, approval readiness, manual<br>checks|
|Phase 4 - Workfow Actions|Request revision, send to Review Queue, send to Approvals, escalate, block<br>item, apply override, complete manual check, source module callbacks,<br>callback retry|
|Phase 5 - Enterprise Validation Controls|Advanced rule history, rule set comparison, validation export packages,<br>platform-specifc validation expansion, automated revalidation triggers,<br>validation trend reporting|



Confidential Engineering Wireframe - Final Build Specification 

ZoikoVertex | Accountability Layer | Validation Desk 

## **47. Acceptance Criteria** 

48. Users can view items requiring validation. 

49. Users can open a validation item and inspect full content context. 

50. Users can run validation and revalidation. 

51. Validation results show passed, warning, failed, blocked, manual-check, overridden, resolved, not-run, and not-applicable rules. 

52. Rule result details show explanation, affected text, recommended fix, severity, rule version, rule set version, and override eligibility. 

53. Brand, policy, compliance, source-grounding, platform-readiness, claim-safety, tone, approval-readiness, manual-check, rulehistory, and evidence tabs are visible. 

54. Source-grounding failures are clearly visible. 

55. Unsupported regulated claims cannot proceed without correction, source support, or escalation. 

56. Blocked items cannot proceed. 

57. Stale validations require revalidation before progression. 

58. Manual-check items cannot proceed until manual check is completed. 

59. Authorized users can apply permitted overrides with reason, note, risk acknowledgement, and audit entry. 

60. Non-overridable failures cannot be overridden. 

61. Users can request revision with rule reference and instruction. 

62. Users can send eligible items to Review Queue. 

63. Users can send approval-ready items to Approvals. 

64. Users can escalate serious validation issues. 

65. Users can block items where required. 

66. Source module receives validation outcome. 

67. Callback failure is visible and retryable. 

68. Backend enforces permissions. 

69. Empty, error, loading, locked, callback failed, and permission-denied states are handled. 

70. Completed validations remain searchable and exportable. 

71. The page contains no placeholder-only implementation after build. 

## **48. Phase-Based Acceptance Criteria** 

|**Phase**|**Acceptance**|
|---|---|
|Phase 1|Page loads successfully; tabs display correct validation groups; metric cards<br>refect validation data; alert strip shows critical validation conditions;<br>validation items open into detail view; flters and search work; empty, loading,<br>error, permission-denied, and locked states display correctly.|
|Phase 2|Users can run validation and revalidate changed or stale items; validation<br>results are stored; validation score is calculated; failed rules are visible; rule<br>results show severity, explanation, recommended fx, rule version, and rule set<br>version; validation timeline records every action.|
|Phase 3|Brand validation, policy validation, compliance checks, source grounding,<br>platform readiness, claim safety, tone and sensitivity, approval readiness, and<br>manual checks are visible and actionable.|
|Phase 4|Request revision, send to Review Queue, send to Approvals, escalate, block<br>item, override workfow, manual check completion, source module callbacks,<br>and callback retry all work.|
|Phase 5|Advanced rule history, rule set comparison, exportable validation packages,<br>automated revalidation triggers, and validation trend reporting are available.|



## **49. Final Engineering Instruction** 

Build Validation Desk as the rule-checking and readiness-validation center of the Accountability Layer. 

This page must allow the team to validate content, replies, campaign assets, agent actions, workflow outputs, and approval-bound items against brand, policy, compliance, source-grounding, platform, claim-safety, tone, manual-check, and approval-readiness rules before they proceed. 

The first production-ready version must include validation item list, validation workspace, item preview, validation category tabs, validation summary, rule result list, source grounding, platform readiness, approval readiness, manual checks, validation score, failed rules panel, required actions panel, override workflow, manual check workflow, request revision, send to Review Queue, send to 

Confidential Engineering Wireframe - Final Build Specification 

ZoikoVertex | Accountability Layer | Validation Desk 

Approvals, escalation, block item, validation timeline, filters, search, locked states, callback failed state, backend-enforced permissions, and source module callbacks. 

This page must be fast, rule-driven, explainable, defensible, and practical for real validation governance. 

Confidential Engineering Wireframe - Final Build Specification 

