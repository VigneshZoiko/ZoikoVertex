"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Zap, Globe, Database, DollarSign,
  RefreshCw, Clock, AlertTriangle, Cpu, HardDrive, CalendarClock,
  TrendingUp, ArrowUpRight, Plus, CheckCircle2,
  Settings2, X, Search, Trash2, FileImage, FileVideo, FileText,
  File, ChevronDown, CheckSquare, Square, Loader2,
} from "lucide-react";
import { api } from "@/lib/api";

interface UsageLog {
  id: string;
  resource_type: string;
  resource_name: string;
  quantity: number;
  unit: string;
  cost_usd: number;
  timestamp: string;
}

interface SummaryItem {
  quantity: number;
  cost: number;
  unit: string;
}

interface BillingPeriod {
  start: string;
  end: string;
  days_remaining: number;
}

interface StorageAddonPack {
  gb: number;
  priceUsd: number;
}

interface StorageAddon {
  id: string;
  pack_gb: number;
  cost_usd: number;
  purchased_at: string;
}

interface StorageQuota {
  plan: string;
  quota: {
    base_gb: number;
    addons_gb: number;
    total_gb: number;
    unlimited: boolean;
  };
  usage: {
    used_mb: number;
    used_gb: number;
    used_pct: number;
    remaining_mb: number | null;
  };
  overage: {
    mb: number;
    gb: number;
  };
  addons: StorageAddon[];
  addon_packs: StorageAddonPack[];
  billing_period: BillingPeriod;
}

interface TokenQuota {
  plan: string;
  quota: {
    monthly_tokens: number;
    unlimited: boolean;
    overage_rate_per_k: number;
  };
  usage: {
    tokens_used: number;
    tokens_remaining: number | null;
    used_pct: number;
  };
  overage: {
    tokens: number;
    cost_usd: number;
  };
  billing_period: BillingPeriod;
}

interface MediaItem {
  id: string;
  title: string;
  url: string;
  file_type: string;
  status: string;
  created_at: string;
  file_size_bytes: number | null;
  uploader?: { full_name?: string; email?: string } | null;
}

function formatBytes(bytes: number | null | undefined): string {
  if (bytes == null) return "";
  if (bytes >= 1_073_741_824) return `${(bytes / 1_073_741_824).toFixed(1)} GB`;
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  if (bytes >= 1_024) return `${(bytes / 1_024).toFixed(0)} KB`;
  return `${bytes} B`;
}

const FILE_TYPE_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  image:    { label: "Image",    icon: FileImage, color: "text-blue-400"   },
  video:    { label: "Video",    icon: FileVideo, color: "text-purple-400" },
  document: { label: "Document", icon: FileText,  color: "text-amber-400"  },
  pdf:      { label: "PDF",      icon: FileText,  color: "text-rose-400"   },
};

function fileTypeMeta(fileType: string) {
  const key = Object.keys(FILE_TYPE_META).find(k => fileType?.toLowerCase().startsWith(k));
  return FILE_TYPE_META[key ?? ''] ?? { label: fileType || "File", icon: File, color: "text-zinc-400" };
}

function ManageStoragePanel({ onClose, onDeleted }: { onClose: () => void; onDeleted: () => void }) {
  const [mounted, setMounted]       = useState(false);
  const [items, setItems]           = useState<MediaItem[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selected, setSelected]     = useState<Set<string>>(new Set());
  const [deleting, setDeleting]     = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (typeFilter !== "all") params.set("type", typeFilter);
      if (search) params.set("search", search);
      // Use the dedicated storage-items endpoint: returns ALL items (all statuses),
      // always scoped to current workspace only — no cross-workspace leakage.
      const r = await api.get(`/api/v1/monitoring/storage-items?${params.toString()}`);
      setItems(r?.data ?? []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [search, typeFilter]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const filteredItems = items;

  const toggleOne = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === filteredItems.length && filteredItems.length > 0) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filteredItems.map(i => i.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selected.size === 0) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const r = await api.post("/api/v1/library/bulk-delete", { ids: Array.from(selected) });
      if (r.success) {
        setSelected(new Set());
        setShowConfirm(false);
        await fetchItems();
        onDeleted();
      } else {
        setDeleteError(r.error ?? "Delete failed. Please try again.");
      }
    } catch {
      setDeleteError("Delete failed. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  const allSelected = filteredItems.length > 0 && selected.size === filteredItems.length;
  const someSelected = selected.size > 0 && !allSelected;

  const totalSelectedSize = filteredItems
    .filter(i => selected.has(i.id))
    .reduce((acc, i) => acc + (i.file_size_bytes ?? 0), 0);

  if (!mounted) return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Slide-over panel */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl flex flex-col bg-zinc-950 border-l border-zinc-800 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-xl">
              <HardDrive className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Manage Storage</h2>
              <p className="text-xs text-zinc-400">Select items to free up storage space</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-3 px-6 py-3 border-b border-zinc-800 shrink-0">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or uploader…"
              className="w-full pl-9 pr-3 py-2 text-sm bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
            />
          </div>

          {/* Type filter */}
          <div className="relative">
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 text-sm bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-200 focus:outline-none focus:border-zinc-500 cursor-pointer"
            >
              <option value="all">All types</option>
              <option value="image">Images</option>
              <option value="video">Videos</option>
              <option value="document">Documents</option>
              <option value="pdf">PDFs</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />
          </div>
        </div>

        {/* Selection bar */}
        {filteredItems.length > 0 && (
          <div className="flex items-center justify-between px-6 py-2.5 bg-zinc-900/50 border-b border-zinc-800 shrink-0">
            <button onClick={toggleAll} className="flex items-center gap-2 text-sm text-zinc-300 hover:text-white transition-colors">
              {allSelected
                ? <CheckSquare className="w-4 h-4 text-emerald-400" />
                : someSelected
                  ? <CheckSquare className="w-4 h-4 text-zinc-500" />
                  : <Square className="w-4 h-4 text-zinc-500" />
              }
              {allSelected ? "Deselect all" : "Select all"}
            </button>
            <span className="text-xs text-zinc-500">{filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''}</span>
          </div>
        )}

        {/* Item list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="w-5 h-5 animate-spin text-zinc-500" />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-2">
              <Database className="w-8 h-8 text-zinc-700" />
              <p className="text-sm text-zinc-500">No media assets found</p>
            </div>
          ) : (
            <ul className="divide-y divide-zinc-800/60">
              {filteredItems.map(item => {
                const ft = fileTypeMeta(item.file_type);
                const Icon = ft.icon;
                const isChecked = selected.has(item.id);
                return (
                  <li
                    key={item.id}
                    onClick={() => toggleOne(item.id)}
                    className={`flex items-center gap-4 px-6 py-3.5 cursor-pointer transition-colors select-none
                      ${isChecked ? "bg-rose-500/5 hover:bg-rose-500/8" : "hover:bg-zinc-900/50"}`}
                  >
                    {/* Checkbox */}
                    <div className="shrink-0">
                      {isChecked
                        ? <CheckSquare className="w-4 h-4 text-rose-400" />
                        : <Square className="w-4 h-4 text-zinc-600" />
                      }
                    </div>

                    {/* Thumbnail / Icon */}
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-zinc-800 shrink-0 flex items-center justify-center">
                      {item.file_type?.startsWith("image") && item.url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.url} alt={item.title} className="w-full h-full object-cover" />
                      ) : (
                        <Icon className={`w-5 h-5 ${ft.color}`} />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-200 truncate">{item.title || "Untitled"}</p>
                      <p className="text-xs text-zinc-500">
                        {item.uploader?.full_name || item.uploader?.email || "Unknown"} · {new Date(item.created_at).toLocaleDateString()} · {formatBytes(item.file_size_bytes) || "–"}
                      </p>
                    </div>

                    {/* Badges */}
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${ft.color} bg-zinc-900 border-zinc-700`}>
                        {ft.label}
                      </span>
                      {item.status !== "available" && (
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border
                          ${item.status === "blocked"
                            ? "text-rose-400 bg-rose-500/10 border-rose-500/20"
                            : "text-amber-400 bg-amber-500/10 border-amber-500/20"}`}>
                          {item.status === "pending_review" ? "In Review" : item.status}
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer action bar */}
        <div className="shrink-0 border-t border-zinc-800 px-6 py-4 bg-zinc-950">
          {deleteError && (
            <p className="text-xs text-rose-400 mb-3 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />{deleteError}
            </p>
          )}
          {showConfirm ? (
            <div className="space-y-3">
              <p className="text-sm text-zinc-300">
                Permanently delete <strong className="text-white">{selected.size}</strong> item{selected.size !== 1 ? 's' : ''}
                {totalSelectedSize > 0 && <> (<strong className="text-white">{formatBytes(totalSelectedSize)}</strong>)</>}? This cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleBulkDelete}
                  disabled={deleting}
                  className="flex-1 flex items-center justify-center gap-2 h-10 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
                >
                  {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  {deleting ? "Deleting…" : `Yes, delete ${selected.size} item${selected.size !== 1 ? 's' : ''}${totalSelectedSize > 0 ? ` (${formatBytes(totalSelectedSize)})` : ''}`}
                </button>
                <button
                  onClick={() => setShowConfirm(false)}
                  disabled={deleting}
                  className="px-5 h-10 border border-zinc-700 text-zinc-400 hover:text-zinc-200 text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowConfirm(true)}
                disabled={selected.size === 0}
                className="flex-1 flex items-center justify-center gap-2 h-10 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                {selected.size === 0
                  ? "Select items to delete"
                  : `Delete ${selected.size} item${selected.size !== 1 ? 's' : ''}${totalSelectedSize > 0 ? ` (${formatBytes(totalSelectedSize)})` : ''}`}
              </button>
              <button
                onClick={onClose}
                className="px-5 h-10 border border-zinc-700 text-zinc-400 hover:text-zinc-200 text-sm font-medium rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </>,
    document.body,
  );
}

const RESOURCE_META: Record<string, { label: string; icon: React.ElementType; color: string; iconBg: string }> = {
  AI_TOKENS:        { label: "AI Tokens",        icon: Zap,       color: "text-amber-500",  iconBg: "bg-amber-500/10"  },
  SOCIAL_API_CALLS: { label: "Social API Calls", icon: Globe,     color: "text-indigo-500", iconBg: "bg-indigo-500/10" },
  STORAGE_MB:       { label: "Storage",          icon: Database,  color: "text-emerald-500",iconBg: "bg-emerald-500/10"},
  MEDIA_ASSETS:     { label: "Media Vault",      icon: HardDrive, color: "text-teal-500",   iconBg: "bg-teal-500/10"  },
};

function getResourceMeta(type: string) {
  return RESOURCE_META[type] ?? { label: type, icon: Cpu, color: "text-foreground-muted", iconBg: "bg-zinc-500/10" };
}

function Skeleton({ className }: { className: string }) {
  return <span className={`animate-pulse bg-[var(--border)] rounded ${className} block`} />;
}

function formatCycleDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatStorage(mb: number): string {
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  return `${mb.toFixed(0)} MB`;
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toString();
}

function quotaBarColor(pct: number): string {
  if (pct >= 100) return "bg-rose-500";
  if (pct >= 80)  return "bg-amber-500";
  return "bg-amber-400";
}

function QuotaStatusBadge({ pct, overage }: { pct: number; overage: number }) {
  if (overage > 0) return (
    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400">Over Quota</span>
  );
  if (pct >= 80) return (
    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400">Warning</span>
  );
  return (
    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">Healthy</span>
  );
}

export default function ResourceMonitoringPage() {
  const [loading, setLoading] = useState(true);
  const [quotaLoading, setQuotaLoading] = useState(true);
  const [storageLoading, setStorageLoading] = useState(true);
  const [logs, setLogs] = useState<UsageLog[]>([]);
  const [summary, setSummary] = useState<Record<string, SummaryItem>>({});
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod | null>(null);
  const [quota, setQuota] = useState<TokenQuota | null>(null);
  const [storageQuota, setStorageQuota] = useState<StorageQuota | null>(null);
  const [purchasingPack, setPurchasingPack] = useState<number | null>(null);
  const [purchaseSuccess, setPurchaseSuccess] = useState<number | null>(null);
  const [purchaseError, setPurchaseError] = useState<{ message: string; link?: string } | null>(null);
  const [billingStatus, setBillingStatus] = useState<string>('active');
  const [showManageStorage, setShowManageStorage] = useState(false);
  const pageRootRef = useRef<HTMLDivElement>(null);

  // Lock the dashboard's scrollable container when the panel is open.
  // Must run here (not inside the portal) so the DOM walk finds the correct ancestor.
  useEffect(() => {
    if (!showManageStorage) return;
    let el: HTMLElement | null = pageRootRef.current?.parentElement ?? null;
    while (el && el !== document.documentElement) {
      const { overflowY } = window.getComputedStyle(el);
      if ((overflowY === 'auto' || overflowY === 'scroll') && el.scrollHeight > el.clientHeight) break;
      el = el.parentElement;
    }
    const target = el ?? document.body;
    const prev = target.style.overflow;
    target.style.overflow = 'hidden';
    return () => { target.style.overflow = prev; };
  }, [showManageStorage]);

  const fetchData = async () => {
    setLoading(true);
    setQuotaLoading(true);
    setStorageLoading(true);
    try {
      const ctx = await api.get("/api/v1/user/context");
      if (ctx.success && ctx.data.workspace_id) {
        const wid = ctx.data.workspace_id;

        const [usageResult, quotaResult, storageResult, overchargeResult] = await Promise.all([
          api.get(`/api/v1/monitoring/usage?workspaceId=${wid}`),
          api.get(`/api/v1/monitoring/quota?workspaceId=${wid}`),
          api.get(`/api/v1/monitoring/storage-quota?workspaceId=${wid}`),
          api.get('/api/v1/billing/overcharge'),
        ]);

        if (usageResult.success) {
          setLogs(usageResult.data.recent_logs ?? []);
          setSummary(usageResult.data.summary ?? {});
          setBillingPeriod(usageResult.data.billing_period ?? null);
        }
        if (quotaResult.success) setQuota(quotaResult.data);
        if (storageResult.success) setStorageQuota(storageResult.data);
        if (overchargeResult.success) setBillingStatus(overchargeResult.data?.billing_status ?? 'active');
      }
    } catch (err) {
      console.error("Failed to fetch monitoring data", err);
    } finally {
      setLoading(false);
      setQuotaLoading(false);
      setStorageLoading(false);
    }
  };

  const purchaseAddon = async (gb: number) => {
    setPurchasingPack(gb);
    setPurchaseError(null);
    try {
      const result = await api.post("/api/v1/monitoring/storage-addon", { pack_gb: gb });
      if (result.success) {
        setPurchaseSuccess(gb);
        setTimeout(() => setPurchaseSuccess(null), 3000);
        // Refresh storage quota
        const ctx = await api.get("/api/v1/user/context");
        if (ctx.success && ctx.data.workspace_id) {
          const r = await api.get(`/api/v1/monitoring/storage-quota?workspaceId=${ctx.data.workspace_id}`);
          if (r.success) setStorageQuota(r.data);
        }
      } else if (result.overcharge_required) {
        setPurchaseError({ message: "Enable overcharge billing first to purchase storage add-ons.", link: "/admin/billing" });
      } else if (result.available !== undefined) {
        setPurchaseError({ message: `Insufficient wallet balance (need $${result.required?.toFixed(2)}, have $${result.available?.toFixed(2)}). Top up to continue.`, link: "/admin/billing" });
      } else {
        setPurchaseError({ message: result.error ?? "Purchase failed. Please try again." });
      }
    } catch {
      setPurchaseError({ message: "Purchase failed. Please try again." });
    } finally {
      setPurchasingPack(null);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const totalCost = Object.values(summary).reduce((acc, s) => acc + s.cost, 0);
  const totalCostMonthly = totalCost * 30;

  const summaryTypes = Object.keys(RESOURCE_META);
  const unknownTypes = Object.keys(summary).filter((k) => !RESOURCE_META[k]);
  const allTypes = [...summaryTypes, ...unknownTypes];

  const usedPct    = quota?.usage.used_pct ?? 0;
  const hasOverage = (quota?.overage.tokens ?? 0) > 0;

  return (
    <div ref={pageRootRef} className="max-w-7xl mx-auto space-y-6">
      {/* Suspension Banner */}
      {billingStatus === 'suspended' && (
        <div className="flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-rose-400">AI Services Suspended — No Credits</p>
            <p className="text-xs text-zinc-400 mt-0.5">
              Your wallet balance reached $0. AI features are unavailable until you top up or your billing cycle resets
              {billingPeriod && ` on ${formatCycleDate(billingPeriod.end)}`}.
            </p>
          </div>
          <a href="/admin/billing" className="shrink-0 px-3 py-1.5 bg-rose-500 hover:bg-rose-400 text-white text-xs font-semibold rounded-lg transition-colors">
            Top Up
          </a>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)]">
            Resource Monitoring
          </h1>
          <p className="text-sm text-[var(--foreground-muted)] mt-1">
            Token consumption, API usage, storage, and infrastructure cost.
          </p>
          {billingPeriod && (
            <div className="mt-2 inline-flex items-center gap-1.5 text-xs text-[var(--foreground-muted)] bg-[var(--surface)] border border-[var(--border)] px-3 py-1 rounded-full">
              <CalendarClock className="w-3.5 h-3.5 text-indigo-400" />
              <span>
                Cycle: <strong className="text-[var(--foreground)]">{formatCycleDate(billingPeriod.start)} – {formatCycleDate(billingPeriod.end)}</strong>
              </span>
              <span className="mx-1 opacity-30">·</span>
              <span className={billingPeriod.days_remaining <= 5 ? "text-amber-400 font-medium" : ""}>
                Resets in {billingPeriod.days_remaining}d
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-right">
            <p className="text-[10px] text-[var(--foreground-muted)] uppercase tracking-wide">This Cycle Spend</p>
            <p className="text-lg font-bold text-[var(--foreground)] tabular-nums">
              {loading ? "—" : `$${totalCost.toFixed(4)}`}
            </p>
          </div>
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium bg-[var(--card)] border border-[var(--border)] rounded-lg hover:bg-[var(--surface)] transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── AI Token Quota Card (full-width) ───────────────────────────────── */}
      <div className={`border rounded-2xl p-6 shadow-sm ${hasOverage ? "bg-rose-500/5 border-rose-500/20" : "bg-[var(--card)] border-[var(--border)]"}`}>
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
          {/* Left: quota meter */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-amber-500/10 rounded-xl">
                <Zap className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-[var(--foreground-muted)]">AI Token Quota</p>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-[var(--foreground)]">
                    {quotaLoading ? "—" : quota?.quota.unlimited ? "Unlimited" : (
                      `${formatTokens(quota?.usage.tokens_used ?? 0)} / ${formatTokens(quota?.quota.monthly_tokens ?? 0)}`
                    )}
                  </h2>
                  {!quotaLoading && quota && !quota.quota.unlimited && (
                    <QuotaStatusBadge pct={usedPct} overage={quota.overage.tokens} />
                  )}
                </div>
              </div>
            </div>

            {quotaLoading ? (
              <Skeleton className="h-3 w-full rounded-full" />
            ) : quota && !quota.quota.unlimited ? (
              <>
                <div className="h-3 bg-[var(--surface)] rounded-full overflow-hidden mb-2">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${quotaBarColor(usedPct)}`}
                    style={{ width: `${Math.min(usedPct, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-[var(--foreground-muted)]">
                  <span className="tabular-nums">{usedPct.toFixed(1)}% used</span>
                  {quota.usage.tokens_remaining !== null && (
                    <span className="tabular-nums">
                      {formatTokens(quota.usage.tokens_remaining)} remaining
                    </span>
                  )}
                </div>
              </>
            ) : null}

            {/* Plan badge */}
            {!quotaLoading && quota && (
              <div className="mt-4 inline-flex items-center gap-1.5 text-xs text-[var(--foreground-muted)] bg-[var(--surface)] border border-[var(--border)] px-2.5 py-1 rounded-full capitalize">
                <TrendingUp className="w-3 h-3" />
                {quota.plan} plan · {quota.quota.unlimited ? "Unlimited tokens" : `${formatTokens(quota.quota.monthly_tokens)}/mo`}
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="hidden md:block w-px bg-[var(--border)] self-stretch" />

          {/* Right: overage + action */}
          <div className="w-full md:w-64 shrink-0 space-y-4">
            {quotaLoading ? (
              <Skeleton className="h-20 w-full rounded-xl" />
            ) : quota && !quota.quota.unlimited ? (
              <>
                <div className={`rounded-xl p-4 ${hasOverage ? "bg-rose-500/10 border border-rose-500/20" : "bg-[var(--surface)]"}`}>
                  <p className="text-xs text-[var(--foreground-muted)] mb-1">Overage this cycle</p>
                  <p className={`text-xl font-bold tabular-nums ${hasOverage ? "text-rose-400" : "text-[var(--foreground)]"}`}>
                    {hasOverage ? formatTokens(quota.overage.tokens) : "0"} tokens
                  </p>
                  {hasOverage && (
                    <>
                      <p className="text-sm text-rose-400 tabular-nums mt-0.5">
                        +${quota.overage.cost_usd.toFixed(4)} overage
                      </p>
                      <p className="text-[10px] text-[var(--foreground-muted)] mt-1">
                        Rate: ${quota.quota.overage_rate_per_k}/1K tokens
                      </p>
                    </>
                  )}
                </div>

                {(hasOverage || usedPct >= 80) && (
                  <a
                    href="/settings/billing"
                    className="flex items-center justify-center gap-2 w-full px-4 py-2.5 text-sm font-semibold rounded-xl bg-amber-500 hover:bg-amber-400 text-white transition-colors"
                  >
                    <ArrowUpRight className="w-4 h-4" />
                    Upgrade Plan
                  </a>
                )}
              </>
            ) : (
              <div className="rounded-xl p-4 bg-[var(--surface)]">
                <p className="text-xs text-[var(--foreground-muted)] mb-1">Overage</p>
                <p className="text-xl font-bold text-emerald-400">None</p>
                <p className="text-xs text-[var(--foreground-muted)] mt-1">Unlimited on current plan</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Storage Quota Card ────────────────────────────────────────────── */}
      {(() => {
        const sq = storageQuota;
        const storageOverage = (sq?.overage.mb ?? 0) > 0;
        const storageUsedPct = sq?.usage.used_pct ?? 0;

        return (
          <div className={`border rounded-2xl p-6 shadow-sm ${storageOverage ? "bg-rose-500/5 border-rose-500/20" : "bg-[var(--card)] border-[var(--border)]"}`}>
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
              {/* Left: quota meter */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-emerald-500/10 rounded-xl">
                      <Database className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-sm text-[var(--foreground-muted)]">Storage Quota</p>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold text-[var(--foreground)]">
                          {storageLoading ? "—" : sq?.quota.unlimited ? "Unlimited" : (
                            `${formatStorage(sq?.usage.used_mb ?? 0)} / ${sq?.quota.total_gb ?? 0} GB`
                          )}
                        </h2>
                        {!storageLoading && sq && !sq.quota.unlimited && (
                          <QuotaStatusBadge pct={storageUsedPct} overage={sq.overage.mb} />
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowManageStorage(true)}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg hover:bg-emerald-500/15 transition-colors shrink-0"
                  >
                    <Settings2 className="w-3.5 h-3.5" />
                    Manage Storage
                  </button>
                </div>

                {storageLoading ? (
                  <Skeleton className="h-3 w-full rounded-full" />
                ) : sq && !sq.quota.unlimited ? (
                  <>
                    <div className="h-3 bg-[var(--surface)] rounded-full overflow-hidden mb-2">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${quotaBarColor(storageUsedPct)}`}
                        style={{ width: `${Math.min(storageUsedPct, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-[var(--foreground-muted)]">
                      <span className="tabular-nums">{storageUsedPct.toFixed(1)}% used</span>
                      {sq.usage.remaining_mb !== null && (
                        <span className="tabular-nums">{formatStorage(sq.usage.remaining_mb)} remaining</span>
                      )}
                    </div>
                  </>
                ) : null}

                {/* Plan + addons purchased */}
                {!storageLoading && sq && (
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <div className="inline-flex items-center gap-1.5 text-xs text-[var(--foreground-muted)] bg-[var(--surface)] border border-[var(--border)] px-2.5 py-1 rounded-full capitalize">
                      <TrendingUp className="w-3 h-3" />
                      {sq.plan} plan · {sq.quota.unlimited ? "Unlimited" : `${sq.quota.base_gb >= 1 ? `${sq.quota.base_gb} GB` : `${sq.quota.base_gb * 1024} MB`} base`}
                    </div>
                    {sq.quota.addons_gb > 0 && (
                      <div className="inline-flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                        <Plus className="w-3 h-3" />
                        {sq.quota.addons_gb} GB add-ons active
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="hidden md:block w-px bg-[var(--border)] self-stretch" />

              {/* Right: overage + add-on purchase */}
              <div className="w-full md:w-72 shrink-0 space-y-4">
                {storageLoading ? (
                  <Skeleton className="h-24 w-full rounded-xl" />
                ) : sq && !sq.quota.unlimited ? (
                  <>
                    {storageOverage && (
                      <div className="rounded-xl p-4 bg-rose-500/10 border border-rose-500/20">
                        <p className="text-xs text-[var(--foreground-muted)] mb-1">Storage over quota</p>
                        <p className="text-xl font-bold text-rose-400 tabular-nums">{formatStorage(sq.overage.mb)}</p>
                        <p className="text-xs text-[var(--foreground-muted)] mt-1">Purchase an add-on to increase your limit</p>
                      </div>
                    )}

                    <div>
                      <p className="text-xs font-semibold text-[var(--foreground-muted)] uppercase tracking-wide mb-2">
                        Purchase Add-on Storage
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {(sq.addon_packs ?? []).map((pack) => {
                          const isPurchasing = purchasingPack === pack.gb;
                          const isSuccess    = purchaseSuccess === pack.gb;
                          return (
                            <button
                              key={pack.gb}
                              onClick={() => purchaseAddon(pack.gb)}
                              disabled={isPurchasing || !!purchasingPack}
                              className={`flex flex-col items-center justify-center gap-0.5 px-3 py-3 rounded-xl border text-sm font-semibold transition-all
                                ${isSuccess
                                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                                  : "bg-[var(--surface)] border-[var(--border)] text-[var(--foreground)] hover:border-emerald-500/40 hover:bg-emerald-500/5"
                                }
                                ${isPurchasing ? "opacity-60 cursor-wait" : ""}
                                ${!!purchasingPack && !isPurchasing ? "opacity-40 cursor-not-allowed" : ""}
                              `}
                            >
                              {isSuccess ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                              ) : (
                                <Plus className={`w-3.5 h-3.5 ${isPurchasing ? "animate-spin" : ""}`} />
                              )}
                              <span>+{pack.gb} GB</span>
                              <span className="text-xs font-normal text-[var(--foreground-muted)]">${pack.priceUsd.toFixed(2)}</span>
                            </button>
                          );
                        })}
                      </div>
                      <p className="text-[10px] text-[var(--foreground-muted)] mt-2 text-center">
                        Charged from wallet · Valid until cycle reset
                      </p>
                      {purchaseError && (
                        <div className="mt-2 flex items-start gap-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                          <p className="text-xs text-rose-400 flex-1">
                            {purchaseError.message}
                            {purchaseError.link && (
                              <> <a href={purchaseError.link} className="underline hover:text-rose-300 transition-colors">Go to Billing</a></>
                            )}
                          </p>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="rounded-xl p-4 bg-[var(--surface)]">
                    <p className="text-xs text-[var(--foreground-muted)] mb-1">Storage</p>
                    <p className="text-xl font-bold text-emerald-400">Unlimited</p>
                    <p className="text-xs text-[var(--foreground-muted)] mt-1">No storage cap on your plan</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Resource Type Cards ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        {summaryTypes.map((type) => {
          const meta = getResourceMeta(type);
          const Icon = meta.icon;
          const data = summary[type];
          const costShare = totalCost > 0 && data ? (data.cost / totalCost) * 100 : 0;

          // AI Tokens card uses quota data for the progress bar
          const isAI = type === "AI_TOKENS";

          return (
            <div
              key={type}
              className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 shadow-sm hover:shadow-md transition-all"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-2.5 ${meta.iconBg} rounded-xl`}>
                  <Icon className={`w-5 h-5 ${meta.color}`} />
                </div>
                <span className="text-xs text-[var(--foreground-muted)] bg-[var(--surface)] px-2 py-1 rounded-full">
                  {loading ? "—" : data ? `$${data.cost.toFixed(4)}` : "$0.0000"}
                </span>
              </div>

              <p className="text-sm text-[var(--foreground-muted)] mb-1">{meta.label}</p>
              <div className="text-2xl font-bold text-[var(--foreground)] tabular-nums mb-1">
                {loading ? <Skeleton className="h-7 w-24" /> : data ? data.quantity.toLocaleString() : "0"}
              </div>
              <p className="text-xs text-[var(--foreground-muted)] mb-4">
                {data?.unit ?? "units"}
              </p>

              <div className="space-y-1">
                {isAI && quota && !quota.quota.unlimited ? (
                  <>
                    <div className="flex justify-between text-xs text-[var(--foreground-muted)]">
                      <span>Monthly quota</span>
                      <span className="tabular-nums">{loading ? "—" : `${quota.usage.used_pct.toFixed(1)}%`}</span>
                    </div>
                    <div className="h-1.5 bg-[var(--surface)] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${quotaBarColor(quota.usage.used_pct)}`}
                        style={{ width: loading ? "0%" : `${Math.min(quota.usage.used_pct, 100)}%` }}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between text-xs text-[var(--foreground-muted)]">
                      <span>Cost share</span>
                      <span className="tabular-nums">{loading ? "—" : `${costShare.toFixed(1)}%`}</span>
                    </div>
                    <div className="h-1.5 bg-[var(--surface)] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${meta.color.replace("text-", "bg-")}`}
                        style={{ width: loading ? "0%" : `${Math.min(costShare, 100)}%` }}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Main Content ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Consumption Feed */}
        <div className="lg:col-span-2 bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-sm overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-400" />
              <h2 className="text-base font-semibold text-[var(--foreground)]">Live Consumption Feed</h2>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-[var(--foreground-muted)]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
              {logs.length} {logs.length === 1 ? "record" : "records"}
            </div>
          </div>

          <div className="overflow-y-auto max-h-96 flex-1">
            {loading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="animate-pulse flex gap-4 items-center">
                    <Skeleton className="w-10 h-10 rounded-xl" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-3 w-32" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
              </div>
            ) : logs.length === 0 ? (
              <div className="py-16 text-center">
                <Database className="w-8 h-8 text-[var(--foreground-muted)] mx-auto mb-2 opacity-40" />
                <p className="text-sm text-[var(--foreground-muted)] italic">No usage records yet.</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-[var(--card)] border-b border-[var(--border)]">
                  <tr>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-[var(--foreground-muted)] uppercase tracking-wide">Type</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--foreground-muted)] uppercase tracking-wide">Resource</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-[var(--foreground-muted)] uppercase tracking-wide">Quantity</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-[var(--foreground-muted)] uppercase tracking-wide">Cost</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-[var(--foreground-muted)] uppercase tracking-wide">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {logs.map((log) => {
                    const meta = getResourceMeta(log.resource_type);
                    const Icon = meta.icon;
                    return (
                      <tr key={log.id} className="hover:bg-[var(--surface)] transition-colors">
                        <td className="px-5 py-3">
                          <div className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-lg ${meta.iconBg} ${meta.color}`}>
                            <Icon className="w-3.5 h-3.5" />
                            {log.resource_type.replace(/_/g, " ")}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-[var(--foreground)] font-medium max-w-[160px] truncate">
                          {log.resource_name}
                        </td>
                        <td className="px-4 py-3 text-right text-[var(--foreground)] tabular-nums">
                          +{log.quantity.toLocaleString()} <span className="text-[var(--foreground-muted)] text-xs">{log.unit}</span>
                        </td>
                        <td className="px-5 py-3 text-right text-emerald-500 font-semibold tabular-nums">
                          ${log.cost_usd.toFixed(4)}
                        </td>
                        <td className="px-5 py-3 text-right text-xs text-[var(--foreground-muted)] tabular-nums whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleTimeString()}
                          <br />
                          <span className="text-[10px]">{new Date(log.timestamp).toLocaleDateString()}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right: Cost Breakdown + Alerts */}
        <div className="space-y-6">
          {/* Cost Breakdown */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-5">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <h2 className="text-base font-semibold text-[var(--foreground)]">Cost Breakdown</h2>
            </div>

            {loading ? (
              <div className="space-y-4 animate-pulse">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="flex justify-between">
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-3 w-12" />
                    </div>
                    <Skeleton className="h-1.5 w-full rounded-full" />
                  </div>
                ))}
              </div>
            ) : totalCost === 0 ? (
              <p className="text-sm text-[var(--foreground-muted)] italic">No cost data yet.</p>
            ) : (
              <div className="space-y-4">
                {allTypes
                  .filter((t) => summary[t])
                  .sort((a, b) => (summary[b]?.cost ?? 0) - (summary[a]?.cost ?? 0))
                  .map((type) => {
                    const meta = getResourceMeta(type);
                    const data = summary[type];
                    const pct = (data.cost / totalCost) * 100;
                    return (
                      <div key={type}>
                        <div className="flex justify-between mb-1.5">
                          <span className="text-sm text-[var(--foreground-muted)]">{meta.label}</span>
                          <span className="text-sm font-semibold text-[var(--foreground)] tabular-nums">
                            ${data.cost.toFixed(4)}
                          </span>
                        </div>
                        <div className="h-1.5 bg-[var(--surface)] rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${meta.color.replace("text-", "bg-")}`}
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-[var(--foreground-muted)] mt-0.5 text-right">{pct.toFixed(1)}% of total</p>
                      </div>
                    );
                  })}

                <div className="border-t border-[var(--border)] pt-4 flex justify-between items-center">
                  <span className="text-sm font-medium text-[var(--foreground-muted)]">Cycle Total</span>
                  <span className="text-lg font-bold text-[var(--foreground)] tabular-nums">${totalCost.toFixed(4)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Alerts / Quota */}
          <div className={`border rounded-2xl p-6 ${hasOverage || totalCost > 1 ? "bg-rose-500/5 border-rose-500/20" : "bg-[var(--card)] border-[var(--border)]"}`}>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className={`w-4 h-4 ${hasOverage || totalCost > 1 ? "text-rose-500" : "text-[var(--foreground-muted)]"}`} />
              <h2 className="text-base font-semibold text-[var(--foreground)]">Quota Alerts</h2>
            </div>
            {loading || quotaLoading ? (
              <Skeleton className="h-4 w-full" />
            ) : hasOverage ? (
              <div className="space-y-1.5">
                <p className="text-sm text-rose-400 font-medium">
                  Token quota exceeded by {formatTokens(quota!.overage.tokens)} tokens.
                </p>
                <p className="text-sm text-rose-400">
                  Overage charge: <strong>${quota!.overage.cost_usd.toFixed(4)}</strong> at ${quota!.quota.overage_rate_per_k}/1K tokens.
                </p>
                <a href="/settings/billing" className="inline-flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 mt-1">
                  Upgrade plan <ArrowUpRight className="w-3 h-3" />
                </a>
              </div>
            ) : usedPct >= 80 && quota ? (
              <p className="text-sm text-amber-400">
                {usedPct.toFixed(1)}% of monthly AI token quota used. Consider upgrading before the cycle ends.
              </p>
            ) : totalCost > 1 ? (
              <p className="text-sm text-rose-400">
                Daily spend ${totalCost.toFixed(4)} may exceed quota at this rate.
                Est. monthly: <strong>${totalCostMonthly.toFixed(2)}</strong>
              </p>
            ) : (
              <p className="text-sm text-[var(--foreground-muted)]">
                No critical quota violations detected. Est. monthly burn: <strong className="text-[var(--foreground)]">${totalCostMonthly.toFixed(2)}</strong>.
              </p>
            )}
          </div>
        </div>
      </div>

      {showManageStorage && (
        <ManageStoragePanel
          onClose={() => setShowManageStorage(false)}
          onDeleted={() => {
            setShowManageStorage(false);
            fetchData();
          }}
        />
      )}
    </div>
  );
}
