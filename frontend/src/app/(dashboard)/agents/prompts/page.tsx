"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
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
} from "lucide-react";
import { api } from "@/lib/api";
import { useRoleContext } from "@/lib/context/RoleContext";

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

type ActiveTab = "registry" | "lifecycle" | "testing" | "approvals" | "evidence" | "runtime";
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

function RegistryTab({
  prompts,
  search,
  setSearch,
  filterStatus,
  setFilterStatus,
  filterRisk,
  setFilterRisk,
  onSelectPrompt,
}: {
  prompts: PromptRecord[];
  search: string;
  setSearch: (v: string) => void;
  filterStatus: FilterStatus;
  setFilterStatus: (v: FilterStatus) => void;
  filterRisk: FilterRisk;
  setFilterRisk: (v: FilterRisk) => void;
  onSelectPrompt: (p: PromptRecord) => void;
}) {
  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    return prompts.filter((p) => {
      const matchSearch = !term || p.name.toLowerCase().includes(term) || p.owner.toLowerCase().includes(term) || p.linked_agent.toLowerCase().includes(term);
      const matchStatus = filterStatus === "ALL" || p.status === filterStatus;
      const matchRisk = filterRisk === "ALL" || p.risk_tier === filterRisk;
      return matchSearch && matchStatus && matchRisk;
    });
  }, [prompts, search, filterStatus, filterRisk]);

  return (
    <div className="space-y-6">
      {/* Filters */}
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
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
          className="bg-black border border-slate-800 rounded-xl py-2.5 px-4 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 transition-all"
        >
          <option value="ALL">All Statuses</option>
          {LIFECYCLE_STAGES.map((s) => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
        </select>
        <select
          value={filterRisk}
          onChange={(e) => setFilterRisk(e.target.value as FilterRisk)}
          className="bg-black border border-slate-800 rounded-xl py-2.5 px-4 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 transition-all"
        >
          <option value="ALL">All Risk Tiers</option>
          {(Object.keys(RISK_META) as RiskTier[]).map((r) => <option key={r} value={r}>{RISK_META[r].label}</option>)}
        </select>
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
    </div>
  );
}

// ─── Tab: Approvals ────────────────────────────────────────────────────────────

function ApprovalsTab({ prompts, approvalStats, onApprovalAction }: { prompts: PromptRecord[]; approvalStats: ApprovalStats | null; onApprovalAction: (versionId: string, decision: string, comments?: string) => void }) {
  const pending = prompts.filter((p) => p.status === "REVIEW_REQUESTED" || p.status === "PRODUCTION_PENDING");

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
                      const ok = window.confirm(
                        `Approve "${p.name}"?\n\nThis will move the prompt to APPROVED status and make it eligible for production deployment. This action is recorded in the Evidence Vault.`
                      );
                      if (!ok) return;
                      onApprovalAction(p.active_version_id, 'APPROVED');
                    }}
                    disabled={!p.active_version_id}
                    className="px-4 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-emerald-500/20 transition-all disabled:opacity-50"
                  >Approve</button>
                  <button
                    disabled={!p.active_version_id}
                    onClick={() => {
                      if (!p.active_version_id) return;
                      const comment = window.prompt(
                        `Request changes for "${p.name}"\n\nEnter your reviewer comments (required):`,
                        ""
                      );
                      if (comment === null) return; // user cancelled
                      onApprovalAction(
                        p.active_version_id,
                        'REJECTED',
                        comment.trim() || 'Reviewer requested changes before approval.'
                      );
                    }}
                    className="px-4 py-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-amber-500/20 transition-all disabled:opacity-50"
                  >
                    Request Changes
                  </button>
                  <button
                    onClick={() => {
                      if (!p.active_version_id) return;
                      const reason = window.prompt(
                        `Reject "${p.name}"?\n\nProvide a rejection reason (required):`,
                        ""
                      );
                      if (reason === null) return; // user cancelled
                      onApprovalAction(
                        p.active_version_id,
                        'REJECTED',
                        reason.trim() || 'Rejected by reviewer.'
                      );
                    }}
                    disabled={!p.active_version_id}
                    className="px-4 py-1.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-rose-500/20 transition-all disabled:opacity-50"
                  >Reject</button>
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

// ─── Create Prompt Modal ────────────────────────────────────────────────────────

function CreatePromptModal({ onClose, onCreate, creating }: {
  onClose: () => void;
  onCreate: (data: any) => void;
  creating: boolean;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [promptType, setPromptType] = useState<PromptType>("system");
  const [riskTier, setRiskTier] = useState<RiskTier>("TIER_2_MEDIUM");

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-950 border border-slate-800 rounded-[2rem] w-full max-w-lg shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">New Prompt</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors"><XCircle className="w-5 h-5" /></button>
        </div>
        <div className="p-8 space-y-5">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Prompt Name *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Brand Voice — Content Lead" className="w-full bg-black border border-slate-800 rounded-xl px-4 py-3 text-white placeholder:text-slate-700 outline-none focus:border-indigo-500 transition-all" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Purpose and scope of this prompt..." className="w-full bg-black border border-slate-800 rounded-xl px-4 py-3 text-white placeholder:text-slate-700 outline-none focus:border-indigo-500 transition-all h-20 resize-none text-sm" />
          </div>
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
          <button onClick={() => onCreate({ name, description, prompt_type: promptType, risk_tier: riskTier })} disabled={creating || !name} className="w-full py-4 bg-indigo-500 text-white rounded-2xl font-black text-sm hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-xl shadow-indigo-500/20">
            {creating ? <><Loader2 className="w-4 h-4 animate-spin" />CREATING...</> : <><Plus className="w-4 h-4" />CREATE PROMPT</>}
          </button>
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
}: {
  prompt: PromptRecord;
  onClose: () => void;
  onLifecycleAction: (id: string, action: string) => void;
  onVersionAction: (versionId: string, action: string, extra?: any) => void;
  onExportEvidence: (prompt: PromptRecord, context: string) => void;
}) {
  const [drawerTab, setDrawerTab] = useState<"overview" | "body" | "bindings" | "history">("overview");
  const [promptBody, setPromptBody] = useState<string | null>(null);
  const [loadingBody, setLoadingBody] = useState(false);
  const [bodyFetched, setBodyFetched] = useState(false);
  const [versions, setVersions] = useState<any[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [versionsFetched, setVersionsFetched] = useState(false);

  // ── FIX: reset cached drawer state when the user opens a different prompt.
  //    Without this, switching between prompts shows the previous prompt's
  //    body until the new tab is re-clicked.
  useEffect(() => {
    setPromptBody(null);
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
      <div className="w-full max-w-2xl bg-slate-950 border-l border-slate-800 overflow-y-auto flex flex-col">
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
            {(["overview", "body", "bindings", "history"] as const).map((t) => (
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
          <div className="flex flex-wrap gap-2">
            {prompt.status === "DRAFT" && (
              <button onClick={() => prompt.active_version_id && onVersionAction(prompt.active_version_id, 'run_tests')} className="px-4 py-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-blue-500/20 transition-all disabled:opacity-50" disabled={!prompt.active_version_id}>Run Tests</button>
            )}
            {prompt.status === "INTERNAL_TEST" && (
              <button onClick={() => onLifecycleAction(prompt.id, 'submit_review')} className="px-4 py-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-amber-500/20 transition-all">Submit for Review</button>
            )}
            {prompt.status === "APPROVED_STAGING" && (
              <button onClick={() => prompt.active_version_id && onVersionAction(prompt.active_version_id, 'deploy_production')} className="px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-indigo-500/20 transition-all disabled:opacity-50" disabled={!prompt.active_version_id}>Request Production Approval</button>
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
  const [activeTab, setActiveTab] = useState<ActiveTab>("registry");
  const [auditStats, setAuditStats] = useState<AuditStats | null>(null);
  const [approvalStats, setApprovalStats] = useState<ApprovalStats | null>(null);
  const [hitlRules, setHitlRules] = useState<HitlRule[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedPrompt, setSelectedPrompt] = useState<PromptRecord | null>(null);
  const [promptsLoading, setPromptsLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creatingPrompt, setCreatingPrompt] = useState(false);
  const [promptStats, setPromptStats] = useState<any>(null);

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

  const handleCreatePrompt = async (data: any) => {
    setCreatingPrompt(true);
    try {
      const res = await api.post("/api/v1/prompts", data);
      if (res.success) {
        setShowCreateModal(false);
        fetchPrompts();
      }
    } catch (e: any) {
      setError(e.message || 'Failed to create prompt');
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
      if (res.success) fetchPrompts();
    } catch (e: any) {
      setError(e.message || `Version action failed: ${action}`);
    }
  };

  const handleApprovalAction = async (versionId: string, decision: string, comments?: string) => {
    try {
      const endpoint = decision === 'APPROVED'
        ? `/api/v1/prompts/versions/${versionId}/approve`
        : `/api/v1/prompts/versions/${versionId}/reject`;
      const reviewer_role = role
        ? role.toUpperCase().replace(/\s+/g, '_')
        : 'PROMPT_OWNER';
      const res = await api.post(endpoint, { comments, reviewer_role });
      if (res.success) {
        fetchPrompts();
        setSelectedPrompt(null);
      }
    } catch (e: any) {
      setError(e.message || `Approval action failed`);
    }
  };

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
    (prompt: PromptRecord, context: string) => {
      downloadJson(`prompt-evidence-${prompt.id}.json`, {
        exported_at: new Date().toISOString(),
        export_context: context,
        prompt,
        audit_stats: auditStats,
      });
    },
    [auditStats, downloadJson],
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

  const TABS: { id: ActiveTab; label: string; icon: React.ElementType }[] = [
    { id: "registry", label: "Registry", icon: MessageSquareCode },
    { id: "lifecycle", label: "Lifecycle", icon: Layers },
    { id: "testing", label: "Testing", icon: FlaskConical },
    { id: "approvals", label: "Approvals", icon: FileCheck },
    { id: "evidence", label: "Evidence", icon: History },
    { id: "runtime", label: "Runtime", icon: Network },
  ];

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

      {/* Health summary strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-4">
        {[
          { label: "Total Prompts", value: prompts.length, icon: MessageSquareCode, color: "text-white" },
          { label: "Production Active", value: productionCount, icon: Zap, color: "text-emerald-400" },
          { label: "Drafts / Pending", value: draftsPending, icon: Clock, color: "text-amber-400" },
          { label: "Failed Tests", value: failedTests, icon: AlertTriangle, color: "text-rose-400" },
          { label: "Paused", value: paused, icon: PauseCircle, color: "text-orange-400" },
          { label: "HITL Rules", value: hitlRules.filter((r) => r.enabled).length, icon: ShieldCheck, color: "text-indigo-400" },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="bg-slate-950 border border-slate-900 rounded-2xl p-5 hover:border-indigo-500/30 transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between mb-3">
                <Icon className={`w-4 h-4 ${stat.color}`} />
                <div className={`text-2xl font-black ${stat.color}`}>{stat.value}</div>
              </div>
              <div className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-600">{stat.label}</div>
            </div>
          );
        })}
      </div>

      {/* Tab navigation */}
      <div className="flex items-center gap-1 overflow-x-auto">
        {TABS.map((tab) => {
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
            onSelectPrompt={setSelectedPrompt}
          />
        )}
        {activeTab === "lifecycle" && <LifecycleTab prompts={prompts} />}
        {activeTab === "testing" && (
          <TestingTab
            prompts={prompts}
            onRunTests={(versionId) => handleVersionAction(versionId, "run_tests")}
          />
        )}
        {activeTab === "approvals" && <ApprovalsTab prompts={prompts} approvalStats={approvalStats} onApprovalAction={handleApprovalAction} />}
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
      </div>

      {/* Prompt detail drawer */}
      {selectedPrompt && (
        <PromptDetailDrawer
          prompt={selectedPrompt}
          onClose={() => setSelectedPrompt(null)}
          onLifecycleAction={handleLifecycleAction}
          onVersionAction={handleVersionAction}
          onExportEvidence={handleExportPromptEvidence}
        />
      )}

      {/* Create prompt modal */}
      {showCreateModal && <CreatePromptModal onClose={() => setShowCreateModal(false)} onCreate={handleCreatePrompt} creating={creatingPrompt} />}
    </div>
  );
}
