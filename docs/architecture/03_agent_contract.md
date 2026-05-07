# ZOIKOVERTEX: Agent Operating Contract Pack

## 1. System Positioning
Agents are bounded, stateful, policy-constrained intent generators. They originate intent, but do not possess free execution authority. No agent may call external APIs directly or mutate system state outside the governed path.

## 2. Agent Definition Model
Every agent must be registered, versioned, and have authority boundaries.

## 3. Agent State Model
States: `INITIALIZING`, `ACTIVE`, `DEGRADED`, `SUSPENDED`, `TERMINATED`.
State must be stored in primary transactional DB and emit events.

## 5. Authority Model
Constrained by:
* Domain authority (e.g., "Strategy", "Creative")
* Action authority (e.g., "Propose", "Modify")
* Spend authority (e.g., "$1,000 limit")
* Data authority (e.g., "Workspace-scoped")

## 6. Autonomy Model
Levels: `Insight-only`, `Assisted-action`, `Governed-autonomy`.

## 8. Intent Submission Contract
Mandatory: `idempotency_key`, `reasoning_trace`, `confidence_score`.

## 9. Decision Coupling
Agents cannot execute directly. Every action-intent must pass through the Decision Engine.

## 11. Economic Control System
Blast radius controls: Max campaigns affected, max daily/per-action budget exposure.

## 12. Multi-Agent Coordination Protocol
Conflict resolution stack and locking mechanisms (Campaign-level, Budget-level).

## 15. Kill Switch System
Automatic transition to `SUSPENDED` if kill conditions met.

## 25. Execution Binding Contract
No execution without a verifiable, immutable, and cryptographically consistent decision origin.

## 27. Idempotency Enforcement Model
Duplicate request with same idempotency key returns original result.

## 29. Partial Execution and Compensation Model
Multi-step flows must declare if they are atomic or compensatable.
