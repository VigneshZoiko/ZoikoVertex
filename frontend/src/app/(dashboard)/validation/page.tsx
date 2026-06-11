"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  RefreshCcw, AlertCircle, Clock, CheckCircle2, Ban,
  Search, Play, Eye, RotateCcw, ShieldAlert,
  Layers, X, MessageSquare, Send, Zap, Image,
  FileText, AlertTriangle, Shield, ArrowRight,
  User, Calendar
} from "lucide-react";
import { api } from "@/lib/api";

// ——— Types —————————————————————————————————————————————————————————————————————

interface ValidationItem {
  id: string;
  tenant_id: string;
  source_module: string;
  source_entity_id: string;
  item_type: string;
  title: string;
  campaign?: string;
  platform?: string;
  content_snapshot: Record<string, unknown>;
  validation_status: string;
  highest_severity: string;
  failed_rule_count: number;
  warning_count: number;
  blocked_rule_count: number;
  manual_check_count: number;
  source_grounding_status: string;
  assigned_validator?: string;
  risk_level: string;
  validation_score?: number;
  due_at?: string;
  submitted_by?: string;
  submitter_name?: string;
  submitter_role?: string;
  submitted_at: string;
  created_at: string;
  updated_at: string;
}

interface ValidationStats {
  pending_validation?: number;
  pending?: number;
  passed: number;
  warnings: number;
  failed: number;
  blocked: number;
  needs_revision?: number;
  escalation_required: number;
}

interface RuleResult {
  id: string;
  rule_name: string;
  rule_category: string;
  result: string;
  severity: string;
  explanation: string;
  override_eligible: boolean;
  manual_check_required: boolean;
}

interface ValidatorNote {
  id: string;
  note_body: string;
  created_by: string;
  created_at: string;
}

interface TimelineEntry {
  id: string;
  action: string;
  performed_by: string;
  performed_at: string;
}

// ——— Config Maps ———————————————————————————————————————————————————————————————

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  PENDING_VALIDATION:    { label: "Pending",          color: "bg-blue-500/15 text-blue-300 border-blue-500/25",       icon: <Clock className="w-3 h-3" /> },
  IN_VALIDATION:         { label: "Validating",        color: "bg-indigo-500/15 text-indigo-300 border-indigo-500/25", icon: <RefreshCcw className="w-3 h-3 animate-spin" /> },
  PASSED:                { label: "Passed",            color: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25", icon: <CheckCircle2 className="w-3 h-3" /> },
  WARNING:               { label: "Warning",           color: "bg-amber-500/15 text-amber-300 border-amber-500/25",    icon: <AlertTriangle className="w-3 h-3" /> },
  FAILED:                { label: "Failed",            color: "bg-rose-500/15 text-rose-300 border-rose-500/25",       icon: <AlertCircle className="w-3 h-3" /> },
  BLOCKED:               { label: "Blocked",           color: "bg-red-600/15 text-red-400 border-red-600/25",          icon: <Ban className="w-3 h-3" /> },
  NEEDS_REVISION:        { label: "Returned",          color: "bg-orange-500/15 text-orange-300 border-orange-500/25", icon: <RotateCcw className="w-3 h-3" /> },
  MANUAL_CHECK_REQUIRED: { label: "In Review Queue",   color: "bg-amber-500/15 text-amber-300 border-amber-500/25",    icon: <Layers className="w-3 h-3" /> },
  ESCALATION_REQUIRED:   { label: "Escalated",         color: "bg-red-500/15 text-red-400 border-red-500/25",          icon: <AlertCircle className="w-3 h-3" /> },
  COMPLETED:             { label: "Completed",         color: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25", icon: <CheckCircle2 className="w-3 h-3" /> },
  PASSED_WITH_OVERRIDE:  { label: "Passed (Override)", color: "bg-teal-500/15 text-teal-300 border-teal-500/25",       icon: <Shield className="w-3 h-3" /> },
};

const RISK_CONFIG: Record<string, { badge: string }> = {
  LOW:      { badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  MEDIUM:   { badge: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  HIGH:     { badge: "bg-orange-500/10 text-orange-400 border-orange-500/20" },
  CRITICAL: { badge: "bg-red-500/10 text-red-400 border-red-500/20" },
};

const VALIDATION_TABS = [
  { key: "queue",    label: "Pending",  desc: "Awaiting automated scan" },
  { key: "passed",   label: "Passed",   desc: "Auto-approved & safe" },
  { key: "rejected", label: "Flagged",  desc: "Blocked / In review queue" },
];

const ITEM_TYPE_ICONS: Record<string, React.ReactNode> = {
  "Social Post":     <MessageSquare className="w-3.5 h-3.5" />,
  "Campaign Asset":  <Layers className="w-3.5 h-3.5" />,
  "Inbox Reply":     <Send className="w-3.5 h-3.5" />,
  "Agent Action":    <Zap className="w-3.5 h-3.5" />,
  "Workflow Output": <Play className="w-3.5 h-3.5" />,
  // eslint-disable-next-line jsx-a11y/alt-text
  "campaign_asset":  <Image className="w-3.5 h-3.5" />,
};

function formatDate(dateStr?: string): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatShortDate(dateStr?: string): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatRelativeTime(dateStr?: string): string {
  if (!dateStr) return "—";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (mins > 0) return `${mins}m ago`;
  return "Just now";
}

// ——— Main Component ————————————————————————————————————————————————————————————

export default function ValidationDeskPage() {
  const [items, setItems] = useState<ValidationItem[]>([]);
  const [stats, setStats] = useState<ValidationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<ValidationItem | null>(null);
  const [activeTab, setActiveTab] = useState("queue");
  const [searchQuery, setSearchQuery] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [activeMediaIdx, setActiveMediaIdx] = useState(0);

  // Details data
  const [ruleResults, setRuleResults] = useState<RuleResult[]>([]);
  const [notes, setNotes] = useState<ValidatorNote[]>([]);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [showReturnDrawer, setShowReturnDrawer] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");

  const initialSelectDone = useRef(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [itemsRes, statsRes] = await Promise.all([
        api.get("/api/v1/validation/items"),
        api.get("/api/v1/validation/stats"),
      ]);
      if (itemsRes.success) {
        const validationItems = (itemsRes.data || []) as ValidationItem[];
        setItems(validationItems);
        if (validationItems.length > 0 && !initialSelectDone.current) {
          initialSelectDone.current = true;
          setSelectedItem(validationItems[0]);
        }
      }
      if (statsRes.success) setStats(statsRes.data as ValidationStats);
    } catch {
      setError("Validation Desk could not be loaded. Try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const fetchItemDetails = useCallback(async (itemId: string) => {
    try {
      const [runsRes, notesRes, timelineRes] = await Promise.all([
        api.get(`/api/v1/validation/items/${itemId}/runs`),
        api.get(`/api/v1/validation/items/${itemId}/notes`),
        api.get(`/api/v1/validation/items/${itemId}/audit-log`),
      ]);
      if (runsRes.success && runsRes.data?.length > 0) {
        const rulesRes = await api.get(`/api/v1/validation/items/${itemId}/rule-history`);
        if (rulesRes.success) setRuleResults((rulesRes.data || []) as RuleResult[]);
      } else {
        setRuleResults([]);
      }
      if (notesRes.success) setNotes((notesRes.data || []) as ValidatorNote[]);
      if (timelineRes.success) setTimeline((timelineRes.data || []) as TimelineEntry[]);
    } catch {
      // silent
    }
  }, []);

  const handleSelectItem = (item: ValidationItem) => {
    setSelectedItem(item);
    setMessage(null);
    setShowReturnDrawer(false);
    setFeedbackText("");
    setActiveMediaIdx(0);
    fetchItemDetails(item.id);
  };

  const handleRunChecks = async () => {
    if (!selectedItem) return;
    setActionLoading("run_validation");
    setMessage(null);
    try {
      const result = await api.post(`/api/v1/validation/items/${selectedItem.id}/run`, {});
      if (result.success) {
        setMessage({ type: "success", text: "Automated checks completed successfully." });
        fetchData();
        fetchItemDetails(selectedItem.id);
      }
    } catch {
      setMessage({ type: "error", text: "Failed to run validation checks." });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReturnToCreator = async () => {
    if (!selectedItem || !feedbackText.trim()) return;
    setActionLoading("return_to_creator");
    setMessage(null);
    try {
      const result = await api.post(`/api/v1/validation/items/${selectedItem.id}/return-to-creator`, { note: feedbackText });
      if (result.success) {
        setMessage({ type: "success", text: "Returned to creator. Notification sent." });
        setFeedbackText("");
        setShowReturnDrawer(false);
        fetchData();
        fetchItemDetails(selectedItem.id);
      }
    } catch {
      setMessage({ type: "error", text: "Failed to return item to creator." });
    } finally {
      setActionLoading(null);
    }
  };

  const filteredItems = items.filter(item => {
    if (activeTab === "queue")    return item.validation_status === "PENDING_VALIDATION" || item.validation_status === "IN_VALIDATION";
    if (activeTab === "passed")   return item.validation_status === "PASSED" || item.validation_status === "COMPLETED" || item.validation_status === "PASSED_WITH_OVERRIDE";
    if (activeTab === "rejected") return item.validation_status === "FAILED" || item.validation_status === "BLOCKED" || item.validation_status === "NEEDS_REVISION" || item.validation_status === "MANUAL_CHECK_REQUIRED";
    return true;
  }).filter(item => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return item.title.toLowerCase().includes(q) || (item.campaign || "").toLowerCase().includes(q) || (item.platform || "").toLowerCase().includes(q);
  });

  const sortedItems = [...filteredItems].sort((a, b) => {
    const riskOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    const aRisk = riskOrder[a.risk_level as keyof typeof riskOrder] ?? 99;
    const bRisk = riskOrder[b.risk_level as keyof typeof riskOrder] ?? 99;
    if (aRisk !== bRisk) return aRisk - bRisk;
    return new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime();
  });

  const tabCounts = {
    queue:    items.filter(i => i.validation_status === "PENDING_VALIDATION" || i.validation_status === "IN_VALIDATION").length,
    passed:   items.filter(i => i.validation_status === "PASSED" || i.validation_status === "COMPLETED" || i.validation_status === "PASSED_WITH_OVERRIDE").length,
    rejected: items.filter(i => i.validation_status === "FAILED" || i.validation_status === "BLOCKED" || i.validation_status === "NEEDS_REVISION").length,
  };

  const isRejected = !!(selectedItem && (
    selectedItem.validation_status === "FAILED" ||
    selectedItem.validation_status === "BLOCKED" ||
    selectedItem.validation_status === "NEEDS_REVISION"
  ));

  const isPassed = !!(selectedItem && (
    selectedItem.validation_status === "PASSED" ||
    selectedItem.validation_status === "COMPLETED" ||
    selectedItem.validation_status === "PASSED_WITH_OVERRIDE"
  ));

  const failedRules = ruleResults.filter(r => r.result === "FAILED" || r.result === "BLOCKED");
  const passedRules = ruleResults.filter(r => r.result === "PASSED" || r.result === "WARNING");

  // —— media derived from selected item ——
  const mediaUrls    = selectedItem?.content_snapshot?.urls as string[] | undefined;
  const mediaFt      = selectedItem?.content_snapshot?.file_type as string | undefined;
  const isImageMedia = !!(mediaFt?.startsWith("image") || mediaFt === "image");
  const isVideoMedia = !!(mediaFt?.startsWith("video") || mediaFt === "video" || mediaFt === "mixed");
  const hasMedia     = !!(mediaUrls?.length && (isImageMedia || isVideoMedia));
  const mediaCopy    = selectedItem?.content_snapshot?.copy as string | undefined;
  const mediaViolation = selectedItem?.content_snapshot?.violation_reason as string | undefined;
  const mediaScanNotes = Array.isArray(selectedItem?.content_snapshot?.scan_notes)
    ? selectedItem!.content_snapshot.scan_notes as string[]
    : [];

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 pb-16">

      {/* —— Header ———————————————————————————————————————————————————————————— */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-7 h-7 bg-indigo-500/15 rounded-lg flex items-center justify-center">
              <Shield className="w-4 h-4 text-indigo-400" />
            </div>
            <h1 className="text-lg font-bold text-foreground">Validation Desk</h1>
          </div>
          <p className="text-[11px] text-foreground-muted ml-9">
            Automated media safety scanning. Violations are blocked from vault and returned to creator.
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="p-2 bg-surface border border-border rounded-lg text-foreground-muted hover:text-white hover:border-border transition-all disabled:opacity-50"
        >
          <RefreshCcw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-indigo-400" : ""}`} />
        </button>
      </div>

      {/* —— Toast ————————————————————————————————————————————————————————————— */}
      {message && (
        <div className={`mb-4 p-3 rounded-lg flex items-center gap-2.5 text-xs font-semibold transition-all ${
          message.type === "success"
            ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
            : "bg-rose-500/10 border border-rose-500/20 text-rose-400"
        }`}>
          {message.type === "success" ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
          {message.text}
          <button onClick={() => setMessage(null)} className="ml-auto text-foreground-muted hover:text-white">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* —— Stats Row ————————————————————————————————————————————————————————— */}
      {stats && (
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: "Pending Scan",  value: stats.pending ?? stats.pending_validation ?? 0, icon: <Clock className="w-4 h-4" />,        color: "text-blue-400",    bg: "bg-blue-500/10" },
            { label: "Auto-Passed",   value: stats.passed,                                   icon: <CheckCircle2 className="w-4 h-4" />,  color: "text-emerald-400", bg: "bg-emerald-500/10" },
            { label: "Blocked",       value: stats.blocked,                                   icon: <Ban className="w-4 h-4" />,           color: "text-red-400",     bg: "bg-red-500/10" },
            { label: "Returned",      value: (stats.failed || 0) + (stats.needs_revision ?? 0), icon: <RotateCcw className="w-4 h-4" />, color: "text-orange-400",  bg: "bg-orange-500/10" },
          ].map(stat => (
            <div key={stat.label} className="bg-surface border border-border rounded-lg p-3.5 flex items-center gap-3">
              <div className={`w-9 h-9 ${stat.bg} ${stat.color} rounded-lg flex items-center justify-center shrink-0`}>{stat.icon}</div>
              <div>
                <p className="text-lg font-bold text-foreground leading-none">{stat.value}</p>
                <p className="text-[9px] text-foreground-muted font-semibold uppercase tracking-wider mt-0.5">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* —— Automated Workflow Banner —————————————————————————————————————————— */}
      <div className="mb-5 p-3 bg-indigo-500/5 border border-indigo-500/15 rounded-lg flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-indigo-400 shrink-0">
          <Zap className="w-3.5 h-3.5" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Automated Workflow</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-foreground-muted flex-1 flex-wrap">
          <span className="px-2 py-0.5 bg-surface border border-border rounded text-foreground-muted">Upload</span>
          <ArrowRight className="w-3 h-3 text-foreground-muted" />
          <span className="px-2 py-0.5 bg-surface border border-border rounded text-foreground-muted">AI Scan</span>
          <ArrowRight className="w-3 h-3 text-foreground-muted" />
          <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded text-emerald-400">Safe â†’ Vault</span>
          <span className="text-foreground-muted">or</span>
          <span className="px-2 py-0.5 bg-red-500/10 border border-red-500/20 rounded text-red-400">Violations â†’ Blocked</span>
          <ArrowRight className="w-3 h-3 text-foreground-muted" />
          <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded text-amber-400">Review Queue (human)</span>
        </div>
      </div>

      {/* —— Main 2-Panel Layout ———————————————————————————————————————————————— */}
      <div className="flex gap-4 items-start">

        {/* â•â•â• Left Panel: Item List â•â•â• */}
        <div className="w-[290px] shrink-0 flex flex-col gap-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground-muted" />
            <input
              type="text"
              placeholder="Search validations..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-2 bg-surface border border-border rounded-lg text-xs text-foreground placeholder-zinc-600 focus:outline-none focus:border-indigo-500/40 transition-colors"
            />
          </div>

          <div className="flex gap-1">
            {VALIDATION_TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 px-2 py-1.5 text-[10px] font-bold rounded-lg transition-all relative ${
                  activeTab === tab.key
                    ? "bg-indigo-500/15 text-indigo-300 border border-indigo-500/25"
                    : "text-foreground-muted hover:text-foreground-muted border border-transparent"
                }`}
              >
                {tab.label}
                {tabCounts[tab.key as keyof typeof tabCounts] > 0 && (
                  <span className={`ml-1 px-1 rounded text-[8px] font-bold ${
                    activeTab === tab.key ? "bg-indigo-500/30 text-indigo-300" : "bg-white/5 text-foreground-muted"
                  }`}>
                    {tabCounts[tab.key as keyof typeof tabCounts]}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1 scrollbar-none">
            {loading ? (
              <div className="flex flex-col items-center py-12 text-foreground-muted gap-3">
                <div className="w-6 h-6 border-2 border-indigo-500/50 border-t-indigo-500 rounded-full animate-spin" />
                <p className="text-[10px]">Loading validations...</p>
              </div>
            ) : sortedItems.length === 0 ? (
              <div className="bg-surface border border-border rounded-lg p-8 text-center">
                <Shield className="w-5 h-5 text-foreground-muted mx-auto mb-3" />
                <p className="text-[11px] text-foreground-muted font-medium">No items in this queue</p>
              </div>
            ) : (
              sortedItems.map(item => {
                const isSelected = selectedItem?.id === item.id;
                const status = STATUS_CONFIG[item.validation_status] || { label: item.validation_status, color: "bg-white/5 text-foreground-muted border-white/10", icon: null };
                const isItemRejected = item.validation_status === "FAILED" || item.validation_status === "BLOCKED" || item.validation_status === "NEEDS_REVISION";
                const isItemPassed   = item.validation_status === "PASSED"  || item.validation_status === "COMPLETED" || item.validation_status === "PASSED_WITH_OVERRIDE";
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectItem(item)}
                    className={`w-full text-left rounded-lg p-3 transition-all border ${
                      isSelected
                        ? "bg-indigo-500/[0.04] border-indigo-500/30"
                        : "bg-surface border-border hover:border-border"
                    } ${isItemRejected ? "border-l-2 border-l-red-500/40" : isItemPassed ? "border-l-2 border-l-emerald-500/40" : "border-l-2 border-l-blue-500/30"}`}
                  >
                    <div className="flex items-start gap-2 mb-2">
                      <span className="text-foreground-muted mt-0.5 shrink-0">{ITEM_TYPE_ICONS[item.item_type] || <Layers className="w-3 h-3" />}</span>
                      <p className="text-[11px] font-semibold text-foreground leading-tight line-clamp-2 flex-1">{item.title}</p>
                    </div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className={`inline-flex items-center gap-1 px-1.5 py-[0.5px] rounded-md border text-[8px] font-bold ${status.color}`}>
                        {status.icon}{status.label}
                      </span>
                      <span className={`px-1.5 py-[0.5px] rounded border text-[8px] font-bold ${RISK_CONFIG[item.risk_level]?.badge || "bg-white/5 text-foreground-muted border-white/10"}`}>
                        {item.risk_level}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[9px] text-foreground-muted">
                      <span>{item.submitter_name || item.submitted_by?.slice(0, 10) || "Unknown"}</span>
                      <span>{formatRelativeTime(item.submitted_at)}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* â•â•â• Right Panel: Item Detail â•â•â• */}
        <div className="flex-1 min-w-0">
          {!selectedItem ? (
            <div className="bg-surface border border-border rounded-lg p-16 text-center">
              <Eye className="w-7 h-7 text-zinc-800 mx-auto mb-4" />
              <p className="text-[13px] font-semibold text-foreground-muted">Select an item to view</p>
              <p className="text-[11px] text-foreground-muted mt-1">Choose a validation item from the list</p>
            </div>
          ) : (
            <div className="space-y-3">

              {/* —— Instagram PC card: left info | right media —————————————————— */}
              <div className="bg-surface border border-border rounded-lg overflow-hidden">
                <div className={`flex items-stretch ${hasMedia ? "" : "flex-col"}`}>

                  {/* Left: info pane */}
                  <div className={`p-4 flex flex-col gap-3 ${hasMedia ? "w-[230px] shrink-0 border-r border-border" : "w-full"}`}>

                    {/* Title + badges */}
                    <div>
                      <h3 className="text-sm font-bold text-foreground mb-2 leading-snug">{selectedItem.title}</h3>
                      <div className="flex items-center gap-1.5 flex-wrap mb-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[8px] font-bold ${STATUS_CONFIG[selectedItem.validation_status]?.color || "bg-white/5 text-foreground-muted border-white/10"}`}>
                          {STATUS_CONFIG[selectedItem.validation_status]?.icon}
                          {STATUS_CONFIG[selectedItem.validation_status]?.label || selectedItem.validation_status}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded border text-[8px] font-bold ${RISK_CONFIG[selectedItem.risk_level]?.badge || ""}`}>
                          {selectedItem.risk_level}
                        </span>
                      </div>
                      <div className="space-y-0.5 text-[9px] text-foreground-muted">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3 h-3 shrink-0" />
                          <span className="text-foreground font-medium">{selectedItem.submitter_name || selectedItem.submitted_by?.slice(0, 10) || "Unknown"}</span>
                          {selectedItem.submitter_role && (
                            <span className="px-1 py-[1px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[7px] font-bold rounded capitalize">
                              {selectedItem.submitter_role.toLowerCase()}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3 h-3 shrink-0" />
                          <span>{formatDate(selectedItem.submitted_at)}</span>
                          <span className="text-foreground-muted">{new Date(selectedItem.submitted_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</span>
                        </div>
                        {selectedItem.item_type && (
                          <p className="capitalize">{selectedItem.item_type.replace(/_/g, " ")} · {selectedItem.source_module}</p>
                        )}
                      </div>
                    </div>

                    {/* Copy text */}
                    {mediaCopy && (
                      <div className="bg-white/[0.03] border border-white/5 rounded-lg p-2.5">
                        <p className="text-[10px] text-foreground-muted leading-relaxed">{mediaCopy}</p>
                      </div>
                    )}

                    {/* Violation reason */}
                    {mediaViolation && (
                      <div className="flex items-start gap-2 p-2.5 bg-red-500/[0.06] border border-red-500/20 rounded-lg">
                        <Ban className="w-3 h-3 text-red-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-[8px] font-bold text-red-300 mb-0.5 uppercase tracking-wide">Block Reason</p>
                          <p className="text-[10px] text-red-200 leading-relaxed">{mediaViolation}</p>
                        </div>
                      </div>
                    )}


                    {/* No media + no copy placeholder */}
                    {!hasMedia && !mediaCopy && !mediaViolation && (
                      <div className="flex items-center gap-2 text-foreground-muted py-2">
                        <FileText className="w-4 h-4" />
                        <p className="text-xs">{mediaFt || "unknown type"}</p>
                      </div>
                    )}

                    {/* Run Checks button (pending only) */}
                    {(selectedItem.validation_status === "PENDING_VALIDATION" || selectedItem.validation_status === "IN_VALIDATION") && (
                      <button
                        onClick={handleRunChecks}
                        disabled={actionLoading !== null}
                        className="mt-auto w-full px-3 py-2 bg-white hover:bg-zinc-100 text-black text-[10px] font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        {actionLoading === "run_validation"
                          ? <RefreshCcw className="w-3.5 h-3.5 animate-spin" />
                          : <Play className="w-3.5 h-3.5" />}
                        Run Automated Checks
                      </button>
                    )}
                  </div>

                  {/* Right: media pane */}
                  {hasMedia && mediaUrls && (
                    <div className="flex-1 min-w-0 bg-black flex flex-col">

                      {/* Image */}
                      {isImageMedia && (
                        <div className="relative w-full flex items-center justify-center min-h-[200px] bg-black">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={mediaUrls[activeMediaIdx] ?? mediaUrls[0]}
                            alt={selectedItem.title}
                            className="w-full h-auto max-h-[520px] object-contain"
                            onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                          />
                          {isRejected && (
                            <div className="absolute inset-0 bg-red-950/50 flex items-center justify-center backdrop-blur-[1px]">
                              <div className="flex items-center gap-2 bg-red-500/20 border border-red-500/40 px-3 py-1.5 rounded-lg">
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

                      {/* Video */}
                      {isVideoMedia && (
                        <div className="relative aspect-video w-full overflow-hidden bg-black">
                          <video
                            src={mediaUrls[0]}
                            controls
                            className="w-full h-full object-contain"
                            onError={e => { (e.target as HTMLVideoElement).style.display = "none"; }}
                          />
                          {isRejected && (
                            <div className="absolute inset-0 bg-red-950/50 flex items-center justify-center backdrop-blur-[1px] pointer-events-none">
                              <div className="flex items-center gap-2 bg-red-500/20 border border-red-500/40 px-3 py-1.5 rounded-lg">
                                <Ban className="w-4 h-4 text-red-400" />
                                <span className="text-red-300 text-xs font-bold uppercase tracking-wide">Blocked</span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Thumbnail strip (multiple images) */}
                      {isImageMedia && mediaUrls.length > 1 && (
                        <div className="flex gap-1 p-1.5 bg-card border-t border-border overflow-x-auto scrollbar-none">
                          {mediaUrls.map((url, idx) => (
                            <button
                              key={idx}
                              onClick={() => setActiveMediaIdx(idx)}
                              className={`relative h-12 w-12 shrink-0 rounded overflow-hidden border-2 transition-all ${
                                activeMediaIdx === idx
                                  ? "border-indigo-500"
                                  : "border-border opacity-60 hover:opacity-100"
                              }`}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={url}
                                alt={`${idx + 1}`}
                                className="w-full h-full object-cover"
                                onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                              />
                            </button>
                          ))}
                        </div>
                      )}

                    </div>
                  )}
                </div>
              </div>

              {/* —— Passed: Auto-Approved Notice ——————————————————————————————— */}
              {isPassed && (
                <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-lg p-4 flex items-start gap-3">
                  <div className="w-8 h-8 bg-emerald-500/15 rounded-lg flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-emerald-300 mb-0.5">Media Auto-Approved & Added to Vault</p>
                    <p className="text-[10px] text-emerald-400/60 leading-relaxed">
                      This media passed all automated safety checks and has been added to the media vault. It is available for use.
                    </p>
                  </div>
                </div>
              )}

              {/* —— Rejected: Block Notice —————————————————————————————————————— */}
              {isRejected && (
                <div className="bg-red-500/5 border border-red-500/15 rounded-lg p-4 flex items-start gap-3">
                  <div className="w-8 h-8 bg-red-500/15 rounded-lg flex items-center justify-center shrink-0">
                    <Ban className="w-4 h-4 text-red-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-red-300 mb-0.5">
                      {selectedItem.validation_status === "BLOCKED"        ? "Permanently Blocked from Vault" :
                       selectedItem.validation_status === "NEEDS_REVISION" ? "Returned to Creator — Awaiting Resubmission" :
                       "Failed Safety Scan"}
                    </p>
                    <p className="text-[10px] text-red-400/60 leading-relaxed">
                      {selectedItem.validation_status === "BLOCKED"
                        ? "This media violated safety rules and is permanently blocked."
                        : "This media was automatically returned to the creator with violation details."}
                    </p>
                  </div>
                </div>
              )}

              {/* —— NEEDS_REVISION: Feedback notes ————————————————————————————— */}
              {selectedItem.validation_status === "NEEDS_REVISION" && notes.length > 0 && (
                <div className="bg-orange-500/5 border border-orange-500/15 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <RotateCcw className="w-3.5 h-3.5 text-orange-400" />
                    <span className="text-[11px] font-bold text-orange-300">Feedback Sent to Creator</span>
                    <span className="ml-auto text-[9px] text-orange-400/50 bg-orange-500/10 px-1.5 py-0.5 rounded border border-orange-500/20">
                      {notes.length} note{notes.length > 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="space-y-2 max-h-36 overflow-y-auto scrollbar-none">
                    {notes.map(note => (
                      <div key={note.id} className="border-l-2 border-orange-500/30 pl-3 space-y-0.5">
                        <p className="text-xs text-foreground leading-relaxed">{note.note_body}</p>
                        <p className="text-[9px] text-foreground-muted">
                          {note.created_by === "system" ? "âš¡ System" : `Validator ${note.created_by?.slice(0, 8)}`}
                          {" ¢ "}{formatShortDate(note.created_at)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* —— Automated Scan Results —————————————————————————————————————— */}
              {ruleResults.length > 0 && (
                <div className="bg-surface border border-border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <ShieldAlert className="w-3.5 h-3.5 text-indigo-400" />
                    <h4 className="text-[11px] font-bold text-foreground">Automated Scan Results</h4>
                    <div className="ml-auto flex gap-1.5">
                      {failedRules.length > 0 && (
                        <span className="text-[9px] px-1.5 py-0.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded font-bold">
                          {failedRules.length} Failed
                        </span>
                      )}
                      {passedRules.length > 0 && (
                        <span className="text-[9px] px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded font-bold">
                          {passedRules.length} Passed
                        </span>
                      )}
                    </div>
                  </div>
                  {failedRules.length > 0 && (
                    <div className="mb-3 space-y-2">
                      <p className="text-[9px] font-bold text-foreground-muted uppercase tracking-wider">Violations Detected</p>
                      {failedRules.map(rr => (
                        <div key={rr.id} className="p-3 rounded-lg bg-red-500/[0.04] border border-red-500/15">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-[11px] font-semibold text-foreground">{rr.rule_name}</span>
                            <span className={`text-[8px] px-2 py-0.5 rounded font-bold border ${
                              rr.result === "BLOCKED"
                                ? "bg-red-600/15 border-red-600/25 text-red-400"
                                : "bg-rose-500/15 border-rose-500/25 text-rose-400"
                            }`}>{rr.result}</span>
                          </div>
                          {rr.explanation && <p className="text-[10px] text-foreground-muted leading-relaxed">{rr.explanation}</p>}
                          <p className="text-[9px] text-foreground-muted mt-1">{rr.rule_category.replace(/_/g, " ")}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {passedRules.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-[9px] font-bold text-foreground-muted uppercase tracking-wider">Checks Passed</p>
                      {passedRules.map(rr => (
                        <div key={rr.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/[0.03] border border-emerald-500/10">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500/60 shrink-0" />
                          <span className="text-[10px] text-foreground-muted">{rr.rule_name}</span>
                          {rr.result === "WARNING" && <AlertTriangle className="w-3 h-3 text-amber-500/60 ml-auto" />}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* —— Audit Timeline —————————————————————————————————————————————— */}
              {timeline.length > 0 && (
                <div className="bg-surface border border-border rounded-lg p-4">
                  <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider mb-3">Audit History</p>
                  <div className="space-y-2">
                    {timeline.slice(0, 5).map((entry, i) => (
                      <div key={entry.id || i} className="flex items-start gap-2 text-[10px]">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500/40 mt-1.5 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-foreground-muted leading-snug">{entry.action?.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</p>
                          <p className="text-[9px] text-foreground-muted">
                            {formatShortDate(entry.performed_at)} — {entry.performed_by === "system" ? "System (Automated)" : entry.performed_by?.slice(0, 10)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* —— MANUAL_CHECK_REQUIRED â†’ Review Queue notice ————————————————— */}
              {(selectedItem.validation_status === "MANUAL_CHECK_REQUIRED" || selectedItem.validation_status === "FAILED") && (
                <div className="bg-amber-500/5 border border-amber-500/15 rounded-lg p-4 flex items-start gap-3">
                  <div className="w-8 h-8 bg-amber-500/15 rounded-lg flex items-center justify-center shrink-0">
                    <Layers className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-amber-300 mb-0.5">Sent to Review Queue</p>
                    <p className="text-[10px] text-amber-400/70 leading-relaxed">
                      This asset was flagged by the AI scan and added to the Review Queue for a human reviewer to decide.
                    </p>
                    <a href="/review-queue"
                      className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/25 rounded-lg text-amber-300 text-[10px] font-bold transition-colors">
                      <ArrowRight className="w-3 h-3" /> Go to Review Queue
                    </a>
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



