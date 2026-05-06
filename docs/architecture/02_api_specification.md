# ZOIKOVERTEX: API Architecture & Endpoint Specification

## 1. Purpose
This document defines the complete API architecture for ZoikoVertex as a governed, decision-driven, ROI-accountable Digital Marketing Operating System.

## 2. Core API Principle
Intent → Decision → Governance → Economic Validation → Execution → Event → Projection.
Clients submit intents, not arbitrary state mutations.

## 3. API Topology
1. Intent APIs (Write interfaces: optimize, reallocate, launch, simulate, approve)
2. Query APIs (Read projections, summaries, histories)
3. Control APIs (Kill switch, budget freeze, autonomy mode)
4. Integration APIs (Meta, Google, Shopify, etc.)
5. Webhook / Ingestion APIs (External callbacks)
6. Audit / Compliance / Explainability APIs (Inspection)

## 4. API Style Rules
* REST over HTTPS.
* Resource-based paths: `/v1/intents/execute`, `/v1/query/decisions`.
* JSON payloads.
* ISO 8601 UTC timestamps.
* UUIDs for identifiers.

## 5. Architectural Request Flow
Client/Agent → Gateway → Auth → Authorization → Intent Validation → Decision Engine → Governance Engine → Economic Validation → Orchestration → Accepted Response.

## 6. Sync vs Async Contract
Most action-triggering APIs are acceptance APIs (async).
* Sync: Auth, Validation, Intent record, Trace ID, Acceptance.
* Async: Plan creation, Execution graph, Platform publishing, Attribution/ROI updates.

## 7. Canonical Request Envelope
```json
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
```

## 8. Canonical Response Envelope
```json
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
```

## 9. Error Contract
Structured errors with `error_code`, `message`, `retryable`, and `details`.

## 12. Intent API — Primary Write Surface
`POST /v1/intents/execute`
Modes: `simulate`, `recommend`, `execute`.

## 15. Planning Engine Interface
`POST /v1/intents/plan` - Convert objective into multi-step governed plan.

## 18. ROI and Economic APIs
`GET /v1/roi/predict`, `GET /v1/roi/actual`, `GET /v1/roi/variance/{decision_id}`.

## 20. Control APIs
`POST /v1/control/kill-switch`, `/v1/control/budget/freeze`, `/v1/control/autonomy-mode`.

## 21. Audit, Explainability, and Compliance APIs
`GET /v1/audit/decision/{id}`, `GET /v1/explain/decision/{id}`.

## 24. Agent Interface Contract
`POST /v1/agent/intents` - Agents must be governed and cannot bypass governance.

## 27. Idempotency Model
Mandatory `idempotency_key` for all write-path APIs.
