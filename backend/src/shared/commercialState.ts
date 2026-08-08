import { supabaseAdmin } from './supabase';
import { logger } from './logger';

// ─────────────────────────────────────────────────────────────────────────────
// ZV-COM-BILL-001 — Commercial Billing Standard
// Single source of truth for billing classification, subscription status,
// dunning resolution, trial settlement, and per-plan capacity caps.
// ─────────────────────────────────────────────────────────────────────────────

export const BILLING_CLASSIFICATIONS = [
  'COMMERCIAL',
  'FREE_STARTER',
  'EVALUATION_NON_BILLABLE',
  'INTERNAL',
  'DEMO',
  'QA',
  'STAGING',
  'PARTNER_SANDBOX',
  'MIGRATION_HOLD',
] as const;

export type BillingClassification = (typeof BILLING_CLASSIFICATIONS)[number];

export const SUBSCRIPTION_STATUSES = [
  'FREE_ACTIVE',
  'TRIAL_GROWTH',
  'ACTIVE',
  'PAST_DUE',
  'COMMERCIAL_RESTRICTED',
  'EXECUTION_RESTRICTED',
  'SUSPENDED_SAFE_MODE',
  'CANCEL_AT_PERIOD_END',
  'CANCELED',
  'TERMINATED',
] as const;

export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

// §19.1 — only COMMERCIAL may generate live charges. Everything else is
// non-billable by default; conversion requires affirmative checkout/Order Form.
export const NON_BILLABLE_CLASSIFICATIONS: readonly BillingClassification[] = [
  'INTERNAL', 'DEMO', 'QA', 'STAGING', 'PARTNER_SANDBOX', 'MIGRATION_HOLD',
];

// §4 — Canonical Plan & Entitlement Architecture capacity caps.
export const PLAN_CAPS: Record<
  string,
  { users: number; profiles: number; brands: number; historyMonths: number | null }
> = {
  FREE:       { users: 2,  profiles: 2,  brands: 1,  historyMonths: null }, // Starter history BLOCKED pending approval
  STARTER:    { users: 2,  profiles: 2,  brands: 1,  historyMonths: null },
  GROWTH:     { users: 7,  profiles: 8,  brands: 1,  historyMonths: 12 },
  SCALE:      { users: 20, profiles: 25, brands: 5,  historyMonths: 24 },
  ENTERPRISE: { users: -1, profiles: -1, brands: -1, historyMonths: -1 }, // contract-defined
};

// §13 — Dunning ladder (days since last payment failure).
// Day 0–3  PAST_DUE                 — notify, retries, no destructive action
// Day 3–7  COMMERCIAL_RESTRICTED    — freeze plan/add-on expansion, new write connectors
// Day 7–14 EXECUTION_RESTRICTED     — block new campaigns, autonomous schedules, budget increases
// Day 14–30 SUSPENDED_SAFE_MODE     — block all consequential outbound writes; keep read/export/remediation
// Day 30+  TERMINATED               — subscription terminated; retrieval path only
export const DUNNING_STATES: { maxDays: number; status: SubscriptionStatus }[] = [
  { maxDays: 3,  status: 'PAST_DUE' },
  { maxDays: 7,  status: 'COMMERCIAL_RESTRICTED' },
  { maxDays: 14, status: 'EXECUTION_RESTRICTED' },
  { maxDays: 30, status: 'SUSPENDED_SAFE_MODE' },
  { maxDays: Infinity, status: 'TERMINATED' },
];

export interface ExecutionPermissions {
  publish: boolean;        // outbound publish / content commit
  campaignCreate: boolean; // new campaign launch
  budgetIncrease: boolean; // automated budget / spend-envelope increases
  connectorWrite: boolean; // new write-connector activation
}

export interface BillingState {
  billing_classification: BillingClassification | string;
  subscription_status: SubscriptionStatus | string;
  trial_active: boolean;
  trial_ends_at: string | null;
  dunning_days: number | null;
  execution: ExecutionPermissions;
  plan: string;
}

export function dunningStatusFor(failedAt: string | null | undefined, now: Date = new Date()): { status: SubscriptionStatus | null; days: number | null } {
  if (!failedAt) return { status: null, days: null };
  const failed = new Date(failedAt);
  const days = Math.floor((now.getTime() - failed.getTime()) / (24 * 60 * 60 * 1000));
  if (days < 0) return { status: null, days: 0 };
  const found = DUNNING_STATES.find((s) => days <= s.maxDays) ?? DUNNING_STATES[DUNNING_STATES.length - 1];
  return { status: found.status, days };
}

export function executionPermissionsFor(status: SubscriptionStatus | string): ExecutionPermissions {
  switch (status) {
    case 'PAST_DUE':
      // Notify + retries; block new paid add-ons / plan expansion only.
      return { publish: true, campaignCreate: true, budgetIncrease: true, connectorWrite: true };
    case 'COMMERCIAL_RESTRICTED':
      return { publish: true, campaignCreate: true, budgetIncrease: false, connectorWrite: false };
    case 'EXECUTION_RESTRICTED':
      return { publish: true, campaignCreate: false, budgetIncrease: false, connectorWrite: false };
    case 'SUSPENDED_SAFE_MODE':
    case 'TERMINATED':
      return { publish: false, campaignCreate: false, budgetIncrease: false, connectorWrite: false };
    default:
      return { publish: true, campaignCreate: true, budgetIncrease: true, connectorWrite: true };
  }
}

export interface ResolvedBillingStateInput {
  plan_type?: string | null;
  billing_classification?: string | null;
  subscription_status?: string | null;
  trial_ends_at?: string | null;
}

export interface WalletStateInput {
  last_payment_failed_at?: string | null;
}

// Resolve the *effective* billing state for a workspace.
//  - Expired trials resolve to Starter/free without deleting data (§6.5).
//  - Active/cancelling subscriptions with a payment failure age into the dunning ladder.
export async function resolveBillingState(
  workspace: ResolvedBillingStateInput,
  wallet?: WalletStateInput | null,
  now: Date = new Date(),
): Promise<{ state: BillingState; needsSettlement: boolean }> {
  let status = (workspace.subscription_status ?? 'FREE_ACTIVE') as SubscriptionStatus | string;
  let plan = (workspace.plan_type ?? 'FREE').toUpperCase();
  // Effective classification — an expired trial resolves to FREE_STARTER (§6.5),
  // matching what settleBillingState persists, so the response is never stale.
  let classification: BillingClassification | string = workspace.billing_classification ?? 'FREE_STARTER';
  let trialEndsAt = workspace.trial_ends_at ?? null;

  // Expired trial → settle to Starter (free), keep data, lock over-limit capacity.
  if (status === 'TRIAL_GROWTH' && workspace.trial_ends_at && new Date(workspace.trial_ends_at) <= now) {
    status = 'FREE_ACTIVE';
    plan = 'STARTER';
    classification = 'FREE_STARTER';
    trialEndsAt = null;
  }

  // Dunning ladder — only applies while the subscription is considered active
  // (or set to cancel). Terminated/restricted statuses are persisted explicitly.
  const dunning = dunningStatusFor(wallet?.last_payment_failed_at, now);
  const isPaidActive = ['ACTIVE', 'CANCEL_AT_PERIOD_END'].includes(status);
  if (isPaidActive && dunning.status) {
    status = dunning.status;
  }

  const execution = executionPermissionsFor(status);

  const state: BillingState = {
    billing_classification: classification,
    subscription_status: status,
    trial_active: (workspace.subscription_status ?? '') === 'TRIAL_GROWTH' && status === 'TRIAL_GROWTH',
    trial_ends_at: trialEndsAt,
    dunning_days: dunning.days,
    execution,
    plan,
  };

  // Needs settlement when an expired trial still has TRIAL_GROWTH persisted,
  // or when the dunning state should be persisted as the authoritative status.
  const needsSettlement =
    (workspace.subscription_status ?? '') === 'TRIAL_GROWTH' && status !== 'TRIAL_GROWTH' ||
    (isPaidActive && !!dunning.status && dunning.status !== workspace.subscription_status);

  return { state, needsSettlement };
}

// Persist a settled state (expired trial downgrade / dunning status) to the DB.
// Called lazily by the billing-status endpoint so no background worker is required.
export async function settleBillingState(workspaceId: string, resolved: BillingState): Promise<void> {
  const updates: Record<string, unknown> = {
    subscription_status: resolved.subscription_status,
    updated_at: new Date().toISOString(),
  };

  if (resolved.subscription_status === 'FREE_ACTIVE' && resolved.plan === 'STARTER') {
    // Expired trial settlement — keep workspace data, revoke paid-only execution.
    // trial_starts_at is deliberately PRESERVED as the durable "trial used" marker:
    // §6 allows one evaluation per workspace, and clearing it would permit
    // unlimited 14-day restarts. trial_ends_at is cleared (nothing pending).
    updates.plan_type = 'STARTER';
    updates.billing_classification = 'FREE_STARTER';
    updates.trial_ends_at = null;
    updates.commercial_effective_at = null;
  }

  try {
    const { data: ws } = await supabaseAdmin.from('workspaces').select('org_id').eq('id', workspaceId).single();
    await supabaseAdmin.from('workspaces').update(updates).eq('id', workspaceId);
    if (ws?.org_id && updates.plan_type) {
      await supabaseAdmin.from('organizations').update({ plan_type: updates.plan_type, updated_at: new Date().toISOString() }).eq('id', ws.org_id);
    }
    logger.info({ workspaceId, status: resolved.subscription_status, plan: updates.plan_type }, '[CommercialState] Billing state settled');
  } catch (err) {
    logger.warn({ err: err instanceof Error ? err.message : err, workspaceId }, '[CommercialState] Settlement failed');
  }
}

// §19.3 — conversion guard: only workspaces that may become billable can convert.
export function assertClassificationChargeable(classification: string | null | undefined): string | null {
  const c = (classification ?? 'FREE_STARTER').toUpperCase();
  if (NON_BILLABLE_CLASSIFICATIONS.includes(c as BillingClassification)) {
    return `Workspace is classified as ${c} and cannot be converted to a paid subscription. Contact ZoikoVertex support.`;
  }
  return null;
}
