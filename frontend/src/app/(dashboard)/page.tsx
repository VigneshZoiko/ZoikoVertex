"use client";

import { Activity, TrendingUp, Users, AlertCircle, CheckCircle2 } from "lucide-react";
import { useState, useEffect } from "react";

const METRICS = [
  {
    label: "Total Reach",
    value: "124.5K",
    delta: "+12%",
    icon: Activity,
    iconBg: "bg-indigo-500/10",
    iconColor: "text-indigo-400",
    hasDelta: true,
  },
  {
    label: "Published Posts",
    value: "84",
    delta: null,
    icon: CheckCircle2,
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-400",
    hasDelta: false,
  },
  {
    label: "Pending Approvals",
    value: "12",
    delta: null,
    icon: AlertCircle,
    iconBg: "bg-amber-500/10",
    iconColor: "text-amber-400",
    hasDelta: false,
  },
  {
    label: "Audience Growth",
    value: "3,240",
    delta: "+5.2%",
    icon: Users,
    iconBg: "bg-blue-500/10",
    iconColor: "text-blue-400",
    hasDelta: true,
  },
];

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const [heights, setHeights] = useState<number[]>([]);

  useEffect(() => {
    setMounted(true);
    setHeights(Array.from({ length: 14 }).map(() => 30 + Math.random() * 60));
  }, []);

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)] mb-2">
          Social Performance
        </h1>
        <p className="text-[var(--foreground-muted)] text-sm">
          Monitor your connected platform metrics and publishing queue.
        </p>
      </div>

      {/* Metrics Grid — staggered entrance */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {METRICS.map((metric, i) => {
          const Icon = metric.icon;
          return (
            <div
              key={metric.label}
              className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-[var(--card-border)] transition-all duration-300 group"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="flex justify-between items-start mb-4">
                <div className={`p-2 ${metric.iconBg} rounded-lg group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className={`w-5 h-5 ${metric.iconColor}`} />
                </div>
                {metric.hasDelta && (
                  <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    {metric.delta}
                  </span>
                )}
              </div>
              <h3 className="text-[var(--foreground-muted)] text-sm font-medium mb-1">{metric.label}</h3>
              <p className="text-3xl font-bold text-[var(--foreground)] tabular-nums">{metric.value}</p>
            </div>
          );
        })}
      </div>

      {/* Chart Card */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-8 shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-lg font-bold text-[var(--foreground)]">Cross-Platform Engagement</h2>
            <p className="text-sm text-[var(--foreground-muted)] mt-1">
              Aggregated views and interactions across Meta and LinkedIn.
            </p>
          </div>
          <select className="bg-[var(--surface)] border border-[var(--border)] text-sm text-[var(--foreground)] px-3 py-1.5 rounded-lg outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-pointer">
            <option>Last 7 Days</option>
            <option>Last 30 Days</option>
            <option>This Year</option>
          </select>
        </div>

        {/* Bar Chart */}
        <div className="h-72 w-full flex items-end gap-2">
          {mounted
            ? heights.map((height, i) => (
                <div key={i} className="flex-1 flex flex-col justify-end group">
                  <div
                    className="w-full rounded-t-sm bar-grow relative cursor-pointer"
                    style={{
                      height: `${height}%`,
                      background:
                        "linear-gradient(to top, rgba(99,102,241,0.75), rgba(139,92,246,0.35))",
                      animationDelay: `${i * 28}ms`,
                    }}
                  >
                    {/* Hover shimmer overlay */}
                    <div className="absolute inset-0 rounded-t-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                      style={{ background: "linear-gradient(to top, rgba(99,102,241,1), rgba(139,92,246,0.6))" }}
                    />
                    {/* Tooltip */}
                    <div className="absolute -top-9 left-1/2 -translate-x-1/2 bg-[var(--surface)] border border-[var(--border)] text-xs text-[var(--foreground)] px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 whitespace-nowrap shadow-lg z-10 pointer-events-none">
                      {Math.floor(height * 12).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))
            : Array.from({ length: 14 }).map((_, i) => (
                <div key={i} className="flex-1 flex flex-col justify-end">
                  <div
                    className="w-full skeleton-shimmer rounded-t-sm"
                    style={{ height: "50%", animationDelay: `${i * 80}ms` }}
                  />
                </div>
              ))}
        </div>

        <div className="flex justify-between mt-4 text-xs text-[var(--foreground-muted)] font-medium border-t border-[var(--border)]/50 pt-4">
          <span>May 1</span>
          <span>May 7</span>
          <span>May 14</span>
        </div>
      </div>
    </div>
  );
}
