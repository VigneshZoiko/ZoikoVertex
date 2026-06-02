"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
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
  ScrollText,
  User,
  Fingerprint,
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

type ActiveTab = "registry" | "lifecycle" | "testing" | "approvals" | "evidence" | "audit" | "runtime" | "auditor";

interface AuditRecord {
  id: string;
  audit_ref?: string;
  prompt_id?: string;
  version_id?: string | null;
  actor_id?: string | null;
  actor_name?: string;
  actor_role?: string;
  event_type: string;
  reason?: string;
  approval_context?: Record<string, unknown>;
  risk_level?: string;
  before_state?: Record<string, unknown>;
  after_state?: Record<string, unknown>;
  evidence_reference?: string | null;
  source_ip?: string | null;
  correlation_id?: string | null;
  created_at: string;
}
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
  const normalizedRiskTier = normalizeRiskTier(riskTier);
  const required = normalizedRiskTier === "TIER_4_CRITICAL" ? 3 : normalizedRiskTier === "TIER_3_HIGH" ? 3 : normalizedRiskTier === "TIER_2_MEDIUM" ? 2 : 1;
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

      {/* Governance Receipts */}
      <div className="space-y-3">
        <h3 className="text-xs font-black text-white uppercase tracking-widest">Governance Receipts — Production Deployments</h3>
        <p className="text-[10px] text-slate-500 leading-relaxed">Every production deployment, approval, rollback, or retirement generates a signed Governance Receipt stored in the Evidence Vault. Receipts are cryptographically linked to the prompt version and policy state in effect at the time of deployment.</p>
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
                    { label: "Prompt Hash", value: `SHA-256:${p.id.slice(0,8).toUpperCase()}...` },
                    { label: "Policy Snapshot", value: "GOV-POLICY-v1.0" },
                    { label: "Deployment Scope", value: p.linked_agent || "All agents" },
                    { label: "Approved By", value: p.approvals.filter(a => a.decision === "APPROVED").map(a => a.reviewer_role).join(", ") || "—" },
                    { label: "Deployed At", value: p.last_deployed ? new Date(p.last_deployed).toLocaleDateString() : "—" },
                    { label: "Rollback Version", value: p.active_version ? `Prior ${p.active_version}` : "—" },
                  ].map((f) => (
                    <div key={f.label} className="p-2.5 bg-slate-950 border border-slate-900 rounded-xl">
                      <div className="text-[9px] text-slate-600 uppercase tracking-widest">{f.label}</div>
                      <div className="text-[10px] text-slate-300 font-bold mt-0.5 font-mono truncate">{f.value}</div>
                    </div>
                  ))}
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

// ─── Tab: Audit Trail ──────────────────────────────────────────────────────────

const AUDIT_EVENT_META: Record<string, { label: string; color: string }> = {
  "prompt.created": { label: "Prompt Created", color: "text-emerald-400" },
  "prompt.updated": { label: "Prompt Updated", color: "text-blue-400" },
  "prompt.cloned": { label: "Prompt Cloned", color: "text-teal-400" },
  "prompt.version.created": { label: "Version Created", color: "text-indigo-400" },
  "prompt.test.passed": { label: "Test Passed", color: "text-emerald-400" },
  "prompt.test.failed": { label: "Test Failed", color: "text-rose-400" },
  "prompt.review.submitted": { label: "Submitted for Review", color: "text-amber-400" },
  "prompt.approval.recorded": { label: "Approved", color: "text-emerald-400" },
  "prompt.approval.rejected": { label: "Rejected", color: "text-rose-400" },
  "prompt.production.requested": { label: "Production Requested", color: "text-indigo-400" },
  "prompt.deployed": { label: "Deployed", color: "text-emerald-400" },
  "prompt.rollback.completed": { label: "Rolled Back", color: "text-amber-400" },
  "prompt.paused": { label: "Paused", color: "text-orange-400" },
  "prompt.resumed": { label: "Resumed", color: "text-emerald-400" },
  "prompt.restored": { label: "Restored", color: "text-emerald-400" },
  "prompt.retired": { label: "Retired", color: "text-rose-400" },
  "prompt.archived": { label: "Archived", color: "text-slate-400" },
  "prompt.risk.changed": { label: "Risk Change", color: "text-orange-400" },
  "prompt.ownership.changed": { label: "Ownership Change", color: "text-blue-400" },
  "prompt.knowledge.binding_changed": { label: "Knowledge Binding Change", color: "text-indigo-400" },
  "prompt.tool_permission.changed": { label: "Tool Permission Change", color: "text-amber-400" },
  "prompt.dependency.changed": { label: "Dependency Change", color: "text-teal-400" },
};

function auditEventLabel(event: string) {
  return AUDIT_EVENT_META[event]?.label || event;
}
function auditEventColor(event: string) {
  return AUDIT_EVENT_META[event]?.color || "text-slate-300";
}

const AUDIT_RISK_COLOR: Record<string, string> = {
  low: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  medium: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  high: "text-orange-400 bg-orange-500/10 border-orange-500/20",
  critical: "text-rose-400 bg-rose-500/10 border-rose-500/20",
};

function summarizeState(state?: Record<string, unknown>): string {
  if (!state || Object.keys(state).length === 0) return "—";
  return Object.entries(state)
    .map(([k, v]) => `${k}: ${v === null || v === undefined ? "—" : typeof v === "object" ? JSON.stringify(v) : String(v)}`)
    .join(" · ");
}

const AUDIT_PAGE_SIZE = 100;

function AuditTrailTab({ prompts }: { prompts: PromptRecord[] }) {
  const [selectedId, setSelectedId] = useState<string>("");
  const [records, setRecords] = useState<AuditRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [truncated, setTruncated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [view, setView] = useState<"list" | "timeline">("list");
  const [filterEvent, setFilterEvent] = useState<string>("ALL");
  const [filterRisk, setFilterRisk] = useState<string>("ALL");

  // Default to the first prompt once the catalog loads.
  useEffect(() => {
    if (!selectedId && prompts.length > 0) setSelectedId(prompts[0].id);
  }, [prompts, selectedId]);

  // Bounded fetch. `offset === 0` resets the list; a higher offset appends the
  // next page (list view only). Timeline is server-capped and never appends, so
  // the DOM size is bounded in BOTH views — no unbounded render at 10k+ rows.
  const fetchPage = useCallback(async (offset: number) => {
    if (!selectedId) return;
    if (offset === 0) setLoading(true); else setLoadingMore(true);
    try {
      const params = new URLSearchParams();
      if (view === "list") {
        if (filterEvent !== "ALL") params.set("event_type", filterEvent);
        if (filterRisk !== "ALL") params.set("risk_level", filterRisk);
        params.set("limit", String(AUDIT_PAGE_SIZE));
        params.set("offset", String(offset));
      } else {
        params.set("limit", "500");
      }
      const path = view === "timeline"
        ? `/api/v1/prompts/${selectedId}/audit/timeline?${params.toString()}`
        : `/api/v1/prompts/${selectedId}/audit?${params.toString()}`;
      const res = await api.get(path);
      const rows: AuditRecord[] = res?.success && Array.isArray(res.data) ? res.data : [];
      setTotal(res?.pagination?.total ?? rows.length);
      setTruncated(Boolean(res?.pagination?.truncated));
      setRecords((prev) => (offset === 0 ? rows : [...prev, ...rows]));
    } catch {
      if (offset === 0) { setRecords([]); setTotal(0); setTruncated(false); }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [selectedId, filterEvent, filterRisk, view]);

  // Reset to page 0 whenever the prompt, filters, or view changes. Deps are all
  // primitives, so this cannot loop.
  useEffect(() => {
    fetchPage(0);
  }, [fetchPage]);

  const selectedPrompt = prompts.find((p) => p.id === selectedId);
  const canLoadMore = view === "list" && records.length < total;

  return (
    <div className="space-y-6">
      {/* Intro */}
      <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/15">
        <div className="flex items-center gap-2 mb-1.5">
          <ScrollText className="w-4 h-4 text-indigo-400" />
          <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Append-Only Governance Audit Trail</span>
        </div>
        <p className="text-[10px] text-slate-400 leading-relaxed">
          A dedicated immutable ledger that answers <span className="text-slate-200 font-bold">who did it, when, why, and what changed</span> — independent from the Evidence Vault and system logs. Every prompt lifecycle action writes one append-only record. Records cannot be edited, deleted, or overwritten.
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-3">
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="flex-1 bg-black border border-slate-800 rounded-xl py-2.5 px-4 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 transition-all"
        >
          {prompts.length === 0 && <option value="">No prompts available</option>}
          {prompts.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select
          value={filterEvent}
          onChange={(e) => setFilterEvent(e.target.value)}
          disabled={view === "timeline"}
          className="bg-black border border-slate-800 rounded-xl py-2.5 px-4 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 transition-all disabled:opacity-40"
        >
          <option value="ALL">All Events</option>
          {Object.keys(AUDIT_EVENT_META).map((e) => <option key={e} value={e}>{AUDIT_EVENT_META[e].label}</option>)}
        </select>
        <select
          value={filterRisk}
          onChange={(e) => setFilterRisk(e.target.value)}
          disabled={view === "timeline"}
          className="bg-black border border-slate-800 rounded-xl py-2.5 px-4 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 transition-all disabled:opacity-40"
        >
          <option value="ALL">All Risk</option>
          {["low", "medium", "high", "critical"].map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <div className="flex gap-1 bg-black border border-slate-800 rounded-xl p-1">
          {(["list", "timeline"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${view === v ? "bg-indigo-500/20 text-indigo-400" : "text-slate-500 hover:text-white"}`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Count + truncation status — prevents silent truncation at scale */}
      {!loading && records.length > 0 && (
        <div className="flex items-center justify-between text-[10px] text-slate-500">
          <span>
            Showing <span className="text-slate-300 font-bold">{records.length}</span>
            {total > records.length ? <> of <span className="text-slate-300 font-bold">{total}</span></> : null} records
          </span>
          {view === "timeline" && truncated && (
            <span className="text-amber-400">Timeline capped at latest 500 — use list view to page through all {total}.</span>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
          <span className="text-xs text-slate-500">Loading audit ledger…</span>
        </div>
      ) : records.length === 0 ? (
        <div className="p-10 text-center text-sm text-slate-600 bg-black border border-slate-900 rounded-2xl">
          {selectedPrompt ? "No audit records yet for this prompt. The ledger populates as governance actions are taken." : "Select a prompt to view its audit trail."}
        </div>
      ) : view === "timeline" ? (
        <div className="relative pl-6 space-y-4">
          <div className="absolute left-[9px] top-2 bottom-2 w-px bg-slate-800" />
          {records.map((r) => (
            <div key={r.id} className="relative">
              <div className={`absolute -left-[18px] top-1 w-3.5 h-3.5 rounded-full border-2 border-black ${auditEventColor(r.event_type).replace("text-", "bg-")}`} />
              <div className="bg-black border border-slate-900 rounded-xl p-4 space-y-1.5">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <span className={`text-[11px] font-black ${auditEventColor(r.event_type)}`}>{auditEventLabel(r.event_type)}</span>
                  <span className="text-[10px] text-slate-500">{new Date(r.created_at).toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-slate-400">
                  <User className="w-3 h-3 text-slate-500" />
                  <span className="font-bold text-slate-300">{r.actor_name || "system"}</span>
                  <span className="text-slate-600">·</span>
                  <span className="text-slate-500">{r.actor_role || "—"}</span>
                </div>
                {r.reason && <div className="text-[10px] text-slate-500 italic">&quot;{r.reason}&quot;</div>}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {records.map((r) => (
            <div key={r.id} className="bg-black border border-slate-900 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 min-w-0">
                  <FileCheck className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span className={`text-[11px] font-black ${auditEventColor(r.event_type)}`}>{auditEventLabel(r.event_type)}</span>
                  {r.risk_level && (
                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${AUDIT_RISK_COLOR[String(r.risk_level).toLowerCase()] || "text-slate-400 bg-slate-900 border-slate-800"}`}>
                      {r.risk_level}
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-slate-500 whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {[
                  { label: "Actor", value: r.actor_name || "system" },
                  { label: "Role", value: r.actor_role || "—" },
                  { label: "Version", value: r.version_id ? String(r.version_id).slice(0, 8) : "—" },
                  { label: "Audit Ref", value: r.audit_ref || String(r.id).slice(0, 8) },
                ].map((f) => (
                  <div key={f.label} className="p-2 bg-slate-950 border border-slate-900 rounded-lg">
                    <div className="text-[8px] text-slate-600 uppercase tracking-widest">{f.label}</div>
                    <div className="text-[10px] text-slate-300 font-bold mt-0.5 font-mono truncate">{f.value}</div>
                  </div>
                ))}
              </div>

              {r.reason && (
                <div className="text-[10px] text-slate-400">
                  <span className="text-slate-600 uppercase tracking-widest font-black text-[8px]">Reason</span>
                  <div className="italic mt-0.5">&quot;{r.reason}&quot;</div>
                </div>
              )}

              {(summarizeState(r.before_state) !== "—" || summarizeState(r.after_state) !== "—") && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div className="p-2.5 bg-rose-500/5 border border-rose-500/10 rounded-lg">
                    <div className="text-[8px] text-rose-400/70 uppercase tracking-widest font-black mb-0.5">Before</div>
                    <div className="text-[10px] text-slate-400 font-mono break-words">{summarizeState(r.before_state)}</div>
                  </div>
                  <div className="p-2.5 bg-emerald-500/5 border border-emerald-500/10 rounded-lg">
                    <div className="text-[8px] text-emerald-400/70 uppercase tracking-widest font-black mb-0.5">After</div>
                    <div className="text-[10px] text-slate-400 font-mono break-words">{summarizeState(r.after_state)}</div>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-4 flex-wrap pt-1 border-t border-slate-900">
                {r.evidence_reference && (
                  <div className="flex items-center gap-1.5 text-[9px] text-indigo-400">
                    <Fingerprint className="w-3 h-3" />
                    <span className="font-mono">{r.evidence_reference}</span>
                  </div>
                )}
                {r.source_ip && (
                  <div className="text-[9px] text-slate-600 font-mono">IP: {r.source_ip}</div>
                )}
                {r.correlation_id && (
                  <div className="text-[9px] text-slate-600 font-mono truncate">corr: {String(r.correlation_id).slice(0, 12)}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Load more — bounded pagination so the DOM never holds the full ledger */}
      {canLoadMore && (
        <div className="flex justify-center">
          <button
            onClick={() => fetchPage(records.length)}
            disabled={loadingMore}
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50"
          >
            {loadingMore ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ChevronDown className="w-3.5 h-3.5" />}
            Load {Math.min(AUDIT_PAGE_SIZE, total - records.length)} more
          </button>
        </div>
      )}

      <p className="text-[10px] text-slate-600 leading-relaxed">
        The audit ledger is append-only and enforced at the database tier — there is no update or delete endpoint, and direct mutation attempts are rejected. Records are tenant-isolated and never cross workspace boundaries. The list pages in batches of {AUDIT_PAGE_SIZE} and the timeline is server-capped, so the view stays responsive regardless of ledger size.
      </p>
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

// ─── Bindings Manager (Dependency Data Capture — full CRUD) ─────────────────────
// Authoritative dependency source of truth: prompt_bindings (agent/workflow),
// prompt_knowledge_bindings, prompt_tool_permissions — all keyed to a prompt
// VERSION. Replaces the legacy read-only display of prompt.knowledge_sources /
// prompt.tools_permitted. Create uses the existing POST endpoints; Update/Remove
// use the PATCH/DELETE binding endpoints.

function BindingsManager({ versionId }: { versionId?: string }) {
  const [bindings, setBindings] = useState<any[]>([]);
  const [knowledge, setKnowledge] = useState<any[]>([]);
  const [tools, setTools] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // create-form state
  const [awType, setAwType] = useState<"agent" | "workflow">("agent");
  const [awId, setAwId] = useState("");
  const [awEnv, setAwEnv] = useState("production");
  const [knId, setKnId] = useState("");
  const [knMode, setKnMode] = useState("optional");
  const [knCite, setKnCite] = useState(false);
  const [toolName, setToolName] = useState("");
  const [toolActions, setToolActions] = useState("");
  const [toolApproval, setToolApproval] = useState(false);

  // inline-edit state
  const [editing, setEditing] = useState<{ section: string; id: string } | null>(null);
  const [editVals, setEditVals] = useState<Record<string, any>>({});

  const load = useCallback(async () => {
    if (!versionId) return;
    setLoading(true);
    try {
      const [b, k, t] = await Promise.all([
        api.get(`/api/v1/prompts/versions/${versionId}/bindings`),
        api.get(`/api/v1/prompts/versions/${versionId}/knowledge`),
        api.get(`/api/v1/prompts/versions/${versionId}/tools`),
      ]);
      setBindings(b?.success && Array.isArray(b.data) ? b.data : []);
      setKnowledge(k?.success && Array.isArray(k.data) ? k.data : []);
      setTools(t?.success && Array.isArray(t.data) ? t.data : []);
    } catch {
      /* non-critical */
    } finally {
      setLoading(false);
    }
  }, [versionId]);

  useEffect(() => { load(); }, [load]);

  const run = useCallback(async (fn: () => Promise<any>) => {
    setBusy(true);
    setErr(null);
    try {
      const res = await fn();
      if (res && res.success === false) {
        setErr(res.error || "Action failed");
      } else {
        setEditing(null);
        await load();
      }
    } catch (e: any) {
      setErr(e?.message || "Action failed");
    } finally {
      setBusy(false);
    }
  }, [load]);

  if (!versionId) {
    return (
      <div className="p-4 bg-black border border-slate-900 rounded-2xl text-[11px] text-slate-500">
        This prompt has no version yet. Create a version before adding agent, workflow, knowledge, or tool dependencies — bindings attach to a specific prompt version.
      </div>
    );
  }

  const fieldCls = "bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-[11px] text-white focus:outline-none focus:border-indigo-500";

  return (
    <div className="space-y-6">
      <div className="p-3 rounded-2xl bg-indigo-500/5 border border-indigo-500/15 text-[10px] text-slate-400 leading-relaxed">
        Dependencies are the <span className="text-slate-200 font-bold">authoritative source of truth</span> for this prompt version, stored in the governed binding tables. Every change is audit-logged.
      </div>
      {err && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-[10px] text-rose-400">
          <ShieldAlert className="w-3.5 h-3.5 shrink-0" />{err}
        </div>
      )}
      {loading ? (
        <div className="flex items-center justify-center py-10 gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
          <span className="text-xs text-slate-500">Loading dependencies…</span>
        </div>
      ) : (
        <>
          {/* ── Agent / Workflow bindings ── */}
          <div className="space-y-2">
            <div className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Agent &amp; Workflow Bindings</div>
            {bindings.length === 0 && <p className="text-[11px] text-slate-600 italic">No agent or workflow bindings.</p>}
            {bindings.map((b) => (
              <div key={b.id} className="p-3 bg-black border border-slate-900 rounded-xl">
                {editing?.section === "binding" && editing.id === b.id ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <input className={fieldCls} value={editVals.target ?? ""} onChange={(e) => setEditVals((v) => ({ ...v, target: e.target.value }))} placeholder="UUID" />
                    <select className={fieldCls} value={editVals.environment ?? "production"} onChange={(e) => setEditVals((v) => ({ ...v, environment: e.target.value }))}>
                      {["staging", "production", "pilot"].map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                    <button disabled={busy} onClick={() => run(() => api.patch(`/api/v1/prompts/bindings/${b.id}`, b.agent_id ? { agent_id: editVals.target, environment: editVals.environment } : { workflow_id: editVals.target, environment: editVals.environment }))} className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest rounded-lg">Save</button>
                    <button onClick={() => setEditing(null)} className="px-3 py-1.5 bg-slate-900 border border-slate-800 text-slate-400 text-[10px] font-black uppercase tracking-widest rounded-lg">Cancel</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-indigo-400">
                      {b.agent_id ? <><Cpu className="w-3 h-3" />Agent</> : <><GitBranch className="w-3 h-3" />Workflow</>}
                    </span>
                    <span className="text-[11px] text-slate-300 font-mono truncate flex-1 min-w-0">{b.agent_id || b.workflow_id || "—"}</span>
                    <span className="text-[9px] text-slate-500 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded uppercase">{b.environment}</span>
                    <button onClick={() => { setEditing({ section: "binding", id: b.id }); setEditVals({ target: b.agent_id || b.workflow_id || "", environment: b.environment || "production" }); }} className="text-[10px] text-slate-400 hover:text-white px-2 py-1">Edit</button>
                    <button onClick={() => { if (window.confirm("Remove this binding?")) run(() => api.delete(`/api/v1/prompts/bindings/${b.id}`)); }} className="text-slate-500 hover:text-rose-400 p-1"><XCircle className="w-3.5 h-3.5" /></button>
                  </div>
                )}
              </div>
            ))}
            <div className="flex flex-wrap items-center gap-2 p-3 bg-slate-950 border border-slate-800 rounded-xl">
              <select className={fieldCls} value={awType} onChange={(e) => setAwType(e.target.value as "agent" | "workflow")}>
                <option value="agent">Agent</option>
                <option value="workflow">Workflow</option>
              </select>
              <input className={`${fieldCls} flex-1 min-w-[160px]`} value={awId} onChange={(e) => setAwId(e.target.value)} placeholder={`${awType} UUID`} />
              <select className={fieldCls} value={awEnv} onChange={(e) => setAwEnv(e.target.value)}>
                {["staging", "production", "pilot"].map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
              <button disabled={busy || !awId.trim()} onClick={() => run(async () => { const r = await api.post(`/api/v1/prompts/versions/${versionId}/bindings`, awType === "agent" ? { agent_id: awId.trim(), environment: awEnv } : { workflow_id: awId.trim(), environment: awEnv }); setAwId(""); return r; })} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-widest rounded-lg disabled:opacity-50"><Plus className="w-3 h-3" />Add</button>
            </div>
          </div>

          {/* ── Knowledge bindings ── */}
          <div className="space-y-2">
            <div className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Knowledge Bindings</div>
            {knowledge.length === 0 && <p className="text-[11px] text-slate-600 italic">No knowledge bindings.</p>}
            {knowledge.map((k) => (
              <div key={k.id} className="p-3 bg-black border border-slate-900 rounded-xl">
                {editing?.section === "knowledge" && editing.id === k.id ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <input className={`${fieldCls} flex-1 min-w-[140px]`} value={editVals.kb_id ?? ""} onChange={(e) => setEditVals((v) => ({ ...v, kb_id: e.target.value }))} placeholder="KB UUID" />
                    <select className={fieldCls} value={editVals.retrieval_mode ?? "optional"} onChange={(e) => setEditVals((v) => ({ ...v, retrieval_mode: e.target.value }))}>
                      {["optional", "mandatory", "blocked", "fallback"].map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                    <label className="flex items-center gap-1 text-[10px] text-slate-400"><input type="checkbox" checked={!!editVals.citation_required} onChange={(e) => setEditVals((v) => ({ ...v, citation_required: e.target.checked }))} />cite</label>
                    <button disabled={busy} onClick={() => run(() => api.patch(`/api/v1/prompts/knowledge-bindings/${k.id}`, { kb_id: editVals.kb_id, retrieval_mode: editVals.retrieval_mode, citation_required: editVals.citation_required }))} className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest rounded-lg">Save</button>
                    <button onClick={() => setEditing(null)} className="px-3 py-1.5 bg-slate-900 border border-slate-800 text-slate-400 text-[10px] font-black uppercase tracking-widest rounded-lg">Cancel</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 flex-wrap">
                    <BookOpen className="w-3 h-3 text-indigo-400 shrink-0" />
                    <span className="text-[11px] text-slate-300 font-mono truncate flex-1 min-w-0">{k.kb_id || k.collection_id || "—"}</span>
                    <span className="text-[9px] text-slate-500 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded uppercase">{k.retrieval_mode}</span>
                    {k.citation_required && <span className="text-[9px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded uppercase">cite</span>}
                    <button onClick={() => { setEditing({ section: "knowledge", id: k.id }); setEditVals({ kb_id: k.kb_id || "", retrieval_mode: k.retrieval_mode || "optional", citation_required: !!k.citation_required }); }} className="text-[10px] text-slate-400 hover:text-white px-2 py-1">Edit</button>
                    <button onClick={() => { if (window.confirm("Remove this knowledge binding?")) run(() => api.delete(`/api/v1/prompts/knowledge-bindings/${k.id}`)); }} className="text-slate-500 hover:text-rose-400 p-1"><XCircle className="w-3.5 h-3.5" /></button>
                  </div>
                )}
              </div>
            ))}
            <div className="flex flex-wrap items-center gap-2 p-3 bg-slate-950 border border-slate-800 rounded-xl">
              <input className={`${fieldCls} flex-1 min-w-[160px]`} value={knId} onChange={(e) => setKnId(e.target.value)} placeholder="Knowledge base UUID" />
              <select className={fieldCls} value={knMode} onChange={(e) => setKnMode(e.target.value)}>
                {["optional", "mandatory", "blocked", "fallback"].map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
              <label className="flex items-center gap-1 text-[10px] text-slate-400"><input type="checkbox" checked={knCite} onChange={(e) => setKnCite(e.target.checked)} />cite</label>
              <button disabled={busy || !knId.trim()} onClick={() => run(async () => { const r = await api.post(`/api/v1/prompts/versions/${versionId}/knowledge`, { kb_id: knId.trim(), retrieval_mode: knMode, citation_required: knCite }); setKnId(""); return r; })} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-widest rounded-lg disabled:opacity-50"><Plus className="w-3 h-3" />Add</button>
            </div>
          </div>

          {/* ── Tool permissions ── */}
          <div className="space-y-2">
            <div className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Tool Permissions</div>
            {tools.length === 0 && <p className="text-[11px] text-slate-600 italic">No tool permissions.</p>}
            {tools.map((t) => (
              <div key={t.id} className="p-3 bg-black border border-slate-900 rounded-xl">
                {editing?.section === "tool" && editing.id === t.id ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <input className={fieldCls} value={editVals.tool_name ?? ""} onChange={(e) => setEditVals((v) => ({ ...v, tool_name: e.target.value }))} placeholder="tool name" />
                    <input className={`${fieldCls} flex-1 min-w-[120px]`} value={editVals.allowed_actions ?? ""} onChange={(e) => setEditVals((v) => ({ ...v, allowed_actions: e.target.value }))} placeholder="read, draft, publish" />
                    <label className="flex items-center gap-1 text-[10px] text-slate-400"><input type="checkbox" checked={!!editVals.approval_required} onChange={(e) => setEditVals((v) => ({ ...v, approval_required: e.target.checked }))} />approval</label>
                    <button disabled={busy} onClick={() => run(() => api.patch(`/api/v1/prompts/tool-permissions/${t.id}`, { tool_name: editVals.tool_name, allowed_actions: String(editVals.allowed_actions || "").split(",").map((s: string) => s.trim()).filter(Boolean), approval_required: editVals.approval_required }))} className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest rounded-lg">Save</button>
                    <button onClick={() => setEditing(null)} className="px-3 py-1.5 bg-slate-900 border border-slate-800 text-slate-400 text-[10px] font-black uppercase tracking-widest rounded-lg">Cancel</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 flex-wrap">
                    <Wrench className="w-3 h-3 text-amber-400 shrink-0" />
                    <span className="text-[11px] text-slate-300 font-bold">{t.tool_name}</span>
                    {Array.isArray(t.allowed_actions) && t.allowed_actions.length > 0 && (
                      <span className="text-[9px] text-slate-500 font-mono truncate">{t.allowed_actions.join(", ")}</span>
                    )}
                    {t.approval_required && <span className="text-[9px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded uppercase">approval</span>}
                    <span className="flex-1" />
                    <button onClick={() => { setEditing({ section: "tool", id: t.id }); setEditVals({ tool_name: t.tool_name || "", allowed_actions: (t.allowed_actions || []).join(", "), approval_required: !!t.approval_required }); }} className="text-[10px] text-slate-400 hover:text-white px-2 py-1">Edit</button>
                    <button onClick={() => { if (window.confirm("Remove this tool permission?")) run(() => api.delete(`/api/v1/prompts/tool-permissions/${t.id}`)); }} className="text-slate-500 hover:text-rose-400 p-1"><XCircle className="w-3.5 h-3.5" /></button>
                  </div>
                )}
              </div>
            ))}
            <div className="flex flex-wrap items-center gap-2 p-3 bg-slate-950 border border-slate-800 rounded-xl">
              <input className={fieldCls} value={toolName} onChange={(e) => setToolName(e.target.value)} placeholder="tool name" />
              <input className={`${fieldCls} flex-1 min-w-[120px]`} value={toolActions} onChange={(e) => setToolActions(e.target.value)} placeholder="read, draft, publish" />
              <label className="flex items-center gap-1 text-[10px] text-slate-400"><input type="checkbox" checked={toolApproval} onChange={(e) => setToolApproval(e.target.checked)} />approval</label>
              <button disabled={busy || !toolName.trim()} onClick={() => run(async () => { const r = await api.post(`/api/v1/prompts/versions/${versionId}/tools`, { tool_name: toolName.trim(), allowed_actions: toolActions.split(",").map((s) => s.trim()).filter(Boolean), approval_required: toolApproval }); setToolName(""); setToolActions(""); return r; })} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-widest rounded-lg disabled:opacity-50"><Plus className="w-3 h-3" />Add</button>
            </div>
          </div>
        </>
      )}
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
  const [drawerTab, setDrawerTab] = useState<"overview" | "body" | "bindings" | "variables" | "history" | "evidence">("overview");
  const [promptBody, setPromptBody] = useState<string | null>(null);
  const [loadingBody, setLoadingBody] = useState(false);
  const [bodyFetched, setBodyFetched] = useState(false);
  const [versions, setVersions] = useState<any[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [versionsFetched, setVersionsFetched] = useState(false);
  const [evidence, setEvidence] = useState<any[]>([]);
  const [loadingEvidence, setLoadingEvidence] = useState(false);
  const [evidenceFetched, setEvidenceFetched] = useState(false);
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
    setEvidence([]);
    setEvidenceFetched(false);
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

  useEffect(() => {
    if (drawerTab === "evidence" && !evidenceFetched && !loadingEvidence) {
      setLoadingEvidence(true);
      api.get(`/api/v1/prompts/${prompt.id}/evidence`)
        .then((res) => {
          if (res?.success && Array.isArray(res.data)) {
            setEvidence(res.data);
          }
        })
        .catch(() => {})
        .finally(() => {
          setEvidenceFetched(true);
          setLoadingEvidence(false);
        });
    }
  }, [drawerTab, prompt.id, evidenceFetched, loadingEvidence]);

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
            {(["overview", "body", "bindings", "variables", "history", "evidence"] as const).map((t) => (
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
            <BindingsManager versionId={prompt.active_version_id} />
          )}

          {drawerTab === "variables" && (
            <div className="space-y-5">
              <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/15">
                <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Governed Injection Parameters</div>
                <p className="text-[10px] text-slate-400 leading-relaxed">Variables are controlled inputs injected into every prompt execution. Each must define a data type, allowed values, default fallback, data source, sanitization rule, and audit visibility level. Open-ended placeholders are not permitted in production prompts.</p>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase tracking-widest font-black mb-3">Required Variable Fields</div>
                <div className="space-y-2">
                  {[
                    { field: "Name", rule: "Stable machine-readable identifier. No spaces. Example: {{user_name}}, {{brand_voice}}, {{channel_type}}." },
                    { field: "Type", rule: "Text, number, date, location, audience, platform, campaign, product, jurisdiction, or knowledge reference." },
                    { field: "Allowed Values", rule: "Enumerated values where possible. Free text only with validation rule and sanitization rule defined." },
                    { field: "Source", rule: "Manual input, workflow data, campaign metadata, CRM, knowledge base, or policy engine." },
                    { field: "Sanitization", rule: "Prompt-injection filtering, profanity filtering, privacy redaction, and forbidden phrase checks applied before injection." },
                    { field: "Fallback", rule: "Default value used when source is unavailable. Must not produce an unsafe or brand-violating output." },
                    { field: "Audit Visibility", rule: "Whether the value appears in Evidence Vault receipts, redacted receipts, or internal logs only." },
                  ].map((v) => (
                    <div key={v.field} className="flex gap-3 p-3 bg-black border border-slate-900 rounded-xl">
                      <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest whitespace-nowrap min-w-[110px]">{v.field}</span>
                      <span className="text-[10px] text-slate-400 leading-relaxed">{v.rule}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-4 bg-amber-500/5 border border-amber-500/15 rounded-2xl space-y-2">
                <div className="text-[10px] font-black text-amber-400 uppercase tracking-widest">Common Variables — {prompt.prompt_type}</div>
                <p className="text-[10px] text-slate-500 leading-relaxed">Define and validate these variables before submitting for review. Production prompts with undefined variable handling cannot pass safety tests.</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {["{{brand_voice}}", "{{channel_type}}", "{{user_name}}", "{{campaign_id}}", "{{locale}}", "{{product_name}}", "{{risk_context}}"].map((v) => (
                    <span key={v} className="text-[10px] font-mono text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded">{v}</span>
                  ))}
                </div>
              </div>
              <div className="p-4 bg-black border border-slate-900 rounded-2xl">
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Sanitization Rule</div>
                <p className="text-[10px] text-slate-600 leading-relaxed">Every injected value must pass prompt-injection filtering before reaching the model. If a variable contains instructions that could override governance rules, the execution is blocked and logged to the Evidence Vault.</p>
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
                  <span className="text-indigo-400">{"// Dependencies: "}</span>see the Bindings tab (authoritative agent / workflow / knowledge / tool bindings)<br /><br />
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

          {drawerTab === "evidence" && (
            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/15">
                <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1.5">Immutable Evidence Chain</div>
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  Every governance event for this prompt — creation, modification, approval, deployment, rollback, retirement, and testing — is preserved as a content-hashed, append-only record in the Evidence Vault. Records cannot be edited or deleted.
                </p>
              </div>
              {loadingEvidence ? (
                <div className="flex items-center justify-center py-10 gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
                  <span className="text-xs text-slate-500">Loading evidence chain…</span>
                </div>
              ) : evidence.length > 0 ? (
                evidence.map((e: any) => (
                  <div key={e.id} className="p-4 bg-black border border-slate-900 rounded-xl space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileCheck className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        <span className="text-[11px] font-black text-white truncate">{e.event_type}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {e.vault?.legal_hold && (
                          <span className="text-[8px] font-black text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded uppercase tracking-widest">Legal Hold</span>
                        )}
                        <span className="text-[8px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded uppercase tracking-widest">{e.vault?.vault_state || "preserved"}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: "Evidence ID", value: e.vault_item_id || "—" },
                        { label: "Receipt Hash", value: e.evidence_hash ? `SHA-256:${String(e.evidence_hash).slice(0, 16)}…` : "—" },
                        { label: "Risk Level", value: e.risk_level || "—" },
                        { label: "Retention", value: e.vault?.retention_class || "—" },
                        { label: "Actor", value: e.actor_id ? String(e.actor_id).slice(0, 8) : "system" },
                        { label: "Captured", value: e.created_at ? new Date(e.created_at).toLocaleString() : "—" },
                        { label: "Version", value: e.prompt_version_id ? String(e.prompt_version_id).slice(0, 8) : "—" },
                      ].map((f) => (
                        <div key={f.label} className="p-2 bg-slate-950 border border-slate-900 rounded-lg">
                          <div className="text-[8px] text-slate-600 uppercase tracking-widest">{f.label}</div>
                          <div className="text-[10px] text-slate-300 font-bold mt-0.5 font-mono truncate">{f.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 bg-black border border-slate-900 rounded-xl text-[10px] text-slate-500">
                  No evidence records yet. The vault chain populates as governance actions (create, approve, deploy, rollback, retire) are taken on this prompt.
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
              <>
                <button onClick={() => prompt.active_version_id && onVersionAction(prompt.active_version_id, 'deploy_staging')} className="px-4 py-2 bg-teal-500/10 border border-teal-500/20 text-teal-400 text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-teal-500/20 transition-all disabled:opacity-50" disabled={!prompt.active_version_id}>Deploy Staging</button>
                <button onClick={() => prompt.active_version_id && onVersionAction(prompt.active_version_id, 'deploy_production')} className="px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-indigo-500/20 transition-all disabled:opacity-50" disabled={!prompt.active_version_id}>Request Production Approval</button>
              </>
            )}
            {prompt.status === "PRODUCTION_PENDING" && (
              <button onClick={() => prompt.active_version_id && onVersionAction(prompt.active_version_id, 'deploy_production')} className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-emerald-500/20 transition-all disabled:opacity-50" disabled={!prompt.active_version_id}>Deploy Production</button>
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
    risk_tier: normalizeRiskTier(b.risk_tier),
    status: normalizeStatus(b.status),
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
    { id: "audit", label: "Audit Trail", icon: ScrollText },
    { id: "runtime", label: "Runtime", icon: Network },
    { id: "auditor", label: "Auditor", icon: ShieldCheck },
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
        {activeTab === "audit" && <AuditTrailTab prompts={prompts} />}
        {activeTab === "runtime" && (
          <RuntimeTab
            prompts={prompts}
            hitlRules={hitlRules}
            onLifecycleAction={handleLifecycleAction}
          />
        )}
        {activeTab === "auditor" && <AuditorTab />}
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
