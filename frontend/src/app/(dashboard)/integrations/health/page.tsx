"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { api } from "@/lib/api";
import {
  RefreshCw, CheckCircle2, AlertCircle, XCircle,
  Activity, Link2, Zap, Clock, AlertTriangle, Webhook,
} from "lucide-react";

/* ─── Types ──────────────────────────────────────────────────────────────── */
interface Account {
  id: string;
  platform: string;
  account_name: string;
  account_handle: string;
  avatar_url: string | null;
  status: string;
  created_at: string;
}

interface WebhookEndpoint {
  id: string;
  name: string;
  url: string;
  events: string[];
  last_triggered_at: string | null;
  failure_count: number;
}

interface PlatformStat {
  published: number;
  failed: number;
  scheduled: number;
}

interface FailedJob {
  post_id: string;
  retry_count: number;
  created_at: string;
  post: { platform: string; content: string; scheduled_time: string } | null;
}

interface ErrorLog {
  level: string;
  service: string;
  message: string;
  created_at: string;
}

interface HealthData {
  health_score: number;
  accounts: Account[];
  stats: {
    total_accounts: number;
    published: number;
    failed: number;
    scheduled: number;
    period_days: number;
  };
  platform_breakdown: Record<string, PlatformStat>;
  failed_jobs: FailedJob[];
  recent_errors: ErrorLog[];
  webhooks: {
    active_count: number;
    endpoints: WebhookEndpoint[];
    delivery_total: number;
    delivery_success: number;
    health_pct: number;
  };
}

/* ─── Helpers ────────────────────────────────────────────────────────────── */
const PLATFORM_META: Record<string, { color: string; bg: string; label: string }> = {
  facebook:  { color: "#1877F2", bg: "#1877F220", label: "Facebook"  },
  instagram: { color: "#E4405F", bg: "#E4405F20", label: "Instagram" },
  linkedin:  { color: "#0A66C2", bg: "#0A66C220", label: "LinkedIn"  },
  twitter:   { color: "#1DA1F2", bg: "#1DA1F220", label: "Twitter"   },
  threads:   { color: "#aaaaaa", bg: "#aaaaaa20", label: "Threads"   },
  pinterest: { color: "#E60023", bg: "#E6002320", label: "Pinterest" },
  youtube:   { color: "#FF0000", bg: "#FF000020", label: "YouTube"   },
};

function pm(p: string) {
  return PLATFORM_META[p.toLowerCase()] ?? { color: "#6B7280", bg: "#6B728020", label: p };
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function scoreColor(s: number) {
  if (s >= 90) return { text: "text-success-text", stroke: "#10b981", ring: "border-success-border/30", label: "Healthy" };
  if (s >= 70) return { text: "text-warning-text",   stroke: "#f59e0b", ring: "border-warning-border/30",   label: "Degraded" };
  return             { text: "text-error-text",     stroke: "#f43f5e", ring: "border-error-border/30",     label: "Critical" };
}

function successRate(stat: PlatformStat) {
  const t = stat.published + stat.failed;
  return t > 0 ? Math.round((stat.published / t) * 100) : 100;
}

function StatCard({ icon, label, value, sub, accent }: {
  icon: React.ReactNode; label: string; value: number | string; sub: string; accent?: string;
}) {
  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-2">
        <span className={accent ?? "text-[var(--foreground-muted)]"}>{icon}</span>
        <p className="text-xs text-[var(--foreground-muted)]">{label}</p>
      </div>
      <p className={`text-2xl font-bold ${accent ?? "text-[var(--foreground)]"}`}>{value}</p>
      <p className="text-[11px] text-[var(--foreground-muted)] mt-0.5">{sub}</p>
    </div>
  );
}

/* ─── Component ──────────────────────────────────────────────────────────── */
export default function HealthPage() {
  const [data, setData]           = useState<HealthData | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [refreshed, setRefreshed] = useState<Date | null>(null);

  const fetchHealth = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/api/v1/integrations/health");
      if (res.success) {
        setData(res.data);
        setRefreshed(new Date());
      } else {
        setError("Failed to load health data.");
      }
    } catch (e: any) {
      setError(e.message || "Failed to load health data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchHealth(); }, [fetchHealth]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-5 h-5 animate-spin text-[var(--foreground-muted)]" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <AlertCircle className="w-8 h-8 text-error-text" />
        <p className="text-sm text-[var(--foreground-muted)]">{error}</p>
        <button onClick={fetchHealth} className="text-xs text-[var(--foreground-muted)] underline">Retry</button>
      </div>
    );
  }

  if (!data) return null;

  const sc = scoreColor(data.health_score);
  const wh = data.webhooks;

  // Build platform list from connected accounts — always shows real data.
  // Overlay post stats from platform_breakdown when available.
  const platformMap: Record<string, { stat: PlatformStat; accountCount: number }> = {};
  data.accounts.forEach((acc) => {
    const key = acc.platform.toLowerCase();
    if (!platformMap[key]) platformMap[key] = { stat: { published: 0, failed: 0, scheduled: 0 }, accountCount: 0 };
    platformMap[key].accountCount++;
  });
  Object.entries(data.platform_breakdown).forEach(([p, stat]) => {
    const key = p.toLowerCase();
    if (!platformMap[key]) platformMap[key] = { stat, accountCount: 0 };
    else platformMap[key].stat = stat;
  });
  const platforms = Object.entries(platformMap);

  return (
    <div className="space-y-6 px-4 sm:p-6 max-w-6xl mx-auto pb-24">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-[var(--foreground)]">Integration Health</h1>
          <p className="text-xs text-[var(--foreground-muted)] mt-0.5">
            Last 7 days · {refreshed ? `Refreshed ${timeAgo(refreshed.toISOString())}` : ""}
          </p>
        </div>
        <button
          onClick={fetchHealth}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[var(--surface)] border border-[var(--border)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] rounded-lg transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* ── Score Row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">

        {/* Health Score Ring */}
        <div className={`col-span-2 sm:col-span-1 bg-[var(--card)] border ${sc.ring} rounded-2xl p-5 flex items-center gap-4`}>
          <div className="relative w-14 h-14 shrink-0">
            <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
              <circle cx="28" cy="28" r="22" fill="none" stroke="var(--border)" strokeWidth="5" />
              <circle cx="28" cy="28" r="22" fill="none" stroke={sc.stroke}
                strokeWidth="5"
                strokeDasharray={`${(data.health_score / 100) * 138.2} 138.2`}
                strokeLinecap="round"
              />
            </svg>
            <span className={`absolute inset-0 flex items-center justify-center text-sm font-bold ${sc.text}`}>
              {data.health_score}%
            </span>
          </div>
          <div>
            <p className="text-xs text-[var(--foreground-muted)]">Health Score</p>
            <p className={`text-sm font-bold ${sc.text}`}>{sc.label}</p>
          </div>
        </div>

        <StatCard icon={<Link2 className="w-4 h-4" />}        label="Connected"  value={data.stats.total_accounts} sub="accounts"      />
        <StatCard icon={<CheckCircle2 className="w-4 h-4" />} label="Published"  value={data.stats.published}      sub="last 7 days"   accent="text-success-text" />
        <StatCard icon={<XCircle className="w-4 h-4" />}      label="Failed"     value={data.stats.failed}         sub="last 7 days"   accent={data.stats.failed > 0 ? "text-error-text" : undefined} />
        <StatCard icon={<Webhook className="w-4 h-4" />}      label="Webhooks"   value={wh.active_count}           sub={wh.delivery_total > 0 ? `${wh.health_pct}% delivery rate` : "no deliveries"} accent={wh.health_pct < 80 ? "text-warning-text" : undefined} />
      </div>

      {/* ── Connected Accounts + Platform Breakdown ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Connected Accounts — real data, active only */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--border)] flex items-center gap-2">
            <Activity className="w-4 h-4 text-[var(--foreground-muted)]" />
            <h2 className="text-sm font-semibold text-[var(--foreground)]">Connected Accounts</h2>
            <span className="ml-auto text-[11px] text-[var(--foreground-muted)]">{data.stats.total_accounts} active</span>
          </div>

          {data.accounts.length === 0 ? (
            <div className="px-5 py-12 flex flex-col items-center gap-2 text-center">
              <Link2 className="w-6 h-6 text-[var(--foreground-muted)] opacity-40" />
              <p className="text-sm text-[var(--foreground-muted)]">No accounts connected</p>
              <p className="text-xs text-[var(--foreground-muted)] opacity-60">Connect social accounts from Platform Accounts</p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {data.accounts.map((acc) => {
                const meta = pm(acc.platform);
                return (
                  <div key={acc.id} className="flex items-center gap-3 px-5 py-3.5">
                    {/* Avatar or platform initial */}
                    {acc.avatar_url ? (
                      <div className="relative w-9 h-9 rounded-full overflow-hidden shrink-0 border border-[var(--border)]">
                        <Image src={acc.avatar_url} alt={acc.account_name} fill className="object-cover" />
                      </div>
                    ) : (
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-foreground text-xs font-bold shrink-0"
                        style={{ backgroundColor: meta.color }}
                      >
                        {acc.platform.charAt(0).toUpperCase()}
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--foreground)] truncate">{acc.account_name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span
                          className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                          style={{ color: meta.color, backgroundColor: meta.bg }}
                        >
                          {meta.label}
                        </span>
                        {acc.account_handle && (
                          <span className="text-[11px] text-[var(--foreground-muted)] truncate">
                            @{acc.account_handle.replace(/^@/, '')}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <span className="w-2 h-2 rounded-full bg-success-text" />
                      <span className="text-[11px] text-success-text font-medium">Live</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Platform Breakdown */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--border)] flex items-center gap-2">
            <Zap className="w-4 h-4 text-[var(--foreground-muted)]" />
            <h2 className="text-sm font-semibold text-[var(--foreground)]">Platform Breakdown</h2>
            <span className="text-[11px] text-[var(--foreground-muted)] ml-auto">last 7 days</span>
          </div>

          {platforms.length === 0 ? (
            <div className="px-5 py-12 flex flex-col items-center gap-2 text-center">
              <Link2 className="w-6 h-6 text-[var(--foreground-muted)] opacity-40" />
              <p className="text-sm text-[var(--foreground-muted)]">No accounts connected</p>
              <p className="text-xs text-[var(--foreground-muted)] opacity-60">Connect social accounts to see platform stats</p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {platforms.map(([platform, { stat, accountCount }]) => {
                const hasActivity = stat.published + stat.failed + stat.scheduled > 0;
                const rate  = successRate(stat);
                const meta  = pm(platform);
                return (
                  <div key={platform} className="px-5 py-4">
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-foreground text-[11px] font-bold shrink-0"
                          style={{ backgroundColor: meta.color }}
                        >
                          {platform.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <span className="text-sm font-medium text-[var(--foreground)]">{meta.label}</span>
                          <p className="text-[10px] text-[var(--foreground-muted)]">{accountCount} account{accountCount !== 1 ? 's' : ''} connected</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-[11px]">
                        {hasActivity ? (
                          <>
                            <span className="text-success-text font-semibold">{stat.published} ok</span>
                            {stat.failed > 0    && <span className="text-error-text font-semibold">{stat.failed} failed</span>}
                            {stat.scheduled > 0 && <span className="text-[var(--foreground-muted)]">{stat.scheduled} pending</span>}
                          </>
                        ) : (
                          <span className="text-[var(--foreground-muted)] italic">no posts yet</span>
                        )}
                      </div>
                    </div>
                    <div className="h-1.5 bg-[var(--surface)] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: hasActivity ? `${rate}%` : '100%',
                          backgroundColor: hasActivity
                            ? (rate >= 90 ? "#10b981" : rate >= 70 ? "#f59e0b" : "#f43f5e")
                            : meta.color,
                          opacity: hasActivity ? 1 : 0.25,
                        }}
                      />
                    </div>
                    <p className="text-[10px] text-[var(--foreground-muted)] mt-1 text-right">
                      {hasActivity ? `${rate}% success rate` : 'No activity in last 7 days'}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Webhook Endpoints ── */}
      {wh.active_count > 0 && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--border)] flex items-center gap-2">
            <Webhook className="w-4 h-4 text-[var(--foreground-muted)]" />
            <h2 className="text-sm font-semibold text-[var(--foreground)]">Active Webhooks</h2>
            <span className="ml-auto flex items-center gap-2 text-[11px]">
              {wh.delivery_total > 0 && (
                <span className={wh.health_pct >= 90 ? "text-success-text font-semibold" : "text-warning-text font-semibold"}>
                  {wh.health_pct}% delivery rate
                </span>
              )}
              <span className="text-[var(--foreground-muted)]">{wh.delivery_total} deliveries / 7d</span>
            </span>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {wh.endpoints.map((ep) => (
              <div key={ep.id} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 px-5 py-3.5">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--foreground)] truncate">{ep.name}</p>
                  <p className="text-[11px] text-[var(--foreground-muted)] truncate mt-0.5">{ep.url}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  {ep.failure_count > 0 && (
                    <span className="text-[11px] text-warning-text font-semibold">{ep.failure_count} failures</span>
                  )}
                  {ep.last_triggered_at && (
                    <span className="text-[11px] text-[var(--foreground-muted)]">{timeAgo(ep.last_triggered_at)}</span>
                  )}
                  <div className="flex gap-1 flex-wrap">
                    {ep.events.slice(0, 3).map((ev) => (
                      <span key={ev} className="text-[10px] px-1.5 py-0.5 bg-[var(--surface)] border border-[var(--border)] text-[var(--foreground-muted)] rounded font-mono">
                        {ev}
                      </span>
                    ))}
                    {ep.events.length > 3 && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-[var(--surface)] border border-[var(--border)] text-[var(--foreground-muted)] rounded">
                        +{ep.events.length - 3}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Failed Jobs ── */}
      {data.failed_jobs.length > 0 && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--border)] flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-warning-text" />
            <h2 className="text-sm font-semibold text-[var(--foreground)]">Failed Jobs</h2>
            <span className="ml-auto px-2 py-0.5 bg-error-text/10 border border-error-border/20 text-error-text text-[10px] font-bold rounded-full">
              {data.failed_jobs.length}
            </span>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {data.failed_jobs.map((job, i) => {
              const meta = job.post ? pm(job.post.platform) : pm('unknown');
              return (
                <div key={i} className="flex items-start gap-4 px-5 py-3.5">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-foreground text-[10px] font-bold shrink-0 mt-0.5"
                    style={{ backgroundColor: meta.color }}
                  >
                    {job.post ? job.post.platform.charAt(0).toUpperCase() : "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-[var(--foreground)] truncate">
                      {job.post?.content?.slice(0, 80) || "Unknown post"}
                      {(job.post?.content?.length ?? 0) > 80 ? "…" : ""}
                    </p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-[11px] text-[var(--foreground-muted)]">{meta.label}</span>
                      {job.retry_count > 0 && (
                        <span className="text-[11px] text-warning-text">{job.retry_count} retries</span>
                      )}
                      <span className="text-[11px] text-[var(--foreground-muted)]">{timeAgo(job.created_at)}</span>
                    </div>
                  </div>
                  <span className="flex items-center gap-1 px-2 py-0.5 bg-error-text/10 border border-error-border/20 text-error-text text-[10px] font-bold rounded-full shrink-0">
                    <XCircle className="w-3 h-3" /> Failed
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Error Log ── */}
      {data.recent_errors.length > 0 && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--border)] flex items-center gap-2">
            <Clock className="w-4 h-4 text-[var(--foreground-muted)]" />
            <h2 className="text-sm font-semibold text-[var(--foreground)]">Error Log</h2>
            <span className="text-[11px] text-[var(--foreground-muted)] ml-auto">last 7 days</span>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {data.recent_errors.map((log, i) => (
              <div key={i} className="flex items-start gap-3 px-5 py-3">
                <XCircle className="w-3.5 h-3.5 text-error-text mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-[var(--foreground)] truncate">{log.message}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] px-1.5 py-0.5 bg-[var(--surface)] border border-[var(--border)] text-[var(--foreground-muted)] rounded font-mono">
                      {log.service}
                    </span>
                    <span className="text-[11px] text-[var(--foreground-muted)]">{timeAgo(log.created_at)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── All clear ── */}
      {data.failed_jobs.length === 0 && data.recent_errors.length === 0 && (
        <div className="bg-[var(--card)] border border-success-border/20 rounded-2xl p-8 flex flex-col items-center gap-3">
          <CheckCircle2 className="w-8 h-8 text-success-text" />
          <p className="text-sm font-semibold text-[var(--foreground)]">All systems operational</p>
          <p className="text-xs text-[var(--foreground-muted)]">No failed jobs or errors in the last 7 days.</p>
        </div>
      )}

    </div>
  );
}
