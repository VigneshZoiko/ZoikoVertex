"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Bell,
  BookOpen,
  Bot,
  BrainCircuit,
  Check,
  CheckSquare,
  Copy,
  Globe,
  Image as ImageIcon,
  Lock,
  MessageSquare,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  Settings,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Upload,
  Zap,
  Award,
  Archive,
  PlayCircle,
  PauseCircle,
  User,
  X,
  Filter,
  FolderKanban,
  Grid2X2,
  LayoutList,
  FileCheck,
  Sparkles,
} from "lucide-react";
import CreateAgentWizard from "@/components/agents/CreateAgentWizard";
import CertificationSandbox from "@/components/agents/CertificationSandbox";
import { api } from "@/lib/api";
import { useRoleContext } from "@/lib/context/RoleContext";
import { AUTONOMY_COLOR } from "@/lib/agentAuthority";

interface Person {
  full_name: string;
  email: string;
}

interface Agent {
  id: string;
  name: string;
  type: string;
  status: string;
  autonomy_level: string;
  trust_score: number;
  faithfulness_score: number;
  risk_level?: string;
  purpose?: string | null;
  assigned_brand?: string | null;
  linked_channels?: string[];
  linked_prompts?: string[];
  linked_workflows?: string[];
  linked_policies?: string[];
  linked_knowledge_sources?: string[];
  primary_dri?: Person | null;
  backup_dri?: Person | null;
  last_activity?: string | null;
  created_at: string;
  runtime_controls?: { environment?: string } | null;
}

const STATUS_OPTIONS = [
  "", "DRAFT", "PENDING_CERTIFICATION", "IN_REVIEW", "APPROVED",
  "ACTIVE", "PAUSED", "RESTRICTED", "SUSPENDED", "RETIRED",
];

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  PENDING_CERTIFICATION: "Pending Certification",
  IN_REVIEW: "In Review",
  APPROVED: "Approved",
  ACTIVE: "Live",
  PAUSED: "Paused",
  RESTRICTED: "Restricted",
  SUSPENDED: "Suspended",
  RETIRED: "Retired",
};

const RISK_OPTIONS = ["", "low", "medium", "high", "critical"];

const AGENT_TEMPLATES = [
  { title: "Content Drafting Agent", description: "Draft posts, captions, outlines, newsletters, and campaign copy." },
  { title: "Compliance Review Agent", description: "Check claims, prohibited language, source support, risk, and policy fit." },
  { title: "Scheduling Recommendation Agent", description: "Recommend timing and sequencing. No posting unless approved." },
  { title: "Content Research Agent", description: "Read approved knowledge, analyze sources, produce briefs." },
  { title: "Social Response Agent", description: "Draft replies and escalation recommendations. Human review required." },
  { title: "Performance Insight Agent", description: "Analyze campaign results and propose optimizations." },
  { title: "SMB Starter Agent", description: "Simple draft, schedule recommendation, and brand-safe social posts." },
  { title: "Enterprise Governance Agent", description: "Cross-brand policy review, evidence bundling, and risk reporting." },
];

// ── Validation Pipeline ─────────────────────────────────────────────────────
const PIPELINE_STEPS = [
  { title: "Policy Check",        desc: "Blocks unsafe content, routes high-risk domains",      icon: Shield,      bg: "bg-amber-500/20",   iconCls: "text-amber-400" },
  { title: "General Content",     desc: "Flags claims that need proof",                          icon: MessageSquare, bg: "bg-violet-500/20", iconCls: "text-violet-400" },
  { title: "Evidence / KB",       desc: "Confirms claims against approved sources",              icon: BookOpen,    bg: "bg-orange-500/20",  iconCls: "text-orange-400" },
  { title: "Image Validation",    desc: "Scans images for unsafe content and text",              icon: ImageIcon,   bg: "bg-teal-500/20",    iconCls: "text-teal-400" },
  { title: "Platform Compliance", desc: "Checks limits per platform",                            icon: CheckSquare, bg: "bg-emerald-500/20", iconCls: "text-emerald-400" },
  { title: "Published",           desc: "Live on platform",                                      icon: Send,        bg: "bg-indigo-500/20",  iconCls: "text-indigo-400" },
];

// ── Group helpers ───────────────────────────────────────────────────────────
type GroupKey = "governance" | "content" | "safety";

function getGroupCategory(type: string, name: string): GroupKey {
  const t = (type + " " + name).toLowerCase();
  if (t.includes("content") || t.includes("draft") || t.includes("research")) return "content";
  if (
    t.includes("safety") || t.includes("image") || t.includes("platform") ||
    t.includes("validation") || t.includes("scan")
  ) return "safety";
  return "governance";
}

const GROUP_META: Record<GroupKey, { dot: string; label: string; desc: string }> = {
  governance: { dot: "bg-amber-400",   label: "Governance", desc: "Policy enforcement & evidence checks" },
  content:    { dot: "bg-violet-400",  label: "Content",    desc: "Reads and interprets what's being posted" },
  safety:     { dot: "bg-emerald-400", label: "Safety",     desc: "Media scans & platform limits" },
};

const CARD_STYLE: Record<GroupKey, { border: string; iconBg: string; iconCls: string; typeCls: string }> = {
  governance: { border: "border-l-amber-500",   iconBg: "bg-amber-500/15",   iconCls: "text-amber-400",   typeCls: "text-amber-500" },
  content:    { border: "border-l-violet-500",  iconBg: "bg-violet-500/15",  iconCls: "text-violet-400",  typeCls: "text-violet-500" },
  safety:     { border: "border-l-emerald-500", iconBg: "bg-emerald-500/15", iconCls: "text-emerald-400", typeCls: "text-emerald-500" },
};

function renderAgentIcon(type: string, name: string, className: string) {
  const t = (type + " " + name).toLowerCase();
  if (t.includes("image") || t.includes("scan") || t.includes("visual") || t.includes("validation"))
    return <ImageIcon className={className} />;
  if (t.includes("platform") || t.includes("compliance") || t.includes("approval"))
    return <CheckSquare className={className} />;
  if (t.includes("evidence") || t.includes("kb") || t.includes("knowledge"))
    return <BookOpen className={className} />;
  if (t.includes("content") || t.includes("draft") || t.includes("general"))
    return <MessageSquare className={className} />;
  return <Shield className={className} />;
}

// ── Trust Score Ring ────────────────────────────────────────────────────────
function TrustScoreRing({ percent }: { percent: number }) {
  const r = 36;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(percent, 100) / 100) * circ;
  return (
    <svg width="88" height="88" viewBox="0 0 88 88" className="shrink-0">
      <circle cx="44" cy="44" r={r} fill="none" stroke="rgba(6,182,212,0.15)" strokeWidth="7" />
      <circle
        cx="44" cy="44" r={r} fill="none"
        stroke="#06b6d4" strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray={`${circ}`}
        strokeDashoffset={`${offset}`}
        transform="rotate(-90 44 44)"
      />
      <text x="44" y="44" textAnchor="middle" dominantBaseline="central"
        fill="white" fontSize="15" fontWeight="700" fontFamily="inherit">
        {percent}%
      </text>
    </svg>
  );
}

// ── Agent Card (Figma design) ───────────────────────────────────────────────
function AgentCard({
  agent, group, onSandbox, onSafetyCheck,
}: {
  agent: Agent;
  group: GroupKey;
  onSandbox: (a: Agent) => void;
  onSafetyCheck: (a: Agent) => void;
}) {
  const cs = CARD_STYLE[group];
  const isLive = agent.status === "ACTIVE";
  const short = agent.id.slice(0, 8);

  return (
    <div className={`flex flex-col rounded-xl border border-[var(--card-border)] bg-[var(--surface)] border-l-4 ${cs.border} overflow-hidden`}>
      <div className="flex flex-col gap-3 p-4 flex-1">
        {/* Name row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${cs.iconBg}`}>
              {renderAgentIcon(agent.type, agent.name, `h-4 w-4 ${cs.iconCls}`)}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--foreground)] truncate">{agent.name}</p>
              <p className="font-mono text-[11px] text-[var(--foreground-muted)]">{short}</p>
            </div>
          </div>
          {isLive ? (
            <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] font-semibold text-emerald-400">Live</span>
            </div>
          ) : (
            <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--background)] px-2.5 py-1">
              <div className="h-1.5 w-1.5 rounded-full bg-[var(--foreground-muted)]" />
              <span className="text-[11px] font-semibold text-[var(--foreground-muted)]">
                {STATUS_LABELS[agent.status] || agent.status}
              </span>
            </div>
          )}
        </div>
        {/* Description */}
        <p className="text-xs leading-relaxed text-[var(--foreground-muted)] line-clamp-3">
          {agent.purpose || "—"}
        </p>
      </div>
      {/* Footer */}
      <div className="border-t border-[var(--border)] px-4 py-2.5">
        <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${cs.typeCls}`}>
          {GROUP_META[group].label}
        </span>
      </div>
    </div>
  );
}

function normalizeText(value?: string | null) {
  return (value || "").toLowerCase();
}

// ── Main Page ───────────────────────────────────────────────────────────────
export default function StudioPage() {
  const { role } = useRoleContext();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [isSuperadmin, setIsSuperadmin] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [riskFilter, setRiskFilter] = useState("");
  const [environmentFilter, setEnvironmentFilter] = useState("");
  const [activeGroup, setActiveGroup] = useState<"all" | GroupKey>("all");
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isSandboxOpen, setIsSandboxOpen] = useState(false);
  const [importTemplateData, setImportTemplateData] = useState<Record<string, unknown> | undefined>(undefined);
  const importFileRef = useRef<HTMLInputElement>(null);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [actionLoading, setActionLoading] = useState<Record<string, string>>({});
  const [safetyCheckLoading, setSafetyCheckLoading] = useState<string | null>(null);

  const DISMISSED_KEY = "zv:dismissedRetiredAgents";
  const [dismissedIds, setDismissedIds] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem(DISMISSED_KEY);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch { return []; }
  });

  const persistDismissed = useCallback((ids: string[]) => {
    if (typeof window === "undefined") return;
    try { window.localStorage.setItem(DISMISSED_KEY, JSON.stringify(ids)); } catch { /* ignore */ }
  }, []);

  const normalizedRole = (role || "").toUpperCase();
  const canManageAuthority = isSuperadmin ||
    ["ADMIN", "WORKSPACE_OWNER", "AGENT_ARCHITECT", "GOVERNANCE_ADMIN"].includes(normalizedRole);

  const fetchAgents = useCallback(async (
    targetWorkspaceId?: string | null,
    options?: { silent?: boolean },
  ) => {
    const activeWorkspace = targetWorkspaceId || workspaceId;
    const silent = options?.silent === true;
    try {
      if (!silent) setLoading(true);
      setError(null);
      if (!activeWorkspace && !isSuperadmin) {
        setAgents([]);
        return;
      }
      const params = new URLSearchParams();
      if (activeWorkspace) params.set("workspaceId", activeWorkspace);
      if (statusFilter) params.set("status", statusFilter);
      if (riskFilter) params.set("risk_level", riskFilter);
      const qs = params.toString();
      const result = await api.get(`/api/v1/agents${qs ? `?${qs}` : ""}`);
      if (result.success && Array.isArray(result.data)) {
        setAgents(result.data);
      } else {
        setError(typeof result.error === "string" ? result.error : "Unable to load the governed agent catalog.");
        setAgents([]);
      }
    } catch {
      setError("Live agent registry unavailable. Check your authentication and backend connection.");
      setAgents([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [workspaceId, statusFilter, riskFilter, isSuperadmin]);

  useEffect(() => {
    const init = async () => {
      try {
        const context = await api.get("/api/v1/user/context");
        setWorkspaceId(context?.data?.workspace_id || null);
        setIsSuperadmin(Boolean(context?.data?.is_superadmin));
      } catch {
        setError("Unable to load workspace context for Agent Studio.");
        setLoading(false);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (workspaceId || isSuperadmin) fetchAgents(workspaceId);
  }, [workspaceId, isSuperadmin, statusFilter, riskFilter, fetchAgents]);

  const getReadiness = useCallback((agent: Agent) => {
    const checks = [
      Boolean(agent.primary_dri), Boolean(agent.backup_dri), Boolean(agent.assigned_brand),
      Boolean(agent.linked_prompts?.length), Boolean(agent.linked_workflows?.length),
      Boolean(agent.linked_knowledge_sources?.length), Boolean(agent.linked_channels?.length),
      (agent.trust_score || 0) >= 0.7, (agent.faithfulness_score || 0) >= 0.85,
      agent.status !== "RETIRED" && agent.status !== "DRAFT",
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, []);

  const openSandbox = useCallback((agent: Agent) => {
    setSelectedAgent(agent);
    setIsSandboxOpen(true);
  }, []);

  const handleRunSafetyChecks = async (agent: Agent) => {
    setSafetyCheckLoading(agent.id);
    setError(null);
    try {
      const res = await api.post(`/api/v1/agents/${agent.id}/safety-checks/run`, {
        content: agent.purpose || `${agent.name} safety verification run from Agent Studio.`,
      });
      if (res.success) {
        setSuccessMsg(`Safety checks initiated for "${agent.name}".`);
        setTimeout(() => setSuccessMsg(null), 6000);
        await fetchAgents(workspaceId, { silent: true });
      } else {
        setError(`Safety check failed to start for "${agent.name}".`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : `Safety check error for "${agent.name}".`);
    } finally {
      setSafetyCheckLoading(null);
    }
  };

  const checkGovernanceGatesAndDeploy = async (agent: Agent) => {
    setActionLoading((c) => ({ ...c, [agent.id]: "deploy" }));
    setError(null);
    try {
      let gatesRes: Awaited<ReturnType<typeof api.get>> | null = null;
      try { gatesRes = await api.get(`/api/v1/agents/${agent.id}/governance-gates`); }
      catch { setError("Governance-gate check failed. Cannot proceed with deploy."); return; }
      if (gatesRes?.data) {
        const blockingFailed = (gatesRes.data.failed_gates || []).filter((g: { blocking: boolean }) => g.blocking);
        if (blockingFailed.length > 0) {
          setError(`Deploy blocked: ${blockingFailed.length} governance gate(s) failed.`);
          return;
        }
      }
      const env = environmentFilter || agent.runtime_controls?.environment || "production";
      await api.post(`/api/v1/agents/${agent.id}/deploy`, { environment: env });
      setSuccessMsg(`"${agent.name}" deployed to ${env} successfully.`);
      setTimeout(() => setSuccessMsg(null), 5000);
      await fetchAgents(workspaceId, { silent: true });
    } catch (deployErr) {
      setError(deployErr instanceof Error ? deployErr.message : `Deploy failed for "${agent.name}".`);
    } finally {
      setActionLoading((c) => { const n = { ...c }; delete n[agent.id]; return n; });
    }
  };

  const runAgentAction = async (
    agent: Agent,
    action: "approval" | "deploy" | "pause" | "resume" | "retire" | "clone" | "rollback" | "delete",
  ) => {
    try {
      setActionLoading((c) => ({ ...c, [agent.id]: action }));
      let result;
      if (action === "rollback") {
        const versionsRes = await api.get(`/api/v1/agents/${agent.id}/versions`);
        const versions = Array.isArray(versionsRes?.versions) ? versionsRes.versions : [];
        if (!versions[0]?.id) { setError(`Rollback unavailable for "${agent.name}".`); return; }
        result = await api.post(`/api/v1/agents/${agent.id}/rollback`, { version_id: versions[0].id });
      } else if (action === "approval") {
        result = await api.post(`/api/v1/agents/${agent.id}/approval/request`, { notes: `Approval requested for ${agent.name}.` });
      } else if (action === "deploy") {
        result = await api.post(`/api/v1/agents/${agent.id}/deploy`, { environment: environmentFilter || agent.runtime_controls?.environment || "production" });
      } else if (action === "pause") {
        result = await api.post(`/api/v1/agents/${agent.id}/pause`, { reason: `Paused from Agent Studio.` });
      } else if (action === "resume") {
        result = await api.post(`/api/v1/agents/${agent.id}/resume`, { reason: `Resumed from Agent Studio.` });
      } else if (action === "retire") {
        result = await api.post(`/api/v1/agents/${agent.id}/retire`, { reason: `Retired from Agent Studio.` });
      } else if (action === "delete") {
        if (!window.confirm(`Permanently delete "${agent.name}"?`)) return;
        result = await api.delete(`/api/v1/agents/${agent.id}`);
      } else {
        result = await api.post(`/api/v1/agents/${agent.id}/clone`, {});
      }
      if (!result?.success) {
        setError(typeof result?.error === "string" ? result.error : `Unable to ${action} ${agent.name}.`);
        return;
      }
      const msgs: Record<string, string> = {
        approval: `"${agent.name}" submitted into the approval workflow.`,
        deploy: `"${agent.name}" deployed successfully.`,
        pause: `"${agent.name}" is now paused.`,
        resume: `"${agent.name}" resumed successfully.`,
        retire: `"${agent.name}" was retired and preserved for audit.`,
        clone: `"${agent.name}" was cloned into a new draft.`,
        rollback: `"${agent.name}" rolled back to the latest approved version.`,
        delete: `"${agent.name}" permanently deleted.`,
      };
      setSuccessMsg(msgs[action]);
      setTimeout(() => setSuccessMsg(null), 5000);
      await fetchAgents(workspaceId, { silent: true });
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : `Unable to ${action} ${agent.name}.`);
    } finally {
      setActionLoading((c) => { const n = { ...c }; delete n[agent.id]; return n; });
    }
  };

  // ── Derived data ──────────────────────────────────────────────────────────
  const summary = useMemo(() => {
    const active = agents.filter((a) => a.status === "ACTIVE").length;
    const certified = agents.filter((a) => ["APPROVED", "ACTIVE"].includes(a.status)).length;
    const riskAlerts = agents.filter((a) => ["RESTRICTED", "SUSPENDED", "IN_REVIEW", "PAUSED"].includes(a.status)).length;
    const avgTrustPct = agents.length
      ? Math.round((agents.reduce((s, a) => s + (a.trust_score || 0), 0) / agents.length) * 100)
      : 0;
    return { active, certified, riskAlerts, avgTrustPct };
  }, [agents]);

  const groupedAgents = useMemo(() => {
    const search = searchTerm.toLowerCase();
    const base = agents.filter((a) => {
      if (dismissedIds.includes(a.id)) return false;
      if (!search) return true;
      return (
        normalizeText(a.name).includes(search) ||
        normalizeText(a.purpose).includes(search) ||
        normalizeText(a.type).includes(search)
      );
    });
    const governance = base.filter((a) => getGroupCategory(a.type, a.name) === "governance");
    const content    = base.filter((a) => getGroupCategory(a.type, a.name) === "content");
    const safety     = base.filter((a) => getGroupCategory(a.type, a.name) === "safety");
    return { governance, content, safety, all: base };
  }, [agents, searchTerm, dismissedIds]);

  const visibleGroups: GroupKey[] = activeGroup === "all"
    ? (["governance", "content", "safety"] as GroupKey[])
    : [activeGroup];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-5 mx-auto max-w-[1850px] space-y-5">
      {/* Hidden file input */}
      <input
        ref={importFileRef} type="file" accept=".json" className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = (ev) => {
            try {
              const parsed = JSON.parse(ev.target?.result as string);
              if (typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Template must be a JSON object.");
              setImportTemplateData(parsed);
              setIsWizardOpen(true);
            } catch (err: unknown) {
              setError(`Invalid template file: ${err instanceof Error ? err.message : "Not valid JSON."}`);
            }
          };
          reader.readAsText(file);
          e.target.value = "";
        }}
      />

      <CreateAgentWizard
        isOpen={isWizardOpen}
        onClose={() => { setIsWizardOpen(false); setImportTemplateData(undefined); }}
        onSuccess={() => fetchAgents(workspaceId)}
        initialData={importTemplateData}
      />

      {selectedAgent && isSandboxOpen && (
        <CertificationSandbox
          key={selectedAgent.id}
          isOpen={isSandboxOpen}
          onClose={() => setIsSandboxOpen(false)}
          agentId={selectedAgent.id}
          agentName={selectedAgent.name}
          currentLevel={selectedAgent.autonomy_level}
          onCertified={(newLevel, newTrustScore, newFaithfulnessScore) => {
            setAgents((prev) => prev.map((a) =>
              a.id === selectedAgent?.id
                ? { ...a, autonomy_level: newLevel, trust_score: newTrustScore, faithfulness_score: newFaithfulnessScore }
                : a,
            ));
            setSelectedAgent((prev) => prev ? { ...prev, autonomy_level: newLevel, trust_score: newTrustScore, faithfulness_score: newFaithfulnessScore } : prev);
            fetchAgents(workspaceId);
          }}
        />
      )}

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/25 bg-teal-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-teal-400">
            AUTHORITY LAYER
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-teal-500/20 bg-teal-500/10">
              <Lock className="h-5 w-5 text-teal-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)]">Agent Studio</h1>
              <p className="text-sm text-[var(--foreground-muted)]">
                Governed identity, certification, runtime control, and evidence for every agent in this workspace.
              </p>
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 pt-1">
          <button
            onClick={() => fetchAgents(workspaceId)}
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-2 text-sm font-semibold text-[var(--foreground)] transition hover:border-teal-500/30 hover:text-teal-400"
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        </div>
      </div>

      {/* ── Alerts ── */}
      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-500">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)}><X className="h-4 w-4" /></button>
        </div>
      )}
      {successMsg && (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-400">
          <Check className="h-4 w-4 shrink-0" />
          <span className="flex-1">{successMsg}</span>
        </div>
      )}

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {/* Trust Score Ring */}
        <div className="flex items-center gap-5 rounded-2xl border border-[var(--card-border)] bg-[var(--surface)] p-5">
          <TrustScoreRing percent={summary.avgTrustPct} />
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--foreground-muted)]">AVG TRUST SCORE</div>
            <div className="mt-1 text-sm text-[var(--foreground-muted)]">Across {summary.certified} certified agents</div>
          </div>
        </div>
        {/* Active Agents */}
        <div className="flex flex-col justify-between rounded-2xl border border-[var(--card-border)] bg-[var(--surface)] p-5">
          <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--foreground-muted)]">ACTIVE AGENTS</div>
          <div className="mt-2 text-4xl font-bold text-[var(--foreground)]">{summary.active}</div>
          <div className="mt-1 text-sm text-[var(--foreground-muted)]">All running live</div>
        </div>
        {/* Certifications */}
        <div className="flex flex-col justify-between rounded-2xl border border-[var(--card-border)] bg-[var(--surface)] p-5">
          <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--foreground-muted)]">CERTIFICATIONS</div>
          <div className="mt-2 text-4xl font-bold text-[var(--foreground)]">{summary.certified}</div>
          <div className="mt-1 text-sm text-[var(--foreground-muted)]">Up to date</div>
        </div>
        {/* Risk Alerts */}
        <div className="flex flex-col justify-between rounded-2xl border border-[var(--card-border)] bg-[var(--surface)] p-5">
          <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--foreground-muted)]">RISK ALERTS</div>
          <div className="mt-2 text-4xl font-bold text-[var(--foreground)]">{summary.riskAlerts}</div>
          <div className={`mt-1 flex items-center gap-1.5 text-sm ${summary.riskAlerts === 0 ? "text-emerald-400" : "text-rose-400"}`}>
            {summary.riskAlerts === 0 && <Check className="h-3.5 w-3.5" />}
            {summary.riskAlerts === 0 ? "Nothing needs attention" : `${summary.riskAlerts} item${summary.riskAlerts !== 1 ? "s" : ""} need attention`}
          </div>
        </div>
      </div>

      {/* ── Validation Pipeline ── */}
      <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--surface)] p-6">
        <div className="mb-6 flex items-baseline gap-2">
          <span className="text-sm font-semibold text-[var(--foreground)]">Validation pipeline</span>
          <span className="text-sm text-[var(--foreground-muted)]">— the order a post typically clears before it publishes</span>
        </div>
        <div className="flex items-start">
          {PIPELINE_STEPS.map((step, i) => (
            <div key={step.title} className="flex flex-1 items-start">
              <div className="flex flex-1 flex-col items-center gap-2 px-1 text-center">
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${step.bg}`}>
                  <step.icon className={`h-5 w-5 ${step.iconCls}`} />
                </div>
                <span className="text-xs font-semibold leading-tight text-[var(--foreground)]">{step.title}</span>
                <span className="text-[11px] leading-snug text-[var(--foreground-muted)]">{step.desc}</span>
              </div>
              {i < PIPELINE_STEPS.length - 1 && (
                <span className="mt-4 shrink-0 text-sm text-[var(--foreground-muted)]">—</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Tab filters + Search ── */}
      <div className="flex flex-wrap items-center gap-2">
          {/* All agents pill */}
          <button
            onClick={() => setActiveGroup("all")}
            className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition ${
              activeGroup === "all"
                ? "border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]"
                : "text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-teal-400 inline-block" />
            All agents · {groupedAgents.all.length}
          </button>
          {(["governance", "content", "safety"] as GroupKey[]).map((g) => (
            <button
              key={g}
              onClick={() => setActiveGroup(g)}
              className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition ${
                activeGroup === g
                  ? "border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]"
                  : "text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
              }`}
            >
              <span className={`h-2 w-2 rounded-full inline-block ${GROUP_META[g].dot}`} />
              {GROUP_META[g].label} · {groupedAgents[g].length}
            </button>
          ))}
      </div>

      {/* ── Agent Groups ── */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-2xl bg-[var(--surface)]" />
          ))}
        </div>
      ) : groupedAgents.all.length === 0 ? (
        /* Empty State */
        <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-500/10">
            <Bot className="h-7 w-7 text-teal-400" />
          </div>
          <h2 className="mt-4 text-xl font-bold text-[var(--foreground)]">
            {agents.length === 0 ? "No governed agents yet" : "No agents match your search"}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-[var(--foreground-muted)]">
            {agents.length === 0
              ? "Import a template to get started, or check your backend connection."
              : "Try a different search term or clear the filter."}
          </p>
          {agents.length === 0 && (
            <div className="mx-auto mt-8 grid max-w-4xl gap-4 md:grid-cols-2 xl:grid-cols-4">
              {AGENT_TEMPLATES.slice(0, 8).map((t) => (
                <div key={t.title} className="rounded-xl border border-[var(--card-border)] bg-[var(--background)] p-4 text-left">
                  <div className="inline-flex items-center rounded-full border border-teal-500/20 bg-teal-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-teal-400">
                    Template
                  </div>
                  <p className="mt-3 text-sm font-semibold text-[var(--foreground)]">{t.title}</p>
                  <p className="mt-1.5 text-xs text-[var(--foreground-muted)]">{t.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {visibleGroups.map((g) => {
            const list = groupedAgents[g];
            if (list.length === 0) return null;
            const meta = GROUP_META[g];
            return (
              <div key={g} className="space-y-3">
                {/* Group header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className={`h-2.5 w-2.5 rounded-full ${meta.dot}`} />
                    <span className="text-sm font-semibold text-[var(--foreground)]">{meta.label}</span>
                    <span className="text-sm text-[var(--foreground-muted)]">
                      {list.length} agent{list.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <span className="text-sm text-[var(--foreground-muted)]">{meta.desc}</span>
                </div>
                {/* Cards */}
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
                  {list.map((agent) => (
                    <AgentCard
                      key={agent.id}
                      agent={agent}
                      group={g}
                      onSandbox={openSandbox}
                      onSafetyCheck={handleRunSafetyChecks}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
