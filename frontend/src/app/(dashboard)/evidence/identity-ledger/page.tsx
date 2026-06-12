"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Fingerprint, ShieldCheck, UserCheck, ArrowRightLeft, ShieldAlert,
  Search, X, ChevronRight, Loader2, RefreshCw, Activity,
} from "lucide-react";
import { api } from "@/lib/api";

interface IdentityActor {
  id: string;
  actor_id: string;
  actor_type: string;
  display_name: string;
  state: string;
  authority_class: string;
  risk_level: string;
  current_roles: string[];
}

interface Delegation {
  id: string;
  delegator_id: string;
  delegatee_id: string;
  status: string;
  starts_at: string;
  expires_at: string;
  reason: string;
}

interface BreakGlassSession {
  id: string;
  actor_id: string;
  status: string;
  reason: string;
  starts_at: string;
  ends_at: string | null;
}

type TabId = "actors" | "delegations" | "breakglass" | "verify";

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "actors", label: "Directory", icon: UserCheck },
  { id: "delegations", label: "Delegations", icon: ArrowRightLeft },
  { id: "breakglass", label: "Break-Glass", icon: ShieldAlert },
  { id: "verify", label: "Chain Verification", icon: ShieldCheck },
];

function fmt(ts: string) {
  try { return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }); }
  catch { return "Invalid date"; }
}

export default function IdentityLedgerDashboard() {
  const [activeTab, setActiveTab] = useState<TabId>("actors");
  const [actors, setActors] = useState<IdentityActor[]>([]);
  const [delegations, setDelegations] = useState<Delegation[]>([]);
  const [breakGlassSessions, setBreakGlassSessions] = useState<BreakGlassSession[]>([]);
  const [verificationResult, setVerificationResult] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterState, setFilterState] = useState("");
  const [selectedActor, setSelectedActor] = useState<string | null>(null);
  const [actorDetails, setActorDetails] = useState<Record<string, unknown> | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTab === "actors") {
        const res = await api.get("/api/identity-ledger/actors");
        if (res.success) setActors(res.data);
      } else if (activeTab === "delegations") {
        const res = await api.get("/api/identity-ledger/delegations");
        if (res.success) setDelegations(res.data);
      } else if (activeTab === "breakglass") {
        const res = await api.get("/api/identity-ledger/break-glass");
        if (res.success) setBreakGlassSessions(res.data);
      }
    } catch (e: unknown) { setError((e as Error).message || "Failed to fetch data"); }
    setLoading(false);
  }, [activeTab]);

  useEffect(() => {
    fetchData();
  }, [activeTab, fetchData]);

  const verifyChain = async () => {
    setVerifying(true);
    try {
      const res = await api.get("/api/identity-ledger/chain/verify");
      if (res.success) setVerificationResult(res.data);
    } catch (e: unknown) { setVerificationResult({ status: "error", message: (e as Error).message || "Verification failed" }); }
    setVerifying(false);
  };

  const loadActorDetails = async (actorId: string) => {
    setSelectedActor(actorId);
    try {
      const res = await api.get(`/api/identity-ledger/actors/${actorId}`);
      if (res.success) setActorDetails(res.data);
    } catch (e: unknown) { setError((e as Error).message || "Failed to load actor details"); }
  };

  const filteredActors = actors.filter(a => {
    if (search) {
      const q = search.toLowerCase();
      if (!a.display_name.toLowerCase().includes(q) && !a.actor_id.toLowerCase().includes(q)) return false;
    }
    if (filterType && a.actor_type !== filterType) return false;
    if (filterState && a.state !== filterState) return false;
    return true;
  });

  const clearFilters = () => { setSearch(""); setFilterType(""); setFilterState(""); };
  const hasFilters = search || filterType || filterState;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <Fingerprint className="w-6 h-6 text-warning-text" />
            Identity Ledger
          </h1>
          <p className="text-foreground-muted mt-1">
            Cryptographically verified identity registry with delegation context, break-glass elevation, and point-in-time authority snapshots.
          </p>
        </div>
        <button onClick={fetchData} className="flex items-center gap-1.5 px-3 py-1.5 bg-surface text-xs text-foreground-muted rounded-lg hover:bg-surface-hover border border-border">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* Tab Bar */}
      <div className="flex items-center gap-1 mb-6 border-b border-border">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs border-b-2 transition-colors ${
              activeTab === tab.id ? "text-warning-text border-warning-border" : "text-foreground-muted border-transparent hover:text-foreground hover:border-border"
            }`}>
            <tab.icon className="w-3.5 h-3.5" /> {tab.label}
          </button>
        ))}
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mb-4 p-3 bg-error-bg border border-error-border rounded-lg flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-error-text shrink-0" />
          <p className="text-xs text-error-text">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto text-error-text/60 hover:text-error-text"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* Content */}
      <div className="min-h-[400px]">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 text-warning-text animate-spin" />
          </div>
        ) : (
          <>
            {/* Actors Tab */}
            {activeTab === "actors" && (
              <>
                <div className="flex items-center gap-3 mb-4 flex-wrap">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
                    <input
                      placeholder="Search actors by name or ID..."
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      className="w-full bg-card border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-foreground"
                    />
                  </div>
                  <select value={filterType} onChange={e => setFilterType(e.target.value)}
                    className="bg-card border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground">
                    <option value="">All Types</option>
                    <option value="human_user">Human</option>
                    <option value="ai_agent">AI Agent</option>
                    <option value="service_account">Service</option>
                    <option value="system">System</option>
                    <option value="external_reviewer">External</option>
                  </select>
                  <select value={filterState} onChange={e => setFilterState(e.target.value)}
                    className="bg-card border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground">
                    <option value="">All States</option>
                    <option value="active">Active</option>
                    <option value="restricted">Restricted</option>
                    <option value="suspended">Suspended</option>
                    <option value="revoked">Revoked</option>
                    <option value="break_glass_active">Break-Glass</option>
                  </select>
                  {hasFilters && (
                    <button onClick={clearFilters} className="px-2.5 py-1.5 text-xs text-foreground-muted hover:text-foreground flex items-center gap-1">
                      <X className="w-3 h-3" /> Clear
                    </button>
                  )}
                </div>

                <div className="bg-card border border-border rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border text-foreground-muted">
                          <th className="text-left p-3 font-medium">Actor</th>
                          <th className="text-left p-3 font-medium">Type</th>
                          <th className="text-left p-3 font-medium">State</th>
                          <th className="text-left p-3 font-medium">Class</th>
                          <th className="text-left p-3 font-medium">Risk</th>
                          <th className="text-right p-3 font-medium"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {filteredActors.map(actor => (
                          <tr key={actor.id} className="hover:bg-surface-hover cursor-pointer"
                            onClick={() => loadActorDetails(actor.actor_id)}>
                            <td className="p-3">
                              <div className="text-sm font-medium text-foreground">{actor.display_name}</div>
                              <div className="text-[10px] text-foreground-muted font-mono">{actor.actor_id}</div>
                            </td>
                            <td className="p-3 text-foreground-muted text-[11px] uppercase tracking-wider">{actor.actor_type.replace(/_/g, ' ')}</td>
                            <td className="p-3">
                              <span className={`inline-block px-2 py-0.5 rounded text-[10px] border ${
                                actor.state === 'break_glass_active' ? 'text-warning-text border-warning-border bg-warning-bg' :
                                actor.state === 'active' ? 'text-success-text border-success-border bg-success-bg' :
                                actor.state === 'revoked' ? 'text-error-text border-error-border bg-error-bg' :
                                actor.state === 'suspended' ? 'text-warning-text border-warning-border bg-warning-bg' :
                                'text-info-text border-info-border bg-info-bg'
                              }`}>{actor.state.replace(/_/g, ' ')}</span>
                            </td>
                            <td className="p-3 text-foreground-muted text-[11px]">{actor.authority_class}</td>
                            <td className="p-3">
                              <span className={`inline-block px-2 py-0.5 rounded text-[10px] ${
                                actor.risk_level === 'critical' ? 'bg-error-bg text-error-text' :
                                actor.risk_level === 'high' ? 'bg-warning-bg text-warning-text' :
                                actor.risk_level === 'medium' ? 'bg-warning-bg text-warning-text' :
                                'bg-info-bg text-info-text'
                              }`}>{actor.risk_level}</span>
                            </td>
                            <td className="p-3 text-right">
                              <ChevronRight className="w-4 h-4 text-foreground-muted inline-block" />
                            </td>
                          </tr>
                        ))}
                        {filteredActors.length === 0 && (
                          <tr><td colSpan={6} className="p-12 text-center text-foreground-muted">
                            <UserCheck className="w-8 h-8 mx-auto mb-2 opacity-30" />
                            <p className="text-sm">No actors found</p>
                            {hasFilters && <p className="text-xs mt-1 opacity-60">Try clearing filters</p>}
                          </td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="text-xs text-foreground-muted mt-2">{filteredActors.length} actor{filteredActors.length !== 1 ? 's' : ''}</div>
              </>
            )}

            {/* Delegations Tab */}
            {activeTab === "delegations" && (
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border text-foreground-muted">
                        <th className="text-left p-3 font-medium">Delegator</th>
                        <th className="text-left p-3 font-medium">Delegatee</th>
                        <th className="text-left p-3 font-medium">Status</th>
                        <th className="text-left p-3 font-medium">Expires</th>
                        <th className="text-left p-3 font-medium">Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {delegations.map(del => (
                        <tr key={del.id} className="hover:bg-surface-hover">
                          <td className="p-3 font-mono text-[11px] text-foreground">{del.delegator_id}</td>
                          <td className="p-3 font-mono text-[11px] text-foreground">{del.delegatee_id}</td>
                          <td className="p-3">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] border ${
                              del.status === 'ACTIVE' ? 'text-success-text border-success-border bg-success-bg' :
                              del.status === 'REVOKED' ? 'text-error-text border-error-border bg-error-bg' :
                              'text-info-text border-info-border bg-info-bg'
                            }`}>{del.status}</span>
                          </td>
                          <td className="p-3 text-foreground-muted text-[11px]">{fmt(del.expires_at)}</td>
                          <td className="p-3 text-foreground-muted text-[11px]">{del.reason || <span className="opacity-40">—</span>}</td>
                        </tr>
                      ))}
                      {delegations.length === 0 && (
                        <tr><td colSpan={5} className="p-12 text-center text-foreground-muted">
                          <ArrowRightLeft className="w-8 h-8 mx-auto mb-2 opacity-30" />
                          <p className="text-sm">No delegations found</p>
                        </td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Break-Glass Tab */}
            {activeTab === "breakglass" && (
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border text-foreground-muted">
                        <th className="text-left p-3 font-medium">Actor ID</th>
                        <th className="text-left p-3 font-medium">Reason</th>
                        <th className="text-left p-3 font-medium">Status</th>
                        <th className="text-left p-3 font-medium">Started</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {breakGlassSessions.map(session => (
                        <tr key={session.id} className="hover:bg-surface-hover">
                          <td className="p-3 font-mono text-[11px] text-foreground">{session.actor_id}</td>
                          <td className="p-3 text-foreground text-sm">{session.reason}</td>
                          <td className="p-3">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] border ${
                              session.status === 'ACTIVE' ? 'text-warning-text border-warning-border bg-warning-bg animate-pulse' :
                              session.status === 'ENDED' ? 'text-info-text border-info-border bg-info-bg' :
                              'text-error-text border-error-border bg-error-bg'
                            }`}>{session.status}</span>
                          </td>
                          <td className="p-3 text-foreground-muted text-[11px]">{fmt(session.starts_at)}</td>
                        </tr>
                      ))}
                      {breakGlassSessions.length === 0 && (
                        <tr><td colSpan={4} className="p-12 text-center text-foreground-muted">
                          <ShieldAlert className="w-8 h-8 mx-auto mb-2 opacity-30" />
                          <p className="text-sm">No emergency sessions</p>
                        </td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Verify Tab */}
            {activeTab === "verify" && (
              <div className="bg-card border border-border rounded-xl p-10 space-y-8 text-center max-w-3xl mx-auto">
                <ShieldCheck className="w-16 h-16 text-warning-text/20 mx-auto" />
                <div className="space-y-3">
                  <h2 className="text-xl font-bold text-foreground">Ledger Chain Integrity Verification</h2>
                  <p className="text-sm text-foreground-muted">
                    Verify the unbroken chain of authority snapshots and ledger entries to assure zero tampering in the identity state.
                  </p>
                </div>

                <button
                  onClick={verifyChain}
                  disabled={verifying}
                  className="px-6 py-3 bg-warning-text text-black rounded-lg text-sm font-medium hover:brightness-110 disabled:opacity-50"
                >
                  {verifying ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> Verifying...
                    </span>
                  ) : "Run Chain Integrity Scan"}
                </button>

                {verificationResult && (
                  <div className={`p-5 rounded-xl border text-left ${
                    verificationResult.status === 'verified'
                      ? 'bg-success-bg border-success-border'
                      : 'bg-error-bg border-error-border'
                  }`}>
                    <div className="flex items-center gap-3 mb-2">
                      <Activity className={`w-5 h-5 ${verificationResult.status === 'verified' ? 'text-success-text' : 'text-error-text'}`} />
                      <div>
                        <p className={`text-sm font-medium ${verificationResult.status === 'verified' ? 'text-success-text' : 'text-error-text'}`}>
                          Chain {verificationResult.status as string}
                        </p>
                        <p className="text-xs text-foreground-muted mt-0.5">
                          {verificationResult.verified_entry_count as number} ledger entr{(verificationResult.verified_entry_count as number) === 1 ? 'y' : 'ies'} verified.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Actor Detail Modal */}
      {selectedActor && actorDetails && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center" onClick={() => setSelectedActor(null)}>
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-lg mx-4 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-foreground">{(actorDetails.actor as Record<string, unknown>)?.display_name as string || selectedActor}</h2>
                <p className="text-[10px] text-foreground-muted font-mono mt-0.5">{selectedActor}</p>
              </div>
              <button onClick={() => setSelectedActor(null)}>
                <X className="w-4 h-4 text-foreground-muted hover:text-foreground" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="border border-border rounded-lg p-3">
                <h5 className="text-[10px] font-medium text-foreground-muted uppercase tracking-wider mb-2">Authority Snapshot</h5>
                <pre className="text-[10px] text-success-text font-mono overflow-x-auto whitespace-pre-wrap">
                  {JSON.stringify(actorDetails.current_authority_snapshot, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
