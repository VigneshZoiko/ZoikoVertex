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
  catch { return ts; }
}

export default function IdentityLedgerDashboard() {
  const [activeTab, setActiveTab] = useState<TabId>("actors");
  const [actors, setActors] = useState<IdentityActor[]>([]);
  const [delegations, setDelegations] = useState<Delegation[]>([]);
  const [breakGlassSessions, setBreakGlassSessions] = useState<BreakGlassSession[]>([]);
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterState, setFilterState] = useState("");
  const [selectedActor, setSelectedActor] = useState<string | null>(null);
  const [actorDetails, setActorDetails] = useState<any>(null);

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
    } catch { /* ignore */ }
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
    } catch { /* ignore */ }
    setVerifying(false);
  };

  const loadActorDetails = async (actorId: string) => {
    setSelectedActor(actorId);
    try {
      const res = await api.get(`/api/identity-ledger/actors/${actorId}`);
      if (res.success) setActorDetails(res.data);
    } catch { /* ignore */ }
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
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Fingerprint className="w-6 h-6 text-amber-500" />
            Identity Ledger
          </h1>
          <p className="text-[#888] mt-1">
            Cryptographically verified identity registry with delegation context, break-glass elevation, and point-in-time authority snapshots.
          </p>
        </div>
        <button onClick={fetchData} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#222] text-xs text-[#aaa] rounded-lg hover:bg-[#333]">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* Tab Bar */}
      <div className="flex items-center gap-1 mb-6 border-b border-[#222]">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs border-b-2 transition-colors ${
              activeTab === tab.id ? "text-amber-400 border-amber-400" : "text-[#666] border-transparent hover:text-white hover:border-[#444]"
            }`}>
            <tab.icon className="w-3.5 h-3.5" /> {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="min-h-[400px]">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
          </div>
        ) : (
          <>
            {/* ─── Actors Tab ──────────────────────────────────── */}
            {activeTab === "actors" && (
              <>
                <div className="flex items-center gap-3 mb-4 flex-wrap">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#555]" />
                    <input
                      placeholder="Search actors by name or ID..."
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      className="w-full bg-[#111] border border-[#222] rounded-lg pl-9 pr-3 py-2 text-sm text-white"
                    />
                  </div>
                  <select value={filterType} onChange={e => setFilterType(e.target.value)}
                    className="bg-[#1a1a1a] border border-[#333] rounded-lg px-2.5 py-1.5 text-xs text-[#ccc]">
                    <option value="">All Types</option>
                    <option value="human_user">Human</option>
                    <option value="ai_agent">AI Agent</option>
                    <option value="service_account">Service</option>
                    <option value="system">System</option>
                    <option value="external_reviewer">External</option>
                  </select>
                  <select value={filterState} onChange={e => setFilterState(e.target.value)}
                    className="bg-[#1a1a1a] border border-[#333] rounded-lg px-2.5 py-1.5 text-xs text-[#ccc]">
                    <option value="">All States</option>
                    <option value="active">Active</option>
                    <option value="restricted">Restricted</option>
                    <option value="suspended">Suspended</option>
                    <option value="revoked">Revoked</option>
                    <option value="break_glass_active">Break-Glass</option>
                  </select>
                  {hasFilters && (
                    <button onClick={clearFilters} className="px-2.5 py-1.5 text-xs text-[#888] hover:text-white flex items-center gap-1">
                      <X className="w-3 h-3" /> Clear
                    </button>
                  )}
                </div>

                <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-[#222] text-[#888]">
                          <th className="text-left p-3 font-medium">Actor</th>
                          <th className="text-left p-3 font-medium">Type</th>
                          <th className="text-left p-3 font-medium">State</th>
                          <th className="text-left p-3 font-medium">Class</th>
                          <th className="text-left p-3 font-medium">Risk</th>
                          <th className="text-right p-3 font-medium"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#222]">
                        {filteredActors.map(actor => (
                          <tr key={actor.id} className="hover:bg-white/[0.02] cursor-pointer"
                            onClick={() => loadActorDetails(actor.actor_id)}>
                            <td className="p-3">
                              <div className="text-sm font-medium text-white">{actor.display_name}</div>
                              <div className="text-[10px] text-[#666] font-mono">{actor.actor_id}</div>
                            </td>
                            <td className="p-3 text-[#aaa] text-[11px] uppercase tracking-wider">{actor.actor_type.replace(/_/g, ' ')}</td>
                            <td className="p-3">
                              <span className={`inline-block px-2 py-0.5 rounded text-[10px] border ${
                                actor.state === 'break_glass_active' ? 'text-amber-400 border-amber-400/30 bg-amber-400/10' :
                                actor.state === 'active' ? 'text-green-400 border-green-400/30 bg-green-400/10' :
                                actor.state === 'revoked' ? 'text-red-400 border-red-400/30 bg-red-400/10' :
                                actor.state === 'suspended' ? 'text-orange-400 border-orange-400/30 bg-orange-400/10' :
                                'text-slate-400 border-slate-400/30 bg-slate-400/10'
                              }`}>{actor.state.replace(/_/g, ' ')}</span>
                            </td>
                            <td className="p-3 text-[#888] text-[11px]">{actor.authority_class}</td>
                            <td className="p-3">
                              <span className={`inline-block px-2 py-0.5 rounded text-[10px] ${
                                actor.risk_level === 'critical' ? 'bg-red-400/10 text-red-400' :
                                actor.risk_level === 'high' ? 'bg-orange-400/10 text-orange-400' :
                                actor.risk_level === 'medium' ? 'bg-amber-400/10 text-amber-400' :
                                'bg-blue-400/10 text-blue-400'
                              }`}>{actor.risk_level}</span>
                            </td>
                            <td className="p-3 text-right">
                              <ChevronRight className="w-4 h-4 text-[#444] inline-block" />
                            </td>
                          </tr>
                        ))}
                        {filteredActors.length === 0 && (
                          <tr><td colSpan={6} className="p-12 text-center text-[#555]">
                            <UserCheck className="w-8 h-8 mx-auto mb-2 text-[#333]" />
                            <p className="text-sm">No actors found</p>
                            {hasFilters && <p className="text-xs mt-1 text-[#444]">Try clearing filters</p>}
                          </td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="text-xs text-[#555] mt-2">{filteredActors.length} actor{filteredActors.length !== 1 ? 's' : ''}</div>
              </>
            )}

            {/* ─── Delegations Tab ─────────────────────────────── */}
            {activeTab === "delegations" && (
              <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-[#222] text-[#888]">
                        <th className="text-left p-3 font-medium">Delegator</th>
                        <th className="text-left p-3 font-medium">Delegatee</th>
                        <th className="text-left p-3 font-medium">Status</th>
                        <th className="text-left p-3 font-medium">Expires</th>
                        <th className="text-left p-3 font-medium">Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#222]">
                      {delegations.map(del => (
                        <tr key={del.id} className="hover:bg-white/[0.02]">
                          <td className="p-3 font-mono text-[11px] text-[#ccc]">{del.delegator_id}</td>
                          <td className="p-3 font-mono text-[11px] text-[#ccc]">{del.delegatee_id}</td>
                          <td className="p-3">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] border ${
                              del.status === 'ACTIVE' ? 'text-green-400 border-green-400/30 bg-green-400/10' :
                              del.status === 'REVOKED' ? 'text-red-400 border-red-400/30 bg-red-400/10' :
                              'text-slate-400 border-slate-400/30 bg-slate-400/10'
                            }`}>{del.status}</span>
                          </td>
                          <td className="p-3 text-[#888] text-[11px]">{fmt(del.expires_at)}</td>
                          <td className="p-3 text-[#888] text-[11px]">{del.reason || <span className="text-[#555]">—</span>}</td>
                        </tr>
                      ))}
                      {delegations.length === 0 && (
                        <tr><td colSpan={5} className="p-12 text-center text-[#555]">
                          <ArrowRightLeft className="w-8 h-8 mx-auto mb-2 text-[#333]" />
                          <p className="text-sm">No delegations found</p>
                        </td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ─── Break-Glass Tab ──────────────────────────────── */}
            {activeTab === "breakglass" && (
              <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-[#222] text-[#888]">
                        <th className="text-left p-3 font-medium">Actor ID</th>
                        <th className="text-left p-3 font-medium">Reason</th>
                        <th className="text-left p-3 font-medium">Status</th>
                        <th className="text-left p-3 font-medium">Started</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#222]">
                      {breakGlassSessions.map(session => (
                        <tr key={session.id} className="hover:bg-white/[0.02]">
                          <td className="p-3 font-mono text-[11px] text-[#ccc]">{session.actor_id}</td>
                          <td className="p-3 text-[#ccc] text-sm">{session.reason}</td>
                          <td className="p-3">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] border ${
                              session.status === 'ACTIVE' ? 'text-amber-400 border-amber-400/30 bg-amber-400/10 animate-pulse' :
                              session.status === 'ENDED' ? 'text-slate-400 border-slate-400/30 bg-slate-400/10' :
                              'text-red-400 border-red-400/30 bg-red-400/10'
                            }`}>{session.status}</span>
                          </td>
                          <td className="p-3 text-[#888] text-[11px]">{fmt(session.starts_at)}</td>
                        </tr>
                      ))}
                      {breakGlassSessions.length === 0 && (
                        <tr><td colSpan={4} className="p-12 text-center text-[#555]">
                          <ShieldAlert className="w-8 h-8 mx-auto mb-2 text-[#333]" />
                          <p className="text-sm">No emergency sessions</p>
                        </td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ─── Verify Tab ────────────────────────────────────── */}
            {activeTab === "verify" && (
              <div className="bg-[#111] border border-[#222] rounded-xl p-10 space-y-8 text-center max-w-3xl mx-auto">
                <ShieldCheck className="w-16 h-16 text-amber-500/20 mx-auto" />
                <div className="space-y-3">
                  <h2 className="text-xl font-bold text-white">Ledger Chain Integrity Verification</h2>
                  <p className="text-sm text-[#888]">
                    Verify the unbroken chain of authority snapshots and ledger entries to assure zero tampering in the identity state.
                  </p>
                </div>

                <button
                  onClick={verifyChain}
                  disabled={verifying}
                  className="px-6 py-3 bg-amber-500 text-black rounded-lg text-sm font-medium hover:bg-amber-400 disabled:opacity-50"
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
                      ? 'bg-green-500/10 border-green-500/30'
                      : 'bg-red-500/10 border-red-500/30'
                  }`}>
                    <div className="flex items-center gap-3 mb-2">
                      <Activity className={`w-5 h-5 ${verificationResult.status === 'verified' ? 'text-green-400' : 'text-red-400'}`} />
                      <div>
                        <p className={`text-sm font-medium ${verificationResult.status === 'verified' ? 'text-green-400' : 'text-red-400'}`}>
                          Chain {verificationResult.status}
                        </p>
                        <p className="text-xs text-[#888] mt-0.5">
                          {verificationResult.verified_entry_count} ledger entr{verificationResult.verified_entry_count === 1 ? 'y' : 'ies'} verified.
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
          <div className="bg-[#151515] border border-[#333] rounded-xl p-6 w-full max-w-lg mx-4 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-white">{actorDetails.actor?.display_name || selectedActor}</h2>
                <p className="text-[10px] text-[#666] font-mono mt-0.5">{selectedActor}</p>
              </div>
              <button onClick={() => setSelectedActor(null)}>
                <X className="w-4 h-4 text-[#666] hover:text-white" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="border border-[#222] rounded-lg p-3">
                <h5 className="text-[10px] font-medium text-[#888] uppercase tracking-wider mb-2">Authority Snapshot</h5>
                <pre className="text-[10px] text-green-400 font-mono overflow-x-auto whitespace-pre-wrap">
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
