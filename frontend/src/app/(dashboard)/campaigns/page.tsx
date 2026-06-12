"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Plus, Loader2, AlertCircle, RefreshCw, MoreHorizontal,
  Eye, Edit3, Trash2, ExternalLink, Zap, ChevronDown,
  TrendingUp, Link2, Check, X, Settings, ImageIcon,
  CheckCircle2, Clock, Info, Code, Blocks,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useRoleContext } from "@/lib/context/RoleContext";
import CampaignCreatorModal from "@/components/campaigns/CampaignCreatorModal";
import ConfirmActionModal from "@/components/ConfirmActionModal";

// Types

interface Campaign {
  id: string;
  name: string;
  campaign_type: string;
  status: string;
  objective: string;
  platforms: string[];
  budget_total?: number | null;
  budget_daily?: number | null;
  budget_currency?: string;
  spend_recorded?: number;
  start_at?: string | null;
  end_at?: string | null;
  created_at: string;
  wizard_step?: number;
  // metrics from boost sync
  impressions?: number;
  reach?: number;
  clicks?: number;
  cpc?: number;
  cpm?: number;
  ctr?: number;
}

interface MetaAccount {
  id: string;
  platform: string;
  account_name: string;
  account_handle: string;
  ad_account_id?: string | null;
  has_ad_account: boolean;
  has_token: boolean;
}

interface MetaAdAccount {
  id: string; name: string; currency: string;
  timezone: string; status: string; amount_spent: string;
}

interface Stats {
  total: number; draft: number; active: number;
  paused: number; completed: number;
  spend_recorded: number; budget_allocated: number;
}

// Sub-sidebar nav

const SIDEBAR_NAV = [
  {
    section: "AD CAMPAIGNS",
    items: [
      { id: "drafts",        label: "Drafts"                },
      { id: "ad-campaigns",  label: "Facebook ad campaigns" },
    ],
  },
  {
    section: "PIXEL CONNECTOR",
    items: [
      { id: "pixels", label: "Meta Pixels" },
    ],
  },
];

const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit", timeZoneName: "short" }) : "--";

// Account Selector

function AccountSelector({ accounts, selectedId, onSelect, onReload }: {
  accounts: MetaAccount[];
  selectedId: string;
  onSelect: (id: string) => void;
  onReload: () => void;
}) {
  const [open,        setOpen]        = React.useState(false);
  const [settingsFor, setSettingsFor] = React.useState<string | null>(null); // account id with expanded settings
  const [adAccounts,  setAdAccounts]  = React.useState<MetaAdAccount[]>([]);
  const [loadingAd,   setLoadingAd]   = React.useState(false);
  const [linkingFor,  setLinkingFor]  = React.useState<string | null>(null);
  const [adErr,       setAdErr]       = React.useState<string | null>(null);
  const [removing,    setRemoving]    = React.useState<string | null>(null);
  const [confirmRm,   setConfirmRm]   = React.useState<string | null>(null);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false); setAdAccounts([]); setLinkingFor(null);
        setSettingsFor(null); setConfirmRm(null);
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const selected = accounts.find(a => a.id === selectedId);

  const fetchAd = async (accountId: string) => {
    setLoadingAd(true); setAdErr(null); setLinkingFor(accountId); setAdAccounts([]);
    try {
      const r = await api.post(`/api/v1/campaigns/meta/accounts/${accountId}/fetch-ad-accounts`, {});
      if (r.success) setAdAccounts(r.data?.ad_accounts || []);
      else setAdErr(r.error || "Failed to load ad accounts from Meta");
    } catch { setAdErr("Could not reach Meta — check token"); }
    finally { setLoadingAd(false); }
  };

  const linkAd = async (adId: string, adName: string) => {
    if (!linkingFor) return;
    await api.post(`/api/v1/campaigns/meta/accounts/${linkingFor}/set-ad-account`, { ad_account_id: adId, ad_account_name: adName });
    onSelect(linkingFor);
    setAdAccounts([]); setLinkingFor(null); setSettingsFor(null);
    onReload();
  };

  const removeAccount = async (accountId: string) => {
    setRemoving(accountId);
    try {
      await api.delete(`/api/v1/accounts/${accountId}`);
      if (selectedId === accountId) onSelect("");
      onReload();
      setConfirmRm(null); setSettingsFor(null);
    } catch { /* silent */ }
    finally { setRemoving(null); }
  };

  return (
    <div className="relative" ref={ref}>
      {/* Trigger button */}
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-3 py-1.5 bg-surface border border-border hover:border-border rounded-lg text-sm transition-colors">
        {selected ? (
          <><div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" /><span className="text-foreground font-medium">{selected.account_name}</span></>
        ) : (
          <span className="text-foreground-muted">Select account</span>
        )}
        <ChevronDown className="w-3.5 h-3.5 text-foreground-muted" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 w-88 bg-card border border-border rounded-xl shadow-2xl overflow-hidden" style={{ width: 340 }}>
          <p className="px-4 py-2.5 text-[10px] font-bold text-foreground-muted uppercase tracking-widest border-b border-border">
            Connected Meta accounts
          </p>

          {accounts.length === 0 ? (
            <div className="px-4 py-6 text-center space-y-2">
              <p className="text-sm text-foreground-muted">No Facebook accounts connected.</p>
              <a href="/accounts" className="text-xs text-indigo-400 hover:text-indigo-300 underline">Connect an account →</a>
            </div>
          ) : accounts.map(a => {
            const isSelected  = selectedId === a.id;
            const showSettings = settingsFor === a.id;

            return (
              <div key={a.id} className={`border-b border-border last:border-0 ${isSelected ? "bg-[#1877F2]/5" : ""}`}>

                {/* Main account row */}
                <div className="flex items-center gap-2.5 px-4 py-3">
                  <div className="w-8 h-8 rounded-full bg-[#1877F2]/20 border border-[#1877F2]/20 flex items-center justify-center text-[#1877F2] text-xs font-bold shrink-0">
                    {a.account_name?.charAt(0)?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{a.account_name}</p>
                    <p className="text-[10px] text-foreground-muted">@{a.account_handle}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                    {/* Settings gear button */}
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); setSettingsFor(showSettings ? null : a.id); setConfirmRm(null); setAdAccounts([]); setLinkingFor(null); }}
                      className={`p-1.5 rounded-lg transition-colors ${showSettings ? "bg-surface-hover text-foreground" : "text-foreground-muted hover:text-foreground-muted hover:bg-surface-hover"}`}
                      title="Account settings">
                      <Settings className="w-3.5 h-3.5" />
                    </button>
                    {/* Use button — only if has ad account and not selected */}
                    {a.has_ad_account && !isSelected && (
                      <button
                        type="button"
                        onClick={() => { onSelect(a.id); setOpen(false); }}
                        className="text-[11px] px-2.5 py-1 bg-white hover:bg-zinc-100 text-zinc-900 rounded-lg font-semibold transition-colors">
                        Use
                      </button>
                    )}
                  </div>
                </div>

                {/* Ad account status row */}
                <div className="px-4 pb-2.5 pl-[52px]">
                  {a.has_ad_account ? (
                    <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                      <Check className="w-3 h-3" />{a.ad_account_id}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fetchAd(a.id)}
                      disabled={loadingAd && linkingFor === a.id}
                      className="flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors">
                      {loadingAd && linkingFor === a.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Link2 className="w-3 h-3" />}
                      Link ad account
                    </button>
                  )}

                </div>

                {/* Settings panel — slides open */}
                {showSettings && (
                  <div className="mx-3 mb-3 bg-surface border border-border rounded-xl overflow-hidden">
                    {/* Account details */}
                    <div className="px-4 py-3 space-y-2 border-b border-border">
                      <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-widest">Account details</p>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
                        <span className="text-foreground-muted">Name</span>
                        <span className="text-foreground truncate">{a.account_name}</span>
                        <span className="text-foreground-muted">Handle</span>
                        <span className="text-foreground">@{a.account_handle}</span>
                        <span className="text-foreground-muted">Platform</span>
                        <span className="text-foreground capitalize">{a.platform}</span>
                        <span className="text-foreground-muted">Ad Account</span>
                        <span className={a.has_ad_account ? "text-emerald-400" : "text-foreground-muted"}>
                          {a.ad_account_id || "Not linked"}
                        </span>
                        <span className="text-foreground-muted">Token</span>
                        <span className={a.has_token ? "text-emerald-400" : "text-rose-400"}>
                          {a.has_token ? "Active" : "Expired"}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="px-4 py-2.5 space-y-1">
                      {/* Change / Link ad account */}
                      <button type="button"
                        onClick={() => fetchAd(a.id)}
                        disabled={loadingAd && linkingFor === a.id}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-foreground-muted hover:text-white hover:bg-surface-hover rounded-lg transition-colors text-left disabled:opacity-50">
                        {loadingAd && linkingFor === a.id
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin text-foreground-muted" />
                          : <Link2 className="w-3.5 h-3.5 text-foreground-muted" />}
                        {a.has_ad_account ? "Change ad account" : "Link ad account"}
                      </button>

                      {/* Ad account picker — inside settings panel */}
                      {linkingFor === a.id && adAccounts.length > 0 && (
                        <div className="mx-0 mt-1 border border-border rounded-xl overflow-hidden divide-y divide-border/60">
                          <p className="px-3 py-1.5 text-[9px] font-bold text-foreground-muted uppercase tracking-widest bg-card">
                            Select ad account
                          </p>
                          {adAccounts.map(ad => (
                            <button key={ad.id} type="button"
                              onClick={() => linkAd(ad.id, ad.name)}
                              className="w-full flex items-center justify-between px-3 py-2.5 text-left bg-surface hover:bg-surface-hover transition-colors">
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-foreground truncate">{ad.name}</p>
                                <p className="text-[10px] text-foreground-muted">{ad.id} · {ad.currency}</p>
                              </div>
                              <span className="text-[10px] text-foreground-muted shrink-0 ml-2">${ad.amount_spent}</span>
                            </button>
                          ))}
                          <button type="button"
                            onClick={() => { setLinkingFor(null); setAdAccounts([]); }}
                            className="w-full px-3 py-2 text-[11px] text-foreground-muted hover:text-foreground-muted text-left transition-colors">
                            Cancel
                          </button>
                        </div>
                      )}
                      {adErr && linkingFor === a.id && (
                        <p className="text-[11px] text-rose-400 px-3 pb-2">{adErr}</p>
                      )}

                      <a href="/accounts" target="_blank"
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-foreground-muted hover:text-white hover:bg-surface-hover rounded-lg transition-colors">
                        <Settings className="w-3.5 h-3.5 text-foreground-muted" />
                        Manage in Platform Accounts
                      </a>

                      {/* Remove / confirm remove */}
                      {confirmRm === a.id ? (
                        <div className="flex items-center gap-2 px-3 py-2">
                          <span className="text-[11px] text-foreground-muted flex-1">Remove this account?</span>
                          <button type="button"
                            onClick={() => removeAccount(a.id)}
                            disabled={removing === a.id}
                            className="px-2.5 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 text-[11px] font-semibold rounded-lg transition-colors">
                            {removing === a.id ? "Removing…" : "Yes, remove"}
                          </button>
                          <button type="button" onClick={() => setConfirmRm(null)}
                            className="px-2.5 py-1 bg-surface-hover text-foreground-muted text-[11px] rounded-lg transition-colors">
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button type="button"
                          onClick={() => setConfirmRm(a.id)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors text-left">
                          <Trash2 className="w-3.5 h-3.5" />
                          Remove account
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          <a href="/accounts" className="flex items-center gap-2 px-4 py-2.5 text-xs text-foreground-muted hover:text-foreground-muted transition-colors border-t border-border">
            <Settings className="w-3 h-3" /> Manage accounts
          </a>
        </div>
      )}
    </div>
  );
}

// ── PixelsPanel ────────────────────────────────────────────────────────────

interface MetaPixelItem {
  id: string; name: string;
  creation_time: string | null; last_fired_time: string | null;
}

interface PixelStats {
  events_24h: number;
  by_event:   { event: string; count: number }[];
  by_day:     { date: string | number | null; count: number }[];
  meta_error?: string;
}

function timeAgo(v: string | null): string {
  if (!v) return "Never";
  const ms = /^\d+$/.test(v) ? parseInt(v) * 1000 : new Date(v).getTime();
  const d  = Date.now() - ms;
  if (d < 60_000)    return "Just now";
  if (d < 3_600_000)  return `${Math.floor(d / 60_000)}m ago`;
  if (d < 86_400_000) return `${Math.floor(d / 3_600_000)}h ago`;
  return `${Math.floor(d / 86_400_000)}d ago`;
}

function formatDate(v: string | number | null): string {
  if (!v) return "";
  const ms = typeof v === "number" ? v * 1000 : /^\d+$/.test(String(v)) ? parseInt(String(v)) * 1000 : new Date(v).getTime();
  return new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function pixelStatus(lf: string | null, events24h: number | undefined) {
  // If we have real 24h event data, use it for more accurate status
  if (events24h !== undefined) {
    if (events24h > 0) return { label: "Active",       icon: "check" as const };
  }
  if (!lf) return { label: "Waiting for activity", icon: "dot" as const };
  const days = (Date.now() - (/^\d+$/.test(lf) ? parseInt(lf) * 1000 : new Date(lf).getTime())) / 86_400_000;
  if (days < 7)  return { label: "Active",       icon: "check" as const };
  if (days < 30) return { label: "Issues found", icon: "warn"  as const };
  return              { label: "Inactive",        icon: "dot"   as const };
}

function PixelsPanel({ onUseInCampaign }: { onUseInCampaign: (id: string, name: string) => void }) {
  const [pixels,       setPixels]       = useState<MetaPixelItem[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [apiError,     setApiError]     = useState<string | null>(null);
  const [adAcctId,     setAdAcctId]     = useState<string | null>(null);
  const [openMenu,     setOpenMenu]     = useState<string | null>(null);
  const [expanded,     setExpanded]     = useState<string | null>(null);
  const [statsMap,     setStatsMap]     = useState<Record<string, PixelStats>>({});
  const [statsLoading, setStatsLoading] = useState<Record<string, boolean>>({});
  const [showSetup,    setShowSetup]    = useState<{ id: string; name: string; view?: "OPTIONS" | "CODE" } | null>(null);
  // Create pixel modal
  const [showCreate,   setShowCreate]   = useState(false);
  const [createName,   setCreateName]   = useState("");
  const [creating,     setCreating]     = useState(false);
  const [createErr,    setCreateErr]    = useState<string | null>(null);
  // Rename
  const [renamingId,   setRenamingId]   = useState<string | null>(null);
  const [renameVal,    setRenameVal]    = useState("");
  const [renaming,     setRenaming]     = useState(false);
  // Delete
  const [deleteModal,  setDeleteModal]  = useState<{ id: string; name: string } | null>(null);
  const [deleting,     setDeleting]     = useState(false);
  const [deleteResult, setDeleteResult] = useState<{ needs_events_manager?: boolean; events_manager_url?: string; error?: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setApiError(null);
    try {
      const r = await api.get("/api/v1/campaigns/meta/pixels");
      const pxList: MetaPixelItem[] = r.data?.pixels || [];
      setPixels(pxList);
      setAdAcctId(r.data?.ad_account_id || null);
      if (r.data?.error) setApiError(r.data.error);

      // Auto-load 24h event counts for all pixels in parallel (background)
      if (pxList.length > 0) {
        pxList.forEach(px => {
          setStatsLoading(s => ({ ...s, [px.id]: true }));
          api.get(`/api/v1/campaigns/meta/pixels/${px.id}/stats`)
            .then(sr => {
              if (sr.data) setStatsMap(m => ({ ...m, [px.id]: sr.data }));
            })
            .catch(() => {/* non-fatal */})
            .finally(() => setStatsLoading(s => ({ ...s, [px.id]: false })));
        });
      }
    } catch { setApiError("Failed to load pixels. Check your Meta account connection."); }
    finally  { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const loadStats = (pixelId: string) => {
    if (statsMap[pixelId] || statsLoading[pixelId]) return;
    setStatsLoading(s => ({ ...s, [pixelId]: true }));
    api.get(`/api/v1/campaigns/meta/pixels/${pixelId}/stats`)
      .then(r => { if (r.data) setStatsMap(m => ({ ...m, [pixelId]: r.data })); })
      .catch(() => {})
      .finally(() => setStatsLoading(s => ({ ...s, [pixelId]: false })));
  };

  const toggleExpand = (pixelId: string) => {
    const next = expanded === pixelId ? null : pixelId;
    setExpanded(next);
    if (next) loadStats(next);
  };

  const evUrl = adAcctId
    ? `https://business.facebook.com/events_manager2/list/pixel/${adAcctId}`
    : "https://business.facebook.com/events_manager";

  // Create pixel
  const handleCreate = async () => {
    if (!createName.trim()) return;
    setCreating(true); setCreateErr(null);
    try {
      const r = await api.post("/api/v1/campaigns/meta/pixels", { name: createName.trim() });
      if (!r.success) throw new Error(r.error || "Failed");
      setPixels(p => [r.data, ...p]);
      setShowCreate(false);
      setCreateName("");
    } catch (e: any) { setCreateErr(e?.response?.data?.error || e?.message || "Failed to create pixel"); }
    finally { setCreating(false); }
  };

  // Rename pixel
  const startRename = (px: MetaPixelItem) => {
    setRenamingId(px.id); setRenameVal(px.name); setOpenMenu(null);
  };
  const commitRename = async (pixelId: string) => {
    if (!renameVal.trim()) { setRenamingId(null); return; }
    setRenaming(true);
    try {
      await api.patch(`/api/v1/campaigns/meta/pixels/${pixelId}`, { name: renameVal.trim() });
      setPixels(p => p.map(x => x.id === pixelId ? { ...x, name: renameVal.trim() } : x));
      setRenamingId(null);
    } catch { /* keep editing on error */ }
    finally { setRenaming(false); }
  };

  // Delete pixel
  const confirmDelete = async () => {
    if (!deleteModal) return;
    setDeleting(true); setDeleteResult(null);
    try {
      const r = await api.delete(`/api/v1/campaigns/meta/pixels/${deleteModal.id}`);
      if (r.success) {
        setPixels(p => p.filter(x => x.id !== deleteModal.id));
        setDeleteModal(null);
      } else {
        setDeleteResult(r);
      }
    } catch (e: any) {
      const body = e?.response?.data || {};
      setDeleteResult(body.needs_events_manager
        ? body
        : { error: body.error || "Failed to delete pixel." });
    } finally { setDeleting(false); }
  };

  const inp = "w-full bg-background border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-white/30";

  return (
    <div className="space-y-4">

      {/* CAPI info banner */}
      <div className="flex items-start gap-3 p-3.5 bg-blue-500/10 border border-blue-500/20 rounded-xl text-sm text-blue-300">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <span>
          <span className="font-semibold text-blue-200">Conversions API (CAPI)</span>
          {" — "}For server-side event accuracy past ad blockers and iOS privacy.{" "}
          <a href="https://business.facebook.com/business/help/2041148702652490" target="_blank" rel="noopener noreferrer"
            className="underline hover:text-blue-200">Set up in Events Manager →</a>
        </span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-foreground-muted">
          Pixels linked to your Meta ad account.{" "}
          <a href={evUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">View in Events Manager →</a>
        </p>
        <div className="flex items-center gap-2">
          <button onClick={load} className="p-1.5 rounded-lg border border-border hover:bg-surface text-foreground-muted" title="Refresh">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={() => { setShowCreate(true); setCreateErr(null); setCreateName(""); }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1877F2] hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors">
            <Plus className="w-4 h-4" />Create Pixel
          </button>
        </div>
      </div>

      {apiError && (
        <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-sm text-rose-400">
          <AlertCircle className="w-4 h-4 shrink-0" />{apiError}
        </div>
      )}

      {/* Pixels table */}
      <div className="bg-surface border border-border rounded-2xl">
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-3 text-foreground-muted">
            <RefreshCw className="w-5 h-5 animate-spin" /><span className="text-sm">Loading pixels…</span>
          </div>
        ) : pixels.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center">
              <Zap className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <p className="font-semibold text-foreground">No pixels yet</p>
              <p className="text-sm text-foreground-muted mt-1">Create your first Meta Pixel to track conversions.</p>
            </div>
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#1877F2] hover:bg-blue-500 text-white text-sm font-medium rounded-xl">
              <Plus className="w-4 h-4" />Create Pixel
            </button>
          </div>
        ) : (
          <>
            {/* Table header */}
            <div className="grid grid-cols-[auto_2fr_1fr_1fr_1fr_auto] gap-3 px-5 py-3 border-b border-border bg-background/40 rounded-t-2xl text-[11px] font-semibold uppercase tracking-widest text-foreground-muted">
              <span className="w-4" />
              <span>Meta Pixel</span>
              <span>Last Active</span>
              <span>Events (24h)</span>
              <span>Status</span>
              <span className="w-8" />
            </div>

            {pixels.map(px => {
              const stats  = statsMap[px.id];
              const stLoad = statsLoading[px.id];
              const st     = pixelStatus(px.last_fired_time, stats?.events_24h);
              const isOpen = expanded === px.id;

              return (
                <div key={px.id} className="border-b border-border last:border-0">
                  {/* Main row */}
                  <div className="grid grid-cols-[auto_2fr_1fr_1fr_1fr_auto] gap-3 items-center px-5 py-4 hover:bg-white/[0.02] cursor-pointer"
                    onClick={() => toggleExpand(px.id)}>

                    {/* Expand chevron */}
                    <ChevronDown className={`w-4 h-4 text-foreground-muted transition-transform shrink-0 ${isOpen ? "rotate-180" : ""}`} />

                    {/* Name + ID */}
                    <div onClick={e => e.stopPropagation()}>
                      {renamingId === px.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            className="bg-background border border-border rounded-lg px-2 py-1 text-sm text-foreground focus:outline-none focus:border-white/30 w-48"
                            value={renameVal}
                            onChange={e => setRenameVal(e.target.value)}
                            onKeyDown={e => { if (e.key === "Enter") commitRename(px.id); if (e.key === "Escape") setRenamingId(null); }}
                            autoFocus
                          />
                          <button onClick={() => commitRename(px.id)} disabled={renaming}
                            className="text-xs px-2 py-1 bg-white text-zinc-900 rounded-lg font-medium disabled:opacity-50">
                            {renaming ? "…" : "Save"}
                          </button>
                          <button onClick={() => setRenamingId(null)} className="text-xs text-foreground-muted hover:text-foreground">Cancel</button>
                        </div>
                      ) : (
                        <>
                          <p className="font-medium text-foreground text-sm">{px.name}</p>
                          <p className="text-xs text-foreground-muted mt-0.5">ID {px.id}</p>
                        </>
                      )}
                    </div>

                    {/* Last active */}
                    <div className="flex items-center gap-1.5 text-sm text-foreground-muted">
                      <Clock className="w-3.5 h-3.5 shrink-0" />{timeAgo(px.last_fired_time)}
                    </div>

                    {/* Events 24h */}
                    <div className="text-sm">
                      {stLoad ? (
                        <span className="text-foreground-muted text-xs">Loading…</span>
                      ) : stats ? (
                        <span className={stats.events_24h > 0 ? "text-foreground font-medium" : "text-foreground-muted"}>
                          {stats.events_24h > 0 ? stats.events_24h.toLocaleString() : "—"}
                        </span>
                      ) : (
                        <span className="text-foreground-muted">—</span>
                      )}
                    </div>

                    {/* Status */}
                    <div className="flex items-center gap-1.5 text-sm">
                      {st.icon === "check" && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                      {st.icon === "warn"  && <AlertCircle  className="w-3.5 h-3.5 text-amber-400 shrink-0"   />}
                      {st.icon === "dot"   && <div className="w-3 h-3 rounded-full border-2 border-zinc-600 shrink-0" />}
                      <span className={st.icon === "check" ? "text-emerald-400" : st.icon === "warn" ? "text-amber-400" : "text-zinc-400"}>
                        {st.label}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="relative" onClick={e => e.stopPropagation()}>
                      <button onClick={() => setOpenMenu(openMenu === px.id ? null : px.id)}
                        className="p-1.5 rounded-lg text-foreground-muted hover:text-foreground hover:bg-white/5">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                      {openMenu === px.id && (
                        <>
                          <div className="fixed inset-0 z-20" onClick={() => setOpenMenu(null)} />
                          <div className="absolute right-0 top-8 z-30 w-56 bg-surface border border-border rounded-xl shadow-2xl overflow-hidden">
                            <a href={`https://business.facebook.com/events_manager2/list/pixel/${px.id}/overview`}
                              target="_blank" rel="noopener noreferrer" onClick={() => setOpenMenu(null)}
                              className="flex items-center gap-2.5 px-4 py-3 text-sm text-foreground hover:bg-white/5">
                              <ExternalLink className="w-4 h-4 text-foreground-muted" />Go to Events Manager
                            </a>
                            <button onClick={() => { setShowSetup({ id: px.id, name: px.name }); setOpenMenu(null); }}
                              className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-foreground hover:bg-white/5 border-t border-border">
                              <Code className="w-4 h-4 text-foreground-muted" />View Setup Code
                            </button>
                            {st.label === "Active" ? (
                              <button
                                onClick={() => { setOpenMenu(null); onUseInCampaign(px.id, px.name); }}
                                className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-foreground hover:bg-white/5 border-t border-border text-left">
                                <Zap className="w-4 h-4 text-foreground-muted" />Use in Campaign
                              </button>
                            ) : (
                              <div title="Verify pixel to use in campaign"
                                className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-foreground-muted cursor-not-allowed border-t border-border opacity-50 bg-surface-hover/50">
                                <Zap className="w-4 h-4 text-foreground-muted" />Use in Campaign (Unverified)
                              </div>
                            )}
                            <button onClick={() => startRename(px)}
                              className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-foreground hover:bg-white/5 border-t border-border">
                              <Edit3 className="w-4 h-4 text-foreground-muted" />Rename
                            </button>
                            <button
                              onClick={() => { setDeleteModal({ id: px.id, name: px.name }); setDeleteResult(null); setOpenMenu(null); }}
                              className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-rose-400 hover:bg-rose-500/10 border-t border-border">
                              <Trash2 className="w-4 h-4" />Delete Pixel
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Expanded stats panel */}
                  {isOpen && (
                    <div className="px-5 pb-5 pt-1 bg-background/30 border-t border-border/50">
                      {stLoad && !stats ? (
                        <div className="flex items-center gap-2 py-4 text-sm text-foreground-muted">
                          <RefreshCw className="w-4 h-4 animate-spin" />Loading stats…
                        </div>
                      ) : !stats || stats.meta_error ? (
                        <p className="text-sm text-foreground-muted py-3">
                          {stats?.meta_error || "Stats unavailable. You may need full ad account access to view pixel analytics."}
                          {" "}<a href={`https://business.facebook.com/events_manager2/list/pixel/${px.id}/overview`}
                            target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">View in Events Manager →</a>
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 gap-5 pt-3 sm:grid-cols-2">

                          {/* 7-day bar chart */}
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-widest text-foreground-muted mb-3">Last 7 Days</p>
                            {stats.by_day.length === 0 ? (
                              <p className="text-xs text-foreground-muted">No events in the past 7 days.</p>
                            ) : (() => {
                              const max = Math.max(...stats.by_day.map(d => d.count), 1);
                              return (
                                <div className="flex items-end gap-1 h-16">
                                  {stats.by_day.map((d, i) => (
                                    <div key={i} className="flex-1 flex flex-col items-center gap-1 group" title={`${formatDate(d.date)}: ${d.count} events`}>
                                      <div className="w-full bg-blue-500/70 rounded-sm transition-all group-hover:bg-blue-400"
                                        style={{ height: `${Math.max(Math.round((d.count / max) * 100), d.count > 0 ? 4 : 0)}%` }} />
                                      <span className="text-[9px] text-foreground-muted">{formatDate(d.date).split(" ")[1]}</span>
                                    </div>
                                  ))}
                                </div>
                              );
                            })()}
                          </div>

                          {/* Event breakdown */}
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-widest text-foreground-muted mb-3">Events (7 Days)</p>
                            {stats.by_event.length === 0 ? (
                              <p className="text-xs text-foreground-muted">No events in the past 7 days.</p>
                            ) : (
                              <div className="space-y-2">
                                {stats.by_event.slice(0, 6).map(ev => {
                                  const total = stats.by_event.reduce((s, e) => s + e.count, 0) || 1;
                                  const pct   = Math.round((ev.count / total) * 100);
                                  return (
                                    <div key={ev.event}>
                                      <div className="flex items-center justify-between text-xs mb-0.5">
                                        <span className="text-foreground-muted">{ev.event}</span>
                                        <span className="text-foreground font-medium">{ev.count.toLocaleString()}</span>
                                      </div>
                                      <div className="h-1 bg-border rounded-full overflow-hidden">
                                        <div className="h-full bg-blue-500/70 rounded-full" style={{ width: `${pct}%` }} />
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* Create Pixel modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={() => setShowCreate(false)}>
          <div className="bg-surface border border-border rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div>
              <h3 className="text-base font-bold text-foreground">Create Meta Pixel</h3>
              <p className="text-xs text-foreground-muted mt-1">A new pixel will be created in your Meta ad account and ready to install on your website.</p>
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-widest text-foreground-muted mb-1.5">Pixel Name</label>
              <input className={inp} placeholder="My Website Pixel" value={createName}
                onChange={e => setCreateName(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleCreate(); }}
                autoFocus />
            </div>
            {createErr && (
              <div className="flex items-start gap-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />{createErr}
              </div>
            )}
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-foreground-muted hover:text-foreground border border-border rounded-xl">Cancel</button>
              <button onClick={handleCreate} disabled={creating || !createName.trim()}
                className="px-4 py-2 text-sm font-semibold bg-[#1877F2] hover:bg-blue-500 text-white rounded-xl disabled:opacity-50 transition-colors">
                {creating ? "Creating…" : "Create Pixel"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={() => { if (!deleting) setDeleteModal(null); }}>
          <div className="bg-surface border border-border rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            {deleteResult?.needs_events_manager ? (
              <>
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-foreground text-sm">Cannot delete via API</p>
                    <p className="text-xs text-foreground-muted mt-1">
                      This pixel cannot be deleted through the API. Please delete it directly in Meta Events Manager.
                    </p>
                  </div>
                </div>
                <a href={deleteResult.events_manager_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-2.5 bg-[#1877F2] hover:bg-blue-500 text-white text-sm font-medium rounded-xl transition-colors">
                  Open Events Manager <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <button onClick={() => setDeleteModal(null)} className="w-full py-2 text-sm text-foreground-muted hover:text-foreground">Close</button>
              </>
            ) : (
              <>
                <div>
                  <h3 className="text-base font-bold text-foreground">Delete pixel?</h3>
                  <p className="text-sm text-foreground-muted mt-1">
                    <span className="font-medium text-foreground">{deleteModal.name}</span> will be permanently deleted from Meta. Campaigns using this pixel will lose conversion tracking.
                  </p>
                </div>
                {deleteResult?.error && (
                  <div className="flex items-start gap-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />{deleteResult.error}
                  </div>
                )}
                <div className="flex justify-end gap-2">
                  <button onClick={() => setDeleteModal(null)} disabled={deleting}
                    className="px-4 py-2 text-sm text-foreground-muted border border-border rounded-xl hover:text-foreground">Cancel</button>
                  <button onClick={confirmDelete} disabled={deleting}
                    className="px-4 py-2 text-sm font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded-xl disabled:opacity-50 transition-colors">
                    {deleting ? "Deleting…" : "Delete Pixel"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Setup Code modal */}
      {showSetup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={() => setShowSetup(null)}>
          <div className={`bg-surface border border-border rounded-2xl p-6 w-full shadow-2xl transition-all max-h-[90vh] overflow-y-auto ${showSetup.view !== "CODE" ? "max-w-2xl" : "max-w-lg"}`} onClick={e => e.stopPropagation()}>
            {showSetup.view !== "CODE" ? (
              <>
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-bold text-foreground">Connect website activity using pixel</h3>
                  <button onClick={() => setShowSetup(null)} className="p-1 hover:bg-white/10 rounded-lg"><X className="w-5 h-5 text-foreground-muted" /></button>
                </div>
                <p className="text-sm text-foreground-muted mb-6">
                  Select the best method for adding the pixel code to your site based on how the website was built, what kind of access you have to the code and your technical support.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Option 1 */}
                  <div className="border border-border rounded-xl p-5 bg-background/50 hover:bg-white/[0.02] transition-colors flex flex-col">
                    <div className="w-10 h-10 rounded-lg bg-surface-hover border border-border flex items-center justify-center mb-4">
                      <Code className="w-5 h-5 text-foreground-muted" />
                    </div>
                    <h4 className="font-bold text-foreground mb-2">Manually add pixel code to website</h4>
                    <p className="text-sm text-foreground-muted mb-6 flex-1">
                      Follow guided installation instructions with detailed developer documentation or email instructions to your developer.
                    </p>
                    <div>
                      <button onClick={() => setShowSetup({ ...showSetup, view: "CODE" })}
                        className="px-5 py-2 bg-[#1877F2] hover:bg-blue-500 text-white text-sm font-semibold rounded-lg transition-colors">
                        Install Code Manually
                      </button>
                    </div>
                  </div>

                  {/* Option 2 */}
                  <div className="border border-border rounded-xl p-5 bg-background/50 hover:bg-white/[0.02] transition-colors flex flex-col">
                    <div className="w-10 h-10 rounded-lg bg-surface-hover border border-border flex items-center justify-center mb-4">
                      <Blocks className="w-5 h-5 text-foreground-muted" />
                    </div>
                    <h4 className="font-bold text-foreground mb-2">Use partner integration</h4>
                    <p className="text-sm text-foreground-muted mb-6 flex-1">
                      Check if your website is eligible for integration with one of our supported partners, such as Shopify, WordPress and more.
                    </p>
                    <div>
                      <a href={`https://business.facebook.com/events_manager2/list/pixel/${showSetup.id}/settings`} target="_blank" rel="noopener noreferrer"
                        className="inline-block px-5 py-2 bg-[#1877F2] hover:bg-blue-500 text-white text-sm font-semibold rounded-lg transition-colors">
                        Check for Partner
                      </a>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center mt-6 pt-4 border-t border-border">
                  <a href={`mailto:?subject=Install Meta Pixel Code&body=Please install this Meta Pixel Base Code on our website:%0A%0A<!-- Meta Pixel Code -->%0A<script>%0A!function(f,b,e,v,n,t,s)%0A{if(f.fbq)return;n=f.fbq=function(){n.callMethod?%0An.callMethod.apply(n,arguments):n.queue.push(arguments)};%0Aif(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';%0An.queue=[];t=b.createElement(e);t.async=!0;%0At.src=v;s=b.getElementsByTagName(e)[0];%0As.parentNode.insertBefore(t,s)}(window, document,'script',%0A'https://connect.facebook.net/en_US/fbevents.js');%0Afbq('init', '${showSetup.id}');%0Afbq('track', 'PageView');%0A</script>%0A<noscript><img height="1" width="1" style="display:none"%0Asrc="https://www.facebook.com/tr?id=${showSetup.id}&ev=PageView&noscript=1"%0A/></noscript>%0A<!-- End Meta Pixel Code -->`} 
                     className="text-sm font-medium text-foreground hover:text-white transition-colors">
                    Email Instructions
                  </a>
                  <button 
                    onClick={async () => {
                      try {
                        setStatsLoading(s => ({ ...s, [showSetup.id]: true }));
                        const r = await api.get(`/api/v1/campaigns/meta/pixels/${showSetup.id}/stats`);
                        if (r.data) {
                          setStatsMap(m => ({ ...m, [showSetup.id]: r.data }));
                          const px = pixels.find(p => p.id === showSetup.id);
                          const st = pixelStatus(px?.last_fired_time || null, r.data.events_24h);
                          if (st.label === "Active") {
                            alert("Pixel verified successfully! It is now Active.");
                            setShowSetup(null);
                          } else {
                            alert("Not active yet. Please wait for sometime until we receive activity.");
                          }
                        }
                      } catch {
                        alert("Failed to verify. Please try again.");
                      } finally {
                        setStatsLoading(s => ({ ...s, [showSetup.id]: false }));
                      }
                    }}
                    disabled={statsLoading[showSetup.id]}
                    className="flex items-center gap-2 px-5 py-2 bg-white hover:bg-zinc-100 disabled:opacity-50 text-zinc-900 text-sm font-semibold rounded-lg transition-colors">
                    {statsLoading[showSetup.id] && <Loader2 className="w-4 h-4 animate-spin" />}
                    Verify
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between items-start">
                  <div>
                    <button onClick={() => setShowSetup({ ...showSetup, view: "OPTIONS" })} className="text-xs text-blue-400 hover:underline mb-1 inline-block">&larr; Back to options</button>
                    <h3 className="text-base font-bold text-foreground">Pixel Base Code</h3>
                    <p className="text-sm text-foreground-muted mt-1">Paste this code just above the <code className="bg-white/10 px-1 py-0.5 rounded">&lt;/head&gt;</code> tag on your website.</p>
                  </div>
                  <button onClick={() => setShowSetup(null)} className="p-1 hover:bg-white/10 rounded-lg"><X className="w-4 h-4 text-foreground-muted" /></button>
                </div>
                <div className="relative">
                  <pre className="bg-background border border-border p-4 rounded-xl text-[10px] text-emerald-400 overflow-x-auto whitespace-pre-wrap">
{`<!-- Meta Pixel Code -->
<script>
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${showSetup.id}');
fbq('track', 'PageView');
</script>
<noscript><img height="1" width="1" style="display:none"
src="https://www.facebook.com/tr?id=${showSetup.id}&ev=PageView&noscript=1"
/></noscript>
<!-- End Meta Pixel Code -->`}
              </pre>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => {
                const code = `<!-- Meta Pixel Code -->
<script>
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${showSetup.id}');
fbq('track', 'PageView');
</` + `script>
<noscript><img height="1" width="1" style="display:none"
src="https://www.facebook.com/tr?id=${showSetup.id}&ev=PageView&noscript=1"
/></noscript>
<!-- End Meta Pixel Code -->`;
                navigator.clipboard.writeText(code);
                alert("Code copied to clipboard!");
              }} className="px-4 py-2 bg-white hover:bg-zinc-100 text-zinc-900 text-sm font-semibold rounded-xl">Copy Code</button>
            </div>
          </>
        )}
      </div>
    </div>
  )}

    </div>
  );
}

// Main

export default function CampaignsPage() {
  const router = useRouter();
  const { role, isSuperAdmin } = useRoleContext();
  const canCreate = isSuperAdmin || ["ADMIN","WORKSPACE_OWNER","CAMPAIGN_MANAGER","CREATOR"].includes(role ?? "");

  const [tab,        setTab]        = useState("ad-campaigns");
  const [showCreator,setShowCreator]= useState(false);
  const [editCampaignId, setEditCampaignId] = useState<string | null>(null);
  const [creatorPrefill, setCreatorPrefill] = useState<{ pixel_id: string; pixel_name: string; objective: string } | null>(null);
  const [sidebarOpen,setSidebarOpen]= useState(true);
  const [campaigns,  setCampaigns]  = useState<Campaign[]>([]);
  const [stats,      setStats]      = useState<Stats | null>(null);
  const [accounts,   setAccounts]   = useState<MetaAccount[]>([]);
  const [selAccount, setSelAccount] = useState("");
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const [menu,       setMenu]       = useState<string | null>(null);
  const [deleteCampaignId, setDeleteCampaignId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [c, s, a] = await Promise.allSettled([
        api.get("/api/v1/campaigns"),
        api.get("/api/v1/campaigns/stats"),
        api.get("/api/v1/campaigns/meta/accounts"),
      ]);
      if (c.status === "fulfilled") setCampaigns(c.value.data || []);
      if (s.status === "fulfilled") setStats(s.value.data);
      if (a.status === "fulfilled") {
        // Only Facebook accounts can have ad accounts — filter out Instagram
        const accs: MetaAccount[] = (a.value.data?.accounts || []).filter((x: MetaAccount) => x.platform === "facebook");
        setAccounts(accs);
        if (!selAccount) {
          const withAd = accs.find(x => x.has_ad_account);
          if (withAd) setSelAccount(withAd.id);
          else if (accs[0]) setSelAccount(accs[0].id);
        }
      }
    } catch { setError("Failed to load"); }
    finally { setLoading(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { load(); }, [load]);

  const selAcc = accounts.find(a => a.id === selAccount);
  const hasAdAcc = selAcc?.has_ad_account;

  const rows   = tab === "drafts" ? campaigns.filter(c => c.status === "DRAFT") : campaigns;
  const drafts = campaigns.filter(c => c.status === "DRAFT");
  const [selectedDraft, setSelectedDraft] = React.useState<Campaign | null>(null);

  const toggleStatus = async (c: Campaign) => {
    if (c.status === "PAUSING" || c.status === "RESUMING") return;
    
    const pausing = c.status === "ACTIVE" || c.status === "SCHEDULED";
    const originalStatus = c.status;

    // Optimistic UI update for instant button response
    setCampaigns(prev => prev.map(x => x.id === c.id ? { ...x, status: pausing ? "PAUSED" : "ACTIVE" } : x));

    const r = await api.post(
      `/api/v1/campaigns/${c.id}/${pausing ? "pause" : "resume"}`,
      pausing ? { reason: "Paused from campaigns list" } : { reason: "Resumed from campaigns list" },
    );

    if (!r.success) {
      setError(r.error || `Failed to ${pausing ? "pause" : "resume"} campaign`);
      // Revert if API call fails
      setCampaigns(prev => prev.map(x => x.id === c.id ? { ...x, status: originalStatus } : x));
    }
  };

  const deleteCampaign = async (id: string) => {
    setDeleteCampaignId(id);
  };

  const confirmDeleteCampaign = async () => {
    if (!deleteCampaignId) return;
    try {
      await api.delete(`/api/v1/campaigns/${deleteCampaignId}`);
      setCampaigns(prev => prev.filter(c => c.id !== deleteCampaignId));
    } catch { /* silent */ }
    finally { setDeleteCampaignId(null); }
  };

  const isOn = (s: string) => ["ACTIVE","SCHEDULED"].includes(s);

  return (
    <>
    <div className="h-full bg-card flex overflow-hidden">

      {/* Sub-sidebar */}
      <aside className={`shrink-0 border-r border-border/60 flex flex-col transition-all duration-200 ${sidebarOpen ? "w-48" : "w-10"}`}>
        {/* Toggle button row */}
        <div className={`flex items-center h-12 border-b border-border/60 px-2 ${sidebarOpen ? "justify-between" : "justify-center"}`}>
          {sidebarOpen && <span className="text-sm font-bold text-foreground pl-1">Advertise</span>}
          <button
            onClick={() => setSidebarOpen(o => !o)}
            className="p-1.5 text-foreground-muted hover:text-foreground-muted hover:bg-surface-hover rounded-md transition-colors"
            title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${sidebarOpen ? "rotate-90" : "-rotate-90"}`} />
          </button>
        </div>

        {/* Nav items -- only when open */}
        {sidebarOpen && (
          <nav className="flex-1 py-3">
            {SIDEBAR_NAV.map(({ section, items }) => (
              <div key={section} className="mb-4">
                <p className="px-3 mb-1 text-[9px] font-bold text-foreground-muted uppercase tracking-widest">{section}</p>
                {items.map(({ id, label }) => (
                  <button key={id} onClick={() => setTab(id)}
                    className={`w-full text-left flex items-center px-3 py-1.5 text-xs transition-colors ${
                      tab === id
                        ? "bg-white/5 text-foreground border-r-2 border-white font-semibold"
                        : "text-foreground-muted hover:bg-surface hover:text-foreground"
                    }`}>
                    {label}
                  </button>
                ))}
              </div>
            ))}
          </nav>
        )}
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">

        {/* Content header */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-border/60 bg-card">
          <div className="flex items-center gap-2.5">
            {/* Facebook logo */}
            {(tab === "ad-campaigns" || tab === "drafts") && (
              <div className="w-6 h-6 rounded bg-[#1877F2] flex items-center justify-center shrink-0">
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </div>
            )}
            {tab === "pixels" && (
              <div className="w-6 h-6 rounded bg-[#1877F2] flex items-center justify-center shrink-0">
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </div>
            )}
            <h3 className="text-sm font-bold text-foreground">
              {tab === "drafts" ? "Drafts" : tab === "pixels" ? "Meta Pixels" : "All ad campaigns"}
            </h3>
          </div>
          <div className="flex items-center gap-2.5">
            {tab !== "pixels" && (
              <AccountSelector accounts={accounts} selectedId={selAccount} onSelect={id => { setSelAccount(id); load(); }} onReload={load} />
            )}
            <button onClick={load} className="p-1.5 text-foreground-muted hover:text-foreground-muted transition-colors rounded-lg hover:bg-surface-hover">
              <RefreshCw className="w-4 h-4" />
            </button>
            {canCreate && tab !== "pixels" && (
              <button onClick={() => setShowCreator(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-zinc-100 text-zinc-900 text-sm font-semibold rounded-lg transition-colors shadow-sm">
                <Plus className="w-4 h-4" />Create ad campaign
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 px-6 py-5 space-y-4 overflow-y-auto overflow-x-hidden">

        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 text-rose-400 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />{error}
            <button onClick={() => setError(null)}><X className="w-3.5 h-3.5" /></button>
          </div>
        )}

        {/* Pixel Connector */}
        {tab === "pixels" && (
          <PixelsPanel onUseInCampaign={(id, name) => {
            setCreatorPrefill({ pixel_id: id, pixel_name: name, objective: "CONVERSIONS" });
            setShowCreator(true);
            setTab("ad-campaigns");
          }} />
        )}

        {/* No Facebook account connected */}
        {tab !== "pixels" && accounts.length === 0 && !loading && (
          <div className="py-16 text-center">
            <ImageIcon className="w-12 h-12 text-foreground-muted mx-auto mb-4" />
            <p className="text-foreground font-bold text-lg mb-2">Connect your Meta account</p>
            <p className="text-foreground-muted text-sm mb-6 max-w-sm mx-auto">
              Connect your Facebook Business account to run ads directly from your own ad account.
            </p>
            <a href="/accounts"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-zinc-100 text-zinc-900 text-sm font-semibold rounded-lg transition-colors">
              <Plus className="w-4 h-4" />Connect Facebook Account
            </a>
          </div>
        )}

        {/* Warning: no ad account linked */}
        {tab !== "pixels" && accounts.length > 0 && !hasAdAcc && !loading && (
          <div className="flex items-start gap-3 text-sm text-amber-400 py-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>No ad account linked yet. Click the account selector above then &quot;Link ad account&quot; to connect your Meta Ad Account.</span>
          </div>
        )}


        {/* ── Drafts Card View ── */}
        {tab === "drafts" && accounts.length > 0 && (
          <div className="flex gap-0 h-full">
            {/* Draft list */}
            <div className="flex-1 min-w-0">
              {loading ? (
                <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-blue-400" /></div>
              ) : (
                <>
                  {/* Platform filter tabs */}
                  <div className="flex items-center gap-1 mb-4">
                    <button className="flex items-center gap-1.5 px-3 py-1.5 border-b-2 border-blue-500 text-zinc-900">
                      <div className="w-4 h-4 rounded bg-[#1877F2] flex items-center justify-center">
                        <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 fill-white"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                      </div>
                      <span className="text-sm font-bold text-foreground-muted underline">{drafts.length}</span>
                    </button>
                  </div>

                  {/* 90-day notice */}
                  <p className="text-xs text-foreground-muted mb-4">
                    Ad campaigns will be <span className="font-semibold text-foreground-muted">permanently deleted</span> from your drafts after 90 days.
                  </p>

                  {drafts.length === 0 ? (
                    <div className="py-20 text-center">
                      <p className="text-foreground-muted font-semibold mb-1">No drafts</p>
                      <p className="text-foreground-muted text-sm">Start creating a campaign to see it here.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {drafts.map(c => (
                        <div key={c.id}
                          onClick={() => setSelectedDraft(selectedDraft?.id === c.id ? null : c)}
                          className={`flex items-stretch border rounded-xl overflow-hidden cursor-pointer transition-colors ${
                            selectedDraft?.id === c.id ? "border-amber-500/60 bg-amber-500/5" : "border-border hover:border-border bg-surface"
                          }`}>
                          {/* No media box */}
                          <div className="w-24 shrink-0 bg-surface-hover flex items-center justify-center text-foreground-muted text-xs">
                            No media
                          </div>
                          {/* Info */}
                          <div className="flex-1 p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="flex items-center gap-2 mb-0.5">
                                  <div className="w-4 h-4 rounded bg-[#1877F2] flex items-center justify-center shrink-0">
                                    <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 fill-white"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                                  </div>
                                  <p className="text-sm font-bold text-foreground">{c.name}</p>
                                </div>
                                <p className="text-xs text-foreground-muted">
                                  {c.objective?.charAt(0) + c.objective?.slice(1).toLowerCase().replace(/_/g," ")} · No ads · {c.budget_daily ? `$${c.budget_daily}/day` : c.budget_total ? `$${c.budget_total} total` : "No budget set"}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <button type="button"
                                  onClick={e => { e.stopPropagation(); setEditCampaignId(c.id); setShowCreator(true); }}
                                  className="px-3 py-1.5 text-xs font-semibold border border-border hover:border-border text-foreground-muted hover:text-white rounded-lg transition-colors">
                                  Edit
                                </button>
                                <button type="button"
                                  onClick={e => { e.stopPropagation(); deleteCampaign(c.id); setSelectedDraft(null); }}
                                  className="px-3 py-1.5 text-xs font-semibold border border-border hover:border-rose-500/50 text-foreground-muted hover:text-rose-400 rounded-lg transition-colors">
                                  Delete
                                </button>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 mt-2">
                              <span className="text-[10px] px-2 py-0.5 bg-surface-hover text-foreground-muted border border-border rounded font-semibold">Ad draft</span>
                              <p className="text-[11px] text-foreground-muted">
                                Created at {new Date(c.created_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })} · {new Date(c.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Right panel — shown when draft is selected */}
            {selectedDraft && (
              <div className="w-72 shrink-0 border-l border-border flex flex-col overflow-y-auto ml-4 pl-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-sm font-bold text-foreground">{selectedDraft.name}</p>
                    <p className="text-[11px] text-foreground-muted mt-0.5">Created by you</p>
                  </div>
                  <button type="button" onClick={() => setSelectedDraft(null)} className="text-foreground-muted hover:text-foreground-muted transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex gap-2 mb-4">
                  <button type="button"
                    onClick={() => { setEditCampaignId(selectedDraft.id); setShowCreator(true); }}
                    className="flex-1 py-1.5 text-xs font-semibold border border-border hover:border-border text-foreground-muted rounded-lg transition-colors">Edit</button>
                  <button type="button" onClick={() => deleteCampaign(selectedDraft.id)}
                    className="flex-1 py-1.5 text-xs font-semibold border border-border hover:border-rose-500/50 text-foreground-muted hover:text-rose-400 rounded-lg transition-colors">Delete</button>
                </div>

                {/* Mini ad preview */}
                <div className="bg-white rounded-xl overflow-hidden shadow-sm mb-4">
                  <div className="flex items-center justify-between px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-zinc-300 flex items-center justify-center text-[10px] font-bold text-foreground-muted">
                        {accounts[0]?.account_name?.charAt(0) || "P"}
                      </div>
                      <div>
                        <p className="text-[11px] font-bold text-zinc-900">{accounts[0]?.account_name || "Your Page"}</p>
                        <p className="text-[9px] text-foreground-muted">Sponsored · 🌐</p>
                      </div>
                    </div>
                    <span className="text-foreground-muted text-sm">···</span>
                  </div>
                  <div className="w-full h-16 bg-zinc-100 flex items-center justify-center">
                    <p className="text-[10px] text-foreground-muted">No media</p>
                  </div>
                  <div className="px-3 py-2 flex items-center justify-between">
                    <p className="text-[10px] text-foreground-muted uppercase truncate max-w-[120px]">
                      {(() => { try { return new URL((selectedDraft as any).creative?.landing_page_url || (selectedDraft as any).boost_settings?.landing_url || "").hostname || "—"; } catch { return "—"; } })()}
                    </p>
                    <button className="text-[10px] font-bold text-zinc-800 border border-zinc-300 px-2 py-0.5 rounded">
                      {(selectedDraft as any).creative?.cta || "Learn More"}
                    </button>
                  </div>
                  <div className="flex items-center gap-3 px-3 py-2 border-t border-zinc-100 text-[11px] text-foreground-muted">
                    <span>👍 Like</span><span>💬 Comment</span><span>↗ Share</span>
                  </div>
                </div>

                {/* Campaign details */}
                <div className="space-y-3">
                  {[
                    { label: "Ad account", value: accounts[0]?.account_name || "—" },
                    { label: "Objective",  value: selectedDraft.objective?.charAt(0) + selectedDraft.objective?.slice(1).toLowerCase().replace(/_/g," ") },
                    { label: "Audience",   value: (() => { const t = (selectedDraft as any).targeting; if (!t) return "All audiences"; const parts = [t.age_min && t.age_max ? `Age ${t.age_min}–${t.age_max}` : null, t.gender && t.gender !== "ALL" ? t.gender : null, (t.geography as any[])?.[0] ? (typeof (t.geography as any[])[0] === "object" ? (t.geography as any[])[0].display_name || (t.geography as any[])[0].key : (t.geography as any[])[0]) : null].filter(Boolean); return parts.length ? parts.join(", ") : "All audiences"; })() },
                    { label: "Budget",     value: selectedDraft.budget_daily ? `$${selectedDraft.budget_daily}/day` : selectedDraft.budget_total ? `$${selectedDraft.budget_total} total` : "Not set" },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p className="text-xs font-bold text-foreground-muted">{label}</p>
                      <p className="text-xs text-foreground-muted mt-0.5">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Campaign Table ── */}
        {tab !== "pixels" && tab !== "drafts" && accounts.length > 0 && (
          loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <Loader2 className="w-7 h-7 animate-spin text-blue-400" />
              <p className="text-foreground-muted text-sm">Loading campaigns...</p>
            </div>
          ) : rows.length === 0 ? (
            <div className="py-24 flex flex-col items-center text-center">
              <TrendingUp className="w-10 h-10 text-foreground-muted mb-4" />
              <p className="text-foreground-muted font-semibold mb-1">No campaigns yet</p>
              <p className="text-foreground-muted text-sm mb-5">Create your first campaign to start running ads.</p>
              {canCreate && (
                <button onClick={() => setShowCreator(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-zinc-100 text-zinc-900 text-sm font-semibold rounded-lg">
                  <Plus className="w-4 h-4" />Create ad campaign
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ minWidth: 1600 }}>
                <thead>
                  <tr className="border-b border-border">
                    {[
                      ["CAMPAIGN NAME", "min-w-[220px] text-left"],
                      ["STATUS",        "w-[140px] text-left"],
                      ["START DATE",    "w-[140px] text-left"],
                      ["END DATE",      "w-[140px] text-left"],
                      ["MAIN RESULT",   "w-[110px] text-right"],
                      ["COST/RESULT",   "w-[110px] text-right"],
                      ["BUDGET",        "w-[100px] text-right"],
                      ["AMOUNT SPENT",  "w-[120px] text-right"],
                      ["CPM",           "w-[80px]  text-right"],
                      ["CPC",           "w-[80px]  text-right"],
                      ["CTR",           "w-[70px]  text-right"],
                      ["ROAS",          "w-[70px]  text-right"],
                      ["REACH",         "w-[90px]  text-right"],
                      ["IMPRESSIONS",   "w-[110px] text-right"],
                      ["CLICKS",        "w-[80px]  text-right"],
                      ["",              "w-[44px]  text-right"],
                    ].map(([h, cls]) => (
                      <th key={h} className={`px-4 py-3 text-[10px] font-bold text-foreground-muted uppercase tracking-widest whitespace-nowrap ${cls}`}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((c, i) => {
                    const spendPct = c.budget_total && c.spend_recorded
                      ? Math.round((c.spend_recorded / c.budget_total) * 100) : null;
                    const costPerResult = c.impressions && c.spend_recorded
                      ? (c.spend_recorded / c.impressions).toFixed(2) : null;

                    return (
                      <tr key={c.id}
                        className={`hover:bg-surface/40 transition-colors group ${i < rows.length - 1 ? "border-b border-border/40" : ""}`}>

                        {/* Campaign Name */}
                        <td className="px-4 py-4 min-w-[220px]">
                          <Link href={`/campaigns/${c.id}`}
                            className="font-semibold text-foreground hover:text-blue-400 transition-colors line-clamp-1 text-sm">
                            {c.name}
                          </Link>
                          <p className="text-[11px] text-foreground-muted mt-0.5 capitalize">
                            {c.objective?.toLowerCase().replace(/_/g, " ")}  .  {c.campaign_type?.replace("_", " ")}
                          </p>
                        </td>

                        {/* Status toggle */}
                        <td className="px-4 py-4 w-[140px]">
                          <div className="flex items-center gap-2.5">
                            {/* Toggle — grey track, white knob */}
                            <button
                              type="button"
                              onClick={() => toggleStatus(c)}
                              disabled={["DRAFT","APPROVED","COMPLETED","CANCELLED"].includes(c.status)}
                              className={`relative shrink-0 rounded-full transition-colors duration-200 disabled:opacity-30 disabled:cursor-not-allowed ${
                                isOn(c.status) ? "bg-zinc-500" : "bg-surface-hover"
                              }`}
                              style={{ width: 36, height: 20 }}
                            >
                              <span
                                style={{
                                  position: "absolute",
                                  top: 3,
                                  left: 0,
                                  width: 14,
                                  height: 14,
                                  borderRadius: "50%",
                                  background: "#ffffff",
                                  boxShadow: "0 1px 3px rgba(0,0,0,0.4)",
                                  transition: "transform 200ms",
                                  transform: isOn(c.status) ? "translateX(19px)" : "translateX(3px)",
                                }}
                              />
                            </button>
                            {/* Label */}
                            <span className={`text-xs font-medium ${
                              isOn(c.status)        ? "text-foreground" :
                              c.status === "PAUSED" ? "text-foreground-muted" :
                              c.status === "DRAFT"  ? "text-foreground-muted" :
                                                      "text-foreground-muted"
                            }`}>
                              {c.status === "PAUSING"   ? "Pausing..." :
                               c.status === "SCHEDULED" ? "Scheduled" :
                               c.status.charAt(0) + c.status.slice(1).toLowerCase().replace(/_/g, " ")}
                            </span>
                          </div>
                          {c.status === "COMPLETED" && (
                            <p className="text-[10px] text-foreground-muted mt-1 ml-0">Completed</p>
                          )}
                        </td>

                        {/* Dates */}
                        <td className="px-4 py-4 w-[140px]">
                          <p className="text-xs text-foreground-muted">{c.start_at ? new Date(c.start_at).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}) : "--"}</p>
                          {c.start_at && <p className="text-[10px] text-foreground-muted">{new Date(c.start_at).toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit",timeZoneName:"short"})}</p>}
                        </td>
                        <td className="px-4 py-4 w-[140px]">
                          <p className="text-xs text-foreground-muted">{c.end_at ? new Date(c.end_at).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}) : "--"}</p>
                          {c.end_at && <p className="text-[10px] text-foreground-muted">{new Date(c.end_at).toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit",timeZoneName:"short"})}</p>}
                        </td>

                        {/* Main result */}
                        <td className="px-4 py-4 w-[110px] text-right">
                          {c.impressions ? (
                            <><p className="text-sm font-semibold text-foreground">{c.impressions.toLocaleString()}</p>
                            <p className="text-[10px] text-foreground-muted">Impressions</p></>
                          ) : <p className="text-foreground-muted text-xs">--</p>}
                        </td>

                        {/* Cost per result */}
                        <td className="px-4 py-4 w-[110px] text-right">
                          {costPerResult ? (
                            <><p className="text-sm text-foreground">${costPerResult}</p>
                            <p className="text-[10px] text-foreground-muted">per result</p></>
                          ) : <p className="text-foreground-muted text-xs">--</p>}
                        </td>

                        {/* Budget */}
                        <td className="px-4 py-4 w-[100px] text-right">
                          {c.budget_daily ? (
                            <><p className="text-sm text-foreground">{c.budget_currency || "USD"} {c.budget_daily.toLocaleString()}</p>
                            <p className="text-[10px] text-foreground-muted">/day</p></>
                          ) : c.budget_total ? (
                            <><p className="text-sm text-foreground">{c.budget_currency || "USD"} {c.budget_total.toLocaleString()}</p>
                            <p className="text-[10px] text-foreground-muted">total</p></>
                          ) : <p className="text-foreground-muted text-xs">--</p>}
                        </td>

                        {/* Amount spent */}
                        <td className="px-4 py-4 w-[120px] text-right">
                          {c.spend_recorded != null && c.spend_recorded > 0 ? (
                            <>
                              <p className="text-sm text-foreground">${c.spend_recorded.toLocaleString()}</p>
                              {spendPct != null && (
                                <p className={`text-[10px] ${spendPct >= 90 ? "text-amber-400" : "text-foreground-muted"}`}>
                                  {spendPct}% of budget
                                </p>
                              )}
                            </>
                          ) : <p className="text-foreground-muted text-xs">--</p>}
                        </td>

                        {/* CPM */}
                        <td className="px-4 py-4 w-[80px] text-right">
                          <p className="text-xs text-foreground-muted">{c.cpm ? `$${c.cpm.toFixed(2)}` : "--"}</p>
                        </td>

                        {/* CPC */}
                        <td className="px-4 py-4 w-[80px] text-right">
                          <p className="text-xs text-foreground-muted">{c.cpc ? `$${c.cpc.toFixed(2)}` : "--"}</p>
                        </td>

                        {/* CTR */}
                        <td className="px-4 py-4 w-[70px] text-right">
                          <p className="text-xs text-foreground-muted">{c.ctr ? `${c.ctr.toFixed(2)}%` : "--"}</p>
                        </td>

                        {/* ROAS */}
                        <td className="px-4 py-4 w-[70px] text-right">
                          <p className="text-xs text-foreground-muted" title="Requires Meta Insights API sync">--</p>
                        </td>

                        {/* Reach */}
                        <td className="px-4 py-4 w-[90px] text-right">
                          <p className="text-xs text-foreground-muted">{c.reach ? c.reach.toLocaleString() : "--"}</p>
                        </td>

                        {/* Impressions */}
                        <td className="px-4 py-4 w-[110px] text-right">
                          <p className="text-xs text-foreground-muted">{c.impressions ? c.impressions.toLocaleString() : "--"}</p>
                        </td>

                        {/* Clicks */}
                        <td className="px-4 py-4 w-[80px] text-right">
                          <p className="text-xs text-foreground-muted">{c.clicks ? c.clicks.toLocaleString() : "--"}</p>
                        </td>

                        {/* Three-dot menu */}
                        <td className="px-4 py-4 w-[44px] text-right">
                          <div className="relative">
                            <button onClick={e => { e.stopPropagation(); setMenu(menu === c.id ? null : c.id); }}
                              className="p-1.5 rounded-lg text-foreground-muted hover:text-foreground-muted hover:bg-surface-hover transition-colors opacity-0 group-hover:opacity-100">
                              <MoreHorizontal className="w-4 h-4" />
                            </button>
                            {menu === c.id && (
                              <div className="absolute right-0 top-8 z-30 w-52 bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
                                <Link href={`/campaigns/${c.id}`}
                                  className="flex items-center gap-2.5 px-4 py-3 text-sm text-foreground-muted hover:bg-surface">
                                  <Eye className="w-3.5 h-3.5 text-foreground-muted" />Check details and ads
                                </Link>
                                {["DRAFT","CHANGES_REQUESTED"].includes(c.status) && (
                                  <Link href={`/campaigns/new?edit=${c.id}&step=${c.wizard_step ?? 1}`}
                                    className="flex items-center gap-2.5 px-4 py-3 text-sm text-foreground-muted hover:bg-surface">
                                    <Edit3 className="w-3.5 h-3.5 text-foreground-muted" />Edit campaign
                                  </Link>
                                )}
                                <button onClick={() => { deleteCampaign(c.id); setMenu(null); }}
                                  className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-rose-400 hover:bg-surface">
                                  <Trash2 className="w-3.5 h-3.5" />Delete campaign
                                </button>
                                <div className="border-t border-border" />
                                <div className="flex items-start gap-2.5 px-4 py-3">
                                  <ExternalLink className="w-3.5 h-3.5 text-foreground-muted mt-0.5 shrink-0" />
                                  <div>
                                    <p className="text-sm text-foreground-muted">View on Facebook</p>
                                    <p className="text-[10px] text-foreground-muted mt-0.5">You&apos;ll need access to the ad account.</p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      {menu && <div className="fixed inset-0 z-20" onClick={() => setMenu(null)} />}
      </div>
    </div>

    {showCreator && (
      <CampaignCreatorModal
        editId={editCampaignId || undefined}
        prefill={creatorPrefill || undefined}
        onClose={() => { setShowCreator(false); setEditCampaignId(null); setCreatorPrefill(null); }}
        onCreated={() => { setShowCreator(false); setEditCampaignId(null); setCreatorPrefill(null); load(); }}
      />
    )}
    <ConfirmActionModal
      open={!!deleteCampaignId}
      variant="danger"
      title="Delete campaign?"
      message="This will permanently delete this campaign."
      confirmLabel="Delete"
      onConfirm={confirmDeleteCampaign}
      onCancel={() => setDeleteCampaignId(null)}
    />
    </>
  );
}
