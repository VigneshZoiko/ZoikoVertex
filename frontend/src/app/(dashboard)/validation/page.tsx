"use client";

import { useState, useEffect, useCallback } from "react";
import {
  RefreshCcw, ShieldCheck, AlertCircle, Clock, FileCheck2, AlertTriangle,
  ArrowUpRight, MessageSquare, XCircle, CheckCircle2, Ban, Gavel, Search,
  Filter, BarChart2, UserCheck, UserPlus, Flag, Info, Download, ExternalLink,
  Eye, History, Pen, Send, MoreHorizontal, Play, User, Calendar,
  Sparkles, Zap, StopCircle, ClipboardList, RotateCcw, ShieldAlert,
  Layers, BookOpen, Scale, List, ChevronDown, ChevronUp, Plus,
  Check, X, FileText, HelpCircle, ArrowLeft, ArrowRight, Settings,
} from "lucide-react";
import { api } from "@/lib/api";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface ValidationItem {
  id: string;
  tenant_id: string;
  source_module: string;
  source_entity_id: string;
  item_type: string;
  title: string;
  campaign_id?: string;
  campaign?: string;
  platform?: string;
  platform_channel?: string;
  content_snapshot: Record<string, unknown>;
  content_snapshot_version?: string;
  validation_status: string;
  highest_severity: string;
  failed_rule_count: number;
  warning_count: number;
  blocked_rule_count: number;
  manual_check_count: number;
  source_grounding_status: string;
  platform_readiness_status: string;
  approval_readiness_status: string;
  assigned_validator?: string;
  submitted_by: string;
  risk_level: string;
  validation_score?: number;
  due_at?: string;
  submitted_at: string;
  validated_at?: string;
  completed_at?: string;
  archived_at?: string;
  created_at: string;
  updated_at: string;
}

interface ValidationStats {
  pending_validation: number;
  passed: number;
  warnings: number;
  failed: number;
  blocked: number;
  escalation_required: number;
  total: number;
}

interface RuleResult {
  id: string;
  validation_run_id: string;
  rule_id: string;
  rule_name: string;
  rule_category: string;
  rule_version: string;
  rule_set_version: string;
  result: string;
  severity: string;
  explanation: string;
  affected_text?: string;
  recommended_fix?: string;
  override_eligible: boolean;
  manual_check_required: boolean;
  created_at: string;
}

interface ValidationRun {
  id: string;
  validation_item_id: string;
  rule_set_id: string;
  rule_set_version: string;
  validation_engine_version: string;
  content_snapshot_version: string;
  run_status: string;
  started_at: string;
  completed_at?: string;
  run_by?: string;
  result_summary?: string;
}

interface SourceGroundingResult {
  id: string;
  validation_run_id: string;
  claim_text: string;
  source_reference?: string;
  source_status?: string;
  source_confidence?: number;
  grounding_status: string;
  issue_summary?: string;
  created_at: string;
}

interface ValidationOverride {
  id: string;
  validation_item_id: string;
  validation_rule_result_id: string;
  override_reason: string;
  risk_acknowledgement: boolean;
  overridden_by: string;
  overridden_at: string;
}

interface ManualCheck {
  id: string;
  validation_item_id: string;
  validation_rule_result_id?: string;
  assigned_validator?: string;
  manual_check_result: string;
  note?: string;
  completed_by?: string;
  completed_at?: string;
  created_at: string;
}

interface ValidatorNote {
  id: string;
  validation_item_id: string;
  note_body: string;
  visibility: string;
  created_by: string;
  created_at: string;
  replies?: ValidatorNote[];
}

interface TimelineEntry {
  id: string;
  action: string;
  previous_value?: string;
  new_value?: string;
  performed_by: string;
  performed_at: string;
}

interface ApprovalReadiness {
  status: string;
  rule_matched?: string;
  required_level?: string;
  required_reviewer_role?: string;
  next_destination?: string;
}

// ─── Config Maps ───────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  PENDING_VALIDATION:   { label: "Pending Validation",   color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  IN_VALIDATION:        { label: "In Validation",         color: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" },
  PASSED:               { label: "Passed",                color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  WARNING:              { label: "Warning",               color: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  FAILED:               { label: "Failed",                color: "bg-orange-500/10 text-orange-400 border-orange-500/20" },
  BLOCKED:              { label: "Blocked",               color: "bg-red-600/10 text-red-500 border-red-600/20" },
  NEEDS_REVISION:       { label: "Needs Revision",        color: "bg-orange-500/10 text-orange-400 border-orange-500/20" },
  MANUAL_CHECK_REQUIRED:{ label: "Manual Check Required", color: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
  ESCALATION_REQUIRED:  { label: "Escalation Required",   color: "bg-red-500/10 text-red-400 border-red-500/20" },
  OVERRIDE_ELIGIBLE:    { label: "Override Eligible",     color: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  PASSED_WITH_OVERRIDE: { label: "Passed with Override",  color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  OVERRIDE_PROHIBITED:  { label: "Override Prohibited",   color: "bg-red-500/10 text-red-400 border-red-500/20" },
  REVALIDATION_NEEDED:  { label: "Revalidation Needed",   color: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  COMPLETED:            { label: "Completed",             color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  ARCHIVED:             { label: "Archived",              color: "bg-gray-500/10 text-gray-400 border-gray-500/20" },
};

const SEVERITY_CONFIG: Record<string, { label: string; dot: string; color: string }> = {
  LOW:      { label: "Low",     dot: "bg-emerald-400", color: "text-emerald-400" },
  MEDIUM:   { label: "Medium",  dot: "bg-amber-400",   color: "text-amber-400" },
  HIGH:     { label: "High",    dot: "bg-orange-400",  color: "text-orange-400" },
  CRITICAL: { label: "Critical",dot: "bg-red-400",     color: "text-red-400" },
};

const RISK_CONFIG: Record<string, { label: string; badge: string }> = {
  LOW:      { label: "Low",     badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  MEDIUM:   { label: "Medium",  badge: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  HIGH:     { label: "High",    badge: "bg-orange-500/10 text-orange-400 border-orange-500/20" },
  CRITICAL: { label: "Critical",badge: "bg-red-500/10 text-red-400 border-red-500/20" },
};

const RULE_RESULT_CONFIG: Record<string, { label: string; color: string }> = {
  PASSED:               { label: "Passed",                color: "text-emerald-400" },
  WARNING:              { label: "Warning",               color: "text-amber-400" },
  FAILED:               { label: "Failed",                color: "text-orange-400" },
  BLOCKED:              { label: "Blocked",               color: "text-red-500" },
  NOT_APPLICABLE:       { label: "Not Applicable",        color: "text-gray-400" },
  NOT_RUN:              { label: "Not Run",               color: "text-gray-500" },
  MANUAL_CHECK_REQUIRED:{ label: "Manual Check Required", color: "text-purple-400" },
  RESOLVED:             { label: "Resolved",              color: "text-emerald-400" },
  OVERRIDDEN:           { label: "Overridden",            color: "text-amber-400" },
};

const GROUNDING_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  GROUNDED:             { label: "Grounded",               color: "text-emerald-400" },
  PARTIALLY_GROUNDED:   { label: "Partially Grounded",     color: "text-amber-400" },
  UNGROUNDED:           { label: "Ungrounded",             color: "text-orange-400" },
  SOURCE_OUTDATED:      { label: "Source Outdated",        color: "text-red-400" },
  SOURCE_CONFLICT:      { label: "Source Conflict",        color: "text-red-500" },
  MANUAL_REVIEW_REQUIRED:{label: "Manual Review Required", color: "text-purple-400" },
};

const APPROVAL_READINESS_CONFIG: Record<string, { label: string; color: string }> = {
  READY_FOR_REVIEW:     { label: "Ready for Review",     color: "text-emerald-400" },
  READY_FOR_APPROVAL:   { label: "Ready for Approval",   color: "text-emerald-400" },
  REVISION_REQUIRED:    { label: "Revision Required",    color: "text-orange-400" },
  MANUAL_CHECK_REQUIRED:{ label: "Manual Check Required",color: "text-purple-400" },
  ESCALATION_REQUIRED:  { label: "Escalation Required",  color: "text-red-400" },
  BLOCKED:              { label: "Blocked",               color: "text-red-500" },
  OVERRIDE_REQUIRED:    { label: "Override Required",    color: "text-amber-400" },
  REVALIDATION_REQUIRED:{ label: "Revalidation Required",color: "text-amber-400" },
};

const METRIC_CARDS = [
  { key: "pending_validation",  label: "Pending Validation",  icon: <BarChart2 className="w-4 h-4" />,       color: "text-blue-400", bg: "bg-blue-500/5 border-blue-500/15" },
  { key: "passed",              label: "Passed",               icon: <CheckCircle2 className="w-4 h-4" />,    color: "text-emerald-400", bg: "bg-emerald-500/5 border-emerald-500/15" },
  { key: "warnings",            label: "Warnings",             icon: <AlertTriangle className="w-4 h-4" />,   color: "text-amber-400", bg: "bg-amber-500/5 border-amber-500/15" },
  { key: "failed",              label: "Failed",               icon: <XCircle className="w-4 h-4" />,         color: "text-orange-400", bg: "bg-orange-500/5 border-orange-500/15" },
  { key: "blocked",             label: "Blocked",              icon: <Ban className="w-4 h-4" />,             color: "text-red-400", bg: "bg-red-500/5 border-red-500/15" },
  { key: "escalation_required", label: "Escalation Required",  icon: <ArrowUpRight className="w-4 h-4" />,    color: "text-rose-400", bg: "bg-rose-500/5 border-rose-500/15" },
];

const VALIDATION_TABS = [
  { key: "validation_queue",   label: "Validation Queue" },
  { key: "assigned_to_me",     label: "Assigned to Me" },
  { key: "passed",             label: "Passed" },
  { key: "warnings",           label: "Warnings" },
  { key: "failed",             label: "Failed" },
  { key: "blocked",            label: "Blocked" },
  { key: "needs_revision",     label: "Needs Revision" },
  { key: "manual_check",       label: "Manual Check" },
  { key: "escalation_required",label: "Escalation Required" },
  { key: "override_review",    label: "Override Review" },
  { key: "revalidation_needed",label: "Revalidation Needed" },
  { key: "completed",          label: "Completed" },
];

const CATEGORY_TABS = [
  { key: "summary",          label: "Validation Summary",      icon: <ClipboardList className="w-3.5 h-3.5" /> },
  { key: "brand_rules",      label: "Brand Rules",             icon: <BookOpen className="w-3.5 h-3.5" /> },
  { key: "policy_rules",     label: "Policy Rules",            icon: <Scale className="w-3.5 h-3.5" /> },
  { key: "compliance",       label: "Compliance Checks",       icon: <ShieldCheck className="w-3.5 h-3.5" /> },
  { key: "source_grounding", label: "Source Grounding",        icon: <FileText className="w-3.5 h-3.5" /> },
  { key: "platform_readiness",label: "Platform Readiness",     icon: <Send className="w-3.5 h-3.5" /> },
  { key: "claim_safety",     label: "Claim Safety",            icon: <ShieldAlert className="w-3.5 h-3.5" /> },
  { key: "tone_sensitivity", label: "Tone and Sensitivity",    icon: <MessageSquare className="w-3.5 h-3.5" /> },
  { key: "approval_readiness",label: "Approval Readiness",     icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  { key: "manual_checks",    label: "Manual Checks",           icon: <UserCheck className="w-3.5 h-3.5" /> },
  { key: "rule_history",     label: "Rule History",            icon: <History className="w-3.5 h-3.5" /> },
  { key: "evidence",         label: "Evidence",                icon: <Eye className="w-3.5 h-3.5" /> },
];

const ITEM_TYPE_ICONS: Record<string, React.ReactNode> = {
  "Social Post":          <MessageSquare className="w-3.5 h-3.5" />,
  "Inbox Reply":          <Send className="w-3.5 h-3.5" />,
  "Campaign Asset":       <Layers className="w-3.5 h-3.5" />,
  "Agent Action":         <Zap className="w-3.5 h-3.5" />,
  "Workflow Output":      <Play className="w-3.5 h-3.5" />,
  "Revision Item":        <RotateCcw className="w-3.5 h-3.5" />,
  "Escalated Item":       <ArrowUpRight className="w-3.5 h-3.5" />,
  "Approval-Bound Item":  <CheckCircle2 className="w-3.5 h-3.5" />,
  "Platform-Specific Content": <Send className="w-3.5 h-3.5" />,
  "Source-Claim Item":    <FileText className="w-3.5 h-3.5" />,
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(dateStr?: string): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function formatShortDate(dateStr?: string): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ago`;
  if (h > 0) return `${h}h ago`;
  if (m > 0) return `${m}m ago`;
  return "just now";
}

function getScoreBand(score: number): { label: string; color: string; barColor: string } {
  if (score >= 90) return { label: "Strong", color: "text-emerald-400", barColor: "bg-emerald-500" };
  if (score >= 75) return { label: "Acceptable", color: "text-blue-400", barColor: "bg-blue-500" };
  if (score >= 60) return { label: "Needs Revision", color: "text-amber-400", barColor: "bg-amber-500" };
  if (score >= 40) return { label: "Failed", color: "text-orange-400", barColor: "bg-orange-500" };
  return { label: "Critical Failure", color: "text-red-400", barColor: "bg-red-500" };
}

function getItemBadges(item: ValidationItem): { label: string; color: string; icon?: React.ReactNode }[] {
  const badges: { label: string; color: string; icon?: React.ReactNode }[] = [];
  const status = STATUS_CONFIG[item.validation_status];
  if (status) badges.push({ label: status.label, color: status.color });
  if (item.source_grounding_status === "UNGROUNDED") badges.push({ label: "Source Failure", color: "bg-orange-500/10 text-orange-400 border-orange-500/20" });
  if (item.platform_readiness_status === "FAILED") badges.push({ label: "Platform Failure", color: "bg-red-500/10 text-red-400 border-red-500/20" });
  if (item.risk_level === "HIGH") badges.push({ label: "High Risk", color: "bg-orange-500/10 text-orange-400 border-orange-500/20" });
  if (item.risk_level === "CRITICAL") badges.push({ label: "Critical", color: "bg-red-500/10 text-red-400 border-red-500/20" });
  if (item.validation_status === "OVERRIDE_ELIGIBLE") badges.push({ label: "Override Eligible", color: "bg-amber-500/10 text-amber-400 border-amber-500/20" });
  if (item.validation_status === "OVERRIDE_PROHIBITED") badges.push({ label: "Override Prohibited", color: "bg-red-500/10 text-red-400 border-red-500/20" });
  badges.push({ label: "AI Generated", color: "bg-purple-500/10 text-purple-400 border-purple-500/20", icon: <Sparkles className="w-2.5 h-2.5" /> });
  return badges;
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function ValidationDeskPage() {
  const [items, setItems] = useState<ValidationItem[]>([]);
  const [stats, setStats] = useState<ValidationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<ValidationItem | null>(null);
  const [activeTab, setActiveTab] = useState("validation_queue");
  const [activeCategory, setActiveCategory] = useState("summary");
  const [searchQuery, setSearchQuery] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<{ itemType?: string; sourceModule?: string; riskLevel?: string; severity?: string }>({});

  // Right panel sub-sections
  const [ruleResults, setRuleResults] = useState<RuleResult[]>([]);
  const [validationRuns, setValidationRuns] = useState<ValidationRun[]>([]);
  const [groundingResults, setGroundingResults] = useState<SourceGroundingResult[]>([]);
  const [notes, setNotes] = useState<ValidatorNote[]>([]);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [manualChecks, setManualChecks] = useState<ManualCheck[]>([]);
  const [override, setOverride] = useState<ValidationOverride | null>(null);
  const [approvalReadiness, setApprovalReadiness] = useState<ApprovalReadiness | null>(null);

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
        if (validationItems.length > 0 && !selectedItem) {
          setSelectedItem(validationItems[0]);
        } else if (validationItems.length === 0) {
          setSelectedItem(null);
        }
      }
      if (statsRes.success) setStats(statsRes.data as ValidationStats);
    } catch (err) {
      setError("Validation Desk could not be loaded. Try again.");
    } finally {
      setLoading(false);
    }
  }, [selectedItem]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const fetchItemDetails = useCallback(async (itemId: string) => {
    try {
      const [runsRes, groundingRes, notesRes, timelineRes, manualChecksRes, approvalRes] = await Promise.all([
        api.get(`/api/v1/validation/items/${itemId}/runs`),
        api.get(`/api/v1/validation/items/${itemId}/grounding`),
        api.get(`/api/v1/validation/items/${itemId}/notes`),
        api.get(`/api/v1/validation/items/${itemId}/audit-trail`),
        api.get(`/api/v1/validation/items/${itemId}/manual-check`),
        api.get(`/api/v1/validation/items/${itemId}/approval-readiness`),
      ]);
      if (runsRes.success) {
        const runs = (runsRes.data || []) as ValidationRun[];
        setValidationRuns(runs);
        const latestRunId = runs[0]?.id;
        if (latestRunId) {
          const rulesRes = await api.get(`/api/v1/validation/items/${itemId}/rule-history`);
          if (rulesRes.success) setRuleResults((rulesRes.data || []) as RuleResult[]);
        } else {
          setRuleResults([]);
        }
      }
      if (groundingRes.success) setGroundingResults((groundingRes.data || []) as SourceGroundingResult[]);
      if (notesRes.success) setNotes((notesRes.data || []) as ValidatorNote[]);
      if (timelineRes.success) setTimeline((timelineRes.data || []) as TimelineEntry[]);
      if (manualChecksRes.success) setManualChecks((manualChecksRes.data || []) as ManualCheck[]);
      if (approvalRes.success) setApprovalReadiness(approvalRes.data as ApprovalReadiness);
    } catch {
      // silent fail for details
    }
  }, []);

  const handleSelectItem = (item: ValidationItem) => {
    setSelectedItem(item);
    setActiveCategory("summary");
    setMessage(null);
    fetchItemDetails(item.id);
  };

  const handleAction = async (action: string, itemId: string) => {
    setActionLoading(action);
    setMessage(null);
    try {
      let result;
      switch (action) {
        case "run_validation":
          result = await api.post(`/api/v1/validation/items/${itemId}/run-validation`, {});
          break;
        case "revalidate":
          result = await api.post(`/api/v1/validation/items/${itemId}/revalidate`, {});
          break;
        case "send_to_review":
          result = await api.post(`/api/v1/validation/items/${itemId}/send-to-review`, {});
          break;
        case "send_to_approvals":
          result = await api.post(`/api/v1/validation/items/${itemId}/send-to-approvals`, {});
          break;
        case "request_revision":
          result = await api.post(`/api/v1/validation/items/${itemId}/request-revision`, {
            revision_instruction: feedbackText || "Revision requested",
          });
          break;
        case "escalate":
          result = await api.post(`/api/v1/validation/items/${itemId}/escalate`, {
            reason: feedbackText || "Escalation required",
          });
          break;
        case "block":
          result = await api.post(`/api/v1/validation/items/${itemId}/block`, {
            reason: feedbackText || "Blocking item",
          });
          break;
        case "export":
          result = await api.post(`/api/v1/validation/export`, { item_id: itemId });
          break;
        default:
          return;
      }
      if (result.success) {
        setMessage({ type: "success", text: `${action.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())} completed successfully.` });
        setFeedbackText("");
        fetchData();
        if (selectedItem) fetchItemDetails(selectedItem.id);
      }
    } catch {
      setMessage({ type: "error", text: `Failed to ${action.replace(/_/g, " ")}.` });
    } finally {
      setActionLoading(null);
    }
  };

  const handleAddNote = async () => {
    if (!selectedItem || !feedbackText.trim()) return;
    setActionLoading("add_note");
    try {
      const result = await api.post(`/api/v1/validation/items/${selectedItem.id}/notes`, {
        note_body: feedbackText,
        visibility: "internal",
      });
      if (result.success) {
        setMessage({ type: "success", text: "Note added." });
        setFeedbackText("");
        if (selectedItem) fetchItemDetails(selectedItem.id);
      }
    } catch {
      setMessage({ type: "error", text: "Failed to add note." });
    } finally {
      setActionLoading(null);
    }
  };

  const filteredItems = items.filter(item => {
    if (activeTab === "all" || activeTab === "validation_queue") return true;
    if (activeTab === "assigned_to_me") return !!item.assigned_validator;
    if (activeTab === "passed") return item.validation_status === "PASSED" || item.validation_status === "PASSED_WITH_OVERRIDE";
    if (activeTab === "warnings") return item.validation_status === "WARNING";
    if (activeTab === "failed") return item.validation_status === "FAILED";
    if (activeTab === "blocked") return item.validation_status === "BLOCKED";
    if (activeTab === "needs_revision") return item.validation_status === "NEEDS_REVISION";
    if (activeTab === "manual_check") return item.validation_status === "MANUAL_CHECK_REQUIRED" || item.manual_check_count > 0;
    if (activeTab === "escalation_required") return item.validation_status === "ESCALATION_REQUIRED";
    if (activeTab === "override_review") return item.validation_status === "OVERRIDE_ELIGIBLE" || item.validation_status === "PASSED_WITH_OVERRIDE";
    if (activeTab === "revalidation_needed") return item.validation_status === "REVALIDATION_NEEDED";
    if (activeTab === "completed") return item.validation_status === "COMPLETED" || item.validation_status === "ARCHIVED";
    return true;
  }).filter(item => {
    if (filters.itemType && item.item_type !== filters.itemType) return false;
    if (filters.sourceModule && item.source_module !== filters.sourceModule) return false;
    if (filters.riskLevel && item.risk_level !== filters.riskLevel) return false;
    if (filters.severity && item.highest_severity !== filters.severity) return false;
    return true;
  }).filter(item => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return item.title.toLowerCase().includes(q) ||
      (item.campaign || "").toLowerCase().includes(q) ||
      (item.platform || "").toLowerCase().includes(q) ||
      (item.submitted_by || "").toLowerCase().includes(q) ||
      (item.assigned_validator || "").toLowerCase().includes(q) ||
      (item.item_type || "").toLowerCase().includes(q) ||
      (item.source_module || "").toLowerCase().includes(q) ||
      (item.risk_level || "").toLowerCase().includes(q) ||
      item.validation_status.toLowerCase().includes(q);
  })
  .sort((a, b) => {
    const statusOrder: Record<string, number> = {
      BLOCKED: 0, OVERRIDE_PROHIBITED: 1, MANUAL_CHECK_REQUIRED: 2,
      ESCALATION_REQUIRED: 3, FAILED: 4, NEEDS_REVISION: 5,
      REVALIDATION_NEEDED: 6, WARNING: 7, OVERRIDE_ELIGIBLE: 8,
      PASSED_WITH_OVERRIDE: 9, PASSED: 10, IN_VALIDATION: 11,
      PENDING_VALIDATION: 12, COMPLETED: 13, ARCHIVED: 14,
    };
    const aOrder = statusOrder[a.validation_status] ?? 99;
    const bOrder = statusOrder[b.validation_status] ?? 99;
    if (aOrder !== bOrder) return aOrder - bOrder;
    const riskOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    const aRisk = riskOrder[a.risk_level as keyof typeof riskOrder] ?? 99;
    const bRisk = riskOrder[b.risk_level as keyof typeof riskOrder] ?? 99;
    if (aRisk !== bRisk) return aRisk - bRisk;
    if (a.due_at && b.due_at) return new Date(a.due_at).getTime() - new Date(b.due_at).getTime();
    return new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime();
  });

  const score = selectedItem?.validation_score ?? 0;
  const scoreBand = getScoreBand(score);
  const alerts: { label: string; icon: React.ReactNode; color: string }[] = [];
  if (ruleResults.some(r => r.severity === "CRITICAL" && (r.result === "FAILED" || r.result === "BLOCKED"))) {
    alerts.push({ label: "Critical Rule Failure", icon: <AlertCircle className="w-3.5 h-3.5" />, color: "text-red-400" });
  }
  if (groundingResults.some(g => g.grounding_status === "UNGROUNDED")) {
    alerts.push({ label: "Source Grounding Failure", icon: <AlertTriangle className="w-3.5 h-3.5" />, color: "text-orange-400" });
  }
  if (selectedItem?.platform_readiness_status === "FAILED" || selectedItem?.platform_readiness_status === "BLOCKED") {
    alerts.push({ label: "Platform Block", icon: <Ban className="w-3.5 h-3.5" />, color: "text-red-400" });
  }
  if (selectedItem?.validation_status === "OVERRIDE_ELIGIBLE") {
    alerts.push({ label: "Override Pending", icon: <Gavel className="w-3.5 h-3.5" />, color: "text-amber-400" });
  }
  if (selectedItem?.validation_status === "REVALIDATION_NEEDED") {
    alerts.push({ label: "Revalidation Needed", icon: <RotateCcw className="w-3.5 h-3.5" />, color: "text-amber-400" });
  }
  if (selectedItem?.validation_status === "MANUAL_CHECK_REQUIRED" || (selectedItem?.manual_check_count ?? 0) > 0) {
    alerts.push({ label: "Manual Check Required", icon: <UserCheck className="w-3.5 h-3.5" />, color: "text-purple-400" });
  }

  // ─── Render ───────────────────────────────────────────────────────────────────

  if (loading && items.length === 0 && !error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col items-center py-32 text-[#666] gap-4">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm">Loading Validation Desk…</p>
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
          <p className="text-white font-semibold mb-2">Failed to Load Validation Desk</p>
          <p className="text-[#666] text-sm mb-6">{error}</p>
          <button onClick={fetchData} className="px-5 py-2.5 bg-indigo-500 hover:bg-indigo-400 text-white rounded-xl text-xs font-bold transition-all">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 pb-16">
      {/* ── Header ──────────────────────────────────────────────────────────────── */}
      <div className="mb-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Validation Desk</h1>
          <p className="text-[#888] text-sm">Validate content, replies, agent actions, and workflow outputs against brand, policy, compliance, source-grounding, platform, claim-safety, tone, and approval-readiness rules before they proceed.</p>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <TooltipBtn disabled={!selectedItem || actionLoading !== null} tooltip="Select a validation item first">
            <button disabled={!selectedItem || actionLoading !== null}
              onClick={() => selectedItem && handleAction("run_validation", selectedItem.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500 hover:bg-indigo-400 text-white rounded-lg text-[10px] font-bold transition-all disabled:opacity-40 shadow-lg shadow-indigo-500/15">
              {actionLoading === "run_validation" ? <RefreshCcw className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
              Run Validation
            </button>
          </TooltipBtn>
          <TooltipBtn disabled={!selectedItem || actionLoading !== null} tooltip="Select a validation item first">
            <button disabled={!selectedItem || actionLoading !== null}
              onClick={() => selectedItem && handleAction("revalidate", selectedItem.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--card)] border border-[var(--border)] text-[#aaa] hover:text-white rounded-lg text-[10px] font-bold transition-all disabled:opacity-40">
              {actionLoading === "revalidate" ? <RefreshCcw className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
              Revalidate
            </button>
          </TooltipBtn>
          <TooltipBtn disabled={!selectedItem || actionLoading !== null} tooltip="Select a validation item first">
            <button disabled={!selectedItem || actionLoading !== null}
              onClick={() => selectedItem && handleAction("send_to_review", selectedItem.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--card)] border border-[var(--border)] text-[#aaa] hover:text-white rounded-lg text-[10px] font-bold transition-all disabled:opacity-40">
              <ArrowRight className="w-3 h-3" />Send to Review
            </button>
          </TooltipBtn>
          <TooltipBtn disabled={!selectedItem || actionLoading !== null} tooltip="Select a validation item first">
            <button disabled={!selectedItem || actionLoading !== null}
              onClick={() => selectedItem && handleAction("send_to_approvals", selectedItem.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--card)] border border-[var(--border)] text-[#aaa] hover:text-white rounded-lg text-[10px] font-bold transition-all disabled:opacity-40">
              <CheckCircle2 className="w-3 h-3" />Send to Approvals
            </button>
          </TooltipBtn>
          <TooltipBtn disabled={!selectedItem || actionLoading !== null} tooltip="Select a validation item first">
            <button disabled={!selectedItem || actionLoading !== null}
              onClick={() => selectedItem && handleAction("request_revision", selectedItem.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white border border-rose-500/20 rounded-lg text-[10px] font-bold transition-all disabled:opacity-40">
              <RotateCcw className="w-3 h-3" />Request Revision
            </button>
          </TooltipBtn>
          <TooltipBtn disabled={!selectedItem || actionLoading !== null} tooltip="Select a validation item first">
            <button disabled={!selectedItem || actionLoading !== null}
              onClick={() => selectedItem && handleAction("escalate", selectedItem.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500/10 hover:bg-orange-500 text-orange-400 hover:text-white border border-orange-500/20 rounded-lg text-[10px] font-bold transition-all disabled:opacity-40">
              <ArrowUpRight className="w-3 h-3" />Escalate
            </button>
          </TooltipBtn>
          <TooltipBtn disabled={!selectedItem || actionLoading !== null} tooltip="Select a validation item first">
            <button disabled={!selectedItem || actionLoading !== null}
              onClick={() => selectedItem && handleAction("block", selectedItem.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/20 rounded-lg text-[10px] font-bold transition-all disabled:opacity-40">
              <Ban className="w-3 h-3" />Block
            </button>
          </TooltipBtn>
          <TooltipBtn disabled={!selectedItem || actionLoading !== null} tooltip="Select a validation item first">
            <button disabled={!selectedItem || actionLoading !== null}
              onClick={() => selectedItem && handleAction("export", selectedItem.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--card)] border border-[var(--border)] text-[#aaa] hover:text-white rounded-lg text-[10px] font-bold transition-all disabled:opacity-40">
              <Download className="w-3 h-3" />Export
            </button>
          </TooltipBtn>
          <TooltipBtn disabled={true} tooltip="Admin only: configure validation settings">
            <button disabled
              className="p-2 bg-[var(--card)] border border-[var(--border)] rounded-lg text-[#555] cursor-not-allowed">
              <Settings className="w-3.5 h-3.5" />
            </button>
          </TooltipBtn>
        </div>
      </div>

      {/* ── Message Toast ──────────────────────────────────────────────────────── */}
      {message && (
        <div className={`mb-4 p-3 rounded-xl flex items-center gap-2.5 text-sm font-medium ${
          message.type === "success"
            ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
            : "bg-rose-500/10 border border-rose-500/20 text-rose-400"
        }`}>
          {message.type === "success" ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          {message.text}
        </div>
      )}

      {/* ── Metric Cards ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
        {METRIC_CARDS.map(m => (
          <button key={m.key} onClick={() => setActiveTab(m.key === "pending_validation" ? "validation_queue" : m.key)}
            className={`p-3 rounded-xl border transition-all text-left ${
              m.bg
            } hover:border-white/20`}>
            <div className={`${m.color} mb-1.5`}>{m.icon}</div>
            <p className="text-lg font-bold text-white">{stats ? String(stats[m.key as keyof ValidationStats] ?? 0) : "—"}</p>
            <p className="text-[10px] text-[#888] font-medium">{m.label}</p>
          </button>
        ))}
      </div>

      {/* ── Alert Strip ────────────────────────────────────────────────────────── */}
      {alerts.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {alerts.map((a, i) => (
            <div key={i} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold ${
              a.color.includes("red") ? "bg-red-500/5 border-red-500/15" :
              a.color.includes("orange") ? "bg-orange-500/5 border-orange-500/15" :
              a.color.includes("amber") ? "bg-amber-500/5 border-amber-500/15" :
              "bg-purple-500/5 border-purple-500/15"
            } ${a.color}`}>
              {a.icon}
              {a.label}
            </div>
          ))}
        </div>
      )}

      {/* ── Tabs + Search + Filters ────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex items-center gap-1 overflow-x-auto flex-1">
          {VALIDATION_TABS.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap ${
                activeTab === tab.key
                  ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                  : "text-[#666] hover:text-white border border-transparent hover:border-[var(--border)]"
              }`}>
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#555]" />
            <input type="text" placeholder="Search items..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              className="w-48 pl-8 pr-3 py-1.5 bg-[var(--card)] border border-[var(--border)] rounded-lg text-xs text-white placeholder-[#555] outline-none focus:border-indigo-500/40" />
          </div>
          <button onClick={() => setShowFilters(!showFilters)}
            className={`p-1.5 rounded-lg border transition-all ${showFilters ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-400" : "border-[var(--border)] text-[#666] hover:text-white"}`}>
            <Filter className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── Filter Drawer ──────────────────────────────────────────────────────── */}
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
              {["Social Post", "Inbox Reply", "Campaign Asset", "Agent Action", "Workflow Output", "Revision Item", "Escalated Item", "Approval-Bound Item", "Platform-Specific Content", "Source-Claim Item"].map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <select value={filters.sourceModule || ""} onChange={e => setFilters(f => ({ ...f, sourceModule: e.target.value || undefined }))}
              className="px-2.5 py-1.5 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[10px] text-[#aaa] outline-none focus:border-indigo-500/40">
              <option value="">All Sources</option>
              {["content", "campaigns", "inbox", "agents", "workflows"].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <select value={filters.riskLevel || ""} onChange={e => setFilters(f => ({ ...f, riskLevel: e.target.value || undefined }))}
              className="px-2.5 py-1.5 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[10px] text-[#aaa] outline-none focus:border-indigo-500/40">
              <option value="">All Risk Levels</option>
              {["LOW", "MEDIUM", "HIGH", "CRITICAL"].map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            <select value={filters.severity || ""} onChange={e => setFilters(f => ({ ...f, severity: e.target.value || undefined }))}
              className="px-2.5 py-1.5 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[10px] text-[#aaa] outline-none focus:border-indigo-500/40">
              <option value="">All Severities</option>
              {["LOW", "MEDIUM", "HIGH", "CRITICAL"].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* ── 3-Panel Layout ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">

        {/* ═══ Left Panel: Validation Item List ═══ */}
        <div className="xl:col-span-3 space-y-2">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-semibold text-[#666] uppercase tracking-wider">Items ({filteredItems.length})</h2>
            <div className="flex items-center gap-1">
              <button onClick={() => { setBulkMode(!bulkMode); setBulkSelected(new Set()); }}
                className={`p-1 rounded transition-colors ${bulkMode ? "text-indigo-400 bg-indigo-500/10" : "text-[#555] hover:text-white"}`}
                title="Toggle bulk selection">
                <ClipboardList className="w-3.5 h-3.5" />
              </button>
              <button onClick={fetchData} className="p-1 text-[#555] hover:text-white transition-colors">
                <RefreshCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Bulk Mode Bar */}
          {bulkMode && bulkSelected.size > 0 && (
            <div className="flex items-center gap-2 p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
              <span className="text-[10px] text-indigo-300 font-semibold whitespace-nowrap">{bulkSelected.size} selected</span>
              <div className="flex gap-1 ml-auto">
                <button onClick={() => { setBulkSelected(new Set()); setBulkMode(false); }} className="px-2 py-1 text-[9px] font-bold text-[#888] hover:text-white rounded-lg hover:bg-white/5 transition-all">Cancel</button>
                <button onClick={() => setBulkSelected(new Set())} className="px-2 py-1 text-[9px] font-bold text-[#888] hover:text-white rounded-lg hover:bg-white/5 transition-all">Deselect All</button>
                <button onClick={() => { Array.from(bulkSelected).forEach(id => handleAction("run_validation", id)); setBulkMode(false); setBulkSelected(new Set()); }} className="px-2 py-1 text-[9px] font-bold text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-all">Run Validation</button>
                <button onClick={() => { Array.from(bulkSelected).forEach(id => handleAction("request_revision", id)); setBulkMode(false); setBulkSelected(new Set()); }} className="px-2 py-1 text-[9px] font-bold text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all">Request Revision</button>
              </div>
            </div>
          )}

          {filteredItems.length === 0 ? (
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-8 text-center">
              {activeTab === "assigned_to_me" ? <><UserCheck className="w-6 h-6 text-indigo-400 mx-auto mb-3" /><p className="text-xs text-white font-semibold mb-1">No Assigned Items</p><p className="text-[10px] text-[#666]">Items assigned to you for validation will appear here.</p></> :
               activeTab === "passed" ? <><CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-3" /><p className="text-xs text-white font-semibold mb-1">No Passed Validations</p><p className="text-[10px] text-[#666]">Items that passed validation will appear here.</p></> :
               activeTab === "warnings" ? <><AlertTriangle className="w-6 h-6 text-amber-400 mx-auto mb-3" /><p className="text-xs text-white font-semibold mb-1">No Warnings</p><p className="text-[10px] text-[#666]">Items with non-blocking warnings will appear here.</p></> :
               activeTab === "failed" ? <><XCircle className="w-6 h-6 text-orange-400 mx-auto mb-3" /><p className="text-xs text-white font-semibold mb-1">No Failed Validations</p><p className="text-[10px] text-[#666]">Items that failed required checks will appear here with rule details and recommended fixes.</p></> :
               activeTab === "blocked" ? <><Ban className="w-6 h-6 text-red-400 mx-auto mb-3" /><p className="text-xs text-white font-semibold mb-1">No Blocked Items</p><p className="text-[10px] text-[#666]">Items blocked by non-overridable governance rules will appear here.</p></> :
               activeTab === "needs_revision" ? <><RotateCcw className="w-6 h-6 text-orange-400 mx-auto mb-3" /><p className="text-xs text-white font-semibold mb-1">No Revision Items</p><p className="text-[10px] text-[#666]">Items that need correction and revalidation will appear here.</p></> :
               activeTab === "manual_check" ? <><UserCheck className="w-6 h-6 text-purple-400 mx-auto mb-3" /><p className="text-xs text-white font-semibold mb-1">No Manual Checks</p><p className="text-[10px] text-[#666]">Items requiring human validation will appear here.</p></> :
               activeTab === "escalation_required" ? <><ArrowUpRight className="w-6 h-6 text-rose-400 mx-auto mb-3" /><p className="text-xs text-white font-semibold mb-1">No Escalation Items</p><p className="text-[10px] text-[#666]">Items requiring elevated review will appear here.</p></> :
               activeTab === "override_review" ? <><Gavel className="w-6 h-6 text-amber-400 mx-auto mb-3" /><p className="text-xs text-white font-semibold mb-1">No Override Reviews</p><p className="text-[10px] text-[#666]">Items eligible for authorized override review will appear here.</p></> :
               activeTab === "revalidation_needed" ? <><RotateCcw className="w-6 h-6 text-amber-400 mx-auto mb-3" /><p className="text-xs text-white font-semibold mb-1">No Revalidation Items</p><p className="text-[10px] text-[#666]">Items that need revalidation after content or rule changes will appear here.</p></> :
               activeTab === "completed" ? <><CheckCircle2 className="w-6 h-6 text-gray-400 mx-auto mb-3" /><p className="text-xs text-white font-semibold mb-1">No Completed Validations</p><p className="text-[10px] text-[#666]">Completed and archived validations will appear here.</p></> :
               <><ShieldCheck className="w-6 h-6 text-emerald-400 mx-auto mb-3" /><p className="text-xs text-white font-semibold mb-1">No Items Found</p><p className="text-[10px] text-[#666]">No items match the current filter. Try adjusting your search or filters.</p></>}
            </div>
          ) : (
            <div className="space-y-2 max-h-[calc(100vh-360px)] overflow-y-auto pr-1">
              {filteredItems.map(item => {
                const isSelected = selectedItem?.id === item.id;
                const isBulkChecked = bulkSelected.has(item.id);
                const badges = getItemBadges(item);
                return (
                  <button key={item.id} onClick={() => {
                      if (bulkMode) {
                        const next = new Set(bulkSelected);
                        if (next.has(item.id)) next.delete(item.id); else next.add(item.id);
                        setBulkSelected(next);
                      } else {
                        handleSelectItem(item);
                      }
                    }}
                    className={`w-full text-left p-3 rounded-xl border transition-all duration-200 ${
                      isSelected && !bulkMode
                        ? "bg-[var(--card-hover)] border-indigo-500/40 shadow-lg shadow-indigo-500/5"
                        : isBulkChecked
                        ? "bg-indigo-500/5 border-indigo-500/30"
                        : "bg-[var(--card)] border-[var(--border)] hover:border-[var(--border-hover)]"
                    }`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        {bulkMode && (
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                            isBulkChecked ? "bg-indigo-500 border-indigo-500" : "border-[#555]"
                          }`}>
                            {isBulkChecked && <CheckCircle2 className="w-3 h-3 text-white" />}
                          </div>
                        )}
                        <span className="text-[#888]">{ITEM_TYPE_ICONS[item.item_type] || <FileText className="w-3.5 h-3.5" />}</span>
                        <span className="text-[9px] text-[#666] uppercase font-bold">{item.item_type || "Item"}</span>
                      </div>
                      <span className={`px-1.5 py-0.5 rounded border text-[9px] font-bold uppercase tracking-wider ${RISK_CONFIG[item.risk_level]?.badge || "bg-gray-500/10 text-gray-400 border-gray-500/20"}`}>
                        {RISK_CONFIG[item.risk_level]?.label || item.risk_level}
                      </span>
                    </div>
                    <p className="text-xs text-[#ccc] line-clamp-2 leading-relaxed mb-2">{item.title}</p>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {badges.slice(0, 3).map((b, i) => (
                        <span key={i} className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[8px] font-bold uppercase tracking-wider ${b.color}`}>
                          {b.icon}{b.label}
                        </span>
                      ))}
                      {badges.length > 3 && <span className="text-[8px] text-[#555]">+{badges.length - 3}</span>}
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-[#555]">
                      <span className="flex items-center gap-1"><User className="w-3 h-3" />{item.assigned_validator || "Unassigned"}</span>
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatShortDate(item.submitted_at)}</span>
                    </div>
                    {(item.failed_rule_count > 0 || item.warning_count > 0 || item.blocked_rule_count > 0) && (
                      <div className="flex gap-2 mt-1.5 text-[10px]">
                        {item.failed_rule_count > 0 && <span className="text-orange-400">{item.failed_rule_count} failed</span>}
                        {item.warning_count > 0 && <span className="text-amber-400">{item.warning_count} warnings</span>}
                        {item.blocked_rule_count > 0 && <span className="text-red-400">{item.blocked_rule_count} blocked</span>}
                      </div>
                    )}
                    <div className="flex items-center gap-1 mt-1.5 pt-1.5 border-t border-[var(--border)]/30">
                      <button onClick={e => { e.stopPropagation(); handleAction("run_validation", item.id); }} className="p-1 text-[#555] hover:text-indigo-400 transition-colors" title="Run Validation">
                        <Play className="w-3 h-3" />
                      </button>
                      <button onClick={e => { e.stopPropagation(); handleAction("revalidate", item.id); }} className="p-1 text-[#555] hover:text-amber-400 transition-colors" title="Revalidate">
                        <RotateCcw className="w-3 h-3" />
                      </button>
                      <button onClick={e => { e.stopPropagation(); handleAction("request_revision", item.id); }} className="p-1 text-[#555] hover:text-rose-400 transition-colors" title="Request Revision">
                        <Pen className="w-3 h-3" />
                      </button>
                      <button onClick={e => { e.stopPropagation(); handleAction("escalate", item.id); }} className="p-1 text-[#555] hover:text-orange-400 transition-colors" title="Escalate">
                        <ArrowUpRight className="w-3 h-3" />
                      </button>
                      <button onClick={e => { e.stopPropagation(); handleAction("export", item.id); }} className="p-1 text-[#555] hover:text-white transition-colors" title="Export">
                        <Download className="w-3 h-3" />
                      </button>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ═══ Center Panel: Validation Workspace ═══ */}
        <div className="xl:col-span-5">
          {!selectedItem ? (
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-16 text-center">
              <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <ShieldCheck className="w-7 h-7 text-emerald-400" />
              </div>
              <p className="text-white font-semibold mb-1">No Items Waiting for Validation</p>
              <p className="text-[#666] text-sm">Items requiring brand, policy, compliance, source, platform, claim-safety, tone, or approval-readiness validation will appear here.</p>
            </div>
          ) : (
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 space-y-4">
              {/* ── Content Preview ──────────────────────────────────────────────────── */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-semibold text-[#666] uppercase tracking-wider">Content Preview</h3>
                  <div className="flex items-center gap-1.5">
                    {selectedItem.platform && <span className="text-[10px] text-[#555] border border-[var(--border)] rounded px-1.5 py-0.5">{selectedItem.platform}</span>}
                    {selectedItem.campaign && <span className="text-[10px] text-[#555] border border-[var(--border)] rounded px-1.5 py-0.5">{selectedItem.campaign}</span>}
                  </div>
                </div>
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3.5 text-sm text-[#ccc] leading-relaxed min-h-[80px]">
                  {selectedItem.title}
                  {selectedItem.content_snapshot && Object.keys(selectedItem.content_snapshot).length > 0 && (
                    <pre className="mt-2 text-[10px] text-[#555] overflow-x-auto">{JSON.stringify(selectedItem.content_snapshot, null, 2)}</pre>
                  )}
                </div>
              </div>

              {/* ── Validation Category Tabs ──────────────────────────────────────────── */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-[var(--border)]/30">
                {CATEGORY_TABS.map(tab => (
                  <button key={tab.key} onClick={() => setActiveCategory(tab.key)}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-t-lg text-[11px] font-bold transition-all whitespace-nowrap ${
                      activeCategory === tab.key
                        ? "bg-[var(--card-hover)] text-indigo-400 border-b-2 border-indigo-500"
                        : "text-[#666] hover:text-white"
                    }`}>
                    {tab.icon}{tab.label}
                  </button>
                ))}
              </div>

              {/* ── Category Content ──────────────────────────────────────────────────── */}
              <div className="min-h-[200px]">
                {activeCategory === "summary" && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl">
                        <p className="text-[10px] text-[#666] font-semibold uppercase">Status</p>
                        <p className={`text-sm font-bold mt-0.5 ${STATUS_CONFIG[selectedItem.validation_status]?.color || "text-white"}`}>
                          {STATUS_CONFIG[selectedItem.validation_status]?.label || selectedItem.validation_status}
                        </p>
                      </div>
                      <div className="p-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl">
                        <p className="text-[10px] text-[#666] font-semibold uppercase">Score</p>
                        <p className={`text-sm font-bold mt-0.5 ${scoreBand.color}`}>{score}/100</p>
                      </div>
                      <div className="p-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl">
                        <p className="text-[10px] text-[#666] font-semibold uppercase">Severity</p>
                        <p className={`text-sm font-bold mt-0.5 ${SEVERITY_CONFIG[selectedItem.highest_severity]?.color || "text-white"}`}>
                          {SEVERITY_CONFIG[selectedItem.highest_severity]?.label || selectedItem.highest_severity || "None"}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl">
                        <p className="text-[10px] text-[#666] font-semibold uppercase">Passed</p>
                        <p className="text-sm font-bold text-emerald-400 mt-0.5">{ruleResults.filter(r => r.result === "PASSED").length}</p>
                      </div>
                      <div className="p-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl">
                        <p className="text-[10px] text-[#666] font-semibold uppercase">Warnings</p>
                        <p className="text-sm font-bold text-amber-400 mt-0.5">{selectedItem.warning_count}</p>
                      </div>
                      <div className="p-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl">
                        <p className="text-[10px] text-[#666] font-semibold uppercase">Failed</p>
                        <p className="text-sm font-bold text-orange-400 mt-0.5">{selectedItem.failed_rule_count}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl">
                        <p className="text-[10px] text-[#666] font-semibold uppercase">Blocked</p>
                        <p className="text-sm font-bold text-red-400 mt-0.5">{selectedItem.blocked_rule_count}</p>
                      </div>
                      <div className="p-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl">
                        <p className="text-[10px] text-[#666] font-semibold uppercase">Manual Checks</p>
                        <p className="text-sm font-bold text-purple-400 mt-0.5">{selectedItem.manual_check_count}</p>
                      </div>
                      <div className="p-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl">
                        <p className="text-[10px] text-[#666] font-semibold uppercase">Runs</p>
                        <p className="text-sm font-bold text-white mt-0.5">{validationRuns.length}</p>
                      </div>
                    </div>
                    {validationRuns[0] && (
                      <div className="text-[10px] text-[#555] space-y-1 p-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl">
                        <p>Engine: {validationRuns[0].validation_engine_version} | Rule Set: {validationRuns[0].rule_set_version}</p>
                        <p>Run: {formatDate(validationRuns[0].started_at)} by {validationRuns[0].run_by || "—"}</p>
                      </div>
                    )}
                  </div>
                )}

                {activeCategory === "brand_rules" && (
                  <div>
                    {ruleResults.filter(r => r.rule_category === "brand").length === 0 ? (
                      <div className="text-center py-8 text-[#555] text-sm">No brand rule results for this item.</div>
                    ) : (
                      <div className="space-y-2">
                        {ruleResults.filter(r => r.rule_category === "brand").map(r => (
                          <RuleResultCard key={r.id} result={r} />
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeCategory === "policy_rules" && (
                  <div>
                    {ruleResults.filter(r => r.rule_category === "policy").length === 0 ? (
                      <div className="text-center py-8 text-[#555] text-sm">No policy rule results for this item.</div>
                    ) : (
                      <div className="space-y-2">
                        {ruleResults.filter(r => r.rule_category === "policy").map(r => (
                          <RuleResultCard key={r.id} result={r} />
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeCategory === "compliance" && (
                  <div>
                    {ruleResults.filter(r => r.rule_category === "compliance").length === 0 ? (
                      <div className="text-center py-8 text-[#555] text-sm">No compliance check results for this item.</div>
                    ) : (
                      <div className="space-y-2">
                        {ruleResults.filter(r => r.rule_category === "compliance").map(r => (
                          <RuleResultCard key={r.id} result={r} />
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeCategory === "source_grounding" && (
                  <div>
                    {groundingResults.length === 0 ? (
                      <div className="text-center py-8 text-[#555] text-sm">No source grounding results for this item.</div>
                    ) : (
                      <div className="space-y-2">
                        {groundingResults.map(g => (
                          <div key={g.id} className="p-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl">
                            <div className="flex items-center justify-between mb-1.5">
                              <p className="text-xs text-white font-medium truncate flex-1">{g.claim_text}</p>
                              <span className={`text-[10px] font-bold ${GROUNDING_STATUS_CONFIG[g.grounding_status]?.color || "text-gray-400"}`}>
                                {GROUNDING_STATUS_CONFIG[g.grounding_status]?.label || g.grounding_status}
                              </span>
                            </div>
                            {g.source_reference && <p className="text-[10px] text-[#555]">Source: {g.source_reference}</p>}
                            {g.issue_summary && <p className="text-[10px] text-[#555] mt-1">{g.issue_summary}</p>}
                            {g.source_confidence !== undefined && (
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] text-[#555]">Confidence:</span>
                                <div className="flex-1 h-1.5 bg-[var(--border)] rounded-full overflow-hidden">
                                  <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${g.source_confidence * 100}%` }} />
                                </div>
                                <span className="text-[10px] text-[#555]">{Math.round(g.source_confidence * 100)}%</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeCategory === "platform_readiness" && (
                  <div>
                    {ruleResults.filter(r => r.rule_category === "platform").length === 0 ? (
                      <div className="text-center py-8 text-[#555] text-sm">No platform readiness results for this item.</div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[10px] text-[#555] font-semibold">Platform Readiness Status:</span>
                          <span className={`text-[11px] font-bold ${selectedItem.platform_readiness_status === "READY" ? "text-emerald-400" : selectedItem.platform_readiness_status === "FAILED" ? "text-red-400" : "text-amber-400"}`}>
                            {selectedItem.platform_readiness_status || "Unknown"}
                          </span>
                        </div>
                        {ruleResults.filter(r => r.rule_category === "platform").map(r => (
                          <RuleResultCard key={r.id} result={r} />
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeCategory === "claim_safety" && (
                  <div>
                    {ruleResults.filter(r => r.rule_category === "claim_safety").length === 0 ? (
                      <div className="text-center py-8 text-[#555] text-sm">No claim safety results for this item.</div>
                    ) : (
                      <div className="space-y-2">
                        {ruleResults.filter(r => r.rule_category === "claim_safety").map(r => (
                          <RuleResultCard key={r.id} result={r} />
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeCategory === "tone_sensitivity" && (
                  <div>
                    {ruleResults.filter(r => r.rule_category === "tone").length === 0 ? (
                      <div className="text-center py-8 text-[#555] text-sm">No tone and sensitivity results for this item.</div>
                    ) : (
                      <div className="space-y-2">
                        {ruleResults.filter(r => r.rule_category === "tone").map(r => (
                          <RuleResultCard key={r.id} result={r} />
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeCategory === "approval_readiness" && (
                  <div>
                    <div className="p-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-[#666] font-semibold uppercase">Status</span>
                        <span className={`text-[11px] font-bold ${APPROVAL_READINESS_CONFIG[approvalReadiness?.status || ""]?.color || "text-gray-400"}`}>
                          {APPROVAL_READINESS_CONFIG[approvalReadiness?.status || ""]?.label || approvalReadiness?.status || "Unknown"}
                        </span>
                      </div>
                      {approvalReadiness?.rule_matched && (
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-[#666] font-semibold uppercase">Rule Matched</span>
                          <span className="text-[11px] text-white">{approvalReadiness.rule_matched}</span>
                        </div>
                      )}
                      {approvalReadiness?.required_level && (
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-[#666] font-semibold uppercase">Required Level</span>
                          <span className="text-[11px] text-white">{approvalReadiness.required_level}</span>
                        </div>
                      )}
                      {approvalReadiness?.required_reviewer_role && (
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-[#666] font-semibold uppercase">Required Reviewer</span>
                          <span className="text-[11px] text-white">{approvalReadiness.required_reviewer_role}</span>
                        </div>
                      )}
                      {approvalReadiness?.next_destination && (
                        <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]/30">
                          <span className="text-[10px] text-[#666] font-semibold uppercase">Next Destination</span>
                          <span className="text-[11px] font-bold text-indigo-400">{approvalReadiness.next_destination}</span>
                        </div>
                      )}
                    </div>
                    {ruleResults.filter(r => r.rule_category === "approval").map(r => (
                      <RuleResultCard key={r.id} result={r} />
                    ))}
                  </div>
                )}

                {activeCategory === "manual_checks" && (
                  <div>
                    {manualChecks.length === 0 ? (
                      <div className="text-center py-8 text-[#555] text-sm">No manual checks for this item.</div>
                    ) : (
                      <div className="space-y-2">
                        {manualChecks.map(mc => (
                          <div key={mc.id} className="p-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-[10px] text-[#666] font-semibold uppercase">Manual Check</span>
                              <span className={`text-[10px] font-bold ${
                                mc.manual_check_result === "PASSED" ? "text-emerald-400" :
                                mc.manual_check_result === "FAILED" ? "text-red-400" :
                                mc.manual_check_result === "NEEDS_REVISION" ? "text-orange-400" :
                                mc.manual_check_result === "ESCALATION_REQUIRED" ? "text-rose-400" :
                                "text-gray-400"
                              }`}>{mc.manual_check_result}</span>
                            </div>
                            {mc.note && <p className="text-[11px] text-[#888] mb-1">{mc.note}</p>}
                            <div className="flex items-center gap-3 text-[10px] text-[#555]">
                              <span>By: {mc.completed_by || mc.assigned_validator || "—"}</span>
                              {mc.completed_at && <span>{formatDate(mc.completed_at)}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeCategory === "rule_history" && (
                  <div>
                    {validationRuns.length === 0 ? (
                      <div className="text-center py-8 text-[#555] text-sm">No validation runs for this item.</div>
                    ) : (
                      <div className="space-y-2">
                        {validationRuns.map(run => (
                          <div key={run.id} className="p-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] text-[#666] font-semibold uppercase">Run</span>
                              <span className={`text-[10px] font-bold ${run.run_status === "COMPLETED" ? "text-emerald-400" : run.run_status === "RUNNING" ? "text-amber-400" : "text-gray-400"}`}>
                                {run.run_status}
                              </span>
                            </div>
                            <div className="text-[10px] text-[#555] space-y-0.5">
                              <p>Engine: {run.validation_engine_version} | Rule Set: {run.rule_set_version}</p>
                              <p>Started: {formatDate(run.started_at)} by {run.run_by || "—"}</p>
                              {run.completed_at && <p>Completed: {formatDate(run.completed_at)}</p>}
                              {run.result_summary && <p>Summary: {run.result_summary}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeCategory === "evidence" && (
                  <div className="text-center py-8 text-[#555] text-sm">
                    <Eye className="w-6 h-6 mx-auto mb-2 text-[#555]" />
                    <p>Supporting evidence documentation will appear here.</p>
                    <button onClick={() => selectedItem && handleAction("export", selectedItem.id)} className="mt-3 px-3 py-1.5 bg-[var(--card)] border border-[var(--border)] text-[#aaa] hover:text-white rounded-lg text-[10px] font-bold transition-all">
                      <Download className="w-3 h-3 inline mr-1" />Export Evidence
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ═══ Right Panel: Validation Control Panel ═══ */}
        <div className="xl:col-span-4 space-y-3">
          {!selectedItem ? (
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-12 text-center">
              <p className="text-[#555] text-xs">Select an item to view validation controls.</p>
            </div>
          ) : (
            <>
              {/* ── Validation Score ─────────────────────────────────────────────────── */}
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-[10px] font-semibold text-[#666] uppercase tracking-wider">Validation Score</h3>
                  <span className={`text-xs font-bold ${scoreBand.color}`}>{scoreBand.label}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="relative w-16 h-16">
                    <svg className="w-16 h-16 -rotate-90" viewBox="0 0 72 72">
                      <circle cx="36" cy="36" r="30" fill="none" stroke="var(--border)" strokeWidth="6" />
                      <circle cx="36" cy="36" r="30" fill="none" stroke={scoreBand.barColor.replace("bg-", "#").replace("emerald-500", "#10b981").replace("blue-500", "#3b82f6").replace("amber-500", "#f59e0b").replace("orange-500", "#f97316").replace("red-500", "#ef4444")} strokeWidth="6" strokeDasharray={`${(score / 100) * 188.5} 188.5`} strokeLinecap="round" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-lg font-bold text-white">{score}</span>
                    </div>
                  </div>
                  <div className="flex-1 space-y-1">
                    {[["90-100", "Strong", "bg-emerald-500"], ["75-89", "Acceptable", "bg-blue-500"], ["60-74", "Needs Revision", "bg-amber-500"], ["40-59", "Failed", "bg-orange-500"], ["0-39", "Critical Failure", "bg-red-500"]].map(([range, label, barColor]) => (
                      <div key={range} className="flex items-center gap-2 text-[10px]">
                        <div className={`w-2 h-2 rounded-full ${barColor}`} />
                        <span className="text-[#555] w-12">{range}</span>
                        <span className={score >= parseInt(range.split("-")[0]) ? "text-white font-medium" : "text-[#555]"}>{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── Failed Rules Panel ────────────────────────────────────────────────── */}
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
                <h3 className="text-[10px] font-semibold text-[#666] uppercase tracking-wider mb-2">Failed Rules</h3>
                {ruleResults.filter(r => r.result === "FAILED" || r.result === "BLOCKED" || r.result === "WARNING").length === 0 ? (
                  <div className="text-center py-4 text-[#555] text-[11px]">No failed or warning rules.</div>
                ) : (
                  <div className="space-y-1.5 max-h-[180px] overflow-y-auto">
                    {ruleResults.filter(r => r.result === "FAILED" || r.result === "BLOCKED" || r.result === "WARNING").map(r => (
                      <div key={r.id} className={`p-2 rounded-lg border text-[11px] ${
                        r.result === "BLOCKED" ? "bg-red-500/5 border-red-500/15" :
                        r.result === "FAILED" ? "bg-orange-500/5 border-orange-500/15" :
                        "bg-amber-500/5 border-amber-500/15"
                      }`}>
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-white font-medium truncate">{r.rule_name}</span>
                          <span className={`text-[9px] font-bold ${RULE_RESULT_CONFIG[r.result]?.color || "text-gray-400"}`}>{r.result}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[9px] text-[#555]">
                          <span className={SEVERITY_CONFIG[r.severity]?.color || ""}>{r.severity}</span>
                          <span>{r.rule_category}</span>
                          {r.override_eligible && <span className="text-amber-400">Override eligible</span>}
                        </div>
                        {r.affected_text && <p className="text-[10px] text-[#666] mt-0.5 truncate">{r.affected_text}</p>}
                        {r.recommended_fix && <p className="text-[10px] text-indigo-400 mt-0.5">Fix: {r.recommended_fix}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Required Actions Panel ────────────────────────────────────────────── */}
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
                <h3 className="text-[10px] font-semibold text-[#666] uppercase tracking-wider mb-2">Required Actions</h3>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { key: "fix_content", label: "Fix Content", icon: <Pen className="w-3 h-3" />, color: "text-indigo-400" },
                    { key: "add_source", label: "Add Source", icon: <Plus className="w-3 h-3" />, color: "text-blue-400" },
                    { key: "replace_source", label: "Replace Source", icon: <RefreshCcw className="w-3 h-3" />, color: "text-blue-400" },
                    { key: "add_disclaimer", label: "Add Disclaimer", icon: <FileText className="w-3 h-3" />, color: "text-amber-400" },
                    { key: "remove_claim", label: "Remove Claim", icon: <X className="w-3 h-3" />, color: "text-red-400" },
                    { key: "adjust_tone", label: "Adjust Tone", icon: <MessageSquare className="w-3 h-3" />, color: "text-purple-400" },
                    { key: "change_formatting", label: "Change Formatting", icon: <Layers className="w-3 h-3" />, color: "text-cyan-400" },
                    { key: "send_to_review", label: "Send to Review Queue", icon: <ArrowRight className="w-3 h-3" />, color: "text-emerald-400" },
                    { key: "send_to_approvals", label: "Send to Approvals", icon: <CheckCircle2 className="w-3 h-3" />, color: "text-emerald-400" },
                  ].map(a => (
                    <button key={a.key} onClick={() => {
                      if (a.key === "send_to_review") handleAction("send_to_review", selectedItem.id);
                      else if (a.key === "send_to_approvals") handleAction("send_to_approvals", selectedItem.id);
                    }}
                      className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border border-[var(--border)] hover:border-white/20 transition-all text-[10px] font-medium ${a.color}`}>
                      {a.icon}{a.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Override Panel ────────────────────────────────────────────────────── */}
              {ruleResults.some(r => r.override_eligible) && (
                <div className="bg-[var(--card)] border border-amber-500/20 rounded-xl p-4">
                  <h3 className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Gavel className="w-3 h-3" />Override Panel
                  </h3>
                  <p className="text-[10px] text-[#666] mb-2">This item has override-eligible rules. Apply override with risk acknowledgement.</p>
                  <textarea placeholder="Override reason (required)…" value={feedbackText} onChange={e => setFeedbackText(e.target.value)}
                    className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg p-2 text-[11px] text-white placeholder-[#555] outline-none focus:border-amber-500/30 resize-none mb-2" rows={2} />
                  <div className="flex items-center gap-2 mb-2">
                    <input type="checkbox" id="risk-ack" className="rounded border-[var(--border)] bg-[var(--surface)] text-amber-500 focus:ring-amber-500" />
                    <label htmlFor="risk-ack" className="text-[10px] text-[#888]">I acknowledge the risks of this override.</label>
                  </div>
                  <button onClick={() => handleAction("revalidate", selectedItem.id)} disabled={actionLoading !== null || !feedbackText.trim()}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-white border border-amber-500/20 rounded-lg text-[10px] font-bold transition-all disabled:opacity-40">
                    <Gavel className="w-3 h-3" />Apply Override
                  </button>
                </div>
              )}

              {/* ── Validator Notes ───────────────────────────────────────────────────── */}
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
                <h3 className="text-[10px] font-semibold text-[#666] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <MessageSquare className="w-3 h-3" />Validator Notes
                  <span className="text-[9px] text-[#555] font-normal normal-case ml-auto">Internal Only</span>
                </h3>
                {notes.length === 0 ? (
                  <div className="text-center py-4 text-[#555] text-[11px]">No notes yet.</div>
                ) : (
                  <div className="space-y-2 max-h-[150px] overflow-y-auto mb-2">
                    {notes.map(note => (
                      <div key={note.id} className="p-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-medium text-white">{note.created_by}</span>
                          <span className="text-[9px] text-[#555]">{formatTimeAgo(note.created_at)}</span>
                        </div>
                        <p className="text-[11px] text-[#aaa]">{note.note_body}</p>
                        {note.replies && note.replies.length > 0 && (
                          <div className="ml-3 mt-1.5 space-y-1.5 border-l border-[var(--border)]/30 pl-2">
                            {note.replies.map(reply => (
                              <div key={reply.id} className="text-[10px] text-[#888]">
                                <span className="text-[#666]">{reply.created_by}:</span> {reply.note_body}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <input type="text" placeholder="Add a note…" value={feedbackText} onChange={e => setFeedbackText(e.target.value)}
                    className="flex-1 bg-[var(--surface)] border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-[11px] text-white placeholder-[#555] outline-none focus:border-indigo-500/30" />
                  <button onClick={handleAddNote} disabled={actionLoading === "add_note" || !feedbackText.trim()}
                    className="px-2.5 py-1.5 bg-indigo-500 hover:bg-indigo-400 text-white rounded-lg text-[10px] font-bold transition-all disabled:opacity-40">
                    <Send className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* ── Validation Timeline ───────────────────────────────────────────────── */}
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
                <h3 className="text-[10px] font-semibold text-[#666] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <History className="w-3 h-3" />Validation Timeline
                </h3>
                {timeline.length === 0 ? (
                  <div className="text-center py-4 text-[#555] text-[11px]">No timeline events yet.</div>
                ) : (
                  <div className="space-y-1.5 max-h-[180px] overflow-y-auto">
                    {timeline.map(entry => (
                      <div key={entry.id} className="flex items-start gap-2 text-[10px]">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-[#ccc] font-medium">{entry.action.replace(/_/g, " ")}</span>
                            <span className="text-[#555] whitespace-nowrap ml-2">{formatTimeAgo(entry.performed_at)}</span>
                          </div>
                          <span className="text-[#555]">by {entry.performed_by}</span>
                          {entry.previous_value && entry.new_value && (
                            <p className="text-[#555]">{entry.previous_value} → {entry.new_value}</p>
                          )}
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

// ─── Rule Result Card Component ─────────────────────────────────────────────────

function RuleResultCard({ result }: { result: RuleResult }) {
  const resConfig = RULE_RESULT_CONFIG[result.result] || { label: result.result, color: "text-gray-400" };
  const sevConfig = SEVERITY_CONFIG[result.severity] || { label: result.severity, dot: "bg-gray-400", color: "text-gray-400" };

  return (
    <div className={`p-3 bg-[var(--surface)] border rounded-xl ${
      result.result === "BLOCKED" ? "border-red-500/20" :
      result.result === "FAILED" ? "border-orange-500/20" :
      result.result === "WARNING" ? "border-amber-500/20" :
      result.result === "PASSED" ? "border-emerald-500/20" :
      result.result === "OVERRIDDEN" ? "border-amber-500/20" :
      "border-[var(--border)]"
    }`}>
      <div className="flex items-start justify-between mb-1">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-white font-medium truncate">{result.rule_name}</span>
            <span className={`text-[9px] font-bold ${resConfig.color}`}>{result.result}</span>
          </div>
          <p className="text-[9px] text-[#555] mt-0.5">{result.rule_category} · v{result.rule_version}</p>
        </div>
        <div className={`flex items-center gap-1 text-[9px] font-medium ${sevConfig.color} shrink-0`}>
          <span className={`w-1.5 h-1.5 rounded-full ${sevConfig.dot}`} />
          {sevConfig.label}
        </div>
      </div>
      {result.explanation && <p className="text-[10px] text-[#888] leading-relaxed mb-1">{result.explanation}</p>}
      {result.affected_text && (
        <div className="bg-white/3 border border-white/5 rounded-lg p-1.5 mb-1">
          <p className="text-[10px] text-rose-400/80 font-mono">&ldquo;{result.affected_text}&rdquo;</p>
        </div>
      )}
      {result.recommended_fix && (
        <p className="text-[10px] text-indigo-400">Fix: {result.recommended_fix}</p>
      )}
      <div className="flex items-center gap-3 mt-1 text-[9px] text-[#555]">
      {result.override_eligible && <span className="text-amber-400">Override Eligible</span>}
      {result.manual_check_required && <span className="text-purple-400">Manual Check Required</span>}
    </div>
  </div>
  );
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
