"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Bot,
  Activity,
  RefreshCcw,
  Lock,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  ShieldAlert,
  Workflow,
  FileWarning,
} from "lucide-react";
import { api } from "@/lib/api";

interface Agent {
  id: string;
  name: string;
  type: string;
  status: string;
  autonomy_level: string;
  trust_score: number;
  faithfulness_score: number;
  updated_at: string;
}

interface Stats {
  total: number;
  active: number;
  supervised: number;
  suspended: number;
  avg_trust: number;
  avg_faithfulness: number;
  by_level: Record<string, number>;
  active_locks: number;
}

interface EmergencyLock {
  id: string;
  level: string;
  scope: string;
  reason: string;
  created_at: string;
}

interface HitlRule {
  id: string;
  trigger: string;
  action: string;
  route_to_role: string;
  enabled: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  ACTIVE: { label: "Active", color: "text-emerald-400", dot: "bg-emerald-400" },
  MONITORED: { label: "Monitored", color: "text-amber-400", dot: "bg-amber-400 animate-pulse" },
  SUPERVISED: { label: "Supervised", color: "text-orange-400", dot: "bg-orange-400" },
  RESTRICTED: { label: "Restricted", color: "text-orange-400", dot: "bg-orange-400" },
  SUSPENDED: { label: "Suspended", color: "text-rose-400", dot: "bg-rose-400" },
  DEAUTHORIZED: { label: "Deauthorized", color: "text-red-400", dot: "bg-red-400" },
  DRAFT: { label: "Draft", color: "text-[#666]", dot: "bg-[#555]" },
};

const LEVEL_COLORS: Record<string, string> = {
  L0: "text-[#555]",
  L1: "text-zinc-400",
  L2: "text-blue-400",
  L3: "text-amber-400",
  L4: "text-emerald-400",
  L5: "text-teal-400",
  L6: "text-indigo-400",
};

function timeAgo(date: string): string {
  if (!date) return "-";
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ago`;
  if (h > 0) return `${h}h ago`;
  return `${m}m ago`;
}

export default function AgentOperationsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [locks, setLocks] = useState<EmergencyLock[]>([]);
  const [hitlRules, setHitlRules] = useState<HitlRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ctxRes, statsRes, locksRes, hitlRes] = await Promise.all([
        api.get("/api/v1/user/context"),
        api.get("/api/v1/autonomy/stats"),
        api.get("/api/v1/autonomy/emergency-locks"),
        api.get("/api/v1/autonomy/hitl-rules"),
      ]);

      if (statsRes.success) setStats(statsRes.data);
      if (locksRes.success) setLocks(locksRes.data || []);
      if (hitlRes.success) setHitlRules(hitlRes.data || []);

      if (ctxRes.success && ctxRes.data.workspace_id) {
        const agentsRes = await api.get(`/api/v1/agents?workspaceId=${ctxRes.data.workspace_id}`);
        if (agentsRes.success) setAgents(agentsRes.data || []);
      }
    } catch {
      setError("Failed to load agent operations.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const riskAgents = agents.filter((agent) => {
    const trust = Math.round((agent.trust_score || 0) * 100);
    return trust < 70 || ["SUPERVISED", "SUSPENDED", "DEAUTHORIZED", "RESTRICTED", "MONITORED"].includes(agent.status);
  });

  const enabledHitlRules = hitlRules.filter((rule) => rule.enabled);

  return (
    <div className="max-w-5xl mx-auto pb-16 px-4">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Agent Operations</h1>
          <p className="text-[#888] text-sm">Live supervision of runtime authority, status, trust, intervention rules, and control events.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-xs text-emerald-400">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
            Auto-refresh 30s
          </div>
          <button onClick={fetchData} className="p-2.5 bg-[var(--card)] border border-[var(--border)] rounded-xl text-[#888] hover:text-white transition-all group">
            <RefreshCcw className={`w-4 h-4 ${loading ? "animate-spin text-indigo-400" : "group-hover:rotate-180 transition-transform duration-500"}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-5 p-3.5 rounded-xl flex items-center gap-3 text-sm bg-rose-500/10 border border-rose-500/20 text-rose-400">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          {[
            { label: "Active Agents", val: stats.active, icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />, color: "text-emerald-400" },
            { label: "Supervised", val: stats.supervised, icon: <Activity className="w-4 h-4 text-amber-400" />, color: "text-amber-400" },
            { label: "Suspended", val: stats.suspended, icon: <Lock className="w-4 h-4 text-rose-400" />, color: "text-rose-400" },
            { label: "Avg Trust Score", val: `${stats.avg_trust}%`, icon: <ShieldCheck className="w-4 h-4 text-indigo-400" />, color: stats.avg_trust >= 80 ? "text-emerald-400" : "text-amber-400" },
          ].map((card) => (
            <div key={card.label} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3 flex items-center gap-3">
              <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center shrink-0">{card.icon}</div>
              <div>
                <p className={`text-lg font-bold ${card.color}`}>{card.val}</p>
                <p className="text-[10px] text-[#666]">{card.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4 mb-5">
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4">
          <h2 className="text-sm font-bold text-[#aaa] uppercase tracking-wider mb-3 flex items-center gap-2">
            <Workflow className="w-4 h-4 text-indigo-400" />
            Human Control Rules
          </h2>
          {enabledHitlRules.length === 0 ? (
            <p className="text-sm text-[#666]">No active human-in-the-loop rules found.</p>
          ) : (
            <div className="space-y-2">
              {enabledHitlRules.slice(0, 4).map((rule) => (
                <div key={rule.id} className="rounded-xl border border-[var(--border)] bg-white/2 p-3">
                  <p className="text-xs font-semibold text-white">{rule.trigger}</p>
                  <p className="text-[10px] text-[#777] mt-1">{rule.action} to {rule.route_to_role}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4">
          <h2 className="text-sm font-bold text-[#aaa] uppercase tracking-wider mb-3 flex items-center gap-2">
            <FileWarning className="w-4 h-4 text-rose-400" />
            Emergency Controls
          </h2>
          {locks.length === 0 ? (
            <p className="text-sm text-[#666]">No emergency lock is active. Runtime authority is operating under governed supervision.</p>
          ) : (
            <div className="space-y-2">
              {locks.slice(0, 3).map((lock) => (
                <div key={lock.id} className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3">
                  <p className="text-xs font-semibold text-rose-400">{lock.level} lock on {lock.scope}</p>
                  <p className="text-[10px] text-[#888] mt-1">{lock.reason}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {stats && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 mb-5">
          <p className="text-xs font-bold text-[#666] uppercase tracking-wider mb-3">Autonomy Level Distribution</p>
          <div className="flex items-end gap-2 h-12">
            {["L0", "L1", "L2", "L3", "L4", "L5", "L6"].map((level) => {
              const count = stats.by_level[level] || 0;
              const maxCount = Math.max(...Object.values(stats.by_level), 1);
              const height = count > 0 ? Math.max(4, (count / maxCount) * 100) : 4;
              return (
                <div key={level} className="flex flex-col items-center gap-1 flex-1">
                  <div className="flex flex-col justify-end w-full" style={{ height: "48px" }}>
                    <div className={`w-full rounded-sm transition-all ${count > 0 ? "bg-indigo-500/60" : "bg-white/5"}`} style={{ height: `${height}%` }} />
                  </div>
                  <span className={`text-[9px] font-bold ${LEVEL_COLORS[level]}`}>{level}</span>
                  <span className="text-[9px] text-[#555]">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-[#666] gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
          <p className="text-sm">Loading agent roster...</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4">
            <h2 className="text-sm font-bold text-[#aaa] uppercase tracking-wider mb-3 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              Needs Attention ({riskAgents.length})
            </h2>
            {riskAgents.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle2 className="w-8 h-8 text-emerald-400/30 mx-auto mb-2" />
                <p className="text-emerald-400 text-sm font-medium">All agents healthy</p>
              </div>
            ) : (
              <div className="space-y-2">
                {riskAgents.map((agent) => {
                  const trust = Math.round((agent.trust_score || 0) * 100);
                  const status = STATUS_CONFIG[agent.status] ?? STATUS_CONFIG.DRAFT;
                  return (
                    <div key={agent.id} className="flex items-center gap-3 p-3 bg-white/2 border border-[var(--border)]/50 rounded-xl">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${status.dot}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-white truncate">{agent.name}</p>
                        <p className={`text-[10px] ${status.color}`}>{status.label} · Trust {trust}%</p>
                      </div>
                      <span className={`text-[10px] font-bold ${LEVEL_COLORS[agent.autonomy_level] ?? "text-[#555]"}`}>{agent.autonomy_level}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4">
            <h2 className="text-sm font-bold text-[#aaa] uppercase tracking-wider mb-3 flex items-center gap-2">
              <Bot className="w-4 h-4 text-indigo-400" />
              All Agents ({agents.length})
            </h2>
            {agents.length === 0 ? (
              <div className="text-center py-8">
                <Bot className="w-8 h-8 text-[#333] mx-auto mb-2" />
                <p className="text-[#555] text-sm">No agents registered.</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {agents.map((agent) => {
                  const trust = Math.round((agent.trust_score || 0) * 100);
                  const status = STATUS_CONFIG[agent.status] ?? STATUS_CONFIG.DRAFT;
                  return (
                    <div key={agent.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/3 transition-colors">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${status.dot}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-white truncate">{agent.name}</p>
                        <p className="text-[10px] text-[#555]">{agent.type}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="w-16 h-1 bg-white/5 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${trust >= 80 ? "bg-emerald-500" : trust >= 60 ? "bg-amber-500" : "bg-rose-500"}`} style={{ width: `${trust}%` }} />
                        </div>
                        <span className={`text-[10px] font-bold ${LEVEL_COLORS[agent.autonomy_level] ?? "text-[#555]"}`}>{agent.autonomy_level}</span>
                        <span className="text-[10px] text-[#555]">{timeAgo(agent.updated_at)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {(stats?.active_locks ?? 0) > 0 && (
        <div className="mt-4 p-4 bg-rose-500/5 border border-rose-500/20 rounded-2xl flex items-center gap-3">
          <Lock className="w-5 h-5 text-rose-400 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-rose-400">Emergency Lock Active</p>
            <p className="text-xs text-[#888]">{stats?.active_locks} active lock(s) - autonomous agent activity is restricted. Go to Autonomy Controls -&gt; Emergency Locks to manage.</p>
          </div>
        </div>
      )}
    </div>
  );
}
