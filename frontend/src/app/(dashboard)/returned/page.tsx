"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  RotateCcw, AlertTriangle, RefreshCcw,
  CheckCircle2, ArrowRight, Pencil, Send, MessageSquare, ExternalLink,
} from "lucide-react";
import { api } from "@/lib/api";
import { supabase } from "@/lib/supabase";

// ── Types ──────────────────────────────────────────────────────────────────

interface ReviewQueueItem {
  id: string;
  item_type: string;
  source_module: string;
  title: string;
  content_snapshot: {
    copy?: string;
    violation_reason?: string;
    urls?: string[];
    platform_captions?: Record<string, string>;
    topic?: string;
  };
  platform?: string;
  submitter_name?: string;
  submitted_by: string;
  status: string;
  priority: string;
  risk_level: string;
  submitted_at: string;
}

interface ApprovalItem {
  id: string;
  title: string;
  item_type: string;
  source_module: string;
  source_entity_id?: string;
  platform?: string;
  submitter_name?: string;
  submitted_by: string;
  approval_status: string;
  risk_level: string;
  last_activity?: string;
  next_action?: string;
  created_at: string;
}

interface ReviewNote {
  id: string;
  note_body: string;
  created_by: string;
  created_at: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function formatRelative(d?: string) {
  if (!d) return "—";
  const diff = Date.now() - new Date(d).getTime();
  const h = Math.floor(diff / 3600000);
  const m = Math.floor(diff / 60000);
  if (h > 24 * 7) return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  if (h > 24) return `${Math.floor(h / 24)}d ago`;
  if (h > 0) return `${h}h ago`;
  if (m > 0) return `${m}m ago`;
  return "Just now";
}

const RISK_CONFIG: Record<string, string> = {
  LOW: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  MEDIUM: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  HIGH: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  CRITICAL: "bg-red-500/10 text-red-400 border-red-500/20",
};

const PLATFORM_COLOR: Record<string, string> = {
  instagram: "text-pink-400",
  facebook: "text-blue-400",
  twitter: "text-sky-400",
  linkedin: "text-blue-300",
  tiktok: "text-purple-400",
};

// ── Review Queue Card ──────────────────────────────────────────────────────

function ReviewCard({
  item,
  onResubmit,
}: {
  item: ReviewQueueItem;
  onResubmit: (id: string) => Promise<void>;
}) {
  const [notes, setNotes] = useState<ReviewNote[]>([]);
  const [notesLoading, setNotesLoading] = useState(true);
  const [resubmitting, setResubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [resubmitError, setResubmitError] = useState<string | null>(null);

  useEffect(() => {
    api.get(`/api/v1/review-queue/items/${item.id}/notes`)
      .then(r => setNotes(r.data || []))
      .catch(() => {})
      .finally(() => setNotesLoading(false));
  }, [item.id]);

  const handleResubmit = async () => {
    setResubmitting(true);
    setResubmitError(null);
    try {
      await onResubmit(item.id);
      setDone(true);
    } catch (e: any) {
      setResubmitError(e?.message || e?.error || 'Resubmit failed. Please try again or contact support.');
    } finally {
      setResubmitting(false);
    }
  };

  const platformKey = (item.platform || "").toLowerCase();
  const riskKey = (item.risk_level || "LOW").toUpperCase();
  const isPost = item.source_module === "publish" ||
    item.item_type?.toLowerCase().includes("post");
  const editHref = isPost
    ? `/publish?review_item_id=${item.id}`
    : `/library/upload?review_item_id=${item.id}`;
  const editLabel = isPost ? "Edit Post" : "Edit Media";

  if (done) {
    return (
      <div className="flex items-center gap-3 px-5 py-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-sm">
        <CheckCircle2 className="w-4 h-4 shrink-0" />
        <span>
          <span className="font-medium">{item.title}</span> resubmitted — back in the review queue.
        </span>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
      {/* Header */}
      <div className="flex items-start gap-4 p-4">
        <div className="mt-1 shrink-0 w-1.5 h-10 rounded-full bg-orange-500/60" />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <p className="font-semibold text-[var(--foreground)] text-sm truncate">{item.title}</p>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span className="text-xs text-[var(--foreground-muted)]">{item.item_type.replace(/_/g, " ")}</span>
                {item.platform && (
                  <>
                    <span className="text-[var(--border)]">·</span>
                    <span className={`text-xs font-medium ${PLATFORM_COLOR[platformKey] || "text-[var(--foreground-muted)]"}`}>
                      {item.platform}
                    </span>
                  </>
                )}
                <span className="text-[var(--border)]">·</span>
                <span className="text-xs text-[var(--foreground-muted)]">{formatRelative(item.submitted_at)}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border uppercase tracking-wider ${RISK_CONFIG[riskKey] || RISK_CONFIG.LOW}`}>
                {riskKey}
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border uppercase tracking-wider bg-orange-500/10 text-orange-400 border-orange-500/20">
                Returned
              </span>
            </div>
          </div>
          {item.content_snapshot?.copy && (
            <p className="mt-2 text-xs text-[var(--foreground-muted)] line-clamp-2">
              {item.content_snapshot.copy}
            </p>
          )}
        </div>
      </div>

      {/* Reviewer notes — always visible */}
      <div className="px-4 py-3 border-t border-[var(--border)] bg-[var(--surface)]/60">
        <div className="flex items-center gap-1.5 mb-2">
          <MessageSquare className="w-3.5 h-3.5 text-orange-400" />
          <span className="text-xs font-semibold text-orange-400">Reviewer Notes</span>
        </div>
        {notesLoading ? (
          <div className="flex items-center gap-2 text-xs text-[var(--foreground-muted)]">
            <RefreshCcw className="w-3 h-3 animate-spin" /> Loading notes…
          </div>
        ) : notes.length === 0 ? (
          <p className="text-xs text-[var(--foreground-muted)] italic">No revision notes left by reviewer.</p>
        ) : (
          <ul className="space-y-1.5">
            {notes.map(n => (
              <li key={n.id} className="text-xs text-[var(--foreground)] bg-orange-500/5 border border-orange-500/10 rounded-lg px-3 py-2">
                <span className="text-[var(--foreground-muted)] mr-2">{formatRelative(n.created_at)}</span>
                {n.note_body}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Error */}
      {resubmitError && (
        <div className="flex items-start gap-2 px-4 py-2.5 bg-red-500/5 border-t border-red-500/20 text-xs text-red-400">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>{resubmitError}</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 px-4 py-3 bg-[var(--surface)] border-t border-[var(--border)]">
        <a
          href={editHref}
          className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-[var(--border)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:border-[var(--border-hover)] transition-colors"
        >
          <Pencil className="w-3.5 h-3.5" />
          {editLabel}
        </a>
        <button
          onClick={handleResubmit}
          disabled={resubmitting}
          className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
        >
          {resubmitting ? (
            <RefreshCcw className="w-3 h-3 animate-spin" />
          ) : (
            <Send className="w-3 h-3" />
          )}
          Submit for Review
        </button>
      </div>
    </div>
  );
}

// ── Approval Card ──────────────────────────────────────────────────────────

function ApprovalCard({
  item,
  onResubmitApproval,
}: {
  item: ApprovalItem;
  onResubmitApproval: (id: string) => Promise<void>;
}) {
  const platformKey = (item.platform || "").toLowerCase();
  const riskKey = (item.risk_level || "LOW").toUpperCase();
  const [resubmitting, setResubmitting] = useState(false);
  const [resubmitError, setResubmitError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackLoading, setFeedbackLoading] = useState(true);
  const [postText, setPostText] = useState<string | null>(null);
  const [postImageUrl, setPostImageUrl] = useState<string | null>(null);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    api.get(`/api/v1/approvals-v2/items/${item.id}/decisions`)
      .then(r => {
        const decisions: Array<{ decision: string; decision_reason?: string; decision_note?: string }> = r.data || [];
        const returned = decisions.find(d =>
          d.decision === "RETURNED_TO_CREATOR" || d.decision === "CHANGES_REQUESTED"
        );
        setFeedback(returned?.decision_note || returned?.decision_reason || null);
      })
      .catch(() => {})
      .finally(() => setFeedbackLoading(false));
  }, [item.id]);

  useEffect(() => {
    if (!item.source_entity_id) return;
    void (async () => {
      try {
        const { data } = await supabase
          .from("publish_intents")
          .select("content, media_url, media_urls")
          .eq("id", item.source_entity_id)
          .single();
        if (!data) return;
        setPostText(data.content || null);
        const urls: string[] = Array.isArray(data.media_urls) && data.media_urls.length > 0
          ? data.media_urls
          : data.media_url ? [data.media_url] : [];
        setPostImageUrl(urls[0] || null);
      } catch { /* ignore */ }
    })();
  }, [item.source_entity_id]);

  const isPost = item.source_module === "publish" ||
    item.item_type?.toLowerCase().includes("post");
  const editHref = isPost && item.source_entity_id
    ? `/publish?approval_source_id=${item.source_entity_id}&approval_item_id=${item.id}${feedback ? `&suggestion=${encodeURIComponent(feedback)}` : ""}`
    : undefined;
  const editLabel = isPost ? "Edit Post" : "Edit Media";

  const handleResubmit = async () => {
    setResubmitting(true);
    setResubmitError(null);
    try {
      await onResubmitApproval(item.id);
      setDone(true);
    } catch (e: any) {
      setResubmitError(e?.message || e?.error || 'Resubmit failed.');
    } finally {
      setResubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="flex items-center gap-3 px-5 py-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-sm">
        <CheckCircle2 className="w-4 h-4 shrink-0" />
        <span><span className="font-medium">{item.title}</span> resubmitted — back in the approval queue.</span>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden transition-all duration-300 ease-in-out"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Header — always visible; shrinks when not hovered */}
      <div className={`flex items-center gap-3 transition-all duration-300 ease-in-out ${hovered ? "p-4" : "px-3 py-2"}`}>
        <div className={`shrink-0 rounded-full bg-amber-500/60 transition-all duration-300 ${hovered ? "self-start mt-1 w-1.5 h-10" : "self-start mt-0.5 w-1 h-5"}`} />

        {/* Left: title + meta */}
        <div className="min-w-0 flex-1">
          <p className={`font-semibold text-[var(--foreground)] truncate transition-all duration-300 ${hovered ? "text-sm" : "text-xs"}`}>
            {item.title}
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-0.5">
            <span className="text-[10px] text-[var(--foreground-muted)]">{item.item_type.replace(/_/g, " ")}</span>
            {item.platform && (
              <>
                <span className="text-[var(--border)]">·</span>
                <span className={`text-[10px] font-medium ${PLATFORM_COLOR[platformKey] || "text-[var(--foreground-muted)]"}`}>
                  {item.platform}
                </span>
              </>
            )}
            <span className="text-[var(--border)]">·</span>
            <span className="text-[10px] text-[var(--foreground-muted)]">{formatRelative(item.last_activity || item.created_at)}</span>
          </div>
        </div>

        {/* Right: feedback (default) or badges (hover) — side by side with title */}
        <div className="shrink-0 max-w-[40%] overflow-hidden">
          {/* Feedback — shown when not hovered */}
          <div
            className="transition-all duration-300 ease-in-out overflow-hidden"
            style={{ maxWidth: hovered ? "0px" : "300px", opacity: hovered ? 0 : 1 }}
          >
            <div className="flex items-center gap-1.5">
              <MessageSquare className="w-3 h-3 text-amber-400 shrink-0" />
              <span className="text-[10px] font-semibold text-amber-400 shrink-0">Feedback:</span>
              {feedbackLoading ? (
                <RefreshCcw className="w-2.5 h-2.5 animate-spin text-[var(--foreground-muted)]" />
              ) : feedback ? (
                <span className="text-[10px] text-[var(--foreground)] truncate max-w-[160px]">{feedback}</span>
              ) : (
                <span className="text-[10px] text-[var(--foreground-muted)] italic">No feedback.</span>
              )}
            </div>
          </div>

          {/* Badges — shown when hovered */}
          <div
            className="transition-all duration-300 ease-in-out overflow-hidden flex items-center gap-1.5"
            style={{ maxWidth: hovered ? "300px" : "0px", opacity: hovered ? 1 : 0 }}
          >
            <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full border uppercase tracking-wider whitespace-nowrap ${RISK_CONFIG[riskKey] || RISK_CONFIG.LOW}`}>
              {riskKey}
            </span>
            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full border uppercase tracking-wider bg-amber-500/10 text-amber-400 border-amber-500/20 whitespace-nowrap">
              Returned
            </span>
          </div>
        </div>
      </div>

      {/* Hover: 2-column (post content + feedback) — expands on hover */}
      <div
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{ maxHeight: hovered ? "480px" : "0px", opacity: hovered ? 1 : 0 }}
      >
        <div className="grid grid-cols-2 divide-x divide-[var(--border)] border-t border-[var(--border)]">
          {/* Left: Post Content */}
          <div className="p-4 bg-[var(--surface)]/40 flex flex-col gap-3 min-w-0">
            <p className="text-[10px] font-semibold text-[var(--foreground-muted)] uppercase tracking-wider">Post Content</p>
            {postImageUrl && (
              <div className="rounded-lg overflow-hidden border border-[var(--border)] bg-[var(--surface)] flex items-center justify-center max-h-36">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={postImageUrl}
                  alt="Post media"
                  className="w-full h-full object-cover max-h-36"
                  onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              </div>
            )}
            {postText ? (
              <p className="text-xs text-[var(--foreground)] leading-relaxed line-clamp-5 whitespace-pre-wrap">{postText}</p>
            ) : (
              <p className="text-xs text-[var(--foreground-muted)] italic">No caption saved.</p>
            )}
          </div>

          {/* Right: Approver Feedback */}
          <div className="p-4 bg-[var(--surface)]/60 flex flex-col gap-3 min-w-0">
            <div className="flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <p className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider">Approver Feedback</p>
            </div>
            {feedbackLoading ? (
              <div className="flex items-center gap-2 text-xs text-[var(--foreground-muted)]">
                <RefreshCcw className="w-3 h-3 animate-spin" /> Loading feedback…
              </div>
            ) : feedback ? (
              <div className="text-xs text-[var(--foreground)] bg-amber-500/5 border border-amber-500/15 rounded-lg px-3 py-2.5 leading-relaxed whitespace-pre-wrap">
                {feedback}
              </div>
            ) : (
              <p className="text-xs text-[var(--foreground-muted)] italic">No written feedback left by approver.</p>
            )}
          </div>
        </div>
      </div>

      {resubmitError && (
        <div className="flex items-start gap-2 px-4 py-2.5 bg-red-500/5 border-t border-red-500/20 text-xs text-red-400">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>{resubmitError}</span>
        </div>
      )}

      {/* Actions */}
      <div className={`flex items-center justify-between gap-2 px-3 bg-[var(--surface)] border-t border-[var(--border)] transition-all duration-300 ${hovered ? "py-2.5" : "py-1.5"}`}>
        <p className="text-[10px] text-[var(--foreground-muted)]">Edit &amp; resubmit, or dismiss this card.</p>
        <div className="flex items-center gap-2 shrink-0">
          {editHref && (
            <a href={editHref}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-[var(--border)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:border-[var(--border-hover)] transition-colors">
              <Pencil className="w-3.5 h-3.5" />
              {editLabel}
            </a>
          )}
          <button onClick={handleResubmit} disabled={resubmitting}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors disabled:opacity-50">
            {resubmitting ? <RefreshCcw className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Empty State ────────────────────────────────────────────────────────────

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4">
        <CheckCircle2 className="w-6 h-6 text-emerald-400" />
      </div>
      <p className="text-sm font-medium text-[var(--foreground)]">All clear</p>
      <p className="text-xs text-[var(--foreground-muted)] mt-1">No {label} at the moment.</p>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

type Tab = "review" | "approvals";

export default function ReturnedItemsPage() {
  const [tab, setTab] = useState<Tab>("review");
  const [reviewItems, setReviewItems] = useState<ReviewQueueItem[]>([]);
  const [approvalItems, setApprovalItems] = useState<ApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [rqRes, apRes] = await Promise.allSettled([
        api.get("/api/v1/review-queue?status=AWAITING_REVISION&submitted_by=me&limit=100"),
        api.get("/api/v1/approvals-v2/items?status=CHANGES_REQUESTED&submitted_by=me&limit=100"),
      ]);

      if (rqRes.status === "fulfilled" && rqRes.value.success) {
        setReviewItems(rqRes.value.items || []);
      }

      if (apRes.status === "fulfilled" && apRes.value.success) {
        const items: ApprovalItem[] = Array.isArray(apRes.value.data)
          ? apRes.value.data
          : (apRes.value.data?.items ?? []);
        setApprovalItems(items);
      } else {
        setError("Could not load items from Approval Console.");
      }
    } catch (e: any) {
      setError(e.message || "Failed to load returned items.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleResubmit = useCallback(async (id: string) => {
    const res = await api.post(`/api/v1/review-queue/items/${id}/action`, { action: "resubmit" });
    if (!res.success) throw new Error(res.error || 'Resubmit failed');
    setReviewItems(prev => prev.filter(i => i.id !== id));
  }, []);

  const handleResubmitApproval = useCallback(async (approvalId: string) => {
    const res = await api.post(`/api/v1/approvals-v2/items/${approvalId}/action`, { action: 'cancel' });
    if (!res.success) throw new Error(res.error || 'Failed to dismiss item');
    setApprovalItems(prev => prev.filter(i => i.id !== approvalId));
  }, []);

  const totalReturned = reviewItems.length + approvalItems.length;

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "review", label: "From Review Queue", count: reviewItems.length },
    { id: "approvals", label: "From Approval Console", count: approvalItems.length },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-orange-500/10 rounded-2xl border border-orange-500/20">
            <RotateCcw className="w-6 h-6 text-orange-400" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-[var(--foreground)]">Returned Items</h1>
              {totalReturned > 0 && (
                <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20">
                  {totalReturned}
                </span>
              )}
            </div>
            <p className="text-xs text-[var(--foreground-muted)] mt-0.5">
              Posts and media sent back from reviewers or approvers — review the feedback and resubmit.
            </p>
          </div>
        </div>
        <button
          onClick={() => load()}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border border-[var(--border)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:border-[var(--border-hover)] transition-colors"
        >
          <RefreshCcw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 mb-6 p-1 bg-[var(--surface)] rounded-xl border border-[var(--border)] w-fit max-w-full overflow-x-auto">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.id
                ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm border border-[var(--border)]"
                : "text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
            }`}
          >
            {t.label}
            {t.count > 0 && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                tab === t.id
                  ? "bg-orange-500/10 text-orange-400"
                  : "bg-[var(--border)] text-[var(--foreground-muted)]"
              }`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 text-sm mb-4">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 rounded-xl border border-[var(--border)] bg-[var(--card)] animate-pulse" />
          ))}
        </div>
      ) : tab === "review" ? (
        reviewItems.length === 0 ? (
          <EmptyState label="items returned from review queue" />
        ) : (
          <div className="space-y-3">
            {reviewItems.map(item => (
              <ReviewCard key={item.id} item={item} onResubmit={handleResubmit} />
            ))}
          </div>
        )
      ) : (
        approvalItems.length === 0 ? (
          <EmptyState label="items with changes requested" />
        ) : (
          <div className="space-y-3">
            {approvalItems.map(item => (
              <ApprovalCard key={item.id} item={item} onResubmitApproval={handleResubmitApproval} />
            ))}
          </div>
        )
      )}
    </div>
  );
}
