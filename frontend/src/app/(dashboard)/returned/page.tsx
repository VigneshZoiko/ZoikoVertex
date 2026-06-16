"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  RotateCcw, AlertTriangle, Clock, ExternalLink, RefreshCcw,
  CheckCircle2, MessageSquare, Layers, ChevronDown, ChevronUp,
  ArrowRight, FileText, Inbox,
} from "lucide-react";
import { api } from "@/lib/api";

// ── Types ──────────────────────────────────────────────────────────────────

interface ReviewQueueItem {
  id: string;
  item_type: string;
  source_module: string;
  title: string;
  content_snapshot: { copy?: string; violation_reason?: string };
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
  const [expanded, setExpanded] = useState(false);
  const [notes, setNotes] = useState<ReviewNote[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [resubmitting, setResubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const loadNotes = useCallback(async () => {
    if (notes.length > 0) { setExpanded(v => !v); return; }
    setExpanded(true);
    setNotesLoading(true);
    try {
      const r = await api.get(`/api/v1/review-queue/items/${item.id}/notes`);
      setNotes(r.data || []);
    } catch { /* non-fatal */ }
    finally { setNotesLoading(false); }
  }, [item.id, notes.length]);

  const handleToggle = () => {
    if (expanded) { setExpanded(false); return; }
    loadNotes();
  };

  const handleResubmit = async () => {
    setResubmitting(true);
    try {
      await onResubmit(item.id);
      setDone(true);
    } finally {
      setResubmitting(false);
    }
  };

  const platformKey = (item.platform || "").toLowerCase();
  const riskKey = (item.risk_level || "LOW").toUpperCase();

  if (done) {
    return (
      <div className="flex items-center gap-3 px-5 py-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-sm">
        <CheckCircle2 className="w-4 h-4 shrink-0" />
        <span>
          <span className="font-medium">{item.title}</span> marked as resubmitted — reviewers have been notified.
        </span>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
      <div className="flex items-start gap-4 p-4">
        {/* Left accent */}
        <div className="mt-1 shrink-0 w-1.5 h-10 rounded-full bg-orange-500/60" />

        {/* Main content */}
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

      {/* Actions */}
      <div className="flex items-center gap-2 px-4 py-3 bg-[var(--surface)] border-t border-[var(--border)]">
        <button
          onClick={handleToggle}
          className="flex items-center gap-1.5 text-xs text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          Reviewer Notes
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>

        <div className="flex-1" />

        <a
          href="/review-queue"
          className="flex items-center gap-1.5 text-xs text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors px-3 py-1.5 rounded-lg border border-[var(--border)] hover:border-[var(--border-hover)]"
        >
          Open in Queue
          <ExternalLink className="w-3 h-3" />
        </a>
        <button
          onClick={handleResubmit}
          disabled={resubmitting}
          className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/20 hover:bg-orange-500/20 transition-colors disabled:opacity-50"
        >
          {resubmitting ? (
            <RefreshCcw className="w-3 h-3 animate-spin" />
          ) : (
            <RotateCcw className="w-3 h-3" />
          )}
          Mark Resubmitted
        </button>
      </div>

      {/* Expanded reviewer notes */}
      {expanded && (
        <div className="px-4 py-3 border-t border-[var(--border)] bg-[var(--surface)]/50">
          {notesLoading ? (
            <div className="flex items-center gap-2 text-xs text-[var(--foreground-muted)]">
              <RefreshCcw className="w-3 h-3 animate-spin" /> Loading notes…
            </div>
          ) : notes.length === 0 ? (
            <p className="text-xs text-[var(--foreground-muted)] italic">No revision notes left by reviewer.</p>
          ) : (
            <ul className="space-y-2">
              {notes.map(n => (
                <li key={n.id} className="text-xs text-[var(--foreground)]">
                  <span className="text-[var(--foreground-muted)] mr-2">{formatRelative(n.created_at)}</span>
                  {n.note_body}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

// ── Approval Card ──────────────────────────────────────────────────────────

function ApprovalCard({ item }: { item: ApprovalItem }) {
  const platformKey = (item.platform || "").toLowerCase();
  const riskKey = (item.risk_level || "LOW").toUpperCase();

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
      <div className="flex items-start gap-4 p-4">
        {/* Left accent */}
        <div className="mt-1 shrink-0 w-1.5 h-10 rounded-full bg-amber-500/60" />

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
                <span className="text-xs text-[var(--foreground-muted)]">{formatRelative(item.last_activity || item.created_at)}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border uppercase tracking-wider ${RISK_CONFIG[riskKey] || RISK_CONFIG.LOW}`}>
                {riskKey}
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border uppercase tracking-wider bg-amber-500/10 text-amber-400 border-amber-500/20">
                Changes Requested
              </span>
            </div>
          </div>

          {item.next_action && (
            <p className="mt-2 text-xs text-amber-400/80 flex items-center gap-1">
              <ArrowRight className="w-3 h-3 shrink-0" />
              Next: {item.next_action}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 px-4 py-3 bg-[var(--surface)] border-t border-[var(--border)]">
        <a
          href="/governance/approvals"
          className="flex items-center gap-1.5 text-xs text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors px-3 py-1.5 rounded-lg border border-[var(--border)] hover:border-[var(--border-hover)]"
        >
          Open in Approval Console
          <ExternalLink className="w-3 h-3" />
        </a>
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
  const fetchedRef = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [rqRes, apRes] = await Promise.allSettled([
        api.get("/api/v1/review-queue?limit=100"),
        api.get("/api/v1/approvals-v2/items"),
      ]);

      if (rqRes.status === "fulfilled" && rqRes.value.success) {
        const all: ReviewQueueItem[] = rqRes.value.data?.items || rqRes.value.data || [];
        setReviewItems(all.filter(i => i.status === "AWAITING_REVISION"));
      }
      if (apRes.status === "fulfilled" && apRes.value.success) {
        const all: ApprovalItem[] = apRes.value.data?.items || apRes.value.data || [];
        setApprovalItems(all.filter(i => i.approval_status === "CHANGES_REQUESTED"));
      }
    } catch (e: any) {
      setError(e.message || "Failed to load returned items.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    load();
  }, [load]);

  const handleResubmit = useCallback(async (id: string) => {
    await api.post(`/api/v1/review-queue/items/${id}/action`, { action: "resubmit" });
    setReviewItems(prev => prev.filter(i => i.id !== id));
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
          onClick={() => { fetchedRef.current = false; load(); }}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border border-[var(--border)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:border-[var(--border-hover)] transition-colors"
        >
          <RefreshCcw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 bg-[var(--surface)] rounded-xl border border-[var(--border)] w-fit">
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
              <ApprovalCard key={item.id} item={item} />
            ))}
          </div>
        )
      )}
    </div>
  );
}
