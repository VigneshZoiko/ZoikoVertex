"use client";

import React, { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import {
  Users, GitBranch, ShieldAlert, Plus, X, RefreshCw,
  AlertTriangle, CheckCircle2, Shield, ChevronDown, ChevronUp,
} from "lucide-react";

type TabId = "actors" | "delegations" | "break-glass";

const TABS = [
  { id: "actors" as TabId,      label: "Actors",      icon: Users },
  { id: "delegations" as TabId, label: "Delegations", icon: GitBranch },
  { id: "break-glass" as TabId, label: "Break-Glass", icon: ShieldAlert },
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

  // Chain verification
  const [chainResult, setChainResult] = useState<{ ok: boolean; blocks: number } | null>(null);
  const [verifying, setVerifying] = useState(false);

  // Actors
  const [actors, setActors] = useState<any[]>([]);
  const [actorsLoading, setActorsLoading] = useState(false);
  const [typeFilter, setTypeFilter] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  // Delegations
  const [delegations, setDelegations] = useState<any[]>([]);
  const [delegationsLoading, setDelegationsLoading] = useState(false);
  const [showCreateDelegation, setShowCreateDelegation] = useState(false);

  // Break-glass
  const [bgSessions, setBgSessions] = useState<any[]>([]);
  const [bgLoading, setBgLoading] = useState(false);
  const [showRequestBg, setShowRequestBg] = useState(false);

  const fetchActors = useCallback(async () => {
    setActorsLoading(true);
    try {
      const p = new URLSearchParams();
      if (typeFilter) p.set("actor_type", typeFilter);
      if (stateFilter) p.set("state", stateFilter);
      p.set("limit", "50");
      const res = await api.get(`/api/identity-ledger/actors?${p}`);
      if (res.success) setActors(res.data || []);
    } catch (e: any) { setError(e.message); }
    finally { setActorsLoading(false); }
  }, [typeFilter, stateFilter]);

  const fetchDelegations = useCallback(async () => {
    setDelegationsLoading(true);
    try {
      const res = await api.get("/api/identity-ledger/delegations");
      if (res.success) setDelegations(res.data || []);
    } catch (e: any) { setError(e.message); }
    finally { setDelegationsLoading(false); }
  }, []);

  const fetchBreakGlass = useCallback(async () => {
    setBgLoading(true);
    try {
      const res = await api.get("/api/identity-ledger/break-glass");
      if (res.success) setBgSessions(res.data || []);
    } catch (e: any) { setError(e.message); }
    finally { setBgLoading(false); }
  }, []);

  useEffect(() => {
    if (tab === "actors") fetchActors();
    else if (tab === "delegations") fetchDelegations();
    else fetchBreakGlass();
  }, [tab, fetchActors, fetchDelegations, fetchBreakGlass]);

  const verifyChain = async () => {
    setVerifying(true);
    try {
      const res = await api.get("/api/identity-ledger/chain/verify");
      const d = res.data || res;
      const brokenCount = Array.isArray(d.broken_links) ? d.broken_links.length : 0;
      setChainResult({ ok: brokenCount === 0, blocks: d.verified_entry_count ?? 0 });
    } catch (e: any) { setError(e.message); }
    finally { setVerifying(false); }
  };

  const revokeDelegate = async (id: string) => {
    try {
      const res = await api.post(`/api/identity-ledger/delegations/${id}/revoke`, {});
      if (res.success) fetchDelegations(); else setError(res.error || "Failed");
    } catch (e: any) { setError(e.message); }
  };

  const endBgSession = async (id: string) => {
    try {
      const res = await api.post(`/api/identity-ledger/break-glass/${id}/end`, {});
      if (res.success) fetchBreakGlass(); else setError(res.error || "Failed");
    } catch (e: any) { setError(e.message); }
  };

  const refresh = () => {
    if (tab === "actors") fetchActors();
    else if (tab === "delegations") fetchDelegations();
    else fetchBreakGlass();
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
            Immutable actor registry — delegations and break-glass access
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button onClick={refresh}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-surface border border-border rounded-lg hover:bg-surface-hover text-foreground-muted">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
          <button onClick={verifyChain} disabled={verifying}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-surface border border-border rounded-lg hover:bg-surface-hover text-foreground-muted disabled:opacity-50">
            <Shield className="w-3.5 h-3.5" /> {verifying ? "Verifying…" : "Verify Chain"}
          </button>
          {tab === "delegations" && (
            <button onClick={() => setShowCreateDelegation(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Plus className="w-3.5 h-3.5" /> Delegate
            </button>
          )}
          {tab === "break-glass" && (
            <button onClick={() => setShowRequestBg(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700">
              <ShieldAlert className="w-3.5 h-3.5" /> Request Access
            </button>
          )}
        </div>
      </div>

      {/* Chain result */}
      {chainResult && (
        <div className={`mb-4 px-3 py-2 rounded-lg border flex items-center gap-2 text-xs ${chainResult.ok ? "bg-green-500/10 border-green-500/20 text-green-400" : "bg-red-500/10 border-red-500/20 text-red-400"}`}>
          {chainResult.ok
            ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            : <AlertTriangle className="w-3.5 h-3.5 shrink-0" />}
          <span>
            {chainResult.ok
              ? `✓ Chain intact — ${chainResult.blocks.toLocaleString()} blocks verified`
              : `✗ Chain integrity failure`}
          </span>
          <button onClick={() => setChainResult(null)} className="ml-auto opacity-60 hover:opacity-100">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

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
                              <td colSpan={6} className="px-4 py-3">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                                  <div><p className="text-foreground-muted mb-1">Email</p><p className="text-foreground">{a.email || "—"}</p></div>
                                  <div><p className="text-foreground-muted mb-1">Roles</p><p className="text-foreground">{(a.roles || []).join(", ") || "—"}</p></div>
                                  <div><p className="text-foreground-muted mb-1">Department</p><p className="text-foreground">{a.department || "—"}</p></div>
                                  <div><p className="text-foreground-muted mb-1">Last Active</p><p className="text-foreground">{a.last_active_at ? fmt(a.last_active_at) : "—"}</p></div>
                                </div>
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

      {/* ── DELEGATIONS ── */}
      {tab === "delegations" && (
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          {delegationsLoading ? (
            <div className="p-10 text-center text-xs text-foreground-muted">Loading…</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[580px]">
                <thead>
                  <tr className="border-b border-border text-foreground-muted bg-surface-hover">
                    <th className="text-left p-3 font-medium">Delegator</th>
                    <th className="text-left p-3 font-medium">Delegate</th>
                    <th className="text-left p-3 font-medium">Scope</th>
                    <th className="text-left p-3 font-medium">Expires</th>
                    <th className="text-left p-3 font-medium">Status</th>
                    <th className="p-3" />
                  </tr>
                </thead>
                <tbody>
                  {delegations.map((d: any) => (
                    <tr key={d.id} className="border-b border-border last:border-0 hover:bg-surface-hover">
                      <td className="p-3 text-foreground-muted text-[11px] font-mono">{d.delegator_id?.substring(0, 12)}…</td>
                      <td className="p-3 text-foreground-muted text-[11px] font-mono">{d.delegatee_id?.substring(0, 12)}…</td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {Array.isArray(d.scope?.permissions)
                            ? d.scope.permissions.map((s: string) => (
                                <span key={s} className="px-1.5 py-0.5 rounded border text-[9px] border-border text-foreground-muted font-mono">{s}</span>
                              ))
                            : d.scope && Object.keys(d.scope).length > 0
                            ? <span className="px-1.5 py-0.5 rounded border text-[9px] border-border text-foreground-muted font-mono">{Object.keys(d.scope).join(", ")}</span>
                            : <span className="text-foreground-muted">—</span>
                          }
                        </div>
                      </td>
                      <td className="p-3 text-foreground-muted text-[11px]">{d.expires_at ? fmt(d.expires_at) : "Never"}</td>
                      <td className="p-3">
                        {d.status === 'REVOKED' || d.revoked_at ? (
                          <span className="px-2 py-0.5 rounded border text-[10px] font-bold tracking-wider bg-transparent text-foreground-muted border-border">REVOKED</span>
                        ) : (
                          <span className="px-2 py-0.5 rounded border text-[10px] font-bold tracking-wider bg-transparent text-green-400 border-green-500/60">ACTIVE</span>
                        )}
                      </td>
                      <td className="p-3">
                        {d.status !== 'REVOKED' && !d.revoked_at && (
                          <button onClick={() => revokeDelegate(d.id)}
                            className="px-2 py-1 text-[10px] font-bold tracking-wider text-orange-400 bg-transparent border border-orange-500/60 rounded hover:bg-orange-500/10">
                            REVOKE
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {delegations.length === 0 && (
                    <tr><td colSpan={6} className="p-10 text-center text-foreground-muted">
                      <GitBranch className="w-7 h-7 mx-auto mb-2 opacity-30" />
                      <p>No delegations</p>
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── BREAK-GLASS ── */}
      {tab === "break-glass" && (
        <>
          <div className="mb-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400 flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
            <p>Break-glass grants temporary elevated access outside normal authorization. Every session is immutably logged.</p>
          </div>
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            {bgLoading ? (
              <div className="p-10 text-center text-xs text-foreground-muted">Loading…</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs min-w-[560px]">
                  <thead>
                    <tr className="border-b border-border text-foreground-muted bg-surface-hover">
                      <th className="text-left p-3 font-medium">Actor</th>
                      <th className="text-left p-3 font-medium">Reason</th>
                      <th className="text-left p-3 font-medium">Elevated Roles</th>
                      <th className="text-left p-3 font-medium">Status</th>
                      <th className="text-left p-3 font-medium">Requested</th>
                      <th className="p-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {bgSessions.map((s: any) => (
                      <tr key={s.id} className="border-b border-border last:border-0 hover:bg-surface-hover">
                        <td className="p-3 text-foreground-muted text-[11px] font-mono">{s.actor_id?.substring(0, 12)}…</td>
                        <td className="p-3 text-foreground-muted text-[11px] max-w-[180px] truncate" title={s.reason}>
                          {s.reason || "—"}
                        </td>
                        <td className="p-3 text-foreground-muted text-[11px]">
                          {Array.isArray(s.elevated_roles) ? s.elevated_roles.join(", ") : "—"}
                        </td>
                        <td className="p-3 text-foreground-muted text-[11px]">{s.status}</td>
                        <td className="p-3 text-foreground-muted text-[11px]">{s.created_at ? fmt(s.created_at) : "—"}</td>
                        <td className="p-3">
                          {s.status === "active" && (
                            <button onClick={() => endBgSession(s.id)}
                              className="px-2 py-1 text-[10px] font-bold tracking-wider text-orange-400 bg-transparent border border-orange-500/60 rounded hover:bg-orange-500/10">
                              END
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {bgSessions.length === 0 && (
                      <tr><td colSpan={6} className="p-10 text-center text-foreground-muted">
                        <ShieldAlert className="w-7 h-7 mx-auto mb-2 opacity-30" />
                        <p>No break-glass sessions</p>
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Modals */}
      {showCreateDelegation && (
        <CreateDelegationModal onClose={() => setShowCreateDelegation(false)} onDone={() => { setShowCreateDelegation(false); fetchDelegations(); }} />
      )}
      {showRequestBg && (
        <RequestBreakGlassModal onClose={() => setShowRequestBg(false)} onDone={() => { setShowRequestBg(false); fetchBreakGlass(); }} />
      )}
    </div>
  );
}

// ── Modal shell ───────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-background/60 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-surface border border-border rounded-xl p-6 w-full max-w-md mx-4 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          <button onClick={onClose}><X className="w-4 h-4 text-foreground-muted hover:text-foreground" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Create Delegation ─────────────────────────────────────────────────────────
function CreateDelegationModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [delegatorId, setDelegatorId] = useState("");
  const [delegateeId, setDelegateeId] = useState("");
  const [permissions, setPermissions] = useState("content.post.approve");
  const [reason, setReason] = useState("");
  const [expiresHours, setExpiresHours] = useState("24");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handle() {
    if (!delegatorId || !delegateeId || !reason) { setError("Delegator ID, Delegate ID and reason are required"); return; }
    setSaving(true);
    try {
      const expires = new Date(Date.now() + parseInt(expiresHours) * 3600000).toISOString();
      const perms = permissions.split(",").map(s => s.trim()).filter(Boolean);
      const res = await api.post("/api/identity-ledger/delegations", {
        delegator_id: delegatorId,
        delegatee_id: delegateeId,
        scope: { permissions: perms },
        reason,
        expires_at: expires,
      });
      if (res.success) onDone(); else setError(res.error || "Failed");
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  }

  return (
    <Modal title="Create Delegation" onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="text-xs text-foreground-muted mb-1 block">Delegator Actor ID <span className="text-red-400">*</span></label>
          <input value={delegatorId} onChange={e => setDelegatorId(e.target.value)} placeholder="UUID of actor granting access"
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground" />
        </div>
        <div>
          <label className="text-xs text-foreground-muted mb-1 block">Delegate Actor ID <span className="text-red-400">*</span></label>
          <input value={delegateeId} onChange={e => setDelegateeId(e.target.value)} placeholder="UUID of actor receiving access"
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground" />
        </div>
        <div>
          <label className="text-xs text-foreground-muted mb-1 block">Permissions (comma-separated)</label>
          <input value={permissions} onChange={e => setPermissions(e.target.value)}
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground font-mono" />
        </div>
        <div>
          <label className="text-xs text-foreground-muted mb-1 block">Reason <span className="text-red-400">*</span></label>
          <textarea value={reason} onChange={e => setReason(e.target.value)} rows={2}
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground" />
        </div>
        <div>
          <label className="text-xs text-foreground-muted mb-1 block">Duration</label>
          <select value={expiresHours} onChange={e => setExpiresHours(e.target.value)}
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground">
            <option value="1">1 hour</option>
            <option value="8">8 hours</option>
            <option value="24">24 hours</option>
            <option value="72">3 days</option>
            <option value="168">7 days</option>
          </select>
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="px-3 py-2 text-xs text-foreground-muted bg-surface-hover rounded-lg border border-border">Cancel</button>
          <button onClick={handle} disabled={saving} className="px-3 py-2 text-xs text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {saving ? "Creating…" : "Create"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ── Request Break-Glass ───────────────────────────────────────────────────────
function RequestBreakGlassModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState("");
  const [elevatedRoles, setElevatedRoles] = useState("SUPERADMIN");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handle() {
    if (!reason) { setError("Reason is required"); return; }
    setSaving(true);
    try {
      const roles = elevatedRoles.split(",").map(r => r.trim()).filter(Boolean);
      const res = await api.post("/api/identity-ledger/break-glass/request", {
        reason,
        elevated_roles: roles,
      });
      if (res.success) onDone(); else setError(res.error || "Failed");
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  }

  return (
    <Modal title="Request Break-Glass Access" onClose={onClose}>
      <div className="space-y-3">
        <div className="p-2.5 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">
          This will be permanently logged. Use only in genuine emergencies.
        </div>
        <div>
          <label className="text-xs text-foreground-muted mb-1 block">Reason <span className="text-red-400">*</span></label>
          <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3}
            placeholder="Describe the incident requiring emergency access…"
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground" />
        </div>
        <div>
          <label className="text-xs text-foreground-muted mb-1 block">Elevated Roles (comma-separated)</label>
          <input value={elevatedRoles} onChange={e => setElevatedRoles(e.target.value)}
            placeholder="SUPERADMIN, SECURITY_ADMIN…"
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground font-mono" />
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="px-3 py-2 text-xs text-foreground-muted bg-surface-hover rounded-lg border border-border">Cancel</button>
          <button onClick={handle} disabled={saving} className="px-3 py-2 text-xs text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50">
            {saving ? "Requesting…" : "Request Access"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
