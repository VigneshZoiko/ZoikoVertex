"use client";

import { useState, useEffect, useCallback } from "react";
import {
  FolderKanban, Plus, Loader2, AlertCircle, RefreshCw,
  MoreHorizontal, Pencil, Trash2, CheckCircle2, X,
  Target, Calendar, DollarSign, Layers, TrendingUp, ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";

interface Campaign {
  id: string;
  name: string;
  description?: string;
  campaign_type: string;
  status: string;
  objective: string;
  platforms: string[];
  budget_total?: number | null;
  start_at?: string | null;
  end_at?: string | null;
  kpi_reach?: number | null;
  kpi_engagement?: number | null;
  kpi_conversions?: number | null;
  project_count: number;
  created_at: string;
}

interface FormState {
  name: string; description: string; campaign_type: string; objective: string;
  platforms: string[]; budget_total: string; start_at: string; end_at: string;
  kpi_reach: string; kpi_engagement: string; kpi_conversions: string;
}

const DEFAULT_FORM: FormState = {
  name: "", description: "", campaign_type: "ORGANIC", objective: "",
  platforms: [], budget_total: "", start_at: "", end_at: "",
  kpi_reach: "", kpi_engagement: "", kpi_conversions: "",
};

const PLATFORM_LIST = ["Instagram", "Facebook", "LinkedIn", "Twitter", "Threads", "YouTube", "Pinterest"];
const TYPE_OPTIONS  = ["ORGANIC", "PAID_ADS", "EMAIL", "MIXED"];
const TABS          = ["ALL", "ACTIVE", "DRAFT", "PAUSED", "COMPLETED", "CANCELLED"];

const STATUS_STYLES: Record<string, string> = {
  DRAFT:     "text-zinc-400 bg-zinc-400/10 border-zinc-400/20",
  ACTIVE:    "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  PAUSED:    "text-amber-400 bg-amber-400/10 border-amber-400/20",
  COMPLETED: "text-indigo-400 bg-indigo-400/10 border-indigo-400/20",
  CANCELLED: "text-rose-400 bg-rose-400/10 border-rose-400/20",
};

const STATUS_BORDER: Record<string, string> = {
  DRAFT:     "border-l-zinc-700",
  ACTIVE:    "border-l-emerald-500",
  PAUSED:    "border-l-amber-500",
  COMPLETED: "border-l-indigo-500",
  CANCELLED: "border-l-rose-500",
};

const TYPE_STYLES: Record<string, string> = {
  ORGANIC:  "text-emerald-400 bg-emerald-400/10",
  PAID_ADS: "text-amber-400 bg-amber-400/10",
  EMAIL:    "text-blue-400 bg-blue-400/10",
  MIXED:    "text-purple-400 bg-purple-400/10",
};

const PLATFORM_COLORS: Record<string, string> = {
  Instagram: "bg-pink-500/10 text-pink-400 border border-pink-500/20",
  Facebook:  "bg-blue-600/10 text-blue-400 border border-blue-500/20",
  LinkedIn:  "bg-sky-500/10 text-sky-400 border border-sky-500/20",
  Twitter:   "bg-sky-400/10 text-sky-300 border border-sky-400/20",
  Threads:   "bg-zinc-500/10 text-zinc-400 border border-zinc-500/20",
  YouTube:   "bg-red-500/10 text-red-400 border border-red-500/20",
  Pinterest: "bg-rose-500/10 text-rose-400 border border-rose-500/20",
};

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading]     = useState(true);
  const [filter, setFilter]       = useState("ALL");
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem]   = useState<Campaign | null>(null);
  const [form, setForm]           = useState<FormState>(DEFAULT_FORM);
  const [saving, setSaving]       = useState(false);
  const [deleting, setDeleting]   = useState<string | null>(null);
  const [menuOpen, setMenuOpen]   = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [error, setError]         = useState<string | null>(null);
  const [saveOk, setSaveOk]       = useState(false);
  const [saveMsg, setSaveMsg]     = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const params = filter !== "ALL" ? `?status=${filter}` : "";
      const res = await api.get(`/api/v1/campaigns${params}`);
      setCampaigns(res.data || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load campaigns");
    } finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditItem(null); setForm(DEFAULT_FORM); setShowModal(true); };
  const openEdit = (c: Campaign) => {
    setEditItem(c);
    setForm({
      name: c.name, description: c.description || "",
      campaign_type: c.campaign_type, objective: c.objective,
      platforms: c.platforms || [], budget_total: c.budget_total?.toString() || "",
      start_at: c.start_at ? c.start_at.split("T")[0] : "",
      end_at:   c.end_at   ? c.end_at.split("T")[0]   : "",
      kpi_reach: c.kpi_reach?.toString() || "",
      kpi_engagement: c.kpi_engagement?.toString() || "",
      kpi_conversions: c.kpi_conversions?.toString() || "",
    });
    setShowModal(true); setMenuOpen(null);
  };

  const togglePlatform = (p: string) =>
    setForm(f => ({ ...f, platforms: f.platforms.includes(p) ? f.platforms.filter(x => x !== p) : [...f.platforms, p] }));

  const handleSave = async () => {
    if (!form.name.trim() || !form.objective.trim()) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(), description: form.description.trim() || undefined,
        campaign_type: form.campaign_type, objective: form.objective.trim(),
        platforms: form.platforms,
        budget_total:    form.budget_total    ? parseFloat(form.budget_total)    : null,
        start_at: form.start_at || null, end_at: form.end_at || null,
        kpi_reach:       form.kpi_reach       ? parseInt(form.kpi_reach)       : null,
        kpi_engagement:  form.kpi_engagement  ? parseInt(form.kpi_engagement)  : null,
        kpi_conversions: form.kpi_conversions ? parseInt(form.kpi_conversions) : null,
      };
      if (editItem) await api.patch(`/api/v1/campaigns/${editItem.id}`, payload);
      else          await api.post("/api/v1/campaigns", payload);
      setSaveMsg(editItem ? "Campaign updated" : "Campaign created");
      setSaveOk(true); setTimeout(() => setSaveOk(false), 3000);
      setShowModal(false); load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    setDeleting(id); setMenuOpen(null); setConfirmDelete(null);
    try {
      await api.delete(`/api/v1/campaigns/${id}`);
      setCampaigns(prev => prev.filter(c => c.id !== id));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally { setDeleting(null); }
  };

  const stats = {
    total:     campaigns.length,
    active:    campaigns.filter(c => c.status === "ACTIVE").length,
    draft:     campaigns.filter(c => c.status === "DRAFT").length,
    completed: campaigns.filter(c => c.status === "COMPLETED").length,
  };
  const filtered = filter === "ALL" ? campaigns : campaigns.filter(c => c.status === filter);

  const inputCls = "w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all";
  const labelCls = "block text-[11px] font-semibold text-zinc-500 uppercase tracking-widest mb-1.5";

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">

      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-indigo-500/10 rounded-xl border border-indigo-500/10">
              <FolderKanban className="w-5 h-5 text-indigo-400" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Campaigns</h1>
          </div>
          <p className="text-zinc-500 text-sm ml-[52px]">
            Plan and execute social media campaigns across brands, regions, and channels.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={load}
            className="p-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-400 rounded-xl transition-all"
            title="Refresh">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-indigo-600/20">
            <Plus className="w-4 h-4" />New Campaign
          </button>
        </div>
      </div>

      {/* ── Error Banner ─────────────────────────────────────── */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="p-1 hover:bg-rose-500/10 rounded-lg transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ── Stats ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total",     value: stats.total,     icon: Layers,       iconBg: "bg-zinc-800",       color: "text-zinc-400"    },
          { label: "Active",    value: stats.active,    icon: TrendingUp,   iconBg: "bg-emerald-500/10", color: "text-emerald-400" },
          { label: "Draft",     value: stats.draft,     icon: Pencil,       iconBg: "bg-amber-500/10",   color: "text-amber-400"   },
          { label: "Completed", value: stats.completed, icon: CheckCircle2, iconBg: "bg-indigo-500/10",  color: "text-indigo-400"  },
        ].map(({ label, value, icon: Icon, iconBg, color }) => (
          <div key={label} className="p-5 bg-zinc-900/40 border border-zinc-800 rounded-2xl hover:border-zinc-700 transition-colors">
            <div className={`w-8 h-8 ${iconBg} rounded-xl flex items-center justify-center mb-4`}>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="text-xs text-zinc-500 font-medium mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* ── Status Tabs ──────────────────────────────────────── */}
      <div className="flex gap-1 p-1 bg-zinc-900/40 border border-zinc-800 rounded-xl w-fit max-w-full overflow-x-auto">
        {TABS.map(tab => {
          const count = tab === "ALL" ? campaigns.length : campaigns.filter(c => c.status === tab).length;
          return (
            <button key={tab} onClick={() => setFilter(tab)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                filter === tab
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
              }`}>
              {tab === "ALL" ? "All" : tab.charAt(0) + tab.slice(1).toLowerCase().replace("_", " ")}
              {count > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold min-w-[18px] text-center ${
                  filter === tab ? "bg-white/20 text-white" : "bg-zinc-800 text-zinc-500"
                }`}>{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Campaign Grid ────────────────────────────────────── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Loader2 className="w-7 h-7 animate-spin text-indigo-400" />
          <p className="text-zinc-600 text-sm">Loading campaigns…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center mb-4">
            <FolderKanban className="w-7 h-7 text-zinc-700" />
          </div>
          <p className="text-zinc-400 font-semibold">
            {filter === "ALL" ? "No campaigns yet" : `No ${filter.toLowerCase()} campaigns`}
          </p>
          <p className="text-zinc-600 text-sm mt-1 max-w-xs">
            {filter === "ALL"
              ? "Create your first campaign to start planning content."
              : "Try a different filter or create a new campaign."}
          </p>
          <button onClick={openCreate}
            className="mt-5 flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl transition-all">
            <Plus className="w-4 h-4" />New Campaign
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(c => (
            <div key={c.id}
              className={`group bg-zinc-900/40 border border-zinc-800 border-l-4 ${STATUS_BORDER[c.status] || "border-l-zinc-700"} rounded-2xl p-5 hover:border-zinc-700 hover:shadow-xl hover:shadow-black/20 hover:-translate-y-0.5 transition-all duration-200 relative`}>

              {/* Card Top */}
              <div className="flex items-start justify-between mb-3 gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap mb-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${TYPE_STYLES[c.campaign_type] || TYPE_STYLES.ORGANIC}`}>
                      {c.campaign_type.replace("_", " ")}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${STATUS_STYLES[c.status] || STATUS_STYLES.DRAFT}`}>
                      {c.status}
                    </span>
                  </div>
                  <h3 className="font-semibold text-white text-[15px] leading-snug line-clamp-1">{c.name}</h3>
                </div>
                <div className="relative shrink-0">
                  <button
                    onClick={() => { setMenuOpen(menuOpen === c.id ? null : c.id); setConfirmDelete(null); }}
                    className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-600 hover:text-zinc-300 transition-colors opacity-0 group-hover:opacity-100">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                  {menuOpen === c.id && (
                    <div className="absolute right-0 top-8 z-20 w-44 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden">
                      <button onClick={() => openEdit(c)}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-zinc-300 hover:bg-zinc-900 hover:text-white transition-colors">
                        <Pencil className="w-3.5 h-3.5 text-zinc-500" />Edit Campaign
                      </button>
                      <div className="h-px bg-zinc-800 mx-2" />
                      {confirmDelete === c.id ? (
                        <div className="p-3 space-y-2">
                          <p className="text-xs text-zinc-400 font-medium">Delete this campaign?</p>
                          <div className="flex gap-1.5">
                            <button onClick={() => handleDelete(c.id)} disabled={deleting === c.id}
                              className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-rose-500 hover:bg-rose-400 text-white text-xs font-bold rounded-lg transition-colors">
                              {deleting === c.id ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                              Yes, delete
                            </button>
                            <button onClick={() => setConfirmDelete(null)}
                              className="flex-1 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 text-xs font-semibold rounded-lg transition-colors">
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmDelete(c.id)}
                          className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-rose-400 hover:bg-zinc-900 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />Delete
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Objective */}
              <p className="text-xs text-zinc-500 line-clamp-2 mb-4 leading-relaxed">{c.objective}</p>

              {/* Platforms */}
              {c.platforms?.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-4">
                  {c.platforms.slice(0, 4).map(p => (
                    <span key={p} className={`text-[10px] font-medium px-2 py-0.5 rounded-md ${PLATFORM_COLORS[p] || "bg-zinc-800 text-zinc-400"}`}>
                      {p}
                    </span>
                  ))}
                  {c.platforms.length > 4 && (
                    <span className="text-[10px] px-2 py-0.5 bg-zinc-800 text-zinc-500 rounded-md">
                      +{c.platforms.length - 4} more
                    </span>
                  )}
                </div>
              )}

              {/* Card Footer */}
              <div className="flex items-center justify-between text-xs text-zinc-600 border-t border-zinc-800/60 pt-3">
                <div className="flex items-center gap-3">
                  {c.budget_total != null && (
                    <span className="flex items-center gap-1">
                      <DollarSign className="w-3 h-3" />
                      {c.budget_total.toLocaleString()}
                    </span>
                  )}
                  {(c.start_at || c.end_at) && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {c.start_at ? new Date(c.start_at).toLocaleDateString("en", { month: "short", day: "numeric" }) : ""}
                      {c.end_at   ? ` – ${new Date(c.end_at).toLocaleDateString("en", { month: "short", day: "numeric" })}` : ""}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 text-indigo-400 font-semibold">
                    <Target className="w-3 h-3" />
                    {c.project_count} {c.project_count === 1 ? "project" : "projects"}
                  </span>
                  <Link href={`/campaigns/${c.id}`}
                    className="flex items-center gap-1 text-zinc-500 hover:text-indigo-400 font-semibold transition-colors">
                    View <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Click-outside backdrop */}
      {menuOpen && (
        <div className="fixed inset-0 z-10" onClick={() => { setMenuOpen(null); setConfirmDelete(null); }} />
      )}

      {/* ── Toast ───────────────────────────────────────────── */}
      {saveOk && (
        <div className="fixed bottom-6 right-6 z-[100] flex items-center gap-2.5 px-4 py-3 bg-zinc-900 border border-emerald-500/25 text-emerald-400 text-sm font-semibold rounded-2xl shadow-2xl shadow-black/50">
          <div className="w-5 h-5 bg-emerald-500/15 rounded-full flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-3 h-3" />
          </div>
          {saveMsg}
        </div>
      )}

      {/* ── Modal ───────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">

            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-zinc-800 flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-base font-bold text-white">
                  {editItem ? "Edit Campaign" : "New Campaign"}
                </h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {editItem ? "Update campaign details and settings" : "Set up a new campaign to organise your content"}
                </p>
              </div>
              <button onClick={() => setShowModal(false)}
                className="p-2 hover:bg-zinc-900 text-zinc-500 hover:text-zinc-300 rounded-xl transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">

              {/* Basic Info */}
              <div className="space-y-4">
                <p className="text-[11px] font-bold text-zinc-600 uppercase tracking-widest pb-1 border-b border-zinc-800/60">
                  Basic Info
                </p>
                <div>
                  <label className={labelCls}>
                    Campaign Name <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <input type="text" value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className={inputCls}
                    placeholder="e.g. Ramadan 2025 Brand Awareness" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Type</label>
                    <select value={form.campaign_type}
                      onChange={e => setForm(f => ({ ...f, campaign_type: e.target.value }))}
                      className={inputCls}>
                      {TYPE_OPTIONS.map(t => (
                        <option key={t} value={t}>{t.replace("_", " ")}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Total Budget</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600 pointer-events-none" />
                      <input type="number" min="0" value={form.budget_total}
                        onChange={e => setForm(f => ({ ...f, budget_total: e.target.value }))}
                        className={`${inputCls} pl-8`}
                        placeholder="0" />
                    </div>
                  </div>
                </div>
                <div>
                  <label className={labelCls}>
                    Objective <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <textarea value={form.objective} rows={2}
                    onChange={e => setForm(f => ({ ...f, objective: e.target.value }))}
                    className={`${inputCls} resize-none`}
                    placeholder="e.g. Increase brand awareness in UAE by 30% during Ramadan" />
                </div>
                <div>
                  <label className={labelCls}>
                    Description{" "}
                    <span className="text-zinc-700 font-normal normal-case tracking-normal">— optional</span>
                  </label>
                  <textarea value={form.description} rows={2}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    className={`${inputCls} resize-none`}
                    placeholder="Internal notes or background context" />
                </div>
              </div>

              {/* Platforms */}
              <div className="space-y-3">
                <p className="text-[11px] font-bold text-zinc-600 uppercase tracking-widest pb-1 border-b border-zinc-800/60">
                  Platforms
                </p>
                <div className="flex flex-wrap gap-2">
                  {PLATFORM_LIST.map(p => (
                    <button key={p} type="button" onClick={() => togglePlatform(p)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                        form.platforms.includes(p)
                          ? `${PLATFORM_COLORS[p]} border-current`
                          : "bg-zinc-900 text-zinc-500 border-zinc-800 hover:border-zinc-700 hover:text-zinc-400"
                      }`}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Timeline */}
              <div className="space-y-3">
                <p className="text-[11px] font-bold text-zinc-600 uppercase tracking-widest pb-1 border-b border-zinc-800/60">
                  Timeline
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Start Date</label>
                    <input type="date" value={form.start_at}
                      onChange={e => setForm(f => ({ ...f, start_at: e.target.value }))}
                      className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>End Date</label>
                    <input type="date" value={form.end_at}
                      onChange={e => setForm(f => ({ ...f, end_at: e.target.value }))}
                      className={inputCls} />
                  </div>
                </div>
              </div>

              {/* KPI Targets */}
              <div className="space-y-3">
                <p className="text-[11px] font-bold text-zinc-600 uppercase tracking-widest pb-1 border-b border-zinc-800/60">
                  KPI Targets{" "}
                  <span className="text-zinc-700 font-normal normal-case tracking-normal">— optional</span>
                </p>
                <div className="grid grid-cols-3 gap-3">
                  {(["kpi_reach", "kpi_engagement", "kpi_conversions"] as const).map(key => (
                    <div key={key}>
                      <label className={labelCls}>{key.replace("kpi_", "")}</label>
                      <input type="number" min="0" value={form[key]}
                        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                        className={inputCls}
                        placeholder="0" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-zinc-800 flex items-center justify-between shrink-0">
              <button onClick={() => setShowModal(false)}
                className="px-4 py-2.5 text-zinc-500 hover:text-zinc-300 text-sm font-medium transition-colors rounded-xl hover:bg-zinc-900">
                Cancel
              </button>
              <button onClick={handleSave}
                disabled={saving || !form.name.trim() || !form.objective.trim()}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-indigo-600/20">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                {editItem ? "Save Changes" : "Create Campaign"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
