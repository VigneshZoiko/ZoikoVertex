"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Activity, Loader2, RefreshCw, Clock,
  Zap, Database, Shield, Globe,
} from "lucide-react";
import { api } from "@/lib/api";

interface ServiceHealth {
  name: string;
  status: string;
  latency?: number;
  error?: string;
}

interface HealthData {
  status: string;
  message?: string;
  environment?: string;
  timestamp?: string;
}

interface IntegrationHealthData {
  services?: ServiceHealth[];
  timestamp?: string;
}

const STATUS_STYLES: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  success:  { label: "Operational", color: "text-emerald-400", bg: "bg-emerald-400/10 border-emerald-400/20", dot: "bg-emerald-400" },
  healthy:  { label: "Healthy",     color: "text-emerald-400", bg: "bg-emerald-400/10 border-emerald-400/20", dot: "bg-emerald-400" },
  ok:       { label: "OK",          color: "text-emerald-400", bg: "bg-emerald-400/10 border-emerald-400/20", dot: "bg-emerald-400" },
  degraded: { label: "Degraded",    color: "text-amber-400",   bg: "bg-amber-400/10 border-amber-400/20",     dot: "bg-amber-400" },
  error:    { label: "Error",       color: "text-rose-400",    bg: "bg-rose-400/10 border-rose-400/20",       dot: "bg-rose-400" },
  unknown:  { label: "Unknown",     color: "text-zinc-400",    bg: "bg-zinc-400/10 border-zinc-400/20",       dot: "bg-zinc-500" },
};

function getStyle(status?: string) {
  return STATUS_STYLES[(status || "unknown").toLowerCase()] ?? STATUS_STYLES.unknown;
}

export default function SystemStatusPage() {
  const [health, setHealth]           = useState<HealthData | null>(null);
  const [integrations, setIntegrations] = useState<IntegrationHealthData | null>(null);
  const [loading, setLoading]         = useState(true);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [healthRes, intRes] = await Promise.allSettled([
        api.get("/api/v1/health"),
        api.get("/api/v1/integrations/health"),
      ]);
      setHealth(healthRes.status === "fulfilled" ? healthRes.value : { status: "error" });
      setIntegrations(intRes.status === "fulfilled" ? intRes.value : null);
      setLastChecked(new Date());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const overallStyle = getStyle(health?.status);

  const coreServices = [
    { name: "API Server",    icon: Zap,      status: health?.status || "unknown", detail: health?.environment || "production" },
    { name: "Database",      icon: Database, status: health?.status === "success" ? "healthy" : "unknown", detail: "Supabase Postgres" },
    { name: "Auth Service",  icon: Shield,   status: health?.status === "success" ? "healthy" : "unknown", detail: "Supabase Auth" },
    { name: "Storage",       icon: Globe,    status: health?.status === "success" ? "healthy" : "unknown", detail: "Supabase Storage" },
  ];

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <Activity className="w-8 h-8 text-indigo-500" />
            System Status
          </h1>
          <p className="text-zinc-400 mt-1 text-sm">Real-time health of all platform services and integrations.</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Refresh
        </button>
      </div>

      {/* Overall banner */}
      {health && (
        <div className={`flex items-center gap-3 p-4 rounded-2xl border ${overallStyle.bg}`}>
          <span className={`w-3 h-3 rounded-full shrink-0 ${overallStyle.dot} animate-pulse`} />
          <div className="flex-1">
            <p className={`font-bold ${overallStyle.color}`}>
              {health.status === "success" ? "All Systems Operational" : "System Issues Detected"}
            </p>
            {health.message && <p className="text-xs text-zinc-500 mt-0.5">{health.message}</p>}
          </div>
          {lastChecked && (
            <span className="flex items-center gap-1 text-xs text-zinc-600 shrink-0">
              <Clock className="w-3 h-3" />
              {lastChecked.toLocaleTimeString()}
            </span>
          )}
        </div>
      )}

      {/* Core Services */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl overflow-hidden">
        <div className="px-6 py-5 border-b border-zinc-800">
          <h2 className="font-bold text-white">Core Services</h2>
        </div>
        <div className="divide-y divide-zinc-800/50">
          {loading ? (
            <div className="px-6 py-10 flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
            </div>
          ) : coreServices.map(({ name, icon: Icon, status, detail }) => {
            const s = getStyle(status);
            return (
              <div key={name} className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Icon className="w-5 h-5 text-zinc-500 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-white">{name}</p>
                    <p className="text-xs text-zinc-600">{detail}</p>
                  </div>
                </div>
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold ${s.bg} ${s.color}`}>
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.dot}`} />
                  {s.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Integration Health */}
      {integrations && (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl overflow-hidden">
          <div className="px-6 py-5 border-b border-zinc-800">
            <h2 className="font-bold text-white">Integration Health</h2>
          </div>
          <div className="divide-y divide-zinc-800/50">
            {(!integrations.services || integrations.services.length === 0) ? (
              <p className="px-6 py-8 text-center text-zinc-600 text-sm">No integration data available</p>
            ) : integrations.services.map((svc, i) => {
              const s = getStyle(svc.status);
              return (
                <div key={svc.name || i} className="px-6 py-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">{svc.name}</p>
                    {svc.error && <p className="text-xs text-rose-400 mt-0.5">{svc.error}</p>}
                  </div>
                  <div className="flex items-center gap-3">
                    {svc.latency !== undefined && (
                      <span className="text-xs text-zinc-600">{svc.latency}ms</span>
                    )}
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold ${s.bg} ${s.color}`}>
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.dot}`} />
                      {s.label}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Environment */}
      {health && (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl overflow-hidden">
          <div className="px-6 py-5 border-b border-zinc-800">
            <h2 className="font-bold text-white">Environment</h2>
          </div>
          <div className="divide-y divide-zinc-800">
            {[
              { label: "Environment",   value: health.environment || "production" },
              { label: "Last Checked",  value: lastChecked?.toLocaleString() || "—" },
              { label: "API Timestamp", value: health.timestamp ? new Date(health.timestamp).toLocaleString() : "—" },
            ].map(({ label, value }) => (
              <div key={label} className="px-6 py-4 flex items-center justify-between">
                <span className="text-zinc-500 text-sm">{label}</span>
                <span className="text-zinc-300 text-sm font-mono">{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
