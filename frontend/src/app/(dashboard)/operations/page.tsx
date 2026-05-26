"use client";

import { useState, useEffect } from "react";
import {
  Activity, Cpu, MemoryStick, RefreshCcw,
  CheckCircle2, AlertCircle, XCircle, Clock,
  Users, ShieldOff, ListFilter,
} from "lucide-react";
import { api } from "@/lib/api";

interface Telemetry {
  agents: { active: number; total: number };
  system: { cpu_load: string; memory_usage: string; os_platform: string };
  uptime: string;
  latency: string;
  integrity: string;
}

interface OpsStats {
  active_runs: number;
  queue_depth: number;
  total_runs: number;
  failed_runs: number;
  failure_rate: number;
  policy_blocked_runs: number;
  policy_block_rate: number;
  pending_queues: number;
}

interface LogEntry {
  id?: string;
  created_at: string;
  level: string;
  service?: string;
  message: string;
}

function levelBadge(level: string) {
  switch (level?.toLowerCase()) {
    case "error":
      return "bg-rose-500/10 text-rose-400 border-rose-500/20";
    case "warn":
    case "warning":
      return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    default:
      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
  }
}

function levelIcon(level: string) {
  switch (level?.toLowerCase()) {
    case "error": return <XCircle className="w-3.5 h-3.5" />;
    case "warn":
    case "warning": return <AlertCircle className="w-3.5 h-3.5" />;
    default: return <CheckCircle2 className="w-3.5 h-3.5" />;
  }
}

export default function OperationsPage() {
  const [telemetry, setTelemetry] = useState<Telemetry | null>(null);
  const [ops, setOps] = useState<OpsStats | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchAll = async () => {
    try {
      const [telRes, logRes, opsRes] = await Promise.allSettled([
        api.get("/api/v1/operations/telemetry"),
        api.get("/api/v1/operations/logs"),
        api.get("/api/v1/operations/stats"),
      ]);
      if (telRes.status === "fulfilled" && telRes.value.success) setTelemetry(telRes.value.data);
      if (logRes.status === "fulfilled" && logRes.value.success) setLogs(logRes.value.data);
      if (opsRes.status === "fulfilled" && opsRes.value.success) setOps(opsRes.value.data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Operations fetch failed", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 10000);
    return () => clearInterval(interval);
  }, []);

  const cpuPct = parseInt(telemetry?.system?.cpu_load ?? "0");
  const memPct = parseInt(telemetry?.system?.memory_usage ?? "0");
  const agentActivePct =
    telemetry?.agents?.total
      ? Math.round((telemetry.agents.active / telemetry.agents.total) * 100)
      : 0;

  const statCards = [
    {
      label: "Active Runs",
      value: ops?.active_runs ?? "—",
      icon: Activity,
      iconBg: "bg-emerald-500/10",
      iconColor: "text-emerald-400",
      sub: ops ? `${ops.queue_depth} queued` : null,
    },
    {
      label: "Total Runs",
      value: ops?.total_runs ?? "—",
      icon: ListFilter,
      iconBg: "bg-indigo-500/10",
      iconColor: "text-indigo-400",
      sub: null,
    },
    {
      label: "Failed Runs",
      value: ops?.failed_runs ?? "—",
      icon: XCircle,
      iconBg: "bg-rose-500/10",
      iconColor: "text-rose-400",
      sub: ops ? `${ops.failure_rate.toFixed(1)}% rate` : null,
    },
    {
      label: "Policy Blocked",
      value: ops?.policy_blocked_runs ?? "—",
      icon: ShieldOff,
      iconBg: "bg-amber-500/10",
      iconColor: "text-amber-400",
      sub: ops ? `${ops.policy_block_rate.toFixed(1)}% rate` : null,
    },
    {
      label: "Active Agents",
      value: telemetry ? `${telemetry.agents.active} / ${telemetry.agents.total}` : "—",
      icon: Users,
      iconBg: "bg-blue-500/10",
      iconColor: "text-blue-400",
      sub: telemetry ? `${agentActivePct}% active` : null,
    },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)]">
            Operations Feed
          </h1>
          <p className="text-sm text-[var(--foreground-muted)] mt-1">
            Live agent runs, system health, and log stream — auto-refreshes every 10s.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-[var(--foreground-muted)] flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={fetchAll}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium bg-[var(--card)] border border-[var(--border)] rounded-lg hover:bg-[var(--surface)] transition-colors"
          >
            <RefreshCcw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 shadow-sm hover:shadow-md transition-all group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`p-2 ${card.iconBg} rounded-lg`}>
                  <Icon className={`w-4 h-4 ${card.iconColor}`} />
                </div>
                {card.sub && (
                  <span className="text-[10px] text-[var(--foreground-muted)] bg-[var(--surface)] px-1.5 py-0.5 rounded-full">
                    {card.sub}
                  </span>
                )}
              </div>
              <p className="text-xs text-[var(--foreground-muted)] mb-1">{card.label}</p>
              <p className="text-xl font-bold text-[var(--foreground)] tabular-nums">
                {loading ? <span className="animate-pulse">—</span> : card.value}
              </p>
            </div>
          );
        })}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: System Health + Logs */}
        <div className="lg:col-span-2 space-y-6">
          {/* System Health */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-indigo-400" />
                <h2 className="text-base font-semibold text-[var(--foreground)]">System Health</h2>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-emerald-500">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
                {telemetry?.integrity ?? "Checking..."}
              </div>
            </div>

            <div className="space-y-4">
              {[
                {
                  label: "CPU Load",
                  value: telemetry?.system?.cpu_load ?? "—",
                  pct: cpuPct,
                  color: cpuPct > 80 ? "bg-rose-500" : cpuPct > 60 ? "bg-amber-500" : "bg-emerald-500",
                  icon: <Cpu className="w-3.5 h-3.5 text-[var(--foreground-muted)]" />,
                },
                {
                  label: "Memory Usage",
                  value: telemetry?.system?.memory_usage ?? "—",
                  pct: memPct,
                  color: memPct > 80 ? "bg-rose-500" : memPct > 60 ? "bg-amber-500" : "bg-indigo-500",
                  icon: <MemoryStick className="w-3.5 h-3.5 text-[var(--foreground-muted)]" />,
                },
                {
                  label: "Active Agents",
                  value: telemetry ? `${telemetry.agents.active} / ${telemetry.agents.total}` : "—",
                  pct: agentActivePct,
                  color: "bg-blue-500",
                  icon: <Users className="w-3.5 h-3.5 text-[var(--foreground-muted)]" />,
                },
              ].map((m) => (
                <div key={m.label}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5 text-sm text-[var(--foreground-muted)]">
                      {m.icon}
                      {m.label}
                    </div>
                    <span className="text-sm font-semibold text-[var(--foreground)] tabular-nums">
                      {loading ? "—" : m.value}
                    </span>
                  </div>
                  <div className="h-2 bg-[var(--surface)] rounded-full overflow-hidden">
                    <div
                      className={`h-full ${m.color} rounded-full transition-all duration-700`}
                      style={{ width: loading ? "0%" : `${Math.min(m.pct, 100)}%` }}
                    />
                  </div>
                </div>
              ))}

              {telemetry?.system?.os_platform && (
                <p className="text-xs text-[var(--foreground-muted)] pt-1">
                  Platform: <span className="font-medium text-[var(--foreground)]">{telemetry.system.os_platform}</span>
                </p>
              )}
            </div>
          </div>

          {/* Ops Rate Metrics */}
          {ops && (
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 shadow-sm">
              <h2 className="text-base font-semibold text-[var(--foreground)] mb-4">Run Rate Breakdown</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex justify-between mb-1.5">
                    <span className="text-sm text-[var(--foreground-muted)]">Failure Rate</span>
                    <span className="text-sm font-semibold text-rose-400 tabular-nums">{ops.failure_rate.toFixed(1)}%</span>
                  </div>
                  <div className="h-2 bg-[var(--surface)] rounded-full overflow-hidden">
                    <div className="h-full bg-rose-500 rounded-full" style={{ width: `${Math.min(ops.failure_rate, 100)}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-1.5">
                    <span className="text-sm text-[var(--foreground-muted)]">Policy Block Rate</span>
                    <span className="text-sm font-semibold text-amber-400 tabular-nums">{ops.policy_block_rate.toFixed(1)}%</span>
                  </div>
                  <div className="h-2 bg-[var(--surface)] rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full" style={{ width: `${Math.min(ops.policy_block_rate, 100)}%` }} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Live System Logs */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-400" />
                <h2 className="text-base font-semibold text-[var(--foreground)]">System Logs</h2>
              </div>
              <span className="text-xs text-[var(--foreground-muted)]">
                {logs.length} {logs.length === 1 ? "entry" : "entries"}
              </span>
            </div>

            <div className="overflow-y-auto max-h-80">
              {loading ? (
                <div className="p-6 space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="animate-pulse flex gap-3">
                      <div className="w-16 h-4 bg-[var(--border)] rounded" />
                      <div className="w-12 h-4 bg-[var(--border)] rounded" />
                      <div className="flex-1 h-4 bg-[var(--border)] rounded" />
                    </div>
                  ))}
                </div>
              ) : logs.length === 0 ? (
                <div className="py-12 text-center text-sm text-[var(--foreground-muted)] italic">
                  No log entries yet.
                </div>
              ) : (
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-[var(--border)]">
                    {logs.map((log, i) => (
                      <tr key={log.id ?? i} className="hover:bg-[var(--surface)] transition-colors">
                        <td className="px-4 py-3 text-xs text-[var(--foreground-muted)] whitespace-nowrap tabular-nums w-24">
                          {new Date(log.created_at).toLocaleTimeString()}
                        </td>
                        <td className="px-2 py-3 w-20">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded border ${levelBadge(log.level)}`}>
                            {levelIcon(log.level)}
                            {log.level?.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-2 py-3 text-xs font-medium text-[var(--foreground-muted)] w-24 truncate">
                          {log.service ?? "System"}
                        </td>
                        <td className="px-2 py-3 text-xs text-[var(--foreground)] pr-4">
                          {log.message}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Right: Agent + Queue Status */}
        <div className="space-y-6">
          {/* Agent Status */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-5">
              <Users className="w-4 h-4 text-blue-400" />
              <h2 className="text-base font-semibold text-[var(--foreground)]">Agent Status</h2>
            </div>
            {loading ? (
              <div className="space-y-3 animate-pulse">
                <div className="h-10 bg-[var(--border)] rounded-lg" />
                <div className="h-2 bg-[var(--border)] rounded-full" />
              </div>
            ) : telemetry ? (
              <>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-3xl font-bold text-[var(--foreground)] tabular-nums">
                    {telemetry.agents.active}
                  </span>
                  <span className="text-sm text-[var(--foreground-muted)]">
                    / {telemetry.agents.total} total
                  </span>
                </div>
                <p className="text-xs text-[var(--foreground-muted)] mb-3">agents currently active</p>
                <div className="h-2 bg-[var(--surface)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all duration-700"
                    style={{ width: `${agentActivePct}%` }}
                  />
                </div>
                <p className="text-xs text-[var(--foreground-muted)] mt-1.5 text-right tabular-nums">
                  {agentActivePct}% utilisation
                </p>
              </>
            ) : (
              <p className="text-sm text-[var(--foreground-muted)] italic">Unavailable</p>
            )}
          </div>

          {/* Queue Summary */}
          {ops && (
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 shadow-sm">
              <h2 className="text-base font-semibold text-[var(--foreground)] mb-4">Queue Summary</h2>
              <div className="space-y-3">
                {[
                  { label: "Active Runs", value: ops.active_runs, color: "text-emerald-400" },
                  { label: "Queue Depth", value: ops.queue_depth, color: "text-indigo-400" },
                  { label: "Pending Queues", value: ops.pending_queues, color: "text-blue-400" },
                  { label: "Failed", value: ops.failed_runs, color: "text-rose-400" },
                  { label: "Policy Blocked", value: ops.policy_blocked_runs, color: "text-amber-400" },
                ].map((item) => (
                  <div key={item.label} className="flex justify-between items-center py-2 border-b border-[var(--border)]/50 last:border-0">
                    <span className="text-sm text-[var(--foreground-muted)]">{item.label}</span>
                    <span className={`text-sm font-bold tabular-nums ${item.color}`}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* System Info */}
          {telemetry && (
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 shadow-sm">
              <h2 className="text-base font-semibold text-[var(--foreground)] mb-4">System Info</h2>
              <div className="space-y-2.5 text-sm">
                {[
                  { label: "Platform", value: telemetry.system.os_platform },
                  { label: "Uptime", value: telemetry.uptime },
                  { label: "Latency", value: telemetry.latency },
                  { label: "Integrity", value: telemetry.integrity },
                ].map((item) => (
                  <div key={item.label} className="flex justify-between">
                    <span className="text-[var(--foreground-muted)]">{item.label}</span>
                    <span className="font-medium text-[var(--foreground)]">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
