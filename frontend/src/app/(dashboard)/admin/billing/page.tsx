"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
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

// ── Types ────────────────────────────────────────────────────────

interface UsageSummaryItem { quantity: number; cost: number; unit: string; }

interface WalletTransaction {
  id: string;
  amount: number;
  net_amount?: number;
  gross_amount?: number;
  stripe_fee?: number;
  type: "CREDIT" | "DEBIT";
  status?: "PROCESSING" | "AVAILABLE" | "FAILED" | "REFUNDED";
  description: string;
  campaign_name: string | null;
  created_at: string;
  available_at?: string;
  currency?: string;
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

// ── Plan data ──────────────────────────────────────────────────

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

// ── Plan stat map (avoids fragile feature-string splitting) ────
const PLAN_STATS: Record<string, { users: string; profiles: string; brands: string; agents: string }> = {
  starter:   { users: "2",      profiles: "2",      brands: "1",        agents: "Preview" },
  growth:    { users: "7",      profiles: "8",      brands: "1",        agents: "5" },
  scale:     { users: "20",     profiles: "25",     brands: "Up to 5",  agents: "5" },
  corporate: { users: "Custom", profiles: "Custom", brands: "Custom",   agents: "5 (Custom)" },
};

// ── Main Component ─────────────────────────────────────────────

// Maps billing page plan IDs → DB plan_type values sent to the API
const PLAN_ID_TO_DB: Record<string, string> = {
  starter:   'STARTER',
  growth:    'GROWTH',
  scale:     'SCALE',
  corporate: 'ENTERPRISE',
};

export default function BillingPage() {
  const { refresh: refreshRole } = useRoleContext();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<"credits" | "billing">("credits");
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

  // Spend cap
  const [spendCapEnabled, setSpendCapEnabled]   = useState(false);
  const [spendCapAmount,  setSpendCapAmount]    = useState("");
  const [spendCapLoading, setSpendCapLoading]   = useState(false);

  // Payment cards
  const [cards, setCards]               = useState<PaymentMethod[]>([]);
  const [cardsLoading, setCardsLoading] = useState(false);
  const [addingCard, setAddingCard]     = useState(false);
  const [cardError, setCardError]       = useState<string | null>(null);

  // Plan renewal date (from billing settings)
  const [planRenewalDate, setPlanRenewalDate] = useState<string | null>(null);

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

          const [usageRes, walletRes, spendCapRes, cardsRes, settingsRes] = await Promise.allSettled([
            api.get(`/api/v1/monitoring/usage?workspaceId=${ctx.data.workspace_id}`),
            api.get('/api/v1/billing/wallet'),
            api.get('/api/v1/billing/spend-cap'),
            api.get('/api/v1/billing/payment-methods'),
            api.get('/api/v1/billing/settings'),
          ]);

          if (usageRes.status === 'fulfilled' && usageRes.value?.success)
            setSummary(usageRes.value.data?.summary || {});

          if (spendCapRes.status === 'fulfilled' && spendCapRes.value?.success) {
            setSpendCapEnabled(spendCapRes.value.data?.spend_cap_enabled ?? false);
          }

          if (cardsRes.status === 'fulfilled' && cardsRes.value?.success) {
            setCards(cardsRes.value.data?.payment_methods || []);
          }

          if (settingsRes.status === 'fulfilled' && settingsRes.value?.success) {
            setPlanRenewalDate(settingsRes.value.data?.next_renewal_date || null);
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
    if (deposit === "success") {
      showToast("Payment received! Credits are processing and will be available within 48 hours.", "success");
      setActiveTab("credits");
    } else if (deposit === "cancelled") {
      showToast("Deposit cancelled — no charge was made.", "error");
    }
    const card = searchParams?.get("card");
    if (card === "added") {
      showToast("Card saved successfully!", "success");
      setActiveTab("billing");
      api.get('/api/v1/billing/payment-methods').then(r => {
        if (r.success) setCards(r.data?.payment_methods || []);
      }).catch(() => {});
    } else if (card === "cancelled") {
      showToast("Card setup cancelled.", "error");
    }
  }, [searchParams]);

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
      if (r.data.session_url) {
        window.location.assign(r.data.session_url);
      } else {
        showToast("Deposit initiated", "success");
        setShowTopUpModal(false); resetDeposit();
        // Re-fetch wallet
        const walletRes = await api.get('/api/v1/billing/wallet');
        if (walletRes.success) {
          setWallet(walletRes.data?.wallet || wallet);
          setTransactions(walletRes.data?.transactions || []);
        }
      }
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      if (msg?.includes("not configured")) {
        // Dev mode simulate
        try {
          await api.post("/api/v1/billing/deposit/simulate", { amount: fees.net_credits });
          showToast(`[DEV] $${fees.net_credits} queued as Processing`, "success");
          setShowTopUpModal(false); resetDeposit();
          const walletRes = await api.get('/api/v1/billing/wallet');
          if (walletRes.success) { setWallet(walletRes.data?.wallet || wallet); setTransactions(walletRes.data?.transactions || []); }
        } catch { setDepositError("Simulation failed"); }
      } else {
        setDepositError(msg || "Failed to create payment session");
      }
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

  const handleSpendCapSave = async () => {
    setSpendCapLoading(true);
    try {
      await api.patch('/api/v1/billing/spend-cap', {
        spend_cap_enabled: spendCapEnabled,
        spend_cap_amount:  spendCapAmount ? parseFloat(spendCapAmount) : null,
      });
      showToast("Spend cap updated", "success");
    } catch { showToast("Failed to update spend cap", "error"); }
    finally { setSpendCapLoading(false); }
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
    const header = "Date,Description,Campaign,Type,Amount\n";
    const rows = transactions.map(tx =>
      `${new Date(tx.created_at).toLocaleDateString()},${JSON.stringify(tx.description || "")},${JSON.stringify(tx.campaign_name || "")},${tx.type},$${Number(tx.amount).toFixed(2)}`
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
    <div className="p-8 max-w-7xl mx-auto space-y-8 pb-24">
      {/* ── Header ── */}
      <div className="space-y-1">
        <h1 className="text-3xl font-semibold text-white tracking-tight">Billing & Administration</h1>
        <p className="text-sm text-zinc-400">Manage your workspace plan, platform usage, and credits.</p>
      </div>

      {/* ── Tabs ── */}
      <div className="flex items-center gap-6 border-b border-zinc-800">
        <button 
          onClick={() => setActiveTab("credits")}
          className={`pb-3 text-sm font-medium transition-colors border-b-2 ${
            activeTab === "credits" ? "border-white text-white" : "border-transparent text-zinc-500 hover:text-zinc-300"
          }`}
        >
          Credits
        </button>
        <button 
          onClick={() => setActiveTab("billing")}
          className={`pb-3 text-sm font-medium transition-colors border-b-2 ${
            activeTab === "billing" ? "border-white text-white" : "border-transparent text-zinc-500 hover:text-zinc-300"
          }`}
        >
          Billing & Usage
        </button>
      </div>

      {/* ── Tab Content: Credits ── */}
      {activeTab === "credits" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Balance Card */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-medium text-zinc-400 mb-2">Available Balance</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-semibold text-white">
                    {loadingWallet ? "—" : fmtCurrency(wallet.available_balance ?? wallet.balance, wallet.currency)}
                  </span>
                </div>
                {/* Processing credits */}
                {(wallet.processing_balance ?? 0) > 0 && (
                  <div className="flex items-center gap-1.5 mt-2 text-xs text-amber-400">
                    <Clock className="w-3 h-3" />
                    <span>{fmtCurrency(wallet.processing_balance!, wallet.currency)} processing — available within 48h</span>
                  </div>
                )}
              </div>
              <div className="mt-5">
                <button
                  onClick={() => { setShowTopUpModal(true); resetDeposit(); }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-white text-black hover:bg-zinc-200 text-sm font-medium rounded-lg transition-colors">
                  <Plus className="w-4 h-4" />Add Credits
                </button>
              </div>
            </div>

            {/* Auto Top-up Settings */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-white">Auto Top-up</h3>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer"
                    checked={wallet.auto_topup_enabled}
                    onChange={(e) => handleAutoTopupChange({ auto_topup_enabled: e.target.checked })}
                    disabled={updatingAutoTopup}
                  />
                  <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-zinc-900 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-400 peer-checked:after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-white"></div>
                </label>
              </div>
              
              {wallet.auto_topup_enabled ? (
                <div className="space-y-4 mt-4 pt-4 border-t border-zinc-800">
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1">When balance falls below</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                      <input
                        type="number"
                        value={wallet.auto_topup_threshold}
                        onBlur={(e) => handleAutoTopupChange({ auto_topup_threshold: Number(e.target.value) })}
                        onChange={(e) => setWallet({...wallet, auto_topup_threshold: Number(e.target.value)})}
                        disabled={updatingAutoTopup}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2 pl-7 pr-3 text-sm text-white focus:outline-none focus:border-zinc-600 transition-colors disabled:opacity-50"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1">Auto-recharge with</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                      <input
                        type="number"
                        value={wallet.auto_topup_amount}
                        onBlur={(e) => handleAutoTopupChange({ auto_topup_amount: Number(e.target.value) })}
                        onChange={(e) => setWallet({...wallet, auto_topup_amount: Number(e.target.value)})}
                        disabled={updatingAutoTopup}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2 pl-7 pr-3 text-sm text-white focus:outline-none focus:border-zinc-600 transition-colors disabled:opacity-50"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-zinc-500 leading-relaxed">
                  Never run out of funds. We will automatically recharge your balance when it falls below your threshold.
                </p>
              )}
            </div>

            {/* Quick Stats or Instructions */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
              <h3 className="text-sm font-medium text-white mb-4">How Credits Work</h3>
              <p className="text-sm text-zinc-400 leading-relaxed mb-4">
                Credits fund your active campaigns and execution channels. Your balance is drawn down automatically as campaigns accrue spend. 
              </p>
              <div className="flex items-center gap-2 mt-4 text-sm">
                <CheckCircle2 className="w-4 h-4 text-zinc-300" />
                <span className="text-zinc-300">Funds are non-refundable.</span>
              </div>
            </div>
          </div>

          {/* Spend Cap */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-white">Spend Cap</h3>
                <p className="text-xs text-zinc-500 mt-0.5">Limit total ad spend charged to your credits per month.</p>
              </div>
              <button onClick={() => { setSpendCapEnabled(!spendCapEnabled); }}
                className={`relative w-11 h-6 rounded-full transition-colors ${spendCapEnabled ? "bg-white" : "bg-zinc-700"}`}>
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-zinc-900 shadow transition-transform ${spendCapEnabled ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
            </div>
            {spendCapEnabled && (
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Monthly cap amount (USD)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">$</span>
                    <input type="number" min="1" value={spendCapAmount}
                      onChange={e => setSpendCapAmount(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2 pl-7 pr-3 text-sm text-white focus:outline-none focus:border-zinc-600"
                      placeholder="500" />
                  </div>
                </div>
                <button onClick={handleSpendCapSave} disabled={spendCapLoading}
                  className="px-4 py-2 bg-white text-zinc-900 text-sm font-semibold rounded-lg hover:bg-zinc-100 disabled:opacity-40 transition-colors flex items-center gap-2">
                  {spendCapLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Save
                </button>
              </div>
            )}
            {!spendCapEnabled && (
              <button onClick={handleSpendCapSave} disabled={spendCapLoading}
                className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-1.5">
                {spendCapLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                Save (disabled)
              </button>
            )}
          </div>

          {/* Transactions Table */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="text-sm font-medium text-white">Transaction History</h3>
              <button
                onClick={handleDownloadCSV}
                disabled={transactions.length === 0}
                className="text-xs font-medium text-zinc-400 hover:text-white transition-colors flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Download className="w-3.5 h-3.5" /> Download CSV
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-900/50 text-zinc-400">
                  <tr>
                    <th className="px-5 py-3 font-medium">Date</th>
                    <th className="px-5 py-3 font-medium">Description</th>
                    <th className="px-5 py-3 font-medium">Campaign</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium text-right">Credits</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50 text-zinc-300">
                  {loadingWallet ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-8 text-center text-zinc-500">
                        <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                        Loading transactions...
                      </td>
                    </tr>
                  ) : transactions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-8 text-center text-zinc-500">
                        No transactions yet. Add credits to get started.
                      </td>
                    </tr>
                  ) : (
                    transactions.map(tx => (
                      <tr key={tx.id} className={`hover:bg-zinc-800/30 transition-colors ${tx.status === "PROCESSING" ? "bg-amber-500/3" : ""}`}>
                        <td className="px-5 py-3 whitespace-nowrap text-zinc-400">
                          <div>{new Date(tx.created_at).toLocaleDateString()}</div>
                          {tx.status === "PROCESSING" && tx.available_at && (
                            <div className="text-[10px] text-amber-400">Avail. {new Date(tx.available_at).toLocaleDateString()}</div>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          <div>{tx.description}</div>
                          {tx.stripe_fee && tx.stripe_fee > 0 && (
                            <div className="text-[10px] text-zinc-600">Fee: ${Number(tx.stripe_fee).toFixed(2)}</div>
                          )}
                        </td>
                        <td className="px-5 py-3 text-zinc-400">{tx.campaign_name || "—"}</td>
                        <td className="px-5 py-3">
                          {tx.status === "PROCESSING" && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              <Clock className="w-2.5 h-2.5" />PROCESSING
                            </span>
                          )}
                          {(tx.status === "AVAILABLE" || !tx.status) && tx.type === "CREDIT" && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <CheckCircle2 className="w-2.5 h-2.5" />AVAILABLE
                            </span>
                          )}
                        </td>
                        <td className={`px-5 py-3 text-right font-medium ${tx.type === 'CREDIT' ? 'text-zinc-200' : 'text-zinc-400'}`}>
                          <div>{tx.type === 'CREDIT' ? '+' : '-'}{fmtCurrency(tx.net_amount ?? tx.amount, tx.currency || wallet.currency)}</div>
                          {tx.gross_amount && tx.gross_amount !== (tx.net_amount ?? tx.amount) && (
                            <div className="text-[10px] text-zinc-600">Charged: {fmtCurrency(tx.gross_amount, tx.currency || wallet.currency)}</div>
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

      {/* ── Tab Content: Billing & Usage ── */}
      {activeTab === "billing" && (
        <div className="space-y-6">
          
          {/* Active Plan Overview */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
            {loadingPlan ? (
              <div className="flex items-center gap-3 animate-pulse">
                <div className="w-10 h-10 rounded-lg bg-zinc-800" />
                <div className="space-y-2">
                  <div className="h-4 w-36 rounded bg-zinc-800" />
                  <div className="h-3 w-56 rounded bg-zinc-800" />
                </div>
              </div>
            ) : (
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">

                <div className="space-y-5 flex-1">
                  {/* Plan header */}
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 bg-zinc-800 rounded-lg border border-zinc-700 mt-0.5">
                      <ActiveIcon className="w-5 h-5 text-zinc-300" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <h2 className="text-lg font-semibold text-white">{activePlan.name}</h2>
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700 uppercase tracking-wider">Active</span>
                        <span className="text-sm font-semibold text-zinc-200">{activePlanPrice}</span>
                        {activePlan.annual && (
                          <span className="text-xs text-zinc-500">(${activePlan.annual}/mo billed annually)</span>
                        )}
                        {planRenewalDate && (
                          <span className="flex items-center gap-1 text-xs text-zinc-500">
                            <Clock className="w-3 h-3" />
                            Renews {new Date(planRenewalDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-zinc-400 mt-1">{activePlan.desc}</p>
                    </div>
                  </div>

                  {/* Stat chips */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
                    {[
                      { label: "Included Users",    value: PLAN_STATS[activePlan.id]?.users    ?? "—" },
                      { label: "Social Profiles",   value: PLAN_STATS[activePlan.id]?.profiles ?? "—" },
                      { label: "Brands/Workspaces", value: PLAN_STATS[activePlan.id]?.brands   ?? "—" },
                      { label: "AI Agents",         value: PLAN_STATS[activePlan.id]?.agents   ?? "—" },
                    ].map(stat => (
                      <div key={stat.label} className="bg-zinc-800/50 rounded-lg px-3 py-2.5 border border-zinc-800">
                        <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">{stat.label}</p>
                        <p className="text-sm font-semibold text-zinc-100">{stat.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Included features */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 pt-2">
                    {activePlan.features.map((f, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-zinc-400">
                        <CheckCircle2 className="w-3.5 h-3.5 text-zinc-600 shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>

                  {/* Limits (what's not included) */}
                  {activePlan.limits.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {activePlan.limits.map((l, i) => (
                        <span key={i} className="text-[10px] px-2 py-1 rounded bg-zinc-900 border border-zinc-800 text-zinc-600">{l}</span>
                      ))}
                    </div>
                  )}
                </div>

                {/* CTA */}
                <div className="flex flex-col items-start md:items-end gap-3 min-w-[180px] justify-start pt-1">
                  <button
                    onClick={() => setShowUpgradeModal(true)}
                    className="px-5 py-2.5 w-full bg-white text-black hover:bg-zinc-200 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    {activePlan.id === 'corporate' ? 'Manage Plan' : 'Upgrade Plan'}
                    <ArrowUpRight className="w-4 h-4" />
                  </button>
                </div>

              </div>
            )}
          </div>

          {/* Usage Metrics */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-zinc-400" />
              <h3 className="text-sm font-medium text-white">Current Usage</h3>
              {loadingUsage && <Loader2 className="w-3.5 h-3.5 text-zinc-500 animate-spin ml-2" />}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Intelligence */}
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="w-4 h-4 text-zinc-400" />
                  <span className="text-sm font-medium text-zinc-300">Intelligence</span>
                </div>
                <p className="text-2xl font-semibold text-white">
                  {loadingUsage ? "—" : (summary["AI_TOKENS"]?.quantity?.toLocaleString() || "0")}
                </p>
                <p className="text-xs text-zinc-500 mt-1">AI Tokens processed</p>
              </div>

              {/* Execution */}
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Globe className="w-4 h-4 text-zinc-400" />
                  <span className="text-sm font-medium text-zinc-300">Execution</span>
                </div>
                <p className="text-2xl font-semibold text-white">
                  {loadingUsage ? "—" : (summary["SOCIAL_API_CALLS"]?.quantity?.toLocaleString() || "0")}
                </p>
                <p className="text-xs text-zinc-500 mt-1">Social API Calls</p>
              </div>

              {/* Storage */}
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Database className="w-4 h-4 text-zinc-400" />
                  <span className="text-sm font-medium text-zinc-300">Storage</span>
                </div>
                <p className="text-2xl font-semibold text-white">
                  {loadingUsage ? "—" : (summary["STORAGE_MB"]?.quantity?.toFixed(1) || "0.0")}
                </p>
                <p className="text-xs text-zinc-500 mt-1">MB of Knowledge Data</p>
              </div>
            </div>
          </div>

          {/* Payment History */}
          <div className="space-y-4 pt-4 border-t border-zinc-800/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-zinc-400" />
                <h3 className="text-sm font-medium text-white">Payment History</h3>
              </div>
            </div>
            
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-8 text-center">
              <FileText className="w-8 h-8 text-zinc-700 mx-auto mb-3" />
              <p className="text-sm font-medium text-zinc-400">No invoices yet</p>
              <p className="text-xs text-zinc-600 mt-1">Invoices will appear here once Stripe billing is connected.</p>
            </div>
          </div>

          {/* Payment Methods */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-zinc-400" />
                <h3 className="text-sm font-medium text-white">Payment Methods</h3>
                {cardsLoading && <Loader2 className="w-3.5 h-3.5 text-zinc-500 animate-spin" />}
              </div>
              <button onClick={handleAddCard} disabled={addingCard}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold rounded-lg transition-colors disabled:opacity-40">
                {addingCard ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                Add Card
              </button>
            </div>
            {cardError && <p className="text-xs text-rose-400 flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5" />{cardError}</p>}
            {cards.length === 0 ? (
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 text-center">
                <CreditCard className="w-7 h-7 text-zinc-700 mx-auto mb-2" />
                <p className="text-sm text-zinc-400">No cards saved yet</p>
                <p className="text-xs text-zinc-600 mt-1">Add a card to enable automatic top-ups and faster deposits.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {cards.map(card => (
                  <div key={card.id} className="flex items-center justify-between p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-6 bg-zinc-800 rounded flex items-center justify-center">
                        <CreditCard className="w-4 h-4 text-zinc-400" />
                      </div>
                      <div>
                        <p className="text-sm text-white font-medium capitalize">{card.brand} ···· {card.last4}</p>
                        <p className="text-xs text-zinc-500">Expires {card.exp_month}/{card.exp_year}</p>
                      </div>
                      {card.is_default && (
                        <span className="text-[10px] px-2 py-0.5 bg-zinc-800 text-zinc-400 border border-zinc-700 rounded uppercase tracking-wider">Default</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {!card.is_default && (
                        <button onClick={() => handleSetDefaultCard(card.id)}
                          className="p-1.5 text-zinc-500 hover:text-zinc-300 transition-colors" title="Set as default">
                          <Star className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button onClick={() => handleDeleteCard(card.id)}
                        className="p-1.5 text-zinc-500 hover:text-rose-400 transition-colors" title="Remove card">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

      {/* ── Deposit Toast ── */}
      {depositToast && mounted && createPortal(
        <div className={`fixed top-4 right-4 z-[9999] flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-xl border text-sm font-semibold ${
          depositToast.type === "success"
            ? "bg-emerald-950 border-emerald-500/30 text-emerald-300"
            : "bg-rose-950 border-rose-500/30 text-rose-300"
        }`}>
          {depositToast.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span className="max-w-sm">{depositToast.msg}</span>
          <button onClick={() => setDepositToast(null)}><X className="w-3.5 h-3.5 opacity-60" /></button>
        </div>,
        document.body
      )}

      {/* ── Add Credits Modal (3-step deposit flow) ── */}
      {showTopUpModal && mounted && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => { setShowTopUpModal(false); resetDeposit(); }} />
          <div className="relative z-10 w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-y-auto max-h-[90vh]">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-zinc-800 rounded-xl">
                  <ArrowDownCircle className="w-4 h-4 text-emerald-400" />
                </div>
                <h2 className="text-base font-semibold text-white">
                  {depositStep === "amount"  && "Add Credits"}
                  {depositStep === "fees"    && "Review Fees"}
                  {depositStep === "confirm" && "Confirm Deposit"}
                </h2>
              </div>
              <button onClick={() => { setShowTopUpModal(false); resetDeposit(); }} className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5">

              {/* Step 1 — Amount */}
              {depositStep === "amount" && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-2">
                      How much do you want in your wallet?
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-bold text-lg">$</span>
                      <input
                        type="number" min="10" max="100000" step="1"
                        value={depositAmount}
                        onChange={e => { setDepositAmount(e.target.value); setDepositError(null); }}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 pl-10 text-white text-lg font-bold placeholder:text-zinc-600 focus:outline-none focus:border-white/30 transition-all"
                        placeholder="100"
                        autoFocus
                      />
                    </div>
                    <p className="text-[11px] text-zinc-600 mt-1.5">Minimum $10 · Maximum $100,000</p>
                  </div>
                  {/* Quick amounts */}
                  <div className="grid grid-cols-4 gap-2">
                    {["50", "100", "250", "500"].map(amt => (
                      <button key={amt} type="button"
                        onClick={() => { setDepositAmount(amt); setDepositError(null); }}
                        className={`py-2 text-center text-sm font-medium rounded-lg border transition-all ${
                          depositAmount === amt
                            ? "bg-white text-zinc-900 border-white"
                            : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-600"
                        }`}>
                        ${amt}
                      </button>
                    ))}
                  </div>
                  <div className="p-3 bg-blue-500/5 border border-blue-500/15 rounded-xl flex items-start gap-2">
                    <Info className="w-3.5 h-3.5 text-blue-400 mt-0.5 shrink-0" />
                    <p className="text-xs text-blue-300">Stripe processing fees (2.9% + $0.30) will be shown on the next screen.</p>
                  </div>
                  {depositError && <p className="text-xs text-rose-400 flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5" />{depositError}</p>}
                  <button onClick={handleCalculateFees} disabled={!depositAmount || loadingFees}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-white hover:bg-zinc-100 text-zinc-900 text-sm font-bold rounded-xl disabled:opacity-40 transition-all">
                    {loadingFees && <Loader2 className="w-4 h-4 animate-spin" />}
                    Calculate Total
                  </button>
                </>
              )}

              {/* Step 2 — Fee breakdown */}
              {depositStep === "fees" && fees && (
                <>
                  <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl space-y-3">
                    <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Fee Breakdown</p>
                    {fees.breakdown.map((line, i) => (
                      <div key={i} className={`flex items-center justify-between ${line.is_total ? "pt-3 border-t border-zinc-700" : ""}`}>
                        <span className={`text-sm ${line.is_total ? "text-white font-bold" : "text-zinc-400"}`}>{line.label}</span>
                        <span className={`text-sm font-bold ${line.is_total ? "text-white text-base" : "text-zinc-300"}`}>
                          {line.is_total ? fmtCurrency(line.amount, fees.currency) : `$${line.amount.toFixed(2)}`}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl space-y-2">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
                      <p className="text-xs text-amber-300 font-semibold">{fees.non_refundable_notice}</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <Clock className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
                      <p className="text-xs text-amber-300">{fees.processing_notice}</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => setDepositStep("amount")} className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-semibold rounded-xl">Back</button>
                    <button onClick={() => setDepositStep("confirm")} className="flex-1 py-2.5 bg-white hover:bg-zinc-100 text-zinc-900 text-sm font-bold rounded-xl">Proceed</button>
                  </div>
                </>
              )}

              {/* Step 3 — Confirm */}
              {depositStep === "confirm" && fees && (
                <>
                  <div className="p-5 bg-emerald-500/5 border border-emerald-500/20 rounded-xl text-center">
                    <p className="text-xs text-zinc-500 mb-1">Total charge to your card</p>
                    <p className="text-4xl font-bold text-white">{fmtCurrency(fees.total_charge, fees.currency)}</p>
                    <p className="text-sm text-emerald-400 mt-1">{fmtCurrency(fees.net_credits, fees.currency)} campaign credits</p>
                  </div>
                  <label className="flex items-start gap-3 p-4 bg-zinc-900 border border-zinc-800 rounded-xl cursor-pointer group"
                    onClick={() => setConfirmed(!confirmed)}>
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${confirmed ? "bg-white border-white" : "border-zinc-600 group-hover:border-zinc-400"}`}>
                      {confirmed && <CheckCircle2 className="w-3.5 h-3.5 text-zinc-900" />}
                    </div>
                    <span className="text-xs text-zinc-400 leading-relaxed">
                      I understand this deposit of <strong className="text-white">{fmtCurrency(fees.total_charge, fees.currency)}</strong> is{" "}
                      <strong className="text-rose-400">non-refundable</strong> and can only be used for{" "}
                      <strong className="text-white">campaign ad spend</strong> within ZoikoVertex.
                    </span>
                  </label>
                  <div className="flex items-center gap-2 p-3 bg-zinc-900 border border-zinc-800 rounded-xl">
                    <Shield className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                    <p className="text-xs text-zinc-500">Redirects to Stripe&apos;s secure checkout. Credits appear as Processing for up to 48h, then Available.</p>
                  </div>
                  {depositError && <p className="text-xs text-rose-400 flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5" />{depositError}</p>}
                  <div className="flex gap-3">
                    <button onClick={() => setDepositStep("fees")} className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-semibold rounded-xl">Back</button>
                    <button onClick={handleConfirmDeposit} disabled={!confirmed || depositing}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-sm font-bold rounded-xl transition-all">
                      {depositing ? <Loader2 className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4" />}
                      {depositing ? "Redirecting…" : `Pay ${fmtCurrency(fees.total_charge, fees.currency)}`}
                    </button>
                  </div>
                </>
              )}

            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Upgrade Modal ── */}
      {showUpgradeModal && mounted && createPortal(
        <div className="fixed inset-0 z-[9999] flex justify-end">
          <div 
            className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity" 
            onClick={() => setShowUpgradeModal(false)} 
          />
          <div className="relative z-10 w-full max-w-5xl bg-zinc-950 border-l border-zinc-800 h-full overflow-y-auto shadow-2xl animate-in slide-in-from-right duration-300">
            <div className="sticky top-0 z-20 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800 p-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Change subscription plan</h2>
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            {planMessage && (
              <div className={`mx-6 mt-4 p-3 rounded-lg text-sm font-medium text-center ${
                planMessage.type === 'success'
                  ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                  : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
              }`}>
                {planMessage.text}
              </div>
            )}

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {PLANS.map(plan => {
                const Icon = plan.icon;
                const isActive = plan.id === activePlanId;
                const isChanging = changingPlan === plan.id;
                return (
                  <div key={plan.id} className={`p-5 rounded-xl border flex flex-col ${isActive ? 'bg-zinc-900 border-zinc-600 ring-1 ring-white/10' : 'bg-zinc-900/50 border-zinc-800'}`}>
                    <Icon className="w-6 h-6 text-zinc-300 mb-4" />
                    <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
                    <p className="text-2xl font-bold text-white mt-2">
                      {plan.price !== null && plan.price > 0 ? `$${plan.price}` : plan.price === 0 ? "Free" : "Custom"}
                      <span className="text-sm font-normal text-zinc-500">
                        {plan.price !== null && plan.price > 0 ? plan.period : ""}
                      </span>
                    </p>
                    <p className="text-xs text-zinc-400 mt-3 min-h-[48px]">{plan.desc}</p>

                    <ul className="mt-6 mb-6 space-y-3 flex-1">
                      {plan.features.slice(0, 4).map((f, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-zinc-300">
                          <CheckCircle2 className="w-3.5 h-3.5 text-zinc-500 shrink-0 mt-0.5" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>

                    {isActive ? (
                      <button disabled className="w-full py-2.5 rounded-lg text-sm font-medium bg-zinc-800 text-zinc-500 cursor-not-allowed">
                        Current Plan
                      </button>
                    ) : plan.id === 'corporate' ? (
                      <a href="mailto:sales@zoikogroup.com?subject=Vertex Corporate Inquiry"
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium bg-white text-black hover:bg-zinc-200 transition-colors">
                        Contact Sales <ArrowUpRight className="w-3.5 h-3.5" />
                      </a>
                    ) : (
                      <button
                        onClick={() => handleChangePlan(plan.id)}
                        disabled={!!changingPlan}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium bg-white text-black hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {isChanging ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                        {isChanging ? 'Switching…' : (activePlanId && PLANS.findIndex(p=>p.id===plan.id) < PLANS.findIndex(p=>p.id===activePlanId) ? 'Downgrade' : 'Upgrade')}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
