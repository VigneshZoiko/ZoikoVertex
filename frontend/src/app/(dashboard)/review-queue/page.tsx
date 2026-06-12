"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  RefreshCcw, Search, CheckCircle2, XCircle, RotateCcw,
  Ban, Clock, Eye, Layers, Shield, ArrowRight, X, User,
  Zap, AlertCircle, Calendar,
} from "lucide-react";
import { api } from "@/lib/api";
import { supabase } from "@/lib/supabase";

interface ReviewItem {
  id: string;
  item_type: string;
  source_module: string;
  source_entity_id: string;
  title: string;
  content_snapshot: Record<string, unknown>;
  platform?: string;
  submitted_by: string;
  submitter_name?: string;
  submitter_role?: string;
  assigned_to?: string | null;
  status: string;
  priority: string;
  risk_level: string;
  risk_category?: string;
  submitted_at: string;
  /** True when this row is an agent-routed post (publish_intents), not a review_item. */
  __agent?: boolean;
}

// Posts routed here by the agent safety check (everything that wasn't a
// 100%-clean auto-publish). Sourced from publish_intents via /governance/queue.
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

// Adapt an agent post (publish_intents) into the ReviewItem shape the queue UI
// renders, so it flows through the same list, detail panel, and actions.
function agentPostToReviewItem(p: AgentPost): ReviewItem {
  const risk = p.risk_score ?? 0;
  const urls = (p.media_urls && p.media_urls.length ? p.media_urls : (p.media_url ? [p.media_url] : [])).filter(Boolean) as string[];
  return {
    id: p.id,
    item_type: "Social Post",
    source_module: "Agent Publish",
    source_entity_id: p.id,
    title: (p.content || "Untitled post").slice(0, 80),
    content_snapshot: {
      copy: p.content || "",
      urls,
      file_type: urls.length ? "image" : undefined,
      violation_reason: risk >= 31 ? (p.feedback || `Flagged by agent safety check (${risk}% risk)`) : undefined,
    },
    platform: p.platform,
    submitted_by: "Agent",
    submitter_name: p.platform ? p.platform.toUpperCase() : "Agent",
    status: p.status,
    priority: "NORMAL",
    risk_level: p.risk_level || "LOW",
    submitted_at: p.created_at || "",
    __agent: true,
  };
}

interface ReviewStats {
  pending_review: number;
  assigned_to_me: number;
  approved: number;
  rejected: number;
  awaiting_revision: number;
  released: number;
}

interface ReviewNote {
  id: string;
  note_body: string;
  created_by: string;
  created_at: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  PENDING_REVIEW:    { label: "Pending",     color: "bg-blue-500/10 text-blue-300 border-blue-500/20" },
  ASSIGNED:          { label: "Assigned",    color: "bg-info-text/10 text-info-text border-info-border/20" },
  IN_REVIEW:         { label: "In Review",   color: "bg-warning-text/10 text-warning-text border-warning-border/20" },
  AWAITING_REVISION: { label: "Returned",    color: "bg-orange-500/10 text-orange-300 border-orange-500/20" },
  RESUBMITTED:       { label: "Resubmitted", color: "bg-teal-500/10 text-teal-300 border-teal-500/20" },
  APPROVED:          { label: "Approved",    color: "bg-success-text/10 text-success-text border-success-border/20" },
  REJECTED:          { label: "Rejected",    color: "bg-red-500/10 text-red-400 border-red-500/20" },
  RETURNED:          { label: "Returned",    color: "bg-orange-500/10 text-orange-300 border-orange-500/20" },
  GOVERNANCE_BLOCKED:{ label: "Blocked",     color: "bg-red-600/10 text-red-400 border-red-600/20" },
  PENDING_VALIDATION:{ label: "Pending",     color: "bg-blue-500/10 text-blue-300 border-blue-500/20" },
  PENDING_AUTHORIZATION: { label: "Pending", color: "bg-blue-500/10 text-blue-300 border-blue-500/20" },
  PENDING_GOVERNANCE:{ label: "Pending",     color: "bg-blue-500/10 text-blue-300 border-blue-500/20" },
  ESCALATED:         { label: "Escalated",   color: "bg-error-text/10 text-error-text border-error-border/20" },
  RELEASED:          { label: "Released",    color: "bg-success-text/10 text-success-text border-success-border/20" },
};

const RISK_CONFIG: Record<string, string> = {
  LOW:      "bg-success-text/10 text-success-text border-success-border/20",
  MEDIUM:   "bg-warning-text/10 text-warning-text border-warning-border/20",
  HIGH:     "bg-orange-500/10 text-orange-400 border-orange-500/20",
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
  return new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function ReviewQueuePage() {
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [agentPosts, setAgentPosts] = useState<AgentPost[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<ReviewItem | null>(null);
  const [activeTab, setActiveTab] = useState("needs_review");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [notes, setNotes] = useState<ReviewNote[]>([]);
  const [showActionDrawer, setShowActionDrawer] = useState<"reject" | "return" | null>(null);
  const [drawerText, setDrawerText] = useState("");
  const [activeMediaIdx, setActiveMediaIdx] = useState(0);
  const initialSelectDone = useRef(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUserId(user.id);
    });
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [itemsRes, statsRes, agentRes] = await Promise.all([
        api.get("/api/v1/review-queue?limit=100"),
        api.get("/api/v1/review-queue/stats"),
        api.get("/api/v1/governance/queue"),
      ]);
      if (itemsRes.success) {
        const all = (itemsRes.items || []) as ReviewItem[];
        setItems(all);
        if (all.length > 0 && !initialSelectDone.current) {
          initialSelectDone.current = true;
          const pool = all.filter(i => i.status === "PENDING_REVIEW" && !i.assigned_to);
          if (pool.length > 0) setSelectedItem(pool[0]);
        }
      }
      if (agentRes.success) setAgentPosts((agentRes.data || []) as AgentPost[]);
      if (statsRes.success) setStats(statsRes.data as ReviewStats);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const fetchNotes = useCallback(async (id: string) => {
    try {
      const r = await api.get(`/api/v1/review-queue/items/${id}/notes`);
      if (r.success) setNotes((r.data || []) as ReviewNote[]);
    } catch { setNotes([]); }
  }, []);

  const handleSelect = (item: ReviewItem) => {
    setSelectedItem(item);
    setActiveMediaIdx(0);
    setMessage(null);
    setShowActionDrawer(null);
    setDrawerText("");
    fetchNotes(item.id);
  };

  const handleAction = async (action: string, extra?: Record<string, string>) => {
    if (!selectedItem) return;
    setActionLoading(action);
    setMessage(null);
    try {
      let r;
      if (selectedItem.__agent) {
        // Agent posts (publish_intents) go through the governed publish lifecycle.
        const map: Record<string, string> = { approve: "approve", reject: "reject", request_revision: "return" };
        const govAction = map[action];
        if (!govAction) { setActionLoading(null); return; } // claim/unclaim don't apply
        r = await api.post(`/api/v1/governance/intents/${selectedItem.id}/review-action`, {
          action: govAction,
          reason: extra?.reason || extra?.note,
        });
      } else {
        r = await api.post(`/api/v1/review-queue/items/${selectedItem.id}/action`, { action, ...(extra || {}) });
      }
      if (r.success) {
        const labels: Record<string, string> = {
          claim: "Item claimed.", unclaim: "Released to pool.",
          approve: r.blocked ? "Governance blocked this post — not published." : "Approved. Publishing…",
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
    } catch { setMessage({ type: "error", text: "Failed." }); }
    finally { setActionLoading(null); }
  };

  const TABS = [
    { key: "needs_review", label: "Needs Review" },
    { key: "resolve",      label: "Resolve" },
    { key: "agent",        label: "Agent Queue" },
    { key: "resolved",     label: "Resolved" },
  ];

  // Agent-routed posts adapted to the ReviewItem shape so they share the list,
  // detail panel, and actions.
  const agentItems = agentPosts.map(agentPostToReviewItem);
  const listSource = activeTab === "agent" ? agentItems : items;

  const filtered = listSource.filter(item => {
    if (activeTab === "agent")        return true;
    if (activeTab === "needs_review") return item.status === "PENDING_REVIEW" && !item.assigned_to;
    if (activeTab === "resolve")      return item.assigned_to === currentUserId && (item.status === "IN_REVIEW" || item.status === "ASSIGNED");
    if (activeTab === "resolved")     return ["APPROVED","REJECTED","AWAITING_REVISION","RELEASED"].includes(item.status);
    return true;
  }).filter(i => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return i.title.toLowerCase().includes(q) || i.risk_category?.toLowerCase().includes(q) || false;
  });

  const sorted = [...filtered].sort((a, b) => {
    const p = { URGENT: 0, HIGH: 1, NORMAL: 2, LOW: 3 };
    return (p[a.priority as keyof typeof p] ?? 9) - (p[b.priority as keyof typeof p] ?? 9);
  });

  const counts = {
    needs_review: items.filter(i => i.status === "PENDING_REVIEW" && !i.assigned_to).length,
    resolve:      items.filter(i => i.assigned_to === currentUserId && (i.status === "IN_REVIEW" || i.status === "ASSIGNED")).length,
    agent:        agentItems.length,
    resolved:     items.filter(i => ["APPROVED","REJECTED","AWAITING_REVISION","RELEASED"].includes(i.status)).length,
  };

  // Media
  const mediaUrls   = selectedItem?.content_snapshot?.urls as string[] | undefined;
  const fileType    = selectedItem?.content_snapshot?.file_type as string | undefined;
  const isImage     = !!(fileType?.startsWith("image") || fileType === "image");
  const isVideo     = !!(fileType?.startsWith("video") || fileType === "video" || fileType === "mixed");
  const hasMedia    = !!(mediaUrls?.length && (isImage || isVideo));
  const isFlagged   = selectedItem?.status === "BLOCKED" || selectedItem?.status === "REJECTED";
  const snapCopy    = selectedItem?.content_snapshot?.copy as string | undefined;
  const violation   = selectedItem?.content_snapshot?.violation_reason as string | undefined;

  const isMyClaim  = selectedItem?.assigned_to === currentUserId && selectedItem?.status === "IN_REVIEW";
  const isPoolItem = selectedItem?.status === "PENDING_REVIEW" && !selectedItem?.assigned_to;
  const isResolved = selectedItem && ["APPROVED","REJECTED","AWAITING_REVISION","RELEASED"].includes(selectedItem.status);

  // Agent-routed posts: no claim step — act directly while pending.
  const isAgentItem  = !!selectedItem?.__agent;
  const agentPending = isAgentItem && typeof selectedItem?.status === "string" && selectedItem.status.startsWith("PENDING");

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 pb-16">

      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 bg-surface-hover border border-border rounded-lg flex items-center justify-center">
              <Layers className="w-4 h-4 text-foreground-muted" />
            </div>
            <h1 className="text-xl font-bold text-foreground">Review Queue</h1>
          </div>
          <p className="text-sm text-foreground-muted ml-11">Human review pool. Claim an item, then approve, reject, or return to creator.</p>
        </div>
        <button onClick={fetchData} disabled={loading}
          className="flex items-center gap-2 px-3 py-2 bg-surface-hover hover:bg-surface-hover border border-border rounded-lg text-foreground-muted text-xs font-medium transition-colors disabled:opacity-50">
          <RefreshCcw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Toast */}
      {message && (
        <div className={`mb-5 p-3 rounded-lg flex items-center gap-2.5 text-xs font-medium border ${
          message.type === "success"
            ? "bg-success-text/10 border-success-border/20 text-success-text"
            : "bg-error-text/10 border-error-border/20 text-error-text"
        }`}>
          {message.type === "success" ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
          {message.text}
          <button onClick={() => setMessage(null)} className="ml-auto text-foreground-muted hover:text-foreground-muted"><X className="w-3 h-3" /></button>
        </div>
      )}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: "Needs Review", value: counts.needs_review,                              color: "text-blue-400" },
            { label: "Resolve",      value: counts.resolve,                                   color: "text-warning-text" },
            { label: "Approved",     value: stats.approved,                                   color: "text-success-text" },
            { label: "Returned",     value: stats.rejected + stats.awaiting_revision,          color: "text-error-text" },
          ].map(s => (
            <div key={s.label} className="p-4 bg-surface border border-border rounded-lg">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-foreground-muted font-medium mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Workflow Banner */}
      <div className="mb-6 p-3 bg-surface border border-border rounded-lg flex items-center gap-3">
        <Zap className="w-3.5 h-3.5 text-foreground-muted shrink-0" />
        <div className="flex items-center gap-2 text-[10px] text-foreground-muted flex-1 flex-wrap">
          {["Upload", "AI Scan Flags", "Review Queue (shared)"].map((step, i, arr) => (
            <span key={step} className="flex items-center gap-2">
              <span className={`px-2 py-0.5 bg-surface-hover border border-border rounded text-foreground-muted ${step.includes("shared") ? "text-warning-text border-warning-border/30 bg-warning-text/10" : ""}`}>{step}</span>
              {i < arr.length - 1 && <ArrowRight className="w-3 h-3 text-foreground-muted" />}
            </span>
          ))}
          <ArrowRight className="w-3 h-3 text-foreground-muted" />
          <span className="text-foreground-muted">Reviewer →</span>
          <span className="px-2 py-0.5 bg-success-text/10 border border-success-border/20 rounded text-success-text">Approve</span>
          <span className="text-foreground-muted">|</span>
          <span className="px-2 py-0.5 bg-red-500/10 border border-red-500/20 rounded text-red-400">Reject</span>
          <span className="text-foreground-muted">|</span>
          <span className="px-2 py-0.5 bg-orange-500/10 border border-orange-500/20 rounded text-orange-400">Return</span>
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex gap-5 items-start">

        {/* Left: Item List */}
        <div className="w-[260px] shrink-0 flex flex-col gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground-muted" />
            <input type="text" placeholder="Search..." value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-surface border border-border rounded-lg text-xs text-foreground placeholder-zinc-600 focus:outline-none focus:border-border transition-colors" />
          </div>

          <div className="flex gap-1 bg-surface border border-border rounded-lg p-0.5">
            {TABS.map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`flex-1 px-2 py-1.5 text-[10px] font-semibold rounded transition-all ${
                  activeTab === tab.key ? "bg-white text-black" : "text-foreground-muted hover:text-foreground-muted"
                }`}>
                {tab.label}
                {counts[tab.key as keyof typeof counts] > 0 && (
                  <span className={`ml-1 px-1 rounded text-[8px] font-bold ${
                    activeTab === tab.key ? "bg-black/10 text-black" : "bg-surface-hover text-foreground-muted"
                  }`}>
                    {counts[tab.key as keyof typeof counts]}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="space-y-1.5 h-[360px] overflow-y-auto scrollbar-none">
            {loading ? (
              <div className="flex flex-col items-center py-12 text-foreground-muted gap-3">
                <div className="w-5 h-5 border-2 border-border border-t-zinc-400 rounded-full animate-spin" />
                <p className="text-[10px]">Loading...</p>
              </div>
            ) : sorted.length === 0 ? (
              <div className="bg-surface border border-border rounded-lg p-8 text-center">
                <CheckCircle2 className="w-6 h-6 text-foreground-muted mx-auto mb-2" />
                <p className="text-xs text-foreground-muted">No items</p>
              </div>
            ) : sorted.map(item => {
              const isSelected = selectedItem?.id === item.id;
              const status = STATUS_CONFIG[item.status] || { label: item.status, color: "bg-surface-hover text-foreground-muted border-border" };
              return (
                <button key={item.id} onClick={() => handleSelect(item)}
                  className={`w-full text-left rounded-lg p-3 transition-all border ${
                    isSelected ? "bg-surface-hover border-border" : "bg-surface border-border hover:border-border"
                  }`}>
                  <p className="text-[11px] font-semibold text-foreground line-clamp-2 mb-1.5">{item.title}</p>
                  <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                    <span className={`px-1.5 py-[1px] rounded border text-[8px] font-bold ${status.color}`}>{status.label}</span>
                    <span className={`px-1.5 py-[1px] rounded border text-[8px] font-bold ${RISK_CONFIG[item.risk_level] || ""}`}>{item.risk_level}</span>
                  </div>
                  <div className="flex items-center justify-between text-[9px] text-foreground-muted">
                    <span>{item.submitter_name || item.submitted_by?.slice(0, 12)}</span>
                    <span>{formatRelative(item.submitted_at)}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Detail */}
        <div className="flex-1 min-w-0">
          {!selectedItem ? (
            <div className="bg-surface border border-border rounded-lg p-16 text-center">
              <Eye className="w-8 h-8 text-foreground-muted mx-auto mb-3" />
              <p className="text-sm font-semibold text-foreground-muted">Select an item to review</p>
              <p className="text-xs text-foreground-muted mt-1">Choose from the queue on the left</p>
            </div>
          ) : (
            <div className="space-y-3">

              {/* Instagram PC Card */}
              <div className="bg-surface border border-border rounded-lg overflow-hidden">
                <div className={`flex items-stretch ${hasMedia ? "" : "flex-col"}`}>

                  {/* Left info pane */}
                  <div className={`flex flex-col gap-3 ${hasMedia ? "w-[230px] shrink-0 border-r border-border p-4" : "w-full p-5"}`}>

                    {/* Title + badges */}
                    <div className="pb-3 border-b border-border">
                      <h3 className="text-sm font-bold text-foreground leading-snug mb-2">{selectedItem.title}</h3>
                      <div className="flex items-center gap-1.5 flex-wrap mb-2">
                        <span className={`px-2 py-0.5 rounded border text-[8px] font-bold ${STATUS_CONFIG[selectedItem.status]?.color || "bg-surface-hover text-foreground-muted border-border"}`}>
                          {STATUS_CONFIG[selectedItem.status]?.label || selectedItem.status}
                        </span>
                        <span className={`px-2 py-0.5 rounded border text-[8px] font-bold ${RISK_CONFIG[selectedItem.risk_level] || ""}`}>
                          {selectedItem.risk_level}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[9px] text-foreground-muted">
                        <User className="w-3 h-3 shrink-0" />
                        <span className="text-foreground-muted font-medium truncate">
                          {selectedItem.submitter_name || selectedItem.submitted_by?.slice(0, 16)}
                        </span>
                        {selectedItem.submitter_role && (
                          <span className="px-1 py-[1px] bg-surface-hover border border-border text-foreground-muted text-[7px] font-bold rounded capitalize">
                            {selectedItem.submitter_role.toLowerCase()}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-[9px] text-foreground-muted mt-0.5">
                        <Calendar className="w-3 h-3 shrink-0" />
                        <span>{formatDateTime(selectedItem.submitted_at)}</span>
                      </div>
                      <p className="text-[9px] text-foreground-muted mt-1">{selectedItem.item_type} · {selectedItem.source_module}</p>
                    </div>

                    {/* Copy text */}
                    {snapCopy && (
                      <div className="bg-card border border-border rounded-lg p-2.5">
                        <p className="text-[10px] text-foreground-muted leading-relaxed">{snapCopy}</p>
                      </div>
                    )}

                    {/* Violation reason */}
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
                      {isAgentItem && agentPending && (
                        <>
                          <button onClick={() => handleAction("approve", { reason: "Approved" })} disabled={actionLoading !== null}
                            className="w-full px-3 py-2 bg-white hover:bg-zinc-100 text-black text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 disabled:opacity-50">
                            {actionLoading === "approve" ? <RefreshCcw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                            Approve &amp; Publish
                          </button>
                          <button onClick={() => { setShowActionDrawer("reject"); setDrawerText(""); }} disabled={actionLoading !== null}
                            className="w-full px-3 py-2 bg-surface-hover hover:bg-surface-hover border border-border text-red-400 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 disabled:opacity-50">
                            <XCircle className="w-3.5 h-3.5" /> Reject
                          </button>
                          <button onClick={() => { setShowActionDrawer("return"); setDrawerText(""); }} disabled={actionLoading !== null}
                            className="w-full px-3 py-2 bg-surface-hover hover:bg-surface-hover border border-border text-orange-400 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 disabled:opacity-50">
                            <RotateCcw className="w-3.5 h-3.5" /> Return to Creator
                          </button>
                        </>
                      )}
                      {isAgentItem && !agentPending && (
                        <div className={`rounded-lg p-2.5 text-center text-[10px] font-semibold border ${
                          selectedItem.status === "APPROVED" ? "bg-success-text/10 text-success-text border-success-border/20" :
                          selectedItem.status === "REJECTED" || selectedItem.status === "GOVERNANCE_BLOCKED" ? "bg-red-500/10 text-red-400 border-red-500/20" :
                          "bg-orange-500/10 text-orange-400 border-orange-500/20"
                        }`}>
                          {STATUS_CONFIG[selectedItem.status]?.label || selectedItem.status}
                        </div>
                      )}
                      {!isAgentItem && isPoolItem && (
                        <button onClick={() => handleAction("claim")} disabled={actionLoading !== null}
                          className="w-full px-3 py-2 bg-white hover:bg-zinc-100 text-black text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 disabled:opacity-50">
                          {actionLoading === "claim" ? <RefreshCcw className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
                          Claim & Review
                        </button>
                      )}
                      {!isAgentItem && isMyClaim && (
                        <>
                          <button onClick={() => handleAction("approve", { reason: "Approved" })} disabled={actionLoading !== null}
                            className="w-full px-3 py-2 bg-white hover:bg-zinc-100 text-black text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 disabled:opacity-50">
                            {actionLoading === "approve" ? <RefreshCcw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                            Approve
                          </button>
                          <button onClick={() => { setShowActionDrawer("reject"); setDrawerText(""); }} disabled={actionLoading !== null}
                            className="w-full px-3 py-2 bg-surface-hover hover:bg-surface-hover border border-border text-red-400 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 disabled:opacity-50">
                            <XCircle className="w-3.5 h-3.5" /> Reject
                          </button>
                          <button onClick={() => { setShowActionDrawer("return"); setDrawerText(""); }} disabled={actionLoading !== null}
                            className="w-full px-3 py-2 bg-surface-hover hover:bg-surface-hover border border-border text-orange-400 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 disabled:opacity-50">
                            <RotateCcw className="w-3.5 h-3.5" /> Return to Creator
                          </button>
                          <button onClick={() => handleAction("unclaim")} disabled={actionLoading !== null}
                            className="w-full px-2 py-1.5 text-[10px] text-foreground-muted hover:text-foreground-muted flex items-center justify-center gap-1 transition-colors">
                            <X className="w-3 h-3" /> Release to pool
                          </button>
                        </>
                      )}
                      {!isAgentItem && isResolved && (
                        <div className={`rounded-lg p-2.5 text-center text-[10px] font-semibold border ${
                          selectedItem.status === "APPROVED" ? "bg-success-text/10 text-success-text border-success-border/20" :
                          selectedItem.status === "REJECTED" ? "bg-red-500/10 text-red-400 border-red-500/20" :
                          "bg-orange-500/10 text-orange-400 border-orange-500/20"
                        }`}>
                          {selectedItem.status === "APPROVED" ? "Approved — Resolved" :
                           selectedItem.status === "REJECTED" ? "Rejected — Resolved" : "Returned to Creator"}
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
                            onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
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
                            <span className="absolute top-2 right-2 bg-black/60 text-foreground text-[9px] font-bold px-2 py-0.5 rounded-full">
                              {activeMediaIdx + 1} / {mediaUrls.length}
                            </span>
                          )}
                        </div>
                      )}
                      {isVideo && (
                        <div className="relative aspect-video w-full">
                          <video src={mediaUrls[0]} controls className="w-full h-full object-contain"
                            onError={e => { (e.target as HTMLVideoElement).style.display = "none"; }} />
                          {isFlagged && (
                            <div className="absolute inset-0 bg-red-950/40 flex items-center justify-center backdrop-blur-[1px] pointer-events-none">
                              <div className="flex items-center gap-2 bg-red-500/20 border border-red-500/30 px-3 py-1.5 rounded-lg">
                                <Ban className="w-4 h-4 text-red-400" />
                                <span className="text-red-300 text-xs font-bold uppercase tracking-wide">Blocked</span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      {isImage && mediaUrls.length > 1 && (
                        <div className="flex gap-1.5 p-2 bg-card border-t border-border overflow-x-auto scrollbar-none">
                          {mediaUrls.map((url, idx) => (
                            <button key={idx} onClick={() => setActiveMediaIdx(idx)}
                              className={`relative h-12 w-12 shrink-0 rounded overflow-hidden bg-black border-2 transition-all ${
                                activeMediaIdx === idx ? "border-white" : "border-border opacity-50 hover:opacity-80"
                              }`}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={url} alt={`${idx + 1}`} className="w-full h-full object-cover"
                                onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
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
                <div className={`rounded-lg p-4 space-y-3 border ${
                  showActionDrawer === "reject" ? "bg-red-500/[0.03] border-red-500/20" : "bg-orange-500/[0.03] border-orange-500/20"
                }`}>
                  <div className="flex items-center justify-between">
                    <p className={`text-xs font-bold ${showActionDrawer === "reject" ? "text-red-300" : "text-orange-300"}`}>
                      {showActionDrawer === "reject" ? "Rejection Reason" : "Return Instructions"}
                    </p>
                    <button onClick={() => setShowActionDrawer(null)} className="text-foreground-muted hover:text-foreground-muted">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <textarea
                    placeholder={showActionDrawer === "reject" ? "Reason for rejection..." : "Instructions for the creator..."}
                    value={drawerText} onChange={e => setDrawerText(e.target.value)} rows={3}
                    className={`w-full bg-card rounded-lg p-3 text-xs text-foreground placeholder-zinc-600 focus:outline-none resize-none border ${
                      showActionDrawer === "reject" ? "border-red-500/20 focus:border-red-500/40" : "border-orange-500/20 focus:border-orange-500/40"
                    }`}
                  />
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setShowActionDrawer(null)}
                      className="px-3 py-1.5 bg-surface-hover border border-border hover:bg-surface-hover text-xs font-semibold rounded-lg text-foreground-muted">
                      Cancel
                    </button>
                    <button
                      onClick={() => showActionDrawer === "reject"
                        ? handleAction("reject", { reason: drawerText })
                        : handleAction("request_revision", { note: drawerText, reason: "Revision requested" })}
                      disabled={!drawerText.trim() || actionLoading !== null}
                      className="px-4 py-1.5 bg-white hover:bg-zinc-100 text-black text-xs font-bold rounded-lg transition-colors disabled:opacity-40">
                      {showActionDrawer === "reject" ? "Confirm Reject" : "Send to Creator"}
                    </button>
                  </div>
                </div>
              )}

              {/* Notes */}
              {notes.length > 0 && (
                <div className="bg-surface border border-border rounded-lg p-4">
                  <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider mb-3">Review Notes</p>
                  <div className="space-y-2">
                    {notes.map(note => (
                      <div key={note.id} className="border-l-2 border-border pl-3">
                        <p className="text-xs text-foreground-muted leading-relaxed">{note.note_body}</p>
                        <p className="text-[9px] text-foreground-muted mt-0.5">{note.created_by} · {formatRelative(note.created_at)}</p>
                      </div>
                    ))}
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
