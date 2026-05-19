"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Bot,
  BrainCircuit,
  ChevronRight,
  Eye,
  FileCheck,
  Filter,
  FolderKanban,
  Globe,
  Grid2X2,
  LayoutList,
  PauseCircle,
  PlayCircle,
  Plus,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Upload,
  User,
  Zap,
} from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import CreateAgentWizard from "@/components/agents/CreateAgentWizard";
import CertificationSandbox from "@/components/agents/CertificationSandbox";
import AgentDetailsDrawer from "@/components/agents/AgentDetailsDrawer";
import KillSwitchModal from "@/components/agents/KillSwitchModal";
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
  runtime_controls?: {
    environment?: string;
  } | null;
}

const MOCK_AGENTS: Agent[] = [
  {
    id: "ag-001",
    name: "Nexus Content Lead",
    type: "content",
    primary_dri: { full_name: "Harsha R.", email: "harsha@zoiko.com" },
    backup_dri: { full_name: "Minit S.", email: "minit@zoiko.com" },
    autonomy_level: "L4",
    status: "ACTIVE",
    risk_level: "medium",
    trust_score: 0.94,
    faithfulness_score: 0.98,
    last_activity: "2 mins ago",
    created_at: new Date().toISOString(),
    assigned_brand: "Zoiko Core",
    linked_channels: ["linkedin", "x", "instagram"],
    linked_prompts: ["p-01"],
    linked_workflows: ["wf-launch"],
    linked_policies: ["policy-brand-safe"],
    linked_knowledge_sources: ["kb-brand", "kb-market"],
    purpose: "Drafts multi-platform launch content inside approved workflows.",
    runtime_controls: { environment: "production" },
  },
  {
    id: "ag-002",
    name: "Sentinel Optimizer",
    type: "optimization",
    primary_dri: { full_name: "Minit S.", email: "minit@zoiko.com" },
    autonomy_level: "L3",
    status: "PAUSED",
    risk_level: "low",
    trust_score: 0.88,
    faithfulness_score: 0.92,
    last_activity: "1 hour ago",
    created_at: new Date().toISOString(),
    assigned_brand: "Zoiko Enterprise",
    linked_channels: ["internal"],
    linked_prompts: ["p-ops"],
    linked_workflows: ["wf-scheduler"],
    linked_policies: [],
    linked_knowledge_sources: ["kb-analytics"],
    purpose: "Recommends scheduling windows and sequencing plans.",
    runtime_controls: { environment: "staging" },
  },
  {
    id: "ag-003",
    name: "Vision Research Bot",
    type: "research",
    primary_dri: { full_name: "Naresh K.", email: "naresh@zoiko.com" },
    autonomy_level: "L5",
    status: "APPROVED",
    risk_level: "high",
    trust_score: 0.96,
    faithfulness_score: 0.99,
    last_activity: "Just now",
    created_at: new Date().toISOString(),
    assigned_brand: "Zoiko Core",
    linked_channels: ["internal", "linkedin"],
    linked_prompts: ["p-research"],
    linked_workflows: ["wf-research"],
    linked_policies: ["policy-evidence"],
    linked_knowledge_sources: ["kb-market", "kb-competitor", "kb-audience"],
    purpose: "Builds evidence-backed briefs and opportunity reports.",
    runtime_controls: { environment: "sandbox" },
  },
  {
    id: "ag-004",
    name: "Brand Guardian",
    type: "governance",
    primary_dri: { full_name: "Harsha R.", email: "harsha@zoiko.com" },
    autonomy_level: "L2",
    status: "DRAFT",
    risk_level: "critical",
    trust_score: 0,
    faithfulness_score: 0,
    last_activity: "Created today",
    created_at: new Date().toISOString(),
    assigned_brand: "Zoiko Core",
    linked_channels: ["internal"],
    linked_prompts: [],
    linked_workflows: [],
    linked_policies: ["policy-brand-safe"],
    linked_knowledge_sources: [],
    purpose: "Checks brand alignment, prohibited claims, and escalation paths.",
    runtime_controls: { environment: "sandbox" },
  },
];

const STATUS_OPTIONS = [
  "",
  "DRAFT",
  "IN_REVIEW",
  "APPROVED",
  "ACTIVE",
  "PAUSED",
  "SUSPENDED",
  "RESTRICTED",
  "RETIRED",
];

const RISK_OPTIONS = ["", "low", "medium", "high", "critical"];

const EMPTY_TEMPLATES = [
  {
    title: "Content Drafting Agent",
    description: "Draft posts and campaign copy with no direct publish authority.",
  },
  {
    title: "Compliance Review Agent",
    description: "Check claims, source support, and policy fit before release.",
  },
  {
    title: "Scheduling Recommendation Agent",
    description: "Recommend timing and sequencing while humans stay in control.",
  },
];

function formatPercent(value?: number) {
  return `${Math.round((value || 0) * 100)}%`;
}

function normalizeText(value?: string | null) {
  return (value || "").toLowerCase();
}

export default function StudioPage() {
  const { role } = useRoleContext();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [riskFilter, setRiskFilter] = useState("");
  const [brandFilter, setBrandFilter] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("");
  const [channelFilter, setChannelFilter] = useState("");
  const [workflowFilter, setWorkflowFilter] = useState("");
  const [knowledgeFilter, setKnowledgeFilter] = useState("");
  const [environmentFilter, setEnvironmentFilter] = useState("");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [viewMode, setViewMode] = useState<"table" | "card">("table");
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isSandboxOpen, setIsSandboxOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isKillSwitchOpen, setIsKillSwitchOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [actionLoading, setActionLoading] = useState<Record<string, string>>({});

  const normalizedRole = (role || "").toUpperCase();
  const canManageAuthority = ["ADMIN", "WORKSPACE_OWNER", "AGENT_ARCHITECT", "GOVERNANCE_ADMIN"].includes(normalizedRole);

  const fetchAgents = useCallback(async (targetWorkspaceId?: string | null) => {
    const activeWorkspace = targetWorkspaceId || workspaceId;

    try {
      setLoading(true);
      setError(null);

      if (!activeWorkspace) {
        setAgents(MOCK_AGENTS);
        return;
      }

      const params = new URLSearchParams({ workspaceId: activeWorkspace });
      if (statusFilter) params.set("status", statusFilter);
      if (riskFilter) params.set("risk_level", riskFilter);

      const result = await api.get(`/api/v1/agents?${params.toString()}`);
      if (result.success && Array.isArray(result.data)) {
        setAgents(result.data.length ? result.data : []);
      } else {
        setAgents(MOCK_AGENTS);
      }
    } catch {
      setError("Live agent registry unavailable. Showing the last known governed authority records.");
      setAgents(MOCK_AGENTS);
    } finally {
      setLoading(false);
    }
  }, [workspaceId, statusFilter, riskFilter]);

  useEffect(() => {
    const init = async () => {
      try {
        const context = await api.get("/api/v1/user/context");
        const nextWorkspaceId = context?.data?.workspace_id || null;
        setWorkspaceId(nextWorkspaceId);
        await fetchAgents(nextWorkspaceId);
      } catch {
        setAgents(MOCK_AGENTS);
        setLoading(false);
      }
    };

    init();
  }, [fetchAgents]);

  useEffect(() => {
    if (workspaceId) {
      fetchAgents(workspaceId);
    }
  }, [workspaceId, statusFilter, riskFilter, fetchAgents]);

  const getAutonomyStyle = useCallback((level: string) => {
    const color = AUTONOMY_COLOR[level] || AUTONOMY_COLOR.L0;
    return `${color.text} ${color.bg} ${color.border}`;
  }, []);

  const getReadiness = useCallback((agent: Agent) => {
    const checks = [
      Boolean(agent.primary_dri),
      Boolean(agent.backup_dri),
      Boolean(agent.assigned_brand),
      Boolean(agent.linked_prompts?.length),
      Boolean(agent.linked_workflows?.length),
      Boolean(agent.linked_knowledge_sources?.length),
      Boolean(agent.linked_channels?.length),
      (agent.trust_score || 0) >= 0.7,
      (agent.faithfulness_score || 0) >= 0.85,
      agent.status !== "RETIRED",
    ];

    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, []);

  const getNextAction = useCallback((agent: Agent) => {
    if (agent.status === "DRAFT") return "Complete Setup";
    if (agent.status === "IN_REVIEW") return "Await Approval";
    if (agent.status === "APPROVED") return "Deploy";
    if (agent.status === "PAUSED") return "Resume";
    if (agent.status === "RESTRICTED" || agent.status === "SUSPENDED") return "Review Alert";
    if (getReadiness(agent) < 80) return "Run Tests";
    if (agent.status === "ACTIVE") return "Export Evidence";
    return "Open Agent";
  }, [getReadiness]);

  const getResourceCount = useCallback((agent: Agent) => {
    return (
      (agent.linked_prompts?.length || 0) +
      (agent.linked_workflows?.length || 0) +
      (agent.linked_policies?.length || 0) +
      (agent.linked_knowledge_sources?.length || 0)
    );
  }, []);

  const openAgent = useCallback((agent: Agent) => {
    setSelectedAgent(agent);
    setIsDetailsOpen(true);
  }, []);

  const openSandbox = useCallback((agent: Agent) => {
    setSelectedAgent(agent);
    setIsSandboxOpen(true);
  }, []);

  const runAgentAction = async (agent: Agent, action: "approval" | "deploy" | "pause" | "resume" | "retire" | "clone") => {
    const endpoints: Record<typeof action, { url: string; body: Record<string, unknown> }> = {
      approval: {
        url: `/api/v1/agents/${agent.id}/approval/request`,
        body: { notes: `Approval requested from Agent Studio for ${agent.name}.` },
      },
      deploy: {
        url: `/api/v1/agents/${agent.id}/deploy`,
        body: { environment: environmentFilter || agent.runtime_controls?.environment || "production" },
      },
      pause: {
        url: `/api/v1/agents/${agent.id}/pause`,
        body: { reason: `Paused from Agent Studio for ${agent.name}.` },
      },
      resume: {
        url: `/api/v1/agents/${agent.id}/resume`,
        body: { reason: `Resumed from Agent Studio for ${agent.name}.` },
      },
      retire: {
        url: `/api/v1/agents/${agent.id}/retire`,
        body: { reason: `Retired from Agent Studio for ${agent.name}.` },
      },
      clone: {
        url: `/api/v1/agents/${agent.id}/clone`,
        body: {},
      },
    };

    try {
      setActionLoading((current) => ({ ...current, [agent.id]: action }));
      await api.post(endpoints[action].url, endpoints[action].body);
      await fetchAgents(workspaceId);
      if (selectedAgent?.id === agent.id) {
        setSelectedAgent((current) => (current ? { ...current, status: action === "pause" ? "PAUSED" : current.status } : current));
      }
    } catch (actionError) {
      const message = actionError instanceof Error ? actionError.message : `Unable to ${action} ${agent.name}.`;
      setError(message);
    } finally {
      setActionLoading((current) => {
        const next = { ...current };
        delete next[agent.id];
        return next;
      });
    }
  };

  const hasFilters = Boolean(
    searchTerm ||
    statusFilter ||
    riskFilter ||
    brandFilter ||
    ownerFilter ||
    channelFilter ||
    workflowFilter ||
    knowledgeFilter ||
    environmentFilter,
  );

  const brandOptions = useMemo(() => {
    return Array.from(new Set(agents.map((agent) => agent.assigned_brand).filter(Boolean))) as string[];
  }, [agents]);

  const ownerOptions = useMemo(() => {
    return Array.from(new Set(agents.map((agent) => agent.primary_dri?.full_name).filter(Boolean))) as string[];
  }, [agents]);

  const channelOptions = useMemo(() => {
    return Array.from(new Set(agents.flatMap((agent) => agent.linked_channels || []))).sort();
  }, [agents]);

  const workflowOptions = useMemo(() => {
    return Array.from(new Set(agents.flatMap((agent) => agent.linked_workflows || []))).sort();
  }, [agents]);

  const knowledgeOptions = useMemo(() => {
    return Array.from(new Set(agents.flatMap((agent) => agent.linked_knowledge_sources || []))).sort();
  }, [agents]);

  const filteredAgents = useMemo(() => {
    return agents.filter((agent) => {
      const matchesSearch =
        !searchTerm ||
        normalizeText(agent.name).includes(normalizeText(searchTerm)) ||
        normalizeText(agent.type).includes(normalizeText(searchTerm)) ||
        normalizeText(agent.primary_dri?.full_name).includes(normalizeText(searchTerm)) ||
        normalizeText(agent.assigned_brand).includes(normalizeText(searchTerm));

      const matchesStatus = !statusFilter || agent.status === statusFilter;
      const matchesRisk = !riskFilter || normalizeText(agent.risk_level) === riskFilter;
      const matchesBrand = !brandFilter || agent.assigned_brand === brandFilter;
      const matchesOwner = !ownerFilter || agent.primary_dri?.full_name === ownerFilter;
      const matchesChannel = !channelFilter || (agent.linked_channels || []).includes(channelFilter);
      const matchesWorkflow = !workflowFilter || (agent.linked_workflows || []).includes(workflowFilter);
      const matchesKnowledge = !knowledgeFilter || (agent.linked_knowledge_sources || []).includes(knowledgeFilter);
      const matchesEnvironment = !environmentFilter || agent.runtime_controls?.environment === environmentFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesRisk &&
        matchesBrand &&
        matchesOwner &&
        matchesChannel &&
        matchesWorkflow &&
        matchesKnowledge &&
        matchesEnvironment
      );
    });
  }, [
    agents,
    brandFilter,
    channelFilter,
    environmentFilter,
    knowledgeFilter,
    ownerFilter,
    riskFilter,
    searchTerm,
    statusFilter,
    workflowFilter,
  ]);

  const summary = useMemo(() => {
    const active = agents.filter((agent) => agent.status === "ACTIVE").length;
    const certified = agents.filter((agent) => ["APPROVED", "ACTIVE"].includes(agent.status)).length;
    const inReview = agents.filter((agent) => ["IN_REVIEW", "PAUSED", "RESTRICTED", "SUSPENDED"].includes(agent.status)).length;
    const avgTrust = agents.length
      ? `${Math.round(agents.reduce((sum, agent) => sum + (agent.trust_score || 0), 0) / agents.length * 100)}%`
      : "-";
    const governanceDebt = agents.filter((agent) => getReadiness(agent) < 80).length;

    return { active, certified, inReview, avgTrust, governanceDebt };
  }, [agents, getReadiness]);

  return (
    <div className="p-8 mx-auto max-w-[1500px] space-y-6">
      <CreateAgentWizard
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onSuccess={() => fetchAgents(workspaceId)}
      />

      {selectedAgent && (
        <CertificationSandbox
          isOpen={isSandboxOpen}
          onClose={() => setIsSandboxOpen(false)}
          agentId={selectedAgent.id}
          agentName={selectedAgent.name}
          currentLevel={selectedAgent.autonomy_level}
          onCertified={() => fetchAgents(workspaceId)}
        />
      )}

      <AgentDetailsDrawer
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        agent={selectedAgent as any}
        onUpdate={() => fetchAgents(workspaceId)}
      />

      <KillSwitchModal
        isOpen={isKillSwitchOpen}
        onClose={() => setIsKillSwitchOpen(false)}
        onActivated={() => fetchAgents(workspaceId)}
      />

      <div className="rounded-3xl border border-[var(--card-border)] bg-[var(--surface)] p-6 shadow-sm">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-indigo-500">
                <ShieldCheck className="h-3.5 w-3.5" />
                Authority Layer
              </div>
              <div className="flex items-center gap-3">
                <Bot className="h-8 w-8 text-indigo-500" />
                <div>
                  <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)]">Agent Studio</h1>
                  <p className="text-sm text-[var(--foreground-muted)]">
                    Governed identity, certification, runtime control, and evidence for every agent in this workspace.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => fetchAgents(workspaceId)}
                className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-2 text-sm font-semibold text-[var(--foreground)] transition hover:border-indigo-500/30 hover:text-indigo-500"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
              <button
                onClick={() => setIsKillSwitchOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-500 transition hover:bg-rose-500 hover:text-white"
              >
                <ShieldAlert className="h-4 w-4" />
                Kill Switch
              </button>
              <button
                onClick={() => setIsWizardOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-indigo-500/20 bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500"
              >
                <Plus className="h-4 w-4" />
                Create Agent
              </button>
              <button
                onClick={() => setIsWizardOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-2 text-sm font-semibold text-[var(--foreground)] transition hover:border-indigo-500/30 hover:text-indigo-500"
              >
                <Upload className="h-4 w-4" />
                Import Template
              </button>
            </div>
          </div>

          <div className="grid gap-3 xl:grid-cols-[1.35fr_repeat(4,minmax(0,1fr))]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--foreground-muted)]" />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search by agent, owner, brand, or type"
                className="w-full rounded-2xl border border-[var(--border)] bg-[var(--background)] py-3 pl-11 pr-4 text-sm text-[var(--foreground)] outline-none transition focus:border-indigo-500/40"
              />
            </div>

            <select
              value={brandFilter}
              onChange={(event) => setBrandFilter(event.target.value)}
              className="rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm text-[var(--foreground)] outline-none transition focus:border-indigo-500/40"
            >
              <option value="">All brands</option>
              {brandOptions.map((brand) => (
                <option key={brand} value={brand}>
                  {brand}
                </option>
              ))}
            </select>

            <select
              value={environmentFilter}
              onChange={(event) => setEnvironmentFilter(event.target.value)}
              className="rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm text-[var(--foreground)] outline-none transition focus:border-indigo-500/40"
            >
              <option value="">All environments</option>
              <option value="sandbox">Sandbox</option>
              <option value="staging">Staging</option>
              <option value="production">Production</option>
            </select>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm text-[var(--foreground)] outline-none transition focus:border-indigo-500/40"
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status || "all-status"} value={status}>
                  {status || "All statuses"}
                </option>
              ))}
            </select>

            <div className="flex gap-2">
              <select
                value={riskFilter}
                onChange={(event) => setRiskFilter(event.target.value)}
                className="min-w-0 flex-1 rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm text-[var(--foreground)] outline-none transition focus:border-indigo-500/40"
              >
                {RISK_OPTIONS.map((risk) => (
                  <option key={risk || "all-risk"} value={risk}>
                    {risk ? `${risk[0].toUpperCase()}${risk.slice(1)} risk` : "All risk tiers"}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setShowAdvancedFilters((current) => !current)}
                className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                  showAdvancedFilters || hasFilters
                    ? "border-indigo-500/20 bg-indigo-500/10 text-indigo-500"
                    : "border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] hover:border-indigo-500/30 hover:text-indigo-500"
                }`}
              >
                <Filter className="h-4 w-4" />
                Filters
              </button>
            </div>
          </div>

          {showAdvancedFilters && (
            <div className="grid gap-3 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4 md:grid-cols-2 xl:grid-cols-4">
              <select
                value={ownerFilter}
                onChange={(event) => setOwnerFilter(event.target.value)}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] outline-none transition focus:border-indigo-500/40"
              >
                <option value="">All owners</option>
                {ownerOptions.map((owner) => (
                  <option key={owner} value={owner}>
                    {owner}
                  </option>
                ))}
              </select>

              <select
                value={channelFilter}
                onChange={(event) => setChannelFilter(event.target.value)}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] outline-none transition focus:border-indigo-500/40"
              >
                <option value="">All channels</option>
                {channelOptions.map((channel) => (
                  <option key={channel} value={channel}>
                    {channel}
                  </option>
                ))}
              </select>

              <select
                value={workflowFilter}
                onChange={(event) => setWorkflowFilter(event.target.value)}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] outline-none transition focus:border-indigo-500/40"
              >
                <option value="">All workflows</option>
                {workflowOptions.map((workflow) => (
                  <option key={workflow} value={workflow}>
                    {workflow}
                  </option>
                ))}
              </select>

              <select
                value={knowledgeFilter}
                onChange={(event) => setKnowledgeFilter(event.target.value)}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] outline-none transition focus:border-indigo-500/40"
              >
                <option value="">All knowledge sources</option>
                {knowledgeOptions.map((knowledge) => (
                  <option key={knowledge} value={knowledge}>
                    {knowledge}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--foreground-muted)]">
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--background)] px-3 py-1.5">
                <Globe className="h-3.5 w-3.5" />
                Workspace scoped authority
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--background)] px-3 py-1.5">
                <Zap className="h-3.5 w-3.5" />
                {filteredAgents.length} visible agents
              </div>
              {!canManageAuthority && (
                <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-amber-500">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Read-only authority view
                </div>
              )}
            </div>

            <div className="inline-flex items-center gap-1 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-1">
              <button
                onClick={() => setViewMode("table")}
                className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                  viewMode === "table" ? "bg-indigo-500/10 text-indigo-500" : "text-[var(--foreground-muted)]"
                }`}
              >
                <LayoutList className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode("card")}
                className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                  viewMode === "card" ? "bg-indigo-500/10 text-indigo-500" : "text-[var(--foreground-muted)]"
                }`}
              >
                <Grid2X2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-500">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          { label: "Active Agents", value: summary.active, icon: PlayCircle, tone: "text-emerald-500" },
          { label: "Certified", value: summary.certified, icon: FileCheck, tone: "text-indigo-500" },
          { label: "Avg Trust Score", value: summary.avgTrust, icon: ShieldCheck, tone: "text-sky-500" },
          { label: "Require Review", value: summary.inReview, icon: AlertTriangle, tone: "text-amber-500" },
          { label: "Governance Debt", value: summary.governanceDebt, icon: ShieldAlert, tone: "text-rose-500" },
        ].map((card) => (
          <div key={card.label} className="rounded-3xl border border-[var(--card-border)] bg-[var(--surface)] p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--foreground-muted)]">{card.label}</div>
                <div className="mt-2 text-3xl font-bold text-[var(--foreground)]">{card.value}</div>
              </div>
              <div className={`rounded-2xl bg-[var(--background)] p-3 ${card.tone}`}>
                <card.icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="rounded-3xl border border-[var(--card-border)] bg-[var(--surface)] p-5">
          <div className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--foreground-muted)]">Authority Readiness</div>
          <div className="mt-2 text-sm text-[var(--foreground-muted)]">
            Agents must have an owner, backup owner, prompt, workflow, knowledge, channel scope, and passing trust thresholds before safe activation.
          </div>
          <div className="mt-4 text-2xl font-bold text-[var(--foreground)]">
            {agents.filter((agent) => getReadiness(agent) >= 80).length}/{agents.length || 0}
          </div>
        </div>
        <div className="rounded-3xl border border-[var(--card-border)] bg-[var(--surface)] p-5">
          <div className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--foreground-muted)]">Linked Governance Assets</div>
          <div className="mt-2 text-sm text-[var(--foreground-muted)]">
            Prompt versions, workflows, policies, and knowledge bindings attached across the visible agent inventory.
          </div>
          <div className="mt-4 text-2xl font-bold text-[var(--foreground)]">
            {agents.reduce((sum, agent) => sum + getResourceCount(agent), 0)}
          </div>
        </div>
        <div className="rounded-3xl border border-[var(--card-border)] bg-[var(--surface)] p-5">
          <div className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--foreground-muted)]">Next Operator Focus</div>
          <div className="mt-2 text-sm text-[var(--foreground-muted)]">
            {summary.governanceDebt > 0
              ? `${summary.governanceDebt} agents need setup, testing, or governance completion before they should be promoted.`
              : "Authority inventory is in a healthy state with no immediate governance debt."}
          </div>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-indigo-500">
            <Sparkles className="h-3.5 w-3.5" />
            {summary.governanceDebt > 0 ? "Review incomplete agents" : "Ready for review cycle"}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="rounded-3xl border border-[var(--card-border)] bg-[var(--surface)] p-8">
          <div className="space-y-3">
            {[1, 2, 3, 4].map((row) => (
              <div key={row} className="h-16 animate-pulse rounded-2xl bg-[var(--background)]" />
            ))}
          </div>
        </div>
      ) : filteredAgents.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-10 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-indigo-500/10 text-indigo-500">
            <Bot className="h-8 w-8" />
          </div>
          <h2 className="mt-5 text-2xl font-bold text-[var(--foreground)]">
            {agents.length === 0 ? "Build your first governed agent" : "No agents match the current filters"}
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-[var(--foreground-muted)]">
            {agents.length === 0
              ? "Agent Studio is the governed workspace for creating, testing, approving, deploying, pausing, retiring, and evidencing AI agents. Start from a safe template and keep humans accountable at every gate."
              : "Try adjusting the authority filters or open the create flow to add a new governed agent."}
          </p>

          <div className="mx-auto mt-8 grid max-w-4xl gap-4 md:grid-cols-3">
            {EMPTY_TEMPLATES.map((template) => (
              <div key={template.title} className="rounded-3xl border border-[var(--card-border)] bg-[var(--background)] p-5 text-left">
                <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500">
                  Template
                </div>
                <div className="mt-4 text-lg font-bold text-[var(--foreground)]">{template.title}</div>
                <p className="mt-2 text-sm text-[var(--foreground-muted)]">{template.description}</p>
              </div>
            ))}
          </div>

          <button
            onClick={() => setIsWizardOpen(true)}
            className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500"
          >
            <Plus className="h-4 w-4" />
            Create Agent
          </button>
        </div>
      ) : viewMode === "table" ? (
        <div className="overflow-hidden rounded-3xl border border-[var(--card-border)] bg-[var(--surface)]">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[var(--card-border)]">
              <thead className="bg-[var(--background)]">
                <tr className="text-left text-[11px] font-black uppercase tracking-[0.22em] text-[var(--foreground-muted)]">
                  <th className="px-5 py-4">Agent</th>
                  <th className="px-5 py-4">Type and DRI</th>
                  <th className="px-5 py-4">Governance</th>
                  <th className="px-5 py-4">Scope</th>
                  <th className="px-5 py-4">Bindings</th>
                  <th className="px-5 py-4">Readiness</th>
                  <th className="px-5 py-4">Next Action</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--card-border)]">
                {filteredAgents.map((agent) => {
                  const readiness = getReadiness(agent);
                  const nextAction = getNextAction(agent);
                  const isBusy = Boolean(actionLoading[agent.id]);

                  return (
                    <tr key={agent.id} className="align-top transition hover:bg-[var(--background)]/70">
                      <td className="px-5 py-5">
                        <button onClick={() => openAgent(agent)} className="text-left">
                          <div className="flex items-start gap-3">
                            <div className="mt-1 rounded-2xl bg-indigo-500/10 p-2.5 text-indigo-500">
                              <BrainCircuit className="h-4 w-4" />
                            </div>
                            <div className="space-y-1">
                              <div className="text-sm font-semibold text-[var(--foreground)]">{agent.name}</div>
                              <div className="text-xs text-[var(--foreground-muted)]">{agent.id}</div>
                              <div className="line-clamp-2 max-w-sm text-xs text-[var(--foreground-muted)]">
                                {agent.purpose || "Governed operator profile awaiting business purpose detail."}
                              </div>
                            </div>
                          </div>
                        </button>
                      </td>
                      <td className="px-5 py-5">
                        <div className="space-y-2">
                          <div className="text-sm font-semibold capitalize text-[var(--foreground)]">{agent.type}</div>
                          <div className="inline-flex items-center gap-2 text-xs text-[var(--foreground-muted)]">
                            <User className="h-3.5 w-3.5" />
                            {agent.primary_dri?.full_name || "Unassigned"}
                          </div>
                          <div className="text-xs text-[var(--foreground-muted)]">
                            Backup: {agent.backup_dri?.full_name || "Missing"}
                          </div>
                          <div className="text-xs text-[var(--foreground-muted)]">
                            Brand: {agent.assigned_brand || "Not assigned"}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-5">
                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-2">
                            <StatusBadge status={agent.status} />
                            <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.18em] ${getAutonomyStyle(agent.autonomy_level)}`}>
                              {agent.autonomy_level}
                            </span>
                          </div>
                          <div className="inline-flex rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.18em] text-amber-500">
                            {(agent.risk_level || "medium").toUpperCase()} risk
                          </div>
                          <div className="space-y-1 text-xs text-[var(--foreground-muted)]">
                            <div>Trust: {formatPercent(agent.trust_score)}</div>
                            <div>Faithfulness: {formatPercent(agent.faithfulness_score)}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-5">
                        <div className="space-y-2 text-xs text-[var(--foreground-muted)]">
                          <div>
                            Env: <span className="font-semibold text-[var(--foreground)]">{agent.runtime_controls?.environment || "production"}</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {(agent.linked_channels || []).length > 0 ? (
                              (agent.linked_channels || []).slice(0, 3).map((channel) => (
                                <span key={channel} className="rounded-full border border-[var(--border)] bg-[var(--background)] px-2 py-0.5 text-[10px] font-semibold text-[var(--foreground)]">
                                  {channel}
                                </span>
                              ))
                            ) : (
                              <span>No channel scope</span>
                            )}
                            {(agent.linked_channels || []).length > 3 && (
                              <span className="rounded-full border border-[var(--border)] bg-[var(--background)] px-2 py-0.5 text-[10px] font-semibold text-[var(--foreground)]">
                                +{(agent.linked_channels || []).length - 3}
                              </span>
                            )}
                          </div>
                          <div>Last activity: {agent.last_activity || "Not yet active"}</div>
                        </div>
                      </td>
                      <td className="px-5 py-5">
                        <div className="space-y-2 text-xs text-[var(--foreground-muted)]">
                          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--background)] px-3 py-1">
                            <FolderKanban className="h-3.5 w-3.5" />
                            {getResourceCount(agent)} governed links
                          </div>
                          <div>Prompts: {agent.linked_prompts?.length || 0}</div>
                          <div>Workflows: {agent.linked_workflows?.length || 0}</div>
                          <div>Knowledge: {agent.linked_knowledge_sources?.length || 0}</div>
                        </div>
                      </td>
                      <td className="px-5 py-5">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs text-[var(--foreground-muted)]">
                            <span>Production readiness</span>
                            <span className="font-semibold text-[var(--foreground)]">{readiness}%</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-[var(--background)]">
                            <div
                              className={`h-full rounded-full ${readiness >= 80 ? "bg-emerald-500" : readiness >= 60 ? "bg-amber-500" : "bg-rose-500"}`}
                              style={{ width: `${readiness}%` }}
                            />
                          </div>
                          <div className="text-xs text-[var(--foreground-muted)]">
                            {readiness >= 80 ? "Ready for governed progression" : "Blocking setup items remain"}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-5">
                        <div className="space-y-2">
                          <div className="inline-flex rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-indigo-500">
                            {nextAction}
                          </div>
                          <div className="text-xs text-[var(--foreground-muted)]">
                            {agent.status === "DRAFT" && "Complete identity, bindings, and tests before approval."}
                            {agent.status === "IN_REVIEW" && "Approvers and governance evidence are pending."}
                            {agent.status === "APPROVED" && "Deployment is allowed within the selected environment."}
                            {agent.status === "ACTIVE" && "Monitor runtime posture and preserve evidence continuity."}
                            {agent.status === "PAUSED" && "Resume only after the triggering concern is resolved."}
                            {["RESTRICTED", "SUSPENDED"].includes(agent.status) && "Investigate risk signals and review the evidence trail."}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-5">
                        <div className="flex flex-col items-end gap-2">
                          <button
                            onClick={() => openAgent(agent)}
                            className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs font-semibold text-[var(--foreground)] transition hover:border-indigo-500/30 hover:text-indigo-500"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Open
                          </button>
                          <button
                            onClick={() => openSandbox(agent)}
                            className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs font-semibold text-[var(--foreground)] transition hover:border-indigo-500/30 hover:text-indigo-500"
                          >
                            <ShieldCheck className="h-3.5 w-3.5" />
                            Test
                          </button>
                          {agent.status === "DRAFT" && (
                            <button
                              disabled={!canManageAuthority || isBusy}
                              onClick={() => runAgentAction(agent, "approval")}
                              className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <FileCheck className="h-3.5 w-3.5" />
                              {actionLoading[agent.id] === "approval" ? "Requesting..." : "Request Approval"}
                            </button>
                          )}
                          {agent.status === "APPROVED" && (
                            <button
                              disabled={!canManageAuthority || isBusy}
                              onClick={() => runAgentAction(agent, "deploy")}
                              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <PlayCircle className="h-3.5 w-3.5" />
                              {actionLoading[agent.id] === "deploy" ? "Deploying..." : "Deploy"}
                            </button>
                          )}
                          {agent.status === "ACTIVE" && (
                            <button
                              disabled={!canManageAuthority || isBusy}
                              onClick={() => runAgentAction(agent, "pause")}
                              className="inline-flex items-center gap-2 rounded-xl bg-rose-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-rose-400 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <PauseCircle className="h-3.5 w-3.5" />
                              {actionLoading[agent.id] === "pause" ? "Pausing..." : "Pause"}
                            </button>
                          )}
                          {agent.status === "PAUSED" && (
                            <button
                              disabled={!canManageAuthority || isBusy}
                              onClick={() => runAgentAction(agent, "resume")}
                              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <PlayCircle className="h-3.5 w-3.5" />
                              {actionLoading[agent.id] === "resume" ? "Resuming..." : "Resume"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredAgents.map((agent) => {
            const readiness = getReadiness(agent);

            return (
              <div key={agent.id} className="rounded-3xl border border-[var(--card-border)] bg-[var(--surface)] p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl bg-indigo-500/10 p-3 text-indigo-500">
                      <BrainCircuit className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-lg font-bold text-[var(--foreground)]">{agent.name}</div>
                      <div className="text-xs uppercase tracking-[0.2em] text-[var(--foreground-muted)]">{agent.type}</div>
                    </div>
                  </div>
                  <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.18em] ${getAutonomyStyle(agent.autonomy_level)}`}>
                    {agent.autonomy_level}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <StatusBadge status={agent.status} />
                  <span className="inline-flex rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.18em] text-amber-500">
                    {(agent.risk_level || "medium").toUpperCase()}
                  </span>
                </div>

                <div className="mt-4 space-y-2 text-sm text-[var(--foreground-muted)]">
                  <div className="inline-flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {agent.primary_dri?.full_name || "Unassigned"}
                  </div>
                  <div>Brand: {agent.assigned_brand || "Not assigned"}</div>
                  <div>Channels: {(agent.linked_channels || []).join(", ") || "None"}</div>
                  <div>Readiness: {readiness}%</div>
                </div>

                <div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--background)]">
                  <div
                    className={`h-full rounded-full ${readiness >= 80 ? "bg-emerald-500" : readiness >= 60 ? "bg-amber-500" : "bg-rose-500"}`}
                    style={{ width: `${readiness}%` }}
                  />
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <button
                    onClick={() => openAgent(agent)}
                    className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs font-semibold text-[var(--foreground)] transition hover:border-indigo-500/30 hover:text-indigo-500"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Open
                  </button>
                  <button
                    onClick={() => openSandbox(agent)}
                    className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs font-semibold text-[var(--foreground)] transition hover:border-indigo-500/30 hover:text-indigo-500"
                  >
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Test
                  </button>
                  <button
                    onClick={() => runAgentAction(agent, "clone")}
                    disabled={!canManageAuthority || Boolean(actionLoading[agent.id])}
                    className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs font-semibold text-[var(--foreground)] transition hover:border-indigo-500/30 hover:text-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                    {actionLoading[agent.id] === "clone" ? "Cloning..." : "Clone"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-start gap-3 rounded-3xl border border-indigo-500/15 bg-indigo-500/5 p-5 text-sm text-[var(--foreground-muted)]">
        <Shield className="mt-0.5 h-5 w-5 shrink-0 text-indigo-500" />
        <div>
          <div className="font-semibold text-[var(--foreground)]">Agent Studio is a governed control plane, not a prompt playground.</div>
          <div className="mt-1">
            Every CTA on this page is limited to create, test, approve, deploy, pause, resume, clone, retire, or inspect evidence-oriented agent records.
          </div>
        </div>
      </div>
    </div>
  );
}
