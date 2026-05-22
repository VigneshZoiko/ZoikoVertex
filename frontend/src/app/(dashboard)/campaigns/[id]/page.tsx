"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  FolderKanban, ArrowLeft, Loader2, AlertCircle, RefreshCw,
  Target, Calendar, DollarSign, Briefcase, FileText,
  User, CheckCircle2, Clock, Globe, Layers, TrendingUp,
  X, ChevronDown, Pencil, Save,
} from "lucide-react";
import { api } from "@/lib/api";

/* ── Types ──────────────────────────────────────────────────── */
interface Campaign {
  id: string; name: string; description?: string;
  campaign_type: string; status: string; objective: string;
  platforms: string[]; budget_total?: number | null;
  budget_daily?: number | null;
  start_at?: string | null; end_at?: string | null;
  kpi_reach?: number | null; kpi_engagement?: number | null;
  kpi_conversions?: number | null;
  project_count: number; created_at: string;
}
interface Project {
  id: string; name: string; status: string;
  assignee_name?: string | null; due_date?: string | null;
  content_count: number; platforms: string[];
}
interface Post {
  id: string; content: string; platform: string; status: string;
  media_urls?: string[]; created_at: string;
  project_name?: string | null; creator_name?: string | null;
}

/* ── Lookup maps ─────────────────────────────────────────────── */
const STATUS_STYLES: Record<string, string> = {
  DRAFT:     "text-zinc-400 bg-zinc-400/10 border-zinc-400/20",
  ACTIVE:    "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  PAUSED:    "text-amber-400 bg-amber-400/10 border-amber-400/20",
  COMPLETED: "text-indigo-400 bg-indigo-400/10 border-indigo-400/20",
  CANCELLED: "text-rose-400 bg-rose-400/10 border-rose-400/20",
};
const PROJ_STATUS_STYLES: Record<string, string> = {
  DRAFT:       "text-zinc-400 bg-zinc-400/10 border-zinc-400/20",
  IN_PROGRESS: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  IN_REVIEW:   "text-blue-400 bg-blue-400/10 border-blue-400/20",
  APPROVED:    "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  PUBLISHED:   "text-indigo-400 bg-indigo-400/10 border-indigo-400/20",
  ARCHIVED:    "text-zinc-500 bg-zinc-500/10 border-zinc-500/20",
};
const POST_STATUS_STYLES: Record<string, string> = {
  APPROVED:      "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  PUBLISHED:     "text-indigo-400 bg-indigo-400/10 border-indigo-400/20",
  PENDING:       "text-amber-400 bg-amber-400/10 border-amber-400/20",
  FAILED:        "text-rose-400 bg-rose-400/10 border-rose-400/20",
  REJECTED:      "text-rose-400 bg-rose-400/10 border-rose-400/20",
  AUTO_APPROVE:  "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
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
const CAMPAIGN_STATUSES = ["DRAFT", "ACTIVE", "PAUSED", "COMPLETED", "CANCELLED"];
const TODAY = new Date().toISOString().split("T")[0];

/* ── Helpers ─────────────────────────────────────────────────── */
const fmt = (d: string) => new Date(d).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" });
const fmtShort = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("en", { month: "short", day: "numeric" });

function duration(start?: string | null, end?: string | null): string {
  if (!start || !end) return "—";
  const days = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000);
  return days > 0 ? `${days} days` : "—";
}

/* ── Page ────────────────────────────────────────────────────── */
export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [posts,    setPosts]    = useState<Post[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);

  // Quick status update
  const [statusOpen,   setStatusOpen]   = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [saveOk, setSaveOk] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [campRes, projRes, postsRes] = await Promise.allSettled([
        api.get(`/api/v1/campaigns/${id}`),
        api.get(`/api/v1/projects?campaign_id=${id}`),
        api.get(`/api/v1/campaigns/${id}/posts`),
      ]);
      if (campRes.status === "fulfilled")  setCampaign(campRes.value.data);
      else throw new Error("Campaign not found");
      if (projRes.status  === "fulfilled") setProjects(projRes.value.data  || []);
      if (postsRes.status === "fulfilled") setPosts(postsRes.value.data    || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load campaign");
    } finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleStatusChange = async (newStatus: string) => {
    if (!campaign || newStatus === campaign.status) { setStatusOpen(false); return; }
    setUpdatingStatus(true); setStatusOpen(false);
    try {
      const res = await api.patch(`/api/v1/campaigns/${id}`, { status: newStatus });
      setCampaign(res.data);
      setSaveOk(true); setTimeout(() => setSaveOk(false), 2500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Status update failed");
    } finally { setUpdatingStatus(false); }
  };

  /* ── Loading / Error states ── */
  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="w-7 h-7 animate-spin text-indigo-400" />
    </div>
  );
  if (error || !campaign) return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 p-5 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400">
        <AlertCircle className="w-5 h-5 shrink-0" />
        <p className="font-medium">{error || "Campaign not found"}</p>
        <button onClick={() => router.push("/campaigns")} className="ml-auto text-sm underline">Back to Campaigns</button>
      </div>
    </div>
  );

  const postCount     = posts.length;
  const publishedCount = posts.filter(p => p.status === "PUBLISHED" || p.status === "APPROVED").length;

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">

      {/* ── Header ───────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4 min-w-0">
          <Link href="/campaigns"
            className="mt-1 p-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-zinc-400 hover:text-white transition-all shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${TYPE_STYLES[campaign.campaign_type] || TYPE_STYLES.ORGANIC}`}>
                {campaign.campaign_type.replace("_", " ")}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight leading-snug">{campaign.name}</h1>
            {campaign.description && (
              <p className="text-zinc-500 text-sm mt-1">{campaign.description}</p>
            )}
          </div>
        </div>

        {/* Status + Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={load}
            className="p-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-zinc-400 transition-all"
            title="Refresh">
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* Status selector */}
          <div className="relative">
            <button onClick={() => setStatusOpen(!statusOpen)} disabled={updatingStatus}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-bold transition-all ${STATUS_STYLES[campaign.status] || STATUS_STYLES.DRAFT}`}>
              {updatingStatus ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
              {campaign.status}
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>
            {statusOpen && (
              <div className="absolute right-0 top-11 z-20 w-40 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden">
                {CAMPAIGN_STATUSES.map(s => (
                  <button key={s} onClick={() => handleStatusChange(s)}
                    className={`w-full flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold transition-colors hover:bg-zinc-900 ${s === campaign.status ? "text-indigo-400" : "text-zinc-400"}`}>
                    {s === campaign.status && <CheckCircle2 className="w-3 h-3" />}
                    {s !== campaign.status && <span className="w-3" />}
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          <Link href={`/campaigns`}
            className="flex items-center gap-2 px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-sm font-semibold rounded-xl transition-all">
            <Pencil className="w-3.5 h-3.5" />Edit
          </Link>
        </div>
      </div>

      {/* Click-outside for status dropdown */}
      {statusOpen && <div className="fixed inset-0 z-10" onClick={() => setStatusOpen(false)} />}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" /><span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="p-1 hover:bg-rose-500/10 rounded-lg transition-colors"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* ── Stats row ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Projects",   value: projects.length, icon: Briefcase,    iconBg: "bg-indigo-500/10",  color: "text-indigo-400"  },
          { label: "Posts",      value: postCount,       icon: FileText,     iconBg: "bg-emerald-500/10", color: "text-emerald-400" },
          { label: "Published",  value: publishedCount,  icon: Globe,        iconBg: "bg-sky-500/10",     color: "text-sky-400"     },
          { label: "Duration",   value: duration(campaign.start_at, campaign.end_at),
                                                         icon: Calendar,     iconBg: "bg-amber-500/10",   color: "text-amber-400"   },
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

      {/* ── Objective + meta ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 p-5 bg-zinc-900/40 border border-zinc-800 rounded-2xl space-y-4">
          <p className="text-[11px] font-bold text-zinc-600 uppercase tracking-widest">Objective</p>
          <p className="text-sm text-zinc-300 leading-relaxed">{campaign.objective}</p>
          {campaign.platforms?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {campaign.platforms.map(p => (
                <span key={p} className={`text-[10px] font-medium px-2 py-0.5 rounded-md ${PLATFORM_COLORS[p] || "bg-zinc-800 text-zinc-400"}`}>{p}</span>
              ))}
            </div>
          )}
        </div>

        <div className="p-5 bg-zinc-900/40 border border-zinc-800 rounded-2xl space-y-3">
          <p className="text-[11px] font-bold text-zinc-600 uppercase tracking-widest">Campaign Details</p>
          <div className="space-y-2.5 text-sm">
            {campaign.budget_total != null && (
              <div className="flex items-center justify-between">
                <span className="text-zinc-500 flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5" />Budget</span>
                <span className="text-white font-semibold">${campaign.budget_total.toLocaleString()}</span>
              </div>
            )}
            {campaign.budget_daily != null && (
              <div className="flex items-center justify-between">
                <span className="text-zinc-500 flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5" />Daily Cap</span>
                <span className="text-white font-semibold">${campaign.budget_daily.toLocaleString()}</span>
              </div>
            )}
            {campaign.start_at && (
              <div className="flex items-center justify-between">
                <span className="text-zinc-500 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />Start</span>
                <span className="text-zinc-300">{fmt(campaign.start_at)}</span>
              </div>
            )}
            {campaign.end_at && (
              <div className="flex items-center justify-between">
                <span className="text-zinc-500 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />End</span>
                <span className="text-zinc-300">{fmt(campaign.end_at)}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-zinc-500 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />Created</span>
              <span className="text-zinc-500 text-xs">{fmt(campaign.created_at)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── KPI Targets ──────────────────────────────────────── */}
      {(campaign.kpi_reach || campaign.kpi_engagement || campaign.kpi_conversions) && (
        <div className="p-5 bg-zinc-900/40 border border-zinc-800 rounded-2xl">
          <p className="text-[11px] font-bold text-zinc-600 uppercase tracking-widest mb-4">KPI Targets</p>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Reach Target",       value: campaign.kpi_reach,       icon: Layers,     color: "text-blue-400",    bg: "bg-blue-500/10"    },
              { label: "Engagement Target",  value: campaign.kpi_engagement,  icon: TrendingUp, color: "text-emerald-400", bg: "bg-emerald-500/10" },
              { label: "Conversion Target",  value: campaign.kpi_conversions, icon: Target,     color: "text-indigo-400",  bg: "bg-indigo-500/10"  },
            ].filter(k => k.value).map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className={`p-4 ${bg} rounded-xl border border-zinc-800`}>
                <Icon className={`w-4 h-4 ${color} mb-2`} />
                <p className="text-xl font-bold text-white">{(value as number).toLocaleString()}</p>
                <p className="text-xs text-zinc-500 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Projects ─────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-indigo-400" />
            Projects
            <span className="text-xs text-zinc-600 font-normal">({projects.length})</span>
          </h2>
          <Link href={`/projects`}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold transition-colors">
            View all projects →
          </Link>
        </div>

        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 bg-zinc-900/40 border border-zinc-800 rounded-2xl text-center">
            <Briefcase className="w-8 h-8 text-zinc-700 mb-3" />
            <p className="text-zinc-500 font-medium text-sm">No projects yet</p>
            <p className="text-zinc-700 text-xs mt-1">Create a project and link it to this campaign.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {projects.map(p => {
              const overdue = !!(p.due_date && p.status !== "PUBLISHED" && p.status !== "ARCHIVED" && p.due_date < TODAY);
              return (
                <div key={p.id} className="p-4 bg-zinc-900/40 border border-zinc-800 rounded-2xl hover:border-zinc-700 transition-colors">
                  <div className="flex items-start justify-between mb-2 gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${PROJ_STATUS_STYLES[p.status] || PROJ_STATUS_STYLES.DRAFT}`}>
                      {p.status.replace(/_/g, " ")}
                    </span>
                    {p.content_count > 0 && (
                      <span className="flex items-center gap-1 text-[10px] text-indigo-400 font-semibold shrink-0">
                        <FileText className="w-3 h-3" />{p.content_count}
                      </span>
                    )}
                  </div>
                  <h3 className="font-semibold text-white text-sm leading-snug mb-3">{p.name}</h3>
                  {p.platforms?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {p.platforms.slice(0, 3).map(pl => (
                        <span key={pl} className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md ${PLATFORM_COLORS[pl] || "bg-zinc-800 text-zinc-400"}`}>{pl}</span>
                      ))}
                      {p.platforms.length > 3 && <span className="text-[10px] px-1.5 py-0.5 bg-zinc-800 text-zinc-500 rounded-md">+{p.platforms.length - 3}</span>}
                    </div>
                  )}
                  <div className="flex items-center justify-between text-xs text-zinc-600 pt-2 border-t border-zinc-800/60">
                    {p.assignee_name ? (
                      <span className="flex items-center gap-1 text-zinc-500"><User className="w-3 h-3" />{p.assignee_name.split(" ")[0]}</span>
                    ) : <span />}
                    {p.due_date && (
                      <span className={`flex items-center gap-1 ${overdue ? "text-rose-400" : "text-zinc-500"}`}>
                        <Calendar className="w-3 h-3" />{fmtShort(p.due_date)}
                        {overdue && <span className="text-[9px] px-1 bg-rose-500/10 border border-rose-500/20 rounded text-rose-400">OVERDUE</span>}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Posts ────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-400" />
            Posts
            <span className="text-xs text-zinc-600 font-normal">({postCount})</span>
          </h2>
        </div>

        {posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 bg-zinc-900/40 border border-zinc-800 rounded-2xl text-center">
            <FileText className="w-8 h-8 text-zinc-700 mb-3" />
            <p className="text-zinc-500 font-medium text-sm">No posts linked yet</p>
            <p className="text-zinc-700 text-xs mt-1 max-w-xs">
              When publishing, select this campaign in the Publishing Hub to link posts here.
            </p>
            <Link href="/publish"
              className="mt-4 flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition-all">
              Go to Publishing Hub
            </Link>
          </div>
        ) : (
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl overflow-hidden">
            {posts.map((post, i) => (
              <div key={post.id}
                className={`flex items-start gap-4 p-4 hover:bg-zinc-900/60 transition-colors ${i < posts.length - 1 ? "border-b border-zinc-800/60" : ""}`}>

                {/* Platform badge */}
                <span className={`shrink-0 mt-0.5 text-[10px] font-bold px-2 py-1 rounded-lg ${PLATFORM_COLORS[post.platform] || "bg-zinc-800 text-zinc-400"}`}>
                  {post.platform}
                </span>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-zinc-300 line-clamp-2 leading-relaxed">
                    {post.content || <span className="text-zinc-600 italic">No caption</span>}
                  </p>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-zinc-600">
                    {post.project_name && (
                      <span className="flex items-center gap-1 text-indigo-400/70">
                        <Briefcase className="w-3 h-3" />{post.project_name}
                      </span>
                    )}
                    {post.creator_name && (
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />{post.creator_name}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(post.created_at).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                  </div>
                </div>

                {/* Media thumbnail */}
                {post.media_urls?.[0] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={post.media_urls[0]} alt=""
                    className="w-12 h-12 rounded-lg object-cover shrink-0 border border-zinc-800"
                    onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                )}

                {/* Status */}
                <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-md border ${POST_STATUS_STYLES[post.status] || "text-zinc-400 bg-zinc-400/10 border-zinc-400/20"}`}>
                  {post.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Toast ────────────────────────────────────────────── */}
      {saveOk && (
        <div className="fixed bottom-6 right-6 z-[100] flex items-center gap-2.5 px-4 py-3 bg-zinc-900 border border-emerald-500/25 text-emerald-400 text-sm font-semibold rounded-2xl shadow-2xl shadow-black/50">
          <div className="w-5 h-5 bg-emerald-500/15 rounded-full flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-3 h-3" />
          </div>
          Status updated
        </div>
      )}
    </div>
  );
}
