"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import {
  Archive, Package, Lock, Plus, X, RefreshCw, AlertTriangle,
  Gavel, Unlock,
} from "lucide-react";

type TabId = "items" | "holds" | "packages";

const TABS = [
  { id: "items" as TabId, label: "Evidence", icon: Archive },
  { id: "holds" as TabId, label: "Legal Holds", icon: Lock },
  { id: "packages" as TabId, label: "Packages", icon: Package },
];

const STATE_STYLE: Record<string, string> = {
  preserved: "text-green-400 bg-green-500/10",
  sealed: "text-blue-400 bg-blue-500/10",
  legal_hold: "text-red-400 bg-red-500/10",
  archived: "text-foreground-muted bg-surface-hover",
  quarantined: "text-orange-400 bg-orange-500/10",
};

function fmt(ts: string) {
  try { return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }); }
  catch { return "—"; }
}

export default function EvidenceVaultPage() {
  const router = useRouter();
  const [tab, setTab] = useState<TabId>("items");
  const [error, setError] = useState<string | null>(null);

  // ─── Items ─────────────────────────────────────────────────
  const [items, setItems] = useState<any[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [sourceFilter, setSourceFilter] = useState("");
  const [stateFilter, setStateFilter] = useState("");

  const fetchItems = useCallback(async () => {
    setItemsLoading(true);
    try {
      const p = new URLSearchParams();
      if (sourceFilter) p.set("source_type", sourceFilter);
      if (stateFilter) p.set("vault_state", stateFilter);
      p.set("limit", "50");
      const res = await api.get(`/api/evidence-vault/items?${p}`);
      if (res.success) setItems(res.data || []);
    } catch (e: any) { setError(e.message); }
    finally { setItemsLoading(false); }
  }, [sourceFilter, stateFilter]);

  // ─── Legal Holds ───────────────────────────────────────────
  const [holds, setHolds] = useState<any[]>([]);
  const [holdsLoading, setHoldsLoading] = useState(false);

  const fetchHolds = useCallback(async () => {
    setHoldsLoading(true);
    try {
      const res = await api.get("/api/evidence-vault/holds");
      if (res.success) setHolds(res.data || []);
    } catch (e: any) { setError(e.message); }
    finally { setHoldsLoading(false); }
  }, []);

  // ─── Packages ──────────────────────────────────────────────
  const [packages, setPackages] = useState<any[]>([]);
  const [pkgLoading, setPkgLoading] = useState(false);

  const fetchPackages = useCallback(async () => {
    setPkgLoading(true);
    try {
      const res = await api.get("/api/evidence-vault/packages");
      if (res.success) setPackages(res.data || []);
    } catch (e: any) { setError(e.message); }
    finally { setPkgLoading(false); }
  }, []);

  // ─── Actions ───────────────────────────────────────────────
  const [showPreserve, setShowPreserve] = useState(false);
  const [showApplyHold, setShowApplyHold] = useState(false);
  const [releaseTarget, setReleaseTarget] = useState<any>(null);
  const [showCreatePkg, setShowCreatePkg] = useState(false);

  // Reset modals on tab switch
  useEffect(() => {
    setShowPreserve(false);
    setShowApplyHold(false);
    setReleaseTarget(null);
    setShowCreatePkg(false);
  }, [tab]);

  useEffect(() => {
    if (tab === "items") fetchItems();
    else if (tab === "holds") fetchHolds();
    else fetchPackages();
  }, [tab, fetchItems, fetchHolds, fetchPackages]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Archive className="w-5 h-5 text-foreground-muted" /> Evidence Vault
          </h1>
          <p className="text-xs text-foreground-muted mt-0.5">Preserved evidence, legal holds, and export-ready packages</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {tab === "items" && (
            <button onClick={() => setShowPreserve(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Plus className="w-3.5 h-3.5" /> Preserve
            </button>
          )}
          {tab === "holds" && (
            <button onClick={() => setShowApplyHold(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700">
              <Plus className="w-3.5 h-3.5" /> Apply Hold
            </button>
          )}
          {tab === "packages" && (
            <button onClick={() => setShowCreatePkg(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Plus className="w-3.5 h-3.5" /> New Package
            </button>
          )}
          <button onClick={() => { if (tab === "items") fetchItems(); else if (tab === "holds") fetchHolds(); else fetchPackages(); }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-surface border border-border rounded-lg hover:bg-surface-hover text-foreground-muted">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          <p className="text-xs text-red-400 flex-1">{error}</p>
          <button onClick={() => setError(null)}><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border mb-5 overflow-x-auto">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs border-b-2 transition-colors ${
              tab === t.id ? "text-blue-400 border-blue-500" : "text-foreground-muted border-transparent hover:text-foreground"
            }`}>
            <t.icon className="w-3.5 h-3.5" /> {t.label}
          </button>
        ))}
      </div>

      {/* ════════ ITEMS TAB ════════ */}
      {tab === "items" && (
        <>
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)}
              className="bg-surface border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground">
              <option value="">All sources</option>
              <option value="audit_event">Audit Event</option>
              <option value="forensic_case">Forensic Case</option>
              <option value="ai_output">AI Output</option>
              <option value="social_payload">Social Post</option>
            </select>
            <select value={stateFilter} onChange={e => setStateFilter(e.target.value)}
              className="bg-surface border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground">
              <option value="">All states</option>
              <option value="preserved">Preserved</option>
              <option value="sealed">Sealed</option>
              <option value="legal_hold">Legal Hold</option>
            </select>
            {(sourceFilter || stateFilter) && (
              <button onClick={() => { setSourceFilter(""); setStateFilter(""); }}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-foreground-muted hover:text-foreground">
                <X className="w-3 h-3" /> Clear
              </button>
            )}
          </div>

          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[640px]">
                <thead>
                  <tr className="border-b border-border text-foreground-muted bg-surface-hover">
                    <th className="text-left p-3 font-medium">Evidence</th>
                    <th className="text-left p-3 font-medium">Source</th>
                    <th className="text-left p-3 font-medium">Status</th>
                    <th className="text-left p-3 font-medium">Reason</th>
                    <th className="text-left p-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {itemsLoading ? (
                    <tr><td colSpan={5} className="p-8 text-center text-foreground-muted">Loading…</td></tr>
                  ) : items.length === 0 ? (
                    <tr><td colSpan={5} className="p-10 text-center text-foreground-muted">
                      <Archive className="w-7 h-7 mx-auto mb-2 opacity-30" />
                      <p>No evidence preserved yet</p>
                    </td></tr>
                  ) : (
                    items.map((item: any) => (
                      <tr key={item.id}
                        onClick={() => router.push(`/evidence/evidence-vault/items/${item.id}`)}
                        className="border-b border-border last:border-0 hover:bg-surface-hover cursor-pointer">
                        <td className="p-3">
                          <span className="font-mono font-medium text-foreground text-[11px]">
                            {item.source_id ? item.source_id.substring(0, 8) : item.id?.substring(0, 8) || "—"}
                          </span>
                          <span className="block text-[10px] text-foreground-muted mt-0.5">{item.evidence_type?.replace(/_/g, " ") || "evidence item"}</span>
                        </td>
                        <td className="p-3 text-foreground-muted text-[11px]">{item.source_type?.replace(/_/g, " ")}</td>
                        <td className="p-3">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] ${STATE_STYLE[item.vault_state] || "text-foreground-muted"}`}>
                            {item.vault_state?.replace(/_/g, " ")}
                          </span>
                          {item.legal_hold && <Lock className="w-3 h-3 text-red-400 inline ml-1" />}
                        </td>
                        <td className="p-3 text-foreground-muted text-[11px] max-w-[200px] truncate" title={item.preservation_reason}>{item.preservation_reason || "—"}</td>
                        <td className="p-3 text-foreground-muted text-[11px]">{fmt(item.created_at)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ════════ LEGAL HOLDS TAB ════════ */}
      {tab === "holds" && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { label: "Active", value: holds.filter((h: any) => !h.released).length, color: "text-red-400" },
              { label: "Pending Review", value: holds.filter((h: any) => !h.released && h.review_date && new Date(h.review_date) <= new Date()).length, color: "text-amber-400" },
              { label: "Released", value: holds.filter((h: any) => h.released).length, color: "text-green-400" },
            ].map(s => (
              <div key={s.label} className="bg-surface border border-border rounded-xl p-4 text-center">
                <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-foreground-muted mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[640px]">
                <thead>
                  <tr className="border-b border-border text-foreground-muted bg-surface-hover">
                    <th className="text-left p-3 font-medium">Matter</th>
                    <th className="text-left p-3 font-medium">Scope</th>
                    <th className="text-left p-3 font-medium">Reason</th>
                    <th className="text-left p-3 font-medium">Effective</th>
                    <th className="text-left p-3 font-medium">Review</th>
                    <th className="text-left p-3 font-medium">Status</th>
                    <th className="p-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {holdsLoading ? (
                    <tr><td colSpan={7} className="p-8 text-center text-foreground-muted">Loading…</td></tr>
                  ) : holds.length === 0 ? (
                    <tr><td colSpan={7} className="p-10 text-center text-foreground-muted">
                      <Lock className="w-7 h-7 mx-auto mb-2 opacity-30" />
                      <p>No legal holds</p>
                    </td></tr>
                  ) : (
                    holds.map((hold: any) => {
                      const isOverdue = hold.review_date && !hold.released && new Date(hold.review_date) <= new Date();
                      return (
                        <tr key={hold.id} className="border-b border-border last:border-0 hover:bg-surface-hover">
                          <td className="p-3 font-mono text-[11px] text-foreground">{hold.matter_ref}</td>
                          <td className="p-3 text-foreground-muted text-[11px]">{hold.scope_type}{hold.scope_id ? ` • ${hold.scope_id.substring(0, 8)}…` : ""}</td>
                          <td className="p-3 text-foreground-muted text-[11px] max-w-[200px] truncate" title={hold.reason}>{hold.reason}</td>
                          <td className="p-3 text-foreground-muted text-[11px]">{fmt(hold.effective_date)}</td>
                          <td className="p-3 text-foreground-muted text-[11px]">
                            {hold.review_date ? (
                              <span className={isOverdue ? "text-amber-400" : ""}>{fmt(hold.review_date)}</span>
                            ) : "—"}
                          </td>
                          <td className="p-3">
                            {hold.released
                              ? <span className="flex items-center gap-1 text-green-400 text-[11px]"><Unlock className="w-3 h-3" /> Released</span>
                              : <span className="flex items-center gap-1 text-red-400 text-[11px]"><Lock className="w-3 h-3" /> Active</span>
                            }
                          </td>
                          <td className="p-3">
                            {!hold.released && (
                              <button onClick={(e) => { e.stopPropagation(); setReleaseTarget(hold); }}
                                className="px-2 py-1 text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded hover:bg-amber-500/20">
                                Release
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ════════ PACKAGES TAB ════════ */}
      {tab === "packages" && (
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[540px]">
              <thead>
                <tr className="border-b border-border text-foreground-muted bg-surface-hover">
                  <th className="text-left p-3 font-medium">Title</th>
                  <th className="text-left p-3 font-medium">Type</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-left p-3 font-medium">Items</th>
                  <th className="text-left p-3 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {pkgLoading ? (
                  <tr><td colSpan={5} className="p-8 text-center text-foreground-muted">Loading…</td></tr>
                ) : packages.length === 0 ? (
                  <tr><td colSpan={5} className="p-10 text-center text-foreground-muted">
                    <Package className="w-7 h-7 mx-auto mb-2 opacity-30" />
                    <p>No packages yet</p>
                  </td></tr>
                ) : (
                  packages.map((pkg: any) => (
                    <tr key={pkg.id} className="border-b border-border last:border-0 hover:bg-surface-hover">
                      <td className="p-3 font-medium text-foreground text-[11px]">{pkg.title}</td>
                      <td className="p-3 text-foreground-muted text-[11px]">{(pkg.package_type || "").replace(/_/g, " ")}</td>
                      <td className="p-3">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] ${
                          pkg.status === "sealed" ? "text-blue-400 bg-blue-500/10" :
                          pkg.status === "exported" ? "text-green-400 bg-green-500/10" :
                          "text-foreground-muted bg-surface-hover"
                        }`}>{pkg.status}</span>
                      </td>
                      <td className="p-3 text-foreground-muted text-[11px]">{pkg.item_count ?? "—"}</td>
                      <td className="p-3 text-foreground-muted text-[11px]">{fmt(pkg.created_at)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── Modals ─── */}
      {showPreserve && <PreserveModal onClose={() => setShowPreserve(false)} onDone={() => { setShowPreserve(false); fetchItems(); }} />}
      {showApplyHold && <ApplyHoldModal onClose={() => setShowApplyHold(false)} onDone={() => { setShowApplyHold(false); fetchHolds(); }} />}
      {releaseTarget && <ReleaseHoldModal hold={releaseTarget} onClose={() => setReleaseTarget(null)} onDone={() => { setReleaseTarget(null); fetchHolds(); }} />}
      {showCreatePkg && <CreatePkgModal onClose={() => setShowCreatePkg(false)} onDone={() => { setShowCreatePkg(false); fetchPackages(); }} />}
    </div>
  );
}

// ─── Modal Shell ─────────────────────────────────────────────────────────────
function ModalShell({ title, icon: Icon, onClose, children }: { title: string; icon: any; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-background/60 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-surface border border-border rounded-xl p-6 w-full max-w-md mx-4 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2"><Icon className="w-4 h-4 text-blue-400" />{title}</h2>
          <button onClick={onClose}><X className="w-4 h-4 text-foreground-muted hover:text-foreground" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── Preserve Modal ──────────────────────────────────────────────────────────
function PreserveModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [sourceType, setSourceType] = useState("audit_event");
  const [sourceId, setSourceId] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handle() {
    if (!sourceId || !reason) { setError("Source ID and reason are required"); return; }
    setSaving(true);
    try {
      const res = await api.post("/api/evidence-vault/items/preserve", {
        source_type: sourceType, source_id: sourceId, source_system: "audit_trail",
        preservation_reason: reason, retention_class: "standard", risk_level: "medium",
      });
      if (res.success) onDone(); else setError(res.error || "Failed");
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  }

  return (
    <ModalShell title="Preserve Evidence" icon={Archive} onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="text-xs text-foreground-muted mb-1 block">Source</label>
          <select value={sourceType} onChange={e => setSourceType(e.target.value)}
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground">
            <option value="audit_event">Audit Event</option>
            <option value="forensic_case">Forensic Case</option>
            <option value="ai_output">AI Output</option>
            <option value="social_payload">Social Post</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-foreground-muted mb-1 block">Source ID <span className="text-red-400">*</span></label>
          <input value={sourceId} onChange={e => setSourceId(e.target.value)} placeholder="ID of the item to preserve"
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground" />
        </div>
        <div>
          <label className="text-xs text-foreground-muted mb-1 block">Why preserve this? <span className="text-red-400">*</span></label>
          <textarea value={reason} onChange={e => setReason(e.target.value)} rows={2} placeholder="e.g. Regulatory audit, legal dispute, policy violation"
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground" />
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="px-3 py-2 text-xs text-foreground-muted bg-surface-hover rounded-lg border border-border">Cancel</button>
          <button onClick={handle} disabled={saving} className="px-3 py-2 text-xs text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {saving ? "Preserving…" : "Preserve"}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

// ─── Apply Hold Modal ────────────────────────────────────────────────────────
function ApplyHoldModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [matterRef, setMatterRef] = useState("");
  const [reason, setReason] = useState("");
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().split("T")[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handle() {
    if (!matterRef || !reason) { setError("Matter reference and reason are required"); return; }
    setSaving(true);
    try {
      const res = await api.post("/api/evidence-vault/holds", {
        matter_ref: matterRef, reason, scope_type: "item",
        effective_date: effectiveDate,
      });
      if (res.success) onDone(); else setError(res.error || "Failed");
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  }

  return (
    <ModalShell title="Apply Legal Hold" icon={Gavel} onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="text-xs text-foreground-muted mb-1 block">Matter Reference <span className="text-red-400">*</span></label>
          <input value={matterRef} onChange={e => setMatterRef(e.target.value)} placeholder="e.g. LEGAL-2026-001"
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground" />
        </div>
        <div>
          <label className="text-xs text-foreground-muted mb-1 block">Reason <span className="text-red-400">*</span></label>
          <textarea value={reason} onChange={e => setReason(e.target.value)} rows={2} placeholder="Legal basis for the hold"
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground" />
        </div>
        <div>
          <label className="text-xs text-foreground-muted mb-1 block">Effective Date</label>
          <input type="date" value={effectiveDate} onChange={e => setEffectiveDate(e.target.value)}
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground" />
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="px-3 py-2 text-xs text-foreground-muted bg-surface-hover rounded-lg border border-border">Cancel</button>
          <button onClick={handle} disabled={saving} className="px-3 py-2 text-xs text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50">
            {saving ? "Applying…" : "Apply Hold"}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

// ─── Release Hold Modal ──────────────────────────────────────────────────────
function ReleaseHoldModal({ hold, onClose, onDone }: { hold: any; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handle() {
    if (!reason) { setError("Release reason is required"); return; }
    setSaving(true);
    try {
      const res = await api.post(`/api/evidence-vault/holds/${hold.id}/release`, { reason });
      if (res.success) onDone(); else setError(res.error || "Failed");
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  }

  return (
    <ModalShell title="Release Legal Hold" icon={Unlock} onClose={onClose}>
      <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg mb-4 text-xs text-amber-400 flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
        <div>
          <p className="font-medium">Requires authorization</p>
          <p className="text-amber-400/70 mt-0.5">Releasing a hold is a permanent action that is immutably logged.</p>
        </div>
      </div>
      <div className="p-3 bg-surface-hover rounded-lg mb-3 text-xs space-y-1">
        <div className="flex gap-2"><span className="text-foreground-muted">Matter:</span><span className="text-foreground font-mono">{hold.matter_ref}</span></div>
        <div className="flex gap-2"><span className="text-foreground-muted">Hold ID:</span><span className="text-foreground font-mono">{hold.hold_id}</span></div>
      </div>
      <div className="space-y-3">
        <div>
          <label className="text-xs text-foreground-muted mb-1 block">Release Reason <span className="text-red-400">*</span></label>
          <textarea value={reason} onChange={e => setReason(e.target.value)} rows={2} placeholder="Why is this hold being released?"
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground" />
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="px-3 py-2 text-xs text-foreground-muted bg-surface-hover rounded-lg border border-border">Cancel</button>
          <button onClick={handle} disabled={saving} className="px-3 py-2 text-xs text-white bg-amber-600 rounded-lg hover:bg-amber-700 disabled:opacity-50">
            {saving ? "Releasing…" : "Confirm Release"}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

// ─── Create Package Modal ────────────────────────────────────────────────────
function CreatePkgModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [pkgType, setPkgType] = useState("regulatory_response");
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handle() {
    if (!title.trim()) { setError("Title is required"); return; }
    setSaving(true);
    try {
      const res = await api.post("/api/evidence-vault/packages", { package_type: pkgType, title });
      if (res.success) onDone(); else setError(res.error || "Failed");
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  }

  return (
    <ModalShell title="New Package" icon={Package} onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="text-xs text-foreground-muted mb-1 block">Type</label>
          <select value={pkgType} onChange={e => setPkgType(e.target.value)}
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground">
            <option value="regulatory_response">Regulatory Response</option>
            <option value="litigation_hold">Litigation</option>
            <option value="customer_assurance">Customer Assurance</option>
            <option value="board_executive">Board Report</option>
            <option value="security_incident">Security Incident</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-foreground-muted mb-1 block">Title <span className="text-red-400">*</span></label>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Q2 Regulatory Response"
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground" />
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="px-3 py-2 text-xs text-foreground-muted bg-surface-hover rounded-lg border border-border">Cancel</button>
          <button onClick={handle} disabled={saving} className="px-3 py-2 text-xs text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {saving ? "Creating…" : "Create"}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
