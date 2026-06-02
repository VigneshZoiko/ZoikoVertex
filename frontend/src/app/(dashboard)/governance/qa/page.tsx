"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ShieldCheck, Search, AlertTriangle, CheckCircle2,
  BarChart3, FileText, Loader2, X,
  Activity, ArrowRight, Eye, RefreshCcw,
  List, XCircle, AlertOctagon, Star,
  Clock, Filter, Download, Settings, Users,
  MessageSquare, Paperclip, RotateCcw, Lock,
  Calendar, User, GitCompare, FileCheck,
  ClipboardList, Bug, Zap,
  Edit3, Upload, Ban,
  AlertCircle, EyeOff,
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

type TabId =
  | "audit_queue" | "assigned_to_me" | "in_audit" | "passed"
  | "failed" | "needs_correction" | "high_severity_defects"
  | "published_check" | "completed_audits";

type ComparisonTab =
  | "ai_draft" | "human_edits" | "approved_version" | "published_version"
  | "validation_results" | "approval_history" | "audit_findings"
  | "evidence" | "corrective_actions";

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

type AlertType = "critical_defects" | "published_mismatch" | "overdue" | "evidence_missing";

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
  replies?: AuditNote[];
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

interface AlertDef {
  id: string; type: string; message: string; severity: "critical" | "warning" | "info";
}

// ─── Constants ───────────────────────────────────────────────────────────────

const TABS: { id: TabId; label: string }[] = [
  { id: "audit_queue", label: "Audit Queue" },
  { id: "assigned_to_me", label: "Assigned to Me" },
  { id: "in_audit", label: "In Audit" },
  { id: "passed", label: "Passed" },
  { id: "failed", label: "Failed" },
  { id: "needs_correction", label: "Needs Correction" },
  { id: "high_severity_defects", label: "High-Severity Defects" },
  { id: "published_check", label: "Published Check" },
  { id: "completed_audits", label: "Completed Audits" },
];

const COMPARISON_TABS: { id: ComparisonTab; label: string }[] = [
  { id: "ai_draft", label: "AI Draft" },
  { id: "human_edits", label: "Human Edits" },
  { id: "approved_version", label: "Approved Version" },
  { id: "published_version", label: "Published/Sent Version" },
  { id: "validation_results", label: "Validation Results" },
  { id: "approval_history", label: "Approval History" },
  { id: "audit_findings", label: "Audit Findings" },
  { id: "evidence", label: "Evidence" },
  { id: "corrective_actions", label: "Corrective Actions" },
];

const SCORECARD_CATEGORIES: { key: keyof Scorecard; label: string }[] = [
  { key: "accuracy", label: "Accuracy" },
  { key: "brand_voice", label: "Brand Voice" },
  { key: "compliance_readiness", label: "Compliance Readiness" },
  { key: "source_grounding", label: "Source Grounding" },
  { key: "platform_fit", label: "Platform Fit" },
  { key: "tone_clarity", label: "Tone and Clarity" },
  { key: "audience_relevance", label: "Audience Relevance" },
  { key: "review_integrity", label: "Review Integrity" },
  { key: "publication_consistency", label: "Publication Consistency" },
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
  published_content_check: "Published Content Check",
  sampled_item: "Sampled Item",
};

const CORRECTIVE_ACTION_STATUSES: { value: CorrectiveActionStatus; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "assigned", label: "Assigned" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "overdue", label: "Overdue" },
  { value: "escalated", label: "Escalated" },
  { value: "closed", label: "Closed" },
];

const METRIC_CARDS = [
  { key: "total_items", label: "Audit Items", icon: List, color: "text-indigo-400" },
  { key: "in_audit", label: "In Audit", icon: Activity, color: "text-blue-400" },
  { key: "passed", label: "Passed", icon: CheckCircle2, color: "text-emerald-400" },
  { key: "failed", label: "Failed", icon: XCircle, color: "text-rose-400" },
  { key: "needs_correction", label: "Needs Correction", icon: AlertTriangle, color: "text-amber-400" },
  { key: "average_score", label: "Avg Quality Score", icon: Star, color: "text-purple-400", suffix: "%" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function calculateScoreBand(score: number | null): { band: ScoreBand | null; label: string; color: string } {
  if (score === null) return { band: null, label: "Not Scored", color: "text-slate-500" };
  if (score >= 90) return { band: "excellent", label: "Excellent", color: "text-emerald-400" };
  if (score >= 75) return { band: "acceptable", label: "Acceptable", color: "text-blue-400" };
  if (score >= 60) return { band: "needs_improvement", label: "Needs Improvement", color: "text-amber-400" };
  if (score >= 40) return { band: "poor", label: "Poor", color: "text-orange-400" };
  return { band: "critical_failure", label: "Critical Failure", color: "text-rose-400" };
}

function calculateOverallScore(card: Scorecard): number | null {
  const vals = Object.values(card);
  if (vals.some(v => v < 0)) return null;
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  return Math.round((avg / 5) * 100);
}

function formatDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function getStatusLabel(s: AuditStatus): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function StatusBadge({ status }: { status: AuditStatus }) {
  const cfg = STATUS_COLORS[status] ?? "text-slate-400 bg-slate-500/10 border-slate-500/20";
  return <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${cfg}`}>{getStatusLabel(status)}</span>;
}

function SeverityBadge({ severity }: { severity: DefectSeverity }) {
  const cfg = SEVERITY_COLORS[severity] ?? "text-slate-400 bg-slate-500/10 border-slate-500/20";
  return <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${cfg}`}>{severity}</span>;
}

// ─── Main Page ───────────────────────────────────────────────────────────────

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
  const [activeTab, setActiveTab] = useState<TabId>("audit_queue");
  const [comparisonTab, setComparisonTab] = useState<ComparisonTab>("ai_draft");
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [showLeft, setShowLeft] = useState(true);
  const [showRight, setShowRight] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showDefectModal, setShowDefectModal] = useState(false);
  const [showCorrectiveModal, setShowCorrectiveModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [permissionError, setPermissionError] = useState(false);
  const [lockedError, setLockedError] = useState<string | null>(null);
  const [callbackFailed, setCallbackFailed] = useState(false);
  const [alertDismissed, setAlertDismissed] = useState<Set<string>>(new Set());

  // Score override
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");

  // Filter state
  const [filterItemType, setFilterItemType] = useState("");
  const [filterSeverity, setFilterSeverity] = useState("");
  const [filterModule, setFilterModule] = useState("");

  const scoreExplanations: Record<number, string> = {
    0: "Critical failure / missing evidence",
    1: "Major issue",
    2: "Defective",
    3: "Needs improvement",
    4: "Strong / acceptable",
    5: "Excellent",
  };

  // ─── Data fetching ─────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setPermissionError(false);
    try {
      const [statsRes, itemsRes] = await Promise.all([
        api.get("/api/v1/quality-audit/stats"),
        api.get("/api/v1/quality-audit/items"),
      ]);
      if (statsRes.success) setStats(statsRes.data);
      if (itemsRes.success) setItems(itemsRes.data);
    } catch (err: any) {
      if (err.message?.includes("permission") || err.message?.includes("403")) {
        setPermissionError(true);
      } else {
        setError(err.message || "Quality Audit could not be loaded. Try again.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
      if (err.message?.includes("locked")) {
        setLockedError(err.message);
      } else if (err.message?.includes("permission")) {
        setPermissionError(true);
      }
    }
  };

  const handleSelectItem = async (item: AuditItem) => {
    setSelectedItem(item);
    setLockedError(null);
    setPermissionError(false);
    setCallbackFailed(false);
    setComparisonTab("ai_draft");
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
  };

  // ─── Filtered items ────────────────────────────────────────────────────────

  const filteredItems = items.filter(item => {
    const q = search.toLowerCase();
    if (q && !item.title.toLowerCase().includes(q) && !item.campaign.toLowerCase().includes(q) && !item.platform.toLowerCase().includes(q) && !(item.assigned_auditor || "").toLowerCase().includes(q) && !(item.original_reviewer || "").toLowerCase().includes(q) && !(item.agent_name || "").toLowerCase().includes(q)) {
      return false;
    }
    if (filterItemType && item.item_type !== filterItemType) return false;
    if (filterSeverity && item.highest_defect_severity !== filterSeverity) return false;
    if (filterModule && item.source_module !== filterModule) return false;
    switch (activeTab) {
      case "audit_queue": return item.audit_status === "audit_pending";
      case "assigned_to_me": return item.assigned_auditor !== null;
      case "in_audit": return item.audit_status === "in_audit";
      case "passed": return item.audit_status === "passed";
      case "failed": return item.audit_status === "failed";
      case "needs_correction": return item.audit_status === "needs_correction" || item.audit_status === "corrective_action_open";
      case "high_severity_defects": return item.highest_defect_severity === "major" || item.highest_defect_severity === "critical";
      case "published_check": return item.published_mismatch;
      case "completed_audits": return item.audit_status === "closed" || item.audit_status === "archived";
      default: return true;
    }
  });

  // ─── Score / Eligibility ───────────────────────────────────────────────────

  const overallScore = calculateOverallScore(scorecard);
  const scoreBand = calculateScoreBand(overallScore);
  const isScorecardComplete = Object.values(scorecard).every(v => v >= 0);
  const hasCriticalDefects = defects.some(d => d.defect_severity === "critical");
  const hasMajorOrCriticalDefects = defects.some(d => d.defect_severity === "major" || d.defect_severity === "critical");
  const hasMissingEvidence = defects.some(d => d.defect_category === "missing_evidence") || selectedItem?.evidence_missing;
  const pubConsistencyZero = scorecard.publication_consistency === 0;
  const complianceLow = scorecard.compliance_readiness === 0 || scorecard.compliance_readiness === 1;
  const sourceGroundingZero = scorecard.source_grounding === 0;

  const passEligible = isScorecardComplete && !hasMajorOrCriticalDefects && !pubConsistencyZero && !hasMissingEvidence;
  const failRequired = hasCriticalDefects || overallScore !== null && overallScore < 40;
  const correctionRequired = !passEligible && !failRequired;

  // ─── Actions ───────────────────────────────────────────────────────────────

  const handleAction = async (action: string, payload?: Record<string, unknown>) => {
    if (!selectedItem) return;
    setActionLoading(action);
    try {
      const res = await api.post(`/api/v1/quality-audit/items/${selectedItem.id}/${action}`, payload || {});
      if (res.success) {
        const statusMap: Record<string, AuditStatus> = {
          start: "in_audit", pass: "passed", fail: "failed",
          "needs-correction": "needs_correction", escalate: "escalated", close: "closed",
        };
        const newStatus = statusMap[action];
        if (newStatus) {
          setSelectedItem({ ...selectedItem, audit_status: newStatus, quality_score: overallScore, score_band: scoreBand.band });
          setItems(prev => prev.map(i => i.id === selectedItem.id ? { ...i, audit_status: newStatus, quality_score: overallScore, score_band: scoreBand.band } : i));
        }
      }
    } catch (err: any) {
      if (err.message?.includes("callback")) setCallbackFailed(true);
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
        setSelectedItem({ ...selectedItem, assigned_auditor: "current_user" });
        setItems(prev => prev.map(i => i.id === selectedItem.id ? { ...i, assigned_auditor: "current_user" } : i));
      }
    } catch { /* noop */ } finally { setActionLoading(null); }
  };

  const handleGenerateSample = async () => {
    setActionLoading("sample");
    try {
      const res = await api.post("/api/v1/quality-audit/generate-sample", { count: 10 });
      if (res.success && res.data) setItems(prev => [...res.data, ...prev]);
    } catch { /* noop */ } finally { setActionLoading(null); }
  };

  const handleExportFindings = async () => {
    setActionLoading("export");
    try { await api.post("/api/v1/quality-audit/export/findings", { item_ids: items.map(i => i.id) }); } catch { /* noop */ } finally { setActionLoading(null); }
  };

  const handleExportEvidence = async () => {
    setActionLoading("export-evidence");
    try { await api.post("/api/v1/quality-audit/export/evidence", { item_ids: selectedItem ? [selectedItem.id] : items.map(i => i.id) }); } catch { /* noop */ } finally { setActionLoading(null); }
  };

  const handleRetryCallback = async () => {
    if (!selectedItem) return;
    setActionLoading("retry");
    try { await api.post(`/api/v1/quality-audit/items/${selectedItem.id}/retry-callback`, {}); setCallbackFailed(false); } catch { /* noop */ } finally { setActionLoading(null); }
  };

  // ─── Scorecard change ──────────────────────────────────────────────────────

  const handleScoreChange = (key: keyof Scorecard, value: number) => {
    setScorecard(prev => ({ ...prev, [key]: value }));
  };

  // ─── Defect / Corrective / Note creation ───────────────────────────────────

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

  const handleCreateDefect = async () => {
    if (!selectedItem || !newDefect.defect_description) return;
    setActionLoading("create-defect");
    try {
      const res = await api.post(`/api/v1/quality-audit/items/${selectedItem.id}/defects`, newDefect);
      if (res.success) {
        setDefects(prev => [...prev, res.data]);
        setShowDefectModal(false);
        setNewDefect({ defect_category: "accuracy_issue", defect_severity: "minor", defect_description: "", evidence_reference: "", responsible_source: "", corrective_action_required: false, owner: "", due_at: "" });
      }
    } catch { /* noop */ } finally { setActionLoading(null); }
  };

  const [newCorrective, setNewCorrective] = useState<Partial<CorrectiveAction>>({
    title: "", owner: "", priority: "medium", required_action: "", due_at: "", status: "open",
  });

  const handleCreateCorrective = async () => {
    if (!selectedItem || !newCorrective.title) return;
    setActionLoading("create-corrective");
    try {
      const res = await api.post(`/api/v1/quality-audit/items/${selectedItem.id}/corrective-actions`, {
        ...newCorrective, defect_id: defects.length > 0 ? defects[0].id : null,
      });
      if (res.success) {
        setCorrectiveActions(prev => [...prev, res.data]);
        setShowCorrectiveModal(false);
        setNewCorrective({ title: "", owner: "", priority: "medium", required_action: "", due_at: "", status: "open" });
      }
    } catch { /* noop */ } finally { setActionLoading(null); }
  };

  const [noteText, setNoteText] = useState("");

  const handleAddNote = async () => {
    if (!selectedItem || !noteText.trim()) return;
    setActionLoading("add-note");
    try {
      const res = await api.post(`/api/v1/quality-audit/items/${selectedItem.id}/notes`, { note_body: noteText, visibility: "internal" });
      if (res.success) { setNotes(prev => [...prev, res.data]); setNoteText(""); setShowNoteModal(false); }
    } catch { /* noop */ } finally { setActionLoading(null); }
  };

  const handleScoreOverride = async () => {
    if (!selectedItem || !overrideReason.trim()) return;
    setActionLoading("override");
    try { await api.post(`/api/v1/quality-audit/items/${selectedItem.id}/scorecard/override`, { overall_score: overallScore, reason: overrideReason }); setShowOverrideModal(false); setOverrideReason(""); } catch { /* noop */ } finally { setActionLoading(null); }
  };

  // ─── Alerts ────────────────────────────────────────────────────────────────

  const activeAlerts: AlertDef[] = [];
  if ((stats?.critical_defects || 0) > 0) activeAlerts.push({ id: "critical", type: "Critical Defects Found", message: `${stats?.critical_defects} critical defects require immediate attention`, severity: "critical" });
  if ((stats?.published_mismatches || 0) > 0) activeAlerts.push({ id: "mismatch", type: "Published Mismatch", message: `${stats?.published_mismatches} items have published version mismatches`, severity: "warning" });
  if ((stats?.overdue_actions || 0) > 0) activeAlerts.push({ id: "overdue", type: "Corrective Actions Overdue", message: `${stats?.overdue_actions} corrective actions are past due`, severity: "warning" });
  if ((stats?.missing_evidence || 0) > 0) activeAlerts.push({ id: "evidence", type: "Evidence Missing", message: `${stats?.missing_evidence} items have missing evidence`, severity: "warning" });

  const visibleAlerts = activeAlerts.filter(a => !alertDismissed.has(a.id));

  const dismissAlert = (id: string) => {
    const next = new Set(alertDismissed); next.add(id); setAlertDismissed(next);
  };

  // ─── Computed metrics ──────────────────────────────────────────────────────

  const activeMetrics = METRIC_CARDS.map(m => ({
    ...m,
    value: m.key === "average_score"
      ? (stats?.average_score ? `${Math.round(stats.average_score)}${m.suffix || ""}` : "—")
      : String(stats?.[m.key as keyof Stats] ?? 0),
  }));

  // ─── Permission / Error / Loading ──────────────────────────────────────────

  if (permissionError) {
    return (
      <div className="h-[calc(100vh-3.5rem)] flex flex-col bg-[#0e0e0e] items-center justify-center text-[#555] gap-3">
        <Ban className="w-10 h-10 opacity-30" />
        <p className="text-sm font-medium">Permission Denied</p>
        <p className="text-xs">You do not have permission to audit items.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-[calc(100vh-3.5rem)] flex flex-col bg-[#0e0e0e] items-center justify-center text-[#555] gap-3">
        <AlertCircle className="w-10 h-10 opacity-30" />
        <p className="text-sm font-medium">Load Error</p>
        <p className="text-xs">{error}</p>
        <button onClick={fetchData} className="mt-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium transition-colors">
          Retry
        </button>
      </div>
    );
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col bg-[#0e0e0e]">
      {/* ─── Alert Strip ─────────────────────────────────────────────────── */}
      {visibleAlerts.length > 0 && (
        <div className="flex gap-2 px-4 pt-2 pb-1 overflow-x-auto shrink-0">
          {visibleAlerts.map(a => (
            <div key={a.id} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs shrink-0 border ${
              a.severity === "critical" ? "bg-rose-500/10 border-rose-500/20 text-rose-300" :
              "bg-amber-500/10 border-amber-500/20 text-amber-300"
            }`}>
              {a.severity === "critical" ? <AlertCircle className="w-3 h-3 shrink-0" /> : <AlertTriangle className="w-3 h-3 shrink-0" />}
              <span className="font-medium whitespace-nowrap">{a.type}:</span>
              <span className="opacity-80 whitespace-nowrap">{a.message}</span>
              <button onClick={() => dismissAlert(a.id)} className="opacity-40 hover:opacity-100 ml-1">
                <XCircle className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2d2d2d] shrink-0">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-lg font-bold text-white">Quality Audit</h1>
            <p className="text-[11px] text-[#888]">Audit content, replies, agent outputs, and workflow decisions for quality and compliance</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {[
            { label: "Start Audit", icon: ShieldCheck, key: "start", disabledTooltip: "Select an audit item to start", requiresItem: true },
            { label: "Generate Sample", icon: Zap, key: "sample", disabledTooltip: "Generate an audit sample", requiresItem: false },
            { label: "Assign Auditor", icon: Users, key: "assign", disabledTooltip: "Select an item to assign an auditor", requiresItem: true },
            { label: "Export Findings", icon: Download, key: "export", disabledTooltip: "Export audit findings", requiresItem: false },
            { label: "Export Evidence", icon: Upload, key: "export-evidence", disabledTooltip: "Export evidence package", requiresItem: true },
            { label: "Settings", icon: Settings, key: "settings", disabledTooltip: "Quality audit settings (admin only)", requiresItem: false },
          ].map(btn => {
            const isDisabled = btn.key === "settings" ? true :
              btn.key === "sample" ? false :
              btn.key === "export" ? false :
              !selectedItem;
            return (
              <div key={btn.label} className="group relative">
                <button disabled={isDisabled}
                  onClick={() => {
                    if (btn.key === "start" && selectedItem) handleAction("start");
                    else if (btn.key === "sample") handleGenerateSample();
                    else if (btn.key === "assign" && selectedItem) handleAssignAuditor();
                    else if (btn.key === "export") handleExportFindings();
                    else if (btn.key === "export-evidence") handleExportEvidence();
                  }}
                  className={`p-2 border rounded-lg transition-all ${
                    isDisabled ? "bg-[#161616] border-[#2d2d2d] text-[#555] cursor-not-allowed" : "bg-[#161616] border-[#2d2d2d] text-[#888] hover:text-white hover:border-[#444]"
                  }`}>
                  {actionLoading === btn.key ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <btn.icon className="w-3.5 h-3.5" />}
                </button>
                <div className="absolute top-full mt-1 right-0 bg-[#1a1a1a] border border-[#2d2d2d] rounded-lg px-2.5 py-1.5 text-[10px] text-[#888] whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-50 shadow-xl max-w-48">
                  {btn.disabledTooltip}
                </div>
              </div>
            );
          })}
          <button onClick={fetchData} className="p-2 bg-[#161616] border border-[#2d2d2d] rounded-lg text-[#888] hover:text-white ml-2">
            <RefreshCcw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-indigo-400" : ""}`} />
          </button>
        </div>
      </div>

      {/* ─── Metric Cards ──────────────────────────────────────────────── */}
      <div className="flex gap-2.5 px-4 py-3 overflow-x-auto shrink-0 border-b border-[#1a1a1a]">
        {activeMetrics.map(m => (
          <div key={m.key} className="flex items-center gap-2.5 px-3.5 py-2.5 bg-[#111] border border-[#2d2d2d] rounded-xl min-w-[140px] shrink-0">
            <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center">
              <m.icon className={`w-4 h-4 ${m.color}`} />
            </div>
            <div className="text-left">
              <p className={`text-lg font-bold ${m.color}`}>{m.value}</p>
              <p className="text-[10px] text-[#666] font-medium">{m.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ─── Tab Bar ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-[#1a1a1a] overflow-x-auto shrink-0">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
              activeTab === tab.id ? "bg-indigo-500/15 text-indigo-300 border border-indigo-500/20" : "text-[#666] hover:text-white hover:bg-white/5"
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─── Callback Failed Banner ──────────────────────────────────────── */}
      {callbackFailed && (
        <div className="mx-4 mt-2 p-2.5 rounded-lg flex items-center justify-between text-xs bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            Audit outcome was saved, but the source module could not be updated. Retry callback.
          </div>
          <button onClick={handleRetryCallback} disabled={actionLoading === "retry"}
            className="flex items-center gap-1 px-3 py-1 bg-amber-600 hover:bg-amber-500 disabled:bg-amber-800 text-white rounded-lg text-[10px] font-medium">
            {actionLoading === "retry" ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
            Retry
          </button>
        </div>
      )}

      {/* ─── Error Banner ────────────────────────────────────────────────── */}
      {error && (
        <div className="mx-4 mt-2 p-2.5 rounded-lg flex items-center gap-2 text-xs bg-rose-500/10 border border-rose-500/20 text-rose-400 shrink-0">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {error}
        </div>
      )}

      {/* ─── Search + Filter Bar ────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-[#1a1a1a] shrink-0">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#555]" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search items, campaigns, auditors..."
            className="w-full bg-[#111] border border-[#2d2d2d] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-[#555] focus:outline-none focus:border-indigo-500/40" />
        </div>
        <button onClick={() => setShowFilters(!showFilters)}
          className={`p-1.5 rounded-lg border text-xs flex items-center gap-1.5 transition-colors ${
            showFilters ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-300" : "bg-[#161616] border-[#2d2d2d] text-[#666]"
          }`}>
          <Filter className="w-3.5 h-3.5" /> Filters
        </button>
        <button onClick={() => setShowLeft(!showLeft)}
          className={`p-1.5 rounded-lg border text-xs ${showLeft ? "bg-[#161616] border-[#2d2d2d] text-[#888]" : "bg-indigo-500/10 border-indigo-500/30 text-indigo-300"}`}>
          <Eye className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => setShowRight(!showRight)}
          className={`p-1.5 rounded-lg border text-xs ${showRight ? "bg-[#161616] border-[#2d2d2d] text-[#888]" : "bg-indigo-500/10 border-indigo-500/30 text-indigo-300"}`}>
          <EyeOff className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* ─── Filter Drawer ──────────────────────────────────────────────── */}
      {showFilters && (
        <div className="flex items-center gap-3 px-4 py-2 border-b border-[#1a1a1a] bg-[#0a0a0a] shrink-0">
          <select value={filterItemType} onChange={e => setFilterItemType(e.target.value)}
            className="bg-[#111] border border-[#2d2d2d] rounded-lg px-2.5 py-1.5 text-xs text-[#aaa]">
            <option value="">All Item Types</option>
            {Object.entries(ITEM_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <select value={filterSeverity} onChange={e => setFilterSeverity(e.target.value)}
            className="bg-[#111] border border-[#2d2d2d] rounded-lg px-2.5 py-1.5 text-xs text-[#aaa]">
            <option value="">All Severities</option>
            <option value="minor">Minor</option><option value="moderate">Moderate</option>
            <option value="major">Major</option><option value="critical">Critical</option>
          </select>
          <select value={filterModule} onChange={e => setFilterModule(e.target.value)}
            className="bg-[#111] border border-[#2d2d2d] rounded-lg px-2.5 py-1.5 text-xs text-[#aaa]">
            <option value="">All Modules</option>
            <option value="Media Engine">Media Engine</option>
            <option value="Inbox & Engagement">Inbox & Engagement</option>
            <option value="Campaigns">Campaigns</option>
            <option value="Agent Studio">Agent Studio</option>
            <option value="Approvals">Approvals</option>
            <option value="Validation Desk">Validation Desk</option>
          </select>
        </div>
      )}

      {/* ─── 3-Panel Layout ─────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── Left Panel — Audit Items ──────────────────────────────────── */}
        {showLeft && (
          <div className="w-80 shrink-0 border-r border-[#1a1a1a] overflow-y-auto bg-[#0a0a0a]">
            {loading ? (
              <div className="flex items-center justify-center py-12 text-[#555] text-xs">Loading...</div>
            ) : filteredItems.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-[#555] gap-2 px-4 text-center">
                {activeTab === "audit_queue" ? <><List className="w-8 h-8 opacity-30" /><p className="text-sm font-medium">Audit queue is empty</p><p className="text-[10px]">Generate a sample to begin quality auditing.</p></> :
                 activeTab === "assigned_to_me" ? <><Users className="w-8 h-8 opacity-30" /><p className="text-sm font-medium">No items assigned to you</p><p className="text-[10px]">Audit items assigned to you will appear here.</p></> :
                 activeTab === "in_audit" ? <><Activity className="w-8 h-8 opacity-30" /><p className="text-sm font-medium">No items in audit</p><p className="text-[10px]">Items currently being audited will appear here.</p></> :
                 activeTab === "passed" ? <><CheckCircle2 className="w-8 h-8 opacity-30" /><p className="text-sm font-medium">No passed audits</p><p className="text-[10px]">Items that passed quality audit will appear here.</p></> :
                 activeTab === "failed" ? <><XCircle className="w-8 h-8 opacity-30" /><p className="text-sm font-medium">No failed audits</p><p className="text-[10px]">Items that failed quality audit will appear here.</p></> :
                 activeTab === "needs_correction" ? <><AlertTriangle className="w-8 h-8 opacity-30" /><p className="text-sm font-medium">No items needing correction</p><p className="text-[10px]">Items requiring corrective action will appear here.</p></> :
                 activeTab === "high_severity_defects" ? <><AlertOctagon className="w-8 h-8 opacity-30" /><p className="text-sm font-medium">No high-severity defects</p><p className="text-[10px]">Items with Major or Critical defects will appear here.</p></> :
                 activeTab === "published_check" ? <><GitCompare className="w-8 h-8 opacity-30" /><p className="text-sm font-medium">No published checks</p><p className="text-[10px]">Items with published version mismatches will appear here.</p></> :
                 activeTab === "completed_audits" ? <><FileCheck className="w-8 h-8 opacity-30" /><p className="text-sm font-medium">No completed audits</p><p className="text-[10px]">Completed and archived audits will appear here.</p></> :
                 <><List className="w-8 h-8 opacity-30" /><p className="text-sm font-medium">No items found</p></>}
              </div>
            ) : (
              <div className="divide-y divide-[#1a1a1a]">
                {filteredItems.map(item => (
                  <button key={item.id} onClick={() => handleSelectItem(item)}
                    className={`w-full text-left p-3 hover:bg-white/[0.02] transition-colors ${
                      selectedItem?.id === item.id ? "bg-indigo-500/5 border-l-2 border-indigo-500" : "border-l-2 border-transparent"
                    }`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-[#ccc] line-clamp-1">{item.title}</p>
                        <p className="text-[10px] text-[#555] mt-0.5">{ITEM_TYPE_LABELS[item.item_type]} · {item.source_module}</p>
                      </div>
                      {item.quality_score !== null && (
                        <span className={`text-xs font-bold shrink-0 ${calculateScoreBand(item.quality_score).color}`}>
                          {item.quality_score}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      <StatusBadge status={item.audit_status} />
                      {item.highest_defect_severity && <SeverityBadge severity={item.highest_defect_severity} />}
                      {item.published_mismatch && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border text-rose-400 bg-rose-500/10 border-rose-500/20">Mismatch</span>
                      )}
                      {item.sampled && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border text-cyan-400 bg-cyan-500/10 border-cyan-500/20">Sampled</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1.5 text-[10px] text-[#555]">
                      {item.platform && <span>{item.platform}</span>}
                      {item.assigned_auditor && <span>· {item.assigned_auditor}</span>}
                      {item.audit_due_at && (
                        <span className={new Date(item.audit_due_at) < new Date() ? "text-rose-400 ml-auto" : "ml-auto"}>
                          Due {formatDate(item.audit_due_at)}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Center Panel — Workspace ──────────────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {!selectedItem ? (
            <div className="flex-1 flex flex-col items-center justify-center text-[#555] gap-3">
              <ShieldCheck className="w-10 h-10 opacity-30" />
              <p className="text-sm font-medium">Select an audit item</p>
              <p className="text-xs">Choose an item from the left panel to begin reviewing</p>
            </div>
          ) : lockedError ? (
            <div className="flex-1 flex flex-col items-center justify-center text-[#555] gap-3">
              <Lock className="w-10 h-10 opacity-30" />
              <p className="text-sm font-medium">Audit Locked</p>
              <p className="text-xs">{lockedError}</p>
            </div>
          ) : (
            <>
              {/* Audit Info Bar */}
              <div className="px-4 py-3 border-b border-[#1a1a1a] bg-[#0e0e0e] shrink-0">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="text-sm font-bold text-white">{selectedItem.title}</h2>
                    <p className="text-[11px] text-[#888] mt-0.5">
                      {ITEM_TYPE_LABELS[selectedItem.item_type]} · {selectedItem.source_module}
                      {selectedItem.campaign && ` · ${selectedItem.campaign}`}
                      {selectedItem.platform && ` · ${selectedItem.platform}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {selectedItem.quality_score !== null && (
                      <span className={`text-lg font-bold ${calculateScoreBand(selectedItem.quality_score).color}`}>
                        {selectedItem.quality_score}
                      </span>
                    )}
                    <StatusBadge status={selectedItem.audit_status} />
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-2 text-[10px] text-[#666]">
                  <span className="flex items-center gap-1"><User className="w-3 h-3" /> {selectedItem.assigned_auditor || "Unassigned"}</span>
                  {selectedItem.original_reviewer && <span>Reviewer: {selectedItem.original_reviewer}</span>}
                  {selectedItem.agent_name && <span>Agent: {selectedItem.agent_name}</span>}
                  {selectedItem.audit_due_at && (
                    <span className={new Date(selectedItem.audit_due_at) < new Date() ? "text-rose-400" : ""}>
                      Due: {formatDate(selectedItem.audit_due_at)}
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5 px-4 py-2 border-b border-[#1a1a1a] bg-[#0a0a0a] shrink-0 overflow-x-auto">
                {selectedItem.audit_status === "audit_pending" && (
                  <button onClick={() => handleAction("start")} disabled={actionLoading === "start"}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white rounded-lg text-[10px] font-medium flex items-center gap-1.5">
                    {actionLoading === "start" ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldCheck className="w-3 h-3" />}
                    Start Audit
                  </button>
                )}
                {selectedItem.audit_status === "in_audit" && (
                  <>
                    <button onClick={() => handleAction("pass", { scorecard })} disabled={!passEligible || actionLoading === "pass"}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-white rounded-lg text-[10px] font-medium flex items-center gap-1.5">
                      {actionLoading === "pass" ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                      Pass
                    </button>
                    <button onClick={() => handleAction("fail", { scorecard, reason: "quality_failure" })} disabled={actionLoading === "fail"}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 disabled:bg-rose-800 text-white rounded-lg text-[10px] font-medium flex items-center gap-1.5">
                      {actionLoading === "fail" ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
                      Fail
                    </button>
                    <button onClick={() => handleAction("needs-correction", { scorecard, reason: "quality_needs_correction" })} disabled={actionLoading === "needs-correction"}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:bg-amber-800 text-white rounded-lg text-[10px] font-medium flex items-center gap-1.5">
                      {actionLoading === "needs-correction" ? <Loader2 className="w-3 h-3 animate-spin" /> : <AlertTriangle className="w-3 h-3" />}
                      Needs Correction
                    </button>
                    <button onClick={() => handleAction("escalate", { reason: "escalation_required", severity: hasCriticalDefects ? "critical" : "major" })} disabled={actionLoading === "escalate"}
                      className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-800 text-white rounded-lg text-[10px] font-medium flex items-center gap-1.5">
                      {actionLoading === "escalate" ? <Loader2 className="w-3 h-3 animate-spin" /> : <ArrowRight className="w-3 h-3" />}
                      Escalate
                    </button>
                  </>
                )}
                <div className="w-px h-5 bg-[#2d2d2d] mx-1" />
                <button onClick={() => setShowDefectModal(true)}
                  className="px-3 py-1.5 bg-[#161616] border border-[#2d2d2d] text-[#aaa] hover:text-white rounded-lg text-[10px] font-medium flex items-center gap-1.5">
                  <Bug className="w-3 h-3" /> Defect
                </button>
                <button onClick={() => setShowCorrectiveModal(true)}
                  className="px-3 py-1.5 bg-[#161616] border border-[#2d2d2d] text-[#aaa] hover:text-white rounded-lg text-[10px] font-medium flex items-center gap-1.5">
                  <ClipboardList className="w-3 h-3" /> Corrective
                </button>
                <button onClick={() => setShowNoteModal(true)}
                  className="px-3 py-1.5 bg-[#161616] border border-[#2d2d2d] text-[#aaa] hover:text-white rounded-lg text-[10px] font-medium flex items-center gap-1.5">
                  <MessageSquare className="w-3 h-3" /> Note
                </button>
                {selectedItem.audit_status === "in_audit" && (
                  <button onClick={() => setShowOverrideModal(true)}
                    className="px-3 py-1.5 bg-[#161616] border border-[#2d2d2d] text-[#aaa] hover:text-white rounded-lg text-[10px] font-medium flex items-center gap-1.5">
                    <Edit3 className="w-3 h-3" /> Override Score
                  </button>
                )}
              </div>

              {/* Comparison Tabs */}
              <div className="flex items-center gap-1 px-4 py-2 border-b border-[#1a1a1a] overflow-x-auto shrink-0 bg-[#0a0a0a]">
                {COMPARISON_TABS.map(tab => (
                  <button key={tab.id} onClick={() => setComparisonTab(tab.id)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-medium transition-colors whitespace-nowrap ${
                      comparisonTab === tab.id ? "bg-indigo-500/15 text-indigo-300" : "text-[#555] hover:text-white"
                    }`}>
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Content Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Content Preview */}
                <div className="bg-[#111] border border-[#2d2d2d] rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3 pb-2 border-b border-[#2d2d2d]">
                    <FileText className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="text-[10px] font-bold text-[#666] uppercase tracking-wider">Content Preview</span>
                  </div>
                  <div className="text-xs text-[#888] leading-relaxed">
                    {comparisonTab === "ai_draft" && <p className="italic">AI draft content will be displayed with diff highlighting when available.</p>}
                    {comparisonTab === "human_edits" && <p className="italic">Human-edited version with changes highlighted for review.</p>}
                    {comparisonTab === "approved_version" && <p className="italic">Approved version content will appear here.</p>}
                    {comparisonTab === "published_version" && (
                      <>
                        {selectedItem.published_mismatch && (
                          <div className="flex items-center gap-2 p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-lg mb-3">
                            <GitCompare className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                            <span className="text-rose-300 text-[10px] font-medium">Published version differs from approved version</span>
                          </div>
                        )}
                        <p className="italic">Published or sent version will be displayed here for comparison.</p>
                      </>
                    )}
                    {comparisonTab === "validation_results" && <p className="italic">Validation results and rule checks will appear here.</p>}
                    {comparisonTab === "approval_history" && <p className="italic">Approval history log will appear here.</p>}
                    {comparisonTab === "audit_findings" && (
                      defects.length === 0
                        ? <p className="italic">No audit findings recorded yet.</p>
                        : <div className="space-y-2">{defects.map(d => (
                            <div key={d.id} className="p-3 bg-black/30 border border-[#2d2d2d] rounded-xl">
                              <div className="flex items-center gap-2 mb-1">
                                <SeverityBadge severity={d.defect_severity} />
                                <span className="text-[10px] text-[#888]">{DEFECT_CATEGORIES.find(c => c.value === d.defect_category)?.label}</span>
                              </div>
                              <p className="text-xs text-[#ccc]">{d.defect_description}</p>
                              {d.evidence_reference && <p className="text-[10px] text-[#555] mt-1">Evidence: {d.evidence_reference}</p>}
                            </div>
                          ))}</div>
                    )}
                    {comparisonTab === "evidence" && (
                      evidence.length === 0
                        ? <p className="italic">No evidence captured yet.</p>
                        : <div className="space-y-2">{evidence.map(e => (
                            <div key={e.id} className="flex items-center gap-2 p-2.5 bg-black/30 border border-[#2d2d2d] rounded-xl">
                              <FileText className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                              <div>
                                <p className="text-xs text-[#ccc]">{e.evidence_type}</p>
                                <p className="text-[10px] text-[#555]">{e.evidence_reference} · {formatDate(e.captured_at)}</p>
                              </div>
                            </div>
                          ))}</div>
                    )}
                    {comparisonTab === "corrective_actions" && (
                      correctiveActions.length === 0
                        ? <p className="italic">No corrective actions created yet.</p>
                        : <div className="space-y-2">{correctiveActions.map(ca => (
                            <div key={ca.id} className="p-3 bg-black/30 border border-[#2d2d2d] rounded-xl">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-bold text-[#ccc]">{ca.title}</span>
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                                  ca.status === "completed" || ca.status === "closed" ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" :
                                  ca.status === "overdue" ? "text-rose-400 bg-rose-500/10 border-rose-500/20" :
                                  ca.status === "escalated" ? "text-purple-400 bg-purple-500/10 border-purple-500/20" :
                                  ca.status === "in_progress" ? "text-blue-400 bg-blue-500/10 border-blue-500/20" :
                                  "text-amber-400 bg-amber-500/10 border-amber-500/20"
                                }`}>{ca.status.replace(/_/g, " ")}</span>
                              </div>
                              <p className="text-[11px] text-[#888]">{ca.required_action}</p>
                              <div className="flex items-center gap-3 mt-1.5 text-[10px] text-[#555]">
                                <span>Owner: {ca.owner}</span>
                                <span>Priority: {ca.priority}</span>
                                {ca.due_at && <span>Due: {formatDate(ca.due_at)}</span>}
                              </div>
                            </div>
                          ))}</div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── Right Panel — Quality Control Panel ───────────────────────── */}
        {showRight && (
          <div className="w-96 shrink-0 border-l border-[#1a1a1a] overflow-y-auto bg-[#0a0a0a]">
            {!selectedItem ? (
              <div className="flex flex-col items-center justify-center py-16 text-[#555] gap-3">
                <ShieldCheck className="w-8 h-8 opacity-30" />
                <p className="text-xs">Select an item to view controls</p>
              </div>
            ) : (
              <div className="divide-y divide-[#1a1a1a]">
                {/* Scorecard */}
                <div className="p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-3.5 h-3.5 text-indigo-400" />
                      <h3 className="text-[10px] font-bold text-white uppercase tracking-wider">Scorecard</h3>
                    </div>
                    {overallScore !== null && (
                      <div className={`text-sm font-bold ${scoreBand.color}`}>
                        {overallScore}<span className="text-[10px] text-[#555] ml-0.5">/100</span>
                      </div>
                    )}
                  </div>

                  {overallScore !== null && (
                    <div className={`px-2.5 py-1 rounded-lg text-center text-[10px] font-bold uppercase tracking-wider ${scoreBand.color} bg-black/40 border border-[#2d2d2d]`}>
                      {scoreBand.label}
                    </div>
                  )}

                  <div className="space-y-2.5">
                    {SCORECARD_CATEGORIES.map(cat => (
                      <div key={cat.key}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[9px] font-bold text-[#666] uppercase tracking-wider">{cat.label}</span>
                          <div className="flex items-center gap-0.5">
                            {[0, 1, 2, 3, 4, 5].map(val => (
                              <button key={val}
                                onClick={() => handleScoreChange(cat.key, scorecard[cat.key] === val ? -1 : val)}
                                className={`w-5 h-5 rounded text-[8px] font-bold transition-all ${
                                  scorecard[cat.key] === val
                                    ? val === 0 ? "bg-rose-500/30 text-rose-300 border border-rose-500/40"
                                      : val === 1 ? "bg-orange-500/30 text-orange-300 border border-orange-500/40"
                                      : val === 2 ? "bg-amber-500/30 text-amber-300 border border-amber-500/40"
                                      : val === 3 ? "bg-yellow-500/30 text-yellow-300 border border-yellow-500/40"
                                      : val === 4 ? "bg-lime-500/30 text-lime-300 border border-lime-500/40"
                                      : "bg-emerald-500/30 text-emerald-300 border border-emerald-500/40"
                                    : "bg-[#161616] text-[#555] border border-transparent hover:border-[#444]"
                                }`}
                                title={`${val}: ${scoreExplanations[val]}`}>
                                {val}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Eligibility info */}
                  {selectedItem.audit_status === "in_audit" && (
                    <div className="space-y-1 pt-2.5 border-t border-[#2d2d2d]">
                      {!isScorecardComplete && <p className="text-[9px] text-amber-400 font-medium">Scorecard incomplete — all categories must be scored</p>}
                      {hasMissingEvidence && <p className="text-[9px] text-rose-400 font-medium">Missing evidence — pass blocked</p>}
                      {pubConsistencyZero && <p className="text-[9px] text-rose-400 font-medium">Publication Consistency is 0 — pass blocked</p>}
                      {hasMajorOrCriticalDefects && <p className="text-[9px] text-rose-400 font-medium">Unresolved Major/Critical defects — pass blocked</p>}
                      {complianceLow && <p className="text-[9px] text-purple-400 font-medium">Low Compliance Readiness — escalation recommended</p>}
                      {sourceGroundingZero && <p className="text-[9px] text-orange-400 font-medium">Source Grounding is 0 — fail or Needs Correction recommended</p>}
                      {passEligible && <p className="text-[9px] text-emerald-400 font-medium">Pass eligible — all checks passed</p>}
                    </div>
                  )}
                </div>

                {/* Defect Log */}
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bug className="w-3.5 h-3.5 text-rose-400" />
                      <h3 className="text-[10px] font-bold text-white uppercase tracking-wider">Defect Log</h3>
                    </div>
                    <span className="text-[10px] text-[#555]">{defects.length}</span>
                  </div>
                  {defects.length === 0 ? (
                    <p className="text-[11px] text-[#555] italic text-center py-2">No defects logged.</p>
                  ) : (
                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                      {defects.map(d => (
                        <div key={d.id} className="p-2.5 bg-black/30 border border-[#2d2d2d] rounded-lg">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <SeverityBadge severity={d.defect_severity} />
                            <span className="text-[9px] text-[#666]">{DEFECT_CATEGORIES.find(c => c.value === d.defect_category)?.label}</span>
                          </div>
                          <p className="text-[11px] text-[#aaa]">{d.defect_description}</p>
                          {d.owner && <p className="text-[9px] text-[#555] mt-1">Owner: {d.owner}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Corrective Actions */}
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ClipboardList className="w-3.5 h-3.5 text-amber-400" />
                      <h3 className="text-[10px] font-bold text-white uppercase tracking-wider">Corrective Actions</h3>
                    </div>
                    <span className="text-[10px] text-[#555]">{correctiveActions.length}</span>
                  </div>
                  {correctiveActions.length === 0 ? (
                    <p className="text-[11px] text-[#555] italic text-center py-2">No corrective actions.</p>
                  ) : (
                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                      {correctiveActions.map(ca => (
                        <div key={ca.id} className="p-2.5 bg-black/30 border border-[#2d2d2d] rounded-lg">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-[11px] font-bold text-[#ccc]">{ca.title}</span>
                            <span className={`text-[9px] font-bold px-1 py-0.5 rounded border ${
                              ca.status === "completed" || ca.status === "closed" ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" :
                              ca.status === "overdue" ? "text-rose-400 bg-rose-500/10 border-rose-500/20" :
                              "text-amber-400 bg-amber-500/10 border-amber-500/20"
                            }`}>{ca.status.replace(/_/g, " ")}</span>
                          </div>
                          <p className="text-[10px] text-[#666]">Owner: {ca.owner} · {ca.priority}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Audit Notes */}
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                      <h3 className="text-[10px] font-bold text-white uppercase tracking-wider">Notes</h3>
                      <span className="px-1 py-0.5 rounded bg-amber-500/10 text-[8px] font-bold text-amber-400 uppercase">Internal</span>
                    </div>
                    <span className="text-[10px] text-[#555]">{notes.length}</span>
                  </div>
                  {notes.length === 0 ? (
                    <p className="text-[11px] text-[#555] italic text-center py-2">No notes added.</p>
                  ) : (
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {notes.map(n => (
                        <div key={n.id} className="p-2.5 bg-black/30 border border-[#2d2d2d] rounded-lg">
                          <p className="text-[11px] text-[#aaa]">{n.note_body}</p>
                          <p className="text-[9px] text-[#555] mt-1">{n.created_by} · {formatDate(n.created_at)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Evidence Trail */}
                <div className="p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Paperclip className="w-3.5 h-3.5 text-emerald-400" />
                    <h3 className="text-[10px] font-bold text-white uppercase tracking-wider">Evidence Trail</h3>
                    <span className="text-[10px] text-[#555]">{evidence.length}</span>
                  </div>
                  {evidence.length === 0 ? (
                    <p className="text-[11px] text-[#555] italic text-center py-2">No evidence captured.</p>
                  ) : (
                    <div className="space-y-1.5 max-h-32 overflow-y-auto">
                      {evidence.map(e => (
                        <div key={e.id} className="flex items-center gap-2 p-2 bg-black/30 border border-[#2d2d2d] rounded-lg">
                          <FileText className="w-3 h-3 text-indigo-400 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-[11px] text-[#aaa] truncate">{e.evidence_type}</p>
                            <p className="text-[9px] text-[#555]">{formatDate(e.captured_at)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Modals ──────────────────────────────────────────── */}

      {/* Create Defect Modal */}
      {showDefectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowDefectModal(false)}>
          <div className="bg-[#0a0a0a] border border-[#2d2d2d] rounded-2xl p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-bold text-white">Create Defect</h3>
              <button onClick={() => setShowDefectModal(false)} className="p-1 hover:bg-[#161616] rounded-lg text-[#888]">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3.5">
              <div>
                <label className="text-[10px] font-bold text-[#666] uppercase tracking-wider mb-1 block">Category</label>
                <select value={newDefect.defect_category} onChange={e => setNewDefect(prev => ({ ...prev, defect_category: e.target.value as DefectCategory }))}
                  className="w-full p-2.5 bg-[#111] border border-[#2d2d2d] rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500/40">
                  {DEFECT_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-[#666] uppercase tracking-wider mb-1 block">Severity</label>
                <div className="flex gap-1.5">
                  {(["minor", "moderate", "major", "critical"] as DefectSeverity[]).map(s => (
                    <button key={s} onClick={() => setNewDefect(prev => ({ ...prev, defect_severity: s }))}
                      className={`flex-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                        newDefect.defect_severity === s ? SEVERITY_COLORS[s] : "bg-[#161616] text-[#555] border border-transparent"
                      }`}>{s}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-[#666] uppercase tracking-wider mb-1 block">Description</label>
                <textarea value={newDefect.defect_description} onChange={e => setNewDefect(prev => ({ ...prev, defect_description: e.target.value }))}
                  rows={3} className="w-full p-2.5 bg-[#111] border border-[#2d2d2d] rounded-lg text-xs text-white placeholder:text-[#555] focus:outline-none focus:border-indigo-500/40 resize-none"
                  placeholder="Describe the defect..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-[#666] uppercase tracking-wider mb-1 block">Evidence Ref</label>
                  <input type="text" value={newDefect.evidence_reference} onChange={e => setNewDefect(prev => ({ ...prev, evidence_reference: e.target.value }))}
                    className="w-full p-2.5 bg-[#111] border border-[#2d2d2d] rounded-lg text-xs text-white placeholder:text-[#555] focus:outline-none focus:border-indigo-500/40" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[#666] uppercase tracking-wider mb-1 block">Responsible Source</label>
                  <input type="text" value={newDefect.responsible_source} onChange={e => setNewDefect(prev => ({ ...prev, responsible_source: e.target.value }))}
                    className="w-full p-2.5 bg-[#111] border border-[#2d2d2d] rounded-lg text-xs text-white placeholder:text-[#555] focus:outline-none focus:border-indigo-500/40" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-[#666] uppercase tracking-wider mb-1 block">Owner</label>
                  <input type="text" value={newDefect.owner} onChange={e => setNewDefect(prev => ({ ...prev, owner: e.target.value }))}
                    className="w-full p-2.5 bg-[#111] border border-[#2d2d2d] rounded-lg text-xs text-white placeholder:text-[#555] focus:outline-none focus:border-indigo-500/40" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[#666] uppercase tracking-wider mb-1 block">Due Date</label>
                  <input type="date" value={newDefect.due_at} onChange={e => setNewDefect(prev => ({ ...prev, due_at: e.target.value }))}
                    className="w-full p-2.5 bg-[#111] border border-[#2d2d2d] rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500/40" />
                </div>
              </div>
              <label className="flex items-center gap-2 text-xs text-[#aaa] cursor-pointer">
                <input type="checkbox" checked={newDefect.corrective_action_required ?? false}
                  onChange={e => setNewDefect(prev => ({ ...prev, corrective_action_required: e.target.checked }))}
                  className="rounded border-[#444] bg-[#111] text-indigo-600" />
                Corrective action required
              </label>
            </div>
            <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-[#2d2d2d]">
              <button onClick={() => setShowDefectModal(false)} className="px-4 py-2 bg-[#161616] hover:bg-[#1a1a1a] text-[#888] rounded-lg text-xs font-medium transition-colors">Cancel</button>
              <button onClick={handleCreateDefect} disabled={!newDefect.defect_description || actionLoading === "create-defect"}
                className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:bg-rose-800 text-white rounded-lg text-xs font-medium transition-colors">
                {actionLoading === "create-defect" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Bug className="w-3 h-3" />}
                Create Defect
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Corrective Action Modal */}
      {showCorrectiveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowCorrectiveModal(false)}>
          <div className="bg-[#0a0a0a] border border-[#2d2d2d] rounded-2xl p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-bold text-white">Create Corrective Action</h3>
              <button onClick={() => setShowCorrectiveModal(false)} className="p-1 hover:bg-[#161616] rounded-lg text-[#888]"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3.5">
              <div>
                <label className="text-[10px] font-bold text-[#666] uppercase tracking-wider mb-1 block">Title</label>
                <input type="text" value={newCorrective.title} onChange={e => setNewCorrective(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full p-2.5 bg-[#111] border border-[#2d2d2d] rounded-lg text-xs text-white placeholder:text-[#555] focus:outline-none focus:border-indigo-500/40" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-[#666] uppercase tracking-wider mb-1 block">Required Action</label>
                <textarea value={newCorrective.required_action} onChange={e => setNewCorrective(prev => ({ ...prev, required_action: e.target.value }))}
                  rows={3} className="w-full p-2.5 bg-[#111] border border-[#2d2d2d] rounded-lg text-xs text-white placeholder:text-[#555] focus:outline-none focus:border-indigo-500/40 resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-[#666] uppercase tracking-wider mb-1 block">Owner</label>
                  <input type="text" value={newCorrective.owner} onChange={e => setNewCorrective(prev => ({ ...prev, owner: e.target.value }))}
                    className="w-full p-2.5 bg-[#111] border border-[#2d2d2d] rounded-lg text-xs text-white placeholder:text-[#555] focus:outline-none focus:border-indigo-500/40" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[#666] uppercase tracking-wider mb-1 block">Priority</label>
                  <select value={newCorrective.priority} onChange={e => setNewCorrective(prev => ({ ...prev, priority: e.target.value }))}
                    className="w-full p-2.5 bg-[#111] border border-[#2d2d2d] rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500/40">
                    <option value="low">Low</option><option value="medium">Medium</option>
                    <option value="high">High</option><option value="critical">Critical</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-[#666] uppercase tracking-wider mb-1 block">Status</label>
                  <select value={newCorrective.status} onChange={e => setNewCorrective(prev => ({ ...prev, status: e.target.value as CorrectiveActionStatus }))}
                    className="w-full p-2.5 bg-[#111] border border-[#2d2d2d] rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500/40">
                    {CORRECTIVE_ACTION_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[#666] uppercase tracking-wider mb-1 block">Due Date</label>
                  <input type="date" value={newCorrective.due_at} onChange={e => setNewCorrective(prev => ({ ...prev, due_at: e.target.value }))}
                    className="w-full p-2.5 bg-[#111] border border-[#2d2d2d] rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500/40" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-[#2d2d2d]">
              <button onClick={() => setShowCorrectiveModal(false)} className="px-4 py-2 bg-[#161616] hover:bg-[#1a1a1a] text-[#888] rounded-lg text-xs font-medium">Cancel</button>
              <button onClick={handleCreateCorrective} disabled={!newCorrective.title || actionLoading === "create-corrective"}
                className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:bg-amber-800 text-white rounded-lg text-xs font-medium">
                {actionLoading === "create-corrective" ? <Loader2 className="w-3 h-3 animate-spin" /> : <ClipboardList className="w-3 h-3" />}
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Note Modal */}
      {showNoteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowNoteModal(false)}>
          <div className="bg-[#0a0a0a] border border-[#2d2d2d] rounded-2xl p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-bold text-white">Add Audit Note</h3>
              <button onClick={() => setShowNoteModal(false)} className="p-1 hover:bg-[#161616] rounded-lg text-[#888]"><X className="w-4 h-4" /></button>
            </div>
            <textarea value={noteText} onChange={e => setNoteText(e.target.value)}
              rows={4} className="w-full p-3 bg-[#111] border border-[#2d2d2d] rounded-lg text-xs text-white placeholder:text-[#555] focus:outline-none focus:border-indigo-500/40 resize-none"
              placeholder="Type your internal audit note..." />
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 mt-2.5 bg-amber-500/5 border border-amber-500/20 rounded-lg">
              <Lock className="w-3 h-3 text-amber-400" />
              <span className="text-[9px] text-amber-400 font-medium">Internal only — not visible to source module</span>
            </div>
            <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-[#2d2d2d]">
              <button onClick={() => setShowNoteModal(false)} className="px-4 py-2 bg-[#161616] hover:bg-[#1a1a1a] text-[#888] rounded-lg text-xs font-medium">Cancel</button>
              <button onClick={handleAddNote} disabled={!noteText.trim() || actionLoading === "add-note"}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white rounded-lg text-xs font-medium">
                {actionLoading === "add-note" ? <Loader2 className="w-3 h-3 animate-spin" /> : <MessageSquare className="w-3 h-3" />}
                Add Note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Score Override Modal */}
      {showOverrideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowOverrideModal(false)}>
          <div className="bg-[#0a0a0a] border border-[#2d2d2d] rounded-2xl p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-bold text-white">Score Override</h3>
              <button onClick={() => setShowOverrideModal(false)} className="p-1 hover:bg-[#161616] rounded-lg text-[#888]"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex items-center justify-center p-5 bg-[#111] border border-[#2d2d2d] rounded-xl mb-4">
              <div className="text-center">
                <div className={`text-3xl font-bold ${scoreBand.color}`}>{overallScore !== null ? overallScore : "--"}</div>
                <div className="text-[10px] font-bold text-[#555] uppercase tracking-wider mt-0.5">Current Score</div>
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold text-[#666] uppercase tracking-wider mb-1 block">Override Reason</label>
              <textarea value={overrideReason} onChange={e => setOverrideReason(e.target.value)}
                rows={3} className="w-full p-2.5 bg-[#111] border border-[#2d2d2d] rounded-lg text-xs text-white placeholder:text-[#555] focus:outline-none focus:border-indigo-500/40 resize-none"
                placeholder="Explain why the score is being overridden..." />
            </div>
            <div className="flex items-start gap-2 px-2.5 py-2 mt-3 bg-amber-500/5 border border-amber-500/20 rounded-lg">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
              <span className="text-[10px] text-amber-400">Score override will not remove defect history or bypass unresolved Major/Critical defects.</span>
            </div>
            <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-[#2d2d2d]">
              <button onClick={() => setShowOverrideModal(false)} className="px-4 py-2 bg-[#161616] hover:bg-[#1a1a1a] text-[#888] rounded-lg text-xs font-medium">Cancel</button>
              <button onClick={handleScoreOverride} disabled={!overrideReason.trim() || actionLoading === "override"}
                className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-800 text-white rounded-lg text-xs font-medium">
                {actionLoading === "override" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Edit3 className="w-3 h-3" />}
                Apply Override
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
