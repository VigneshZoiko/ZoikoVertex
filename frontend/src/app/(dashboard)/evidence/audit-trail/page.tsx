"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Activity, AlertTriangle, CheckCircle2, Shield, Search, X, RefreshCw, ChevronRight } from "lucide-react";

interface AuditEvent {
  id: string;
  event_title: string;
  event_summary: string;
  event_type: string;
  timestamp_utc: string;
  actor: { actor_name?: string; actor_type: string; actor_id: string };
  object: { object_type: string; object_name?: string };
  risk_level: string;
  status: string;
}

function timeAgo(ts: string) {
  try {
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  } catch { return "—"; }
}

export default function AuditTrailPage() {
  const router = useRouter();
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (search) p.set("search", search);
      p.set("limit", "50");
      const res = await api.get(`/api/audit-events?${p}`);
      if (res.success) setEvents(res.data?.events || []);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const sorted = [...events].sort((a, b) => {
    const aScore = a.risk_level === "critical" ? 3 : a.risk_level === "high" ? 2 : a.risk_level === "medium" ? 1 : 0;
    const bScore = b.risk_level === "critical" ? 3 : b.risk_level === "high" ? 2 : b.risk_level === "medium" ? 1 : 0;
    if (aScore !== bScore) return bScore - aScore;
    return new Date(b.timestamp_utc).getTime() - new Date(a.timestamp_utc).getTime();
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Activity className="w-5 h-5 text-foreground-muted" /> Activity Log
          </h1>
          <p className="text-xs text-foreground-muted mt-0.5">Everything important that happened</p>
        </div>
        <button onClick={fetchEvents} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-surface border border-border rounded-lg hover:bg-surface-hover text-foreground-muted">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          <p className="text-xs text-red-400 flex-1">{error}</p>
          <button onClick={() => setError(null)}><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* Search */}
      <div className="relative mb-4 max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground-muted" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search activity…"
          className="w-full bg-surface border border-border rounded-lg pl-8 pr-3 py-1.5 text-xs text-foreground" />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2">
            <X className="w-3 h-3 text-foreground-muted" />
          </button>
        )}
      </div>

      {/* Event List */}
      <div className="space-y-1">
        {loading ? (
          <div className="py-12 text-center text-xs text-foreground-muted">Loading…</div>
        ) : sorted.length === 0 ? (
          <div className="py-16 text-center text-foreground-muted">
            <Activity className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No activity recorded yet</p>
          </div>
        ) : (
          sorted.map(ev => {
            const isBad = ev.status === "failed" || ev.status === "blocked";
            const isCritical = ev.risk_level === "critical";
            return (
              <button
                key={ev.id}
                onClick={() => router.push(`/evidence/audit-trail/events/${ev.id}`)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-left transition-colors ${
                  isCritical
                    ? "bg-red-500/5 border border-red-500/10 hover:bg-red-500/10"
                    : isBad
                    ? "bg-orange-500/5 border border-orange-500/10 hover:bg-orange-500/10"
                    : "bg-surface border border-border hover:bg-surface-hover"
                }`}
              >
                <div className={`w-6 h-6 rounded flex items-center justify-center shrink-0 ${
                  isCritical ? "bg-red-500/15" : isBad ? "bg-orange-500/15" : "bg-surface-hover"
                }`}>
                  {isCritical ? <AlertTriangle className="w-3 h-3 text-red-400" />
                    : isBad ? <Shield className="w-3 h-3 text-orange-400" />
                    : <CheckCircle2 className="w-3 h-3 text-green-400" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${isCritical ? "text-red-300" : "text-foreground"}`}>
                      {ev.event_title || ev.event_type.replace(/_/g, " ")}
                    </span>
                  </div>
                  <p className="text-xs text-foreground-muted mt-0.5 line-clamp-1">
                    {ev.event_summary || `${ev.actor?.actor_name || ev.actor?.actor_type || "System"} · ${ev.object?.object_type?.replace(/_/g, " ") || "system"}`}
                  </p>
                </div>

                <span className="text-[11px] text-foreground-muted shrink-0">{timeAgo(ev.timestamp_utc)}</span>
                <ChevronRight className="w-3.5 h-3.5 text-foreground-muted shrink-0" />
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
