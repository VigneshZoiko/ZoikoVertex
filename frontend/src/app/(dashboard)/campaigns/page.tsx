"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Plus, Loader2, AlertCircle, RefreshCw, MoreHorizontal,
  Eye, Edit3, Trash2, ExternalLink, Zap, ChevronDown,
  TrendingUp, Link2, Check, X, Settings, ImageIcon,
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
        className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border border-zinc-700 hover:border-zinc-600 rounded-lg text-sm transition-colors">
        {selected ? (
          <><div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" /><span className="text-zinc-200 font-medium">{selected.account_name}</span></>
        ) : (
          <span className="text-zinc-500">Select account</span>
        )}
        <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 w-88 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden" style={{ width: 340 }}>
          <p className="px-4 py-2.5 text-[10px] font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-800">
            Connected Meta accounts
          </p>

          {accounts.length === 0 ? (
            <div className="px-4 py-6 text-center space-y-2">
              <p className="text-sm text-zinc-500">No Facebook accounts connected.</p>
              <a href="/accounts" className="text-xs text-indigo-400 hover:text-indigo-300 underline">Connect an account →</a>
            </div>
          ) : accounts.map(a => {
            const isSelected  = selectedId === a.id;
            const showSettings = settingsFor === a.id;

            return (
              <div key={a.id} className={`border-b border-zinc-800/50 last:border-0 ${isSelected ? "bg-[#1877F2]/5" : ""}`}>

                {/* Main account row */}
                <div className="flex items-center gap-2.5 px-4 py-3">
                  <div className="w-8 h-8 rounded-full bg-[#1877F2]/20 border border-[#1877F2]/20 flex items-center justify-center text-[#1877F2] text-xs font-bold shrink-0">
                    {a.account_name?.charAt(0)?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{a.account_name}</p>
                    <p className="text-[10px] text-zinc-500">@{a.account_handle}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                    {/* Settings gear button */}
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); setSettingsFor(showSettings ? null : a.id); setConfirmRm(null); setAdAccounts([]); setLinkingFor(null); }}
                      className={`p-1.5 rounded-lg transition-colors ${showSettings ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"}`}
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
                  <div className="mx-3 mb-3 bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                    {/* Account details */}
                    <div className="px-4 py-3 space-y-2 border-b border-zinc-800">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Account details</p>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
                        <span className="text-zinc-500">Name</span>
                        <span className="text-zinc-200 truncate">{a.account_name}</span>
                        <span className="text-zinc-500">Handle</span>
                        <span className="text-zinc-200">@{a.account_handle}</span>
                        <span className="text-zinc-500">Platform</span>
                        <span className="text-zinc-200 capitalize">{a.platform}</span>
                        <span className="text-zinc-500">Ad Account</span>
                        <span className={a.has_ad_account ? "text-emerald-400" : "text-zinc-500"}>
                          {a.ad_account_id || "Not linked"}
                        </span>
                        <span className="text-zinc-500">Token</span>
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
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors text-left disabled:opacity-50">
                        {loadingAd && linkingFor === a.id
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-500" />
                          : <Link2 className="w-3.5 h-3.5 text-zinc-500" />}
                        {a.has_ad_account ? "Change ad account" : "Link ad account"}
                      </button>

                      {/* Ad account picker — inside settings panel */}
                      {linkingFor === a.id && adAccounts.length > 0 && (
                        <div className="mx-0 mt-1 border border-zinc-700 rounded-xl overflow-hidden divide-y divide-zinc-800/60">
                          <p className="px-3 py-1.5 text-[9px] font-bold text-zinc-500 uppercase tracking-widest bg-zinc-950">
                            Select ad account
                          </p>
                          {adAccounts.map(ad => (
                            <button key={ad.id} type="button"
                              onClick={() => linkAd(ad.id, ad.name)}
                              className="w-full flex items-center justify-between px-3 py-2.5 text-left bg-zinc-900 hover:bg-zinc-800 transition-colors">
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-white truncate">{ad.name}</p>
                                <p className="text-[10px] text-zinc-500">{ad.id} · {ad.currency}</p>
                              </div>
                              <span className="text-[10px] text-zinc-400 shrink-0 ml-2">${ad.amount_spent}</span>
                            </button>
                          ))}
                          <button type="button"
                            onClick={() => { setLinkingFor(null); setAdAccounts([]); }}
                            className="w-full px-3 py-2 text-[11px] text-zinc-500 hover:text-zinc-300 text-left transition-colors">
                            Cancel
                          </button>
                        </div>
                      )}
                      {adErr && linkingFor === a.id && (
                        <p className="text-[11px] text-rose-400 px-3 pb-2">{adErr}</p>
                      )}

                      <a href="/accounts" target="_blank"
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors">
                        <Settings className="w-3.5 h-3.5 text-zinc-500" />
                        Manage in Platform Accounts
                      </a>

                      {/* Remove / confirm remove */}
                      {confirmRm === a.id ? (
                        <div className="flex items-center gap-2 px-3 py-2">
                          <span className="text-[11px] text-zinc-400 flex-1">Remove this account?</span>
                          <button type="button"
                            onClick={() => removeAccount(a.id)}
                            disabled={removing === a.id}
                            className="px-2.5 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 text-[11px] font-semibold rounded-lg transition-colors">
                            {removing === a.id ? "Removing…" : "Yes, remove"}
                          </button>
                          <button type="button" onClick={() => setConfirmRm(null)}
                            className="px-2.5 py-1 bg-zinc-800 text-zinc-400 text-[11px] rounded-lg transition-colors">
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

          <a href="/accounts" className="flex items-center gap-2 px-4 py-2.5 text-xs text-zinc-600 hover:text-zinc-400 transition-colors border-t border-zinc-800/50">
            <Settings className="w-3 h-3" /> Manage accounts
          </a>
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
    const going = c.status === "ACTIVE";
    try {
      await api.post(`/api/v1/campaigns/${c.id}/${going ? "pause" : "resume"}`, {});
      setCampaigns(prev => prev.map(x => x.id === c.id ? { ...x, status: going ? "PAUSING" : "ACTIVE" } : x));
    } catch { /* silent */ }
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
    <div className="h-full bg-zinc-950 flex overflow-hidden">

      {/* Sub-sidebar */}
      <aside className={`shrink-0 border-r border-zinc-800/60 flex flex-col transition-all duration-200 ${sidebarOpen ? "w-48" : "w-10"}`}>
        {/* Toggle button row */}
        <div className={`flex items-center h-12 border-b border-zinc-800/60 px-2 ${sidebarOpen ? "justify-between" : "justify-center"}`}>
          {sidebarOpen && <span className="text-sm font-bold text-white pl-1">Advertise</span>}
          <button
            onClick={() => setSidebarOpen(o => !o)}
            className="p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-md transition-colors"
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
                <p className="px-3 mb-1 text-[9px] font-bold text-zinc-600 uppercase tracking-widest">{section}</p>
                {items.map(({ id, label }) => (
                  <button key={id} onClick={() => setTab(id)}
                    className={`w-full text-left flex items-center px-3 py-1.5 text-xs transition-colors ${
                      tab === id
                        ? "bg-white/5 text-white border-r-2 border-white font-semibold"
                        : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
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
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-zinc-800/60 bg-zinc-950">
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
            <h3 className="text-sm font-bold text-white">
              {tab === "drafts" ? "Drafts" : tab === "pixels" ? "Meta Pixels" : "All ad campaigns"}
            </h3>
          </div>
          <div className="flex items-center gap-2.5">
            {tab !== "pixels" && (
              <AccountSelector accounts={accounts} selectedId={selAccount} onSelect={id => { setSelAccount(id); load(); }} onReload={load} />
            )}
            <button onClick={load} className="p-1.5 text-zinc-600 hover:text-zinc-300 transition-colors rounded-lg hover:bg-zinc-800">
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
          <div className="py-16 text-center">
            <Zap className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
            <p className="text-white font-bold text-lg mb-2">Meta Pixels</p>
            <p className="text-zinc-500 text-sm mb-1 max-w-sm mx-auto">
              Connect your Meta Pixel to track conversions and optimize ad targeting with real website data.
            </p>
            <p className="text-zinc-600 text-xs mb-6">Your Pixel must be linked to the same Business Manager as your ad account.</p>
            <button className="px-5 py-2.5 bg-white hover:bg-zinc-100 text-zinc-900 text-sm font-semibold rounded-lg transition-colors">
              Connect Pixel
            </button>
          </div>
        )}

        {/* No Facebook account connected */}
        {tab !== "pixels" && accounts.length === 0 && !loading && (
          <div className="py-16 text-center">
            <ImageIcon className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
            <p className="text-white font-bold text-lg mb-2">Connect your Meta account</p>
            <p className="text-zinc-500 text-sm mb-6 max-w-sm mx-auto">
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
                      <span className="text-sm font-bold text-zinc-300 underline">{drafts.length}</span>
                    </button>
                  </div>

                  {/* 90-day notice */}
                  <p className="text-xs text-zinc-500 mb-4">
                    Ad campaigns will be <span className="font-semibold text-zinc-300">permanently deleted</span> from your drafts after 90 days.
                  </p>

                  {drafts.length === 0 ? (
                    <div className="py-20 text-center">
                      <p className="text-zinc-400 font-semibold mb-1">No drafts</p>
                      <p className="text-zinc-600 text-sm">Start creating a campaign to see it here.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {drafts.map(c => (
                        <div key={c.id}
                          onClick={() => setSelectedDraft(selectedDraft?.id === c.id ? null : c)}
                          className={`flex items-stretch border rounded-xl overflow-hidden cursor-pointer transition-colors ${
                            selectedDraft?.id === c.id ? "border-amber-500/60 bg-amber-500/5" : "border-zinc-800 hover:border-zinc-700 bg-zinc-900/30"
                          }`}>
                          {/* No media box */}
                          <div className="w-24 shrink-0 bg-zinc-800/60 flex items-center justify-center text-zinc-600 text-xs">
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
                                  <p className="text-sm font-bold text-white">{c.name}</p>
                                </div>
                                <p className="text-xs text-zinc-500">
                                  {c.objective?.charAt(0) + c.objective?.slice(1).toLowerCase().replace(/_/g," ")} · No ads · {c.budget_total ? `$${c.budget_total} daily budget` : "No budget set"}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <button type="button"
                                  onClick={e => { e.stopPropagation(); setEditCampaignId(c.id); setShowCreator(true); }}
                                  className="px-3 py-1.5 text-xs font-semibold border border-zinc-700 hover:border-zinc-500 text-zinc-300 hover:text-white rounded-lg transition-colors">
                                  Edit
                                </button>
                                <button type="button"
                                  onClick={e => { e.stopPropagation(); deleteCampaign(c.id); setSelectedDraft(null); }}
                                  className="px-3 py-1.5 text-xs font-semibold border border-zinc-700 hover:border-rose-500/50 text-zinc-400 hover:text-rose-400 rounded-lg transition-colors">
                                  Delete
                                </button>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 mt-2">
                              <span className="text-[10px] px-2 py-0.5 bg-zinc-800 text-zinc-400 border border-zinc-700 rounded font-semibold">Ad draft</span>
                              <p className="text-[11px] text-zinc-600">
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
              <div className="w-72 shrink-0 border-l border-zinc-800 flex flex-col overflow-y-auto ml-4 pl-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-sm font-bold text-white">{selectedDraft.name}</p>
                    <p className="text-[11px] text-zinc-500 mt-0.5">Created by you</p>
                  </div>
                  <button type="button" onClick={() => setSelectedDraft(null)} className="text-zinc-500 hover:text-zinc-300 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex gap-2 mb-4">
                  <button type="button"
                    onClick={() => { setEditCampaignId(selectedDraft.id); setShowCreator(true); }}
                    className="flex-1 py-1.5 text-xs font-semibold border border-zinc-700 hover:border-zinc-500 text-zinc-300 rounded-lg transition-colors">Edit</button>
                  <button type="button" onClick={() => deleteCampaign(selectedDraft.id)}
                    className="flex-1 py-1.5 text-xs font-semibold border border-zinc-700 hover:border-rose-500/50 text-zinc-300 hover:text-rose-400 rounded-lg transition-colors">Delete</button>
                </div>

                {/* Mini ad preview */}
                <div className="bg-white rounded-xl overflow-hidden shadow-sm mb-4">
                  <div className="flex items-center justify-between px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-zinc-300 flex items-center justify-center text-[10px] font-bold text-zinc-700">
                        {accounts[0]?.account_name?.charAt(0) || "P"}
                      </div>
                      <div>
                        <p className="text-[11px] font-bold text-zinc-900">{accounts[0]?.account_name || "Your Page"}</p>
                        <p className="text-[9px] text-zinc-500">Sponsored · 🌐</p>
                      </div>
                    </div>
                    <span className="text-zinc-400 text-sm">···</span>
                  </div>
                  <div className="w-full h-16 bg-zinc-100 flex items-center justify-center">
                    <p className="text-[10px] text-zinc-400">No media</p>
                  </div>
                  <div className="px-3 py-2 flex items-center justify-between">
                    <p className="text-[10px] text-zinc-500 uppercase">EXAMPLE.COM</p>
                    <button className="text-[10px] font-bold text-zinc-800 border border-zinc-300 px-2 py-0.5 rounded">APPLY NOW</button>
                  </div>
                  <div className="flex items-center gap-3 px-3 py-2 border-t border-zinc-100 text-[11px] text-zinc-500">
                    <span>👍 Like</span><span>💬 Comment</span><span>↗ Share</span>
                  </div>
                </div>

                {/* Campaign details */}
                <div className="space-y-3">
                  {[
                    { label: "Ad account", value: accounts[0]?.account_name || "—" },
                    { label: "Objective",  value: selectedDraft.objective?.charAt(0) + selectedDraft.objective?.slice(1).toLowerCase().replace(/_/g," ") },
                    { label: "Audience",   value: "Build your own audience" },
                    { label: "Budget",     value: selectedDraft.budget_total ? `$${selectedDraft.budget_total} daily budget` : "Not set" },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p className="text-xs font-bold text-zinc-300">{label}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">{value}</p>
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
              <p className="text-zinc-600 text-sm">Loading campaigns...</p>
            </div>
          ) : rows.length === 0 ? (
            <div className="py-24 flex flex-col items-center text-center">
              <TrendingUp className="w-10 h-10 text-zinc-700 mb-4" />
              <p className="text-zinc-300 font-semibold mb-1">No campaigns yet</p>
              <p className="text-zinc-500 text-sm mb-5">Create your first campaign to start running ads.</p>
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
                  <tr className="border-b border-zinc-800">
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
                      <th key={h} className={`px-4 py-3 text-[10px] font-bold text-zinc-600 uppercase tracking-widest whitespace-nowrap ${cls}`}>
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
                        className={`hover:bg-zinc-900/40 transition-colors group ${i < rows.length - 1 ? "border-b border-zinc-800/40" : ""}`}>

                        {/* Campaign Name */}
                        <td className="px-4 py-4 min-w-[220px]">
                          <Link href={`/campaigns/${c.id}`}
                            className="font-semibold text-white hover:text-blue-400 transition-colors line-clamp-1 text-sm">
                            {c.name}
                          </Link>
                          <p className="text-[11px] text-zinc-500 mt-0.5 capitalize">
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
                                isOn(c.status) ? "bg-zinc-500" : "bg-zinc-800"
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
                              isOn(c.status)        ? "text-white" :
                              c.status === "PAUSED" ? "text-zinc-400" :
                              c.status === "DRAFT"  ? "text-zinc-500" :
                                                      "text-zinc-400"
                            }`}>
                              {c.status === "PAUSING"   ? "Pausing..." :
                               c.status === "SCHEDULED" ? "Scheduled" :
                               c.status.charAt(0) + c.status.slice(1).toLowerCase().replace(/_/g, " ")}
                            </span>
                          </div>
                          {c.status === "COMPLETED" && (
                            <p className="text-[10px] text-zinc-500 mt-1 ml-0">Completed</p>
                          )}
                        </td>

                        {/* Dates */}
                        <td className="px-4 py-4 w-[140px]">
                          <p className="text-xs text-zinc-300">{c.start_at ? new Date(c.start_at).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}) : "--"}</p>
                          {c.start_at && <p className="text-[10px] text-zinc-600">{new Date(c.start_at).toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit",timeZoneName:"short"})}</p>}
                        </td>
                        <td className="px-4 py-4 w-[140px]">
                          <p className="text-xs text-zinc-300">{c.end_at ? new Date(c.end_at).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}) : "--"}</p>
                          {c.end_at && <p className="text-[10px] text-zinc-600">{new Date(c.end_at).toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit",timeZoneName:"short"})}</p>}
                        </td>

                        {/* Main result */}
                        <td className="px-4 py-4 w-[110px] text-right">
                          {c.impressions ? (
                            <><p className="text-sm font-semibold text-white">{c.impressions.toLocaleString()}</p>
                            <p className="text-[10px] text-zinc-500">Impressions</p></>
                          ) : <p className="text-zinc-600 text-xs">--</p>}
                        </td>

                        {/* Cost per result */}
                        <td className="px-4 py-4 w-[110px] text-right">
                          {costPerResult ? (
                            <><p className="text-sm text-white">${costPerResult}</p>
                            <p className="text-[10px] text-zinc-500">per result</p></>
                          ) : <p className="text-zinc-600 text-xs">--</p>}
                        </td>

                        {/* Budget */}
                        <td className="px-4 py-4 w-[100px] text-right">
                          {c.budget_total ? (
                            <><p className="text-sm text-white">${c.budget_total.toLocaleString()}</p>
                            <p className="text-[10px] text-zinc-500">{c.budget_currency || "USD"}</p></>
                          ) : <p className="text-zinc-600 text-xs">--</p>}
                        </td>

                        {/* Amount spent */}
                        <td className="px-4 py-4 w-[120px] text-right">
                          {c.spend_recorded != null && c.spend_recorded > 0 ? (
                            <>
                              <p className="text-sm text-white">${c.spend_recorded.toLocaleString()}</p>
                              {spendPct != null && (
                                <p className={`text-[10px] ${spendPct >= 90 ? "text-amber-400" : "text-zinc-500"}`}>
                                  {spendPct}% of budget
                                </p>
                              )}
                            </>
                          ) : <p className="text-zinc-600 text-xs">--</p>}
                        </td>

                        {/* CPM */}
                        <td className="px-4 py-4 w-[80px] text-right">
                          <p className="text-xs text-zinc-400">{c.cpm ? `$${c.cpm.toFixed(2)}` : "--"}</p>
                        </td>

                        {/* CPC */}
                        <td className="px-4 py-4 w-[80px] text-right">
                          <p className="text-xs text-zinc-400">{c.cpc ? `$${c.cpc.toFixed(2)}` : "--"}</p>
                        </td>

                        {/* CTR */}
                        <td className="px-4 py-4 w-[70px] text-right">
                          <p className="text-xs text-zinc-400">{c.ctr ? `${c.ctr.toFixed(2)}%` : "--"}</p>
                        </td>

                        {/* ROAS */}
                        <td className="px-4 py-4 w-[70px] text-right">
                          <p className="text-xs text-zinc-600" title="Requires Meta Insights API sync">--</p>
                        </td>

                        {/* Reach */}
                        <td className="px-4 py-4 w-[90px] text-right">
                          <p className="text-xs text-zinc-400">{c.reach ? c.reach.toLocaleString() : "--"}</p>
                        </td>

                        {/* Impressions */}
                        <td className="px-4 py-4 w-[110px] text-right">
                          <p className="text-xs text-zinc-400">{c.impressions ? c.impressions.toLocaleString() : "--"}</p>
                        </td>

                        {/* Clicks */}
                        <td className="px-4 py-4 w-[80px] text-right">
                          <p className="text-xs text-zinc-400">{c.clicks ? c.clicks.toLocaleString() : "--"}</p>
                        </td>

                        {/* Three-dot menu */}
                        <td className="px-4 py-4 w-[44px] text-right">
                          <div className="relative">
                            <button onClick={e => { e.stopPropagation(); setMenu(menu === c.id ? null : c.id); }}
                              className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 transition-colors opacity-0 group-hover:opacity-100">
                              <MoreHorizontal className="w-4 h-4" />
                            </button>
                            {menu === c.id && (
                              <div className="absolute right-0 top-8 z-30 w-52 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden">
                                <Link href={`/campaigns/${c.id}`}
                                  className="flex items-center gap-2.5 px-4 py-3 text-sm text-zinc-300 hover:bg-zinc-900">
                                  <Eye className="w-3.5 h-3.5 text-zinc-500" />Check details and ads
                                </Link>
                                {["DRAFT","CHANGES_REQUESTED"].includes(c.status) && (
                                  <Link href={`/campaigns/new?edit=${c.id}&step=${c.wizard_step ?? 1}`}
                                    className="flex items-center gap-2.5 px-4 py-3 text-sm text-zinc-300 hover:bg-zinc-900">
                                    <Edit3 className="w-3.5 h-3.5 text-zinc-500" />Edit campaign
                                  </Link>
                                )}
                                <button onClick={() => { deleteCampaign(c.id); setMenu(null); }}
                                  className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-rose-400 hover:bg-zinc-900">
                                  <Trash2 className="w-3.5 h-3.5" />Delete campaign
                                </button>
                                <div className="border-t border-zinc-800" />
                                <div className="flex items-start gap-2.5 px-4 py-3">
                                  <ExternalLink className="w-3.5 h-3.5 text-zinc-600 mt-0.5 shrink-0" />
                                  <div>
                                    <p className="text-sm text-zinc-500">View on Facebook</p>
                                    <p className="text-[10px] text-zinc-600 mt-0.5">You&apos;ll need access to the ad account.</p>
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
        onClose={() => { setShowCreator(false); setEditCampaignId(null); }}
        onCreated={() => { setShowCreator(false); setEditCampaignId(null); load(); }}
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
