"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Plus,
  Search,
  Filter,
  ShieldCheck,
  Zap,
  Bot,
  Activity,
  AlertTriangle,
  ChevronRight,
  TrendingUp,
  BrainCircuit,
  Lock,
  Pause,
  RefreshCw,
  User,
  ZapOff,
  ShieldAlert,
  FileCheck,
  KeyRound,
} from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import { api } from "@/lib/api";
import { useRoleContext } from "@/lib/context/RoleContext";
import CreateAgentWizard from "@/components/agents/CreateAgentWizard";
import CertificationSandbox from "@/components/agents/CertificationSandbox";
import AgentDetailsDrawer from "@/components/agents/AgentDetailsDrawer";
import KillSwitchModal from "@/components/agents/KillSwitchModal";

interface Agent {
  id: string;
  name: string;
  type: string;
  primary_dri: {
    full_name: string;
    email: string;
  } | null;
  autonomy_level: string;
  status: string;
  trust_score: number;
  faithfulness_score: number;
  last_activity?: string;
  created_at: string;
}

const MOCK_AGENTS: Agent[] = [
  {
    id: "ag-001",
    name: "Nexus Content Lead",
    type: "content",
    primary_dri: { full_name: "Harsha R.", email: "harsha@zoiko.com" },
    autonomy_level: "L4",
    status: "ACTIVE",
    trust_score: 0.94,
    faithfulness_score: 0.98,
    last_activity: "2 mins ago",
    created_at: new Date().toISOString(),
  },
  {
    id: "ag-002",
    name: "Sentinel Optimizer",
    type: "optimization",
    primary_dri: { full_name: "Minit S.", email: "minit@zoiko.com" },
    autonomy_level: "L3",
    status: "PAUSED",
    trust_score: 0.88,
    faithfulness_score: 0.92,
    last_activity: "1 hour ago",
    created_at: new Date().toISOString(),
  },
  {
    id: "ag-003",
    name: "Vision Research Bot",
    type: "research",
    primary_dri: { full_name: "Naresh K.", email: "naresh@zoiko.com" },
    autonomy_level: "L5",
    status: "ACTIVE",
    trust_score: 0.96,
    faithfulness_score: 0.99,
    last_activity: "Just now",
    created_at: new Date().toISOString(),
  },
  {
    id: "ag-004",
    name: "Brand Guardian",
    type: "governance",
    primary_dri: { full_name: "Harsha R.", email: "harsha@zoiko.com" },
    autonomy_level: "L2",
    status: "PENDING_CERTIFICATION",
    trust_score: 0,
    faithfulness_score: 0,
    last_activity: "Created today",
    created_at: new Date().toISOString(),
  },
];

export default function StudioPage() {
  const { role } = useRoleContext();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [suspendingAgentId, setSuspendingAgentId] = useState<string | null>(null);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isSandboxOpen, setIsSandboxOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isKillSwitchOpen, setIsKillSwitchOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  const fetchAgents = useCallback(async (wsId: string) => {
    try {
      setLoading(true);
      setError(null);
      const result = await api.get(`/api/v1/agents?workspaceId=${wsId}`);
      if (result.success && result.data.length > 0) {
        setAgents(result.data);
      } else {
        setAgents(MOCK_AGENTS);
      }
    } catch (fetchError) {
      console.warn("Failed to fetch agents, using mock data", fetchError);
      setError("Live agent registry is unavailable. Showing fallback authority records.");
      setAgents(MOCK_AGENTS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        const context = await api.get("/api/v1/user/context");
        if (context.success && context.data.workspace_id) {
          setWorkspaceId(context.data.workspace_id);
          fetchAgents(context.data.workspace_id);
        } else {
          setError("Workspace context is unavailable. Showing fallback authority records.");
          setAgents(MOCK_AGENTS);
          setLoading(false);
        }
      } catch {
        setError("Workspace context is unavailable. Showing fallback authority records.");
        setAgents(MOCK_AGENTS);
        setLoading(false);
      }
    };
    init();
  }, [fetchAgents]);

  const canManageAuthority = ["ADMIN", "WORKSPACE_OWNER", "AGENT_ARCHITECT"].includes((role || "").toUpperCase());

  const getAutonomyColor = (level: string) => {
    const l = parseInt(level.replace("L", ""), 10);
    if (isNaN(l)) return "text-[var(--foreground-muted)] bg-[var(--surface)] border-[var(--border)]";
    if (l >= 5) return "text-indigo-400 bg-indigo-400/10 border-indigo-400/20";
    if (l >= 3) return "text-emerald-400 bg-emerald-400/10 border-emerald-400/20";
    return "text-amber-400 bg-amber-400/10 border-amber-400/20";
  };

  const getAuthorityReadiness = useCallback((agent: Agent) => {
    const checks = [
      Boolean(agent.primary_dri),
      agent.autonomy_level !== "L0",
      agent.status === "ACTIVE",
      (agent.trust_score || 0) >= 0.7,
      (agent.faithfulness_score || 0) >= 0.85,
    ];
    const passed = checks.filter(Boolean).length;
    return Math.round((passed / checks.length) * 100);
  }, []);

  const filteredAgents = useMemo(
    () =>
      agents.filter((agent) => {
        const search = searchTerm.toLowerCase();
        return (
          agent.name.toLowerCase().includes(search) ||
          (agent.primary_dri?.full_name || "").toLowerCase().includes(search) ||
          agent.type.toLowerCase().includes(search)
        );
      }),
    [agents, searchTerm],
  );

  const authoritySummary = useMemo(() => {
    const compliant = agents.filter((agent) => getAuthorityReadiness(agent) >= 80).length;
    const missingDri = agents.filter((agent) => !agent.primary_dri).length;
    const restricted = agents.filter((agent) =>
      ["PENDING_CERTIFICATION", "PAUSED", "SUSPENDED", "DEAUTHORIZED", "DRAFT"].includes(agent.status),
    ).length;
    return { compliant, missingDri, restricted };
  }, [agents, getAuthorityReadiness]);

  const handleSuspendAgent = useCallback(
    async (agent: Agent) => {
      if (!canManageAuthority) return;
      try {
        setSuspendingAgentId(agent.id);
        const result = await api.post(`/api/v1/autonomy/agents/${agent.id}/suspend`, {
          reason: `Authority suspension triggered from Agent Studio for ${agent.name}`,
        });
        if (result.success && workspaceId) {
          await fetchAgents(workspaceId);
        }
      } catch (suspendError) {
        console.error("Failed to suspend agent", suspendError);
        setError(`Failed to suspend ${agent.name}.`);
      } finally {
        setSuspendingAgentId(null);
      }
    },
    [canManageAuthority, fetchAgents, workspaceId],
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
      <CreateAgentWizard isOpen={isWizardOpen} onClose={() => setIsWizardOpen(false)} onSuccess={() => workspaceId && fetchAgents(workspaceId)} />

      {selectedAgent && (
        <CertificationSandbox
          isOpen={isSandboxOpen}
          onClose={() => setIsSandboxOpen(false)}
          agentId={selectedAgent.id}
          agentName={selectedAgent.name}
          currentLevel={selectedAgent.autonomy_level}
          onCertified={() => workspaceId && fetchAgents(workspaceId)}
        />
      )}

      <AgentDetailsDrawer isOpen={isDetailsOpen} onClose={() => setIsDetailsOpen(false)} agent={selectedAgent} onUpdate={() => workspaceId && fetchAgents(workspaceId)} />

      <KillSwitchModal isOpen={isKillSwitchOpen} onClose={() => setIsKillSwitchOpen(false)} onActivated={() => workspaceId && fetchAgents(workspaceId)} />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)] flex items-center gap-3">
            <Bot className="w-8 h-8 text-indigo-500" />
            Agent Studio
          </h1>
          <p className="text-[var(--foreground-muted)] mt-1">Identity management, accountability, certification, and revocation for every governed agent.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsKillSwitchOpen(true)}
            className="flex items-center gap-2 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest border border-rose-500/20 transition-all shadow-lg shadow-rose-500/5 active:scale-95 group mr-4"
          >
            <ZapOff className="w-4 h-4 group-hover:animate-pulse" />
            KILL SWITCH
          </button>
          <button onClick={() => workspaceId && fetchAgents(workspaceId)} className="p-2.5 text-[var(--foreground-muted)] hover:text-indigo-400 hover:bg-indigo-400/10 border border-[var(--border)] rounded-xl transition-all" title="Refresh Data">
            <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button onClick={() => setIsWizardOpen(true)} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl font-semibold transition-all shadow-lg shadow-indigo-600/20 active:scale-95 group">
            <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
            Hire New Agent
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-5 py-4 text-sm text-amber-400">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: "Active Agents", value: agents.filter((agent) => agent.status === "ACTIVE").length.toString(), icon: Activity, color: "text-emerald-500" },
          { label: "Authority Ready", value: authoritySummary.compliant.toString(), icon: FileCheck, color: "text-indigo-500" },
          { label: "Avg. Trust", value: agents.length ? `${(agents.reduce((acc, agent) => acc + (agent.trust_score || 0), 0) / agents.length * 100).toFixed(0)}%` : "0%", icon: TrendingUp, color: "text-amber-500" },
          { label: "Risk Alerts", value: authoritySummary.restricted.toString(), icon: AlertTriangle, color: "text-rose-500" },
        ].map((card) => (
          <div key={card.label} className="bg-[var(--card)] border border-[var(--card-border)] p-5 rounded-2xl shadow-sm hover:border-indigo-500/30 transition-all group">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-[var(--foreground-muted)]">{card.label}</span>
              <card.icon className={`w-5 h-5 ${card.color}`} />
            </div>
            <div className="text-2xl font-bold text-[var(--foreground)]">{card.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[var(--card)] border border-[var(--card-border)] rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <KeyRound className="w-5 h-5 text-indigo-400" />
            <h2 className="text-sm font-semibold text-[var(--foreground)]">Identity Coverage</h2>
          </div>
          <p className="text-3xl font-bold text-[var(--foreground)]">{agents.length - authoritySummary.missingDri}</p>
          <p className="text-xs text-[var(--foreground-muted)] mt-2">Agents with a named DRI and attributable authority owner.</p>
        </div>

        <div className="bg-[var(--card)] border border-[var(--card-border)] rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h2 className="text-sm font-semibold text-[var(--foreground)]">Certification Compliance</h2>
          </div>
          <p className="text-3xl font-bold text-[var(--foreground)]">{authoritySummary.compliant}/{agents.length || 0}</p>
          <p className="text-xs text-[var(--foreground-muted)] mt-2">Identity, autonomy, trust, and faithfulness checks all passing.</p>
        </div>

        <div className="bg-[var(--card)] border border-[var(--card-border)] rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <ShieldAlert className="w-5 h-5 text-rose-400" />
            <h2 className="text-sm font-semibold text-[var(--foreground)]">Restricted Operators</h2>
          </div>
          <p className="text-3xl font-bold text-[var(--foreground)]">{authoritySummary.restricted}</p>
          <p className="text-xs text-[var(--foreground-muted)] mt-2">Agents paused, uncertified, draft, suspended, or otherwise blocked from full authority.</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-[var(--card)]/50 border border-[var(--card-border)] p-4 rounded-2xl backdrop-blur-sm">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--foreground-muted)]" />
          <input
            type="text"
            placeholder="Search agents by name, DRI, or type..."
            className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all text-[var(--foreground)]"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[var(--foreground-muted)] hover:text-[var(--foreground)] border border-[var(--border)] rounded-xl hover:bg-[var(--surface-hover)] transition-all">
            <Filter className="w-4 h-4" />
            Authority Filters
          </button>
          <div className="h-6 w-[1px] bg-[var(--border)] mx-1 hidden md:block" />
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-xl text-xs font-bold cursor-pointer hover:bg-rose-500 hover:text-white transition-all">
            <Lock className="w-3.5 h-3.5" />
            GLOBAL KILL SWITCH
          </div>
        </div>
      </div>

      <div className="bg-[var(--card)] border border-[var(--card-border)] rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-[var(--card-border)] bg-[var(--surface)]/50">
                <th className="text-left py-4 px-6 text-xs font-bold text-[var(--foreground-muted)] uppercase tracking-wider">Agent Identity</th>
                <th className="text-left py-4 px-6 text-xs font-bold text-[var(--foreground-muted)] uppercase tracking-wider">Type & DRI</th>
                <th className="text-left py-4 px-6 text-xs font-bold text-[var(--foreground-muted)] uppercase tracking-wider">Autonomy</th>
                <th className="text-left py-4 px-6 text-xs font-bold text-[var(--foreground-muted)] uppercase tracking-wider">Status</th>
                <th className="text-left py-4 px-6 text-xs font-bold text-[var(--foreground-muted)] uppercase tracking-wider">Governance Scores</th>
                <th className="py-4 px-6"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--card-border)]">
              {loading ? (
                [1, 2, 3].map((row) => (
                  <tr key={row} className="animate-pulse">
                    <td colSpan={6} className="py-8 px-6">
                      <div className="h-8 bg-[var(--surface-hover)] rounded-lg w-full" />
                    </td>
                  </tr>
                ))
              ) : filteredAgents.length > 0 ? (
                filteredAgents.map((agent) => (
                  <tr key={agent.id} className="hover:bg-[var(--surface-hover)]/30 transition-colors group">
                    <td className="py-5 px-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 group-hover:scale-110 transition-transform">
                          <BrainCircuit className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="font-semibold text-[var(--foreground)]">{agent.name}</div>
                          <div className="text-xs text-[var(--foreground-muted)] uppercase tracking-tighter">{agent.id.split("-")[0]}...</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-5 px-6">
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-[var(--foreground)] capitalize">{agent.type}</div>
                        <div className="text-xs text-[var(--foreground-muted)] flex items-center gap-1">
                          <User className="w-3 h-3" />
                          DRI: {agent.primary_dri?.full_name || "Unassigned"}
                        </div>
                        <div className="text-[10px] text-[var(--foreground-muted)]">Authority readiness {getAuthorityReadiness(agent)}%</div>
                      </div>
                    </td>
                    <td className="py-5 px-6">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-black border ${getAutonomyColor(agent.autonomy_level)}`}>{agent.autonomy_level}</span>
                    </td>
                    <td className="py-5 px-6">
                      <StatusBadge status={agent.status} />
                      <div className="text-[10px] text-[var(--foreground-muted)] mt-1 ml-1 uppercase tracking-tighter">{agent.last_activity || new Date(agent.created_at).toLocaleDateString()}</div>
                    </td>
                    <td className="py-5 px-6">
                      <div className="flex items-center gap-6">
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider">
                            <span className="text-[var(--foreground-muted)]">Trust</span>
                            <span className="text-indigo-400">{(agent.trust_score * 100).toFixed(0)}%</span>
                          </div>
                          <div className="w-24 h-1.5 bg-[var(--border)] rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500 rounded-full transition-all duration-1000" style={{ width: `${agent.trust_score * 100}%` }} />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider">
                            <span className="text-[var(--foreground-muted)]">Faith</span>
                            <span className="text-emerald-400">{(agent.faithfulness_score * 100).toFixed(0)}%</span>
                          </div>
                          <div className="w-24 h-1.5 bg-[var(--border)] rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full transition-all duration-1000" style={{ width: `${agent.faithfulness_score * 100}%` }} />
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-5 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {parseInt(agent.autonomy_level.replace("L", ""), 10) < 6 && (
                          <button
                            onClick={() => {
                              setSelectedAgent(agent);
                              setIsSandboxOpen(true);
                            }}
                            className="p-2 text-indigo-400 hover:bg-indigo-400/10 rounded-lg transition-all"
                            title="Certify & Upgrade"
                          >
                            <ShieldCheck className="w-5 h-5" />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setSelectedAgent(agent);
                            setIsDetailsOpen(true);
                          }}
                          className="p-2 text-[var(--foreground-muted)] hover:text-indigo-400 hover:bg-indigo-400/10 rounded-lg transition-all"
                          title="View Details"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleSuspendAgent(agent)}
                          disabled={!canManageAuthority || suspendingAgentId === agent.id}
                          className="p-2 text-[var(--foreground-muted)] hover:text-rose-400 hover:bg-rose-400/10 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          title={canManageAuthority ? "Suspend Agent" : "Insufficient authority"}
                        >
                          <Pause className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[var(--foreground-muted)]">No agents found. Start by hiring your first digital operator.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-[var(--foreground-muted)] bg-indigo-500/5 p-4 rounded-xl border border-indigo-500/10">
        <Zap className="w-4 h-4 text-indigo-400" />
        <span>Every agent is treated as a governed digital operator: named DRI, scoped authority, certified autonomy, and a safe de-authorization path before execution.</span>
      </div>
    </div>
  );
}
