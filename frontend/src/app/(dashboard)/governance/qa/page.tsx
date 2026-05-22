"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ShieldCheck, Search, AlertTriangle, CheckCircle2,
  BarChart3, FileText, Send, Loader2, X,
  Activity, ChevronRight, ArrowRight, Eye, RefreshCcw,
  List, UserCheck, XCircle, AlertOctagon, Star,
  Clock, Filter, Download, Settings, Users, Plus,
  MessageSquare, Paperclip, Flag, RotateCcw, Lock,
  Calendar, User, Layers, GitCompare, FileCheck,
  ClipboardList, BookOpen, Bug, Target, Zap,
  ChevronDown, ChevronUp, MoreHorizontal, Trash2,
  Edit3, ExternalLink, History, Upload, Ban
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

function getAlertIcon(type: AlertType) {
  switch (type) {
    case "critical_defects": return AlertOctagon;
    case "published_mismatch": return GitCompare;
    case "overdue": return Clock;
    case "evidence_missing": return FileText;
  }
}

// ─── Sub-Components ──────────────────────────────────────────────────────────

function LoadingState({ message = "Loading quality audit data..." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-32 text-center">
      <Loader2 className="w-10 h-10 text-indigo-400 animate-spin mb-6" />
      <p className="text-lg text-slate-400 font-medium">{message}</p>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-32 text-center">
      <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center justify-center text-rose-400 mb-6">
        <AlertTriangle className="w-8 h-8" />
      </div>
      <h3 className="text-xl font-black text-white mb-2">Load Error</h3>
      <p className="text-slate-400 max-w-md mb-8">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all">
          <RotateCcw className="w-4 h-4" />
          Retry
        </button>
      )}
    </div>
  );
}

function EmptyState({ title, body, actionLabel, onAction }: { title: string; body: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 bg-slate-800/50 border border-slate-700/50 rounded-2xl flex items-center justify-center text-slate-600 mb-6">
        <Search className="w-8 h-8" />
      </div>
      <h3 className="text-xl font-black text-slate-300 mb-2">{title}</h3>
      <p className="text-slate-500 max-w-md mb-8">{body}</p>
      {actionLabel && onAction && (
        <button onClick={onAction} className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all">
          <Plus className="w-4 h-4" />
          {actionLabel}
        </button>
      )}
    </div>
  );
}

function PermissionDenied() {
  return (
    <div className="flex flex-col items-center justify-center py-32 text-center">
      <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center justify-center text-rose-400 mb-6">
        <Ban className="w-8 h-8" />
      </div>
      <h3 className="text-xl font-black text-white mb-2">Permission Denied</h3>
      <p className="text-slate-400 max-w-md">You do not have permission to audit this item.</p>
    </div>
  );
}

function LockedState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 bg-purple-500/10 border border-purple-500/20 rounded-2xl flex items-center justify-center text-purple-400 mb-6">
        <Lock className="w-8 h-8" />
      </div>
      <h3 className="text-xl font-black text-white mb-2">Audit Locked</h3>
      <p className="text-slate-400 max-w-md">{message}</p>
    </div>
  );
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
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showDefectModal, setShowDefectModal] = useState(false);
  const [showCorrectiveModal, setShowCorrectiveModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showAuditActions, setShowAuditActions] = useState(false);
  const [permissionError, setPermissionError] = useState(false);
  const [lockedError, setLockedError] = useState<string | null>(null);
  const [callbackFailed, setCallbackFailed] = useState(false);

  // Score override
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");

  // Scoring explanation text
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
    const q = searchQuery.toLowerCase();
    if (q && !item.title.toLowerCase().includes(q) && !item.campaign.toLowerCase().includes(q) && !item.platform.toLowerCase().includes(q) && !(item.assigned_auditor || "").toLowerCase().includes(q) && !(item.original_reviewer || "").toLowerCase().includes(q) && !(item.agent_name || "").toLowerCase().includes(q)) {
      return false;
    }
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

  const handleStartAudit = async () => {
    if (!selectedItem) return;
    setActionLoading("start");
    try {
      const res = await api.post(`/api/v1/quality-audit/items/${selectedItem.id}/start`, {});
      if (res.success) {
        setSelectedItem({ ...selectedItem, audit_status: "in_audit" });
        setItems(prev => prev.map(i => i.id === selectedItem.id ? { ...i, audit_status: "in_audit" } : i));
      }
    } catch (err: any) {
      if (err.message?.includes("callback")) setCallbackFailed(true);
    } finally {
      setActionLoading(null);
    }
  };

  const handlePassAudit = async () => {
    if (!selectedItem || !passEligible) return;
    setActionLoading("pass");
    try {
      const res = await api.post(`/api/v1/quality-audit/items/${selectedItem.id}/pass`, { scorecard });
      if (res.success) {
        setSelectedItem({ ...selectedItem, audit_status: "passed", quality_score: overallScore, score_band: scoreBand.band });
        setItems(prev => prev.map(i => i.id === selectedItem.id ? { ...i, audit_status: "passed", quality_score: overallScore, score_band: scoreBand.band } : i));
      }
    } catch (err: any) {
      if (err.message?.includes("callback")) setCallbackFailed(true);
    } finally {
      setActionLoading(null);
    }
  };

  const handleFailAudit = async () => {
    if (!selectedItem) return;
    setActionLoading("fail");
    try {
      const res = await api.post(`/api/v1/quality-audit/items/${selectedItem.id}/fail`, {
        scorecard, reason: "quality_failure",
      });
      if (res.success) {
        setSelectedItem({ ...selectedItem, audit_status: "failed", quality_score: overallScore, score_band: scoreBand.band });
        setItems(prev => prev.map(i => i.id === selectedItem.id ? { ...i, audit_status: "failed", quality_score: overallScore, score_band: scoreBand.band } : i));
      }
    } catch (err: any) {
      if (err.message?.includes("callback")) setCallbackFailed(true);
    } finally {
      setActionLoading(null);
    }
  };

  const handleNeedsCorrection = async () => {
    if (!selectedItem) return;
    setActionLoading("correction");
    try {
      const res = await api.post(`/api/v1/quality-audit/items/${selectedItem.id}/needs-correction`, {
        scorecard, reason: "quality_needs_correction",
      });
      if (res.success) {
        setSelectedItem({ ...selectedItem, audit_status: "needs_correction" });
        setItems(prev => prev.map(i => i.id === selectedItem.id ? { ...i, audit_status: "needs_correction" } : i));
      }
    } catch (err: any) {
      if (err.message?.includes("callback")) setCallbackFailed(true);
    } finally {
      setActionLoading(null);
    }
  };

  const handleEscalate = async () => {
    if (!selectedItem) return;
    setActionLoading("escalate");
    try {
      const res = await api.post(`/api/v1/quality-audit/items/${selectedItem.id}/escalate`, {
        reason: "escalation_required", severity: hasCriticalDefects ? "critical" : "major",
      });
      if (res.success) {
        setSelectedItem({ ...selectedItem, audit_status: "escalated" });
        setItems(prev => prev.map(i => i.id === selectedItem.id ? { ...i, audit_status: "escalated" } : i));
      }
    } catch (err: any) {
      // noop
    } finally {
      setActionLoading(null);
    }
  };

  const handleScoreOverride = async () => {
    if (!selectedItem || !overrideReason.trim()) return;
    setActionLoading("override");
    try {
      const res = await api.post(`/api/v1/quality-audit/items/${selectedItem.id}/score-override`, {
        overall_score: overallScore, reason: overrideReason,
      });
      if (res.success) {
        setShowOverrideModal(false);
        setOverrideReason("");
      }
    } catch {
      // noop
    } finally {
      setActionLoading(null);
    }
  };

  const handleAssignAuditor = async () => {
    if (!selectedItem) return;
    setActionLoading("assign");
    try {
      const res = await api.patch(`/api/v1/quality-audit/items/${selectedItem.id}/assign`, {
        auditor_id: "current_user",
      });
      if (res.success) {
        setSelectedItem({ ...selectedItem, assigned_auditor: "current_user" });
        setItems(prev => prev.map(i => i.id === selectedItem.id ? { ...i, assigned_auditor: "current_user" } : i));
      }
    } catch {
      // noop
    } finally {
      setActionLoading(null);
    }
  };

  const handleGenerateSample = async () => {
    setActionLoading("sample");
    try {
      const res = await api.post("/api/v1/quality-audit/sample", { count: 10 });
      if (res.success && res.data) {
        setItems(prev => [...res.data, ...prev]);
      }
    } catch {
      // noop
    } finally {
      setActionLoading(null);
    }
  };

  const handleExportFindings = async () => {
    setActionLoading("export");
    try {
      await api.post("/api/v1/quality-audit/export/findings", {
        item_ids: items.map(i => i.id),
      });
    } catch {
      // noop
    } finally {
      setActionLoading(null);
    }
  };

  const handleExportEvidence = async () => {
    setActionLoading("export-evidence");
    try {
      await api.post("/api/v1/quality-audit/export/evidence", {
        item_ids: selectedItem ? [selectedItem.id] : items.map(i => i.id),
      });
    } catch {
      // noop
    } finally {
      setActionLoading(null);
    }
  };

  const handleRetryCallback = async () => {
    if (!selectedItem) return;
    setActionLoading("retry");
    try {
      await api.post(`/api/v1/quality-audit/items/${selectedItem.id}/retry-callback`, {});
      setCallbackFailed(false);
    } catch {
      // noop
    } finally {
      setActionLoading(null);
    }
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
        setNewDefect({
          defect_category: "accuracy_issue",
          defect_severity: "minor",
          defect_description: "",
          evidence_reference: "",
          responsible_source: "",
          corrective_action_required: false,
          owner: "",
          due_at: "",
        });
      }
    } catch {
      // noop
    } finally {
      setActionLoading(null);
    }
  };

  const [newCorrective, setNewCorrective] = useState<Partial<CorrectiveAction>>({
    title: "",
    owner: "",
    priority: "medium",
    required_action: "",
    due_at: "",
    status: "open",
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
        setNewCorrective({
          title: "", owner: "", priority: "medium",
          required_action: "", due_at: "", status: "open",
        });
      }
    } catch {
      // noop
    } finally {
      setActionLoading(null);
    }
  };

  const [noteText, setNoteText] = useState("");

  const handleAddNote = async () => {
    if (!selectedItem || !noteText.trim()) return;
    setActionLoading("add-note");
    try {
      const res = await api.post(`/api/v1/quality-audit/items/${selectedItem.id}/notes`, {
        note_body: noteText, visibility: "internal",
      });
      if (res.success) {
        setNotes(prev => [...prev, res.data]);
        setNoteText("");
        setShowNoteModal(false);
      }
    } catch {
      // noop
    } finally {
      setActionLoading(null);
    }
  };

  // ─── Alerts ────────────────────────────────────────────────────────────────

  const alerts: { type: AlertType; label: string; active: boolean }[] = [
    { type: "critical_defects", label: "Critical Defects Found", active: (stats?.critical_defects || 0) > 0 },
    { type: "published_mismatch", label: "Published Mismatch Detected", active: (stats?.published_mismatches || 0) > 0 },
    { type: "overdue", label: "Corrective Actions Overdue", active: (stats?.overdue_actions || 0) > 0 },
    { type: "evidence_missing", label: "Evidence Missing", active: (stats?.missing_evidence || 0) > 0 },
  ];

  // ─── Render ────────────────────────────────────────────────────────────────

  if (loading) return <LoadingState />;

  if (permissionError) return <PermissionDenied />;

  if (error) return <ErrorState message={error} onRetry={fetchData} />;

  return (
    <div className="max-w-[1600px] mx-auto px-4 py-6 space-y-6 pb-32">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-[var(--card)] border border-[var(--border)] rounded-[2rem] p-8">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-indigo-600/5 blur-[120px] rounded-full -mr-40 -mt-40" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/5 border border-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-[0.3em]">
              <ShieldCheck className="w-4 h-4" />
              Accountability Layer
            </div>
            <h1 className="text-4xl font-black text-white tracking-tighter">
              Quality <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-indigo-600 italic">Audit</span>
            </h1>
            <p className="text-base text-slate-400 max-w-2xl">
              Audit content, replies, agent outputs, and workflow decisions for accuracy, brand quality,
              compliance readiness, review integrity, and publication consistency.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleStartAudit}
              disabled={!selectedItem || actionLoading === "start"}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-xl text-[11px] font-black uppercase tracking-widest transition-all active:scale-95"
            >
              {actionLoading === "start" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              Start Audit
            </button>
            <button
              onClick={handleGenerateSample}
              disabled={actionLoading === "sample"}
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all active:scale-95"
            >
              {actionLoading === "sample" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              Generate Sample
            </button>
            <button
              onClick={handleAssignAuditor}
              disabled={!selectedItem || actionLoading === "assign"}
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all active:scale-95"
            >
              {actionLoading === "assign" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
              Assign Auditor
            </button>
            <button
              onClick={handleExportFindings}
              disabled={actionLoading === "export"}
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all active:scale-95"
            >
              {actionLoading === "export" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Export Findings
            </button>
            <button
              onClick={handleExportEvidence}
              disabled={actionLoading === "export-evidence"}
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all active:scale-95"
            >
              {actionLoading === "export-evidence" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Export Evidence
            </button>
            <button className="flex items-center gap-2 px-5 py-2.5 bg-slate-800/50 border border-dashed border-slate-700 text-slate-400 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all active:scale-95">
              <Settings className="w-4 h-4" />
              Audit Settings
            </button>
          </div>
        </div>
      </div>

      {/* ── Metric Cards ───────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: "Audit Items", value: stats?.total_items ?? 0, icon: List, color: "text-indigo-400" },
          { label: "In Audit", value: stats?.in_audit ?? 0, icon: Activity, color: "text-blue-400" },
          { label: "Passed", value: stats?.passed ?? 0, icon: CheckCircle2, color: "text-emerald-400" },
          { label: "Failed", value: stats?.failed ?? 0, icon: XCircle, color: "text-rose-400" },
          { label: "Needs Correction", value: stats?.needs_correction ?? 0, icon: AlertTriangle, color: "text-amber-400" },
          { label: "Avg Quality Score", value: stats?.average_score ? `${Math.round(stats.average_score)}%` : "—", icon: Star, color: "text-purple-400" },
        ].map((metric, i) => (
          <div key={i} className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 flex items-center gap-4 group hover:border-indigo-500/30 transition-all">
            <div className={`p-3 rounded-xl bg-black/40 border border-[var(--border)] ${metric.color}`}>
              <metric.icon className="w-5 h-5" />
            </div>
            <div>
              <div className="text-2xl font-black text-white tracking-tighter">{metric.value}</div>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{metric.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Alert Strip ────────────────────────────────────── */}
      {alerts.some(a => a.active) && (
        <div className="flex flex-wrap gap-3">
          {alerts.filter(a => a.active).map((alert, i) => {
            const Icon = getAlertIcon(alert.type);
            return (
              <div key={i} className="flex items-center gap-2 px-4 py-2 bg-rose-500/5 border border-rose-500/20 rounded-xl">
                <Icon className="w-4 h-4 text-rose-400" />
                <span className="text-[11px] font-bold text-rose-400 uppercase tracking-widest">{alert.label}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Callback Failed Banner ─────────────────────────── */}
      {callbackFailed && (
        <div className="flex items-center justify-between px-6 py-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <span className="text-sm text-amber-300 font-medium">
              Audit outcome was saved, but the source module could not be updated. Retry callback.
            </span>
          </div>
          <button
            onClick={handleRetryCallback}
            disabled={actionLoading === "retry"}
            className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
          >
            {actionLoading === "retry" ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
            Retry
          </button>
        </div>
      )}

      {/* ── Main 3-Panel Layout ────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* ════ LEFT PANEL: Audit Item List ════════════════════ */}
        <div className="lg:col-span-3 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search items, campaigns, auditors..."
              className="w-full pl-11 pr-4 py-3 bg-[var(--card)] border border-[var(--border)] rounded-xl text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all"
            />
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-all ${showFilters ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <Filter className="w-4 h-4" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex flex-wrap gap-1">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                  activeTab === tab.id
                    ? "bg-indigo-600 text-white"
                    : "text-slate-500 hover:text-slate-300 bg-[var(--card)] border border-[var(--border)]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Item List */}
          <div className="space-y-2 max-h-[65vh] overflow-y-auto custom-scrollbar pr-1">
            {filteredItems.length === 0 ? (
              <EmptyState
                title="No Audit Items"
                body="Generate a sample or select items from completed workflows to begin quality auditing."
                actionLabel="Generate Sample"
                onAction={handleGenerateSample}
              />
            ) : (
              filteredItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => handleSelectItem(item)}
                  className={`w-full text-left bg-[var(--card)] border rounded-xl p-4 transition-all hover:border-indigo-500/40 ${
                    selectedItem?.id === item.id ? "border-indigo-500/60 ring-1 ring-indigo-500/20" : "border-[var(--border)]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-white truncate">{item.title}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{ITEM_TYPE_LABELS[item.item_type]} · {item.source_module}</div>
                    </div>
                    {item.quality_score !== null && (
                      <div className={`shrink-0 text-xs font-black ${calculateScoreBand(item.quality_score).color}`}>
                        {item.quality_score}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${STATUS_COLORS[item.audit_status]}`}>
                      {getStatusLabel(item.audit_status)}
                    </span>
                    {item.highest_defect_severity && (
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${SEVERITY_COLORS[item.highest_defect_severity]}`}>
                        {item.highest_defect_severity}
                      </span>
                    )}
                    {item.published_mismatch && (
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider text-rose-400 bg-rose-500/10 border border-rose-500/20">
                        Mismatch
                      </span>
                    )}
                    {item.sampled && (
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider text-cyan-400 bg-cyan-500/10 border border-cyan-500/20">
                        Sampled
                      </span>
                    )}
                    {item.evidence_missing && (
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/20">
                        Missing Evidence
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-600">
                    {item.campaign && <span>{item.campaign}</span>}
                    {item.platform && <span>· {item.platform}</span>}
                    {item.assigned_auditor && <span>· Auditor: {item.assigned_auditor}</span>}
                    {item.audit_due_at && (
                      <span className={`ml-auto ${new Date(item.audit_due_at) < new Date() ? 'text-rose-400' : ''}`}>
                        Due: {formatDate(item.audit_due_at)}
                      </span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* ════ CENTER PANEL: Audit Workspace ═════════════════ */}
        <div className="lg:col-span-5 space-y-4">
          {!selectedItem ? (
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-12">
              <EmptyState
                title="No Item Selected"
                body="Select an audit item from the left panel to begin reviewing."
              />
            </div>
          ) : lockedError ? (
            <LockedState message={lockedError} />
          ) : (
            <>
              {/* Audit Header Info */}
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="text-xl font-black text-white tracking-tight">{selectedItem.title}</h2>
                    <p className="text-sm text-slate-400 mt-1">
                      {ITEM_TYPE_LABELS[selectedItem.item_type]} · {selectedItem.source_module}
                      {selectedItem.campaign && ` · ${selectedItem.campaign}`}
                      {selectedItem.platform && ` · ${selectedItem.platform}`}
                    </p>
                  </div>
                  <div className={`shrink-0 text-2xl font-black ${selectedItem.quality_score !== null ? calculateScoreBand(selectedItem.quality_score).color : 'text-slate-500'}`}>
                    {selectedItem.quality_score !== null ? `${selectedItem.quality_score}` : "--"}
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 text-[11px] text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Flag className="w-3.5 h-3.5" />
                    Status: <span className="text-white font-bold">{getStatusLabel(selectedItem.audit_status)}</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" />
                    Auditor: <span className="text-white">{selectedItem.assigned_auditor || "Unassigned"}</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    Reviewer: <span className="text-white">{selectedItem.original_reviewer || "—"}</span>
                  </span>
                  {selectedItem.agent_name && (
                    <span className="flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5" />
                      Agent: <span className="text-white">{selectedItem.agent_name}</span>
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    Due: <span className={`${selectedItem.audit_due_at && new Date(selectedItem.audit_due_at) < new Date() ? 'text-rose-400' : 'text-white'}`}>
                      {formatDate(selectedItem.audit_due_at)}
                    </span>
                  </span>
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap gap-2 pt-2 border-t border-[var(--border)]">
                  {selectedItem.audit_status === "audit_pending" && (
                    <button onClick={handleStartAudit} disabled={actionLoading === "start"} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all active:scale-95">
                      {actionLoading === "start" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                      Start Audit
                    </button>
                  )}
                  {selectedItem.audit_status === "in_audit" && (
                    <>
                      <button onClick={handlePassAudit} disabled={!passEligible || actionLoading === "pass"} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all active:scale-95">
                        {actionLoading === "pass" ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                        Pass Audit
                      </button>
                      <button onClick={handleFailAudit} disabled={actionLoading === "fail"} className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:bg-slate-800 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all active:scale-95">
                        {actionLoading === "fail" ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                        Fail Audit
                      </button>
                      <button onClick={handleNeedsCorrection} disabled={actionLoading === "correction"} className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-800 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all active:scale-95">
                        {actionLoading === "correction" ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
                        Needs Correction
                      </button>
                      <button onClick={handleEscalate} disabled={actionLoading === "escalate"} className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all active:scale-95">
                        {actionLoading === "escalate" ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                        Escalate Audit
                      </button>
                    </>
                  )}
                  <button onClick={() => setShowDefectModal(true)} className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all active:scale-95">
                    <Bug className="w-4 h-4" />
                    Create Defect
                  </button>
                  <button onClick={() => setShowCorrectiveModal(true)} className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all active:scale-95">
                    <ClipboardList className="w-4 h-4" />
                    Create Corrective Action
                  </button>
                  <button onClick={() => setShowNoteModal(true)} className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all active:scale-95">
                    <MessageSquare className="w-4 h-4" />
                    Add Note
                  </button>
                </div>
              </div>

              {/* Content Preview */}
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 min-h-[200px]">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[var(--border)]">
                  <FileText className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Content Preview</span>
                </div>
                <div className="text-sm text-slate-300 leading-relaxed">
                  <p className="italic text-slate-500">
                    Content preview for &quot;{selectedItem.title}&quot; will display here based on item type.
                    {selectedItem.item_type === "social_post" && " View AI draft, human edits, approved version, and published version below."}
                    {selectedItem.item_type === "inbox_reply" && " View original message, conversation context, AI draft, and sent reply."}
                    {selectedItem.item_type === "campaign_asset" && " View campaign objective, audience, asset copy, CTA, and approved version."}
                  </p>
                </div>
              </div>

              {/* Comparison Tabs */}
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden">
                <div className="flex overflow-x-auto border-b border-[var(--border)]">
                  {COMPARISON_TABS.map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setComparisonTab(tab.id)}
                      className={`shrink-0 px-4 py-3 text-[10px] font-bold uppercase tracking-widest transition-all border-b-2 ${
                        comparisonTab === tab.id
                          ? "text-indigo-400 border-indigo-500 bg-indigo-500/5"
                          : "text-slate-500 border-transparent hover:text-slate-300"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="p-6 min-h-[200px]">
                  {comparisonTab === "ai_draft" && (
                    <div className="text-sm text-slate-300">
                      <p className="text-slate-500 italic">AI draft content will be displayed with diff highlighting when available.</p>
                    </div>
                  )}
                  {comparisonTab === "human_edits" && (
                    <div className="text-sm text-slate-300">
                      <p className="text-slate-500 italic">Human-edited version with changes highlighted for review.</p>
                    </div>
                  )}
                  {comparisonTab === "approved_version" && (
                    <div className="text-sm text-slate-300">
                      <p className="text-slate-500 italic">Approved version content will appear here.</p>
                    </div>
                  )}
                  {comparisonTab === "published_version" && (
                    <div className="text-sm text-slate-300">
                      {selectedItem.published_mismatch ? (
                        <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl mb-4">
                          <GitCompare className="w-4 h-4 text-rose-400" />
                          <span className="text-rose-300 text-xs font-bold">Published version differs from approved version</span>
                        </div>
                      ) : null}
                      <p className="text-slate-500 italic">Published or sent version will be displayed here for comparison.</p>
                    </div>
                  )}
                  {comparisonTab === "validation_results" && (
                    <div className="text-sm text-slate-300">
                      <p className="text-slate-500 italic">Validation results and rule checks will appear here.</p>
                    </div>
                  )}
                  {comparisonTab === "approval_history" && (
                    <div className="text-sm text-slate-300">
                      <p className="text-slate-500 italic">Approval history log will appear here.</p>
                    </div>
                  )}
                  {comparisonTab === "audit_findings" && (
                    <div className="text-sm text-slate-300 space-y-3">
                      {defects.length === 0 ? (
                        <p className="text-slate-500 italic">No audit findings recorded yet.</p>
                      ) : (
                        defects.map(d => (
                          <div key={d.id} className="p-4 bg-slate-900/50 border border-[var(--border)] rounded-xl">
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${SEVERITY_COLORS[d.defect_severity]}`}>{d.defect_severity}</span>
                              <span className="text-xs text-slate-400">{DEFECT_CATEGORIES.find(c => c.value === d.defect_category)?.label}</span>
                            </div>
                            <p className="text-sm text-white">{d.defect_description}</p>
                            {d.evidence_reference && <p className="text-[10px] text-slate-500 mt-1">Evidence: {d.evidence_reference}</p>}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                  {comparisonTab === "evidence" && (
                    <div className="text-sm text-slate-300 space-y-3">
                      {evidence.length === 0 ? (
                        <p className="text-slate-500 italic">No evidence captured yet.</p>
                      ) : (
                        evidence.map(e => (
                          <div key={e.id} className="flex items-center gap-3 p-3 bg-slate-900/50 border border-[var(--border)] rounded-xl">
                            <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
                            <div>
                              <p className="text-sm text-white">{e.evidence_type}</p>
                              <p className="text-[10px] text-slate-500">{e.evidence_reference} · {formatDate(e.captured_at)}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                  {comparisonTab === "corrective_actions" && (
                    <div className="text-sm text-slate-300 space-y-3">
                      {correctiveActions.length === 0 ? (
                        <p className="text-slate-500 italic">No corrective actions created yet.</p>
                      ) : (
                        correctiveActions.map(ca => (
                          <div key={ca.id} className="p-4 bg-slate-900/50 border border-[var(--border)] rounded-xl">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-bold text-white">{ca.title}</span>
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                                ca.status === "completed" || ca.status === "closed" ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20" :
                                ca.status === "overdue" ? "text-rose-400 bg-rose-500/10 border border-rose-500/20" :
                                ca.status === "escalated" ? "text-purple-400 bg-purple-500/10 border border-purple-500/20" :
                                ca.status === "in_progress" ? "text-blue-400 bg-blue-500/10 border border-blue-500/20" :
                                "text-amber-400 bg-amber-500/10 border border-amber-500/20"
                              }`}>{ca.status.replace(/_/g, " ")}</span>
                            </div>
                            <p className="text-xs text-slate-400">{ca.required_action}</p>
                            <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-500">
                              <span>Owner: {ca.owner}</span>
                              <span>Priority: {ca.priority}</span>
                              {ca.due_at && <span>Due: {formatDate(ca.due_at)}</span>}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* ════ RIGHT PANEL: Quality Control Panel ════════════ */}
        <div className="lg:col-span-4 space-y-4">
          {!selectedItem ? (
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-12">
              <div className="flex flex-col items-center justify-center text-center py-12">
                <div className="w-12 h-12 bg-slate-800/50 rounded-xl flex items-center justify-center text-slate-600 mb-4">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <p className="text-sm text-slate-500">Select an audit item to view the quality control panel.</p>
              </div>
            </div>
          ) : (
            <>
              {/* Scorecard */}
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-indigo-400" />
                    <h3 className="text-xs font-black text-white uppercase tracking-widest">Scorecard</h3>
                  </div>
                  {overallScore !== null && (
                    <div className={`text-lg font-black ${scoreBand.color}`}>
                      {overallScore}
                      <span className="text-[10px] text-slate-500 font-bold ml-1">/ 100</span>
                    </div>
                  )}
                </div>

                {/* Score Band Label */}
                {overallScore !== null && (
                  <div className={`px-3 py-1.5 rounded-lg text-center text-[10px] font-black uppercase tracking-wider ${scoreBand.color} bg-black/40 border border-[var(--border)]`}>
                    {scoreBand.label}
                  </div>
                )}

                <div className="space-y-3">
                  {SCORECARD_CATEGORIES.map(cat => (
                    <div key={cat.key}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{cat.label}</span>
                        <div className="flex items-center gap-1">
                          {[0, 1, 2, 3, 4, 5].map(val => (
                            <button
                              key={val}
                              onClick={() => handleScoreChange(cat.key, scorecard[cat.key] === val ? -1 : val)}
                              className={`w-6 h-6 rounded-md text-[9px] font-bold transition-all ${
                                scorecard[cat.key] === val
                                  ? val === 0 ? "bg-rose-500/30 text-rose-300 border border-rose-500/40"
                                    : val === 1 ? "bg-orange-500/30 text-orange-300 border border-orange-500/40"
                                    : val === 2 ? "bg-amber-500/30 text-amber-300 border border-amber-500/40"
                                    : val === 3 ? "bg-yellow-500/30 text-yellow-300 border border-yellow-500/40"
                                    : val === 4 ? "bg-lime-500/30 text-lime-300 border border-lime-500/40"
                                    : "bg-emerald-500/30 text-emerald-300 border border-emerald-500/40"
                                  : "bg-slate-800/50 text-slate-600 border border-transparent hover:border-slate-600"
                              }`}
                              title={`${val}: ${scoreExplanations[val]}`}
                            >
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
                  <div className="space-y-1.5 pt-3 border-t border-[var(--border)]">
                    {!isScorecardComplete && <p className="text-[10px] text-amber-400 font-bold">Scorecard incomplete — all categories must be scored</p>}
                    {hasMissingEvidence && <p className="text-[10px] text-rose-400 font-bold">Missing evidence — pass blocked</p>}
                    {pubConsistencyZero && <p className="text-[10px] text-rose-400 font-bold">Publication Consistency is 0 — pass blocked</p>}
                    {hasMajorOrCriticalDefects && <p className="text-[10px] text-rose-400 font-bold">Unresolved Major/Critical defects — pass blocked</p>}
                    {complianceLow && <p className="text-[10px] text-purple-400 font-bold">Low Compliance Readiness — escalation recommended</p>}
                    {sourceGroundingZero && <p className="text-[10px] text-orange-400 font-bold">Source Grounding is 0 — fail or Needs Correction recommended</p>}
                    {passEligible && <p className="text-[10px] text-emerald-400 font-bold">Pass eligible — all checks passed</p>}
                  </div>
                )}

                {/* Score Override */}
                {selectedItem.audit_status === "in_audit" && (
                  <button
                    onClick={() => setShowOverrideModal(true)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-800/50 border border-dashed border-slate-700 hover:border-indigo-500/40 text-slate-400 hover:text-indigo-400 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Score Override
                  </button>
                )}
              </div>

              {/* Defect Log */}
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bug className="w-4 h-4 text-rose-400" />
                    <h3 className="text-xs font-black text-white uppercase tracking-widest">Defect Log</h3>
                  </div>
                  <span className="text-xs font-bold text-slate-500">{defects.length}</span>
                </div>

                {defects.length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-4 text-center">No defects logged.</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                    {defects.map(d => (
                      <div key={d.id} className="p-3 bg-black/30 border border-[var(--border)] rounded-xl">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase ${SEVERITY_COLORS[d.defect_severity]}`}>{d.defect_severity}</span>
                          <span className="text-[9px] text-slate-500">{DEFECT_CATEGORIES.find(c => c.value === d.defect_category)?.label}</span>
                        </div>
                        <p className="text-xs text-white">{d.defect_description}</p>
                        <div className="flex items-center gap-2 mt-1 text-[9px] text-slate-500">
                          <span>{d.owner}</span>
                          {d.due_at && <span>· Due: {formatDate(d.due_at)}</span>}
                          {d.resolved_at && <span className="text-emerald-400">· Resolved</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Corrective Actions */}
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ClipboardList className="w-4 h-4 text-amber-400" />
                    <h3 className="text-xs font-black text-white uppercase tracking-widest">Corrective Actions</h3>
                  </div>
                  <span className="text-xs font-bold text-slate-500">{correctiveActions.length}</span>
                </div>

                {correctiveActions.length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-4 text-center">No corrective actions created.</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                    {correctiveActions.map(ca => (
                      <div key={ca.id} className="p-3 bg-black/30 border border-[var(--border)] rounded-xl">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-white">{ca.title}</span>
                          <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase ${
                            ca.status === "completed" || ca.status === "closed" ? "text-emerald-400 bg-emerald-500/10" :
                            ca.status === "overdue" ? "text-rose-400 bg-rose-500/10" : "text-amber-400 bg-amber-500/10"
                          }`}>{ca.status.replace(/_/g, " ")}</span>
                        </div>
                        <p className="text-[10px] text-slate-400">Owner: {ca.owner} · Priority: {ca.priority}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Audit Notes */}
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-indigo-400" />
                    <h3 className="text-xs font-black text-white uppercase tracking-widest">Audit Notes</h3>
                    <span className="px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-[8px] font-bold text-amber-400 uppercase tracking-wider">Internal</span>
                  </div>
                  <span className="text-xs font-bold text-slate-500">{notes.length}</span>
                </div>

                {notes.length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-4 text-center">No notes added.</p>
                ) : (
                  <div className="space-y-3 max-h-48 overflow-y-auto custom-scrollbar">
                    {notes.map(n => (
                      <div key={n.id} className="p-3 bg-black/30 border border-[var(--border)] rounded-xl">
                        <p className="text-xs text-slate-200">{n.note_body}</p>
                        <div className="flex items-center gap-2 mt-1.5 text-[9px] text-slate-500">
                          <span>{n.created_by}</span>
                          <span>· {formatDate(n.created_at)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Evidence Trail */}
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <Paperclip className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-xs font-black text-white uppercase tracking-widest">Evidence Trail</h3>
                  <span className="text-xs font-bold text-slate-500">{evidence.length}</span>
                </div>

                {evidence.length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-4 text-center">No evidence captured.</p>
                ) : (
                  <div className="space-y-2 max-h-36 overflow-y-auto custom-scrollbar">
                    {evidence.map(e => (
                      <div key={e.id} className="flex items-center gap-2 p-2 bg-black/30 border border-[var(--border)] rounded-lg">
                        <FileText className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-[11px] text-white truncate">{e.evidence_type}</p>
                          <p className="text-[9px] text-slate-500">{formatDate(e.captured_at)}</p>
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

      {/* ── Modals ──────────────────────────────────────────── */}

      {/* Create Defect Modal */}
      {showDefectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowDefectModal(false)}>
          <div className="bg-[#0a0a0a] border border-[var(--border)] rounded-2xl p-8 w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-black text-white uppercase tracking-tight">Create Defect</h3>
              <button onClick={() => setShowDefectModal(false)} className="p-1 hover:bg-slate-800 rounded-lg text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Category</label>
                <select
                  value={newDefect.defect_category}
                  onChange={e => setNewDefect(prev => ({ ...prev, defect_category: e.target.value as DefectCategory }))}
                  className="w-full p-3 bg-black border border-[var(--border)] rounded-xl text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                >
                  {DEFECT_CATEGORIES.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Severity</label>
                <div className="flex gap-2">
                  {(["minor", "moderate", "major", "critical"] as DefectSeverity[]).map(s => (
                    <button
                      key={s}
                      onClick={() => setNewDefect(prev => ({ ...prev, defect_severity: s }))}
                      className={`flex-1 px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all ${
                        newDefect.defect_severity === s ? SEVERITY_COLORS[s] : "bg-slate-800 text-slate-500 border border-transparent"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Description</label>
                <textarea
                  value={newDefect.defect_description}
                  onChange={e => setNewDefect(prev => ({ ...prev, defect_description: e.target.value }))}
                  rows={3}
                  className="w-full p-3 bg-black border border-[var(--border)] rounded-xl text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 resize-none"
                  placeholder="Describe the defect..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Evidence Reference</label>
                  <input
                    type="text"
                    value={newDefect.evidence_reference}
                    onChange={e => setNewDefect(prev => ({ ...prev, evidence_reference: e.target.value }))}
                    className="w-full p-3 bg-black border border-[var(--border)] rounded-xl text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                    placeholder="e.g. EVID-001"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Responsible Source</label>
                  <input
                    type="text"
                    value={newDefect.responsible_source}
                    onChange={e => setNewDefect(prev => ({ ...prev, responsible_source: e.target.value }))}
                    className="w-full p-3 bg-black border border-[var(--border)] rounded-xl text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Owner</label>
                  <input
                    type="text"
                    value={newDefect.owner}
                    onChange={e => setNewDefect(prev => ({ ...prev, owner: e.target.value }))}
                    className="w-full p-3 bg-black border border-[var(--border)] rounded-xl text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Due Date</label>
                  <input
                    type="date"
                    value={newDefect.due_at}
                    onChange={e => setNewDefect(prev => ({ ...prev, due_at: e.target.value }))}
                    className="w-full p-3 bg-black border border-[var(--border)] rounded-xl text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newDefect.corrective_action_required ?? false}
                  onChange={e => setNewDefect(prev => ({ ...prev, corrective_action_required: e.target.checked }))}
                  className="rounded border-slate-700 bg-black text-indigo-600"
                />
                Corrective action required
              </label>
            </div>

            <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-[var(--border)]">
              <button onClick={() => setShowDefectModal(false)} className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-black uppercase tracking-widest transition-all">
                Cancel
              </button>
              <button
                onClick={handleCreateDefect}
                disabled={!newDefect.defect_description || actionLoading === "create-defect"}
                className="flex items-center gap-2 px-6 py-3 bg-rose-600 hover:bg-rose-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all"
              >
                {actionLoading === "create-defect" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bug className="w-4 h-4" />}
                Create Defect
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Corrective Action Modal */}
      {showCorrectiveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowCorrectiveModal(false)}>
          <div className="bg-[#0a0a0a] border border-[var(--border)] rounded-2xl p-8 w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-black text-white uppercase tracking-tight">Create Corrective Action</h3>
              <button onClick={() => setShowCorrectiveModal(false)} className="p-1 hover:bg-slate-800 rounded-lg text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Title</label>
                <input
                  type="text"
                  value={newCorrective.title}
                  onChange={e => setNewCorrective(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full p-3 bg-black border border-[var(--border)] rounded-xl text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                  placeholder="Corrective action title"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Required Action</label>
                <textarea
                  value={newCorrective.required_action}
                  onChange={e => setNewCorrective(prev => ({ ...prev, required_action: e.target.value }))}
                  rows={3}
                  className="w-full p-3 bg-black border border-[var(--border)] rounded-xl text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 resize-none"
                  placeholder="Describe the required action..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Owner</label>
                  <input
                    type="text"
                    value={newCorrective.owner}
                    onChange={e => setNewCorrective(prev => ({ ...prev, owner: e.target.value }))}
                    className="w-full p-3 bg-black border border-[var(--border)] rounded-xl text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Priority</label>
                  <select
                    value={newCorrective.priority}
                    onChange={e => setNewCorrective(prev => ({ ...prev, priority: e.target.value }))}
                    className="w-full p-3 bg-black border border-[var(--border)] rounded-xl text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Status</label>
                  <select
                    value={newCorrective.status}
                    onChange={e => setNewCorrective(prev => ({ ...prev, status: e.target.value as CorrectiveActionStatus }))}
                    className="w-full p-3 bg-black border border-[var(--border)] rounded-xl text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                  >
                    {CORRECTIVE_ACTION_STATUSES.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Due Date</label>
                  <input
                    type="date"
                    value={newCorrective.due_at}
                    onChange={e => setNewCorrective(prev => ({ ...prev, due_at: e.target.value }))}
                    className="w-full p-3 bg-black border border-[var(--border)] rounded-xl text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-[var(--border)]">
              <button onClick={() => setShowCorrectiveModal(false)} className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-black uppercase tracking-widest transition-all">
                Cancel
              </button>
              <button
                onClick={handleCreateCorrective}
                disabled={!newCorrective.title || actionLoading === "create-corrective"}
                className="flex items-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all"
              >
                {actionLoading === "create-corrective" ? <Loader2 className="w-4 h-4 animate-spin" /> : <ClipboardList className="w-4 h-4" />}
                Create Corrective Action
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Note Modal */}
      {showNoteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowNoteModal(false)}>
          <div className="bg-[#0a0a0a] border border-[var(--border)] rounded-2xl p-8 w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-black text-white uppercase tracking-tight">Add Audit Note</h3>
              <button onClick={() => setShowNoteModal(false)} className="p-1 hover:bg-slate-800 rounded-lg text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <textarea
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              rows={5}
              className="w-full p-4 bg-black border border-[var(--border)] rounded-xl text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 resize-none"
              placeholder="Type your internal audit note..."
            />

            <div className="flex items-center gap-2 px-3 py-2 mt-3 bg-amber-500/5 border border-amber-500/20 rounded-lg">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">Internal only — not visible to source module</span>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-[var(--border)]">
              <button onClick={() => setShowNoteModal(false)} className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-black uppercase tracking-widest transition-all">
                Cancel
              </button>
              <button
                onClick={handleAddNote}
                disabled={!noteText.trim() || actionLoading === "add-note"}
                className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all"
              >
                {actionLoading === "add-note" ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
                Add Note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Score Override Modal */}
      {showOverrideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowOverrideModal(false)}>
          <div className="bg-[#0a0a0a] border border-[var(--border)] rounded-2xl p-8 w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-black text-white uppercase tracking-tight">Score Override</h3>
              <button onClick={() => setShowOverrideModal(false)} className="p-1 hover:bg-slate-800 rounded-lg text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-center p-6 bg-black/40 border border-[var(--border)] rounded-xl">
                <div>
                  <div className={`text-4xl font-black text-center ${scoreBand.color}`}>{overallScore !== null ? overallScore : "--"}</div>
                  <div className="text-[10px] font-bold text-slate-500 text-center uppercase tracking-wider mt-1">Current Score</div>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Override Reason</label>
                <textarea
                  value={overrideReason}
                  onChange={e => setOverrideReason(e.target.value)}
                  rows={3}
                  className="w-full p-3 bg-black border border-[var(--border)] rounded-xl text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 resize-none"
                  placeholder="Explain why the score is being overridden..."
                />
              </div>

              <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/5 border border-amber-500/20 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="text-[10px] text-amber-400 font-bold">
                  Score override will not remove defect history or bypass unresolved Major/Critical defects.
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-[var(--border)]">
              <button onClick={() => setShowOverrideModal(false)} className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-black uppercase tracking-widest transition-all">
                Cancel
              </button>
              <button
                onClick={handleScoreOverride}
                disabled={!overrideReason.trim() || actionLoading === "override"}
                className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all"
              >
                {actionLoading === "override" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Edit3 className="w-4 h-4" />}
                Apply Override
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Play icon used in start audit buttons (not in lucide exports by default, using a custom one)
function Play({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}
