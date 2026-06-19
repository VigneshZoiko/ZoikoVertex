"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import {
  Archive, Package, Plus, X, RefreshCw, Lock, AlertTriangle, Filter,
  RotateCcw, Gavel,
} from "lucide-react";

type TabId = "items" | "packages";

const TABS = [
  { id: "items" as TabId, label: "Evidence Items", icon: Archive },
  { id: "packages" as TabId, label: "Packages", icon: Package },
];

const STATE_COLOR: Record<string, string> = {
  preserved: "text-green-400 bg-green-500/10 border-green-500/20",
  sealed: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  legal_hold: "text-red-400 bg-red-500/10 border-red-500/20",
  archived: "text-foreground-muted bg-surface-hover border-border",
  quarantined: "text-orange-400 bg-orange-500/10 border-orange-500/20",
  failed: "text-red-400 bg-red-500/10 border-red-500/20",
};

const PKG_STATUS_COLOR: Record<string, string> = {
  draft: "text-foreground-muted border-border bg-surface-hover",
  sealed: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  exported: "text-green-400 bg-green-500/10 border-green-500/20",
};

function fmt(ts: string) {
  try { return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }); }
  catch { return "—"; }
}

export default function EvidenceVaultPage() {
  const router = useRouter();
  const [tab, setTab] = useState<TabId>("items");

  // Items
  const [items, setItems] = useState<any[]>([]);
  const [itemsTotal, setItemsTotal] = useState(0);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [sourceFilter, setSourceFilter] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [evidenceTypeFilter, setEvidenceTypeFilter] = useState("");
  const [showPreserve, setShowPreserve] = useState(false);

  // Packages
  const [packages, setPackages] = useState<any[]>([]);
  const [pkgsTotal, setPkgsTotal] = useState(0);
  const [pkgsLoading, setPkgsLoading] = useState(false);
  const [showCreatePkg, setShowCreatePkg] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    setItemsLoading(true);
    try {
      const p = new URLSearchParams();
      if (sourceFilter) p.set("source_type", sourceFilter);
      if (stateFilter) p.set("vault_state", stateFilter);
      p.set("limit", "50");
      const res = await api.get(`/api/evidence-vault/items?${p}`);
      if (res.success) {
        let data = res.data || [];
        if (evidenceTypeFilter) data = data.filter((i: any) => i.evidence_type === evidenceTypeFilter);
        setItems(data);
        setItemsTotal(evidenceTypeFilter ? data.length : (res.total || 0));
      }
    } catch (e: any) { setError(e.message); }
    finally { setItemsLoading(false); }
  }, [sourceFilter, stateFilter, evidenceTypeFilter]);

  const fetchPackages = useCallback(async () => {
    setPkgsLoading(true);
    try {
      const res = await api.get("/api/evidence-vault/packages");
      if (res.success) { setPackages(res.data || []); setPkgsTotal(res.total || 0); }
    } catch (e: any) { setError(e.message); }
    finally { setPkgsLoading(false); }
  }, []);

  useEffect(() => {
    if (tab === "items") fetchItems();
    else fetchPackages();
  }, [tab, fetchItems, fetchPackages]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Archive className="w-5 h-5 text-foreground-muted" /> Evidence Vault
          </h1>
          <p className="text-xs text-foreground-muted mt-0.5">Preserved evidence, sealed packages, and legal-grade export</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => tab === "items" ? fetchItems() : fetchPackages()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-surface border border-border rounded-lg hover:bg-surface-hover text-foreground-muted">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
          {tab === "items" && (
            <button onClick={() => setShowPreserve(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Plus className="w-3.5 h-3.5" /> Preserve
            </button>
          )}
          {tab === "packages" && (
            <button onClick={() => setShowCreatePkg(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Plus className="w-3.5 h-3.5" /> New Package
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

      {/* Items Tab */}
      {tab === "items" && (
        <>
          {/* Quick filter: Returned Media Cases */}
          <div className="mb-3">
            <button
              onClick={() => {
                if (evidenceTypeFilter === 'media_revision_request') {
                  setEvidenceTypeFilter(''); setSourceFilter('');
                } else {
                  setEvidenceTypeFilter('media_revision_request');
                  setSourceFilter('social_payload');
                }
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-all ${
                evidenceTypeFilter === 'media_revision_request'
                  ? 'border-orange-500/40 bg-orange-500/10 text-orange-400'
                  : 'border-border bg-surface text-foreground-muted hover:border-orange-500/30 hover:text-orange-400'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Returned Media Cases
              {evidenceTypeFilter === 'media_revision_request' && (
                <span className="ml-1 w-1.5 h-1.5 rounded-full bg-orange-500" />
              )}
            </button>
          </div>

          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)}
              className="bg-surface border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground">
              <option value="">All Sources</option>
              <option value="audit_event">Audit Event</option>
              <option value="forensic_case">Forensic Case</option>
              <option value="ai_output">AI Output</option>
              <option value="social_payload">Social Payload</option>
              <option value="policy_snapshot">Policy Snapshot</option>
            </select>
            <select value={stateFilter} onChange={e => setStateFilter(e.target.value)}
              className="bg-surface border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground">
              <option value="">All States</option>
              <option value="preserved">Preserved</option>
              <option value="sealed">Sealed</option>
              <option value="legal_hold">Legal Hold</option>
              <option value="archived">Archived</option>
            </select>
            {(sourceFilter || stateFilter || evidenceTypeFilter) && (
              <button onClick={() => { setSourceFilter(""); setStateFilter(""); setEvidenceTypeFilter(""); }}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-foreground-muted hover:text-foreground">
                <X className="w-3 h-3" /> Clear
              </button>
            )}
          </div>
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            {itemsLoading ? (
              <div className="p-10 text-center text-xs text-foreground-muted">Loading…</div>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-foreground-muted bg-surface-hover">
                    <th className="text-left p-3 font-medium">Item ID</th>
                    <th className="text-left p-3 font-medium">Evidence Type</th>
                    <th className="text-left p-3 font-medium">Source</th>
                    <th className="text-left p-3 font-medium">State</th>
                    <th className="text-left p-3 font-medium">Retention</th>
                    <th className="text-left p-3 font-medium">Risk</th>
                    <th className="text-left p-3 font-medium">Hold</th>
                    <th className="text-left p-3 font-medium">Preserved</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item: any) => (
                    <tr key={item.id}
                      onClick={() => router.push(`/evidence/evidence-vault/items/${item.id}`)}
                      className="border-b border-border last:border-0 hover:bg-surface-hover cursor-pointer">
                      <td className="p-3 font-mono text-[11px] text-foreground">{item.item_id}</td>
                      <td className="p-3">
                        {item.evidence_type === 'media_revision_request' ? (
                          <span className="flex items-center gap-1 text-orange-400 text-[10px] bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded-full w-fit">
                            <RotateCcw className="w-2.5 h-2.5" /> Returned Media
                          </span>
                        ) : item.evidence_type ? (
                          <span className="text-[11px] text-foreground-muted">{item.evidence_type.replace(/_/g, ' ')}</span>
                        ) : (
                          <span className="text-foreground-muted opacity-30">—</span>
                        )}
                      </td>
                      <td className="p-3 text-foreground-muted">
                        {item.source_type}
                        {item.source_id && <span className="ml-1 opacity-50">:{item.source_id.substring(0, 8)}</span>}
                      </td>
                      <td className="p-3">
                        <span className={`inline-block px-2 py-0.5 rounded border text-[10px] ${STATE_COLOR[item.vault_state] || "text-foreground-muted border-border"}`}>
                          {item.vault_state}
                        </span>
                      </td>
                      <td className="p-3 text-foreground-muted">{item.retention_class}</td>
                      <td className="p-3 text-foreground-muted">{item.risk_level}</td>
                      <td className="p-3">
                        {item.legal_hold
                          ? <span className="flex items-center gap-1 text-red-400 text-[11px]"><Lock className="w-3 h-3" /> Held</span>
                          : <span className="text-foreground-muted">—</span>}
                      </td>
                      <td className="p-3 text-foreground-muted">{fmt(item.created_at)}</td>
                    </tr>
                  ))}
                  {items.length === 0 && (
                    <tr><td colSpan={8} className="p-10 text-center text-foreground-muted">
                      <Archive className="w-7 h-7 mx-auto mb-2 opacity-30" />
                      <p>No evidence items yet</p>
                    </td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
          <p className="text-xs text-foreground-muted mt-2">{itemsTotal} total items</p>
        </>
      )}

      {/* Packages Tab */}
      {tab === "packages" && (
        <>
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            {pkgsLoading ? (
              <div className="p-10 text-center text-xs text-foreground-muted">Loading…</div>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-foreground-muted bg-surface-hover">
                    <th className="text-left p-3 font-medium">Package ID</th>
                    <th className="text-left p-3 font-medium">Title</th>
                    <th className="text-left p-3 font-medium">Type</th>
                    <th className="text-left p-3 font-medium">Status</th>
                    <th className="text-left p-3 font-medium">Items</th>
                    <th className="text-left p-3 font-medium">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {packages.map((pkg: any) => (
                    <tr key={pkg.id} className="border-b border-border last:border-0 hover:bg-surface-hover">
                      <td className="p-3 font-mono text-[11px] text-foreground">{pkg.package_id}</td>
                      <td className="p-3 font-medium text-foreground">{pkg.title}</td>
                      <td className="p-3 text-foreground-muted">{(pkg.package_type || "").replace(/_/g, " ")}</td>
                      <td className="p-3">
                        <span className={`inline-block px-2 py-0.5 rounded border text-[10px] ${PKG_STATUS_COLOR[pkg.status] || "text-foreground-muted border-border"}`}>
                          {pkg.status}
                        </span>
                      </td>
                      <td className="p-3 text-foreground-muted">{pkg.item_count ?? "—"}</td>
                      <td className="p-3 text-foreground-muted">{fmt(pkg.created_at)}</td>
                    </tr>
                  ))}
                  {packages.length === 0 && (
                    <tr><td colSpan={6} className="p-10 text-center text-foreground-muted">
                      <Package className="w-7 h-7 mx-auto mb-2 opacity-30" />
                      <p>No packages yet</p>
                    </td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
          <p className="text-xs text-foreground-muted mt-2">{pkgsTotal} total packages</p>
        </>
      )}

      {showPreserve && <PreserveModal onClose={() => setShowPreserve(false)} onDone={() => { setShowPreserve(false); fetchItems(); }} />}
      {showCreatePkg && <CreatePackageModal onClose={() => setShowCreatePkg(false)} onDone={() => { setShowCreatePkg(false); fetchPackages(); }} />}
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

function PreserveModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [sourceType, setSourceType] = useState("audit_event");
  const [sourceId, setSourceId] = useState("");
  const [reason, setReason] = useState("");
  const [retention, setRetention] = useState("standard");
  const [risk, setRisk] = useState("medium");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handle() {
    if (!sourceId || !reason) { setError("Source ID and reason are required"); return; }
    setSaving(true);
    try {
      const res = await api.post("/api/evidence-vault/items/preserve", {
        source_type: sourceType, source_id: sourceId,
        source_system: "audit_trail", preservation_reason: reason,
        retention_class: retention, risk_level: risk,
      });
      if (res.success) onDone(); else setError(res.error || "Failed");
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  }

  return (
    <Modal title="Preserve Evidence" onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="text-xs text-foreground-muted mb-1 block">Source Type</label>
          <select value={sourceType} onChange={e => setSourceType(e.target.value)}
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground">
            <option value="audit_event">Audit Event</option>
            <option value="forensic_case">Forensic Case</option>
            <option value="ai_output">AI Output</option>
            <option value="social_payload">Social Payload</option>
            <option value="policy_snapshot">Policy Snapshot</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-foreground-muted mb-1 block">Source ID <span className="text-red-400">*</span></label>
          <input value={sourceId} onChange={e => setSourceId(e.target.value)} placeholder="UUID"
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground" />
        </div>
        <div>
          <label className="text-xs text-foreground-muted mb-1 block">Reason <span className="text-red-400">*</span></label>
          <textarea value={reason} onChange={e => setReason(e.target.value)} rows={2}
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-foreground-muted mb-1 block">Retention</label>
            <select value={retention} onChange={e => setRetention(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground">
              <option value="standard">Standard (2yr)</option>
              <option value="extended">Extended (7yr)</option>
              <option value="regulated">Regulated (10yr)</option>
              <option value="legal_hold">Legal Hold</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-foreground-muted mb-1 block">Risk Level</label>
            <select value={risk} onChange={e => setRisk(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="px-3 py-2 text-xs text-foreground-muted bg-surface-hover rounded-lg border border-border">Cancel</button>
          <button onClick={handle} disabled={saving} className="px-3 py-2 text-xs text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {saving ? "Preserving…" : "Preserve"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function CreatePackageModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [pkgType, setPkgType] = useState("regulatory_response");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handle() {
    if (!title.trim()) { setError("Title is required"); return; }
    setSaving(true);
    try {
      const res = await api.post("/api/evidence-vault/packages", { package_type: pkgType, title, description: description || undefined });
      if (res.success) onDone(); else setError(res.error || "Failed");
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  }

  return (
    <Modal title="New Package" onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="text-xs text-foreground-muted mb-1 block">Type</label>
          <select value={pkgType} onChange={e => setPkgType(e.target.value)}
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground">
            <option value="regulatory_response">Regulatory Response</option>
            <option value="litigation_hold">Litigation Hold</option>
            <option value="customer_assurance">Customer Assurance</option>
            <option value="board_executive">Board / Executive</option>
            <option value="security_incident">Security Incident</option>
            <option value="ai_governance">AI Governance</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-foreground-muted mb-1 block">Title <span className="text-red-400">*</span></label>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Q2 Regulatory Review"
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground" />
        </div>
        <div>
          <label className="text-xs text-foreground-muted mb-1 block">Description</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
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
    </Modal>
  );
}
