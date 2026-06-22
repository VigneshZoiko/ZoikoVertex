"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft, ChevronRight, Calendar, X,
  Edit3, Trash2, Send, ExternalLink, CheckCircle2, MoreVertical,
} from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { formatDateTime } from "@/lib/utils";
import { api } from "@/lib/api";

// ── Unified calendar post ─────────────────────────────────────────────────────

interface CalendarPost {
  id: string;
  content: string;
  platform: string;
  calendarDate: string; // ISO string used for grid placement
  status: string;
  media_url?: string;
  created_at: string;
  source: "scheduled" | "intent";
  scheduled_time?: string;  // only for source=scheduled
  scheduled_for?: string | null; // target publish date for intents
  campaign_id?: string | null;
  project_id?: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function statusBadgeClass(status: string): string {
  if (status === "SCHEDULED")  return "bg-success-text/20 text-success-text";
  if (status === "PUBLISHED")  return "bg-blue-500/20 text-blue-400";
  if (status === "APPROVED")   return "bg-sky-500/20 text-sky-400";
  if (status.startsWith("PENDING_")) return "bg-warning-text/20 text-warning-text";
  if (status === "RETURNED")   return "bg-amber-500/20 text-amber-400";
  if (status === "GOVERNANCE_BLOCKED" || status === "REJECTED") return "bg-error-text/20 text-error-text";
  return "bg-zinc-500/20 text-foreground-muted";
}

function intentLink(post: CalendarPost): string {
  if (post.status === "RETURNED") return "/publish";
  if (typeof post.status === "string" && post.status.startsWith("PENDING_")) return "/review";
  if (post.status === "APPROVED" || post.status === "PUBLISHED" || post.status === "GOVERNANCE_BLOCKED" || post.status === "REJECTED") return "/governance";
  return "/publish";
}

function intentLinkLabel(post: CalendarPost): string {
  if (post.status === "RETURNED") return "Edit Revision in Publish Hub";
  if (typeof post.status === "string" && post.status.startsWith("PENDING_")) return "View in Review Queue";
  if (post.status === "APPROVED") return "View in Approval Console";
  if (post.status === "PUBLISHED") return "View in Governance";
  return "View in Publishing Hub";
}

function getStatusLabel(post: CalendarPost): string {
  if (post.source === "scheduled" && post.status === "SCHEDULED" && post.scheduled_time) {
    const t = new Date(post.scheduled_time);
    return `SCHEDULED · ${String(t.getHours()).padStart(2,"0")}:${String(t.getMinutes()).padStart(2,"0")}`;
  }
  if (post.status === "PUBLISHED" && post.scheduled_time) {
    const t = new Date(post.scheduled_time);
    return `PUBLISHED · ${t.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
  }
  if (post.status === "PUBLISHED")             return "PUBLISHED";
  if (post.status === "APPROVED")              return "PUBLISHING · READY";
  if (post.status.startsWith("PENDING_"))      return `PENDING · ${post.status.replace("PENDING_", "")}`;
  if (post.status === "RETURNED")              return "RETURNED";
  if (post.status === "GOVERNANCE_BLOCKED")    return "BLOCKED";
  if (post.status === "REJECTED")              return "REJECTED";
  return post.status;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const router = useRouter();
  const [currentDate, setCurrentDate]     = useState(new Date());
  const [posts, setPosts]                 = useState<CalendarPost[]>([]);
  const [loading, setLoading]             = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPost, setEditingPost]     = useState<CalendarPost | null>(null);
  const [selectedDate, setSelectedDate]   = useState(new Date());
  const [statusFilter, setStatusFilter]   = useState<"all" | "scheduled" | "publishing">("all");
  const [openMenuId, setOpenMenuId]       = useState<string | null>(null);

  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) router.push("/login");
    });
  }, [router]);

  // ── Fetch both tables in parallel ──────────────────────────────────────────

  const fetchAllPosts = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.get("/api/v1/calendar/events");
      if (result.success && Array.isArray(result.data)) {
        setPosts(result.data as CalendarPost[]);
      } else {
        setPosts([]);
      }
    } catch (err) {
      console.error("Failed to fetch calendar events:", err);
      setPosts([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAllPosts(); }, [fetchAllPosts]);

  // Auto-refresh every 60 s so newly scheduled/approved posts appear without a manual reload
  useEffect(() => {
    const id = setInterval(fetchAllPosts, 60_000);
    return () => clearInterval(id);
  }, [fetchAllPosts]);


  const handleUpdatePost = async () => {
    if (!editingPost) return;
    try {
      const result = await api.put(`/api/v1/scheduler/posts/${editingPost.id}`, {
        content: editingPost.content,
        scheduledTime: editingPost.scheduled_time,
      });
      if (result.success) {
        fetchAllPosts();
        setShowEditModal(false);
        setMessage({ type: "success", text: "Post updated successfully" });
      } else {
        setMessage({ type: "error", text: result.error || "Failed to update post" });
      }
    } catch {
      setMessage({ type: "error", text: "Failed to update post" });
    }
  };

  const handleCancelPost = async (postId: string) => {
    try {
      const result = await api.delete(`/api/v1/scheduler/posts/${postId}`);
      if (result.success) {
        setPosts((prev) => prev.filter((p) => p.id !== postId));
        setMessage({ type: "success", text: "Post cancelled successfully" });
      }
    } catch {
      setMessage({ type: "error", text: "Failed to cancel post" });
    }
  };

  // ── Calendar helpers ────────────────────────────────────────────────────────

  const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];

  const navigateWeek = (dir: number) => {
    const next = new Date(currentDate);
    next.setDate(next.getDate() + dir * 7);
    setCurrentDate(next);
    setSelectedDate(next);
  };

  const getWeekStart = (d: Date): Date => {
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() + diff);
  };
  const weekStart  = getWeekStart(currentDate);
  const weekDays   = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });
  const DAY_LABELS = ["MON","TUE","WED","THU","FRI","SAT","SUN"];

  const selDateStr   = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth()+1).padStart(2,"0")}-${String(selectedDate.getDate()).padStart(2,"0")}`;
  const postsForDay  = posts.filter(p => p.calendarDate?.startsWith(selDateStr));
  const filteredDay  = postsForDay.filter(p => {
    if (statusFilter === "scheduled")  return p.source === "scheduled";
    if (statusFilter === "publishing") return p.source === "intent";
    return true;
  });
  const upcoming     = filteredDay.filter(p => p.status !== "PUBLISHED");
  const completed    = filteredDay.filter(p => p.status === "PUBLISHED");

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 pb-24">

      {/* ── Toast ── */}
      {message && (
        <div className={`mb-4 mt-4 p-4 rounded-xl flex items-center gap-3 text-sm font-medium ${message.type === "success" ? "bg-success-text/10 border border-success-border/20 text-success-text" : "bg-error-text/10 border border-error-border/20 text-error-text"}`}>
          {message.text}
          <button onClick={() => setMessage(null)} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* ── Month header ── */}
      <div className="flex items-center justify-between py-4">
        <button onClick={() => navigateWeek(-1)} className="p-2 hover:bg-[var(--surface-hover)] rounded-xl transition-colors">
          <ChevronLeft className="w-5 h-5 text-[var(--foreground-muted)]" />
        </button>
        <div className="text-center">
          <h2 className="text-xl font-bold text-[var(--foreground)]">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          {loading && <span className="text-xs text-info-text animate-pulse">Loading…</span>}
        </div>
        <button onClick={() => navigateWeek(1)} className="p-2 hover:bg-[var(--surface-hover)] rounded-xl transition-colors">
          <ChevronRight className="w-5 h-5 text-[var(--foreground-muted)]" />
        </button>
      </div>

      {/* ── Week strip ── */}
      <div className="grid grid-cols-7 gap-1.5 mb-6">
        {weekDays.map((d, i) => {
          const isSelected = d.toDateString() === selectedDate.toDateString();
          const isToday    = d.toDateString() === new Date().toDateString();
          const ds         = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
          const hasPost    = posts.some(p => p.calendarDate?.startsWith(ds));
          return (
            <button
              key={i}
              onClick={() => setSelectedDate(new Date(d))}
              className={`flex flex-col items-center py-3 rounded-2xl border transition-all ${
                isSelected
                  ? "bg-info-text border-info-text/50 text-[var(--background)]"
                  : isToday
                    ? "bg-info-text/10 border-info-text/30 text-info-text"
                    : "bg-[var(--card)] border-[var(--border)] text-[var(--foreground-muted)] hover:border-[var(--card-border)]"
              }`}
            >
              <span className="text-[9px] font-bold tracking-widest uppercase mb-1">{DAY_LABELS[i]}</span>
              <span className={`text-lg font-bold leading-none ${isSelected ? "text-[var(--background)]" : ""}`}>{d.getDate()}</span>
              <span className={`mt-1.5 w-1.5 h-1.5 rounded-full ${hasPost ? (isSelected ? "bg-[var(--background)]" : "bg-info-text") : "bg-transparent"}`} />
            </button>
          );
        })}
      </div>

      {/* ── Filter tabs ── */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {(["all","scheduled","publishing"] as const).map((f) => {
          const labels = { all: "ALL POSTS", scheduled: "SCHEDULED", publishing: "PUBLISHING" } as const;
          const active = statusFilter === f;
          return (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-bold tracking-wide transition-colors ${
                active
                  ? "bg-info-text/15 border-info-text/40 text-info-text"
                  : "bg-[var(--card)] border-[var(--border)] text-[var(--foreground-muted)] hover:border-[var(--card-border)]"
              }`}
            >
              {f === "all"        && <Calendar className="w-3.5 h-3.5" />}
              {f === "scheduled"  && <span className="w-2 h-2 rounded-full bg-success-text inline-block" />}
              {f === "publishing" && <span className="w-2 h-2 rounded-full bg-info-text inline-block" />}
              {labels[f]}
            </button>
          );
        })}
      </div>

      {/* ── UPCOMING CONTENT ── */}
      {upcoming.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-[var(--foreground-muted)]">Upcoming Content</span>
            <span className="text-xs text-info-text font-semibold">{upcoming.length} Scheduled</span>
          </div>
          <div className="space-y-3">
            {upcoming.map((post) => (
              <div key={`up-${post.source}-${post.id}`} className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-3 flex items-start gap-3">
                {/* Thumbnail */}
                <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-[var(--surface)] flex items-center justify-center">
                  {post.media_url
                    ? <img src={post.media_url} alt="" className="w-full h-full object-cover" />
                    : <Calendar className="w-5 h-5 text-[var(--foreground-muted)]" />
                  }
                </div>
                {/* Body */}
                <div className="flex-1 min-w-0">
                  <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-md mb-1 ${statusBadgeClass(post.status)}`}>
                    {getStatusLabel(post)}
                  </span>
                  <p className="text-sm font-semibold text-[var(--foreground)] truncate">
                    {post.content.length > 48 ? post.content.slice(0, 48) + "…" : post.content}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5 text-xs text-[var(--foreground-muted)]">
                    {post.source === "scheduled" ? <Calendar className="w-3 h-3" /> : <Send className="w-3 h-3" />}
                    <span>{post.platform}</span>
                  </div>
                </div>
                {/* 3-dot menu */}
                <div className="relative">
                  <button
                    onClick={() => setOpenMenuId(openMenuId === post.id ? null : post.id)}
                    className="p-1.5 text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)] rounded-lg transition-colors"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                  {openMenuId === post.id && (
                    <div className="absolute right-0 top-8 z-20 bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-xl overflow-hidden min-w-[150px]">
                      {post.source === "scheduled" && post.status === "SCHEDULED" && (
                        <>
                          <button
                            onClick={() => { setEditingPost(post); setShowEditModal(true); setOpenMenuId(null); }}
                            className="w-full text-left flex items-center gap-2 px-3 py-2.5 text-sm text-[var(--foreground)] hover:bg-[var(--surface-hover)] transition-colors"
                          >
                            <Edit3 className="w-3.5 h-3.5" /> Edit
                          </button>
                          <button
                            onClick={() => { handleCancelPost(post.id); setOpenMenuId(null); }}
                            className="w-full text-left flex items-center gap-2 px-3 py-2.5 text-sm text-error-text hover:bg-error-text/10 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Cancel Post
                          </button>
                        </>
                      )}
                      {post.source === "intent" && (
                        <Link
                          href={intentLink(post)}
                          onClick={() => setOpenMenuId(null)}
                          className="flex items-center gap-2 px-3 py-2.5 text-sm text-[var(--foreground)] hover:bg-[var(--surface-hover)] transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" /> {intentLinkLabel(post)}
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── COMPLETED ── */}
      {completed.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-[var(--foreground-muted)]">Completed</span>
            <Link href="/library" className="flex items-center gap-1 text-xs text-info-text font-semibold hover:opacity-80 transition-opacity">
              History <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-3">
            {completed.map((post) => (
              <div key={`done-${post.source}-${post.id}`} className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-3 flex items-start gap-3">
                <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-[var(--surface)] flex items-center justify-center">
                  {post.media_url
                    ? <img src={post.media_url} alt="" className="w-full h-full object-cover" />
                    : <CheckCircle2 className="w-5 h-5 text-blue-400" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-md mb-1 ${statusBadgeClass(post.status)}`}>
                    {getStatusLabel(post)}
                  </span>
                  <p className="text-sm font-semibold text-[var(--foreground)] truncate">
                    {post.content.length > 48 ? post.content.slice(0, 48) + "…" : post.content}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5 text-xs text-[var(--foreground-muted)]">
                    {post.source === "scheduled" ? <Calendar className="w-3 h-3" /> : <Send className="w-3 h-3" />}
                    <span>{post.platform}</span>
                  </div>
                </div>
                <div className="relative">
                  <button
                    onClick={() => setOpenMenuId(openMenuId === post.id ? null : post.id)}
                    className="p-1.5 text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)] rounded-lg transition-colors"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                  {openMenuId === post.id && (
                    <div className="absolute right-0 top-8 z-20 bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-xl overflow-hidden min-w-[150px]">
                      <Link
                        href={intentLink(post)}
                        onClick={() => setOpenMenuId(null)}
                        className="flex items-center gap-2 px-3 py-2.5 text-sm text-[var(--foreground)] hover:bg-[var(--surface-hover)] transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> View Post
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Empty state ── */}
      {filteredDay.length === 0 && !loading && (
        <div className="text-center py-16 text-[var(--foreground-muted)]">
          <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">No posts on this day</p>
          <p className="text-xs mt-1 opacity-60">Select another date or create a new post</p>
        </div>
      )}

      {/* ── Menu backdrop ── */}
      {openMenuId && (
        <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
      )}

      {/* ── Edit Scheduled Post Modal ── */}
      {showEditModal && editingPost && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-t-2xl sm:rounded-2xl p-6 w-full sm:max-w-lg">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-[var(--foreground)]">Edit Scheduled Post</h3>
              <button onClick={() => setShowEditModal(false)} className="text-[var(--foreground-muted)] hover:text-[var(--foreground)]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[var(--foreground-muted)] mb-1">Content</label>
                <textarea
                  value={editingPost.content}
                  onChange={(e) => setEditingPost({ ...editingPost, content: e.target.value })}
                  className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-[var(--foreground)] text-sm outline-none focus:border-info-border min-h-[120px]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[var(--foreground-muted)] mb-1">Scheduled Time</label>
                <input
                  type="datetime-local"
                  value={(editingPost.scheduled_time ?? "").slice(0, 16)}
                  onChange={(e) => setEditingPost({ ...editingPost, scheduled_time: new Date(e.target.value).toISOString() })}
                  className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-[var(--foreground)] text-sm outline-none focus:border-info-border"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleUpdatePost}
                  className="flex-1 bg-info-text hover:bg-info-text text-foreground font-bold py-3 px-4 rounded-xl transition-colors"
                >
                  Save Changes
                </button>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="px-6 py-3 bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-[var(--foreground)] font-bold rounded-xl transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── FAB ── */}
      <Link
        href="/publish"
        className="fixed bottom-6 right-6 z-30 w-14 h-14 bg-info-text rounded-2xl flex items-center justify-center shadow-lg hover:opacity-90 transition-opacity md:hidden"
      >
        <span className="text-2xl font-light text-[var(--background)] leading-none">+</span>
      </Link>

    </div>
  );
}
