"use client";

import React, { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import {
  Users, X, RefreshCw,
  AlertTriangle, ChevronDown, ChevronUp, History,
} from "lucide-react";

type TabId = "actors" | "history";

const TABS = [
  { id: "actors" as TabId,  label: "Actors",  icon: Users },
  { id: "history" as TabId, label: "History", icon: History },
];

const ACTOR_TYPE_BADGE: Record<string, { label: string; cls: string }> = {
  human_user:      { label: "HU",  cls: "text-blue-400 border-blue-500/60" },
  human:           { label: "HU",  cls: "text-blue-400 border-blue-500/60" },
  ai_agent:        { label: "AI",  cls: "text-purple-400 border-purple-500/60" },
  service_account: { label: "SER", cls: "text-yellow-400 border-yellow-500/60" },
  system:          { label: "SY",  cls: "text-foreground-muted border-border" },
};

const STATE_PILL: Record<string, string> = {
  active:      "text-green-400 border-green-500/60",
  suspended:   "text-orange-400 border-orange-500/60",
  deactivated: "text-foreground-muted border-border",
};

function fmt(ts: string) {
  try {
    return new Date(ts).toLocaleDateString("en-US", {
      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
  } catch { return "—"; }
}

export default function IdentityLedgerPage() {
  const [tab, setTab] = useState<TabId>("actors");
  const [error, setError] = useState<string | null>(null);

  // Actors
  const [actors, setActors] = useState<any[]>([]);
  const [actorsLoading, setActorsLoading] = useState(false);
  const [typeFilter, setTypeFilter] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [actorEntries, setActorEntries] = useState<Record<string, any[]>>({});

  // History (ledger entries)
  const [entries, setEntries] = useState<any[]>([]);
  const [entriesLoading, setEntriesLoading] = useState(false);
  const [entriesTotal, setEntriesTotal] = useState(0);
  const [showAllEntries, setShowAllEntries] = useState(false);

  const fetchActors = useCallback(async (forceRefresh = false) => {
    setActorsLoading(true);
    try {
      const p = new URLSearchParams();
      if (typeFilter) p.set("actor_type", typeFilter);
      if (stateFilter) p.set("state", stateFilter);
      p.set("limit", "50");
      if (forceRefresh) p.set("refresh", "true");
      const res = await api.get(`/api/identity-ledger/actors?${p}`);
      if (res.success) {
        const sorted = (res.data || []).sort((a: any, b: any) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        setActors(sorted);
      }
    } catch (e: any) { setError(e.message); }
    finally { setActorsLoading(false); }
  }, [typeFilter, stateFilter]);

  const fetchEntries = useCallback(async (all = false) => {
    setEntriesLoading(true);
    try {
      const res = await api.get(`/api/identity-ledger/entries?limit=50${all ? "&all=true" : ""}`);
      if (res.success) { setEntries(res.data || []); setEntriesTotal(res.total || 0); }
    } catch (e: any) { setError(e.message); }
    finally { setEntriesLoading(false); }
  }, []);

  const fetchActorEntries = useCallback(async (actorId: string) => {
    if (actorEntries[actorId]) return;
    try {
      const res = await api.get(`/api/identity-ledger/entries?actor_id=${actorId}&limit=10`);
      if (res.success) setActorEntries(prev => ({ ...prev, [actorId]: res.data || [] }));
    } catch { /* non-blocking */ }
  }, [actorEntries]);

  useEffect(() => {
    if (tab === "actors") fetchActors();
    else fetchEntries(showAllEntries);
  }, [tab, fetchActors, fetchEntries, showAllEntries]);

  const refresh = () => {
    if (tab === "actors") fetchActors(true);
    else fetchEntries(showAllEntries);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-5 gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Users className="w-5 h-5 text-foreground-muted" /> Identity Ledger
          </h1>
          <p className="text-xs text-foreground-muted mt-0.5">
            Immutable actor registry
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button onClick={refresh}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-surface border border-border rounded-lg hover:bg-surface-hover text-foreground-muted">
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

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border mb-5 overflow-x-auto">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs border-b-2 transition-colors whitespace-nowrap ${
              tab === t.id ? "text-blue-400 border-blue-500" : "text-foreground-muted border-transparent hover:text-foreground"
            }`}>
            <t.icon className="w-3.5 h-3.5" /> {t.label}
          </button>
        ))}
      </div>

      {/* ── ACTORS ── */}
      {tab === "actors" && (
        <>
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
              className="bg-surface border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground">
              <option value="">All Types</option>
              <option value="human_user">Human</option>
              <option value="ai_agent">AI Agent</option>
              <option value="service_account">Service Account</option>
              <option value="system">System</option>
            </select>
            <select value={stateFilter} onChange={e => setStateFilter(e.target.value)}
              className="bg-surface border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground">
              <option value="">All States</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="deactivated">Deactivated</option>
            </select>
            {(typeFilter || stateFilter) && (
              <button onClick={() => { setTypeFilter(""); setStateFilter(""); }}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-foreground-muted hover:text-foreground">
                <X className="w-3 h-3" /> Clear
              </button>
            )}
          </div>

          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            {actorsLoading ? (
              <div className="p-10 text-center text-xs text-foreground-muted">Loading…</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs min-w-[580px]">
                  <thead>
                    <tr className="border-b border-border text-foreground-muted bg-surface-hover">
                      <th className="text-left p-3 font-medium">Actor</th>
                      <th className="text-left p-3 font-medium">Type</th>
                      <th className="text-left p-3 font-medium">State</th>
                      <th className="text-left p-3 font-medium">Autonomy</th>
                      <th className="text-left p-3 font-medium">Registered</th>
                      <th className="w-8 p-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {actors.map((a: any) => {
                      const typeBadge = ACTOR_TYPE_BADGE[a.actor_type] ?? { label: (a.actor_type || "?").substring(0, 3).toUpperCase(), cls: "text-foreground-muted border-border" };
                      const statePill = STATE_PILL[a.state] ?? "text-foreground-muted border-border";
                      return (
                        <React.Fragment key={a.id}>
                          <tr onClick={() => setExpanded(expanded === a.id ? null : a.id)}
                            className="border-b border-border last:border-0 hover:bg-surface-hover cursor-pointer">
                            <td className="p-3">
                              <p className="font-medium text-foreground">{a.display_name || a.email || a.actor_id}</p>
                              <p className="text-[10px] text-foreground-muted font-mono mt-0.5">{a.actor_id}</p>
                            </td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded border text-[10px] font-bold tracking-wider bg-transparent ${typeBadge.cls}`}>
                                {typeBadge.label}
                              </span>
                            </td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded border text-[10px] font-bold tracking-wider bg-transparent ${statePill}`}>
                                {(a.state || "—").toUpperCase()}
                              </span>
                            </td>
                            <td className="p-3 text-foreground-muted text-[11px]">
                              {a.autonomy_level != null ? `D${a.autonomy_level}` : "—"}
                            </td>
                            <td className="p-3 text-foreground-muted text-[11px]">{fmt(a.created_at)}</td>
                            <td className="p-3 text-foreground-muted">
                              {expanded === a.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </td>
                          </tr>
                          {expanded === a.id && (
                            <tr className="border-b border-border bg-surface-hover">
                              <td colSpan={6} className="px-4 py-3 space-y-3">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                                  <div><p className="text-foreground-muted mb-1">Email</p><p className="text-foreground">{a.email || "—"}</p></div>
                                  <div><p className="text-foreground-muted mb-1">Roles</p><p className="text-foreground">{(a.current_roles || a.roles || []).join(", ") || "—"}</p></div>
                                  <div><p className="text-foreground-muted mb-1">Department</p><p className="text-foreground">{a.department || "—"}</p></div>
                                  <div><p className="text-foreground-muted mb-1">Last Active</p><p className="text-foreground">{a.last_active_at ? fmt(a.last_active_at) : "—"}</p></div>
                                </div>
                                <ActorLedgerHistory entries={actorEntries[a.actor_id]} onLoad={() => fetchActorEntries(a.actor_id)} />
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                    {actors.length === 0 && !actorsLoading && (
                      <tr><td colSpan={6} className="p-10 text-center text-foreground-muted">
                        <Users className="w-7 h-7 mx-auto mb-2 opacity-30" />
                        <p>No actors registered yet</p>
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── HISTORY ── */}
      {tab === "history" && (
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          {entriesLoading ? (
            <div className="p-10 text-center text-xs text-foreground-muted">Loading…</div>
          ) : (
            <>
              <div className="px-4 py-2.5 border-b border-border flex items-center justify-between">
                <span className="text-xs text-foreground-muted">{entriesTotal} entries</span>
                <button
                  onClick={() => setShowAllEntries(v => !v)}
                  className="text-[10px] px-2 py-1 rounded border border-border text-foreground-muted hover:text-foreground hover:bg-surface-hover"
                >
                  {showAllEntries ? "Hide routine syncs" : "Show all (incl. routine syncs)"}
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs min-w-[640px]">
                  <thead>
                    <tr className="border-b border-border text-foreground-muted bg-surface-hover">
                      <th className="text-left p-3 font-medium">When</th>
                      <th className="text-left p-3 font-medium">Event</th>
                      <th className="text-left p-3 font-medium">Actor</th>
                      <th className="text-left p-3 font-medium">Change</th>
                      <th className="text-left p-3 font-medium">Risk</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((e: any) => {
                      const change = e.authority_change || {};
                      const changeLabel = change.roles
                        ? `→ ${change.roles.join(", ")}`
                        : change.change
                        ? change.change.replace(/_/g, " ")
                        : change.key_name
                        ? `Key: ${change.key_name}`
                        : "—";
                      return (
                        <tr key={e.ledger_entry_id} className="border-b border-border last:border-0 hover:bg-surface-hover">
                          <td className="p-3 text-foreground-muted whitespace-nowrap">
                            {fmt(e.timestamp_utc || e.created_at)}
                          </td>
                          <td className="p-3">
                            <span className="font-mono text-[10px] bg-surface-hover px-1.5 py-0.5 rounded text-blue-400 border border-blue-500/30">
                              {e.entry_type}
                            </span>
                          </td>
                          <td className="p-3 text-foreground-muted font-mono text-[10px] max-w-[120px] truncate" title={e.actor_id}>
                            {e.actor_id?.substring(0, 12)}…
                          </td>
                          <td className="p-3 text-foreground-muted text-[11px]">{changeLabel}</td>
                          <td className="p-3">
                            <span className={`text-[10px] font-medium ${
                              e.risk?.risk_level === "high" || e.risk?.level === "high"
                                ? "text-red-400"
                                : e.risk?.risk_level === "medium" || e.risk?.level === "medium"
                                ? "text-orange-400"
                                : "text-foreground-muted"
                            }`}>
                              {e.risk?.risk_level || e.risk?.level || "—"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                    {entries.length === 0 && (
                      <tr><td colSpan={5} className="p-10 text-center text-foreground-muted">
                        <History className="w-7 h-7 mx-auto mb-2 opacity-30" />
                        <p>No ledger entries yet</p>
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Actor Ledger History (inline in expanded row) ─────────────────────────────
function ActorLedgerHistory({ entries, onLoad }: { entries: any[] | undefined; onLoad: () => void }) {
  const [loaded, setLoaded] = React.useState(false);
  React.useEffect(() => { if (!loaded) { onLoad(); setLoaded(true); } }, [loaded, onLoad]);

  const ENTRY_LABELS: Record<string, string> = {
    'user.role_changed': 'Role Changed',
    'api_key.revoked':   'API Key Revoked',
    'actor.registered':  'Actor Registered',
  };

  if (!entries) return <p className="text-[10px] text-foreground-muted">Loading history…</p>;
  if (entries.length === 0) return <p className="text-[10px] text-foreground-muted">No notable ledger events for this actor.</p>;

  return (
    <div>
      <p className="text-[10px] font-medium text-foreground-muted mb-1.5 uppercase tracking-wide">Recent Activity</p>
      <div className="space-y-1">
        {entries.map((e: any) => {
          const change = e.authority_change || {};
          const detail = change.roles ? `→ ${change.roles.join(", ")}` : change.key_name ? `Key: ${change.key_name}` : change.change?.replace(/_/g, " ") || "";
          return (
            <div key={e.ledger_entry_id} className="flex items-center gap-2 text-[11px]">
              <span className="text-foreground-muted whitespace-nowrap">
                {e.timestamp_utc ? new Date(e.timestamp_utc).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
              </span>
              <span className="font-mono text-[10px] text-blue-400 bg-blue-500/10 px-1 rounded">
                {ENTRY_LABELS[e.entry_type] || e.entry_type}
              </span>
              {detail && <span className="text-foreground-muted">{detail}</span>}
              {(e.risk?.risk_level === "high" || e.risk?.level === "high") && (
                <span className="text-[9px] text-red-400 border border-red-500/40 px-1 rounded">HIGH</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
