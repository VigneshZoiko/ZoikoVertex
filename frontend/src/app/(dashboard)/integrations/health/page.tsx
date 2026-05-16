"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import {
  RefreshCw, CheckCircle2, AlertCircle, XCircle,
  Activity, Link2, Zap, Clock, AlertTriangle,
} from "lucide-react";

/* ─── Types ──────────────────────────────────────────────────────────────── */
interface Account {
  id: string;
  platform: string;
  account_name: string;
  account_handle: string;
  status: string;
  created_at: string;
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
}

/* ─── Helpers ────────────────────────────────────────────────────────────── */
const PLATFORM_COLORS: Record<string, string> = {
  facebook:  "#1877F2",
  instagram: "#E4405F",
  linkedin:  "#0A66C2",
  twitter:   "#1DA1F2",
  threads:   "#000000",
  pinterest: "#E60023",
};

function platformColor(p: string) {
  return PLATFORM_COLORS[p.toLowerCase()] ?? "#6B7280";
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
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

function scoreColor(score: number) {
  if (score >= 90) return { text: "text-emerald-400", bg: "bg-emerald-500", ring: "border-emerald-500/40", label: "Healthy" };
  if (score >= 70) return { text: "text-amber-400",   bg: "bg-amber-500",   ring: "border-amber-500/40",   label: "Degraded" };
  return               { text: "text-rose-400",   bg: "bg-rose-500",     ring: "border-rose-500/40",     label: "Critical" };
}

function successRate(stat: PlatformStat) {
  const total = stat.published + stat.failed;
  return total > 0 ? Math.round((stat.published / total) * 100) : 100;
}

/* ─── Component ──────────────────────────────────────────────────────────── */
export default function HealthPage() {
  const [data, setData]         = useState<HealthData | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
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

  /* ── Loading ── */
  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-5 h-5 animate-spin text-[var(--foreground-muted)]" />
      </div>
    );
  }

  /* ── Error ── */
  if (error && !data) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <AlertCircle className="w-8 h-8 text-rose-400" />
        <p className="text-sm text-[var(--foreground-muted)]">{error}</p>
        <button onClick={fetchHealth} className="text-xs text-[var(--foreground-muted)] underline">Retry</button>
      </div>
    );
  }

  if (!data) return null;

  const sc = scoreColor(data.health_score);
  const platforms = Object.entries(data.platform_breakdown);

  return (
    <div className="space-y-6 p-6 max-w-6xl mx-auto">

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

      {/* ── Score + Stats Row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">

        {/* Health Score */}
        <div className={`col-span-2 sm:col-span-1 bg-[var(--card)] border ${sc.ring} rounded-2xl p-5 flex items-center gap-4`}>
          <div className="relative w-14 h-14 shrink-0">
            <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
              <circle cx="28" cy="28" r="22" fill="none" stroke="var(--border)" strokeWidth="5" />
              <circle
                cx="28" cy="28" r="22" fill="none"
                stroke={data.health_score >= 90 ? "#10b981" : data.health_score >= 70 ? "#f59e0b" : "#f43f5e"}
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

        {/* Accounts */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <Link2 className="w-4 h-4 text-[var(--foreground-muted)]" />
            <p className="text-xs text-[var(--foreground-muted)]">Connected</p>
          </div>
          <p className="text-2xl font-bold text-[var(--foreground)]">{data.stats.total_accounts}</p>
          <p className="text-[11px] text-[var(--foreground-muted)] mt-0.5">accounts</p>
        </div>

        {/* Published */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <p className="text-xs text-[var(--foreground-muted)]">Published</p>
          </div>
          <p className="text-2xl font-bold text-[var(--foreground)]">{data.stats.published}</p>
          <p className="text-[11px] text-[var(--foreground-muted)] mt-0.5">last 7 days</p>
        </div>

        {/* Failed */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <XCircle className="w-4 h-4 text-rose-400" />
            <p className="text-xs text-[var(--foreground-muted)]">Failed</p>
          </div>
          <p className="text-2xl font-bold text-[var(--foreground)]">{data.stats.failed}</p>
          <p className="text-[11px] text-[var(--foreground-muted)] mt-0.5">last 7 days</p>
        </div>
      </div>

      {/* ── Accounts + Platform Breakdown ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Connected Accounts */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--border)] flex items-center gap-2">
            <Activity className="w-4 h-4 text-[var(--foreground-muted)]" />
            <h2 className="text-sm font-semibold text-[var(--foreground)]">Connected Accounts</h2>
          </div>
          {data.accounts.length === 0 ? (
            <div className="px-5 py-10 text-center text-xs text-[var(--foreground-muted)]">
              No accounts connected yet.
            </div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {data.accounts.map((acc) => (
                <div key={acc.id} className="flex items-center gap-3 px-5 py-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
                    style={{ backgroundColor: platformColor(acc.platform) }}
                  >
                    {acc.platform.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--foreground)] truncate">{acc.account_name}</p>
                    <p className="text-[11px] text-[var(--foreground-muted)] truncate">{capitalize(acc.platform)}</p>
                  </div>
                  <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded-full shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Active
                  </span>
                </div>
              ))}
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
            <div className="px-5 py-10 text-center text-xs text-[var(--foreground-muted)]">
              No publish activity yet.
            </div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {platforms.map(([platform, stat]) => {
                const rate = successRate(stat);
                const color = platformColor(platform);
                return (
                  <div key={platform} className="px-5 py-3.5">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded flex items-center justify-center text-white text-[10px] font-bold" style={{ backgroundColor: color }}>
                          {platform.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-[var(--foreground)]">{capitalize(platform)}</span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-[var(--foreground-muted)]">
                        <span className="text-emerald-400 font-semibold">{stat.published} ok</span>
                        {stat.failed > 0 && <span className="text-rose-400 font-semibold">{stat.failed} failed</span>}
                        {stat.scheduled > 0 && <span>{stat.scheduled} pending</span>}
                      </div>
                    </div>
                    <div className="h-1.5 bg-[var(--surface)] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${rate}%`,
                          backgroundColor: rate >= 90 ? "#10b981" : rate >= 70 ? "#f59e0b" : "#f43f5e",
                        }}
                      />
                    </div>
                    <p className="text-[10px] text-[var(--foreground-muted)] mt-1 text-right">{rate}% success rate</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Failed Jobs ── */}
      {data.failed_jobs.length > 0 && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--border)] flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-semibold text-[var(--foreground)]">Failed Jobs</h2>
            <span className="ml-auto px-2 py-0.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-bold rounded-full">
              {data.failed_jobs.length}
            </span>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {data.failed_jobs.map((job, i) => (
              <div key={i} className="flex items-start gap-4 px-5 py-3.5">
                <div
                  className="w-7 h-7 rounded flex items-center justify-center text-white text-[10px] font-bold shrink-0 mt-0.5"
                  style={{ backgroundColor: job.post ? platformColor(job.post.platform) : "#6B7280" }}
                >
                  {job.post ? job.post.platform.charAt(0).toUpperCase() : "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-[var(--foreground)] truncate">
                    {job.post?.content?.slice(0, 80) || "Unknown post"}
                    {(job.post?.content?.length ?? 0) > 80 ? "…" : ""}
                  </p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-[11px] text-[var(--foreground-muted)]">
                      {job.post ? capitalize(job.post.platform) : "Unknown"}
                    </span>
                    {job.retry_count > 0 && (
                      <span className="text-[11px] text-amber-400">{job.retry_count} retries</span>
                    )}
                    <span className="text-[11px] text-[var(--foreground-muted)]">{timeAgo(job.created_at)}</span>
                  </div>
                </div>
                <span className="flex items-center gap-1 px-2 py-0.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-bold rounded-full shrink-0">
                  <XCircle className="w-3 h-3" /> Failed
                </span>
              </div>
            ))}
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
                <XCircle className="w-3.5 h-3.5 text-rose-400 mt-0.5 shrink-0" />
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

      {/* Empty state when everything is healthy */}
      {data.failed_jobs.length === 0 && data.recent_errors.length === 0 && (
        <div className="bg-[var(--card)] border border-emerald-500/20 rounded-2xl p-8 flex flex-col items-center gap-3">
          <CheckCircle2 className="w-8 h-8 text-emerald-400" />
          <p className="text-sm font-semibold text-[var(--foreground)]">All systems operational</p>
          <p className="text-xs text-[var(--foreground-muted)]">No failed jobs or errors in the last 7 days.</p>
        </div>
      )}

    </div>
  );
}
