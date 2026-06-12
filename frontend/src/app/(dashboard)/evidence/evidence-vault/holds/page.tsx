"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import {
  Gavel, Plus, X, RefreshCw, Filter, ChevronLeft, Lock, Unlock,
} from "lucide-react";
import { useRouter } from "next/navigation";

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
  catch { return "Invalid date"; }
}

export default function VaultHoldsPage() {
  const router = useRouter();
  const [holds, setHolds] = useState<VaultHold[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [releasedFilter, setReleasedFilter] = useState("");
  const [showApply, setShowApply] = useState(false);

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

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {error && (
        <div className="mb-4 p-3 bg-error-bg border border-error-border rounded-lg flex items-center gap-2">
          <p className="text-xs text-error-text">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto text-error-text/60 hover:text-error-text">✕</button>
        </div>
      )}
      <div className="flex items-center justify-between mb-6">
        <div>
          <button onClick={() => router.push('/evidence/evidence-vault')} className="flex items-center gap-1 text-xs text-foreground-muted hover:text-foreground mb-2">
            <ChevronLeft className="w-3.5 h-3.5" /> Back to Vault
          </button>
          <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Gavel className="w-5 h-5 text-foreground-muted" /> Legal Holds
          </h1>
          <p className="text-xs text-foreground-muted mt-1">Apply, manage, and release legal holds on evidence</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchHolds} className="flex items-center gap-1.5 px-3 py-1.5 bg-surface text-xs text-foreground/70 rounded-lg hover:bg-surface-hover">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
          <button onClick={() => setShowApply(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-error-text text-xs text-foreground rounded-lg hover:brightness-110">
            <Plus className="w-3.5 h-3.5" /> Apply Hold
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-1.5 text-xs text-foreground-muted"><Filter className="w-3 h-3" /> Filters:</div>
        <select value={releasedFilter} onChange={e => setReleasedFilter(e.target.value)}
          className="bg-surface border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground">
          <option value="">All Holds</option>
          <option value="false">Active</option>
          <option value="true">Released</option>
        </select>
      </div>

      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border text-foreground-muted">
              <th className="text-left p-3 font-medium">Hold ID</th>
              <th className="text-left p-3 font-medium">Matter</th>
              <th className="text-left p-3 font-medium">Scope</th>
              <th className="text-left p-3 font-medium">Jurisdiction</th>
              <th className="text-left p-3 font-medium">Reason</th>
              <th className="text-left p-3 font-medium">Requester</th>
              <th className="text-left p-3 font-medium">Effective</th>
              <th className="text-left p-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {holds.map(hold => (
              <tr key={hold.id} className="border-b border-border hover:bg-surface">
                <td className="p-3 text-foreground font-mono text-[11px]">{hold.hold_id}</td>
                <td className="p-3 text-foreground font-mono text-[11px]">{hold.matter_ref}</td>
                <td className="p-3 text-foreground/70 text-[10px]">{hold.scope_type}{hold.scope_id ? `:${hold.scope_id.substring(0, 8)}` : ''}</td>
                <td className="p-3 text-foreground-muted">{hold.jurisdiction || '—'}</td>
                <td className="p-3 text-foreground/70 max-w-[200px] truncate">{hold.reason}</td>
                <td className="p-3 text-foreground-muted font-mono text-[11px]">{hold.requester_id.substring(0, 8)}</td>
                <td className="p-3 text-foreground-muted text-[11px]">{fmt(hold.effective_date)}</td>
                <td className="p-3">
                  {hold.released
                    ? <span className="text-success-text flex items-center gap-1"><Unlock className="w-3 h-3" /> Released</span>
                    : <span className="text-error-text flex items-center gap-1"><Lock className="w-3 h-3" /> Active</span>
                  }
                </td>
              </tr>
            ))}
            {holds.length === 0 && !loading && <tr><td colSpan={8} className="p-8 text-center text-foreground-muted">No legal holds applied.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="text-xs text-foreground-muted mt-2">{total} total holds</div>

      {showApply && <ApplyHoldModal onClose={() => setShowApply(false)} onCreated={() => { setShowApply(false); fetchHolds(); }} />}
    </div>
  );
}

function ApplyHoldModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [scopeType, setScopeType] = useState("item");
  const [scopeId, setScopeId] = useState("");
  const [matterRef, setMatterRef] = useState("");
  const [jurisdiction, setJurisdiction] = useState("");
  const [reason, setReason] = useState("");
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().split('T')[0]);
  const [reviewDate, setReviewDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!matterRef || !reason || !effectiveDate) { setError("matter_ref, reason, and effective_date are required"); return; }
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
      <div className="bg-surface border border-border rounded-xl p-6 w-full max-w-lg mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2"><Gavel className="w-4 h-4" /> Apply Legal Hold</h2>
          <button onClick={onClose}><X className="w-4 h-4 text-foreground-muted hover:text-foreground" /></button>
        </div>
        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          <div>
            <label className="text-xs text-foreground-muted mb-1 block">Scope Type</label>
            <select value={scopeType} onChange={e => setScopeType(e.target.value)}
              className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-foreground">
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
            <label className="text-xs text-foreground-muted mb-1 block">Scope ID</label>
            <input value={scopeId} onChange={e => setScopeId(e.target.value)}
              placeholder="UUID of the item/collection/package" className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-foreground" />
          </div>
          <div>
            <label className="text-xs text-foreground-muted mb-1 block">Matter Reference *</label>
            <input value={matterRef} onChange={e => setMatterRef(e.target.value)}
              placeholder="e.g. MATTER-2026-001" className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-foreground" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-foreground-muted mb-1 block">Jurisdiction</label>
              <input value={jurisdiction} onChange={e => setJurisdiction(e.target.value)} placeholder="e.g. GB"
                className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-foreground" />
            </div>
            <div>
              <label className="text-xs text-foreground-muted mb-1 block">Review Date</label>
              <input type="date" value={reviewDate} onChange={e => setReviewDate(e.target.value)}
                className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-foreground" />
            </div>
          </div>
          <div>
            <label className="text-xs text-foreground-muted mb-1 block">Reason *</label>
            <textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Legal basis for hold"
              className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-foreground" rows={2} />
          </div>
          <div>
            <label className="text-xs text-foreground-muted mb-1 block">Effective Date *</label>
            <input type="date" value={effectiveDate} onChange={e => setEffectiveDate(e.target.value)}
              className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-foreground" />
          </div>
          {error && <div className="text-xs text-error-text">{error}</div>}
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={onClose} className="px-4 py-2 text-xs text-foreground-muted bg-surface rounded-lg hover:bg-surface-hover">Cancel</button>
            <button onClick={handleSave} disabled={saving}
              className="px-4 py-2 text-xs text-foreground bg-error-text rounded-lg hover:brightness-110 disabled:opacity-50">
              {saving ? "Applying..." : "Apply Hold"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
