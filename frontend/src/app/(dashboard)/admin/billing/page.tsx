"use client";

import { useState, useEffect } from "react";
import {
  Zap, CheckCircle2, Crown, Globe, Database, DollarSign,
  Loader2, Activity, FileText, Download, Rocket,
  TrendingUp, ArrowUpRight, X, Plus, Wallet,
} from "lucide-react";
import { api } from "@/lib/api";
import { createPortal } from "react-dom";

// ── Types ────────────────────────────────────────────────────────

interface UsageSummaryItem { quantity: number; cost: number; unit: string; }

interface WalletTransaction {
  id: string;
  amount: number;
  type: "CREDIT" | "DEBIT";
  description: string;
  campaign_name: string | null;
  created_at: string;
}

interface WalletData {
  balance: number;
  currency: string;
  auto_topup_enabled: boolean;
  auto_topup_threshold: number;
  auto_topup_amount: number;
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

export default function BillingPage() {
  const [activeTab, setActiveTab] = useState<"credits" | "billing">("credits");
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [mounted, setMounted] = useState(false);

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

          const [usageRes, walletRes] = await Promise.allSettled([
            api.get(`/api/v1/monitoring/usage?workspaceId=${ctx.data.workspace_id}`),
            api.get('/api/v1/billing/wallet'),
          ]);

          if (usageRes.status === 'fulfilled' && usageRes.value?.success)
            setSummary(usageRes.value.data?.summary || {});

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
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 flex flex-col justify-center">
              <h3 className="text-sm font-medium text-zinc-400 mb-2">Available Balance</h3>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-semibold text-white">
                  {loadingWallet ? "—" : `$${Number(wallet.balance).toFixed(2)}`}
                </span>
              </div>
              <div className="mt-6">
                <button
                  onClick={() => setShowTopUpModal(true)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-white text-black hover:bg-zinc-200 text-sm font-medium rounded-lg transition-colors">
                  <Plus className="w-4 h-4" />Add Funds
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
                    <th className="px-5 py-3 font-medium text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50 text-zinc-300">
                  {loadingWallet ? (
                    <tr>
                      <td colSpan={4} className="px-5 py-8 text-center text-zinc-500">
                        <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                        Loading transactions...
                      </td>
                    </tr>
                  ) : transactions.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-5 py-8 text-center text-zinc-500">
                        No transactions found.
                      </td>
                    </tr>
                  ) : (
                    transactions.map(tx => (
                      <tr key={tx.id} className="hover:bg-zinc-800/30 transition-colors">
                        <td className="px-5 py-3 whitespace-nowrap text-zinc-400">
                          {new Date(tx.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-5 py-3">{tx.description}</td>
                        <td className="px-5 py-3 text-zinc-400">
                          {tx.campaign_name ? tx.campaign_name : "—"}
                        </td>
                        <td className={`px-5 py-3 text-right font-medium ${tx.type === 'CREDIT' ? 'text-zinc-200' : 'text-zinc-400'}`}>
                          {tx.type === 'CREDIT' ? '+' : '-'}${Number(tx.amount).toFixed(2)}
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

        </div>
      )}

      {/* ── Top-Up Modal ── */}
      {showTopUpModal && mounted && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowTopUpModal(false)} />
          <div className="relative z-10 w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-zinc-800 rounded-xl"><Wallet className="w-4 h-4 text-zinc-300" /></div>
                <h2 className="text-base font-semibold text-white">Add Funds</h2>
              </div>
              <button onClick={() => setShowTopUpModal(false)} className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 bg-zinc-800/50 border border-zinc-700 rounded-xl text-center space-y-2">
              <DollarSign className="w-8 h-8 text-zinc-500 mx-auto" />
              <p className="text-sm font-medium text-zinc-300">Stripe integration coming soon</p>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Campaign wallet top-up via Stripe will be available in Phase 5.
                Once enabled, funds will be drawn down automatically as campaigns accrue ad spend.
              </p>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {["$25", "$50", "$100", "$250"].map(amt => (
                <div key={amt} className="py-2 text-center text-sm font-medium text-zinc-600 bg-zinc-900 border border-zinc-800 rounded-lg">{amt}</div>
              ))}
            </div>
            <button disabled className="w-full py-2.5 bg-zinc-800 text-zinc-600 text-sm font-medium rounded-lg cursor-not-allowed border border-zinc-700">
              Top Up — Coming Soon
            </button>
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
            
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {PLANS.map(plan => {
                const Icon = plan.icon;
                const isActive = plan.id === activePlanId;
                return (
                  <div key={plan.id} className={`p-5 rounded-xl border flex flex-col ${isActive ? 'bg-zinc-900 border-zinc-600' : 'bg-zinc-900/50 border-zinc-800'}`}>
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
                      <button disabled className="w-full py-2.5 rounded-lg text-sm font-medium bg-zinc-900 border border-zinc-700 text-zinc-500 cursor-not-allowed">
                        Stripe Coming Soon
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
