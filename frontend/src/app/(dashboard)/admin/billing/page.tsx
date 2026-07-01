"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Zap, CheckCircle2, Crown, Globe, Database, DollarSign,
  Loader2, Activity, FileText, Download, Rocket,
  TrendingUp, ArrowUpRight, X, Plus, Wallet,
  Clock, AlertCircle, ArrowDownCircle, Shield, Info,
  CreditCard, Trash2, Star,
} from "lucide-react";
import { api } from "@/lib/api";
import { createPortal } from "react-dom";
import { useRoleContext } from "@/lib/context/RoleContext";
import ConfirmActionModal from "@/components/ConfirmActionModal";

// â"€â"€ Types â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

interface UsageSummaryItem { quantity: number; cost: number; unit: string; }

interface WalletTransaction {
  id: string;
  amount: number;
  net_amount?: number;
  gross_amount?: number;
  stripe_fee?: number;
  type: "CREDIT" | "DEBIT";
  status?: "PROCESSING" | "AVAILABLE" | "COMPLETED" | "FAILED" | "REFUNDED";
  description: string;
  campaign_name: string | null;
  created_at: string;
  available_at?: string;
  currency?: string;
  stripe_charge_id?: string;
}

interface WalletData {
  balance: number;
  available_balance?: number;
  processing_balance?: number;
  total_deposited?: number;
  currency: string;
  auto_topup_enabled: boolean;
  auto_topup_threshold: number;
  auto_topup_amount: number;
}

interface FeeBreakdown {
  net_credits: number;
  stripe_fee: number;
  tax_amount: number;
  total_charge: number;
  currency: string;
  breakdown: { label: string; amount: number; is_total?: boolean }[];
  non_refundable_notice: string;
  processing_notice: string;
}

interface PaymentMethod {
  id: string;
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
  is_default: boolean;
}

// â"€â"€ Plan data â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

const PLANS = [
  {
    id: "starter",
    name: "Vertex Starter",
    price: 0,
    annual: null,
    period: "/ month",
    desc: "Start with visibility. Connect limited channels and understand your social governance posture.",
    icon: Globe,
    features: [
      "2 users", "2 connected social profiles",
      "1 workspace & 1 brand", "AI agent preview only",
      "Analytics snapshot", "Basic activity log",
      "30-day data retention", "Email & help center support",
    ],
    limits: ["No live publishing", "No approval workflows", "No Brand Library", "No Crisis Console"],
  },
  {
    id: "growth",
    name: "Vertex Growth",
    price: 399,
    annual: 299,
    period: "/ month",
    desc: "Run governed campaigns with AI-assisted content, approvals, publishing, and audit-ready execution.",
    icon: Rocket,
    features: [
      "7 included users", "8 connected social profiles",
      "1 brand workspace", "5 AI agents (standard governed mode)",
      "Full Campaigns & Content Studio", "Review Queue, Validation & Approvals",
      "Standard Inbox / Engagement", "Immutable audit trail + export controls",
      "12-month data retention", "Priority email support",
    ],
    limits: ["No multi-brand portfolio", "No Crisis Console", "No legal hold", "No SSO/SCIM"],
  },
  {
    id: "scale",
    name: "Vertex Scale",
    price: 999,
    annual: 799,
    period: "/ month",
    desc: "Coordinate multi-brand teams with advanced approvals, governed agents, and cross-brand performance intelligence.",
    icon: TrendingUp,
    features: [
      "20 included users", "25 connected social profiles",
      "Up to 5 brands / workspaces", "5 AI agents (advanced governed mode)",
      "Advanced multi-stage approvals + multi-key", "Full Brand Library",
      "Crisis Console (standard)", "Advanced evidence packaging",
      "24-month data retention", "Named Customer Success Manager",
    ],
    limits: ["No full legal hold", "No dedicated environment", "No custom SLA credits"],
  },
  {
    id: "corporate",
    name: "Vertex Corporate",
    price: null,
    annual: null,
    period: "pricing",
    desc: "Deploy across corporate brands, regulated workflows, executive oversight, and custom governance architecture.",
    icon: Crown,
    features: [
      "Custom users & profiles", "Custom multi-entity workspaces",
      "5 AI agents (custom-governed)", "Three-key approval protocol",
      "Evidence Vault + legal hold", "Full Crisis Console",
      "SSO / SAML / SCIM", "Custom data retention",
      "DPA & sub-processor list", "TAM + AE + agreed SLA",
    ],
    limits: [],
  },
];

// â"€â"€ Plan stat map (avoids fragile feature-string splitting) â"€â"€â"€â"€
const PLAN_STATS: Record<string, { users: string; profiles: string; brands: string; agents: string }> = {
  starter:   { users: "2",      profiles: "2",      brands: "1",        agents: "Preview" },
  growth:    { users: "7",      profiles: "8",      brands: "1",        agents: "5" },
  scale:     { users: "20",     profiles: "25",     brands: "Up to 5",  agents: "5" },
  corporate: { users: "Custom", profiles: "Custom", brands: "Custom",   agents: "5 (Custom)" },
};

// â"€â"€ Main Component â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

// Maps billing page plan IDs â†' DB plan_type values sent to the API
const PLAN_ID_TO_DB: Record<string, string> = {
  starter:   'STARTER',
  growth:    'GROWTH',
  scale:     'SCALE',
  corporate: 'ENTERPRISE',
};

export default function BillingPage() {
  const { refresh: refreshRole } = useRoleContext();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"credits" | "billing">("billing");
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [changingPlan, setChangingPlan] = useState<string | null>(null);
  const [planMessage, setPlanMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Deposit flow state
  const [depositStep, setDepositStep]   = useState<"amount" | "fees" | "confirm">("amount");
  const [depositAmount, setDepositAmount] = useState("");
  const [fees, setFees]                 = useState<FeeBreakdown | null>(null);
  const [loadingFees, setLoadingFees]   = useState(false);
  const [depositing, setDepositing]     = useState(false);
  const [depositError, setDepositError] = useState<string | null>(null);
  const [confirmed, setConfirmed]       = useState(false);
  const [depositToast, setDepositToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setDepositToast({ msg, type });
    setTimeout(() => setDepositToast(null), 5000);
  };

  const resetDeposit = () => {
    setDepositStep("amount"); setDepositAmount(""); setFees(null);
    setConfirmed(false); setDepositError(null);
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  // State
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(true);
  const [summary, setSummary] = useState<Record<string, UsageSummaryItem>>({});
  const [loadingUsage, setLoadingUsage] = useState(true);

  const [wallet, setWallet] = useState<WalletData>({
    balance: 0, currency: "USD",
    auto_topup_enabled: false, auto_topup_threshold: 50, auto_topup_amount: 500
  });
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loadingWallet, setLoadingWallet] = useState(true);

  // Overcharge
  const [overchargeEnabled, setOverchargeEnabled] = useState(false);
  const [overchargeLoading, setOverchargeLoading] = useState(false);

  // Payment cards
  const [cards, setCards]               = useState<PaymentMethod[]>([]);
  const [cardsLoading, setCardsLoading] = useState(false);
  const [addingCard, setAddingCard]     = useState(false);
  const [cardError, setCardError]       = useState<string | null>(null);

  // Plan renewal date (from billing settings)
  const [planRenewalDate, setPlanRenewalDate] = useState<string | null>(null);

  // Subscription
  const [subscription, setSubscription] = useState<{ status: string; cancel_at_period_end: boolean; current_period_end: string } | null>(null);
  // Invoices
  const [invoices, setInvoices] = useState<{ id: string; created: number; status: string; amount_paid: number; currency: string; description: string | null; invoice_pdf: string | null; hosted_url: string | null }[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [subscribeError, setSubscribeError] = useState<string | null>(null);
  // Upgrade confirmation modal
  const [upgradeConfirm, setUpgradeConfirm] = useState<{ planId: string; planName: string; price: number } | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [showCancelSub, setShowCancelSub] = useState(false);

  // Load Data
  useEffect(() => {
    const fetchData = async () => {
      setLoadingUsage(true);
      setLoadingWallet(true);
      setLoadingPlan(true);
      try {
        const ctx = await api.get("/api/v1/user/context");
        if (ctx.success && ctx.data?.workspace_id) {
          if (ctx.data.plan_type) {
            let planId = ctx.data.plan_type.toLowerCase();
            if (planId === 'free')       planId = 'starter';
            if (planId === 'enterprise') planId = 'corporate';
            setActivePlanId(PLANS.find(p => p.id === planId) ? planId : 'starter');
          } else {
            setActivePlanId('starter');
          }

          const [usageRes, walletRes, overchargeRes, cardsRes, settingsRes, subRes] = await Promise.allSettled([
            api.get(`/api/v1/monitoring/usage?workspaceId=${ctx.data.workspace_id}`),
            api.get('/api/v1/billing/wallet'),
            api.get('/api/v1/billing/overcharge'),
            api.get('/api/v1/billing/payment-methods'),
            api.get('/api/v1/billing/settings'),
            api.get('/api/v1/billing/subscription'),
          ]);

          if (usageRes.status === 'fulfilled' && usageRes.value?.success)
            setSummary(usageRes.value.data?.summary || {});

          if (overchargeRes.status === 'fulfilled' && overchargeRes.value?.success) {
            const enabled = overchargeRes.value.data?.overcharge_enabled ?? false;
            setOverchargeEnabled(enabled);
          }

          if (cardsRes.status === 'fulfilled' && cardsRes.value?.success) {
            setCards(cardsRes.value.data?.payment_methods || []);
          }

          if (settingsRes.status === 'fulfilled' && settingsRes.value?.success) {
            setPlanRenewalDate(settingsRes.value.data?.next_renewal_date || null);
          }

          if (subRes.status === 'fulfilled' && subRes.value?.success) {
            const sub = subRes.value.data?.subscription;
            if (sub) {
              setSubscription(sub);
              setPlanRenewalDate(sub.current_period_end);
            }
          }

          if (walletRes.status === 'fulfilled' && walletRes.value?.success) {
            setWallet(walletRes.value.data?.wallet || {
              balance: 0, currency: "USD",
              auto_topup_enabled: false, auto_topup_threshold: 50, auto_topup_amount: 500,
            });
            setTransactions(walletRes.value.data?.transactions || []);
          }
        }
      } catch { /* silent */ }
      finally {
        setLoadingUsage(false);
        setLoadingWallet(false);
        setLoadingPlan(false);
      }
    };
    fetchData();
  }, []);

  // Handle return from Stripe Checkout
  useEffect(() => {
    const deposit = searchParams?.get("deposit");
    const card    = searchParams?.get("card");
    const sessionId = searchParams?.get("session_id");

    // Clear Stripe return params from URL so refresh doesn't retrigger
    if (deposit || card) {
      router.replace('/admin/billing', { scroll: false });
    }

    if (deposit === "success") {
      setActiveTab("credits");
      const sessionId = searchParams?.get("session_id");
      if (sessionId) {
        // Sync the session to record the deposit (works without webhook secret)
        api.post('/api/v1/billing/deposit/sync-session', { session_id: sessionId })
          .then(r => {
            if (r.success && r.data?.credited) {
              showToast(`Payment received! $${r.data.amount} is processing and will be available within 48 hours.`, "success");
              if (r.data?.receipt_url) {
                window.open(r.data.receipt_url, '_blank', 'noopener');
              }
            } else {
              showToast("Payment received — credits will appear shortly.", "success");
            }
            // Refresh wallet + transactions
            return api.get('/api/v1/billing/wallet');
          })
          .then(walletRes => {
            if (walletRes?.success) {
              setWallet(walletRes.data?.wallet || wallet);
              setTransactions(walletRes.data?.transactions || []);
            }
          })
          .catch(() => showToast("Payment received — refresh to see your balance.", "success"));
      } else {
        showToast("Payment received! Credits are processing and will be available within 48 hours.", "success");
      }
    } else if (deposit === "cancelled") {
      showToast("Deposit cancelled -- no charge was made.", "error");
    }

    if (card === "added") {
      setActiveTab("billing");
      // Sync the Stripe session to save customer ID and set default card
      const syncAndRefresh = async () => {
        if (sessionId) {
          try {
            await api.post('/api/v1/billing/payment-methods/sync-session', { session_id: sessionId });
          } catch {
            showToast("Card added but could not sync — refresh the page if card doesn't appear.", "error");
            return;
          }
        }
        try {
          const r = await api.get('/api/v1/billing/payment-methods');
          if (r.success) setCards(r.data?.payment_methods || []);
        } catch { /* non-fatal — cards will show on next load */ }
      };
      syncAndRefresh();
      showToast("Card saved successfully!", "success");
    } else if (card === "cancelled") {
      showToast("Card setup cancelled.", "error");
    }
  }, [searchParams, router, wallet]);  

  // Deposit: calculate fees
  const handleCalculateFees = async () => {
    const val = parseFloat(depositAmount);
    if (!val || val <= 0)    { setDepositError("Enter a valid amount"); return; }
    if (val < 10)            { setDepositError("Minimum deposit is $10"); return; }
    if (val > 100_000)       { setDepositError("Maximum deposit is $100,000"); return; }
    setLoadingFees(true); setDepositError(null);
    try {
      const r = await api.post("/api/v1/billing/fees", { amount: val, currency: wallet.currency || "USD" });
      setFees(r.data?.data ?? r.data);
      setDepositStep("fees");
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setDepositError(msg || "Failed to calculate fees");
    } finally { setLoadingFees(false); }
  };

  // Deposit: confirm and pay
  const handleConfirmDeposit = async () => {
    if (!fees || !confirmed) return;
    setDepositing(true); setDepositError(null);
    try {
      const r = await api.post("/api/v1/billing/deposit/create", {
        amount: fees.net_credits, currency: fees.currency,
      });

      // Backend returns { success, session_url, session_id, fees } at top level
      const sessionUrl = r?.session_url || r?.data?.session_url;
      const errMsg     = r?.error      || r?.data?.error;

      if (sessionUrl) {
        window.location.assign(sessionUrl);
        return;
      }

      if (errMsg) {
        // Dev mode: Stripe not configured
        if (errMsg.includes("not configured") || errMsg.includes("STRIPE_SECRET_KEY")) {
          await api.post("/api/v1/billing/deposit/simulate", { amount: fees.net_credits });
          showToast(`Credits added (dev mode) — $${fees.net_credits} queued as Processing`, "success");
          setShowTopUpModal(false); resetDeposit();
          const walletRes = await api.get('/api/v1/billing/wallet');
          if (walletRes.success) { setWallet(walletRes.data?.wallet || wallet); setTransactions(walletRes.data?.transactions || []); }
        } else {
          setDepositError(errMsg);
        }
        return;
      }

      // Fallback: no session URL and no error (shouldn't happen)
      setDepositError("Could not start payment session. Please try again.");
    } catch (e: unknown) {
      setDepositError(e instanceof Error ? e.message : "Failed to create payment session");
    } finally { setDepositing(false); }
  };

  const fmtCurrency = (n: number, cur = "USD") =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: cur }).format(n);

  const activePlan = PLANS.find(p => p.id === (activePlanId ?? 'starter')) || PLANS[0];
  const ActiveIcon = activePlan.icon;
  const activePlanPrice =
    activePlan.price === null ? "Custom pricing"
    : activePlan.price === 0  ? "Free"
    : `$${activePlan.price}${activePlan.period}`;

  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [updatingAutoTopup, setUpdatingAutoTopup] = useState(false);
  const handleAutoTopupChange = async (updates: Partial<WalletData>) => {
    const previousWallet = wallet;
    const newWallet = { ...wallet, ...updates };
    setWallet(newWallet);
    setUpdatingAutoTopup(true);
    try {
      await api.put('/api/v1/billing/wallet/auto-topup', newWallet);
    } catch {
      setWallet(previousWallet);
    } finally {
      setUpdatingAutoTopup(false);
    }
  };

  const handleOverchargeToggle = async () => {
    const newVal = !overchargeEnabled;
    setOverchargeEnabled(newVal);
    if (!newVal) setActiveTab('billing');
    setOverchargeLoading(true);
    try {
      await api.patch('/api/v1/billing/overcharge', { overcharge_enabled: newVal });
      showToast(`Overcharge ${newVal ? 'enabled' : 'disabled'}`, 'success');
    } catch {
      setOverchargeEnabled(!newVal);
      showToast('Failed to update overcharge setting', 'error');
    } finally {
      setOverchargeLoading(false);
    }
  };

  const handleAddCard = async () => {
    setAddingCard(true); setCardError(null);
    try {
      const r = await api.post('/api/v1/billing/payment-methods/setup-checkout', {});
      if (r.data?.url) {
        window.location.assign(r.data.url);
      } else {
        setCardError("Could not open card setup. Please try again.");
      }
    } catch { setCardError("Failed to start card setup."); }
    finally { setAddingCard(false); }
  };

  const handleDeleteCard = async (pmId: string) => {
    const card = cards.find(c => c.id === pmId);
    if (cards.length === 1) {
      showToast("You must have at least one card on file.", "error");
      return;
    }
    if (card?.is_default) {
      showToast("Set another card as default before removing this one.", "error");
      return;
    }
    try {
      await api.delete(`/api/v1/billing/payment-methods/${pmId}`);
      setCards(prev => prev.filter(c => c.id !== pmId));
      showToast("Card removed", "success");
    } catch { showToast("Failed to remove card", "error"); }
  };

  const handleSetDefaultCard = async (pmId: string) => {
    try {
      await api.post(`/api/v1/billing/payment-methods/${pmId}/default`, {});
      setCards(prev => prev.map(c => ({ ...c, is_default: c.id === pmId })));
      showToast("Default card updated", "success");
    } catch { showToast("Failed to update default card", "error"); }
  };

  const handleSubscribe = async (planId: string) => {
    // Corporate — contact sales, no Stripe
    if (planId === 'corporate') return;

    // Starter/Free downgrade — just update DB, no Stripe
    if (planId === 'starter') {
      setChangingPlan('starter');
      try {
        await api.patch('/api/v1/admin/plan', { plan_type: 'STARTER' });
        setActivePlanId('starter');
        setShowUpgradeModal(false);
        showToast('Downgraded to Starter plan.', 'success');
      } catch { showToast('Failed to change plan.', 'error'); }
      finally { setChangingPlan(null); }
      return;
    }

    // Growth / Scale — show confirmation modal first (don't charge yet)
    const plan = PLANS.find(p => p.id === planId);
    if (!plan || !plan.price) return;
    setSubscribeError(null);
    setSelectedCardId(cards.find(c => c.is_default)?.id || cards[0]?.id || null);
    setUpgradeConfirm({ planId, planName: plan.name, price: plan.price });
  };

  const confirmSubscribe = async () => {
    if (!upgradeConfirm) return;
    const planMap: Record<string, string> = { growth: 'GROWTH', scale: 'SCALE' };
    const stripePlan = planMap[upgradeConfirm.planId];
    if (!stripePlan) return;

    setSubscribing(true); setSubscribeError(null);
    try {
      const r = await api.post('/api/v1/billing/subscribe', { plan: stripePlan, payment_method_id: selectedCardId });
      if (r.success) {
        setActivePlanId(upgradeConfirm.planId);
        setSubscription(r.data);
        setPlanRenewalDate(r.data?.renewal_date || null);
        setUpgradeConfirm(null);
        setShowUpgradeModal(false);
        showToast(`Upgraded to ${upgradeConfirm.planName}! Your card has been charged.`, 'success');
      } else {
        setSubscribeError(r.error || 'Subscription failed. Please try again.');
      }
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setSubscribeError(msg || 'Subscription failed. Please try again.');
    } finally { setSubscribing(false); }
  };

  const handleCancelSubscription = async () => {
    setShowCancelSub(true);
  };

  const confirmCancelSubscription = async () => {
    try {
      const r = await api.post('/api/v1/billing/cancel-subscription', {});
      if (r.success) {
        setSubscription(prev => prev ? { ...prev, cancel_at_period_end: true } : null);
        showToast(`Subscription cancelled -- active until ${new Date(r.data?.cancels_at).toLocaleDateString()}`, "success");
      }
    } catch { showToast("Failed to cancel subscription", "error"); }
    finally { setShowCancelSub(false); }
  };

  const handleChangePlan = async (planId: string) => {
    const dbPlan = PLAN_ID_TO_DB[planId];
    if (!dbPlan || planId === activePlanId) return;
    setChangingPlan(planId);
    setPlanMessage(null);
    try {
      const res = await api.patch('/api/v1/admin/plan', { plan_type: dbPlan });
      if (res?.success === false) {
        setPlanMessage({ type: 'error', text: res.error || 'Failed to change plan.' });
      } else {
        setActivePlanId(planId);
        setPlanMessage({ type: 'success', text: `Plan updated to ${PLANS.find(p => p.id === planId)?.name ?? planId}!` });
        // Bust the RoleContext cache so the new plan is reflected immediately everywhere
        await refreshRole();
        setTimeout(() => setShowUpgradeModal(false), 1200);
      }
    } catch {
      setPlanMessage({ type: 'error', text: 'Something went wrong. Please try again.' });
    } finally {
      setChangingPlan(null);
    }
  };

  const handleDownloadCSV = () => {
    if (transactions.length === 0) return;
    const header = "Date,Description,Type,Amount\n";
    const rows = transactions.map(tx =>
      `${new Date(tx.created_at).toLocaleDateString()},${JSON.stringify(tx.description || "")},${tx.type},$${Number(tx.amount).toFixed(2)}`
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transactions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-8 pb-24">
      {/* â"€â"€ Header â"€â"€ */}
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-semibold text-foreground tracking-tight">Billing & Administration</h1>
        <p className="text-sm text-foreground-muted">Manage your workspace plan, platform usage, and credits.</p>
      </div>

      {/* â"€â"€ Tabs â"€â"€ */}
      <div className="flex items-center gap-6 border-b border-border overflow-x-auto">
        <button type="button"
          onClick={() => setActiveTab("credits")}
          className={`pb-3 text-sm font-medium transition-colors border-b-2 ${
            activeTab === "credits" ? "border-white text-foreground" : "border-transparent text-foreground-muted hover:text-foreground-muted"
          }`}
        >
          Credits
        </button>
        <button 
          onClick={() => {
            setActiveTab("billing");
            if (invoices.length === 0) {
              setLoadingInvoices(true);
              api.get('/api/v1/billing/invoices').then(r => {
                if (r.success) setInvoices(r.data?.invoices || []);
              }).catch(() => {}).finally(() => setLoadingInvoices(false));
            }
          }}
          className={`pb-3 text-sm font-medium transition-colors border-b-2 ${
            activeTab === "billing" ? "border-white text-foreground" : "border-transparent text-foreground-muted hover:text-foreground-muted"
          }`}
        >
          Billing & Usage
        </button>
      </div>

      {/* â"€â"€ Tab Content: Credits â"€â"€ */}
      {activeTab === "credits" && (
        <div className="space-y-6">
          {!overchargeEnabled && (
            <div className="bg-surface border border-border rounded-xl p-5 flex items-start gap-3">
              <div className="mt-0.5 shrink-0 text-foreground-muted">
                <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="6.5"/><path d="M8 5v4M8 11h.01"/></svg>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Overcharge is disabled</p>
                <p className="text-xs text-foreground-muted mt-0.5">Enable overcharge in <button type="button" onClick={() => setActiveTab("billing")} className="underline hover:text-foreground transition-colors">Billing &amp; Usage</button> to allow wallet charges for extra AI tokens and additional storage.</p>
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">

            {/* Balance Card */}
            <div className="bg-card border border-border rounded-xl p-6 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-medium text-foreground-muted mb-2">Available Balance</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-semibold text-foreground">
                    {loadingWallet ? "--" : fmtCurrency(wallet.available_balance ?? wallet.balance, wallet.currency)}
                  </span>
                </div>
                {/* Processing credits */}
                {(wallet.processing_balance ?? 0) > 0 && (
                  <div className="flex items-center gap-1.5 mt-2 text-xs text-warning-text">
                    <Clock className="w-3 h-3" />
                    <span>{fmtCurrency(wallet.processing_balance!, wallet.currency)} processing -- available within 48h</span>
                  </div>
                )}
              </div>
              <div className="mt-5">
                <button type="button"
                  onClick={() => { setShowTopUpModal(true); resetDeposit(); }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-white text-black hover:bg-zinc-200 text-sm font-medium rounded-lg transition-colors">
                  <Plus className="w-4 h-4" />Add Credits
                </button>
              </div>
            </div>

            {/* Auto Top-up Settings */}
            <div className="bg-card border border-border rounded-xl p-6">
              <div className="flex items-center justify-between gap-4 mb-4">
                <h3 className="text-sm font-medium text-foreground">Auto Top-up</h3>
                <button
                  type="button"
                  role="switch"
                  aria-checked={wallet.auto_topup_enabled}
                  onClick={() => handleAutoTopupChange({ auto_topup_enabled: !wallet.auto_topup_enabled })}
                  disabled={updatingAutoTopup}
                  className={`inline-flex shrink-0 h-5 w-9 items-center rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:opacity-50 ${
                    wallet.auto_topup_enabled ? "bg-white" : "bg-zinc-700"
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full shadow-sm transition-transform duration-200 ${
                    wallet.auto_topup_enabled ? "translate-x-4 bg-zinc-900" : "translate-x-0 bg-zinc-400"
                  }`} />
                </button>
              </div>
              
              {wallet.auto_topup_enabled ? (
                <div className="space-y-4 mt-4 pt-4 border-t border-border">
                  <div>
                    <label className="block text-xs font-medium text-foreground-muted mb-1">When balance falls below</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted">$</span>
                      <input
                        type="number"
                        value={wallet.auto_topup_threshold}
                        onBlur={(e) => handleAutoTopupChange({ auto_topup_threshold: Number(e.target.value) })}
                        onChange={(e) => setWallet({...wallet, auto_topup_threshold: Number(e.target.value)})}
                        disabled={updatingAutoTopup}
                        className="w-full bg-card border border-border rounded-lg py-2 pl-7 pr-3 text-sm text-foreground focus:outline-none focus:border-border transition-colors disabled:opacity-50"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground-muted mb-1">Auto-recharge with</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted">$</span>
                      <input
                        type="number"
                        value={wallet.auto_topup_amount}
                        onBlur={(e) => handleAutoTopupChange({ auto_topup_amount: Number(e.target.value) })}
                        onChange={(e) => setWallet({...wallet, auto_topup_amount: Number(e.target.value)})}
                        disabled={updatingAutoTopup}
                        className="w-full bg-card border border-border rounded-lg py-2 pl-7 pr-3 text-sm text-foreground focus:outline-none focus:border-border transition-colors disabled:opacity-50"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-foreground-muted leading-relaxed">
                  Never run out of funds. We will automatically recharge your balance when it falls below your threshold.
                </p>
              )}
            </div>

            {/* Quick Stats or Instructions */}
            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="text-sm font-medium text-foreground mb-4">How Credits Work</h3>
              <p className="text-sm text-foreground-muted leading-relaxed mb-4">
                Credits fund your active campaigns and execution channels. Your balance is drawn down automatically as campaigns accrue spend. 
              </p>
              <div className="flex items-center gap-2 mt-4 text-sm">
                <CheckCircle2 className="w-4 h-4 text-foreground-muted" />
                <span className="text-foreground-muted">Funds are non-refundable.</span>
              </div>
            </div>
          </div>

          {/* Transactions Table */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <h3 className="text-sm font-medium text-foreground">Transaction History</h3>
              <button type="button"
                onClick={handleDownloadCSV}
                disabled={transactions.length === 0}
                className="text-xs font-medium text-foreground-muted hover:text-foreground transition-colors flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Download className="w-3.5 h-3.5" /> Download CSV
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead className="bg-card text-foreground-muted">
                  <tr>
                    <th className="px-3 sm:px-5 py-3 font-medium">Date</th>
                    <th className="px-3 sm:px-5 py-3 font-medium">Description</th>
                    <th className="px-3 sm:px-5 py-3 font-medium">Status</th>
                    <th className="px-3 sm:px-5 py-3 font-medium text-right">Credits</th>
                    <th className="px-3 sm:px-5 py-3 font-medium text-right">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-border text-foreground-muted">
                  {loadingWallet ? (
                    <tr>
                      <td colSpan={5} className="px-3 sm:px-5 py-8 text-center text-foreground-muted">
                        <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                        Loading transactions...
                      </td>
                    </tr>
                  ) : transactions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 sm:px-5 py-8 text-center text-foreground-muted">
                        No transactions yet. Add credits to get started.
                      </td>
                    </tr>
                  ) : (
                    transactions.map(tx => (
                      <tr key={tx.id} className={`hover:bg-surface-hover transition-colors ${tx.status === "PROCESSING" ? "bg-warning-text/3" : ""}`}>
                        <td className="px-3 sm:px-5 py-3 whitespace-nowrap text-foreground-muted text-xs sm:text-sm">
                          <div>{new Date(tx.created_at).toLocaleDateString()}</div>
                          {tx.status === "PROCESSING" && tx.available_at && (
                            <div className="text-[10px] text-warning-text">Avail. {new Date(tx.available_at).toLocaleDateString()}</div>
                          )}
                        </td>
                        <td className="px-3 sm:px-5 py-3 text-xs sm:text-sm max-w-[140px] sm:max-w-none">
                          <div className="truncate">{tx.description}</div>
                          {tx.stripe_fee && tx.stripe_fee > 0 && (
                            <div className="text-[10px] text-foreground-muted">Fee: ${Number(tx.stripe_fee).toFixed(2)}</div>
                          )}
                        </td>
                        <td className="px-3 sm:px-5 py-3">
                          {tx.status === "PROCESSING" && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-warning-bg text-warning-text border border-warning-border">
                              <Clock className="w-2.5 h-2.5" />PROC.
                            </span>
                          )}
                          {(tx.status === "AVAILABLE" || tx.status === "COMPLETED" || !tx.status) && tx.type === "CREDIT" && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-success-bg text-success-text border border-success-border">
                              <CheckCircle2 className="w-2.5 h-2.5" />OK
                            </span>
                          )}
                          {tx.type === "DEBIT" && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-surface-hover text-foreground-muted border border-border">
                              SPENT
                            </span>
                          )}
                        </td>
                        <td className={`px-3 sm:px-5 py-3 text-right font-medium text-xs sm:text-sm ${tx.type === 'CREDIT' ? 'text-foreground' : 'text-foreground-muted'}`}>
                          <div>{tx.type === 'CREDIT' ? '+' : '-'}{fmtCurrency(tx.net_amount ?? tx.amount, tx.currency || wallet.currency)}</div>
                          {tx.gross_amount && tx.gross_amount !== (tx.net_amount ?? tx.amount) && (
                            <div className="text-[10px] text-foreground-muted hidden sm:block">Charged: {fmtCurrency(tx.gross_amount, tx.currency || wallet.currency)}</div>
                          )}
                        </td>
                        <td className="px-3 sm:px-5 py-3 text-right">
                          {tx.stripe_charge_id && tx.type === 'CREDIT' && (
                            <a
                              href={`https://dashboard.stripe.com/test/payments/${tx.stripe_charge_id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-foreground-muted hover:text-foreground transition-colors"
                              title="View receipt"
                            >
                              <FileText className="w-3 h-3" /><span className="hidden sm:inline">Receipt</span>
                            </a>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* â"€â"€ Tab Content: Billing & Usage â"€â"€ */}
      {activeTab === "billing" && (
        <div className="space-y-6">

          {/* Enable Overcharge */}
          <div className="bg-card/50 border border-border rounded-xl p-5 sm:p-6 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-medium text-foreground">Enable Overcharge</h3>
                <p className="text-xs text-foreground-muted mt-0.5 leading-relaxed">Allow usage beyond your plan quota — extra AI tokens and additional storage are charged from your wallet.</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={overchargeEnabled}
                onClick={handleOverchargeToggle}
                disabled={overchargeLoading}
                className={`inline-flex shrink-0 h-6 w-11 items-center rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:opacity-50 ${
                  overchargeEnabled ? "bg-white" : "bg-zinc-700"
                }`}
              >
                <span className={`inline-block h-5 w-5 transform rounded-full shadow-sm transition-transform duration-200 ${
                  overchargeEnabled ? "translate-x-5 bg-zinc-900" : "translate-x-0 bg-zinc-400"
                }`} />
              </button>
            </div>
            {overchargeEnabled ? (
              <div className="bg-warning-bg border border-warning-border rounded-lg p-4 text-xs text-warning-text space-y-1">
                <p className="font-medium">Overcharge active</p>
                <p>Extra AI token usage and additional storage beyond your plan quota will be charged from your wallet. Campaign spend is handled separately through connected ad accounts.</p>
              </div>
            ) : (
              <p className="text-xs text-foreground-muted">When disabled, AI features and extra storage stop once your monthly quota is reached. No wallet charges apply. Enable to add credits and prevent service interruptions.</p>
            )}
          </div>

          {/* Active Plan Overview */}
          <div className="bg-card border border-border rounded-xl p-6">
            {loadingPlan ? (
              <div className="flex items-center gap-3 animate-pulse">
                <div className="w-10 h-10 rounded-lg bg-surface-hover" />
                <div className="space-y-2">
                  <div className="h-4 w-36 rounded bg-surface-hover" />
                  <div className="h-3 w-56 rounded bg-surface-hover" />
                </div>
              </div>
            ) : (
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">

                <div className="space-y-5 flex-1">
                  {/* Plan header */}
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 bg-surface-hover rounded-lg border border-border mt-0.5">
                      <ActiveIcon className="w-5 h-5 text-foreground-muted" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <h2 className="text-lg font-semibold text-foreground">{activePlan.name}</h2>
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-surface-hover text-foreground-muted border border-border uppercase tracking-wider">Active</span>
                        <span className="text-sm font-semibold text-foreground">{activePlanPrice}</span>
                        {activePlan.annual && (
                          <span className="text-xs text-foreground-muted">(${activePlan.annual}/mo billed annually)</span>
                        )}
                        {planRenewalDate && (
                          <span className="flex items-center gap-1 text-xs text-foreground-muted">
                            <Clock className="w-3 h-3" />
                            Renews {new Date(planRenewalDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-foreground-muted mt-1">{activePlan.desc}</p>
                    </div>
                  </div>

                  {/* Stat chips */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
                    {[
                      { label: "Included Users",    value: PLAN_STATS[activePlan.id]?.users    ?? "--" },
                      { label: "Social Profiles",   value: PLAN_STATS[activePlan.id]?.profiles ?? "--" },
                      { label: "Brands/Workspaces", value: PLAN_STATS[activePlan.id]?.brands   ?? "--" },
                      { label: "AI Agents",         value: PLAN_STATS[activePlan.id]?.agents   ?? "--" },
                    ].map(stat => (
                      <div key={stat.label} className="bg-surface-hover rounded-lg px-3 py-2.5 border border-border overflow-hidden">
                        <p className="text-[10px] text-foreground-muted uppercase tracking-wide leading-tight break-words mb-1">{stat.label}</p>
                        <p className="text-sm font-semibold text-gray-900 dark:text-foreground">{stat.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Included features */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 pt-2">
                    {activePlan.features.map((f, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-foreground-muted">
                        <CheckCircle2 className="w-3.5 h-3.5 text-foreground-muted shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>

                  {/* Limits (what's not included) */}
                  {activePlan.limits.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {activePlan.limits.map((l, i) => (
                        <span key={i} className="text-[10px] px-2 py-1 rounded bg-surface border border-border text-foreground-muted">{l}</span>
                      ))}
                    </div>
                  )}
                </div>

                {/* CTA */}
                <div className="flex flex-col items-stretch md:items-end gap-3 md:min-w-[180px] justify-start pt-1">
                  <button
                    onClick={() => setShowUpgradeModal(true)}
                    className="px-5 py-2.5 w-full bg-white text-black hover:bg-zinc-200 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    {activePlan.id === 'corporate' ? 'Manage Plan' : 'Upgrade Plan'}
                    <ArrowUpRight className="w-4 h-4" />
                  </button>
                  {subscription && !subscription.cancel_at_period_end && activePlan.id !== 'starter' && (
                    <button type="button" onClick={handleCancelSubscription}
                      className="text-xs text-foreground-muted hover:text-error-text transition-colors w-full text-center">
                      Cancel subscription
                    </button>
                  )}
                  {subscription?.cancel_at_period_end && (
                    <p className="text-xs text-warning-text text-center">
                      Cancels {new Date(subscription.current_period_end).toLocaleDateString()}
                    </p>
                  )}
                  {subscribeError && (
                    <p className="text-xs text-error-text flex items-center gap-1"><AlertCircle className="w-3 h-3" />{subscribeError}</p>
                  )}
                </div>

              </div>
            )}
          </div>

          {/* Usage Metrics */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-foreground-muted" />
              <h3 className="text-sm font-medium text-foreground">Current Usage</h3>
              {loadingUsage && <Loader2 className="w-3.5 h-3.5 text-foreground-muted animate-spin ml-2" />}
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { key: "AI_TOKENS",       icon: Zap,      label: "AI Intelligence",   unit: "tokens",   fmt: (v: number) => v.toLocaleString() },
                { key: "SOCIAL_API_CALLS",icon: Globe,    label: "Social API Calls",  unit: "calls",    fmt: (v: number) => v.toLocaleString() },
                { key: "STORAGE_MB",      icon: Database, label: "Knowledge Storage", unit: "MB",       fmt: (v: number) => v.toFixed(1) },
                { key: "CONTENT_POSTS",   icon: FileText, label: "Content Published", unit: "posts",    fmt: (v: number) => v.toLocaleString() },
                { key: "AGENT_RUNS",      icon: Activity, label: "Agent Runs",        unit: "runs",     fmt: (v: number) => v.toLocaleString() },
              ].map(({ key, icon: Icon, label, unit, fmt }) => (
                <div key={key} className="bg-card border border-border rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Icon className="w-4 h-4 text-foreground-muted" />
                    <span className="text-sm font-medium text-foreground-muted">{label}</span>
                  </div>
                  <p className="text-2xl font-semibold text-foreground">
                    {loadingUsage ? "--" : fmt(summary[key]?.quantity || 0)}
                  </p>
                  <p className="text-xs text-foreground-muted mt-1">{unit} this period</p>
                  {summary[key]?.cost > 0 && (
                    <p className="text-[11px] text-foreground-muted mt-0.5">${summary[key].cost.toFixed(4)} cost</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Payment History */}
          <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-border">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-foreground-muted" />
              <h3 className="text-sm font-medium text-foreground">Payment History</h3>
              {loadingInvoices && <Loader2 className="w-3.5 h-3.5 text-foreground-muted animate-spin" />}
            </div>

            {invoices.length === 0 && !loadingInvoices ? (
              <div className="bg-card border border-border rounded-xl p-8 text-center">
                <FileText className="w-8 h-8 text-foreground-muted mx-auto mb-3" />
                <p className="text-sm font-medium text-foreground-muted">No invoices yet</p>
                <p className="text-xs text-foreground-muted mt-1">Plan subscription invoices will appear here after your first billing cycle.</p>
              </div>
            ) : (
              <div className="bg-card border border-border rounded-xl overflow-x-auto">
                <table className="w-full min-w-[480px] text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="px-3 sm:px-5 py-3 text-left text-[11px] font-semibold text-foreground-muted uppercase tracking-wider">Date</th>
                      <th className="px-3 sm:px-5 py-3 text-left text-[11px] font-semibold text-foreground-muted uppercase tracking-wider">Description</th>
                      <th className="px-3 sm:px-5 py-3 text-left text-[11px] font-semibold text-foreground-muted uppercase tracking-wider">Status</th>
                      <th className="px-3 sm:px-5 py-3 text-right text-[11px] font-semibold text-foreground-muted uppercase tracking-wider">Amount</th>
                      <th className="px-3 sm:px-5 py-3 text-right text-[11px] font-semibold text-foreground-muted uppercase tracking-wider">Invoice</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-border">
                    {invoices.map(inv => (
                      <tr key={inv.id} className="hover:bg-surface transition-colors">
                        <td className="px-3 sm:px-5 py-3 text-foreground-muted whitespace-nowrap text-xs sm:text-sm">
                          {new Date(inv.created * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td className="px-3 sm:px-5 py-3 text-foreground-muted text-xs sm:text-sm max-w-[120px] sm:max-w-none">
                          <span className="truncate block">{inv.description || 'Subscription'}</span>
                        </td>
                        <td className="px-3 sm:px-5 py-3">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                            inv.status === 'paid'
                              ? 'bg-success-text/10 text-success-text border-success-border/20'
                              : 'bg-warning-text/10 text-warning-text border-warning-border/20'
                          }`}>
                            {inv.status === 'paid' ? <CheckCircle2 className="w-2.5 h-2.5" /> : <Clock className="w-2.5 h-2.5" />}
                            {inv.status?.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-3 sm:px-5 py-3 text-right font-medium text-foreground text-xs sm:text-sm whitespace-nowrap">
                          ${(inv.amount_paid / 100).toFixed(2)} {inv.currency?.toUpperCase()}
                        </td>
                        <td className="px-3 sm:px-5 py-3 text-right">
                          {inv.hosted_url && (
                            <a href={inv.hosted_url} target="_blank" rel="noopener noreferrer"
                              className="text-xs text-foreground-muted hover:text-foreground transition-colors flex items-center gap-1 justify-end">
                              <Download className="w-3 h-3" /> View
                            </a>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Payment Methods */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-foreground-muted" />
                <h3 className="text-sm font-medium text-foreground">Payment Methods</h3>
                {cardsLoading && <Loader2 className="w-3.5 h-3.5 text-foreground-muted animate-spin" />}
              </div>
              <button type="button" onClick={handleAddCard} disabled={addingCard}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-hover hover:bg-surface-hover text-foreground-muted text-xs font-semibold rounded-lg transition-colors disabled:opacity-40">
                {addingCard ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                Add Card
              </button>
            </div>
            {cardError && <p className="text-xs text-error-text flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5" />{cardError}</p>}
            {cards.length === 0 ? (
              <div className="bg-card border border-border rounded-xl p-6 text-center">
                <CreditCard className="w-7 h-7 text-foreground-muted mx-auto mb-2" />
                <p className="text-sm text-foreground-muted">No cards saved yet</p>
                <p className="text-xs text-foreground-muted mt-1">Add a card to enable automatic top-ups and faster deposits.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {cards.map(card => {
                  const canDelete = !card.is_default && cards.length > 1;
                  return (
                    <div key={card.id} className={`flex items-center justify-between p-4 border rounded-xl transition-all ${
                      card.is_default
                        ? 'bg-surface border-border ring-1 ring-border'
                        : 'bg-card border-border'
                    }`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-6 rounded flex items-center justify-center ${card.is_default ? 'bg-white/10' : 'bg-surface-hover'}`}>
                          <CreditCard className={`w-4 h-4 ${card.is_default ? 'text-foreground' : 'text-foreground-muted'}`} />
                        </div>
                        <div>
                          <p className="text-sm text-foreground font-medium capitalize">{card.brand} &bull;&bull;&bull;&bull; {card.last4}</p>
                          <p className="text-xs text-foreground-muted">Expires {card.exp_month}/{card.exp_year}</p>
                        </div>
                        {card.is_default && (
                          <span className="text-[10px] px-2 py-0.5 bg-white/10 text-foreground border border-white/20 rounded uppercase tracking-wider font-semibold">Default</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {!card.is_default && (
                          <button type="button" onClick={() => handleSetDefaultCard(card.id)}
                            className="p-1.5 text-foreground-muted hover:text-warning-text transition-colors" title="Set as default">
                            <Star className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteCard(card.id)}
                          disabled={!canDelete}
                          className={`p-1.5 transition-colors ${canDelete ? 'text-foreground-muted hover:text-error-text' : 'text-foreground-muted cursor-not-allowed'}`}
                          title={!canDelete ? (card.is_default ? 'Set another card as default first' : 'Must keep at least one card') : 'Remove card'}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      )}

      {/* â"€â"€ Deposit Toast â"€â"€ */}
      {/* Upgrade Confirmation Modal */}
      {upgradeConfirm && mounted && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => { setUpgradeConfirm(null); setSubscribeError(null); }} />
          <div className="relative z-10 w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-foreground">Confirm Upgrade</h3>
              <button type="button" onClick={() => { setUpgradeConfirm(null); setSubscribeError(null); }} className="p-1.5 text-foreground-muted hover:text-foreground transition-colors"><X className="w-4 h-4" /></button>
            </div>

            {/* Plan summary */}
            <div className="p-4 bg-surface border border-border rounded-xl space-y-1">
              <p className="text-sm font-semibold text-foreground">{upgradeConfirm.planName}</p>
              <p className="text-2xl font-bold text-foreground">${upgradeConfirm.price}<span className="text-sm font-normal text-foreground-muted"> / month</span></p>
              <p className="text-xs text-foreground-muted">Billed monthly, cancel anytime</p>
            </div>

            {/* Payment method */}
            <div>
              <p className="text-xs font-semibold text-foreground-muted uppercase tracking-widest mb-2">Payment Method</p>
              {cards.length > 0 ? (
                <div className="space-y-2">
                  {cards.map(card => (
                    <div key={card.id}
                      onClick={() => setSelectedCardId(card.id)}
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${selectedCardId === card.id ? 'border-white/40 bg-surface-hover ring-1 ring-border' : 'border-border bg-card hover:border-border'}`}>
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${selectedCardId === card.id ? 'border-white' : 'border-border'}`}>
                        {selectedCardId === card.id && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                      <CreditCard className="w-4 h-4 text-foreground-muted shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm text-foreground capitalize">{card.brand} &bull;&bull;&bull;&bull; {card.last4}</p>
                        <p className="text-xs text-foreground-muted">Expires {card.exp_month}/{card.exp_year}</p>
                      </div>
                      {card.is_default && <span className="text-[10px] text-foreground-muted bg-surface-hover px-2 py-0.5 rounded border border-border">Default</span>}
                    </div>
                  ))}
                  <button type="button" onClick={() => { setUpgradeConfirm(null); handleAddCard(); }}
                    className="w-full py-2 text-xs text-foreground-muted hover:text-foreground border border-dashed border-border hover:border-border rounded-xl transition-colors flex items-center justify-center gap-1.5">
                    <Plus className="w-3 h-3" /> Use a different card
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-3 bg-warning-text/10 border border-warning-border/20 rounded-xl text-xs text-warning-text flex items-start gap-2">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    No card on file. Add a card to continue.
                  </div>
                  <button type="button" onClick={() => { setUpgradeConfirm(null); handleAddCard(); }}
                    className="w-full py-2.5 bg-white text-zinc-900 text-sm font-semibold rounded-xl hover:bg-zinc-100 flex items-center justify-center gap-2">
                    <Plus className="w-4 h-4" /> Add Payment Card
                  </button>
                </div>
              )}
            </div>

            {subscribeError && (
              <p className="text-xs text-error-text flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5" />{subscribeError}</p>
            )}

            {cards.length > 0 && (
              <button type="button" onClick={confirmSubscribe} disabled={subscribing}
                className="w-full py-3 bg-white hover:bg-zinc-100 disabled:opacity-40 text-zinc-900 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2">
                {subscribing ? <Loader2 className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4" />}
                {subscribing ? 'Processing...' : `Confirm & Pay $${upgradeConfirm.price}/mo`}
              </button>
            )}
          </div>
        </div>,
        document.body
      )}

      {depositToast && mounted && createPortal(
        <div className={`fixed top-4 right-4 z-[9999] flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-xl border text-sm font-semibold ${
          depositToast.type === "success"
            ? "bg-toast-success-bg border-success-border/30 text-toast-success-text"
            : "bg-toast-error-bg border-error-border/30 text-toast-error-text"
        }`}>
          {depositToast.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span className="max-w-sm">{depositToast.msg}</span>
          <button type="button" onClick={() => setDepositToast(null)}><X className="w-3.5 h-3.5 opacity-60" /></button>
        </div>,
        document.body
      )}

      {/* â"€â"€ Add Credits Modal (3-step deposit flow) â"€â"€ */}
      {showTopUpModal && mounted && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => { setShowTopUpModal(false); resetDeposit(); }} />
          <div className="relative z-10 w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-y-auto max-h-[90vh]">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-surface-hover rounded-xl">
                  <ArrowDownCircle className="w-4 h-4 text-success-text" />
                </div>
                <h2 className="text-base font-semibold text-foreground">
                  {depositStep === "amount"  && "Add Credits"}
                  {depositStep === "fees"    && "Review Fees"}
                  {depositStep === "confirm" && "Confirm Deposit"}
                </h2>
              </div>
              <button type="button" onClick={() => { setShowTopUpModal(false); resetDeposit(); }} className="p-2 text-foreground-muted hover:text-foreground hover:bg-surface-hover rounded-lg transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5">

              {/* Step 1 -- Amount */}
              {depositStep === "amount" && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-foreground-muted mb-2">
                      How much do you want in your wallet?
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground-muted font-bold text-lg">$</span>
                      <input
                        type="number" min="10" max="100000" step="1"
                        value={depositAmount}
                        onChange={e => { setDepositAmount(e.target.value); setDepositError(null); }}
                        className="w-full bg-surface border border-border rounded-xl px-4 py-3 pl-10 text-foreground text-lg font-bold placeholder:text-foreground-muted focus:outline-none focus:border-white/30 transition-all"
                        placeholder="100"
                        autoFocus
                      />
                    </div>
                    <p className="text-[11px] text-foreground-muted mt-1.5">Minimum $10 · Maximum $100,000</p>
                  </div>
                  {/* Quick amounts */}
                  <div className="grid grid-cols-4 gap-2">
                    {["50", "100", "250", "500"].map(amt => (
                      <button key={amt} type="button"
                        onClick={() => { setDepositAmount(amt); setDepositError(null); }}
                        className={`py-2 text-center text-sm font-medium rounded-lg border transition-all ${
                          depositAmount === amt
                            ? "bg-white text-zinc-900 border-white"
                            : "bg-surface border-border text-foreground-muted hover:border-border"
                        }`}>
                        ${amt}
                      </button>
                    ))}
                  </div>
                  <div className="p-3 bg-blue-500/5 border border-blue-500/15 rounded-xl flex items-start gap-2">
                    <Info className="w-3.5 h-3.5 text-blue-400 mt-0.5 shrink-0" />
                    <p className="text-xs text-blue-300">Stripe processing fees (2.9% + $0.30) will be shown on the next screen.</p>
                  </div>
                  {depositError && <p className="text-xs text-error-text flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5" />{depositError}</p>}
                  <button type="button" onClick={handleCalculateFees} disabled={!depositAmount || loadingFees}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-white hover:bg-zinc-100 text-zinc-900 text-sm font-bold rounded-xl disabled:opacity-40 transition-all">
                    {loadingFees && <Loader2 className="w-4 h-4 animate-spin" />}
                    Calculate Total
                  </button>
                </>
              )}

              {/* Step 2 -- Fee breakdown */}
              {depositStep === "fees" && fees && (
                <>
                  <div className="p-4 bg-surface border border-border rounded-xl space-y-3">
                    <p className="text-[11px] font-bold text-foreground-muted uppercase tracking-widest">Fee Breakdown</p>
                    {fees.breakdown.map((line, i) => (
                      <div key={i} className={`flex items-center justify-between ${line.is_total ? "pt-3 border-t border-border" : ""}`}>
                        <span className={`text-sm ${line.is_total ? "text-foreground font-bold" : "text-foreground-muted"}`}>{line.label}</span>
                        <span className={`text-sm font-bold ${line.is_total ? "text-foreground text-base" : "text-foreground-muted"}`}>
                          {line.is_total ? fmtCurrency(line.amount, fees.currency) : `$${line.amount.toFixed(2)}`}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="p-3 bg-warning-text/5 border border-warning-border/20 rounded-xl space-y-2">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-3.5 h-3.5 text-warning-text mt-0.5 shrink-0" />
                      <p className="text-xs text-warning-text font-semibold">{fees.non_refundable_notice}</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <Clock className="w-3.5 h-3.5 text-warning-text mt-0.5 shrink-0" />
                      <p className="text-xs text-warning-text">{fees.processing_notice}</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setDepositStep("amount")} className="flex-1 py-2.5 bg-surface-hover hover:bg-surface-hover text-foreground-muted text-sm font-semibold rounded-xl">Back</button>
                    <button type="button" onClick={() => setDepositStep("confirm")} className="flex-1 py-2.5 bg-white hover:bg-zinc-100 text-zinc-900 text-sm font-bold rounded-xl">Proceed</button>
                  </div>
                </>
              )}

              {/* Step 3 -- Confirm */}
              {depositStep === "confirm" && fees && (
                <>
                  <div className="p-5 bg-success-text/5 border border-success-border/20 rounded-xl text-center">
                    <p className="text-xs text-foreground-muted mb-1">Total charge to your card</p>
                    <p className="text-4xl font-bold text-foreground">{fmtCurrency(fees.total_charge, fees.currency)}</p>
                    <p className="text-sm text-success-text mt-1">{fmtCurrency(fees.net_credits, fees.currency)} campaign credits</p>
                  </div>
                  <label className="flex items-start gap-3 p-4 bg-surface border border-border rounded-xl cursor-pointer group"
                    onClick={() => setConfirmed(!confirmed)}>
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${confirmed ? "bg-white border-white" : "border-border group-hover:border-zinc-400"}`}>
                      {confirmed && <CheckCircle2 className="w-3.5 h-3.5 text-zinc-900" />}
                    </div>
                    <span className="text-xs text-foreground-muted leading-relaxed">
                      I understand this deposit of <strong className="text-foreground">{fmtCurrency(fees.total_charge, fees.currency)}</strong> is{" "}
                      <strong className="text-error-text">non-refundable</strong> and can only be used for{" "}
                      <strong className="text-foreground">campaign ad spend</strong> within ZoikoVertex.
                    </span>
                  </label>
                  <div className="flex items-center gap-2 p-3 bg-surface border border-border rounded-xl">
                    <Shield className="w-3.5 h-3.5 text-foreground-muted shrink-0" />
                    <p className="text-xs text-foreground-muted">Redirects to Stripe&apos;s secure checkout. Credits appear as Processing for up to 48h, then Available.</p>
                  </div>
                  {depositError && <p className="text-xs text-error-text flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5" />{depositError}</p>}
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setDepositStep("fees")} className="flex-1 py-2.5 bg-surface-hover hover:bg-surface-hover text-foreground-muted text-sm font-semibold rounded-xl">Back</button>
                    <button type="button" onClick={handleConfirmDeposit} disabled={!confirmed || depositing}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-success-text hover:bg-success-text disabled:opacity-40 text-foreground text-sm font-bold rounded-xl transition-all">
                      {depositing ? <Loader2 className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4" />}
                      {depositing ? "Redirecting..." : `Pay ${fmtCurrency(fees.total_charge, fees.currency)}`}
                    </button>
                  </div>
                </>
              )}

            </div>
          </div>
        </div>,
        document.body
      )}

      {/* â"€â"€ Upgrade Modal â"€â"€ */}
      {showUpgradeModal && mounted && createPortal(
        <div className="fixed inset-0 z-[9999] flex justify-end">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
            onClick={() => setShowUpgradeModal(false)}
          />
          <div className="relative z-10 w-full sm:max-w-5xl bg-card border-t sm:border-t-0 sm:border-l border-border h-[92vh] sm:h-full mt-auto sm:mt-0 overflow-y-auto shadow-2xl rounded-t-2xl sm:rounded-none">
            <div className="sticky top-0 z-20 bg-card/80 backdrop-blur-md border-b border-border p-4 sm:p-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-foreground">Change subscription plan</h2>
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="p-2 text-foreground-muted hover:text-foreground hover:bg-surface-hover rounded-lg transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            {subscribeError && (
              <div className="mx-6 mt-4 p-3 rounded-lg text-sm font-medium text-center bg-error-text/10 border border-error-border/20 text-error-text flex items-center justify-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />{subscribeError}
              </div>
            )}
            {planMessage && (
              <div className={`mx-6 mt-4 p-3 rounded-lg text-sm font-medium text-center ${
                planMessage.type === 'success'
                  ? 'bg-success-text/10 border border-success-border/20 text-success-text'
                  : 'bg-error-text/10 border border-error-border/20 text-error-text'
              }`}>
                {planMessage.text}
              </div>
            )}

            <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {PLANS.map(plan => {
                const Icon = plan.icon;
                const isActive = plan.id === activePlanId;
                const isChanging = changingPlan === plan.id;
                return (
                  <div key={plan.id} className={`p-5 rounded-xl border flex flex-col ${isActive ? 'bg-surface border-border ring-1 ring-border' : 'bg-card border-border'}`}>
                    <Icon className="w-6 h-6 text-foreground-muted mb-4" />
                    <h3 className="text-lg font-semibold text-foreground">{plan.name}</h3>
                    <p className="text-2xl font-bold text-foreground mt-2">
                      {plan.price !== null && plan.price > 0 ? `$${plan.price}` : plan.price === 0 ? "Free" : "Custom"}
                      <span className="text-sm font-normal text-foreground-muted">
                        {plan.price !== null && plan.price > 0 ? plan.period : ""}
                      </span>
                    </p>
                    <p className="text-xs text-foreground-muted mt-3 min-h-[48px]">{plan.desc}</p>

                    <ul className="mt-6 mb-6 space-y-3 flex-1">
                      {plan.features.slice(0, 4).map((f, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-foreground-muted">
                          <CheckCircle2 className="w-3.5 h-3.5 text-foreground-muted shrink-0 mt-0.5" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>

                    {isActive ? (
                      <button type="button" disabled className="w-full py-2.5 rounded-lg text-sm font-medium bg-surface-hover text-foreground-muted cursor-not-allowed">
                        Current Plan
                      </button>
                    ) : plan.id === 'corporate' ? (
                      <a href="mailto:sales@zoikogroup.com?subject=Vertex Corporate Inquiry"
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium bg-white text-black hover:bg-zinc-200 transition-colors">
                        Contact Sales <ArrowUpRight className="w-3.5 h-3.5" />
                      </a>
                    ) : (
                      <div className="space-y-2">
                        <button
                          type="button"
                          onClick={() => handleSubscribe(plan.id)}
                          disabled={subscribing || !!changingPlan}
                          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium bg-white text-black hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {(subscribing && !isChanging) || isChanging ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                          {isChanging ? 'Switching...' : subscribing ? 'Processing...' : (activePlanId && PLANS.findIndex(p=>p.id===plan.id) < PLANS.findIndex(p=>p.id===activePlanId) ? 'Downgrade' : 'Upgrade')}
                        </button>
                        {plan.id !== 'starter' && cards.length === 0 && (
                          <p className="text-[10px] text-warning-text text-center">Add a card first to subscribe</p>
                        )}
                        {plan.id !== 'starter' && cards.length > 0 && (
                          <p className="text-[10px] text-foreground-muted text-center">Charged to your default card</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>,
        document.body
      )}

      <ConfirmActionModal
        open={showCancelSub}
        variant="warning"
        title="Cancel Subscription"
        message="Cancel subscription? Your plan stays active until the renewal date."
        confirmLabel="Cancel Subscription"
        onConfirm={confirmCancelSubscription}
        onCancel={() => setShowCancelSub(false)}
      />
    </div>
  );
}
