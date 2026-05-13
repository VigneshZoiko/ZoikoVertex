ZOIKOVERTEX
 Agent Operating Contract Pack


0. Document Status
This document is the final consolidated specification for agent operation in ZoikoVertex. It combines the original operating contract and the engineering completion layer into one locked baseline.

1. System Positioning (Non-Negotiable)
Agents are not independent executors. They are bounded, stateful, policy-constrained intent generators operating inside a governed execution architecture. They originate intent, but they do not possess free execution authority.
1.1 Absolute Execution Rule
No agent may call external APIs directly, mutate system state directly, or cause financial or operational execution outside the governed system path.


2. Agent Definition Model
2.1 Canonical Agent Object

2.2 Registration Requirements
Every agent must be registered inside a tenant context before first activation.
Every agent must reference a versioned contract.
Every agent must have authority boundaries, an autonomy level, and a trust profile baseline.
No unregistered or anonymous agent may enter the intent path.
3. Agent State Model

3.1 State Persistence Rules
Agent state must be stored in the primary transactional database.
All state transitions must emit state-change events.
State history must be immutable and auditable.
3.2 State Transition Rules

3.3 Enforcement
Execution Services must reject any agent not in ACTIVE or explicitly allowed DEGRADED mode.
Decision Engine must validate state before approving any execution-intent flow.
4. Agent Contract Versioning
4.1 Contract Object

4.2 Rules
Every agent must operate under a versioned contract.
Deployed contracts are immutable; changes require a new contract version.
Breaking changes require a migration path and rollback plan.
Decision Engine and API layer must support multi-version contract validation during transition periods.
4.3 Migration Flow

5. Authority Model
Every agent is constrained along four dimensions simultaneously. This prevents agents from over-optimizing or acting outside business intent.
5.1 Authority Structure

5.2 Enforcement Points
Decision Engine validates authority before decision approval.
Execution Services revalidate authority before action dispatch.
Authority violations are hard rejects with audit records.
6. Autonomy Model

6.1 Dynamic Adjustment
Autonomy level may be raised or reduced based on trust score, risk score, performance degradation, or manual override.
Autonomy level may also be constrained per domain or per workspace where policy requires it.
7. Execution Control System
7.1 Execution Profile

7.2 Rules
Agents must not execute continuously without pause.
Agents must respect cooldown and cycle boundaries.
Execution depth must be bounded to prevent chain explosions or feedback loops.
8. Intent Submission Contract
8.1 Intent Object

8.2 Validation Rules
Idempotency is mandatory.
Reasoning trace is mandatory for auditability.
Confidence score must be present and comparable against thresholds.
Malformed intents or missing mandatory fields must be rejected before decisioning.
9. Decision Coupling
Agents cannot execute directly. Every action-intent must pass through the Decision Engine. Execution Services must require a valid decision_id and must reject direct calls.
API Gateway blocks direct execution operations from agents.
Execution Services require decision_id and downstream governance / economic validity.
No convenience path may be added later that bypasses decisioning.
10. Governance Enforcement
Every agent action must pass policy validation, compliance checks, approval rules, and risk checks.

10.1 Failure Handling
Governance rejection must be logged.
Agent trust may be reduced when repeated invalid intents are submitted.
Escalation is triggered where policy or risk thresholds require review.
11. Economic Control System
11.1 Economic Validation Object

11.2 Blast Radius Controls
Maximum campaigns affected per decision path.
Maximum daily and per-action budget exposure.
Isolation rules to prevent systemic risk spread across too many operating entities at once.
12. Multi-Agent Coordination Protocol
12.1 Coordination Lock Object

12.2 Conflict Resolution Stack

12.3 Locking Mechanisms
Campaign-level locks
Budget-level locks
Execution-graph locks
13. Accountability and Audit Model
13.1 Audit Record

13.2 Requirements
Audit storage must be immutable.
Audit logs must be queryable by agent, decision, execution, tenant, and timeframe.
No anonymous agent action is ever permitted.
14. Trust and Performance Model
14.1 Trust Object

14.2 Impact Rules
Low trust reduces autonomy.
High risk tightens governance thresholds.
Poor performance can move the agent into DEGRADED state.
15. Kill Switch System
15.1 Kill Conditions

15.2 Enforcement
Kill conditions may trigger automatic transition to SUSPENDED.
Execution must halt immediately once the state changes.
The event and audit trail must reflect who or what triggered the kill condition.
16. Determinism and Replay Model
All decisions must be reproducible from recorded inputs and version references.
Full event replay must be supported for audit and debugging.
Deterministic mode must be available for audit reconstruction where policy and compliance require it.
17. Simulation Isolation
Simulation must run in a sandboxed environment.
Simulation must produce zero side effects.
Simulation must have explicit resource caps so exploratory analysis does not consume uncontrolled compute.
18. Learning Control System
No autonomous learning without approval.
Learning logic must be version-controlled.
Rollback must be supported if learning degrades outcomes or increases risk.
19. Escalation Hierarchy

19.1 Trigger Conditions
High spend
Low confidence
Anomaly
Policy violation
20. Cost Control System
Agents must respect compute budgets.
Agents must respect model usage and inference cost caps.
Decision cost thresholds must prevent economically irrational automation.
21. Security Model
Scoped credentials only.
No impersonation of users or other agents.
Strict identity binding at token, service, and audit layers.
22. Prohibited Behaviours
Bypassing governance
Direct execution outside the governed path
Exceeding authority boundaries
Manipulating system state directly
Circumventing idempotency or audit controls
23. Agent Lifecycle

24. Enforcement Summary

25. Execution Binding Contract
25.1 Purpose
No execution may occur without a verifiable, immutable, and cryptographically consistent decision origin.
25.2 Execution Binding Object

25.3 Enforcement Rules
Execution Service must validate decision_id exists.
Execution Service must recompute and verify decision_hash.
Execution Service must validate agent ownership where applicable.
Execution Service must validate idempotency_key.
If any validation fails, execution is a hard reject.
26. Concurrency and Race Condition Control
All execution must be atomic or explicitly compensatable.
Optimistic locking is the default concurrency strategy.
Pessimistic locking may be used in high-risk domains where contention is costly.
Version mismatch causes reject or retry according to operation class.
Stale intents must be invalidated rather than silently re-used.
27. Idempotency Enforcement Model
27.1 Global Rule
All intents and executions must be idempotent.
27.2 Idempotency Contract

27.3 Enforcement
Duplicate request with same idempotency key returns original result.
Payload mismatch under same key is rejected.
Idempotency keys must be persisted and have configurable retention.
28. Failure Handling Framework

28.1 Retry Policy

28.2 Circuit Breaker
Repeated failures trigger temporary system block and escalation.
29. Partial Execution and Compensation Model
Multi-step execution may partially succeed. Every workflow must declare whether it is atomic or compensatable.

Execution without an explicit compensation plan for non-atomic flows must be rejected by the Decision Engine.
30. Event Emission Guarantees

Events must be durable.
Events must be ordered per relevant entity or aggregate.
Events must be replayable.
Failed event publish must retry and alert.
31. Time Consistency Model
All timestamps must be UTC and ISO 8601.
System time must be synchronized through centralized time discipline such as NTP.
Decision ordering must be deterministic and time-consistent.
32. Agent Isolation Model
Strict tenant isolation is mandatory.
Strict workspace isolation is mandatory where scope is narrower than tenant scope.
No shared mutable state across agents outside controlled coordination mechanisms.
Isolation must be enforced at API layer, database access layer, and execution layer.
33. Observability and Telemetry Model
Per-agent metrics must be emitted.
Decision latency must be measurable.
Execution success rate must be measurable.
ROI performance impact must be measurable.
Anomaly signals must be monitored and alertable.
33.1 Logging and Tracing
All actions must be logged in structured form.
Distributed tracing must connect intent, decision, governance, and execution.
34. System Recovery and Restart Model
On restart, the system must restore agent state.
Locks and in-flight workflow state must be restored or reconciled.
Incomplete executions must resume safely or be safely terminated.
Recovery must guarantee no duplicate execution, no lost execution, and no orphaned state.

35. Final CTO Position
This document is now complete, non-ambiguous, production-safe, concurrency-safe, audit-complete, enterprise-defensible, and regulator-ready. It should be treated as the final locked operating contract for agents inside ZoikoVertex unless architecture scope changes materially.

Purpose: This document defines the complete agent operating contract for ZoikoVertex. It governs agent identity, registration, state, authority, autonomy, execution control, decision coupling, governance enforcement, economic safeguards, coordination, accountability, security, recovery, observability, and failure containment. It is a binding system contract.
Field | Value
Classification | Critical System Contract
Scope | All agent-driven activity across ZoikoVertex
Enforcement Level | Non-bypassable, system enforced
Audience | Backend engineering, AI engineering, platform architecture, SRE, security, compliance
Agent → Intent API → Decision Engine → Governance Engine → Economic Engine → Execution Services
Absolute rule: Any implementation path that allows an agent to bypass one of these layers is architecturally invalid and must be treated as a defect, not a feature.
{
  "agent_id": "UUID",
  "agent_name": "string",
  "agent_type": "optimizer | executor | analytics | governance | experiment",
  "org_id": "UUID",
  "workspace_ids": ["UUID"],
  "contract": {
    "contract_version": "vX.X",
    "schema_version": "vX",
    "policy_version": "vX"
  },
  "state": "ACTIVE | PAUSED | DEGRADED | SUSPENDED | TERMINATED",
  "autonomy_level": "D0 | D1 | D2 | D3",
  "authority": {},
  "trust_profile": {},
  "execution_profile": {},
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
State | Description | Allowed Behaviour
ACTIVE | Full operation | Full contract execution
PAUSED | Temporarily halted | No new intents
DEGRADED | Restricted operation | Limited scope and stricter thresholds
SUSPENDED | Blocked pending investigation or control event | No execution
TERMINATED | Permanently disabled | No activity
ACTIVE → DEGRADED (performance anomaly)
ACTIVE → PAUSED (manual or scheduled)
DEGRADED → ACTIVE (validated recovery)
ANY → SUSPENDED (policy breach / anomaly / kill condition)
SUSPENDED → TERMINATED (confirmed violation or administrative retirement)
{
  "contract_version": "v1.3",
  "breaking_change": false,
  "migration_required": true,
  "previous_version": "v1.2"
}
Old Contract → Migration Layer → New Contract → Validation → Activation
{
  "authority": {
    "financial": {
      "daily_limit": 1000,
      "per_action_limit": 200
    },
    "operational": {
      "max_actions_per_hour": 5,
      "max_parallel_actions": 2
    },
    "temporal": {
      "cooldown_seconds": 300,
      "execution_window": ["09:00-18:00"]
    },
    "strategic": {
      "allowed_domains": ["ads", "email"],
      "allowed_channels": ["meta", "google"]
    }
  }
}
Level | Meaning
D0 | Insight only — no execution allowed
D1 | Approval required
D2 | Conditional autonomy inside defined constraints
D3 | Full autonomy inside defined constraints
{
  "execution_profile": {
    "cycle_interval": "15m",
    "max_decisions_per_cycle": 3,
    "max_execution_depth": 2
  }
}
{
  "intent_id": "UUID",
  "agent_id": "UUID",
  "intent_type": "reallocate_budget",
  "target": {
    "campaign_id": "UUID"
  },
  "parameters": {
    "increase_percentage": 20
  },
  "confidence_score": 0.91,
  "reasoning_trace": "string",
  "mode": "recommend | execute",
  "idempotency_key": "UUID",
  "created_at": "timestamp"
}
Policy → Compliance → Approval → Risk → Decision
{
  "roi_threshold": 1.2,
  "expected_return": 1.8,
  "budget_available": true,
  "efficiency_score": 0.85
}
{
  "intent_lock": "campaign_id",
  "lock_owner": "agent_id",
  "lock_expiry": "timestamp"
}
Priority → Domain Ownership → Locking → Decision Arbitration
{
  "agent_id": "UUID",
  "intent_id": "UUID",
  "decision_id": "UUID",
  "execution_id": "UUID",
  "timestamp": "ISO8601",
  "outcome": "success | failure",
  "roi_impact": 1.5
}
{
  "trust_score": 0.87,
  "performance_score": 0.92,
  "risk_score": 0.15,
  "last_updated": "timestamp"
}
{
  "roi_breach": true,
  "failure_count": 3,
  "anomaly_score": 0.8
}
Agent → Manager → Senior → System Block
Register → Activate → Execute → Monitor → Optimise → Suspend → Terminate
Layer | Role
Decision Engine | Validates intent and authority before execution path continues
Governance Engine | Applies policy, compliance, risk, and approval controls
Economic Engine | Validates ROI, budget, and efficiency constraints
Execution Layer | Rejects any action missing valid decision, governance, and economic basis
{
  "execution_id": "UUID",
  "decision_id": "UUID",
  "agent_id": "UUID",
  "decision_hash": "SHA256(decision_payload)",
  "binding_timestamp": "ISO8601",
  "idempotency_key": "UUID"
}
{
  "idempotency_key": "UUID",
  "request_hash": "SHA256(payload)",
  "first_execution_timestamp": "ISO8601"
}
Failure Type | Required Behaviour
Transient | Retry with backoff
Persistent | Reject and log
Systemic | Escalate and activate protective controls
- exponential backoff
- max retries = 3
- jitter required
- rollback previous steps
OR
- forward recovery (adjust state)
intent_created
decision_made
execution_started
execution_completed
execution_failed
- detect incomplete transactions
- reconcile state
- emit recovery events
Locked status: Document 7 is now suitable for engineering circulation and downstream orchestration design. It should be used together with Documents 5 and 6 during implementation, testing, and governance review.