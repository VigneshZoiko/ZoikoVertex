# ZOIKOVERTEX: Canonical Domain & Bounded Context Specification

## 1. Purpose
Enforceable backend structure determining decomposition, ownership, and interaction.

## 2. System Principle
Governed, decision-driven, event-based execution system. No service executes outside the approved flow.

## 4. Domain Definitions
1. **Organisation & Identity**: Auth, tenants, roles.
2. **Content & Asset**: Creative assets and variants.
3. **Campaign & Execution**: Execution orchestrator, jobs, receipts.
4. **Channel & Platform**: External system abstraction (Meta, Google, etc.).
5. **Audience & Behavioural Intelligence**: Contacts, segments, scoring.
6. **Decision Engine**: Adjudication authority, confidence/risk scoring.
7. **Governance & Policy**: Hard enforcement, policy hierarchy, approvals.
8. **Attribution & Revenue Intelligence**: Spend tracking, ROI, margin models.
9. **Orchestration**: Workflow state and coordination.

## 5. Enforceable Interaction Model
1. No execution without governance.
2. No governance without classified decision or authorized human action.
3. No decision without data context.
4. No domain may skip orchestration.

## 6. Read/Write Authority Model
Only owning domain can mutate its authoritative records. Others read via APIs/events.

## 9. Hard System Constraints
* Governance is non-bypassable.
* Decision classification determines execution path.
* External platform calls only via Channel & Platform domain.
