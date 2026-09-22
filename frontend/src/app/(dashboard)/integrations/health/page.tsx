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

/* Brand glyph paths — same set used on the Analytics / Platform Accounts pages. */
const PLATFORM_SVG: Record<string, string> = {
  facebook:  "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z",
  instagram: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z",
  linkedin:  "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z",
  twitter:   "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z",
  pinterest: "M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z",
  threads:   "M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.964-.065-1.19.408-2.285 1.33-3.082.88-.76 2.119-1.207 3.583-1.291a13.853 13.853 0 0 1 3.02.142c-.126-.742-.375-1.332-.75-1.757-.513-.586-1.284-.883-2.292-.887h-.1c-.96 0-1.941.292-2.74 1.019l-1.378-1.487c1.171-1.081 2.641-1.616 4.2-1.616h.143c3.179.013 5.024 1.913 5.382 5.375.368.085.724.194 1.062.33 1.409.568 2.485 1.553 3.113 2.844.897 1.843.886 4.453-.984 6.274-1.978 1.935-4.355 2.77-7.534 2.793zm.058-9.013c-.042 0-.083 0-.124.002-1.19.066-2.087.425-2.604.957-.392.4-.565.922-.535 1.553.063 1.193 1.026 1.972 2.45 1.9 1.146-.063 1.984-.538 2.491-1.41.345-.586.544-1.362.596-2.352a11.546 11.546 0 0 0-2.274-.65z",
  youtube:   "M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z",
};

/* Only pass http(s) or local paths to next/image — malformed stored values
   (e.g. a literal "null") would otherwise throw during render. */
function isRenderableSrc(src: string | null | undefined): src is string {
  return !!src && (/^https?:\/\//i.test(src) || src.startsWith("/"));
}

/* Connected-account avatar that always renders something identifiable:
   the avatar image when it loads, otherwise the platform glyph. Social CDN
   avatar URLs captured at connect time expire, leaving a blank circle. */
function AccountAvatar({ account, meta, broken, onBroken }: {
  account: Account;
  meta: { color: string; bg: string; label: string };
  broken: boolean;
  onBroken: () => void;
}) {
  if (!broken && isRenderableSrc(account.avatar_url)) {
    return (
      <div className="relative w-9 h-9 rounded-full overflow-hidden shrink-0 border border-[var(--border)] bg-[var(--surface)]">
        <Image
          src={account.avatar_url}
          alt={account.account_name}
          fill
          className="object-cover"
          onError={onBroken}
        />
      </div>
    );
  }

  const path = PLATFORM_SVG[account.platform.toLowerCase()];
  return (
    <div
      className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
      style={{ backgroundColor: meta.bg, color: meta.color }}
      title={meta.label}
    >
      {path ? (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" aria-hidden="true">
          <path d={path} />
        </svg>
      ) : (
        <span className="text-xs font-bold">{meta.label.charAt(0).toUpperCase()}</span>
      )}
    </div>
  );
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
  const [brokenAvatars, setBrokenAvatars] = useState<Record<string, boolean>>({});

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
                    {/* Avatar with platform-glyph fallback — always renders an
                        identifiable icon, even if the stored avatar URL has
                        expired or fails to load */}
                    <AccountAvatar
                      account={acc}
                      meta={meta}
                      broken={!!brokenAvatars[acc.id]}
                      onBroken={() => setBrokenAvatars((prev) => ({ ...prev, [acc.id]: true }))}
                    />

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
