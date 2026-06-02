/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../../shared/supabase';
import { AuthRequest }   from '../../shared/authMiddleware';
import { env }           from '../../config/env';
import { logger }        from '../../shared/logger';

// â”€â”€ Stripe (optional â€” gracefully disabled if package not installed) â”€â”€
let stripe: any = null;
function getStripe(): any | null {
  if (stripe) return stripe;
  if (!env.STRIPE_SECRET_KEY) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Stripe = require('stripe');
    stripe = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });
  } catch { logger.warn('[Wallet] stripe package not installed â€” run: npm install stripe in backend'); }
  return stripe;
}

// â”€â”€ Fee constants (Stripe standard card rate) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€ Fee calculator â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€ GET /api/v1/billing/wallet â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€ GET /api/v1/billing/fees â€” calculate fees before deposit â”€â”€

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

// â”€â”€ POST /api/v1/billing/deposit/create â€” Stripe Checkout â”€â”€â”€â”€â”€

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

    // Create Stripe Checkout Session
    const session = await stripeClient.checkout.sessions.create({
      customer:   stripeCustomerId,
      mode:       'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency:     currency.toLowerCase(),
            unit_amount:  grossCents,
            product_data: {
              name:        `ZoikoVertex Campaign Credits â€” $${amount.toFixed(2)}`,
              description: `$${fees.netCredits.toFixed(2)} campaign wallet credits (includes $${fees.stripeFee.toFixed(2)} processing fee). Non-refundable.`,
            },
          },
        },
      ],
      success_url: `${env.FRONTEND_URL}/wallet?deposit=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${env.FRONTEND_URL}/wallet?deposit=cancelled`,
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
    logger.error({ err: err instanceof Error ? err.message : err }, '[Wallet] createDepositSession failed');
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to create payment session' });
  }
};

// â”€â”€ POST /api/v1/billing/webhook â€” Stripe webhook â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Must use raw body (registered before express.json() in server.ts)

export const stripeWebhook = async (req: Request, res: Response) => {
  const sig     = req.headers['stripe-signature'] as string;
  const secret  = env.STRIPE_WEBHOOK_SECRET;

  if (!secret) return res.status(200).json({ received: true }); // passthrough if not configured

  const stripeClient = getStripe();
  if (!stripeClient) return res.status(200).json({ received: true });

  let event: any;
  try {
    event = stripeClient.webhooks.constructEvent(req.body, sig, secret);
  } catch (err: unknown) {
    logger.warn({ err: err instanceof Error ? err.message : err }, '[Wallet] Webhook signature verification failed');
    return res.status(400).send(`Webhook Error: ${err instanceof Error ? err.message : String(err)}`);
  }

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
          stripe_fee:               stripeFee,
          tax_amount:               taxAmount,
          currency,
          stripe_payment_intent_id: session.payment_intent,
          stripe_charge_id:         session.id,
          initiated_by:             meta.initiated_by || null,
          available_at:             resolvedAt,
          description:              `Campaign credits deposit â€” processing`,
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

  return res.json({ received: true });
};

// â”€â”€ POST /api/v1/billing/deposit/simulate (dev only) â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€ GET /api/v1/billing/wallet/balance â€” quick balance check â”€â”€

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

// â”€â”€ GET /api/v1/billing/spend-cap â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const getSpendCap = async (req: AuthRequest, res: Response, _next: NextFunction) => {
  const workspaceId = req.user?.workspace_id;
  if (!workspaceId) return res.status(400).json({ success: false, error: 'Missing workspace context' });

  try {
    const { data: wallet } = await supabaseAdmin
      .from('wallets')
      .select('spend_cap_enabled')
      .eq('workspace_id', workspaceId)
      .single();

    return res.json({ success: true, data: { spend_cap_enabled: wallet?.spend_cap_enabled ?? true } });
  } catch {
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// â”€â”€ PATCH /api/v1/billing/spend-cap â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const updateSpendCap = async (req: AuthRequest, res: Response, _next: NextFunction) => {
  const workspaceId = req.user?.workspace_id;
  if (!workspaceId) return res.status(400).json({ success: false, error: 'Missing workspace context' });

  const { spend_cap_enabled } = req.body;

  try {
    const { data: wallet, error } = await supabaseAdmin
      .from('wallets')
      .upsert(
        { workspace_id: workspaceId, spend_cap_enabled: Boolean(spend_cap_enabled) },
        { onConflict: 'workspace_id', ignoreDuplicates: false }
      )
      .select('spend_cap_enabled')
      .single();

    if (error) throw error;
    return res.json({ success: true, data: { spend_cap_enabled: wallet?.spend_cap_enabled } });
  } catch {
    return res.status(500).json({ success: false, error: 'Failed to update spend cap' });
  }
};

// â”€â”€ GET /api/v1/billing/settings â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const getBillingSettings = async (req: AuthRequest, res: Response, _next: NextFunction) => {
  const workspaceId = req.user?.workspace_id;
  if (!workspaceId) return res.status(400).json({ success: false, error: 'Missing workspace context' });

  try {
    const { data: workspace } = await supabaseAdmin
      .from('workspaces')
      .select('billing_email, billing_additional_emails')
      .eq('id', workspaceId)
      .single();

    return res.json({
      success: true,
      data: {
        billing_email:             workspace?.billing_email            || '',
        billing_additional_emails: workspace?.billing_additional_emails || [],
      },
    });
  } catch {
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// â”€â”€ PATCH /api/v1/billing/settings â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€ POST /api/v1/billing/payment-methods/setup â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€ GET /api/v1/billing/payment-methods â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€ DELETE /api/v1/billing/payment-methods/:id â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€ POST /api/v1/billing/payment-methods/:id/default â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€ GET /api/v1/billing/invoices â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€ PUT /api/v1/billing/wallet/auto-topup â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
