# Implementation Plan - Module Identity Ledger (Evidence Layer Phase 2)

Implement Phase 2 (Governance Depth) of the Identity Ledger module in the Evidence Layer, which adds delegation control, break-glass emergency sessions, point-in-time authority snapshots for these temporary states, backend API controllers/routes, unit tests, and a gorgeous, premium frontend dashboard that connects to these real APIs.

## User Review Required

> [!IMPORTANT]
> **Delegation & Break-Glass Security Context**: 
> 1. When delegation is active, the delegatee inherits the delegator's roles/permissions (limited by the delegation scope). This happens dynamically during authority snapshot generation.
> 2. When break-glass is active, the actor's state changes to `break_glass_active`, and they get elevated permissions (e.g. `ADMIN` or incident-specific controls).
> 3. An "After-Action Review" is required within 48 hours for any break-glass session, otherwise it raises a governance risk flag.

> [!WARNING]
> Since we don't have direct access to database passwords or `psql` to run SQL migrations, we will create the DB migration script `db_migrations/26_identity_ledger_phase2.sql`. We will then write a backend utility script that executes these migration DDL statements via a direct pg client or supabase client (if applicable), or simply instruct the user to run the migration file on the Supabase SQL editor. For backend unit tests, our setup mocks Supabase completely, so the test suite will run successfully without manual database intervention.

## Open Questions

> [!NOTE]
> 1. For Break-Glass activation, do we want to enforce a dual-approval check (requiring another admin to approve the activation) or allow a single-operator bypass for emergency P0 incidents as described in the spec? (We propose supporting single-operator bypass with logged justification, plus an option for dual-approval).
> 2. Should delegation scopes support arbitrary JSON rules, or should they be simplified to specific workspace/brand boundaries? (We propose starting with brand/campaign/workspace scopes as JSON fields).

---

## Proposed Changes

### Database Migration

#### [NEW] [26_identity_ledger_phase2.sql](file:///Users/harsha/Desktop/May/ZoikoVertex/db_migrations/26_identity_ledger_phase2.sql)
- Create `identity_delegations` table to store delegation history and statuses.
- Create `identity_break_glass_sessions` table to track emergency access sessions and their reviews.
- Insert the Phase 2 event types (`delegation.*`, `breakglass.*`, `identity.risk_flagged`, etc.) into `public.event_type_registry`.
- Add tenant isolation RLS policies for the new tables.

---

### Backend Components

#### [MODIFY] [identityLedger.service.ts](file:///Users/harsha/Desktop/May/ZoikoVertex/backend/src/services/identityLedger.service.ts)
- Implement `createDelegation`, `revokeDelegation`, and `listDelegations` functions.
- Implement `requestBreakGlass`, `activateBreakGlass`, `endBreakGlass`, `listBreakGlassSessions`, and `reviewBreakGlass` functions.
- Update `hydrateSeedFromSources` to fetch active delegations and break-glass sessions for the actor and dynamically adjust their roles/permissions/state:
  - If a delegation is active, merge delegator permissions and populate `delegation_context`.
  - If break-glass is active, set state to `break_glass_active`, add elevated roles, and populate `agent_context` or `service_account_context` where applicable.
- Update `createLedgerEntry` to include `session_context` and signatures for delegations and break-glass.

#### [MODIFY] [identityLedgerController.ts](file:///Users/harsha/Desktop/May/ZoikoVertex/backend/src/domains/evidence/identityLedgerController.ts)
- Add controller methods:
  - `listDelegations`, `createDelegation`, `revokeDelegation`
  - `listBreakGlass`, `requestBreakGlass`, `activateBreakGlass`, `endBreakGlass`, `reviewBreakGlass`
  - `exportLedger` (fetches ledger entries and generates export event)
  - `preserveToVault` (sends snapshots to the Evidence Vault)

#### [MODIFY] [server.ts](file:///Users/harsha/Desktop/May/ZoikoVertex/backend/src/server.ts)
- Import the new controller actions.
- Bind the new routes:
  - `GET /api/identity-ledger/delegations` -> `listDelegations`
  - `POST /api/identity-ledger/delegations` -> `createDelegation`
  - `POST /api/identity-ledger/delegations/:id/revoke` -> `revokeDelegation`
  - `GET /api/identity-ledger/break-glass` -> `listBreakGlass`
  - `POST /api/identity-ledger/break-glass/request` -> `requestBreakGlass`
  - `POST /api/identity-ledger/break-glass/:id/activate` -> `activateBreakGlass`
  - `POST /api/identity-ledger/break-glass/:id/end` -> `endBreakGlass`
  - `POST /api/identity-ledger/break-glass/:id/review` -> `reviewBreakGlass`
  - `POST /api/identity-ledger/export` -> `exportLedger`
  - `POST /api/identity-ledger/preserve` -> `preserveToVault`

---

### Backend Tests

#### [MODIFY] [identityLedger.test.ts](file:///Users/harsha/Desktop/May/ZoikoVertex/backend/src/test/identityLedger.test.ts)
- Add comprehensive vitest unit tests for:
  - Dynamic delegation permission inheritance and delegation logs.
  - Break-glass state activation, role elevation, ending, and review.
  - Export and Evidence Vault preservation triggers.

---

### Frontend Dashboard Components

#### [MODIFY] [page.tsx](file:///Users/harsha/Desktop/May/ZoikoVertex/frontend/src/app/\(dashboard\)/integrations/identity-ledger/page.tsx)
- Completely refactor the mockup dashboard to hook into real `/api/identity-ledger` APIs.
- **Actor Directory**: Interactive grid displaying human users, AI agents, service accounts, systems, and break-glass sessions with filtering (risk, state, type) and search.
- **Actor Drawer/Modal**: Detailed inspection panel showing point-in-time authority timelines, active roles/permissions (accounting for delegations), and session context.
- **Delegations Panel**: Displays active and past delegations, provides a "Request Delegation" modal form, and a revocation trigger.
- **Break-Glass Control Room**: Shows active emergency sessions and request histories, provides a "Trigger Break-Glass" activation form with duration settings, and an "End Session" control.
- **Auditor Chain Verification Panel**: Displays verification logs, lets auditors trigger a real-time ledger chain integrity scan (`/api/identity-ledger/chain/verify`), and visually warns on broken links.
- **Rich Aesthetics**: Premium styling following the design rules (harmonious gradients, dark elements, dynamic state micro-animations, glassmorphism counters).

---

## Verification Plan

### Automated Tests
- Run `npx vitest run src/test/identityLedger.test.ts` to verify backend service and mock database assertions for delegations, break-glass, snapshots, and chain validation.

### Manual Verification
- Deploy backend and run the frontend server.
- Verify actor listing and filtration.
- Create a test delegation between two users and inspect the generated authority snapshot.
- Trigger a break-glass session, verify state changes to `break_glass_active`, verify admin role addition, and then end the session.
- Run the Cryptographic Chain Verification on the UI and check that it reports a successful verification.
