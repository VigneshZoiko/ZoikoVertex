"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus, Search, Filter, ChevronDown, ChevronRight, ChevronUp,
  Settings2, MoreVertical, Clock, AlertTriangle, CheckCircle2,
  XCircle, FileText, Gavel, Users, Scale, Layout, Globe,
  Smartphone, Flag, Briefcase, ShieldAlert, ShieldCheck,
  Activity, Zap, BookOpen, BookMarked, ListChecks, ArrowRight,
  Copy, TestTube, Send, Upload, Download, Eye, History,
  FileSearch, Lock, Unlock, Archive, RefreshCcw, Loader2,
  SlidersHorizontal, PanelLeft, PanelRight, X, PlusCircle,
  MinusCircle, Trash2, Edit3, Info, Split, Layers,
  Hash, CalendarDays, Tag, AlignLeft, UserCheck, Siren,
  Repeat, Ban, UserX, GitBranch, CheckSquare, Square,
  ToggleLeft, ToggleRight, ExternalLink, PanelRightClose,
  Bookmark, CircleDot, HelpCircle, Puzzle, Target,
  BarChart3, Network, Database, Fingerprint
} from "lucide-react";
import { api } from "@/lib/api";
import { useRoles } from "@/lib/hooks/useRoles";

type RuleStatus =
  | "Draft" | "Needs Review" | "Ready to Publish" | "Active"
  | "Active with Draft Changes" | "Disabled" | "Archived"
  | "Conflict Detected" | "Invalid";

type RiskLevel = "Low" | "Medium" | "High" | "Critical";
type PathType =
  | "Single" | "Sequential" | "Parallel" | "Quorum" | "Role-Based"
  | "Specialist" | "Conditional" | "Emergency" | "Executive"
  | "Multi-Stage Hybrid";
type ConflictType =
  | "Overlapping Rule" | "Contradictory Outcome" | "Missing Approver"
  | "Authority Gap" | "Circular Escalation" | "SLA Gap"
  | "Restricted Mode Gap" | "Validation Contradiction"
  | "Priority Collision" | "Post-Decision Conflict"
  | "Replacement Coverage Gap";
type AlertType =
  | "Blocking Rule Conflict" | "Restricted Mode Gap"
  | "Missing Escalation Target" | "Missing Fallback Approver"
  | "Authority Gap" | "Unpublished Changes" | "High-Risk Draft"
  | "Validation Contradiction" | "Replacement Coverage Missing";
type TabId =
  | "all" | "active" | "drafts" | "needs-review" | "conflicts"
  | "high-risk" | "restricted-mode" | "escalation-rules"
  | "disabled" | "version-history";

interface RuleScope {
  tenant?: string; workspace?: string; brand?: string; campaign?: string;
  sourceModule?: string; itemType?: string; platform?: string;
  jurisdiction?: string; language?: string; audienceSegment?: string;
  department?: string; userRole?: string; agentId?: string; workflowId?: string;
  restrictedMode?: boolean;
}

interface TriggerCondition {
  id: string; field: string; operator: string; value: string;
  logicalOperator?: "AND" | "OR";
}

interface ConditionGroup {
  id: string; conditions: TriggerCondition[]; logicalOperator: "AND" | "OR";
}

interface ApprovalStage {
  id: string; name: string; order: number; type: string;
  requiredRole?: string; requiredUser?: string; approverGroup?: string;
  quorumCount?: number; fallback?: string; escalationTarget?: string;
  slaMinutes?: number; noteRequired?: boolean;
  allowReject?: boolean; allowChanges?: boolean;
  allowConditional?: boolean; allowDelegation?: boolean;
  selfApprovalAllowed?: boolean; separationOfDuties?: boolean;
}

interface PostDecisionAction {
  decision: string; destination: string;
}

interface ApprovalRule {
  id: string;
  name: string; description: string; owner: string; priority: number;
  status: RuleStatus; riskLevel: RiskLevel;
  activeVersion?: number; draftVersion?: number;
  effectiveDate?: string; expiryDate?: string;
  tags: string[]; internalNotes?: string;
  scope: RuleScope;
  conditionGroups: ConditionGroup[];
  validationPrerequisite: string;
  pathType: PathType;
  stages: ApprovalStage[];
  authorityLevel: number;
  slaDueMinutes?: number; slaStartTrigger?: string;
  escalationTarget?: string; maxEscalationCount?: number;
  fallbackApprover?: string; fallbackRole?: string; delegationAllowed?: boolean;
  conflictOfInterestControls: string[];
  conditionalApprovalAllowed?: boolean;
  restrictedModeBehavior: string[];
  postDecisionBehavior: PostDecisionAction[];
  conflictCount: number;
  blockingConflict: boolean;
  restrictedMode: boolean;
  lastUpdated: string;
  updatedBy: string;
  createdAt: string;
  createdBy: string;
}

interface MetricCard {
  id: string; label: string; count: number; icon: any; color: string;
  filterTab?: TabId;
}

interface AlertItem {
  id: string; type: AlertType; message: string; severity: "critical" | "warning" | "info";
}

interface AuditEntry {
  id: string; action: string; actor: string; timestamp: string;
  previousValue?: string; newValue?: string; note?: string;
}

interface VersionInfo {
  id: string; versionNumber: number; changeSummary: string; publishNote?: string;
  author: string; publisher?: string; createdAt: string; publishedAt?: string;
}

const TAB_LABELS: Record<TabId, string> = {
  all: "All Rules", active: "Active", drafts: "Drafts",
  "needs-review": "Needs Review", conflicts: "Conflicts",
  "high-risk": "High Risk", "restricted-mode": "Restricted Mode",
  "escalation-rules": "Escalation Rules", disabled: "Disabled",
  "version-history": "Version History",
};

const STATUS_BADGE: Record<RuleStatus, { color: string; bg: string }> = {
  Draft: { color: "text-slate-400", bg: "bg-slate-500/10 border-slate-500/30" },
  "Needs Review": { color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/30" },
  "Ready to Publish": { color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/30" },
  Active: { color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/30" },
  "Active with Draft Changes": { color: "text-indigo-400", bg: "bg-indigo-500/10 border-indigo-500/30" },
  Disabled: { color: "text-slate-500", bg: "bg-slate-500/10 border-slate-500/30" },
  Archived: { color: "text-slate-600", bg: "bg-slate-500/5 border-slate-500/20" },
  "Conflict Detected": { color: "text-red-400", bg: "bg-red-500/10 border-red-500/30" },
  Invalid: { color: "text-rose-400", bg: "bg-rose-500/10 border-rose-500/30" },
};

const RISK_DOT: Record<RiskLevel, string> = {
  Low: "bg-emerald-400", Medium: "bg-amber-400",
  High: "bg-orange-400", Critical: "bg-red-400",
};

function mapStatus(s: string): RuleStatus {
  if (!s) return "Draft";
  const m: Record<string, RuleStatus> = {
    "DRAFT": "Draft",
    "NEEDS_REVIEW": "Needs Review",
    "READY_TO_PUBLISH": "Ready to Publish",
    "ACTIVE": "Active",
    "ACTIVE_WITH_DRAFT_CHANGES": "Active with Draft Changes",
    "DISABLED": "Disabled",
    "ARCHIVED": "Archived",
    "CONFLICT_DETECTED": "Conflict Detected",
    "INVALID": "Invalid"
  };
  return m[s] || s as RuleStatus;
}

function mapRiskLevel(r: string): RiskLevel {
  if (!r) return "Low";
  const m: Record<string, RiskLevel> = { "LOW": "Low", "MEDIUM": "Medium", "HIGH": "High", "CRITICAL": "Critical" };
  return m[r] || r as RiskLevel;
}

function mapBackendRule(r: any): ApprovalRule {
  return {
    ...r,
    id: r.id,
    name: r.rule_name || r.name || "",
    description: r.rule_description || r.description || "",
    owner: r.rule_owner_id || r.owner || "",
    priority: r.rule_priority ?? r.priority ?? 5,
    status: mapStatus(r.rule_status || r.status),
    riskLevel: mapRiskLevel(r.risk_classification || r.riskLevel),
    activeVersion: r.active_version || r.activeVersion,
    draftVersion: r.draft_version || r.draftVersion,
    effectiveDate: r.effective_at || r.effectiveDate,
    expiryDate: r.expires_at || r.expiryDate,
    tags: r.tags || [],
    internalNotes: r.internal_notes || r.internalNotes,
    scope: r.scope || r.scopes || {},
    conditionGroups: r.conditionGroups || [],
    validationPrerequisite: r.validation_prerequisite || r.validationPrerequisite || "Not Required",
    pathType: r.path_type || r.pathType || "Single",
    stages: r.stages || [],
    authorityLevel: r.authority_level ?? r.authorityLevel ?? 1,
    slaDueMinutes: r.sla_due_minutes ?? r.slaDueMinutes,
    slaStartTrigger: r.sla_start_trigger || r.slaStartTrigger,
    escalationTarget: r.escalation_target || r.escalationTarget,
    maxEscalationCount: r.max_escalation_count ?? r.maxEscalationCount,
    fallbackApprover: r.fallback_approver || r.fallbackApprover,
    fallbackRole: r.fallback_role || r.fallbackRole,
    delegationAllowed: r.delegation_allowed ?? r.delegationAllowed ?? false,
    conflictOfInterestControls: r.conflictOfInterestControls || [],
    conditionalApprovalAllowed: r.conditional_approval_allowed ?? r.conditionalApprovalAllowed ?? false,
    restrictedModeBehavior: r.restrictedModeBehavior || [],
    postDecisionBehavior: r.postDecisionBehavior || [],
    conflictCount: r.conflictCount || 0,
    blockingConflict: r.blockingConflict || false,
    restrictedMode: r.restrictedMode || false,
    lastUpdated: r.updated_at || r.lastUpdated || new Date().toISOString(),
    updatedBy: r.updated_by || r.updatedBy || "",
    createdAt: r.created_at || r.createdAt || new Date().toISOString(),
    createdBy: r.created_by || r.createdBy || "",
  };
}

const SOURCE_MODULES = ["Media Engine", "Inbox & Engagement", "AI Workflow Orchestration", "Agent Studio", "Agent Operations", "Validation Desk", "Review Queue", "Exceptions", "Content Scheduler", "Campaigns", "Integrations"];
const ITEM_TYPES = ["Social Post", "Inbox Reply", "Campaign Asset", "Agent Action", "Workflow Output", "Validation Override", "Exception Outcome", "Restricted Operation", "Compliance-Sensitive Item", "Publishing Action"];
const PLATFORMS = ["LinkedIn", "Instagram", "Facebook", "TikTok", "YouTube", "X", "Threads"];
const CONFLICT_TYPES = ["Overlapping Rule", "Contradictory Outcome", "Missing Approver", "Authority Gap", "Circular Escalation", "SLA Gap", "Restricted Mode Gap", "Validation Contradiction", "Priority Collision", "Post-Decision Conflict"];
const COI_CHECKS = ["Approver created the item", "Approver edited the item", "Approver validated the item (separation of duties)", "Approver owns the campaign (independent review required)", "Approver assigned to source workflow (independent review required)", "Approver lacks jurisdiction authority", "Approver lacks risk authority", "Approver restricted by tenant policy", "Approver already made decision in another independent stage"];
const RESTRICTED_BEHAVIORS = ["Executive Approval Required", "Legal Approval Required", "Compliance Approval Required", "No Conditional Approval", "No Delegation", "No Self-Approval", "No Bulk Approval", "Shortened SLA", "Mandatory Escalation on Timeout", "Evidence Package Required", "Final Human Confirmation", "Post-Approval Quality Audit"];
const POST_DECISIONS = ["Approved", "Rejected", "Changes Requested", "Conditional", "Escalated", "Timed Out", "Callback Failed"];
const POST_DESTINATIONS = ["Scheduler", "Publish Now", "Inbox & Engagement", "Agent Execution", "Workflow Continuation", "Quality Audit", "Archive", "Return to Owner", "Close Item", "Exceptions", "Revision", "Revalidation", "Escalation Target", "Fallback", "Pause Workflow"];

const TRIGGER_FIELDS = [
  "risk_level", "validation_status", "source_grounding_status", "claim_type",
  "platform", "inbox_sensitivity", "agent_action_mode", "campaign_type",
  "restricted_operations_mode", "exception_status", "publish_time", "self_approval_risk",
];
const OPERATORS = ["equals", "not_equals", "contains", "does_not_contain", "greater_than", "less_than", "is_empty", "is_not_empty", "exists", "does_not_exist", "before", "after", "within_time_window"];

const RECENT_THRESHOLD = Date.now() - 7 * 86400000;

const VALIDATION_OPTIONS = [
  "Not Required", "Required", "Passed Required", "Warning Allowed",
  "Passed with Override Allowed", "Manual Check Required",
  "Failed Blocks Approval", "Blocked Always Blocks Approval",
  "Revalidation Required Blocks Approval",
];

const ALERTS: AlertItem[] = [
  { id: "a1", type: "Blocking Rule Conflict", message: "High-Risk LinkedIn Post has blocking conflicts with two overlapping rules", severity: "critical" },
  { id: "a2", type: "Restricted Mode Gap", message: "No restricted-mode rule covers crisis operations for brand Zoiko", severity: "critical" },
  { id: "a3", type: "Missing Escalation Target", message: "Legal Threat Reply escalation has no target configured", severity: "warning" },
  { id: "a4", type: "Missing Fallback Approver", message: "Executive Content Review has no fallback after SLA breach", severity: "warning" },
  { id: "a5", type: "Authority Gap", message: "Compliance Review requires Level 4 authority — assigned approver has Level 3", severity: "warning" },
  { id: "a6", type: "Unpublished Changes", message: "Campaign Asset Approval has draft changes not yet published", severity: "info" },
  { id: "a7", type: "High-Risk Draft", message: "New draft rule 'Emergency Response' affects critical-risk approvals", severity: "warning" },
  { id: "a8", type: "Validation Contradiction", message: "Inbox Reply rule permits approval despite blocked validation status", severity: "critical" },
  { id: "a9", type: "Replacement Coverage Missing", message: "Cannot deactivate 'Zoiko Brand Approval' — no replacement rule covers high-risk assets", severity: "warning" },
];

function generateId(): string { return crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`; }

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ago`;
  if (h > 0) return `${h}h ago`;
  return `${m}m ago`;
}

const MOCK_UUID = () => crypto.randomUUID?.() || '00000000-0000-0000-0000-000000000000';
const MOCK_RULES: ApprovalRule[] = [
  { id: MOCK_UUID(), name: "High-Risk LinkedIn Post Approval", description: "Requires sequential approval for all high-risk LinkedIn posts", owner: "harsha@zoikovertex.com", priority: 1, status: "Active", riskLevel: "High", activeVersion: 3, scope: { sourceModule: "Media Engine", itemType: "Social Post", platform: "LinkedIn", jurisdiction: "Global" }, conditionGroups: [{ id: "cg1", conditions: [{ id: "c1", field: "risk_level", operator: "equals", value: "High", logicalOperator: "AND" }, { id: "c2", field: "platform", operator: "equals", value: "LinkedIn", logicalOperator: "AND" }], logicalOperator: "AND" }], validationPrerequisite: "Passed Required", pathType: "Sequential", stages: [{ id: "s1", name: "Manager Review", order: 1, type: "single", requiredRole: "Campaign Manager", slaMinutes: 120, allowReject: true }, { id: "s2", name: "Legal Review", order: 2, type: "single", requiredRole: "Legal", slaMinutes: 240, allowReject: true }], authorityLevel: 3, slaDueMinutes: 360, escalationTarget: "Legal Director", maxEscalationCount: 2, fallbackApprover: "legal-team@zoikovertex.com", delegationAllowed: false, conflictOfInterestControls: ["Approver created the item"], conditionalApprovalAllowed: false, restrictedModeBehavior: ["Executive Approval Required", "No Delegation"], postDecisionBehavior: [{ decision: "Approved", destination: "Publish Now" }, { decision: "Rejected", destination: "Return to Owner" }], conflictCount: 2, blockingConflict: true, restrictedMode: true, lastUpdated: "2026-05-20T10:30:00Z", updatedBy: "harsha@zoikovertex.com", createdAt: "2026-03-01T08:00:00Z", createdBy: "admin@zoikovertex.com", tags: ["high-risk", "linkedin", "legal"] },
  { id: MOCK_UUID(), name: "Legal Threat Inbox Reply", description: "Routes legal-threat inbox replies to legal team for approval", owner: "naresh@zoikovertex.com", priority: 2, status: "Active", riskLevel: "Critical", activeVersion: 2, scope: { sourceModule: "Inbox & Engagement", itemType: "Inbox Reply", platform: "All", jurisdiction: "Global" }, conditionGroups: [{ id: "cg2", conditions: [{ id: "c3", field: "inbox_sensitivity", operator: "contains", value: "legal threat,harassment", logicalOperator: "AND" }], logicalOperator: "AND" }], validationPrerequisite: "Passed Required", pathType: "Sequential", stages: [{ id: "s3", name: "Inbox Manager", order: 1, type: "single", requiredRole: "Inbox Manager", slaMinutes: 60 }, { id: "s4", name: "Legal Review", order: 2, type: "single", requiredRole: "Legal", slaMinutes: 120 }], authorityLevel: 4, slaDueMinutes: 180, escalationTarget: "Head of Legal", maxEscalationCount: 1, fallbackApprover: "legal-team@zoikovertex.com", delegationAllowed: true, conflictOfInterestControls: [], conditionalApprovalAllowed: true, restrictedModeBehavior: ["Legal Approval Required", "Mandatory Escalation on Timeout"], postDecisionBehavior: [{ decision: "Approved", destination: "Inbox & Engagement" }, { decision: "Escalated", destination: "Exceptions" }], conflictCount: 0, blockingConflict: false, restrictedMode: false, lastUpdated: "2026-05-18T14:00:00Z", updatedBy: "naresh@zoikovertex.com", createdAt: "2026-02-15T09:00:00Z", createdBy: "naresh@zoikovertex.com", tags: ["legal", "inbox", "threat"] },
  { id: MOCK_UUID(), name: "Campaign Asset Compliance Review", description: "All campaign assets require compliance review before publishing", owner: "harsha@zoikovertex.com", priority: 3, status: "Draft", riskLevel: "Medium", draftVersion: 1, scope: { sourceModule: "Campaigns", itemType: "Campaign Asset", platform: "All" }, conditionGroups: [{ id: "cg3", conditions: [{ id: "c4", field: "campaign_type", operator: "equals", value: "paid,public", logicalOperator: "AND" }], logicalOperator: "AND" }], validationPrerequisite: "Warning Allowed", pathType: "Parallel", stages: [{ id: "s5", name: "Compliance Review", order: 1, type: "parallel", requiredRole: "Compliance", slaMinutes: 240 }, { id: "s6", name: "Brand Review", order: 2, type: "parallel", requiredRole: "Brand Manager", slaMinutes: 240 }], authorityLevel: 3, slaDueMinutes: 480, escalationTarget: "Compliance Director", maxEscalationCount: 2, fallbackApprover: "compliance-team@zoikovertex.com", delegationAllowed: true, conflictOfInterestControls: ["Approver owns the campaign (independent review required)"], conditionalApprovalAllowed: true, restrictedModeBehavior: [], postDecisionBehavior: [{ decision: "Approved", destination: "Scheduler" }, { decision: "Rejected", destination: "Return to Owner" }], conflictCount: 0, blockingConflict: false, restrictedMode: false, lastUpdated: "2026-05-21T08:00:00Z", updatedBy: "harsha@zoikovertex.com", createdAt: "2026-05-21T08:00:00Z", createdBy: "harsha@zoikovertex.com", tags: ["compliance", "campaign"] },
  { id: MOCK_UUID(), name: "Restricted Mode Emergency Protocol", description: "Elevated approval path when restricted operations mode is active", owner: "admin@zoikovertex.com", priority: 1, status: "Needs Review", riskLevel: "Critical", draftVersion: 1, scope: { restrictedMode: true, sourceModule: "All", itemType: "Restricted Operation", platform: "All" }, conditionGroups: [{ id: "cg4", conditions: [{ id: "c5", field: "restricted_operations_mode", operator: "equals", value: "active", logicalOperator: "AND" }], logicalOperator: "AND" }], validationPrerequisite: "Passed Required", pathType: "Executive", stages: [{ id: "s7", name: "Executive Approval", order: 1, type: "single", requiredRole: "Executive", slaMinutes: 30 }, { id: "s8", name: "Legal Confirmation", order: 2, type: "single", requiredRole: "Legal Director", slaMinutes: 60 }], authorityLevel: 5, slaDueMinutes: 90, escalationTarget: "CEO", maxEscalationCount: 1, fallbackApprover: "exec-team@zoikovertex.com", delegationAllowed: false, conflictOfInterestControls: ["Approver restricted by tenant policy"], conditionalApprovalAllowed: false, restrictedModeBehavior: ["Executive Approval Required", "Legal Approval Required", "No Delegation", "No Self-Approval", "Shortened SLA", "Mandatory Escalation on Timeout", "Evidence Package Required", "Final Human Confirmation"], postDecisionBehavior: [{ decision: "Approved", destination: "Agent Execution" }, { decision: "Timed Out", destination: "Exceptions" }], conflictCount: 0, blockingConflict: false, restrictedMode: true, lastUpdated: "2026-05-20T16:00:00Z", updatedBy: "admin@zoikovertex.com", createdAt: "2026-05-19T10:00:00Z", createdBy: "admin@zoikovertex.com", tags: ["restricted", "emergency", "executive"] },
  { id: MOCK_UUID(), name: "Self-Approval Block — All Modules", description: "Blocks self-approval across all source modules", owner: "harsha@zoikovertex.com", priority: 5, status: "Active", riskLevel: "Medium", activeVersion: 1, scope: { sourceModule: "All", itemType: "All", platform: "All" }, conditionGroups: [{ id: "cg5", conditions: [{ id: "c6", field: "self_approval_risk", operator: "equals", value: "true", logicalOperator: "AND" }], logicalOperator: "AND" }], validationPrerequisite: "Not Required", pathType: "Single", stages: [{ id: "s9", name: "Independent Approver", order: 1, type: "single", requiredRole: "Reviewer", selfApprovalAllowed: false, separationOfDuties: true }], authorityLevel: 2, delegationAllowed: false, conflictOfInterestControls: ["Approver created the item", "Approver edited the item"], conditionalApprovalAllowed: false, restrictedModeBehavior: ["No Self-Approval"], postDecisionBehavior: [{ decision: "Approved", destination: "Workflow Continuation" }, { decision: "Rejected", destination: "Return to Owner" }], conflictCount: 1, blockingConflict: false, restrictedMode: false, lastUpdated: "2026-05-15T11:00:00Z", updatedBy: "harsha@zoikovertex.com", createdAt: "2026-04-01T08:00:00Z", createdBy: "harsha@zoikovertex.com", tags: ["self-approval", "independence"] },
  { id: MOCK_UUID(), name: "AI Agent Action — High Risk", description: "Approval required for high-risk semi-autonomous agent actions", owner: "naresh@zoikovertex.com", priority: 2, status: "Conflict Detected", riskLevel: "High", activeVersion: 1, draftVersion: 1, scope: { sourceModule: "Agent Studio", itemType: "Agent Action", platform: "All" }, conditionGroups: [{ id: "cg6", conditions: [{ id: "c7", field: "agent_action_mode", operator: "equals", value: "semi-autonomous,autonomous", logicalOperator: "AND" }, { id: "c8", field: "risk_level", operator: "equals", value: "High,Critical", logicalOperator: "AND" }], logicalOperator: "AND" }], validationPrerequisite: "Failed Blocks Approval", pathType: "Multi-Stage Hybrid", stages: [{ id: "s10", name: "Agent Manager", order: 1, type: "single", requiredRole: "Agent Manager", slaMinutes: 60 }, { id: "s11", name: "Compliance Review", order: 2, type: "single", requiredRole: "Compliance", slaMinutes: 120 }, { id: "s12", name: "Executive Sign-Off", order: 3, type: "quorum", requiredRole: "Executive", quorumCount: 2, slaMinutes: 240 }], authorityLevel: 4, slaDueMinutes: 420, escalationTarget: "VP of Operations", maxEscalationCount: 2, fallbackApprover: "ops-team@zoikovertex.com", delegationAllowed: true, conflictOfInterestControls: ["Approver assigned to source workflow (independent review required)"], conditionalApprovalAllowed: true, restrictedModeBehavior: ["Executive Approval Required", "No Bulk Approval"], postDecisionBehavior: [{ decision: "Approved", destination: "Agent Execution" }, { decision: "Conditional", destination: "Revision" }], conflictCount: 3, blockingConflict: true, restrictedMode: false, lastUpdated: "2026-05-19T09:00:00Z", updatedBy: "naresh@zoikovertex.com", createdAt: "2026-04-10T08:00:00Z", createdBy: "naresh@zoikovertex.com", tags: ["agent", "ai", "high-risk"] },
  { id: MOCK_UUID(), name: "Zoiko Brand Approval", description: "All brand-sensitive content requires brand manager approval", owner: "admin@zoikovertex.com", priority: 1, status: "Active", riskLevel: "High", activeVersion: 5, scope: { brand: "Zoiko", sourceModule: "All", itemType: "Social Post,Campaign Asset,Inbox Reply", platform: "All" }, conditionGroups: [{ id: "cg7", conditions: [{ id: "c9", field: "risk_level", operator: "equals", value: "High,Critical", logicalOperator: "AND" }], logicalOperator: "AND" }], validationPrerequisite: "Warning Allowed", pathType: "Sequential", stages: [{ id: "s13", name: "Brand Manager", order: 1, type: "single", requiredRole: "Brand Manager", slaMinutes: 180 }, { id: "s14", name: "Legal Review", order: 2, type: "single", requiredRole: "Legal", slaMinutes: 360 }], authorityLevel: 3, slaDueMinutes: 540, escalationTarget: "Brand Director", maxEscalationCount: 2, fallbackApprover: "brand-team@zoikovertex.com", delegationAllowed: true, conflictOfInterestControls: ["Approver edited the item"], conditionalApprovalAllowed: true, restrictedModeBehavior: [], postDecisionBehavior: [{ decision: "Approved", destination: "Publish Now" }, { decision: "Changes Requested", destination: "Revision" }], conflictCount: 0, blockingConflict: false, restrictedMode: false, lastUpdated: "2026-05-17T13:00:00Z", updatedBy: "admin@zoikovertex.com", createdAt: "2026-01-10T08:00:00Z", createdBy: "admin@zoikovertex.com", tags: ["brand", "zoiko", "legal"] },
  { id: MOCK_UUID(), name: "Legacy — EU Market Approval", description: "Deprecated — use new regional rules instead", owner: "legacy@zoikovertex.com", priority: 10, status: "Disabled", riskLevel: "Medium", activeVersion: 2, scope: { jurisdiction: "EU", sourceModule: "All", itemType: "Social Post", platform: "LinkedIn,Instagram,Facebook" }, conditionGroups: [{ id: "cg8", conditions: [{ id: "c10", field: "platform", operator: "equals", value: "LinkedIn,Instagram,Facebook" }], logicalOperator: "AND" }], validationPrerequisite: "Required", pathType: "Sequential", stages: [{ id: "s15", name: "Regional Manager", order: 1, type: "single", requiredRole: "Regional Manager" }], authorityLevel: 2, delegationAllowed: true, conflictOfInterestControls: [], conditionalApprovalAllowed: false, restrictedModeBehavior: [], postDecisionBehavior: [{ decision: "Approved", destination: "Publish Now" }], conflictCount: 0, blockingConflict: false, restrictedMode: false, lastUpdated: "2026-04-01T08:00:00Z", updatedBy: "admin@zoikovertex.com", createdAt: "2025-11-01T08:00:00Z", createdBy: "admin@zoikovertex.com", tags: ["legacy", "eu"] },
];

const MOCK_AUDIT: AuditEntry[] = [
  { id: "au1", action: "Rule Created", actor: "admin@zoikovertex.com", timestamp: "2026-05-19T10:00:00Z", note: "Initial draft created" },
  { id: "au2", action: "Scope Changed", actor: "admin@zoikovertex.com", timestamp: "2026-05-19T11:00:00Z", previousValue: "sourceModule=Media Engine", newValue: "sourceModule=All", note: "Expanded scope to all modules" },
  { id: "au3", action: "Conflict Detected", actor: "System", timestamp: "2026-05-19T12:00:00Z", note: "Overlapping rule detected with r1" },
  { id: "au4", action: "Submitted for Review", actor: "admin@zoikovertex.com", timestamp: "2026-05-20T16:00:00Z", note: "Ready for governance review" },
  { id: "au5", action: "Simulation Run", actor: "harsha@zoikovertex.com", timestamp: "2026-05-20T17:00:00Z", note: "Tested with Restricted Operation item type" },
];

const MOCK_VERSIONS: VersionInfo[] = [
  { id: "v1", versionNumber: 1, changeSummary: "Initial creation", author: "admin@zoikovertex.com", createdAt: "2026-03-01T08:00:00Z", publishedAt: "2026-03-02T08:00:00Z" },
  { id: "v2", versionNumber: 2, changeSummary: "Added legal review stage", author: "harsha@zoikovertex.com", createdAt: "2026-04-10T10:00:00Z", publishedAt: "2026-04-11T10:00:00Z", publisher: "harsha@zoikovertex.com" },
  { id: "v3", versionNumber: 3, changeSummary: "Updated SLA from 4h to 6h, added fallback", author: "harsha@zoikovertex.com", createdAt: "2026-05-20T10:30:00Z", publishedAt: "2026-05-20T11:00:00Z", publisher: "admin@zoikovertex.com" },
];

// FIX: Moved outside ApprovalRulesPage to prevent remount on every parent render
function TooltipBtn({ disabled, tooltip, children }: { disabled: boolean; tooltip: string; children: React.ReactNode }) {
  return (
    <div className="group relative">
      {children}
      {disabled && (
        <div className="absolute top-full mt-1 right-0 bg-[#1a1a1a] border border-[#2d2d2d] rounded-lg px-2 py-1.5 text-[9px] text-[#888] whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-50 shadow-xl max-w-44">
          {tooltip}
        </div>
      )}
    </div>
  );
}

function CollapsibleSection({ title, icon: Icon, defaultOpen = false, children, badge }: { title: string; icon: any; defaultOpen?: boolean; children: React.ReactNode; badge?: string | number }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-[#2d2d2d] rounded-xl overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-4 py-3 bg-[#161616] hover:bg-[#1a1a1a] transition-colors">
        <div className="flex items-center gap-2.5">
          <Icon className="w-4 h-4 text-indigo-400" />
          <span className="text-sm font-semibold text-white">{title}</span>
          {/* FIX: also guard against empty string to avoid rendering an empty badge chip */}
          {badge !== undefined && badge !== "" && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-medium">{badge}</span>
          )}
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
      </button>
      {open && <div className="p-4 space-y-3 bg-black/40">{children}</div>}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{label}</label>
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder, className = "", ...props }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string; [key: string]: any }) {
  return (
    <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className={`w-full bg-black/60 border border-[#2d2d2d] rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 transition-colors ${className}`} {...props} />
  );
}

function Select({ value, onChange, options, className = "" }: { value: string; onChange: (v: string) => void; options: string[]; className?: string }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      className={`w-full bg-black/60 border border-[#2d2d2d] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-colors appearance-none ${className}`}>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function Badge({ label, color, bg }: { label: string; color?: string; bg?: string }) {
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-md border font-medium whitespace-nowrap ${color || "text-slate-400"} ${bg || "bg-slate-500/10 border-slate-500/20"}`}>
      {label}
    </span>
  );
}

function EmptyState({ title, body, action, onAction }: { title: string; body: string; action?: string; onAction?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <ListChecks className="w-12 h-12 text-slate-700 mb-4" />
      <h3 className="text-lg font-semibold text-slate-400 mb-2">{title}</h3>
      <p className="text-sm text-slate-600 max-w-md mb-6">{body}</p>
      {action && onAction && (
        <button onClick={onAction} className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" /> {action}
        </button>
      )}
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <AlertTriangle className="w-12 h-12 text-red-400 mb-4" />
      <h3 className="text-lg font-semibold text-white mb-2">Error</h3>
      <p className="text-sm text-slate-400 mb-6">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="flex items-center gap-2 px-5 py-2.5 bg-red-600/20 border border-red-500/30 text-red-400 rounded-xl text-sm font-medium hover:bg-red-600/30 transition-colors">
          <RefreshCcw className="w-4 h-4" /> Try Again
        </button>
      )}
    </div>
  );
}

export default function ApprovalRulesPage() {
  const { role: currentRole, isSuperAdmin } = useRoles();
  const canManageRules = isSuperAdmin || ['GOVERNANCE_ADMIN', 'ADMIN', 'WORKSPACE_OWNER'].includes(currentRole ?? '');

  const [rules, setRules] = useState<ApprovalRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<TabId>("all");
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null);
  const [showLeftPanel, setShowLeftPanel] = useState(true);
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterSourceModule, setFilterSourceModule] = useState<string>("");
  const [filterItemType, setFilterItemType] = useState<string>("");
  const [filterPlatform, setFilterPlatform] = useState<string>("");
  const [filterRiskLevel, setFilterRiskLevel] = useState<string>("");
  const [alertDismissed, setAlertDismissed] = useState<Set<string>>(new Set());
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set());
  const [ruleVersions, setRuleVersions] = useState<VersionInfo[]>([]);
  const [ruleAuditLog, setRuleAuditLog] = useState<AuditEntry[]>([]);
  const [ruleConflicts, setRuleConflicts] = useState<any[]>([]);
  const [simulationResult, setSimulationResult] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const selectedRule = rules.find(r => r.id === selectedRuleId) || null;

  const fetchRules = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.get("/api/v1/governance/rules");
      if (result.success && Array.isArray(result.data)) {
        setRules(result.data.map(mapBackendRule));
        return;
      }
      setRules([]);
      setError(result?.error || 'Failed to load rules');
    } catch {
      setRules(MOCK_RULES);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRules(); }, [fetchRules]);

  const dismissAlert = (id: string) => {
    const next = new Set(alertDismissed);
    next.add(id);
    setAlertDismissed(next);
  };

  const visibleAlerts = ALERTS.filter(a => !alertDismissed.has(a.id));

  const filteredRules = rules.filter(rule => {
    const q = search.toLowerCase();
    if (q) {
      const match = rule.name.toLowerCase().includes(q) || rule.description.toLowerCase().includes(q) ||
        rule.owner.toLowerCase().includes(q) || rule.tags.some(t => t.toLowerCase().includes(q)) ||
        Object.values(rule.scope).some(v => typeof v === "string" && v.toLowerCase().includes(q));
      if (!match) return false;
    }
    switch (activeTab) {
      case "active": return rule.status === "Active" || rule.status === "Active with Draft Changes";
      case "drafts": return rule.status === "Draft";
      case "needs-review": return rule.status === "Needs Review";
      case "conflicts": return rule.status === "Conflict Detected" || rule.blockingConflict;
      case "high-risk": return rule.riskLevel === "High" || rule.riskLevel === "Critical";
      case "restricted-mode": return rule.restrictedMode;
      case "escalation-rules": return !!rule.escalationTarget;
      case "disabled": return rule.status === "Disabled" || rule.status === "Archived";
      case "version-history": return true;
      default: return true;
    }
  }).filter(rule => {
    if (filterStatus && rule.status !== filterStatus) return false;
    if (filterSourceModule && rule.scope.sourceModule !== filterSourceModule && rule.scope.sourceModule !== "All") return false;
    if (filterItemType && rule.scope.itemType !== filterItemType && rule.scope.itemType !== "All") return false;
    if (filterPlatform && rule.scope.platform !== filterPlatform && rule.scope.platform !== "All") return false;
    if (filterRiskLevel && rule.riskLevel !== filterRiskLevel) return false;
    return true;
  });

  const metricCards: MetricCard[] = [
    { id: "m1", label: "Active Rules", count: rules.filter(r => r.status === "Active" || r.status === "Active with Draft Changes").length, icon: ShieldCheck, color: "text-emerald-400", filterTab: "active" },
    { id: "m2", label: "Draft Rules", count: rules.filter(r => r.status === "Draft").length, icon: FileText, color: "text-slate-400", filterTab: "drafts" },
    { id: "m3", label: "Needs Review", count: rules.filter(r => r.status === "Needs Review").length, icon: Clock, color: "text-amber-400", filterTab: "needs-review" },
    { id: "m4", label: "Conflicts Detected", count: rules.filter(r => r.blockingConflict || r.status === "Conflict Detected").length, icon: AlertTriangle, color: "text-red-400", filterTab: "conflicts" },
    { id: "m5", label: "High-Risk Rules", count: rules.filter(r => r.riskLevel === "High" || r.riskLevel === "Critical").length, icon: ShieldAlert, color: "text-orange-400", filterTab: "high-risk" },
    { id: "m6", label: "Restricted Mode Rules", count: rules.filter(r => r.restrictedMode).length, icon: Lock, color: "text-purple-400", filterTab: "restricted-mode" },
    { id: "m7", label: "Rules Updated Recently", count: rules.filter(r => new Date(r.lastUpdated) > new Date(RECENT_THRESHOLD)).length, icon: Activity, color: "text-blue-400" },
    { id: "m8", label: "Disabled Rules", count: rules.filter(r => r.status === "Disabled" || r.status === "Archived").length, icon: XCircle, color: "text-slate-600", filterTab: "disabled" },
  ];

  const buildNewRule = () => {
    const newRule: ApprovalRule = {
      id: generateId(), name: "", description: "", owner: "", priority: 5,
      status: "Draft", riskLevel: "Medium", draftVersion: 1,
      scope: {}, conditionGroups: [], validationPrerequisite: "Not Required",
      pathType: "Single", stages: [], authorityLevel: 1,
      conflictOfInterestControls: [], restrictedModeBehavior: [],
      postDecisionBehavior: [], conflictCount: 0, blockingConflict: false,
      restrictedMode: false, lastUpdated: new Date().toISOString(),
      updatedBy: "", createdAt: new Date().toISOString(), createdBy: "",
      tags: [],
    };
    setRules(prev => [newRule, ...prev]);
    setSelectedRuleId(newRule.id);
    setActiveTab("drafts");
  };

  const saveRuleFields = async (ruleId: string): Promise<boolean> => {
    const rule = rules.find(r => r.id === ruleId);
    if (!rule) return false;
    try {
      const res = await api.patch(`/api/v1/governance/rules/${ruleId}`, {
        rule_name: rule.name,
        rule_description: rule.description || "",
        rule_owner_id: rule.owner || "",
        rule_priority: rule.priority,
        risk_classification: rule.riskLevel.toUpperCase(),
        tags: rule.tags || [],
        effective_at: rule.effectiveDate || null,
        expires_at: rule.expiryDate || null,
      });
      return !!(res.success && res.data);
    } catch {
      return false;
    }
  };

  const handleCreate = async () => {
    try {
      setSaving(true);
      const res = await api.post("/api/v1/governance/rules", {
        rule_name: "New Approval Rule",
        rule_description: "",
        rule_priority: 5,
        risk_classification: "MEDIUM",
        tags: [],
      });
      if (res.success && res.data) {
        const mapped = mapBackendRule(res.data);
        mapped.conditionGroups = [];
        mapped.stages = [];
        mapped.authorityLevel = 1;
        mapped.conflictOfInterestControls = [];
        mapped.restrictedModeBehavior = [];
        mapped.postDecisionBehavior = [];
        setRules(prev => [mapped, ...prev]);
        setSelectedRuleId(mapped.id);
        setActiveTab("drafts");
        return;
      }
    } catch {
      // fallback to local creation
    } finally {
      setSaving(false);
    }
    buildNewRule();
  };

  const handleClone = async (sourceId: string) => {
    try {
      const res = await api.post(`/api/v1/governance/rules/${sourceId}/clone`, {});
      if (res.success && res.data) {
        const mapped = mapBackendRule(res.data);
        setRules(prev => [mapped, ...prev]);
        setSelectedRuleId(mapped.id);
        setActiveTab("drafts");
        return;
      }
    } catch {
      // fallback to local clone
    }
    const source = rules.find(r => r.id === sourceId);
    if (source) {
      const cloned: ApprovalRule = { ...source, id: generateId(), name: `${source.name} (Clone)`, status: "Draft", draftVersion: 1, activeVersion: undefined, conflictCount: 0, blockingConflict: false, lastUpdated: new Date().toISOString(), createdAt: new Date().toISOString() };
      setRules(prev => [cloned, ...prev]);
      setSelectedRuleId(cloned.id);
      setActiveTab("drafts");
    }
  };

  const handleSubmitForReview = async (ruleId: string) => {
    await saveRuleFields(ruleId);
    try {
      const res = await api.post(`/api/v1/governance/rules/${ruleId}/submit-review`, {});
      if (res.success && res.data) {
        setRules(prev => prev.map(r => r.id === ruleId ? { ...r, status: "Needs Review" as RuleStatus } : r));
      }
    } catch {
      // keep local state
    }
  };

  const handlePublish = async (ruleId: string) => {
    await saveRuleFields(ruleId);
    try {
      const res = await api.post(`/api/v1/governance/rules/${ruleId}/publish`, { publish_note: "" });
      if (res.success && res.data) {
        setRules(prev => prev.map(r => r.id === ruleId ? mapBackendRule(res.data) : r));
      }
    } catch {
      // keep local state
    }
  };

  const handleDeactivate = async (ruleId: string) => {
    await saveRuleFields(ruleId);
    try {
      const res = await api.post(`/api/v1/governance/rules/${ruleId}/deactivate`, {});
      if (res.success && res.data) {
        setRules(prev => prev.map(r => r.id === ruleId ? { ...r, status: "Disabled" as RuleStatus } : r));
      }
    } catch {
      // keep local state
    }
  };

  const handleReactivate = async (ruleId: string) => {
    try {
      const res = await api.post(`/api/v1/governance/rules/${ruleId}/reactivate`, {});
      if (res.success && res.data) {
        setRules(prev => prev.map(r => r.id === ruleId ? { ...r, status: "Active" as RuleStatus } : r));
      }
    } catch {
      // keep local state
    }
  };

  const handleArchive = async (ruleId: string) => {
    try {
      const res = await api.post(`/api/v1/governance/rules/${ruleId}/archive`, {});
      if (res.success && res.data) {
        setRules(prev => prev.map(r => r.id === ruleId ? { ...r, status: "Archived" as RuleStatus } : r));
      }
    } catch {
      // keep local state
    }
  };

  const fetchRuleVersions = useCallback(async (ruleId: string) => {
    try {
      const res = await api.get(`/api/v1/governance/rules/${ruleId}/versions`);
      if (res.success && Array.isArray(res.data)) {
        setRuleVersions(res.data.map((v: any) => ({
          id: v.id,
          versionNumber: v.version_number || v.versionNumber,
          changeSummary: v.change_summary || v.changeSummary || "",
          publishNote: v.publish_note || v.publishNote,
          author: v.author_id || v.author || "",
          publisher: v.publisher_id || v.publisher,
          createdAt: v.created_at || v.createdAt || v.performed_at || "",
          publishedAt: v.published_at || v.publishedAt || "",
        })));
      }
    } catch {
      // keep existing state
    }
  }, []);

  const fetchAuditLog = useCallback(async (ruleId: string) => {
    try {
      const res = await api.get(`/api/v1/governance/rules/${ruleId}/audit-log`);
      if (res.success && Array.isArray(res.data)) {
        setRuleAuditLog(res.data.map((a: any) => ({
          id: a.id || Math.random().toString(36),
          action: a.action || "",
          actor: a.performed_by || a.actor || "",
          timestamp: a.performed_at || a.timestamp || "",
          previousValue: a.previous_value ? (typeof a.previous_value === "object" ? JSON.stringify(a.previous_value) : String(a.previous_value)) : undefined,
          newValue: a.new_value ? (typeof a.new_value === "object" ? JSON.stringify(a.new_value) : String(a.new_value)) : undefined,
          note: a.reason_note || a.note,
        })));
      }
    } catch {
      // keep existing state
    }
  }, []);

  const handleRunSimulation = async (ruleId: string) => {
    try {
      setSimulationResult(null);
      const res = await api.post(`/api/v1/governance/rules/${ruleId}/simulate`, {
        source_module: "",
        item_type: "",
        platform: "",
        risk_level: "",
        validation_status: "",
      });
      if (res.success && res.data) {
        setSimulationResult(res.data);
      }
    } catch {
      // keep existing state
    }
  };

  const handleHeaderAction = (action: string) => {
    if (action === "create") handleCreate();
    if (action === "clone" && selectedRuleId) handleClone(selectedRuleId);
  };

  useEffect(() => {
    if (!selectedRuleId) {
      setRuleVersions([]);
      setRuleAuditLog([]);
      setRuleConflicts([]);
      setSimulationResult(null);
      return;
    }
    fetchRuleVersions(selectedRuleId);
    fetchAuditLog(selectedRuleId);
  }, [selectedRuleId, fetchRuleVersions, fetchAuditLog]);

  if (loading && rules.length === 0) {
    return (
      <div className="p-8 max-w-7xl mx-auto bg-black min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
          <span className="text-sm text-slate-500 font-medium">Loading Approval Rules...</span>
        </div>
      </div>
    );
  }

  if (error && rules.length === 0) {
    return (
      <div className="p-8 max-w-7xl mx-auto bg-black min-h-screen">
        <ErrorState message={error} onRetry={fetchRules} />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-[1600px] mx-auto bg-black min-h-screen">
      {/* Header */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Approval Rules</h1>
            <p className="text-sm text-slate-500 mt-1 max-w-2xl">Define, test, activate, version, and audit the approval-routing rules that control who must approve content, replies, campaigns, AI agent actions, workflow outputs, and restricted operations.</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {saving && <span className="text-[10px] text-indigo-400 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Saving...</span>}
            {canManageRules && (
              <button onClick={() => handleHeaderAction("create")} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors">
                <Plus className="w-4 h-4" /> Create Rule
              </button>
            )}
            <TooltipBtn disabled={!selectedRuleId} tooltip="Test this rule against sample content">
              <button onClick={() => selectedRuleId && handleRunSimulation(selectedRuleId)} disabled={!selectedRuleId}
                className="flex items-center gap-2 px-3 py-2 bg-[#161616] border border-[#2d2d2d] rounded-lg text-sm text-slate-300 hover:text-white hover:border-slate-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                <TestTube className="w-4 h-4" /> Test
              </button>
            </TooltipBtn>
            {canManageRules && (
              <TooltipBtn disabled={!selectedRuleId || !(selectedRule?.status === "Draft" || selectedRule?.status === "Conflict Detected")} tooltip="Submit this rule for governance review">
                <button onClick={() => selectedRuleId && handleSubmitForReview(selectedRuleId)} disabled={!selectedRuleId || !(selectedRule?.status === "Draft" || selectedRule?.status === "Conflict Detected")}
                  className="flex items-center gap-2 px-3 py-2 bg-[#161616] border border-[#2d2d2d] rounded-lg text-sm text-slate-300 hover:text-white hover:border-slate-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                  <Send className="w-4 h-4" /> Submit
                </button>
              </TooltipBtn>
            )}
            {canManageRules && (
              <TooltipBtn disabled={!selectedRuleId || selectedRule?.status === "Active"} tooltip="Publish the current version of this rule">
                <button onClick={() => selectedRuleId && handlePublish(selectedRuleId)} disabled={!selectedRuleId || selectedRule?.status === "Active"}
                  className="flex items-center gap-2 px-3 py-2 bg-[#161616] border border-[#2d2d2d] rounded-lg text-sm text-slate-300 hover:text-white hover:border-slate-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                  <Upload className="w-4 h-4" /> Publish
                </button>
              </TooltipBtn>
            )}
            {canManageRules && (
              <TooltipBtn disabled={!selectedRuleId} tooltip="Clone this rule">
                <button onClick={() => selectedRuleId && handleHeaderAction("clone")} disabled={!selectedRuleId}
                  className="flex items-center gap-2 px-3 py-2 bg-[#161616] border border-[#2d2d2d] rounded-lg text-sm text-slate-300 hover:text-white hover:border-slate-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-slate-300 disabled:hover:border-[#2d2d2d]">
                  <Copy className="w-4 h-4" /> Clone
                </button>
              </TooltipBtn>
            )}
            {canManageRules && (
              <TooltipBtn disabled={!selectedRuleId || selectedRule?.status !== "Active"} tooltip="Deactivate this active rule">
                <button onClick={() => selectedRuleId && handleDeactivate(selectedRuleId)} disabled={!selectedRuleId || selectedRule?.status !== "Active"}
                  className="flex items-center gap-2 px-3 py-2 bg-[#161616] border border-[#2d2d2d] rounded-lg text-sm text-slate-300 hover:text-white hover:border-slate-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                  <Ban className="w-4 h-4" /> Deactivate
                </button>
              </TooltipBtn>
            )}
            <TooltipBtn disabled={true} tooltip="Export rule configuration">
              <button disabled
                className="flex items-center gap-2 px-3 py-2 bg-[#161616] border border-[#2d2d2d] rounded-lg text-sm text-slate-500 cursor-not-allowed">
                <Download className="w-4 h-4" /> Export
              </button>
            </TooltipBtn>
            <TooltipBtn disabled={!selectedRuleId} tooltip="View full audit log for this rule">
              <button onClick={() => { if (selectedRuleId) { fetchAuditLog(selectedRuleId); } }} disabled={!selectedRuleId}
                className="flex items-center gap-2 px-3 py-2 bg-[#161616] border border-[#2d2d2d] rounded-lg text-sm text-slate-300 hover:text-white hover:border-slate-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                <History className="w-4 h-4" /> Audit Log
              </button>
            </TooltipBtn>
            <TooltipBtn disabled={true} tooltip="Admin only: configure rule settings">
              <button disabled className="p-2 bg-[#161616] border border-[#2d2d2d] rounded-lg text-slate-500 cursor-not-allowed">
                <Settings2 className="w-4 h-4" />
              </button>
            </TooltipBtn>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {metricCards.map(m => (
            <button key={m.id} onClick={() => m.filterTab && setActiveTab(m.filterTab)}
              className="bg-[#161616] border border-[#2d2d2d] rounded-xl p-3 hover:border-indigo-500/30 hover:bg-[#1a1a1a] transition-all text-left group">
              <div className="flex items-center gap-2 mb-1.5">
                <m.icon className={`w-3.5 h-3.5 ${m.color}`} />
                <span className="text-[10px] text-slate-500 font-medium truncate">{m.label}</span>
              </div>
              <span className="text-xl font-bold text-white">{m.count}</span>
            </button>
          ))}
        </div>

        {/* Alert Strip */}
        {visibleAlerts.length > 0 && (
          <div className="space-y-1.5">
            {visibleAlerts.map(a => (
              <div key={a.id} className={`flex items-center justify-between px-4 py-2 rounded-lg border text-sm ${
                a.severity === "critical" ? "bg-red-500/5 border-red-500/20 text-red-400" :
                a.severity === "warning" ? "bg-amber-500/5 border-amber-500/20 text-amber-400" :
                "bg-blue-500/5 border-blue-500/20 text-blue-400"
              }`}>
                <div className="flex items-center gap-2.5">
                  {a.severity === "critical" ? <AlertTriangle className="w-4 h-4 shrink-0" /> :
                   a.severity === "warning" ? <AlertTriangle className="w-4 h-4 shrink-0" /> :
                   <Info className="w-4 h-4 shrink-0" />}
                  <span className="text-xs font-medium">{a.message}</span>
                </div>
                <button onClick={() => dismissAlert(a.id)} className="p-1 hover:bg-white/5 rounded transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Tabs & Search */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1 overflow-x-auto max-w-full pb-1">
            {(Object.entries(TAB_LABELS) as [TabId, string][]).map(([id, label]) => (
              <button key={id} onClick={() => setActiveTab(id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  activeTab === id ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30" : "text-slate-500 hover:text-slate-300 border border-transparent"
                }`}>
                {label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search rules..."
                className="w-56 bg-[#161616] border border-[#2d2d2d] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 transition-colors" />
            </div>
            <button onClick={() => setShowFilters(!showFilters)} className={`p-1.5 rounded-lg border transition-colors ${showFilters ? "bg-indigo-600/20 border-indigo-500/30 text-indigo-400" : "bg-[#161616] border-[#2d2d2d] text-slate-500 hover:text-white"}`}>
              <SlidersHorizontal className="w-4 h-4" />
            </button>
            <button onClick={() => setShowLeftPanel(!showLeftPanel)} className="p-1.5 bg-[#161616] border border-[#2d2d2d] rounded-lg text-slate-500 hover:text-white transition-colors">
              <PanelLeft className="w-4 h-4" />
            </button>
            <button onClick={() => setShowRightPanel(!showRightPanel)} className="p-1.5 bg-[#161616] border border-[#2d2d2d] rounded-lg text-slate-500 hover:text-white transition-colors">
              <PanelRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter Drawer */}
        {showFilters && (
          <div className="bg-[#161616] border border-[#2d2d2d] rounded-xl p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <Field label="Status">
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-full bg-black/60 border border-[#2d2d2d] rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500/50">
                <option value="">All</option>
                {["Draft", "Needs Review", "Ready to Publish", "Active", "Active with Draft Changes", "Disabled", "Archived", "Conflict Detected"].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Source Module">
              <select value={filterSourceModule} onChange={e => setFilterSourceModule(e.target.value)} className="w-full bg-black/60 border border-[#2d2d2d] rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500/50">
                <option value="">All</option>
                {SOURCE_MODULES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Item Type">
              <select value={filterItemType} onChange={e => setFilterItemType(e.target.value)} className="w-full bg-black/60 border border-[#2d2d2d] rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500/50">
                <option value="">All</option>
                {ITEM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Platform">
              <select value={filterPlatform} onChange={e => setFilterPlatform(e.target.value)} className="w-full bg-black/60 border border-[#2d2d2d] rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500/50">
                <option value="">All</option>
                {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </Field>
            <Field label="Risk Level">
              <select value={filterRiskLevel} onChange={e => setFilterRiskLevel(e.target.value)} className="w-full bg-black/60 border border-[#2d2d2d] rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500/50">
                <option value="">All</option>
                {["Low", "Medium", "High", "Critical"].map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </Field>
            <div className="flex items-end">
              <button onClick={() => { setFilterStatus(""); setFilterSourceModule(""); setFilterItemType(""); setFilterPlatform(""); setFilterRiskLevel(""); }} className="w-full px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors">
                Clear Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3-Panel Layout */}
      <div className="flex gap-4 items-start">
        {/* Left Panel — Rule List */}
        {showLeftPanel && (
          <div className="w-80 shrink-0 space-y-3">
            <div className="flex items-center justify-between pr-1">
              <span className="text-xs text-slate-500 font-medium">{filteredRules.length} rules</span>
              <button onClick={() => { setBulkMode(!bulkMode); setBulkSelected(new Set()); }}
                className={`p-1 rounded transition-colors text-xs ${bulkMode ? "text-indigo-400 bg-indigo-500/10" : "text-slate-500 hover:text-white"}`}
                title="Toggle bulk selection">
                <ListChecks className="w-3.5 h-3.5 inline" /> {bulkMode ? "Exit Bulk" : "Bulk"}
              </button>
            </div>
            {bulkMode && bulkSelected.size > 0 && (
              <div className="flex items-center gap-2 p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                <span className="text-[10px] text-indigo-300 font-semibold whitespace-nowrap">{bulkSelected.size} selected</span>
                <div className="flex gap-1 ml-auto">
                  <button onClick={() => { setBulkSelected(new Set()); setBulkMode(false); }} className="px-2 py-1 text-[9px] font-bold text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-all">Cancel</button>
                  <button onClick={() => setBulkSelected(new Set())} className="px-2 py-1 text-[9px] font-bold text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-all">Deselect</button>
                  <button onClick={() => { Array.from(bulkSelected).forEach(id => { const r = rules.find(x => x.id === id); if (r) setSelectedRuleId(r.id); }); setBulkMode(false); setBulkSelected(new Set()); }} className="px-2 py-1 text-[9px] font-bold text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-all">Open</button>
                </div>
              </div>
            )}
            <div className="max-h-[calc(100vh-240px)] overflow-y-auto space-y-2 pr-1">
            {filteredRules.length === 0 ? (
              <div className="bg-[#161616] border border-[#2d2d2d] rounded-xl p-6">
                {activeTab === "active" ? (
                  <EmptyState title="No active approval rules" body="Published rules will appear here once activated." action="Create Rule" onAction={handleCreate} />
                ) : activeTab === "drafts" ? (
                  <EmptyState title="No draft rules" body="Draft rules that are being edited will appear here. Create a new rule to get started." action="Create Rule" onAction={handleCreate} />
                ) : activeTab === "needs-review" ? (
                  <EmptyState title="No rules awaiting review" body="Rules submitted for review will appear here until approved or sent back for changes." />
                ) : activeTab === "high-risk" ? (
                  <EmptyState title="No high-risk rules" body="Rules classified as High or Critical risk will appear here for focused governance attention." />
                ) : activeTab === "restricted-mode" ? (
                  <EmptyState title="No restricted-mode rules" body="Rules with restricted operations behavior enabled will appear here." />
                ) : activeTab === "escalation-rules" ? (
                  <EmptyState title="No escalation rules" body="Rules that trigger escalation when approval conditions are not met will appear here." />
                ) : activeTab === "disabled" ? (
                  <EmptyState title="No disabled rules" body="Deactivated, archived, or expired rules will appear here." />
                ) : activeTab === "version-history" ? (
                  <EmptyState title="No version history" body="Versioned rules with draft changes or published updates will appear here." />
                ) : activeTab === "conflicts" ? (
                  <EmptyState title="No rule conflicts detected" body="Rules with overlapping scope, missing approvers, authority gaps, or contradictory behavior will appear here." />
                ) : (
                  <EmptyState title="No approval rules created" body="Create approval rules to control who must approve content, replies, campaigns, AI agent actions, workflow outputs, and restricted operations before they proceed." action="Create Rule" onAction={handleCreate} />
                )}
              </div>
            ) : (
              filteredRules.map(rule => {
                const sb = STATUS_BADGE[rule.status as keyof typeof STATUS_BADGE] || STATUS_BADGE.Draft;

                return (
                  <div key={rule.id} onClick={() => {
                      if (bulkMode) {
                        const n = new Set(bulkSelected);
                        if (n.has(rule.id)) n.delete(rule.id); else n.add(rule.id);
                        setBulkSelected(n);
                      } else {
                        setSelectedRuleId(rule.id);
                      }
                    }}
                    className={`w-full text-left bg-[#161616] border rounded-xl p-3.5 transition-all hover:border-indigo-500/30 space-y-2 cursor-pointer ${
                      selectedRuleId === rule.id && !bulkMode ? "border-indigo-500/40 bg-[#1a1a2e]" : bulkSelected.has(rule.id) ? "border-indigo-500/30 bg-indigo-500/5" : "border-[#2d2d2d]"
                    }`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {bulkMode && (
                            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all ${bulkSelected.has(rule.id) ? "bg-indigo-500 border-indigo-500" : "border-[#555]"}`}>
                              {bulkSelected.has(rule.id) && <CheckCircle2 className="w-3 h-3 text-white" />}
                            </div>
                          )}
                          <span className="text-sm font-semibold text-white truncate">{rule.name || "Untitled Rule"}</span>
                          {rule.restrictedMode && <Lock className="w-3 h-3 text-purple-400 shrink-0" />}
                          {rule.blockingConflict && <AlertTriangle className="w-3 h-3 text-red-400 shrink-0" />}
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge label={rule.status} color={sb.color} bg={sb.bg} />
                          {rule.riskLevel === "High" && <Badge label="High Risk" color="text-orange-400" bg="bg-orange-500/10 border-orange-500/30" />}
                          {rule.riskLevel === "Critical" && <Badge label="Critical" color="text-red-400" bg="bg-red-500/10 border-red-500/30" />}
                          {rule.stages?.some(s => s.separationOfDuties) && <Badge label="Separation" color="text-cyan-400" bg="bg-cyan-500/10 border-cyan-500/30" />}
                          {rule.activeVersion && <Badge label={`v${rule.activeVersion}`} color="text-emerald-400" bg="bg-emerald-500/10 border-emerald-500/30" />}
                          {rule.draftVersion && <Badge label={`draft v${rule.draftVersion}`} color="text-amber-400" bg="bg-amber-500/10 border-amber-500/30" />}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-600">
                      <span>{rule.owner?.split("@")[0] ?? "Unknown"}</span>
                      <span>·</span>
                      <span>{rule.pathType}</span>
                      {rule.scope?.sourceModule && <><span>·</span><span>{rule.scope.sourceModule}</span></>}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-600">
                      <Clock className="w-3 h-3" />
                      <span>{timeAgo(rule.lastUpdated)}</span>
                      {rule.conflictCount > 0 && <><span>·</span><span className="text-red-400">{rule.conflictCount} conflict{rule.conflictCount > 1 ? "s" : ""}</span></>}
                    </div>
                    <div className="flex items-center gap-1 pt-1 border-t border-[#2d2d2d]">
                      <button onClick={(e) => { e.stopPropagation(); setSelectedRuleId(rule.id); }} className="p-1 rounded text-slate-600 hover:text-white hover:bg-slate-800 transition-colors" title="Open Rule">
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); handleClone(rule.id); }} className="p-1 rounded text-slate-600 hover:text-white hover:bg-slate-800 transition-colors" title="Clone">
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); handleRunSimulation(rule.id); }} className="p-1 rounded text-slate-600 hover:text-white hover:bg-slate-800 transition-colors" title="Test">
                        <TestTube className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); handleSubmitForReview(rule.id); }} className="p-1 rounded text-slate-600 hover:text-amber-400 hover:bg-slate-800 transition-colors" title="Submit for Review">
                        <Send className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); fetchAuditLog(rule.id); }} className="p-1 rounded text-slate-600 hover:text-red-400 hover:bg-slate-800 transition-colors" title="View Audit Log">
                        <History className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); handleDeactivate(rule.id); }} className="p-1 rounded text-slate-600 hover:text-rose-400 hover:bg-slate-800 transition-colors" title="Deactivate">
                        <Ban className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
            </div>
          </div>
        )}

        {/* Center Panel — Rule Builder */}
        <div className="flex-1 min-w-0 space-y-4 max-h-[calc(100vh-180px)] overflow-y-auto">
          {!selectedRule ? (
            <div className="bg-[#161616] border border-[#2d2d2d] rounded-xl p-8">
              <EmptyState title="Select an approval rule" body="Choose a rule from the left panel to view and edit its configuration." action="Create Rule" onAction={handleCreate} />
            </div>
          ) : (
            <>
              {/* Rule Header */}
              <div className="bg-[#161616] border border-[#2d2d2d] rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full ${selectedRule.status === "Active" || selectedRule.status === "Active with Draft Changes" ? "bg-emerald-500" : selectedRule.status === "Draft" ? "bg-slate-500" : selectedRule.status === "Conflict Detected" ? "bg-red-500" : "bg-amber-500"}`} />
                    <h2 className="text-lg font-bold text-white">{selectedRule.name || "Untitled Rule"}</h2>
                    <Badge label={selectedRule.status} color={STATUS_BADGE[selectedRule.status].color} bg={STATUS_BADGE[selectedRule.status].bg} />
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    {selectedRule.activeVersion && <span>Active v{selectedRule.activeVersion}</span>}
                    {selectedRule.draftVersion && <span>· Draft v{selectedRule.draftVersion}</span>}
                    <span>· {selectedRule.owner}</span>
                    <span>· P{selectedRule.priority}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-600">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Updated {timeAgo(selectedRule.lastUpdated)}</span>
                  <span className="flex items-center gap-1"><UserCheck className="w-3 h-3" /> {selectedRule.updatedBy}</span>
                  {selectedRule.blockingConflict && <span className="flex items-center gap-1 text-red-400"><AlertTriangle className="w-3 h-3" /> Blocking Conflict</span>}
                  {selectedRule.restrictedMode && <span className="flex items-center gap-1 text-purple-400"><Lock className="w-3 h-3" /> Restricted Mode</span>}
                </div>
              </div>

              {/* Collapsible Builder Sections */}
              <div className="space-y-2">
                <CollapsibleSection title="Rule Identity" icon={FileText} defaultOpen>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="Rule Name *"><Input value={selectedRule.name} onChange={v => setRules(prev => prev.map(r => r.id === selectedRule.id ? { ...r, name: v } : r))} placeholder="e.g., High-Risk LinkedIn Post Approval" /></Field>
                    <Field label="Description *"><textarea value={selectedRule.description} onChange={e => setRules(prev => prev.map(r => r.id === selectedRule.id ? { ...r, description: e.target.value } : r))} placeholder="Describe when this rule applies..." className="w-full bg-black/60 border border-[#2d2d2d] rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 transition-colors h-20 resize-none" /></Field>
                    <Field label="Owner *"><Input value={selectedRule.owner} onChange={v => setRules(prev => prev.map(r => r.id === selectedRule.id ? { ...r, owner: v } : r))} placeholder="user@domain.com" /></Field>
                    <Field label="Priority *"><input type="number" min={1} max={99} value={selectedRule.priority} onChange={e => setRules(prev => prev.map(r => r.id === selectedRule.id ? { ...r, priority: parseInt(e.target.value) || 1 } : r))} className="w-full bg-black/60 border border-[#2d2d2d] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50" /></Field>
                    <Field label="Risk Classification">
                      <select value={selectedRule.riskLevel} onChange={e => setRules(prev => prev.map(r => r.id === selectedRule.id ? { ...r, riskLevel: e.target.value as RiskLevel } : r))} className="w-full bg-black/60 border border-[#2d2d2d] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50">
                        {["Low", "Medium", "High", "Critical"].map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </Field>
                    <Field label="Status"><div className="text-sm text-slate-400 py-2 px-3 bg-black/40 rounded-lg border border-[#2d2d2d]">{selectedRule.status} (system-managed)</div></Field>
                    <Field label="Effective Date"><input type="date" value={selectedRule.effectiveDate || ""} onChange={e => setRules(prev => prev.map(r => r.id === selectedRule.id ? { ...r, effectiveDate: e.target.value } : r))} className="w-full bg-black/60 border border-[#2d2d2d] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50" /></Field>
                    <Field label="Expiry Date"><input type="date" value={selectedRule.expiryDate || ""} onChange={e => setRules(prev => prev.map(r => r.id === selectedRule.id ? { ...r, expiryDate: e.target.value } : r))} className="w-full bg-black/60 border border-[#2d2d2d] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50" /></Field>
                    <Field label="Tags"><Input value={selectedRule.tags.join(", ")} onChange={v => setRules(prev => prev.map(r => r.id === selectedRule.id ? { ...r, tags: v.split(",").map(t => t.trim()).filter(Boolean) } : r))} placeholder="comma-separated tags" /></Field>
                    <Field label="Internal Notes"><textarea value={selectedRule.internalNotes || ""} onChange={e => setRules(prev => prev.map(r => r.id === selectedRule.id ? { ...r, internalNotes: e.target.value } : r))} placeholder="Internal notes..." className="w-full bg-black/60 border border-[#2d2d2d] rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 transition-colors h-20 resize-none" /></Field>
                  </div>
                </CollapsibleSection>

                <CollapsibleSection title="Rule Scope" icon={Globe}>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {(["tenant", "workspace", "brand", "campaign", "sourceModule", "itemType", "platform", "jurisdiction", "language", "audienceSegment", "department", "userRole", "agentId", "workflowId"] as (keyof RuleScope)[]).map(key => (
                      <Field key={key} label={key.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase())}>
                        <Input value={(selectedRule.scope[key] as string) || ""} onChange={v => setRules(prev => prev.map(r => r.id === selectedRule.id ? { ...r, scope: { ...r.scope, [key]: v } } : r))} placeholder={`Enter ${key}`} />
                      </Field>
                    ))}
                    <Field label="Restricted Mode">
                      <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer py-2">
                        <input type="checkbox" checked={selectedRule.scope.restrictedMode || false} onChange={e => setRules(prev => prev.map(r => r.id === selectedRule.id ? { ...r, scope: { ...r.scope, restrictedMode: e.target.checked }, restrictedMode: e.target.checked } : r))} className="rounded border-[#2d2d2d] bg-black/60 text-indigo-500 focus:ring-indigo-500/30" />
                        <span>Applies during Restricted Operations Mode</span>
                      </label>
                    </Field>
                  </div>
                </CollapsibleSection>

                <CollapsibleSection title="Trigger Conditions" icon={Zap} badge={selectedRule.conditionGroups.reduce((a, g) => a + g.conditions.length, 0)}>
                  {selectedRule.conditionGroups.map((group, gi) => (
                    <div key={group.id} className="space-y-2 p-3 bg-black/40 rounded-lg border border-[#2d2d2d]">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-slate-500 uppercase">Condition Group {gi + 1}</span>
                        <button onClick={() => setRules(prev => prev.map(r => r.id === selectedRule.id ? { ...r, conditionGroups: r.conditionGroups.filter(g => g.id !== group.id) } : r))} className="p-1 rounded text-slate-600 hover:text-red-400">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {group.conditions.map((cond, ci) => (
                        <div key={cond.id} className="flex items-center gap-2">
                          {ci === 0 ? <span className="text-[10px] text-slate-600 w-10 shrink-0">When</span> :
                            <select value={group.logicalOperator} onChange={e => setRules(prev => prev.map(r => r.id === selectedRule.id ? { ...r, conditionGroups: r.conditionGroups.map(g => g.id === group.id ? { ...g, logicalOperator: e.target.value as "AND" | "OR" } : g) } : r))} className="w-14 bg-black/60 border border-[#2d2d2d] rounded text-[10px] text-white px-1 py-1 shrink-0">
                              <option>AND</option><option>OR</option>
                            </select>}
                          <select value={cond.field} onChange={e => setRules(prev => prev.map(r => r.id === selectedRule.id ? { ...r, conditionGroups: r.conditionGroups.map(g => g.id === group.id ? { ...g, conditions: g.conditions.map(c => c.id === cond.id ? { ...c, field: e.target.value } : c) } : g) } : r))} className="flex-1 bg-black/60 border border-[#2d2d2d] rounded text-xs text-white px-2 py-1.5">
                            {TRIGGER_FIELDS.map(f => <option key={f} value={f}>{f.replace(/_/g, " ")}</option>)}
                          </select>
                          <select value={cond.operator} onChange={e => setRules(prev => prev.map(r => r.id === selectedRule.id ? { ...r, conditionGroups: r.conditionGroups.map(g => g.id === group.id ? { ...g, conditions: g.conditions.map(c => c.id === cond.id ? { ...c, operator: e.target.value } : c) } : g) } : r))} className="w-28 bg-black/60 border border-[#2d2d2d] rounded text-xs text-white px-2 py-1.5">
                            {OPERATORS.map(o => <option key={o} value={o}>{o.replace(/_/g, " ")}</option>)}
                          </select>
                          <input value={cond.value} onChange={e => setRules(prev => prev.map(r => r.id === selectedRule.id ? { ...r, conditionGroups: r.conditionGroups.map(g => g.id === group.id ? { ...g, conditions: g.conditions.map(c => c.id === cond.id ? { ...c, value: e.target.value } : c) } : g) } : r))} placeholder="value" className="flex-1 bg-black/60 border border-[#2d2d2d] rounded text-xs text-white px-2 py-1.5 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50" />
                          <button onClick={() => setRules(prev => prev.map(r => r.id === selectedRule.id ? { ...r, conditionGroups: r.conditionGroups.map(g => g.id === group.id ? { ...g, conditions: g.conditions.filter(c => c.id !== cond.id) } : g) } : r))} className="p-1 text-slate-600 hover:text-red-400">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                      <button onClick={() => setRules(prev => prev.map(r => r.id === selectedRule.id ? { ...r, conditionGroups: r.conditionGroups.map(g => g.id === group.id ? { ...g, conditions: [...g.conditions, { id: generateId(), field: "risk_level", operator: "equals", value: "", logicalOperator: "AND" }] } : g) } : r))} className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                        <PlusCircle className="w-3.5 h-3.5" /> Add Condition
                      </button>
                    </div>
                  ))}
                  <button onClick={() => setRules(prev => prev.map(r => r.id === selectedRule.id ? { ...r, conditionGroups: [...r.conditionGroups, { id: generateId(), conditions: [{ id: generateId(), field: "risk_level", operator: "equals", value: "", logicalOperator: "AND" }], logicalOperator: "AND" }] } : r))} className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                    <PlusCircle className="w-3.5 h-3.5" /> Add Condition Group
                  </button>
                </CollapsibleSection>

                <CollapsibleSection title="Validation Prerequisites" icon={CheckCircle2}>
                  <Field label="Validation Requirement">
                    <select value={selectedRule.validationPrerequisite} onChange={e => setRules(prev => prev.map(r => r.id === selectedRule.id ? { ...r, validationPrerequisite: e.target.value } : r))} className="w-full bg-black/60 border border-[#2d2d2d] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50">
                      {VALIDATION_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </Field>
                  <p className="text-[10px] text-slate-600">Non-negotiable: Blocked and stale validation always blocks approval.</p>
                </CollapsibleSection>

                <CollapsibleSection title="Approval Path" icon={Layers} badge={selectedRule.pathType}>
                  <Field label="Path Type">
                    <select value={selectedRule.pathType} onChange={e => setRules(prev => prev.map(r => r.id === selectedRule.id ? { ...r, pathType: e.target.value as PathType } : r))} className="w-full bg-black/60 border border-[#2d2d2d] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50">
                      {["Single", "Sequential", "Parallel", "Quorum", "Role-Based", "Specialist", "Conditional", "Emergency", "Executive", "Multi-Stage Hybrid"].map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </Field>
                </CollapsibleSection>

                <CollapsibleSection title="Approval Stages" icon={GitBranch} badge={selectedRule.stages.length}>
                  {selectedRule.stages.map((stage, si) => (
                    <div key={stage.id} className="p-3 bg-black/40 rounded-lg border border-[#2d2d2d] space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-slate-500 uppercase">Stage {si + 1}</span>
                        <button onClick={() => setRules(prev => prev.map(r => r.id === selectedRule.id ? { ...r, stages: r.stages.filter(s => s.id !== stage.id) } : r))} className="p-1 text-slate-600 hover:text-red-400">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        <Field label="Name"><Input value={stage.name} onChange={v => setRules(prev => prev.map(r => r.id === selectedRule.id ? { ...r, stages: r.stages.map(s => s.id === stage.id ? { ...s, name: v } : s) } : r))} placeholder="Stage name" /></Field>
                        <Field label="Type"><Select value={stage.type} onChange={v => setRules(prev => prev.map(r => r.id === selectedRule.id ? { ...r, stages: r.stages.map(s => s.id === stage.id ? { ...s, type: v } : s) } : r))} options={["single", "parallel", "quorum", "role", "specialist"]} /></Field>
                        <Field label="Required Role"><Input value={stage.requiredRole || ""} onChange={v => setRules(prev => prev.map(r => r.id === selectedRule.id ? { ...r, stages: r.stages.map(s => s.id === stage.id ? { ...s, requiredRole: v } : s) } : r))} placeholder="e.g., Legal" /></Field>
                        <Field label="SLA (min)"><input type="number" value={stage.slaMinutes || ""} onChange={e => setRules(prev => prev.map(r => r.id === selectedRule.id ? { ...r, stages: r.stages.map(s => s.id === stage.id ? { ...s, slaMinutes: parseInt(e.target.value) || 0 } : s) } : r))} className="bg-black/60 border border-[#2d2d2d] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50 w-full" /></Field>
                        <Field label="Quorum Count"><input type="number" value={stage.quorumCount || ""} onChange={e => setRules(prev => prev.map(r => r.id === selectedRule.id ? { ...r, stages: r.stages.map(s => s.id === stage.id ? { ...s, quorumCount: parseInt(e.target.value) || 0 } : s) } : r))} className="bg-black/60 border border-[#2d2d2d] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50 w-full" /></Field>
                        <Field label="Escalation Target"><Input value={stage.escalationTarget || ""} onChange={v => setRules(prev => prev.map(r => r.id === selectedRule.id ? { ...r, stages: r.stages.map(s => s.id === stage.id ? { ...s, escalationTarget: v } : s) } : r))} placeholder="user/role" /></Field>
                        <Field label="Fallback"><Input value={stage.fallback || ""} onChange={v => setRules(prev => prev.map(r => r.id === selectedRule.id ? { ...r, stages: r.stages.map(s => s.id === stage.id ? { ...s, fallback: v } : s) } : r))} placeholder="fallback approver" /></Field>
                        <Field label="Self-Approval">
                          <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer py-2">
                            <input type="checkbox" checked={!stage.selfApprovalAllowed} onChange={e => setRules(prev => prev.map(r => r.id === selectedRule.id ? { ...r, stages: r.stages.map(s => s.id === stage.id ? { ...s, selfApprovalAllowed: !e.target.checked } : s) } : r))} className="rounded border-[#2d2d2d] bg-black/60 text-indigo-500 focus:ring-indigo-500/30" />
                            <span>Block Self-Approval</span>
                          </label>
                        </Field>
                        <Field label="Separation of Duties">
                          <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer py-2">
                            <input type="checkbox" checked={stage.separationOfDuties || false} onChange={e => setRules(prev => prev.map(r => r.id === selectedRule.id ? { ...r, stages: r.stages.map(s => s.id === stage.id ? { ...s, separationOfDuties: e.target.checked } : s) } : r))} className="rounded border-[#2d2d2d] bg-black/60 text-indigo-500 focus:ring-indigo-500/30" />
                            <span>Require Separation of Duties</span>
                          </label>
                        </Field>
                        <Field label="Note Required"><label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer py-2"><input type="checkbox" checked={stage.noteRequired || false} onChange={e => setRules(prev => prev.map(r => r.id === selectedRule.id ? { ...r, stages: r.stages.map(s => s.id === stage.id ? { ...s, noteRequired: e.target.checked } : s) } : r))} className="rounded border-[#2d2d2d] bg-black/60 text-indigo-500 focus:ring-indigo-500/30" /><span>Decision note required</span></label></Field>
                        <Field label="Delegation"><label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer py-2"><input type="checkbox" checked={!stage.allowDelegation} onChange={e => setRules(prev => prev.map(r => r.id === selectedRule.id ? { ...r, stages: r.stages.map(s => s.id === stage.id ? { ...s, allowDelegation: !e.target.checked } : s) } : r))} className="rounded border-[#2d2d2d] bg-black/60 text-indigo-500 focus:ring-indigo-500/30" /><span>Block Delegation</span></label></Field>
                      </div>
                    </div>
                  ))}
                  <button onClick={() => setRules(prev => prev.map(r => r.id === selectedRule.id ? { ...r, stages: [...r.stages, { id: generateId(), name: "", order: r.stages.length + 1, type: "single", slaMinutes: 60 }] } : r))} className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                    <PlusCircle className="w-3.5 h-3.5" /> Add Stage
                  </button>
                </CollapsibleSection>

                <CollapsibleSection title="Approver Authority" icon={Scale} badge={`Level ${selectedRule.authorityLevel}`}>
                  <Field label="Authority Level">
                    <select value={selectedRule.authorityLevel} onChange={e => setRules(prev => prev.map(r => r.id === selectedRule.id ? { ...r, authorityLevel: parseInt(e.target.value) } : r))} className="w-full bg-black/60 border border-[#2d2d2d] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50">
                      <option value={1}>Level 1 — Routine Content</option>
                      <option value={2}>Level 2 — Campaign & Public-Facing</option>
                      <option value={3}>Level 3 — Compliance/Legal/Regulated/High-Risk</option>
                      <option value={4}>Level 4 — Executive-Sensitive/Critical-Risk</option>
                      <option value={5}>Level 5 — Restricted Mode/Emergency/Crisis/Autonomous</option>
                    </select>
                  </Field>
                </CollapsibleSection>

                <CollapsibleSection title="SLA and Escalation" icon={Clock}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="SLA Due (minutes)"><input type="number" value={selectedRule.slaDueMinutes || ""} onChange={e => setRules(prev => prev.map(r => r.id === selectedRule.id ? { ...r, slaDueMinutes: parseInt(e.target.value) || 0 } : r))} className="w-full bg-black/60 border border-[#2d2d2d] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50" /></Field>
                    <Field label="SLA Start Trigger"><select value={selectedRule.slaStartTrigger || ""} onChange={e => setRules(prev => prev.map(r => r.id === selectedRule.id ? { ...r, slaStartTrigger: e.target.value } : r))} className="w-full bg-black/60 border border-[#2d2d2d] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50"><option value="">Select trigger</option><option>approval request created</option><option>item assigned</option><option>previous stage completed</option><option>validation passed</option><option>restricted mode activated</option></select></Field>
                    <Field label="Escalation Target"><Input value={selectedRule.escalationTarget || ""} onChange={v => setRules(prev => prev.map(r => r.id === selectedRule.id ? { ...r, escalationTarget: v } : r))} placeholder="user or role" /></Field>
                    <Field label="Max Escalation Count"><input type="number" value={selectedRule.maxEscalationCount || ""} onChange={e => setRules(prev => prev.map(r => r.id === selectedRule.id ? { ...r, maxEscalationCount: parseInt(e.target.value) || 0 } : r))} className="w-full bg-black/60 border border-[#2d2d2d] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50" /></Field>
                    <Field label="Fallback Approver"><Input value={selectedRule.fallbackApprover || ""} onChange={v => setRules(prev => prev.map(r => r.id === selectedRule.id ? { ...r, fallbackApprover: v } : r))} placeholder="fallback@domain.com" /></Field>
                    <Field label="Fallback Role"><Input value={selectedRule.fallbackRole || ""} onChange={v => setRules(prev => prev.map(r => r.id === selectedRule.id ? { ...r, fallbackRole: v } : r))} placeholder="e.g., Legal Director" /></Field>
                  </div>
                </CollapsibleSection>

                <CollapsibleSection title="Fallback and Delegation" icon={Repeat}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="Fallback Approver"><Input value={selectedRule.fallbackApprover || ""} onChange={v => setRules(prev => prev.map(r => r.id === selectedRule.id ? { ...r, fallbackApprover: v } : r))} placeholder="fallback@domain.com" /></Field>
                    <Field label="Fallback Role"><Input value={selectedRule.fallbackRole || ""} onChange={v => setRules(prev => prev.map(r => r.id === selectedRule.id ? { ...r, fallbackRole: v } : r))} placeholder="e.g., Legal Director" /></Field>
                    <Field label="Delegation">
                      <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer py-2">
                        <input type="checkbox" checked={selectedRule.delegationAllowed || false} onChange={e => setRules(prev => prev.map(r => r.id === selectedRule.id ? { ...r, delegationAllowed: e.target.checked } : r))} className="rounded border-[#2d2d2d] bg-black/60 text-indigo-500 focus:ring-indigo-500/30" />
                        <span>Allow Delegation</span>
                      </label>
                    </Field>
                  </div>
                </CollapsibleSection>

                <CollapsibleSection title="Conflict-of-Interest Controls" icon={UserX} badge={selectedRule.conflictOfInterestControls.length}>
                  <div className="grid grid-cols-1 gap-2">
                    {COI_CHECKS.map(coi => {
                      const checked = selectedRule.conflictOfInterestControls.includes(coi);
                      return (
                        <label key={coi} className="flex items-start gap-2.5 text-sm text-slate-300 cursor-pointer">
                          <input type="checkbox" checked={checked} onChange={e => setRules(prev => prev.map(r => r.id === selectedRule.id ? {
                            ...r, conflictOfInterestControls: e.target.checked ? [...r.conflictOfInterestControls, coi] : r.conflictOfInterestControls.filter(c => c !== coi)
                          } : r))} className="mt-0.5 rounded border-[#2d2d2d] bg-black/60 text-indigo-500 focus:ring-indigo-500/30" />
                          {coi}
                        </label>
                      );
                    })}
                  </div>
                </CollapsibleSection>

                <CollapsibleSection title="Conditional Approval" icon={HelpCircle}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { key: "conditionalApprovalAllowed", label: "Allow Conditional Approval" },
                      { key: "requireConditionOwner", label: "Require Condition Owner" },
                      { key: "requireConditionDueDate", label: "Require Condition Due Date" },
                      { key: "requireRiskAcknowledgement", label: "Require Risk Acknowledgement" },
                      { key: "allowProgressionBeforeCompletion", label: "Allow Progression Before Condition Completion" },
                      { key: "blockProgressionUntilCompletion", label: "Block Progression Until Condition Completion" },
                      { key: "routeCompletionToValidation", label: "Route Completion to Validation Desk" },
                    ].map(({ key, label }) => (
                      <label key={key} className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                        <input type="checkbox" checked={false} readOnly className="rounded border-[#2d2d2d] bg-black/60 text-indigo-500 focus:ring-indigo-500/30" />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>
                </CollapsibleSection>

                <CollapsibleSection title="Restricted Mode Behavior" icon={Lock} badge={selectedRule.restrictedModeBehavior.length}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {RESTRICTED_BEHAVIORS.map(behavior => {
                      const checked = selectedRule.restrictedModeBehavior.includes(behavior);
                      return (
                        <label key={behavior} className="flex items-start gap-2.5 text-sm text-slate-300 cursor-pointer">
                          <input type="checkbox" checked={checked} onChange={e => setRules(prev => prev.map(r => r.id === selectedRule.id ? {
                            ...r, restrictedModeBehavior: e.target.checked ? [...r.restrictedModeBehavior, behavior] : r.restrictedModeBehavior.filter(b => b !== behavior)
                          } : r))} className="mt-0.5 rounded border-[#2d2d2d] bg-black/60 text-indigo-500 focus:ring-indigo-500/30" />
                          {behavior}
                        </label>
                      );
                    })}
                  </div>
                </CollapsibleSection>

                <CollapsibleSection title="Post-Decision Behavior" icon={ArrowRight}>
                  <div className="grid grid-cols-1 gap-2">
                    {selectedRule.postDecisionBehavior.map((pdb, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-[10px] font-semibold text-slate-500 w-28 shrink-0">{pdb.decision}:</span>
                        <select value={pdb.destination} onChange={e => setRules(prev => prev.map(r => r.id === selectedRule.id ? {
                          ...r, postDecisionBehavior: r.postDecisionBehavior.map((p, pi) => pi === i ? { ...p, destination: e.target.value } : p)
                        } : r))} className="flex-1 bg-black/60 border border-[#2d2d2d] rounded text-xs text-white px-2 py-1.5">
                          {POST_DESTINATIONS.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </div>
                    ))}
                    {POST_DECISIONS.filter(d => !selectedRule.postDecisionBehavior.some(p => p.decision === d)).map(decision => (
                      <button key={decision} onClick={() => setRules(prev => prev.map(r => r.id === selectedRule.id ? { ...r, postDecisionBehavior: [...r.postDecisionBehavior, { decision, destination: "Archive" }] } : r))} className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                        <PlusCircle className="w-3.5 h-3.5" /> Add behavior for &quot;{decision}&quot;
                      </button>
                    ))}
                  </div>
                </CollapsibleSection>

                <CollapsibleSection title="Simulation and Test Cases" icon={TestTube}>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
                    <Field label="Item Type"><Select value="" onChange={() => {}} options={ITEM_TYPES} /></Field>
                    <Field label="Source Module"><Select value="" onChange={() => {}} options={SOURCE_MODULES} /></Field>
                    <Field label="Platform"><Select value="" onChange={() => {}} options={PLATFORMS} /></Field>
                    <Field label="Risk Level"><Select value="" onChange={() => {}} options={["Low", "Medium", "High", "Critical"]} /></Field>
                    <Field label="Validation Status"><Select value="" onChange={() => {}} options={["Passed", "Warning", "Failed", "Blocked", "Stale"]} /></Field>
                    <Field label="Restricted Mode"><Select value="" onChange={() => {}} options={["Inactive", "Active"]} /></Field>
                  </div>
                  <button onClick={() => handleRunSimulation(selectedRule.id)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium transition-colors">
                    <TestTube className="w-3.5 h-3.5" /> Run Simulation
                  </button>
                  <div className="mt-3 p-3 bg-black/40 rounded-lg border border-[#2d2d2d]">
                    <div className="text-xs text-slate-500 font-medium">Simulation will not create real approval items.</div>
                  </div>
                </CollapsibleSection>

                {/* FIX: pass undefined instead of "" so the empty-string badge is never shown */}
                <CollapsibleSection title="Version and Publishing" icon={Upload} badge={selectedRule.activeVersion ? `v${selectedRule.activeVersion}` : undefined}>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => handlePublish(selectedRule.id)} disabled={selectedRule.status === "Active"} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-2">
                        <Upload className="w-3.5 h-3.5" /> Publish
                      </button>
                      <button onClick={() => handleClone(selectedRule.id)} className="px-4 py-2 bg-[#161616] border border-[#2d2d2d] rounded-lg text-xs text-slate-300 hover:text-white transition-colors flex items-center gap-2">
                        <Copy className="w-3.5 h-3.5" /> Clone
                      </button>
                      <button onClick={() => handleDeactivate(selectedRule.id)} className="px-4 py-2 bg-[#161616] border border-[#2d2d2d] rounded-lg text-xs text-slate-300 hover:text-white transition-colors flex items-center gap-2">
                        <Ban className="w-3.5 h-3.5" /> Deactivate
                      </button>
                      <button onClick={() => handleReactivate(selectedRule.id)} className="px-4 py-2 bg-[#161616] border border-[#2d2d2d] rounded-lg text-xs text-slate-300 hover:text-white transition-colors flex items-center gap-2">
                        <RefreshCcw className="w-3.5 h-3.5" /> Reactivate
                      </button>
                      <button onClick={() => handleArchive(selectedRule.id)} className="px-4 py-2 bg-[#161616] border border-[#2d2d2d] rounded-lg text-xs text-slate-300 hover:text-white transition-colors flex items-center gap-2">
                        <Archive className="w-3.5 h-3.5" /> Archive
                      </button>
                    </div>
                    <div className="text-xs text-slate-500">Publishing requires: valid name, description, scope, trigger conditions, approval path, approver authority, no blocking conflicts, authorized admin permission.</div>
                  </div>
                </CollapsibleSection>

                <CollapsibleSection title="Audit Trail" icon={History} badge={ruleAuditLog.length || MOCK_AUDIT.length}>
                  <div className="space-y-2">
                    {(ruleAuditLog.length > 0 ? ruleAuditLog : MOCK_AUDIT).map(a => (
                      <div key={a.id} className="flex items-start gap-3 p-2.5 bg-black/40 rounded-lg border border-[#2d2d2d]">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-white">{a.action}</span>
                            <span className="text-[10px] text-slate-600">by {a.actor}</span>
                            <span className="text-[10px] text-slate-600 ml-auto">{timeAgo(a.timestamp)}</span>
                          </div>
                          {a.note && <p className="text-[10px] text-slate-500 mt-0.5">{a.note}</p>}
                          {(a.previousValue || a.newValue) && (
                            <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-600">
                              {a.previousValue && <span className="line-through text-red-400/60">{a.previousValue}</span>}
                              {a.newValue && <ArrowRight className="w-3 h-3" />}
                              {a.newValue && <span className="text-emerald-400/60">{a.newValue}</span>}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CollapsibleSection>
              </div>
            </>
          )}
        </div>

        {/* Right Panel — Governance Panel */}
        {showRightPanel && (
          <div className="w-80 shrink-0 space-y-3 max-h-[calc(100vh-180px)] overflow-y-auto">
            {!selectedRule ? (
              <div className="bg-[#161616] border border-[#2d2d2d] rounded-xl p-4">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <PanelRight className="w-4 h-4" />
                  <span>Select a rule to view governance details</span>
                </div>
              </div>
            ) : (
              <>
                {/* Rule Summary */}
                <div className="bg-[#161616] border border-[#2d2d2d] rounded-xl p-4 space-y-3">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-indigo-400" /> Rule Summary
                  </h3>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between"><span className="text-slate-500">Status</span><span className="text-white font-medium">{selectedRule.status}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Risk</span><span className="flex items-center gap-1.5"><span className={`w-2 h-2 rounded-full ${RISK_DOT[selectedRule.riskLevel]}`} />{selectedRule.riskLevel}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Priority</span><span className="text-white">P{selectedRule.priority}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Path</span><span className="text-white">{selectedRule.pathType}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Stages</span><span className="text-white">{selectedRule.stages.length}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Authority</span><span className="text-white">Level {selectedRule.authorityLevel}</span></div>
                    {selectedRule.activeVersion && <div className="flex justify-between"><span className="text-slate-500">Active Version</span><span className="text-emerald-400 font-medium">v{selectedRule.activeVersion}</span></div>}
                    {selectedRule.draftVersion && <div className="flex justify-between"><span className="text-slate-500">Draft Version</span><span className="text-amber-400 font-medium">v{selectedRule.draftVersion}</span></div>}
                    <div className="flex justify-between"><span className="text-slate-500">Scope</span><span className="text-white text-right">{selectedRule.scope.sourceModule || "—"}{selectedRule.scope.platform ? ` / ${selectedRule.scope.platform}` : ""}</span></div>
                  </div>
                </div>

                {/* Activation Status */}
                <div className="bg-[#161616] border border-[#2d2d2d] rounded-xl p-4 space-y-3">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <Activity className="w-3.5 h-3.5 text-indigo-400" /> Activation Status
                  </h3>
                  <div className={`px-3 py-2 rounded-lg border text-xs flex items-center gap-2 ${
                    selectedRule.status === "Active" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
                    selectedRule.status === "Conflict Detected" ? "bg-red-500/10 border-red-500/20 text-red-400" :
                    selectedRule.status === "Draft" ? "bg-slate-500/10 border-slate-500/20 text-slate-400" :
                    "bg-amber-500/10 border-amber-500/20 text-amber-400"
                  }`}>
                    {selectedRule.status === "Active" ? <CheckCircle2 className="w-4 h-4" /> :
                     selectedRule.status === "Conflict Detected" ? <AlertTriangle className="w-4 h-4" /> :
                     <Clock className="w-4 h-4" />}
                    <span>{selectedRule.status}</span>
                  </div>
                  {selectedRule.status === "Active" && <div className="text-[10px] text-slate-600">Active rules cannot be edited directly. Create a draft version to make changes.</div>}
                </div>

                {/* Conflict Detection */}
                <div className="bg-[#161616] border border-[#2d2d2d] rounded-xl p-4 space-y-3">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-indigo-400" /> Conflict Detection
                  </h3>
                  {selectedRule.conflictCount > 0 ? (
                    <div className="space-y-2">
                      {CONFLICT_TYPES.slice(0, selectedRule.conflictCount).map((ct, i) => (
                        <div key={i} className={`flex items-start gap-2 p-2 rounded-lg border text-xs ${
                          i === 0 && selectedRule.blockingConflict ? "bg-red-500/10 border-red-500/20 text-red-400" : "bg-amber-500/5 border-amber-500/20 text-amber-400"
                        }`}>
                          <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                          <div>
                            <div className="font-medium">{ct}</div>
                            <div className="text-[10px] text-slate-500 mt-0.5">Detected during last validation</div>
                          </div>
                        </div>
                      ))}
                      {selectedRule.blockingConflict && <div className="text-[10px] text-red-400">Blocking conflicts must be resolved before publishing.</div>}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>No conflicts detected</span>
                    </div>
                  )}
                </div>

                {/* Simulation Results */}
                <div className="bg-[#161616] border border-[#2d2d2d] rounded-xl p-4 space-y-3">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <TestTube className="w-3.5 h-3.5 text-indigo-400" /> Simulation Results
                  </h3>
                  {simulationResult ? (
                    <div className="space-y-2 text-xs">
                      <div className={`px-3 py-2 rounded-lg border flex items-center gap-2 ${simulationResult.matched ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-amber-500/10 border-amber-500/20 text-amber-400"}`}>
                        {simulationResult.matched ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                        <span className="font-medium">{simulationResult.matched ? "Rule Matched" : "No Match"}</span>
                      </div>
                      {simulationResult.matched_conditions?.length > 0 && (
                        <div className="p-2 bg-black/40 rounded-lg border border-[#2d2d2d] space-y-1">
                          <span className="text-[10px] text-slate-500 font-semibold">Matched Conditions</span>
                          {simulationResult.matched_conditions.map((c: string, i: number) => (
                            <div key={i} className="text-[10px] text-slate-300">{c}</div>
                          ))}
                        </div>
                      )}
                      {simulationResult.blocked_reasons?.length > 0 && (
                        <div className="p-2 bg-red-500/10 rounded-lg border border-red-500/20 space-y-1">
                          <span className="text-[10px] text-red-400 font-semibold">Blocked</span>
                          {simulationResult.blocked_reasons.map((r: string, i: number) => (
                            <div key={i} className="text-[10px] text-red-300">{r}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500 p-3 bg-black/40 rounded-lg border border-[#2d2d2d] text-center">
                      Run a simulation from the rule builder to preview matching behavior.
                    </div>
                  )}
                </div>

                {/* Matched Item Preview */}
                <div className="bg-[#161616] border border-[#2d2d2d] rounded-xl p-4 space-y-3">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <Eye className="w-3.5 h-3.5 text-indigo-400" /> Matched Item Preview
                  </h3>
                  <div className="space-y-2">
                    {[
                      { title: "Q2 Campaign — Brand Video", type: "Campaign Asset", platform: "LinkedIn", risk: "High", match: "Platform + Risk Level" },
                      { title: "Executive Statement Draft", type: "Social Post", platform: "All", risk: "Critical", match: "Risk Level + Owner" },
                    ].map((item, i) => (
                      <div key={i} className="p-2 bg-black/40 rounded-lg border border-[#2d2d2d] space-y-1">
                        <div className="text-xs font-medium text-white truncate">{item.title}</div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500">
                          <span>{item.type}</span><span>·</span><span>{item.platform}</span>
                        </div>
                        <div className="text-[10px] text-indigo-400">Matched: {item.match}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Publishing Controls */}
                <div className="bg-[#161616] border border-[#2d2d2d] rounded-xl p-4 space-y-3">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <Upload className="w-3.5 h-3.5 text-indigo-400" /> Publishing Controls
                  </h3>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Publishable</span>
                      {selectedRule.blockingConflict ? (
                        <span className="text-red-400 flex items-center gap-1"><XCircle className="w-3 h-3" /> Blocked</span>
                      ) : selectedRule.status === "Draft" ? (
                        <span className="text-amber-400 flex items-center gap-1"><Clock className="w-3 h-3" /> Needs Setup</span>
                      ) : (
                        <span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Ready</span>
                      )}
                    </div>
                    {selectedRule.blockingConflict && <div className="text-[10px] text-red-400">Resolve blocking conflicts before publishing this rule.</div>}
                  </div>
                </div>

                {/* Version History */}
                <div className="bg-[#161616] border border-[#2d2d2d] rounded-xl p-4 space-y-3">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <History className="w-3.5 h-3.5 text-indigo-400" /> Version History
                  </h3>
                  <div className="space-y-2">
                    {(ruleVersions.length > 0 ? ruleVersions : MOCK_VERSIONS).map(v => (
                      <div key={v.id} className="flex items-start gap-2 p-2 bg-black/40 rounded-lg border border-[#2d2d2d]">
                        <div className="w-5 h-5 rounded bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-[10px] font-bold text-indigo-400 shrink-0">v{v.versionNumber}</div>
                        <div className="min-w-0">
                          <div className="text-xs text-white truncate">{v.changeSummary}</div>
                          <div className="text-[10px] text-slate-500">{v.author} · {timeAgo(v.createdAt)}{v.publishedAt ? ` · Published ${timeAgo(v.publishedAt)}` : ""}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Audit Trail */}
                <div className="bg-[#161616] border border-[#2d2d2d] rounded-xl p-4 space-y-3">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <History className="w-3.5 h-3.5 text-indigo-400" /> Audit Trail
                  </h3>
                  <div className="space-y-2">
                    {(ruleAuditLog.length > 0 ? ruleAuditLog : MOCK_AUDIT).slice(0, 5).map(a => (
                      <div key={a.id} className="flex items-start gap-2 text-xs">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1 shrink-0" />
                        <div>
                          <div className="text-slate-300">{a.action}</div>
                          <div className="text-[10px] text-slate-600">{a.actor} · {timeAgo(a.timestamp)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}