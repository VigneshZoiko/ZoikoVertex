**ZOIKOVERTEX**

**Safety Layer --- Sequential Wireframe Build Specification**

**Document 04 --- Human Review, Escalation & Approval Console**

Absolute Final Version \| Engineering-Ready \| No Duplication from
Documents 01-03

  -----------------------------------------------------------------------
  **Sequence Position**               Safety Layer Document 04. Follows
                                      Document 03: Policy Control Matrix
                                      & Guardrail Enforcement Engine.
  ----------------------------------- -----------------------------------
  **Primary Purpose**                 Convert blocked, uncertain,
                                      escalated, and high-risk agent
                                      actions into clear human decisions
                                      with evidence, accountability,
                                      escalation routing, and
                                      regulator-ready logs.

  **Engineering Audience**            Frontend, backend, AI
                                      orchestration, governance,
                                      security, QA, product, and DevOps
                                      teams.

  **Non-Duplication Rule**            This document does not redefine
                                      platform overview, risk intake,
                                      classification, policies, controls,
                                      or guardrail execution. It consumes
                                      those outputs and gives reviewers a
                                      decision console.

  **Build Outcome**                   A tactile console where authorized
                                      humans approve, reject, amend,
                                      escalate, delegate, pause, or
                                      evidence-package AI-generated
                                      social actions.

  **Design Standard**                 Fortune 10 quality, Tier-0 grade,
                                      enterprise SaaS, governed
                                      autonomous AI, American English.
  -----------------------------------------------------------------------

# Locked Build Doctrine

The Human Review, Escalation & Approval Console is the decision layer of
the Safety Layer. It is not a generic inbox. It is the controlled
interface where human authority is applied to agentic social execution
after risk intake, classification, and guardrail evaluation have already
occurred.

> Every reviewer must see why the item reached them, what rule
> triggered, what evidence supports the recommendation, and what
> decision is legally and operationally available.
>
> Every decision must produce an immutable audit event with reviewer
> identity, role, timestamp, rationale, risk outcome, and downstream
> system effect.
>
> Every approval must be constrained by authorization, jurisdiction,
> client workspace, brand, campaign, risk class, policy state, and
> emergency mode.
>
> Every ambiguous item must have a safe next action. No item may sit in
> a dead state, hidden state, or unowned state.

# Critical Refinement Incorporated

  -----------------------------------------------------------------------
  **Issue Found in        **Refinement Adopted    **Engineering Impact**
  Earlier Draft Logic**   for Final Build**       
  ----------------------- ----------------------- -----------------------
  Too much conceptual     Converted into explicit Engineering can build
  governance language     screens, state          without interpreting
                          transitions, data       strategy prose
                          objects, APIs, event    
                          logs, and acceptance    
                          tests                   

  Approval workflows risk Document 04 only        No overlap with Policy
  duplicating Document 03 consumes                Control Matrix or
                          policy/guardrail        Guardrail Enforcement
                          outputs and renders     Engine
                          human decision actions  

  Potentially unclear     Added queues by role,   Prevents orphaned
  reviewer ownership      SLA, escalation path,   reviews and late
                          authority band, and     approvals
                          conflict rules          

  Risk of unsafe          Added decision locks,   Prevents unauthorized
  approvals               dual approval,          bypass of safety
                          restricted actions,     controls
                          legal hold, emergency   
                          pause, and reason-code  
                          enforcement             

  Evidence could be       Evidence is visible in  Reviewer can decide
  hidden behind modals    the primary decision    quickly without losing
                          canvas with drawer      context
                          expansion for           
                          provenance              

  Tactile engineering     Added wireframe zones,  Build team has
  need                    component behavior,     practical instructions
                          event payloads, errors, 
                          empty states, and QA    
                          tests                   
  -----------------------------------------------------------------------

# 1. Page Mission and Scope

Mission: provide a single governed console for humans to review,
approve, reject, amend, escalate, or pause AI-generated social actions
before execution where the Safety Layer requires human authority.

  -----------------------------------------------------------------------
  **In Scope**                        **Out of Scope**
  ----------------------------------- -----------------------------------
  Review queue, decision canvas,      Policy creation, risk model design,
  evidence drawer, escalation rail,   scoring methodology, guardrail rule
  approval actions, SLA indicators,   configuration, content studio
  reviewer workload, emergency        authoring, publishing connectors
  handling, decision audit            

  Decision outcomes for content       Generic task management, CRM case
  posts, replies, comments, campaign  management, employee performance
  changes, agent actions, sensitive   management, legal document
  claims, paid-social changes, crisis management
  responses, and brand-risk           
  interventions                       

  Human intervention for blocked,     Low-risk autonomous execution that
  uncertain, escalated, high-risk,    has already cleared Safety Layer
  dual-control, client-required,      requirements
  jurisdiction-required, or           
  emergency-mode actions              
  -----------------------------------------------------------------------

# 2. User Roles and Permission Model

  ---------------------------------------------------------------------------------
  **Role**          **Primary Permission**      **Blocked From**  **Required
                                                                  Console View**
  ----------------- --------------------------- ----------------- -----------------
  Reviewer          Approve, reject, request    Changing policy   My Queue +
                    changes, add rationale      rules, overriding Decision Canvas
                    within assigned authority   legal blocks,     
                    band                        assigning self to 
                                                conflicted items  

  Senior Approver   Approve elevated risk,      Overriding legal  Escalations + SLA
                    dual-control items,         hold without      Breach Risk
                    campaign-level decisions,   Legal role        
                    brand-sensitive actions                       

  Legal /           Review regulated claims,    Changing creative Legal Evidence
  Compliance        dispute-risk content,       content unless    View
  Reviewer          legal-hold items,           acting through    
                    jurisdictional sensitivity  amendment         
                                                workflow          

  Brand Governance  Approve brand voice, tone,  Overriding        Brand Risk View
  Lead              cultural sensitivity,       statutory or      
                    campaign alignment          platform-policy   
                                                blocks            

  Crisis Commander  Enter restricted            Approving outside Emergency Command
                    operations, pause           crisis scope      View
                    category/workspace/agent,   unless separately 
                    approve crisis responses    authorized        

  Client Admin /    Configure approval          Accessing other   Workspace
  Tenant Owner      thresholds allowed by plan  tenant workspaces Governance View
                    and contract                or system-wide    
                                                safety controls   

  Auditor           Read-only access to         Any decision      Evidence Vault
                    decision history, evidence, action            Read View
                    and export packages                           
  ---------------------------------------------------------------------------------

# 3. Information Architecture

  -----------------------------------------------------------------------
  **Navigation Item**     **Purpose**             **Must Display**
  ----------------------- ----------------------- -----------------------
  Review Queue            Primary inbox for       Risk tier, SLA, owner,
                          actionable items        workspace, brand,
                                                  agent, policy trigger,
                                                  recommended action

  Escalations             Items requiring higher  Escalation reason,
                          authority or dual       current owner, next
                          control                 owner, breach timer

  Decision History        Completed decisions and Decision, reviewer,
                          rationale               timestamp, evidence
                                                  hash, downstream result

  Emergency Mode          Restricted operations   Active restrictions,
                          and urgent approvals    paused agents, crisis
                                                  policies, commander
                                                  status

  Evidence Packages       Exportable records for  Decision bundle,
                          internal audit, legal,  provenance, policy
                          client, or regulator    snapshot, logs, content
                                                  versions

  Reviewer Workload       Operational health of   Queue volume, SLA risk,
                          review function         overloaded roles, stale
                                                  items
  -----------------------------------------------------------------------

# 4. Primary Wireframe --- Desktop Layout

  -----------------------------------------------------------------------
  **Zone**                **Component**           **Behavior / Build
                                                  Instruction**
  ----------------------- ----------------------- -----------------------
  A                       Global Safety Header    Shows workspace
                                                  selector, Safety Layer
                                                  breadcrumb, emergency
                                                  mode status, current
                                                  reviewer role,
                                                  notification bell, and
                                                  audit-safe search.

  B                       Queue Filter Rail       Persistent left rail.
                                                  Filters by risk tier,
                                                  SLA, item type, brand,
                                                  campaign, agent,
                                                  jurisdiction, policy
                                                  trigger, and owner.

  C                       Review Queue Table      Center-left. Row
                                                  density optimized for
                                                  enterprise operations.
                                                  Selecting a row loads
                                                  Decision Canvas without
                                                  page refresh.

  D                       Decision Canvas         Primary work area.
                                                  Displays content/action
                                                  preview, risk summary,
                                                  policy triggers, AI
                                                  recommendation,
                                                  available actions, and
                                                  required rationale.

  E                       Evidence Drawer         Right drawer. Open by
                                                  default for high-risk
                                                  items. Shows
                                                  provenance, prompt
                                                  lineage, source data,
                                                  policy snapshot, model
                                                  confidence, edits, and
                                                  previous decisions.

  F                       Escalation Rail         Collapsible. Shows
                                                  authority path, next
                                                  approver, SLA
                                                  countdown, conflict
                                                  warnings, and
                                                  escalation notes.

  G                       Decision Action Bar     Sticky bottom bar.
                                                  Shows Approve, Reject,
                                                  Request Changes,
                                                  Escalate, Delegate,
                                                  Pause Agent, Create
                                                  Evidence Package.
                                                  Disabled actions must
                                                  explain why.
  -----------------------------------------------------------------------

# 5. Queue Table Specification

  --------------------------------------------------------------------------------
  **Column**              **Data Source**                  **Rules**
  ----------------------- -------------------------------- -----------------------
  Priority                risk_intake.priority +           Display Critical, High,
                          policy_control.severity          Medium, Low. Critical
                                                           rows pin to top unless
                                                           filtered out by
                                                           authorized user.

  SLA                     approval_task.due_at             Countdown. Red at
                                                           breached, amber inside
                                                           warning threshold, gray
                                                           for no SLA.

  Item Type               agent_action.type                Post, Reply, Comment,
                                                           Campaign Change, Paid
                                                           Change, Bio/Profile
                                                           Update, Crisis
                                                           Response, Agent
                                                           Instruction.

  Workspace / Brand       tenant_id + brand_id             Never show cross-tenant
                                                           data. Brand name must
                                                           include logo chip if
                                                           available.

  Trigger                 policy_control.trigger_summary   Concise human-readable
                                                           reason: regulated
                                                           claim, sentiment spike,
                                                           protected class, brand
                                                           conflict, crisis
                                                           keyword, platform risk.

  Agent                   agent_id + agent_role            Show agent name, role,
                                                           autonomy band, and
                                                           current status.

  Owner                   approval_task.assignee_id        Unassigned items must
                                                           show Assign button
                                                           based on RBAC.

  Decision State          approval_task.state              Pending, In Review,
                                                           Changes Requested,
                                                           Escalated, Approved,
                                                           Rejected, Paused,
                                                           Expired, Completed.
  --------------------------------------------------------------------------------

# 6. Decision Canvas Requirements

  -----------------------------------------------------------------------
  **Canvas Block**        **Required Content**    **Interaction Rule**
  ----------------------- ----------------------- -----------------------
  Content / Action        Final proposed post,    Reviewer can expand,
  Preview                 reply, comment, or      compare versions, and
                          agent action. Include   request amendment.
                          image/video thumbnails, Direct editing is
                          destination channel,    disabled unless role
                          scheduled time, and     grants amend
                          audience segment.       permission.

  Risk Summary            Risk tier, confidence   Risk explanation must
                          score, risk factors,    be readable in one
                          affected jurisdictions, screen without opening
                          brand sensitivity,      model internals.
                          policy match, potential 
                          harm category.          

  AI Recommendation       Recommended action:     Recommendation cannot
                          approve, reject, amend, auto-click or preselect
                          escalate, pause, or     final approval.
                          route to legal.         

  Policy Trigger Stack    List of triggered       Each trigger opens
                          controls inherited from policy snapshot, not
                          Document 03.            editable from this
                                                  page.

  Available Decisions     Role-based decision     Buttons disabled by
                          buttons.                RBAC or policy must
                                                  show reason and
                                                  required authority.

  Rationale Field         Required text or        Approval of
                          structured reason code  High/Critical items
                          depending on decision.  requires rationale
                                                  before submission.

  Downstream Impact       Shows what will happen  Must update dynamically
                          after decision:         before confirmation.
                          publish, schedule, send 
                          to edit, keep blocked,  
                          escalate, pause agent,  
                          notify stakeholders.    
  -----------------------------------------------------------------------

# 7. Evidence Drawer Requirements

  -----------------------------------------------------------------------------------
  **Evidence Section**    **Must Include**                    **Security Rule**
  ----------------------- ----------------------------------- -----------------------
  Provenance              Original prompt, agent instruction, Mask secrets, tokens,
                          source brief, retrieved knowledge,  PII, credentials,
                          uploaded assets, content version    private user data
                          chain                               

  Model and Agent Lineage Model/provider, model version,      Do not expose hidden
                          prompt template, agent role, agent  system secrets; expose
                          autonomy band, tool calls,          governance-relevant
                          confidence                          metadata

  Policy Snapshot         Triggered policies, policy version, Snapshot must be
                          jurisdiction, severity, control     immutable after
                          result, exception rules             decision

  Risk Classification     Outputs from Document 02: category, No recalculation in the
                          severity, likelihood, confidence,   evidence drawer
                          uncertainty flags                   

  Guardrail Outcome       Outputs from Document 03:           No policy editing from
                          allow/block/review/escalate/pause   drawer
                          recommendation                      

  Prior Decisions         Comparable prior approvals,         Respect tenant and role
                          rejections, escalations, reviewer   access boundaries
                          notes                               

  Export Status           Evidence package availability,      Exports must be
                          hash, export log, recipient         permissioned and logged
                          permissions                         
  -----------------------------------------------------------------------------------

# 8. Decision Actions and State Transitions

  ------------------------------------------------------------------------------------
  **Action**        **Allowed From    **Resulting       **Mandatory System Events**
                    State**           State**           
  ----------------- ----------------- ----------------- ------------------------------
  Approve           Pending, In       Approved or       approval.approved,
                    Review, Escalated Awaiting Second   audit.logged,
                                      Approval          downstream.release_requested

  Reject            Pending, In       Rejected          approval.rejected,
                    Review, Escalated                   audit.logged,
                                                        downstream.block_confirmed

  Request Changes   Pending, In       Changes Requested approval.changes_requested,
                    Review                              assignee.notified,
                                                        version.locked

  Escalate          Pending, In       Escalated         approval.escalated,
                    Review                              next_role.assigned,
                                                        sla.recalculated

  Delegate          Pending, In       Pending or In     approval.delegated,
                    Review            Review            owner.changed, audit.logged

  Pause Agent       Critical,         Paused            agent.paused, emergency.log,
                    Emergency,                          notifications.sent
                    repeated risk                       
                    breach                              

  Create Evidence   Any visible item  No state change   evidence.package_created,
  Package                                               export.audit_logged

  Expire            Pending after     Expired           approval.expired,
                    deadline rule                       downstream.blocked,
                                                        owner.notified
  ------------------------------------------------------------------------------------

# 9. Dual-Control and Three-Key Approval Logic

The console must support multi-person approval without turning every
review into bureaucracy. Dual-control is triggered only when risk,
client policy, jurisdiction, paid spend, crisis mode, or regulated-claim
rules require it.

  -----------------------------------------------------------------------
  **Trigger**             **Approval              **UI Behavior**
                          Requirement**           
  ----------------------- ----------------------- -----------------------
  Critical Risk           Senior Approver +       Approve button becomes
                          Legal/Compliance        Submit First Approval
                                                  until second key is
                                                  complete

  Regulated Claim         Legal/Compliance        Brand reviewer can
                          required                recommend but cannot
                                                  final approve

  Crisis Response         Crisis Commander +      Emergency ribbon
                          authorized              remains visible and all
                          communications lead     actions are logged as
                                                  crisis events

  Paid Campaign Change    Marketing owner +       Shows spend delta and
  Above Threshold         finance/commercial      budget impact in
                          approval where          Decision Canvas
                          configured              

  Client Contract         Client Admin or         Shows client approval
  Requires Approval       designated client       badge and external
                          approver                approval status

  Conflict of Interest    Different reviewer      Self-approval disabled
                          required                with conflict
                                                  explanation
  -----------------------------------------------------------------------

# 10. API and Data Contract

  ------------------------------------------------------------------------------------------------
  **Endpoint / Event**                    **Method**        **Purpose**       **Required Fields**
  --------------------------------------- ----------------- ----------------- --------------------
  /safety/reviews                         GET               Fetch review      tenant_id, filters,
                                                            queue             pagination,
                                                                              reviewer_role

  /safety/reviews/{id}                    GET               Fetch full        review_id,
                                                            decision item     evidence_summary,
                                                                              decision_options,
                                                                              state

  /safety/reviews/{id}/decision           POST              Submit approval   decision,
                                                            decision          reason_code,
                                                                              rationale, actor_id,
                                                                              role_id,
                                                                              evidence_hash

  /safety/reviews/{id}/escalate           POST              Escalate item     target_role,
                                                                              escalation_reason,
                                                                              notes, actor_id

  /safety/reviews/{id}/delegate           POST              Delegate item     assignee_id,
                                                                              delegation_reason,
                                                                              actor_id

  /safety/reviews/{id}/evidence-package   POST              Create evidence   scope,
                                                            package           export_reason,
                                                                              recipients, actor_id

  approval.decision_submitted             Event             Broadcast         review_id, decision,
                                                            decision to       state, actor,
                                                            orchestration     timestamp,
                                                            layer             downstream_action

  approval.sla_breached                   Event             Trigger           review_id, owner,
                                                            operational alert breached_at,
                                                                              severity

  agent.pause_requested                   Event             Request agent     agent_id, scope,
                                                            pause             reason, actor,
                                                                              emergency_mode
  ------------------------------------------------------------------------------------------------

# 11. Validation, Error, Empty, and Loading States

  -----------------------------------------------------------------------
  **State**               **Required Copy /       **Engineering Rule**
                          Behavior**              
  ----------------------- ----------------------- -----------------------
  No Items                No reviews match this   Do not imply Safety
                          filter. Clear filters   Layer is inactive.
                          or switch queue scope.  

  Unauthorized Action     You do not have         Never hide unauthorized
                          authority to complete   controls without
                          this decision. Required explaining where
                          role: \[role\].         appropriate.

  Missing Rationale       A rationale is required Block submit until
                          for this decision.      completed.

  Stale Item              This review changed     Optimistic locking
                          while you were viewing  required using
                          it. Refresh the latest  version_id.
                          decision state.         

  Policy Snapshot         Policy snapshot could   Fail closed.
  Unavailable             not be loaded. Decision 
                          is locked until         
                          evidence is available.  

  Evidence Export Failed  Evidence package was    Do not partially
                          not created. No         complete export.
                          decision record was     
                          changed.                

  SLA Breached            This review breached    Apply escalation lock
                          SLA. Escalation is      if configured.
                          required before         
                          release.                

  Emergency Mode Active   Restricted operations   Override normal
                          are active. Only        low-risk release rules.
                          crisis-authorized       
                          actions are available.  
  -----------------------------------------------------------------------

# 12. Mobile and Tablet Adaptation

  -----------------------------------------------------------------------
  **Breakpoint**          **Layout**              **Rules**
  ----------------------- ----------------------- -----------------------
  Desktop 1440+           Three-panel console:    Default operations
                          queue, decision canvas, view.
                          evidence drawer         

  Laptop 1024-1439        Queue collapses into    Decision action bar
                          left drawer; evidence   remains sticky.
                          drawer tabbed           

  Tablet 768-1023         Queue list then detail  No loss of decision
                          view; evidence as       context.
                          separate tab            

  Mobile \<768            Emergency triage only   High-risk full
                          unless explicitly       approvals should
                          enabled                 require tablet/desktop
                                                  where configured.
  -----------------------------------------------------------------------

# 13. Security, Audit, and Compliance Requirements

> RBAC, ABAC, tenant isolation, workspace scope, brand scope, campaign
> scope, and emergency authority must be evaluated server-side for every
> decision action.
>
> All decision events must write to immutable audit storage with actor
> identity, role, IP/device metadata where permitted, timestamp, review
> item version, evidence hash, and downstream result.
>
> Approvals must be idempotent. Repeated submit attempts must not create
> duplicate downstream publish events.
>
> Every export must record export requester, export scope, recipient,
> reason, timestamp, file hash, and retention class.
>
> No decision may proceed if the evidence snapshot, policy snapshot, or
> item version is missing, stale, or inconsistent.
>
> All sensitive information must be masked by default and revealed only
> through explicit permissioned action.

# 14. Analytics and Operational Metrics

  -----------------------------------------------------------------------
  **Metric**              **Definition**          **Purpose**
  ----------------------- ----------------------- -----------------------
  Review Volume           Number of items         Capacity planning
                          entering human review   
                          by period               

  Approval SLA Compliance Percent completed       Operational reliability
                          before due time         

  Escalation Rate         Percent requiring       Policy tuning and risk
                          higher authority        trend analysis

  Rejection Rate          Percent rejected by     Agent quality
                          reviewer and reason     improvement
                          code                    

  Amendment Rate          Percent sent back for   Brand and prompt
                          changes                 quality improvement

  False Positive Review   Items reviewed but      Guardrail tuning
  Rate                    later confirmed low     
                          risk                    

  Critical Decision Time  Median time to decision Crisis readiness
                          for Critical items      

  Reviewer Load           Open assigned items per Workload balancing
                          reviewer/role           
  -----------------------------------------------------------------------

# 15. QA Acceptance Criteria

  -----------------------------------------------------------------------
  **Test Category**       **Acceptance Test**     **Pass Standard**
  ----------------------- ----------------------- -----------------------
  RBAC                    Reviewer without Legal  Action blocked with
                          role attempts           clear required-role
                          regulated-claim final   explanation
                          approval                

  State Locking           Two reviewers open same Second reviewer sees
                          item; one decides first stale-state lock and
                                                  cannot duplicate
                                                  decision

  Evidence Dependency     Evidence snapshot fails All decision actions
                          to load                 disabled except
                                                  refresh/escalate to
                                                  support

  SLA                     Item breaches SLA while Row updates,
                          in queue                notification fires,
                                                  escalation rule applies

  Emergency Mode          Emergency mode          Non-crisis actions
                          activated               disabled according to
                                                  configured restrictions

  Dual Control            Critical item approved  State becomes Awaiting
                          by first approver       Second Approval, not
                                                  Approved

  Audit                   Every decision action   Audit event contains
                          is submitted            actor, role, decision,
                                                  rationale, timestamp,
                                                  evidence hash, and
                                                  downstream result

  Tenant Isolation        Reviewer searches       Only authorized
                          global content          tenant/workspace items
                                                  are returned

  Export                  Auditor creates         Package created, hash
                          evidence package        recorded, export log
                                                  written

  Accessibility           Keyboard-only reviewer  All essential actions
                          completes a decision    reachable with visible
                                                  focus and labels
  -----------------------------------------------------------------------

# 16. Engineering Handoff Checklist

  -----------------------------------------------------------------------
  **Workstream**          **Required              **Definition of Done**
                          Deliverable**           
  ----------------------- ----------------------- -----------------------
  Frontend                Responsive review       Matches wireframe zones
                          queue, decision canvas, and passes
                          evidence drawer, action accessibility checks
                          bar, empty/error states 

  Backend                 Review service,         APIs enforce
                          decision service,       server-side
                          escalation service,     authorization and state
                          evidence export service rules

  AI Orchestration        Consumes decision       No autonomous bypass of
                          outcomes and releases,  approval outcome
                          blocks, revises,        
                          escalates, or pauses    
                          agent actions           

  Security                RBAC/ABAC, tenant       Pen-test critical flows
                          isolation, audit        and fail-closed
                          logging, masking,       behavior
                          export permissions      

  Data                    Review item schema,     Migration tested and
                          decision events,        indexed for queue
                          evidence hashes,        performance
                          retention class         

  QA                      Functional, regression, All acceptance criteria
                          accessibility,          pass before release
                          concurrency, SLA, and   
                          security tests          

  DevOps                  Observability,          Operational dashboards
                          alerting, queue health, live before production
                          SLA breach alerts       
  -----------------------------------------------------------------------

# 17. Final Build Instruction

Build Document 04 as the human authority console for the Safety Layer.
It must be tactile, fast, safe, and evidence-rich. The engineering team
must not use this page to configure policies or redesign risk
classification. It must consume the outputs of Documents 01-03, present
the reviewer with the minimum complete decision record, enforce
authority server-side, and produce immutable audit evidence for every
decision.

# Appendix A --- Canonical Review Item Object

review_item {\
id, tenant_id, workspace_id, brand_id, campaign_id,\
item_type, agent_id, agent_role, content_preview,\
risk_tier, risk_score, confidence, uncertainty_flags\[\],\
policy_triggers\[\], guardrail_outcome, recommended_decision,\
state, assignee_id, due_at, escalation_path\[\],\
evidence_hash, policy_snapshot_id, risk_classification_id,\
allowed_actions\[\], disabled_actions\[\], version_id,\
created_at, updated_at\
}
