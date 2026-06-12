"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Bot, ShieldAlert, ShieldCheck, Zap, UserCheck, Lock, Unlock,
  Loader2, AlertTriangle, RefreshCcw, Plus, Trash2, ToggleRight,
  Activity, AlertCircle, ChevronDown, ChevronUp, X
} from "lucide-react";
import { api } from "@/lib/api";
import { useRoleContext } from "@/lib/context/RoleContext";

// ─── Types ────────────────────────────────────────────────────────────────────

type Level = "L0"|"L1"|"L2"|"L3"|"L4"|"L5"|"L6";

interface Agent {
  id: string; name: string; type: string;
  autonomy_level: Level; status: string;
  trust_score: number; faithfulness_score: number;
}

interface Stats {
  total: number; active: number; supervised: number; suspended: number;
  avg_trust: number; avg_faithfulness: number;
  by_level: Record<string,number>; active_locks: number;
}

interface EmergencyLock {
  id: string; level: string; scope: string; reason: string;
  created_at: string; workspace_id: string;
}

interface HITLRule {
  id: string; trigger: string; action: string;
  route_to_role: string; enabled: boolean; created_at: string;
}

interface NKS {
  id: string; name: string; prohibited_terms: string[];
  scope: string; severity: string; owner_role: string; created_at: string;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const LEVEL_CONFIG: Record<Level, { name: string; color: string; bg: string; border: string; dot: string; minTrust: number }> = {
  L0: { name: "Disabled",                     color: "text-[#555]",     bg: "bg-[#333]/20",      border: "border-[#444]",      dot: "bg-[#555]",     minTrust: 0  },
  L1: { name: "Assistive",                     color: "text-foreground-muted",   bg: "bg-zinc-500/10",    border: "border-zinc-500/30", dot: "bg-zinc-400",   minTrust: 0  },
  L2: { name: "Creative",                      color: "text-info-text",   bg: "bg-info-bg",    border: "border-info-border", dot: "bg-blue-400",   minTrust: 0  },
  L3: { name: "Guided",                        color: "text-warning-text",  bg: "bg-warning-bg",   border: "border-warning-border",dot: "bg-warning-text",  minTrust: 60 },
  L4: { name: "Validated",                     color: "text-success-text",bg: "bg-success-bg", border: "border-success-border",dot:"bg-success-text",minTrust: 70 },
  L5: { name: "Conditional",                   color: "text-teal-400",   bg: "bg-teal-500/10",    border: "border-teal-500/30", dot: "bg-teal-400",   minTrust: 80 },
  L6: { name: "Enterprise",                    color: "text-info-text", bg: "bg-info-bg",  border: "border-info-border",dot:"bg-info-text", minTrust: 90 },
};

const STATUS_CONFIG: Record<string, { color: string; bg: string }> = {
  ACTIVE:        { color: "text-success-text", bg: "bg-success-bg border-success-border" },
  MONITORED:     { color: "text-warning-text",   bg: "bg-warning-bg border-warning-border" },
  SUPERVISED:    { color: "text-warning-text",  bg: "bg-warning-bg border-warning-border" },
  RESTRICTED:    { color: "text-warning-text",  bg: "bg-warning-bg border-warning-border" },
  SUSPENDED:     { color: "text-error-text",    bg: "bg-error-bg border-error-border" },
  DEAUTHORIZED:  { color: "text-error-text",     bg: "bg-error-bg border-error-border" },
  DRAFT:         { color: "text-[#666]",      bg: "bg-white/5 border-white/10" },
};

const LOCK_LEVEL_CONFIG: Record<string, { label: string; color: string }> = {
  L1: { label: "Agent Lock",     color: "text-warning-text bg-warning-bg border-warning-border" },
  L2: { label: "Workflow Lock",  color: "text-warning-text bg-warning-bg border-warning-border" },
  L3: { label: "Workspace Lock", color: "text-error-text bg-error-bg border-error-border" },
  L4: { label: "Enterprise Lock",color: "text-error-text bg-error-bg border-error-border" },
};

const SEVERITY_COLORS: Record<string, string> = {
  BLOCK:             "text-error-text bg-error-bg border-error-border",
  ESCALATE:          "text-warning-text bg-warning-bg border-warning-border",
  WARN:              "text-warning-text bg-warning-bg border-warning-border",
  REQUIRE_APPROVAL:  "text-info-text bg-info-bg border-info-border",
};

function trustColor(pct: number): string {
  if (pct >= 90) return "bg-success-text";
  if (pct >= 80) return "bg-teal-500";
  if (pct >= 70) return "bg-warning-text";
  if (pct >= 60) return "bg-warning-text";
  return "bg-error-text";
}

function trustLabel(pct: number): string {
  if (pct >= 90) return "Eligible L5/L6";
  if (pct >= 80) return "Stable";
  if (pct >= 70) return "Monitor";
  if (pct >= 60) return "Restrict High-Risk";
  return "Suspend Required";
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AutonomyPage() {
  const { role, isSuperAdmin } = useRoleContext();
  const canManageAutonomy = isSuperAdmin || ['GOVERNANCE_ADMIN','ADMIN','WORKSPACE_OWNER'].includes(role ?? '');
  const [tab, setTab] = useState<"agents"|"locks"|"hitl"|"nks">("agents");
  const [agents, setAgents] = useState<Agent[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [locks, setLocks] = useState<EmergencyLock[]>([]);
  const [hitlRules, setHitlRules] = useState<HITLRule[]>([]);
  const [nksList, setNksList] = useState<NKS[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [message, setMessage] = useState<{type:"success"|"error";text:string}|null>(null);

  // Forms
  const [levelReason, setLevelReason] = useState<Record<string,string>>({});
  const [lockForm, setLockForm] = useState({ level:"L1", scope:"", reason:"" });
  const [hitlForm, setHitlForm] = useState({ trigger:"", action:"", route_to_role:"VALIDATOR" });
  const [nksForm, setNksForm] = useState({ name:"", terms:"", scope:"All", severity:"BLOCK", owner_role:"GOVERNANCE_ADMIN" });
  const [showLockForm, setShowLockForm] = useState(false);
  const [showHITLForm, setShowHITLForm] = useState(false);
  const [showNKSForm, setShowNKSForm] = useState(false);

  const flash = (type: "success"|"error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [ctxRes, statsRes, locksRes, hitlRes, nksRes] = await Promise.all([
        api.get("/api/v1/user/context"),
        api.get("/api/v1/autonomy/stats"),
        api.get("/api/v1/autonomy/emergency-locks"),
        api.get("/api/v1/autonomy/hitl-rules"),
        api.get("/api/v1/autonomy/negative-knowledge"),
      ]);

      if (statsRes.success) setStats(statsRes.data);
      if (locksRes.success) setLocks(locksRes.data);
      if (hitlRes.success) setHitlRules(hitlRes.data);
      if (nksRes.success) setNksList(nksRes.data);

      if (ctxRes.success && ctxRes.data.workspace_id) {
        const agentsRes = await api.get(`/api/v1/agents?workspaceId=${ctxRes.data.workspace_id}`);
        if (agentsRes.success) setAgents(agentsRes.data || []);
      }
    } catch {
      flash("error", "Failed to load autonomy data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleLevelChange = async (agentId: string, level: Level) => {
    const reason = levelReason[agentId] || `Manual update to ${level}`;
    setActionId(agentId + level);
    try {
      const res = await api.patch(`/api/v1/autonomy/agents/${agentId}/level`, { level, reason });
      if (res.success) {
        setAgents(prev => prev.map(a => a.id === agentId ? { ...a, autonomy_level: level } : a));
        flash("success", res.message || `Agent updated to ${level}`);
      } else {
        flash("error", res.error || "Failed to update level.");
      }
    } catch { flash("error", "Network error."); }
    finally { setActionId(null); }
  };

  const handleSuspend = async (agentId: string, agentName: string) => {
    setActionId(agentId + "suspend");
    try {
      const res = await api.post(`/api/v1/autonomy/agents/${agentId}/suspend`, { reason: `Manual suspension via Autonomy Control Center` });
      if (res.success) {
        setAgents(prev => prev.map(a => a.id === agentId ? { ...a, autonomy_level: "L0", status: "SUSPENDED" } : a));
        flash("success", `${agentName} suspended.`);
      } else {
        flash("error", res.error || "Failed to suspend.");
      }
    } catch { flash("error", "Network error."); }
    finally { setActionId(null); }
  };

  const handleCreateLock = async () => {
    if (!lockForm.scope || !lockForm.reason) return flash("error", "Scope and reason required.");
    setActionId("lock");
    try {
      const res = await api.post("/api/v1/autonomy/emergency-locks", { lock_level: lockForm.level, scope: lockForm.scope, reason: lockForm.reason });
      if (res.success) {
        setLocks(prev => [...prev, res.data]);
        setLockForm({ level: "L1", scope: "", reason: "" });
        setShowLockForm(false);
        flash("success", `Emergency ${lockForm.level} lock applied.`);
        fetchAll();
      } else flash("error", res.error || "Failed to create lock.");
    } catch { flash("error", "Network error."); }
    finally { setActionId(null); }
  };

  const handleLiftLock = async (lockId: string) => {
    setActionId(lockId);
    try {
      const res = await api.delete(`/api/v1/autonomy/emergency-locks/${lockId}`);
      if (res.success) {
        setLocks(prev => prev.filter(l => l.id !== lockId));
        flash("success", "Emergency lock lifted.");
      }
    } catch { flash("error", "Failed to lift lock."); }
    finally { setActionId(null); }
  };

  const handleToggleHITL = async (rule: HITLRule) => {
    setActionId(rule.id);
    try {
      const res = await api.put(`/api/v1/autonomy/hitl-rules/${rule.id}`, { ...rule, enabled: !rule.enabled });
      if (res.success) setHitlRules(prev => prev.map(r => r.id === rule.id ? { ...r, enabled: !r.enabled } : r));
    } catch { flash("error", "Failed to update rule."); }
    finally { setActionId(null); }
  };

  const handleCreateHITL = async () => {
    if (!hitlForm.trigger || !hitlForm.action) return flash("error", "Trigger and action required.");
    setActionId("hitl");
    try {
      const res = await api.post("/api/v1/autonomy/hitl-rules", { ...hitlForm, enabled: true });
      if (res.success) {
        setHitlRules(prev => [...prev, res.data]);
        setHitlForm({ trigger: "", action: "", route_to_role: "VALIDATOR" });
        setShowHITLForm(false);
        flash("success", "HITL rule created.");
      }
    } catch { flash("error", "Failed to create rule."); }
    finally { setActionId(null); }
  };

  const handleDeleteHITL = async (id: string) => {
    setActionId(id);
    try {
      const res = await api.delete(`/api/v1/autonomy/hitl-rules/${id}`);
      if (res.success) setHitlRules(prev => prev.filter(r => r.id !== id));
    } catch { flash("error", "Failed to delete rule."); }
    finally { setActionId(null); }
  };

  const handleCreateNKS = async () => {
    if (!nksForm.name || !nksForm.terms) return flash("error", "Name and terms required.");
    setActionId("nks");
    try {
      const terms = nksForm.terms.split(",").map(t => t.trim()).filter(Boolean);
      const res = await api.post("/api/v1/autonomy/negative-knowledge", { ...nksForm, prohibited_terms: terms });
      if (res.success) {
        setNksList(prev => [...prev, res.data]);
        setNksForm({ name: "", terms: "", scope: "All", severity: "BLOCK", owner_role: "GOVERNANCE_ADMIN" });
        setShowNKSForm(false);
        flash("success", "Negative Knowledge Set created.");
      }
    } catch { flash("error", "Failed to create set."); }
    finally { setActionId(null); }
  };

  const handleDeleteNKS = async (id: string) => {
    setActionId(id);
    try {
      const res = await api.delete(`/api/v1/autonomy/negative-knowledge/${id}`);
      if (res.success) setNksList(prev => prev.filter(n => n.id !== id));
    } catch { flash("error", "Failed to delete."); }
    finally { setActionId(null); }
  };

  return (
    <div className="max-w-6xl mx-auto pb-16 px-4 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-1">Autonomy Control Center</h1>
          <p className="text-[#888] text-sm">Govern, limit, monitor, and revoke agent autonomy across the workspace.</p>
        </div>
        <button onClick={fetchAll} className="p-2.5 bg-[var(--card)] border border-[var(--border)] rounded-xl text-[#888] hover:text-white transition-all group">
          <RefreshCcw className={`w-4 h-4 ${loading ? "animate-spin text-info-text" : "group-hover:rotate-180 transition-transform duration-500"}`} />
        </button>
      </div>

      {/* Toast */}
      {message && (
        <div className={`p-3.5 rounded-xl flex items-center gap-3 text-sm font-medium ${message.type === "success" ? "bg-success-bg border border-success-border text-success-text" : "bg-error-bg border border-error-border text-error-text"}`}>
          <AlertCircle className="w-4 h-4 shrink-0" />
          {message.text}
        </div>
      )}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Total Agents",  val: stats.total,      color: "text-foreground" },
            { label: "Active",        val: stats.active,     color: "text-success-text" },
            { label: "Suspended",     val: stats.suspended,  color: "text-error-text" },
            { label: "Avg Trust",     val: `${stats.avg_trust}%`, color: stats.avg_trust >= 80 ? "text-success-text" : stats.avg_trust >= 60 ? "text-warning-text" : "text-error-text" },
          ].map(s => (
            <div key={s.label} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3">
              <p className={`text-xl font-bold ${s.color}`}>{s.val}</p>
              <p className="text-[11px] text-[#666] font-medium">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Level Reference */}
      <div className="grid grid-cols-7 gap-1.5">
        {(Object.entries(LEVEL_CONFIG) as [Level, typeof LEVEL_CONFIG[Level]][]).map(([lvl, cfg]) => (
          <div key={lvl} className={`${cfg.bg} border ${cfg.border} rounded-xl p-2.5 text-center`}>
            <p className={`text-xs font-bold ${cfg.color}`}>{lvl}</p>
            <p className="text-[9px] text-[#666] mt-0.5">{cfg.name}</p>
            {cfg.minTrust > 0 && <p className="text-[8px] text-[#555] mt-0.5">≥{cfg.minTrust}% trust</p>}
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-[var(--border)]">
        {[
          { key: "agents", label: "Agents", count: agents.length },
          { key: "locks",  label: "Emergency Locks", count: locks.length, urgent: locks.length > 0 },
          { key: "hitl",   label: "HITL Rules", count: hitlRules.length },
          { key: "nks",    label: "Negative Knowledge", count: nksList.length },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as typeof tab)}
            className={`px-4 py-2.5 text-sm font-semibold transition-all border-b-2 flex items-center gap-2 ${
              tab === t.key ? "border-info-border text-foreground" : "border-transparent text-[#666] hover:text-[#aaa]"
            }`}
          >
            {t.label}
            {t.count > 0 && (
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${t.urgent ? "bg-error-text/20 text-error-text" : "bg-white/5 text-[#888]"}`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Tab: Agents ── */}
      {tab === "agents" && (
        <div>
          {loading ? (
            <div className="flex items-center justify-center py-16 text-[#666]">
              <Loader2 className="w-6 h-6 animate-spin text-info-text mr-3" />Loading agents…
            </div>
          ) : agents.length === 0 ? (
            <div className="text-center py-16">
              <Bot className="w-12 h-12 text-[#333] mx-auto mb-3" />
              <p className="text-[#555] text-sm">No agents registered in this workspace.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {agents.map(agent => {
                const trustPct = Math.round((agent.trust_score || 0) * 100);
                const faithPct = Math.round((agent.faithfulness_score || 0) * 100);
                const statusCfg = STATUS_CONFIG[agent.status] ?? STATUS_CONFIG.DRAFT;
                const isExpanded = expandedId === agent.id;

                return (
                  <div key={agent.id} className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden">
                    <div className="p-4 flex items-center gap-4">
                      {/* Avatar */}
                      <div className="w-9 h-9 bg-info-bg border border-info-border rounded-xl flex items-center justify-center shrink-0">
                        <Bot className="w-5 h-5 text-info-text" />
                      </div>

                      {/* Name + type */}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-foreground truncate">{agent.name}</p>
                        <p className="text-[10px] text-[#555] uppercase font-bold tracking-wider">{agent.type}</p>
                      </div>

                      {/* Status */}
                      <span className={`hidden md:inline-flex text-[10px] font-bold px-2 py-1 rounded-lg border ${statusCfg.bg} ${statusCfg.color}`}>
                        {agent.status}
                      </span>

                      {/* Trust score */}
                      <div className="hidden md:flex flex-col w-24 shrink-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] text-[#555]">Trust</span>
                          <span className={`text-[10px] font-bold ${trustPct >= 80 ? "text-success-text" : trustPct >= 60 ? "text-warning-text" : "text-error-text"}`}>{trustPct}%</span>
                        </div>
                        <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${trustColor(trustPct)}`} style={{ width: `${trustPct}%` }} />
                        </div>
                      </div>

                      {/* Current level badge */}
                      {(() => {
                        const lvlCfg = LEVEL_CONFIG[agent.autonomy_level] ?? LEVEL_CONFIG.L0;
                        return (
                          <span className={`hidden md:inline-flex text-[10px] font-bold px-2 py-1 rounded-lg border ${lvlCfg.bg} ${lvlCfg.color} ${lvlCfg.border} shrink-0`}>
                            {agent.autonomy_level} · {lvlCfg.name}
                          </span>
                        );
                      })()}

                      {/* Expand */}
                      <button onClick={() => setExpandedId(isExpanded ? null : agent.id)} className="p-1.5 text-[#555] hover:text-[#aaa] transition-colors">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>

                    {isExpanded && (
                      <div className="px-4 pb-4 border-t border-[var(--border)]/50 pt-4 space-y-4">
                        {/* Trust score detail */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-white/3 border border-[var(--border)]/50 rounded-xl p-3">
                            <p className="text-[10px] text-[#555] mb-1">Trust Score</p>
                            <p className={`text-lg font-bold ${trustPct >= 80 ? "text-success-text" : trustPct >= 60 ? "text-warning-text" : "text-error-text"}`}>{trustPct}%</p>
                            <p className="text-[10px] text-[#555]">{trustLabel(trustPct)}</p>
                          </div>
                          <div className="bg-white/3 border border-[var(--border)]/50 rounded-xl p-3">
                            <p className="text-[10px] text-[#555] mb-1">Faithfulness Score</p>
                            <p className={`text-lg font-bold ${faithPct >= 85 ? "text-success-text" : faithPct >= 70 ? "text-warning-text" : "text-error-text"}`}>{faithPct}%</p>
                            <p className="text-[10px] text-[#555]">{faithPct >= 92 ? "Eligible for L5/L6" : faithPct >= 85 ? "Requires validation" : "Block from publishing"}</p>
                          </div>
                        </div>

                        {/* Level selector */}
                        <div>
                          <p className="text-[10px] text-[#555] font-bold uppercase tracking-wider mb-2">Autonomy Level</p>
                          <div className="flex flex-wrap gap-1.5">
                            {(Object.entries(LEVEL_CONFIG) as [Level, typeof LEVEL_CONFIG[Level]][]).map(([lvl, cfg]) => {
                              const isActive = agent.autonomy_level === lvl;
                              const isBlocked = trustPct < cfg.minTrust;
                              return (
                                <button
                                  key={lvl}
                                  disabled={isBlocked || !!actionId}
                                  onClick={() => !isBlocked && handleLevelChange(agent.id, lvl)}
                                  title={isBlocked ? `Requires trust score ≥${cfg.minTrust}%` : cfg.name}
                                  className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all ${
                                    isActive ? `${cfg.bg} ${cfg.color} ${cfg.border} ring-1 ring-current` :
                                    isBlocked ? "bg-white/3 text-[#444] border-[#333] cursor-not-allowed opacity-50" :
                                    "bg-white/3 text-[#888] border-[var(--border)] hover:border-[var(--card-border)]"
                                  }`}
                                >
                                  {actionId === agent.id + lvl ? <Loader2 className="w-3 h-3 animate-spin" /> : `${lvl}`}
                                </button>
                              );
                            })}
                          </div>
                          <input
                            placeholder="Reason for change (required for audit)"
                            value={levelReason[agent.id] || ""}
                            onChange={e => setLevelReason(prev => ({ ...prev, [agent.id]: e.target.value }))}
                            className="mt-2 w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs text-foreground placeholder-[#444] outline-none focus:border-info-border"
                          />
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end gap-2">
                          {agent.status !== "SUSPENDED" && (
                            <button
                              onClick={() => handleSuspend(agent.id, agent.name)}
                              disabled={!!actionId}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-error-bg hover:bg-error-text text-error-text hover:text-white border border-error-border rounded-xl text-[11px] font-bold transition-all disabled:opacity-50"
                            >
                              {actionId === agent.id + "suspend" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
                              Suspend Agent
                            </button>
                          )}
                          {agent.status === "SUSPENDED" && (
                            <button
                              onClick={() => handleLevelChange(agent.id, "L1")}
                              disabled={!!actionId}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-success-bg hover:bg-success-text text-success-text hover:text-white border border-success-border rounded-xl text-[11px] font-bold transition-all disabled:opacity-50"
                            >
                              <Unlock className="w-3.5 h-3.5" />
                              Restore to L1
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Emergency Locks ── */}
      {tab === "locks" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-[#888]">Emergency locks immediately stop autonomous agent activity at the selected scope.</p>
            <button onClick={() => setShowLockForm(!showLockForm)} className="flex items-center gap-1.5 px-3 py-1.5 bg-error-bg hover:bg-error-text text-error-text hover:text-white border border-error-border rounded-xl text-xs font-bold transition-all">
              <ShieldAlert className="w-3.5 h-3.5" />
              Apply Emergency Lock
            </button>
          </div>

          {showLockForm && (
            <div className="bg-[var(--card)] border border-error-border rounded-2xl p-5 space-y-3">
              <p className="text-sm font-bold text-error-text flex items-center gap-2"><ShieldAlert className="w-4 h-4" />Apply Emergency Lock</p>
              <div className="grid grid-cols-4 gap-2">
                {["L1","L2","L3","L4"].map(lv => {
                  const cfg = LOCK_LEVEL_CONFIG[lv];
                  return (
                    <button key={lv} onClick={() => setLockForm(f => ({...f, level:lv}))}
                      className={`py-2 rounded-xl text-[11px] font-bold border transition-all ${lockForm.level === lv ? cfg.color : "bg-white/3 text-[#666] border-[var(--border)]"}`}>
                      {lv}<br/><span className="text-[9px] opacity-70">{cfg.label.replace(" Lock","")}</span>
                    </button>
                  );
                })}
              </div>
              <input placeholder="Scope (e.g. Workspace, Campaign Name, Agent ID)" value={lockForm.scope} onChange={e => setLockForm(f => ({...f,scope:e.target.value}))}
                className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm text-foreground placeholder-[#444] outline-none focus:border-error-border" />
              <textarea rows={3} placeholder="Reason for emergency lock (required for audit record)…" value={lockForm.reason} onChange={e => setLockForm(f => ({...f,reason:e.target.value}))}
                className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm text-foreground placeholder-[#444] outline-none focus:border-error-border resize-none" />
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowLockForm(false)} className="px-3 py-1.5 text-[#666] hover:text-white text-xs font-bold transition-all"><X className="w-4 h-4" /></button>
                <button onClick={handleCreateLock} disabled={actionId === "lock" || !canManageAutonomy} className="flex items-center gap-1.5 px-4 py-1.5 bg-error-text hover:brightness-110 text-foreground rounded-xl text-xs font-bold transition-all disabled:opacity-50">
                  {actionId === "lock" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
                  Apply Lock
                </button>
              </div>
            </div>
          )}

          {locks.length === 0 ? (
            <div className="text-center py-12 bg-[var(--card)] border border-[var(--border)] rounded-2xl">
              <ShieldCheck className="w-10 h-10 text-success-text/30 mx-auto mb-3" />
              <p className="text-success-text font-semibold text-sm">No active emergency locks</p>
              <p className="text-[#555] text-xs mt-1">The workspace is operating normally.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {locks.map(lock => {
                const lcfg = LOCK_LEVEL_CONFIG[lock.level] ?? LOCK_LEVEL_CONFIG.L1;
                return (
                  <div key={lock.id} className="bg-[var(--card)] border border-error-border rounded-2xl p-4 flex items-start gap-4">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-lg border ${lcfg.color} shrink-0`}>{lcfg.label}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">{lock.scope}</p>
                      <p className="text-xs text-[#888] mt-0.5">{lock.reason}</p>
                      <p className="text-[10px] text-[#555] mt-1">{new Date(lock.created_at).toLocaleString()}</p>
                    </div>
                    <button onClick={() => handleLiftLock(lock.id)} disabled={actionId === lock.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-success-text/20 text-[#888] hover:text-success-text border border-[var(--border)] rounded-xl text-[11px] font-bold transition-all shrink-0">
                      {actionId === lock.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Unlock className="w-3.5 h-3.5" />}
                      Lift
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: HITL Rules ── */}
      {tab === "hitl" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-[#888]">Define when content or agent actions must be routed to a human reviewer.</p>
            <button onClick={() => setShowHITLForm(!showHITLForm)} className="flex items-center gap-1.5 px-3 py-1.5 bg-info-bg hover:bg-info-text/20 text-info-text border border-info-border rounded-xl text-xs font-bold transition-all">
              <Plus className="w-3.5 h-3.5" />Add Rule
            </button>
          </div>

          {showHITLForm && (
            <div className="bg-[var(--card)] border border-info-border rounded-2xl p-5 space-y-3">
              <p className="text-sm font-bold text-info-text">New HITL Rule</p>
              <div className="grid grid-cols-3 gap-3">
                <input placeholder="Trigger (e.g. RISK_HIGH)" value={hitlForm.trigger} onChange={e => setHitlForm(f => ({...f,trigger:e.target.value}))}
                  className="bg-[var(--surface)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm text-foreground placeholder-[#444] outline-none focus:border-info-border" />
                <input placeholder="Action (e.g. ROUTE_TO_REVIEW)" value={hitlForm.action} onChange={e => setHitlForm(f => ({...f,action:e.target.value}))}
                  className="bg-[var(--surface)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm text-foreground placeholder-[#444] outline-none focus:border-info-border" />
                <input placeholder="Route to Role (e.g. VALIDATOR)" value={hitlForm.route_to_role} onChange={e => setHitlForm(f => ({...f,route_to_role:e.target.value}))}
                  className="bg-[var(--surface)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm text-foreground placeholder-[#444] outline-none focus:border-info-border" />
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowHITLForm(false)} className="p-1.5 text-[#666] hover:text-white transition-all"><X className="w-4 h-4" /></button>
                <button onClick={handleCreateHITL} disabled={actionId === "hitl" || !canManageAutonomy} className="flex items-center gap-1.5 px-4 py-1.5 bg-info-text hover:brightness-110 text-foreground rounded-xl text-xs font-bold transition-all disabled:opacity-50">
                  {actionId === "hitl" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  Create
                </button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {hitlRules.map(rule => (
              <div key={rule.id} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold text-info-text bg-info-bg border border-info-border px-2 py-0.5 rounded">{rule.trigger}</span>
                    <span className="text-[#444]">→</span>
                    <span className="text-[10px] font-bold text-warning-text bg-warning-bg border border-warning-border px-2 py-0.5 rounded">{rule.action}</span>
                  </div>
                  <p className="text-[11px] text-[#666]">Route to: <span className="text-[#aaa]">{rule.route_to_role}</span></p>
                </div>
                <button onClick={() => handleToggleHITL(rule)} disabled={actionId === rule.id || !canManageAutonomy}
                  className={`w-10 h-6 rounded-full relative transition-all shrink-0 ${rule.enabled ? "bg-info-text" : "bg-white/10"}`}>
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${rule.enabled ? "left-5" : "left-1"}`} />
                </button>
                <button onClick={() => handleDeleteHITL(rule.id)} disabled={actionId === rule.id || !canManageAutonomy} className="p-1.5 text-[#444] hover:text-error-text transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Tab: Negative Knowledge ── */}
      {tab === "nks" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-[#888]">Define prohibited terms, claims, and semantic guardrails agents must never output.</p>
            <button onClick={() => setShowNKSForm(!showNKSForm)} className="flex items-center gap-1.5 px-3 py-1.5 bg-info-bg hover:bg-info-text/20 text-info-text border border-info-border rounded-xl text-xs font-bold transition-all">
              <Plus className="w-3.5 h-3.5" />Add Set
            </button>
          </div>

          {showNKSForm && (
            <div className="bg-[var(--card)] border border-info-border rounded-2xl p-5 space-y-3">
              <p className="text-sm font-bold text-info-text">New Negative Knowledge Set</p>
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="Set Name" value={nksForm.name} onChange={e => setNksForm(f => ({...f,name:e.target.value}))}
                  className="bg-[var(--surface)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm text-foreground placeholder-[#444] outline-none focus:border-info-border" />
                <input placeholder="Scope (e.g. Healthcare Division, USA)" value={nksForm.scope} onChange={e => setNksForm(f => ({...f,scope:e.target.value}))}
                  className="bg-[var(--surface)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm text-foreground placeholder-[#444] outline-none focus:border-info-border" />
              </div>
              <textarea rows={2} placeholder="Prohibited terms (comma-separated): cure, guaranteed, FDA-approved, …" value={nksForm.terms} onChange={e => setNksForm(f => ({...f,terms:e.target.value}))}
                className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm text-foreground placeholder-[#444] outline-none focus:border-info-border resize-none" />
              <div className="grid grid-cols-2 gap-3">
                <select value={nksForm.severity} onChange={e => setNksForm(f => ({...f,severity:e.target.value}))}
                  className="bg-[var(--surface)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm text-foreground outline-none focus:border-info-border">
                  {["BLOCK","ESCALATE","WARN","REQUIRE_APPROVAL"].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <input placeholder="Owner Role" value={nksForm.owner_role} onChange={e => setNksForm(f => ({...f,owner_role:e.target.value}))}
                  className="bg-[var(--surface)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm text-foreground placeholder-[#444] outline-none focus:border-info-border" />
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowNKSForm(false)} className="p-1.5 text-[#666] hover:text-white"><X className="w-4 h-4" /></button>
                <button onClick={handleCreateNKS} disabled={actionId === "nks" || !canManageAutonomy} className="flex items-center gap-1.5 px-4 py-1.5 bg-info-text hover:brightness-110 text-foreground rounded-xl text-xs font-bold transition-all disabled:opacity-50">
                  {actionId === "nks" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  Create Set
                </button>
              </div>
            </div>
          )}

          {nksList.length === 0 ? (
            <div className="text-center py-12 bg-[var(--card)] border border-[var(--border)] rounded-2xl">
              <ShieldAlert className="w-10 h-10 text-[#333] mx-auto mb-3" />
              <p className="text-[#555] text-sm">No negative knowledge sets configured.</p>
              <p className="text-[#444] text-xs mt-1">Add prohibited terms and guardrails for your agents.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {nksList.map(nks => (
                <div key={nks.id} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <p className="text-sm font-semibold text-foreground">{nks.name}</p>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${SEVERITY_COLORS[nks.severity] ?? "bg-white/5 text-[#888] border-white/10"}`}>{nks.severity}</span>
                    </div>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {nks.prohibited_terms.slice(0, 8).map(t => (
                        <span key={t} className="text-[10px] text-[#888] bg-white/5 border border-white/10 px-1.5 py-0.5 rounded">{t}</span>
                      ))}
                      {nks.prohibited_terms.length > 8 && (
                        <span className="text-[10px] text-[#555]">+{nks.prohibited_terms.length - 8} more</span>
                      )}
                    </div>
                    <p className="text-[10px] text-[#555]">Scope: {nks.scope} · Owner: {nks.owner_role}</p>
                  </div>
                  <button onClick={() => handleDeleteNKS(nks.id)} disabled={actionId === nks.id || !canManageAutonomy} className="p-1.5 text-[#444] hover:text-error-text transition-colors shrink-0">
                    {actionId === nks.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
