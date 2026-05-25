"use client";

import { Layers, CheckCircle2, AlertCircle, Zap, DollarSign, BarChart3 } from "lucide-react";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";

interface CampaignStats {
  total: number;
  draft: number;
  in_review: number;
  approval_pending: number;
  active: number;
  pausing: number;
  paused: number;
  completed: number;
  risk_flags: number;
  budget_allocated: number;
  spend_recorded: number;
  needs_action: number;
}

function StatCard({
  label, value, sub, Icon, iconBg, iconColor,
}: {
  label: string; value: string | number; sub: string | null;
  Icon: React.ElementType; iconBg: string; iconColor: string;
}) {
  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-[var(--card-border)] transition-all duration-300 group">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-2 ${iconBg} rounded-lg group-hover:scale-110 transition-transform duration-300`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
        {sub && (
          <span className="text-xs text-[var(--foreground-muted)] bg-[var(--surface)] px-2 py-1 rounded-full">
            {sub}
          </span>
        )}
      </div>
      <h3 className="text-[var(--foreground-muted)] text-sm font-medium mb-1">{label}</h3>
      <p className="text-3xl font-bold text-[var(--foreground)] tabular-nums">{value}</p>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 animate-pulse">
      <div className="flex justify-between mb-4">
        <div className="w-9 h-9 bg-[var(--border)] rounded-lg" />
        <div className="w-20 h-5 bg-[var(--border)] rounded-full" />
      </div>
      <div className="w-24 h-3 bg-[var(--border)] rounded mb-3" />
      <div className="w-16 h-8 bg-[var(--border)] rounded" />
    </div>
  );
}

export default function SocialPerformancePage() {
  const [campaigns, setCampaigns] = useState<CampaignStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/v1/campaigns/stats')
      .then(res => { if (res.success) setCampaigns(res.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const statusBars = campaigns
    ? [
        { label: 'Draft', count: campaigns.draft, color: 'bg-slate-500' },
        { label: 'In Review', count: campaigns.in_review, color: 'bg-blue-500' },
        { label: 'Approval Pending', count: campaigns.approval_pending, color: 'bg-amber-500' },
        { label: 'Active', count: campaigns.active, color: 'bg-emerald-500' },
        { label: 'Pausing', count: campaigns.pausing, color: 'bg-orange-400' },
        { label: 'Paused', count: campaigns.paused, color: 'bg-orange-600' },
        { label: 'Completed', count: campaigns.completed, color: 'bg-indigo-500' },
      ]
    : [];

  const maxCount = Math.max(...statusBars.map(b => b.count), 1);

  const spendPct =
    campaigns && campaigns.budget_allocated > 0
      ? Math.min((campaigns.spend_recorded / campaigns.budget_allocated) * 100, 100)
      : 0;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)] mb-2">
          Social Performance
        </h1>
        <p className="text-[var(--foreground-muted)] text-sm">
          Campaign lifecycle overview — publishing activity, budget burn, and approval queue.
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : campaigns ? (
          <>
            <StatCard
              label="Total Campaigns"
              value={campaigns.total}
              sub={`${campaigns.active} active`}
              Icon={Layers}
              iconBg="bg-indigo-500/10"
              iconColor="text-indigo-400"
            />
            <StatCard
              label="Completed"
              value={campaigns.completed}
              sub={null}
              Icon={CheckCircle2}
              iconBg="bg-emerald-500/10"
              iconColor="text-emerald-400"
            />
            <StatCard
              label="Pending Approval"
              value={campaigns.approval_pending}
              sub={campaigns.needs_action > 0 ? `${campaigns.needs_action} need action` : null}
              Icon={AlertCircle}
              iconBg="bg-amber-500/10"
              iconColor="text-amber-400"
            />
            <StatCard
              label="Risk Flags"
              value={campaigns.risk_flags}
              sub={null}
              Icon={Zap}
              iconBg="bg-rose-500/10"
              iconColor="text-rose-400"
            />
          </>
        ) : (
          <div className="col-span-4 text-sm text-[var(--foreground-muted)] italic py-8 text-center">
            Unable to load campaign stats.
          </div>
        )}
      </div>

      {/* Status Chart + Budget Tracker */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status Distribution */}
        <div className="lg:col-span-2 bg-[var(--card)] border border-[var(--border)] rounded-2xl p-8 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 className="w-5 h-5 text-indigo-400" />
            <div>
              <h2 className="text-lg font-bold text-[var(--foreground)]">Status Distribution</h2>
              <p className="text-xs text-[var(--foreground-muted)] mt-0.5">Campaign count by lifecycle stage</p>
            </div>
          </div>

          {loading ? (
            <div className="space-y-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="flex justify-between mb-1.5">
                    <div className="w-32 h-3 bg-[var(--border)] rounded" />
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
            <p className="text-sm text-[var(--foreground-muted)] italic text-center py-8">No data.</p>
          )}
        </div>

        {/* Budget Tracker */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-8 shadow-sm flex flex-col gap-6">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="text-lg font-bold text-[var(--foreground)]">Budget Tracker</h2>
              <p className="text-xs text-[var(--foreground-muted)] mt-0.5">Spend vs allocation</p>
            </div>
          </div>

          {loading ? (
            <div className="space-y-4 animate-pulse">
              <div className="w-full h-8 bg-[var(--border)] rounded" />
              <div className="w-full h-2 bg-[var(--border)] rounded-full" />
            </div>
          ) : campaigns ? (
            <>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-xs text-[var(--foreground-muted)]">Spend Recorded</span>
                  <span className="text-xs font-bold text-[var(--foreground)]">
                    ${campaigns.spend_recorded.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between mb-3">
                  <span className="text-xs text-[var(--foreground-muted)]">Budget Allocated</span>
                  <span className="text-xs font-bold text-[var(--foreground)]">
                    ${campaigns.budget_allocated.toLocaleString()}
                  </span>
                </div>
                <div className="h-3 bg-[var(--surface)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-1000"
                    style={{ width: `${spendPct}%` }}
                  />
                </div>
                <div className="flex justify-between mt-1.5">
                  <span className="text-xs text-[var(--foreground-muted)]">Utilization</span>
                  <span className="text-xs font-bold text-emerald-400">{spendPct.toFixed(1)}%</span>
                </div>
              </div>

              <div className="border-t border-[var(--border)] pt-4">
                <p className="text-xl font-bold text-[var(--foreground)] tabular-nums mb-1">
                  ${(campaigns.budget_allocated - campaigns.spend_recorded).toLocaleString()}
                </p>
                <p className="text-xs text-[var(--foreground-muted)]">Remaining budget across all campaigns</p>
              </div>

              <div className="space-y-3 pt-1">
                {[
                  { label: 'Risk Flags', value: campaigns.risk_flags, color: 'text-rose-400' },
                  { label: 'Needs Action', value: campaigns.needs_action, color: 'text-amber-400' },
                  { label: 'In Review', value: campaigns.in_review, color: 'text-blue-400' },
                ].map(item => (
                  <div key={item.label} className="flex justify-between items-center">
                    <span className="text-xs text-[var(--foreground-muted)]">{item.label}</span>
                    <span className={`text-xs font-bold ${item.color} tabular-nums`}>{item.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-[var(--foreground-muted)] italic">Budget data unavailable.</p>
          )}
        </div>
      </div>
    </div>
  );
}
