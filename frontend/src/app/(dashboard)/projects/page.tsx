"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Briefcase, Plus, Loader2, AlertCircle, RefreshCw,
  MoreHorizontal, Pencil, Trash2, CheckCircle2, X,
  Calendar, User, Layers, Clock, FolderKanban, FileText,
} from "lucide-react";
import { api } from "@/lib/api";

interface Project {
  id: string;
  name: string;
  description?: string;
  status: string;
  platforms: string[];
  campaign_id?: string | null;
  campaign_name?: string | null;
  assigned_to?: string | null;
  assignee_name?: string | null;
  due_date?: string | null;
  content_count: number;
  created_at: string;
}

interface Campaign { id: string; name: string; }
interface Member   { id: string; full_name?: string; email?: string; }

interface FormState {
  name: string; description: string; status: string;
  platforms: string[]; campaign_id: string;
  assigned_to: string; due_date: string; content_count: string;
}

const DEFAULT_FORM: FormState = {
  name: "", description: "", status: "DRAFT",
  platforms: [], campaign_id: "", assigned_to: "", due_date: "", content_count: "0",
};

const PLATFORM_LIST = ["Instagram", "Facebook", "LinkedIn", "Twitter", "Threads", "YouTube", "Pinterest"];
const STATUS_LIST   = ["DRAFT", "IN_PROGRESS", "IN_REVIEW", "APPROVED", "PUBLISHED", "ARCHIVED"];

const STATUS_STYLES: Record<string, string> = {
  DRAFT:       "text-zinc-400 bg-zinc-400/10 border-zinc-400/20",
  IN_PROGRESS: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  IN_REVIEW:   "text-blue-400 bg-blue-400/10 border-blue-400/20",
  APPROVED:    "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  PUBLISHED:   "text-indigo-400 bg-indigo-400/10 border-indigo-400/20",
  ARCHIVED:    "text-zinc-500 bg-zinc-500/10 border-zinc-500/20",
};

const STATUS_BORDER: Record<string, string> = {
  DRAFT:       "border-l-zinc-700",
  IN_PROGRESS: "border-l-amber-500",
  IN_REVIEW:   "border-l-blue-500",
  APPROVED:    "border-l-emerald-500",
  PUBLISHED:   "border-l-indigo-500",
  ARCHIVED:    "border-l-zinc-700",
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

const FILTER_TABS = ["ALL", "DRAFT", "IN_PROGRESS", "IN_REVIEW", "APPROVED", "PUBLISHED"];
const TODAY = new Date().toISOString().split("T")[0];

export default function ProjectsPage() {
  const [projects,      setProjects]      = useState<Project[]>([]);
  const [campaigns,     setCampaigns]     = useState<Campaign[]>([]);
  const [members,       setMembers]       = useState<Member[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [filter,        setFilter]        = useState("ALL");
  const [campFilter,    setCampFilter]    = useState("ALL");
  const [showModal,     setShowModal]     = useState(false);
  const [editItem,      setEditItem]      = useState<Project | null>(null);
  const [form,          setForm]          = useState<FormState>(DEFAULT_FORM);
  const [saving,        setSaving]        = useState(false);
  const [deleting,      setDeleting]      = useState<string | null>(null);
  const [menuOpen,      setMenuOpen]      = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [error,         setError]         = useState<string | null>(null);
  const [saveOk,        setSaveOk]        = useState(false);
  const [saveMsg,       setSaveMsg]       = useState("");

  const loadProjects = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams();
      if (filter     !== "ALL") params.set("status",      filter);
      if (campFilter !== "ALL") params.set("campaign_id", campFilter);
      const res = await api.get(`/api/v1/projects${params.toString() ? "?" + params : ""}`);
      setProjects(res.data || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load projects");
    } finally { setLoading(false); }
  }, [filter, campFilter]);

  const loadMeta = useCallback(async () => {
    try {
      const [campsRes, membersRes] = await Promise.all([
        api.get("/api/v1/campaigns"),
        api.get("/api/v1/team/members"),
      ]);
      setCampaigns(campsRes.data || []);
      setMembers(membersRes.data || []);
    } catch { /* non-critical */ }
  }, []);

  useEffect(() => { loadProjects(); }, [loadProjects]);
  useEffect(() => { loadMeta(); }, [loadMeta]);

  const openCreate = () => { setEditItem(null); setForm(DEFAULT_FORM); setShowModal(true); };
  const openEdit   = (p: Project) => {
    setEditItem(p);
    setForm({
      name: p.name, description: p.description || "", status: p.status,
      platforms: p.platforms || [], campaign_id: p.campaign_id || "",
      assigned_to: p.assigned_to || "",
      due_date: p.due_date || "",
      content_count: p.content_count.toString(),
    });
    setShowModal(true); setMenuOpen(null);
  };

  const togglePlatform = (pl: string) =>
    setForm(f => ({ ...f, platforms: f.platforms.includes(pl) ? f.platforms.filter(x => x !== pl) : [...f.platforms, pl] }));

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(), description: form.description.trim() || undefined,
        status: form.status, platforms: form.platforms,
        campaign_id:   form.campaign_id  || null,
        assigned_to:   form.assigned_to  || null,
        due_date:      form.due_date     || null,
        content_count: parseInt(form.content_count) || 0,
      };
      if (editItem) await api.patch(`/api/v1/projects/${editItem.id}`, payload);
      else          await api.post("/api/v1/projects", payload);
      setSaveMsg(editItem ? "Project updated" : "Project created");
      setSaveOk(true); setTimeout(() => setSaveOk(false), 3000);
      setShowModal(false); loadProjects();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    setDeleting(id); setMenuOpen(null); setConfirmDelete(null);
    try {
      await api.delete(`/api/v1/projects/${id}`);
      setProjects(prev => prev.filter(p => p.id !== id));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally { setDeleting(null); }
  };

  const stats = {
    total:      projects.length,
    inProgress: projects.filter(p => p.status === "IN_PROGRESS").length,
    inReview:   projects.filter(p => p.status === "IN_REVIEW").length,
    published:  projects.filter(p => p.status === "PUBLISHED").length,
  };

  const inputCls = "w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all";
  const labelCls = "block text-[11px] font-semibold text-zinc-500 uppercase tracking-widest mb-1.5";

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">

      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-indigo-500/10 rounded-xl border border-indigo-500/10">
              <Briefcase className="w-5 h-5 text-indigo-400" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Projects</h1>
          </div>
          <p className="text-zinc-500 text-sm ml-[52px]">
            Manage content production workflows, creative briefs, and team assignments.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={loadProjects}
            className="p-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-400 rounded-xl transition-all"
            title="Refresh">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-indigo-600/20">
            <Plus className="w-4 h-4" />New Project
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
          { label: "Total",       value: stats.total,      icon: Layers,       iconBg: "bg-zinc-800",       color: "text-zinc-400"    },
          { label: "In Progress", value: stats.inProgress, icon: Clock,        iconBg: "bg-amber-500/10",   color: "text-amber-400"   },
          { label: "In Review",   value: stats.inReview,   icon: FileText,     iconBg: "bg-blue-500/10",    color: "text-blue-400"    },
          { label: "Published",   value: stats.published,  icon: CheckCircle2, iconBg: "bg-indigo-500/10",  color: "text-indigo-400"  },
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

      {/* ── Filters ──────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 p-1 bg-zinc-900/40 border border-zinc-800 rounded-xl overflow-x-auto max-w-full">
          {FILTER_TABS.map(tab => {
            const count = tab === "ALL" ? projects.length : projects.filter(p => p.status === tab).length;
            return (
              <button key={tab} onClick={() => setFilter(tab)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  filter === tab
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
                }`}>
                {tab === "ALL" ? "All" : tab.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                {count > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold min-w-[18px] text-center ${
                    filter === tab ? "bg-white/20 text-white" : "bg-zinc-800 text-zinc-500"
                  }`}>{count}</span>
                )}
              </button>
            );
          })}
        </div>
        {campaigns.length > 0 && (
          <select value={campFilter} onChange={e => setCampFilter(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-400 focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer font-medium">
            <option value="ALL">All Campaigns</option>
            {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}
      </div>

      {/* ── Project Grid ─────────────────────────────────────── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Loader2 className="w-7 h-7 animate-spin text-indigo-400" />
          <p className="text-zinc-600 text-sm">Loading projects…</p>
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center mb-4">
            <Briefcase className="w-7 h-7 text-zinc-700" />
          </div>
          <p className="text-zinc-400 font-semibold">
            {filter === "ALL" ? "No projects yet" : `No ${filter.replace(/_/g, " ").toLowerCase()} projects`}
          </p>
          <p className="text-zinc-600 text-sm mt-1 max-w-xs">
            {filter === "ALL"
              ? "Create a project to start organising your content production."
              : "Try a different filter or create a new project."}
          </p>
          <button onClick={openCreate}
            className="mt-5 flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl transition-all">
            <Plus className="w-4 h-4" />New Project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {projects.map(p => {
            const overdue = !!(p.due_date && p.status !== "PUBLISHED" && p.status !== "ARCHIVED" && p.due_date < TODAY);
            return (
              <div key={p.id}
                className={`group bg-zinc-900/40 border border-zinc-800 border-l-4 ${STATUS_BORDER[p.status] || "border-l-zinc-700"} rounded-2xl p-5 hover:border-zinc-700 hover:shadow-xl hover:shadow-black/20 hover:-translate-y-0.5 transition-all duration-200 relative`}>

                {/* Card Top */}
                <div className="flex items-start justify-between mb-3 gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${STATUS_STYLES[p.status] || STATUS_STYLES.DRAFT}`}>
                        {p.status.replace(/_/g, " ")}
                      </span>
                    </div>
                    <h3 className="font-semibold text-white text-[15px] leading-snug line-clamp-1">{p.name}</h3>
                  </div>
                  <div className="relative shrink-0">
                    <button
                      onClick={() => { setMenuOpen(menuOpen === p.id ? null : p.id); setConfirmDelete(null); }}
                      className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-600 hover:text-zinc-300 transition-colors opacity-0 group-hover:opacity-100">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                    {menuOpen === p.id && (
                      <div className="absolute right-0 top-8 z-20 w-44 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden">
                        <button onClick={() => openEdit(p)}
                          className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-zinc-300 hover:bg-zinc-900 hover:text-white transition-colors">
                          <Pencil className="w-3.5 h-3.5 text-zinc-500" />Edit Project
                        </button>
                        <div className="h-px bg-zinc-800 mx-2" />
                        {confirmDelete === p.id ? (
                          <div className="p-3 space-y-2">
                            <p className="text-xs text-zinc-400 font-medium">Delete this project?</p>
                            <div className="flex gap-1.5">
                              <button onClick={() => handleDelete(p.id)} disabled={deleting === p.id}
                                className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-rose-500 hover:bg-rose-400 text-white text-xs font-bold rounded-lg transition-colors">
                                {deleting === p.id ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                                Yes, delete
                              </button>
                              <button onClick={() => setConfirmDelete(null)}
                                className="flex-1 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 text-xs font-semibold rounded-lg transition-colors">
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button onClick={() => setConfirmDelete(p.id)}
                            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-rose-400 hover:bg-zinc-900 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />Delete
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {p.description && (
                  <p className="text-xs text-zinc-500 line-clamp-1 mb-3 leading-relaxed">{p.description}</p>
                )}

                {p.campaign_name && (
                  <div className="flex items-center gap-1.5 mb-3">
                    <FolderKanban className="w-3 h-3 text-indigo-400 shrink-0" />
                    <span className="text-xs text-indigo-400 truncate font-medium">{p.campaign_name}</span>
                  </div>
                )}

                {p.platforms?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-4">
                    {p.platforms.slice(0, 4).map(pl => (
                      <span key={pl} className={`text-[10px] font-medium px-2 py-0.5 rounded-md ${PLATFORM_COLORS[pl] || "bg-zinc-800 text-zinc-400"}`}>
                        {pl}
                      </span>
                    ))}
                    {p.platforms.length > 4 && (
                      <span className="text-[10px] px-2 py-0.5 bg-zinc-800 text-zinc-500 rounded-md">
                        +{p.platforms.length - 4} more
                      </span>
                    )}
                  </div>
                )}

                {/* Card Footer */}
                <div className="flex items-center justify-between text-xs border-t border-zinc-800/60 pt-3">
                  <div className="flex items-center gap-3 text-zinc-500">
                    {p.assignee_name && (
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {p.assignee_name.split(" ")[0]}
                      </span>
                    )}
                    {p.due_date && (
                      <span className={`flex items-center gap-1 font-medium ${overdue ? "text-rose-400" : "text-zinc-500"}`}>
                        <Calendar className="w-3 h-3" />
                        {new Date(p.due_date + "T00:00:00").toLocaleDateString("en", { month: "short", day: "numeric" })}
                        {overdue && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 bg-rose-500/10 border border-rose-500/20 rounded-md text-rose-400">
                            OVERDUE
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                  <span className="flex items-center gap-1 text-indigo-400 font-semibold">
                    <FileText className="w-3 h-3" />
                    {p.content_count} {p.content_count === 1 ? "piece" : "pieces"}
                  </span>
                </div>
              </div>
            );
          })}
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
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl">

            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-zinc-800 flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-base font-bold text-white">
                  {editItem ? "Edit Project" : "New Project"}
                </h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {editItem ? "Update project details and assignments" : "Start a new content production project"}
                </p>
              </div>
              <button onClick={() => setShowModal(false)}
                className="p-2 hover:bg-zinc-900 text-zinc-500 hover:text-zinc-300 rounded-xl transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              <div>
                <label className={labelCls}>
                  Project Name <span className="text-rose-500 font-bold">*</span>
                </label>
                <input type="text" value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className={inputCls}
                  placeholder="e.g. Ramadan Countdown Posts" />
              </div>
              <div>
                <label className={labelCls}>
                  Description{" "}
                  <span className="text-zinc-700 font-normal normal-case tracking-normal">— optional</span>
                </label>
                <textarea value={form.description} rows={2}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className={`${inputCls} resize-none`}
                  placeholder="What content is being produced in this project?" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Status</label>
                  <select value={form.status}
                    onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                    className={inputCls}>
                    {STATUS_LIST.map(s => (
                      <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Content Pieces</label>
                  <input type="number" min="0" value={form.content_count}
                    onChange={e => setForm(f => ({ ...f, content_count: e.target.value }))}
                    className={inputCls}
                    placeholder="0" />
                </div>
              </div>

              {campaigns.length > 0 && (
                <div>
                  <label className={labelCls}>
                    Campaign{" "}
                    <span className="text-zinc-700 font-normal normal-case tracking-normal">— optional</span>
                  </label>
                  <select value={form.campaign_id}
                    onChange={e => setForm(f => ({ ...f, campaign_id: e.target.value }))}
                    className={inputCls}>
                    <option value="">No campaign</option>
                    {campaigns.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {members.length > 0 && (
                <div>
                  <label className={labelCls}>Assign To</label>
                  <select value={form.assigned_to}
                    onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value }))}
                    className={inputCls}>
                    <option value="">Unassigned</option>
                    {members.map(m => (
                      <option key={m.id} value={m.id}>{m.full_name || m.email || m.id}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className={labelCls}>Due Date</label>
                <input type="date" value={form.due_date}
                  onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
                  className={inputCls} />
              </div>

              <div>
                <label className={labelCls}>Platforms</label>
                <div className="flex flex-wrap gap-2">
                  {PLATFORM_LIST.map(pl => (
                    <button key={pl} type="button" onClick={() => togglePlatform(pl)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                        form.platforms.includes(pl)
                          ? `${PLATFORM_COLORS[pl]} border-current`
                          : "bg-zinc-900 text-zinc-500 border-zinc-800 hover:border-zinc-700 hover:text-zinc-400"
                      }`}>
                      {pl}
                    </button>
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
              <button onClick={handleSave} disabled={saving || !form.name.trim()}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-indigo-600/20">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                {editItem ? "Save Changes" : "Create Project"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
