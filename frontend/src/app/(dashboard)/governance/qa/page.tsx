"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ShieldCheck, Search, AlertTriangle, CheckCircle2,
  BarChart3, FileText, Loader2, X,
  Activity, ArrowRight, Eye, RefreshCcw,
  List, XCircle, Star,
  Clock, Filter, Download, Users,
  MessageSquare, RotateCcw, Lock,
  Calendar, User, GitCompare, FileCheck,
  ClipboardList, Bug, Zap,
  Edit3, Upload, Ban,
  AlertCircle, ChevronDown, Check
} from "lucide-react";
import { api } from "@/lib/api";

// ─── Types ───────────────────────────────────────────────────────────────────

type AuditStatus =
  | "audit_pending" | "in_audit" | "passed" | "failed"
  | "needs_correction" | "corrective_action_open"
  | "corrective_action_complete" | "escalated" | "closed" | "archived";

type ItemType =
  | "social_post" | "inbox_reply" | "campaign_asset" | "agent_action"
  | "workflow_output" | "approval_decision" | "validation_override"
  | "escalation_outcome" | "published_content_check" | "sampled_item";

type TabId = "queue" | "assigned" | "correction" | "completed";

type ComparisonTab = "comparison" | "findings" | "evidence";

type DefectSeverity = "minor" | "moderate" | "major" | "critical";
type DefectCategory =
  | "accuracy_issue" | "brand_voice_issue" | "compliance_issue"
  | "unsupported_claim" | "source_grounding_issue" | "tone_issue"
  | "platform_formatting_issue" | "audience_mismatch" | "approval_path_issue"
  | "published_version_mismatch" | "missing_evidence" | "poor_ai_output"
  | "human_edit_introduced_issue" | "reviewer_missed_issue"
  | "escalation_mishandled" | "other";

type CorrectiveActionStatus =
  | "open" | "assigned" | "in_progress" | "completed" | "overdue" | "escalated" | "closed";

type ScoreBand = "excellent" | "acceptable" | "needs_improvement" | "poor" | "critical_failure";

interface AuditItem {
  id: string;
  title: string;
  item_type: ItemType;
  source_module: string;
  campaign: string;
  platform: string;
  audit_status: AuditStatus;
  original_status: string;
  quality_score: number | null;
  score_band: ScoreBand | null;
  defect_count: number;
  highest_defect_severity: DefectSeverity | null;
  assigned_auditor: string | null;
  original_reviewer: string | null;
  agent_name: string | null;
  risk_level: string;
  published_at: string | null;
  audit_due_at: string | null;
  sampled: boolean;
  customer_complaint: boolean;
  published_mismatch: boolean;
  evidence_missing: boolean;
  override_used: boolean;
}

interface Scorecard {
  accuracy: number;
  brand_voice: number;
  compliance_readiness: number;
  source_grounding: number;
  platform_fit: number;
  tone_clarity: number;
  audience_relevance: number;
  review_integrity: number;
  publication_consistency: number;
}

interface Defect {
  id: string;
  audit_item_id: string;
  defect_category: DefectCategory;
  defect_severity: DefectSeverity;
  defect_description: string;
  evidence_reference: string;
  responsible_source: string;
  corrective_action_required: boolean;
  owner: string;
  due_at: string;
  created_by: string;
  created_at: string;
  resolved_at: string | null;
}

interface CorrectiveAction {
  id: string;
  audit_item_id: string;
  defect_id: string | null;
  title: string;
  owner: string;
  priority: string;
  required_action: string;
  status: CorrectiveActionStatus;
  due_at: string;
  completed_at: string | null;
  closed_at: string | null;
  created_by: string;
  created_at: string;
}

interface AuditNote {
  id: string;
  audit_item_id: string;
  note_body: string;
  created_by: string;
  created_at: string;
  parent_id: string | null;
}

interface EvidenceItem {
  id: string;
  audit_item_id: string;
  evidence_type: string;
  evidence_reference: string;
  source_module: string;
  captured_at: string;
  created_at: string;
}

interface Stats {
  total_items: number;
  in_audit: number;
  passed: number;
  failed: number;
  needs_correction: number;
  average_score: number;
  critical_defects: number;
  published_mismatches: number;
  overdue_actions: number;
  missing_evidence: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const FILTER_TABS: { id: TabId; label: string }[] = [
  { id: "queue", label: "Audit Queue" },
  { id: "assigned", label: "Assigned to Me" },
  { id: "correction", label: "Needs Correction" },
  { id: "completed", label: "Completed Audits" },
];

const SCORECARD_CATEGORIES: { key: keyof Scorecard; label: string }[] = [
  { key: "accuracy", label: "Accuracy" },
  { key: "brand_voice", label: "Brand Voice" },
  { key: "compliance_readiness", label: "Compliance" },
  { key: "source_grounding", label: "Grounding" },
  { key: "platform_fit", label: "Platform Fit" },
  { key: "tone_clarity", label: "Tone & Clarity" },
  { key: "audience_relevance", label: "Audience" },
  { key: "review_integrity", label: "Review Integrity" },
  { key: "publication_consistency", label: "Consistency" },
];

const DEFECT_CATEGORIES: { value: DefectCategory; label: string }[] = [
  { value: "accuracy_issue", label: "Accuracy Issue" },
  { value: "brand_voice_issue", label: "Brand Voice Issue" },
  { value: "compliance_issue", label: "Compliance Issue" },
  { value: "unsupported_claim", label: "Unsupported Claim" },
  { value: "source_grounding_issue", label: "Source Grounding Issue" },
  { value: "tone_issue", label: "Tone Issue" },
  { value: "platform_formatting_issue", label: "Platform Formatting Issue" },
  { value: "audience_mismatch", label: "Audience Mismatch" },
  { value: "approval_path_issue", label: "Approval Path Issue" },
  { value: "published_version_mismatch", label: "Published Version Mismatch" },
  { value: "missing_evidence", label: "Missing Evidence" },
  { value: "poor_ai_output", label: "Poor AI Output" },
  { value: "human_edit_introduced_issue", label: "Human Edit Introduced Issue" },
  { value: "reviewer_missed_issue", label: "Reviewer Missed Issue" },
  { value: "escalation_mishandled", label: "Escalation Mishandled" },
  { value: "other", label: "Other" },
];

const SEVERITY_COLORS: Record<DefectSeverity, string> = {
  minor: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  moderate: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  major: "text-orange-400 bg-orange-500/10 border-orange-500/20",
  critical: "text-rose-400 bg-rose-500/10 border-rose-500/20",
};

const STATUS_COLORS: Record<AuditStatus, string> = {
  audit_pending: "text-slate-400 bg-slate-500/10 border-slate-500/20",
  in_audit: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
  passed: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  failed: "text-rose-400 bg-rose-500/10 border-rose-500/20",
  needs_correction: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  corrective_action_open: "text-orange-400 bg-orange-500/10 border-orange-500/20",
  corrective_action_complete: "text-teal-400 bg-teal-500/10 border-teal-500/20",
  escalated: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  closed: "text-slate-400 bg-slate-500/10 border-slate-500/20",
  archived: "text-slate-600 bg-slate-700/10 border-slate-700/20",
};

const ITEM_TYPE_LABELS: Record<ItemType, string> = {
  social_post: "Social Post",
  inbox_reply: "Inbox Reply",
  campaign_asset: "Campaign Asset",
  agent_action: "Agent Action",
  workflow_output: "Workflow Output",
  approval_decision: "Approval Decision",
  validation_override: "Validation Override",
  escalation_outcome: "Escalation Outcome",
  published_content_check: "Published Check",
  sampled_item: "Sampled Item",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function calculateScoreBand(score: number | null): { band: ScoreBand | null; label: string; color: string } {
  if (score === null) return { band: null, label: "Not Scored", color: "text-slate-500" };
  if (score >= 90) return { band: "excellent", label: "Excellent", color: "text-emerald-400" };
  if (score >= 75) return { band: "acceptable", label: "Acceptable", color: "text-blue-400" };
  if (score >= 60) return { band: "needs_improvement", label: "Needs Imp.", color: "text-amber-400" };
  if (score >= 40) return { band: "poor", label: "Poor", color: "text-orange-400" };
  return { band: "critical_failure", label: "Failure", color: "text-rose-400" };
}

function calculateOverallScore(card: Scorecard): number | null {
  const vals = Object.values(card);
  if (vals.some(v => v < 0)) return null;
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  return Math.round((avg / 5) * 100);
}

function formatDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getStatusLabel(s: AuditStatus): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

export default function QualityAuditPage() {
  // Data state
  const [stats, setStats] = useState<Stats | null>(null);
  const [items, setItems] = useState<AuditItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<AuditItem | null>(null);
  const [scorecard, setScorecard] = useState<Scorecard>({
    accuracy: -1, brand_voice: -1, compliance_readiness: -1,
    source_grounding: -1, platform_fit: -1, tone_clarity: -1,
    audience_relevance: -1, review_integrity: -1, publication_consistency: -1,
  });
  const [defects, setDefects] = useState<Defect[]>([]);
  const [correctiveActions, setCorrectiveActions] = useState<CorrectiveAction[]>([]);
  const [notes, setNotes] = useState<AuditNote[]>([]);
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);

  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("queue");
  const [comparisonTab, setComparisonTab] = useState<ComparisonTab>("comparison");
  const [versionSubTab, setVersionSubTab] = useState<"ai" | "approved" | "published">("ai");
  const [search, setSearch] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showMoreActions, setShowMoreActions] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Quick action states
  const [feedbackText, setFeedbackText] = useState("");
  const [showDefectForm, setShowDefectForm] = useState(false);
  const [showCorrectiveForm, setShowCorrectiveForm] = useState(false);

  // Defect/Corrective state
  const [newDefect, setNewDefect] = useState<Partial<Defect>>({
    defect_category: "accuracy_issue",
    defect_severity: "minor",
    defect_description: "",
    evidence_reference: "",
    responsible_source: "",
    corrective_action_required: false,
    owner: "",
    due_at: "",
  });

  const [newCorrective, setNewCorrective] = useState<Partial<CorrectiveAction>>({
    title: "", owner: "", priority: "medium", required_action: "", due_at: "", status: "open",
  });

  // ─── Data fetching ─────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, itemsRes] = await Promise.all([
        api.get("/api/v1/quality-audit/stats"),
        api.get("/api/v1/quality-audit/items"),
      ]);
      if (statsRes.success) setStats(statsRes.data);
      if (itemsRes.success) {
        const auditItems = (itemsRes.data || []) as AuditItem[];
        setItems(auditItems);
        if (auditItems.length > 0 && !selectedItem) {
          handleSelectItem(auditItems[0]);
        }
      }
    } catch (err: any) {
      setError(err.message || "Quality Audit data could not be loaded.");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedItem]);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchItemDetail = async (itemId: string) => {
    try {
      const res = await api.get(`/api/v1/quality-audit/items/${itemId}`);
      if (res.success) {
        const d = res.data;
        if (d.scorecard) setScorecard(d.scorecard);
        setDefects(d.defects || []);
        setCorrectiveActions(d.corrective_actions || []);
        setNotes(d.notes || []);
        setEvidence(d.evidence || []);
      }
    } catch (err: any) {
      console.warn("Failed to load details for " + itemId, err);
    }
  };

  async function handleSelectItem(item: AuditItem) {
    setSelectedItem(item);
    setComparisonTab("comparison");
    setVersionSubTab("ai");
    setFeedbackText("");
    setShowDefectForm(false);
    setShowCorrectiveForm(false);
    setScorecard({
      accuracy: -1, brand_voice: -1, compliance_readiness: -1,
      source_grounding: -1, platform_fit: -1, tone_clarity: -1,
      audience_relevance: -1, review_integrity: -1, publication_consistency: -1,
    });
    setDefects([]);
    setCorrectiveActions([]);
    setNotes([]);
    setEvidence([]);
    await fetchItemDetail(item.id);
  }

  // ─── Filtered items ────────────────────────────────────────────────────────

  const filteredItems = items.filter(item => {
    const q = search.toLowerCase();
    if (q && !item.title.toLowerCase().includes(q) && !item.campaign.toLowerCase().includes(q) && !item.platform.toLowerCase().includes(q)) {
      return false;
    }
    switch (activeTab) {
      case "queue": return item.audit_status === "audit_pending" || item.audit_status === "in_audit";
      case "assigned": return item.assigned_auditor !== null;
      case "correction": return item.audit_status === "needs_correction" || item.audit_status === "corrective_action_open";
      case "completed": return item.audit_status === "passed" || item.audit_status === "failed" || item.audit_status === "closed" || item.audit_status === "archived";
      default: return true;
    }
  });

  const sortedItems = [...filteredItems].sort((a, b) => {
    return new Date(b.audit_due_at || 0).getTime() - new Date(a.audit_due_at || 0).getTime();
  });

  // ─── Score / Eligibility ───────────────────────────────────────────────────

  const overallScore = calculateOverallScore(scorecard);
  const scoreBand = calculateScoreBand(overallScore);
  const isScorecardComplete = Object.values(scorecard).every(v => v >= 0);
  const hasMajorOrCriticalDefects = defects.some(d => d.defect_severity === "major" || d.defect_severity === "critical");
  const hasMissingEvidence = defects.some(d => d.defect_category === "missing_evidence") || selectedItem?.evidence_missing;
  const passEligible = isScorecardComplete && !hasMajorOrCriticalDefects && !hasMissingEvidence;

  // ─── Actions ───────────────────────────────────────────────────────────────

  const handleAction = async (action: string, payload?: Record<string, unknown>) => {
    if (!selectedItem) return;
    setActionLoading(action);
    setMessage(null);
    setShowMoreActions(false);
    try {
      const res = await api.post(`/api/v1/quality-audit/items/${selectedItem.id}/${action}`, payload || {});
      if (res.success) {
        setMessage({ type: "success", text: `Audit ${action.replace(/-/g, " ")} completed.` });
        fetchData();
        fetchItemDetail(selectedItem.id);
      } else {
        setMessage({ type: "error", text: res.error || "Action failed." });
      }
    } catch {
      setMessage({ type: "error", text: "Connection error." });
    } finally {
      setActionLoading(null);
    }
  };

  const handleAssignAuditor = async () => {
    if (!selectedItem) return;
    setActionLoading("assign");
    try {
      const res = await api.post(`/api/v1/quality-audit/items/${selectedItem.id}/assign`, { auditor_id: "current_user" });
      if (res.success) {
        setMessage({ type: "success", text: "Assigned auditor successfully." });
        fetchData();
        fetchItemDetail(selectedItem.id);
      }
    } catch {
      setMessage({ type: "error", text: "Failed to assign auditor." });
    } finally {
      setActionLoading(null);
    }
  };

  const handleGenerateSample = async () => {
    setActionLoading("sample");
    try {
      const res = await api.post("/api/v1/quality-audit/generate-sample", { count: 5 });
      if (res.success) {
        setMessage({ type: "success", text: "Generated 5 audit samples." });
        fetchData();
      }
    } catch {
      setMessage({ type: "error", text: "Failed to generate samples." });
    } finally {
      setActionLoading(null);
    }
  };

  const handleExportFindings = async () => {
    setActionLoading("export");
    try {
      await api.post("/api/v1/quality-audit/export/findings", { item_ids: items.map(i => i.id) });
      setMessage({ type: "success", text: "Exported findings." });
    } catch {
      setMessage({ type: "error", text: "Export failed." });
    } finally {
      setActionLoading(null);
    }
  };

  const handleExportEvidence = async () => {
    if (!selectedItem) return;
    setActionLoading("export-evidence");
    try {
      await api.post("/api/v1/quality-audit/export/evidence", { item_ids: [selectedItem.id] });
      setMessage({ type: "success", text: "Exported evidence package." });
    } catch {
      setMessage({ type: "error", text: "Evidence export failed." });
    } finally {
      setActionLoading(null);
    }
  };

  const handleScoreChange = (key: keyof Scorecard, value: number) => {
    setScorecard(prev => ({ ...prev, [key]: value }));
  };

  const handleCreateDefect = async () => {
    if (!selectedItem || !newDefect.defect_description) return;
    setActionLoading("create-defect");
    try {
      const res = await api.post(`/api/v1/quality-audit/items/${selectedItem.id}/defects`, newDefect);
      if (res.success) {
        setMessage({ type: "success", text: "Defect logged." });
        setDefects(prev => [...prev, res.data]);
        setShowDefectForm(false);
        setNewDefect({ defect_category: "accuracy_issue", defect_severity: "minor", defect_description: "", evidence_reference: "", responsible_source: "", corrective_action_required: false, owner: "", due_at: "" });
      }
    } catch {
      setMessage({ type: "error", text: "Failed to log defect." });
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreateCorrective = async () => {
    if (!selectedItem || !newCorrective.title) return;
    setActionLoading("create-corrective");
    try {
      const res = await api.post(`/api/v1/quality-audit/items/${selectedItem.id}/corrective-actions`, {
        ...newCorrective, defect_id: defects.length > 0 ? defects[0].id : null,
      });
      if (res.success) {
        setMessage({ type: "success", text: "Corrective action created." });
        setCorrectiveActions(prev => [...prev, res.data]);
        setShowCorrectiveForm(false);
        setNewCorrective({ title: "", owner: "", priority: "medium", required_action: "", due_at: "", status: "open" });
      }
    } catch {
      setMessage({ type: "error", text: "Failed to create action." });
    } finally {
      setActionLoading(null);
    }
  };

  const handleAddNote = async () => {
    if (!selectedItem || !feedbackText.trim()) return;
    setActionLoading("add-note");
    try {
      const res = await api.post(`/api/v1/quality-audit/items/${selectedItem.id}/notes`, { note_body: feedbackText, visibility: "internal" });
      if (res.success) {
        setMessage({ type: "success", text: "Note added." });
        setNotes(prev => [...prev, res.data]);
        setFeedbackText("");
      }
    } catch {
      setMessage({ type: "error", text: "Failed to add note." });
    } finally {
      setActionLoading(null);
    }
  };

  // ─── Computed stats ────────────────────────────────────────────────────────

  const activeAudits = (stats?.in_audit || 0) + (items.filter(i => i.audit_status === "audit_pending").length);
  const defectsFound = (stats?.failed || 0) + (stats?.needs_correction || 0);
  const avgScore = stats?.average_score ? `${Math.round(stats.average_score)}%` : "—";

  return (
    <div className="pb-16 px-4">
      {/* ─── Header ─────────────────────────────────────────────────────────── */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white mb-1">Quality Audit</h1>
          <p className="text-[11px] text-[#666]">Audit content drafts, approval paths, and published checks to maintain high quality standards.</p>
        </div>
        <button
          onClick={fetchData}
          className="p-2 bg-[var(--card)] border border-[var(--border)] rounded-xl text-[#888] hover:text-white transition-all"
        >
          <RefreshCcw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-indigo-400" : ""}`} />
        </button>
      </div>

      {/* ─── Toast Messages ─────────────────────────────────────────────────── */}
      {message && (
        <div className={`mb-4 p-3 rounded-xl flex items-center gap-2.5 text-xs font-semibold ${
          message.type === "success"
            ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
            : "bg-rose-500/10 border border-rose-500/20 text-rose-400"
        }`}>
          {message.type === "success" ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
          {message.text}
        </div>
      )}

      {/* ─── Minimal Stats ──────────────────────────────────────────────────── */}
      {stats && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-[#111] border border-[var(--border)] rounded-xl p-3 flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-500/10 text-blue-400 rounded-lg flex items-center justify-center shrink-0">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <p className="text-base font-bold text-white">{activeAudits}</p>
              <p className="text-[9px] text-[#555] font-semibold uppercase tracking-wider leading-none">Active Audits</p>
            </div>
          </div>
          <div className="bg-[#111] border border-[var(--border)] rounded-xl p-3 flex items-center gap-3">
            <div className="w-8 h-8 bg-rose-500/10 text-rose-400 rounded-lg flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <p className="text-base font-bold text-white">{defectsFound}</p>
              <p className="text-[9px] text-[#555] font-semibold uppercase tracking-wider leading-none">Defects Found</p>
            </div>
          </div>
          <div className="bg-[#111] border border-[var(--border)] rounded-xl p-3 flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-500/10 text-emerald-400 rounded-lg flex items-center justify-center shrink-0">
              <Star className="w-4 h-4" />
            </div>
            <div>
              <p className="text-base font-bold text-white">{avgScore}</p>
              <p className="text-[9px] text-[#555] font-semibold uppercase tracking-wider leading-none">Average Score</p>
            </div>
          </div>
        </div>
      )}

      {/* ─── 3-Panel Layout ─────────────────────────────────────────────────── */}
      <div className="flex gap-4 items-start">
        {/* ─── Left Panel: Minimal List ────────────────────────────────────── */}
        <div className="w-[300px] shrink-0 flex flex-col gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#555]" />
            <input
              type="text"
              placeholder="Search audit queue…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-[#111] border border-[var(--border)] text-white placeholder-[#555] focus:outline-none focus:border-indigo-500/40"
            />
          </div>

          <div className="flex gap-1 border-b border-[#2d2d2d] pb-2">
            {FILTER_TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-2 py-1 text-[10px] font-bold rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                    : "text-[#666] hover:text-[#999]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="space-y-2 max-h-[550px] overflow-y-auto pr-1 scrollbar-none">
            {loading ? (
              <div className="flex flex-col items-center py-10 text-[#555] gap-2">
                <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-[10px]">Loading...</p>
              </div>
            ) : sortedItems.length === 0 ? (
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6 text-center text-[#555] text-xs">
                No audits in this filter.
              </div>
            ) : (
              sortedItems.map(item => {
                const isSelected = selectedItem?.id === item.id;
                const statusColor = STATUS_COLORS[item.audit_status] || "bg-white/5 text-[#888]";

                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectItem(item)}
                    className={`w-full text-left bg-[#111] border rounded-xl p-3 hover:border-[#333] transition-all border-l-4 ${
                      isSelected ? "border-indigo-500 bg-indigo-500/[0.02] border-l-indigo-500" : "border-[var(--border)] border-l-slate-600"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1.5 mb-1.5">
                      <p className="text-xs font-semibold text-white truncate flex-1">{item.title}</p>
                      {item.quality_score !== null && (
                        <span className={`text-[10px] font-bold ${calculateScoreBand(item.quality_score).color}`}>
                          {item.quality_score}%
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 mb-1">
                      <span className={`px-1.5 py-[0.5px] rounded text-[8px] font-bold ${statusColor}`}>
                        {getStatusLabel(item.audit_status)}
                      </span>
                      {item.highest_defect_severity && (
                        <span className={`px-1.5 py-[0.5px] rounded text-[8px] font-bold ${SEVERITY_COLORS[item.highest_defect_severity]}`}>
                          {item.highest_defect_severity}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[9px] text-[#555] mt-2">
                      <span>{ITEM_TYPE_LABELS[item.item_type]}</span>
                      <span>{formatDate(item.audit_due_at)}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ─── Center Panel: Workspace & Action Flow ───────────────────────── */}
        <div className="flex-1 min-w-0 bg-[#111] border border-[var(--border)] rounded-2xl p-5 min-h-[450px]">
          {!selectedItem ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-10 text-[#555]">
              <ShieldCheck className="w-8 h-8 opacity-20 mb-2" />
              <p className="text-xs font-semibold">Select an item from the queue to start audit</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Header Info */}
              <div className="border-b border-[#2d2d2d] pb-3 flex justify-between items-start">
                <div>
                  <h3 className="text-sm font-bold text-white mb-0.5">{selectedItem.title}</h3>
                  <div className="flex items-center gap-2 text-[10px] text-[#555]">
                    <span>{ITEM_TYPE_LABELS[selectedItem.item_type]}</span>
                    <span>•</span>
                    <span>{selectedItem.source_module}</span>
                    {selectedItem.platform && <span>• {selectedItem.platform}</span>}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${STATUS_COLORS[selectedItem.audit_status]}`}>
                    {getStatusLabel(selectedItem.audit_status)}
                  </span>
                  {selectedItem.quality_score !== null && (
                    <span className={`text-xs font-bold ${calculateScoreBand(selectedItem.quality_score).color}`}>
                      Audit Score: {selectedItem.quality_score}%
                    </span>
                  )}
                </div>
              </div>

              {/* Quick Actions Bar */}
              <div className="pt-2 flex items-center gap-2 flex-wrap relative">
                {selectedItem.audit_status === "audit_pending" && (
                  <button
                    disabled={actionLoading === "start"}
                    onClick={() => handleAction("start")}
                    className="px-4 py-2 bg-indigo-500 hover:bg-indigo-400 text-black text-xs font-bold rounded-xl transition-all shadow-lg flex items-center gap-1.5"
                  >
                    {actionLoading === "start" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                    Start Audit
                  </button>
                )}

                {selectedItem.audit_status === "in_audit" && (
                  <>
                    <button
                      disabled={actionLoading === "pass" || !passEligible}
                      onClick={() => handleAction("pass", { scorecard })}
                      className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-black text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
                      title={!passEligible ? "Complete scorecard and resolve major defects to pass" : ""}
                    >
                      {actionLoading === "pass" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                      Pass Audit
                    </button>

                    <button
                      disabled={actionLoading === "needs-correction"}
                      onClick={() => handleAction("needs-correction", { scorecard, reason: feedbackText })}
                      className="px-4 py-2 bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-black border border-amber-500/20 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
                    >
                      {actionLoading === "needs-correction" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                      Correction Required
                    </button>

                    <button
                      disabled={actionLoading === "fail"}
                      onClick={() => handleAction("fail", { scorecard, reason: feedbackText || "Failed audit requirements" })}
                      className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-black border border-rose-500/20 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
                    >
                      {actionLoading === "fail" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                      Fail Audit
                    </button>
                  </>
                )}

                {/* More Secondary Options Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setShowMoreActions(!showMoreActions)}
                    className="px-3 py-2 bg-[#1a1a1a] hover:bg-[#222] border border-[#2d2d2d] rounded-xl text-xs font-bold text-[#888] hover:text-white flex items-center gap-1.5"
                  >
                    Auditor Options <ChevronDown className="w-3 h-3" />
                  </button>

                  {showMoreActions && (
                    <div className="absolute top-full left-0 mt-1 bg-[#161616] border border-[#2d2d2d] rounded-xl shadow-xl py-1 z-50 w-44">
                      <button onClick={handleGenerateSample} className="w-full text-left px-3.5 py-2 hover:bg-white/5 text-xs text-[#aaa] font-semibold flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-cyan-400" /> Generate Sample
                      </button>
                      {!selectedItem.assigned_auditor && (
                        <button onClick={handleAssignAuditor} className="w-full text-left px-3.5 py-2 hover:bg-white/5 text-xs text-[#aaa] font-semibold flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-indigo-400" /> Self Assign
                        </button>
                      )}
                      <button onClick={handleExportFindings} className="w-full text-left px-3.5 py-2 hover:bg-white/5 text-xs text-[#aaa] font-semibold flex items-center gap-1.5">
                        <Download className="w-3.5 h-3.5 text-emerald-400" /> Export Findings
                      </button>
                      <button onClick={handleExportEvidence} className="w-full text-left px-3.5 py-2 hover:bg-white/5 text-xs text-[#aaa] font-semibold flex items-center gap-1.5">
                        <Upload className="w-3.5 h-3.5 text-teal-400" /> Export Evidence
                      </button>
                      {selectedItem.audit_status === "in_audit" && (
                        <button onClick={() => handleAction("escalate", { reason: feedbackText || "Escalation requested" })} className="w-full text-left px-3.5 py-2 hover:bg-white/5 text-xs text-purple-400 font-semibold flex items-center gap-1.5">
                          <ArrowRight className="w-3.5 h-3.5" /> Escalate Audit
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Feedbacks input for fail or correction */}
              {selectedItem.audit_status === "in_audit" && (
                <div className="space-y-1.5">
                  <textarea
                    placeholder="Enter audit feedback notes, correction remarks, or fail explanations..."
                    value={feedbackText}
                    onChange={e => setFeedbackText(e.target.value)}
                    rows={2}
                    className="w-full bg-[#181818] border border-[#2d2d2d] rounded-lg p-2.5 text-xs text-white placeholder-[#555] focus:outline-none focus:border-indigo-500/40 resize-none"
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => setShowDefectForm(!showDefectForm)}
                      className="px-2.5 py-1 text-[10px] border border-red-500/20 bg-red-500/5 text-red-400 rounded-lg font-bold hover:bg-red-500/10"
                    >
                      + Log Defect
                    </button>
                    <button
                      onClick={() => setShowCorrectiveForm(!showCorrectiveForm)}
                      className="px-2.5 py-1 text-[10px] border border-amber-500/20 bg-amber-500/5 text-amber-400 rounded-lg font-bold hover:bg-amber-500/10"
                    >
                      + Add Corrective Action
                    </button>
                  </div>
                </div>
              )}

              {/* Log Defect Quick Form */}
              {showDefectForm && (
                <div className="bg-[#151515] border border-red-500/20 p-3.5 rounded-xl space-y-2.5">
                  <h4 className="text-[10px] font-bold text-red-400 uppercase tracking-wider">Log Defect</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={newDefect.defect_category}
                      onChange={e => setNewDefect(prev => ({ ...prev, defect_category: e.target.value as DefectCategory }))}
                      className="p-1.5 bg-[#111] border border-[#2d2d2d] rounded text-[10px] text-white focus:outline-none"
                    >
                      {DEFECT_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                    <select
                      value={newDefect.defect_severity}
                      onChange={e => setNewDefect(prev => ({ ...prev, defect_severity: e.target.value as DefectSeverity }))}
                      className="p-1.5 bg-[#111] border border-[#2d2d2d] rounded text-[10px] text-white focus:outline-none"
                    >
                      <option value="minor">Minor</option>
                      <option value="moderate">Moderate</option>
                      <option value="major">Major</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                  <input
                    type="text"
                    placeholder="Short description of the defect..."
                    value={newDefect.defect_description}
                    onChange={e => setNewDefect(prev => ({ ...prev, defect_description: e.target.value }))}
                    className="w-full p-2 bg-[#111] border border-[#2d2d2d] rounded text-[10px] text-white"
                  />
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setShowDefectForm(false)} className="px-2.5 py-1 text-[9px] text-[#888] hover:text-white">Cancel</button>
                    <button onClick={handleCreateDefect} className="px-2.5 py-1 bg-red-600 hover:bg-red-500 text-white rounded text-[9px] font-bold">Save Defect</button>
                  </div>
                </div>
              )}

              {/* Add Corrective Action Quick Form */}
              {showCorrectiveForm && (
                <div className="bg-[#151515] border border-amber-500/20 p-3.5 rounded-xl space-y-2.5">
                  <h4 className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Create Corrective Action</h4>
                  <input
                    type="text"
                    placeholder="Action Item Title..."
                    value={newCorrective.title}
                    onChange={e => setNewCorrective(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full p-2 bg-[#111] border border-[#2d2d2d] rounded text-[10px] text-white"
                  />
                  <textarea
                    placeholder="Describe what needs to be fixed..."
                    value={newCorrective.required_action}
                    onChange={e => setNewCorrective(prev => ({ ...prev, required_action: e.target.value }))}
                    rows={2}
                    className="w-full p-2 bg-[#111] border border-[#2d2d2d] rounded text-[10px] text-white resize-none"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Assignee (email or user ID)"
                      value={newCorrective.owner}
                      onChange={e => setNewCorrective(prev => ({ ...prev, owner: e.target.value }))}
                      className="p-1.5 bg-[#111] border border-[#2d2d2d] rounded text-[10px] text-white"
                    />
                    <input
                      type="date"
                      value={newCorrective.due_at}
                      onChange={e => setNewCorrective(prev => ({ ...prev, due_at: e.target.value }))}
                      className="p-1.5 bg-[#111] border border-[#2d2d2d] rounded text-[10px] text-white"
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setShowCorrectiveForm(false)} className="px-2.5 py-1 text-[9px] text-[#888] hover:text-white">Cancel</button>
                    <button onClick={handleCreateCorrective} className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded text-[9px] font-bold">Create Action</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ─── Right Panel: Single Tabbed Card (Scorecard + Details) ───────── */}
        {selectedItem && (
          <div className="w-[340px] shrink-0 bg-[#111] border border-[var(--border)] rounded-2xl p-4 min-h-[450px] flex flex-col">
            <div className="flex gap-2 border-b border-[#2d2d2d] pb-2 mb-3 shrink-0">
              <button
                onClick={() => setComparisonTab("comparison")}
                className={`flex-1 py-1 text-[10px] font-bold rounded-lg transition-colors ${
                  comparisonTab === "comparison" ? "bg-white/5 text-white" : "text-[#555]"
                }`}
              >
                Comparison
              </button>
              <button
                onClick={() => setComparisonTab("findings")}
                className={`flex-1 py-1 text-[10px] font-bold rounded-lg transition-colors ${
                  comparisonTab === "findings" ? "bg-white/5 text-white" : "text-[#555]"
                }`}
              >
                Findings
              </button>
              <button
                onClick={() => setComparisonTab("evidence")}
                className={`flex-1 py-1 text-[10px] font-bold rounded-lg transition-colors ${
                  comparisonTab === "evidence" ? "bg-white/5 text-white" : "text-[#555]"
                }`}
              >
                Logs & Evid.
              </button>
            </div>

            <div className="flex-1 overflow-y-auto max-h-[450px] scrollbar-none space-y-4">
              {/* Tab 1: Version Comparison */}
              {comparisonTab === "comparison" && (
                <div className="space-y-3">
                  <div className="flex gap-1 bg-white/5 p-1 rounded-lg shrink-0">
                    <button onClick={() => setVersionSubTab("ai")} className={`flex-1 text-[9px] py-1 font-semibold rounded ${versionSubTab === "ai" ? "bg-[#222] text-white" : "text-[#666]"}`}>AI Draft</button>
                    <button onClick={() => setVersionSubTab("approved")} className={`flex-1 text-[9px] py-1 font-semibold rounded ${versionSubTab === "approved" ? "bg-[#222] text-white" : "text-[#666]"}`}>Approved</button>
                    <button onClick={() => setVersionSubTab("published")} className={`flex-1 text-[9px] py-1 font-semibold rounded ${versionSubTab === "published" ? "bg-[#222] text-white" : "text-[#666]"}`}>Published</button>
                  </div>

                  <div className="bg-black/40 border border-[#2d2d2d] p-3 rounded-xl text-xs text-[#aaa] min-h-[120px] leading-relaxed">
                    {versionSubTab === "ai" && (
                      <p>{selectedItem.title || "(No draft title)"}</p>
                    )}
                    {versionSubTab === "approved" && (
                      <p>{selectedItem.title || "(No approved title)"}</p>
                    )}
                    {versionSubTab === "published" && (
                      <div className="space-y-2">
                        {selectedItem.published_mismatch && (
                          <div className="text-[9px] font-bold text-rose-400 bg-rose-500/5 border border-rose-500/10 p-1.5 rounded flex items-center gap-1">
                            <GitCompare className="w-3 h-3" /> Mismatch with approved version
                          </div>
                        )}
                        <p>{selectedItem.title || "(No published title)"}</p>
                        {selectedItem.published_at && (
                          <p className="text-[9px] text-[#555] pt-1">Published at: {new Date(selectedItem.published_at).toLocaleString()}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 2: Findings (Scorecard & Defects) */}
              {comparisonTab === "findings" && (
                <div className="space-y-4">
                  {/* Scorecard Slider / Select */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <h4 className="text-[10px] font-bold text-white uppercase tracking-wider">Rubric Evaluation</h4>
                      {overallScore !== null && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${scoreBand.color} bg-white/5`}>
                          Score: {overallScore}/100
                        </span>
                      )}
                    </div>

                    <div className="space-y-2 bg-black/40 border border-[#2d2d2d] p-3 rounded-xl max-h-[200px] overflow-y-auto scrollbar-none">
                      {SCORECARD_CATEGORIES.map(cat => (
                        <div key={cat.key} className="flex items-center justify-between text-[10px]">
                          <span className="text-[#888]">{cat.label}</span>
                          <div className="flex gap-0.5">
                            {[0, 1, 2, 3, 4, 5].map(v => (
                              <button
                                key={v}
                                onClick={() => handleScoreChange(cat.key, scorecard[cat.key] === v ? -1 : v)}
                                className={`w-4 h-4 rounded text-[8px] font-bold transition-all ${
                                  scorecard[cat.key] === v
                                    ? "bg-indigo-500 text-black font-extrabold"
                                    : "bg-[#222] text-[#666] hover:bg-[#333]"
                                }`}
                              >
                                {v}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Defects List */}
                  <div className="space-y-2 pt-2 border-t border-[#2d2d2d]">
                    <h4 className="text-[10px] font-bold text-white uppercase tracking-wider">Logged Defects</h4>
                    {defects.length === 0 ? (
                      <p className="text-[9px] text-[#444] italic">No defects identified.</p>
                    ) : (
                      <div className="space-y-1.5 max-h-[140px] overflow-y-auto">
                        {defects.map(d => (
                          <div key={d.id} className="bg-white/[0.02] border border-white/5 p-2 rounded-lg text-[10px] space-y-1">
                            <div className="flex justify-between">
                              <span className="font-semibold text-white truncate max-w-[120px]">{DEFECT_CATEGORIES.find(c => c.value === d.defect_category)?.label || d.defect_category}</span>
                              <span className={`text-[8px] font-bold px-1 rounded ${SEVERITY_COLORS[d.defect_severity]}`}>{d.defect_severity}</span>
                            </div>
                            <p className="text-[#ccc]">{d.defect_description}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 3: Evidence & Notes */}
              {comparisonTab === "evidence" && (
                <div className="space-y-4">
                  {/* Evidence Packages */}
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-bold text-white uppercase tracking-wider">Evidence Files</h4>
                    {evidence.length === 0 ? (
                      <p className="text-[9px] text-[#444] italic">No evidence artifacts.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {evidence.map(e => (
                          <div key={e.id} className="bg-white/[0.02] border border-white/5 rounded-lg p-2 flex items-center gap-2 text-[10px]">
                            <FileText className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="text-[#ccc] truncate">{e.evidence_type}</p>
                              <p className="text-[8px] text-[#555]">{e.evidence_reference}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Notes Feed */}
                  <div className="space-y-2 pt-3 border-t border-[#2d2d2d]">
                    <h4 className="text-[10px] font-bold text-white uppercase tracking-wider">Internal Notes</h4>
                    <div className="space-y-2 max-h-36 overflow-y-auto">
                      {notes.length === 0 ? (
                        <p className="text-[9px] text-[#444] italic">No audit notes.</p>
                      ) : (
                        notes.map(note => (
                          <div key={note.id} className="bg-white/[0.02] border border-white/5 rounded-lg p-2 text-[10px]">
                            <div className="flex justify-between text-[#555] text-[8px] mb-1 font-semibold">
                              <span>{note.created_by?.slice(0, 8)}</span>
                              <span>{formatDate(note.created_at)}</span>
                            </div>
                            <p className="text-[#ccc] leading-normal">{note.note_body}</p>
                          </div>
                        ))
                      )}
                    </div>
                    <div className="flex gap-1.5 mt-2">
                      <input
                        type="text"
                        placeholder="Add quick audit note…"
                        value={feedbackText}
                        onChange={e => setFeedbackText(e.target.value)}
                        className="flex-1 bg-[#181818] border border-[#2d2d2d] rounded-lg px-2 py-1 text-[10px] text-white placeholder-[#444] outline-none"
                      />
                      <button
                        onClick={handleAddNote}
                        disabled={actionLoading === "add-note" || !feedbackText.trim()}
                        className="px-2.5 bg-indigo-500 hover:bg-indigo-400 disabled:opacity-40 text-black text-[10px] font-bold rounded-lg transition-all"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
