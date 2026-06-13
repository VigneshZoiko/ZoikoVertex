"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import {
  FileSearch, AlertTriangle, CheckCircle2, Search, X,
  RefreshCw, Shield, Clock, Bot, User, Server, ChevronDown, ChevronUp,
} from "lucide-react";

interface AuditEvent {
  id: string;
  event_id: string;
  event_category: string;
  event_type: string;
  event_title: string;
  event_summary: string;
  timestamp_utc: string;
  actor: { actor_id: string; actor_type: string; actor_name?: string };
  object: { object_type: string; object_id: string; object_name?: string };
  risk_level: string;
  status: string;
  hash?: string;
  prev_hash?: string;
}

const RISK_COLOR: Record<string, string> = {
  low: "text-green-400 bg-green-500/10 border-green-500/20",
  medium: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
  high: "text-orange-400 bg-orange-500/10 border-orange-500/20",
  critical: "text-red-400 bg-red-500/10 border-red-500/20",
};

const STATUS_COLOR: Record<string, string> = {
  success: "text-green-400",
  failed: "text-red-400",
  blocked: "text-orange-400",
  pending: "text-yellow-400",
  overridden: "text-blue-400",
  preserved: "text-blue-400",
  sealed: "text-foreground-muted",
};

const CATEGORIES = [
  { value: "user_identity", label: "User & Identity" },
  { value: "content_lifecycle", label: "Content" },
  { value: "ai_agent", label: "AI & Agent" },
  { value: "approval", label: "Approval" },
  { value: "policy_governance", label: "Policy" },
  { value: "evidence_legal", label: "Evidence & Legal" },
  { value: "system_security", label: "Security" },
];

const ActorIcon = ({ type }: { type: string }) => {
  if (type === "ai_agent") return <Bot className="w-3 h-3" />;
  if (type === "system" || type === "service_account") return <Server className="w-3 h-3" />;
  return <User className="w-3 h-3" />;
};

function fmt(ts: string) {
  try { return new Date(ts).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }); }
  catch { return "—"; }
}

export default function AuditTrailPage() {
  const router = useRouter();
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [risk, setRisk] = useState("");
  const [status, setStatus] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [chainOk, setChainOk] = useState<boolean | null>(null);
  const [verifying, setVerifying] = useState(false);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (search) p.set("search", search);
      if (category) p.set("event_category", category);
      if (risk) p.set("risk_level", risk);
      if (status) p.set("status", status);
      p.set("limit", "50");
      const res = await api.get(`/api/audit-events?${p}`);
      if (res.success) { setEvents(res.data?.events || []); setTotal(res.data?.total || 0); }
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [search, category, risk, status]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const verifyChain = async () => {
    setVerifying(true);
    try {
      const res = await api.get("/api/audit-events/chain/verify");
      setChainOk(res.success && res.data?.failed_blocks === 0);
    } catch { setChainOk(false); }
    finally { setVerifying(false); }
  };

  const hasFilters = search || category || risk || status;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <FileSearch className="w-5 h-5 text-foreground-muted" /> Audit Trail
          </h1>
          <p className="text-xs text-foreground-muted mt-0.5">Tamper-proof record of every action on the platform</p>
        </div>
        <div className="flex items-center gap-2">
          {chainOk !== null && (
            <span className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border ${chainOk ? "text-green-400 border-green-500/20 bg-green-500/10" : "text-red-400 border-red-500/20 bg-red-500/10"}`}>
              {chainOk ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
              {chainOk ? "Chain intact" : "Chain broken"}
            </span>
          )}
          <button onClick={verifyChain} disabled={verifying}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-surface border border-border rounded-lg hover:bg-surface-hover text-foreground-muted disabled:opacity-50">
            <Shield className={`w-3.5 h-3.5 ${verifying ? "animate-spin" : ""}`} />
            {verifying ? "Verifying…" : "Verify Chain"}
          </button>
          <button onClick={fetchEvents} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-surface border border-border rounded-lg hover:bg-surface-hover text-foreground-muted">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          <p className="text-xs text-red-400 flex-1">{error}</p>
          <button onClick={() => setError(null)}><X className="w-3.5 h-3.5 text-red-400/60" /></button>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground-muted" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search events…"
            className="w-full bg-surface border border-border rounded-lg pl-8 pr-3 py-1.5 text-xs text-foreground" />
        </div>
        <select value={category} onChange={e => setCategory(e.target.value)}
          className="bg-surface border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground">
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <select value={risk} onChange={e => setRisk(e.target.value)}
          className="bg-surface border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground">
          <option value="">All Risk</option>
          {["low", "medium", "high", "critical"].map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <select value={status} onChange={e => setStatus(e.target.value)}
          className="bg-surface border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground">
          <option value="">All Status</option>
          {["success", "failed", "blocked", "pending", "overridden", "preserved", "sealed"].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        {hasFilters && (
          <button onClick={() => { setSearch(""); setCategory(""); setRisk(""); setStatus(""); }}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-foreground-muted hover:text-foreground">
            <X className="w-3 h-3" /> Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-foreground-muted">Loading events…</div>
        ) : events.length === 0 ? (
          <div className="p-12 text-center text-foreground-muted">
            <FileSearch className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No events found</p>
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-foreground-muted bg-surface-hover">
                <th className="text-left p-3 font-medium w-36">Time</th>
                <th className="text-left p-3 font-medium">Event</th>
                <th className="text-left p-3 font-medium">Actor</th>
                <th className="text-left p-3 font-medium">Object</th>
                <th className="text-left p-3 font-medium w-20">Risk</th>
                <th className="text-left p-3 font-medium w-20">Status</th>
                <th className="w-8 p-3" />
              </tr>
            </thead>
            <tbody>
              {events.map(ev => (
                <>
                  <tr key={ev.id}
                    onClick={() => router.push(`/evidence/audit-trail/events/${ev.id}`)}
                    className="border-b border-border last:border-0 hover:bg-surface-hover cursor-pointer">
                    <td className="p-3 text-foreground-muted font-mono text-[11px] whitespace-nowrap">{fmt(ev.timestamp_utc)}</td>
                    <td className="p-3">
                      <p className="font-medium text-foreground">{ev.event_title}</p>
                      <p className="text-[10px] text-foreground-muted mt-0.5">{ev.event_type}</p>
                    </td>
                    <td className="p-3">
                      <span className="flex items-center gap-1 text-foreground-muted">
                        <ActorIcon type={ev.actor?.actor_type} />
                        <span className="truncate max-w-[120px]">{ev.actor?.actor_name || ev.actor?.actor_type || "—"}</span>
                      </span>
                    </td>
                    <td className="p-3 text-foreground-muted text-[11px] max-w-[140px] truncate">
                      {ev.object?.object_type}{ev.object?.object_id ? ` · ${ev.object.object_id.substring(0, 8)}` : ""}
                    </td>
                    <td className="p-3">
                      <span className={`inline-block px-2 py-0.5 rounded border text-[10px] ${RISK_COLOR[ev.risk_level] || "text-foreground-muted border-border"}`}>
                        {ev.risk_level}
                      </span>
                    </td>
                    <td className={`p-3 text-[11px] font-medium ${STATUS_COLOR[ev.status] || "text-foreground-muted"}`}>
                      {ev.status}
                    </td>
                    <td className="p-3 text-foreground-muted"
                      onClick={e => { e.stopPropagation(); setExpanded(expanded === ev.id ? null : ev.id); }}>
                      {expanded === ev.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </td>
                  </tr>
                  {expanded === ev.id && (
                    <tr key={`${ev.id}-detail`} className="border-b border-border bg-surface-hover">
                      <td colSpan={7} className="px-4 py-3">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                          <div>
                            <p className="text-foreground-muted mb-1">Summary</p>
                            <p className="text-foreground">{ev.event_summary || "—"}</p>
                          </div>
                          <div>
                            <p className="text-foreground-muted mb-1">Event ID</p>
                            <p className="text-foreground font-mono">{ev.event_id}</p>
                          </div>
                          <div>
                            <p className="text-foreground-muted mb-1">Actor ID</p>
                            <p className="text-foreground font-mono">{ev.actor?.actor_id || "—"}</p>
                          </div>
                          {ev.hash && (
                            <div>
                              <p className="text-foreground-muted mb-1">Hash</p>
                              <p className="text-green-400 font-mono text-[10px]">{ev.hash.substring(0, 16)}…</p>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p className="text-xs text-foreground-muted mt-2">{total} total events</p>
    </div>
  );
}
