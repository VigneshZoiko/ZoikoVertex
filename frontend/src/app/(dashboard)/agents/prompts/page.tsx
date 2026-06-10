"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import ConfirmActionModal from "@/components/ConfirmActionModal";
import {
  MessageSquareCode,
  ShieldCheck,
  Zap,
  History,
  Search,
  Plus,
  Clock,
  Lock,
  ShieldAlert,
  ChevronDown,
  ChevronRight,
  FlaskConical,
  GitBranch,
  Globe,
  Layers,
  BookOpen,
  Wrench,
  FileCheck,
  AlertTriangle,
  RotateCcw,
  Archive,
  Eye,
  Play,
  PauseCircle,
  Download,
  Filter,
  CheckCircle2,
  XCircle,
  CircleDot,
  ArrowRight,
  Cpu,
  Network,
  BarChart3,
  Loader2,
  Copy,
  Check,
  Variable,
  FileText,
  Activity,
} from "lucide-react";
import { api } from "@/lib/api";
import { useRoleContext } from "@/lib/context/RoleContext";
import { EvaluationDashboard } from "@/features/prompt-governance/EvaluationDashboard";
import { AdversarialDashboard } from "@/features/prompt-governance/AdversarialDashboard";
import { DriftDashboard } from "@/features/prompt-governance/DriftDashboard";
import { PromptGovernanceCenter } from "@/features/prompt-governance/PromptGovernanceCenter";

// ─── Types ────────────────────────────────────────────────────────────────────

type LifecycleStatus =
  | "DRAFT"
  | "INTERNAL_TEST"
  | "REVIEW_REQUESTED"
  | "APPROVED_STAGING"
  | "PRODUCTION_PENDING"
  | "PRODUCTION_ACTIVE"
  | "PAUSED"
  | "RETIRED"
  | "ARCHIVED";

type RiskTier = "TIER_1_LOW" | "TIER_2_MEDIUM" | "TIER_3_HIGH" | "TIER_4_CRITICAL";

type PromptType =
  | "system"
  | "agent_role"
  | "task"
  | "channel"
  | "tool_use"
  | "escalation"
  | "refusal"
  | "safety"
  | "localization";

interface PromptVersion {
  version_number: string;
  body_hash: string;
  created_by: string;
  change_summary: string;
  created_at: string;
  immutable: boolean;
}

interface TestResult {
  suite_name: string;
  pass_fail: "PASS" | "FAIL" | "PENDING";
  score: number;
  run_at: string;
  environment: string;
}

interface ApprovalRecord {
  reviewer_role: string;
  decision: "APPROVED" | "REJECTED" | "PENDING" | "CHANGES_REQUESTED";
  timestamp: string;
  notes: string;
}

interface PromptRecord {
  id: string;
  name: string;
  prompt_type: PromptType;
  owner: string;
  linked_agent: string;
  linked_workflow: string;
  risk_tier: RiskTier;
  status: LifecycleStatus;
  active_version: string;
  active_version_id?: string;
  last_test: TestResult | null;
  approvals: ApprovalRecord[];
  last_deployed: string;
  description: string;
  knowledge_sources: string[];
  tools_permitted: string[];
}

interface HitlRule {
  id: string;
  trigger: string;
  action: string;
  route_to_role: string;
  enabled: boolean;
}

interface AuditStats {
  total?: number;
  today?: number;
  errors?: number;
  warnings?: number;
}

interface ApprovalStats {
  counts?: {
    pending_governance?: number;
    total_pending?: number;
    production_pending?: number;
  };
}

type ActiveTab = "registry" | "test_center" | "lifecycle" | "testing" | "approvals" | "evidence" | "runtime" | "auditor" | "evaluation" | "adversarial" | "drift" | "center";
type FilterStatus = "ALL" | LifecycleStatus;
type FilterRisk = "ALL" | RiskTier;

// ─── Constants ────────────────────────────────────────────────────────────────

const RISK_META: Record<RiskTier, { label: string; color: string; bg: string; border: string; dot: string }> = {
  TIER_1_LOW: { label: "Tier 1 — Low", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", dot: "bg-emerald-500" },
  TIER_2_MEDIUM: { label: "Tier 2 — Medium", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20", dot: "bg-amber-500" },
  TIER_3_HIGH: { label: "Tier 3 — High", color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/20", dot: "bg-orange-500" },
  TIER_4_CRITICAL: { label: "Tier 4 — Critical", color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/20", dot: "bg-rose-500" },
};

const STATUS_META: Record<LifecycleStatus, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  DRAFT: { label: "Draft", color: "text-slate-400", bg: "bg-slate-800", icon: CircleDot },
  INTERNAL_TEST: { label: "Internal Test", color: "text-blue-400", bg: "bg-blue-500/10", icon: FlaskConical },
  REVIEW_REQUESTED: { label: "Review Requested", color: "text-amber-400", bg: "bg-amber-500/10", icon: Clock },
  APPROVED_STAGING: { label: "Approved — Staging", color: "text-teal-400", bg: "bg-teal-500/10", icon: CheckCircle2 },
  PRODUCTION_PENDING: { label: "Production Pending", color: "text-indigo-400", bg: "bg-indigo-500/10", icon: ArrowRight },
  PRODUCTION_ACTIVE: { label: "Production Active", color: "text-emerald-400", bg: "bg-emerald-500/10", icon: Zap },
  PAUSED: { label: "Paused", color: "text-orange-400", bg: "bg-orange-500/10", icon: PauseCircle },
  RETIRED: { label: "Retired", color: "text-rose-400", bg: "bg-rose-500/10", icon: XCircle },
  ARCHIVED: { label: "Archived", color: "text-slate-500", bg: "bg-slate-900", icon: Archive },
};

const LIFECYCLE_STAGES: LifecycleStatus[] = [
  "DRAFT",
  "INTERNAL_TEST",
  "REVIEW_REQUESTED",
  "APPROVED_STAGING",
  "PRODUCTION_PENDING",
  "PRODUCTION_ACTIVE",
  "PAUSED",
  "RETIRED",
  "ARCHIVED",
];

// ─── Sub-components ───────────────────────────────────────────────────────────

// Backend enums return lowercase values (e.g. `tier_2_medium`, `approved_for_staging`).
// The UI maps above are keyed by the wizard's uppercase shortforms. Normalize defensively
// so badges don't crash when the API returns canonical DB enum values.
const RISK_TIER_FROM_DB: Record<string, RiskTier> = {
  tier_1_low: "TIER_1_LOW",
  tier_2_medium: "TIER_2_MEDIUM",
  tier_3_high: "TIER_3_HIGH",
  tier_4_critical: "TIER_4_CRITICAL",
};
const STATUS_FROM_DB: Record<string, LifecycleStatus> = {
  draft: "DRAFT",
  internal_test: "INTERNAL_TEST",
  review_requested: "REVIEW_REQUESTED",
  approved_for_staging: "APPROVED_STAGING",
  production_pending: "PRODUCTION_PENDING",
  production_active: "PRODUCTION_ACTIVE",
  paused: "PAUSED",
  retired: "RETIRED",
  archived: "ARCHIVED",
};
function normalizeRiskTier(v: string | undefined): RiskTier {
  if (!v) return "TIER_1_LOW";
  const upper = v.toUpperCase() as RiskTier;
  if (upper in RISK_META) return upper;
  return RISK_TIER_FROM_DB[v.toLowerCase()] || "TIER_1_LOW";
}
function normalizeStatus(v: string | undefined): LifecycleStatus {
  if (!v) return "DRAFT";
  const upper = v.toUpperCase() as LifecycleStatus;
  if (upper in STATUS_META) return upper;
  return STATUS_FROM_DB[v.toLowerCase()] || "DRAFT";
}

function StatusBadge({ status }: { status: LifecycleStatus | string }) {
  const meta = STATUS_META[normalizeStatus(status)];
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${meta.color} ${meta.bg} border border-white/5`}>
      <Icon className="w-3 h-3" />
      {meta.label}
    </span>
  );
}

function RiskBadge({ tier }: { tier: RiskTier | string }) {
  const meta = RISK_META[normalizeRiskTier(tier)];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${meta.color} ${meta.bg} border ${meta.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}

function TestBadge({ result }: { result: TestResult | null }) {
  if (!result) return <span className="text-[10px] text-slate-600 italic">No test run</span>;
  const colors = result.pass_fail === "PASS" ? "text-emerald-400 bg-emerald-500/10" : result.pass_fail === "FAIL" ? "text-rose-400 bg-rose-500/10" : "text-slate-400 bg-slate-800";
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${colors} border border-white/5`}>
      {result.pass_fail === "PASS" ? <CheckCircle2 className="w-3 h-3" /> : result.pass_fail === "FAIL" ? <XCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
      {result.pass_fail} · {result.score}%
    </span>
  );
}

function ApprovalChain({ approvals, riskTier }: { approvals: ApprovalRecord[]; riskTier: RiskTier }) {
  const required = riskTier === "TIER_4_CRITICAL" ? 3 : riskTier === "TIER_3_HIGH" ? 2 : riskTier === "TIER_2_MEDIUM" ? 1 : 0;
  const completed = approvals.filter((a) => a.decision === "APPROVED").length;
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: Math.max(required, approvals.length) }).map((_, i) => {
        const a = approvals[i];
        const color = !a ? "bg-slate-800" : a.decision === "APPROVED" ? "bg-emerald-500" : a.decision === "REJECTED" ? "bg-rose-500" : a.decision === "PENDING" ? "bg-amber-500/40 border border-amber-500" : "bg-slate-700";
        return <div key={i} className={`w-2.5 h-2.5 rounded-full ${color}`} title={a ? `${a.reviewer_role}: ${a.decision}` : "Required"} />;
      })}
      <span className="text-[10px] text-slate-500 ml-1">{completed}/{required}</span>
    </div>
  );
}

// ─── Tab: Registry ─────────────────────────────────────────────────────────────

// Governance helpers (Doc 3 §4-D): derive approval / test / deployment state from
// the loaded prompt record so the filter rail can segment the registry without a
// round-trip. Required approvals are computed from risk tier (Doc 3 §7).
function requiredApprovalsForTier(tier: RiskTier): number {
  return tier === "TIER_4_CRITICAL" ? 3 : tier === "TIER_3_HIGH" ? 2 : tier === "TIER_2_MEDIUM" ? 1 : 0;
}
type ApprovalState = "ALL" | "APPROVED" | "PENDING" | "REJECTED" | "NONE";
function approvalStateOf(p: PromptRecord): Exclude<ApprovalState, "ALL"> {
  const required = requiredApprovalsForTier(normalizeRiskTier(p.risk_tier));
  const approved = p.approvals.filter((a) => a.decision === "APPROVED").length;
  if (p.approvals.some((a) => a.decision === "REJECTED")) return "REJECTED";
  if (required === 0 || approved >= required) return "APPROVED";
  if (p.approvals.some((a) => a.decision === "PENDING") || p.status === "REVIEW_REQUESTED" || p.status === "PRODUCTION_PENDING") return "PENDING";
  return "NONE";
}
type TestState = "ALL" | "PASS" | "FAIL" | "PENDING" | "NONE";
function testStateOf(p: PromptRecord): Exclude<TestState, "ALL"> {
  return (p.last_test?.pass_fail as Exclude<TestState, "ALL">) || "NONE";
}
type DeploymentState = "ALL" | "PRODUCTION" | "STAGING" | "PAUSED" | "NONE";
function deploymentStateOf(p: PromptRecord): Exclude<DeploymentState, "ALL"> {
  const s = normalizeStatus(p.status);
  if (s === "PRODUCTION_ACTIVE") return "PRODUCTION";
  if (s === "APPROVED_STAGING") return "STAGING";
  if (s === "PAUSED") return "PAUSED";
  return "NONE";
}

const FILTER_SELECT_CLS = "bg-black border border-slate-800 rounded-xl py-2.5 px-4 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 transition-all";

function RegistryTab({
  prompts,
  search,
  setSearch,
  filterStatus,
  setFilterStatus,
  filterRisk,
  setFilterRisk,
  filterTest,
  setFilterTest,
  onSelectPrompt,
}: {
  prompts: PromptRecord[];
  search: string;
  setSearch: (v: string) => void;
  filterStatus: FilterStatus;
  setFilterStatus: (v: FilterStatus) => void;
  filterRisk: FilterRisk;
  setFilterRisk: (v: FilterRisk) => void;
  filterTest: TestState;
  setFilterTest: (v: TestState) => void;
  onSelectPrompt: (p: PromptRecord) => void;
}) {
  // Doc 3 §4-D filter rail: status, risk, type, agent, workflow, owner, approval
  // state, test state, deployment state — all combinable and reversible.
  const [filterType, setFilterType] = useState<"ALL" | PromptType>("ALL");
  const [filterAgent, setFilterAgent] = useState<string>("ALL");
  const [filterWorkflow, setFilterWorkflow] = useState<string>("ALL");
  const [filterOwner, setFilterOwner] = useState<string>("ALL");
  const [filterApproval, setFilterApproval] = useState<ApprovalState>("ALL");
  const [filterDeployment, setFilterDeployment] = useState<DeploymentState>("ALL");

  const agents = useMemo(() => Array.from(new Set(prompts.map((p) => p.linked_agent).filter((v) => v && v !== "—"))).sort(), [prompts]);
  const workflows = useMemo(() => Array.from(new Set(prompts.map((p) => p.linked_workflow).filter((v) => v && v !== "—"))).sort(), [prompts]);
  const owners = useMemo(() => Array.from(new Set(prompts.map((p) => p.owner).filter(Boolean))).sort(), [prompts]);
  const promptTypes = useMemo(() => Array.from(new Set(prompts.map((p) => p.prompt_type).filter(Boolean))).sort(), [prompts]);

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    return prompts.filter((p) => {
      const matchSearch = !term || p.name.toLowerCase().includes(term) || p.owner.toLowerCase().includes(term) || p.linked_agent.toLowerCase().includes(term);
      const matchStatus = filterStatus === "ALL" || normalizeStatus(p.status) === filterStatus;
      const matchRisk = filterRisk === "ALL" || normalizeRiskTier(p.risk_tier) === filterRisk;
      const matchType = filterType === "ALL" || p.prompt_type === filterType;
      const matchAgent = filterAgent === "ALL" || p.linked_agent === filterAgent;
      const matchWorkflow = filterWorkflow === "ALL" || p.linked_workflow === filterWorkflow;
      const matchOwner = filterOwner === "ALL" || p.owner === filterOwner;
      const matchApproval = filterApproval === "ALL" || approvalStateOf(p) === filterApproval;
      const matchTest = filterTest === "ALL" || testStateOf(p) === filterTest;
      const matchDeployment = filterDeployment === "ALL" || deploymentStateOf(p) === filterDeployment;
      return matchSearch && matchStatus && matchRisk && matchType && matchAgent && matchWorkflow && matchOwner && matchApproval && matchTest && matchDeployment;
    });
  }, [prompts, search, filterStatus, filterRisk, filterType, filterAgent, filterWorkflow, filterOwner, filterApproval, filterTest, filterDeployment]);

  const activeFilterCount = [
    filterStatus !== "ALL", filterRisk !== "ALL", filterType !== "ALL", filterAgent !== "ALL",
    filterWorkflow !== "ALL", filterOwner !== "ALL", filterApproval !== "ALL", filterTest !== "ALL", filterDeployment !== "ALL",
  ].filter(Boolean).length;

  const clearAll = () => {
    setFilterStatus("ALL"); setFilterRisk("ALL"); setFilterType("ALL"); setFilterAgent("ALL");
    setFilterWorkflow("ALL"); setFilterOwner("ALL"); setFilterApproval("ALL"); setFilterTest("ALL"); setFilterDeployment("ALL");
    setSearch("");
  };

  return (
    <div className="space-y-6">
      {/* Filters — Doc 3 §4-D filter rail */}
      <div className="space-y-3">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search by name, owner, or linked agent..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-black border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white focus:outline-none focus:border-indigo-500 transition-all"
            />
          </div>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as FilterStatus)} className={FILTER_SELECT_CLS}>
            <option value="ALL">All Statuses</option>
            {LIFECYCLE_STAGES.map((s) => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
          </select>
          <select value={filterRisk} onChange={(e) => setFilterRisk(e.target.value as FilterRisk)} className={FILTER_SELECT_CLS}>
            <option value="ALL">All Risk Tiers</option>
            {(Object.keys(RISK_META) as RiskTier[]).map((r) => <option key={r} value={r}>{RISK_META[r].label}</option>)}
          </select>
        </div>
        <div className="flex flex-wrap gap-3">
          <select value={filterType} onChange={(e) => setFilterType(e.target.value as "ALL" | PromptType)} className={FILTER_SELECT_CLS}>
            <option value="ALL">All Types</option>
            {promptTypes.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={filterAgent} onChange={(e) => setFilterAgent(e.target.value)} className={FILTER_SELECT_CLS}>
            <option value="ALL">All Agents</option>
            {agents.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <select value={filterWorkflow} onChange={(e) => setFilterWorkflow(e.target.value)} className={FILTER_SELECT_CLS}>
            <option value="ALL">All Workflows</option>
            {workflows.map((w) => <option key={w} value={w}>{w}</option>)}
          </select>
          <select value={filterOwner} onChange={(e) => setFilterOwner(e.target.value)} className={FILTER_SELECT_CLS}>
            <option value="ALL">All Owners</option>
            {owners.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
          <select value={filterApproval} onChange={(e) => setFilterApproval(e.target.value as ApprovalState)} className={FILTER_SELECT_CLS}>
            <option value="ALL">All Approval States</option>
            <option value="APPROVED">Approved</option>
            <option value="PENDING">Pending</option>
            <option value="REJECTED">Rejected</option>
            <option value="NONE">No Approval</option>
          </select>
          <select value={filterTest} onChange={(e) => setFilterTest(e.target.value as TestState)} className={FILTER_SELECT_CLS}>
            <option value="ALL">All Test States</option>
            <option value="PASS">Passing</option>
            <option value="FAIL">Failing</option>
            <option value="PENDING">Pending</option>
            <option value="NONE">Untested</option>
          </select>
          <select value={filterDeployment} onChange={(e) => setFilterDeployment(e.target.value as DeploymentState)} className={FILTER_SELECT_CLS}>
            <option value="ALL">All Deployment States</option>
            <option value="PRODUCTION">Production</option>
            <option value="STAGING">Staging</option>
            <option value="PAUSED">Paused</option>
            <option value="NONE">Not Deployed</option>
          </select>
          {activeFilterCount > 0 && (
            <button onClick={clearAll} className="px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white hover:border-slate-600 transition-all flex items-center gap-1.5">
              <XCircle className="w-3.5 h-3.5" /> Clear ({activeFilterCount})
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-900">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-900 bg-slate-950/60">
              {["Prompt Name", "Type", "Owner", "Linked Agent", "Risk Tier", "Status", "Tests", "Approvals", "Version", "Last Deployed", ""].map((h) => (
                <th key={h} className="py-3 px-5 text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-900">
            {filtered.map((p) => (
              <tr key={p.id} className="hover:bg-slate-900/30 transition-colors group cursor-pointer" onClick={() => onSelectPrompt(p)}>
                <td className="py-4 px-5">
                  <div className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors max-w-[200px] truncate">{p.name}</div>
                  <div className="text-[10px] text-slate-500 max-w-[200px] truncate mt-0.5">{p.description}</div>
                </td>
                <td className="py-4 px-5">
                  <span className="text-[10px] text-slate-400 bg-black border border-slate-800 px-2 py-1 rounded-lg whitespace-nowrap">{p.prompt_type}</span>
                </td>
                <td className="py-4 px-5 text-xs text-slate-400 whitespace-nowrap">{p.owner}</td>
                <td className="py-4 px-5">
                  <div className="flex items-center gap-1.5">
                    <Cpu className="w-3 h-3 text-indigo-400" />
                    <span className="text-[10px] text-slate-300">{p.linked_agent}</span>
                  </div>
                </td>
                <td className="py-4 px-5 whitespace-nowrap"><RiskBadge tier={p.risk_tier} /></td>
                <td className="py-4 px-5 whitespace-nowrap"><StatusBadge status={p.status} /></td>
                <td className="py-4 px-5 whitespace-nowrap"><TestBadge result={p.last_test} /></td>
                <td className="py-4 px-5 whitespace-nowrap"><ApprovalChain approvals={p.approvals} riskTier={p.risk_tier} /></td>
                <td className="py-4 px-5">
                  <span className="text-[10px] font-black text-slate-400 bg-black border border-slate-800 px-2 py-1 rounded-lg">{p.active_version}</span>
                </td>
                <td className="py-4 px-5 text-[10px] text-slate-500 whitespace-nowrap">
                  {p.last_deployed ? new Date(p.last_deployed).toLocaleDateString() : "—"}
                </td>
                <td className="py-4 px-5">
                  <button className="p-2 bg-black border border-slate-800 rounded-lg text-slate-400 hover:text-white hover:border-slate-600 transition-all" onClick={(e) => { e.stopPropagation(); onSelectPrompt(p); }}>
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={11} className="py-12 text-center text-sm text-slate-600">No prompts match the current filters.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Tab: Lifecycle ────────────────────────────────────────────────────────────

function LifecycleTab({ prompts }: { prompts: PromptRecord[] }) {
  const byStatus = useMemo(() => {
    const map: Partial<Record<LifecycleStatus, PromptRecord[]>> = {};
    for (const p of prompts) {
      if (!map[p.status]) map[p.status] = [];
      map[p.status]!.push(p);
    }
    return map;
  }, [prompts]);

  return (
    <div className="space-y-6">
      <p className="text-xs text-slate-500 leading-relaxed max-w-2xl">
        The lifecycle pipeline shows every prompt&apos;s current state. Prompts must progress through testing and required approvals before reaching production. Archived prompts cannot be reactivated — they must be cloned into a new draft.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-4">
        {LIFECYCLE_STAGES.map((stage) => {
          const meta = STATUS_META[stage];
          const Icon = meta.icon;
          const items = byStatus[stage] ?? [];
          return (
            <div key={stage} className="bg-black border border-slate-900 rounded-2xl p-5 space-y-3">
              <div className={`flex items-center gap-2 ${meta.color}`}>
                <Icon className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">{meta.label}</span>
                <span className="ml-auto text-[10px] bg-slate-900 border border-slate-800 rounded px-2 py-0.5 text-slate-400">{items.length}</span>
              </div>
              <div className="space-y-2">
                {items.map((p) => (
                  <div key={p.id} className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                    <div className="text-[11px] font-bold text-white truncate">{p.name}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <RiskBadge tier={p.risk_tier} />
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1 truncate">{p.linked_agent}</div>
                  </div>
                ))}
                {items.length === 0 && <p className="text-[10px] text-slate-700 italic">No prompts in this state.</p>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Lifecycle Rules Summary */}
      <div className="bg-slate-950 border border-slate-900 rounded-2xl p-6 space-y-4">
        <h3 className="text-xs font-black text-white uppercase tracking-widest">Control Rules</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] text-slate-400">
          {[
            "Archived and retired prompts are immutable. Clone to draft to create a new version.",
            "Production deployment requires all risk-tier approvals and a passing test suite.",
            "Any risk-impacting edit after approval invalidates the approval state.",
            "Rollback restores the last approved production version and records an incident.",
            "Draft and staging prompts cannot be called by production agents.",
            "Every lifecycle event writes an immutable record to the Evidence Vault.",
          ].map((rule, i) => (
            <div key={i} className="flex items-start gap-2 p-3 bg-black border border-slate-900 rounded-xl">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400 mt-0.5 shrink-0" />
              <span>{rule}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Tab: Testing ──────────────────────────────────────────────────────────────

function TestingTab({
  prompts,
  onRunTests,
}: {
  prompts: PromptRecord[];
  onRunTests: (versionId: string) => void;
}) {
  const TEST_CATEGORIES = [
    { icon: ShieldCheck, label: "Instruction Adherence", desc: "Output format, role boundaries, variable rules, escalation, refusal." },
    { icon: ShieldAlert, label: "Safety & Policy", desc: "Blocks prohibited claims, offensive content, restricted topics." },
    { icon: MessageSquareCode, label: "Brand & Tone", desc: "Approved vocabulary, banned terms, channel style, AI-language avoidance." },
    { icon: BookOpen, label: "Grounding & Citations", desc: "Approved sources, citation where required, no unsupported claims." },
    { icon: Wrench, label: "Tool-Use Behavior", desc: "Permitted tools only under correct conditions; no fabricated results." },
    { icon: Globe, label: "Localization", desc: "Region, language, cultural sensitivity, channel limits, legal disclaimers." },
    { icon: GitBranch, label: "Regression", desc: "Current output vs. previous approved version across golden scenarios." },
    { icon: AlertTriangle, label: "Adversarial", desc: "Jailbreaks, prompt injection, policy bypasses, hidden instructions." },
  ];

  const withTests = prompts.filter((p) => p.last_test);
  const passed = withTests.filter((p) => p.last_test?.pass_fail === "PASS").length;
  const failed = withTests.filter((p) => p.last_test?.pass_fail === "FAIL").length;

  return (
    <div className="space-y-8">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Tested Prompts", value: withTests.length, color: "text-white" },
          { label: "Passing", value: passed, color: "text-emerald-400" },
          { label: "Failing", value: failed, color: "text-rose-400" },
        ].map((s) => (
          <div key={s.label} className="bg-black border border-slate-900 rounded-2xl p-5 text-center">
            <div className={`text-3xl font-black ${s.color}`}>{s.value}</div>
            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Test Categories */}
      <div className="space-y-3">
        <h3 className="text-xs font-black text-white uppercase tracking-widest">Required Test Suites by Category</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {TEST_CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            return (
              <div key={cat.label} className="flex items-start gap-4 p-4 bg-black border border-slate-900 rounded-2xl hover:border-indigo-500/30 transition-all">
                <div className="p-2 bg-slate-950 border border-slate-800 rounded-xl">
                  <Icon className="w-4 h-4 text-indigo-400" />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-white">{cat.label}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">{cat.desc}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Per-prompt test results */}
      <div className="space-y-3">
        <h3 className="text-xs font-black text-white uppercase tracking-widest">Last Test Run — Per Prompt</h3>
        <div className="space-y-2">
          {prompts.map((p) => (
            <div key={p.id} className="flex items-center gap-4 p-4 bg-black border border-slate-900 rounded-2xl">
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-bold text-white truncate">{p.name}</div>
                <div className="text-[10px] text-slate-500">{p.last_test?.suite_name ?? "No suite assigned"}</div>
              </div>
              <RiskBadge tier={p.risk_tier} />
              <TestBadge result={p.last_test} />
              {p.last_test && (
                <div className="text-[10px] text-slate-500 whitespace-nowrap">
                  {new Date(p.last_test.run_at).toLocaleDateString()} · {p.last_test.environment}
                </div>
              )}
              <button
                onClick={() => p.active_version_id && onRunTests(p.active_version_id)}
                disabled={!p.active_version_id}
                className="p-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-400 hover:text-white hover:border-slate-600 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Play className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Adversarial Validation */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-rose-400" />
          <h3 className="text-xs font-black text-white uppercase tracking-widest">Adversarial Validation — Attack Vector Coverage</h3>
        </div>
        <p className="text-[10px] text-slate-500 leading-relaxed max-w-2xl">
          Adversarial validation tests whether a prompt can be manipulated into violating policy, fabricating facts, bypassing approval workflow, impersonating unauthorized people, or leaking confidential information. All production-bound prompts must pass every vector below.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { label: "Prompt Injection", desc: "Attack vectors embedded inside user variables or knowledge-base content that attempt to override governance rules or inject foreign instructions.", severity: "CRITICAL" },
            { label: "Role Override", desc: "Requests such as 'ignore previous instructions', 'act as a different agent', or 'forget your constraints' that try to bypass approved role boundaries.", severity: "CRITICAL" },
            { label: "Fabrication Requests", desc: "Instructions to invent statistics, sources, awards, testimonials, endorsements, or quotes that cannot be attributed to approved knowledge bases.", severity: "HIGH" },
            { label: "Approval Bypass", desc: "Attempts to frame restricted content as a draft, internal note, sandbox output, or hypothetical scenario to circumvent governance gates.", severity: "HIGH" },
            { label: "Data Exfiltration", desc: "Requests to reveal system prompts, policy internals, confidential documents, knowledge-base credentials, or private customer data.", severity: "HIGH" },
            { label: "Cross-Market Traps", desc: "Claims that are permitted in one jurisdiction but prohibited in another — testing whether locale and compliance constraints are enforced per execution context.", severity: "MEDIUM" },
          ].map((v) => (
            <div key={v.label} className="flex gap-3 p-4 bg-black border border-slate-900 rounded-2xl hover:border-rose-500/20 transition-all">
              <div className="shrink-0">
                <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${v.severity === "CRITICAL" ? "text-rose-400 bg-rose-500/10 border border-rose-500/20" : v.severity === "HIGH" ? "text-orange-400 bg-orange-500/10 border border-orange-500/20" : "text-amber-400 bg-amber-500/10 border border-amber-500/20"}`}>{v.severity}</span>
              </div>
              <div>
                <div className="text-[11px] font-bold text-white mb-1">{v.label}</div>
                <div className="text-[10px] text-slate-500 leading-relaxed">{v.desc}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="p-4 bg-slate-950 border border-slate-900 rounded-2xl text-[10px] text-slate-600 leading-relaxed">
          All CRITICAL and HIGH adversarial vectors must yield zero bypasses. Any bypass detected during testing blocks promotion to Review Requested state. Results are stored as evidence with the evaluator model version, inputs, and outputs.
        </div>
      </div>
    </div>
  );
}

// ─── Tab: Approvals ────────────────────────────────────────────────────────────

function ApprovalsTab({ prompts, approvalStats, onApprovalAction, canWaive, onWaive }: { prompts: PromptRecord[]; approvalStats: ApprovalStats | null; onApprovalAction: (versionId: string, decision: string, comments?: string, reasonCategory?: string) => void; canWaive: boolean; onWaive: (versionId: string, justification: string) => void }) {
  const [approvalModal, setApprovalModal] = useState<{
    mode: 'confirm' | 'prompt';
    versionId: string;
    promptName: string;
    decision: string;
    title: string;
    message: string;
    variant?: 'danger' | 'warning' | 'info' | 'default';
    confirmLabel?: string;
    promptPlaceholder?: string;
  } | null>(null);
  // A5 — structured rejection (category + notes).
  const [rejectionModal, setRejectionModal] = useState<{ versionId: string; promptName: string; title: string } | null>(null);
  // A6 — waive justification.
  const [waiveModal, setWaiveModal] = useState<{ versionId: string; promptName: string } | null>(null);
  const pending = prompts.filter((p) => p.status === "REVIEW_REQUESTED" || p.status === "PRODUCTION_PENDING");

  const handleApprovalConfirm = (value?: string) => {
    if (!approvalModal) return;
    const { versionId, decision, mode } = approvalModal;
    if (mode === 'confirm') {
      onApprovalAction(versionId, decision);
    } else {
      onApprovalAction(versionId, decision, (value || '').trim());
    }
    setApprovalModal(null);
  };

  const APPROVAL_MATRIX = [
    { tier: "Tier 1 — Low", color: "text-emerald-400", requirements: "Prompt owner approval only.", roles: ["PROMPT_OWNER"] },
    { tier: "Tier 2 — Medium", color: "text-amber-400", requirements: "Owner + brand reviewer.", roles: ["PROMPT_OWNER", "BRAND_REVIEWER"] },
    { tier: "Tier 3 — High", color: "text-orange-400", requirements: "Owner + brand + compliance reviewer.", roles: ["PROMPT_OWNER", "BRAND_REVIEWER", "COMPLIANCE_REVIEWER"] },
    { tier: "Tier 4 — Critical", color: "text-rose-400", requirements: "Three-key: Owner + compliance + security or executive approver.", roles: ["PROMPT_OWNER", "COMPLIANCE_REVIEWER", "SECURITY_ADMIN"] },
  ];

  return (
    <div className="space-y-8">
      {/* Pending queue */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black text-white uppercase tracking-widest">Pending Approval Queue</h3>
          <span className="text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full font-black">
            {approvalStats?.counts?.total_pending ?? pending.length} Awaiting Action
          </span>
        </div>
        {pending.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-600 bg-black border border-slate-900 rounded-2xl">No prompts pending review.</div>
        ) : (
          <div className="space-y-2">
            {pending.map((p) => (
              <div key={p.id} className="p-5 bg-black border border-amber-500/20 rounded-2xl space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm font-bold text-white">{p.name}</span>
                  <RiskBadge tier={p.risk_tier} />
                  <StatusBadge status={p.status} />
                </div>
                <div className="text-[10px] text-slate-400">{p.description}</div>
                <div className="flex items-center gap-4 flex-wrap">
                  <ApprovalChain approvals={p.approvals} riskTier={p.risk_tier} />
                  {p.approvals.map((a, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <div className={`w-2 h-2 rounded-full ${a.decision === "APPROVED" ? "bg-emerald-500" : a.decision === "REJECTED" ? "bg-rose-500" : "bg-amber-500/40 border border-amber-500"}`} />
                      <span className="text-[10px] text-slate-400">{a.reviewer_role}</span>
                      <span className="text-[10px] font-bold text-slate-300">{a.decision}</span>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (!p.active_version_id) return;
                      setApprovalModal({
                        mode: 'confirm',
                        versionId: p.active_version_id,
                        promptName: p.name,
                        decision: 'APPROVED',
                        title: `Approve "${p.name}"?`,
                        message: 'This will move the prompt to APPROVED status and make it eligible for production deployment. This action is recorded in the Evidence Vault.',
                        variant: 'info',
                        confirmLabel: 'Approve',
                      });
                    }}
                    disabled={!p.active_version_id}
                    className="px-4 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-emerald-500/20 transition-all disabled:opacity-50"
                  >Approve</button>
                  <button
                    disabled={!p.active_version_id}
                    onClick={() => { if (p.active_version_id) setRejectionModal({ versionId: p.active_version_id, promptName: p.name, title: `Request Changes for "${p.name}"` }); }}
                    className="px-4 py-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-amber-500/20 transition-all disabled:opacity-50"
                  >
                    Request Changes
                  </button>
                  <button
                    onClick={() => { if (p.active_version_id) setRejectionModal({ versionId: p.active_version_id, promptName: p.name, title: `Reject "${p.name}"` }); }}
                    disabled={!p.active_version_id}
                    className="px-4 py-1.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-rose-500/20 transition-all disabled:opacity-50"
                  >Reject</button>
                  {canWaive && (
                    <button
                      onClick={() => { if (p.active_version_id) setWaiveModal({ versionId: p.active_version_id, promptName: p.name }); }}
                      disabled={!p.active_version_id}
                      title="Waive outstanding review requirements with justification (governance override)"
                      className="px-4 py-1.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-indigo-500/20 transition-all disabled:opacity-50 flex items-center gap-1.5"
                    ><ShieldCheck className="w-3 h-3" /> Waive</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Approval Matrix */}
      <div className="space-y-3">
        <h3 className="text-xs font-black text-white uppercase tracking-widest">Risk-Based Approval Matrix</h3>
        <div className="space-y-2">
          {APPROVAL_MATRIX.map((row) => (
            <div key={row.tier} className="flex items-start gap-4 p-4 bg-black border border-slate-900 rounded-2xl">
              <span className={`text-[10px] font-black uppercase tracking-widest whitespace-nowrap ${row.color} min-w-[140px]`}>{row.tier}</span>
              <span className="text-[10px] text-slate-400 flex-1">{row.requirements}</span>
              <div className="flex gap-1.5 flex-wrap justify-end">
                {row.roles.map((r) => (
                  <span key={r} className="text-[9px] font-black text-slate-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded">{r}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-slate-600 leading-relaxed">
          Users may not approve their own prompt for production when the risk tier requires independent review. Every override must capture approver, reason, policy basis, expiration, and affected scope. Approval status is invalidated when risk-impacting sections change after approval.
        </p>
      </div>

      <ConfirmActionModal
        open={!!approvalModal}
        mode={approvalModal?.mode || 'confirm'}
        variant={approvalModal?.variant || 'danger'}
        title={approvalModal?.title || ''}
        message={approvalModal?.message || ''}
        confirmLabel={approvalModal?.confirmLabel}
        promptPlaceholder={approvalModal?.promptPlaceholder}
        onConfirm={handleApprovalConfirm}
        onCancel={() => setApprovalModal(null)}
      />

      {/* A5 — structured rejection (category + actionable notes both required) */}
      {rejectionModal && (
        <RejectionModal
          title={rejectionModal.title}
          promptName={rejectionModal.promptName}
          onConfirm={(category, notes) => { onApprovalAction(rejectionModal.versionId, 'REJECTED', notes, category); setRejectionModal(null); }}
          onCancel={() => setRejectionModal(null)}
        />
      )}

      {/* A6 — waive with justification (governance override only) */}
      <ConfirmActionModal
        open={!!waiveModal}
        mode="confirm"
        variant="warning"
        requireReason
        reasonPlaceholder="Justification for waiving review requirements (policy basis, why it is safe)…"
        title={waiveModal ? `Waive review for "${waiveModal.promptName}"` : ''}
        message="Waiving completes the review chain under governance override and records an immutable audit event. Hard safety/compliance gates cannot be waived."
        confirmLabel="Waive with Justification"
        onConfirm={(value) => { if (waiveModal) { onWaive(waiveModal.versionId, (value || '').trim()); setWaiveModal(null); } }}
        onCancel={() => setWaiveModal(null)}
      />
    </div>
  );
}

// ─── Tab: Evidence ─────────────────────────────────────────────────────────────

function EvidenceTab({
  prompts,
  auditStats,
  onExportPromptEvidence,
}: {
  prompts: PromptRecord[];
  auditStats: AuditStats | null;
  onExportPromptEvidence: (prompt: PromptRecord, context: string) => void;
}) {
  const EVIDENCE_TYPES = [
    { icon: GitBranch, label: "Prompt Version Records", desc: "ID, version, author, date, body hash, variables, rules, knowledge, tools." },
    { icon: History, label: "Diff Records", desc: "Text changes, variable changes, risk changes, routing changes, tool-use changes." },
    { icon: FlaskConical, label: "Test Evidence", desc: "Suite version, inputs, outputs, evaluator scores, pass/fail, run timestamp." },
    { icon: FileCheck, label: "Approval Evidence", desc: "Approver, role, decision, timestamp, comments, conditions, waiver reason." },
    { icon: Layers, label: "Deployment Evidence", desc: "Environment, scope, deployed by/at, release note, impacted agents/workflows." },
    { icon: Cpu, label: "Runtime Evidence", desc: "Prompt version, model, tools called, knowledge retrieved, policy result, output status." },
    { icon: AlertTriangle, label: "Incident Evidence", desc: "Trigger, affected version/scope, rollback decision, resolution, post-incident note." },
  ];

  const productionPrompts = prompts.filter((p) => p.status === "PRODUCTION_ACTIVE");

  return (
    <div className="space-y-8">
      {/* Audit stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Events", value: auditStats?.total ?? 0, color: "text-white" },
          { label: "Today", value: auditStats?.today ?? 0, color: "text-indigo-400" },
          { label: "Warnings", value: auditStats?.warnings ?? 0, color: "text-amber-400" },
          { label: "Errors", value: auditStats?.errors ?? 0, color: "text-rose-400" },
        ].map((s) => (
          <div key={s.label} className="bg-black border border-slate-900 rounded-2xl p-5 text-center">
            <div className={`text-3xl font-black ${s.color}`}>{s.value}</div>
            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Evidence types */}
      <div className="space-y-3">
        <h3 className="text-xs font-black text-white uppercase tracking-widest">Evidence Object Types</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {EVIDENCE_TYPES.map((e) => {
            const Icon = e.icon;
            return (
              <div key={e.label} className="flex items-start gap-3 p-4 bg-black border border-slate-900 rounded-2xl">
                <div className="p-2 bg-slate-950 border border-slate-800 rounded-xl shrink-0">
                  <Icon className="w-4 h-4 text-indigo-400" />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-white">{e.label}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">{e.desc}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Production evidence export */}
      <div className="space-y-3">
        <h3 className="text-xs font-black text-white uppercase tracking-widest">Export Evidence Packages — Production Active</h3>
        {productionPrompts.length === 0 && <p className="text-sm text-slate-600">No production-active prompts.</p>}
        {productionPrompts.map((p) => (
          <div key={p.id} className="flex items-center gap-4 p-4 bg-black border border-slate-900 rounded-2xl">
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-bold text-white truncate">{p.name}</div>
              <div className="text-[10px] text-slate-500">{p.active_version} · deployed {new Date(p.last_deployed).toLocaleDateString()}</div>
            </div>
            <RiskBadge tier={p.risk_tier} />
            <button
              onClick={() => onExportPromptEvidence(p, "evidence_tab")}
              className="flex items-center gap-2 px-4 py-1.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-indigo-500/20 transition-all"
            >
              <Download className="w-3 h-3" />
              Export Pack
            </button>
          </div>
        ))}
      </div>

      {/* Governance Receipts */}
      <div className="space-y-3">
        <h3 className="text-xs font-black text-white uppercase tracking-widest">Governance Receipts — Production Deployments</h3>
        <p className="text-[10px] text-slate-500 leading-relaxed">Every production deployment, approval, rollback, or retirement generates a signed Governance Receipt stored in the Evidence Vault. The receipt carries the cryptographic prompt-body hash and the policy state in effect at deployment time. Open the Governance Center to view or regenerate the sealed receipt and its verifiable hash.</p>
        {productionPrompts.length === 0 ? (
          <div className="p-6 text-center text-sm text-slate-600 bg-black border border-slate-900 rounded-2xl">No production receipts yet. Receipts are generated when a prompt reaches Production Active status.</div>
        ) : (
          <div className="space-y-3">
            {productionPrompts.map((p) => (
              <div key={p.id} className="bg-black border border-indigo-500/15 rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 border-b border-slate-900 bg-indigo-500/5">
                  <div className="flex items-center gap-3">
                    <FileCheck className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="text-[11px] font-black text-white">{p.name}</span>
                    <span className="text-[9px] font-black text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded uppercase tracking-widest">{p.active_version}</span>
                  </div>
                  <RiskBadge tier={p.risk_tier} />
                </div>
                <div className="p-4 grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    { label: "Active Version", value: p.active_version || "—" },
                    { label: "Deployment Scope", value: p.linked_agent && p.linked_agent !== "—" ? p.linked_agent : "All agents" },
                    { label: "Linked Workflow", value: p.linked_workflow && p.linked_workflow !== "—" ? p.linked_workflow : "—" },
                    { label: "Approved By", value: p.approvals.filter(a => a.decision === "APPROVED").map(a => a.reviewer_role).join(", ") || "—" },
                    { label: "Deployed At", value: p.last_deployed ? new Date(p.last_deployed).toLocaleDateString() : "—" },
                    { label: "Risk Tier", value: RISK_META[normalizeRiskTier(p.risk_tier)].label },
                  ].map((f) => (
                    <div key={f.label} className="p-2.5 bg-slate-950 border border-slate-900 rounded-xl">
                      <div className="text-[9px] text-slate-600 uppercase tracking-widest">{f.label}</div>
                      <div className="text-[10px] text-slate-300 font-bold mt-0.5 font-mono truncate">{f.value}</div>
                    </div>
                  ))}
                </div>
                <div className="px-4 pb-4">
                  <span className="text-[9px] text-slate-600">Sealed cryptographic receipt (prompt-body hash + policy snapshot) is available in the Governance Center → Receipt panel and the Evidence Vault.</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-[10px] text-slate-600 leading-relaxed">
        Version numbers are sequential and immutable after deployment. Prompt body hashes are stored so exported evidence can prove the exact instruction set used. Audit records are append-only and cannot be edited through the UI.
      </p>
    </div>
  );
}

// ─── Tab: Runtime ──────────────────────────────────────────────────────────────

function RuntimeTab({
  prompts,
  hitlRules,
  onLifecycleAction,
}: {
  prompts: PromptRecord[];
  hitlRules: HitlRule[];
  onLifecycleAction: (id: string, action: string) => void;
}) {
  const RUNTIME_RULES = [
    "Runtime agents may only load production-active prompt versions for their assigned scope.",
    "Draft and staging prompts are not callable by production agents.",
    "Prompt selection checks tenant, workspace, brand, agent, workflow node, channel, locale, risk tier, model route, and effective date.",
    "Tool instructions are enforced at runtime by policy, not merely by text inside the prompt.",
    "If retrieval is mandatory, the agent must not produce final output when approved sources are unavailable unless fallback rules explicitly permit escalation.",
    "Generated output must pass policy, brand, claim, and safety checks before release.",
    "Admins may pause a prompt version immediately across its affected scope.",
    "Rollback restores a prior approved production version and records the incident, user, timestamp, reason, and affected executions.",
  ];

  const paused = prompts.filter((p) => p.status === "PAUSED");

  return (
    <div className="space-y-8">
      {/* Live stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Production Active", value: prompts.filter((p) => p.status === "PRODUCTION_ACTIVE").length, icon: Zap, color: "text-emerald-400" },
          { label: "Paused", value: paused.length, icon: PauseCircle, color: "text-orange-400" },
          { label: "HITL Rules Active", value: hitlRules.filter((r) => r.enabled).length, icon: ShieldCheck, color: "text-indigo-400" },
          { label: "Rollback Available", value: prompts.filter((p) => p.status === "PRODUCTION_ACTIVE" || p.status === "PAUSED").length, icon: RotateCcw, color: "text-amber-400" },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-black border border-slate-900 rounded-2xl p-5 flex flex-col gap-2">
              <Icon className={`w-5 h-5 ${s.color}`} />
              <div className={`text-3xl font-black ${s.color}`}>{s.value}</div>
              <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{s.label}</div>
            </div>
          );
        })}
      </div>

      {/* Paused prompts */}
      {paused.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-black text-orange-400 uppercase tracking-widest flex items-center gap-2">
            <PauseCircle className="w-4 h-4" /> Paused Prompts — Require Investigation
          </h3>
          {paused.map((p) => (
            <div key={p.id} className="p-5 bg-orange-500/5 border border-orange-500/20 rounded-2xl flex flex-wrap items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-white">{p.name}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">{p.description}</div>
              </div>
              <RiskBadge tier={p.risk_tier} />
              <div className="flex gap-2">
                <button
                  onClick={() => onLifecycleAction(p.id, "resume")}
                  className="px-4 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-emerald-500/20 transition-all"
                >
                  Resume
                </button>
                <button
                  onClick={() => onLifecycleAction(p.id, "rollback")}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-amber-500/20 transition-all"
                >
                  <RotateCcw className="w-3 h-3" />
                  Rollback
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* HITL Rules */}
      <div className="space-y-3">
        <h3 className="text-xs font-black text-white uppercase tracking-widest">Active HITL Rules — Runtime Routing</h3>
        {hitlRules.length === 0 ? (
          <p className="text-sm text-slate-600">No HITL rules configured.</p>
        ) : (
          <div className="space-y-2">
            {hitlRules.map((rule) => (
              <div key={rule.id} className="flex items-center gap-4 p-4 bg-black border border-slate-900 rounded-2xl">
                <div className={`w-2 h-2 rounded-full shrink-0 ${rule.enabled ? "bg-emerald-500" : "bg-slate-700"}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-bold text-white">{rule.trigger}</div>
                  <div className="text-[10px] text-slate-500">{rule.action} → routed to <span className="text-slate-300 font-bold">{rule.route_to_role}</span></div>
                </div>
                <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${rule.enabled ? "text-emerald-400 bg-emerald-500/10" : "text-slate-600 bg-slate-900"}`}>
                  {rule.enabled ? "ENABLED" : "DISABLED"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Drift Monitor */}
      <div className="space-y-3">
        <h3 className="text-xs font-black text-amber-400 uppercase tracking-widest flex items-center gap-2">
          <BarChart3 className="w-4 h-4" /> Drift Monitor — Post-Deployment Telemetry
        </h3>
        <p className="text-[10px] text-slate-500 leading-relaxed max-w-2xl">After deployment, every prompt is monitored for output quality, rejection rate, hallucination flags, faithfulness, brand alignment, and policy trigger rate. Prompts that exceed drift thresholds are flagged for regression testing.</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "First-Pass Acceptance", desc: "% of outputs accepted without human edit or rejection. Rising rate improves trust score.", threshold: "Target ≥ 85%", color: "text-emerald-400" },
            { label: "Remediation Rate", desc: "% of executions requiring human correction after output. High rate triggers prompt review.", threshold: "Alert > 10%", color: "text-amber-400" },
            { label: "Hallucination Flags", desc: "Outputs flagged for unsupported claims, fabricated sources, or unverifiable statistics.", threshold: "Alert > 0 on restricted", color: "text-rose-400" },
            { label: "Brand Alignment Score", desc: "Average score measuring adherence to approved voice, vocabulary, and channel constraints.", threshold: "Target ≥ 80", color: "text-indigo-400" },
            { label: "Policy Trigger Rate", desc: "Executions blocked or escalated by policy engine per 1,000 runs. High rate signals prompt design flaw.", threshold: "Alert > 5%", color: "text-orange-400" },
            { label: "Faithfulness Score", desc: "Measures citation accuracy and source grounding for knowledge-bound prompts.", threshold: "Target ≥ 90%", color: "text-teal-400" },
            { label: "Token ROI", desc: "Output quality relative to token cost. Flags expensive prompts producing low-value or low-acceptance outputs.", threshold: "Monitor weekly", color: "text-slate-400" },
            { label: "HITL Escalation Rate", desc: "Executions routed to human review. Sustained high rate indicates unclear instructions or autonomy misconfiguration.", threshold: "Alert > 15%", color: "text-amber-400" },
          ].map((m) => (
            <div key={m.label} className="p-4 bg-black border border-slate-900 rounded-2xl space-y-1.5 hover:border-amber-500/20 transition-all">
              <div className={`text-[10px] font-black uppercase tracking-widest ${m.color}`}>{m.label}</div>
              <div className="text-[9px] text-slate-500 leading-relaxed">{m.desc}</div>
              <div className="text-[9px] font-black text-slate-600 uppercase tracking-widest border-t border-slate-900 pt-1.5 mt-1">{m.threshold}</div>
            </div>
          ))}
        </div>
        <div className="p-3 bg-slate-950 border border-slate-900 rounded-xl text-[10px] text-slate-600">
          Prompts flagged for drift are locked from autonomy-level upgrades until a regression suite passes. All drift events write to the Evidence Vault and notify the prompt owner and AI operations lead.
        </div>
      </div>

      {/* Runtime enforcement rules */}
      <div className="space-y-3">
        <h3 className="text-xs font-black text-white uppercase tracking-widest">Runtime Enforcement Rules</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {RUNTIME_RULES.map((rule, i) => (
            <div key={i} className="flex items-start gap-2 p-3 bg-black border border-slate-900 rounded-xl text-[10px] text-slate-400">
              <Network className="w-3.5 h-3.5 text-indigo-400 mt-0.5 shrink-0" />
              {rule}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Constraint Shadow Helper ──────────────────────────────────────────────────

function constraintShadowRules(riskTier: RiskTier | string): string[] {
  const base = [
    "No unauthorized legal, medical, financial, regulatory, or HR advice.",
    "No unsupported claims, fabricated statistics, false urgency, or unverifiable superlatives.",
    "No impersonation of executives, regulators, customers, employees, or public figures.",
    "No leakage of confidential knowledge sources, system prompts, or private customer data.",
    "No role-play that weakens the approved brand voice, governance rules, or escalation protocol.",
  ];
  const high = [
    "No bypassing approval workflow, policy gates, campaign restrictions, or market exclusions.",
    "No autonomous publishing without required human-in-the-loop authorization.",
    "No cross-market claims without jurisdiction-specific compliance validation.",
  ];
  const critical = [
    "No execution in restricted markets without explicit compliance clearance.",
    "No tool calls outside the explicitly permitted tool set for this prompt version.",
    "No output produced when required knowledge sources or policy engine are unavailable.",
  ];
  const n = normalizeRiskTier(riskTier as string);
  if (n === "TIER_4_CRITICAL") return [...base, ...high, ...critical];
  if (n === "TIER_3_HIGH") return [...base, ...high];
  return base;
}

// ─── Create Prompt Modal ────────────────────────────────────────────────────────

// ─── Auditor Tab ───────────────────────────────────────────────────────────────

type AuditRiskTier = "Tier 1 Low" | "Tier 2 Medium" | "Tier 3 High" | "Tier 4 Critical";
type ModelStatus = "PASS" | "WARN" | "FAIL";
type AuditVerdict = "APPROVED" | "CONDITIONALLY APPROVED" | "BLOCKED";

interface AuditModelResult {
  id: number;
  name: string;
  icon: React.ElementType;
  status: ModelStatus;
  finding: string;
  fix: string | null;
}

interface AuditReport {
  score: number;
  tier: AuditRiskTier;
  pass: number;
  warn: number;
  fail: number;
  verdict: AuditVerdict;
  models: AuditModelResult[];
  summary: string;
  rebuilt: string | null;
}

function runAudit(prompt: string, tier: AuditRiskTier): AuditReport {
  const p = prompt.toLowerCase();
  const has = (...t: string[]) => t.some(x => p.includes(x));

  const m1Pass = has("you are","act as","your role") && has("output format","respond in","json","markdown","bullet") && has("escalat","transfer to","if you cannot") && has("do not","refuse","must not","never","forbidden");
  const m1Warn = !m1Pass && (has("you are","act as") || has("output format","json") || has("escalat") || has("refuse","do not"));
  const m2Pass = has("do not generate","prohibited","safety block","unsafe") && has("illegal","harmful","hate","violence","explicit") && has("restricted claim","medical advice","legal advice") && has("escalat","human review","safety team");
  const m2Warn = !m2Pass && (has("prohibited","unsafe","harmful") || has("escalat","review"));
  const m3Pass = has("tone:","voice:","brand voice","formal","professional") && has("banned term","avoid using","never say") && has("approved vocabulary","use the term") && has("channel:","platform:","for email","for web");
  const m3Warn = !m3Pass && (has("tone:","voice:","professional","formal") || has("banned","avoid using"));
  const m4Pass = has("approved source","knowledge base","internal document","only use") && has("cite","citation","source:","reference:") && has("do not fabricate","no unsupported","must verify","only verified");
  const m4Warn = !m4Pass && (has("source","knowledge") || has("cite","citation"));
  const m5Pass = has("allowed tool","permitted tool","tool:","function:","api:") && has("only when","condition:","before calling") && has("do not fabricate","never invent","do not simulate tool");
  const m5Warn = !m5Pass && (has("tool:","function:","api:") || has("only when","condition:"));
  const m6Pass = has("{{","}}","[variable]","input:","parameter:") && has("valid value","allowed value","must be one of","enum:") && has("fallback","default:","if missing","if empty") && has("edge case","guardrail","max length","character limit");
  const m6Warn = !m6Pass && (has("{{","parameter:","input:") || has("fallback","default:"));
  const m7Pass = has("owner:","maintained by","author:","contact:") && has("version:","v1.","v2.","revision:") && has("environment:","production","staging","scope:") && has("rollback","recovery","revert","fallback version");
  const m7Warn = !m7Pass && (has("version:","v1.","revision:") || has("owner:","author:"));
  const m8Pass = has("prompt id:","pid-","ref:","uid:","identifier:") && has("approved by","reviewed by","sign-off","authorized by") && has("tested against","test evidence","qa pass","validated by");
  const m8Warn = !m8Pass && (has("id:","ref:","uid:") || has("approved by","reviewed by"));

  const score = (s: boolean, w: boolean) => s ? "PASS" : w ? "WARN" : "FAIL";
  const pts = (s: ModelStatus) => s === "PASS" ? 100 : s === "WARN" ? 60 : 20;

  const models: AuditModelResult[] = [
    { id:1, name:"Instruction Adherence", icon:MessageSquareCode, status:score(m1Pass,m1Warn) as ModelStatus,
      finding: m1Pass ? "Role, format, escalation, and refusal rules all defined." : m1Warn ? "Some elements present but incomplete." : "Role or output behavior undefined.",
      fix: !m1Pass ? "Add role definition, output format, escalation triggers, and refusal rules." : null },
    { id:2, name:"Safety & Policy", icon:ShieldAlert, status:score(m2Pass,m2Warn) as ModelStatus,
      finding: m2Pass ? "Safety blocks, prohibited content, restricted claims, and escalation path all present." : m2Warn ? "Safety implied but not fully enforced." : "No safety or policy rules found.",
      fix: !m2Pass ? "Add prohibited content list, safety blocks, restricted claim categories, and escalation path." : null },
    { id:3, name:"Brand & Tone", icon:BookOpen, status:score(m3Pass,m3Warn) as ModelStatus,
      finding: m3Pass ? "Brand voice, banned terms, approved vocabulary, and channel constraints defined." : m3Warn ? "Tone referenced but enforcement terms or channel constraints missing." : "No brand or tone guidance found.",
      fix: !m3Pass ? "Define tone, list banned terms, specify approved vocabulary, add channel constraints." : null },
    { id:4, name:"Grounding & Citations", icon:Eye, status:score(m4Pass,m4Warn) as ModelStatus,
      finding: m4Pass ? "Approved sources, citation rules, and prohibition on unsupported claims all stated." : m4Warn ? "Grounding implied but sources unnamed or citation rules incomplete." : "No grounding rules — model can use any knowledge freely.",
      fix: !m4Pass ? "Name approved sources, require citations for factual claims, prohibit fabrication." : null },
    { id:5, name:"Tool-Use Governance", icon:Wrench, status:score(m5Pass,m5Warn) as ModelStatus,
      finding: m5Pass ? "Allowed tools, trigger conditions, and anti-fabrication rule all declared." : m5Warn ? "Tool use referenced but conditions vague or fabrication not blocked." : "No tool-use rules found.",
      fix: !m5Pass ? "List allowed tools, specify trigger conditions, explicitly prohibit fabricating tool results." : null },
    { id:6, name:"Variables & Guardrails", icon:Variable, status:score(m6Pass,m6Warn) as ModelStatus,
      finding: m6Pass ? "Variables named with allowed values, fallbacks, and edge-case guardrails." : m6Warn ? "Variables present but fallback or validation logic missing." : "No variables or guardrails defined.",
      fix: !m6Pass ? "Define variables with allowed values, fallback behavior, and edge-case guardrails." : null },
    { id:7, name:"Rollback & Lifecycle", icon:RotateCcw, status:score(m7Pass,m7Warn) as ModelStatus,
      finding: m7Pass ? "Owner, version ID, environment, and rollback path all declared." : m7Warn ? "Some lifecycle metadata present but incomplete." : "No ownership, versioning, or lifecycle context found.",
      fix: !m7Pass ? "Add owner, version ID, environment scope, and rollback recovery procedure." : null },
    { id:8, name:"Evidence & Auditability", icon:FileText, status:score(m8Pass,m8Warn) as ModelStatus,
      finding: m8Pass ? "Unique ID, approval reference, and test evidence all present." : m8Warn ? "Some audit markers present but traceability incomplete." : "No traceability — cannot prove who approved or what was tested.",
      fix: !m8Pass ? "Add unique prompt ID, approval reference, and test evidence note." : null },
  ];

  const pass = models.filter(m => m.status === "PASS").length;
  const warn = models.filter(m => m.status === "WARN").length;
  const fail = models.filter(m => m.status === "FAIL").length;
  const overall = Math.round(models.reduce((s,m) => s + pts(m.status), 0) / 8);
  const verdict: AuditVerdict = fail > 0 || overall < 50 ? "BLOCKED" : overall < 70 || warn >= 4 ? "CONDITIONALLY APPROVED" : "APPROVED";

  const passing = models.filter(m => m.status === "PASS").map(m => m.name);
  const failing = models.filter(m => m.status !== "PASS").map(m => m.name);
  const summary = `${pass > 0 ? `Strong compliance in ${passing.slice(0,2).join(" and ")}.` : "No models pass in current form."} ${failing.length > 0 ? `Critical gaps in ${failing.slice(0,3).join(", ")}.` : "No significant gaps."} ${verdict === "APPROVED" ? `Safe to deploy at ${tier}.` : verdict === "CONDITIONALLY APPROVED" ? `Requires remediation before deployment at ${tier}.` : `NOT safe to deploy at ${tier} — rebuild required.`}`;

  const rebuilt = overall < 70 || fail > 0 ? `## GOVERNED PROMPT — PRODUCTION READY
## Prompt ID: PID-${Math.random().toString(36).slice(2,10).toUpperCase()}
## Version: 1.0.0
## Owner: [TEAM NAME] — [team@organization.com]
## Environment: Production
## Approval: Approved by [APPROVER NAME] on [DATE] — ref: GOV-REVIEW-[ID]
## Test Evidence: Passed QA suite v1.0 — [DATE] — verified by [QA TEAM]
## Audit Reference: AUDIT-REF-[ID]

ROLE: You are a [SPECIFY ROLE] for [ORGANIZATION]. Your sole function is [SPECIFY]. Refuse all out-of-scope requests with: "This request falls outside my authorized function."

OUTPUT FORMAT: Status: [SUCCESS|PARTIAL|REFUSED] | Response: [...] | Sources: [...] | Escalation: [NONE|REQUIRED]

SAFETY: Do not generate illegal, harmful, sexually explicit, hateful, or deceptive content. Never provide medical, legal, or financial advice. Escalate unsafe inputs immediately.

BRAND & TONE: Voice: professional, clear, authoritative. Banned terms: [LIST]. Approved vocabulary: [LIST]. Channel: [WEB|EMAIL|SMS].

GROUNDING: Only use approved sources: [LIST]. Cite all factual claims. Do not fabricate statistics, quotes, or events.

TOOLS: Allowed tools: [LIST]. Only call when explicitly required. Never simulate tool results — if tool fails, say so.

VARIABLES: {{user_name}} fallback: "Valued Customer". {{request_type}} must be one of [LIST]. {{context}} max 2000 chars.

ROLLBACK: If behavior degrades, disable and revert to [PREV VERSION]. Notify [OWNER EMAIL]. Review quarterly.` : null;

  return { score: overall, tier, pass, warn, fail, verdict, models, summary, rebuilt };
}

const AUDIT_STATUS = {
  PASS: { color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", icon: CheckCircle2 },
  WARN: { color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20", icon: AlertTriangle },
  FAIL: { color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/20", icon: XCircle },
};

function AuditScoreRing({ score }: { score: number }) {
  const r = 40, c = 2 * Math.PI * r;
  const color = score >= 70 ? "#34d399" : score >= 50 ? "#fbbf24" : "#f87171";
  return (
    <div className="relative w-28 h-28 flex items-center justify-center">
      <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 96 96">
        <circle cx="48" cy="48" r={r} fill="none" stroke="#1e293b" strokeWidth="8" />
        <circle cx="48" cy="48" r={r} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c - (score / 100) * c}
          style={{ transition: "stroke-dashoffset 1s ease" }} />
      </svg>
      <div className="text-center z-10">
        <div className="text-3xl font-black" style={{ color }}>{score}</div>
        <div className="text-[10px] text-slate-500">/100</div>
      </div>
    </div>
  );
}

function AuditorTab() {
  const [prompt, setPrompt] = useState("");
  const [tier, setTier] = useState<AuditRiskTier>("Tier 2 Medium");
  const [report, setReport] = useState<AuditReport | null>(null);
  const [running, setRunning] = useState(false);
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);

  const handleAudit = () => {
    if (!prompt.trim()) return;
    setRunning(true); setReport(null);
    setTimeout(() => { setReport(runAudit(prompt, tier)); setRunning(false); }, 1200);
  };

  const handleCopy = () => {
    if (report?.rebuilt) { navigator.clipboard.writeText(report.rebuilt); setCopied(true); setTimeout(() => setCopied(false), 2000); }
  };

  const VERDICT_STYLE = {
    "APPROVED": { color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
    "CONDITIONALLY APPROVED": { color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
    "BLOCKED": { color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/20" },
  };

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h2 className="text-sm font-black text-white uppercase tracking-widest">Prompt Governance Auditor</h2>
        <p className="text-[11px] text-slate-500">Evaluate any prompt against all 8 ZoikoVertex governance models and get a full compliance report.</p>
      </div>

      {/* Input */}
      <div className="bg-black border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="space-y-1 flex-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Risk Tier</label>
            <select value={tier} onChange={e => setTier(e.target.value as AuditRiskTier)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 transition-all">
              {(["Tier 1 Low","Tier 2 Medium","Tier 3 High","Tier 4 Critical"] as AuditRiskTier[]).map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Prompt to Audit</label>
          <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={9}
            placeholder="Paste the prompt you want to audit here..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white placeholder:text-slate-700 focus:outline-none focus:border-indigo-500 resize-none font-mono transition-all leading-relaxed" />
          <div className="flex justify-between text-[10px] text-slate-600">
            <span>{prompt.length} characters</span><span>{prompt.trim().split(/\s+/).filter(Boolean).length} words</span>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={handleAudit} disabled={!prompt.trim() || running}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed">
            {running ? <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Running...</> : <><ShieldCheck className="w-3.5 h-3.5"/>Run Audit</>}
          </button>
          {report && <button onClick={() => { setReport(null); setPrompt(""); setExpanded(null); }}
            className="px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-[10px] font-black text-slate-400 hover:text-white uppercase tracking-widest transition-all">Reset</button>}
        </div>
      </div>

      {/* Report */}
      {report && (
        <div className="space-y-5">
          {/* Score Summary */}
          <div className="bg-black border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-1 h-5 rounded-full bg-indigo-500"/><span className="text-[10px] font-black text-white uppercase tracking-widest">Section 1 — Score Summary</span>
            </div>
            <div className="flex flex-col md:flex-row gap-6 items-center">
              <div className="flex flex-col items-center gap-2"><AuditScoreRing score={report.score}/><span className="text-[10px] text-slate-500 font-bold">Overall Score</span></div>
              <div className="flex-1 grid grid-cols-2 gap-3">
                <div className={`col-span-2 flex items-center gap-3 p-3.5 rounded-xl border ${VERDICT_STYLE[report.verdict].bg} ${VERDICT_STYLE[report.verdict].border}`}>
                  <ShieldCheck className={`w-5 h-5 ${VERDICT_STYLE[report.verdict].color}`}/>
                  <div><div className={`text-base font-black ${VERDICT_STYLE[report.verdict].color}`}>{report.verdict}</div><div className="text-[10px] text-slate-500">Final Verdict · {report.tier}</div></div>
                </div>
                <div className="p-3 rounded-xl border border-slate-800 bg-slate-950 text-center"><div className="text-xl font-black text-emerald-400">{report.pass}</div><div className="text-[9px] text-slate-600 uppercase tracking-widest mt-0.5">Pass</div></div>
                <div className="p-3 rounded-xl border border-slate-800 bg-slate-950 grid grid-cols-2 gap-2 text-center">
                  <div><div className="text-xl font-black text-amber-400">{report.warn}</div><div className="text-[9px] text-slate-600 uppercase tracking-widest mt-0.5">Warn</div></div>
                  <div><div className="text-xl font-black text-rose-400">{report.fail}</div><div className="text-[9px] text-slate-600 uppercase tracking-widest mt-0.5">Fail</div></div>
                </div>
              </div>
            </div>
          </div>

          {/* Model Findings */}
          <div className="bg-black border border-slate-800 rounded-2xl overflow-hidden">
            <div className="flex items-center gap-2 p-5 border-b border-slate-800">
              <div className="w-1 h-5 rounded-full bg-indigo-500"/><span className="text-[10px] font-black text-white uppercase tracking-widest">Section 2 — Model Findings</span>
            </div>
            <div className="divide-y divide-slate-900">
              {report.models.map(m => {
                const cfg = AUDIT_STATUS[m.status];
                const Icon = cfg.icon;
                const MIcon = m.icon;
                const open = expanded === m.id;
                return (
                  <div key={m.id} className="hover:bg-slate-950 transition-colors">
                    <button onClick={() => setExpanded(open ? null : m.id)} className="w-full flex items-center gap-3 p-4 text-left">
                      <div className={`w-8 h-8 rounded-xl ${cfg.bg} border ${cfg.border} flex items-center justify-center shrink-0`}>
                        <MIcon className={`w-3.5 h-3.5 ${cfg.color}`}/>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2"><span className="text-[10px] text-slate-600">M{m.id}</span><span className="text-xs font-bold text-white">{m.name}</span></div>
                        <p className="text-[10px] text-slate-500 truncate mt-0.5">{m.finding}</p>
                      </div>
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black border ${cfg.bg} ${cfg.border} ${cfg.color} shrink-0`}>
                        <Icon className="w-3 h-3"/>{m.status}
                      </span>
                    </button>
                    {open && (
                      <div className="px-4 pb-4 ml-11 border-l-2 border-slate-800 space-y-2 ml-[60px]">
                        <div><span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Finding</span><p className="text-xs text-slate-300 mt-1 leading-relaxed">{m.finding}</p></div>
                        {m.fix && <div><span className="text-[9px] font-black text-amber-500 uppercase tracking-widest">Fix Required</span><p className="text-xs text-slate-400 mt-1 leading-relaxed">{m.fix}</p></div>}
                        {!m.fix && <div className="flex items-center gap-1.5 text-xs text-emerald-400"><CheckCircle2 className="w-3.5 h-3.5"/>No fix required</div>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Executive Summary */}
          <div className="bg-black border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3"><div className="w-1 h-5 rounded-full bg-indigo-500"/><span className="text-[10px] font-black text-white uppercase tracking-widest">Section 3 — Executive Summary</span></div>
            <p className="text-xs text-slate-300 leading-relaxed bg-slate-950 border border-slate-800 rounded-xl p-4">{report.summary}</p>
          </div>

          {/* Rebuilt Prompt */}
          {report.rebuilt && (
            <div className="bg-black border border-rose-500/20 rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between p-5 border-b border-slate-800">
                <div className="flex items-center gap-2"><div className="w-1 h-5 rounded-full bg-rose-500"/><div><span className="text-[10px] font-black text-white uppercase tracking-widest">Section 4 — Rebuilt Prompt</span><p className="text-[10px] text-slate-500 mt-0.5">Score below 70 or a model failed — production-ready governed prompt generated.</p></div></div>
                <button onClick={handleCopy} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-[10px] text-slate-400 hover:text-white hover:border-slate-600 transition-all shrink-0">
                  {copied ? <><Check className="w-3.5 h-3.5 text-emerald-400"/>Copied!</> : <><Copy className="w-3.5 h-3.5"/>Copy</>}
                </button>
              </div>
              <div className="p-5">
                <div className="flex items-start gap-2 mb-3 p-3 rounded-xl bg-rose-500/5 border border-rose-500/15">
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-400 mt-0.5 shrink-0"/>
                  <p className="text-[10px] text-rose-300/80">Replace all <code className="bg-rose-500/10 px-1 rounded text-rose-400">[BRACKETED PLACEHOLDERS]</code> with your actual values before deploying.</p>
                </div>
                <pre className="text-[10px] text-slate-400 font-mono leading-relaxed whitespace-pre-wrap bg-slate-950 border border-slate-800 rounded-xl p-4 overflow-x-auto max-h-96 overflow-y-auto">{report.rebuilt}</pre>
              </div>
            </div>
          )}

          {!report.rebuilt && (
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0"/>
              <div><p className="text-xs font-bold text-emerald-400">No Rebuild Required</p><p className="text-[10px] text-slate-500 mt-0.5">Scored {report.score}/100 with no FAIL conditions — approved for deployment at {report.tier}.</p></div>
            </div>
          )}
        </div>
      )}

      {!report && !running && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-4">
            <ShieldCheck className="w-7 h-7 text-indigo-400"/>
          </div>
          <h3 className="text-sm font-bold text-white mb-2">Ready to Audit</h3>
          <p className="text-xs text-slate-500 max-w-sm leading-relaxed">Paste any prompt above, set the risk tier, and click <strong className="text-white">Run Audit</strong> to evaluate it against all 8 governance models.</p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {["Instruction Adherence","Safety & Policy","Brand & Tone","Grounding","Tool-Use","Variables","Lifecycle","Auditability"].map(l => (
              <span key={l} className="px-3 py-1 rounded-full bg-slate-950 border border-slate-800 text-[10px] text-slate-500">{l}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

type CreateMode = "scratch" | "template" | "clone" | "import" | "workflow_node";

// A1 — Doc 3 §5/§12: five governed starting paths.
function CreatePromptModal({ onClose, onCreate, creating, prompts }: {
  onClose: () => void;
  onCreate: (data: any) => Promise<{ ok: boolean; error?: string }>;
  creating: boolean;
  prompts: PromptRecord[];
}) {
  const [mode, setMode] = useState<CreateMode>("scratch");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [promptType, setPromptType] = useState<PromptType>("system");
  const [riskTier, setRiskTier] = useState<RiskTier>("TIER_2_MEDIUM");
  const [sourceId, setSourceId] = useState("");
  const [importJson, setImportJson] = useState("");
  const [workflows, setWorkflows] = useState<{ id: string; name: string }[]>([]);
  const [workflowId, setWorkflowId] = useState("");
  const [nodeName, setNodeName] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  // Approved prompts are eligible as templates (Doc 3 §12); any prompt may be cloned.
  const templateSources = useMemo(
    () => prompts.filter((p) => ["APPROVED_STAGING", "PRODUCTION_PENDING", "PRODUCTION_ACTIVE", "PAUSED", "RETIRED", "ARCHIVED"].includes(normalizeStatus(p.status))),
    [prompts],
  );

  useEffect(() => {
    if (mode !== "workflow_node" || workflows.length > 0) return;
    api.get("/api/v1/agents/workflows")
      .then((res) => {
        const list = Array.isArray(res?.data) ? res.data : Array.isArray(res?.data?.workflows) ? res.data.workflows : [];
        setWorkflows(list.map((w: any) => ({ id: w.id || w.workflow_id || "", name: w.name || w.workflow_name || "Untitled workflow" })).filter((w: any) => w.id));
      })
      .catch(() => setWorkflows([]));
  }, [mode, workflows.length]);

  const MODES: { id: CreateMode; label: string; icon: React.ElementType }[] = [
    { id: "scratch", label: "Scratch", icon: Plus },
    { id: "template", label: "Template", icon: Layers },
    { id: "clone", label: "Clone", icon: Copy },
    { id: "import", label: "Import", icon: Download },
    { id: "workflow_node", label: "Workflow Node", icon: GitBranch },
  ];

  const submit = async () => {
    setLocalError(null);
    let payload: any;
    if (mode === "import") {
      let parsed: any;
      try {
        parsed = JSON.parse(importJson);
      } catch {
        setLocalError("Import failed: the definition is not valid JSON.");
        return;
      }
      payload = { mode, definition: parsed };
    } else if (mode === "template" || mode === "clone") {
      if (!sourceId) { setLocalError(`Select a source prompt to ${mode}.`); return; }
      payload = { mode, source_id: sourceId, name: name || undefined, risk_tier: riskTier };
    } else if (mode === "workflow_node") {
      if (!workflowId) { setLocalError("Select a workflow."); return; }
      if (!name) { setLocalError("Prompt name is required."); return; }
      const wf = workflows.find((w) => w.id === workflowId);
      payload = {
        mode,
        name,
        description: description || `Prompt for workflow node "${nodeName || "—"}" in ${wf?.name || "workflow"}.`,
        prompt_type: promptType,
        risk_tier: riskTier,
        linked_workflow: wf?.name || "",
        linked_workflow_id: workflowId,
      };
    } else {
      if (!name) { setLocalError("Prompt name is required."); return; }
      payload = { mode: "scratch", name, description, prompt_type: promptType, risk_tier: riskTier };
    }
    const result = await onCreate(payload);
    if (!result.ok) setLocalError(result.error || "Failed to create prompt.");
  };

  const typeAndRisk = (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Type</label>
        <select value={promptType} onChange={(e) => setPromptType(e.target.value as PromptType)} className="w-full bg-black border border-slate-800 rounded-xl px-3 py-3 text-white outline-none focus:border-indigo-500 transition-all text-xs">
          {(["system","agent_role","task","channel","tool_use","escalation","refusal","safety","localization"] as const).map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
        </select>
      </div>
      <div className="space-y-2">
        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Risk Tier</label>
        <select value={riskTier} onChange={(e) => setRiskTier(e.target.value as RiskTier)} className="w-full bg-black border border-slate-800 rounded-xl px-3 py-3 text-white outline-none focus:border-indigo-500 transition-all text-xs">
          {(Object.keys(RISK_META) as RiskTier[]).map((r) => <option key={r} value={r}>{RISK_META[r].label}</option>)}
        </select>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-950 border border-slate-800 rounded-[2rem] w-full max-w-lg shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between shrink-0">
          <h3 className="text-lg font-bold text-white">New Prompt</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors"><XCircle className="w-5 h-5" /></button>
        </div>

        {/* Mode selector */}
        <div className="px-6 pt-5 shrink-0">
          <div className="grid grid-cols-5 gap-1.5">
            {MODES.map((m) => {
              const Icon = m.icon;
              return (
                <button
                  key={m.id}
                  onClick={() => { setMode(m.id); setLocalError(null); }}
                  className={`flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl border text-[9px] font-black uppercase tracking-wider transition-all ${mode === m.id ? "bg-indigo-500/15 text-indigo-400 border-indigo-500/30" : "bg-black text-slate-500 border-slate-800 hover:text-slate-300"}`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto">
          {(mode === "scratch" || mode === "workflow_node") && (
            <>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Prompt Name *</label>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Brand Voice — Content Lead" className="w-full bg-black border border-slate-800 rounded-xl px-4 py-3 text-white placeholder:text-slate-700 outline-none focus:border-indigo-500 transition-all" />
              </div>
              {mode === "workflow_node" && (
                <>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Workflow *</label>
                    <select value={workflowId} onChange={(e) => setWorkflowId(e.target.value)} className="w-full bg-black border border-slate-800 rounded-xl px-3 py-3 text-white outline-none focus:border-indigo-500 transition-all text-xs">
                      <option value="">{workflows.length ? "Select a workflow…" : "Loading workflows…"}</option>
                      {workflows.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Node Name / Execution Context</label>
                    <input value={nodeName} onChange={(e) => setNodeName(e.target.value)} placeholder="e.g. caption-generation node" className="w-full bg-black border border-slate-800 rounded-xl px-4 py-3 text-white placeholder:text-slate-700 outline-none focus:border-indigo-500 transition-all" />
                  </div>
                </>
              )}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Description</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Purpose and scope of this prompt..." className="w-full bg-black border border-slate-800 rounded-xl px-4 py-3 text-white placeholder:text-slate-700 outline-none focus:border-indigo-500 transition-all h-20 resize-none text-sm" />
              </div>
              {typeAndRisk}
            </>
          )}

          {(mode === "template" || mode === "clone") && (
            <>
              <div className="p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/15 text-[10px] text-slate-400 leading-relaxed">
                {mode === "template"
                  ? "Creates a new draft copying the source's variables, guardrails, tools, knowledge bindings, and metadata. Approvals, audit history, deployments, and evidence are not copied."
                  : "Creates an independent draft copy of an existing prompt's configuration."}
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{mode === "template" ? "Source (approved prompt) *" : "Source prompt *"}</label>
                <select value={sourceId} onChange={(e) => setSourceId(e.target.value)} className="w-full bg-black border border-slate-800 rounded-xl px-3 py-3 text-white outline-none focus:border-indigo-500 transition-all text-xs">
                  <option value="">Select a source…</option>
                  {(mode === "template" ? templateSources : prompts).map((p) => <option key={p.id} value={p.id}>{p.name} · {STATUS_META[normalizeStatus(p.status)].label}</option>)}
                </select>
                {mode === "template" && templateSources.length === 0 && (
                  <p className="text-[10px] text-amber-400">No approved prompts available to use as a template yet.</p>
                )}
              </div>
              {mode === "template" && (
                <>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">New Prompt Name (optional)</label>
                    <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Defaults to “<source> (From Template)”" className="w-full bg-black border border-slate-800 rounded-xl px-4 py-3 text-white placeholder:text-slate-700 outline-none focus:border-indigo-500 transition-all" />
                  </div>
                  {typeAndRisk}
                </>
              )}
            </>
          )}

          {mode === "import" && (
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Prompt Definition JSON *</label>
              <p className="text-[10px] text-slate-500 leading-relaxed">Required fields: <span className="font-mono text-slate-400">name</span>, <span className="font-mono text-slate-400">prompt_type</span>, <span className="font-mono text-slate-400">risk_tier</span>. Optional: <span className="font-mono text-slate-400">body</span>, <span className="font-mono text-slate-400">variables_json</span>, <span className="font-mono text-slate-400">guardrails_json</span>, knowledge/tool arrays. Validation runs server-side.</p>
              <textarea
                value={importJson}
                onChange={(e) => setImportJson(e.target.value)}
                placeholder={`{\n  "name": "Imported Prompt",\n  "prompt_type": "system",\n  "risk_tier": "tier_2_medium",\n  "body": "...",\n  "variables_json": {}\n}`}
                className="w-full bg-black border border-slate-800 rounded-xl px-4 py-3 text-white placeholder:text-slate-700 outline-none focus:border-indigo-500 transition-all h-48 resize-none text-[11px] font-mono"
              />
            </div>
          )}

          {localError && (
            <div className="flex items-start gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-[11px] text-rose-400 whitespace-pre-wrap">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{localError}</span>
            </div>
          )}

          <button onClick={submit} disabled={creating} className="w-full py-4 bg-indigo-500 text-white rounded-2xl font-black text-sm hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-xl shadow-indigo-500/20">
            {creating ? <><Loader2 className="w-4 h-4 animate-spin" />CREATING...</> : <><Plus className="w-4 h-4" />{mode === "clone" ? "CLONE PROMPT" : mode === "import" ? "IMPORT PROMPT" : "CREATE PROMPT"}</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── A2: Variable Authoring Editor ──────────────────────────────────────────────
// Full CRUD over governed injection variables (Doc 3 §5). Loads/saves via the
// existing version variables API; validation runs before save.

type VariableRow = {
  name: string;
  type: VariableType;
  required: boolean;
  allowedValues: string; // comma-separated (maps to validation.enumValues)
  validationRule: string; // regex pattern (maps to validation.pattern)
  fallbackValue: string; // maps to defaultValue
  example: string; // maps to examples[0]
};

type VariableType = "string" | "number" | "boolean" | "enum" | "regex" | "json" | "url" | "email";
const VARIABLE_TYPES: VariableType[] = ["string", "number", "boolean", "enum", "regex", "json", "url", "email"];

function emptyVariableRow(): VariableRow {
  return { name: "", type: "string", required: false, allowedValues: "", validationRule: "", fallbackValue: "", example: "" };
}

function VariableEditor({ versionId, editable }: { versionId?: string; editable: boolean }) {
  const [rows, setRows] = useState<VariableRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!versionId) return;
    setLoading(true);
    setError(null);
    api.get(`/api/v1/prompts/versions/${versionId}/variables`)
      .then((res) => {
        if (res?.success && res.data && typeof res.data === "object") {
          const loaded: VariableRow[] = Object.entries(res.data as Record<string, any>).map(([name, def]) => ({
            name,
            type: (def?.type as VariableType) || "string",
            required: !!def?.required,
            allowedValues: Array.isArray(def?.validation?.enumValues) ? def.validation.enumValues.join(", ") : "",
            validationRule: def?.validation?.pattern || "",
            fallbackValue: def?.defaultValue !== undefined && def?.defaultValue !== null ? String(def.defaultValue) : "",
            example: Array.isArray(def?.examples) && def.examples.length ? String(def.examples[0]) : "",
          }));
          setRows(loaded);
        } else {
          setRows([]);
        }
      })
      .catch(() => setError("Failed to load variables."))
      .finally(() => setLoading(false));
  }, [versionId]);

  const update = (i: number, patch: Partial<VariableRow>) => setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const remove = (i: number) => setRows((rs) => rs.filter((_, idx) => idx !== i));
  const add = () => setRows((rs) => [...rs, emptyVariableRow()]);

  const validate = (): string | null => {
    const seen = new Set<string>();
    for (const r of rows) {
      const nm = r.name.trim();
      if (!nm) return "Every variable needs a name.";
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(nm)) return `Variable "${nm}" must be a machine-readable identifier (letters, numbers, underscore; no spaces).`;
      if (seen.has(nm)) return `Duplicate variable name "${nm}".`;
      seen.add(nm);
      if (r.type === "enum" && !r.allowedValues.trim()) return `Enum variable "${nm}" requires allowed values.`;
      if (r.validationRule.trim()) {
        try { new RegExp(r.validationRule); } catch { return `Variable "${nm}" has an invalid validation regex.`; }
      }
    }
    return null;
  };

  const save = async () => {
    setError(null); setNotice(null);
    const v = validate();
    if (v) { setError(v); return; }
    const payload: Record<string, any> = {};
    for (const r of rows) {
      const validation: Record<string, unknown> = {};
      if (r.type === "enum" && r.allowedValues.trim()) validation.enumValues = r.allowedValues.split(",").map((s) => s.trim()).filter(Boolean);
      if (r.validationRule.trim()) validation.pattern = r.validationRule.trim();
      payload[r.name.trim()] = {
        name: r.name.trim(),
        type: r.type,
        required: r.required,
        ...(Object.keys(validation).length ? { validation } : {}),
        ...(r.fallbackValue !== "" ? { defaultValue: r.fallbackValue } : {}),
        ...(r.example !== "" ? { examples: [r.example] } : {}),
      };
    }
    setSaving(true);
    try {
      const res = await api.put(`/api/v1/prompts/versions/${versionId}/variables`, { variables: payload });
      if (res?.success) setNotice(`Saved ${rows.length} variable definition(s).`);
      else setError(res?.error || "Failed to save variables.");
    } catch (e: any) {
      setError(e?.message || "Failed to save variables.");
    } finally {
      setSaving(false);
    }
  };

  if (!versionId) return <p className="text-[11px] text-slate-600 italic">No active version — create a draft version before defining variables.</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-[10px] text-slate-500 uppercase tracking-widest font-black flex items-center gap-2"><Variable className="w-3.5 h-3.5 text-indigo-400" /> Governed Variables</div>
        {editable && <button onClick={add} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-indigo-500/20 transition-all"><Plus className="w-3 h-3" /> Add Variable</button>}
      </div>

      {!editable && <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/15 text-[10px] text-amber-400">This prompt is not in an editable state, or you lack edit permission. Variables are read-only.</div>}
      {loading ? (
        <div className="flex items-center gap-2 py-6 text-slate-500"><Loader2 className="w-4 h-4 animate-spin" /><span className="text-xs">Loading variables…</span></div>
      ) : rows.length === 0 ? (
        <p className="text-[11px] text-slate-600 italic">No variables defined for this version.</p>
      ) : (
        <div className="space-y-3">
          {rows.map((r, i) => (
            <div key={i} className="p-4 bg-black border border-slate-900 rounded-2xl space-y-3">
              <div className="flex items-center gap-2">
                <input disabled={!editable} value={r.name} onChange={(e) => update(i, { name: e.target.value })} placeholder="variable_name" className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-white outline-none focus:border-indigo-500 disabled:opacity-60" />
                <select disabled={!editable} value={r.type} onChange={(e) => update(i, { type: e.target.value as VariableType })} className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-2 text-[11px] text-slate-300 outline-none focus:border-indigo-500 disabled:opacity-60">
                  {VARIABLE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <label className="flex items-center gap-1 text-[10px] text-slate-400 whitespace-nowrap"><input disabled={!editable} type="checkbox" checked={r.required} onChange={(e) => update(i, { required: e.target.checked })} /> required</label>
                {editable && <button onClick={() => remove(i)} className="p-1.5 text-rose-400/70 hover:text-rose-400 transition-colors" title="Delete variable"><XCircle className="w-4 h-4" /></button>}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input disabled={!editable} value={r.allowedValues} onChange={(e) => update(i, { allowedValues: e.target.value })} placeholder="Allowed values (comma-separated)" className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-[11px] text-white outline-none focus:border-indigo-500 disabled:opacity-60" />
                <input disabled={!editable} value={r.validationRule} onChange={(e) => update(i, { validationRule: e.target.value })} placeholder="Validation regex" className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-[11px] font-mono text-white outline-none focus:border-indigo-500 disabled:opacity-60" />
                <input disabled={!editable} value={r.fallbackValue} onChange={(e) => update(i, { fallbackValue: e.target.value })} placeholder="Fallback / default value" className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-[11px] text-white outline-none focus:border-indigo-500 disabled:opacity-60" />
                <input disabled={!editable} value={r.example} onChange={(e) => update(i, { example: e.target.value })} placeholder="Example" className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-[11px] text-white outline-none focus:border-indigo-500 disabled:opacity-60" />
              </div>
            </div>
          ))}
        </div>
      )}

      {error && <div className="flex items-start gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-[11px] text-rose-400"><AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /><span>{error}</span></div>}
      {notice && <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-[11px] text-emerald-400"><Check className="w-4 h-4 shrink-0" /><span>{notice}</span></div>}
      {editable && rows.length > 0 && (
        <button onClick={save} disabled={saving} className="w-full py-3 bg-indigo-500 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-indigo-600 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
          {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><Check className="w-4 h-4" /> Save Variables</>}
        </button>
      )}
    </div>
  );
}

// ─── A2: Guardrail Authoring Editor ──────────────────────────────────────────────
// CRUD + reorder over governed guardrails (Doc 3 §5). Persists onto the version's
// existing guardrails_json via the guardrails API.

type GuardrailCategory = "policy_rule" | "prohibited_instruction" | "claim_rule" | "safety_block" | "escalation_trigger" | "refusal_rule";
const GUARDRAIL_CATEGORIES: { id: GuardrailCategory; label: string }[] = [
  { id: "policy_rule", label: "Policy Rule" },
  { id: "prohibited_instruction", label: "Prohibited Instruction" },
  { id: "claim_rule", label: "Claim Rule" },
  { id: "safety_block", label: "Safety Block" },
  { id: "escalation_trigger", label: "Escalation Trigger" },
  { id: "refusal_rule", label: "Refusal Rule" },
];
type GuardrailRow = { category: GuardrailCategory; rule: string; enabled: boolean };

function GuardrailEditor({ promptId, versionId, editable }: { promptId: string; versionId?: string; editable: boolean }) {
  const [rows, setRows] = useState<GuardrailRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!versionId) return;
    setLoading(true);
    setError(null);
    api.get(`/api/v1/prompts/${promptId}/versions/${versionId}`)
      .then((res) => {
        const gj = res?.data?.guardrails_json;
        const parsed = typeof gj === "string" ? (() => { try { return JSON.parse(gj); } catch { return null; } })() : gj;
        const list = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.rules) ? parsed.rules : [];
        setRows(list.map((g: any) => ({
          category: (g?.category as GuardrailCategory) || "policy_rule",
          rule: String(g?.rule || ""),
          enabled: g?.enabled !== false,
        })));
      })
      .catch(() => setError("Failed to load guardrails."))
      .finally(() => setLoading(false));
  }, [promptId, versionId]);

  const update = (i: number, patch: Partial<GuardrailRow>) => setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const remove = (i: number) => setRows((rs) => rs.filter((_, idx) => idx !== i));
  const add = () => setRows((rs) => [...rs, { category: "policy_rule", rule: "", enabled: true }]);
  const move = (i: number, dir: -1 | 1) => setRows((rs) => {
    const j = i + dir;
    if (j < 0 || j >= rs.length) return rs;
    const copy = [...rs];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    return copy;
  });

  const save = async () => {
    setError(null); setNotice(null);
    for (const r of rows) {
      if (!r.rule.trim()) { setError("Every guardrail needs rule text."); return; }
    }
    setSaving(true);
    try {
      const res = await api.put(`/api/v1/prompts/versions/${versionId}/guardrails`, {
        guardrails: { rules: rows.map((r) => ({ category: r.category, rule: r.rule.trim(), enabled: r.enabled })) },
      });
      if (res?.success) setNotice(`Saved ${rows.length} guardrail(s).`);
      else setError(res?.error || "Failed to save guardrails.");
    } catch (e: any) {
      setError(e?.message || "Failed to save guardrails.");
    } finally {
      setSaving(false);
    }
  };

  if (!versionId) return <p className="text-[11px] text-slate-600 italic">No active version — create a draft version before defining guardrails.</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-[10px] text-slate-500 uppercase tracking-widest font-black flex items-center gap-2"><ShieldCheck className="w-3.5 h-3.5 text-rose-400" /> Guardrails</div>
        {editable && <button onClick={add} className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-rose-500/20 transition-all"><Plus className="w-3 h-3" /> Add Guardrail</button>}
      </div>
      {!editable && <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/15 text-[10px] text-amber-400">This prompt is not in an editable state, or you lack edit permission. Guardrails are read-only.</div>}
      {loading ? (
        <div className="flex items-center gap-2 py-6 text-slate-500"><Loader2 className="w-4 h-4 animate-spin" /><span className="text-xs">Loading guardrails…</span></div>
      ) : rows.length === 0 ? (
        <p className="text-[11px] text-slate-600 italic">No guardrails defined for this version.</p>
      ) : (
        <div className="space-y-2">
          {rows.map((r, i) => (
            <div key={i} className="p-3 bg-black border border-slate-900 rounded-2xl space-y-2">
              <div className="flex items-center gap-2">
                <select disabled={!editable} value={r.category} onChange={(e) => update(i, { category: e.target.value as GuardrailCategory })} className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-2 text-[11px] text-slate-300 outline-none focus:border-rose-500 disabled:opacity-60">
                  {GUARDRAIL_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
                <label className="flex items-center gap-1 text-[10px] text-slate-400 whitespace-nowrap"><input disabled={!editable} type="checkbox" checked={r.enabled} onChange={(e) => update(i, { enabled: e.target.checked })} /> enabled</label>
                <div className="ml-auto flex items-center gap-1">
                  {editable && <>
                    <button onClick={() => move(i, -1)} disabled={i === 0} className="px-1.5 py-1 text-slate-500 hover:text-white disabled:opacity-30" title="Move up">↑</button>
                    <button onClick={() => move(i, 1)} disabled={i === rows.length - 1} className="px-1.5 py-1 text-slate-500 hover:text-white disabled:opacity-30" title="Move down">↓</button>
                    <button onClick={() => remove(i)} className="p-1.5 text-rose-400/70 hover:text-rose-400" title="Delete guardrail"><XCircle className="w-4 h-4" /></button>
                  </>}
                </div>
              </div>
              <textarea disabled={!editable} value={r.rule} onChange={(e) => update(i, { rule: e.target.value })} placeholder="Guardrail rule text…" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-[11px] text-white outline-none focus:border-rose-500 h-16 resize-none disabled:opacity-60" />
            </div>
          ))}
        </div>
      )}
      {error && <div className="flex items-start gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-[11px] text-rose-400"><AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /><span>{error}</span></div>}
      {notice && <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-[11px] text-emerald-400"><Check className="w-4 h-4 shrink-0" /><span>{notice}</span></div>}
      {editable && rows.length > 0 && (
        <button onClick={save} disabled={saving} className="w-full py-3 bg-rose-500 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-rose-600 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
          {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><Check className="w-4 h-4" /> Save Guardrails</>}
        </button>
      )}
    </div>
  );
}

// ─── A3: Inline Pre-Submit Validation (Doc 3 §12) ───────────────────────────────
// Computes blocking/warning checks from REAL data: the prompt record + the live
// governance snapshot (degraded dependencies + approval validity). No fakes.

type ValidationLevel = "pass" | "warning" | "blocking";
interface ValidationCheck { key: string; label: string; level: ValidationLevel; detail: string; }

function PreSubmitValidation({ prompt, onResult }: { prompt: PromptRecord; onResult: (hasBlocking: boolean) => void }) {
  const [snapshot, setSnapshot] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.get(`/api/v1/prompts/${prompt.id}/governance-snapshot`)
      .then((res) => { if (!cancelled) setSnapshot(res?.success ? res.data : null); })
      .catch(() => { if (!cancelled) setSnapshot(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [prompt.id]);

  const checks = useMemo<ValidationCheck[]>(() => {
    const degraded: any[] = Array.isArray(snapshot?.degraded_dependencies) ? snapshot.degraded_dependencies : [];
    const typeOf = (d: any) => String(d?.dependency_type || d?.type || "").toLowerCase();
    const knowledgeDegraded = degraded.filter((d) => ["knowledge", "collection"].includes(typeOf(d)));
    const toolDegraded = degraded.filter((d) => typeOf(d) === "tool");
    const approvalInvalidated = snapshot?.approval_validity?.invalidated === true;
    const hasRejected = prompt.approvals.some((a) => a.decision === "REJECTED");
    const ownerMissing = !prompt.owner || ["unknown", "—", ""].includes(String(prompt.owner).toLowerCase());
    const riskMissing = !prompt.risk_tier;
    const testPass = prompt.last_test?.pass_fail === "PASS";

    return [
      { key: "owner", label: "Owner assigned", level: ownerMissing ? "blocking" : "pass", detail: ownerMissing ? "Assign an owner before submitting for review." : String(prompt.owner) },
      { key: "risk", label: "Risk tier set", level: riskMissing ? "blocking" : "pass", detail: riskMissing ? "Set a risk tier." : RISK_META[normalizeRiskTier(prompt.risk_tier)].label },
      { key: "tests", label: "Variables & prompt tested", level: testPass ? "pass" : "blocking", detail: testPass ? `Last test passed (${prompt.last_test?.score}%).` : "Run the test suite and pass before review (untested variables)." },
      { key: "tools", label: "Tools approved & available", level: toolDegraded.length ? "blocking" : "pass", detail: toolDegraded.length ? `${toolDegraded.length} tool binding(s) unapproved or unavailable.` : "No unapproved tools." },
      { key: "knowledge", label: "Knowledge bindings available", level: knowledgeDegraded.length ? "blocking" : "pass", detail: knowledgeDegraded.length ? `${knowledgeDegraded.length} knowledge source(s) unavailable.` : "All bound knowledge sources available." },
      { key: "approval", label: "No approval conflicts", level: approvalInvalidated ? "blocking" : hasRejected ? "warning" : "pass", detail: approvalInvalidated ? (snapshot?.approval_validity?.reason || "Approval invalidated by a risk-impacting change.") : hasRejected ? "A prior reviewer rejected this version." : "No approval conflicts." },
    ];
  }, [snapshot, prompt]);

  const hasBlocking = checks.some((c) => c.level === "blocking");
  useEffect(() => { if (!loading) onResult(hasBlocking); }, [loading, hasBlocking, onResult]);

  const ICON: Record<ValidationLevel, { icon: React.ElementType; cls: string }> = {
    pass: { icon: CheckCircle2, cls: "text-emerald-400" },
    warning: { icon: AlertTriangle, cls: "text-amber-400" },
    blocking: { icon: XCircle, cls: "text-rose-400" },
  };

  return (
    <div className={`rounded-2xl border p-4 space-y-2 ${hasBlocking ? "border-rose-500/20 bg-rose-500/5" : "border-emerald-500/15 bg-emerald-500/5"}`}>
      <div className="flex items-center gap-2">
        <ShieldCheck className={`w-3.5 h-3.5 ${hasBlocking ? "text-rose-400" : "text-emerald-400"}`} />
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Pre-Submit Validation</span>
        {loading && <Loader2 className="w-3 h-3 animate-spin text-slate-500" />}
        <span className={`ml-auto text-[10px] font-black uppercase tracking-widest ${hasBlocking ? "text-rose-400" : "text-emerald-400"}`}>{hasBlocking ? "Blocked" : "Ready"}</span>
      </div>
      <div className="space-y-1.5">
        {checks.map((c) => {
          const { icon: Icon, cls } = ICON[c.level];
          return (
            <div key={c.key} className="flex items-start gap-2">
              <Icon className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${cls}`} />
              <div className="min-w-0">
                <span className="text-[11px] font-bold text-slate-300">{c.label}</span>
                <span className="text-[10px] text-slate-500"> — {c.detail}</span>
              </div>
            </div>
          );
        })}
      </div>
      {hasBlocking && <p className="text-[10px] text-rose-400/80 leading-relaxed">Resolve the blocking items above before submitting for review. Warnings do not block submission.</p>}
    </div>
  );
}

// ─── A4: Post-Deployment Confirmation (Doc 3 §12) ────────────────────────────────
function DeploymentConfirmation({ data, prompt, onClose, onRollback, onOpenInCenter }: {
  data: any;
  prompt: PromptRecord;
  onClose: () => void;
  onRollback: () => void;
  onOpenInCenter: (promptId: string, versionId?: string) => void;
}) {
  const [affectedAgents, setAffectedAgents] = useState<string[]>([]);
  const [affectedWorkflows, setAffectedWorkflows] = useState<string[]>([]);

  useEffect(() => {
    api.get(`/api/v1/prompts/${prompt.id}/graph`)
      .then((res) => {
        const edges: any[] = Array.isArray(res?.data?.edges) ? res.data.edges : [];
        const byType = (t: string) => Array.from(new Set(edges
          .filter((e) => String(e?.dependency_type || "").toLowerCase() === t)
          .map((e) => String(e?.dependency_name || e?.target || "").trim())
          .filter(Boolean)));
        setAffectedAgents(byType("agent"));
        setAffectedWorkflows(byType("workflow").concat(byType("workflow_node")));
      })
      .catch(() => { /* fall back to prompt-level links below */ });
  }, [prompt.id]);

  const agents = affectedAgents.length ? affectedAgents : (data.linked_agent && data.linked_agent !== "—" ? [data.linked_agent] : []);
  const workflows = affectedWorkflows.length ? affectedWorkflows : (data.linked_workflow && data.linked_workflow !== "—" ? [data.linked_workflow] : []);

  const rows: { label: string; value: string }[] = [
    { label: "Deployed Version", value: data.version_number || prompt.active_version || "—" },
    { label: "Environment / Scope", value: String(data.environment || "—").toUpperCase() },
    { label: "Deployed At", value: data.deployed_at ? new Date(data.deployed_at).toLocaleString() : "—" },
    { label: "Deployed By", value: data.deployed_by || "—" },
    { label: "Rollback Target", value: data.rollback_to_version_id ? `Version ${String(data.rollback_to_version_id).slice(0, 8)}…` : "None (first deployment)" },
  ];

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-950 border border-emerald-500/25 rounded-[2rem] w-full max-w-lg shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-emerald-500/5">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <h3 className="text-lg font-bold text-white">Deployment Confirmed</h3>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors"><XCircle className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-5">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white">{prompt.name}</span>
            <RiskBadge tier={prompt.risk_tier} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {rows.map((r) => (
              <div key={r.label} className="p-3 bg-black border border-slate-900 rounded-xl">
                <div className="text-[9px] text-slate-600 uppercase tracking-widest">{r.label}</div>
                <div className="text-[11px] text-white font-bold mt-1 break-words">{r.value}</div>
              </div>
            ))}
          </div>
          <div>
            <div className="text-[10px] text-slate-500 uppercase tracking-widest font-black mb-2">Affected Agents</div>
            {agents.length ? (
              <div className="flex flex-wrap gap-2">{agents.map((a) => <span key={a} className="inline-flex items-center gap-1 text-[10px] text-slate-300 bg-black border border-slate-800 px-2 py-1 rounded-lg"><Cpu className="w-3 h-3 text-indigo-400" />{a}</span>)}</div>
            ) : <p className="text-[10px] text-slate-600 italic">No agents directly bound to this prompt.</p>}
          </div>
          <div>
            <div className="text-[10px] text-slate-500 uppercase tracking-widest font-black mb-2">Affected Workflows</div>
            {workflows.length ? (
              <div className="flex flex-wrap gap-2">{workflows.map((w) => <span key={w} className="inline-flex items-center gap-1 text-[10px] text-slate-300 bg-black border border-slate-800 px-2 py-1 rounded-lg"><GitBranch className="w-3 h-3 text-amber-400" />{w}</span>)}</div>
            ) : <p className="text-[10px] text-slate-600 italic">No workflows directly bound to this prompt.</p>}
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            <button onClick={() => onOpenInCenter(prompt.id, data.version_id)} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-indigo-500/20 transition-all">
              <FileCheck className="w-3 h-3" /> View Evidence / Receipt
            </button>
            {data.evidence_id && (
              <a href={`/evidence/evidence-vault/items/${data.evidence_id}`} className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 border border-slate-800 text-slate-400 text-[10px] font-black uppercase tracking-widest rounded-lg hover:text-white hover:border-slate-600 transition-all">
                <ArrowRight className="w-3 h-3" /> Evidence Vault
              </a>
            )}
            <button onClick={() => { onRollback(); onClose(); }} className="flex items-center gap-1.5 px-4 py-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-amber-500/20 transition-all">
              <RotateCcw className="w-3 h-3" /> Rollback
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── A5: Structured Rejection Modal (Doc 3 §7) ───────────────────────────────────
const REJECTION_CATEGORIES: { id: string; label: string }[] = [
  { id: "safety", label: "Safety" },
  { id: "compliance", label: "Compliance" },
  { id: "brand", label: "Brand" },
  { id: "quality", label: "Quality" },
  { id: "legal", label: "Legal" },
  { id: "security", label: "Security" },
  { id: "missing_evidence", label: "Missing Evidence" },
  { id: "failed_test", label: "Failed Test" },
  { id: "approval_conflict", label: "Approval Conflict" },
  { id: "other", label: "Other" },
];

function RejectionModal({ title, promptName, onConfirm, onCancel }: {
  title: string;
  promptName: string;
  onConfirm: (category: string, notes: string) => void;
  onCancel: () => void;
}) {
  const [category, setCategory] = useState("");
  const [notes, setNotes] = useState("");
  const valid = category && notes.trim().length >= 4;
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-950 border border-rose-500/25 rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-base font-bold text-white">{title}</h3>
          <button onClick={onCancel} className="text-slate-500 hover:text-white transition-colors"><XCircle className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-[11px] text-slate-500">{promptName}</p>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Reason Category *</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full bg-black border border-slate-800 rounded-xl px-3 py-3 text-white outline-none focus:border-rose-500 transition-all text-xs">
              <option value="">Select a category…</option>
              {REJECTION_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Actionable Notes *</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Describe the specific change required…" className="w-full bg-black border border-slate-800 rounded-xl px-4 py-3 text-white placeholder:text-slate-700 outline-none focus:border-rose-500 transition-all h-24 resize-none text-sm" />
          </div>
          <div className="flex gap-2">
            <button onClick={onCancel} className="flex-1 py-3 rounded-xl border border-slate-800 text-slate-300 font-semibold text-sm hover:bg-slate-900 transition-all">Cancel</button>
            <button onClick={() => onConfirm(category, notes.trim())} disabled={!valid} className="flex-1 py-3 rounded-xl bg-rose-600 text-white font-bold text-sm hover:bg-rose-500 disabled:opacity-50 transition-all">Submit</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Prompt Detail Drawer ──────────────────────────────────────────────────────

function PromptDetailDrawer({
  prompt,
  onClose,
  onLifecycleAction,
  onVersionAction,
  onExportEvidence,
  onOpenInCenter,
}: {
  prompt: PromptRecord;
  onClose: () => void;
  onLifecycleAction: (id: string, action: string) => void;
  onVersionAction: (versionId: string, action: string, extra?: any) => void;
  onExportEvidence: (prompt: PromptRecord, context: string) => void;
  onOpenInCenter: (promptId: string, versionId?: string) => void;
}) {
  const [drawerTab, setDrawerTab] = useState<"overview" | "body" | "bindings" | "variables" | "guardrails" | "history">("overview");
  // A2/A7: variables & guardrails are editable unless the prompt is immutable.
  // Server still enforces ownership (prompt.edit.own/any) and returns 403 if denied.
  const editable = !["RETIRED", "ARCHIVED"].includes(normalizeStatus(prompt.status));
  // A3: inline pre-submit validation result gates the Submit-for-Review action.
  const [submitBlocked, setSubmitBlocked] = useState(false);
  const showPreSubmit = ["DRAFT", "INTERNAL_TEST", "REVIEW_REQUESTED"].includes(normalizeStatus(prompt.status));
  const [promptBody, setPromptBody] = useState<string | null>(null);
  const [loadingBody, setLoadingBody] = useState(false);
  const [bodyFetched, setBodyFetched] = useState(false);
  const [versions, setVersions] = useState<any[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [versionsFetched, setVersionsFetched] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  // ── FIX: reset cached drawer state when the user opens a different prompt.
  //    Without this, switching between prompts shows the previous prompt's
  //    body until the new tab is re-clicked.
  useEffect(() => {
    setPromptBody(null);
    drawerRef.current?.scrollTo({ top: 0, behavior: "instant" });
    setBodyFetched(false);
    setVersions([]);
    setVersionsFetched(false);
  }, [prompt.id]);

  // ── FIX: use a `*Fetched` boolean flag as the guard instead of comparing
  //    against null/empty array. Previously the guards `promptBody === null`
  //    and `versions.length === 0` stayed true forever when the API returned
  //    no body / an empty version list, causing infinite re-fetch loops.
  useEffect(() => {
    if (drawerTab === "body" && !bodyFetched && !loadingBody) {
      setLoadingBody(true);
      api.get(`/api/v1/prompts/${prompt.id}`)
        .then((res) => {
          if (res?.success && res.data) {
            const body = res.data.body || res.data.content || res.data.prompt_body || "";
            setPromptBody(body);
          }
        })
        .catch(() => {})
        .finally(() => {
          setBodyFetched(true);
          setLoadingBody(false);
        });
    }
  }, [drawerTab, prompt.id, bodyFetched, loadingBody]);

  useEffect(() => {
    if (drawerTab === "history" && !versionsFetched && !loadingVersions) {
      setLoadingVersions(true);
      api.get(`/api/v1/prompts/${prompt.id}/versions`)
        .then((res) => {
          if (res?.success && Array.isArray(res.data)) {
            setVersions(res.data);
          }
        })
        .catch(() => {})
        .finally(() => {
          setVersionsFetched(true);
          setLoadingVersions(false);
        });
    }
  }, [drawerTab, prompt.id, versionsFetched, loadingVersions]);

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div ref={drawerRef} className="w-full max-w-2xl bg-slate-950 border-l border-slate-800 overflow-y-auto flex flex-col">
        {/* Drawer header */}
        <div className="p-6 border-b border-slate-800 space-y-4 sticky top-0 bg-slate-950 z-10">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="text-lg font-black text-white">{prompt.name}</div>
              <div className="flex flex-wrap gap-2">
                <StatusBadge status={prompt.status} />
                <RiskBadge tier={prompt.risk_tier} />
                <span className="text-[10px] font-black text-slate-400 bg-black border border-slate-800 px-2 py-1 rounded-lg">{prompt.active_version}</span>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl border border-slate-800 text-slate-400 hover:text-white hover:border-slate-600 transition-all">
              <XCircle className="w-4 h-4" />
            </button>
          </div>
          <div className="flex gap-1">
            {(["overview", "body", "bindings", "variables", "guardrails", "history"] as const).map((t) => (
              <button key={t} onClick={() => setDrawerTab(t)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${drawerTab === t ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30" : "text-slate-500 hover:text-white"}`}>
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6 space-y-5 flex-1">
          {drawerTab === "overview" && (
            <>
              <div className="space-y-1">
                <div className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Description</div>
                <div className="text-sm text-slate-300 leading-relaxed">{prompt.description}</div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Owner", value: prompt.owner },
                  { label: "Type", value: prompt.prompt_type },
                  { label: "Linked Agent", value: prompt.linked_agent },
                  { label: "Linked Workflow", value: prompt.linked_workflow },
                  { label: "Last Deployed", value: prompt.last_deployed ? new Date(prompt.last_deployed).toLocaleString() : "—" },
                  { label: "Active Version", value: prompt.active_version },
                ].map((f) => (
                  <div key={f.label} className="p-3 bg-black border border-slate-900 rounded-xl">
                    <div className="text-[9px] text-slate-600 uppercase tracking-widest">{f.label}</div>
                    <div className="text-xs text-white font-bold mt-1">{f.value}</div>
                  </div>
                ))}
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase tracking-widest font-black mb-2">Last Test</div>
                <TestBadge result={prompt.last_test} />
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase tracking-widest font-black mb-2">Approval Chain</div>
                <ApprovalChain approvals={prompt.approvals} riskTier={prompt.risk_tier} />
                <div className="mt-2 space-y-1">
                  {prompt.approvals.map((a, i) => (
                    <div key={i} className="flex items-center gap-3 text-[10px] text-slate-400">
                      <div className={`w-2 h-2 rounded-full ${a.decision === "APPROVED" ? "bg-emerald-500" : a.decision === "REJECTED" ? "bg-rose-500" : "bg-amber-500/40 border border-amber-500"}`} />
                      <span className="font-bold text-slate-300">{a.reviewer_role}</span>
                      <span>{a.decision}</span>
                      {a.notes && <span className="text-slate-600 italic">&quot;{a.notes}&quot;</span>}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase tracking-widest font-black mb-2">Constraint Shadow</div>
                <div className="space-y-1.5">
                  {constraintShadowRules(prompt.risk_tier).map((rule, i) => (
                    <div key={i} className="flex items-start gap-2 p-2.5 bg-rose-500/5 border border-rose-500/10 rounded-xl">
                      <XCircle className="w-3 h-3 text-rose-400 mt-0.5 shrink-0" />
                      <span className="text-[10px] text-slate-400 leading-relaxed">{rule}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {drawerTab === "bindings" && (
            <div className="space-y-4">
              <div>
                <div className="text-[10px] text-slate-500 uppercase tracking-widest font-black mb-2">Knowledge Sources</div>
                {prompt.knowledge_sources.length > 0 ? (
                  <div className="space-y-1">
                    {prompt.knowledge_sources.map((ks) => (
                      <div key={ks} className="flex items-center gap-2 p-3 bg-black border border-slate-900 rounded-xl text-[11px] text-slate-300">
                        <BookOpen className="w-3 h-3 text-indigo-400" />
                        {ks}
                      </div>
                    ))}
                  </div>
                ) : <p className="text-[11px] text-slate-600 italic">No knowledge sources bound.</p>}
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase tracking-widest font-black mb-2">Permitted Tools</div>
                {prompt.tools_permitted.length > 0 ? (
                  <div className="space-y-1">
                    {prompt.tools_permitted.map((t) => (
                      <div key={t} className="flex items-center gap-2 p-3 bg-black border border-slate-900 rounded-xl text-[11px] text-slate-300">
                        <Wrench className="w-3 h-3 text-amber-400" />
                        {t}
                      </div>
                    ))}
                  </div>
                ) : <p className="text-[11px] text-slate-600 italic">No tools permitted.</p>}
              </div>
            </div>
          )}

          {drawerTab === "variables" && (
            <VariableEditor versionId={prompt.active_version_id} editable={editable} />
          )}

          {drawerTab === "guardrails" && (
            <GuardrailEditor promptId={prompt.id} versionId={prompt.active_version_id} editable={editable} />
          )}

          {drawerTab === "body" && (
            <div>
              {loadingBody ? (
                <div className="flex items-center justify-center py-10 gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
                  <span className="text-xs text-slate-500">Loading prompt body…</span>
                </div>
              ) : promptBody ? (
                <div className="p-4 bg-black border border-slate-900 rounded-2xl text-[11px] text-slate-300 font-mono leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto">
                  {promptBody}
                </div>
              ) : (
                <div className="p-4 bg-black border border-slate-900 rounded-2xl text-[11px] text-slate-400 font-mono leading-relaxed">
                  <span className="text-slate-600 italic">[Version {prompt.active_version} — metadata]</span>
                  <br /><br />
                  <span className="text-indigo-400">{"// Role: "}</span>{prompt.prompt_type}<br />
                  <span className="text-indigo-400">{"// Agent: "}</span>{prompt.linked_agent}<br />
                  <span className="text-indigo-400">{"// Workflow: "}</span>{prompt.linked_workflow}<br />
                  <span className="text-indigo-400">{"// Risk Tier: "}</span>{RISK_META[normalizeRiskTier(prompt.risk_tier)].label}<br />
                  <span className="text-indigo-400">{"// Knowledge: "}</span>{prompt.knowledge_sources.join(", ") || "None"}<br />
                  <span className="text-indigo-400">{"// Tools: "}</span>{prompt.tools_permitted.join(", ") || "None"}<br /><br />
                  <span className="text-slate-500">Prompt body was not returned by the registry API. Export via Evidence Vault to retrieve the full body with hash verification.</span>
                </div>
              )}
            </div>
          )}

          {drawerTab === "history" && (
            <div className="space-y-2">
              {loadingVersions ? (
                <div className="flex items-center justify-center py-10 gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
                  <span className="text-xs text-slate-500">Loading version history…</span>
                </div>
              ) : versions.length > 0 ? (
                versions.map((v: any, i: number) => (
                  <div key={v.id || i} className="p-4 bg-black border border-slate-900 rounded-xl space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black text-white">
                        {v.version || v.version_number || `Version ${versions.length - i}`}
                      </span>
                      <div className="flex items-center gap-2">
                        {i === 0 && (
                          <span className="text-[9px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded font-black uppercase tracking-widest">Current</span>
                        )}
                        {v.state && (
                          <span className="text-[9px] text-slate-400 bg-slate-800 border border-slate-700 px-2 py-0.5 rounded font-bold uppercase tracking-widest">{v.state}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {v.created_at ? new Date(v.created_at).toLocaleString() : '—'}
                      {v.created_by_name ? ` · ${v.created_by_name}` : ''}
                    </div>
                    {v.changelog && (
                      <div className="text-[10px] text-slate-400 italic mt-1">&quot;{v.changelog}&quot;</div>
                    )}
                    <div className="text-[10px] text-slate-600">Immutable after deployment. Body hash stored in Evidence Vault.</div>
                  </div>
                ))
              ) : (
                <div className="p-4 bg-black border border-slate-900 rounded-xl text-[10px] text-slate-500">
                  No version history available. Versions are recorded each time the prompt is saved or promoted.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Deployment controls */}
        <div className="p-6 border-t border-slate-800 space-y-3 sticky bottom-0 bg-slate-950">
          <div className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Deployment Controls</div>
          {showPreSubmit && <PreSubmitValidation prompt={prompt} onResult={setSubmitBlocked} />}
          <button
            type="button"
            onClick={() => onOpenInCenter(prompt.id, prompt.active_version_id)}
            className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-indigo-400 hover:text-indigo-300"
          >
            Open in Governance Center →
          </button>
          <div className="flex flex-wrap gap-2">
            {prompt.status === "DRAFT" && (
              <button onClick={() => prompt.active_version_id && onVersionAction(prompt.active_version_id, 'run_tests')} className="px-4 py-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-blue-500/20 transition-all disabled:opacity-50" disabled={!prompt.active_version_id}>Run Tests</button>
            )}
            {prompt.status === "INTERNAL_TEST" && (
              <button
                onClick={() => { if (!submitBlocked) onLifecycleAction(prompt.id, 'submit_review'); }}
                disabled={submitBlocked}
                title={submitBlocked ? "Resolve the blocking validation items above before submitting." : "Submit for review"}
                className="px-4 py-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-amber-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >Submit for Review</button>
            )}
            {prompt.status === "APPROVED_STAGING" && (
              <button onClick={() => prompt.active_version_id && onVersionAction(prompt.active_version_id, 'deploy_production')} className="px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-indigo-500/20 transition-all disabled:opacity-50" disabled={!prompt.active_version_id}>Request Production Approval</button>
            )}
            {prompt.status === "PRODUCTION_PENDING" && (
              <button onClick={() => onLifecycleAction(prompt.id, 'commission')} className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-emerald-500/20 transition-all flex items-center gap-1.5">
                <ShieldCheck className="w-3 h-3" /> Commission
              </button>
            )}
            {prompt.status === "PRODUCTION_ACTIVE" && (
              <>
                <button onClick={() => onLifecycleAction(prompt.id, 'pause')} className="px-4 py-2 bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-orange-500/20 transition-all flex items-center gap-1.5">
                  <PauseCircle className="w-3 h-3" /> Pause
                </button>
                <button onClick={() => onLifecycleAction(prompt.id, 'rollback')} className="px-4 py-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-amber-500/20 transition-all flex items-center gap-1.5">
                  <RotateCcw className="w-3 h-3" /> Rollback
                </button>
              </>
            )}
            {prompt.status === "PAUSED" && (
              <>
                <button onClick={() => onLifecycleAction(prompt.id, 'resume')} className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-emerald-500/20 transition-all">Resume</button>
                <button onClick={() => onLifecycleAction(prompt.id, 'rollback')} className="px-4 py-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-amber-500/20 transition-all flex items-center gap-1.5">
                  <RotateCcw className="w-3 h-3" /> Rollback
                </button>
              </>
            )}
            <button
              onClick={() => onExportEvidence(prompt, "drawer")}
              className="px-4 py-2 bg-slate-900 border border-slate-800 text-slate-400 text-[10px] font-black uppercase tracking-widest rounded-lg hover:text-white hover:border-slate-600 transition-all flex items-center gap-1.5"
            >
              <Download className="w-3 h-3" /> Export Evidence
            </button>
            <button onClick={() => onLifecycleAction(prompt.id, 'clone')} className="px-4 py-2 bg-slate-900 border border-slate-800 text-slate-400 text-[10px] font-black uppercase tracking-widest rounded-lg hover:text-white hover:border-slate-600 transition-all flex items-center gap-1.5">
              <GitBranch className="w-3 h-3" /> Clone to Draft
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

// ─── Test Center ────────────────────────────────────────────────────────────
// Paste a post description → run it through the governed runtime decision
// pipeline → see which of the five possibilities it lands in and whether the
// system would APPROVE / REVIEW / BLOCK it, with KB evidence and reasoning.

const DECISION_META: Record<string, { label: string; color: string; bg: string; border: string; icon: React.ElementType }> = {
  APPROVE: { label: "Approve", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30", icon: CheckCircle2 },
  REVIEW: { label: "Review", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30", icon: AlertTriangle },
  BLOCK: { label: "Block", color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/30", icon: XCircle },
};

const TEST_PLATFORMS = ["linkedin", "twitter", "facebook", "instagram", "threads", "youtube"];

function TestCenterTab({ prompts }: { prompts: PromptRecord[] }) {
  const [description, setDescription] = useState("");
  const [platform, setPlatform] = useState("linkedin");
  const [promptId, setPromptId] = useState("");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    if (!description.trim()) return;
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      const res = await api.classifyTestDescription({
        description: description.trim(),
        platform,
        prompt_id: promptId || undefined,
      });
      if (res?.success && res.data) setResult(res.data);
      else setError(res?.error || "Governance test failed.");
    } catch (e: any) {
      setError(e.message || "Governance test failed.");
    } finally {
      setRunning(false);
    }
  };

  const decisionMeta = result ? DECISION_META[result.decision] || DECISION_META.REVIEW : null;
  const DecisionIcon = decisionMeta?.icon || FlaskConical;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black text-white tracking-tight">Test Center</h2>
        <p className="text-sm text-slate-500 mt-1">
          Simulate the runtime governance decision for any post. The engine classifies the description into one of five
          governance possibilities and returns Approve, Review, or Block — exactly as the publishing workflow would.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input */}
        <div className="bg-slate-950 border border-slate-900 rounded-3xl p-6 space-y-4">
          <label className="block text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">Post description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={8}
            placeholder="e.g. Our new supplement cures diabetes in 30 days, clinically proven by 200 studies…"
            className="w-full bg-black border border-slate-800 rounded-2xl px-4 py-3 text-sm text-slate-200 placeholder:text-slate-700 focus:outline-none focus:border-indigo-500/50 resize-none"
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-[0.25em] text-slate-500 mb-2">Platform</label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="w-full bg-black border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/50 capitalize"
              >
                {TEST_PLATFORMS.map((p) => <option key={p} value={p} className="capitalize">{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-[0.25em] text-slate-500 mb-2">Linked prompt (optional)</label>
              <select
                value={promptId}
                onChange={(e) => setPromptId(e.target.value)}
                className="w-full bg-black border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/50"
              >
                <option value="">— none —</option>
                {prompts.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>
          <button
            onClick={run}
            disabled={running || !description.trim()}
            className="w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-2xl font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {running ? "Running governance…" : "Run governance test"}
          </button>
          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-[11px] text-rose-400">
              <ShieldAlert className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}
        </div>

        {/* Result */}
        <div className="bg-slate-950 border border-slate-900 rounded-3xl p-6">
          {!result ? (
            <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center gap-3 text-slate-600">
              <FlaskConical className="w-10 h-10" />
              <p className="text-xs max-w-xs">Run a test to see the governance decision, the matched possibility, knowledge-base evidence, and the step-by-step reasoning.</p>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Decision + possibility */}
              <div className={`rounded-2xl border ${decisionMeta!.border} ${decisionMeta!.bg} p-5 flex items-start gap-4`}>
                <DecisionIcon className={`w-8 h-8 shrink-0 ${decisionMeta!.color}`} />
                <div className="space-y-1">
                  <div className={`text-2xl font-black tracking-tight ${decisionMeta!.color}`}>{decisionMeta!.label}</div>
                  <div className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                    Possibility {result.possibility.id} — {result.possibility.label}
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed pt-1">{result.reason}</p>
                </div>
              </div>

              {/* Governed prompt + risk */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-black border border-slate-900 rounded-xl p-4">
                  <div className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-600 mb-1.5">Governed Prompt</div>
                  <div className="text-xs text-slate-200 font-bold">{result.governed_prompt.label}</div>
                </div>
                <div className="bg-black border border-slate-900 rounded-xl p-4">
                  <div className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-600 mb-1.5">Risk</div>
                  <div className="text-xs text-slate-200 font-bold">{result.risk.level} · {Math.round(result.risk.score)}/100</div>
                </div>
              </div>

              {/* Categories */}
              {Object.entries(result.risk.categories || {}).some(([, v]) => v) && (
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(result.risk.categories).filter(([, v]) => v).map(([k]) => (
                    <span key={k} className="px-2.5 py-1 rounded-md bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[9px] font-black uppercase tracking-widest">{k}</span>
                  ))}
                </div>
              )}

              {/* Knowledge base */}
              {result.knowledge.checked && (
                <div className="bg-black border border-slate-900 rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.25em] text-slate-600">
                    <BookOpen className="w-3.5 h-3.5" /> Knowledge Base — {result.knowledge.status}
                  </div>
                  {result.knowledge.matches?.length > 0 ? (
                    <ul className="space-y-1.5">
                      {result.knowledge.matches.map((m: any) => (
                        <li key={m.id} className="text-xs text-slate-300 flex items-start gap-2">
                          <FileCheck className="w-3.5 h-3.5 mt-0.5 text-emerald-400 shrink-0" />
                          <span>
                            {m.title}
                            {m.citation_reference && <span className="text-slate-500"> — {m.citation_reference}</span>}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-slate-500">No supporting knowledge source found for this claim.</p>
                  )}
                </div>
              )}

              {/* Step trace */}
              <div className="space-y-1.5">
                <div className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-600">Decision trace</div>
                {result.steps.map((s: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 text-[11px]">
                    <span className="w-5 h-5 rounded-md bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 font-black text-[9px] shrink-0">{s.step}</span>
                    <span className="text-slate-400">{s.name}</span>
                    <ArrowRight className="w-3 h-3 text-slate-700" />
                    <span className="text-slate-300 font-bold">{s.result}</span>
                  </div>
                ))}
              </div>

              {result.evidence_event_id && (
                <div className="flex items-center gap-2 text-[10px] text-slate-600 pt-1 border-t border-slate-900">
                  <History className="w-3.5 h-3.5" /> Evidence event recorded: <span className="font-mono text-slate-500">{String(result.evidence_event_id).slice(0, 18)}…</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function mapBackendPrompt(b: any): PromptRecord {
  return {
    id: b.id,
    name: b.name || b.prompt_name || 'Untitled',
    prompt_type: b.prompt_type || 'system',
    owner: b.owner_name || b.created_by || 'Unknown',
    linked_agent: b.linked_agent || b.agent_id || '—',
    linked_workflow: b.linked_workflow || b.workflow_id || '—',
    risk_tier: b.risk_tier || 'TIER_2_MEDIUM',
    status: b.status || 'DRAFT',
    active_version: b.active_version || b.current_version || 'v0.0',
    active_version_id: b.active_version_id || b.current_version_id || undefined,
    last_test: b.last_test || null,
    approvals: b.approvals || [],
    last_deployed: b.last_deployed || b.last_deployed_at || '',
    description: b.description || b.prompt_description || '',
    knowledge_sources: b.knowledge_sources || [],
    tools_permitted: b.tools_permitted || [],
  };
}

export default function PromptsPage() {
  const { role } = useRoleContext();
  const [prompts, setPrompts] = useState<PromptRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("ALL");
  const [filterRisk, setFilterRisk] = useState<FilterRisk>("ALL");
  const [filterTest, setFilterTest] = useState<TestState>("ALL");
  const [activeTab, setActiveTab] = useState<ActiveTab>("registry");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [auditStats, setAuditStats] = useState<AuditStats | null>(null);
  const [approvalStats, setApprovalStats] = useState<ApprovalStats | null>(null);
  const [hitlRules, setHitlRules] = useState<HitlRule[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedPrompt, setSelectedPrompt] = useState<PromptRecord | null>(null);
  const [centerTarget, setCenterTarget] = useState<{ promptId: string; versionId?: string } | null>(null);
  const [promptsLoading, setPromptsLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creatingPrompt, setCreatingPrompt] = useState(false);
  const [promptStats, setPromptStats] = useState<any>(null);
  // A4 post-deployment confirmation state.
  const [deployConfirm, setDeployConfirm] = useState<{ data: any; prompt: PromptRecord } | null>(null);
  // A6 — only governance-override roles may waive review requirements.
  const canWaive = ["ADMIN", "GOVERNANCE_ADMIN", "WORKSPACE_OWNER", "SUPERADMIN"].includes(String(role || "").toUpperCase().replace(/\s+/g, "_"));

  const fetchPrompts = useCallback(async () => {
    setPromptsLoading(true);
    try {
      const [promptsRes, statsRes] = await Promise.all([
        api.get("/api/v1/prompts").catch(() => ({ success: false, data: null })),
        api.get("/api/v1/prompts/stats").catch(() => ({ success: false, data: null })),
      ]);
      if (promptsRes?.success && Array.isArray(promptsRes.data)) {
        setPrompts(promptsRes.data.map(mapBackendPrompt));
      } else {
        setPrompts([]);
      }
      if (statsRes?.success) {
        setPromptStats(statsRes.data);
      }
    } catch {
      // non-critical
    } finally {
      setPromptsLoading(false);
    }
  }, []);

  // A1 — five governed create paths (Doc 3 §5 / §12). Returns a result so the
  // modal can surface per-path validation errors (e.g. import schema failures)
  // inline rather than only in the page banner.
  const handleCreatePrompt = async (data: any): Promise<{ ok: boolean; error?: string }> => {
    setCreatingPrompt(true);
    try {
      const mode = data.mode || "scratch";
      let res: any;
      if (mode === "import") {
        res = await api.post("/api/v1/prompts/import", { definition: data.definition });
        if (res?.success === false) {
          const errs = Array.isArray(res.errors) ? res.errors.join("\n") : res.error;
          return { ok: false, error: errs || "Import validation failed." };
        }
      } else if (mode === "template") {
        res = await api.post(`/api/v1/prompts/${data.source_id}/template`, {
          name: data.name || undefined,
          risk_tier: data.risk_tier,
        });
      } else if (mode === "clone") {
        res = await api.post(`/api/v1/prompts/${data.source_id}/clone`, {});
      } else if (mode === "workflow_node") {
        res = await api.post("/api/v1/prompts", {
          name: data.name,
          description: data.description,
          prompt_type: data.prompt_type,
          risk_tier: data.risk_tier,
          linked_workflow: data.linked_workflow,
          linked_workflow_id: data.linked_workflow_id,
        });
      } else {
        res = await api.post("/api/v1/prompts", {
          name: data.name,
          description: data.description,
          prompt_type: data.prompt_type,
          risk_tier: data.risk_tier,
        });
      }
      if (res?.success) {
        setShowCreateModal(false);
        fetchPrompts();
        return { ok: true };
      }
      return { ok: false, error: res?.error || "Failed to create prompt." };
    } catch (e: any) {
      return { ok: false, error: e.message || "Failed to create prompt." };
    } finally {
      setCreatingPrompt(false);
    }
  };

  const handleLifecycleAction = async (id: string, action: string) => {
    try {
      const endpointMap: Record<string, string> = {
        pause: `/api/v1/prompts/${id}/pause`,
        resume: `/api/v1/prompts/${id}/resume`,
        archive: `/api/v1/prompts/${id}/archive`,
        retire: `/api/v1/prompts/${id}/retire`,
        submit_review: `/api/v1/prompts/${id}/submit-review`,
        rollback: `/api/v1/prompts/${id}/rollback`,
        clone: `/api/v1/prompts/${id}/clone`,
        commission: `/api/v1/prompts/${id}/commission`,
      };
      const endpoint = endpointMap[action];
      if (!endpoint) return;
      const res = await api.post(endpoint, {});
      if (res.success) fetchPrompts();
    } catch (e: any) {
      setError(e.message || `Failed to ${action} prompt`);
    }
  };

  const handleVersionAction = async (versionId: string, action: string, extra?: any) => {
    try {
      const endpointMap: Record<string, string> = {
        approve: `/api/v1/prompts/versions/${versionId}/approve`,
        reject: `/api/v1/prompts/versions/${versionId}/reject`,
        deploy_staging: `/api/v1/prompts/versions/${versionId}/deploy`,
        deploy_production: `/api/v1/prompts/versions/${versionId}/deploy`,
        run_tests: `/api/v1/prompts/versions/${versionId}/tests/run`,
      };
      const endpoint = endpointMap[action];
      if (!endpoint) return;
      const body = action === 'deploy_staging' ? { environment: 'staging' }
        : action === 'deploy_production' ? { environment: 'production' }
        : extra || {};
      const res = await api.post(endpoint, body);
      if (res.success) {
        // A4: surface a structured post-deployment confirmation using real
        // response data instead of an alert.
        if ((action === 'deploy_staging' || action === 'deploy_production') && res.data && selectedPrompt) {
          setDeployConfirm({ data: res.data, prompt: selectedPrompt });
        }
        fetchPrompts();
      } else if (res?.error) {
        setError(res.error);
      }
    } catch (e: any) {
      setError(e.message || `Version action failed: ${action}`);
    }
  };

  const handleApprovalAction = async (versionId: string, decision: string, comments?: string, reasonCategory?: string) => {
    try {
      const endpoint = decision === 'APPROVED'
        ? `/api/v1/prompts/versions/${versionId}/approve`
        : `/api/v1/prompts/versions/${versionId}/reject`;
      const reviewer_role = role
        ? role.toUpperCase().replace(/\s+/g, '_')
        : 'PROMPT_OWNER';
      const payload: Record<string, unknown> = { comments, reviewer_role };
      if (decision !== 'APPROVED' && reasonCategory) payload.reason_category = reasonCategory;
      const res = await api.post(endpoint, payload);
      if (res.success) {
        fetchPrompts();
        setSelectedPrompt(null);
      } else if (res?.error) {
        setError(res.error);
      }
    } catch (e: any) {
      setError(e.message || `Approval action failed`);
    }
  };

  // A6 — waive outstanding review requirements with justification (override roles only).
  const handleWaive = async (versionId: string, justification: string) => {
    try {
      const reviewer_role = role ? role.toUpperCase().replace(/\s+/g, '_') : undefined;
      const res = await api.post(`/api/v1/prompts/versions/${versionId}/waive`, { justification, reviewer_role });
      if (res.success) {
        fetchPrompts();
        setSelectedPrompt(null);
      } else if (res?.error) {
        setError(res.error);
      }
    } catch (e: any) {
      setError(e.message || `Waive failed`);
    }
  };

  const handleOpenInCenter = useCallback((promptId: string, versionId?: string) => {
    setCenterTarget({ promptId, versionId });
    setActiveTab("center");
    setSelectedPrompt(null);
  }, []);

  const downloadJson = useCallback((filename: string, payload: unknown) => {
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleExportPromptEvidence = useCallback(
    async (prompt: PromptRecord, context: string) => {
      const reason = window.prompt("Enter a reason for this evidence export:");
      if (!reason || reason.length < 8) {
        alert("A reason of at least 8 characters is required for evidence export.");
        return;
      }
      try {
        const res = await api.post(`/api/v1/prompts/${prompt.id}/evidence/export`, {
          reason,
          disclosure_mode: "governance_review",
        });
        if (res?.success === false) {
          throw new Error(res.error || res.data?.error?.message || "Evidence export failed");
        }
        alert("Evidence export created successfully. Check the Evidence Vault for the sealed package.");
      } catch (err: any) {
        alert("Evidence export failed: " + (err?.message || "Unknown error"));
      }
    },
    [],
  );

  const handleAuditExport = useCallback(() => {
    downloadJson("prompt-governance-audit-export.json", {
      exported_at: new Date().toISOString(),
      prompt_stats: promptStats,
      audit_stats: auditStats,
      approval_stats: approvalStats,
      hitl_rules: hitlRules,
      prompts,
    });
  }, [approvalStats, auditStats, downloadJson, hitlRules, promptStats, prompts]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const [hitlRes, auditRes, approvalsRes] = await Promise.all([
          api.get("/api/v1/autonomy/hitl-rules"),
          api.get("/api/v1/governance/audit/stats"),
          api.get("/api/v1/approvals/stats"),
        ]);
        if (hitlRes.success) setHitlRules(hitlRes.data || []);
        if (auditRes.success) setAuditStats(auditRes.data || null);
        if (approvalsRes.success) setApprovalStats(approvalsRes.data || null);
      } catch {
        setError("Live governance data could not be fully loaded. Displaying cached registry data.");
      } finally {
        setLoading(false);
      }
    };
    load();
    fetchPrompts();
  }, [fetchPrompts]);

  // Computed health metrics
  const productionCount = prompts.filter((p) => p.status === "PRODUCTION_ACTIVE").length;
  const draftsPending = prompts.filter((p) => p.status === "REVIEW_REQUESTED").length;
  const failedTests = prompts.filter((p) => p.last_test?.pass_fail === "FAIL").length;
  const paused = prompts.filter((p) => p.status === "PAUSED").length;

  // Simplified navigation: the few day-to-day tabs stay primary; the deeper
  // governance dashboards collapse under "Advanced" so the page reads cleanly.
  const PRIMARY_TABS: { id: ActiveTab; label: string; icon: React.ElementType }[] = [
    { id: "registry", label: "Registry", icon: MessageSquareCode },
    { id: "test_center", label: "Test Center", icon: FlaskConical },
    { id: "approvals", label: "Approvals", icon: FileCheck },
    { id: "evidence", label: "Evidence", icon: History },
  ];
  const ADVANCED_TABS: { id: ActiveTab; label: string; icon: React.ElementType }[] = [
    { id: "lifecycle", label: "Lifecycle", icon: Layers },
    { id: "testing", label: "Test Suites", icon: FlaskConical },
    { id: "runtime", label: "Runtime", icon: Network },
    { id: "auditor", label: "Auditor", icon: ShieldCheck },
    { id: "evaluation", label: "Evaluation", icon: BarChart3 },
    { id: "adversarial", label: "Adversarial", icon: ShieldAlert },
    { id: "drift", label: "Drift", icon: Activity },
    { id: "center", label: "Governance Center", icon: FileText },
  ];
  const advancedActive = ADVANCED_TABS.some((t) => t.id === activeTab);

  return (
    <div className="p-6 xl:p-8 max-w-screen-2xl mx-auto space-y-8 pb-32 bg-black min-h-screen">

      {/* Header */}
      <div className="relative overflow-hidden bg-slate-950 border border-indigo-500/20 rounded-[3rem] p-10 xl:p-14 shadow-[0_0_80px_rgba(99,102,241,0.1)]">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600/8 blur-[150px] rounded-full -mr-60 -mt-60" />
        <div className="relative z-10 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-8">
          <div className="space-y-4 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/5 border border-indigo-500/15 text-indigo-400 text-[10px] font-black uppercase tracking-[0.4em]">
              <Lock className="w-3.5 h-3.5" />
              Prompt Governance Center — Layer 1 Authority Control
            </div>
            <h1 className="text-5xl xl:text-6xl font-black text-white tracking-tighter leading-none">
              Prompt <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-rose-500 italic">Governance.</span>
            </h1>
            <p className="text-base text-slate-400 leading-relaxed font-medium">
              The governed instruction lifecycle system. Create, test, approve, deploy, monitor, rollback, and evidence every prompt used by agents, workflows, tools, and knowledge-grounded tasks inside ZoikoVertex.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleAuditExport}
              className="px-6 py-3 bg-slate-900 border border-slate-800 hover:border-slate-600 text-slate-300 hover:text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Audit Export
            </button>
            <button onClick={() => setShowCreateModal(true)} className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all shadow-xl shadow-indigo-600/20 active:scale-95">
              <Plus className="w-4 h-4" />
              New Prompt
            </button>
          </div>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-5 py-3.5 text-sm text-amber-400">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span className="text-[11px]">{error}</span>
        </div>
      )}

      {/* Health summary strip — Doc 3 §4-B: clickable metrics filter the registry */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-4">
        {([
          { label: "Total Prompts", value: prompts.length, icon: MessageSquareCode, color: "text-white", apply: () => { setFilterStatus("ALL"); setFilterTest("ALL"); } },
          { label: "Production Active", value: productionCount, icon: Zap, color: "text-emerald-400", apply: () => { setFilterStatus("PRODUCTION_ACTIVE"); setFilterTest("ALL"); } },
          { label: "Drafts / Pending", value: draftsPending, icon: Clock, color: "text-amber-400", apply: () => { setFilterStatus("REVIEW_REQUESTED"); setFilterTest("ALL"); } },
          { label: "Failed Tests", value: failedTests, icon: AlertTriangle, color: "text-rose-400", apply: () => { setFilterStatus("ALL"); setFilterTest("FAIL"); } },
          { label: "Paused", value: paused, icon: PauseCircle, color: "text-orange-400", apply: () => { setFilterStatus("PAUSED"); setFilterTest("ALL"); } },
          { label: "HITL Rules", value: hitlRules.filter((r) => r.enabled).length, icon: ShieldCheck, color: "text-indigo-400", apply: () => setActiveTab("runtime") },
        ] as const).map((stat) => {
          const Icon = stat.icon;
          return (
            <button
              key={stat.label}
              type="button"
              onClick={() => { stat.apply(); if (stat.label !== "HITL Rules") setActiveTab("registry"); }}
              className="text-left bg-slate-950 border border-slate-900 rounded-2xl p-5 hover:border-indigo-500/30 transition-all cursor-pointer focus:outline-none focus:border-indigo-500/50"
            >
              <div className="flex items-center justify-between mb-3">
                <Icon className={`w-4 h-4 ${stat.color}`} />
                <div className={`text-2xl font-black ${stat.color}`}>{stat.value}</div>
              </div>
              <div className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-600">{stat.label}</div>
            </button>
          );
        })}
      </div>

      {/* Tab navigation — primary row + collapsible Advanced group */}
      <div className="space-y-2">
        <div className="flex items-center gap-1 overflow-x-auto">
          {PRIMARY_TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? "bg-indigo-500/15 text-indigo-400 border border-indigo-500/25"
                    : "text-slate-500 hover:text-slate-300 hover:bg-slate-900"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
          <button
            onClick={() => setAdvancedOpen((v) => !v)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${
              advancedActive
                ? "bg-indigo-500/15 text-indigo-400 border border-indigo-500/25"
                : "text-slate-500 hover:text-slate-300 hover:bg-slate-900"
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            Advanced
            {advancedOpen || advancedActive ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </button>
        </div>
        {(advancedOpen || advancedActive) && (
          <div className="flex items-center gap-1 overflow-x-auto pl-1 border-l-2 border-slate-900 ml-1">
            {ADVANCED_TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${
                    activeTab === tab.id
                      ? "bg-slate-800 text-slate-200 border border-slate-700"
                      : "text-slate-600 hover:text-slate-400 hover:bg-slate-900"
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Tab content */}
      <div className="bg-[#050505] border border-slate-900 rounded-[2.5rem] p-8 shadow-2xl">
        {activeTab === "registry" && (
          <RegistryTab
            prompts={prompts}
            search={search}
            setSearch={setSearch}
            filterStatus={filterStatus}
            setFilterStatus={setFilterStatus}
            filterRisk={filterRisk}
            setFilterRisk={setFilterRisk}
            filterTest={filterTest}
            setFilterTest={setFilterTest}
            onSelectPrompt={setSelectedPrompt}
          />
        )}
        {activeTab === "test_center" && <TestCenterTab prompts={prompts} />}
        {activeTab === "lifecycle" && <LifecycleTab prompts={prompts} />}
        {activeTab === "testing" && (
          <TestingTab
            prompts={prompts}
            onRunTests={(versionId) => handleVersionAction(versionId, "run_tests")}
          />
        )}
        {activeTab === "approvals" && <ApprovalsTab prompts={prompts} approvalStats={approvalStats} onApprovalAction={handleApprovalAction} canWaive={canWaive} onWaive={handleWaive} />}
        {activeTab === "evidence" && (
          <EvidenceTab
            prompts={prompts}
            auditStats={auditStats}
            onExportPromptEvidence={handleExportPromptEvidence}
          />
        )}
        {activeTab === "runtime" && (
          <RuntimeTab
            prompts={prompts}
            hitlRules={hitlRules}
            onLifecycleAction={handleLifecycleAction}
          />
        )}
        {activeTab === "auditor" && <AuditorTab />}
        {activeTab === "evaluation" && <EvaluationDashboard embedded />}
        {activeTab === "adversarial" && <AdversarialDashboard embedded />}
        {activeTab === "drift" && <DriftDashboard embedded />}
        {activeTab === "center" && (
          <PromptGovernanceCenter
            embedded
            initialPromptId={centerTarget?.promptId}
            initialVersionId={centerTarget?.versionId}
          />
        )}
      </div>

      {/* Prompt detail drawer */}
      {selectedPrompt && (
        <PromptDetailDrawer
          prompt={selectedPrompt}
          onClose={() => setSelectedPrompt(null)}
          onLifecycleAction={handleLifecycleAction}
          onVersionAction={handleVersionAction}
          onExportEvidence={handleExportPromptEvidence}
          onOpenInCenter={handleOpenInCenter}
        />
      )}

      {/* Create prompt modal */}
      {showCreateModal && <CreatePromptModal onClose={() => setShowCreateModal(false)} onCreate={handleCreatePrompt} creating={creatingPrompt} prompts={prompts} />}

      {/* A4 — post-deployment confirmation */}
      {deployConfirm && (
        <DeploymentConfirmation
          data={deployConfirm.data}
          prompt={deployConfirm.prompt}
          onClose={() => setDeployConfirm(null)}
          onRollback={() => handleLifecycleAction(deployConfirm.prompt.id, "rollback")}
          onOpenInCenter={handleOpenInCenter}
        />
      )}
    </div>
  );
}
