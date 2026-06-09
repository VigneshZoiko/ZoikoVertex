/**
 * Hardening trigger contract — static-analysis test.
 *
 * The audit noted that DB triggers cannot be exercised in CI (in-memory
 * Supabase mock does not execute triggers; full trigger behavior is verified
 * in staging via verifyGovernanceMigrations.ts). What we CAN prove in unit
 * tests is the *contract*: the migration file exists, declares the expected
 * trigger functions and trigger names, and the SQL body of each function
 * encodes the right allow / deny rules.
 *
 * This is a static-analysis regression guard — if a future edit accidentally
 * drops the evidence_id backfill allowance, or removes a trigger, this test
 * fails before the change ever ships.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const MIGRATION_PATH = path.resolve(
  __dirname,
  '../../../src/db/migrations/prompt_governance_immutability_hardening.sql',
);

function readMigration(): string {
  return fs.readFileSync(MIGRATION_PATH, 'utf8');
}

describe('prompt_governance_immutability_hardening.sql — static contract', () => {
  it('migration file exists', () => {
    expect(fs.existsSync(MIGRATION_PATH)).toBe(true);
  });

  it('declares all three expected trigger functions', () => {
    const sql = readMigration();
    expect(sql).toMatch(/CREATE OR REPLACE FUNCTION prompt_approvals_block_mutation/);
    expect(sql).toMatch(/CREATE OR REPLACE FUNCTION prompt_deployments_block_mutation/);
    expect(sql).toMatch(/CREATE OR REPLACE FUNCTION prompts_block_attribution_mutation/);
  });

  it('installs all three expected triggers with the documented names', () => {
    const sql = readMigration();
    expect(sql).toMatch(/CREATE TRIGGER\s+prompt_approvals_immutable_decision/);
    expect(sql).toMatch(/CREATE TRIGGER\s+prompt_deployments_immutable_record/);
    expect(sql).toMatch(/CREATE TRIGGER\s+prompts_immutable_attribution/);
  });

  it('uses BEFORE UPDATE OR DELETE for all three triggers', () => {
    const sql = readMigration();
    // Each trigger should fire on both UPDATE and DELETE.
    const triggerBlocks = sql.match(/CREATE TRIGGER[\s\S]+?EXECUTE FUNCTION[^;]+;/g) || [];
    expect(triggerBlocks.length).toBe(3);
    for (const block of triggerBlocks) {
      expect(block).toMatch(/BEFORE UPDATE OR DELETE/);
    }
  });

  it('prompt_approvals trigger explicitly allows evidence_id backfill', () => {
    const sql = readMigration();
    // The block must check evidence_id first and skip the rest of the
    // immutability checks when it changes.
    const approvalsFn = sql.match(
      /CREATE OR REPLACE FUNCTION prompt_approvals_block_mutation\(\)[\s\S]+?LANGUAGE plpgsql;/,
    );
    expect(approvalsFn).not.toBeNull();
    expect(approvalsFn![0]).toMatch(/OLD\.evidence_id\s+IS DISTINCT FROM\s+NEW\.evidence_id/);
    // The legitimate columns (decision, reviewer_role, reviewer_id) MUST
    // appear in the deny list.
    expect(approvalsFn![0]).toMatch(/OLD\.decision\s+IS DISTINCT FROM\s+NEW\.decision/);
    expect(approvalsFn![0]).toMatch(/OLD\.reviewer_role\s+IS DISTINCT FROM\s+NEW\.reviewer_role/);
    expect(approvalsFn![0]).toMatch(/OLD\.reviewer_id\s+IS DISTINCT FROM\s+NEW\.reviewer_id/);
  });

  it('prompt_deployments trigger explicitly allows evidence_id backfill', () => {
    const sql = readMigration();
    const depFn = sql.match(
      /CREATE OR REPLACE FUNCTION prompt_deployments_block_mutation\(\)[\s\S]+?LANGUAGE plpgsql;/,
    );
    expect(depFn).not.toBeNull();
    expect(depFn![0]).toMatch(/OLD\.evidence_id\s+IS DISTINCT FROM\s+NEW\.evidence_id/);
    expect(depFn![0]).toMatch(/OLD\.environment\s+IS DISTINCT FROM\s+NEW\.environment/);
    expect(depFn![0]).toMatch(/OLD\.prompt_version_id\s+IS DISTINCT FROM\s+NEW\.prompt_version_id/);
  });

  it('prompts trigger blocks only created_at + created_by (lifecycle stays mutable)', () => {
    const sql = readMigration();
    const promptsFn = sql.match(
      /CREATE OR REPLACE FUNCTION prompts_block_attribution_mutation\(\)[\s\S]+?LANGUAGE plpgsql;/,
    );
    expect(promptsFn).not.toBeNull();
    expect(promptsFn![0]).toMatch(/OLD\.created_at\s+IS DISTINCT FROM\s+NEW\.created_at/);
    expect(promptsFn![0]).toMatch(/OLD\.created_by\s+IS DISTINCT FROM\s+NEW\.created_by/);
    // The trigger must NOT enumerate other columns in the deny path — the
    // service layer is the lifecycle authority.
    expect(promptsFn![0]).not.toMatch(/OLD\.status\s+IS DISTINCT FROM\s+NEW\.status/);
    expect(promptsFn![0]).not.toMatch(/OLD\.current_version_id\s+IS DISTINCT FROM\s+NEW\.current_version_id/);
    expect(promptsFn![0]).not.toMatch(/OLD\.use_case_key\s+IS DISTINCT FROM\s+NEW\.use_case_key/);
  });

  it('all three triggers block DELETE explicitly', () => {
    const sql = readMigration();
    expect(sql).toMatch(/prompt_approvals is append-only; DELETE is not permitted/);
    expect(sql).toMatch(/prompt_deployments is append-only; DELETE is not permitted/);
    // For prompts we point operators at the lifecycle status instead.
    expect(sql).toMatch(/prompts: DELETE is not permitted — transition status to RETIRED or ARCHIVED/);
  });

  it('migration is idempotent (DROP TRIGGER IF EXISTS + CREATE OR REPLACE FUNCTION)', () => {
    const sql = readMigration();
    // All three triggers drop-then-recreate.
    const drops = sql.match(/DROP TRIGGER IF EXISTS/g) || [];
    expect(drops.length).toBeGreaterThanOrEqual(3);
    // All three functions are CREATE OR REPLACE.
    const replaces = sql.match(/CREATE OR REPLACE FUNCTION/g) || [];
    expect(replaces.length).toBeGreaterThanOrEqual(3);
  });
});
