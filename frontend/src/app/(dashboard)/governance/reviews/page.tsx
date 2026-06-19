"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  RefreshCcw,
  Search,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Ban,
  Eye,
  ShieldCheck,
  Shield,
  X,
  User,
  AlertCircle,
  Calendar,
  Inbox,
  FileText,
} from "lucide-react";
import { api } from "@/lib/api";

// ── Agent-routed posts (publish_intents) awaiting a governance decision. ──────
// Sourced from /governance/queue — these were flagged by the agent safety check
// and routed to the Approval Console for a human decision.
interface AgentPost {
  id: string;
  content?: string;
  platform?: string;
  status: string;
  risk_level?: string;
  risk_score?: number;
  created_at?: string;
  feedback?: string;
  media_url?: string | null;
  media_urls?: string[] | null;
}

interface ReviewItem {
  id: string;
  item_type: string;
  source_module: string;
  title: string;
  content_snapshot: {
    copy?: string;
    urls?: string[];
    file_type?: string;
    violation_reason?: string;
  };
  platform?: string;
  submitter_name?: string;
  status: string;
  risk_level: string;
  submitted_at: string;
}

// Adapt an agent post into the card/detail shape the console renders.
function agentPostToReviewItem(p: AgentPost): ReviewItem {
  const risk = p.risk_score ?? 0;
  const urls = (
    p.media_urls && p.media_urls.length
      ? p.media_urls
      : p.media_url
        ? [p.media_url]
        : []
  ).filter(Boolean) as string[];
  return {
    id: p.id,
    item_type: "Social Post",
    source_module: "Agent Publish",
    title: (p.content || "Untitled post").slice(0, 80),
    content_snapshot: {
      copy: p.content || "",
      urls,
      file_type: urls.length ? "image" : undefined,
      violation_reason:
        risk >= 31
          ? p.feedback || `Flagged by agent safety check (${risk}% risk)`
          : undefined,
    },
    platform: p.platform,
    submitter_name: p.platform ? p.platform.toUpperCase() : "Agent",
    status: p.status,
    risk_level: p.risk_level || "LOW",
    submitted_at: p.created_at || "",
  };
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  PENDING_REVIEW: { label: "Pending", color: "bg-blue-500/10 text-blue-300 border-blue-500/20" },
  PENDING_VALIDATION: { label: "Pending", color: "bg-blue-500/10 text-blue-300 border-blue-500/20" },
  PENDING_AUTHORIZATION: { label: "Pending", color: "bg-blue-500/10 text-blue-300 border-blue-500/20" },
  PENDING_GOVERNANCE: { label: "Pending", color: "bg-blue-500/10 text-blue-300 border-blue-500/20" },
  IN_REVIEW: { label: "In Review", color: "bg-amber-500/10 text-amber-300 border-amber-500/20" },
  AWAITING_REVISION: { label: "Returned", color: "bg-orange-500/10 text-orange-300 border-orange-500/20" },
  RETURNED: { label: "Returned", color: "bg-orange-500/10 text-orange-300 border-orange-500/20" },
  APPROVED: { label: "Approved", color: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20" },
  RELEASED: { label: "Released", color: "bg-emerald-600/10 text-emerald-300 border-emerald-600/20" },
  REJECTED: { label: "Rejected", color: "bg-red-500/10 text-red-400 border-red-500/20" },
  GOVERNANCE_BLOCKED: { label: "Blocked", color: "bg-red-600/10 text-red-400 border-red-600/20" },
};

const RISK_CONFIG: Record<string, string> = {
  LOW: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  MEDIUM: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  HIGH: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  CRITICAL: "bg-red-500/10 text-red-400 border-red-500/20",
};

function formatRelative(d?: string) {
  if (!d) return "—";
  const diff = Date.now() - new Date(d).getTime();
  const h = Math.floor(diff / 3600000);
  const m = Math.floor(diff / 60000);
  if (h > 24) return `${Math.floor(h / 24)}d ago`;
  if (h > 0) return `${h}h ago`;
  if (m > 0) return `${m}m ago`;
  return "Just now";
}

function formatDateTime(d?: string) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const TABS = [
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected / Returned" },
];

// ── Knowledge Base Review Queue ──────────────────────────────────────────────
// Mirrors the KB page's review queue: sources awaiting review, with Approve /
// Block actions, surfaced at the top of the Approval Console.
function KnowledgeReviewQueue() {
  const [sources, setSources] = useState<any[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [open, setOpen] = useState(true);

  const fetchSources = useCallback(async () => {
    try {
      const res = await api.listKnowledgeSources();
      if (res?.success) setSources(res.data || []);
    } catch {
      // non-critical
    }
  }, []);

  useEffect(() => {
    fetchSources();
  }, [fetchSources]);

  const isReview = (s: any) =>
    ["DRAFT", "REVIEW_REQUIRED", "PROCESSING"].includes(String(s?.status || "").toUpperCase());
  const queue = sources.filter(isReview);

  const act = async (s: any, action: "approve" | "block") => {
    setBusy(s.id);
    try {
      if (action === "approve") await api.approveKnowledgeSource(s.id);
      else await api.quarantineKnowledgeSource(s.id);
      await fetchSources();
    } catch {
      // non-critical
    } finally {
      setBusy(null);
    }
  };

  if (queue.length === 0) return null;

  return (
    <div className="mb-6 rounded-2xl border border-amber-500/20 bg-amber-500/5 overflow-hidden">
      <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center justify-between px-5 py-3">
        <span className="flex items-center gap-2 text-sm font-semibold text-amber-300">
          <Inbox className="w-4 h-4" /> Knowledge Base Review Queue
          <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold">
            {queue.length} pending
          </span>
        </span>
        <span className="text-[11px] text-zinc-500">Approve or block sources awaiting review</span>
      </button>
      {open && (
        <div className="divide-y divide-zinc-800 border-t border-zinc-800">
          {queue.map((s) => {
            const author = (s.metadata?.author as string) || s.owner_name || "—";
            return (
              <div key={s.id} className="flex items-center gap-3 px-5 py-3">
                <FileText className="w-4 h-4 text-amber-400 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white truncate">{s.title}</p>
                  <p className="text-[11px] text-zinc-500">{s.source_type || "source"} · by {author}</p>
                </div>
                <button
                  onClick={() => act(s, "approve")}
                  disabled={busy !== null}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-all disabled:opacity-50"
                >
                  <ShieldCheck className="w-3.5 h-3.5" /> Approve
                </button>
                <button
                  onClick={() => act(s, "block")}
                  disabled={busy !== null}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 transition-all disabled:opacity-50"
                >
                  <Ban className="w-3.5 h-3.5" /> Block
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function ApprovalConsolePage() {
  const [posts, setPosts] = useState<AgentPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<ReviewItem | null>(null);
  const [activeTab, setActiveTab] = useState("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showActionDrawer, setShowActionDrawer] = useState<"reject" | "return" | null>(null);
  const [drawerText, setDrawerText] = useState("");
  const [activeMediaIdx, setActiveMediaIdx] = useState(0);
  const initialSelectDone = useRef(false);
  // Deep-link target: ?item=<intentId> from a rejection notification's
  // "View Details". Read client-side (avoids a Suspense boundary requirement).
  const [focusId, setFocusId] = useState<string | null>(null);
  const focusHandled = useRef(false);
  useEffect(() => {
    if (typeof window !== "undefined") {
      setFocusId(new URLSearchParams(window.location.search).get("item"));
    }
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/v1/governance/queue");
      if (res.success) {
        const all = (res.data || []) as AgentPost[];
        setPosts(all);
        if (all.length > 0 && !initialSelectDone.current && !new URLSearchParams(typeof window !== "undefined" ? window.location.search : "").get("item")) {
          initialSelectDone.current = true;
          const pending = all.find((p) => String(p.status || "").startsWith("PENDING"));
          if (pending) setSelectedItem(agentPostToReviewItem(pending));
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Deep-link: once posts load, select the ?item= post and open the container
  // (tab) that holds it — Rejected/Returned for a rejected post.
  useEffect(() => {
    if (!focusId || focusHandled.current || posts.length === 0) return;
    const target = posts.find((p) => p.id === focusId);
    if (!target) return;
    focusHandled.current = true;
    initialSelectDone.current = true;
    const s = String(target.status || "");
    const tab =
      s === "APPROVED" || s === "RELEASED"
        ? "approved"
        : s === "REJECTED" || s === "GOVERNANCE_BLOCKED" || s === "AWAITING_REVISION" || s === "RETURNED"
          ? "rejected"
          : "pending";
    setActiveTab(tab);
    setSelectedItem(agentPostToReviewItem(target));
  }, [posts, focusId]);

  const handleSelect = (item: ReviewItem) => {
    setSelectedItem(item);
    setActiveMediaIdx(0);
    setMessage(null);
    setShowActionDrawer(null);
    setDrawerText("");
  };

  const handleAction = async (action: string, extra?: Record<string, string>) => {
    if (!selectedItem) return;
    setActionLoading(action);
    setMessage(null);
    try {
      const map: Record<string, string> = {
        approve: "approve",
        reject: "reject",
        request_revision: "return",
      };
      const govAction = map[action];
      if (!govAction) {
        setActionLoading(null);
        return;
      }
      const r = await api.post(
        `/api/v1/governance/intents/${selectedItem.id}/review-action`,
        { action: govAction, reason: extra?.reason || extra?.note },
      );
      if (r.success) {
        const labels: Record<string, string> = {
          approve: r.blocked
            ? "Governance blocked this post — not published."
            : "Approved. Publishing…",
          reject: "Rejected. Creator notified.",
          request_revision: "Returned to creator.",
        };
        setMessage({ type: r.blocked ? "error" : "success", text: labels[action] || "Done." });
        setShowActionDrawer(null);
        setDrawerText("");
        setSelectedItem(null);
        initialSelectDone.current = false;
        fetchData();
      } else {
        setMessage({ type: "error", text: r.error || "Action failed." });
      }
    } catch {
      setMessage({ type: "error", text: "Failed." });
    } finally {
      setActionLoading(null);
    }
  };

  const items = posts.map(agentPostToReviewItem);

  const isPending = (s: string) => s.startsWith("PENDING") || s === "IN_REVIEW";
  const isApproved = (s: string) => s === "APPROVED" || s === "RELEASED";
  const isRejected = (s: string) =>
    s === "REJECTED" || s === "GOVERNANCE_BLOCKED" || s === "AWAITING_REVISION" || s === "RETURNED";

  const filtered = items
    .filter((item) => {
      if (activeTab === "pending") return isPending(item.status);
      if (activeTab === "approved") return isApproved(item.status);
      if (activeTab === "rejected") return isRejected(item.status);
      return true;
    })
    .filter((i) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return i.title.toLowerCase().includes(q) || (i.platform || "").toLowerCase().includes(q);
    });

  const counts = {
    pending: items.filter((i) => isPending(i.status)).length,
    approved: items.filter((i) => isApproved(i.status)).length,
    rejected: items.filter((i) => isRejected(i.status)).length,
  };

  // Media
  const mediaUrls = selectedItem?.content_snapshot?.urls as string[] | undefined;
  const fileType = selectedItem?.content_snapshot?.file_type as string | undefined;
  const isImage = !!(fileType?.startsWith("image") || fileType === "image");
  const isVideo = !!(fileType?.startsWith("video") || fileType === "video" || fileType === "mixed");
  const hasMedia = !!(mediaUrls?.length && (isImage || isVideo));
  const isFlagged = selectedItem?.status === "GOVERNANCE_BLOCKED" || selectedItem?.status === "REJECTED";
  const snapCopy = selectedItem?.content_snapshot?.copy as string | undefined;
  const violation = selectedItem?.content_snapshot?.violation_reason as string | undefined;

  const pending = !!selectedItem && isPending(selectedItem.status);

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 pb-16">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 bg-zinc-800 border border-zinc-700 rounded-lg flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-zinc-300" />
            </div>
            <h1 className="text-xl font-bold text-white">Approval Console</h1>
          </div>
          <p className="text-sm text-zinc-500 ml-11">
            Agent-routed posts awaiting a governance decision. Approve to publish,
            reject, or return to the creator.
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-zinc-400 text-xs font-medium transition-colors disabled:opacity-50"
        >
          <RefreshCcw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Knowledge Base sources awaiting review — surfaced at the top. */}
      <KnowledgeReviewQueue />

      {/* Toast */}
      {message && (
        <div
          className={`mb-5 p-3 rounded-lg flex items-center gap-2.5 text-xs font-medium border ${
            message.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
              : "bg-rose-500/10 border-rose-500/20 text-rose-400"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          ) : (
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          )}
          {message.text}
          <button onClick={() => setMessage(null)} className="ml-auto text-zinc-600 hover:text-zinc-300">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: "Pending", value: counts.pending, color: "text-blue-400" },
          { label: "Approved", value: counts.approved, color: "text-emerald-400" },
          { label: "Rejected / Returned", value: counts.rejected, color: "text-rose-400" },
        ].map((s) => (
          <div key={s.label} className="p-4 bg-zinc-900 border border-zinc-800 rounded-lg">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-zinc-500 font-medium mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Main Layout */}
      <div className="flex gap-5 items-start">
        {/* Left: Item List */}
        <div className="w-[260px] shrink-0 flex flex-col gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors"
            />
          </div>

          <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-0.5">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 px-2 py-1.5 text-[10px] font-semibold rounded transition-all ${
                  activeTab === tab.key ? "bg-white text-black" : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {tab.label}
                {counts[tab.key as keyof typeof counts] > 0 && (
                  <span
                    className={`ml-1 px-1 rounded text-[8px] font-bold ${
                      activeTab === tab.key ? "bg-black/10 text-black" : "bg-zinc-800 text-zinc-500"
                    }`}
                  >
                    {counts[tab.key as keyof typeof counts]}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="space-y-1.5 max-h-[600px] overflow-y-auto scrollbar-none">
            {loading ? (
              <div className="flex flex-col items-center py-12 text-zinc-600 gap-3">
                <div className="w-5 h-5 border-2 border-zinc-700 border-t-zinc-400 rounded-full animate-spin" />
                <p className="text-[10px]">Loading...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-8 text-center">
                <CheckCircle2 className="w-6 h-6 text-zinc-700 mx-auto mb-2" />
                <p className="text-xs text-zinc-600">No items</p>
              </div>
            ) : (
              filtered.map((item) => {
                const isSelected = selectedItem?.id === item.id;
                const status = STATUS_CONFIG[item.status] || {
                  label: item.status,
                  color: "bg-zinc-800 text-zinc-400 border-zinc-700",
                };
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item)}
                    className={`w-full text-left rounded-lg p-3 transition-all border ${
                      isSelected ? "bg-zinc-800 border-zinc-600" : "bg-zinc-900 border-zinc-800 hover:border-zinc-700"
                    }`}
                  >
                    <p className="text-[11px] font-semibold text-white line-clamp-2 mb-1.5">{item.title}</p>
                    <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                      <span className={`px-1.5 py-[1px] rounded border text-[8px] font-bold ${status.color}`}>
                        {status.label}
                      </span>
                      <span className={`px-1.5 py-[1px] rounded border text-[8px] font-bold ${RISK_CONFIG[item.risk_level] || ""}`}>
                        {item.risk_level}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[9px] text-zinc-600">
                      <span>{item.submitter_name}</span>
                      <span>{formatRelative(item.submitted_at)}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Detail */}
        <div className="flex-1 min-w-0">
          {!selectedItem ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-16 text-center">
              <Eye className="w-8 h-8 text-zinc-700 mx-auto mb-3" />
              <p className="text-sm font-semibold text-zinc-500">Select a post to review</p>
              <p className="text-xs text-zinc-700 mt-1">Choose from the queue on the left</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
                <div className={`flex items-stretch ${hasMedia ? "" : "flex-col"}`}>
                  {/* Left info pane */}
                  <div className={`flex flex-col gap-3 ${hasMedia ? "w-[230px] shrink-0 border-r border-zinc-800 p-4" : "w-full p-5"}`}>
                    <div className="pb-3 border-b border-zinc-800">
                      <h3 className="text-sm font-bold text-white leading-snug mb-2">{selectedItem.title}</h3>
                      <div className="flex items-center gap-1.5 flex-wrap mb-2">
                        <span className={`px-2 py-0.5 rounded border text-[8px] font-bold ${STATUS_CONFIG[selectedItem.status]?.color || "bg-zinc-800 text-zinc-400 border-zinc-700"}`}>
                          {STATUS_CONFIG[selectedItem.status]?.label || selectedItem.status}
                        </span>
                        <span className={`px-2 py-0.5 rounded border text-[8px] font-bold ${RISK_CONFIG[selectedItem.risk_level] || ""}`}>
                          {selectedItem.risk_level}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[9px] text-zinc-500">
                        <User className="w-3 h-3 shrink-0" />
                        <span className="text-zinc-300 font-medium truncate">{selectedItem.submitter_name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[9px] text-zinc-600 mt-0.5">
                        <Calendar className="w-3 h-3 shrink-0" />
                        <span>{formatDateTime(selectedItem.submitted_at)}</span>
                      </div>
                      <p className="text-[9px] text-zinc-600 mt-1">
                        {selectedItem.item_type} · {selectedItem.source_module}
                      </p>
                    </div>

                    {snapCopy && (
                      <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-2.5">
                        <p className="text-[10px] text-zinc-400 leading-relaxed">{snapCopy}</p>
                      </div>
                    )}

                    {violation && (
                      <div className="flex items-start gap-2.5 p-2.5 bg-red-500/[0.05] border border-red-500/20 rounded-lg">
                        <Shield className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-[9px] font-bold text-red-300 mb-0.5 uppercase tracking-wide">Block Reason</p>
                          <p className="text-[10px] text-red-300/80 leading-relaxed">{violation}</p>
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-col gap-2 pt-1">
                      {pending ? (
                        <>
                          <button
                            onClick={() => handleAction("approve", { reason: "Approved" })}
                            disabled={actionLoading !== null}
                            className="w-full px-3 py-2 bg-white hover:bg-zinc-100 text-black text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                          >
                            {actionLoading === "approve" ? (
                              <RefreshCcw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            )}
                            Approve &amp; Publish
                          </button>
                          <button
                            onClick={() => { setShowActionDrawer("reject"); setDrawerText(""); }}
                            disabled={actionLoading !== null}
                            className="w-full px-3 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-red-400 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                          >
                            <XCircle className="w-3.5 h-3.5" /> Reject
                          </button>
                          <button
                            onClick={() => { setShowActionDrawer("return"); setDrawerText(""); }}
                            disabled={actionLoading !== null}
                            className="w-full px-3 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-orange-400 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                          >
                            <RotateCcw className="w-3.5 h-3.5" /> Return to Creator
                          </button>
                        </>
                      ) : (
                        <div
                          className={`rounded-lg p-2.5 text-center text-[10px] font-semibold border ${
                            isApproved(selectedItem.status)
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : selectedItem.status === "REJECTED" || selectedItem.status === "GOVERNANCE_BLOCKED"
                                ? "bg-red-500/10 text-red-400 border-red-500/20"
                                : "bg-orange-500/10 text-orange-400 border-orange-500/20"
                          }`}
                        >
                          {STATUS_CONFIG[selectedItem.status]?.label || selectedItem.status}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right media pane */}
                  {hasMedia && mediaUrls && (
                    <div className="flex-1 min-w-0 bg-black flex flex-col">
                      {isImage && (
                        <div className="relative w-full flex items-center justify-center min-h-[200px] flex-1">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={mediaUrls[activeMediaIdx] ?? mediaUrls[0]}
                            alt={selectedItem.title}
                            className="w-full h-auto max-h-[560px] object-contain"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                          />
                          {isFlagged && (
                            <div className="absolute inset-0 bg-red-950/40 flex items-center justify-center backdrop-blur-[1px] pointer-events-none">
                              <div className="flex items-center gap-2 bg-red-500/20 border border-red-500/30 px-3 py-1.5 rounded-lg">
                                <Ban className="w-4 h-4 text-red-400" />
                                <span className="text-red-300 text-xs font-bold uppercase tracking-wide">Blocked</span>
                              </div>
                            </div>
                          )}
                          {mediaUrls.length > 1 && (
                            <span className="absolute top-2 right-2 bg-black/60 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">
                              {activeMediaIdx + 1} / {mediaUrls.length}
                            </span>
                          )}
                        </div>
                      )}
                      {isVideo && (
                        <div className="relative aspect-video w-full">
                          <video
                            src={mediaUrls[0]}
                            controls
                            className="w-full h-full object-contain"
                            onError={(e) => { (e.target as HTMLVideoElement).style.display = "none"; }}
                          />
                        </div>
                      )}
                      {isImage && mediaUrls.length > 1 && (
                        <div className="flex gap-1.5 p-2 bg-zinc-950 border-t border-zinc-800 overflow-x-auto scrollbar-none">
                          {mediaUrls.map((url, idx) => (
                            <button
                              key={idx}
                              onClick={() => setActiveMediaIdx(idx)}
                              className={`relative h-12 w-12 shrink-0 rounded overflow-hidden bg-black border-2 transition-all ${
                                activeMediaIdx === idx ? "border-white" : "border-zinc-700 opacity-50 hover:opacity-80"
                              }`}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={url}
                                alt={`${idx + 1}`}
                                className="w-full h-full object-cover"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                              />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Drawer */}
              {showActionDrawer && (
                <div
                  className={`rounded-lg p-4 space-y-3 border ${
                    showActionDrawer === "reject" ? "bg-red-500/[0.03] border-red-500/20" : "bg-orange-500/[0.03] border-orange-500/20"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className={`text-xs font-bold ${showActionDrawer === "reject" ? "text-red-300" : "text-orange-300"}`}>
                      {showActionDrawer === "reject" ? "Rejection Reason" : "Return Instructions"}
                    </p>
                    <button onClick={() => setShowActionDrawer(null)} className="text-zinc-600 hover:text-zinc-400">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <textarea
                    placeholder={showActionDrawer === "reject" ? "Reason for rejection..." : "Instructions for the creator..."}
                    value={drawerText}
                    onChange={(e) => setDrawerText(e.target.value)}
                    rows={3}
                    className={`w-full bg-zinc-950 rounded-lg p-3 text-xs text-white placeholder-zinc-600 focus:outline-none resize-none border ${
                      showActionDrawer === "reject" ? "border-red-500/20 focus:border-red-500/40" : "border-orange-500/20 focus:border-orange-500/40"
                    }`}
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setShowActionDrawer(null)}
                      className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 text-xs font-semibold rounded-lg text-zinc-400"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() =>
                        showActionDrawer === "reject"
                          ? handleAction("reject", { reason: drawerText })
                          : handleAction("request_revision", { note: drawerText, reason: "Revision requested" })
                      }
                      disabled={!drawerText.trim() || actionLoading !== null}
                      className="px-4 py-1.5 bg-white hover:bg-zinc-100 text-black text-xs font-bold rounded-lg transition-colors disabled:opacity-40"
                    >
                      {showActionDrawer === "reject" ? "Confirm Reject" : "Send to Creator"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
