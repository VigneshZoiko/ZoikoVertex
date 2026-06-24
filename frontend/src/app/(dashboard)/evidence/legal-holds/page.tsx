"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import {
  Gavel, Plus, X, RefreshCw, Filter, Lock, Unlock, AlertTriangle,
  Shield, Clock, CheckCircle2,
} from "lucide-react";

interface VaultHold {
  id: string;
  hold_id: string;
  scope_type: string;
  scope_id: string | null;
  matter_ref: string;
  jurisdiction: string | null;
  reason: string;
  requester_id: string;
  approver_id: string | null;
  effective_date: string;
  review_date: string | null;
  released: boolean;
  released_at: string | null;
  released_reason: string | null;
  released_by: string | null;
  created_at: string;
}

function fmt(ts: string) {
  try { return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
  catch { return "—"; }
}

export default function LegalHoldsPage() {
  const [holds, setHolds] = useState<VaultHold[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [releasedFilter, setReleasedFilter] = useState("");
  const [showApply, setShowApply] = useState(false);
  const [releaseTarget, setReleaseTarget] = useState<VaultHold | null>(null);

  const fetchHolds = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (releasedFilter) params.set("released", releasedFilter);
      const res = await api.get(`/api/evidence-vault/holds?${params.toString()}`);
      if (res.success) { setHolds(res.data || []); setTotal(res.total || 0); }
    } catch (e: any) { setError(e?.message || "Failed to fetch holds"); }
    finally { setLoading(false); }
  }, [releasedFilter]);

  useEffect(() => { fetchHolds(); }, [fetchHolds]);

  const active = holds.filter(h => !h.released).length;
  const released = holds.filter(h => h.released).length;
  const pendingReview = holds.filter(h => !h.released && h.review_date && new Date(h.review_date) <= new Date()).length;

  return (
    <div className="px-4 sm:p-6 max-w-7xl mx-auto pb-24">
      {error && (
        <div className="mb-4 p-3 bg-error-bg border border-error-border rounded-lg flex items-center gap-2">
          <p className="text-xs text-error-text">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto text-error-text/60 hover:text-error-text"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Gavel className="w-5 h-5 text-foreground-muted" /> Legal Holds
          </h1>
          <p className="text-xs text-foreground-muted mt-1">Apply, manage, and release legal holds on evidence — dual-authorisation required to release</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={fetchHolds} className="flex items-center gap-1.5 px-3 py-1.5 bg-surface text-xs text-foreground/70 rounded-lg hover:bg-surface-hover border border-border">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
          <button onClick={() => setShowApply(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-xs text-white rounded-lg hover:bg-red-700">
            <Plus className="w-3.5 h-3.5" /> Apply Hold
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6">
        <div className="bg-surface border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-red-500/10 flex items-center justify-center">
            <Lock className="w-4 h-4 text-red-500" />
          </div>
          <div>
            <p className="text-xl font-bold text-foreground">{active}</p>
            <p className="text-xs text-foreground-muted">Active Holds</p>
          </div>
        </div>
        <div className="bg-surface border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div>
            <p className="text-xl font-bold text-foreground">{pendingReview}</p>
            <p className="text-xs text-foreground-muted">Pending Review</p>
          </div>
        </div>
        <div className="bg-surface border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-green-500/10 flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
          </div>
          <div>
            <p className="text-xl font-bold text-foreground">{released}</p>
            <p className="text-xs text-foreground-muted">Released</p>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-1.5 text-xs text-foreground-muted"><Filter className="w-3 h-3" /> Filter:</div>
        <select value={releasedFilter} onChange={e => setReleasedFilter(e.target.value)}
          className="bg-surface border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground">
          <option value="">All Holds</option>
          <option value="false">Active Only</option>
          <option value="true">Released Only</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-foreground-muted">Loading holds...</div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[720px]">
            <thead>
              <tr className="border-b border-border text-foreground-muted bg-surface-hover">
                <th className="text-left p-3 font-medium">Hold ID</th>
                <th className="text-left p-3 font-medium">Matter</th>
                <th className="text-left p-3 font-medium">Scope</th>
                <th className="text-left p-3 font-medium">Jurisdiction</th>
                <th className="text-left p-3 font-medium">Reason</th>
                <th className="text-left p-3 font-medium">Effective</th>
                <th className="text-left p-3 font-medium">Review</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-left p-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {holds.map(hold => (
                <tr key={hold.id} className="border-b border-border last:border-0 hover:bg-surface-hover">
                  <td className="p-3 font-mono text-[11px] text-foreground">{hold.hold_id}</td>
                  <td className="p-3 font-mono text-[11px] text-foreground">{hold.matter_ref}</td>
                  <td className="p-3 text-foreground/70 text-[11px]">
                    <span className="px-1.5 py-0.5 bg-surface-hover rounded text-[10px]">{hold.scope_type}</span>
                    {hold.scope_id && <span className="ml-1 text-foreground-muted">{hold.scope_id.substring(0, 8)}…</span>}
                  </td>
                  <td className="p-3 text-foreground-muted">{hold.jurisdiction || "—"}</td>
                  <td className="p-3 text-foreground/70 max-w-[180px] truncate" title={hold.reason}>{hold.reason}</td>
                  <td className="p-3 text-foreground-muted text-[11px]">{fmt(hold.effective_date)}</td>
                  <td className="p-3 text-foreground-muted text-[11px]">
                    {hold.review_date ? (
                      <span className={new Date(hold.review_date) <= new Date() ? "text-amber-500" : ""}>
                        {fmt(hold.review_date)}
                      </span>
                    ) : "—"}
                  </td>
                  <td className="p-3">
                    {hold.released
                      ? <span className="flex items-center gap-1 text-green-500 text-[11px]"><Unlock className="w-3 h-3" /> Released</span>
                      : <span className="flex items-center gap-1 text-red-500 text-[11px]"><Lock className="w-3 h-3" /> Active</span>
                    }
                  </td>
                  <td className="p-3">
                    {!hold.released && (
                      <button
                        onClick={() => setReleaseTarget(hold)}
                        className="flex items-center gap-1 px-2.5 py-1 text-[11px] border border-border rounded-lg text-foreground-muted hover:text-foreground hover:border-foreground-muted"
                      >
                        <Unlock className="w-3 h-3" /> Release
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {holds.length === 0 && (
                <tr><td colSpan={9} className="p-8 text-center text-foreground-muted">No legal holds found.</td></tr>
              )}
            </tbody>
          </table>
          </div>
        )}
      </div>
      <p className="text-xs text-foreground-muted mt-2">{total} total holds</p>

      {showApply && (
        <ApplyHoldModal
          onClose={() => setShowApply(false)}
          onCreated={() => { setShowApply(false); fetchHolds(); }}
        />
      )}
      {releaseTarget && (
        <ReleaseHoldModal
          hold={releaseTarget}
          onClose={() => setReleaseTarget(null)}
          onReleased={() => { setReleaseTarget(null); fetchHolds(); }}
        />
      )}
    </div>
  );
}

function ApplyHoldModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [scopeType, setScopeType] = useState("item");
  const [scopeId, setScopeId] = useState("");
  const [matterRef, setMatterRef] = useState("");
  const [jurisdiction, setJurisdiction] = useState("");
  const [reason, setReason] = useState("");
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().split("T")[0]);
  const [reviewDate, setReviewDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!matterRef || !reason || !effectiveDate) { setError("Matter reference, reason, and effective date are required"); return; }
    setSaving(true); setError(null);
    try {
      const res = await api.post("/api/evidence-vault/holds", {
        scope_type: scopeType, scope_id: scopeId || undefined,
        matter_ref: matterRef, jurisdiction: jurisdiction || undefined,
        reason, effective_date: effectiveDate,
        review_date: reviewDate || undefined,
      });
      if (res.success) onCreated();
      else setError(res.error || "Failed to apply hold");
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 bg-background/60 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-surface border border-border rounded-xl p-6 w-full max-w-lg mx-4 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2"><Gavel className="w-4 h-4 text-red-500" /> Apply Legal Hold</h2>
          <button onClick={onClose}><X className="w-4 h-4 text-foreground-muted hover:text-foreground" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-foreground-muted mb-1 block">Scope Type</label>
            <select value={scopeType} onChange={e => setScopeType(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground">
              <option value="item">Item</option>
              <option value="collection">Collection</option>
              <option value="package">Package</option>
              <option value="case">Case</option>
              <option value="campaign">Campaign</option>
              <option value="actor">Actor</option>
              <option value="source_system">Source System</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-foreground-muted mb-1 block">Scope ID <span className="text-foreground-muted/60">(optional)</span></label>
            <input value={scopeId} onChange={e => setScopeId(e.target.value)}
              placeholder="UUID of the item/collection/package"
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground" />
          </div>
          <div>
            <label className="text-xs text-foreground-muted mb-1 block">Matter Reference <span className="text-red-400">*</span></label>
            <input value={matterRef} onChange={e => setMatterRef(e.target.value)}
              placeholder="e.g. MATTER-2026-001"
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-foreground-muted mb-1 block">Jurisdiction</label>
              <input value={jurisdiction} onChange={e => setJurisdiction(e.target.value)} placeholder="e.g. GB, IN"
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground" />
            </div>
            <div>
              <label className="text-xs text-foreground-muted mb-1 block">Review Date</label>
              <input type="date" value={reviewDate} onChange={e => setReviewDate(e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground" />
            </div>
          </div>
          <div>
            <label className="text-xs text-foreground-muted mb-1 block">Reason <span className="text-red-400">*</span></label>
            <textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Legal basis for hold"
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground" rows={2} />
          </div>
          <div>
            <label className="text-xs text-foreground-muted mb-1 block">Effective Date <span className="text-red-400">*</span></label>
            <input type="date" value={effectiveDate} onChange={e => setEffectiveDate(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground" />
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={onClose} className="px-4 py-2 text-xs text-foreground-muted bg-surface-hover rounded-lg hover:bg-surface border border-border">Cancel</button>
            <button onClick={handleSave} disabled={saving}
              className="px-4 py-2 text-xs text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50">
              {saving ? "Applying…" : "Apply Hold"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReleaseHoldModal({ hold, onClose, onReleased }: { hold: VaultHold; onClose: () => void; onReleased: () => void }) {
  const [reason, setReason] = useState("");
  const [authorizedBy, setAuthorizedBy] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRelease() {
    if (!reason) { setError("Release reason is required"); return; }
    setSaving(true); setError(null);
    try {
      const body: Record<string, string> = { reason };
      if (authorizedBy) body.authorized_by = authorizedBy;
      const res = await api.post(`/api/evidence-vault/holds/${hold.id}/release`, body);
      if (res.success) onReleased();
      else setError(res.error || "Failed to release hold");
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 bg-background/60 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-surface border border-border rounded-xl p-6 w-full max-w-md mx-4 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Unlock className="w-4 h-4 text-amber-500" /> Release Legal Hold
          </h2>
          <button onClick={onClose}><X className="w-4 h-4 text-foreground-muted hover:text-foreground" /></button>
        </div>
        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg mb-4 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-medium text-amber-500">Dual-authorisation required</p>
            <p className="text-xs text-foreground-muted mt-0.5">Releasing a hold is permanent. Provide an authoriser ID for separation-of-duties compliance.</p>
          </div>
        </div>
        <div className="space-y-3">
          <div className="p-3 bg-surface-hover rounded-lg text-xs space-y-1">
            <div className="flex gap-2"><span className="text-foreground-muted w-20">Hold ID:</span><span className="font-mono text-foreground">{hold.hold_id}</span></div>
            <div className="flex gap-2"><span className="text-foreground-muted w-20">Matter:</span><span className="font-mono text-foreground">{hold.matter_ref}</span></div>
          </div>
          <div>
            <label className="text-xs text-foreground-muted mb-1 block">Release Reason <span className="text-red-400">*</span></label>
            <textarea value={reason} onChange={e => setReason(e.target.value)}
              placeholder="Why is this hold being released?"
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground" rows={2} />
          </div>
          <div>
            <label className="text-xs text-foreground-muted mb-1 block">
              Authorised By <span className="text-foreground-muted/60">(user ID of second approver)</span>
            </label>
            <input value={authorizedBy} onChange={e => setAuthorizedBy(e.target.value)}
              placeholder="UUID of authorising officer"
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground" />
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={onClose} className="px-4 py-2 text-xs text-foreground-muted bg-surface-hover rounded-lg hover:bg-surface border border-border">Cancel</button>
            <button onClick={handleRelease} disabled={saving}
              className="px-4 py-2 text-xs text-white bg-amber-600 rounded-lg hover:bg-amber-700 disabled:opacity-50">
              {saving ? "Releasing…" : "Confirm Release"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
