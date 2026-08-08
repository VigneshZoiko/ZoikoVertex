import { Response, NextFunction } from 'express';
import { AuthRequest } from './authMiddleware';
import { supabaseAdmin } from './supabase';
import { resolveBillingState, ExecutionPermissions } from './commercialState';
import { logger } from './logger';

// ZV-COM-BILL-001 §13 — safe-execution restriction.
// Consequential actions (publish, campaign launch, budget increases, new write
// connectors) must fail closed once the subscription enters a restricted state:
//   COMMERCIAL_RESTRICTED  → block budget increases + new write connectors
//   EXECUTION_RESTRICTED   → block new campaigns + budget increases
//   SUSPENDED_SAFE_MODE    → block all consequential outbound writes
//   TERMINATED             → block everything except read/export/billing remediation
export type BillingAction = 'publish' | 'campaign_create' | 'budget_increase' | 'connector_write';

const ACTION_LABEL: Record<BillingAction, string> = {
  publish: 'Publishing',
  campaign_create: 'Launching new campaigns',
  budget_increase: 'Increasing marketing budgets',
  connector_write: 'Activating new write connectors',
};

function isAllowed(permissions: ExecutionPermissions, action: BillingAction): boolean {
  switch (action) {
    case 'publish': return permissions.publish;
    case 'campaign_create': return permissions.campaignCreate;
    case 'budget_increase': return permissions.budgetIncrease;
    case 'connector_write': return permissions.connectorWrite;
    default: return true;
  }
}

export function requireBillingExecution(action: BillingAction) {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const workspaceId = req.user?.workspace_id;
    // Superadmins and API-key-only contexts (no workspace membership) pass.
    if (!workspaceId || req.user?.is_superadmin) { next(); return; }

    try {
      const [wsRes, walletRes] = await Promise.all([
        supabaseAdmin
          .from('workspaces')
          .select('plan_type, billing_classification, subscription_status, trial_starts_at, trial_ends_at')
          .eq('id', workspaceId)
          .single(),
        supabaseAdmin
          .from('wallets')
          .select('last_payment_failed_at')
          .eq('workspace_id', workspaceId)
          .maybeSingle(),
      ]);

      if (wsRes.error || !wsRes.data) { next(); return; } // downstream handles missing workspace

      const { state } = await resolveBillingState(wsRes.data, walletRes.data);

      if (!isAllowed(state.execution, action)) {
        res.status(403).json({
          success: false,
          error: `${ACTION_LABEL[action]} is restricted while your subscription is in ${state.subscription_status.replace(/_/g, ' ').toLowerCase()} state. Update your payment method or contact support to restore access.`,
          billing_status: state.subscription_status,
          billing_href: '/admin/billing',
        });
        return;
      }
      next();
    } catch (err) {
      // Never block legitimate traffic because of a resolver failure — log and allow.
      logger.warn({ err: err instanceof Error ? err.message : err, workspaceId }, '[BillingGate] resolution failed — allowing request');
      next();
    }
  };
}
