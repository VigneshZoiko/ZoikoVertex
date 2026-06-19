"use client";

import React, { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import {
  Users, GitBranch, ShieldAlert, Plus, X, RefreshCw,
  AlertTriangle, CheckCircle2, Shield, ChevronDown, ChevronUp,
} from "lucide-react";

type TabId = "actors" | "delegations" | "break-glass";

const TABS = [
  { id: "actors" as TabId, label: "Actors", icon: Users },
  { id: "delegations" as TabId, label: "Delegations", icon: GitBranch },
  { id: "break-glass" as TabId, label: "Break-Glass", icon: ShieldAlert },
];

const ACTOR_TYPE_COLORS: Record<string, string> = {
  human: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  ai_agent: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  service_account: "text-foreground-muted bg-surface-hover border-border",
  system: "text-foreground-muted bg-surface-hover border-border",
};

const STATE_COLORS: Record<string, string> = {
  active: "text-green-400 bg-green-500/10 border-green-500/20",
  suspended: "text-orange-400 bg-orange-500/10 border-orange-500/20",
  deactivated: "text-foreground-muted bg-surface-hover border-border",
};

const BG_STATUS_COLORS: Record<string, string> = {
  requested: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
  active: "text-red-400 bg-red-500/10 border-red-500/20",
  ended: "text-foreground-muted bg-surface-hover border-border",
  denied: "text-foreground-muted bg-surface-hover border-border",
};

function fmt(ts: string) {
  try { return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }); }
  catch { return "—"; }
}

export default function IdentityLedgerPage() {
  const [tab, setTab] = useState<TabId>("actors");

  // Actors
  const [actors, setActors] = useState<any[]>([]);
  const [actorsTotal, setActorsTotal] = useState(0);
  const [actorsLoading, setActorsLoading] = useState(false);
  const [typeFilter, setTypeFilter] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [chainResult, setChainResult] = useState<any | null>(null);
  const [verifying, setVerifying] = useState(false);

  // Delegations
  const [delegations, setDelegations] = useState<any[]>([]);
  const [delegationsLoading, setDelegationsLoading] = useState(false);
  const [showCreateDelegation, setShowCreateDelegation] = useState(false);

  // Break-glass
  const [bgSessions, setBgSessions] = useState<any[]>([]);
  const [bgLoading, setBgLoading] = useState(false);
  const [showRequestBg, setShowRequestBg] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const fetchActors = useCallback(async () => {
    setActorsLoading(true);
    try {
      const p = new URLSearchParams();
      if (typeFilter) p.set("actor_type", typeFilter);
      if (stateFilter) p.set("identity_state", stateFilter);
      p.set("limit", "50");
      const res = await api.get(`/api/identity-ledger/actors?${p}`);
      if (res.success) { setActors(res.data || []); setActorsTotal(res.total || 0); }
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
      setChainResult(res.data || res);
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

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Users className="w-5 h-5 text-foreground-muted" /> Identity Ledger
          </h1>
          <p className="text-xs text-foreground-muted mt-0.5">Immutable actor registry, delegations, and emergency access sessions</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { if (tab === "actors") fetchActors(); else if (tab === "delegations") fetchDelegations(); else fetchBreakGlass(); }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-surface border border-border rounded-lg hover:bg-surface-hover text-foreground-muted">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
          {tab === "actors" && (
            <button onClick={verifyChain} disabled={verifying}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-surface border border-border rounded-lg hover:bg-surface-hover text-foreground-muted disabled:opacity-50">
              <Shield className="w-3.5 h-3.5" /> {verifying ? "Verifying…" : "Verify Chain"}
            </button>
          )}
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

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          <p className="text-xs text-red-400 flex-1">{error}</p>
          <button onClick={() => setError(null)}><X className="w-3.5 h-3.5 text-red-400/60" /></button>
        </div>
      )}

      {chainResult && (
        <div className={`mb-4 p-3 rounded-lg border flex items-center gap-2 ${chainResult.failed_blocks === 0 ? "bg-green-500/10 border-green-500/20" : "bg-red-500/10 border-red-500/20"}`}>
          {chainResult.failed_blocks === 0
            ? <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
            : <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />}
          <p className="text-xs text-foreground flex-1">
            {chainResult.failed_blocks === 0
              ? `Chain intact — ${chainResult.verified_blocks ?? "—"} blocks verified`
              : `Chain broken — ${chainResult.failed_blocks} failed block(s)`}
          </p>
          <button onClick={() => setChainResult(null)}><X className="w-3.5 h-3.5 text-foreground-muted" /></button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border mb-5">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs border-b-2 transition-colors ${
              tab === t.id ? "text-blue-400 border-blue-500" : "text-foreground-muted border-transparent hover:text-foreground"
            }`}>
            <t.icon className="w-3.5 h-3.5" /> {t.label}
          </button>
        ))}
      </div>

      {/* Actors Tab */}
      {tab === "actors" && (
        <>
          <div className="flex items-center gap-2 mb-4">
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
              className="bg-surface border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground">
              <option value="">All Types</option>
              <option value="human">Human</option>
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
              <table className="w-full text-xs">
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
                  {actors.map((a: any) => (
                    <React.Fragment key={a.id}>
                      <tr onClick={() => setExpanded(expanded === a.id ? null : a.id)}
                        className="border-b border-border last:border-0 hover:bg-surface-hover cursor-pointer">
                        <td className="p-3">
                          <p className="font-medium text-foreground">{a.display_name || a.email || a.actor_id}</p>
                          <p className="text-[10px] text-foreground-muted font-mono mt-0.5">{a.actor_id}</p>
                        </td>
                        <td className="p-3">
                          <span className={`inline-block px-2 py-0.5 rounded border text-[10px] ${ACTOR_TYPE_COLORS[a.actor_type] || "text-foreground-muted border-border"}`}>
                            {a.actor_type}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className={`inline-block px-2 py-0.5 rounded border text-[10px] ${STATE_COLORS[a.identity_state] || "text-foreground-muted border-border"}`}>
                            {a.identity_state}
                          </span>
                        </td>
                        <td className="p-3 text-foreground-muted">{a.autonomy_level != null ? `D${a.autonomy_level}` : "—"}</td>
                        <td className="p-3 text-foreground-muted">{fmt(a.registered_at || a.created_at)}</td>
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
                  ))}
                  {actors.length === 0 && (
                    <tr><td colSpan={6} className="p-10 text-center text-foreground-muted">
                      <Users className="w-7 h-7 mx-auto mb-2 opacity-30" />
                      <p>No actors registered yet</p>
                    </td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
          <p className="text-xs text-foreground-muted mt-2">{actorsTotal} total actors</p>
        </>
      )}

      {/* Delegations Tab */}
      {tab === "delegations" && (
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          {delegationsLoading ? (
            <div className="p-10 text-center text-xs text-foreground-muted">Loading…</div>
          ) : (
            <table className="w-full text-xs">
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
                    <td className="p-3 font-mono text-[11px] text-foreground">{d.delegator_actor_id?.substring(0, 12) ?? "—"}…</td>
                    <td className="p-3 font-mono text-[11px] text-foreground">{d.delegate_actor_id?.substring(0, 12) ?? "—"}…</td>
                    <td className="p-3 text-foreground-muted">{(d.permissions_scope || []).join(", ") || "—"}</td>
                    <td className="p-3 text-foreground-muted">{d.expires_at ? fmt(d.expires_at) : "Never"}</td>
                    <td className="p-3">
                      <span className={`inline-block px-2 py-0.5 rounded border text-[10px] ${d.revoked_at ? "text-foreground-muted border-border" : "text-green-400 bg-green-500/10 border-green-500/20"}`}>
                        {d.revoked_at ? "Revoked" : "Active"}
                      </span>
                    </td>
                    <td className="p-3">
                      {!d.revoked_at && (
                        <button onClick={() => revokeDelegate(d.id)}
                          className="px-2 py-1 text-[10px] text-orange-400 bg-orange-500/10 border border-orange-500/20 rounded hover:bg-orange-500/20">
                          Revoke
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
          )}
        </div>
      )}

      {/* Break-Glass Tab */}
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
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-foreground-muted bg-surface-hover">
                    <th className="text-left p-3 font-medium">Actor</th>
                    <th className="text-left p-3 font-medium">Resource</th>
                    <th className="text-left p-3 font-medium">Justification</th>
                    <th className="text-left p-3 font-medium">Status</th>
                    <th className="text-left p-3 font-medium">Expires</th>
                    <th className="p-3" />
                  </tr>
                </thead>
                <tbody>
                  {bgSessions.map((s: any) => (
                    <tr key={s.id} className="border-b border-border last:border-0 hover:bg-surface-hover">
                      <td className="p-3 font-mono text-[11px] text-foreground">{s.actor_id?.substring(0, 12) ?? "—"}…</td>
                      <td className="p-3 text-foreground-muted">{s.resource_type} {s.resource_id ? `:${s.resource_id.substring(0, 8)}` : ""}</td>
                      <td className="p-3 text-foreground-muted max-w-[200px] truncate">{s.justification || "—"}</td>
                      <td className="p-3">
                        <span className={`inline-block px-2 py-0.5 rounded border text-[10px] ${BG_STATUS_COLORS[s.status] || "text-foreground-muted border-border"}`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="p-3 text-foreground-muted">{s.expires_at ? fmt(s.expires_at) : "—"}</td>
                      <td className="p-3">
                        {s.status === "active" && (
                          <button onClick={() => endBgSession(s.id)}
                            className="px-2 py-1 text-[10px] text-red-400 bg-red-500/10 border border-red-500/20 rounded hover:bg-red-500/20">
                            End
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
            )}
          </div>
        </>
      )}

      {showCreateDelegation && <CreateDelegationModal onClose={() => setShowCreateDelegation(false)} onDone={() => { setShowCreateDelegation(false); fetchDelegations(); }} />}
      {showRequestBg && <RequestBreakGlassModal onClose={() => setShowRequestBg(false)} onDone={() => { setShowRequestBg(false); fetchBreakGlass(); }} />}
    </div>
  );
}

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

function CreateDelegationModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [delegateId, setDelegateId] = useState("");
  const [scope, setScope] = useState("content.post.approve");
  const [justification, setJustification] = useState("");
  const [expiresHours, setExpiresHours] = useState("24");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handle() {
    if (!delegateId || !justification) { setError("Delegate ID and justification are required"); return; }
    setSaving(true);
    try {
      const expires = new Date(Date.now() + parseInt(expiresHours) * 3600000).toISOString();
      const res = await api.post("/api/identity-ledger/delegations", {
        delegate_actor_id: delegateId,
        permissions_scope: scope.split(",").map(s => s.trim()).filter(Boolean),
        justification,
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
          <label className="text-xs text-foreground-muted mb-1 block">Delegate Actor ID <span className="text-red-400">*</span></label>
          <input value={delegateId} onChange={e => setDelegateId(e.target.value)} placeholder="UUID"
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground" />
        </div>
        <div>
          <label className="text-xs text-foreground-muted mb-1 block">Scope (comma-separated)</label>
          <input value={scope} onChange={e => setScope(e.target.value)}
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground font-mono" />
        </div>
        <div>
          <label className="text-xs text-foreground-muted mb-1 block">Justification <span className="text-red-400">*</span></label>
          <textarea value={justification} onChange={e => setJustification(e.target.value)} rows={2}
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground" />
        </div>
        <div>
          <label className="text-xs text-foreground-muted mb-1 block">Duration (hours)</label>
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

function RequestBreakGlassModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [resourceType, setResourceType] = useState("workspace");
  const [resourceId, setResourceId] = useState("");
  const [justification, setJustification] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handle() {
    if (!justification) { setError("Justification is required"); return; }
    setSaving(true);
    try {
      const res = await api.post("/api/identity-ledger/break-glass/request", {
        resource_type: resourceType,
        resource_id: resourceId || undefined,
        justification,
        duration_minutes: 60,
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
          <label className="text-xs text-foreground-muted mb-1 block">Resource Type</label>
          <select value={resourceType} onChange={e => setResourceType(e.target.value)}
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground">
            <option value="workspace">Workspace</option>
            <option value="campaign">Campaign</option>
            <option value="audit_events">Audit Events</option>
            <option value="evidence_vault">Evidence Vault</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-foreground-muted mb-1 block">Resource ID (optional)</label>
          <input value={resourceId} onChange={e => setResourceId(e.target.value)} placeholder="UUID (leave blank for all)"
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground" />
        </div>
        <div>
          <label className="text-xs text-foreground-muted mb-1 block">Justification <span className="text-red-400">*</span></label>
          <textarea value={justification} onChange={e => setJustification(e.target.value)} rows={3}
            placeholder="Describe the incident requiring emergency access…"
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground" />
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
