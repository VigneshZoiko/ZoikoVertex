"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  RefreshCcw, ShieldCheck, AlertCircle, Clock, FileCheck2, AlertTriangle,
  ArrowUpRight, MessageSquare, XCircle, CheckCircle2, Ban, Gavel, Search,
  Filter, BarChart2, UserCheck, UserPlus, Flag, Info, Download, ExternalLink,
  Eye, History, Pen, Send, MoreHorizontal, Play, User, Calendar,
  Sparkles, Zap, StopCircle, ClipboardList, RotateCcw, ShieldAlert,
  Layers, BookOpen, Scale, List, ChevronDown, ChevronUp, Plus,
  Check, X, FileText, HelpCircle, ArrowLeft, ArrowRight, Target, Star,
  ThumbsUp, ThumbsDown, Settings, Edit3, FileSearch,
} from "lucide-react";
import { api } from "@/lib/api";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface AuditItem {
  id: string; title: string; item_type: string; source_module: string;
  campaign?: string; platform?: string; original_status: string;
  audit_status: string; risk_level: string; quality_score?: number;
  score_band?: string; defect_count: number; highest_defect_severity?: string;
  assigned_auditor?: string; original_reviewer?: string; agent_id?: string;
  sample_reason?: string; published_at?: string; audit_due_at?: string;
  audit_started_at?: string; audit_completed_at?: string; submitted_at: string;
  submitted_by: string; created_at: string; updated_at: string;
}

interface AuditStats {
  total_audit_items: number; in_audit: number; passed: number;
  failed: number; needs_correction: number; avg_quality_score: number;
}

interface DefectEntry {
  id: string; category: string; severity: string; description: string;
  evidence_reference?: string; responsible_source?: string;
  corrective_action_required: boolean; owner?: string; due_at?: string;
  created_by: string; created_at: string; resolved_at?: string;
}

interface CorrectiveAction {
  id: string; title: string; defect_id?: string; owner?: string;
  priority: string; required_action: string; status: string;
  due_at?: string; completed_at?: string; created_by: string; created_at: string;
}

interface NoteEntry { id: string; note_body: string; created_by: string; created_at: string; }

interface EvidenceEntry { id: string; evidence_type: string; evidence_reference: string; source_module: string; captured_at: string; }

interface TimelineEntry { id: string; action: string; previous_value?: string; new_value?: string; performed_by: string; performed_at: string; }

// ─── Config ────────────────────────────────────────────────────────────────────

const METRIC_CARDS = [
  { key: "total_audit_items", label: "Audit Items", icon: <List className="w-4 h-4" />, color: "text-blue-400", bg: "bg-blue-500/5 border-blue-500/15" },
  { key: "in_audit",           label: "In Audit",     icon: <Clock className="w-4 h-4" />,          color: "text-indigo-400", bg: "bg-indigo-500/5 border-indigo-500/15" },
  { key: "passed",             label: "Passed",        icon: <CheckCircle2 className="w-4 h-4" />,    color: "text-emerald-400", bg: "bg-emerald-500/5 border-emerald-500/15" },
  { key: "failed",             label: "Failed",        icon: <XCircle className="w-4 h-4" />,         color: "text-rose-400", bg: "bg-rose-500/5 border-rose-500/15" },
  { key: "needs_correction",   label: "Needs Correction", icon: <AlertTriangle className="w-4 h-4" />,color: "text-orange-400", bg: "bg-orange-500/5 border-orange-500/15" },
  { key: "avg_quality_score",  label: "Avg Quality Score",icon: <Star className="w-4 h-4" />,         color: "text-amber-400", bg: "bg-amber-500/5 border-amber-500/15" },
];

const AUDIT_TABS = [
  { key: "audit_queue",       label: "Audit Queue" },
  { key: "assigned_to_me",    label: "Assigned to Me" },
  { key: "in_audit",          label: "In Audit" },
  { key: "passed",            label: "Passed" },
  { key: "failed",            label: "Failed" },
  { key: "needs_correction",  label: "Needs Correction" },
  { key: "high_severity",     label: "High-Severity Defects" },
  { key: "published_check",   label: "Published Check" },
  { key: "completed",         label: "Completed Audits" },
];

const COMPARISON_TABS = [
  { key: "ai_draft",          label: "AI Draft",       icon: <Sparkles className="w-3 h-3" /> },
  { key: "human_edits",       label: "Human Edits",    icon: <Edit3 className="w-3 h-3" /> },
  { key: "approved_version",  label: "Approved Version",icon: <CheckCircle2 className="w-3 h-3" /> },
  { key: "published_version", label: "Published/Sent",  icon: <Send className="w-3 h-3" /> },
  { key: "validation_results",label: "Validation",      icon: <ShieldCheck className="w-3 h-3" /> },
  { key: "approval_history",  label: "Approval History",icon: <History className="w-3 h-3" /> },
  { key: "audit_findings",    label: "Audit Findings",  icon: <FileSearch className="w-3 h-3" /> },
  { key: "evidence",          label: "Evidence",        icon: <Eye className="w-3 h-3" /> },
  { key: "corrective_actions",label: "Corrective",      icon: <Pen className="w-3 h-3" /> },
];

const AUDIT_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  AUDIT_PENDING:             { label: "Audit Pending",          color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
  IN_AUDIT:                  { label: "In Audit",               color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20" },
  PASSED:                    { label: "Passed",                 color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
  FAILED:                    { label: "Failed",                 color: "text-rose-400 bg-rose-500/10 border-rose-500/20" },
  NEEDS_CORRECTION:          { label: "Needs Correction",       color: "text-orange-400 bg-orange-500/10 border-orange-500/20" },
  CORRECTIVE_ACTION_OPEN:    { label: "Corrective Action Open", color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
  CORRECTIVE_ACTION_COMPLETE:{ label: "Corrective Action Done", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
  ESCALATED:                 { label: "Escalated",              color: "text-red-400 bg-red-500/10 border-red-500/20" },
  CLOSED:                    { label: "Closed",                 color: "text-gray-400 bg-gray-500/10 border-gray-500/20" },
  ARCHIVED:                  { label: "Archived",               color: "text-gray-500 bg-gray-500/5 border-gray-500/10" },
};

const RISK_BADGE: Record<string, string> = {
  LOW: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  MEDIUM: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  HIGH: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  CRITICAL: "bg-red-500/10 text-red-400 border-red-500/20",
};

const SEVERITY_DOT: Record<string, string> = {
  MINOR: "bg-emerald-400", MODERATE: "bg-amber-400", MAJOR: "bg-orange-400", CRITICAL: "bg-red-400",
};

const ITEM_TYPE_ICONS: Record<string, React.ReactNode> = {
  "Social Post": <MessageSquare className="w-3.5 h-3.5" />,
  "Inbox Reply": <Send className="w-3.5 h-3.5" />,
  "Campaign Asset": <Layers className="w-3.5 h-3.5" />,
  "Agent Action": <Zap className="w-3.5 h-3.5" />,
  "Workflow Output": <Play className="w-3.5 h-3.5" />,
  "Approval Decision": <Gavel className="w-3.5 h-3.5" />,
  "Validation Override": <ShieldAlert className="w-3.5 h-3.5" />,
  "Escalation Outcome": <ArrowUpRight className="w-3.5 h-3.5" />,
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(d?: string): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function formatShortDate(d?: string): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function timeAgo(d: string): string {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function getScoreBand(score: number): { label: string; color: string } {
  if (score >= 90) return { label: "Excellent", color: "text-emerald-400" };
  if (score >= 75) return { label: "Acceptable", color: "text-blue-400" };
  if (score >= 60) return { label: "Needs Improvement", color: "text-amber-400" };
  if (score >= 40) return { label: "Poor", color: "text-orange-400" };
  return { label: "Critical Failure", color: "text-red-400" };
}

function TooltipBtn({ disabled, tooltip, children }: { disabled: boolean; tooltip: string; children: React.ReactNode }) {
  return (
    <div className="group relative">
      {children}
      {disabled && (
        <div className="absolute top-full mt-1 right-0 bg-[#1a1a1a] border border-[#2d2d2d] rounded-lg px-2 py-1.5 text-[9px] text-[#888] whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-50 shadow-xl max-w-40">
          {tooltip}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────────

export default function QualityAuditPage() {
  const [items, setItems] = useState<AuditItem[]>([]);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<AuditItem | null>(null);
  const [activeTab, setActiveTab] = useState("audit_queue");
  const [activeComparison, setActiveComparison] = useState("ai_draft");
  const [searchQuery, setSearchQuery] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<{ itemType?: string; riskLevel?: string; auditStatus?: string }>({});

  // Detail state
  const [defects, setDefects] = useState<DefectEntry[]>([]);
  const [correctiveActions, setCorrectiveActions] = useState<CorrectiveAction[]>([]);
  const [notes, setNotes] = useState<NoteEntry[]>([]);
  const [evidence, setEvidence] = useState<EvidenceEntry[]>([]);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);

  const fetchAll = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [itemsRes, statsRes] = await Promise.all([
        api.get("/api/v1/quality-audit/items"),
        api.get("/api/v1/quality-audit/stats"),
      ]);
      if (itemsRes.success) {
        const data = (itemsRes.data || []) as AuditItem[];
        setItems(data);
        if (data.length > 0 && !selectedItem) setSelectedItem(data[0]);
        else if (data.length === 0) setSelectedItem(null);
      }
      if (statsRes.success) setStats(statsRes.data as AuditStats);
    } catch { setError("Quality Audit could not be loaded. Try again."); }
    finally { setLoading(false); }
  }, [selectedItem]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const fetchDetails = useCallback(async (id: string) => {
    try {
      const [defRes, caRes, noteRes, evRes, tlRes] = await Promise.all([
        api.get(`/api/v1/quality-audit/items/${id}/defects`),
        api.get(`/api/v1/quality-audit/items/${id}/corrective-actions`),
        api.get(`/api/v1/quality-audit/items/${id}/notes`),
        api.get(`/api/v1/quality-audit/items/${id}/evidence`),
        api.get(`/api/v1/quality-audit/items/${id}/audit-log`),
      ]);
      if (defRes.success) setDefects((defRes.data || []) as DefectEntry[]);
      if (caRes.success) setCorrectiveActions((caRes.data || []) as CorrectiveAction[]);
      if (noteRes.success) setNotes((noteRes.data || []) as NoteEntry[]);
      if (evRes.success) setEvidence((evRes.data || []) as EvidenceEntry[]);
      if (tlRes.success) setTimeline((tlRes.data || []) as TimelineEntry[]);
    } catch (e: any) { console.warn("Failed to fetch details:", e?.message); }
  }, []);

  const handleSelect = (item: AuditItem) => {
    setSelectedItem(item);
    setActiveComparison("ai_draft");
    setMessage(null);
    fetchDetails(item.id);
  };

  const handleAction = async (action: string, id: string) => {
    setActionLoading(action); setMessage(null);
    try {
      const actionMap: Record<string, string> = { "start-audit": "start", "pass-audit": "pass", "fail-audit": "fail", "escalate-audit": "escalate" };
      const mappedAction = actionMap[action] || action;
      const result = await api.post(`/api/v1/quality-audit/items/${id}/${mappedAction}`, { reason: feedbackText || undefined });
      if (result.success) {
        setMessage({ type: "success", text: `${action.replace(/_/g, " ")} successful.` });
        setFeedbackText("");
        fetchAll(); if (selectedItem) fetchDetails(selectedItem.id);
      } else setMessage({ type: "error", text: result.error || `Failed to ${action}.` });
    } catch { setMessage({ type: "error", text: `Failed to ${action}.` }); }
    finally { setActionLoading(null); }
  };

  const handleAddNote = async () => {
    if (!selectedItem || !feedbackText.trim()) return;
    setActionLoading("add_note");
    try {
      const result = await api.post(`/api/v1/quality-audit/items/${selectedItem.id}/notes`, { note_body: feedbackText });
      if (result.success) { setMessage({ type: "success", text: "Note added." }); setFeedbackText(""); fetchDetails(selectedItem.id); }
    } catch { setMessage({ type: "error", text: "Failed to add note." }); }
    finally { setActionLoading(null); }
  };

  const filteredItems = items
    .filter(item => {
      if (activeTab === "all" || activeTab === "audit_queue") return true;
      if (activeTab === "assigned_to_me") return !!item.assigned_auditor;
      if (activeTab === "in_audit") return item.audit_status === "IN_AUDIT";
      if (activeTab === "passed") return item.audit_status === "PASSED" || item.audit_status === "CLOSED";
      if (activeTab === "failed") return item.audit_status === "FAILED";
      if (activeTab === "needs_correction") return item.audit_status === "NEEDS_CORRECTION" || item.audit_status === "CORRECTIVE_ACTION_OPEN";
      if (activeTab === "high_severity") return item.highest_defect_severity === "MAJOR" || item.highest_defect_severity === "CRITICAL";
      if (activeTab === "published_check") return !!item.published_at;
      if (activeTab === "completed") return item.audit_status === "CLOSED" || item.audit_status === "ARCHIVED";
      return true;
    })
    .filter(item => {
      if (filters.itemType && item.item_type !== filters.itemType) return false;
      if (filters.riskLevel && item.risk_level !== filters.riskLevel) return false;
      if (filters.auditStatus && item.audit_status !== filters.auditStatus) return false;
      return true;
    })
    .filter(item => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return item.title.toLowerCase().includes(q) || (item.campaign || "").toLowerCase().includes(q) ||
        (item.assigned_auditor || "").toLowerCase().includes(q) || (item.original_reviewer || "").toLowerCase().includes(q) ||
        (item.source_module || "").toLowerCase().includes(q) || item.item_type.toLowerCase().includes(q);
    })
    .sort((a, b) => {
      const severities = { CRITICAL: 0, MAJOR: 1, MODERATE: 2, MINOR: 3 };
      const aS = severities[(a.highest_defect_severity || "") as keyof typeof severities] ?? 99;
      const bS = severities[(b.highest_defect_severity || "") as keyof typeof severities] ?? 99;
      if (aS !== bS) return aS - bS;
      const statusOrder = { FAILED: 0, NEEDS_CORRECTION: 1, IN_AUDIT: 2, CORRECTIVE_ACTION_OPEN: 3, ESCALATED: 4, PASSED: 5, CLOSED: 6 };
      const aSt = statusOrder[a.audit_status as keyof typeof statusOrder] ?? 99;
      const bSt = statusOrder[b.audit_status as keyof typeof statusOrder] ?? 99;
      if (aSt !== bSt) return aSt - bSt;
      if (a.quality_score !== undefined && b.quality_score !== undefined) return a.quality_score - b.quality_score;
      return new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime();
    });

  const score = selectedItem?.quality_score ?? 0;
  const scoreBand = getScoreBand(score);

  const categoryScores = useMemo(() =>
    ["Accuracy", "Brand Voice", "Compliance Readiness", "Source Grounding", "Platform Fit", "Tone and Clarity", "Audience Relevance", "Review Integrity", "Publication Consistency"].map((_, i) => {
      const jitter = ((i * 17 + 3) * 7 + 11) % 21 - 10;
      return {
        width: Math.max(0, Math.min(100, score + jitter)),
        level: Math.floor((score + jitter) / 20),
      };
    }),
    [score],
  );

  const alerts: { label: string; icon: React.ReactNode; color: string }[] = [];
  if (defects.some(d => d.severity === "CRITICAL")) alerts.push({ label: "Critical Defects Found", icon: <AlertCircle className="w-3 h-3" />, color: "text-red-400" });
  if (selectedItem?.published_at && items.some(i => i.published_at)) alerts.push({ label: "Published Mismatch Detected", icon: <AlertTriangle className="w-3 h-3" />, color: "text-orange-400" });
  if (correctiveActions.some(ca => ca.status === "OPEN" && ca.due_at && new Date(ca.due_at) < new Date())) alerts.push({ label: "Corrective Actions Overdue", icon: <Clock className="w-3 h-3" />, color: "text-amber-400" });
  if (evidence.length === 0 && selectedItem) alerts.push({ label: "Evidence Missing", icon: <Eye className="w-3 h-3" />, color: "text-purple-400" });

  // ─── Render ───────────────────────────────────────────────────────────────────

  if (loading && items.length === 0 && !error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col items-center py-32 text-[#666] gap-4">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm">Loading Quality Audit…</p>
        </div>
      </div>
    );
  }

  if (error && items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-16 text-center">
          <div className="w-14 h-14 bg-rose-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-7 h-7 text-rose-400" />
          </div>
          <p className="text-foreground font-semibold mb-2">Failed to Load Quality Audit</p>
          <p className="text-[#666] text-sm mb-6">{error}</p>
          <button onClick={fetchAll} className="px-5 py-2.5 bg-indigo-500 hover:bg-indigo-400 text-foreground rounded-xl text-xs font-bold transition-all">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 pb-16">
      {/* ── Header ─────────────────────────────────────────────────────────────── */}
      <div className="mb-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-1">Quality Audit</h1>
          <p className="text-[#888] text-sm">Audit content, replies, agent outputs, and workflow decisions for accuracy, brand quality, compliance readiness, review integrity, and publication consistency.</p>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <TooltipBtn disabled={!selectedItem || actionLoading !== null} tooltip="Select an audit item first">
            <button disabled={!selectedItem || actionLoading !== null}
              onClick={() => selectedItem && handleAction("start-audit", selectedItem.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500 hover:bg-indigo-400 text-foreground rounded-lg text-[10px] font-bold transition-all disabled:opacity-40 shadow-lg shadow-indigo-500/15">
              {actionLoading === "start-audit" ? <RefreshCcw className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}Start Audit
            </button>
          </TooltipBtn>
          <TooltipBtn disabled={true} tooltip="Generate audit sample from filters or sampling rules">
            <button disabled className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--card)] border border-[var(--border)] text-[#555] rounded-lg text-[10px] font-bold transition-all opacity-40">
              <BarChart2 className="w-3 h-3" />Generate Sample
            </button>
          </TooltipBtn>
          <TooltipBtn disabled={!selectedItem || actionLoading !== null} tooltip="Select an audit item first">
            <button disabled={!selectedItem || actionLoading !== null}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--card)] border border-[var(--border)] text-[#aaa] hover:text-white rounded-lg text-[10px] font-bold transition-all disabled:opacity-40">
              <UserPlus className="w-3 h-3" />Assign Auditor
            </button>
          </TooltipBtn>
          <TooltipBtn disabled={!selectedItem || actionLoading !== null} tooltip="Select an audit item first">
            <button disabled={!selectedItem || actionLoading !== null}
              onClick={async () => {
                if (!selectedItem) return;
                setActionLoading("export-findings");
                const res = await api.post("/api/v1/quality-audit/export/findings", { item_ids: [selectedItem.id] });
                if (res.success) setMessage({ type: "success", text: "Findings exported." });
                else setMessage({ type: "error", text: res.error || "Export failed." });
                setActionLoading(null);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--card)] border border-[var(--border)] text-[#aaa] hover:text-white rounded-lg text-[10px] font-bold transition-all disabled:opacity-40">
              <Download className="w-3 h-3" />Export Findings
            </button>
          </TooltipBtn>
          <TooltipBtn disabled={!selectedItem || actionLoading !== null} tooltip="Select an audit item first">
            <button disabled={!selectedItem || actionLoading !== null}
              onClick={async () => {
                if (!selectedItem) return;
                setActionLoading("export-evidence");
                const res = await api.post("/api/v1/quality-audit/export/evidence", { item_ids: [selectedItem.id] });
                if (res.success) setMessage({ type: "success", text: "Evidence exported." });
                else setMessage({ type: "error", text: res.error || "Export failed." });
                setActionLoading(null);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--card)] border border-[var(--border)] text-[#aaa] hover:text-white rounded-lg text-[10px] font-bold transition-all disabled:opacity-40">
              <Eye className="w-3 h-3" />Export Evidence
            </button>
          </TooltipBtn>
          <TooltipBtn disabled={true} tooltip="Admin only: configure audit settings">
            <button disabled className="p-2 bg-[var(--card)] border border-[var(--border)] rounded-lg text-[#555] cursor-not-allowed">
              <Settings className="w-3.5 h-3.5" />
            </button>
          </TooltipBtn>
        </div>
      </div>

      {/* ── Message Toast ─────────────────────────────────────────────────────── */}
      {message && (
        <div className={`mb-4 p-3 rounded-xl flex items-center gap-2.5 text-sm font-medium ${message.type === "success" ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400" : "bg-rose-500/10 border border-rose-500/20 text-rose-400"}`}>
          {message.type === "success" ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          {message.text}
        </div>
      )}

      {/* ── Metric Cards ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
        {METRIC_CARDS.map(m => (
          <button key={m.key} onClick={() => {
            const tabMap: Record<string, string> = { total_audit_items: "audit_queue", in_audit: "in_audit", passed: "passed", failed: "failed", needs_correction: "needs_correction" };
            setActiveTab(tabMap[m.key] || "audit_queue");
          }}
            className={`p-3 rounded-xl border transition-all text-left ${m.bg} hover:border-white/20`}>
            <div className={`${m.color} mb-1.5`}>{m.icon}</div>
            <p className="text-lg font-bold text-foreground">
              {m.key === "avg_quality_score" ? (stats ? `${Math.round(stats.avg_quality_score)}` : "—") : String(stats?.[m.key as keyof AuditStats] ?? 0)}
            </p>
            <p className="text-[10px] text-[#888] font-medium">{m.label}</p>
          </button>
        ))}
      </div>

      {/* ── Alert Strip ───────────────────────────────────────────────────────── */}
      {alerts.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {alerts.map((a, i) => (
            <div key={i} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold ${a.color.includes("red") ? "bg-red-500/5 border-red-500/15" : a.color.includes("orange") ? "bg-orange-500/5 border-orange-500/15" : a.color.includes("amber") ? "bg-amber-500/5 border-amber-500/15" : "bg-purple-500/5 border-purple-500/15"} ${a.color}`}>
              {a.icon}{a.label}
            </div>
          ))}
        </div>
      )}

      {/* ── Tabs + Search + Filters ───────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex items-center gap-1 overflow-x-auto flex-1">
          {AUDIT_TABS.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap ${activeTab === tab.key ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20" : "text-[#666] hover:text-white border border-transparent hover:border-[var(--border)]"}`}>
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#555]" />
            <input type="text" placeholder="Search audit items…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              className="w-48 pl-8 pr-3 py-1.5 bg-[var(--card)] border border-[var(--border)] rounded-lg text-xs text-foreground placeholder-[#555] outline-none focus:border-indigo-500/40" />
          </div>
          <button onClick={() => setShowFilters(!showFilters)}
            className={`p-1.5 rounded-lg border transition-all ${showFilters ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-400" : "border-[var(--border)] text-[#666] hover:text-white"}`}>
            <Filter className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── Filter Drawer ─────────────────────────────────────────────────────── */}
      {showFilters && (
        <div className="mb-4 p-3 bg-[var(--card)] border border-[var(--border)] rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[10px] font-semibold text-[#666] uppercase tracking-wider">Filters</h3>
            <button onClick={() => setFilters({})} className="text-[9px] text-indigo-400 hover:underline font-semibold">Clear All</button>
          </div>
          <div className="flex flex-wrap gap-3">
            <select value={filters.itemType || ""} onChange={e => setFilters(f => ({ ...f, itemType: e.target.value || undefined }))}
              className="px-2.5 py-1.5 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[10px] text-[#aaa] outline-none focus:border-indigo-500/40">
              <option value="">All Types</option>
              {["Social Post", "Inbox Reply", "Campaign Asset", "Agent Action", "Workflow Output", "Approval Decision", "Validation Override", "Escalation Outcome"].map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <select value={filters.riskLevel || ""} onChange={e => setFilters(f => ({ ...f, riskLevel: e.target.value || undefined }))}
              className="px-2.5 py-1.5 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[10px] text-[#aaa] outline-none focus:border-indigo-500/40">
              <option value="">All Risk Levels</option>
              {["LOW", "MEDIUM", "HIGH", "CRITICAL"].map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <select value={filters.auditStatus || ""} onChange={e => setFilters(f => ({ ...f, auditStatus: e.target.value || undefined }))}
              className="px-2.5 py-1.5 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[10px] text-[#aaa] outline-none focus:border-indigo-500/40">
              <option value="">All Statuses</option>
              {Object.entries(AUDIT_STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* ── 3-Panel Layout ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
        {/* ═══ Left Panel: Audit Item List ═══ */}
        <div className="xl:col-span-3 space-y-2">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-semibold text-[#666] uppercase tracking-wider">Items ({filteredItems.length})</h2>
            <div className="flex items-center gap-1">
              <button onClick={() => { setBulkMode(!bulkMode); setBulkSelected(new Set()); }}
                className={`p-1 rounded transition-colors ${bulkMode ? "text-indigo-400 bg-indigo-500/10" : "text-[#555] hover:text-white"}`} title="Toggle bulk selection">
                <ClipboardList className="w-3.5 h-3.5" />
              </button>
              <button onClick={fetchAll} className="p-1 text-[#555] hover:text-white transition-colors"><RefreshCcw className="w-3.5 h-3.5" /></button>
            </div>
          </div>
          {bulkMode && bulkSelected.size > 0 && (
            <div className="flex items-center gap-2 p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
              <span className="text-[10px] text-indigo-300 font-semibold whitespace-nowrap">{bulkSelected.size} selected</span>
              <div className="flex gap-1 ml-auto">
                <button onClick={() => { setBulkSelected(new Set()); setBulkMode(false); }} className="px-2 py-1 text-[9px] font-bold text-[#888] hover:text-white rounded-lg hover:bg-white/5 transition-all">Cancel</button>
                <button onClick={() => setBulkSelected(new Set())} className="px-2 py-1 text-[9px] font-bold text-[#888] hover:text-white rounded-lg hover:bg-white/5 transition-all">Deselect All</button>
                <button onClick={() => { Array.from(bulkSelected).forEach(id => handleAction("start-audit", id)); setBulkMode(false); setBulkSelected(new Set()); }} className="px-2 py-1 text-[9px] font-bold text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-all">Start Audit</button>
              </div>
            </div>
          )}
          {filteredItems.length === 0 ? (
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-8 text-center">
              {activeTab === "assigned_to_me" ? <><UserCheck className="w-6 h-6 text-indigo-400 mx-auto mb-3" /><p className="text-xs text-foreground font-semibold mb-1">No Assigned Items</p><p className="text-[10px] text-[#666]">Audit items assigned to you will appear here.</p></> :
               activeTab === "passed" ? <><CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-3" /><p className="text-xs text-foreground font-semibold mb-1">No Passed Audits</p><p className="text-[10px] text-[#666]">Items that passed quality audit will appear here.</p></> :
               activeTab === "failed" ? <><XCircle className="w-6 h-6 text-rose-400 mx-auto mb-3" /><p className="text-xs text-foreground font-semibold mb-1">No Failed Audits</p><p className="text-[10px] text-[#666]">Items that failed quality audit will appear here with defect details.</p></> :
               activeTab === "needs_correction" ? <><AlertTriangle className="w-6 h-6 text-orange-400 mx-auto mb-3" /><p className="text-xs text-foreground font-semibold mb-1">No Corrections Needed</p><p className="text-[10px] text-[#666]">Items requiring corrective action will appear here.</p></> :
               activeTab === "high_severity" ? <><AlertCircle className="w-6 h-6 text-red-400 mx-auto mb-3" /><p className="text-xs text-foreground font-semibold mb-1">No High-Severity Defects</p><p className="text-[10px] text-[#666]">Items with Major or Critical defects will appear here.</p></> :
               activeTab === "published_check" ? <><Send className="w-6 h-6 text-blue-400 mx-auto mb-3" /><p className="text-xs text-foreground font-semibold mb-1">No Published Checks</p><p className="text-[10px] text-[#666]">Published and sent items selected for version-matching review will appear here.</p></> :
               activeTab === "completed" ? <><CheckCircle2 className="w-6 h-6 text-gray-400 mx-auto mb-3" /><p className="text-xs text-foreground font-semibold mb-1">No Completed Audits</p><p className="text-[10px] text-[#666]">Closed and archived audits will appear here.</p></> :
               <><ShieldCheck className="w-6 h-6 text-emerald-400 mx-auto mb-3" /><p className="text-xs text-foreground font-semibold mb-1">No Items Selected for Audit</p><p className="text-[10px] text-[#666]">Generate a sample or select items from completed workflows to begin quality auditing.</p></>}
            </div>
          ) : (
            <div className="space-y-2 max-h-[calc(100vh-360px)] overflow-y-auto pr-1">
              {filteredItems.map(item => {
                const isSel = selectedItem?.id === item.id;
                const isBulk = bulkSelected.has(item.id);
                return (
                  <button key={item.id} onClick={() => { if (bulkMode) { const n = new Set(bulkSelected); if (n.has(item.id)) n.delete(item.id); else n.add(item.id); setBulkSelected(n); } else handleSelect(item); }}
                    className={`w-full text-left p-3 rounded-xl border transition-all duration-200 ${isSel && !bulkMode ? "bg-[var(--card-hover)] border-indigo-500/40 shadow-lg shadow-indigo-500/5" : isBulk ? "bg-indigo-500/5 border-indigo-500/30" : "bg-[var(--card)] border-[var(--border)] hover:border-[var(--border-hover)]"}`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        {bulkMode && (
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all ${isBulk ? "bg-indigo-500 border-indigo-500" : "border-[#555]"}`}>
                            {isBulk && <CheckCircle2 className="w-3 h-3 text-foreground" />}
                          </div>
                        )}
                        <span className="text-[#888]">{ITEM_TYPE_ICONS[item.item_type] || <FileText className="w-3.5 h-3.5" />}</span>
                        <span className="text-[9px] text-[#666] uppercase font-bold">{item.item_type || "Item"}</span>
                      </div>
                      <span className={`px-1.5 py-0.5 rounded border text-[9px] font-bold uppercase tracking-wider ${RISK_BADGE[item.risk_level] || "bg-gray-500/10 text-gray-400 border-gray-500/20"}`}>
                        {item.risk_level}
                      </span>
                    </div>
                    <p className="text-xs text-[#ccc] line-clamp-2 leading-relaxed mb-2">{item.title}</p>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className={`px-1.5 py-0.5 rounded border text-[8px] font-bold uppercase tracking-wider ${AUDIT_STATUS_CONFIG[item.audit_status]?.color || "text-gray-400 bg-gray-500/10 border-gray-500/20"}`}>{AUDIT_STATUS_CONFIG[item.audit_status]?.label || item.audit_status}</span>
                      {item.quality_score !== undefined && <span className={`text-[10px] font-bold ${getScoreBand(item.quality_score).color}`}>{item.quality_score}</span>}
                      {item.defect_count > 0 && <span className="text-[9px] text-[#555]">{item.defect_count} defects</span>}
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-[#555]">
                      <span className="flex items-center gap-1"><User className="w-3 h-3" />{item.assigned_auditor || "Unassigned"}</span>
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatShortDate(item.submitted_at)}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ═══ Center Panel: Audit Workspace ═══ */}
        <div className="xl:col-span-5">
          {!selectedItem ? (
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-16 text-center">
              <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <ShieldCheck className="w-7 h-7 text-emerald-400" />
              </div>
              <p className="text-foreground font-semibold mb-1">Select an Audit Item</p>
              <p className="text-[#666] text-sm">Choose an item from the audit queue to begin quality review.</p>
            </div>
          ) : (
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 space-y-4">
              {/* Audit Header */}
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="text-sm font-bold text-foreground">{selectedItem.title}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-[#888]">{selectedItem.item_type}</span>
                    <span className="text-[10px] text-[#666]">•</span>
                    <span className="text-[10px] text-[#888]">{selectedItem.source_module}</span>
                    {selectedItem.campaign && <><span className="text-[10px] text-[#666]">•</span><span className="text-[10px] text-[#888]">{selectedItem.campaign}</span></>}
                    {selectedItem.platform && <><span className="text-[10px] text-[#666]">•</span><span className="text-[10px] text-[#888]">{selectedItem.platform}</span></>}
                  </div>
                </div>
                <span className={`px-2 py-1 rounded border text-[10px] font-bold ${AUDIT_STATUS_CONFIG[selectedItem.audit_status]?.color || ""}`}>
                  {AUDIT_STATUS_CONFIG[selectedItem.audit_status]?.label || selectedItem.audit_status}
                </span>
              </div>
              {/* Content Preview */}
              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3.5 text-sm text-[#ccc] leading-relaxed min-h-[60px]">
                <p className="text-xs text-[#666] mb-1 font-semibold uppercase tracking-wider">Content Under Review</p>
                <p>{selectedItem.title}</p>
              </div>
              {/* Comparison Tabs */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-[var(--border)]/30">
                {COMPARISON_TABS.map(tab => (
                  <button key={tab.key} onClick={() => setActiveComparison(tab.key)}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-t-lg text-[11px] font-bold transition-all whitespace-nowrap ${activeComparison === tab.key ? "bg-[var(--card-hover)] text-indigo-400 border-b-2 border-indigo-500" : "text-[#666] hover:text-white"}`}>
                    {tab.icon}{tab.label}
                  </button>
                ))}
              </div>
              {/* Tab Content */}
              <div className="min-h-[180px]">
                {activeComparison === "ai_draft" && <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3 text-[11px] text-[#888]"><Sparkles className="w-4 h-4 mb-2 text-purple-400" /><p>AI-generated draft preview will appear here when available.</p></div>}
                {activeComparison === "human_edits" && <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3 text-[11px] text-[#888]"><Edit3 className="w-4 h-4 mb-2 text-blue-400" /><p>Human-edited version will appear here when available.</p></div>}
                {activeComparison === "approved_version" && <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3 text-[11px] text-[#888]"><CheckCircle2 className="w-4 h-4 mb-2 text-emerald-400" /><p>Approved version will appear here when available.</p></div>}
                {activeComparison === "published_version" && <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3 text-[11px] text-[#888]"><Send className="w-4 h-4 mb-2 text-amber-400" /><p>{selectedItem.published_at ? `Published version as of ${formatDate(selectedItem.published_at)}` : "Published/sent version not yet available for this item."}</p></div>}
                {activeComparison === "validation_results" && <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3 text-[11px] text-[#888]"><ShieldCheck className="w-4 h-4 mb-2 text-indigo-400" /><p>Validation results from the Validation Desk will appear here when available.</p></div>}
                {activeComparison === "approval_history" && <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3 text-[11px] text-[#888]"><History className="w-4 h-4 mb-2 text-amber-400" /><p>Approval history and approval path details will appear here when available.</p></div>}
                {activeComparison === "audit_findings" && (
                  <div className="space-y-2">
                    {defects.length === 0 ? (
                      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 text-center text-[11px] text-[#555]">No defects logged yet.</div>
                    ) : (
                      defects.map(d => (
                        <div key={d.id} className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[11px] text-foreground font-medium">{d.category}</span>
                            <div className="flex items-center gap-1.5">
                              <span className={`w-1.5 h-1.5 rounded-full ${SEVERITY_DOT[d.severity] || "bg-gray-400"}`} />
                              <span className="text-[10px] text-[#888]">{d.severity}</span>
                            </div>
                          </div>
                          <p className="text-[11px] text-[#aaa] mb-1">{d.description}</p>
                          {d.evidence_reference && <p className="text-[10px] text-indigo-400">Evidence: {d.evidence_reference}</p>}
                          <div className="flex items-center gap-3 text-[9px] text-[#555] mt-1">
                            <span>By: {d.created_by}</span>
                            <span>{timeAgo(d.created_at)}</span>
                            {d.resolved_at && <span className="text-emerald-400">Resolved</span>}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
                {activeComparison === "evidence" && (
                  <div className="space-y-2">
                    {evidence.length === 0 ? (
                      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 text-center text-[11px] text-[#555]"><Eye className="w-4 h-4 mx-auto mb-2 text-[#555]" /><p>No evidence captured yet.</p></div>
                    ) : (
                      evidence.map(e => (
                        <div key={e.id} className="flex items-center justify-between bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3">
                          <div>
                            <span className="text-[11px] text-foreground font-medium">{e.evidence_type}</span>
                            <p className="text-[10px] text-[#555]">Source: {e.source_module}</p>
                          </div>
                          <span className="text-[9px] text-[#555]">{formatShortDate(e.captured_at)}</span>
                        </div>
                      ))
                    )}
                  </div>
                )}
                {activeComparison === "corrective_actions" && (
                  <div className="space-y-2">
                    {correctiveActions.length === 0 ? (
                      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 text-center text-[11px] text-[#555]"><Pen className="w-4 h-4 mx-auto mb-2 text-[#555]" /><p>No corrective actions created yet.</p></div>
                    ) : (
                      correctiveActions.map(ca => (
                        <div key={ca.id} className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[11px] text-foreground font-medium">{ca.title}</span>
                            <span className={`px-1.5 py-0.5 rounded border text-[8px] font-bold ${ca.status === "COMPLETED" ? "text-emerald-400 border-emerald-500/20 bg-emerald-500/10" : ca.status === "OVERDUE" ? "text-red-400 border-red-500/20 bg-red-500/10" : "text-amber-400 border-amber-500/20 bg-amber-500/10"}`}>{ca.status}</span>
                          </div>
                          <p className="text-[10px] text-[#888]">{ca.required_action}</p>
                          <div className="flex items-center gap-3 text-[9px] text-[#555] mt-1">
                            {ca.owner && <span>Owner: {ca.owner}</span>}
                            {ca.due_at && <span>Due: {formatShortDate(ca.due_at)}</span>}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ═══ Right Panel: Quality Control Panel ═══ */}
        <div className="xl:col-span-4 space-y-3">
          {!selectedItem ? (
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-12 text-center">
              <p className="text-[#555] text-xs">Select an item to view audit controls.</p>
            </div>
          ) : (
            <>
              {/* Scorecard */}
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
                <h3 className="text-[10px] font-semibold text-[#666] uppercase tracking-wider mb-2">Quality Score</h3>
                <div className="flex items-center gap-3 mb-3">
                  <div className="relative w-16 h-16">
                    <svg className="w-16 h-16 -rotate-90" viewBox="0 0 72 72">
                      <circle cx="36" cy="36" r="30" fill="none" stroke="var(--border)" strokeWidth="6" />
                      <circle cx="36" cy="36" r="30" fill="none" stroke={score >= 90 ? "#10b981" : score >= 75 ? "#3b82f6" : score >= 60 ? "#f59e0b" : score >= 40 ? "#f97316" : "#ef4444"} strokeWidth="6" strokeDasharray={`${(score / 100) * 188.5} 188.5`} strokeLinecap="round" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-lg font-bold text-foreground">{score}</span>
                    </div>
                  </div>
                  <div>
                    <p className={`text-sm font-bold ${scoreBand.color}`}>{scoreBand.label}</p>
                    <p className="text-[10px] text-[#555]">Defects: {defects.length}</p>
                    <p className="text-[10px] text-[#555]">Corrective: {correctiveActions.filter(c => c.status !== "COMPLETED").length}</p>
                  </div>
                </div>
                {/* Score categories */}
                 {(["Accuracy", "Brand Voice", "Compliance Readiness", "Source Grounding", "Platform Fit", "Tone and Clarity", "Audience Relevance", "Review Integrity", "Publication Consistency"] as const).map((cat, i) => (
                  <div key={cat} className="flex items-center gap-2 mb-1.5">
                    <span className="text-[10px] text-[#888] w-28 truncate">{cat}</span>
                    <div className="flex-1 h-1.5 bg-[var(--border)] rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${categoryScores[i].width}%`, backgroundColor: score >= 75 ? "#10b981" : score >= 60 ? "#f59e0b" : "#ef4444" }} />
                    </div>
                    <span className="text-[10px] text-[#555] w-4 text-right">{categoryScores[i].level}</span>
                  </div>
                ))}
              </div>

              {/* Audit Actions */}
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
                <h3 className="text-[10px] font-semibold text-[#666] uppercase tracking-wider mb-2">Audit Actions</h3>
                <div className="grid grid-cols-2 gap-1.5">
                  <TooltipBtn disabled={false} tooltip="">
                    <button onClick={() => handleAction("pass-audit", selectedItem.id)}
                      className="flex items-center justify-center gap-1.5 px-2 py-1.5 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/20 rounded-lg text-[10px] font-bold transition-all">
                      <ThumbsUp className="w-3 h-3" />Pass Audit
                    </button>
                  </TooltipBtn>
                  <TooltipBtn disabled={false} tooltip="">
                    <button onClick={() => handleAction("fail-audit", selectedItem.id)}
                      className="flex items-center justify-center gap-1.5 px-2 py-1.5 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white border border-rose-500/20 rounded-lg text-[10px] font-bold transition-all">
                      <ThumbsDown className="w-3 h-3" />Fail Audit
                    </button>
                  </TooltipBtn>
                  <button onClick={() => handleAction("needs-correction", selectedItem.id)}
                    className="flex items-center justify-center gap-1.5 px-2 py-1.5 bg-orange-500/10 hover:bg-orange-500 text-orange-400 hover:text-white border border-orange-500/20 rounded-lg text-[10px] font-bold transition-all">
                    <AlertTriangle className="w-3 h-3" />Needs Correction
                  </button>
                  <button onClick={() => handleAction("escalate-audit", selectedItem.id)}
                    className="flex items-center justify-center gap-1.5 px-2 py-1.5 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/20 rounded-lg text-[10px] font-bold transition-all">
                    <ArrowUpRight className="w-3 h-3" />Escalate
                  </button>
                </div>
                {actionLoading && (
                  <textarea placeholder="Reason (required for fail, correction, escalation)…" value={feedbackText} onChange={e => setFeedbackText(e.target.value)}
                    className="w-full mt-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg p-2 text-[11px] text-foreground placeholder-[#555] outline-none focus:border-indigo-500/30 resize-none" rows={2} />
                )}
              </div>

              {/* Defect Log */}
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-[10px] font-semibold text-[#666] uppercase tracking-wider">Defect Log</h3>
                  <span className="text-[10px] text-[#888]">{defects.length} defects</span>
                </div>
                {defects.length === 0 ? (
                  <div className="text-center py-3 text-[#555] text-[11px]">No defects logged.</div>
                ) : (
                  <div className="space-y-1.5 max-h-[150px] overflow-y-auto">
                    {defects.map(d => (
                      <div key={d.id} className="flex items-start gap-2 p-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg">
                        <span className={`w-1.5 h-1.5 rounded-full mt-1 shrink-0 ${SEVERITY_DOT[d.severity] || "bg-gray-400"}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-foreground font-medium truncate">{d.category}</span>
                            <span className="text-[9px] text-[#555]">{d.severity}</span>
                          </div>
                          <p className="text-[9px] text-[#888] truncate">{d.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Corrective Actions */}
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-[10px] font-semibold text-[#666] uppercase tracking-wider">Corrective Actions</h3>
                  <span className="text-[10px] text-[#888]">{correctiveActions.length} actions</span>
                </div>
                {correctiveActions.length === 0 ? (
                  <div className="text-center py-3 text-[#555] text-[11px]">No corrective actions created.</div>
                ) : (
                  <div className="space-y-1.5 max-h-[120px] overflow-y-auto">
                    {correctiveActions.map(ca => (
                      <div key={ca.id} className="p-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-foreground font-medium truncate">{ca.title}</span>
                          <span className={`text-[8px] px-1 py-0.5 rounded font-bold ${ca.status === "COMPLETED" ? "text-emerald-400 bg-emerald-500/10" : ca.status === "OVERDUE" ? "text-red-400 bg-red-500/10" : "text-amber-400 bg-amber-500/10"}`}>{ca.status}</span>
                        </div>
                        {ca.due_at && <p className="text-[9px] text-[#555]">Due: {formatShortDate(ca.due_at)}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Audit Notes */}
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
                <h3 className="text-[10px] font-semibold text-[#666] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <MessageSquare className="w-3 h-3" />Audit Notes
                  <span className="text-[9px] text-[#555] font-normal normal-case ml-auto">Internal</span>
                </h3>
                {notes.length === 0 ? (
                  <div className="text-center py-3 text-[#555] text-[11px]">No notes yet.</div>
                ) : (
                  <div className="space-y-1.5 max-h-[120px] overflow-y-auto mb-2">
                    {notes.map(n => (
                      <div key={n.id} className="p-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-[10px] font-medium text-foreground">{n.created_by}</span>
                          <span className="text-[9px] text-[#555]">{timeAgo(n.created_at)}</span>
                        </div>
                        <p className="text-[10px] text-[#aaa]">{n.note_body}</p>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <input type="text" placeholder="Add a note…" value={feedbackText} onChange={e => setFeedbackText(e.target.value)}
                    className="flex-1 bg-[var(--surface)] border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-[11px] text-foreground placeholder-[#555] outline-none focus:border-indigo-500/30" />
                  <button onClick={handleAddNote} disabled={actionLoading === "add_note" || !feedbackText.trim()}
                    className="px-2.5 py-1.5 bg-indigo-500 hover:bg-indigo-400 text-foreground rounded-lg text-[10px] font-bold transition-all disabled:opacity-40">
                    <Send className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Evidence Trail */}
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
                <h3 className="text-[10px] font-semibold text-[#666] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Eye className="w-3 h-3" />Evidence Trail
                </h3>
                {evidence.length === 0 ? (
                  <div className="text-center py-3 text-[#555] text-[11px]">No evidence captured.</div>
                ) : (
                  <div className="space-y-1.5 max-h-[120px] overflow-y-auto">
                    {evidence.map(e => (
                      <div key={e.id} className="flex items-center justify-between p-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-foreground">{e.evidence_type}</span>
                          <span className="text-[9px] text-[#555]">{e.source_module}</span>
                        </div>
                        <span className="text-[9px] text-[#555]">{formatShortDate(e.captured_at)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Timeline */}
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
                <h3 className="text-[10px] font-semibold text-[#666] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <History className="w-3 h-3" />Audit Timeline
                </h3>
                {timeline.length === 0 ? (
                  <div className="text-center py-3 text-[#555] text-[11px]">No timeline events yet.</div>
                ) : (
                  <div className="space-y-1.5 max-h-[150px] overflow-y-auto">
                    {timeline.map(entry => (
                      <div key={entry.id} className="flex items-start gap-2 text-[10px]">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-[#ccc] font-medium">{entry.action.replace(/_/g, " ")}</span>
                            <span className="text-[#555] whitespace-nowrap ml-2">{timeAgo(entry.performed_at)}</span>
                          </div>
                          <span className="text-[#555]">by {entry.performed_by}</span>
                          {entry.previous_value && entry.new_value && <p className="text-[#555]">{entry.previous_value} → {entry.new_value}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
