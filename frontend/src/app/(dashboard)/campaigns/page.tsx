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
  campaign_boosts?: Array<{ meta_campaign_id?: string | null; ad_account_id?: string | null }>;
  business_unit_id?: string | null;
  // metrics from Meta live fetch
  impressions?: number | null;
  reach?: number | null;
  clicks?: number | null;
  cpc?: number | null;
  cpm?: number | null;
  ctr?: number | null;
  roas?: number | null;
  cpp?: number | null;
  frequency?: number | null;
  unique_clicks?: number | null;
  cost_per_unique_click?: number | null;
  quality_ranking?: string | null;
  engagement_rate_ranking?: string | null;
  conversion_rate_ranking?: string | null;
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
      else { setAdErr(r.error || "Failed to load ad accounts from Meta"); setLinkingFor(null); }
    } catch { setAdErr("Could not reach Meta — check token"); setLinkingFor(null); }
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
          <><div className="w-1.5 h-1.5 rounded-full bg-success-text shrink-0" /><span className="text-foreground font-medium">{selected.account_name}</span></>
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
              <a href="/accounts" className="text-xs text-info-text hover:text-info-text underline">Connect an account →</a>
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
                    {isSelected && <Check className="w-3.5 h-3.5 text-success-text" />}
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
                    <span className="flex items-center gap-1 text-[11px] text-success-text font-medium">
                      <Check className="w-3 h-3" />{a.ad_account_id}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fetchAd(a.id)}
                      disabled={loadingAd && linkingFor === a.id}
                      className="flex items-center gap-1 text-[11px] text-info-text hover:text-info-text transition-colors">
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
                        <span className={a.has_ad_account ? "text-success-text" : "text-foreground-muted"}>
                          {a.ad_account_id || "Not linked"}
                        </span>
                        <span className="text-foreground-muted">Token</span>
                        <span className={a.has_token ? "text-success-text" : "text-error-text"}>
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
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-foreground-muted hover:text-foreground hover:bg-surface-hover rounded-lg transition-colors text-left disabled:opacity-50">
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
                        <p className="text-[11px] text-error-text px-3 pb-2">{adErr}</p>
                      )}

                      <a href="/accounts" target="_blank"
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-foreground-muted hover:text-foreground hover:bg-surface-hover rounded-lg transition-colors">
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
                            className="px-2.5 py-1 bg-error-text/20 hover:bg-error-text/30 text-error-text text-[11px] font-semibold rounded-lg transition-colors">
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
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-error-text hover:text-error-text hover:bg-error-text/10 rounded-lg transition-colors text-left">
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
  code?: string | null;
  is_unavailable?: boolean;
  automatic_matching_fields?: string[];
  connected_datasets?: { id: string; name: string }[];
  capi_enabled?: boolean;
}

interface PixelStats {
  events_24h:    number;
  by_event:      { event: string; count: number }[];
  by_day:        { date: string | number | null; count: number }[];
  by_device:     { device: string; count: number }[];
  by_url:        { url: string; count: number }[];
  by_country:    { country: string; count: number }[];
  event_quality: { event: string; score: number; match_keys: string[] }[];
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

function metaEventLabel(event: string): string {
  if (!event || event === 'Unknown') return 'Other';
  // Split camelCase → "Page View", "Add To Cart", etc.
  return event.replace(/([A-Z])/g, ' $1').trim();
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
  const [showSetup,    setShowSetup]    = useState<{ id: string; name: string; code?: string | null; view?: "OPTIONS" | "CODE" | "CAPI"; capiKey?: string | null } | null>(null);
  const [codeCopied,   setCodeCopied]   = useState(false);
  const [capiKeyVisible, setCapiKeyVisible] = useState(false);
  const [capiSnipTab,    setCapiSnipTab]    = useState<"js" | "node" | "curl">("js");
  const [capiSnipCopied, setCapiSnipCopied] = useState(false);
  const [testingCapi,      setTestingCapi]      = useState(false);
  const [capiTestCode,     setCapiTestCode]     = useState("");
  const [capiTestResult,   setCapiTestResult]   = useState<{ success: boolean; events_received?: number; error?: string } | null>(null);
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

    } catch { setApiError("Failed to load pixels. Check your Meta account connection."); }
    finally  { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const loadStats = (pixelId: string) => {
    if (statsMap[pixelId] || statsLoading[pixelId]) return;
    setStatsLoading(s => ({ ...s, [pixelId]: true }));
    api.get(`/api/v1/campaigns/meta/pixels/${pixelId}/stats`)
      .then(r => { if (r.success && r.data) setStatsMap(m => ({ ...m, [pixelId]: r.data })); })
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
      if (r.data) setPixels(p => [r.data, ...p]);
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
      const r = await api.patch(`/api/v1/campaigns/meta/pixels/${pixelId}`, { name: renameVal.trim() });
      if (!r.success) throw new Error(r.error || "Failed to rename");
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
        <div className="flex items-center gap-2 p-3 bg-error-text/10 border border-error-border/20 rounded-xl text-sm text-error-text">
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
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-foreground text-sm">{px.name}</p>
                            {px.is_unavailable && (
                              <span className="px-1.5 py-0.5 bg-error-text/15 text-error-text text-[10px] font-bold rounded uppercase tracking-wide">Unavailable</span>
                            )}
                          </div>
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
                      {st.icon === "check" && <CheckCircle2 className="w-3.5 h-3.5 text-success-text shrink-0" />}
                      {st.icon === "warn"  && <AlertCircle  className="w-3.5 h-3.5 text-warning-text shrink-0"   />}
                      {st.icon === "dot"   && <div className="w-3 h-3 rounded-full border-2 border-border shrink-0" />}
                      <span className={st.icon === "check" ? "text-success-text" : st.icon === "warn" ? "text-warning-text" : "text-foreground-muted"}>
                        {st.label}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 relative" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => { setShowSetup({ id: px.id, name: px.name, code: px.code, view: "OPTIONS" }); }}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-foreground-muted hover:text-foreground hover:bg-white/5 border border-border/50 transition-colors"
                        title="Install options"
                      >
                        <Code className="w-3.5 h-3.5" />Install
                      </button>
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
                            <button onClick={() => { setShowSetup({ id: px.id, name: px.name, code: px.code }); setOpenMenu(null); }}
                              className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-foreground hover:bg-white/5 border-t border-border">
                              <Code className="w-4 h-4 text-foreground-muted" />View Setup Code
                            </button>
                            <button
                              onClick={async () => {
                                setOpenMenu(null);
                                setShowSetup({ id: px.id, name: px.name, code: px.code, view: "CAPI", capiKey: null });
                                setCapiKeyVisible(false);
                                setCapiTestResult(null);
                                try {
                                  const r = await api.get(`/api/v1/campaigns/meta/pixels/${px.id}/capi/key`);
                                  if (r?.data?.integration_key) {
                                    setShowSetup(s => s ? { ...s, capiKey: r.data.integration_key } : s);
                                  }
                                } catch { /* key stays null */ }
                              }}
                              className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-foreground hover:bg-white/5 border-t border-border">
                              <Zap className="w-4 h-4 text-foreground-muted" />Set Up Conversions API
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
                              className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-error-text hover:bg-error-text/10 border-t border-border">
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
                      ) : (() => {
                        const total7d  = stats.by_event.reduce((s, e) => s + e.count, 0);
                        const dayMax   = Math.max(...stats.by_day.map(d => d.count), 1);
                        const devTotal = (stats.by_device || []).reduce((s, d) => s + d.count, 0) || 1;
                        const urlTotal = (stats.by_url    || []).reduce((s, u) => s + u.count, 0) || 1;
                        const cntTotal = (stats.by_country|| []).reduce((s, c) => s + c.count, 0) || 1;

                        const BarRow = ({ label, count, total, color }: { label: string; count: number; total: number; color: string }) => {
                          const pct = Math.round((count / total) * 100);
                          return (
                            <div>
                              <div className="flex items-center justify-between text-xs mb-0.5">
                                <span className="text-foreground-muted truncate max-w-[60%]" title={label}>{label}</span>
                                <span className="text-foreground font-medium shrink-0 ml-2">{count.toLocaleString()} <span className="text-foreground-muted font-normal">({pct}%)</span></span>
                              </div>
                              <div className="h-1 bg-border rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          );
                        };

                        const hasMetaDataset = (px.connected_datasets?.length ?? 0) > 0;
                        const hasCapi        = px.capi_enabled || hasMetaDataset;
                        const autoMatch = px.automatic_matching_fields ?? [];

                        return (
                          <div className="pt-3 space-y-5">

                            {/* KPI row */}
                            <div className="grid grid-cols-3 gap-3">
                              {[
                                { label: "Events (7 days)", value: total7d.toLocaleString() },
                                { label: "Events (24h)",    value: stats.events_24h.toLocaleString() },
                                { label: "Top Event",       value: stats.by_event[0] ? metaEventLabel(stats.by_event[0].event) : "—" },
                              ].map(k => (
                                <div key={k.label} className="bg-surface-raised/60 rounded-xl p-3 text-center">
                                  <p className="text-[10px] font-semibold uppercase tracking-widest text-foreground-muted mb-1">{k.label}</p>
                                  <p className="text-base font-bold text-foreground">{k.value}</p>
                                </div>
                              ))}
                            </div>

                            {/* CAPI + Auto-matching status */}
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border ${
                                hasCapi
                                  ? "text-success-text border-success-text/30 bg-success-text/10"
                                  : "text-foreground-muted border-border bg-surface-hover"
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full inline-block ${hasCapi ? "bg-success-text" : "bg-zinc-500"}`} />
                                {px.capi_enabled && !hasMetaDataset
                                  ? "ZoikoVertex CAPI Active"
                                  : hasMetaDataset
                                  ? `CAPI Connected · ${(px.connected_datasets || []).map(d => d.name).join(", ")}`
                                  : "No Conversions API"}
                              </span>
                              <button
                                onClick={async () => {
                                  setShowSetup({ id: px.id, name: px.name, code: px.code, view: "CAPI", capiKey: null });
                                  setCapiKeyVisible(false);
                                  setCapiTestResult(null);
                                  try {
                                    const r = await api.get(`/api/v1/campaigns/meta/pixels/${px.id}/capi/key`);
                                    if (r?.data?.integration_key) {
                                      setShowSetup(s => s ? { ...s, capiKey: r.data.integration_key } : s);
                                    }
                                  } catch { /* key stays null */ }
                                }}
                                className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full border border-[#1877F2]/40 bg-[#1877F2]/10 text-[#1877F2] hover:bg-[#1877F2]/20 transition-colors"
                              >
                                <Zap className="w-3 h-3" />
                                {hasCapi ? "View CAPI" : "Set Up CAPI"}
                              </button>
                              {autoMatch.length > 0 && (
                                <span className="flex items-center gap-1 text-[11px] text-foreground-muted px-2.5 py-1 rounded-full border border-border bg-surface-hover">
                                  <span className="font-semibold text-foreground-muted">Auto-match:</span>
                                  {autoMatch.slice(0, 4).map((f: string) => (
                                    <span key={f} className="px-1.5 py-0.5 bg-surface rounded text-[10px]">{f.replace(/_/g, " ")}</span>
                                  ))}
                                  {autoMatch.length > 4 && <span className="text-[10px]">+{autoMatch.length - 4}</span>}
                                </span>
                              )}
                            </div>

                            {/* Daily trend bar chart — use px heights (% fails on auto-height flex parents) */}
                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-widest text-foreground-muted mb-2">Daily Trend (7 Days)</p>
                              {stats.by_day.length === 0 ? (
                                <p className="text-xs text-foreground-muted">No data.</p>
                              ) : (
                                <div className="flex items-end gap-1">
                                  {stats.by_day.map((d, i) => {
                                    const label  = typeof d.date === "string" ? d.date.substring(5) : String(d.date || "");
                                    const barPx  = d.count > 0 ? Math.max(Math.round((d.count / dayMax) * 52), 5) : 2;
                                    return (
                                      <div key={i} className="flex-1 flex flex-col items-center gap-0.5 group" title={`${d.date}: ${d.count.toLocaleString()} events`}>
                                        <div className="w-full bg-[#1877F2]/60 rounded-sm hover:bg-[#1877F2]/80 transition-colors"
                                          style={{ height: `${barPx}px` }} />
                                        <span className="text-[8px] text-foreground-muted leading-none">{label}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>

                            {/* Event Types + Device Types */}
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                              <div>
                                <p className="text-[11px] font-semibold uppercase tracking-widest text-foreground-muted mb-2">Event Types</p>
                                {stats.by_event.length === 0 ? (
                                  <p className="text-xs text-foreground-muted">No events.</p>
                                ) : (
                                  <div className="space-y-2">
                                    {stats.by_event.slice(0, 8).map((ev, evIdx) => (
                                      <BarRow key={`${ev.event}-${evIdx}`} label={metaEventLabel(ev.event)} count={ev.count} total={total7d || 1} color="bg-blue-500/70" />
                                    ))}
                                  </div>
                                )}
                              </div>

                              <div>
                                <p className="text-[11px] font-semibold uppercase tracking-widest text-foreground-muted mb-2">Device Types</p>
                                {(!stats.by_device || stats.by_device.length === 0) ? (
                                  <p className="text-xs text-foreground-muted">No device data.</p>
                                ) : (
                                  <div className="space-y-2">
                                    {stats.by_device.slice(0, 6).map((dv, dvIdx) => (
                                      <BarRow key={`${dv.device}-${dvIdx}`} label={dv.device.replace(/_/g, " ")} count={dv.count} total={devTotal} color="bg-purple-500/70" />
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Top Pages + Geography */}
                            {((stats.by_url?.length ?? 0) > 0 || (stats.by_country?.length ?? 0) > 0) && (
                              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-1 border-t border-border/50">

                                {(stats.by_url?.length ?? 0) > 0 && (
                                  <div>
                                    <p className="text-[11px] font-semibold uppercase tracking-widest text-foreground-muted mb-2">Top Pages</p>
                                    <div className="space-y-2">
                                      {(stats.by_url || []).slice(0, 6).map((u, ui) => {
                                        let display = u.url;
                                        try {
                                          const p = new URL(u.url);
                                          // Show host + path so duplicate "/" roots are distinguishable by domain
                                          display = p.hostname + (p.pathname !== "/" ? p.pathname : "");
                                        } catch { /* keep raw */ }
                                        if (display.length > 45) display = display.substring(0, 43) + "…";
                                        return (
                                          <BarRow key={`url-${ui}`} label={display || u.url} count={u.count} total={urlTotal} color="bg-teal-500/70" />
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}

                                {(stats.by_country?.length ?? 0) > 0 && (
                                  <div>
                                    <p className="text-[11px] font-semibold uppercase tracking-widest text-foreground-muted mb-2">Geography</p>
                                    <div className="space-y-2">
                                      {(stats.by_country || []).slice(0, 6).map((c, ci) => (
                                        <BarRow key={`cntry-${ci}`} label={c.country} count={c.count} total={cntTotal} color="bg-amber-500/70" />
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Event Match Quality */}
                            {(stats.event_quality?.length ?? 0) > 0 && (
                              <div className="pt-1 border-t border-border/50">
                                <p className="text-[11px] font-semibold uppercase tracking-widest text-foreground-muted mb-2">Event Match Quality</p>
                                <div className="space-y-2">
                                  {(stats.event_quality || []).slice(0, 5).map((eq, eqIdx) => {
                                    const score = Number(eq.score);
                                    const color  = score >= 7 ? "bg-success-text/70" : score >= 4 ? "bg-warning-text/70" : "bg-error-text/70";
                                    const label  = score >= 7 ? "Excellent" : score >= 4 ? "Fair" : "Poor";
                                    return (
                                      <div key={`emq-${eqIdx}`} className="flex items-center justify-between text-xs">
                                        <span className="text-foreground-muted">{metaEventLabel(eq.event)}</span>
                                        <div className="flex items-center gap-2">
                                          {eq.match_keys?.length > 0 && (
                                            <span className="text-[9px] text-foreground-muted">{eq.match_keys.slice(0, 3).join(", ")}</span>
                                          )}
                                          <div className="flex items-center gap-1">
                                            <div className={`w-2 h-2 rounded-full ${color}`} />
                                            <span className={`font-semibold ${score >= 7 ? "text-success-text" : score >= 4 ? "text-warning-text" : "text-error-text"}`}>
                                              {score.toFixed(1)} <span className="font-normal text-foreground-muted">({label})</span>
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                                <p className="text-[9px] text-foreground-muted mt-2">Score 0–10 · Measures how well Meta can match pixel events to users</p>
                              </div>
                            )}

                          </div>
                        );
                      })()}
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
              <div className="flex items-start gap-2 p-3 bg-error-text/10 border border-error-border/20 rounded-xl text-xs text-error-text">
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
                  <AlertCircle className="w-5 h-5 text-warning-text shrink-0 mt-0.5" />
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
                  <div className="flex items-start gap-2 p-3 bg-error-text/10 border border-error-border/20 rounded-xl text-xs text-error-text">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />{deleteResult.error}
                  </div>
                )}
                <div className="flex justify-end gap-2">
                  <button onClick={() => setDeleteModal(null)} disabled={deleting}
                    className="px-4 py-2 text-sm text-foreground-muted border border-border rounded-xl hover:text-foreground">Cancel</button>
                  <button onClick={confirmDelete} disabled={deleting}
                    className="px-4 py-2 text-sm font-semibold bg-error-text hover:bg-error-text text-white rounded-xl disabled:opacity-50 transition-colors">
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
          <div className={`bg-surface border border-border rounded-2xl p-6 w-full shadow-2xl transition-all max-h-[90vh] overflow-y-auto ${showSetup.view === "CAPI" ? "max-w-2xl" : showSetup.view === "CODE" ? "max-w-lg" : "max-w-3xl"}`} onClick={e => e.stopPropagation()}>
            {showSetup.view === "CAPI" ? (
              <>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <button onClick={() => setShowSetup({ ...showSetup, view: "OPTIONS" })} className="text-xs text-blue-400 hover:underline mb-1 inline-block">&larr; Back to options</button>
                    <h3 className="text-base font-bold text-foreground">Server-Side Conversions API (CAPI)</h3>
                    <p className="text-xs text-foreground-muted mt-1">
                      Pixel: <span className="font-mono">{showSetup.name}</span>
                      <span className="ml-2 px-1.5 py-0.5 bg-surface-hover rounded text-[10px] font-mono">{showSetup.id}</span>
                    </p>
                  </div>
                  <button onClick={() => setShowSetup(null)} className="p-1 hover:bg-white/10 rounded-lg"><X className="w-4 h-4 text-foreground-muted" /></button>
                </div>

                <div className="space-y-4">
                  {/* Step 1: Integration Key */}
                  <div className="bg-background/50 border border-border rounded-xl p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-foreground-muted mb-3">Step 1 — Your Integration Key</p>
                    {!showSetup.capiKey ? (
                      <div className="flex items-center gap-2 text-xs text-foreground-muted"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating key…</div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 font-mono text-[11px] bg-surface-hover rounded-lg px-3 py-2 border border-border overflow-x-auto whitespace-nowrap">
                            {capiKeyVisible ? showSetup.capiKey : "•".repeat(Math.min(showSetup.capiKey.length, 52))}
                          </div>
                          <button onClick={() => setCapiKeyVisible(v => !v)} title={capiKeyVisible ? "Hide" : "Show"} className="p-2 rounded-lg hover:bg-surface-hover border border-border transition-colors">
                            <Eye className="w-3.5 h-3.5 text-foreground-muted" />
                          </button>
                          <button onClick={() => { if (showSetup.capiKey) navigator.clipboard.writeText(showSetup.capiKey); }} className="px-3 py-2 text-xs font-semibold bg-[#1877F2] hover:bg-blue-500 text-white rounded-lg transition-colors">
                            Copy
                          </button>
                        </div>
                        <p className="text-[10px] text-foreground-muted mt-2">Keep this secret. Use it as the <code className="bg-surface-hover px-1 rounded">Authorization: Bearer</code> token when sending events.</p>
                      </>
                    )}
                  </div>

                  {/* Step 2: Code Snippet */}
                  <div className="bg-background/50 border border-border rounded-xl p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-foreground-muted mb-3">Step 2 — Track Events from Your Server</p>
                    <div className="flex gap-1 mb-3">
                      {(["js", "node", "curl"] as const).map(tab => (
                        <button key={tab} onClick={() => setCapiSnipTab(tab)} className={`px-3 py-1 text-[11px] font-semibold rounded-lg transition-colors ${capiSnipTab === tab ? "bg-[#1877F2] text-white" : "bg-surface-hover text-foreground-muted hover:text-foreground"}`}>
                          {tab === "js" ? "JavaScript" : tab === "node" ? "Node.js" : "cURL"}
                        </button>
                      ))}
                    </div>
                    <pre className="bg-background border border-border rounded-xl text-[10px] font-mono text-success-text overflow-x-auto p-3 leading-relaxed whitespace-pre">
{capiSnipTab === "js" ? `const ORDER_ID = 'order_' + Date.now(); // use your real order/event ID

// 1. Fire browser pixel with deduplication ID
fbq('track', 'Purchase', { value: 99.99, currency: 'USD' }, { eventID: ORDER_ID });

// 2. Send to ZoikoVertex CAPI from your backend (not the browser!)
await fetch('https://api.zoikovertex.com/api/v1/campaigns/meta/pixels/${showSetup.id}/capi/events', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ${showSetup.capiKey || "YOUR_INTEGRATION_KEY"}'
  },
  body: JSON.stringify({ events: [{
    event_name: 'Purchase',
    event_id: ORDER_ID,
    event_source_url: 'https://yoursite.com/checkout',
    user_data: {
      email: 'customer@example.com',  // ZoikoVertex hashes PII automatically
      phone: '+1234567890',
      ip: '0.0.0.0',          // req.ip from your server
      user_agent: navigator.userAgent,
      fbp: document.cookie.match(/_fbp=([^;]+)/)?.[1],
      fbc: document.cookie.match(/_fbc=([^;]+)/)?.[1]
    },
    custom_data: { value: 99.99, currency: 'USD' }
  }]})
});`
: capiSnipTab === "node" ? `const PIXEL_ID   = '${showSetup.id}';
const CAPI_KEY   = '${showSetup.capiKey || "YOUR_INTEGRATION_KEY"}';
const API_BASE   = 'https://api.zoikovertex.com';

async function trackServerEvent(req, event) {
  const res = await fetch(
    \`\${API_BASE}/api/v1/campaigns/meta/pixels/\${PIXEL_ID}/capi/events\`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': \`Bearer \${CAPI_KEY}\`
      },
      body: JSON.stringify({ events: [{
        event_name:       event.name,
        event_id:         event.orderId,
        event_source_url: req.headers.referer,
        action_source:    'website',
        user_data: {
          email:      event.email,
          phone:      event.phone,
          ip:         req.ip,
          user_agent: req.headers['user-agent'],
          fbp:        req.cookies?._fbp,
          fbc:        req.cookies?._fbc
        },
        custom_data: event.customData
      }]})
    }
  );
  return res.json();
}

// Usage — in your order completion handler:
app.post('/checkout/complete', async (req, res) => {
  await trackServerEvent(req, {
    name: 'Purchase', orderId: req.body.order_id,
    email: req.body.email, phone: req.body.phone,
    customData: { value: req.body.total, currency: 'USD' }
  });
  res.json({ ok: true });
});`
: `curl -X POST \\
  'https://api.zoikovertex.com/api/v1/campaigns/meta/pixels/${showSetup.id}/capi/events' \\
  -H 'Content-Type: application/json' \\
  -H 'Authorization: Bearer ${showSetup.capiKey || "YOUR_INTEGRATION_KEY"}' \\
  -d '{
    "events": [{
      "event_name": "Purchase",
      "event_id": "order_12345",
      "event_source_url": "https://yoursite.com/checkout",
      "action_source": "website",
      "user_data": {
        "email": "customer@example.com",
        "phone": "+1234567890",
        "ip": "192.168.1.1",
        "user_agent": "Mozilla/5.0"
      },
      "custom_data": {
        "value": 99.99,
        "currency": "USD"
      }
    }]
  }'`}
                    </pre>
                    <div className="flex justify-end mt-2">
                      <button onClick={() => {
                        const snip = capiSnipTab === "js"
                          ? `const ORDER_ID = 'order_' + Date.now();\nfbq('track', 'Purchase', { value: 99.99, currency: 'USD' }, { eventID: ORDER_ID });`
                          : capiSnipTab === "node"
                          ? `const PIXEL_ID = '${showSetup.id}';\nconst CAPI_KEY = '${showSetup.capiKey || "YOUR_INTEGRATION_KEY"}';`
                          : `curl -X POST 'https://api.zoikovertex.com/api/v1/campaigns/meta/pixels/${showSetup.id}/capi/events'`;
                        navigator.clipboard.writeText(snip).then(() => {
                          setCapiSnipCopied(true);
                          setTimeout(() => setCapiSnipCopied(false), 2000);
                        });
                      }} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white hover:bg-zinc-100 text-zinc-900 rounded-lg transition-colors">
                        {capiSnipCopied ? <><CheckCircle2 className="w-3 h-3 text-green-600" />Copied!</> : "Copy Snippet"}
                      </button>
                    </div>
                  </div>

                  {/* Step 3: Deduplication */}
                  <div className="bg-background/50 border border-border rounded-xl p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-foreground-muted mb-2">Step 3 — Deduplicate with Browser Pixel</p>
                    <p className="text-xs text-foreground-muted mb-2">Pass the same <code className="bg-surface-hover px-1 rounded">event_id</code> to <em>both</em> the browser pixel and CAPI. Meta automatically deduplicates the pair so you don&apos;t count the same event twice.</p>
                    <pre className="bg-background border border-border rounded-xl text-[10px] font-mono text-amber-400 overflow-x-auto p-3 whitespace-pre">{`// In the browser, pass the same event_id you sent to CAPI:
fbq('track', 'Purchase', { value: 99.99, currency: 'USD' }, { eventID: ORDER_ID });`}</pre>
                  </div>

                  {/* Step 4: Test */}
                  <div className="bg-background/50 border border-border rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-foreground-muted">Step 4 — Verify Connection</p>
                      <a
                        href={`https://business.facebook.com/events_manager2/list/pixel/${showSetup.id}/test_events`}
                        target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[11px] text-[#1877F2] hover:underline">
                        Open Events Manager Test Events <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <p className="text-xs text-foreground-muted mb-3">
                      Get your <span className="font-semibold text-foreground">Test Event Code</span> from Events Manager → TestPixel → Test Events tab, paste it below, then click Send.
                    </p>
                    <div className="flex items-center gap-2 mb-3">
                      <input
                        type="text"
                        value={capiTestCode}
                        onChange={e => setCapiTestCode(e.target.value)}
                        placeholder="TEST12345 (from Events Manager)"
                        className="flex-1 bg-surface-hover border border-border rounded-lg px-3 py-2 text-xs font-mono text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-[#1877F2]/60"
                      />
                      <button
                        disabled={testingCapi}
                        onClick={async () => {
                          setTestingCapi(true);
                          setCapiTestResult(null);
                          try {
                            const r = await api.post(`/api/v1/campaigns/meta/pixels/${showSetup.id}/capi/test`, {
                              test_event_code: capiTestCode.trim() || undefined,
                            });
                            if (r?.success !== false) {
                              setCapiTestResult({ success: true, events_received: r?.data?.events_received ?? 1 });
                            } else {
                              setCapiTestResult({ success: false, error: r?.error || "Meta rejected the event" });
                            }
                          } catch {
                            setCapiTestResult({ success: false, error: "Request failed — check backend connection" });
                          } finally {
                            setTestingCapi(false);
                          }
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-[#1877F2] hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap">
                        {testingCapi && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        Send Test Event
                      </button>
                    </div>
                    {capiTestResult && (
                      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold ${capiTestResult.success ? "bg-success-text/10 text-success-text" : "bg-error-text/10 text-error-text"}`}>
                        {capiTestResult.success
                          ? <><CheckCircle2 className="w-3.5 h-3.5 shrink-0" />{capiTestResult.events_received} event received by Meta — check your Test Events tab to confirm</>
                          : <><AlertCircle className="w-3.5 h-3.5 shrink-0" />{capiTestResult.error}</>
                        }
                      </div>
                    )}
                    {!capiTestCode && (
                      <p className="text-[10px] text-foreground-muted mt-2">Leave the code blank to send directly to production data (no real-time preview in Events Manager).</p>
                    )}
                  </div>
                </div>
              </>
            ) : showSetup.view !== "CODE" ? (
              <>
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-bold text-foreground">Connect website activity using pixel</h3>
                  <button onClick={() => setShowSetup(null)} className="p-1 hover:bg-white/10 rounded-lg"><X className="w-5 h-5 text-foreground-muted" /></button>
                </div>
                <p className="text-sm text-foreground-muted mb-6">
                  Select the best method for adding the pixel code to your site based on how the website was built, what kind of access you have to the code and your technical support.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Option 1 */}
                  <div className="border border-border rounded-xl p-5 bg-background/50 hover:bg-white/[0.02] transition-colors flex flex-col">
                    <div className="w-10 h-10 rounded-lg bg-surface-hover border border-border flex items-center justify-center mb-4">
                      <Code className="w-5 h-5 text-foreground-muted" />
                    </div>
                    <h4 className="font-bold text-foreground mb-2">Manually add pixel code</h4>
                    <p className="text-sm text-foreground-muted mb-6 flex-1">
                      Follow guided installation instructions or email the code to your developer to paste into the website.
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
                      Check if your website is eligible for integration with a supported partner such as Shopify, WordPress, and more.
                    </p>
                    <div>
                      <a href={`https://business.facebook.com/events_manager2/list/pixel/${showSetup.id}/settings`} target="_blank" rel="noopener noreferrer"
                        className="inline-block px-5 py-2 bg-[#1877F2] hover:bg-blue-500 text-white text-sm font-semibold rounded-lg transition-colors">
                        Check for Partner
                      </a>
                    </div>
                  </div>

                  {/* Option 3 — CAPI */}
                  <div className="border border-[#1877F2]/30 rounded-xl p-5 bg-[#1877F2]/5 hover:bg-[#1877F2]/10 transition-colors flex flex-col">
                    <div className="w-10 h-10 rounded-lg bg-[#1877F2]/20 border border-[#1877F2]/30 flex items-center justify-center mb-4">
                      <Zap className="w-5 h-5 text-[#1877F2]" />
                    </div>
                    <h4 className="font-bold text-foreground mb-2">Server-Side Events (CAPI)</h4>
                    <p className="text-sm text-foreground-muted mb-6 flex-1">
                      Track events from your server — bypasses ad blockers and iOS privacy restrictions. Better attribution and match quality.
                    </p>
                    <div>
                      <button
                        onClick={async () => {
                          setShowSetup(s => s ? { ...s, view: "CAPI", capiKey: null } : s);
                          setCapiKeyVisible(false);
                          setCapiTestResult(null);
                          try {
                            const r = await api.get(`/api/v1/campaigns/meta/pixels/${showSetup.id}/capi/key`);
                            if (r?.data?.integration_key) {
                              setShowSetup(s => s ? { ...s, capiKey: r.data.integration_key } : s);
                            }
                          } catch { /* key stays null */ }
                        }}
                        className="px-5 py-2 bg-[#1877F2] hover:bg-blue-500 text-white text-sm font-semibold rounded-lg transition-colors">
                        Set Up CAPI
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center mt-6 pt-4 border-t border-border">
                  <a href={`mailto:?subject=Install Meta Pixel Code&body=Please install this Meta Pixel Base Code on our website:%0A%0A<!-- Meta Pixel Code -->%0A<script>%0A!function(f,b,e,v,n,t,s)%0A{if(f.fbq)return;n=f.fbq=function(){n.callMethod?%0An.callMethod.apply(n,arguments):n.queue.push(arguments)};%0Aif(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';%0An.queue=[];t=b.createElement(e);t.async=!0;%0At.src=v;s=b.getElementsByTagName(e)[0];%0As.parentNode.insertBefore(t,s)}(window, document,'script',%0A'https://connect.facebook.net/en_US/fbevents.js');%0Afbq('init', '${showSetup.id}');%0Afbq('track', 'PageView');%0A</script>%0A<noscript><img height="1" width="1" style="display:none"%0Asrc="https://www.facebook.com/tr?id=${showSetup.id}&ev=PageView&noscript=1"%0A/></noscript>%0A<!-- End Meta Pixel Code -->`} 
                     className="text-sm font-medium text-foreground hover:text-foreground transition-colors">
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
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <button onClick={() => setShowSetup({ ...showSetup, view: "OPTIONS" })} className="text-xs text-blue-400 hover:underline mb-1 inline-block">&larr; Back to options</button>
                    <h3 className="text-base font-bold text-foreground">Pixel Base Code</h3>
                    <p className="text-xs text-foreground-muted mt-1">
                      Pixel: <span className="font-mono text-foreground-muted">{showSetup.name}</span>
                      <span className="ml-2 px-1.5 py-0.5 bg-surface-hover rounded text-[10px] font-mono">{showSetup.id}</span>
                    </p>
                    <p className="text-sm text-foreground-muted mt-2">Paste this code just above the <code className="bg-white/10 px-1 py-0.5 rounded">&lt;/head&gt;</code> tag on your website.</p>
                  </div>
                  <button onClick={() => setShowSetup(null)} className="p-1 hover:bg-white/10 rounded-lg"><X className="w-4 h-4 text-foreground-muted" /></button>
                </div>
                {/* Code block — use real code from Meta if available */}
                <div className="relative">
                  <pre className="bg-background border border-border p-4 rounded-xl text-[10px] font-mono text-success-text overflow-x-auto whitespace-pre leading-relaxed">
{showSetup.code
  ? showSetup.code
  : `<!-- Meta Pixel Code -->
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
              {showSetup.code && (
                <div className="flex items-center gap-1.5 mt-1.5">
                  <CheckCircle2 className="w-3 h-3 text-success-text" />
                  <p className="text-[10px] text-success-text">Code retrieved live from Meta</p>
                </div>
              )}
            </div>
            <div className="flex justify-between items-center pt-3">
              <p className="text-[10px] text-foreground-muted">Add this to every page you want to track.</p>
              <button onClick={() => {
                const code = showSetup.code || (`<!-- Meta Pixel Code -->
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
<!-- End Meta Pixel Code -->`);
                navigator.clipboard.writeText(code).then(() => {
                  setCodeCopied(true);
                  setTimeout(() => setCodeCopied(false), 2500);
                });
              }} className="flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-zinc-100 text-zinc-900 text-sm font-semibold rounded-xl transition-colors">
                {codeCopied ? <><CheckCircle2 className="w-3.5 h-3.5 text-green-600" />Copied!</> : "Copy Code"}
              </button>
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
  const [deleteCampaignId, setDeleteCampaignId] = useState<string | null>(null);
  const [filterUnitId, setFilterUnitId] = useState("");
  const [businessUnits, setBusinessUnits] = useState<{ id: string; name: string }[]>([]);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const url = filterUnitId ? `/api/v1/campaigns?business_unit_id=${filterUnitId}` : "/api/v1/campaigns";
      const [c, s, a] = await Promise.allSettled([
        api.get(url),
        api.get("/api/v1/campaigns/stats"),
        api.get("/api/v1/campaigns/meta/accounts"),
      ]);
      if (c.status === "fulfilled") setCampaigns(Array.isArray(c.value.data) ? c.value.data : []);
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
  }, [filterUnitId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    api.get("/api/v1/units").then(r => setBusinessUnits(Array.isArray(r?.data) ? r.data : [])).catch(() => setBusinessUnits([]));
  }, []);

  const selAcc = accounts.find(a => a.id === selAccount);
  const hasAdAcc = selAcc?.has_ad_account;

  const rows   = tab === "drafts" ? campaigns.filter(c => c.status === "DRAFT") : campaigns;
  const drafts = campaigns.filter(c => c.status === "DRAFT");
  const [selectedDraft, setSelectedDraft] = React.useState<Campaign | null>(null);
  const [compareMode,   setCompareMode]   = useState(false);
  const [compareIds,    setCompareIds]    = useState<Set<string>>(new Set());

  const toggleCompare = (id: string) => {
    setCompareIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else if (next.size < 4) next.add(id);
      return next;
    });
  };

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

    if (r.success) {
      // Sync to server-returned status so UI never gets out of sync
      if (r.data?.status) {
        setCampaigns(prev => prev.map(x => x.id === c.id ? { ...x, status: r.data.status } : x));
      }
    } else {
      setError(r.error || `Failed to ${pausing ? "pause" : "resume"} campaign`);
      // Revert and reload to get real status from server
      setCampaigns(prev => prev.map(x => x.id === c.id ? { ...x, status: originalStatus } : x));
      load();
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
            {tab !== "pixels" && (
              <select value={filterUnitId} onChange={e => setFilterUnitId(e.target.value)}
                className="bg-surface border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none">
                <option value="">All units</option>
                {businessUnits.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            )}
            <button onClick={load} className="p-1.5 text-foreground-muted hover:text-foreground-muted transition-colors rounded-lg hover:bg-surface-hover">
              <RefreshCw className="w-4 h-4" />
            </button>
            {tab === "ad-campaigns" && (
              <button
                onClick={() => { setCompareMode(m => !m); setCompareIds(new Set()); }}
                className={`flex items-center gap-1.5 px-3 py-2 border text-xs font-semibold rounded-lg transition-colors ${
                  compareMode
                    ? "bg-[#1877F2] border-[#1877F2] text-white"
                    : "bg-surface border-border text-foreground-muted hover:text-foreground"
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                {compareMode ? "Exit compare" : "Compare"}
              </button>
            )}
            {canCreate && tab !== "pixels" && (
              <button onClick={() => setShowCreator(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-zinc-100 text-zinc-900 text-sm font-semibold rounded-lg transition-colors shadow-sm">
                <Plus className="w-4 h-4" />Create ad campaign
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 min-h-0 flex flex-col overflow-hidden px-6 pt-4 gap-3">

        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 text-error-text text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />{error}
            <button onClick={() => setError(null)}><X className="w-3.5 h-3.5" /></button>
          </div>
        )}

        {/* Pixel Connector */}
        {tab === "pixels" && (
          <div className="flex-1 overflow-y-auto pb-6">
            <PixelsPanel onUseInCampaign={(id, name) => {
              setCreatorPrefill({ pixel_id: id, pixel_name: name, objective: "CONVERSIONS" });
              setShowCreator(true);
              setTab("ad-campaigns");
            }} />
          </div>
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
          <div className="flex items-start gap-3 text-sm text-warning-text py-2">
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
                            selectedDraft?.id === c.id ? "border-warning-border/60 bg-warning-text/5" : "border-border hover:border-border bg-surface"
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
                                  className="px-3 py-1.5 text-xs font-semibold border border-border hover:border-border text-foreground-muted hover:text-foreground rounded-lg transition-colors">
                                  Edit
                                </button>
                                <button type="button"
                                  onClick={e => { e.stopPropagation(); deleteCampaign(c.id); setSelectedDraft(null); }}
                                  className="px-3 py-1.5 text-xs font-semibold border border-border hover:border-error-border/50 text-foreground-muted hover:text-error-text rounded-lg transition-colors">
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
                    className="flex-1 py-1.5 text-xs font-semibold border border-border hover:border-error-border/50 text-foreground-muted hover:text-error-text rounded-lg transition-colors">Delete</button>
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
                      {(() => { const u = (selectedDraft as any).creative?.landing_page_url || (selectedDraft as any).boost_settings?.landing_url || ""; try { return u ? new URL(u).hostname || "—" : "—"; } catch { return u || "—"; } })()}
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
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden pb-4">
          {loading ? (
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
            <div className="flex-1 min-h-0 overflow-x-auto overflow-y-auto">
              <table className="w-full text-sm" style={{ minWidth: compareMode ? 1640 : 1600 }}>
                <thead className="sticky top-0 z-10 bg-card">
                  <tr className="border-b border-border">
                    {compareMode && (
                      <th className="px-4 py-3 w-[44px] text-[10px] font-bold text-foreground-muted uppercase tracking-widest">
                        <span title="Select up to 4 campaigns to compare"><TrendingUp className="w-3 h-3" /></span>
                      </th>
                    )}
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
                      ["FREQ",          "w-[70px]  text-right"],
                      ["ROAS",          "w-[80px]  text-right"],
                      ["CPP",           "w-[80px]  text-right"],
                      ["REACH",         "w-[90px]  text-right"],
                      ["IMPRESSIONS",   "w-[110px] text-right"],
                      ["CLICKS",        "w-[80px]  text-right"],
                      ["",              "w-[120px] text-right"],
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
                        className={`hover:bg-surface/40 transition-colors group ${i < rows.length - 1 ? "border-b border-border/40" : ""} ${compareIds.has(c.id) ? "bg-[#1877F2]/5" : ""}`}>

                        {/* Compare checkbox */}
                        {compareMode && (
                          <td className="px-4 py-4 w-[44px]">
                            <input
                              type="checkbox"
                              checked={compareIds.has(c.id)}
                              onChange={() => toggleCompare(c.id)}
                              disabled={!compareIds.has(c.id) && compareIds.size >= 4}
                              className="w-4 h-4 accent-[#1877F2] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                            />
                          </td>
                        )}

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
                                <p className={`text-[10px] ${spendPct >= 90 ? "text-warning-text" : "text-foreground-muted"}`}>
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

                        {/* FREQ */}
                        <td className="px-4 py-4 w-[70px] text-right">
                          <p className="text-xs text-foreground-muted" title="Avg times one person saw this ad">
                            {c.frequency != null ? c.frequency.toFixed(2) : "--"}
                          </p>
                        </td>

                        {/* ROAS */}
                        <td className="px-4 py-4 w-[80px] text-right">
                          {c.roas != null
                            ? <p className="text-xs text-foreground font-medium">{c.roas.toFixed(2)}x</p>
                            : <p className="text-xs text-foreground-muted" title="Requires purchase conversion tracking">N/A</p>}
                        </td>

                        {/* CPP */}
                        <td className="px-4 py-4 w-[80px] text-right">
                          {c.cpp != null
                            ? <><p className="text-xs text-foreground font-medium">${c.cpp.toFixed(2)}</p><p className="text-[10px] text-foreground-muted">per purchase</p></>
                            : <p className="text-xs text-foreground-muted" title="Requires purchase conversion tracking">N/A</p>}
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

                        {/* Inline actions */}
                        <td className="px-2 py-4 w-[120px] text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Link href={`/campaigns/${c.id}`} title="Check details"
                              className="p-1.5 rounded-lg text-foreground-muted hover:text-foreground hover:bg-surface-hover transition-colors">
                              <Eye className="w-4 h-4" />
                            </Link>
                            {(() => {
                              const boost = c.campaign_boosts?.[0];
                              const fbUrl = boost?.meta_campaign_id
                                ? `https://www.facebook.com/adsmanager/manage/campaigns?act=${boost.ad_account_id ?? ''}&selected_campaign_ids=${boost.meta_campaign_id}`
                                : 'https://business.facebook.com/adsmanager/manage/campaigns';
                              return (
                                <a href={fbUrl} target="_blank" rel="noopener noreferrer" title="View on Facebook"
                                  className="p-1.5 rounded-lg text-foreground-muted hover:text-foreground hover:bg-surface-hover transition-colors">
                                  <ExternalLink className="w-4 h-4" />
                                </a>
                              );
                            })()}
                            <button onClick={e => { e.stopPropagation(); deleteCampaign(c.id); }} title="Delete campaign"
                              className="p-1.5 rounded-lg text-foreground-muted hover:text-error-text hover:bg-error-text/10 transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
          }

          {/* ── Comparison Panel ── */}
          {compareMode && compareIds.size >= 2 && (() => {
            const compared = campaigns.filter(c => compareIds.has(c.id));
            const metrics: Array<{ key: keyof Campaign; label: string; fmt: (v: unknown) => string }> = [
              { key: "impressions",    label: "Impressions",    fmt: v => v ? Number(v).toLocaleString() : "--" },
              { key: "reach",          label: "Reach",          fmt: v => v ? Number(v).toLocaleString() : "--" },
              { key: "clicks",         label: "Clicks",         fmt: v => v ? Number(v).toLocaleString() : "--" },
              { key: "ctr",            label: "CTR",            fmt: v => v ? `${Number(v).toFixed(2)}%` : "--" },
              { key: "cpc",            label: "CPC",            fmt: v => v ? `$${Number(v).toFixed(2)}` : "--" },
              { key: "cpm",            label: "CPM",            fmt: v => v ? `$${Number(v).toFixed(2)}` : "--" },
              { key: "spend_recorded", label: "Amount Spent",   fmt: v => v != null ? `$${Number(v).toFixed(2)}` : "--" },
              { key: "budget_total",   label: "Total Budget",   fmt: v => v ? `$${Number(v).toLocaleString()}` : "--" },
            ];
            return (
              <div className="shrink-0 border-t border-border bg-card pt-4 pb-2 mt-2">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-bold text-foreground-muted uppercase tracking-widest flex items-center gap-2">
                    <TrendingUp className="w-3.5 h-3.5" />
                    Comparing {compared.length} campaigns
                  </p>
                  <button
                    onClick={() => setCompareIds(new Set())}
                    className="text-[11px] text-foreground-muted hover:text-foreground underline"
                  >
                    Clear selection
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs" style={{ minWidth: compared.length * 220 + 160 }}>
                    <thead>
                      <tr className="border-b border-border/60">
                        <th className="px-4 py-2 text-left text-[10px] font-bold text-foreground-muted uppercase tracking-widest w-40">Metric</th>
                        {compared.map(c => (
                          <th key={c.id} className="px-4 py-2 text-right text-[10px] font-bold text-foreground-muted uppercase tracking-widest min-w-[160px]">
                            <span className="truncate block max-w-[200px] ml-auto" title={c.name}>{c.name}</span>
                            <span className="font-normal normal-case text-[10px]">{c.status.charAt(0) + c.status.slice(1).toLowerCase()}</span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {metrics.map(m => {
                        const vals = compared.map(c => c[m.key] as number | null | undefined);
                        const max = Math.max(...vals.map(v => (v != null ? Number(v) : 0)));
                        return (
                          <tr key={m.key} className="hover:bg-surface/30 transition-colors">
                            <td className="px-4 py-2 text-foreground-muted font-medium">{m.label}</td>
                            {compared.map((c) => {
                              const raw = c[m.key];
                              const num = raw != null ? Number(raw) : 0;
                              const isTop = max > 0 && num === max;
                              return (
                                <td key={c.id} className={`px-4 py-2 text-right font-semibold ${isTop ? "text-success-text" : "text-foreground-muted"}`}>
                                  {m.fmt(raw)}
                                  {isTop && vals.filter(v => (v != null ? Number(v) : 0) === max).length === 1 && (
                                    <span className="ml-1 text-[10px] font-bold text-success-text">↑</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}
          </div>
        )}
      </div>

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
