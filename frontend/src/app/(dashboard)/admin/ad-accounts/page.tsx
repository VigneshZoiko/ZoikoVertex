"use client";

import { useState, useEffect, useCallback } from "react";
import {
  CheckCircle2, AlertCircle, RefreshCw, Loader2,
  Shield, X, ChevronDown, ChevronUp, Star,
} from "lucide-react";
import { api } from "@/lib/api";

interface AdAccount {
  id: string;
  platform: string;
  account_name: string;
  account_handle?: string;
  ad_account_id?: string;
  ad_account_name?: string;
  agency_ad_account_id?: string;
  agency_page_id?: string;
  is_agency_default: boolean;
  status: string;
}

interface AdAccountsData {
  meta: AdAccount[];
}

const inp = "w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-white/30 transition-all";

export default function AdminAdAccountsPage() {
  const [data,    setData]    = useState<AdAccountsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState<string | null>(null);
  const [error,   setError]   = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [editingId,       setEditingId]       = useState<string | null>(null);
  const [editAdAccountId, setEditAdAccountId] = useState("");
  const [editPageId,      setEditPageId]      = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get("/api/v1/admin/ad-accounts");
      if (r.success) setData(r.data);
      else setError(r.error || "Failed to load");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSetDefault = async (account: AdAccount) => {
    setSaving(account.id); setError(null); setSuccess(null);
    try {
      const body: Record<string, string> = {};
      if (editingId === account.id) {
        if (editAdAccountId) body.agency_ad_account_id = editAdAccountId;
        if (editPageId)      body.agency_page_id       = editPageId;
      }
      const r = await api.post(`/api/v1/admin/ad-accounts/${account.id}/set-default`, body);
      if (r.success) {
        setSuccess(r.message || "Agency default updated");
        setEditingId(null);
        await load();
      } else {
        setError(r.error || "Failed to set default");
      }
    } finally { setSaving(null); }
  };

  const handleUnsetDefault = async (id: string) => {
    setSaving(id); setError(null);
    try {
      await api.delete(`/api/v1/admin/ad-accounts/${id}/unset-default`);
      await load();
    } finally { setSaving(null); }
  };

  const startEdit = (account: AdAccount) => {
    setEditingId(account.id);
    setEditAdAccountId(account.agency_ad_account_id || account.ad_account_id || "");
    setEditPageId(account.agency_page_id || "");
  };

  const labelCls = "block text-[11px] font-semibold text-zinc-500 uppercase tracking-widest mb-1.5";

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-zinc-600" />
    </div>
  );

  const renderAccountCard = (account: AdAccount) => {
    const isDefault    = account.is_agency_default;
    const isEditing    = editingId === account.id;
    const isSavingThis = saving === account.id;

    return (
      <div key={account.id}
        className={`p-5 rounded-2xl border transition-all ${
          isDefault ? "bg-emerald-500/5 border-emerald-500/30" : "bg-zinc-900/40 border-zinc-800"
        }`}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            {isDefault && <Star className="w-4 h-4 text-emerald-400 fill-emerald-400" />}
            <div>
              <p className="text-sm font-bold text-white">{account.account_name}</p>
              <p className="text-[11px] text-zinc-500">{account.account_handle || account.id}</p>
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase ${
              account.platform === "facebook"
                ? "bg-blue-600/10 text-blue-300 border border-blue-600/20"
                : "bg-pink-500/10 text-pink-400 border border-pink-500/20"
            }`}>
              {account.platform}
            </span>
            {isDefault && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                AGENCY DEFAULT
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isDefault && (
              <button onClick={() => handleUnsetDefault(account.id)} disabled={!!saving}
                className="text-xs text-zinc-500 hover:text-rose-400 transition-colors px-2 py-1 rounded-lg hover:bg-rose-500/10">
                Remove default
              </button>
            )}
            <button onClick={() => isEditing ? setEditingId(null) : startEdit(account)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl transition-all">
              {isEditing ? <><ChevronUp className="w-3 h-3" />Cancel</> : <><ChevronDown className="w-3 h-3" />Configure</>}
            </button>
            <button
              onClick={() => handleSetDefault(account)}
              disabled={!!saving || (isDefault && !isEditing)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition-all disabled:opacity-40 ${
                isDefault && !isEditing
                  ? "bg-emerald-500/10 text-emerald-400 cursor-default"
                  : "bg-white hover:bg-zinc-100 text-zinc-900"
              }`}>
              {isSavingThis ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              {isDefault && !isEditing ? "Active Default" : "Set as Default"}
            </button>
          </div>
        </div>

        {!isEditing && (
          <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-zinc-500">
            <span>Ad Account: <span className="text-zinc-300">{account.agency_ad_account_id || account.ad_account_id || "Not set"}</span></span>
            <span>Page ID: <span className="text-zinc-300">{account.agency_page_id || "Not set"}</span></span>
          </div>
        )}

        {isEditing && (
          <div className="mt-4 pt-4 border-t border-zinc-800 space-y-3">
            <div>
              <label className={labelCls}>Meta Ad Account ID <span className="normal-case text-zinc-600 font-normal">(act_xxx format)</span></label>
              <input value={editAdAccountId} onChange={e => setEditAdAccountId(e.target.value)}
                className={inp} placeholder="act_123456789" />
              <p className="text-[11px] text-zinc-600 mt-1">Find in Meta Business Manager → Ad Accounts</p>
            </div>
            <div>
              <label className={labelCls}>Facebook Page ID <span className="normal-case text-zinc-600 font-normal">(for ad creatives)</span></label>
              <input value={editPageId} onChange={e => setEditPageId(e.target.value)}
                className={inp} placeholder="123456789012345" />
              <p className="text-[11px] text-zinc-600 mt-1">Find in Meta Business Suite → Pages → About</p>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Agency Ad Accounts</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Set a Meta account as the agency default. All client campaigns will run through this account.
          </p>
        </div>
        <button onClick={load} className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-500 hover:text-zinc-300 transition-all">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-start gap-3 p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl">
        <Shield className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
        <div className="text-xs text-blue-300 space-y-1">
          <p className="font-semibold">Agency Model — Clients Never See This</p>
          <p className="text-blue-400">The account you set here is used automatically when any client creates a boost. Clients only see campaign options — no ad account selection, no platform credentials.</p>
          <p className="text-blue-400">Make sure your agency Meta Business Manager has the ad account funded before running campaigns.</p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />{error}
          <button onClick={() => setError(null)} className="ml-auto"><X className="w-3 h-3" /></button>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />{success}
          <button onClick={() => setSuccess(null)} className="ml-auto"><X className="w-3 h-3" /></button>
        </div>
      )}

      <div className="space-y-3">
        <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Meta (Facebook & Instagram)</h2>
        {data?.meta && data.meta.length > 0 ? (
          data.meta.map(a => renderAccountCard(a))
        ) : (
          <div className="p-8 bg-zinc-900/40 border border-zinc-800 rounded-2xl text-center">
            <p className="text-zinc-500 text-sm">No Meta accounts connected.</p>
            <p className="text-zinc-600 text-xs mt-1">Go to <strong className="text-zinc-400">Platform Accounts</strong> and connect a Facebook account first.</p>
          </div>
        )}
      </div>
    </div>
  );
}
