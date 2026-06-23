"use client";

import React, { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import {
  BarChart2, MessageSquare, Rss, Users,
  ThumbsUp, Share2, Eye, TrendingUp, RefreshCw,
  Send, Trash2, ChevronRight, AlertCircle, Loader2,
  Building2, MousePointerClick,
} from "lucide-react";

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  );
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface LIAccount {
  id: string;
  account_name: string;
  account_handle: string;
  avatar_url: string | null;
}

interface LIPost {
  urn: string;
  text: string;
  published_at: string | null;
  likes: number;
  comments: number;
  shares: number;
  impressions: number;
  post_url: string;
  thumbnail: string | null;
}

interface LIComment {
  urn: string;
  actor_urn: string;
  actor_name: string;
  actor_image: string | null;
  text: string;
  created_at: string | null;
  likes: number;
  reply_count: number;
}

interface LIAnalytics {
  followers: {
    total: number | null;
    organic_gain: number;
    paid_gain: number;
    by_seniority: { label: string; count: number }[];
    by_industry: { label: string; count: number }[];
  };
  content: {
    impressions: number | null;
    clicks: number | null;
    likes: number | null;
    comments: number | null;
    shares: number | null;
    engagement_rate: number | null;
  };
}

type Tab = "feed" | "comments" | "analytics";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(iso: string | null): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function fmt(n: number | null): string {
  if (n === null || n === undefined) return "--";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LinkedInCommunityPage() {
  const [accounts, setAccounts]       = useState<LIAccount[]>([]);
  const [selectedId, setSelectedId]   = useState<string>("");
  const [tab, setTab]                 = useState<Tab>("feed");

  // Feed state
  const [posts, setPosts]               = useState<LIPost[]>([]);
  const [feedLoading, setFeedLoading]   = useState(false);
  const [feedError, setFeedError]       = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);

  // Comments state
  const [selectedPost, setSelectedPost] = useState<LIPost | null>(null);
  const [comments, setComments]         = useState<LIComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [replyText, setReplyText]       = useState("");
  const [replying, setReplying]         = useState(false);
  const [deletingUrn, setDeletingUrn]   = useState<string | null>(null);

  // Analytics state
  const [analytics, setAnalytics]     = useState<LIAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  const [error, setError]             = useState<string | null>(null);

  // Load LinkedIn page accounts
  useEffect(() => {
    api.get("/api/v1/accounts").then((res) => {
      const liPages = (res.data || []).filter(
        (a: any) => a.platform === "linkedin" && (a.account_handle || "").startsWith("urn:li:organization:")
      );
      setAccounts(liPages);
      if (liPages.length > 0) setSelectedId(liPages[0].id);
    }).catch(() => setError("Failed to load LinkedIn accounts"));
  }, []);

  const loadFeed = useCallback(async () => {
    if (!selectedId) return;
    setFeedLoading(true);
    setFeedError(null);
    setPermissionDenied(false);
    try {
      const res = await api.get(`/api/v1/linkedin/${selectedId}/feed`);
      if (res.data?.success) {
        setPosts(res.data.data.posts || []);
        if (res.data.data.permission_denied) {
          setPermissionDenied(true);
        } else if (res.data.data.error) {
          setFeedError(res.data.data.error);
        }
      }
    } catch {
      setFeedError("Failed to load feed");
    } finally {
      setFeedLoading(false);
    }
  }, [selectedId]);

  const loadAnalytics = useCallback(async () => {
    if (!selectedId) return;
    setAnalyticsLoading(true);
    try {
      const res = await api.get(`/api/v1/linkedin/${selectedId}/analytics`);
      if (res.data?.success) setAnalytics(res.data.data);
    } catch { /* non-blocking */ }
    finally { setAnalyticsLoading(false); }
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId) return;
    if (tab === "feed" || tab === "comments") loadFeed();
    if (tab === "analytics") loadAnalytics();
  }, [selectedId, tab, loadFeed, loadAnalytics]);

  const loadComments = useCallback(async (post: LIPost) => {
    setSelectedPost(post);
    setComments([]);
    setCommentsLoading(true);
    try {
      const res = await api.get(`/api/v1/linkedin/${selectedId}/comments?postUrn=${encodeURIComponent(post.urn)}`);
      if (res.data?.success) setComments(res.data.data.comments || []);
    } catch { /* non-blocking */ }
    finally { setCommentsLoading(false); }
  }, [selectedId]);

  const handleReply = async () => {
    if (!selectedPost || !replyText.trim() || !selectedId) return;
    setReplying(true);
    try {
      await api.post(`/api/v1/linkedin/${selectedId}/reply`, {
        postUrn: selectedPost.urn,
        text: replyText.trim(),
      });
      setReplyText("");
      await loadComments(selectedPost);
    } catch {
      alert("Failed to post reply. Check your LinkedIn permissions.");
    } finally {
      setReplying(false);
    }
  };

  const handleDeleteComment = async (commentUrn: string) => {
    if (!window.confirm("Delete this comment? This cannot be undone.")) return;
    setDeletingUrn(commentUrn);
    try {
      await api.delete(`/api/v1/linkedin/${selectedId}/comment?commentUrn=${encodeURIComponent(commentUrn)}`);
      setComments((prev) => prev.filter((c) => c.urn !== commentUrn));
    } catch {
      alert("Failed to delete comment. Check your LinkedIn permissions.");
    } finally {
      setDeletingUrn(null);
    }
  };

  // ── Empty / No accounts state ──────────────────────────────────────────────
  if (accounts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-14 h-14 rounded-2xl bg-[#0077B5]/10 flex items-center justify-center">
          <LinkedInIcon className="w-7 h-7 text-[#0077B5]" />
        </div>
        <h2 className="text-base font-semibold text-foreground">No LinkedIn Pages Connected</h2>
        <p className="text-sm text-foreground-muted text-center max-w-sm">
          Connect a LinkedIn Company Page in Accounts to use Community Management.
          You need the Community Management API access from LinkedIn.
        </p>
        <a
          href="/accounts"
          className="px-4 py-2 rounded-lg bg-[#0077B5] text-white text-sm font-medium hover:bg-[#0077B5]/90 transition-colors"
        >
          Go to Accounts
        </a>
      </div>
    );
  }

  const selectedAccount = accounts.find((a) => a.id === selectedId);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0077B5]/10 flex items-center justify-center">
            <LinkedInIcon className="w-5 h-5 text-[#0077B5]" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">LinkedIn Community</h1>
            <p className="text-xs text-foreground-muted">Posts · Comments · Page Analytics</p>
          </div>
        </div>

        {/* Account selector */}
        <div className="flex items-center gap-3">
          {accounts.length > 1 && (
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="text-sm bg-surface border border-border rounded-lg px-3 py-1.5 text-foreground"
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.account_name}</option>
              ))}
            </select>
          )}
          {accounts.length === 1 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-surface">
              <Building2 className="w-3.5 h-3.5 text-[#0077B5]" />
              <span className="text-sm font-medium text-foreground">{selectedAccount?.account_name}</span>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-error-text/10 border border-error-text/20 text-sm text-error-text">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* ── Tabs ── */}
      <div className="flex items-center gap-1 border-b border-border">
        {([
          { key: "feed",      label: "Post Feed",   icon: Rss },
          { key: "comments",  label: "Comments",    icon: MessageSquare },
          { key: "analytics", label: "Analytics",   icon: BarChart2 },
        ] as { key: Tab; label: string; icon: React.ElementType }[]).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === key
                ? "border-[#0077B5] text-[#0077B5]"
                : "border-transparent text-foreground-muted hover:text-foreground"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════════ FEED TAB ════════════════════════════════ */}
      {tab === "feed" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-foreground-muted">Last 20 published posts from your LinkedIn Page</p>
            <button
              onClick={loadFeed}
              disabled={feedLoading}
              className="flex items-center gap-1.5 text-xs text-foreground-muted hover:text-foreground transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${feedLoading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>

          {feedLoading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-[#0077B5]" />
            </div>
          )}

          {permissionDenied && (
            <div className="rounded-xl border border-[#0077B5]/25 bg-[#0077B5]/5 p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#0077B5]/15 flex items-center justify-center shrink-0">
                  <LinkedInIcon className="w-5 h-5 text-[#0077B5]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Community Management API — Standard Tier Pending</p>
                  <p className="text-xs text-foreground-muted mt-0.5">
                    LinkedIn has not yet approved your app for Standard tier access. Reading posts, comments, and analytics requires this approval.
                  </p>
                </div>
              </div>
              <div className="space-y-2 pl-12">
                <p className="text-xs font-semibold text-foreground-muted uppercase tracking-widest">Steps to get approved</p>
                {[
                  { step: "1", text: "Go to developer.linkedin.com/apps and open your app" },
                  { step: "2", text: "Click the Products tab" },
                  { step: "3", text: "Find Community Management API → click Request Access" },
                  { step: "4", text: "Fill in the use case form — explain you're managing your company page" },
                  { step: "5", text: "Wait for LinkedIn email confirmation (usually 1–3 business days)" },
                ].map(({ step, text }) => (
                  <div key={step} className="flex items-start gap-2 text-xs text-foreground-muted">
                    <span className="w-4 h-4 rounded-full bg-[#0077B5]/20 text-[#0077B5] flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">{step}</span>
                    <span>{text}</span>
                  </div>
                ))}
              </div>
              <div className="pl-12">
                <p className="text-[11px] text-foreground-muted/70">
                  Publishing posts to LinkedIn still works — only reading community data (feed, comments, analytics) requires Standard tier.
                </p>
              </div>
            </div>
          )}

          {!permissionDenied && feedError && (
            <div className="flex items-center gap-2 p-4 rounded-xl border border-border bg-surface text-sm text-foreground-muted">
              <AlertCircle className="w-4 h-4 shrink-0 text-error-text" />
              <span>{feedError}</span>
            </div>
          )}

          {!feedLoading && !feedError && !permissionDenied && posts.length === 0 && (
            <div className="text-center py-16 text-sm text-foreground-muted">
              No posts found. Make sure your LinkedIn Page has published content.
            </div>
          )}

          {!feedLoading && posts.map((post) => (
            <div key={post.urn} className="rounded-xl border border-border bg-surface p-5 space-y-3 hover:border-border/80 transition-colors">
              <div className="flex items-start gap-4">
                {post.thumbnail && (
                  <img
                    src={post.thumbnail}
                    alt=""
                    className="w-16 h-16 rounded-lg object-cover shrink-0 border border-border"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground leading-relaxed line-clamp-3">{post.text || "(No text)"}</p>
                  <p className="text-[11px] text-foreground-muted mt-1">{timeAgo(post.published_at)}</p>
                </div>
              </div>

              {/* Metrics row */}
              <div className="flex items-center gap-5 pt-2 border-t border-border/40">
                <span className="flex items-center gap-1.5 text-xs text-foreground-muted">
                  <ThumbsUp className="w-3.5 h-3.5" />{fmt(post.likes)}
                </span>
                <span className="flex items-center gap-1.5 text-xs text-foreground-muted">
                  <MessageSquare className="w-3.5 h-3.5" />{fmt(post.comments)}
                </span>
                <span className="flex items-center gap-1.5 text-xs text-foreground-muted">
                  <Share2 className="w-3.5 h-3.5" />{fmt(post.shares)}
                </span>
                {post.impressions > 0 && (
                  <span className="flex items-center gap-1.5 text-xs text-foreground-muted">
                    <Eye className="w-3.5 h-3.5" />{fmt(post.impressions)}
                  </span>
                )}
                <div className="ml-auto flex items-center gap-2">
                  <a
                    href={post.post_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[#0077B5] hover:underline"
                  >
                    View on LinkedIn
                  </a>
                  <button
                    onClick={() => { setTab("comments"); loadComments(post); }}
                    className="flex items-center gap-1 text-xs text-foreground-muted hover:text-foreground px-2 py-1 rounded border border-border hover:border-[#0077B5]/40 transition-colors"
                  >
                    Comments <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ════════════════════════════════════════ COMMENTS TAB ══════════════════════════ */}
      {tab === "comments" && (
        <div className="space-y-4">
          {/* Post selector */}
          {posts.length > 0 && (
            <div>
              <label className="text-xs font-medium text-foreground-muted uppercase tracking-widest mb-2 block">
                Select Post
              </label>
              <select
                value={selectedPost?.urn || ""}
                onChange={(e) => {
                  const p = posts.find((p) => p.urn === e.target.value);
                  if (p) loadComments(p);
                }}
                className="w-full text-sm bg-surface border border-border rounded-lg px-3 py-2 text-foreground"
              >
                <option value="">— Choose a post —</option>
                {posts.map((p) => (
                  <option key={p.urn} value={p.urn}>
                    {p.text.slice(0, 80) || "(No text)"} · {timeAgo(p.published_at)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {!selectedPost && posts.length === 0 && !feedLoading && (
            <div className="text-center py-10 text-sm text-foreground-muted">
              {permissionDenied
                ? "Community Management API Standard tier required. See the Feed tab for approval steps."
                : "Load the Feed tab first, then select a post to view its comments."}
            </div>
          )}

          {selectedPost && (
            <>
              {/* Post summary */}
              <div className="rounded-xl border border-[#0077B5]/20 bg-[#0077B5]/5 p-4">
                <p className="text-sm text-foreground line-clamp-2">{selectedPost.text}</p>
                <div className="flex items-center gap-4 mt-2 text-xs text-foreground-muted">
                  <span className="flex items-center gap-1"><ThumbsUp className="w-3 h-3" />{fmt(selectedPost.likes)}</span>
                  <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" />{fmt(selectedPost.comments)} comments</span>
                  <span>{timeAgo(selectedPost.published_at)}</span>
                </div>
              </div>

              {/* Reply composer */}
              <div className="rounded-xl border border-border bg-surface p-4 space-y-3">
                <p className="text-xs font-medium text-foreground-muted uppercase tracking-widest">Reply as Page</p>
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Write a reply from your LinkedIn Page..."
                  rows={3}
                  className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2 text-foreground placeholder-foreground-muted/50 resize-none focus:outline-none focus:border-[#0077B5]/60"
                />
                <div className="flex justify-end">
                  <button
                    onClick={handleReply}
                    disabled={!replyText.trim() || replying}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0077B5] text-white text-sm font-medium disabled:opacity-50 hover:bg-[#0077B5]/90 transition-colors"
                  >
                    {replying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    Post Reply
                  </button>
                </div>
              </div>

              {/* Comments list */}
              {commentsLoading && (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="w-5 h-5 animate-spin text-[#0077B5]" />
                </div>
              )}

              {!commentsLoading && comments.length === 0 && (
                <div className="text-center py-10 text-sm text-foreground-muted">No comments on this post yet.</div>
              )}

              {!commentsLoading && comments.map((c) => (
                <div key={c.urn} className="rounded-xl border border-border bg-surface p-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      {c.actor_image ? (
                        <img src={c.actor_image} alt={c.actor_name} className="w-8 h-8 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-[#0077B5]/15 flex items-center justify-center shrink-0">
                          <span className="text-[11px] font-bold text-[#0077B5]">{c.actor_name.charAt(0)}</span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-foreground">{c.actor_name}</span>
                          <span className="text-[10px] text-foreground-muted">{timeAgo(c.created_at)}</span>
                        </div>
                        <p className="text-sm text-foreground mt-1 leading-relaxed">{c.text}</p>
                        <div className="flex items-center gap-3 mt-1.5 text-[10px] text-foreground-muted">
                          {c.likes > 0 && <span className="flex items-center gap-1"><ThumbsUp className="w-3 h-3" />{c.likes}</span>}
                          {c.reply_count > 0 && <span>{c.reply_count} repl{c.reply_count === 1 ? "y" : "ies"}</span>}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteComment(c.urn)}
                      disabled={deletingUrn === c.urn}
                      title="Delete comment"
                      className="p-1.5 rounded-lg text-foreground-muted hover:text-error-text hover:bg-error-text/10 transition-colors disabled:opacity-50"
                    >
                      {deletingUrn === c.urn ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════ ANALYTICS TAB ═════════════════════════ */}
      {tab === "analytics" && (
        <div className="space-y-6">
          {analyticsLoading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-[#0077B5]" />
            </div>
          )}

          {!analyticsLoading && !analytics && (
            <div className="rounded-xl border border-[#0077B5]/25 bg-[#0077B5]/5 p-6 text-sm text-foreground-muted text-center">
              Analytics unavailable — LinkedIn Community Management API (Standard tier) approval required.
              Once approved, reconnect your LinkedIn page to activate analytics.
            </div>
          )}

          {!analyticsLoading && analytics && (
            <>
              {/* KPI cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Followers",       value: fmt(analytics.followers.total),          icon: Users,             color: "#0077B5" },
                  { label: "Follower Gain",   value: `+${fmt(analytics.followers.organic_gain + analytics.followers.paid_gain)}`, icon: TrendingUp, color: "#10b981" },
                  { label: "Impressions",     value: fmt(analytics.content.impressions),       icon: Eye,               color: "#8b5cf6" },
                  { label: "Engagement Rate", value: analytics.content.engagement_rate != null ? `${(analytics.content.engagement_rate * 100).toFixed(2)}%` : "--", icon: BarChart2, color: "#f59e0b" },
                ].map(({ label, value, icon: Icon, color }) => (
                  <div key={label} className="rounded-xl border border-border bg-surface p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${color}18` }}>
                        <Icon className="w-3.5 h-3.5" style={{ color }} />
                      </div>
                      <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-widest">{label}</p>
                    </div>
                    <p className="text-2xl font-bold text-foreground">{value}</p>
                  </div>
                ))}
              </div>

              {/* Content performance */}
              <div className="rounded-xl border border-border bg-surface p-5">
                <h3 className="text-sm font-semibold text-foreground mb-4">Content Performance (All Time)</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                  {[
                    { label: "Impressions", value: fmt(analytics.content.impressions), icon: Eye },
                    { label: "Clicks",      value: fmt(analytics.content.clicks),      icon: MousePointerClick },
                    { label: "Likes",       value: fmt(analytics.content.likes),       icon: ThumbsUp },
                    { label: "Comments",    value: fmt(analytics.content.comments),    icon: MessageSquare },
                    { label: "Shares",      value: fmt(analytics.content.shares),      icon: Share2 },
                  ].map(({ label, value, icon: Icon }) => (
                    <div key={label} className="text-center">
                      <Icon className="w-4 h-4 text-[#0077B5] mx-auto mb-1" />
                      <p className="text-lg font-bold text-foreground">{value}</p>
                      <p className="text-[10px] text-foreground-muted uppercase tracking-wider">{label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Follower breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {analytics.followers.by_seniority.length > 0 && (
                  <div className="rounded-xl border border-border bg-surface p-5">
                    <h3 className="text-sm font-semibold text-foreground mb-4">Followers by Seniority</h3>
                    <div className="space-y-2">
                      {analytics.followers.by_seniority.map((row) => {
                        const total = analytics.followers.by_seniority.reduce((s, r) => s + r.count, 0);
                        const pct = total > 0 ? Math.round((row.count / total) * 100) : 0;
                        return (
                          <div key={row.label}>
                            <div className="flex justify-between text-xs mb-0.5">
                              <span className="text-foreground-muted capitalize">{row.label.toLowerCase().replace(/_/g, " ")}</span>
                              <span className="text-foreground font-medium">{fmt(row.count)} <span className="text-foreground-muted">({pct}%)</span></span>
                            </div>
                            <div className="h-1.5 rounded-full bg-border overflow-hidden">
                              <div className="h-full rounded-full bg-[#0077B5]" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {analytics.followers.by_industry.length > 0 && (
                  <div className="rounded-xl border border-border bg-surface p-5">
                    <h3 className="text-sm font-semibold text-foreground mb-4">Followers by Industry</h3>
                    <div className="space-y-2">
                      {analytics.followers.by_industry.map((row) => {
                        const total = analytics.followers.by_industry.reduce((s, r) => s + r.count, 0);
                        const pct = total > 0 ? Math.round((row.count / total) * 100) : 0;
                        return (
                          <div key={row.label}>
                            <div className="flex justify-between text-xs mb-0.5">
                              <span className="text-foreground-muted capitalize">{row.label.toLowerCase().replace(/_/g, " ")}</span>
                              <span className="text-foreground font-medium">{fmt(row.count)} <span className="text-foreground-muted">({pct}%)</span></span>
                            </div>
                            <div className="h-1.5 rounded-full bg-border overflow-hidden">
                              <div className="h-full rounded-full bg-[#0077B5]/70" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {analytics.followers.by_seniority.length === 0 && analytics.followers.by_industry.length === 0 && (
                  <div className="col-span-2 text-center py-6 text-sm text-foreground-muted rounded-xl border border-border bg-surface">
                    Follower demographic data not yet available. This updates as your page grows.
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
