"use client";

import { Activity, AlertCircle, Layers, Cpu, TrendingDown } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api";

interface CampaignStats {
  total: number;
  draft: number;
  in_review: number;
  approval_pending: number;
  active: number;
  paused: number;
  completed: number;
  risk_flags: number;
  budget_allocated: number;
  spend_recorded: number;
  needs_action: number;
}

interface OpsStats {
  active_runs: number;
  queue_depth: number;
  pending_queues: number;
  failure_rate: number;
  failed_runs: number;
  total_runs: number;
  policy_block_rate: number;
  policy_blocked_runs: number;
}

function SkeletonCard() {
  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 animate-pulse">
      <div className="flex justify-between items-start mb-4">
        <div className="w-9 h-9 bg-[var(--border)] rounded-lg" />
        <div className="w-20 h-5 bg-[var(--border)] rounded-full" />
      </div>
      <div className="w-24 h-3 bg-[var(--border)] rounded mb-3" />
      <div className="w-16 h-8 bg-[var(--border)] rounded" />
    </div>
  );
}

export default function CommandCenterPage() {
  const [campaigns, setCampaigns] = useState<CampaignStats | null>(null);
  const [ops, setOps] = useState<OpsStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    async function fetchData() {
      try {
        const [campRes, opsRes] = await Promise.allSettled([
          api.get('/api/v1/campaigns/stats'),
          api.get('/api/v1/operations/stats'),
        ]);
        if (campRes.status === 'fulfilled' && campRes.value.success) setCampaigns(campRes.value.data);
        if (opsRes.status === 'fulfilled' && opsRes.value.success) setOps(opsRes.value.data);
      } catch (err) {
        console.error('Command center fetch error', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const statCards = [
    {
      label: "Total Campaigns",
      value: campaigns?.total ?? '—',
      sub: campaigns ? `${campaigns.active} active` : null,
      icon: Layers,
      iconBg: "bg-info-bg",
      iconColor: "text-info-text",
    },
    {
      label: "Pending Approvals",
      value: campaigns?.approval_pending ?? '—',
      sub: campaigns?.needs_action ? `${campaigns.needs_action} need action` : null,
      icon: AlertCircle,
      iconBg: "bg-warning-bg",
      iconColor: "text-warning-text",
    },
    {
      label: "Active Agent Runs",
      value: ops?.active_runs ?? '—',
      sub: ops ? `${ops.queue_depth} queued` : null,
      icon: Cpu,
      iconBg: "bg-success-bg",
      iconColor: "text-success-text",
    },
    {
      label: "Failure Rate",
      value: ops ? `${ops.failure_rate.toFixed(1)}%` : '—',
      sub: ops ? `of ${ops.total_runs} total runs` : null,
      icon: ops && ops.failure_rate > 10 ? TrendingDown : Activity,
      iconBg: ops && ops.failure_rate > 10 ? "bg-error-bg" : "bg-info-bg",
      iconColor: ops && ops.failure_rate > 10 ? "text-error-text" : "text-info-text",
    },
  ];

  const statusBars = campaigns
    ? [
        { label: 'Draft', count: campaigns.draft, color: 'bg-slate-500' },
        { label: 'In Review', count: campaigns.in_review, color: 'bg-info-text' },
        { label: 'Pending Approval', count: campaigns.approval_pending, color: 'bg-warning-text' },
        { label: 'Active', count: campaigns.active, color: 'bg-success-text' },
        { label: 'Paused', count: campaigns.paused, color: 'bg-warning-text' },
        { label: 'Completed', count: campaigns.completed, color: 'bg-info-text' },
      ]
    : [];

  const maxCount = Math.max(...statusBars.map(b => b.count), 1);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)] mb-2">
          Command Center
        </h1>
        <p className="text-[var(--foreground-muted)] text-sm">
          Live platform overview — campaigns, agent operations, and system health.
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
          : statCards.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.label}
                  className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-[var(--card-border)] transition-all duration-300 group"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className={`p-2 ${card.iconBg} rounded-lg group-hover:scale-110 transition-transform duration-300`}>
                      <Icon className={`w-5 h-5 ${card.iconColor}`} />
                    </div>
                    {card.sub && (
                      <span className="text-xs text-[var(--foreground-muted)] bg-[var(--surface)] px-2 py-1 rounded-full">
                        {card.sub}
                      </span>
                    )}
                  </div>
                  <h3 className="text-[var(--foreground-muted)] text-sm font-medium mb-1">{card.label}</h3>
                  <p className="text-3xl font-bold text-[var(--foreground)] tabular-nums">{card.value}</p>
                </div>
              );
            })}
      </div>

      {/* Campaign Status + Ops Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status Distribution */}
        <div className="lg:col-span-2 bg-[var(--card)] border border-[var(--border)] rounded-2xl p-8 shadow-sm">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-[var(--foreground)]">Campaign Status Distribution</h2>
            <p className="text-sm text-[var(--foreground-muted)] mt-1">
              Breakdown of all campaigns by current lifecycle stage.
            </p>
          </div>
          {loading ? (
            <div className="space-y-5">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="flex justify-between mb-1.5">
                    <div className="w-28 h-3 bg-[var(--border)] rounded" />
                    <div className="w-6 h-3 bg-[var(--border)] rounded" />
                  </div>
                  <div className="h-2 bg-[var(--border)] rounded-full" />
                </div>
              ))}
            </div>
          ) : campaigns ? (
            <div className="space-y-5">
              {statusBars.map((bar) => (
                <div key={bar.label}>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-sm font-medium text-[var(--foreground-muted)]">{bar.label}</span>
                    <span className="text-sm font-bold text-[var(--foreground)] tabular-nums">{bar.count}</span>
                  </div>
                  <div className="h-2 bg-[var(--surface)] rounded-full overflow-hidden">
                    <div
                      className={`h-full ${bar.color} rounded-full transition-all duration-700`}
                      style={{ width: `${Math.max((bar.count / maxCount) * 100, bar.count > 0 ? 3 : 0)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--foreground-muted)] italic py-8 text-center">No campaign data available.</p>
          )}
        </div>

        {/* Ops Quick Stats */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-8 shadow-sm flex flex-col gap-6">
          <div>
            <h2 className="text-lg font-bold text-[var(--foreground)]">Agent Operations</h2>
            <p className="text-sm text-[var(--foreground-muted)] mt-1">Live run metrics.</p>
          </div>

          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="animate-pulse flex justify-between py-2">
                  <div className="w-28 h-3 bg-[var(--border)] rounded" />
                  <div className="w-10 h-3 bg-[var(--border)] rounded" />
                </div>
              ))}
            </div>
          ) : ops ? (
            <>
              <div className="space-y-1">
                {[
                  { label: 'Active Runs', value: ops.active_runs },
                  { label: 'Queued', value: ops.queue_depth },
                  { label: 'Total Runs', value: ops.total_runs },
                  { label: 'Failed', value: ops.failed_runs },
                  { label: 'Policy Blocked', value: ops.policy_blocked_runs },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between py-2.5 border-b border-[var(--border)]/50 last:border-0"
                  >
                    <span className="text-sm text-[var(--foreground-muted)]">{item.label}</span>
                    <span className="text-sm font-bold text-[var(--foreground)] tabular-nums">{item.value}</span>
                  </div>
                ))}
              </div>

              <div className="pt-2 space-y-4">
                <div>
                  <div className="flex justify-between mb-1.5">
                    <span className="text-xs text-[var(--foreground-muted)]">Failure Rate</span>
                    <span className="text-xs font-bold text-error-text">{ops.failure_rate.toFixed(1)}%</span>
                  </div>
                  <div className="h-1.5 bg-[var(--surface)] rounded-full overflow-hidden">
                    <div className="h-full bg-error-text rounded-full" style={{ width: `${Math.min(ops.failure_rate, 100)}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-1.5">
                    <span className="text-xs text-[var(--foreground-muted)]">Policy Block Rate</span>
                    <span className="text-xs font-bold text-warning-text">{ops.policy_block_rate.toFixed(1)}%</span>
                  </div>
                  <div className="h-1.5 bg-[var(--surface)] rounded-full overflow-hidden">
                    <div className="h-full bg-warning-text rounded-full" style={{ width: `${Math.min(ops.policy_block_rate, 100)}%` }} />
                  </div>
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-[var(--foreground-muted)] italic">Operations data unavailable.</p>
          )}
        </div>
      </div>
    </div>
  );
}
