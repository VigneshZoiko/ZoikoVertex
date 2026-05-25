import { describe, it, expect, beforeEach } from 'vitest';
import crypto from 'crypto';
import { mockSupabaseNext, mockSupabaseClear, mockQueryBuilder } from './setup';

import * as vaultService from '../services/evidenceVault.service';

// ─── Evidence Item Preservation ───────────────────────────────────────────────

describe('Evidence Vault — Preservation', () => {
  beforeEach(() => { mockSupabaseClear(); });

  it('should preserve an evidence item', async () => {
    const preserved = {
      id: 'vault-item-1', item_id: 'EVI-TEST-000001',
      source_type: 'audit_event', source_id: 'evt-001',
      source_system: 'audit_trail', vault_state: 'preserved',
      retention_class: 'standard', legal_hold: false,
      original_content_hash: 'abc123', preservation_receipt_hash: 'def456',
      metadata_hash: 'ghi789', hash_algorithm: 'SHA-256',
      preserved_by_actor_id: 'user-001', preservation_reason: 'QA test preserve',
      workspace_id: 'WRK-001', tenant_id: 'TEN-001',
      risk_level: 'medium', sensitivity: 'internal',
      contains_pii: false, contains_ai_output: false,
      jurisdictions: [], hold_ids: [],
      payload_ref: null, payload_size: 0, mime_type: null,
      verification_count: 0, last_verified_at: null, last_verified_by: null,
      captured_at: '2026-01-01T00:00:00Z',
      created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
      authority: null, origin_ip_hash: null,
      data_residency: 'auto', schema_version: '1.0',
      evidence_type: null, access_policy_id: null,
      metadata: {}, retention_until: null, source_timestamp_utc: null,
    };
    mockSupabaseNext(preserved);

    const result = await vaultService.preserveEvidence({
      source_type: 'audit_event', source_id: 'evt-001',
      source_system: 'audit_trail', preservation_reason: 'QA test preserve',
      preserved_by: 'user-001', workspace_id: 'WRK-001', tenant_id: 'TEN-001',
    });
    expect(result.item_id).toContain('EVI-');
    expect(result.vault_state).toBe('preserved');
  });

  it('should compute hashes during preservation', async () => {
    const preserved = {
      id: 'vault-item-2', item_id: 'EVI-TEST-000002',
      source_type: 'audit_event', source_id: 'evt-002',
      source_system: 'audit_trail', vault_state: 'preserved',
      retention_class: 'regulated', legal_hold: true,
      original_content_hash: 'mock-hash', normalization_content_hash: null,
      metadata_hash: 'mock-meta-hash', preservation_receipt_hash: 'mock-receipt',
      hash_algorithm: 'SHA-256',
      preserved_by_actor_id: 'user-001', preservation_reason: 'Regulatory preserve',
      workspace_id: 'WRK-001', tenant_id: 'TEN-001',
      risk_level: 'high', sensitivity: 'restricted',
      contains_pii: true, contains_ai_output: false,
      jurisdictions: ['GB', 'EU'], hold_ids: [],
      payload_ref: null, payload_size: 0, mime_type: null,
      verification_count: 0, last_verified_at: null, last_verified_by: null,
      captured_at: '2026-01-01T00:00:00Z',
      created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
      authority: null, origin_ip_hash: null,
      data_residency: 'auto', schema_version: '1.0',
      evidence_type: 'approval_override', access_policy_id: null,
      metadata: {}, retention_until: null, source_timestamp_utc: null,
    };
    mockSupabaseNext(preserved);

    const result = await vaultService.preserveEvidence({
      source_type: 'audit_event', source_id: 'evt-002',
      source_system: 'audit_trail', preservation_reason: 'Regulatory preserve',
      risk_level: 'high', sensitivity: 'restricted',
      contains_pii: true, jurisdictions: ['GB', 'EU'],
      retention_class: 'regulated',
      preserved_by: 'user-001', workspace_id: 'WRK-001', tenant_id: 'TEN-001',
    });
    expect(result.retention_class).toBe('regulated');
    expect(result.legal_hold).toBe(true);
  });
});

// ─── Listing and Retrieval ────────────────────────────────────────────────────

describe('Evidence Vault — Listing & Retrieval', () => {
  beforeEach(() => { mockSupabaseClear(); });

  it('should list evidence items', async () => {
    const items = [
      { id: 'vi-1', item_id: 'EVI-001', source_type: 'audit_event', vault_state: 'preserved', retention_class: 'standard', legal_hold: false, risk_level: 'medium', sensitivity: 'internal', preserved_by_actor_id: 'user-001', preservation_reason: 'test', evidence_type: null, verification_count: 0, created_at: '2026-01-01T00:00:00Z', source_id: 'src-1', source_system: 'audit_trail', captured_at: '2026-01-01T00:00:00Z', metadata: {}, jurisdictions: [], hold_ids: [], contains_pii: false, contains_ai_output: false, payload_ref: null, payload_size: 0, mime_type: null, last_verified_at: null, last_verified_by: null, authority: null, origin_ip_hash: null, data_residency: 'auto', schema_version: '1.0', access_policy_id: null, retention_until: null, source_timestamp_utc: null, workspace_id: 'WRK-001', tenant_id: 'TEN-001', original_content_hash: null, normalized_content_hash: null, metadata_hash: null, preservation_receipt_hash: null, hash_algorithm: 'SHA-256', updated_at: '2026-01-01T00:00:00Z' },
      { id: 'vi-2', item_id: 'EVI-002', source_type: 'forensic_case', vault_state: 'preserved', retention_class: 'extended', legal_hold: true, risk_level: 'high', sensitivity: 'restricted', preserved_by_actor_id: 'user-002', preservation_reason: 'test', evidence_type: null, verification_count: 1, created_at: '2026-01-02T00:00:00Z', source_id: 'src-2', source_system: 'forensic_hub', captured_at: '2026-01-02T00:00:00Z', metadata: {}, jurisdictions: [], hold_ids: [], contains_pii: false, contains_ai_output: false, payload_ref: null, payload_size: 0, mime_type: null, last_verified_at: null, last_verified_by: null, authority: null, origin_ip_hash: null, data_residency: 'auto', schema_version: '1.0', access_policy_id: null, retention_until: null, source_timestamp_utc: null, workspace_id: 'WRK-001', tenant_id: 'TEN-001', original_content_hash: null, normalized_content_hash: null, metadata_hash: null, preservation_receipt_hash: null, hash_algorithm: 'SHA-256', updated_at: '2026-01-02T00:00:00Z' },
    ];
    mockSupabaseNext(items, null, 2);

    const result = await vaultService.listEvidenceItems({ workspace_id: 'WRK-001' });
    expect(result.items.length).toBe(2);
    expect(result.total).toBe(2);
  });

  it('should get evidence item by id', async () => {
    const item = { id: 'vi-1', item_id: 'EVI-001', vault_state: 'preserved', created_at: '2026-01-01T00:00:00Z', workspace_id: 'WRK-001', tenant_id: 'TEN-001', source_id: 'src-1', source_system: 'audit_trail', source_type: 'audit_event', captured_at: '2026-01-01T00:00:00Z' };
    mockSupabaseNext(item);

    const result = await vaultService.getEvidenceItem('vi-1');
    expect(result).toBeTruthy();
    expect(result!.id).toBe('vi-1');
  });

  it('should return null for missing item', async () => {
    mockSupabaseNext(null);
    const result = await vaultService.getEvidenceItem('nonexistent');
    expect(result).toBeNull();
  });
});

// ─── Verification ─────────────────────────────────────────────────────────────

describe('Evidence Vault — Verification', () => {
  beforeEach(() => { mockSupabaseClear(); });

  it('should verify an evidence item (hashes match)', async () => {
    const metaInput = JSON.stringify({
      source_type: 'audit_event', source_id: 'evt-001',
      source_system: 'audit_trail', evidence_type: null,
      risk_level: 'medium', sensitivity: 'internal',
    });
    const expectedMetaHash = crypto.createHash('sha256').update(metaInput).digest('hex');
    const item = {
      id: 'vi-1', item_id: 'EVI-001', vault_state: 'preserved',
      source_type: 'audit_event', source_id: 'evt-001',
      source_system: 'audit_trail', evidence_type: null,
      risk_level: 'medium', sensitivity: 'internal',
      original_content_hash: null, metadata_hash: expectedMetaHash,
      payload_ref: null, verification_count: 0,
      workspace_id: 'WRK-001', tenant_id: 'TEN-001',
      preservation_receipt_hash: 'receipt-1', hash_algorithm: 'SHA-256',
      preserved_by_actor_id: 'user-001', preservation_reason: 'test',
      contains_pii: false, contains_ai_output: false,
      jurisdictions: [], hold_ids: [],
      captured_at: '2026-01-01T00:00:00Z',
      created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
      authority: null, origin_ip_hash: null, data_residency: 'auto',
      schema_version: '1.0', access_policy_id: null,
      metadata: {}, retention_class: 'standard', legal_hold: false,
      retention_until: null, source_timestamp_utc: null,
      payload_size: 0, mime_type: null, last_verified_at: null,
      last_verified_by: null,
    };
    mockSupabaseNext(item);  // getEvidenceItem
    mockSupabaseNext(null);  // update verification count

    const result = await vaultService.verifyEvidenceItem('vi-1', 'user-001');
    expect(result.verified).toBe(true);
    expect(result.original_hash_match).toBe(true);
  });

  it('should throw for missing item', async () => {
    mockSupabaseNext(null);
    await expect(vaultService.verifyEvidenceItem('nonexistent', 'user-001'))
      .rejects.toThrow('Evidence item not found');
  });
});

// ─── Collections ─────────────────────────────────────────────────────────────

describe('Evidence Vault — Collections', () => {
  beforeEach(() => { mockSupabaseClear(); });

  it('should create an evidence collection', async () => {
    const collection = {
      id: 'col-1', collection_id: 'COL-TEST-001',
      title: 'Test Collection', description: 'A test collection',
      workspace_id: 'WRK-001', tenant_id: 'TEN-001',
      created_by: 'user-001', created_reason: 'QA test',
      item_count: 0, initial_item_hash: 'abc',
      schema_version: '1.0', scope: {},
      created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
    };
    mockSupabaseNext(collection);

    const result = await vaultService.createCollection({
      workspace_id: 'WRK-001', tenant_id: 'TEN-001',
      title: 'Test Collection', description: 'A test collection',
      created_by: 'user-001', created_reason: 'QA test',
    });
    expect(result.collection_id).toContain('COL-');
    expect(result.title).toBe('Test Collection');
  });

  it('should list collections', async () => {
    const collections = [
      { id: 'col-1', collection_id: 'COL-001', title: 'Collection 1', workspace_id: 'WRK-001', tenant_id: 'TEN-001', created_by: 'user-001', created_reason: null, item_count: 0, initial_item_hash: null, schema_version: '1.0', scope: {}, description: null, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
    ];
    mockSupabaseNext(collections, null, 1);

    const result = await vaultService.listCollections({ workspace_id: 'WRK-001' });
    expect(result.collections.length).toBe(1);
    expect(result.total).toBe(1);
  });

  it('should add items to a collection', async () => {
    const collection = {
      id: 'col-1', collection_id: 'COL-001', title: 'Test',
      item_count: 0, workspace_id: 'WRK-001', tenant_id: 'TEN-001',
      created_by: 'user-001', description: null, scope: {},
      initial_item_hash: null, created_reason: null,
      schema_version: '1.0',
      created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
    };
    mockSupabaseNext(collection);  // getCollection
    mockSupabaseNext(null);        // insert items
    mockSupabaseNext(null);        // update item_count

    const result = await vaultService.addItemsToCollection('col-1', ['vi-1', 'vi-2'], 'user-001', 'QA add');
    expect(result.added).toBe(2);
  });

  it('should throw for missing collection when adding items', async () => {
    mockSupabaseNext(null);
    await expect(vaultService.addItemsToCollection('nonexistent', ['vi-1'], 'user-001'))
      .rejects.toThrow('Collection not found');
  });
});

// ─── Health ───────────────────────────────────────────────────────────────────

describe('Evidence Vault — Health', () => {
  beforeEach(() => { mockSupabaseClear(); });

  it('should return vault health metrics', async () => {
    const items = [
      { vault_state: 'preserved' },
      { vault_state: 'preserved' },
      { vault_state: 'legal_hold' },
    ];

    mockSupabaseNext(undefined, null, 3);  // count total (count=3)
    mockSupabaseNext(items);               // state breakdown
    mockSupabaseNext(undefined, null, 1);  // count failed verifications (count=1)

    const result = await vaultService.getVaultHealth();
    expect(result.total_items).toBe(3);
  });
});

// ─── Phase 2: Packages ────────────────────────────────────────────────────────

describe('Evidence Vault Phase 2 — Packages', () => {
  beforeEach(() => { mockSupabaseClear(); });

  it('should create a package', async () => {
    const pkg = {
      id: 'pkg-1', package_id: 'PKG-TEST-001',
      workspace_id: 'WRK-001', tenant_id: 'TEN-001',
      package_type: 'regulatory_response', title: 'Regulatory Package',
      description: null, source_collection_id: null,
      manifest: null, manifest_hash: null, prior_manifest_hash: null,
      template_version: '1.0', redaction_policy_version: '1.0',
      item_count: 0, status: 'draft',
      is_complete: false, is_redacted: false,
      is_partially_redacted: false, is_externally_shared: false,
      created_by: 'user-001', approved_by: null, metadata: {},
      created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
      sealed_at: null, exported_at: null,
    };
    mockSupabaseNext(pkg);

    const result = await vaultService.createPackage({
      workspace_id: 'WRK-001', tenant_id: 'TEN-001',
      package_type: 'regulatory_response', title: 'Regulatory Package',
      created_by: 'user-001',
    });
    expect(result.package_id).toContain('PKG-');
    expect(result.package_type).toBe('regulatory_response');
  });

  it('should create a package with items', async () => {
    const pkg = {
      id: 'pkg-2', package_id: 'PKG-TEST-002',
      workspace_id: 'WRK-001', tenant_id: 'TEN-001',
      package_type: 'litigation_hold', title: 'Litigation Package',
      item_count: 0, status: 'draft',
      is_complete: false, is_redacted: false,
      is_partially_redacted: false, is_externally_shared: false,
      created_by: 'user-001', metadata: {},
      template_version: '1.0', redaction_policy_version: '1.0',
      description: null, source_collection_id: null,
      manifest: null, manifest_hash: null, prior_manifest_hash: null,
      approved_by: null,
      created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
      sealed_at: null, exported_at: null,
    };
    mockSupabaseNext(pkg);      // insert package
    mockSupabaseNext(null);     // insert package_items
    mockSupabaseNext(null);     // update item_count

    const result = await vaultService.createPackage({
      workspace_id: 'WRK-001', tenant_id: 'TEN-001',
      package_type: 'litigation_hold', title: 'Litigation Package',
      item_ids: ['vi-1', 'vi-2'],
      created_by: 'user-001',
    });
    expect(result.package_id).toContain('PKG-');
    expect(result.item_count).toBe(2);
  });

  it('should get package by id', async () => {
    const pkg = { id: 'pkg-1', package_id: 'PKG-001', title: 'Test Package', workspace_id: 'WRK-001', status: 'draft', package_type: 'regulatory_response', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' };
    mockSupabaseNext(pkg);

    const result = await vaultService.getPackage('pkg-1');
    expect(result).toBeTruthy();
    expect(result!.id).toBe('pkg-1');
  });

  it('should list packages', async () => {
    const packages = [
      { id: 'pkg-1', package_id: 'PKG-001', title: 'Package 1', workspace_id: 'WRK-001', package_type: 'regulatory_response', status: 'draft', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
    ];
    mockSupabaseNext(packages, null, 1);

    const result = await vaultService.listPackages({ workspace_id: 'WRK-001' });
    expect(result.packages.length).toBe(1);
    expect(result.total).toBe(1);
  });

  it('should seal a package with manifest', async () => {
    const pkg = {
      id: 'pkg-1', package_id: 'PKG-001',
      workspace_id: 'WRK-001', tenant_id: 'TEN-001',
      package_type: 'regulatory_response', title: 'Test',
      template_version: '1.0', redaction_policy_version: '1.0',
      manifest_hash: null,
      description: null, source_collection_id: null,
      manifest: null, prior_manifest_hash: null,
      item_count: 0, status: 'draft',
      is_complete: false, is_redacted: false,
      is_partially_redacted: false, is_externally_shared: false,
      created_by: 'user-001', approved_by: null, metadata: {},
      created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
      sealed_at: null, exported_at: null,
    };
    const pkgItems: any[] = [];
    const sealed = {
      ...pkg, status: 'sealed', is_complete: true,
      manifest: { manifest_id: 'MAN-PKG-001-123' },
      manifest_hash: 'abc123def456',
      sealed_at: '2026-01-02T00:00:00Z',
    };

    mockSupabaseNext(pkg);      // getPackage
    mockSupabaseNext(pkgItems); // package_items select
    mockSupabaseNext(sealed);   // update and seal

    const result = await vaultService.sealPackage('pkg-1', 'user-001');
    expect(result.status).toBe('sealed');
    expect(result.manifest_hash).toBeTruthy();
  });

  it('should get package manifest', async () => {
    const manifest = { items: [], manifest_id: 'MAN-001', generated_at: '2026-01-01T00:00:00Z' };
    const pkg = { id: 'pkg-1', package_id: 'PKG-001', manifest, workspace_id: 'WRK-001', title: 'Test' };
    mockSupabaseNext(pkg);

    const result = await vaultService.getPackageManifest('pkg-1');
    expect(result).toEqual(manifest);
  });

  it('should verify a sealed package', async () => {
    const pkg = {
      id: 'pkg-1', package_id: 'PKG-001',
      workspace_id: 'WRK-001', tenant_id: 'TEN-001',
      package_type: 'regulatory_response', title: 'Test',
      template_version: '1.0', redaction_policy_version: '1.0',
      manifest: { items: [] },
      manifest_hash: crypto.createHash('sha256').update(JSON.stringify({ items: [] })).digest('hex'),
      description: null, source_collection_id: null, prior_manifest_hash: null,
      item_count: 0, status: 'sealed',
      is_complete: true, is_redacted: false,
      is_partially_redacted: false, is_externally_shared: false,
      created_by: 'user-001', approved_by: null, metadata: {},
      created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-02T00:00:00Z',
      sealed_at: '2026-01-02T00:00:00Z', exported_at: null,
    };
    const pkgItems: any[] = [];

    mockSupabaseNext(pkg);      // getPackage
    mockSupabaseNext(pkgItems); // package_items select

    const result = await vaultService.verifyPackage('pkg-1', 'user-001');
    expect(result.verified).toBe(true);
    expect(result.manifest_hash_match).toBe(true);
  });

  it('should throw error for non-existent package during seal', async () => {
    mockSupabaseNext(null);
    await expect(vaultService.sealPackage('nonexistent', 'user-001'))
      .rejects.toThrow('Package not found');
  });
});

// ─── Phase 2: Exports ─────────────────────────────────────────────────────────

describe('Evidence Vault Phase 2 — Exports', () => {
  beforeEach(() => { mockSupabaseClear(); });

  it('should create an export for a sealed package', async () => {
    const pkg = { id: 'pkg-1', package_id: 'PKG-001', workspace_id: 'WRK-001', status: 'sealed', package_type: 'regulatory_response', title: 'Test' };
    const exp = {
      id: 'exp-1', export_id: 'EXP-TEST-001',
      package_id: 'pkg-1', workspace_id: 'WRK-001', tenant_id: 'TEN-001',
      requester_id: 'user-001', disclosure_mode: 'external_regulator',
      status: 'requested',
      approver_id: null, redaction_policy_id: null,
      export_hash: null, file_size: 0, mime_type: 'application/zip',
      requester_reason: null, delivery_method: null,
      expires_at: null, completed_at: null,
      created_at: '2026-01-01T00:00:00Z',
    };

    mockSupabaseNext(pkg);  // getPackage
    mockSupabaseNext(exp);  // insert export

    const result = await vaultService.createExport({
      package_id: 'pkg-1', workspace_id: 'WRK-001', tenant_id: 'TEN-001',
      requester_id: 'user-001', disclosure_mode: 'external_regulator',
    });
    expect(result.export_id).toContain('EXP-');
    expect(result.status).toBe('requested');
  });

  it('should throw if package not sealed for export', async () => {
    const pkg = { id: 'pkg-1', package_id: 'PKG-001', workspace_id: 'WRK-001', status: 'draft' };
    mockSupabaseNext(pkg);
    await expect(vaultService.createExport({
      package_id: 'pkg-1', workspace_id: 'WRK-001', tenant_id: 'TEN-001',
      requester_id: 'user-001', disclosure_mode: 'external_regulator',
    })).rejects.toThrow('Package must be sealed');
  });

  it('should get export receipt', async () => {
    const exp = { id: 'exp-1', export_id: 'EXP-001', status: 'ready', package_id: 'pkg-1', workspace_id: 'WRK-001', requester_id: 'user-001', disclosure_mode: 'external_regulator', created_at: '2026-01-01T00:00:00Z' };
    mockSupabaseNext(exp);

    const result = await vaultService.getExportReceipt('exp-1');
    expect(result).toBeTruthy();
    expect(result!.export_id).toBe('EXP-001');
  });

  it('should list exports', async () => {
    const exports = [
      { id: 'exp-1', export_id: 'EXP-001', package_id: 'pkg-1', workspace_id: 'WRK-001', requester_id: 'user-001', disclosure_mode: 'external_regulator', status: 'ready', created_at: '2026-01-01T00:00:00Z' },
    ];
    mockSupabaseNext(exports, null, 1);

    const result = await vaultService.listExports({ workspace_id: 'WRK-001' });
    expect(result.exports.length).toBe(1);
    expect(result.total).toBe(1);
  });
});

// ─── Phase 2: Legal Holds ─────────────────────────────────────────────────────

describe('Evidence Vault Phase 2 — Legal Holds', () => {
  beforeEach(() => { mockSupabaseClear(); });

  it('should apply a legal hold to an item', async () => {
    const hold = {
      id: 'hold-1', hold_id: 'HLD-TEST-001',
      workspace_id: 'WRK-001', tenant_id: 'TEN-001',
      scope_type: 'item', scope_id: 'vi-1',
      matter_ref: 'MATTER-001', jurisdiction: 'GB',
      reason: 'Active litigation', requester_id: 'user-001',
      effective_date: '2026-01-01', released: false,
      approver_id: null, scope_query: null, review_date: null,
      released_at: null, released_reason: null, released_by: null,
      created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
    };
    const item = { id: 'vi-1', hold_ids: [], legal_hold: false };

    mockSupabaseNext(hold); // insert hold
    mockSupabaseNext(item); // select evidence item
    mockSupabaseNext(null); // update evidence item

    const result = await vaultService.applyHold({
      workspace_id: 'WRK-001', tenant_id: 'TEN-001',
      scope_type: 'item', scope_id: 'vi-1',
      matter_ref: 'MATTER-001', jurisdiction: 'GB',
      reason: 'Active litigation', requester_id: 'user-001',
      effective_date: '2026-01-01',
    });
    expect(result.hold_id).toContain('HLD-');
    expect(result.released).toBe(false);
  });

  it('should list holds', async () => {
    const holds = [
      { id: 'hold-1', hold_id: 'HLD-001', scope_type: 'item', matter_ref: 'MATTER-001', released: false, workspace_id: 'WRK-001', reason: 'Litigation', requester_id: 'user-001', effective_date: '2026-01-01', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
    ];
    mockSupabaseNext(holds, null, 1);

    const result = await vaultService.listHolds({ workspace_id: 'WRK-001' });
    expect(result.holds.length).toBe(1);
    expect(result.total).toBe(1);
  });

  it('should release an active hold', async () => {
    const hold = {
      id: 'hold-1', hold_id: 'HLD-001',
      workspace_id: 'WRK-001', tenant_id: 'TEN-001',
      scope_type: 'item', scope_id: 'vi-1',
      matter_ref: 'MATTER-001', released: false,
      reason: 'Active litigation', requester_id: 'user-001',
      jurisdiction: null, approver_id: null, scope_query: null, review_date: null,
      released_at: null, released_reason: null, released_by: null,
      effective_date: '2026-01-01',
      created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
    };
    const released = { ...hold, released: true, released_at: '2026-01-02T00:00:00Z', released_reason: 'Matter resolved', released_by: 'user-002' };
    const item = { id: 'vi-1', hold_ids: ['HLD-001'], legal_hold: true };

    mockSupabaseNext(hold);     // getHold
    mockSupabaseNext(released); // update hold
    mockSupabaseNext(item);     // select evidence item (updateHoldOnItems)
    mockSupabaseNext(null);     // update evidence item

    const result = await vaultService.releaseHold('hold-1', 'user-002', 'Matter resolved');
    expect(result!.released).toBe(true);
    expect(result!.released_reason).toBe('Matter resolved');
  });

  it('should throw error for non-existent hold', async () => {
    mockSupabaseNext(null);
    await expect(vaultService.releaseHold('nonexistent', 'user-001', 'No reason'))
      .rejects.toThrow('Hold not found');
  });

  it('should throw error for already released hold', async () => {
    const hold = { id: 'hold-1', hold_id: 'HLD-001', released: true, workspace_id: 'WRK-001', scope_type: 'item', matter_ref: 'MATTER-001', reason: 'test', requester_id: 'user-001', effective_date: '2026-01-01', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' };
    mockSupabaseNext(hold);
    await expect(vaultService.releaseHold('hold-1', 'user-001', 'Already done'))
      .rejects.toThrow('Hold already released');
  });
});

// ─── Phase 2: Redaction Policies ──────────────────────────────────────────────

describe('Evidence Vault Phase 2 — Redaction Policies', () => {
  beforeEach(() => { mockSupabaseClear(); });

  it('should create a redaction policy', async () => {
    const policy = {
      id: 'rp-1', policy_id: 'RP-TEST-001',
      name: 'External Regulator Policy',
      description: 'Redaction for regulator disclosure',
      policy_version: '1.0',
      rules: [{ field: 'email', action: 'mask' }],
      created_by: 'user-001',
      created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
    };
    mockSupabaseNext(policy);

    const result = await vaultService.createRedactionPolicy({
      name: 'External Regulator Policy',
      description: 'Redaction for regulator disclosure',
      rules: [{ field: 'email', action: 'mask' }],
      created_by: 'user-001',
    });
    expect(result.policy_id).toContain('RP-');
    expect(result.rules.length).toBe(1);
  });

  it('should list redaction policies', async () => {
    const policies = [
      { id: 'rp-1', policy_id: 'RP-001', name: 'Policy 1', policy_version: '1.0', rules: [], created_by: 'user-001', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
    ];
    mockSupabaseNext(policies);

    const result = await vaultService.listRedactionPolicies();
    expect(result.length).toBe(1);
  });
});

// ─── Phase 3: External Shares ─────────────────────────────────────────────────

describe('Evidence Vault Phase 3 — External Shares', () => {
  beforeEach(() => { mockSupabaseClear(); });

  it('should create an external share', async () => {
    const pkg = { id: 'pkg-1', package_id: 'PKG-001', workspace_id: 'WRK-001', status: 'sealed', package_type: 'regulatory_response', title: 'Test' };
    const share = {
      id: 'shr-1', share_id: 'SHR-TEST-001',
      package_id: 'pkg-1', workspace_id: 'WRK-001', tenant_id: 'TEN-001',
      recipient_email: 'auditor@example.com', recipient_name: null,
      access_token: 'abc123', token_hash: 'def456',
      disclosure_mode: 'external_auditor_portal',
      redaction_policy_id: null,
      expires_at: '2027-01-01T00:00:00Z',
      max_views: 10, current_views: 0,
      watermark: null, allow_download: false, require_mfa: false,
      last_accessed_at: null, revoked: false,
      revoked_at: null, revoked_by: null,
      created_by: 'user-001',
      created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
    };

    mockSupabaseNext(pkg);   // getPackage
    mockSupabaseNext(share); // insert share

    const result = await vaultService.createShare({
      package_id: 'pkg-1', workspace_id: 'WRK-001', tenant_id: 'TEN-001',
      recipient_email: 'auditor@example.com',
      expires_at: '2027-01-01T00:00:00Z',
      max_views: 10,
      created_by: 'user-001',
    });
    expect(result.share_id).toContain('SHR-');
    expect(result.recipient_email).toBe('auditor@example.com');
  });

  it('should throw for non-sealed package on share', async () => {
    const pkg = { id: 'pkg-1', package_id: 'PKG-001', workspace_id: 'WRK-001', status: 'draft' };
    mockSupabaseNext(pkg);
    await expect(vaultService.createShare({
      package_id: 'pkg-1', workspace_id: 'WRK-001', tenant_id: 'TEN-001',
      recipient_email: 'auditor@example.com',
      expires_at: '2027-01-01T00:00:00Z',
      created_by: 'user-001',
    })).rejects.toThrow('Package must be sealed');
  });

  it('should list shares', async () => {
    const shares = [
      { id: 'shr-1', share_id: 'SHR-001', package_id: 'pkg-1', workspace_id: 'WRK-001', recipient_email: 'auditor@example.com', disclosure_mode: 'external_auditor_portal', expires_at: '2027-01-01T00:00:00Z', revoked: false, created_by: 'user-001', created_at: '2026-01-01T00:00:00Z' },
    ];
    mockSupabaseNext(shares, null, 1);

    const result = await vaultService.listShares({ workspace_id: 'WRK-001' });
    expect(result.shares.length).toBe(1);
    expect(result.total).toBe(1);
  });

  it('should revoke an active share', async () => {
    const share = {
      id: 'shr-1', share_id: 'SHR-001', package_id: 'pkg-1',
      workspace_id: 'WRK-001', tenant_id: 'TEN-001',
      recipient_email: 'auditor@example.com',
      revoked: false, expires_at: '2027-01-01T00:00:00Z',
      max_views: 0, current_views: 0,
      disclosure_mode: 'external_auditor_portal',
      allow_download: false, require_mfa: false,
      access_token: 'tok', token_hash: 'hash',
      watermark: null, redaction_policy_id: null,
      recipient_name: null, last_accessed_at: null,
      revoked_at: null, revoked_by: null,
      created_by: 'user-001',
      created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
    };
    const revoked = { ...share, revoked: true, revoked_at: '2026-01-02T00:00:00Z', revoked_by: 'user-002' };

    mockSupabaseNext(share);   // getShare
    mockSupabaseNext(revoked); // update share

    const result = await vaultService.revokeShare('shr-1', 'user-002');
    expect(result!.revoked).toBe(true);
    expect(result!.revoked_by).toBe('user-002');
  });

  it('should throw for already revoked share', async () => {
    const share = { id: 'shr-1', share_id: 'SHR-001', revoked: true, package_id: 'pkg-1', workspace_id: 'WRK-001' };
    mockSupabaseNext(share);
    await expect(vaultService.revokeShare('shr-1', 'user-001'))
      .rejects.toThrow('Share already revoked');
  });

  it('should log share access and increment views', async () => {
    mockSupabaseNext(null);                    // insert access log
    mockSupabaseNext({ current_views: 0 });    // select current_views
    mockSupabaseNext(null);                    // update view count + last_accessed_at

    await vaultService.logShareAccess('shr-1', { viewer_ip_hash: 'ip-hash', package_section: 'manifest' });
    // No return value — just verify no error
    expect(true).toBe(true);
  });

  it('should validate share access correctly', async () => {
    const token = 'valid-token';
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const share = {
      id: 'shr-1', share_id: 'SHR-001', package_id: 'pkg-1',
      workspace_id: 'WRK-001', revoked: false,
      expires_at: '2027-01-01T00:00:00Z',
      max_views: 0, current_views: 0,
      token_hash: tokenHash,
      recipient_email: 'auditor@example.com',
      disclosure_mode: 'external_auditor_portal',
      allow_download: false, require_mfa: false,
      watermark: null, redaction_policy_id: null,
      access_token: token,
      recipient_name: null, last_accessed_at: null,
      revoked_at: null, revoked_by: null,
      created_by: 'user-001',
      created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
    };
    mockSupabaseNext(share);

    const result = await vaultService.validateShareAccess('shr-1', token);
    expect(result.valid).toBe(true);
  });

  it('should reject expired share', async () => {
    const share = {
      id: 'shr-1', share_id: 'SHR-001', package_id: 'pkg-1',
      workspace_id: 'WRK-001', revoked: false,
      expires_at: '2020-01-01T00:00:00Z',
      max_views: 0, current_views: 0,
      token_hash: 'any-hash',
      recipient_email: 'auditor@example.com',
      disclosure_mode: 'external_auditor_portal',
      allow_download: false, require_mfa: false,
      watermark: null, redaction_policy_id: null,
      access_token: 'tok',
      recipient_name: null, last_accessed_at: null,
      revoked_at: null, revoked_by: null,
      created_by: 'user-001',
      created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
    };
    mockSupabaseNext(share);

    const result = await vaultService.validateShareAccess('shr-1', 'any-token');
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('Share has expired');
  });

  it('should retrieve share access logs', async () => {
    const logs = [
      { id: 'log-1', share_id: 'shr-1', viewer_ip_hash: 'ip-1', user_agent: 'Mozilla', package_section: 'manifest', viewed_at: '2026-01-01T00:00:00Z' },
    ];
    mockSupabaseNext(logs);

    const result = await vaultService.getShareAccessLogs('shr-1');
    expect(result.length).toBe(1);
  });
});

// ─── Phase 3: DLP Scanning ────────────────────────────────────────────────────

describe('Evidence Vault Phase 3 — DLP Scanning', () => {
  beforeEach(() => { mockSupabaseClear(); });

  it('should run a DLP scan on a sealed package', async () => {
    const pkg = {
      id: 'pkg-1', package_id: 'PKG-001', workspace_id: 'WRK-001',
      status: 'sealed', package_type: 'regulatory_response', title: 'Test',
      manifest: { items: [] },
    };
    const scan = {
      id: 'scan-1', package_id: 'pkg-1',
      scan_status: 'passed', findings: [],
      scan_report: 'No issues detected.',
      detection_category: null, reviewer: null,
      remediation_state: null, scanned_by_worker: 'user-001',
      completed_at: '2026-01-01T00:00:00Z',
      created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
    };

    mockSupabaseNext(pkg);  // getPackage
    mockSupabaseNext(scan); // insert scan

    const result = await vaultService.runDlpScan('pkg-1', 'user-001');
    expect(result.scan_status).toBe('passed');
    expect(result.findings).toEqual([]);
  });

  it('should get DLP scan by id', async () => {
    const scan = { id: 'scan-1', package_id: 'pkg-1', scan_status: 'passed', findings: [], created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' };
    mockSupabaseNext(scan);

    const result = await vaultService.getDlpScan('scan-1');
    expect(result).toBeTruthy();
    expect(result!.id).toBe('scan-1');
  });

  it('should list DLP scans by package', async () => {
    const scans = [
      { id: 'scan-1', package_id: 'pkg-1', scan_status: 'passed', findings: [], created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
    ];
    mockSupabaseNext(scans, null, 1);

    const result = await vaultService.listDlpScans({ package_id: 'pkg-1' });
    expect(result.scans.length).toBe(1);
    expect(result.total).toBe(1);
  });
});

// ─── Phase 4: Advanced Assurance ─────────────────────────────────────────────

describe('Evidence Vault Phase 4 — Advanced Assurance', () => {
  beforeEach(() => {
    mockSupabaseClear();
    mockQueryBuilder.select.mockClear();
    mockQueryBuilder.insert.mockClear();
    mockQueryBuilder.eq.mockClear();
  });

  it('should scope async job lookup to the workspace', async () => {
    const job = {
      id: 'job-1',
      job_id: 'JOB-001',
      job_type: 'dlp_scan',
      status: 'queued',
      priority: 0,
      progress: 0,
      total: 0,
      params: {},
      result: null,
      error_message: null,
      retry_count: 0,
      max_retries: 3,
      workspace_id: 'WRK-001',
      tenant_id: 'TEN-001',
      created_by: 'user-001',
      idempotency_key: null,
      created_at: '2026-01-01T00:00:00Z',
      started_at: null,
      completed_at: null,
    };
    mockSupabaseNext(job);

    const result = await vaultService.getAsyncJob('job-1', 'WRK-001');
    expect(result?.id).toBe('job-1');
    expect(mockQueryBuilder.eq).toHaveBeenCalledWith('workspace_id', 'WRK-001');
  });

  it('should reject creating a chain anchor without a target', async () => {
    await expect(vaultService.createChainAnchor({
      workspace_id: 'WRK-001',
      tenant_id: 'TEN-001',
      anchor_provider: 'test-ledger',
      created_by: 'user-001',
    })).rejects.toThrow('package_id or item_id is required');
  });

  it('should resolve scope before creating a chain anchor', async () => {
    const pkg = { id: 'pkg-1', workspace_id: 'WRK-001', tenant_id: 'TEN-001' };
    const anchor = {
      id: 'anchor-1',
      anchor_id: 'ANCHOR-001',
      package_id: 'pkg-1',
      item_id: null,
      workspace_id: 'WRK-001',
      tenant_id: 'TEN-001',
      anchor_provider: 'test-ledger',
      anchor_tx_hash: null,
      anchor_timestamp: null,
      anchor_data: {},
      status: 'pending',
      created_by: 'user-001',
      created_at: '2026-01-01T00:00:00Z',
      confirmed_at: null,
    };
    mockSupabaseNext(pkg);
    mockSupabaseNext(anchor);

    const result = await vaultService.createChainAnchor({
      package_id: 'pkg-1',
      workspace_id: 'WRK-001',
      tenant_id: 'TEN-001',
      anchor_provider: 'test-ledger',
      created_by: 'user-001',
    });

    expect(result.workspace_id).toBe('WRK-001');
    expect(mockQueryBuilder.insert).toHaveBeenCalledWith(expect.objectContaining({
      workspace_id: 'WRK-001',
      tenant_id: 'TEN-001',
    }));
  });

  it('should scope template version listing to the workspace', async () => {
    const templates = [
      {
        id: 'tpl-1',
        template_id: 'TPL-001',
        workspace_id: 'WRK-001',
        tenant_id: 'TEN-001',
        package_type: 'regulatory_response',
        template_version: '1.0',
        schema: {},
        is_active: true,
        created_by: 'user-001',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
    ];
    mockSupabaseNext(templates);

    const result = await vaultService.listTemplateVersions({ workspace_id: 'WRK-001' });
    expect(result.length).toBe(1);
    expect(mockQueryBuilder.eq).toHaveBeenCalledWith('workspace_id', 'WRK-001');
  });
});
