"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft, ChevronRight, Calendar, Clock, X,
  Edit3, Trash2, Send, ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { formatDateTime } from "@/lib/utils";
import { api } from "@/lib/api";

// ── Raw shapes returned by each API ──────────────────────────────────────────

interface ScheduledPost {
  id: string;
  content: string;
  platform: string;
  scheduled_time: string;
  status: string;
  media_url?: string;
  created_at: string;
}

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
  scheduled_time?: string; // only for source=scheduled
  campaign_id?: string | null;
  project_id?: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function pillClass(post: CalendarPost): string {
  if (post.source === "scheduled") {
    if (post.status === "SCHEDULED") return "bg-success-text/10 text-success-text hover:bg-success-text/20";
    if (post.status === "PUBLISHED")  return "bg-blue-500/10 text-blue-400";
    return "bg-error-text/10 text-error-text";
  }
  // publish_intent
  if (post.status === "APPROVED" || post.status === "PUBLISHED") return "bg-blue-500/10 text-blue-300 hover:bg-blue-500/20";
  if (typeof post.status === "string" && post.status.startsWith("PENDING_")) return "bg-warning-text/10 text-warning-text hover:bg-warning-text/20";
  if (post.status === "GOVERNANCE_BLOCKED" || post.status === "REJECTED") return "bg-error-text/10 text-error-text";
  return "bg-violet-500/10 text-violet-400 hover:bg-violet-500/20";
}

function statusBadgeClass(status: string): string {
  if (status === "SCHEDULED")  return "bg-success-text/20 text-success-text";
  if (status === "PUBLISHED")  return "bg-blue-500/20 text-blue-400";
  if (status === "APPROVED")   return "bg-sky-500/20 text-sky-400";
  if (status.startsWith("PENDING_")) return "bg-warning-text/20 text-warning-text";
  if (status === "GOVERNANCE_BLOCKED" || status === "REJECTED") return "bg-error-text/20 text-error-text";
  return "bg-zinc-500/20 text-foreground-muted";
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const router = useRouter();
  const [currentDate, setCurrentDate]     = useState(new Date());
  const [posts, setPosts]                 = useState<CalendarPost[]>([]);
  const [loading, setLoading]             = useState(true);
  const [selectedPost, setSelectedPost]   = useState<CalendarPost | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPost, setEditingPost]     = useState<ScheduledPost | null>(null);

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
      const [scheduledResult, intentsResult] = await Promise.all([
        api.get("/api/v1/scheduler/posts?limit=200"),
        api.get("/api/v1/governance/intents"),
      ]);

      const scheduledPosts: CalendarPost[] =
        scheduledResult.success && scheduledResult.posts
          ? scheduledResult.posts.map((p: ScheduledPost) => ({
              id: p.id,
              content: p.content,
              platform: p.platform,
              calendarDate: p.scheduled_time,
              status: p.status,
              media_url: p.media_url,
              created_at: p.created_at,
              source: "scheduled" as const,
              scheduled_time: p.scheduled_time,
            }))
          : [];

      const intentPosts: CalendarPost[] =
        intentsResult.success && intentsResult.data
          ? intentsResult.data.map((p: any) => ({
              id: p.id,
              content: p.content,
              platform: p.platform,
              calendarDate: p.created_at,
              status: p.status,
              media_url: p.media_url,
              created_at: p.created_at,
              source: "intent" as const,
              campaign_id: p.campaign_id,
              project_id: p.project_id,
            }))
          : [];

      setPosts([...scheduledPosts, ...intentPosts]);
    } catch (err) {
      console.error("Failed to fetch posts:", err);
      setPosts([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAllPosts(); }, [fetchAllPosts]);


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
        setSelectedPost(null);
        setMessage({ type: "success", text: "Post cancelled successfully" });
      }
    } catch {
      setMessage({ type: "error", text: "Failed to cancel post" });
    }
  };

  // ── Calendar helpers ────────────────────────────────────────────────────────

  const getDaysInMonth = (date: Date) => {
    const year  = date.getFullYear();
    const month = date.getMonth();
    const firstDay   = new Date(year, month, 1);
    const lastDay    = new Date(year, month + 1, 0);
    const daysInMonth  = lastDay.getDate();
    const startingDay  = firstDay.getDay();
    return { daysInMonth, startingDay };
  };

  const { daysInMonth, startingDay } = getDaysInMonth(currentDate);

  const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const dayNames   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

  const getPostsForDay = (day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return posts.filter((p) => p.calendarDate.startsWith(dateStr));
  };

  const navigateMonth = (direction: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + direction, 1));
  };

  const scheduledCount = posts.filter((p) => p.source === "scheduled" && p.status === "SCHEDULED").length;
  const intentCount    = posts.filter((p) => p.source === "intent").length;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-7xl mx-auto pb-12 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)] mb-2">Content Calendar</h1>
        <p className="text-[var(--foreground-muted)] text-sm font-medium">
          Unified view of scheduled posts and Publishing Hub submissions across all platforms.
        </p>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 text-sm font-medium animate-in slide-in-from-top-4 ${message.type === "success" ? "bg-success-text/10 border border-success-border/20 text-success-text" : "bg-error-text/10 border border-error-border/20 text-error-text"}`}>
          {message.text}
          <button onClick={() => setMessage(null)} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* ── Calendar ── */}
        <div className="lg:col-span-3">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-[var(--border)]">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <button onClick={() => navigateMonth(-1)} className="p-2 hover:bg-[var(--surface-hover)] rounded-lg transition-colors">
                    <ChevronLeft className="w-5 h-5 text-[var(--foreground-muted)]" />
                  </button>
                  <h2 className="text-xl font-bold text-[var(--foreground)]">
                    {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                  </h2>
                  <button onClick={() => navigateMonth(1)} className="p-2 hover:bg-[var(--surface-hover)] rounded-lg transition-colors">
                    <ChevronRight className="w-5 h-5 text-[var(--foreground-muted)]" />
                  </button>
                </div>
                <button onClick={() => setCurrentDate(new Date())} className="text-sm text-info-text hover:text-info-text font-medium">
                  Today
                </button>
              </div>

              {/* Legend */}
              <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--foreground-muted)]">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-success-text/30 border border-success-border/50 inline-block" />
                  <Calendar className="w-3 h-3" />
                  <span>Scheduled ({scheduledCount})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-warning-text/30 border border-warning-border/50 inline-block" />
                  <Send className="w-3 h-3" />
                  <span>Publishing Hub ({intentCount})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-blue-500/30 border border-blue-500/50 inline-block" />
                  <span>Published</span>
                </div>
                {loading && <span className="text-info-text animate-pulse">Loading…</span>}
              </div>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 border-b border-[var(--border)]">
              {dayNames.map((day) => (
                <div key={day} className="p-3 text-center text-xs font-bold text-[var(--foreground-muted)] uppercase tracking-wider">
                  {day}
                </div>
              ))}
            </div>

            {/* Grid */}
            <div className="grid grid-cols-7">
              {Array.from({ length: startingDay }).map((_, i) => (
                <div key={`empty-${i}`} className="min-h-[120px] bg-[var(--surface)]/30 border-b border-r border-[var(--border)]/50" />
              ))}

              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day      = i + 1;
                const dayPosts = getPostsForDay(day);
                const isToday  = new Date().toDateString() === new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString();

                return (
                  <div
                    key={day}
                    className={`min-h-[120px] border-b border-r border-[var(--border)]/50 p-2 ${isToday ? "bg-info-text/5" : "bg-[var(--card)]/30"}`}
                  >
                    <div className={`text-sm font-medium mb-2 ${isToday ? "text-info-text" : "text-[var(--foreground-muted)]"}`}>
                      {day}
                    </div>
                    <div className="space-y-1">
                      {dayPosts.slice(0, 2).map((post) => (
                        <button
                          key={post.id}
                          onClick={() => setSelectedPost(post)}
                          className={`w-full text-left text-xs p-1.5 rounded truncate transition-colors flex items-center gap-1 ${pillClass(post)}`}
                        >
                          {post.source === "intent"
                            ? <Send className="w-2.5 h-2.5 shrink-0" />
                            : <Calendar className="w-2.5 h-2.5 shrink-0" />
                          }
                          {post.platform}
                        </button>
                      ))}
                      {dayPosts.length > 2 && (
                        <div className="text-xs text-[var(--foreground-muted)]">+{dayPosts.length - 2} more</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected Post Detail */}
          {selectedPost && (
            <div className="mt-6 bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-[var(--foreground)]">Post Details</h3>
                <button onClick={() => setSelectedPost(null)} className="text-[var(--foreground-muted)] hover:text-[var(--foreground)]">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid gap-4">
                <div className="flex items-center gap-3 flex-wrap text-sm">
                  {/* Source badge */}
                  <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${selectedPost.source === "scheduled" ? "bg-success-text/20 text-success-text" : "bg-warning-text/20 text-warning-text"}`}>
                    {selectedPost.source === "scheduled" ? <Calendar className="w-3 h-3" /> : <Send className="w-3 h-3" />}
                    {selectedPost.source === "scheduled" ? "AI Scheduled" : "Publishing Hub"}
                  </span>
                  {/* Platform */}
                  <span className="px-3 py-1 bg-info-text/20 text-info-text rounded-full text-xs font-bold">
                    {selectedPost.platform}
                  </span>
                  {/* Status */}
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusBadgeClass(selectedPost.status)}`}>
                    {selectedPost.status.replace("PENDING_", "Pending: ")}
                  </span>
                </div>

                <p className="text-[var(--foreground)] text-sm">{selectedPost.content}</p>

                <div className="flex items-center gap-2 text-[var(--foreground-muted)] text-sm">
                  <Clock className="w-4 h-4" />
                  {selectedPost.source === "scheduled" && selectedPost.scheduled_time
                    ? formatDateTime(selectedPost.scheduled_time)
                    : `Submitted ${formatDateTime(selectedPost.created_at)}`
                  }
                </div>

                {/* Actions: only scheduled posts can be edited/cancelled */}
                {selectedPost.source === "scheduled" && selectedPost.status === "SCHEDULED" && (
                  <div className="flex gap-3 mt-2">
                    <button
                      onClick={() => {
                        setEditingPost({
                          id: selectedPost.id,
                          content: selectedPost.content,
                          platform: selectedPost.platform,
                          scheduled_time: selectedPost.scheduled_time!,
                          status: selectedPost.status,
                          media_url: selectedPost.media_url,
                          created_at: selectedPost.created_at,
                        });
                        setShowEditModal(true);
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-info-text hover:bg-info-text text-foreground text-sm font-bold rounded-xl transition-colors"
                    >
                      <Edit3 className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleCancelPost(selectedPost.id)}
                      className="flex items-center gap-2 px-4 py-2 bg-error-text/20 hover:bg-error-text/30 text-error-text text-sm font-bold rounded-xl transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      Cancel
                    </button>
                  </div>
                )}

                {/* Publishing Hub: link to governance queue */}
                {selectedPost.source === "intent" && (
                  <Link
                    href="/publish"
                    className="inline-flex items-center gap-2 px-4 py-2 w-fit bg-warning-text/20 hover:bg-warning-text/30 text-warning-text text-sm font-bold rounded-xl transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View in Publishing Hub
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Right Sidebar ── */}
        <div className="space-y-6">
          {/* Upcoming — merged list */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6">
            <h3 className="text-lg font-bold text-[var(--foreground)] mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-info-text" />
              Upcoming
              <span className="ml-auto text-xs font-normal text-[var(--foreground-muted)]">
                {posts.filter((p) => p.status === "SCHEDULED" || (p.source === "intent" && p.status.startsWith("PENDING_"))).length} pending
              </span>
            </h3>

            <div className="space-y-2 max-h-[360px] overflow-y-auto">
              {posts
                .filter((p) =>
                  p.status === "SCHEDULED" ||
                  (p.source === "intent" && (p.status.startsWith("PENDING_") || p.status === "APPROVED"))
                )
                .sort((a, b) => a.calendarDate.localeCompare(b.calendarDate))
                .slice(0, 10)
                .map((post) => (
                  <button
                    key={`${post.source}-${post.id}`}
                    onClick={() => setSelectedPost(post)}
                    className="w-full text-left p-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl hover:border-[var(--card-border)] transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        {post.source === "intent"
                          ? <Send className="w-3 h-3 text-warning-text" />
                          : <Calendar className="w-3 h-3 text-success-text" />
                        }
                        <span className={`text-xs font-bold ${post.source === "intent" ? "text-warning-text" : "text-info-text"}`}>
                          {post.platform}
                        </span>
                      </div>
                      <span className="text-xs text-[var(--foreground-muted)]">
                        {post.source === "scheduled" && post.scheduled_time
                          ? formatDateTime(post.scheduled_time)
                          : formatDateTime(post.created_at)
                        }
                      </span>
                    </div>
                    <p className="text-xs text-[var(--foreground-muted)] truncate">{post.content}</p>
                  </button>
                ))
              }
              {posts.filter((p) =>
                p.status === "SCHEDULED" ||
                (p.source === "intent" && (p.status.startsWith("PENDING_") || p.status === "APPROVED"))
              ).length === 0 && (
                <p className="text-sm text-[var(--foreground-muted)] text-center py-4">No pending posts</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Edit Scheduled Post Modal ── */}
      {showEditModal && editingPost && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 w-full max-w-lg">
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
                  value={editingPost.scheduled_time.slice(0, 16)}
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

    </div>
  );
}
