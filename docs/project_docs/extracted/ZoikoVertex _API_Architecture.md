ZOIKOVERTEX
API Architecture & Endpoint Specification
1. Purpose
This document defines the complete API architecture for ZoikoVertex as a governed, decision-driven, ROI-accountable Digital Marketing Operating System. It is the engineering specification for how users, agents, internal services, and external platforms interact with the system.
This document covers:
API style and boundary rules
command, intent, query, control, audit, and integration APIs
request and response contract patterns
sync versus async execution rules
governance enforcement at the API layer
economic validation and spend protection
authentication, authorization, tenancy, and security
versioning, idempotency, pagination, filtering, and error contracts
retries, timeouts, circuit breaking, degraded modes, and observability
provider-specific integration patterns
developer experience requirements
This is not a surface-level endpoint list. It is the operational contract for how ZoikoVertex exposes controlled capability without allowing API chaos, state corruption, governance bypass, or financial risk leakage.

2. Core API Principle
ZoikoVertex does not expose raw CRUD as its primary operating model.
Its core principle is:
Intent → Decision → Governance → Economic Validation → Execution → Event → Projection
In other words:
clients and agents submit intents, not arbitrary state mutations
the system decides whether and how an action should proceed
governed and economically valid execution happens only after policy and control checks
results are surfaced through projections and query APIs
The API layer therefore exists to expose:
controlled business intent
read models and operational visibility
external system normalization
enterprise-grade control surfaces
It must not expose direct “change anything” endpoints that bypass decisioning and governance.

3. API Topology
ZoikoVertex requires six API layers.
3.1 Intent APIs
Used to express requested business outcomes such as:
optimize campaign
reallocate budget
launch governed content
run simulation
request approval
These are the primary write interfaces.
3.2 Query APIs
Used to read projections, summaries, histories, and explainability outputs.
These must read from read models and presentation APIs rather than forcing the UI to query raw transactional state.
3.3 Control APIs
Used to enforce executive and operational controls such as:
kill switch
budget freeze
autonomy mode change
spend cap updates
emergency pause
3.4 Integration APIs
Used to connect, sync, normalize, and operate external systems such as Meta, Google, LinkedIn, TikTok, Shopify, Stripe, Salesforce, and HubSpot.
3.5 Webhook / Ingestion APIs
Used to receive external callbacks and platform notifications.
3.6 Audit / Compliance / Explainability APIs
Used by enterprise operators, finance, legal, and compliance stakeholders to inspect decisions, approvals, execution history, and evidence bundles.

4. API Style Rules
ZoikoVertex may use REST over HTTPS for its primary external interfaces.
Internal services may use:
REST for clarity and debuggability
gRPC where performance or strongly typed internal communication requires it
event-driven workflows where async propagation is more appropriate than request-response coupling
The public-facing contract should remain consistent and understandable.
4.1 Resource design rules
Paths must be noun-based and stable. Intent endpoints may use verb-oriented nouns only where business intent is central.
Acceptable:
/v1/intents/execute
/v1/query/decisions
/v1/control/kill-switch
Unacceptable:
/v1/doThingNow
/v1/updateEverything
4.2 JSON contract rules
All public APIs should use JSON payloads unless file upload or export requires another format.
4.3 Time and identifiers
all timestamps must be ISO 8601 UTC
canonical identifiers should be UUIDs
customer-facing external refs may be included separately
4.4 Backward compatibility
Within a version, non-breaking additive evolution is preferred. Breaking changes require a new major version.

5. Architectural Request Flow
The canonical synchronous request flow for governed action is:
Client or Agent → API Gateway → Authentication → Authorization → Intent Validation → Decision Engine → Governance Engine → Economic Validation → Orchestration → Accepted Response
The canonical asynchronous continuation is:
Orchestration → Event Publication → Execution Services → Integration Adapters → External Platforms → Event Publication → Projections / Query APIs
This means most action-triggering APIs are acceptance APIs, not “action fully completed in one HTTP response” APIs.

6. Sync vs Async Contract
This distinction is essential.
6.1 Synchronous responsibilities
The synchronous API layer may:
authenticate and authorize
validate payload shape and business preconditions
create trace and correlation identifiers
create the intent / command record
trigger decisioning and immediate governance prechecks where latency budgets allow
return accepted, blocked, or requires-approval responses
6.2 Asynchronous responsibilities
The asynchronous system handles:
plan creation
execution graph scheduling
platform-side publishing and ad actions
attribution updates
ROI refresh
downstream projections
6.3 API response truthfulness rule
If the full action is not complete at response time, the API must not imply completion. It must clearly return an accepted or in-progress state with tracking identifiers.

7. Canonical Request Envelope
All write-path APIs should support a consistent request envelope.
{
  "org_id": "uuid",
  "workspace_id": "uuid",
  "request_id": "uuid",
  "idempotency_key": "uuid",
  "mode": "simulate | recommend | execute",
  "trace_context": {
    "trace_id": "uuid",
    "correlation_id": "uuid"
  },
  "payload": {}
}

7.1 Field rules
org_id is mandatory for all tenant-scoped requests
workspace_id is mandatory where the operation is workspace-bound
request_id is caller-generated or gateway-generated for supportability
idempotency_key is mandatory for all write / action-triggering APIs
mode governs whether the system simulates, recommends, or attempts governed execution

8. Canonical Response Envelope
All APIs should return a structured response envelope.
{
  "status": "accepted | completed | blocked | requires_approval | rejected | degraded",
  "trace_id": "uuid",
  "correlation_id": "uuid",
  "request_id": "uuid",
  "data": {},
  "errors": [],
  "warnings": [],
  "meta": {
    "version": "v1",
    "processing_mode": "sync | async",
    "projection_freshness": null
  }
}

8.1 Status meaning
accepted means request accepted for downstream orchestration
completed means action resolved fully within synchronous path
blocked means governance, economics, or policy prevented continuation
requires_approval means human-in-command intervention is required
rejected means request invalid or unauthorized
degraded means partial service or fallback mode was used

9. Error Contract
Errors must be structured and machine-usable.
{
  "status": "blocked",
  "trace_id": "uuid",
  "errors": [
    {
      "error_code": "GOVERNANCE_BLOCKED",
      "message": "Action requires approval before execution.",
      "field": null,
      "retryable": false,
      "details": {
        "approval_level": "manager"
      }
    }
  ]
}

9.1 Required error fields
error_code
message
retryable
details
9.2 Error code families
AUTH_*
TENANCY_*
VALIDATION_*
GOVERNANCE_*
ECONOMIC_*
INTEGRATION_*
RATE_LIMIT_*
SYSTEM_*
9.3 Error truthfulness
Error responses must not hide governance, policy, or financial blocking behind generic messages.

10. Authentication and Authorization
10.1 Authentication
Supported methods:
OAuth 2.0 for user-facing and enterprise integrations
JWT bearer tokens for session-bound client access
API keys for controlled machine-to-machine integration where appropriate
signed webhook verification for inbound platform callbacks
10.2 Authorization
Authorization must be both role-based and policy-aware.
Examples of roles:
Org Admin
Workspace Manager
Analyst
Finance Viewer
Compliance Reviewer
Read-Only Executive
Integration Operator
10.3 Authorization rules
Authorization is not enough by itself. A user may be authorized to submit an intent but still be blocked by governance or economics.
10.4 Break-glass access
Break-glass controls must be separately audited and never share standard auth flows.

11. Multi-Tenancy Enforcement
Every tenant-scoped API must enforce:
authenticated principal belongs to org or is explicitly cross-tenant authorized
org_id in request matches token or allowed context
cross-workspace access is policy-controlled
read models never leak cross-tenant state
11.1 Enforcement points
gateway
service auth layer
repository / query layer
integration boundary
export layer
11.2 Response rule
No response may include another tenant’s identifiers or aggregates, even under error paths.

12. Intent API — Primary Write Surface
This is the most important API family.
12.1 Core endpoint
POST /v1/intents/execute
Purpose: submit governed business intent.
12.2 Supported modes
simulate
recommend
execute
12.3 Example request
{
  "org_id": "org-123",
  "workspace_id": "ws-456",
  "request_id": "req-111",
  "idempotency_key": "idem-111",
  "mode": "execute",
  "payload": {
    "intent": "optimize_campaign",
    "objective": "maximize_roi",
    "time_horizon": "7d",
    "confidence_required": 0.85,
    "constraints": {
      "budget_limit": 1000,
      "channels_allowed": ["meta", "google"],
      "risk_level": "medium"
    },
    "context": {
      "campaign_id": "camp-001"
    }
  }
}

12.4 Validation rules
Required:
intent
objective
mode
org_id
idempotency_key
Optional but strongly encouraged:
time_horizon
constraints
context
12.5 Sync response variants
Simulate
Returns modeled outcomes, no execution path.
Recommend
Returns recommended actions and decision artifacts, no governed execution event yet.
Execute
Returns accepted, blocked, or requires-approval, with downstream tracking IDs.
12.6 Example execute response
{
  "status": "accepted",
  "trace_id": "trace-123",
  "correlation_id": "corr-123",
  "request_id": "req-111",
  "data": {
    "decision_id": "dec-200",
    "plan_id": "plan-300",
    "workflow_instance_id": "wf-400",
    "governance_status": "pending_validation"
  },
  "errors": [],
  "warnings": [],
  "meta": {
    "version": "v1",
    "processing_mode": "async"
  }
}


13. Intent Types
At minimum the Intent API must support:
optimize_campaign
allocate_budget
pause_campaign
scale_campaign
publish_content
launch_variant_test
simulate_roi
refresh_strategy
request_approval
replay_decision
Each intent type must map to a schema and validation profile.

14. Decision-Coupled API Model
The API layer must not simply forward payloads downstream. It must interface with decisioning properly.
14.1 Required decision-coupled outputs
For relevant action APIs, the response or downstream record must expose:
decision_id
decision class
confidence score
expected cost
expected revenue
governance status
14.2 Recommendation vs execution distinction
The API contract must clearly distinguish:
recommendation only
simulation only
execution requested
execution authorized
execution performed
Without this, the product becomes misleading and dangerous.

15. Planning Engine Interface
The earlier version introduced planning conceptually. It now needs API-level definition.
15.1 Plan generation endpoint
POST /v1/intents/plan
Purpose: convert an objective into a multi-step governed plan without immediate execution.
15.2 Example response
{
  "status": "completed",
  "trace_id": "trace-222",
  "data": {
    "plan_id": "plan-222",
    "steps": [
      {
        "sequence": 1,
        "action": "increase_google_budget",
        "expected_roi": 2.1,
        "requires_approval": false
      },
      {
        "sequence": 2,
        "action": "reduce_meta_spend",
        "expected_roi": 1.6,
        "requires_approval": false
      },
      {
        "sequence": 3,
        "action": "test_tiktok_variant",
        "expected_roi": 1.2,
        "requires_approval": true
      }
    ]
  }
}

15.3 Planning rules
plans are not execution receipts
plans must be traceable
plans may be partially executable
plans must surface approval dependencies
plans must support ranking and alternative plans where relevant

16. Execution Graph Interface
Single actions are insufficient for a serious system. ZoikoVertex must support graph-shaped execution.
16.1 Endpoint
GET /v1/query/execution-graphs/{workflow_instance_id}
16.2 Response purpose
Provides:
node list
dependency order
node status
blocked nodes
reversible nodes
rollback status
16.3 Node contract
Each execution node should have:
node_id
action_type
upstream_dependencies
governance_status
economic_status
execution_status
rollback_capable
result_ref

17. Query API — Read Surface
Query APIs must read from projections, presentation models, or optimized read stores.
They must not create hidden dependency on raw OLTP for dashboard-scale reads.
17.1 Core query endpoints
GET /v1/query/campaigns/{id}/performance
GET /v1/query/roi/{campaign_id}
GET /v1/query/approvals
GET /v1/query/decisions
GET /v1/query/platform-intelligence
GET /v1/query/governance-alerts
GET /v1/query/executive-dashboard
17.2 Query contract rules
support pagination where list size is unbounded
support filtering and sorting
return projection freshness metadata where relevant
return stale-state indicators if projection lag breaches threshold
17.3 Pagination contract
Cursor-based pagination preferred for large operational lists.
{
  "data": [],
  "meta": {
    "next_cursor": "cursor-123",
    "page_size": 50
  }
}


18. ROI and Economic APIs
This is a product differentiator and needs explicit API treatment.
18.1 Predictive ROI
GET /v1/roi/predict
Purpose: estimate likely ROI under a scenario.
18.2 Actual ROI
GET /v1/roi/actual
Purpose: return observed ROI using methodology version and attribution context.
18.3 Variance
GET /v1/roi/variance/{decision_id}
Purpose: compare expected versus actual.
18.4 Required output fields
methodology_version
confidence_band
roi_value
roas_value
expected_vs_actual_delta
unattributed_component
snapshot_at
18.5 Economic enforcement at API layer
Before execute-path intent acceptance, the system must support:
spend cap validation
budget availability check
ROI threshold comparison
anomaly detection precheck
protected-campaign or protected-budget checks

19. Governance Enforcement at API Layer
This must be explicit.
19.1 Hard rule
No API may directly invoke an execution-side external action without governance clearance.
19.2 Required checks for governed action APIs
permission validation
decision classification
policy validation
approval requirement check
economic validation
idempotency validation
19.3 Middleware vs service logic
Gateway or middleware may do:
auth
tenancy
coarse rate limiting
payload size enforcement
But governance itself must be domain-backed and traceable, not hidden in generic middleware.
19.4 Approval resumption
If a request becomes requires_approval, the API must return the approval reference and the client must be able to resume through: POST /v1/commands/decision/approve or an equivalent approval action endpoint.

20. Control APIs
These are executive and safety surfaces.
20.1 Kill switch
POST /v1/control/kill-switch
Purpose: halt governed autonomous execution for a tenant or scoped domain.
20.2 Budget freeze
POST /v1/control/budget/freeze
Purpose: freeze spend changes or new budget allocation.
20.3 Spend limit
POST /v1/control/budget/limit
Purpose: set or update budget caps.
20.4 Autonomy mode
POST /v1/control/autonomy-mode
Purpose: change between insight, assisted, and autonomous modes.
20.5 Rollback execution
POST /v1/control/execution/rollback
Purpose: attempt rollback of reversible nodes where supported.
20.6 Control API rules
stronger authorization than standard write APIs
audit-critical logging mandatory
must emit audit and governance events
no hidden admin-only bypass semantics

21. Audit, Explainability, and Compliance APIs
This is required for enterprise trust.
21.1 Audit API
GET /v1/audit/decision/{id}
Returns:
decision metadata
scoring breakdown
governance history
execution linkage
finance impact linkage
21.2 Explainability API
GET /v1/explain/decision/{id}
Returns:
reasoning summary
selected option vs alternatives
feature influences
confidence explanation
key constraints applied
21.3 Compliance export API
GET /v1/compliance/export
Returns or schedules:
approval history
override logs
token issuance records
selected decision-to-execution evidence chain
21.4 Export rule
Large exports should be asynchronous and downloadable through secure evidence-bundle flow.

22. Integration API Layer
This is not just adapter plumbing. It is part of the product.
22.1 Provider families
Meta
Google
LinkedIn
TikTok
Shopify
Stripe
Salesforce
HubSpot
other CRM and commerce providers
22.2 Integration capabilities
connect account
refresh auth
sync entities
ingest metrics
ingest conversions
publish or update platform-side resources where authorized
22.3 Example internal integration endpoints
POST /v1/integrations/meta/connect
POST /v1/integrations/meta/sync
POST /v1/integrations/stripe/webhook-test
POST /v1/integrations/shopify/sync-orders
22.4 Provider contract requirements
Each provider contract must define:
auth model
refresh behavior
rate limit treatment
retry profile
failure mapping
normalized output schema
data freshness expectations
22.5 Cross-channel normalization requirement
The integration layer must not merely fetch provider data. It must support:
identity stitching where possible
attribution stitching
cost-performance normalization
unified performance model creation

23. Webhook / Ingestion APIs
23.1 Endpoint pattern
POST /v1/webhooks/{source}
23.2 Mandatory behavior
verify signature
validate payload structure
normalize into internal integration event
return fast acknowledgment
offload heavy processing async
23.3 Retry handling
Webhook endpoints must be idempotent and safe under duplicate delivery.
23.4 Ingestion security
signature verification required where supported
IP allowlisting may be used where practical
suspicious or malformed payloads must be rejected with audit trace

24. Agent Interface Contract
Agents are first-class API clients inside the system and must be governed.
24.1 Agent intent endpoint
POST /v1/agent/intents
24.2 Required fields
agent_id
org_id
intent
confidence
reasoning_trace_ref or structured explanation ref
mode
constraints
idempotency_key
24.3 Agent rules
cannot bypass governance
cannot call raw execution operations directly
must declare confidence level
must provide traceable reasoning reference
must operate within cost and action bounds defined by agent contract pack
24.4 Agent response rule
Agents receive governed outcomes, not unlimited actuation rights.

25. State Ownership and Source of Truth Enforcement
APIs must respect domain ownership.
25.1 Source-of-truth map
campaign state → Campaign Service
decision state → Decision Engine
approval and policy state → Governance Domain
finance / ROI state → Revenue Intelligence
canonical events → Event system / event sink
projections → projection stores, never source-of-truth
25.2 Hard rule
No API may mutate another domain’s authoritative state directly through convenience shortcuts.

26. Temporal Intelligence and Scheduling APIs
This is a meaningful differentiator and must be explicit.
26.1 Example endpoints
GET /v1/query/scheduling/recommendation/{campaign_id}
POST /v1/intents/optimize-schedule
GET /v1/query/pacing/{campaign_id}
26.2 Capabilities
optimal posting time
pacing recommendations
temporal budget distribution
burst versus gradual spend profile
26.3 Output requirements
recommended time windows
confidence score
pacing strategy
risk notes
dependency on freshness of source signals

27. Idempotency Model
All write-path and externally side-effectful APIs must support idempotency.
27.1 Required field
idempotency_key
27.2 Behavior
If the same idempotency key is replayed within the defined window:
same logical result must be returned
duplicate external side effects must not occur
27.3 Mandatory scope
intent execution
approval actions
rollback actions
integration writes
webhook ingestion where duplicates are possible

28. Rate Limiting, Throttling, and Burst Protection
28.1 Limits
Apply limits by:
user
org
endpoint family
integration provider constraints
28.2 Example policy
org write intents: capped per minute
audit exports: stricter large-job quotas
webhook ingestion: provider-aware burst handling
28.3 Graceful degradation
When pressure rises:
projection and analytics queries may degrade first
governance and execution control paths must be preserved first

29. Timeout, Retry, and Circuit Breaker Matrix
This was missing before and is required for true zero-gap execution.
29.1 Synchronous APIs
auth / validation path: low latency target
intent acceptance path: bounded timeout
if downstream governance or planning exceeds sync budget, return accepted async state rather than hanging
29.2 Retries
safe idempotent writes: retryable with backoff where network failure occurs
non-idempotent external platform actions: retry only through controlled execution workers, not raw client repeat
29.3 Circuit breakers
Integration-heavy paths must support circuit breakers when provider instability is detected.
29.4 Degraded mode examples
simulation temporarily unavailable → return degraded simulation status
projection stale → return data with freshness warning
provider outage → block execute mode while still allowing recommend mode where safe

30. API Versioning Strategy
30.1 Path versioning
/v1/
30.2 Within-version evolution
additive fields allowed
no required-field addition without version review
no semantic reinterpretation of existing fields
30.3 Deprecation
Deprecation windows must be published and observable to clients where public integrations are involved.

31. Query and Filter Standards
31.1 Filtering
Use stable query parameters such as:
status
created_after
created_before
campaign_id
workspace_id
31.2 Sorting
Support explicit sorting on approved fields only.
31.3 Search
Search endpoints must define searchable fields and whether search is exact, prefix, or relevance-based.

32. Observability and Traceability
Every API request must emit or log:
trace_id
correlation_id
org_id
endpoint name
latency
status
decision reference where relevant
governance reference where relevant
economic validation result where relevant
32.1 API metrics
Track:
request rate
error rate
p95 latency
governance block rate
requires-approval rate
economic rejection rate
degraded-mode rate

33. Security Requirements
33.1 Transport
HTTPS only.
33.2 Input safety
strict schema validation
payload size limits
content-type validation
signature validation for webhooks
33.3 API hardening
WAF
bot protection where relevant
rate limiting
suspicious activity alerting
33.4 Sensitive responses
Finance, audit, compliance, and explainability responses must respect role and tenant restrictions.

34. Performance Targets
These are indicative starting targets and may tighten later.
command / intent acceptance: under 200ms typical synchronous path
query APIs backed by projections: under 150ms typical
webhook acknowledgment: under 100ms where heavy work is deferred
audit export creation: asynchronous accepted response preferred
The system must prefer truthful async acceptance over pretending synchronous completion.

35. Example Endpoint Catalog
35.1 Intent / command
POST /v1/intents/execute
POST /v1/intents/plan
POST /v1/commands/decision/approve
POST /v1/commands/decision/reject
35.2 Query
GET /v1/query/decisions
GET /v1/query/approvals
GET /v1/query/campaigns/{id}/performance
GET /v1/query/roi/{campaign_id}
GET /v1/query/executive-dashboard
GET /v1/query/platform-intelligence
35.3 Control
POST /v1/control/kill-switch
POST /v1/control/budget/freeze
POST /v1/control/budget/limit
POST /v1/control/autonomy-mode
POST /v1/control/execution/rollback
35.4 Audit / explainability
GET /v1/audit/decision/{id}
GET /v1/explain/decision/{id}
GET /v1/compliance/export
35.5 Integration / webhook
POST /v1/integrations/meta/connect
POST /v1/integrations/meta/sync
POST /v1/webhooks/meta
POST /v1/webhooks/stripe
POST /v1/webhooks/shopify

36. Final CTO Position
If you implement a weak API layer, ZoikoVertex becomes a better marketing tool.
If you implement this API model correctly, ZoikoVertex becomes a governed operating system with:
controlled business intent
measurable economic outcomes
non-bypassable governance
enterprise-grade trust surfaces
stable integration boundaries
This is the correct API architecture baseline.
