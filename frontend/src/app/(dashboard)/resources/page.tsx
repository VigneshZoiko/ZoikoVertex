"use client";

import { useState, useEffect } from "react";
import {
  Zap, Globe, Database, DollarSign,
  RefreshCw, Clock, AlertTriangle, Cpu,
} from "lucide-react";
import { api } from "@/lib/api";

interface UsageLog {
  id: string;
  resource_type: string;
  resource_name: string;
  quantity: number;
  unit: string;
  cost_usd: number;
  timestamp: string;
}

interface SummaryItem {
  quantity: number;
  cost: number;
  unit: string;
}

const RESOURCE_META: Record<string, { label: string; icon: React.ElementType; color: string; iconBg: string }> = {
  AI_TOKENS: { label: "AI Tokens", icon: Zap, color: "text-amber-500", iconBg: "bg-amber-500/10" },
  SOCIAL_API_CALLS: { label: "Social API Calls", icon: Globe, color: "text-indigo-500", iconBg: "bg-indigo-500/10" },
  STORAGE_MB: { label: "Storage", icon: Database, color: "text-emerald-500", iconBg: "bg-emerald-500/10" },
};

function getResourceMeta(type: string) {
  return RESOURCE_META[type] ?? { label: type, icon: Cpu, color: "text-zinc-400", iconBg: "bg-zinc-500/10" };
}

function Skeleton({ className }: { className: string }) {
  return <div className={`animate-pulse bg-[var(--border)] rounded ${className}`} />;
}

export default function ResourceMonitoringPage() {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<UsageLog[]>([]);
  const [summary, setSummary] = useState<Record<string, SummaryItem>>({});

  const fetchData = async () => {
    setLoading(true);
    try {
      const ctx = await api.get("/api/v1/user/context");
      if (ctx.success && ctx.data.workspace_id) {
        const result = await api.get(`/api/v1/monitoring/usage?workspaceId=${ctx.data.workspace_id}`);
        if (result.success) {
          setLogs(result.data.recent_logs ?? []);
          setSummary(result.data.summary ?? {});
        }
      }
    } catch (err) {
      console.error("Failed to fetch monitoring data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const totalCost = Object.values(summary).reduce((acc, s) => acc + s.cost, 0);
  const totalCostMonthly = totalCost * 30;

  const summaryTypes = Object.keys(RESOURCE_META);
  const unknownTypes = Object.keys(summary).filter((k) => !RESOURCE_META[k]);
  const allTypes = [...summaryTypes, ...unknownTypes];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)]">
            Resource Monitoring
          </h1>
          <p className="text-sm text-[var(--foreground-muted)] mt-1">
            Token consumption, API usage, storage, and infrastructure cost.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-right">
            <p className="text-[10px] text-[var(--foreground-muted)] uppercase tracking-wide">Est. Monthly Burn</p>
            <p className="text-lg font-bold text-[var(--foreground)] tabular-nums">
              {loading ? "—" : `$${totalCostMonthly.toFixed(2)}`}
            </p>
          </div>
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium bg-[var(--card)] border border-[var(--border)] rounded-lg hover:bg-[var(--surface)] transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Resource Type Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {summaryTypes.map((type) => {
          const meta = getResourceMeta(type);
          const Icon = meta.icon;
          const data = summary[type];
          const costShare = totalCost > 0 && data ? (data.cost / totalCost) * 100 : 0;

          return (
            <div
              key={type}
              className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 shadow-sm hover:shadow-md transition-all"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-2.5 ${meta.iconBg} rounded-xl`}>
                  <Icon className={`w-5 h-5 ${meta.color}`} />
                </div>
                <span className="text-xs text-[var(--foreground-muted)] bg-[var(--surface)] px-2 py-1 rounded-full">
                  {loading ? "—" : data ? `$${data.cost.toFixed(4)}` : "$0.0000"}
                </span>
              </div>

              <p className="text-sm text-[var(--foreground-muted)] mb-1">{meta.label}</p>
              <p className="text-2xl font-bold text-[var(--foreground)] tabular-nums mb-1">
                {loading ? <Skeleton className="h-7 w-24" /> : data ? data.quantity.toLocaleString() : "0"}
              </p>
              <p className="text-xs text-[var(--foreground-muted)] mb-4">
                {data?.unit ?? "units"}
              </p>

              <div className="space-y-1">
                <div className="flex justify-between text-xs text-[var(--foreground-muted)]">
                  <span>Cost share</span>
                  <span className="tabular-nums">{loading ? "—" : `${costShare.toFixed(1)}%`}</span>
                </div>
                <div className="h-1.5 bg-[var(--surface)] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${meta.color.replace("text-", "bg-")}`}
                    style={{ width: loading ? "0%" : `${Math.min(costShare, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Consumption Feed */}
        <div className="lg:col-span-2 bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-sm overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-400" />
              <h2 className="text-base font-semibold text-[var(--foreground)]">Live Consumption Feed</h2>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-[var(--foreground-muted)]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
              {logs.length} {logs.length === 1 ? "record" : "records"}
            </div>
          </div>

          <div className="overflow-y-auto max-h-96 flex-1">
            {loading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="animate-pulse flex gap-4 items-center">
                    <Skeleton className="w-10 h-10 rounded-xl" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-3 w-32" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
              </div>
            ) : logs.length === 0 ? (
              <div className="py-16 text-center">
                <Database className="w-8 h-8 text-[var(--foreground-muted)] mx-auto mb-2 opacity-40" />
                <p className="text-sm text-[var(--foreground-muted)] italic">No usage records yet.</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-[var(--card)] border-b border-[var(--border)]">
                  <tr>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-[var(--foreground-muted)] uppercase tracking-wide">Type</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--foreground-muted)] uppercase tracking-wide">Resource</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-[var(--foreground-muted)] uppercase tracking-wide">Quantity</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-[var(--foreground-muted)] uppercase tracking-wide">Cost</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-[var(--foreground-muted)] uppercase tracking-wide">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {logs.map((log) => {
                    const meta = getResourceMeta(log.resource_type);
                    const Icon = meta.icon;
                    return (
                      <tr key={log.id} className="hover:bg-[var(--surface)] transition-colors">
                        <td className="px-5 py-3">
                          <div className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-lg ${meta.iconBg} ${meta.color}`}>
                            <Icon className="w-3.5 h-3.5" />
                            {log.resource_type.replace(/_/g, " ")}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-[var(--foreground)] font-medium max-w-[160px] truncate">
                          {log.resource_name}
                        </td>
                        <td className="px-4 py-3 text-right text-[var(--foreground)] tabular-nums">
                          +{log.quantity.toLocaleString()} <span className="text-[var(--foreground-muted)] text-xs">{log.unit}</span>
                        </td>
                        <td className="px-5 py-3 text-right text-emerald-500 font-semibold tabular-nums">
                          ${log.cost_usd.toFixed(4)}
                        </td>
                        <td className="px-5 py-3 text-right text-xs text-[var(--foreground-muted)] tabular-nums whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleTimeString()}
                          <br />
                          <span className="text-[10px]">{new Date(log.timestamp).toLocaleDateString()}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right: Cost Breakdown + Alerts */}
        <div className="space-y-6">
          {/* Cost Breakdown */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-5">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <h2 className="text-base font-semibold text-[var(--foreground)]">Cost Breakdown</h2>
            </div>

            {loading ? (
              <div className="space-y-4 animate-pulse">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="flex justify-between">
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-3 w-12" />
                    </div>
                    <Skeleton className="h-1.5 w-full rounded-full" />
                  </div>
                ))}
              </div>
            ) : totalCost === 0 ? (
              <p className="text-sm text-[var(--foreground-muted)] italic">No cost data yet.</p>
            ) : (
              <div className="space-y-4">
                {allTypes
                  .filter((t) => summary[t])
                  .sort((a, b) => (summary[b]?.cost ?? 0) - (summary[a]?.cost ?? 0))
                  .map((type) => {
                    const meta = getResourceMeta(type);
                    const data = summary[type];
                    const pct = (data.cost / totalCost) * 100;
                    return (
                      <div key={type}>
                        <div className="flex justify-between mb-1.5">
                          <span className="text-sm text-[var(--foreground-muted)]">{meta.label}</span>
                          <span className="text-sm font-semibold text-[var(--foreground)] tabular-nums">
                            ${data.cost.toFixed(4)}
                          </span>
                        </div>
                        <div className="h-1.5 bg-[var(--surface)] rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${meta.color.replace("text-", "bg-")}`}
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-[var(--foreground-muted)] mt-0.5 text-right">{pct.toFixed(1)}% of total</p>
                      </div>
                    );
                  })}

                <div className="border-t border-[var(--border)] pt-4 flex justify-between items-center">
                  <span className="text-sm font-medium text-[var(--foreground-muted)]">Today Total</span>
                  <span className="text-lg font-bold text-[var(--foreground)] tabular-nums">${totalCost.toFixed(4)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Alerts / Quota */}
          <div className={`border rounded-2xl p-6 ${totalCost > 1 ? "bg-rose-500/5 border-rose-500/20" : "bg-[var(--card)] border-[var(--border)]"}`}>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className={`w-4 h-4 ${totalCost > 1 ? "text-rose-500" : "text-[var(--foreground-muted)]"}`} />
              <h2 className="text-base font-semibold text-[var(--foreground)]">Quota Alerts</h2>
            </div>
            {loading ? (
              <Skeleton className="h-4 w-full" />
            ) : totalCost === 0 ? (
              <p className="text-sm text-[var(--foreground-muted)]">No usage recorded yet.</p>
            ) : totalCost > 1 ? (
              <p className="text-sm text-rose-400">
                Daily spend ${totalCost.toFixed(4)} may exceed quota at this rate.
                Est. monthly: <strong>${totalCostMonthly.toFixed(2)}</strong>
              </p>
            ) : (
              <p className="text-sm text-[var(--foreground-muted)]">
                No critical quota violations detected. Est. monthly burn: <strong className="text-[var(--foreground)]">${totalCostMonthly.toFixed(2)}</strong>.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
