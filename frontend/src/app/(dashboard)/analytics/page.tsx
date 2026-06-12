"use client";

import { useState, useEffect } from "react";
import {
  TrendingUp, TrendingDown, BarChart3,
  ShieldCheck, CheckCircle2, AlertTriangle,
  DollarSign, Layers, Clock, Globe, ChevronDown,
} from "lucide-react";
import { api } from "@/lib/api";

interface PlatformInsight {
  platform: string;
  account_handle: string;
  account_name: string;
  avatar_url: string | null;
  followers: number | null;
  impressions_7d: number | null;
  reach_7d: number | null;
  has_insights: boolean;
}

const PLATFORM_META: Record<string, { label: string; color: string; dot: string; iconBg: string }> = {
  facebook:  { label: "Facebook",  color: "text-blue-400",   dot: "bg-blue-500",   iconBg: "bg-blue-500/15" },
  instagram: { label: "Instagram", color: "text-pink-400",   dot: "bg-pink-500",   iconBg: "bg-pink-500/15" },
  linkedin:  { label: "LinkedIn",  color: "text-sky-400",    dot: "bg-sky-500",    iconBg: "bg-sky-500/15" },
  pinterest: { label: "Pinterest", color: "text-rose-400",   dot: "bg-rose-500",   iconBg: "bg-rose-500/15" },
  youtube:   { label: "YouTube",   color: "text-red-400",    dot: "bg-red-500",    iconBg: "bg-red-500/15" },
  threads:   { label: "Threads",   color: "text-foreground-muted",   dot: "bg-zinc-400",   iconBg: "bg-zinc-500/15" },
  twitter:   { label: "Twitter/X", color: "text-foreground-muted",   dot: "bg-zinc-500",   iconBg: "bg-zinc-500/15" },
};

const PLATFORM_SVG: Record<string, string> = {
  facebook:  "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z",
  instagram: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z",
  linkedin:  "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z",
  twitter:   "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z",
  pinterest: "M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z",
  threads:   "M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.964-.065-1.19.408-2.285 1.33-3.082.88-.76 2.119-1.207 3.583-1.291a13.853 13.853 0 0 1 3.02.142c-.126-.742-.375-1.332-.75-1.757-.513-.586-1.284-.883-2.292-.887h-.1c-.96 0-1.941.292-2.74 1.019l-1.378-1.487c1.171-1.081 2.641-1.616 4.2-1.616h.143c3.179.013 5.024 1.913 5.382 5.375.368.085.724.194 1.062.33 1.409.568 2.485 1.553 3.113 2.844.897 1.843.886 4.453-.984 6.274-1.978 1.935-4.355 2.77-7.534 2.793zm.058-9.013c-.042 0-.083 0-.124.002-1.19.066-2.087.425-2.604.957-.392.4-.565.922-.535 1.553.063 1.193 1.026 1.972 2.45 1.9 1.146-.063 1.984-.538 2.491-1.41.345-.586.544-1.362.596-2.352a11.546 11.546 0 0 0-2.274-.65z",
  youtube:   "M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z",
};

function PlatformIcon({ platform, className }: { platform: string; className?: string }) {
  const path = PLATFORM_SVG[platform];
  if (!path) return null;
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className ?? "w-3.5 h-3.5"}>
      <path d={path} />
    </svg>
  );
}

const METRIC_LABELS: Record<string, { impressions: string; reach: string }> = {
  facebook:  { impressions: "Page Views", reach: "Reach" },
  instagram: { impressions: "Impressions", reach: "Reach" },
  youtube:   { impressions: "Views", reach: "Watch Mins" },
  threads:   { impressions: "Views", reach: "Likes" },
  pinterest: { impressions: "Impressions", reach: "Saves" },
  linkedin:  { impressions: "Views", reach: "Unique Views" },
  twitter:   { impressions: "Impressions", reach: "Engagements" },
};

function getLabel(platform: string, key: "impressions" | "reach"): string {
  return METRIC_LABELS[platform]?.[key] ?? (key === "impressions" ? "Impressions" : "Reach");
}

interface OpsAnalytics {
  active_runs: { value: number; trend: string };
  queue_depth: { value: number; trend: string };
  throughput: { "24h": number; "7d": number; "30d": number };
  failure_rate: { "24h": number; "7d": number; "30d": number };
  policy_block_rate: { "24h": number; "7d": number; "30d": number };
  incidents: { "24h": any; "7d": any; "30d": any };
  sla_breach_rate: number;
  evidence_completeness: number;
}

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

type Period = "24h" | "7d" | "30d";

const PERIODS: { key: Period; label: string }[] = [
  { key: "24h", label: "Last 24H" },
  { key: "7d", label: "Last 7D" },
  { key: "30d", label: "Last 30D" },
];

function Skeleton({ className }: { className: string }) {
  return <div className={`animate-pulse bg-[var(--border)] rounded ${className}`} />;
}

function safeNumber(value: unknown, fallback = 0): number {
  const numberValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function safePercent(value: unknown, decimals = 1): string {
  return safeNumber(value).toFixed(decimals);
}

function boundedPercent(value: unknown): number {
  return Math.max(0, Math.min(safeNumber(value), 100));
}

function normalizeAnalytics(payload: Partial<OpsAnalytics>): OpsAnalytics {
  return {
    active_runs: {
      value: safeNumber(payload.active_runs?.value),
      trend: payload.active_runs?.trend || "stable",
    },
    queue_depth: {
      value: safeNumber(payload.queue_depth?.value),
      trend: payload.queue_depth?.trend || "stable",
    },
    throughput: {
      "24h": safeNumber(payload.throughput?.["24h"]),
      "7d": safeNumber(payload.throughput?.["7d"]),
      "30d": safeNumber(payload.throughput?.["30d"]),
    },
    failure_rate: {
      "24h": boundedPercent(payload.failure_rate?.["24h"]),
      "7d": boundedPercent(payload.failure_rate?.["7d"]),
      "30d": boundedPercent(payload.failure_rate?.["30d"]),
    },
    policy_block_rate: {
      "24h": boundedPercent(payload.policy_block_rate?.["24h"]),
      "7d": boundedPercent(payload.policy_block_rate?.["7d"]),
      "30d": boundedPercent(payload.policy_block_rate?.["30d"]),
    },
    incidents: {
      "24h": payload.incidents?.["24h"] || {},
      "7d": payload.incidents?.["7d"] || {},
      "30d": payload.incidents?.["30d"] || {},
    },
    sla_breach_rate: boundedPercent(payload.sla_breach_rate),
    evidence_completeness: boundedPercent(payload.evidence_completeness),
  };
}

function normalizeCampaignStats(payload: Partial<CampaignStats>): CampaignStats {
  return {
    total: safeNumber(payload.total),
    draft: safeNumber(payload.draft),
    in_review: safeNumber(payload.in_review),
    approval_pending: safeNumber(payload.approval_pending),
    active: safeNumber(payload.active),
    paused: safeNumber(payload.paused),
    completed: safeNumber(payload.completed),
    risk_flags: safeNumber(payload.risk_flags),
    budget_allocated: safeNumber(payload.budget_allocated),
    spend_recorded: safeNumber(payload.spend_recorded),
    needs_action: safeNumber(payload.needs_action),
  };
}

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<OpsAnalytics | null>(null);
  const [campaigns, setCampaigns] = useState<CampaignStats | null>(null);
  const [platforms, setPlatforms] = useState<PlatformInsight[]>([]);
  const [period, setPeriod] = useState<Period>("7d");
  const [loading, setLoading] = useState(true);
  const [expandedPlatforms, setExpandedPlatforms] = useState<Record<string, boolean>>({});

  useEffect(() => {
    async function fetchData() {
      try {
        const [analyticsRes, campRes, platformRes] = await Promise.allSettled([
          api.get("/api/v1/operations/analytics"),
          api.get("/api/v1/campaigns/stats"),
          api.getPlatformReach(),
        ]);
        if (analyticsRes.status === "fulfilled") {
          const payload = analyticsRes.value?.success ? analyticsRes.value.data : analyticsRes.value;
          if (payload) setAnalytics(normalizeAnalytics(payload));
        }
        if (campRes.status === "fulfilled") {
          const payload = campRes.value?.success ? campRes.value.data : campRes.value;
          if (payload) setCampaigns(normalizeCampaignStats(payload));
        }
        if (platformRes.status === "fulfilled") {
          const payload = platformRes.value?.success ? platformRes.value.data : platformRes.value;
          setPlatforms(Array.isArray(payload) ? payload : []);
        }
      } catch (err) {
        console.error("Analytics fetch error", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const slaCompliance = analytics ? (100 - analytics.sla_breach_rate).toFixed(1) : "—";
  const policyPassRate = analytics
    ? (100 - analytics.policy_block_rate[period]).toFixed(1)
    : "—";
  const successRate = analytics
    ? (100 - analytics.failure_rate[period]).toFixed(1)
    : "—";

  const spendPct =
    campaigns && campaigns.budget_allocated > 0
      ? Math.min((campaigns.spend_recorded / campaigns.budget_allocated) * 100, 100)
      : 0;

  const kpiCards = [
    {
      label: "Total Campaigns",
      value: campaigns?.total ?? "—",
      sub: campaigns ? `${campaigns.active} active` : null,
      icon: Layers,
      iconBg: "bg-indigo-500/10",
      iconColor: "text-indigo-400",
      trend: null,
    },
    {
      label: "30D Throughput",
      value: analytics?.throughput["30d"] ?? "—",
      sub: "agent runs",
      icon: BarChart3,
      iconBg: "bg-purple-500/10",
      iconColor: "text-purple-400",
      trend: "up" as const,
    },
    {
      label: "SLA Compliance",
      value: analytics ? `${slaCompliance}%` : "—",
      sub: `${analytics?.sla_breach_rate.toFixed(1) ?? "—"}% breach rate`,
      icon: CheckCircle2,
      iconBg: "bg-emerald-500/10",
      iconColor: "text-emerald-400",
      trend: "up" as const,
    },
    {
      label: "Evidence Complete",
      value: analytics ? `${analytics.evidence_completeness.toFixed(0)}%` : "—",
      sub: null,
      icon: ShieldCheck,
      iconBg: "bg-blue-500/10",
      iconColor: "text-blue-400",
      trend: "up" as const,
    },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)]">
          Insights &amp; ROI
        </h1>
        <p className="text-sm text-[var(--foreground-muted)] mt-1">
          Operational throughput, compliance metrics, and campaign budget performance.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 shadow-sm hover:shadow-md transition-all group"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-2 ${card.iconBg} rounded-lg`}>
                  <Icon className={`w-5 h-5 ${card.iconColor}`} />
                </div>
                {card.trend && !loading && (
                  <span className="text-xs text-emerald-500 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                  </span>
                )}
              </div>
              <p className="text-sm text-[var(--foreground-muted)] mb-1">{card.label}</p>
              <div className="text-2xl font-bold text-[var(--foreground)] tabular-nums">
                {loading ? <Skeleton className="w-16 h-7 mt-1" /> : card.value}
              </div>
              {card.sub && !loading && (
                <p className="text-xs text-[var(--foreground-muted)] mt-1">{card.sub}</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Platform Reach */}
      {(loading || platforms.length > 0) && (() => {
        const grouped = platforms.reduce<Record<string, PlatformInsight[]>>((acc, p) => {
          (acc[p.platform] ??= []).push(p);
          return acc;
        }, {});

        return (
          <div>
            {/* Section header */}
            <div className="flex items-center gap-2 mb-4">
              <Globe className="w-4 h-4 text-indigo-400" />
              <h2 className="text-base font-semibold text-[var(--foreground)]">Platform Reach</h2>
              {!loading && (
                <span className="text-xs text-[var(--foreground-muted)] bg-[var(--card)] border border-[var(--border)] px-2 py-0.5 rounded-full ml-1">
                  {platforms.length} {platforms.length === 1 ? "account" : "accounts"}
                </span>
              )}
              <span className="text-xs text-[var(--foreground-muted)] ml-auto">Last 7 days</span>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 animate-pulse space-y-4">
                    <div className="flex items-center gap-2">
                      <Skeleton className="w-3 h-3 rounded-full" />
                      <Skeleton className="w-24 h-4 rounded" />
                    </div>
                    <div className="flex gap-4">
                      <Skeleton className="w-16 h-8 rounded-lg" />
                      <Skeleton className="w-16 h-8 rounded-lg" />
                    </div>
                    <div className="border-t border-[var(--border)] pt-3 space-y-2">
                      <Skeleton className="w-full h-3 rounded" />
                      <Skeleton className="w-3/4 h-3 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {Object.entries(grouped).map(([platform, accounts]) => {
                  const meta = PLATFORM_META[platform] ?? { label: platform, color: "text-foreground-muted", dot: "bg-zinc-500" };
                  const totalFollowers = accounts.reduce((a, p) => a + (p.followers ?? 0), 0);
                  const totalM1 = accounts.reduce((a, p) => a + (p.impressions_7d ?? 0), 0);
                  const totalM2 = accounts.reduce((a, p) => a + (p.reach_7d ?? 0), 0);
                  const anyInsights = accounts.some(p => p.has_insights);
                  const m1Label = getLabel(platform, "impressions");
                  const m2Label = getLabel(platform, "reach");

                  return (
                    <div key={platform} className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                      {/* Platform header */}
                      <div className={`px-5 pt-5 pb-4`}>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <div className={`w-6 h-6 rounded-md ${meta.iconBg} flex items-center justify-center flex-shrink-0`}>
                              <PlatformIcon platform={platform} className={`w-3.5 h-3.5 ${meta.color}`} />
                            </div>
                            <span className={`text-sm font-bold tracking-wide ${meta.color}`}>{meta.label}</span>
                          </div>
                          <span className="text-[11px] text-[var(--foreground-muted)] bg-[var(--surface)] border border-[var(--border)] px-2 py-0.5 rounded-full">
                            {accounts.length} {accounts.length === 1 ? "account" : "accounts"}
                          </span>
                        </div>

                        {/* Aggregate stats */}
                        <div className="flex items-end gap-5">
                          <div>
                            <p className="text-2xl font-bold text-[var(--foreground)] tabular-nums leading-tight">
                              {totalFollowers.toLocaleString()}
                            </p>
                            <p className="text-[11px] text-[var(--foreground-muted)] mt-0.5">Total Followers</p>
                          </div>
                          {anyInsights && totalM1 > 0 && (
                            <div>
                              <p className="text-2xl font-bold text-[var(--foreground)] tabular-nums leading-tight">
                                {totalM1.toLocaleString()}
                              </p>
                              <p className="text-[11px] text-[var(--foreground-muted)] mt-0.5">{m1Label}</p>
                            </div>
                          )}
                          {anyInsights && totalM2 > 0 && (
                            <div>
                              <p className="text-2xl font-bold text-[var(--foreground)] tabular-nums leading-tight">
                                {totalM2.toLocaleString()}
                              </p>
                              <p className="text-[11px] text-[var(--foreground-muted)] mt-0.5">{m2Label}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Accounts list */}
                      {(() => {
                        const isExpanded = !!expandedPlatforms[platform];
                        const visibleAccounts = isExpanded ? accounts : accounts.slice(0, 2);
                        const hiddenCount = accounts.length - 2;

                        return (
                          <div className="border-t border-[var(--border)]">
                            <div className="divide-y divide-[var(--border)]/60">
                              {visibleAccounts.map((p) => (
                                <div key={p.account_handle} className="flex items-center gap-3 px-5 py-2.5 hover:bg-[var(--surface)] transition-colors">
                                  <div className="w-7 h-7 rounded-full flex-shrink-0 overflow-hidden bg-[var(--border)]">
                                    {p.avatar_url ? (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img
                                        src={p.avatar_url}
                                        alt={p.account_name}
                                        className="w-full h-full object-cover"
                                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; (e.currentTarget.nextSibling as HTMLElement).style.display = 'flex'; }}
                                      />
                                    ) : null}
                                    <div
                                      className={`w-full h-full ${meta.iconBg} items-center justify-center ${p.avatar_url ? 'hidden' : 'flex'}`}
                                      style={{ display: p.avatar_url ? 'none' : 'flex' }}
                                    >
                                      <PlatformIcon platform={platform} className={`w-4 h-4 ${meta.color}`} />
                                    </div>
                                  </div>
                                  <p className="text-sm font-medium text-[var(--foreground)] truncate flex-1 min-w-0">
                                    {p.account_name}
                                  </p>
                                  <div className="flex items-center gap-1.5 flex-shrink-0 text-xs">
                                    {p.has_insights ? (
                                      <>
                                        {p.impressions_7d != null && (
                                          <span className="tabular-nums text-[var(--foreground-muted)]">
                                            <span className="font-semibold text-[var(--foreground)]">{p.impressions_7d.toLocaleString()}</span>
                                            {" "}{m1Label}
                                          </span>
                                        )}
                                        {p.impressions_7d != null && p.reach_7d != null && (
                                          <span className="text-[var(--border)]">·</span>
                                        )}
                                        {p.reach_7d != null && (
                                          <span className="tabular-nums text-[var(--foreground-muted)]">
                                            <span className="font-semibold text-[var(--foreground)]">{p.reach_7d.toLocaleString()}</span>
                                            {" "}{m2Label}
                                          </span>
                                        )}
                                        {p.followers != null && p.impressions_7d == null && p.reach_7d == null && (
                                          <span className="tabular-nums text-[var(--foreground-muted)]">
                                            <span className="font-semibold text-[var(--foreground)]">{p.followers.toLocaleString()}</span> followers
                                          </span>
                                        )}
                                      </>
                                    ) : (
                                      <span className="text-[10px] text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md whitespace-nowrap">
                                        Reconnect
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* Dropdown toggle — only shown when there are more than 2 accounts */}
                            {accounts.length > 2 && (
                              <button
                                onClick={() => setExpandedPlatforms(prev => ({ ...prev, [platform]: !prev[platform] }))}
                                className="w-full flex items-center justify-center gap-1.5 py-2 text-xs text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface)] transition-colors border-t border-[var(--border)]/60"
                              >
                                {isExpanded ? (
                                  <>
                                    <ChevronDown className="w-3.5 h-3.5 rotate-180 transition-transform" />
                                    Show less
                                  </>
                                ) : (
                                  <>
                                    <ChevronDown className="w-3.5 h-3.5 transition-transform" />
                                    {hiddenCount} more {hiddenCount === 1 ? "account" : "accounts"}
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* Period Toggle */}
      <div className="flex items-center gap-1 bg-[var(--card)] border border-[var(--border)] rounded-xl p-1 w-fit">
        {PERIODS.map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              period === p.key
                ? "bg-indigo-600 text-foreground shadow-sm"
                : "text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Throughput Table + Budget */}
        <div className="lg:col-span-2 space-y-6">
          {/* Throughput Comparison Table */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--border)]">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-purple-400" />
                <h2 className="text-base font-semibold text-[var(--foreground)]">
                  Throughput &amp; Performance
                </h2>
              </div>
              <p className="text-xs text-[var(--foreground-muted)] mt-1">
                Agent run throughput and quality metrics across time windows.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--surface)]">
                    <th className="text-left px-6 py-3 text-xs font-semibold text-[var(--foreground-muted)] uppercase tracking-wide">
                      Window
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-[var(--foreground-muted)] uppercase tracking-wide">
                      Runs
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-[var(--foreground-muted)] uppercase tracking-wide">
                      Failure Rate
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-[var(--foreground-muted)] uppercase tracking-wide">
                      Policy Blocked
                    </th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-[var(--foreground-muted)] uppercase tracking-wide">
                      Success Rate
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {loading
                    ? Array.from({ length: 3 }).map((_, i) => (
                        <tr key={i}>
                          {Array.from({ length: 5 }).map((_, j) => (
                            <td key={j} className="px-6 py-4">
                              <Skeleton className="h-4 w-12" />
                            </td>
                          ))}
                        </tr>
                      ))
                    : PERIODS.map(({ key, label }) => {
                        const runs = analytics?.throughput[key] ?? 0;
                        const failRate = analytics?.failure_rate[key] ?? 0;
                        const blockRate = analytics?.policy_block_rate[key] ?? 0;
                        const success = (100 - failRate).toFixed(1);
                        const isSelected = period === key;
                        return (
                          <tr
                            key={key}
                            className={`hover:bg-[var(--surface)] transition-colors ${isSelected ? "bg-indigo-500/5" : ""}`}
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                {isSelected && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 inline-block" />
                                )}
                                <span className={`font-medium ${isSelected ? "text-[var(--foreground)]" : "text-[var(--foreground-muted)]"}`}>
                                  {label}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-4 text-right font-semibold text-[var(--foreground)] tabular-nums">
                              {runs}
                            </td>
                            <td className="px-4 py-4 text-right tabular-nums">
                              <span className={failRate > 10 ? "text-rose-400 font-semibold" : "text-[var(--foreground-muted)]"}>
                                {failRate.toFixed(1)}%
                              </span>
                            </td>
                            <td className="px-4 py-4 text-right tabular-nums">
                              <span className={blockRate > 5 ? "text-amber-400 font-semibold" : "text-[var(--foreground-muted)]"}>
                                {blockRate.toFixed(1)}%
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right tabular-nums">
                              <span className="text-emerald-500 font-semibold">{success}%</span>
                            </td>
                          </tr>
                        );
                      })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Campaign Budget ROI */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-5">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <h2 className="text-base font-semibold text-[var(--foreground)]">Campaign Budget ROI</h2>
            </div>

            {loading ? (
              <div className="space-y-3 animate-pulse">
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-2 w-full rounded-full" />
                <div className="grid grid-cols-3 gap-4 pt-2">
                  {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
                </div>
              </div>
            ) : campaigns ? (
              <>
                <div className="grid grid-cols-3 gap-4 mb-5">
                  {[
                    { label: "Budget Allocated", value: `$${campaigns.budget_allocated.toLocaleString()}`, color: "text-[var(--foreground)]" },
                    { label: "Spend Recorded", value: `$${campaigns.spend_recorded.toLocaleString()}`, color: "text-indigo-400" },
                    { label: "Remaining", value: `$${(campaigns.budget_allocated - campaigns.spend_recorded).toLocaleString()}`, color: "text-emerald-500" },
                  ].map((item) => (
                    <div key={item.label} className="bg-[var(--surface)] rounded-xl p-4">
                      <p className="text-xs text-[var(--foreground-muted)] mb-1">{item.label}</p>
                      <p className={`text-lg font-bold tabular-nums ${item.color}`}>{item.value}</p>
                    </div>
                  ))}
                </div>

                <div className="mb-1.5 flex justify-between text-sm">
                  <span className="text-[var(--foreground-muted)]">Budget utilisation</span>
                  <span className="font-semibold text-[var(--foreground)] tabular-nums">{spendPct.toFixed(1)}%</span>
                </div>
                <div className="h-2.5 bg-[var(--surface)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded-full transition-all duration-700"
                    style={{ width: `${spendPct}%` }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 mt-5 pt-5 border-t border-[var(--border)]">
                  {[
                    { label: "Active Campaigns", value: campaigns.active, color: "text-emerald-500" },
                    { label: "Pending Approval", value: campaigns.approval_pending, color: "text-amber-400" },
                    { label: "Risk Flags", value: campaigns.risk_flags, color: "text-rose-400" },
                    { label: "Needs Action", value: campaigns.needs_action, color: "text-orange-400" },
                  ].map((item) => (
                    <div key={item.label} className="flex justify-between">
                      <span className="text-sm text-[var(--foreground-muted)]">{item.label}</span>
                      <span className={`text-sm font-bold tabular-nums ${item.color}`}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm text-[var(--foreground-muted)] italic">Budget data unavailable.</p>
            )}
          </div>
        </div>

        {/* Right: Compliance Scorecard */}
        <div className="space-y-6">
          {/* Compliance Score */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <h2 className="text-base font-semibold text-[var(--foreground)]">Compliance ({period.toUpperCase()})</h2>
            </div>

            <div className="space-y-4">
              {[
                {
                  label: "SLA Compliance",
                  value: analytics ? `${slaCompliance}%` : "—",
                  pct: analytics ? parseFloat(slaCompliance as string) : 0,
                  color: parseFloat(slaCompliance as string) > 90 ? "bg-emerald-500" : "bg-amber-500",
                },
                {
                  label: "Policy Pass Rate",
                  value: analytics ? `${policyPassRate}%` : "—",
                  pct: analytics ? parseFloat(policyPassRate as string) : 0,
                  color: parseFloat(policyPassRate as string) > 90 ? "bg-emerald-500" : "bg-amber-500",
                },
                {
                  label: "Run Success Rate",
                  value: analytics ? `${successRate}%` : "—",
                  pct: analytics ? parseFloat(successRate as string) : 0,
                  color: parseFloat(successRate as string) > 90 ? "bg-emerald-500" : "bg-rose-500",
                },
                {
                  label: "Evidence Complete",
                  value: analytics ? `${analytics.evidence_completeness.toFixed(0)}%` : "—",
                  pct: analytics?.evidence_completeness ?? 0,
                  color: (analytics?.evidence_completeness ?? 0) > 80 ? "bg-blue-500" : "bg-amber-500",
                },
              ].map((metric) => (
                <div key={metric.label}>
                  <div className="flex justify-between mb-1.5">
                    <span className="text-sm text-[var(--foreground-muted)]">{metric.label}</span>
                    <span className="text-sm font-semibold text-[var(--foreground)] tabular-nums">
                      {loading ? "—" : metric.value}
                    </span>
                  </div>
                  <div className="h-1.5 bg-[var(--surface)] rounded-full overflow-hidden">
                    <div
                      className={`h-full ${metric.color} rounded-full transition-all duration-700`}
                      style={{ width: loading ? "0%" : `${Math.min(metric.pct, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Incident Summary */}
          {analytics && !loading && (
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <h2 className="text-base font-semibold text-[var(--foreground)]">Incidents ({period.toUpperCase()})</h2>
              </div>
              <div className="space-y-3">
                {["critical", "high", "medium", "low"].map((sev) => {
                  const count = analytics.incidents[period]?.[sev] ?? 0;
                  return (
                    <div key={sev} className="flex justify-between items-center">
                      <span className="text-sm text-[var(--foreground-muted)] capitalize">{sev}</span>
                      <span className={`text-sm font-bold tabular-nums ${
                        count > 0
                          ? sev === "critical" ? "text-rose-400" : sev === "high" ? "text-orange-400" : "text-[var(--foreground)]"
                          : "text-[var(--foreground-muted)]"
                      }`}>
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Current Window Info */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5">
            <div className="flex items-center gap-1.5 text-xs text-[var(--foreground-muted)] mb-1">
              <Clock className="w-3.5 h-3.5" />
              Viewing: <span className="font-semibold text-[var(--foreground)]">{period.toUpperCase()} window</span>
            </div>
            {analytics && (
              <div className="mt-3 space-y-1.5">
                <p className="text-xs text-[var(--foreground-muted)]">
                  Active runs:{" "}
                  <span className="font-semibold text-[var(--foreground)]">
                    {analytics.active_runs.value}
                  </span>
                  {" "}
                  <span className={`inline-flex items-center gap-0.5 ${analytics.active_runs.trend === "up" ? "text-emerald-500" : "text-rose-400"}`}>
                    {analytics.active_runs.trend === "up"
                      ? <TrendingUp className="w-3 h-3" />
                      : <TrendingDown className="w-3 h-3" />}
                  </span>
                </p>
                <p className="text-xs text-[var(--foreground-muted)]">
                  Queue depth:{" "}
                  <span className="font-semibold text-[var(--foreground)]">
                    {analytics.queue_depth.value}
                  </span>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
