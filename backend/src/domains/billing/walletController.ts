 
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../../shared/supabase';
import { AuthRequest }   from '../../shared/authMiddleware';
import { env }           from '../../config/env';
import { logger }        from '../../shared/logger';
import {
  assertClassificationChargeable,
  resolveBillingState,
  settleBillingState,
} from '../../shared/commercialState';

// —— Stripe (optional — gracefully disabled if package not installed) ——
let stripe: any = null;
function getStripe(): any | null {
  if (stripe) return stripe;
  if (!env.STRIPE_SECRET_KEY) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Stripe = require('stripe');
    stripe = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });
  } catch { logger.warn('[Wallet] stripe package not installed — run: npm install stripe in backend'); }
  return stripe;
}

// —— Fee constants (Stripe standard card rate) ————————————————
const STRIPE_PCT   = 0.029;   // 2.9%
const STRIPE_FIXED = 0.30;    // $0.30 per transaction

// Budget approval tiers
export const BUDGET_TIERS = {
  LOW:    { min: 0,   max: 199.99, approvals: 1, label: 'Low'    },
  MEDIUM: { min: 200, max: 499.99, approvals: 1, label: 'Medium' },
  HIGH:   { min: 500, max: Infinity, approvals: 2, label: 'High' },
};

export function resolveBudgetTier(amount: number): { tier: string; approvals: number } {
  if (amount >= 500)  return { tier: 'HIGH',   approvals: 2 };
  if (amount >= 200)  return { tier: 'MEDIUM',  approvals: 1 };
  return               { tier: 'LOW',    approvals: 1 };
}

// —— Fee calculator ————————————————————————————————————————————
// User specifies how much they want in wallet (desired_credits).
// We calculate the gross charge so that after Stripe takes their
// cut, the wallet receives exactly desired_credits.
export function calculateDepositFees(desiredCredits: number, taxRatePct = 0) {
  // gross = (desired + fixed) / (1 - pct)
  const gross    = Math.ceil(((desiredCredits + STRIPE_FIXED) / (1 - STRIPE_PCT)) * 100) / 100;
  const stripeFee = Math.round((gross * STRIPE_PCT + STRIPE_FIXED) * 100) / 100;
  const taxAmount = Math.round(gross * (taxRatePct / 100) * 100) / 100;
  const totalCharge = Math.round((gross + taxAmount) * 100) / 100;
  return { gross, stripeFee, taxAmount, totalCharge, netCredits: desiredCredits };
}

// —— GET /api/v1/billing/wallet ————————————————————————————————

export const getWalletData = async (req: AuthRequest, res: Response, _next: NextFunction) => {
  const workspaceId = req.user?.workspace_id;
  if (!workspaceId) return res.status(400).json({ success: false, error: 'Missing workspace context' });

  try {
    let { data: wallet } = await supabaseAdmin
      .from('wallets')
      .select('*')
      .eq('workspace_id', workspaceId)
      .single();

    if (!wallet) {
      // Auto-create wallet on first access
      const { data: created } = await supabaseAdmin
        .from('wallets')
        .insert({ workspace_id: workspaceId, balance: 0, processing_balance: 0, total_deposited: 0, currency: 'USD' })
        .select()
        .single();
      wallet = created;
    }

    const { data: transactions } = await supabaseAdmin
      .from('wallet_transactions')
      .select('id, amount, gross_amount, stripe_fee, net_amount, type, status, description, created_at, available_at, currency, campaigns(name)')
      .eq('wallet_id', wallet?.id)
      .order('created_at', { ascending: false })
      .limit(50);

    const stripeConfigured = !!env.STRIPE_SECRET_KEY;

    return res.json({
      success: true,
      data: {
        wallet: {
          ...wallet,
          available_balance:   wallet?.balance           || 0,
          processing_balance:  wallet?.processing_balance || 0,
          total_deposited:     wallet?.total_deposited    || 0,
        },
        transactions: (transactions || []).map((tx: any) => ({
          ...tx,
          campaign_name: tx.campaigns?.name || null,
          campaigns: undefined,
        })),
        tiers:             BUDGET_TIERS,
        stripe_configured: stripeConfigured,
        stripe_publishable_key: env.STRIPE_PUBLISHABLE_KEY || null,
      },
    });
  } catch (err: unknown) {
    logger.error({ err: err instanceof Error ? err.message : err }, '[Wallet] getWalletData failed');
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// —— GET /api/v1/billing/fees — calculate fees before deposit ——

const FeesSchema = z.object({
  amount:   z.number().positive().max(100_000),
  currency: z.string().default('USD'),
  tax_rate: z.number().min(0).max(30).default(0),
});

export const calculateFees = async (req: AuthRequest, res: Response, _next: NextFunction) => {
  const parsed = FeesSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.format() });

  const { amount, currency, tax_rate } = parsed.data;
  const fees = calculateDepositFees(amount, tax_rate);

  return res.json({
    success: true,
    data: {
      desired_credits:  amount,
      stripe_fee:       fees.stripeFee,
      tax_amount:       fees.taxAmount,
      total_charge:     fees.totalCharge,
      net_credits:      fees.netCredits,
      currency,
      breakdown: [
        { label: 'Campaign credits',        amount: fees.netCredits   },
        { label: 'Stripe processing (2.9% + $0.30)', amount: fees.stripeFee },
        ...(fees.taxAmount > 0 ? [{ label: 'Tax', amount: fees.taxAmount }] : []),
        { label: 'Total charged to card',   amount: fees.totalCharge, is_total: true },
      ],
      non_refundable_notice: 'This deposit is non-refundable and can only be used for campaign ad spend within ZoikoVertex.',
      processing_notice: `Credits will show as Processing for up to ${env.DEPOSIT_HOLD_HOURS} hours while we verify your payment, then become Available.`,
    },
  });
};

// —— POST /api/v1/billing/deposit/create — Stripe Checkout —————

const DepositSchema = z.object({
  amount:   z.number().positive().max(100_000),
  currency: z.string().default('USD'),
  tax_rate: z.number().min(0).max(30).default(0),
});

export const createDepositSession = async (req: AuthRequest, res: Response, _next: NextFunction) => {
  const workspaceId = req.user?.workspace_id;
  const userId      = req.user?.id;
  if (!workspaceId) return res.status(400).json({ error: 'Missing workspace context' });

  const stripeClient = getStripe();
  if (!stripeClient) {
    return res.status(503).json({
      error: 'Payment processing not configured',
      hint:  'Add STRIPE_SECRET_KEY to backend .env to enable deposits',
    });
  }

  const parsed = DepositSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.format() });

  const { amount, currency, tax_rate } = parsed.data;
  const fees = calculateDepositFees(amount, tax_rate);

  try {
    // Ensure wallet exists
    let { data: wallet } = await supabaseAdmin
      .from('wallets')
      .select('id, stripe_customer_id')
      .eq('workspace_id', workspaceId)
      .single();

    if (!wallet) {
      const { data: created } = await supabaseAdmin
        .from('wallets')
        .insert({ workspace_id: workspaceId, balance: 0, processing_balance: 0, total_deposited: 0, currency })
        .select('id, stripe_customer_id')
        .single();
      wallet = created;
    }

    // Get or create Stripe customer
    let stripeCustomerId = wallet?.stripe_customer_id;
    if (!stripeCustomerId) {
      const { data: workspace } = await supabaseAdmin
        .from('workspaces')
        .select('name, org_id')
        .eq('id', workspaceId)
        .single();

      const customer = await stripeClient.customers.create({
        metadata: { workspace_id: workspaceId, org_id: workspace?.org_id || '' },
        description: `ZoikoVertex workspace: ${workspace?.name || workspaceId}`,
      });
      stripeCustomerId = customer.id;
      await supabaseAdmin.from('wallets').update({ stripe_customer_id: stripeCustomerId }).eq('id', wallet!.id);
    }

    const holdHours    = parseInt(env.DEPOSIT_HOLD_HOURS || '48');
    const availableAt  = new Date(Date.now() + holdHours * 60 * 60 * 1000).toISOString();
    const grossCents   = Math.round(fees.totalCharge * 100);

    // Get billing email for receipt
    const { data: workspace } = await supabaseAdmin
      .from('workspaces')
      .select('billing_email')
      .eq('id', workspaceId)
      .single();

    // Get user email for receipt fallback
    const { data: userData } = await supabaseAdmin.auth.admin.getUserById(userId || '');
    const receiptEmail = workspace?.billing_email || userData?.user?.email || undefined;

    // Create Stripe Checkout Session
    const session = await stripeClient.checkout.sessions.create({
      customer:              stripeCustomerId,
      customer_email:        !stripeCustomerId ? receiptEmail : undefined, // only if no customer yet
      mode:                  'payment',
      payment_method_types:  ['card'],
      invoice_creation:      { enabled: true }, // Stripe generates a proper invoice
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency:     currency.toLowerCase(),
            unit_amount:  grossCents,
            product_data: {
              name:        `ZoikoVertex Campaign Credits - $${amount.toFixed(2)}`,
              description: `$${fees.netCredits.toFixed(2)} campaign wallet credits (includes $${fees.stripeFee.toFixed(2)} Stripe processing fee). Non-refundable.`,
            },
          },
        },
      ],
      success_url: `${env.FRONTEND_URL}/admin/billing?deposit=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${env.FRONTEND_URL}/admin/billing?deposit=cancelled`,
      metadata: {
        workspace_id:  workspaceId,
        wallet_id:     wallet!.id,
        initiated_by:  userId || '',
        net_credits:   fees.netCredits.toString(),
        stripe_fee:    fees.stripeFee.toString(),
        tax_amount:    fees.taxAmount.toString(),
        available_at:  availableAt,
        currency,
      },
      payment_intent_data: {
        receipt_email: receiptEmail,    // Stripe sends receipt email automatically
        metadata: {
          workspace_id: workspaceId,
          purpose:      'campaign_wallet_deposit',
        },
      },
    });

    logger.info({ workspaceId, amount, gross: fees.totalCharge, sessionId: session.id }, '[Wallet] Checkout session created');

    return res.json({
      success:     true,
      session_id:  session.id,
      session_url: session.url,
      fees,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ err: msg, workspaceId }, '[Wallet] createDepositSession failed');
    return res.status(500).json({ error: msg || 'Failed to create payment session' });
  }
};

// ── POST /api/v1/billing/deposit/sync-session ─────────────────────────────────
// Called when user returns from Stripe Checkout with ?session_id=xxx.
// Retrieves the session, verifies payment, and records the deposit.
// Safe to call multiple times — idempotent via stripe_charge_id uniqueness.

export const syncDepositSession = async (req: AuthRequest, res: Response, _next: NextFunction) => {
  const workspaceId = req.user?.workspace_id;
  if (!workspaceId) return res.status(400).json({ success: false, error: 'Missing workspace context' });

  const { session_id } = req.body as { session_id?: string };
  if (!session_id) return res.status(400).json({ error: 'session_id required' });

  const stripeClient = getStripe();
  if (!stripeClient) return res.status(503).json({ error: 'Stripe not configured' });

  try {
    const session = await stripeClient.checkout.sessions.retrieve(session_id) as any;

    if (session.payment_status !== 'paid') {
      return res.json({ success: true, data: { status: session.payment_status, credited: false } });
    }

    const meta      = session.metadata || {};
    const walletId  = meta.wallet_id;
    if (!walletId) return res.status(400).json({ error: 'Session missing wallet metadata' });

    // Idempotency — skip if already recorded
    const { data: existing } = await supabaseAdmin
      .from('wallet_transactions')
      .select('id')
      .eq('stripe_charge_id', session.id)
      .maybeSingle();

    if (existing) {
      return res.json({ success: true, data: { status: 'paid', credited: false, reason: 'already_recorded' } });
    }

    const netCredits  = parseFloat(meta.net_credits  || '0');
    const stripeFee   = parseFloat(meta.stripe_fee   || '0');
    const taxAmount   = parseFloat(meta.tax_amount   || '0');
    const grossAmount = netCredits + stripeFee + taxAmount;
    const holdHours   = parseInt(env.DEPOSIT_HOLD_HOURS || '48');
    const resolvedAt  = meta.available_at || new Date(Date.now() + holdHours * 60 * 60 * 1000).toISOString();
    const currency    = meta.currency || 'USD';

    // Insert PROCESSING transaction
    await supabaseAdmin.from('wallet_transactions').insert({
      wallet_id:                walletId,
      type:                     'CREDIT',
      status:                   'PROCESSING',
      amount:                   netCredits,
      gross_amount:             grossAmount,
      net_amount:               netCredits,
      stripe_fee:               stripeFee,
      tax_amount:               taxAmount,
      currency,
      stripe_charge_id: session.id,
      initiated_by:             meta.initiated_by || null,
      available_at:             resolvedAt,
      description:              `Campaign credits deposit - processing`,
    });

    // Update wallet processing_balance
    const { data: wallet } = await supabaseAdmin
      .from('wallets').select('processing_balance, total_deposited').eq('id', walletId).single();

    await supabaseAdmin.from('wallets').update({
      processing_balance: (wallet?.processing_balance || 0) + netCredits,
      total_deposited:    (wallet?.total_deposited    || 0) + grossAmount,
      updated_at:         new Date().toISOString(),
    }).eq('id', walletId);

    // Get receipt/invoice URL from Stripe session
    let receiptUrl: string | null = null;
    try {
      if (session.invoice) {
        const invoice = await stripeClient!.invoices.retrieve(session.invoice as string) as any;
        receiptUrl = invoice.hosted_invoice_url || invoice.invoice_pdf || null;
      }
    } catch { /* non-fatal */ }

    logger.info({ walletId, netCredits, resolvedAt, sessionId: session.id }, '[Wallet] Deposit synced from session');
    return res.json({
      success: true,
      data: {
        status:       'paid',
        credited:     true,
        amount:       netCredits,
        available_at: resolvedAt,
        receipt_url:  receiptUrl,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ err: msg, sessionId: session_id }, '[Wallet] syncDepositSession failed');
    return res.status(500).json({ error: msg });
  }
};

// —— POST /api/v1/billing/webhook — Stripe webhook ————————————
// Must use raw body (registered before express.json() in server.ts)

export const stripeWebhook = async (req: Request, res: Response) => {
  const sig     = req.headers['stripe-signature'] as string;
  const secret  = env.STRIPE_WEBHOOK_SECRET;

  if (!secret) {
    logger.error('[Billing] STRIPE_WEBHOOK_SECRET not configured — rejecting webhook');
    return res.status(400).json({ error: 'Webhook secret not configured' });
  }

  const stripeClient = getStripe();
  if (!stripeClient) return res.status(200).json({ received: true });

  let event: any;
  try {
    event = stripeClient.webhooks.constructEvent(req.body, sig, secret);
  } catch (err: unknown) {
    logger.warn({ err: err instanceof Error ? err.message : err }, '[Wallet] Webhook signature verification failed');
    return res.status(400).send(`Webhook Error: ${err instanceof Error ? err.message : String(err)}`);
  }

  // ── checkout.session.completed (setup mode) — save customer ID ──────────────
  if (event.type === 'checkout.session.completed' && event.data.object.mode === 'setup') {
    const session = event.data.object as any;
    const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;
    if (customerId) {
      try {
        // Find workspace wallet by customer ID match (or by workspace_id in metadata)
        const workspaceId = session.metadata?.workspace_id;
        if (workspaceId) {
          const { data: wallet } = await supabaseAdmin
            .from('wallets').select('id, stripe_customer_id').eq('workspace_id', workspaceId).single();
          if (wallet && !wallet.stripe_customer_id) {
            await supabaseAdmin.from('wallets').update({ stripe_customer_id: customerId }).eq('id', wallet.id);
            logger.info({ workspaceId, customerId }, '[Billing] Customer ID saved from setup webhook');
          }
        }
      } catch { /* non-fatal */ }
    }
    return res.json({ received: true });
  }

  // ── checkout.session.completed (payment mode) — credit deposit ───────────────
  if (event.type === 'checkout.session.completed') {
    const session  = event.data.object;
    const meta     = session.metadata || {};
    const walletId = meta.wallet_id;

    if (!walletId || session.payment_status !== 'paid') {
      return res.json({ received: true });
    }

    try {
      const netCredits   = parseFloat(meta.net_credits  || '0');
      const stripeFee    = parseFloat(meta.stripe_fee   || '0');
      const taxAmount    = parseFloat(meta.tax_amount   || '0');
      const grossAmount  = netCredits + stripeFee + taxAmount;
      const availableAt  = meta.available_at;
      const holdHours    = parseInt(env.DEPOSIT_HOLD_HOURS || '48');
      const resolvedAt   = availableAt || new Date(Date.now() + holdHours * 60 * 60 * 1000).toISOString();
      const currency     = meta.currency || 'USD';

      // Idempotency — skip if this charge was already recorded
      const { data: existingTx } = await supabaseAdmin
        .from('wallet_transactions')
        .select('id')
        .eq('stripe_charge_id', session.id)
        .maybeSingle();
      if (existingTx) {
        logger.info({ chargeId: session.id }, '[Billing] Duplicate webhook — transaction already exists, skipping');
        return res.json({ received: true });
      }

      // Insert PROCESSING transaction
      const { data: tx } = await supabaseAdmin
        .from('wallet_transactions')
        .insert({
          wallet_id:                walletId,
          type:                     'CREDIT',
          status:                   'PROCESSING',
          amount:                   netCredits,
          gross_amount:             grossAmount,
          net_amount:               netCredits,
          stripe_fee:       stripeFee,
          tax_amount:       taxAmount,
          currency,
          stripe_charge_id: session.id,
          initiated_by:             meta.initiated_by || null,
          available_at:             resolvedAt,
          description:              `Campaign credits deposit - processing`,
        })
        .select('id')
        .single();

      // Update wallet: add to processing_balance (not balance yet)
      await supabaseAdmin.rpc('increment_wallet_processing', {
        p_wallet_id: walletId,
        p_amount:    netCredits,
        p_deposited: grossAmount,
      }).then(({ error }) => {
        if (error) {
          // Fallback: manual update if RPC not available
          return supabaseAdmin
            .from('wallets')
            .select('processing_balance, total_deposited')
            .eq('id', walletId)
            .single()
            .then(({ data: w }) => {
              return supabaseAdmin.from('wallets').update({
                processing_balance: (w?.processing_balance || 0) + netCredits,
                total_deposited:    (w?.total_deposited    || 0) + grossAmount,
                updated_at:         new Date().toISOString(),
              }).eq('id', walletId);
            });
        }
      });

      logger.info({ walletId, netCredits, availableAt: resolvedAt, txId: tx?.id }, '[Wallet] Deposit queued as PROCESSING');
    } catch (err: unknown) {
      logger.error({ err: err instanceof Error ? err.message : err, sessionId: session.id }, '[Wallet] Webhook deposit processing failed');
    }
  }

  // ── invoice.payment_succeeded — subscription renewed ─────────────────────────
  if (event.type === 'invoice.payment_succeeded') {
    const invoice = event.data.object as any;
    const customerId = invoice.customer;
    const subscriptionId = invoice.subscription;
    if (customerId && subscriptionId) {
      try {
        const { data: wallet } = await supabaseAdmin
          .from('wallets').select('id, workspace_id').eq('stripe_customer_id', customerId).single();
        if (wallet) {
          const sub = await stripeClient.subscriptions.retrieve(subscriptionId) as any;
          const renewalDate = new Date(sub.current_period_end * 1000).toISOString();
          await supabaseAdmin.from('wallets').update({
            stripe_subscription_id: subscriptionId,
            plan_renewal_date: renewalDate,
            last_payment_failed_at: null,
            payment_failure_count: 0,
            updated_at: new Date().toISOString(),
          }).eq('id', wallet.id);
          // ZV-COM-BILL-001 §13 — payment recovered: restore entitled state.
          // Defensive §19.3: a paying customer is COMMERCIAL — never let a paid
          // workspace linger in a non-billable classification after a successful charge.
          await supabaseAdmin.from('workspaces').update({
            subscription_status: 'ACTIVE',
            billing_classification: 'COMMERCIAL',
            commercial_effective_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }).eq('id', wallet.workspace_id);
          logger.info({ customerId, subscriptionId, renewalDate }, '[Billing] Subscription renewed');
        }
      } catch { /* non-fatal */ }
    }
  }

  // ── invoice.payment_failed — notify workspace ─────────────────────────────────
  if (event.type === 'invoice.payment_failed') {
    const invoice = event.data.object as any;
    const customerId = invoice.customer;
    if (customerId) {
      try {
        const { data: wallet } = await supabaseAdmin
          .from('wallets').select('id, workspace_id, payment_failure_count').eq('stripe_customer_id', customerId).single();
        if (wallet) {
          // ZV-COM-BILL-001 §13 — record failure time so the dunning ladder resolves lazily.
          await supabaseAdmin.from('wallets').update({
            last_payment_failed_at: new Date().toISOString(),
            payment_failure_count: (wallet.payment_failure_count ?? 0) + 1,
            updated_at: new Date().toISOString(),
          }).eq('id', wallet.id);
          await supabaseAdmin.from('notifications').insert({
            workspace_id: wallet.workspace_id,
            type: 'PAYMENT_FAILED',
            title: 'Payment failed',
            body: 'Your subscription payment failed. Please update your payment method to keep your plan active.',
            link: '/admin/billing',
            is_read: false,
            created_at: new Date().toISOString(),
          });
          logger.warn({ customerId, invoiceId: invoice.id }, '[Billing] Payment failed — notification sent');
        }
      } catch { /* non-fatal */ }
    }
  }

  // ── customer.subscription.deleted — downgrade to Starter ─────────────────────
  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object as any;
    const customerId = sub.customer;
    if (customerId) {
      try {
        const { data: wallet } = await supabaseAdmin
          .from('wallets').select('id, workspace_id').eq('stripe_customer_id', customerId).single();
        if (wallet) {
          await supabaseAdmin.from('wallets').update({
            stripe_subscription_id: null,
            plan_renewal_date: null,
            updated_at: new Date().toISOString(),
          }).eq('id', wallet.id);
          await supabaseAdmin.from('workspaces').update({
            plan_type: 'STARTER',
            billing_classification: 'FREE_STARTER',
            subscription_status: 'FREE_ACTIVE',
            // trial_starts_at deliberately preserved — a cancelled customer cannot
            // restart a fresh 14-day trial (one trial per workspace, §6).
            trial_ends_at: null,
            commercial_effective_at: null,
            updated_at: new Date().toISOString(),
          }).eq('id', wallet.workspace_id);
          // Also downgrade organizations
          const { data: ws } = await supabaseAdmin.from('workspaces').select('org_id').eq('id', wallet.workspace_id).single();
          if (ws?.org_id) {
            await supabaseAdmin.from('organizations').update({ plan_type: 'STARTER', updated_at: new Date().toISOString() }).eq('id', ws.org_id);
          }
          logger.info({ customerId }, '[Billing] Subscription deleted — downgraded to STARTER');
        }
      } catch { /* non-fatal */ }
    }
  }

  return res.json({ received: true });
};

// —— POST /api/v1/billing/deposit/simulate (dev only) —————————
// Allows testing the deposit flow without real Stripe in development.

export const simulateDeposit = async (req: AuthRequest, res: Response, _next: NextFunction) => {
  if (env.NODE_ENV === 'production') return res.status(404).json({ error: 'Not found' });

  const workspaceId = req.user?.workspace_id;
  const userId      = req.user?.id;
  if (!workspaceId) return res.status(400).json({ error: 'Missing workspace context' });

  const { amount = 100, tax_rate = 0 } = req.body;
  const fees = calculateDepositFees(parseFloat(amount), parseFloat(tax_rate));
  const holdHours   = parseInt(env.DEPOSIT_HOLD_HOURS || '48');
  const availableAt = new Date(Date.now() + holdHours * 60 * 60 * 1000).toISOString();

  try {
    let { data: wallet } = await supabaseAdmin
      .from('wallets')
      .select('id, processing_balance, total_deposited')
      .eq('workspace_id', workspaceId)
      .single();

    if (!wallet) {
      const { data: created } = await supabaseAdmin
        .from('wallets')
        .insert({ workspace_id: workspaceId, balance: 0, processing_balance: 0, total_deposited: 0 })
        .select('id, processing_balance, total_deposited')
        .single();
      wallet = created;
    }

    await supabaseAdmin.from('wallet_transactions').insert({
      wallet_id:    wallet!.id,
      type:         'CREDIT',
      status:       'PROCESSING',
      amount:       fees.netCredits,
      gross_amount: fees.totalCharge,
      net_amount:   fees.netCredits,
      stripe_fee:   fees.stripeFee,
      tax_amount:   fees.taxAmount,
      available_at: availableAt,
      initiated_by: userId,
      description:  `[DEV] Simulated deposit`,
    });

    await supabaseAdmin.from('wallets').update({
      processing_balance: (wallet!.processing_balance || 0) + fees.netCredits,
      total_deposited:    (wallet!.total_deposited    || 0) + fees.totalCharge,
      updated_at:         new Date().toISOString(),
    }).eq('id', wallet!.id);

    return res.json({ success: true, message: `$${fees.netCredits} queued as PROCESSING, available at ${availableAt}`, fees });
  } catch (err: unknown) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to simulate deposit' });
  }
};

// —— GET /api/v1/billing/wallet/balance — quick balance check ——

export const getWalletBalance = async (req: AuthRequest, res: Response, _next: NextFunction) => {
  const workspaceId = req.user?.workspace_id;
  if (!workspaceId) return res.status(400).json({ error: 'Missing workspace context' });

  const { data: wallet } = await supabaseAdmin
    .from('wallets')
    .select('balance, processing_balance, currency')
    .eq('workspace_id', workspaceId)
    .single();

  return res.json({
    success: true,
    data: {
      available:  wallet?.balance            || 0,
      processing: wallet?.processing_balance || 0,
      currency:   wallet?.currency           || 'USD',
    },
  });
};

// —— GET /api/v1/billing/spend-cap ————————————————————————————

// ── GET /api/v1/billing/overcharge ────────────────────────────────────────────

export const getOvercharge = async (req: AuthRequest, res: Response, _next: NextFunction) => {
  const workspaceId = req.user?.workspace_id;
  if (!workspaceId) return res.status(400).json({ success: false, error: 'Missing workspace context' });

  try {
    const [walletRes, wsRes] = await Promise.all([
      supabaseAdmin.from('wallets').select('overcharge_enabled, balance').eq('workspace_id', workspaceId).maybeSingle(),
      supabaseAdmin.from('workspaces').select('billing_status').eq('id', workspaceId).maybeSingle(),
    ]);
    return res.json({ success: true, data: {
      overcharge_enabled: (walletRes.data as any)?.overcharge_enabled ?? false,
      wallet_balance:     (walletRes.data as any)?.balance ?? 0,
      billing_status:     (wsRes.data as any)?.billing_status ?? 'active',
    }});
  } catch {
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// ── PATCH /api/v1/billing/overcharge ──────────────────────────────────────────

export const updateOvercharge = async (req: AuthRequest, res: Response, _next: NextFunction) => {
  const workspaceId = req.user?.workspace_id;
  if (!workspaceId) return res.status(400).json({ success: false, error: 'Missing workspace context' });

  const { overcharge_enabled } = req.body as { overcharge_enabled?: boolean };
  if (typeof overcharge_enabled !== 'boolean') {
    return res.status(400).json({ success: false, error: 'overcharge_enabled must be a boolean' });
  }

  try {
    const { error } = await supabaseAdmin
      .from('wallets')
      .upsert({ workspace_id: workspaceId, overcharge_enabled }, { onConflict: 'workspace_id', ignoreDuplicates: false });

    if (error) throw error;
    return res.json({ success: true, data: { overcharge_enabled } });
  } catch {
    return res.status(500).json({ success: false, error: 'Failed to update overcharge setting' });
  }
};

export const getSpendCap = async (req: AuthRequest, res: Response, _next: NextFunction) => {
  const workspaceId = req.user?.workspace_id;
  if (!workspaceId) return res.status(400).json({ success: false, error: 'Missing workspace context' });

  try {
    const { data: wallet } = await supabaseAdmin
      .from('wallets')
      .select('spend_cap_enabled, spend_cap_amount')
      .eq('workspace_id', workspaceId)
      .single();

    return res.json({ success: true, data: {
      spend_cap_enabled: wallet?.spend_cap_enabled ?? false,
      spend_cap_amount:  wallet?.spend_cap_amount  ?? null,
    }});
  } catch {
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// —— PATCH /api/v1/billing/spend-cap ——————————————————————————

export const updateSpendCap = async (req: AuthRequest, res: Response, _next: NextFunction) => {
  const workspaceId = req.user?.workspace_id;
  if (!workspaceId) return res.status(400).json({ success: false, error: 'Missing workspace context' });

  const { spend_cap_enabled, spend_cap_amount } = req.body;

  try {
    const { data: wallet, error } = await supabaseAdmin
      .from('wallets')
      .upsert(
        {
          workspace_id:    workspaceId,
          spend_cap_enabled: Boolean(spend_cap_enabled),
          spend_cap_amount:  spend_cap_amount != null ? parseFloat(spend_cap_amount) : null,
        },
        { onConflict: 'workspace_id', ignoreDuplicates: false }
      )
      .select('spend_cap_enabled, spend_cap_amount')
      .single();

    if (error) throw error;
    return res.json({ success: true, data: {
      spend_cap_enabled: wallet?.spend_cap_enabled,
      spend_cap_amount:  wallet?.spend_cap_amount,
    }});
  } catch {
    return res.status(500).json({ success: false, error: 'Failed to update spend cap' });
  }
};

// —— GET /api/v1/billing/settings —————————————————————————————

export const getBillingSettings = async (req: AuthRequest, res: Response, _next: NextFunction) => {
  const workspaceId = req.user?.workspace_id;
  if (!workspaceId) return res.status(400).json({ success: false, error: 'Missing workspace context' });

  try {
    const [{ data: workspace }, { data: wallet }] = await Promise.all([
      supabaseAdmin.from('workspaces').select('billing_email, billing_additional_emails').eq('id', workspaceId).single(),
      supabaseAdmin.from('wallets').select('plan_renewal_date').eq('workspace_id', workspaceId).single(),
    ]);

    return res.json({
      success: true,
      data: {
        billing_email:             workspace?.billing_email            || '',
        billing_additional_emails: workspace?.billing_additional_emails || [],
        next_renewal_date:         wallet?.plan_renewal_date           || null,
      },
    });
  } catch {
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// —— PATCH /api/v1/billing/settings ———————————————————————————

const BillingSettingsSchema = z.object({
  billing_email:      z.string().email().or(z.literal('')).optional(),
  additional_emails:  z.array(z.string().email()).max(10).optional(),
});

export const updateBillingSettings = async (req: AuthRequest, res: Response, _next: NextFunction) => {
  const workspaceId = req.user?.workspace_id;
  if (!workspaceId) return res.status(400).json({ success: false, error: 'Missing workspace context' });

  const parsed = BillingSettingsSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.format() });

  const { billing_email, additional_emails } = parsed.data;

  try {
    const { error } = await supabaseAdmin
      .from('workspaces')
      .update({
        billing_email:             billing_email || null,
        billing_additional_emails: additional_emails || [],
      })
      .eq('id', workspaceId);

    if (error) throw error;
    return res.json({ success: true });
  } catch {
    return res.status(500).json({ success: false, error: 'Failed to update billing settings' });
  }
};

// —— POST /api/v1/billing/payment-methods/setup ———————————————
// Creates a Stripe SetupIntent so the frontend can collect card details
// securely without card data touching our servers.

async function ensureStripeCustomer(workspaceId: string): Promise<{ walletId: string; stripeCustomerId: string } | null> {
  const stripeClient = getStripe();
  if (!stripeClient) return null;

  let { data: wallet } = await supabaseAdmin
    .from('wallets')
    .select('id, stripe_customer_id')
    .eq('workspace_id', workspaceId)
    .single();

  if (!wallet) {
    const { data: created } = await supabaseAdmin
      .from('wallets')
      .insert({ workspace_id: workspaceId, balance: 0, processing_balance: 0, total_deposited: 0, currency: 'USD' })
      .select('id, stripe_customer_id')
      .single();
    wallet = created;
  }

  let stripeCustomerId = wallet?.stripe_customer_id;
  if (!stripeCustomerId) {
    const { data: ws } = await supabaseAdmin.from('workspaces').select('name, org_id').eq('id', workspaceId).single();
    const customer = await stripeClient.customers.create({
      metadata: { workspace_id: workspaceId, org_id: ws?.org_id || '' },
      description: `ZoikoVertex workspace: ${ws?.name || workspaceId}`,
    });
    stripeCustomerId = customer.id;
    await supabaseAdmin.from('wallets').update({ stripe_customer_id: stripeCustomerId }).eq('id', wallet!.id);
  }

  return { walletId: wallet!.id, stripeCustomerId };
}

export const createSetupIntent = async (req: AuthRequest, res: Response, _next: NextFunction) => {
  const workspaceId = req.user?.workspace_id;
  if (!workspaceId) return res.status(400).json({ success: false, error: 'Missing workspace context' });

  const stripeClient = getStripe();
  if (!stripeClient) {
    return res.status(503).json({ error: 'Payment processing not configured', hint: 'Add STRIPE_SECRET_KEY to .env' });
  }

  try {
    const ctx = await ensureStripeCustomer(workspaceId);
    if (!ctx) return res.status(503).json({ error: 'Could not create Stripe customer' });

    const setupIntent = await stripeClient.setupIntents.create({
      customer:             ctx.stripeCustomerId,
      payment_method_types: ['card'],
    });

    return res.json({
      success: true,
      data: {
        client_secret:          setupIntent.client_secret,
        stripe_publishable_key: env.STRIPE_PUBLISHABLE_KEY || null,
      },
    });
  } catch (err: unknown) {
    logger.error({ err: err instanceof Error ? err.message : err }, '[Billing] createSetupIntent failed');
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to create setup intent' });
  }
};

// —— GET /api/v1/billing/payment-methods ——————————————————————

// POST /api/v1/billing/payment-methods/setup-checkout
// Stripe Checkout in setup mode — no stripe.js required on frontend.
export const createSetupCheckout = async (req: AuthRequest, res: Response, _next: NextFunction) => {
  const workspaceId = req.user?.workspace_id;
  if (!workspaceId) return res.status(400).json({ success: false, error: 'Missing workspace context' });
  const stripeClient = getStripe();
  if (!stripeClient) return res.status(503).json({ error: 'Payment processing not configured' });
  try {
    const frontendUrl = env.FRONTEND_URL || 'http://localhost:3000';

    // Try to get/create Stripe customer — fall back to customerless session if it fails
    let customerId: string | undefined;
    try {
      const ctx = await ensureStripeCustomer(workspaceId);
      customerId = ctx?.stripeCustomerId;
    } catch (custErr: unknown) {
      logger.warn({ err: custErr instanceof Error ? custErr.message : custErr }, '[Billing] ensureStripeCustomer failed — creating session without customer');
    }

    const sessionParams: Record<string, unknown> = {
      mode:                 'setup',
      payment_method_types: ['card'],
      // {CHECKOUT_SESSION_ID} is replaced by Stripe with the actual session ID
      success_url: `${frontendUrl}/admin/billing?card=added&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${frontendUrl}/admin/billing?card=cancelled`,
    };
    if (customerId) sessionParams.customer = customerId;

    const session = await stripeClient.checkout.sessions.create(sessionParams as any);
    return res.json({ success: true, data: { url: session.url } });
  } catch (err: unknown) {
    logger.error({ err: err instanceof Error ? err.message : err }, '[Billing] createSetupCheckout failed');
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to create card setup session' });
  }
};

// POST /api/v1/billing/payment-methods/sync-session
// Called when user returns from Stripe card setup with ?session_id=xxx
// Retrieves the session, extracts customer, saves to wallet, sets default PM.
export const syncCardSession = async (req: AuthRequest, res: Response, _next: NextFunction) => {
  const workspaceId = req.user?.workspace_id;
  if (!workspaceId) return res.status(400).json({ success: false, error: 'Missing workspace context' });
  const { session_id } = req.body as { session_id?: string };
  if (!session_id) return res.status(400).json({ error: 'session_id required' });

  const stripeClient = getStripe();
  if (!stripeClient) return res.status(503).json({ error: 'Payment processing not configured' });

  try {
    const session = await stripeClient.checkout.sessions.retrieve(session_id, {
      expand: ['setup_intent', 'customer'],
    }) as any;

    if (session.status !== 'complete') {
      return res.status(400).json({ error: 'Session not completed' });
    }

    const stripeCustomerId: string = typeof session.customer === 'string'
      ? session.customer
      : session.customer?.id;

    if (!stripeCustomerId) return res.status(400).json({ error: 'No customer found in session' });

    // Get or create wallet and save customer ID
    let { data: wallet } = await supabaseAdmin
      .from('wallets')
      .select('id, stripe_customer_id')
      .eq('workspace_id', workspaceId)
      .single();

    if (!wallet) {
      const { data: created } = await supabaseAdmin
        .from('wallets')
        .insert({ workspace_id: workspaceId, balance: 0, processing_balance: 0, total_deposited: 0, currency: 'USD', stripe_customer_id: stripeCustomerId })
        .select('id, stripe_customer_id')
        .single();
      wallet = created;
    } else if (!wallet.stripe_customer_id) {
      await supabaseAdmin
        .from('wallets')
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('id', wallet.id);
    }

    // Set the new card as default if no default yet
    const setupIntent = session.setup_intent;
    const paymentMethodId = typeof setupIntent === 'string'
      ? null
      : setupIntent?.payment_method;

    if (paymentMethodId && stripeCustomerId) {
      await stripeClient.customers.update(stripeCustomerId, {
        invoice_settings: { default_payment_method: paymentMethodId },
      });
      if (wallet?.id) {
        await supabaseAdmin
          .from('wallets')
          .update({ default_payment_method_id: paymentMethodId })
          .eq('id', wallet.id);
      }
    }

    logger.info({ workspaceId, stripeCustomerId, paymentMethodId }, '[Billing] Card session synced');
    return res.json({ success: true, data: { stripe_customer_id: stripeCustomerId, payment_method_id: paymentMethodId } });
  } catch (err: unknown) {
    logger.error({ err: err instanceof Error ? err.message : err }, '[Billing] syncCardSession failed');
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to sync card session' });
  }
};

export const listPaymentMethods = async (req: AuthRequest, res: Response, _next: NextFunction) => {
  const workspaceId = req.user?.workspace_id;
  if (!workspaceId) return res.status(400).json({ success: false, error: 'Missing workspace context' });

  const stripeClient = getStripe();
  if (!stripeClient) {
    return res.json({ success: true, data: { payment_methods: [], default_payment_method_id: null } });
  }

  try {
    const { data: wallet } = await supabaseAdmin
      .from('wallets')
      .select('stripe_customer_id, default_payment_method_id')
      .eq('workspace_id', workspaceId)
      .single();

    if (!wallet?.stripe_customer_id) {
      return res.json({ success: true, data: { payment_methods: [], default_payment_method_id: null } });
    }

    const [pms, customer] = await Promise.all([
      stripeClient.paymentMethods.list({ customer: wallet.stripe_customer_id, type: 'card' }),
      stripeClient.customers.retrieve(wallet.stripe_customer_id),
    ]);

    const defaultId =
      (customer as any).invoice_settings?.default_payment_method ||
      wallet.default_payment_method_id ||
      null;

    return res.json({
      success: true,
      data: {
        payment_methods: pms.data.map((pm: any) => ({
          id:         pm.id,
          brand:      pm.card.brand,
          last4:      pm.card.last4,
          exp_month:  pm.card.exp_month,
          exp_year:   pm.card.exp_year,
          is_default: pm.id === defaultId,
        })),
        default_payment_method_id: defaultId,
      },
    });
  } catch (err: unknown) {
    logger.error({ err: err instanceof Error ? err.message : err }, '[Billing] listPaymentMethods failed');
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to list payment methods' });
  }
};

// —— DELETE /api/v1/billing/payment-methods/:id ———————————————

export const deletePaymentMethod = async (req: AuthRequest, res: Response, _next: NextFunction) => {
  const workspaceId = req.user?.workspace_id;
  const pmId = req.params.id;
  if (!workspaceId) return res.status(400).json({ success: false, error: 'Missing workspace context' });

  const stripeClient = getStripe();
  if (!stripeClient) return res.status(503).json({ error: 'Payment processing not configured' });

  try {
    const { data: wallet } = await supabaseAdmin
      .from('wallets')
      .select('stripe_customer_id')
      .eq('workspace_id', workspaceId)
      .single();

    if (!wallet?.stripe_customer_id) return res.status(404).json({ error: 'No payment account found' });

    // Verify ownership before detaching
    const pm = await stripeClient.paymentMethods.retrieve(pmId);
    if (pm.customer !== wallet.stripe_customer_id) {
      return res.status(403).json({ error: 'Payment method does not belong to this workspace' });
    }

    await stripeClient.paymentMethods.detach(pmId);
    return res.json({ success: true });
  } catch (err: unknown) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to remove payment method' });
  }
};

// —— POST /api/v1/billing/payment-methods/:id/default —————————

export const setDefaultPaymentMethod = async (req: AuthRequest, res: Response, _next: NextFunction) => {
  const workspaceId = req.user?.workspace_id;
  const pmId = req.params.id;
  if (!workspaceId) return res.status(400).json({ success: false, error: 'Missing workspace context' });

  const stripeClient = getStripe();
  if (!stripeClient) return res.status(503).json({ error: 'Payment processing not configured' });

  try {
    const { data: wallet } = await supabaseAdmin
      .from('wallets')
      .select('id, stripe_customer_id')
      .eq('workspace_id', workspaceId)
      .single();

    if (!wallet?.stripe_customer_id) return res.status(404).json({ error: 'No payment account found' });

    await stripeClient.customers.update(wallet.stripe_customer_id, {
      invoice_settings: { default_payment_method: pmId },
    });

    await supabaseAdmin
      .from('wallets')
      .update({ default_payment_method_id: pmId })
      .eq('id', wallet.id);

    return res.json({ success: true });
  } catch (err: unknown) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to set default payment method' });
  }
};

// —— GET /api/v1/billing/invoices —————————————————————————————

// ── POST /api/v1/billing/subscribe ───────────────────────────────────────────
// Creates a Stripe subscription for the workspace using their default card.
// plan: 'GROWTH' | 'SCALE'

export const createSubscription = async (req: AuthRequest, res: Response, _next: NextFunction) => {
  const workspaceId = req.user?.workspace_id;
  if (!workspaceId) return res.status(400).json({ error: 'Missing workspace context' });

  // ZV-COM-BILL-001 §19.3 — only workspaces that may become billable can convert.
  const { data: wsClass } = await supabaseAdmin
    .from('workspaces')
    .select('billing_classification')
    .eq('id', workspaceId)
    .single();
  const chargeBlock = assertClassificationChargeable(wsClass?.billing_classification as string | null | undefined);
  if (chargeBlock) {
    return res.status(403).json({ error: chargeBlock });
  }

  const { plan, payment_method_id } = req.body as { plan?: string; payment_method_id?: string };
  if (!plan || !['GROWTH', 'SCALE'].includes(plan.toUpperCase())) {
    return res.status(400).json({ error: 'plan must be GROWTH or SCALE' });
  }

  const priceId = plan.toUpperCase() === 'GROWTH' ? env.STRIPE_PRICE_GROWTH : env.STRIPE_PRICE_SCALE;
  if (!priceId) {
    return res.status(503).json({ error: `Stripe price for ${plan} not configured. Add STRIPE_PRICE_${plan.toUpperCase()} to .env` });
  }

  const stripeClient = getStripe();
  if (!stripeClient) return res.status(503).json({ error: 'Payment processing not configured' });

  try {
    const { data: wallet } = await supabaseAdmin
      .from('wallets')
      .select('id, stripe_customer_id, default_payment_method_id, stripe_subscription_id')
      .eq('workspace_id', workspaceId)
      .single();

    if (!wallet?.stripe_customer_id) {
      return res.status(400).json({ error: 'No payment method on file. Add a card first.' });
    }

    // Use explicitly selected card, fall back to default, then any saved card
    const pmId = payment_method_id || wallet.default_payment_method_id;
    if (!pmId) {
      return res.status(400).json({ error: 'No payment card selected. Add a card first.' });
    }

    // Cancel existing subscription if any
    if (wallet.stripe_subscription_id) {
      try {
        await stripeClient.subscriptions.cancel(wallet.stripe_subscription_id);
      } catch { /* subscription may already be cancelled */ }
    }

    const subscription = await stripeClient.subscriptions.create({
      customer:               wallet.stripe_customer_id,
      items:                  [{ price: priceId }],
      default_payment_method: pmId,
      expand:                 ['latest_invoice.payment_intent'],
    }) as any;

    const renewalDate = new Date(subscription.current_period_end * 1000).toISOString();

    // Save subscription ID and renewal date to wallet
    await supabaseAdmin
      .from('wallets')
      .update({
        stripe_subscription_id: subscription.id,
        plan_renewal_date: renewalDate,
        updated_at: new Date().toISOString(),
      })
      .eq('id', wallet.id);

    // Record subscription payment as a transaction for history (idempotent)
    // Monthly launch baselines per ZV-COM-BILL-001: Growth $299, Scale $799.
    const planPriceMap: Record<string, number> = { GROWTH: 299, SCALE: 799 };
    const planAmount = planPriceMap[plan.toUpperCase()] || 0;
    const subChargeId = subscription.latest_invoice?.payment_intent?.id || subscription.id;
    const { data: existingSubTx } = await supabaseAdmin
      .from('wallet_transactions')
      .select('id')
      .eq('stripe_charge_id', subChargeId)
      .maybeSingle();
    if (!existingSubTx) {
    await supabaseAdmin.from('wallet_transactions').insert({
      wallet_id:   wallet.id,
      type:        'CREDIT',
      status:      'AVAILABLE',
      amount:      planAmount,
      net_amount:  planAmount,
      currency:    'USD',
      revenue_class: 'SUBSCRIPTION', // §21 — ZoikoVertex recurring plan revenue
      description: `${plan.toUpperCase()} plan subscription - monthly`,
      stripe_charge_id: subChargeId,
      available_at: new Date().toISOString(),
      created_at:   new Date().toISOString(),
    });
    }

    // Update workspace plan + mark COMMERCIAL (ZV-COM-BILL-001 §19.3).
    // trial_starts_at is the durable "one trial per workspace" marker — it is NOT
    // cleared here: a former trial user (or a paid-then-cancelled workspace) must
    // never regain a fresh 14-day evaluation.
    await supabaseAdmin
      .from('workspaces')
      .update({
        plan_type: plan.toUpperCase(),
        billing_classification: 'COMMERCIAL',
        subscription_status: 'ACTIVE',
        commercial_effective_at: new Date().toISOString(),
        trial_ends_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', workspaceId);

    // Clear dunning state on successful conversion
    await supabaseAdmin
      .from('wallets')
      .update({ last_payment_failed_at: null, payment_failure_count: 0, updated_at: new Date().toISOString() })
      .eq('id', wallet.id);

    // Also update organizations.plan_type (user context reads from here)
    const { data: ws } = await supabaseAdmin
      .from('workspaces')
      .select('org_id')
      .eq('id', workspaceId)
      .single();

    if (ws?.org_id) {
      await supabaseAdmin
        .from('organizations')
        .update({ plan_type: plan.toUpperCase(), updated_at: new Date().toISOString() })
        .eq('id', ws.org_id);
    }

    logger.info({ workspaceId, plan, subscriptionId: subscription.id, renewalDate }, '[Billing] Subscription created');

    return res.json({
      success: true,
      data: {
        subscription_id:      subscription.id,
        plan:                 plan.toUpperCase(),
        renewal_date:         renewalDate,
        status:               subscription.status,
        cancel_at_period_end: subscription.cancel_at_period_end ?? false,
        current_period_end:   renewalDate,
      },
    });
  } catch (err: unknown) {
    logger.error({ err: err instanceof Error ? err.message : err }, '[Billing] createSubscription failed');
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to create subscription' });
  }
};

// ── POST /api/v1/billing/cancel-subscription ─────────────────────────────────
// Cancels the subscription at end of current period (plan stays active until then).

export const cancelSubscription = async (req: AuthRequest, res: Response, _next: NextFunction) => {
  const workspaceId = req.user?.workspace_id;
  if (!workspaceId) return res.status(400).json({ error: 'Missing workspace context' });

  const stripeClient = getStripe();
  if (!stripeClient) return res.status(503).json({ error: 'Payment processing not configured' });

  try {
    const { data: wallet } = await supabaseAdmin
      .from('wallets')
      .select('id, stripe_subscription_id')
      .eq('workspace_id', workspaceId)
      .single();

    if (!wallet?.stripe_subscription_id) {
      return res.status(400).json({ error: 'No active subscription found' });
    }

    // Cancel at period end — plan stays active until renewal date
    const subscription = await stripeClient.subscriptions.update(wallet.stripe_subscription_id, {
      cancel_at_period_end: true,
    }) as any;

    const renewalDate = new Date(subscription.current_period_end * 1000).toISOString();

    await supabaseAdmin
      .from('wallets')
      .update({ plan_renewal_date: renewalDate, updated_at: new Date().toISOString() })
      .eq('id', wallet.id);

    // ZV-COM-BILL-001 §16 — cancellation takes effect at period end.
    await supabaseAdmin
      .from('workspaces')
      .update({ subscription_status: 'CANCEL_AT_PERIOD_END', updated_at: new Date().toISOString() })
      .eq('id', workspaceId);

    logger.info({ workspaceId, subscriptionId: wallet.stripe_subscription_id }, '[Billing] Subscription set to cancel at period end');

    return res.json({
      success: true,
      data: { cancels_at: renewalDate, message: 'Subscription will cancel at end of billing period' },
    });
  } catch (err: unknown) {
    logger.error({ err: err instanceof Error ? err.message : err }, '[Billing] cancelSubscription failed');
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to cancel subscription' });
  }
};

// ── GET /api/v1/billing/subscription ─────────────────────────────────────────
// Returns current subscription status, renewal date, and cancellation state.

export const getSubscription = async (req: AuthRequest, res: Response, _next: NextFunction) => {
  const workspaceId = req.user?.workspace_id;
  if (!workspaceId) return res.status(400).json({ error: 'Missing workspace context' });

  const stripeClient = getStripe();

  try {
    const { data: wallet } = await supabaseAdmin
      .from('wallets')
      .select('stripe_subscription_id, plan_renewal_date')
      .eq('workspace_id', workspaceId)
      .single();

    if (!wallet?.stripe_subscription_id || !stripeClient) {
      return res.json({ success: true, data: { subscription: null } });
    }

    const sub = await stripeClient.subscriptions.retrieve(wallet.stripe_subscription_id) as any;

    return res.json({
      success: true,
      data: {
        subscription: {
          id:                  sub.id,
          status:              sub.status,
          cancel_at_period_end: sub.cancel_at_period_end,
          current_period_end:  new Date(sub.current_period_end * 1000).toISOString(),
          plan:                sub.items.data[0]?.price?.lookup_key || sub.items.data[0]?.price?.id,
        },
      },
    });
  } catch (err: unknown) {
    logger.error({ err: err instanceof Error ? err.message : err }, '[Billing] getSubscription failed');
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to get subscription' });
  }
};

export const listInvoices = async (req: AuthRequest, res: Response, _next: NextFunction) => {
  const workspaceId = req.user?.workspace_id;
  if (!workspaceId) return res.status(400).json({ success: false, error: 'Missing workspace context' });

  const stripeClient = getStripe();
  if (!stripeClient) {
    return res.json({ success: true, data: { invoices: [] } });
  }

  try {
    const { data: wallet } = await supabaseAdmin
      .from('wallets')
      .select('stripe_customer_id')
      .eq('workspace_id', workspaceId)
      .single();

    if (!wallet?.stripe_customer_id) {
      return res.json({ success: true, data: { invoices: [] } });
    }

    const [invoices, subscriptions] = await Promise.all([
      stripeClient.invoices.list({ customer: wallet.stripe_customer_id, limit: 24 }),
      stripeClient.subscriptions.list({ customer: wallet.stripe_customer_id, limit: 1, status: 'active' }),
    ]);

    const activeSub = subscriptions.data[0];
    const nextRenewal = activeSub?.current_period_end
      ? new Date(activeSub.current_period_end * 1000).toISOString()
      : null;

    return res.json({
      success: true,
      data: {
        next_renewal: nextRenewal,
        invoices: invoices.data.map((inv: any) => ({
          id:           inv.id,
          created:      inv.created,
          status:       inv.status,
          amount_paid:  inv.amount_paid,
          amount_due:   inv.amount_due,
          currency:     inv.currency,
          description:  inv.description || inv.lines?.data?.[0]?.description || null,
          invoice_pdf:  inv.invoice_pdf,
          hosted_url:   inv.hosted_invoice_url,
        })),
      },
    });
  } catch (err: unknown) {
    logger.error({ err: err instanceof Error ? err.message : err }, '[Billing] listInvoices failed');
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to list invoices' });
  }
};

// —— PUT /api/v1/billing/wallet/auto-topup ————————————————————

export const updateAutoTopup = async (req: AuthRequest, res: Response, _next: NextFunction) => {
  const workspaceId = req.user?.workspace_id;
  if (!workspaceId) return res.status(400).json({ success: false, error: 'Missing workspace context' });

  const { auto_topup_enabled, auto_topup_threshold, auto_topup_amount } = req.body;

  try {
    const { data: wallet, error } = await supabaseAdmin
      .from('wallets')
      .upsert({
        workspace_id:          workspaceId,
        auto_topup_enabled:    Boolean(auto_topup_enabled),
        auto_topup_threshold:  Number(auto_topup_threshold) || 50,
        auto_topup_amount:     Number(auto_topup_amount)    || 500,
      }, { onConflict: 'workspace_id', ignoreDuplicates: false })
      .select()
      .single();

    if (error) throw error;
    return res.json({ success: true, data: wallet });
  } catch {
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// ── POST /api/v1/billing/trial/start ─────────────────────────────────────────
// ZV-COM-BILL-001 §6.2 — optional 14-day no-card Growth evaluation.
// No automatic conversion; Autonomous Mode stays disabled (execution_mode_max=ASSISTED).
// At expiry the workspace settles back to Vertex Starter (data preserved).

export const startTrial = async (req: AuthRequest, res: Response, _next: NextFunction) => {
  const workspaceId = req.user?.workspace_id;
  if (!workspaceId) return res.status(400).json({ success: false, error: 'Missing workspace context' });

  try {
    const { data: workspace } = await supabaseAdmin
      .from('workspaces')
      .select('billing_classification, subscription_status, plan_type, org_id, trial_ends_at, trial_starts_at')
      .eq('id', workspaceId)
      .single();

    if (!workspace) return res.status(404).json({ success: false, error: 'Workspace not found' });

    // ZV-COM-BILL-001 §6 — one trial per workspace, no auto-convert, no restart.
    // trial_starts_at is the durable "trial used" marker: once a trial has ever
    // started, the workspace may never start another evaluation — continuing after
    // expiry requires a real paid conversion.
    if (workspace.subscription_status === 'TRIAL_GROWTH') {
      const active = workspace.trial_ends_at && new Date(workspace.trial_ends_at) > new Date();
      if (active) {
        return res.json({ success: true, data: { trial_active: true, trial_ends_at: workspace.trial_ends_at } });
      }
      // Expired trial that was never settled — settle to Starter (data preserved),
      // then block any restart below (trial_starts_at is set).
      await settleBillingState(workspaceId, {
        billing_classification: 'FREE_STARTER',
        subscription_status: 'FREE_ACTIVE',
        trial_active: false,
        trial_ends_at: null,
        dunning_days: null,
        execution: { publish: true, campaignCreate: true, budgetIncrease: true, connectorWrite: true },
        plan: 'STARTER',
      });
    }

    // Never-trialled free workspaces may start one evaluation. Anything that has
    // already trialled (trial_starts_at set) or is not a plain free workspace is
    // blocked — no unlimited 14-day evaluations.
    const classification = (workspace.billing_classification ?? 'FREE_STARTER').toUpperCase();
    if (workspace.trial_starts_at) {
      return res.status(400).json({
        success: false,
        error: 'This workspace has already used its 14-day trial. Upgrade to a paid plan to continue using Growth features.',
      });
    }
    if (classification !== 'FREE_STARTER') {
      return res.status(400).json({
        success: false,
        error: 'A trial can only be started from the free Vertex Starter plan.',
      });
    }

    const startsAt = new Date();
    const endsAt = new Date(startsAt.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString();

    await supabaseAdmin.from('workspaces').update({
      plan_type: 'GROWTH',
      billing_classification: 'EVALUATION_NON_BILLABLE',
      subscription_status: 'TRIAL_GROWTH',
      trial_starts_at: startsAt.toISOString(),
      trial_ends_at: endsAt,
      updated_at: startsAt.toISOString(),
    }).eq('id', workspaceId);

    if (workspace.org_id) {
      await supabaseAdmin.from('organizations').update({
        plan_type: 'GROWTH',
        updated_at: startsAt.toISOString(),
      }).eq('id', workspace.org_id);
    }

    logger.info({ workspaceId, endsAt }, '[Billing] 14-day Growth trial started');
    return res.json({
      success: true,
      data: {
        trial_active: true,
        trial_ends_at: endsAt,
        message: '14-day Vertex Growth trial started. No card required — you will not be charged automatically.',
      },
    });
  } catch (err) {
    logger.error({ err: err instanceof Error ? err.message : err }, '[Billing] startTrial failed');
    return res.status(500).json({ success: false, error: 'Failed to start trial' });
  }
};

// ── GET /api/v1/billing/status ───────────────────────────────────────────────
// ZV-COM-BILL-001 §13/§26 — canonical billing state + permitted execution actions.
// Settles expired trials and persisted dunning states lazily.

export const getBillingStatus = async (req: AuthRequest, res: Response, _next: NextFunction) => {
  const workspaceId = req.user?.workspace_id;
  if (!workspaceId) return res.status(400).json({ success: false, error: 'Missing workspace context' });

  try {
    const [wsRes, walletRes] = await Promise.all([
      supabaseAdmin
        .from('workspaces')
        .select('plan_type, billing_classification, subscription_status, trial_starts_at, trial_ends_at, commercial_effective_at')
        .eq('id', workspaceId)
        .single(),
      supabaseAdmin
        .from('wallets')
        .select('last_payment_failed_at, payment_failure_count')
        .eq('workspace_id', workspaceId)
        .maybeSingle(),
    ]);

    if (wsRes.error || !wsRes.data) {
      return res.status(404).json({ success: false, error: 'Workspace not found' });
    }

    const { state, needsSettlement } = await resolveBillingState(wsRes.data, walletRes.data);
    if (needsSettlement) {
      await settleBillingState(workspaceId, state);
    }

    return res.json({
      success: true,
      data: {
        ...state,
        billing_classification: state.billing_classification,
        subscription_status: state.subscription_status,
        trial_starts_at: wsRes.data.trial_starts_at ?? null,
        commercial_effective_at: wsRes.data.commercial_effective_at ?? null,
        payment_failure_count: walletRes.data?.payment_failure_count ?? 0,
      },
    });
  } catch (err) {
    logger.error({ err: err instanceof Error ? err.message : err }, '[Billing] getBillingStatus failed');
    return res.status(500).json({ success: false, error: 'Failed to resolve billing status' });
  }
};
