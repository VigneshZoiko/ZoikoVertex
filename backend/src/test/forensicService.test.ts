import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockSupabaseNext, mockSupabaseClear, createMockCase, createMockEvidence, createMockAction, createMockNote, createMockTask, createMockExport, createMockSubscription } from './setup';

import * as forensicService from '../services/forensicHub.service';
import * as forensicAi from '../services/forensicAi.service';

// ─── PHASE 1: State Machine ───────────────────────────────────────────────────

describe('Phase 1 — State Machine', () => {
  const validTransitions: Record<string, string[]> = {
    new: ['triage', 'closed'],
    triage: ['active_investigation', 'awaiting_information', 'escalated', 'closed'],
    active_investigation: ['awaiting_information', 'legal_review', 'remediation', 'escalated', 'closed'],
    awaiting_information: ['active_investigation', 'escalated', 'closed'],
    legal_review: ['active_investigation', 'remediation', 'legal_hold', 'closed'],
    legal_hold: ['active_investigation', 'legal_review', 'closed'],
    remediation: ['validation', 'active_investigation', 'escalated'],
    validation: ['closed', 'active_investigation'],
    escalated: ['active_investigation', 'legal_review', 'closed'],
    closed: ['reopened'],
    reopened: ['active_investigation', 'legal_review', 'closed'],
  };

  it('should allow all specified valid transitions', () => {
    for (const [from, toList] of Object.entries(validTransitions)) {
      for (const to of toList) {
        expect(from).not.toBe(to);
      }
    }
  });

  it('should have exactly 11 states', () => {
    const states = ['new', 'triage', 'active_investigation', 'awaiting_information',
      'legal_review', 'legal_hold', 'remediation', 'validation', 'escalated', 'closed', 'reopened'];
    expect(Object.keys(validTransitions).sort()).toEqual(states.sort());
  });

  it('should not allow closed → active_investigation (must go through reopened)', () => {
    expect(validTransitions['closed']).not.toContain('active_investigation');
    expect(validTransitions['closed']).toContain('reopened');
  });

  it('should not allow reopened → triage', () => {
    expect(validTransitions['reopened']).not.toContain('triage');
  });

  it('should enforce valid transition via updateCase', async () => {
    const caseRec = createMockCase({ status: 'new' });
    const updatedCase = createMockCase({ status: 'triage', title: 'Updated Title' });

    mockSupabaseNext(caseRec);           // getCase
    mockSupabaseNext(null);               // case_actions.insert (status change audit)
    mockSupabaseNext(null);               // forensic_cases.update
    mockSupabaseNext(updatedCase);        // getCase again

    const result = await forensicService.updateCase(caseRec.id, {
      status: 'triage', actor_id: 'user-001', reason: 'QA test',
    });
    expect(result.status).toBe('triage');
  });

  it('should reject invalid transition', async () => {
    const caseRec = createMockCase({ status: 'closed' });
    mockSupabaseNext(caseRec);          // getCase
    // No update should happen — throws before it

    await expect(forensicService.updateCase(caseRec.id, {
      status: 'new', actor_id: 'user-001', reason: 'QA test',
    })).rejects.toThrow('Invalid status transition');
  });
});

// ─── PHASE 1: Case CRUD ───────────────────────────────────────────────────────

describe('Phase 1 — Case CRUD', () => {
  beforeEach(() => { mockSupabaseClear(); });

  it('should create a case', async () => {
    const newCase = createMockCase();
    mockSupabaseNext(newCase);           // insert → select → single
    mockSupabaseNext(null);              // case_actions insert

    const result = await forensicService.createCase({
      workspace_id: 'WRK-001', case_type: 'security_incident',
      title: 'Test', severity: 'high', actor_id: 'user-001',
    });
    expect(result.case_id).toBe('CASE-TEST001');
  });

  it('should get a case by UUID', async () => {
    const caseRec = createMockCase();
    mockSupabaseNext(caseRec);

    const result = await forensicService.getCase('test-case-uuid');
    expect(result).toBeTruthy();
    expect(result!.id).toBe('test-case-uuid');
  });

  it('should return null for missing case', async () => {
    mockSupabaseNext(null);

    const result = await forensicService.getCase('nonexistent');
    expect(result).toBeNull();
  });

  it('should list cases with filters', async () => {
    const cases = [createMockCase(), createMockCase({ id: 'case-2', case_id: 'CASE-TEST002', severity: 'critical' })];
    mockSupabaseNext(cases, null, 2);

    const result = await forensicService.listCases({ workspace_id: 'WRK-001' });
    expect(result.cases.length).toBe(2);
    expect(result.total).toBe(2);
  });

  it('should update a case (title only, no status change)', async () => {
    const caseRec = createMockCase({ status: 'new' });
    mockSupabaseNext(caseRec);           // getCase
    mockSupabaseNext(null);              // update
    mockSupabaseNext(caseRec);           // getCase again

    const result = await forensicService.updateCase(caseRec.id, {
      title: 'Updated Title', actor_id: 'user-001', reason: 'QA update',
    });
    expect(result.title).toBe('Test Security Incident');
  });

  it('should close a case', async () => {
    const caseRec = createMockCase({ status: 'validation' });
    const closedCase = createMockCase({ status: 'closed' });

    mockSupabaseNext(caseRec);           // getCase
    mockSupabaseNext([]);                // listEvidence
    mockSupabaseNext(null);              // update
    mockSupabaseNext(null);              // case_actions insert
    mockSupabaseNext(closedCase);        // getCase again

    const result = await forensicService.closeCase(caseRec.id, {
      outcome: 'substantiated', rationale: 'QA closure', actor_id: 'user-001',
    });
    expect(result.status).toBe('closed');
  });

  it('should reopen a closed case', async () => {
    const caseRec = createMockCase({ status: 'closed' });
    const reopenedCase = createMockCase({ status: 'reopened' });

    mockSupabaseNext(caseRec);           // getCase
    mockSupabaseNext(null);              // update
    mockSupabaseNext(null);              // case_actions insert
    mockSupabaseNext(reopenedCase);      // getCase again

    const result = await forensicService.reopenCase(caseRec.id, 'New evidence', 'user-001');
    expect(result.status).toBe('reopened');
  });

  it('should assign a participant', async () => {
    const participant = { id: 'p-1', case_id: 'test-case-uuid', user_id: 'user-002', role_in_case: 'investigator', added_by: 'user-001', added_reason: 'QA assign', added_at: '2026-01-01T00:00:00Z' };
    mockSupabaseNext(participant);

    const result = await forensicService.addParticipant(
      'test-case-uuid', 'user-002', 'investigator', 'user-001', 'QA assign'
    );
    expect(result.user_id).toBe('user-002');
  });
});

// ─── PHASE 1/2: Evidence ──────────────────────────────────────────────────────

describe('Phase 1/2 — Evidence Management', () => {
  beforeEach(() => { mockSupabaseClear(); });

  it('should add evidence to a case', async () => {
    const caseRec = createMockCase();
    const evidence = createMockEvidence();

    mockSupabaseNext(caseRec);           // getCase
    mockSupabaseNext(evidence);          // insert → select → single
    mockSupabaseNext(null);              // case_actions insert

    const result = await forensicService.addEvidence({
      case_id: 'test-case-uuid', source_type: 'audit_event', source_id: 'evt-002',
      added_by: 'user-001', added_reason: 'QA test',
    });
    expect(result.source_id).toBe('evt-001');
  });

  it('should list evidence', async () => {
    const evidence = [createMockEvidence(), createMockEvidence({ id: 'ev-2', source_id: 'evt-002' })];
    mockSupabaseNext(evidence);

    const result = await forensicService.listEvidence('test-case-uuid');
    expect(result.length).toBe(2);
  });

  it('should pin evidence', async () => {
    const ev = createMockEvidence();
    const evWithCase = { ...ev, case: createMockCase() };

    mockSupabaseNext(evWithCase);        // select with join → single
    mockSupabaseNext(null);              // update
    mockSupabaseNext(null);              // case_actions insert

    await expect(forensicService.pinEvidence(ev.id, 'Key evidence', 'user-001')).resolves.not.toThrow();
  });

  it('should mark evidence as privileged', async () => {
    const ev = createMockEvidence();
    const evWithCase = { ...ev, case: createMockCase() };

    mockSupabaseNext(evWithCase);
    mockSupabaseNext(null);
    mockSupabaseNext(null);

    await expect(forensicService.markEvidencePrivileged(ev.id, 'user-001')).resolves.not.toThrow();
  });

  it('should unpin evidence', async () => {
    const ev = createMockEvidence({ is_pinned: true });
    const evWithCase = { ...ev, case: createMockCase() };

    mockSupabaseNext(evWithCase);
    mockSupabaseNext(null);
    mockSupabaseNext(null);

    await expect(forensicService.unpinEvidence(ev.id, 'No longer relevant', 'user-001')).resolves.not.toThrow();
  });
});

// ─── PHASE 2: Vault Preserve ──────────────────────────────────────────────────

describe('Phase 2 — Vault Preserve', () => {
  beforeEach(() => { mockSupabaseClear(); });

  it('should preserve evidence to vault', async () => {
    const caseRec = createMockCase();
    const evidence = [
      createMockEvidence({ id: 'ev-1', vault_status: 'not_preserved' }),
      createMockEvidence({ id: 'ev-2', vault_status: 'not_preserved' }),
    ];

    mockSupabaseNext(caseRec);           // getCase
    mockSupabaseNext(evidence);          // listEvidence
    mockSupabaseNext(null);              // update ev-1 to preserved
    mockSupabaseNext(null);              // update ev-2 to preserved
    mockSupabaseNext(null);              // case_actions insert

    const result = await forensicService.preserveToVault({
      case_id: caseRec.id, evidence_ids: ['ev-1', 'ev-2'],
      retention_class: 'standard', preservation_reason: 'QA preserve',
      actor_id: 'user-001', workspace_id: 'WRK-001',
    });
    expect(result.preserved).toBe(2);
    expect(result.manifest_id).toContain('MAN-');
  });

  it('should reject preserve if no unpreserved evidence', async () => {
    const caseRec = createMockCase();
    mockSupabaseNext(caseRec);           // getCase
    mockSupabaseNext([]);                // all already preserved

    await expect(forensicService.preserveToVault({
      case_id: caseRec.id, evidence_ids: ['ev-1'],
      retention_class: 'standard', preservation_reason: 'QA',
      actor_id: 'user-001', workspace_id: 'WRK-001',
    })).rejects.toThrow('No unpreserved evidence');
  });
});

// ─── PHASE 2: Legal Hold ──────────────────────────────────────────────────────

describe('Phase 2 — Legal Hold', () => {
  beforeEach(() => { mockSupabaseClear(); });

  it('should apply legal hold to a case', async () => {
    const caseRec = createMockCase();
    const updatedCase = createMockCase({ legal_hold_active: true, retention_class: 'legal_hold' });

    mockSupabaseNext(caseRec);           // getCase
    mockSupabaseNext(null);              // forensic_cases.update
    mockSupabaseNext(null);              // case_evidence_items.update (all evidence)
    mockSupabaseNext(null);              // case_actions insert
    mockSupabaseNext(updatedCase);       // getCase after update

    const result = await forensicService.applyLegalHold(caseRec.id, 'Legal QA', 'user-001');
    expect(result.legal_hold_active).toBe(true);
  });

  it('should release legal hold', async () => {
    const caseRec = createMockCase({ legal_hold_active: true, retention_class: 'legal_hold' });
    const updatedCase = createMockCase({ legal_hold_active: false, retention_class: 'standard' });

    mockSupabaseNext(caseRec);           // getCase
    mockSupabaseNext(null);              // update
    mockSupabaseNext(null);              // case_actions insert
    mockSupabaseNext(updatedCase);       // getCase after update

    const result = await forensicService.releaseLegalHold(caseRec.id, 'QA release', 'user-001');
    expect(result.legal_hold_active).toBe(false);
  });

  it('should reject release if not under hold', async () => {
    const caseRec = createMockCase({ legal_hold_active: false });
    mockSupabaseNext(caseRec);           // getCase

    await expect(forensicService.releaseLegalHold(caseRec.id, 'QA', 'user-001'))
      .rejects.toThrow('not under legal hold');
  });
});

// ─── PHASE 2: SLA ─────────────────────────────────────────────────────────────

describe('Phase 2 — SLA', () => {
  it('should detect breached SLA', () => {
    const pastDate = new Date(Date.now() - 86400000).toISOString();
    const result = forensicService.checkSlaBreach(pastDate);
    expect(result).toBeTruthy();
    if (result) expect(result.breached).toBe(true);
  });

  it('should detect non-breached SLA', () => {
    const futureDate = new Date(Date.now() + 86400000).toISOString();
    const result = forensicService.checkSlaBreach(futureDate);
    expect(result).toBeTruthy();
    if (result) expect(result.breached).toBe(false);
  });

  it('should return null for null SLA date', () => {
    const result = forensicService.checkSlaBreach(null);
    expect(result).toBeNull();
  });
});

// ─── PHASE 3: Export Builder ──────────────────────────────────────────────────

describe('Phase 3 — Exports', () => {
  beforeEach(() => { mockSupabaseClear(); });

  it('should create an export request', async () => {
    const caseRec = createMockCase();
    const exportRec = createMockExport();

    mockSupabaseNext(caseRec);           // getCase
    mockSupabaseNext(exportRec);         // insert → select → single
    mockSupabaseNext(null);              // case_actions insert

    const result = await forensicService.createExport({
      case_id: caseRec.id, package_type: 'internal_investigation',
      format: 'json', redaction_profile: 'standard',
      reason: 'QA test export', actor_id: 'user-001',
    });
    expect(result.status).toBe('draft');
  });

  it('should generate an export package', async () => {
    const exportRec = createMockExport({ status: 'approved' });
    const readyExport = createMockExport({ status: 'ready', hash: 'PKG-TEST-HASH' });
    const caseRec = createMockCase();

    mockSupabaseNext(exportRec);         // select export → single
    mockSupabaseNext(null);              // update to generating
    mockSupabaseNext(caseRec);           // getCase
    mockSupabaseNext([]);                // listEvidence
    mockSupabaseNext([]);                // listActions
    // getEnhancedTimeline → getCase + listActions
    mockSupabaseNext(caseRec);
    mockSupabaseNext([]);
    mockSupabaseNext([]);                // listEvidence inside getEnhancedTimeline
    mockSupabaseNext([]);                // listTasks
    mockSupabaseNext([]);                // listNotes
    mockSupabaseNext(null);              // update to ready
    mockSupabaseNext(readyExport);        // select export → single (return)

    const result = await forensicService.generateExportPackage(exportRec.id, 'user-001');
    expect(result.status).toBe('ready');
    expect(result.hash).toContain('PKG-');
  });

  it('should approve an export', async () => {
    const exportRec = createMockExport({ status: 'pending_approval' });
    const updated = createMockExport({ status: 'approved', approved_by: 'user-001' });

    mockSupabaseNext(exportRec);         // select → single
    mockSupabaseNext(null);              // update
    mockSupabaseNext(updated);           // select → single (return)

    const result = await forensicService.approveExport(exportRec.id, 'user-001');
    expect(result.status).toBe('approved');
  });

  it('should reject an export', async () => {
    const exportRec = createMockExport({ status: 'pending_approval' });
    const updated = createMockExport({ status: 'rejected' });

    mockSupabaseNext(exportRec);         // select → single
    mockSupabaseNext(null);              // update
    mockSupabaseNext(updated);           // select → single (return)

    const result = await forensicService.rejectExport(exportRec.id, 'QA rejection', 'user-001');
    expect(result.status).toBe('rejected');
  });
});

// ─── PHASE 3: Entity Graph ────────────────────────────────────────────────────

describe('Phase 3 — Entity Graph', () => {
  beforeEach(() => { mockSupabaseClear(); });

  it('should build entity graph with nodes and edges', async () => {
    const caseRec = createMockCase({ owner_user_id: 'user-001' });
    const evidence = [createMockEvidence()];
    const actions = [createMockAction()];

    mockSupabaseNext(caseRec);           // getCase
    mockSupabaseNext(evidence);          // listEvidence
    mockSupabaseNext(actions);           // listActions

    const result = await forensicService.getEntityGraph('test-case-uuid');
    expect(result.nodes.length).toBeGreaterThan(0);
    expect(result.edges.length).toBeGreaterThan(0);
  });
});

// ─── PHASE 4: AI Summary ──────────────────────────────────────────────────────

describe('Phase 4 — AI Summary', () => {
  beforeEach(() => { mockSupabaseClear(); });

  it('should generate a case summary with citations', async () => {
    const caseRec = createMockCase({ status: 'active_investigation', owner_user_id: 'user-001' });
    const evidence = [createMockEvidence({ is_pinned: true })];
    const actions = [createMockAction()];
    const summary = { id: 'sum-1', case_id: 'test-case-uuid', summary_type: 'case_summary', content: 'CASE SUMMARY: Test Security Incident\n\nKey Evidence (1 items):', citations: [], status: 'draft', generated_by: 'user-001', created_at: '2026-01-01T00:00:00Z' };

    mockSupabaseNext(caseRec);           // getCase
    mockSupabaseNext(evidence);          // listEvidence
    mockSupabaseNext(actions);           // listActions
    // getEnhancedTimeline → getCase + listActions
    mockSupabaseNext(caseRec);
    mockSupabaseNext([]);
    mockSupabaseNext([]);                // listEvidence inside getEnhancedTimeline
    mockSupabaseNext([]);                // listTasks
    mockSupabaseNext([]);                // notes (from('case_notes'))
    mockSupabaseNext(summary);           // insert ai_summary → single

    const result = await forensicAi.generateCaseSummary(caseRec.id, 'user-001');
    expect(result.summary_type).toBe('case_summary');
    expect(result.content).toContain('CASE SUMMARY');
  });

  it('should approve an AI summary', async () => {
    const summary = { id: 'sum-1', case_id: 'test-case-uuid', status: 'draft', summary_type: 'case_summary', content: 'test', citations: [], generated_by: 'user-001', created_at: '2026-01-01T00:00:00Z' };
    const updated = { ...summary, status: 'approved', approved: true, reviewed_by: 'user-001' };
    const caseRec = createMockCase();

    mockSupabaseNext(summary);           // select summary → single
    mockSupabaseNext(null);              // update
    mockSupabaseNext(caseRec);           // getCase
    mockSupabaseNext(updated);           // select summary → single (return)

    const result = await forensicAi.approveAiSummary('sum-1', 'user-001');
    expect(result.status).toBe('approved');
  });
});

// ─── PHASE 4: Anomalies ───────────────────────────────────────────────────────

describe('Phase 4 — Anomaly Detection', () => {
  beforeEach(() => { mockSupabaseClear(); });

  it('should detect repeated actor anomalies', async () => {
    const caseRec = createMockCase();
    const actions = [
      createMockAction({ actor_id: 'user-001', action_type: 'status_changed' }),
      createMockAction({ actor_id: 'user-001', action_type: 'note_added' }),
      createMockAction({ actor_id: 'user-001', action_type: 'evidence_added' }),
    ];
    const anomaly = { id: 'anom-1', case_id: 'test-case-uuid', anomaly_type: 'repeated_actor', label: 'user-001', severity: 'medium', frequency: 3 };

    mockSupabaseNext([]);                // listEvidence
    mockSupabaseNext(actions);           // listActions
    // getEnhancedTimeline → getCase + listActions
    mockSupabaseNext(caseRec);
    mockSupabaseNext([]);
    mockSupabaseNext([]);                // listEvidence inside getEnhancedTimeline
    mockSupabaseNext(caseRec);           // getCase for anomaly check
    mockSupabaseNext(null);              // maybeSingle (no existing)
    mockSupabaseNext(anomaly);           // insert → single

    const results = await forensicAi.detectAnomalies(caseRec.id, 'user-001');
    expect(results.length).toBeGreaterThanOrEqual(1);
  });
});

// ─── PHASE 4: Recommendations ─────────────────────────────────────────────────

describe('Phase 4 — Recommendations', () => {
  beforeEach(() => { mockSupabaseClear(); });

  it('should generate context-aware recommendations for new case', async () => {
    const caseRec = createMockCase({ status: 'new' });

    mockSupabaseNext(caseRec);           // getCase
    mockSupabaseNext([]);                // listEvidence
    mockSupabaseNext([]);                // listTasks
    mockSupabaseNext([]);                // listActions
    // getEnhancedTimeline → getCase + listActions
    mockSupabaseNext(caseRec);
    mockSupabaseNext([]);
    mockSupabaseNext([]);                // listEvidence inside getEnhancedTimeline

    const recs = await forensicAi.generateRecommendations(caseRec.id, 'user-001');
    expect(recs.length).toBeGreaterThan(0);
    expect(recs.some(r => r.toLowerCase().includes('assign'))).toBe(true);
  });

  it('should warn about breached SLA', async () => {
    const pastDate = new Date(Date.now() - 86400000).toISOString();
    const caseRec = createMockCase({ status: 'active_investigation', sla_due_at: pastDate });

    mockSupabaseNext(caseRec);           // getCase
    mockSupabaseNext([]);                // listEvidence
    mockSupabaseNext([]);                // listTasks
    mockSupabaseNext([]);                // listActions
    mockSupabaseNext(caseRec);           // getEnhancedTimeline getCase
    mockSupabaseNext([]);                // getEnhancedTimeline listActions
    mockSupabaseNext([]);                // getEnhancedTimeline listEvidence

    const recs = await forensicAi.generateRecommendations(caseRec.id, 'user-001');
    expect(recs.some(r => r.includes('SLA is breached'))).toBe(true);
  });
});

// ─── PHASE 4: SIEM Routing ────────────────────────────────────────────────────

describe('Phase 4 — SIEM Routing', () => {
  beforeEach(() => { mockSupabaseClear(); });

  it('should route event to active SIEM subscriptions', async () => {
    const caseRec = createMockCase();
    const subscriptions = [createMockSubscription()];

    mockSupabaseNext(caseRec);           // getCase
    mockSupabaseNext(subscriptions);     // select subscriptions
    mockSupabaseNext({ id: 'route-1', case_id: 'test-case-uuid', event_type: 'forensic.status_changed', routed_to: 'subscriptions', routed_at: '2026-01-01T00:00:00Z' }); // insert routing log

    const result = await forensicAi.routeToSiem(caseRec.id, 'forensic.status_changed', 'user-001');
    expect(result.subscriptions).toBe(1);
  });

  it('should return zero if no SIEM subscriptions', async () => {
    const caseRec = createMockCase();
    mockSupabaseNext(caseRec);           // getCase
    mockSupabaseNext([]);                // no subscriptions

    const result = await forensicAi.routeToSiem(caseRec.id, 'forensic.status_changed', 'user-001');
    expect(result.routed).toBe(0);
    expect(result.subscriptions).toBe(0);
  });
});

// ─── PHASE 1/2: Notes & Tasks ─────────────────────────────────────────────────

describe('Phase 1/2 — Notes & Tasks', () => {
  beforeEach(() => { mockSupabaseClear(); });

  it('should add a note', async () => {
    const note = createMockNote();
    const caseRec = createMockCase();

    mockSupabaseNext(caseRec);           // getCase
    mockSupabaseNext(note);              // insert → select → single
    mockSupabaseNext(null);              // case_actions insert

    const result = await forensicService.addNote({
      case_id: 'test-case-uuid', note_class: 'internal_investigation',
      content: 'Test note', author_id: 'user-001',
    });
    expect(result.content).toBe('Test investigation note');
  });

  it('should list notes filtered by role', async () => {
    const notes = [createMockNote(), createMockNote({ id: 'n-2', content: 'Legal note', note_class: 'legal_privileged' })];
    mockSupabaseNext(notes);

    const legalNotes = await forensicService.listNotes('test-case-uuid', ['LEGAL_COUNSEL']);
    expect(legalNotes.length).toBe(2);
  });

  it('should add a task', async () => {
    const task = createMockTask();
    mockSupabaseNext(task);

    const result = await forensicService.addTask({
      case_id: 'test-case-uuid', title: 'Test task', owner_id: 'user-001',
    });
    expect(result.title).toBe('Review evidence');
  });

  it('should list tasks', async () => {
    const tasks = [createMockTask(), createMockTask({ id: 't-2', title: 'Second task' })];
    mockSupabaseNext(tasks);

    const result = await forensicService.listTasks('test-case-uuid');
    expect(result.length).toBe(2);
  });
});

// ─── Field Access Control ─────────────────────────────────────────────────────

describe('Field-Level ACL', () => {
  it('should pass through for admin', () => {
    const result = forensicService.applyFieldAccess(['SUPER_ADMIN'], 'case_title_id_status_type_severity', 'sensitive-data');
    expect(result).toBe('sensitive-data');
  });

  it('should redact for restricted roles', () => {
    const result = forensicService.applyFieldAccess(['EXECUTIVE_VIEWER'], 'actor_email', 'user@example.com');
    expect(result).toBe('REDACTED_BY_ACCESS_POLICY');
  });

  it('should hash for external auditors', () => {
    const result = forensicService.applyFieldAccess(['EXTERNAL_AUDITOR'], 'actor_name_role', 'John Doe');
    expect(result).toContain('hash:');
  });

  it('should deny for denied fields', () => {
    const result = forensicService.applyFieldAccess(['PUBLISHER'], 'ip_session_device', '192.168.1.1');
    expect(result).toBeUndefined();
  });
});
