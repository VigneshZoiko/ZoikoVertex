"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Upload,
  User,
  Zap,
  Award,
  RotateCcw,
  Archive,
  X,
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
  lifecycle_stage?: string | null;
  created_at: string;
  runtime_controls?: {
    environment?: string;
  } | null;
}

// All lifecycle states from spec
const STATUS_OPTIONS = [
  "",
  "DRAFT",
  "PENDING_CERTIFICATION",
  "IN_REVIEW",
  "APPROVED",
  "ACTIVE",
  "PAUSED",
  "RESTRICTED",
  "SUSPENDED",
  "RETIRED",
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

// 8 required templates from spec Section 12
const AGENT_TEMPLATES = [
  {
    title: "Content Drafting Agent",
    description:
      "Draft posts, captions, outlines, newsletters, and campaign copy. No external action. Brand approval required before use in workflow.",
  },
  {
    title: "Compliance Review Agent",
    description:
      "Check claims, prohibited language, source support, risk, and policy fit. Governance-owned; cannot approve its own output as final.",
  },
  {
    title: "Scheduling Recommendation Agent",
    description:
      "Recommend timing and sequencing. No posting unless approved by campaign owner. Humans stay in control.",
  },
  {
    title: "Content Research Agent",
    description:
      "Read approved knowledge, analyze sources, produce briefs. No publishing. Compliance review required for regulated categories.",
  },
  {
    title: "Social Response Agent",
    description:
      "Draft replies and escalation recommendations. No auto-reply by default. Human review required.",
  },
  {
    title: "Performance Insight Agent",
    description:
      "Analyze campaign results and propose optimizations. Read-only analytics; no budget or publishing control.",
  },
  {
    title: "SMB Starter Agent",
    description:
      "Simple draft, schedule recommendation, and brand-safe social posts for small teams. Low setup friction; no unsafe auto-publish.",
  },
  {
    title: "Enterprise Governance Agent",
    description:
      "Cross-brand policy review, evidence bundling, and risk reporting. Restricted to governance roles; full evidence capture required.",
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
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [isSuperadmin, setIsSuperadmin] = useState(false);
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
  const [importTemplateData, setImportTemplateData] = useState<Record<string, unknown> | undefined>(undefined);
  const importFileRef = useRef<HTMLInputElement>(null);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [actionLoading, setActionLoading] = useState<Record<string, string>>(
    {},
  );
  const [safetyCheckLoading, setSafetyCheckLoading] = useState<string | null>(
    null,
  );
  const [evidenceExportLoading, setEvidenceExportLoading] = useState<
    string | null
  >(null);

  // ── Dismissed retired agents. Retirement preserves the audit record in the
  //    DB (Doc 5 §5/§14 — retired agents must never be hard-deleted), but an
  //    operator may want to clear a retired agent's disabled card out of their
  //    view. We track dismissed IDs client-side and persist them so the view
  //    stays clean across reloads. They reappear via the RETIRED status filter
  //    or "Show dismissed".
  const DISMISSED_KEY = "zv:dismissedRetiredAgents";
  const [dismissedIds, setDismissedIds] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem(DISMISSED_KEY);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  });

  const persistDismissed = useCallback((ids: string[]) => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(DISMISSED_KEY, JSON.stringify(ids));
    } catch {
      // localStorage unavailable (private mode / quota) — dismiss stays
      // in-memory for this session only.
    }
  }, []);

  const dismissRetiredAgent = useCallback(
    (agent: Agent) => {
      if (agent.status !== "RETIRED") return;
      setDismissedIds((current) => {
        if (current.includes(agent.id)) return current;
        const next = [...current, agent.id];
        persistDismissed(next);
        return next;
      });
      if (selectedAgent?.id === agent.id) setIsDetailsOpen(false);
    },
    [persistDismissed, selectedAgent],
  );

  const restoreDismissedAgents = useCallback(() => {
    setDismissedIds([]);
    persistDismissed([]);
  }, [persistDismissed]);

  const normalizedRole = (role || "").toUpperCase();
  const canManageAuthority =
    isSuperadmin ||
    [
      "ADMIN",
      "WORKSPACE_OWNER",
      "AGENT_ARCHITECT",
      "GOVERNANCE_ADMIN",
    ].includes(normalizedRole);

  const fetchAgents = useCallback(
    async (
      targetWorkspaceId?: string | null,
      options?: { silent?: boolean },
    ) => {
      const activeWorkspace = targetWorkspaceId || workspaceId;
      // Silent refresh (after an action) updates data in place without the
      // full-page loading skeleton, so cloning/retiring/etc. don't visually
      // reload the entire UI.
      const silent = options?.silent === true;
      try {
        if (!silent) setLoading(true);
        setError(null);
        if (!activeWorkspace && !isSuperadmin) {
          setAgents([]);
          setError("Workspace context is not available yet for Agent Studio.");
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
          setError(
            typeof result.error === "string"
              ? result.error
              : "Unable to load the governed agent catalog.",
          );
          setAgents([]);
        }
      } catch {
        setError(
          "Live agent registry unavailable. Check your authentication and backend connection.",
        );
        setAgents([]);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [workspaceId, statusFilter, riskFilter, isSuperadmin],
  );

  useEffect(() => {
    const init = async () => {
      try {
        const context = await api.get("/api/v1/user/context");
        const nextWorkspaceId = context?.data?.workspace_id || null;
        const nextIsSuperadmin = Boolean(context?.data?.is_superadmin);
        setWorkspaceId(nextWorkspaceId);
        setIsSuperadmin(nextIsSuperadmin);
        // Note: the secondary useEffect below triggers fetchAgents once the
        // workspaceId / isSuperadmin state has settled, so we don't need to
        // call it directly here (which would use a stale closure).
      } catch {
        setError("Unable to load workspace context for Agent Studio.");
        setAgents([]);
        setLoading(false);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (workspaceId || isSuperadmin) fetchAgents(workspaceId);
  }, [workspaceId, isSuperadmin, statusFilter, riskFilter, fetchAgents]);

  const getAutonomyStyle = useCallback((level: string) => {
    const color = AUTONOMY_COLOR[level] || AUTONOMY_COLOR.L0;
    return `${color.text} ${color.bg} ${color.border}`;
  }, []);

  // Production readiness checklist — 10 mandatory gates
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
      agent.status !== "RETIRED" && agent.status !== "DRAFT",
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, []);

  // Next action per lifecycle state (spec Section 5 + 6.1)
  const getNextAction = useCallback(
    (agent: Agent) => {
      if (agent.status === "DRAFT") return "Complete Setup";
      if (agent.status === "PENDING_CERTIFICATION") return "Run Certification";
      if (agent.status === "IN_REVIEW") return "Await Approval";
      if (agent.status === "APPROVED") return "Deploy";
      if (agent.status === "PAUSED") return "Resume";
      if (agent.status === "RESTRICTED" || agent.status === "SUSPENDED")
        return "Review Alert";
      if (agent.status === "RETIRED") return "Clone";
      if (getReadiness(agent) < 80) return "Run Tests";
      if (agent.status === "ACTIVE") return "Export Evidence";
      return "Open Agent";
    },
    [getReadiness],
  );

  const getNextActionDescription = useCallback((agent: Agent) => {
    if (agent.status === "DRAFT")
      return "Complete identity, bindings, and sandbox tests before submitting for certification.";
    if (agent.status === "PENDING_CERTIFICATION")
      return "Run the Certification Sandbox to build a trust score before submitting for approval.";
    if (agent.status === "IN_REVIEW")
      return "Approvers, governance evidence, and compliance checks are pending.";
    if (agent.status === "APPROVED")
      return "Deployment is allowed within the selected environment.";
    if (agent.status === "ACTIVE")
      return "Monitor runtime posture and preserve evidence continuity.";
    if (agent.status === "PAUSED")
      return "Resume only after the triggering concern is resolved.";
    if (["RESTRICTED", "SUSPENDED"].includes(agent.status))
      return "Investigate risk signals and review the full evidence trail.";
    if (agent.status === "RETIRED")
      return "This agent is archived. Clone it to create a new governed draft.";
    return "Review the agent profile and address any incomplete governance setup items.";
  }, []);

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

  // ── Evidence Export — /api/v1/agents/:id/evidence ──────────────────────────
  const handleExportEvidence = async (agent: Agent) => {
    setEvidenceExportLoading(agent.id);
    setError(null);
    try {
      const res = await api.get(`/api/v1/agents/${agent.id}/evidence`);
      if (res.success) {
        // Backend returns `data` as an array of evidence bundles. Surface the
        // most recent bundle's id (first item, ordered DESC server-side) or a
        // count fallback when the array is empty.
        const bundles = Array.isArray(res.data) ? res.data : [];
        const headline =
          bundles[0]?.bundle_id ||
          bundles[0]?.id ||
          (bundles.length > 0 ? `${bundles.length} bundles` : "generated");
        setSuccessMsg(
          `Evidence bundle exported for "${agent.name}". Bundle ID: ${headline}`,
        );
        setTimeout(() => setSuccessMsg(null), 6000);
      } else {
        setError(
          `Evidence export failed for "${agent.name}". Check your permissions.`,
        );
      }
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : `Evidence export failed for "${agent.name}".`;
      setError(msg);
    } finally {
      setEvidenceExportLoading(null);
    }
  };

  // ── Safety Check Runner — /api/v1/agents/:id/safety-checks/run ─────────────
  const handleRunSafetyChecks = async (agent: Agent) => {
    setSafetyCheckLoading(agent.id);
    setError(null);
    try {
      const res = await api.post(
        `/api/v1/agents/${agent.id}/safety-checks/run`,
        {
          content:
            agent.purpose ||
            `${agent.name} safety verification run from Agent Studio.`,
        },
      );
      if (res.success) {
        setSuccessMsg(
          `Safety checks initiated for "${agent.name}". Results will update in the agent profile.`,
        );
        setTimeout(() => setSuccessMsg(null), 6000);
        await fetchAgents(workspaceId, { silent: true });
      } else {
        setError(`Safety check failed to start for "${agent.name}".`);
      }
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : `Safety check error for "${agent.name}".`;
      setError(msg);
    } finally {
      setSafetyCheckLoading(null);
    }
  };

  // ── Governance Gate Pre-Deploy Check — /api/v1/agents/:id/governance-gates ─
  const checkGovernanceGatesAndDeploy = async (agent: Agent) => {
    setActionLoading((c) => ({ ...c, [agent.id]: "deploy" }));
    setError(null);
    try {
      // Step 1: Validate governance gates before deploy — gate API failure MUST block deploy
      let gatesRes: Awaited<ReturnType<typeof api.get>> | null = null;
      try {
        gatesRes = await api.get(`/api/v1/agents/${agent.id}/governance-gates`);
      } catch {
        setError(
          "Governance-gate check failed. Cannot proceed with deploy until gates are verifiable.",
        );
        return;
      }
      if (gatesRes?.data) {
        const gates = gatesRes.data;
        const blockingFailed = (gates.failed_gates || []).filter(
          (g: { blocking: boolean }) => g.blocking,
        );
        if (blockingFailed.length > 0) {
          const gateNames = blockingFailed
            .map((g: { name: string }) => g.name)
            .join(", ");
          setError(
            `Deploy blocked: ${blockingFailed.length} governance gate(s) failed — ${gateNames}. Resolve before deploying.`,
          );
          return;
        }
      }
      // Step 2: Proceed with deploy
      const env =
        environmentFilter ||
        agent.runtime_controls?.environment ||
        "production";
      await api.post(`/api/v1/agents/${agent.id}/deploy`, { environment: env });
      setSuccessMsg(`"${agent.name}" deployed to ${env} successfully.`);
      setTimeout(() => setSuccessMsg(null), 5000);
      await fetchAgents(workspaceId, { silent: true });
    } catch (deployErr) {
      const msg =
        deployErr instanceof Error
          ? deployErr.message
          : `Deploy failed for "${agent.name}".`;
      setError(msg);
    } finally {
      setActionLoading((c) => {
        const n = { ...c };
        delete n[agent.id];
        return n;
      });
    }
  };

  const runAgentAction = async (
    agent: Agent,
    action:
      | "approval"
      | "deploy"
      | "pause"
      | "resume"
      | "retire"
      | "clone"
      | "rollback",
  ) => {
    try {
      setActionLoading((current) => ({ ...current, [agent.id]: action }));
      let result;

      if (action === "rollback") {
        const versionsRes = await api.get(`/api/v1/agents/${agent.id}/versions`);
        const versions = Array.isArray(versionsRes?.versions)
          ? versionsRes.versions
          : [];
        const targetVersion = versions[0]?.id;

        if (!targetVersion) {
          setError(
            `Rollback unavailable for "${agent.name}" because no prior version history exists yet.`,
          );
          return;
        }

        result = await api.post(`/api/v1/agents/${agent.id}/rollback`, {
          version_id: targetVersion,
        });
      } else if (action === "approval") {
        result = await api.post(`/api/v1/agents/${agent.id}/approval/request`, {
          notes: `Approval requested from Agent Studio for ${agent.name}.`,
        });
      } else if (action === "deploy") {
        result = await api.post(`/api/v1/agents/${agent.id}/deploy`, {
          environment:
            environmentFilter ||
            agent.runtime_controls?.environment ||
            "production",
        });
      } else if (action === "pause") {
        result = await api.post(`/api/v1/agents/${agent.id}/pause`, {
          reason: `Paused from Agent Studio for ${agent.name}.`,
        });
      } else if (action === "resume") {
        result = await api.post(`/api/v1/agents/${agent.id}/resume`, {
          reason: `Resumed from Agent Studio for ${agent.name}.`,
        });
      } else if (action === "retire") {
        result = await api.post(`/api/v1/agents/${agent.id}/retire`, {
          reason: `Retired from Agent Studio for ${agent.name}.`,
        });
      } else {
        result = await api.post(`/api/v1/agents/${agent.id}/clone`, {});
      }

      if (!result?.success) {
        setError(
          typeof result?.error === "string"
            ? result.error
            : `Unable to ${action} ${agent.name}.`,
        );
        return;
      }

      const actionMessages: Record<string, string> = {
        approval: `"${agent.name}" was submitted into the approval workflow.`,
        deploy: `"${agent.name}" deployed successfully.`,
        pause: `"${agent.name}" is now paused.`,
        resume: `"${agent.name}" resumed successfully.`,
        retire: `"${agent.name}" was retired and preserved for audit.`,
        clone: `"${agent.name}" was cloned into a new draft.`,
        rollback: `"${agent.name}" rolled back to the latest approved version snapshot.`,
      };
      setSuccessMsg(actionMessages[action]);
      setTimeout(() => setSuccessMsg(null), 5000);
      await fetchAgents(workspaceId, { silent: true });
      if (selectedAgent?.id === agent.id) {
        setSelectedAgent((current) =>
          current
            ? {
                ...current,
                status:
                  action === "pause"
                    ? "PAUSED"
                    : action === "resume"
                      ? "ACTIVE"
                    : action === "retire"
                      ? "RETIRED"
                      : current.status,
              }
            : current,
        );
      }
    } catch (actionError) {
      const message =
        actionError instanceof Error
          ? actionError.message
          : `Unable to ${action} ${agent.name}.`;
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

  const brandOptions = useMemo(
    () =>
      Array.from(
        new Set(agents.map((a) => a.assigned_brand).filter(Boolean)),
      ) as string[],
    [agents],
  );

  const ownerOptions = useMemo(
    () =>
      Array.from(
        new Set(agents.map((a) => a.primary_dri?.full_name).filter(Boolean)),
      ) as string[],
    [agents],
  );

  const channelOptions = useMemo(
    () =>
      Array.from(
        new Set(agents.flatMap((a) => a.linked_channels || [])),
      ).sort(),
    [agents],
  );

  const workflowOptions = useMemo(
    () =>
      Array.from(
        new Set(agents.flatMap((a) => a.linked_workflows || [])),
      ).sort(),
    [agents],
  );

  const knowledgeOptions = useMemo(
    () =>
      Array.from(
        new Set(agents.flatMap((a) => a.linked_knowledge_sources || [])),
      ).sort(),
    [agents],
  );

  const filteredAgents = useMemo(() => {
    return agents.filter((agent) => {
      // Hide retired agents the operator has dismissed from their view.
      // They remain in the DB and return via the RETIRED filter / "Show dismissed".
      if (dismissedIds.includes(agent.id)) return false;
      const matchesSearch =
        !searchTerm ||
        normalizeText(agent.name).includes(normalizeText(searchTerm)) ||
        normalizeText(agent.type).includes(normalizeText(searchTerm)) ||
        normalizeText(agent.primary_dri?.full_name).includes(
          normalizeText(searchTerm),
        ) ||
        normalizeText(agent.assigned_brand).includes(normalizeText(searchTerm));
      // Defensive case-insensitive match: agent.status may be stored as
      // uppercase or lowercase depending on which code path created the row.
      const matchesStatus =
        !statusFilter ||
        String(agent.status || "").toUpperCase() === statusFilter.toUpperCase();
      const matchesRisk =
        !riskFilter || normalizeText(agent.risk_level) === riskFilter;
      const matchesBrand = !brandFilter || agent.assigned_brand === brandFilter;
      const matchesOwner =
        !ownerFilter || agent.primary_dri?.full_name === ownerFilter;
      const matchesChannel =
        !channelFilter || (agent.linked_channels || []).includes(channelFilter);
      const matchesWorkflow =
        !workflowFilter ||
        (agent.linked_workflows || []).includes(workflowFilter);
      const matchesKnowledge =
        !knowledgeFilter ||
        (agent.linked_knowledge_sources || []).includes(knowledgeFilter);
      const matchesEnvironment =
        !environmentFilter ||
        agent.runtime_controls?.environment === environmentFilter;
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
    dismissedIds,
    environmentFilter,
    knowledgeFilter,
    ownerFilter,
    riskFilter,
    searchTerm,
    statusFilter,
    workflowFilter,
  ]);

  // Summary stats — spec Section 3: Active Agents | Certifications | Avg Trust Score | Risk Alerts
  const summary = useMemo(() => {
    const active = agents.filter((a) => a.status === "ACTIVE").length;
    const certified = agents.filter((a) =>
      ["APPROVED", "ACTIVE"].includes(a.status),
    ).length;
    const riskAlerts = agents.filter((a) =>
      ["RESTRICTED", "SUSPENDED", "IN_REVIEW", "PAUSED"].includes(a.status),
    ).length;
    const avgTrust = agents.length
      ? `${Math.round(
          (agents.reduce((sum, a) => sum + (a.trust_score || 0), 0) /
            agents.length) *
            100,
        )}%`
      : "—";
    const governanceDebt = agents.filter((a) => getReadiness(a) < 80).length;
    return { active, certified, riskAlerts, avgTrust, governanceDebt };
  }, [agents, getReadiness]);

  return (
    <div className="p-5 mx-auto max-w-[1850px] space-y-5">
      {/* Hidden file input for Import Template */}
      <input
        ref={importFileRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = (ev) => {
            try {
              const parsed = JSON.parse(ev.target?.result as string);
              if (typeof parsed !== "object" || Array.isArray(parsed)) {
                throw new Error("Template must be a JSON object.");
              }
              setImportTemplateData(parsed);
              setIsWizardOpen(true);
            } catch (err: any) {
              setError(`Invalid template file: ${err?.message || "Not valid JSON."}`);
            }
          };
          reader.readAsText(file);
          // Reset so the same file can be re-imported
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
          // Fresh instance per agent (and per open) so one agent's sandbox
          // run never leaks into another's — internal run state is reset.
          key={selectedAgent.id}
          isOpen={isSandboxOpen}
          onClose={() => setIsSandboxOpen(false)}
          agentId={selectedAgent.id}
          agentName={selectedAgent.name}
          currentLevel={selectedAgent.autonomy_level}
          onCertified={(newLevel, newTrustScore, newFaithfulnessScore) => {
            // Optimistic local update — works even when backend is mock/unavailable
            setAgents((prev) =>
              prev.map((a) =>
                a.id === selectedAgent?.id
                  ? {
                      ...a,
                      autonomy_level: newLevel,
                      trust_score: newTrustScore,
                      faithfulness_score: newFaithfulnessScore,
                    }
                  : a,
              ),
            );
            // Also update selectedAgent so AgentDetailsDrawer reflects the change immediately
            setSelectedAgent((prev) =>
              prev
                ? {
                    ...prev,
                    autonomy_level: newLevel,
                    trust_score: newTrustScore,
                    faithfulness_score: newFaithfulnessScore,
                  }
                : prev,
            );
            // Then re-fetch in background to sync with server
            fetchAgents(workspaceId);
          }}
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

      {/* ── Header Command Bar ── */}
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
                  <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)]">
                    Agent Studio
                  </h1>
                  <p className="text-sm text-[var(--foreground-muted)]">
                    Governed identity, certification, runtime control, and
                    evidence for every agent in this workspace.
                  </p>
                </div>
              </div>
            </div>

            {/* Action buttons — Kill Switch, Refresh, Import Template (Hire removed: fixed 6-agent catalog) */}
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
                className="inline-flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/15 ring-1 ring-rose-500/20 px-4 py-2 text-sm font-semibold text-rose-500 transition hover:bg-rose-500 hover:text-white"
              >
                <ShieldAlert className="h-4 w-4" />
                Kill Switch
              </button>
              {/* "Hire New Agent" removed — the Studio is a fixed catalog of the
                  6 governed post-validation agents. New agents are not created here. */}
              <button
                onClick={() => importFileRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-2 text-sm font-semibold text-[var(--foreground)] transition hover:border-indigo-500/30 hover:text-indigo-500"
                title="Import an agent template JSON file"
              >
                <Upload className="h-4 w-4" />
                Import Template
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

      {/* ── Stats Row — spec: Active Agents | Certifications | Avg Trust Score | Risk Alerts ── */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Active Agents",
            value: summary.active,
            icon: PlayCircle,
            tone: "text-emerald-500",
            border: "border-emerald-500/10",
            bg: "bg-emerald-500/5",
          },
          {
            label: "Certifications",
            value: summary.certified,
            icon: Award,
            tone: "text-indigo-500",
            border: "border-indigo-500/10",
            bg: "bg-indigo-500/5",
          },
          {
            label: "Avg Trust Score",
            value: summary.avgTrust,
            icon: ShieldCheck,
            tone: "text-sky-500",
            border: "border-sky-500/10",
            bg: "bg-sky-500/5",
          },
          {
            label: "Risk Alerts",
            value: summary.riskAlerts,
            icon: ShieldAlert,
            tone: "text-rose-500",
            border: "border-rose-500/10",
            bg: "bg-rose-500/5",
          },
        ].map((card) => (
          <div
            key={card.label}
            className={`rounded-3xl border ${card.border} ${card.bg} p-5`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--foreground-muted)]">
                  {card.label}
                </div>
                <div className="mt-2 text-3xl font-bold text-[var(--foreground)]">
                  {card.value}
                </div>
              </div>
              <div
                className={`rounded-2xl bg-[var(--background)] p-3 ${card.tone}`}
              >
                <card.icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Lifecycle Pipeline Header ── */}
      {agents.length > 0 && (() => {
        const stageCounts: Record<string, number> = {}
        for (const a of agents) {
          const key = a.lifecycle_stage || a.status || 'UNKNOWN'
          stageCounts[key] = (stageCounts[key] || 0) + 1
        }
        const stages = [
          { key: 'DRAFT',    label: 'Draft',    color: 'text-[var(--foreground-muted)]', bg: 'bg-[var(--background)]', border: 'border-[var(--border)]' },
          { key: 'PENDING',  label: 'Certify',  color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
          { key: 'REVIEW',   label: 'Review',   color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
          { key: 'APPROVED', label: 'Approved', color: 'text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/20' },
          { key: 'ACTIVE',   label: 'Active',   color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
        ]
        const total = agents.length
        return (
          <div className="flex items-center overflow-x-auto rounded-2xl border border-[var(--card-border)] bg-[var(--surface)] px-4 py-3">
            {stages.map((stage, idx) => {
              const count = Object.entries(stageCounts).reduce((acc, [k, v]) => {
                return k.toUpperCase().includes(stage.key) ? acc + v : acc
              }, 0)
              const pct = total > 0 ? Math.round((count / total) * 100) : 0
              return (
                <div key={stage.key} className="flex items-center shrink-0">
                  <div className="flex flex-col items-center gap-1 px-4">
                    <span className={`text-[10px] font-black uppercase tracking-[0.18em] ${stage.color}`}>{stage.label}</span>
                    <div className={`w-8 h-8 rounded-full border ${stage.border} ${stage.bg} flex items-center justify-center`}>
                      <span className={`text-sm font-bold ${stage.color}`}>{count}</span>
                    </div>
                    <span className="text-[9px] text-[var(--foreground-muted)]">{pct}%</span>
                  </div>
                  {idx < stages.length - 1 && (
                    <span className="text-[var(--foreground-muted)] text-xs px-1 shrink-0">→</span>
                  )}
                </div>
              )
            })}
          </div>
        )
      })()}

      {/* ── Agent Catalog ── */}
      {loading ? (
        <div className="rounded-3xl border border-[var(--card-border)] bg-[var(--surface)] p-8">
          <div className="space-y-3">
            {[1, 2, 3, 4].map((row) => (
              <div
                key={row}
                className="h-16 animate-pulse rounded-2xl bg-[var(--background)]"
              />
            ))}
          </div>
        </div>
      ) : filteredAgents.length === 0 ? (
        /* ── Empty State — spec Section 11 + 8 required templates ── */
        <div className="rounded-3xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-10 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-indigo-500/10 text-indigo-500">
            <Bot className="h-8 w-8" />
          </div>
          <h2 className="mt-5 text-2xl font-bold text-[var(--foreground)]">
            {agents.length === 0
              ? "Build your first governed agent"
              : "No agents match the current filters"}
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-[var(--foreground-muted)]">
            {agents.length === 0
              ? "Agent Studio is the governed workspace for creating, certifying, approving, deploying, pausing, retiring, and evidencing AI agents. Start from a safe template — every agent must have an owner, approved prompt, workflow assignment, and evidence trail before going live."
              : "Try adjusting the authority filters to see the governed validation agents."}
          </p>
          <div className="mx-auto mt-8 grid max-w-5xl gap-4 md:grid-cols-2 xl:grid-cols-4">
            {AGENT_TEMPLATES.slice(0, 8).map((t) => (
              <div
                key={t.title}
                className="rounded-3xl border border-[var(--card-border)] bg-[var(--background)] p-5 text-left"
              >
                <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500">
                  Template
                </div>
                <div className="mt-4 text-sm font-bold text-[var(--foreground)]">
                  {t.title}
                </div>
                <p className="mt-2 text-xs text-[var(--foreground-muted)]">
                  {t.description}
                </p>
              </div>
            ))}
          </div>
          <button
            onClick={() => fetchAgents(workspaceId)}
            className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh Catalog
          </button>
        </div>
      ) : viewMode === "table" ? (
        /* ── Table View ── */
        <div className="overflow-hidden rounded-3xl border border-[var(--card-border)] bg-[var(--surface)]">
          <div className="overflow-x-auto">
            <table className="w-full table-fixed divide-y divide-[var(--card-border)] min-w-[800px]">
              <colgroup>
                <col className="w-[15%]" />
                <col className="w-[24%]" />
                <col className="w-[11%]" />
                <col className="w-[12%]" />
                <col className="w-[14%]" />
                <col className="w-[9%]" />
                <col className="w-[15%]" />
              </colgroup>
              <thead className="bg-[var(--background)]">
                <tr className="text-left text-[11px] font-black uppercase tracking-[0.18em] text-[var(--foreground-muted)]">
                  {/* Columns: Agent Identity | Type & Purpose | Status | Scores | Scope | Activity | Controls */}
                  <th className="px-4 py-3">Agent Identity</th>
                  <th className="px-4 py-3">Type &amp; Purpose</th>
                  <th className="px-4 py-3">Status &amp; Risk</th>
                  <th className="px-4 py-3">Governance Scores</th>
                  <th className="px-4 py-3">Scope &amp; Bindings</th>
                  <th className="px-4 py-3">Activity</th>
                  <th className="px-4 py-3 text-right">Controls</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--card-border)]">
                {filteredAgents.map((agent) => {
                  const readiness = getReadiness(agent);
                  const nextAction = getNextAction(agent);
                  const isBusy = Boolean(actionLoading[agent.id]);
                  const isRetired = agent.status === "RETIRED";

                  return (
                    <tr
                      key={agent.id}
                      className={`align-top transition hover:bg-[var(--background)]/70 ${
                        isRetired ? "opacity-60" : ""
                      }`}
                    >
                      {/* Agent Identity */}
                      <td className="px-4 py-3.5 align-top">
                        <button
                          onClick={() => openAgent(agent)}
                          className="text-left"
                        >
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5 rounded-2xl bg-indigo-500/10 p-2.5 text-indigo-500">
                              <BrainCircuit className="h-4 w-4" />
                            </div>
                            <div className="space-y-1">
                              <div className="text-sm font-semibold text-[var(--foreground)] hover:text-indigo-500">
                                {agent.name}
                              </div>
                              <div className="font-mono text-[10px] text-[var(--foreground-muted)]">
                                {agent.id.slice(0, 8)}…
                              </div>
                            </div>
                          </div>
                        </button>
                      </td>

                      {/* Type & Purpose — what this agent does, in one short sentence */}
                      <td className="px-4 py-3.5 align-top">
                        <div className="space-y-1.5">
                          <span className="inline-flex rounded-full border border-indigo-500/20 bg-indigo-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-indigo-500">
                            {agent.type}
                          </span>
                          <div className="max-w-[340px] text-xs leading-relaxed text-[var(--foreground-muted)]">
                            {agent.purpose ||
                              "Validates a specific part of each post before publishing."}
                          </div>
                        </div>
                      </td>

                      {/* Status & Risk */}
                      <td className="px-4 py-3.5 align-top">
                        <div className="space-y-2">
                          <StatusBadge status={agent.status} />
                          <div className="inline-flex rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.18em] text-amber-500">
                            {(agent.risk_level || "medium").toUpperCase()} risk
                          </div>

                          {/* Readiness bar */}
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[10px] text-[var(--foreground-muted)]">
                              <span>Readiness</span>
                              <span className="font-bold">{readiness}%</span>
                            </div>
                            <div className="h-1.5 w-28 overflow-hidden rounded-full bg-[var(--background)]">
                              <div
                                className={`h-full rounded-full ${
                                  readiness >= 80
                                    ? "bg-emerald-500"
                                    : readiness >= 60
                                      ? "bg-amber-500"
                                      : "bg-rose-500"
                                }`}
                                style={{ width: `${readiness}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Governance Scores — Trust % + Faithfulness % */}
                      <td className="px-4 py-3.5 align-top">
                        <div className="space-y-2">
                          <div>
                            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--foreground-muted)]">
                              Trust Score
                            </div>
                            <div className="mt-0.5 flex items-center gap-2">
                              <div className="h-1.5 w-20 overflow-hidden rounded-full bg-[var(--background)]">
                                <div
                                  className={`h-full rounded-full ${
                                    agent.trust_score >= 0.8
                                      ? "bg-emerald-500"
                                      : agent.trust_score >= 0.6
                                        ? "bg-amber-500"
                                        : "bg-rose-500"
                                  }`}
                                  style={{
                                    width: `${(agent.trust_score || 0) * 100}%`,
                                  }}
                                />
                              </div>
                              <span className="text-sm font-bold text-[var(--foreground)]">
                                {formatPercent(agent.trust_score)}
                              </span>
                            </div>
                          </div>
                          <div>
                            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--foreground-muted)]">
                              Faithfulness
                            </div>
                            <div className="mt-0.5 flex items-center gap-2">
                              <div className="h-1.5 w-20 overflow-hidden rounded-full bg-[var(--background)]">
                                <div
                                  className={`h-full rounded-full ${
                                    agent.faithfulness_score >= 0.85
                                      ? "bg-emerald-500"
                                      : "bg-amber-500"
                                  }`}
                                  style={{
                                    width: `${
                                      (agent.faithfulness_score || 0) * 100
                                    }%`,
                                  }}
                                />
                              </div>
                              <span className="text-sm font-bold text-[var(--foreground)]">
                                {formatPercent(agent.faithfulness_score)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Scope & Bindings */}
                      <td className="px-4 py-3.5 align-top">
                        <div className="space-y-2 text-xs text-[var(--foreground-muted)]">
                          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--background)] px-3 py-1">
                            <FolderKanban className="h-3.5 w-3.5" />
                            {getResourceCount(agent)} governed links
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {(agent.linked_channels || []).length > 0 ? (
                              (agent.linked_channels || [])
                                .slice(0, 3)
                                .map((ch) => (
                                  <span
                                    key={ch}
                                    className="rounded-full border border-[var(--border)] bg-[var(--background)] px-2 py-0.5 text-[10px] font-semibold text-[var(--foreground)]"
                                  >
                                    {ch}
                                  </span>
                                ))
                            ) : (
                              <span className="text-amber-500">
                                No channel scope
                              </span>
                            )}
                            {(agent.linked_channels || []).length > 3 && (
                              <span className="rounded-full border border-[var(--border)] bg-[var(--background)] px-2 py-0.5 text-[10px] font-semibold">
                                +{(agent.linked_channels || []).length - 3}
                              </span>
                            )}
                          </div>
                          <div>
                            Prompts: {agent.linked_prompts?.length || 0} ·
                            Workflows: {agent.linked_workflows?.length || 0}
                          </div>
                        </div>
                      </td>

                      {/* Activity — last activity + the recommended next action */}
                      <td className="px-4 py-3.5 align-top">
                        <div className="space-y-2">
                          <div className="text-xs text-[var(--foreground-muted)]">
                            {agent.last_activity || "Not yet active"}
                          </div>
                          <div
                            title={getNextActionDescription(agent)}
                            className="inline-flex rounded-full border border-indigo-500/20 bg-indigo-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-indigo-500"
                          >
                            {nextAction}
                          </div>
                        </div>
                      </td>

                      {/* Controls — Certify/Upgrade, View Details, Pause, etc.
                          [&>button] makes every control button the same size
                          (full column width, centered) without editing each one. */}
                      <td className="px-4 py-3.5 align-top">
                        <div className="flex flex-col items-stretch gap-2 [&>button]:w-full [&>button]:justify-center [&>button]:whitespace-nowrap">
                          {/* View Details → AgentDetailsDrawer */}
                          <button
                            onClick={() => openAgent(agent)}
                            className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--background)] px-2.5 py-1.5 text-xs font-semibold text-[var(--foreground)] transition hover:border-indigo-500/30 hover:text-indigo-500"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            View Details
                          </button>

                          {/* Request Approval — DRAFT or PENDING_CERTIFICATION */}
                          {agent.status === "DRAFT" && (
                            <button
                              disabled={!canManageAuthority || isBusy}
                              onClick={() => runAgentAction(agent, "approval")}
                              className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <FileCheck className="h-3.5 w-3.5" />
                              {actionLoading[agent.id] === "approval"
                                ? "Requesting..."
                                : "Request Approval"}
                            </button>
                          )}

                          {/* Deploy — APPROVED (governance-gate pre-checked) */}
                          {agent.status === "APPROVED" && (
                            <button
                              disabled={!canManageAuthority || isBusy}
                              onClick={() =>
                                checkGovernanceGatesAndDeploy(agent)
                              }
                              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <PlayCircle className="h-3.5 w-3.5" />
                              {actionLoading[agent.id] === "deploy"
                                ? "Checking gates..."
                                : "Deploy"}
                            </button>
                          )}

                          {/* Pause ⇄ Start toggle — ACTIVE pauses; PAUSED or
                              SUSPENDED (e.g. halted by the Kill Switch) starts */}
                          {["ACTIVE", "PAUSED", "SUSPENDED"].includes(
                            agent.status,
                          ) &&
                            (() => {
                              const isRunning = agent.status === "ACTIVE";
                              const toggleAction = isRunning ? "pause" : "resume";
                              const busyThis =
                                actionLoading[agent.id] === toggleAction;
                              return (
                                <button
                                  role="switch"
                                  aria-checked={isRunning}
                                  disabled={!canManageAuthority || isBusy}
                                  onClick={() =>
                                    runAgentAction(agent, toggleAction)
                                  }
                                  className={`inline-flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${
                                    isRunning
                                      ? "bg-rose-500 hover:bg-rose-400"
                                      : "bg-emerald-600 hover:bg-emerald-500"
                                  }`}
                                >
                                  {/* track */}
                                  <span
                                    className={`relative inline-flex h-3.5 w-6 items-center rounded-full transition ${
                                      isRunning ? "bg-white/30" : "bg-white/30"
                                    }`}
                                  >
                                    <span
                                      className={`absolute h-2.5 w-2.5 rounded-full bg-white transition-all ${
                                        isRunning ? "left-3" : "left-0.5"
                                      }`}
                                    />
                                  </span>
                                  {busyThis
                                    ? isRunning
                                      ? "Pausing..."
                                      : "Starting..."
                                    : isRunning
                                      ? "Pause"
                                      : "Start"}
                                </button>
                              );
                            })()}

                          {/* Rollback — ACTIVE or RESTRICTED */}
                          {["ACTIVE", "RESTRICTED"].includes(agent.status) && (
                            <button
                              disabled={!canManageAuthority || isBusy}
                              onClick={() => runAgentAction(agent, "rollback")}
                              className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--background)] px-2.5 py-1.5 text-xs font-semibold text-[var(--foreground)] transition hover:border-amber-500/30 hover:text-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                              Rollback
                            </button>
                          )}

                          {/* Run Safety Checks — DRAFT / PENDING_CERTIFICATION */}
                          {["DRAFT", "PENDING_CERTIFICATION"].includes(
                            agent.status,
                          ) && (
                            <button
                              disabled={
                                safetyCheckLoading === agent.id || isBusy
                              }
                              onClick={() => handleRunSafetyChecks(agent)}
                              className="inline-flex items-center gap-2 rounded-xl border border-sky-500/20 bg-sky-500/10 px-2.5 py-1.5 text-xs font-semibold text-sky-400 transition hover:bg-sky-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <ShieldCheck className="h-3.5 w-3.5" />
                              {safetyCheckLoading === agent.id
                                ? "Running..."
                                : "Safety Check"}
                            </button>
                          )}

                          {/* Export Evidence — ACTIVE agents */}
                          {agent.status === "ACTIVE" && (
                            <button
                              disabled={evidenceExportLoading === agent.id}
                              onClick={() => handleExportEvidence(agent)}
                              className="inline-flex items-center gap-2 rounded-xl border border-indigo-500/20 bg-indigo-500/10 px-2.5 py-1.5 text-xs font-semibold text-indigo-400 transition hover:bg-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <Award className="h-3.5 w-3.5" />
                              {evidenceExportLoading === agent.id
                                ? "Exporting..."
                                : "Export Evidence"}
                            </button>
                          )}

                          {/* Clone — always available (creates new DRAFT) */}
                          <button
                            disabled={!canManageAuthority || isBusy}
                            onClick={() => runAgentAction(agent, "clone")}
                            className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--background)] px-2.5 py-1.5 text-xs font-semibold text-[var(--foreground)] transition hover:border-indigo-500/30 hover:text-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <ChevronRight className="h-3.5 w-3.5" />
                            {actionLoading[agent.id] === "clone"
                              ? "Cloning..."
                              : "Clone"}
                          </button>

                          {/* Retire — not already retired */}
                          {!isRetired && (
                            <button
                              disabled={!canManageAuthority || isBusy}
                              onClick={() => runAgentAction(agent, "retire")}
                              className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--background)] px-2.5 py-1.5 text-xs font-semibold text-[var(--foreground-muted)] transition hover:border-rose-500/30 hover:text-rose-500 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <Archive className="h-3.5 w-3.5" />
                              {actionLoading[agent.id] === "retire"
                                ? "Retiring..."
                                : "Retire"}
                            </button>
                          )}

                          {/* Remove from view — only once retired. Hides the
                              disabled card; the audit record is preserved. */}
                          {isRetired && (
                            <button
                              onClick={() => dismissRetiredAgent(agent)}
                              title="Remove from view (record preserved for audit)"
                              aria-label={`Remove ${agent.name} from view`}
                              className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--background)] px-2.5 py-1.5 text-xs font-semibold text-[var(--foreground-muted)] transition hover:border-rose-500/30 hover:text-rose-500"
                            >
                              <X className="h-3.5 w-3.5" />
                              Remove
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
        /* ── Card View ── */
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredAgents.map((agent) => {
            const readiness = getReadiness(agent);
            const isRetired = agent.status === "RETIRED";

            return (
              <div
                key={agent.id}
                className={`rounded-3xl border border-[var(--card-border)] bg-[var(--surface)] p-5 ${
                  isRetired ? "opacity-60" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl bg-indigo-500/10 p-3 text-indigo-500">
                      <BrainCircuit className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-lg font-bold text-[var(--foreground)]">
                        {agent.name}
                      </div>
                      <div className="text-xs uppercase tracking-[0.2em] text-[var(--foreground-muted)]">
                        {agent.type}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <StatusBadge status={agent.status} />
                  <span className="inline-flex rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.18em] text-amber-500">
                    {(agent.risk_level || "medium").toUpperCase()}
                  </span>
                </div>

                <div className="mt-4 space-y-1.5 text-sm text-[var(--foreground-muted)]">
                  <div className="inline-flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {agent.primary_dri?.full_name || "Unassigned"}
                  </div>
                  <div>Brand: {agent.assigned_brand || "Not assigned"}</div>
                  <div>
                    Channels:{" "}
                    {(agent.linked_channels || []).join(", ") || "None"}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-[var(--foreground-muted)]">Trust</span>
                    <div className="h-1 w-16 overflow-hidden rounded-full bg-[var(--background)]">
                      <div
                        className={`h-full rounded-full ${(agent.trust_score || 0) >= 0.8 ? 'bg-emerald-500' : (agent.trust_score || 0) >= 0.6 ? 'bg-amber-500' : 'bg-rose-500'}`}
                        style={{ width: `${(agent.trust_score || 0) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold">{formatPercent(agent.trust_score)}</span>
                    <span className="text-[var(--foreground-muted)]">·</span>
                    <span className="text-[10px] text-[var(--foreground-muted)]">Faith {formatPercent(agent.faithfulness_score)}</span>
                  </div>
                  <div>
                    Last activity: {agent.last_activity || "Not yet active"}
                  </div>
                </div>

                <div className="mt-3 space-y-1">
                  <div className="flex justify-between text-[10px] text-[var(--foreground-muted)]">
                    <span>Readiness</span>
                    <span className="font-bold">{readiness}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-[var(--background)]">
                    <div
                      className={`h-full rounded-full ${
                        readiness >= 80
                          ? "bg-emerald-500"
                          : readiness >= 60
                            ? "bg-amber-500"
                            : "bg-rose-500"
                      }`}
                      style={{ width: `${readiness}%` }}
                    />
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <button
                    onClick={() => openAgent(agent)}
                    className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--background)] px-2.5 py-1.5 text-xs font-semibold text-[var(--foreground)] transition hover:border-indigo-500/30 hover:text-indigo-500"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    View Details
                  </button>
                  <button
                    onClick={() => runAgentAction(agent, "clone")}
                    disabled={
                      !canManageAuthority || Boolean(actionLoading[agent.id])
                    }
                    className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--background)] px-2.5 py-1.5 text-xs font-semibold text-[var(--foreground)] transition hover:border-indigo-500/30 hover:text-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                    {actionLoading[agent.id] === "clone"
                      ? "Cloning..."
                      : "Clone"}
                  </button>
                  {/* Retire — not already retired (card view) */}
                  {!isRetired && (
                    <button
                      onClick={() => runAgentAction(agent, "retire")}
                      disabled={
                        !canManageAuthority || Boolean(actionLoading[agent.id])
                      }
                      className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--background)] px-2.5 py-1.5 text-xs font-semibold text-[var(--foreground-muted)] transition hover:border-rose-500/30 hover:text-rose-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Archive className="h-3.5 w-3.5" />
                      {actionLoading[agent.id] === "retire"
                        ? "Retiring..."
                        : "Retire"}
                    </button>
                  )}

                  {/* Remove from view — only once retired. Hides the disabled
                      card; the audit record is preserved in the DB. */}
                  {isRetired && (
                    <button
                      onClick={() => dismissRetiredAgent(agent)}
                      title="Remove from view (record preserved for audit)"
                      aria-label={`Remove ${agent.name} from view`}
                      className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--background)] px-2.5 py-1.5 text-xs font-semibold text-[var(--foreground-muted)] transition hover:border-rose-500/30 hover:text-rose-500"
                    >
                      <X className="h-3.5 w-3.5" />
                      Remove
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
