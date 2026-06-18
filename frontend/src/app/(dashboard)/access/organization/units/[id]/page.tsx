"use client";

import { useState, useEffect, use, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Building2, ArrowLeft, Users, BookOpen, Settings, X,
  AlertTriangle, CheckCircle2, Loader2, Info,
  History, Link2, Unlink, UserPlus, UserMinus,
  Archive, RotateCcw, Trash2, Eye,
} from "lucide-react";
import { api } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface BusinessUnit {
  id: string; name: string; description: string | null; color: string;
  status: string; unit_type: string; owner_id: string | null; parent_id: string | null;
  workspace_id: string; created_by: string | null;
  created_at: string; updated_at: string | null;
  archived_at: string | null; archived_by: string | null;
}

interface UnitMember {
  id: string; member_id: string; role_in_unit: string; assigned_at: string;
  user_id: string; user_email: string; user_name: string; workspace_role: string;
}

interface ActivityEntry {
  id: string; business_unit_id: string; workspace_id: string;
  actor_name: string; actor_role: string;
  event_type: string; description: string;
  before_state: Record<string, unknown>; after_state: Record<string, unknown>;
  created_at: string;
}

interface UnitBrand {
  id: string; business_unit_id: string; brand_id: string; linked_at: string;
}

interface UnitEvidence {
  id: string; business_unit_id: string; evidence_id: string; scope_type: string; linked_at: string;
}

interface AvailableMember {
  id: string; user_id: string; user_email: string; user_name: string; workspace_role: string;
}

interface BrandProfile {
  id: string; name: string; description?: string; status?: string;
}

interface BusinessUnitExtended extends BusinessUnit {
  owner_name?: string | null;
}

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  ACTIVE:   { label: "Active",   color: "bg-success-text/10 text-success-text" },
  ARCHIVED: { label: "Archived", color: "bg-[var(--foreground-muted)]/10 text-[var(--foreground-muted)]" },
  DRAFT:    { label: "Draft",    color: "bg-warning-text/10 text-warning-text" },
};

const EVENT_META: Record<string, { label: string }> = {
  "unit.created":     { label: "Created" },
  "unit.updated":     { label: "Updated" },
  "unit.archived":    { label: "Archived" },
  "unit.restored":    { label: "Restored" },
  "unit.member.added":   { label: "Member Added" },
  "unit.member.removed": { label: "Member Removed" },
  "unit.brand.linked":   { label: "Brand Linked" },
  "unit.brand.unlinked": { label: "Brand Unlinked" },
  "unit.evidence.scoped": { label: "Evidence Scoped" },
};

function timeAgo(d: string | null | undefined): string {
  if (!d) return "—";
  const sec = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.floor(hr / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(d).toLocaleDateString();
}

function formatDate(d: string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

// ─── Tab configuration ────────────────────────────────────────────────────────

const DETAIL_TABS = [
  { key: "overview",    label: "Overview",       icon: Info },
  { key: "members",     label: "Members",        icon: Users },
  { key: "brands",      label: "Brands & Assets", icon: BookOpen },
  { key: "evidence",    label: "Evidence Scope", icon: Eye },
  { key: "activity",    label: "Activity Log",   icon: History },
  { key: "settings",    label: "Settings",       icon: Settings },
];

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({ unit }: { unit: BusinessUnitExtended }) {
  const statusCfg = STATUS_CONFIG[unit.status] || STATUS_CONFIG.DRAFT;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4">
          <p className="text-[10px] font-semibold text-[var(--foreground-muted)] uppercase tracking-wide mb-1">Status</p>
          <span className={`px-2.5 py-1 rounded text-[10px] font-black uppercase ${statusCfg.color}`}>{statusCfg.label}</span>
        </div>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4">
          <p className="text-[10px] font-semibold text-[var(--foreground-muted)] uppercase tracking-wide mb-1">Type</p>
          <p className="text-sm font-semibold text-[var(--foreground)] capitalize">{unit.unit_type}</p>
        </div>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4">
          <p className="text-[10px] font-semibold text-[var(--foreground-muted)] uppercase tracking-wide mb-1">Created</p>
          <p className="text-sm font-semibold text-[var(--foreground)]">{formatDate(unit.created_at)}</p>
        </div>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4">
          <p className="text-[10px] font-semibold text-[var(--foreground-muted)] uppercase tracking-wide mb-1">Owner</p>
          <p className="text-sm font-semibold text-[var(--foreground)]">
            {unit.owner_id ? (unit.owner_name || "Assigned") : "Not assigned"}
          </p>
        </div>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4">
          <p className="text-[10px] font-semibold text-[var(--foreground-muted)] uppercase tracking-wide mb-1">Last Updated</p>
          <p className="text-sm font-semibold text-[var(--foreground)]">{formatDate(unit.updated_at)}</p>
        </div>
        {unit.archived_at && (
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4">
            <p className="text-[10px] font-semibold text-[var(--foreground-muted)] uppercase tracking-wide mb-1">Archived</p>
            <p className="text-sm font-semibold text-[var(--foreground)]">{formatDate(unit.archived_at)}</p>
          </div>
        )}
      </div>
      {unit.description && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4">
          <p className="text-[10px] font-semibold text-[var(--foreground-muted)] uppercase tracking-wide mb-2">Description</p>
          <p className="text-sm text-[var(--foreground)]">{unit.description}</p>
        </div>
      )}
    </div>
  );
}

// ─── Members Tab ──────────────────────────────────────────────────────────────

function MembersTab({ unitId }: { unitId: string }) {
  const [members, setMembers] = useState<UnitMember[]>([]);
  const [available, setAvailable] = useState<AvailableMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      const [membersRes, availRes] = await Promise.all([
        api.get(`/api/v1/units/${unitId}/members`),
        api.get(`/api/v1/units/${unitId}/members/available`),
      ]);
      if (membersRes.success === false) { setToast(String(membersRes.error || "Failed to load members")); return; }
      if (availRes.success === false) { setToast(String(availRes.error || "Failed to load available members")); return; }
      setMembers(membersRes.data || []);
      setAvailable(availRes.data || []);
    } catch { setToast("Failed to load members"); } finally { setLoading(false); }
  }, [unitId]);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  const handleAdd = async (memberId: string) => {
    try {
      const res = await api.post(`/api/v1/units/${unitId}/members`, { member_id: memberId });
      if (res.success === false) { setToast(String(res.error || "Failed to add member")); return; }
      setToast("Member added");
      fetchMembers();
      setShowAdd(false);
    } catch { setToast("Failed to add member"); }
  };

  const handleRemove = async (memberId: string) => {
    try {
      const res = await api.delete(`/api/v1/units/${unitId}/members/${memberId}`);
      if (res.success === false) { setToast(String(res.error || "Failed to remove member")); return; }
      setToast("Member removed");
      fetchMembers();
    } catch { setToast("Failed to remove member"); }
  };

  return (
    <div>
      {toast && (
        <div className="mb-4 p-3 rounded-xl bg-success-text/10 border border-success-text/20 text-success-text text-sm flex items-center justify-between">
          {toast} <button onClick={() => setToast(null)}><X className="w-4 h-4" /></button>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-semibold text-[var(--foreground)]">{members.length} member(s)</p>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-info-text hover:bg-info-text text-foreground text-xs font-semibold rounded-xl transition-colors">
          <UserPlus className="w-3.5 h-3.5" /> Add Member
        </button>
      </div>

      {/* Add member panel */}
      {showAdd && (
        <div className="mb-4 p-4 bg-[var(--card)] border border-[var(--border)] rounded-2xl space-y-2">
          <p className="text-xs font-semibold text-[var(--foreground-muted)] uppercase tracking-wide">Available Members</p>
          {available.length === 0 ? (
            <p className="text-xs text-[var(--foreground-muted)]">No available members to add.</p>
          ) : (
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {available.map((m) => (
                <div key={m.id} className="flex items-center justify-between p-2 rounded-xl hover:bg-[var(--surface-hover)] transition-colors">
                  <div>
                    <p className="text-sm text-[var(--foreground)] font-medium">{m.user_name}</p>
                    <p className="text-[10px] text-[var(--foreground-muted)]">{m.user_email}</p>
                  </div>
                  <button onClick={() => handleAdd(m.id)}
                    className="p-1.5 rounded-lg text-info-text hover:bg-info-text/10 transition-all">
                    <UserPlus className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <button onClick={() => setShowAdd(false)} className="text-xs text-[var(--foreground-muted)] hover:text-[var(--foreground)]">Cancel</button>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-12 bg-[var(--card)] border border-[var(--border)] rounded-xl animate-pulse" />)}</div>
      ) : members.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Users className="w-10 h-10 text-[var(--foreground-muted)] mb-3" />
          <p className="text-sm text-[var(--foreground-muted)]">No members assigned to this unit.</p>
        </div>
      ) : (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface-hover)]/50">
                <th className="py-2.5 px-4 text-[9px] font-black text-[var(--foreground-muted)] uppercase tracking-widest">Name</th>
                <th className="py-2.5 px-4 text-[9px] font-black text-[var(--foreground-muted)] uppercase tracking-widest">Role in Unit</th>
                <th className="py-2.5 px-4 text-[9px] font-black text-[var(--foreground-muted)] uppercase tracking-widest">Workspace Role</th>
                <th className="py-2.5 px-4 text-[9px] font-black text-[var(--foreground-muted)] uppercase tracking-widest">Assigned</th>
                <th className="py-2.5 px-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {members.map((m) => (
                <tr key={m.id} className="hover:bg-[var(--surface-hover)]/30 transition-colors">
                  <td className="py-2.5 px-4">
                    <p className="text-sm font-semibold text-[var(--foreground)]">{m.user_name}</p>
                    <p className="text-[10px] text-[var(--foreground-muted)]">{m.user_email}</p>
                  </td>
                  <td className="py-2.5 px-4">
                    <span className="text-xs text-[var(--foreground)] capitalize">{m.role_in_unit}</span>
                  </td>
                  <td className="py-2.5 px-4">
                    <span className="text-[10px] font-semibold text-[var(--foreground-muted)] uppercase">{m.workspace_role}</span>
                  </td>
                  <td className="py-2.5 px-4">
                    <span className="text-xs text-[var(--foreground-muted)]">{timeAgo(m.assigned_at)}</span>
                  </td>
                  <td className="py-2.5 px-4">
                    <button onClick={() => handleRemove(m.member_id)}
                      className="p-1.5 rounded-lg text-[var(--foreground-muted)] hover:text-red-400 hover:bg-red-500/10 transition-all" title="Remove">
                      <UserMinus className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Brands Tab ───────────────────────────────────────────────────────────────

function BrandsTab({ unitId }: { unitId: string }) {
  const [brands, setBrands] = useState<UnitBrand[]>([]);
  const [allBrands, setAllBrands] = useState<BrandProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBrandId, setSelectedBrandId] = useState("");
  const [manualBrandId, setManualBrandId] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  const linkedBrandIds = new Set(brands.map((b) => b.brand_id));
  const availableBrands = allBrands.filter((b) => !linkedBrandIds.has(b.id));

  const fetchBrands = useCallback(async () => {
    setLoading(true);
    try {
      const [linkedRes, allRes] = await Promise.all([
        api.get(`/api/v1/units/${unitId}/brands`),
        api.get("/api/v1/governance/brand/profiles"),
      ]);
      if (linkedRes.success === false) { setToast(String(linkedRes.error || "Failed to load brands")); setLoading(false); return; }
      if (allRes.success === false) { setToast(String(allRes.error || "Failed to load brand profiles")); setLoading(false); return; }
      setBrands(linkedRes.data || []);
      setAllBrands(allRes.data || []);
    } catch { setToast("Failed to load brands"); } finally { setLoading(false); }
  }, [unitId]);

  useEffect(() => { fetchBrands(); }, [fetchBrands]);

  const handleLink = async (brandId: string) => {
    if (!brandId) return;
    try {
      const res = await api.post(`/api/v1/units/${unitId}/brands`, { brand_id: brandId });
      if (res.success === false) { setToast(String(res.error || "Failed to link")); return; }
      setToast("Brand linked");
      setSelectedBrandId("");
      setManualBrandId("");
      fetchBrands();
    } catch { setToast("Failed to link brand"); }
  };

  const handleUnlink = async (brandId: string) => {
    try {
      const res = await api.delete(`/api/v1/units/${unitId}/brands/${brandId}`);
      if (res.success === false) { setToast(String(res.error || "Failed to unlink")); return; }
      setToast("Brand unlinked");
      fetchBrands();
    } catch { setToast("Failed to unlink brand"); }
  };

  return (
    <div>
      {toast && (
        <div className="mb-4 p-3 rounded-xl bg-success-text/10 border border-success-text/20 text-success-text text-sm flex items-center justify-between">
          {toast} <button onClick={() => setToast(null)}><X className="w-4 h-4" /></button>
        </div>
      )}

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {availableBrands.length > 0 ? (
          <>
            <select value={selectedBrandId} onChange={(e) => setSelectedBrandId(e.target.value)}
              className="flex-1 min-w-[200px] bg-[var(--surface-hover)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:border-info-border/50 transition-all">
              <option value="">— Select a brand —</option>
              {availableBrands.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
            <button onClick={() => handleLink(selectedBrandId)} disabled={!selectedBrandId}
              className="flex items-center gap-1.5 px-3 py-2 bg-info-text hover:bg-info-text disabled:opacity-50 text-foreground text-xs font-semibold rounded-xl transition-colors">
              <Link2 className="w-3.5 h-3.5" /> Link
            </button>
          </>
        ) : (
          <>
            <input type="text" value={manualBrandId} onChange={(e) => setManualBrandId(e.target.value)}
              placeholder="Enter brand ID…"
              className="flex-1 min-w-[200px] bg-[var(--surface-hover)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--foreground-muted)] focus:outline-none focus:border-info-border/50 transition-all" />
            <button onClick={() => handleLink(manualBrandId.trim())} disabled={!manualBrandId.trim()}
              className="flex items-center gap-1.5 px-3 py-2 bg-info-text hover:bg-info-text disabled:opacity-50 text-foreground text-xs font-semibold rounded-xl transition-colors">
              <Link2 className="w-3.5 h-3.5" /> Link
            </button>
            <a href="/governance/brand-library" className="text-xs text-info-text hover:underline shrink-0">
              Brand Library
            </a>
          </>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">{[1,2].map(i => <div key={i} className="h-10 bg-[var(--card)] border border-[var(--border)] rounded-xl animate-pulse" />)}</div>
      ) : brands.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <BookOpen className="w-10 h-10 text-[var(--foreground-muted)] mb-3" />
          <p className="text-sm text-[var(--foreground-muted)]">No brands linked to this unit.</p>
          {allBrands.length === 0 && (
            <a href="/governance/brand-library" className="mt-2 text-xs text-info-text hover:underline">
              Create brands in Brand Library
            </a>
          )}
        </div>
      ) : (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface-hover)]/50">
                <th className="py-2.5 px-4 text-[9px] font-black text-[var(--foreground-muted)] uppercase tracking-widest">Brand</th>
                <th className="py-2.5 px-4 text-[9px] font-black text-[var(--foreground-muted)] uppercase tracking-widest">Status</th>
                <th className="py-2.5 px-4 text-[9px] font-black text-[var(--foreground-muted)] uppercase tracking-widest">Linked</th>
                <th className="py-2.5 px-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {brands.map((b) => {
                const profile = allBrands.find(p => p.id === b.brand_id);
                return (
                  <tr key={b.id} className="hover:bg-[var(--surface-hover)]/30 transition-colors">
                    <td className="py-2.5 px-4">
                      <p className="text-sm font-semibold text-[var(--foreground)]">
                        {profile?.name || b.brand_id}
                      </p>
                      <p className="text-[10px] text-[var(--foreground-muted)] font-mono">{b.brand_id}</p>
                    </td>
                    <td className="py-2.5 px-4">
                      {profile ? (
                        <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-success-text/10 text-success-text">{profile.status || "Active"}</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-warning-text/10 text-warning-text">Unknown</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="text-xs text-[var(--foreground-muted)]">{timeAgo(b.linked_at)}</span>
                    </td>
                    <td className="py-2.5 px-4">
                      <button onClick={() => handleUnlink(b.brand_id)}
                        className="p-1.5 rounded-lg text-[var(--foreground-muted)] hover:text-red-400 hover:bg-red-500/10 transition-all" title="Unlink">
                        <Unlink className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Evidence Scope Tab ────────────────────────────────────────────────────────

function EvidenceScopesTab({ unitId }: { unitId: string }) {
  const [scopes, setScopes] = useState<UnitEvidence[]>([]);
  const [loading, setLoading] = useState(true);
  const [evidenceId, setEvidenceId] = useState("");
  const [scopeType, setScopeType] = useState("restricted");
  const [toast, setToast] = useState<string | null>(null);

  const fetchScopes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/v1/units/${unitId}/evidence-scope`);
      if (res.success === false) { setToast(String(res.error || "Failed to load")); return; }
      setScopes(res.data || []);
    } catch { setToast("Failed to load evidence scopes"); } finally { setLoading(false); }
  }, [unitId]);

  useEffect(() => { fetchScopes(); }, [fetchScopes]);

  const handleAdd = async () => {
    if (!evidenceId.trim()) return;
    try {
      const res = await api.post(`/api/v1/units/${unitId}/evidence-scope`, {
        evidence_id: evidenceId.trim(),
        scope_type: scopeType,
      });
      if (res.success === false) { setToast(String(res.error || "Failed to add")); return; }
      setToast("Evidence scope added");
      setEvidenceId("");
      fetchScopes();
    } catch { setToast("Failed to add evidence scope"); }
  };

  const handleRemove = async (scopeId: string) => {
    try {
      const res = await api.delete(`/api/v1/units/${unitId}/evidence-scope/${scopeId}`);
      if (res.success === false) { setToast(String(res.error || "Failed to remove")); return; }
      setToast("Evidence scope removed");
      fetchScopes();
    } catch { setToast("Failed to remove evidence scope"); }
  };

  return (
    <div>
      {toast && (
        <div className="mb-4 p-3 rounded-xl bg-success-text/10 border border-success-text/20 text-success-text text-sm flex items-center justify-between">
          {toast} <button onClick={() => setToast(null)}><X className="w-4 h-4" /></button>
        </div>
      )}

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <input type="text" value={evidenceId} onChange={(e) => setEvidenceId(e.target.value)}
          placeholder="Enter evidence ID…"
          className="flex-1 min-w-[200px] bg-[var(--surface-hover)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--foreground-muted)] focus:outline-none focus:border-info-border/50 transition-all" />
        <select value={scopeType} onChange={(e) => setScopeType(e.target.value)}
          className="bg-[var(--surface-hover)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:border-info-border/50 transition-all">
          <option value="restricted">Restricted</option>
          <option value="full">Full</option>
          <option value="readonly">Read-Only</option>
        </select>
        <button onClick={handleAdd} disabled={!evidenceId.trim()}
          className="flex items-center gap-1.5 px-3 py-2 bg-info-text hover:bg-info-text disabled:opacity-50 text-foreground text-xs font-semibold rounded-xl transition-colors">
          <Link2 className="w-3.5 h-3.5" /> Add Scope
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">{[1,2].map(i => <div key={i} className="h-10 bg-[var(--card)] border border-[var(--border)] rounded-xl animate-pulse" />)}</div>
      ) : scopes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Eye className="w-10 h-10 text-[var(--foreground-muted)] mb-3" />
          <p className="text-sm text-[var(--foreground-muted)]">No evidence scopes configured.</p>
        </div>
      ) : (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface-hover)]/50">
                <th className="py-2.5 px-4 text-[9px] font-black text-[var(--foreground-muted)] uppercase tracking-widest">Evidence ID</th>
                <th className="py-2.5 px-4 text-[9px] font-black text-[var(--foreground-muted)] uppercase tracking-widest">Scope Type</th>
                <th className="py-2.5 px-4 text-[9px] font-black text-[var(--foreground-muted)] uppercase tracking-widest">Linked</th>
                <th className="py-2.5 px-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {scopes.map((s) => (
                <tr key={s.id} className="hover:bg-[var(--surface-hover)]/30 transition-colors">
                  <td className="py-2.5 px-4">
                    <span className="text-sm font-mono text-[var(--foreground)]">{s.evidence_id}</span>
                  </td>
                  <td className="py-2.5 px-4">
                    <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-info-text/10 text-info-text">{s.scope_type}</span>
                  </td>
                  <td className="py-2.5 px-4">
                    <span className="text-xs text-[var(--foreground-muted)]">{timeAgo(s.linked_at)}</span>
                  </td>
                  <td className="py-2.5 px-4">
                    <button onClick={() => handleRemove(s.id)}
                      className="p-1.5 rounded-lg text-[var(--foreground-muted)] hover:text-red-400 hover:bg-red-500/10 transition-all" title="Remove scope">
                      <Unlink className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Activity Log Tab ─────────────────────────────────────────────────────────

function ActivityLogTab({ unitId }: { unitId: string }) {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    api.get(`/api/v1/units/${unitId}/activity`).then((res) => {
      if (res.success === false) { setToast(String(res.error || "Failed to load activity")); setEntries([]); return; }
      setEntries(res.data || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [unitId]);

  if (loading) return <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-12 bg-[var(--card)] border border-[var(--border)] rounded-xl animate-pulse" />)}</div>;

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <History className="w-10 h-10 text-[var(--foreground-muted)] mb-3" />
        <p className="text-sm text-[var(--foreground-muted)]">No activity recorded yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-[var(--border)] bg-[var(--surface-hover)]/50">
            <th className="py-2.5 px-4 text-[9px] font-black text-[var(--foreground-muted)] uppercase tracking-widest">Event Type</th>
            <th className="py-2.5 px-4 text-[9px] font-black text-[var(--foreground-muted)] uppercase tracking-widest">Actor</th>
            <th className="py-2.5 px-4 text-[9px] font-black text-[var(--foreground-muted)] uppercase tracking-widest">Description</th>
            <th className="py-2.5 px-4 text-[9px] font-black text-[var(--foreground-muted)] uppercase tracking-widest">When</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)]">
          {entries.map((e) => {
            const meta = EVENT_META[e.event_type] || { label: e.event_type };
            return (
              <tr key={e.id} className="hover:bg-[var(--surface-hover)]/30 transition-colors">
                <td className="py-2.5 px-4">
                  <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-info-text/10 text-info-text">{meta.label}</span>
                </td>
                <td className="py-2.5 px-4">
                  <p className="text-xs text-[var(--foreground)] font-medium">{e.actor_name}</p>
                  <p className="text-[9px] text-[var(--foreground-muted)]">{e.actor_role}</p>
                </td>
                <td className="py-2.5 px-4">
                  <p className="text-xs text-[var(--foreground)]">{e.description}</p>
                </td>
                <td className="py-2.5 px-4">
                  <span className="text-xs text-[var(--foreground-muted)]">{timeAgo(e.created_at)}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Settings Tab ─────────────────────────────────────────────────────────────

function SettingsTab({ unit, onUpdated }: { unit: BusinessUnit; onUpdated: () => void }) {
  const [name, setName] = useState(unit.name);
  const [description, setDescription] = useState(unit.description || "");
  const [color, setColor] = useState(unit.color);
  const [unitType, setUnitType] = useState(unit.unit_type);

  useEffect(() => {
    setName(unit.name);
    setDescription(unit.description || "");
    setColor(unit.color);
    setUnitType(unit.unit_type);
  }, [unit.id, unit.name, unit.description, unit.color, unit.unit_type]);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await api.put(`/api/v1/units/${unit.id}`, {
        name: name.trim(),
        description: description.trim() || null,
        color,
        unit_type: unitType,
      });
      if (res.success === false) { setToast(String(res.error || "Failed to save settings")); setSaving(false); return; }
      setToast("Settings saved");
      onUpdated();
    } catch { setToast("Failed to save settings"); } finally { setSaving(false); }
  };

  return (
    <div className="max-w-lg space-y-4">
      {toast && (
        <div className="p-3 rounded-xl bg-success-text/10 border border-success-text/20 text-success-text text-sm flex items-center justify-between">
          {toast} <button onClick={() => setToast(null)}><X className="w-4 h-4" /></button>
        </div>
      )}
      <div>
        <label className="block text-xs font-semibold text-[var(--foreground-muted)] mb-1.5 uppercase tracking-wide">Name</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)}
          className="w-full bg-[var(--surface-hover)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm text-[var(--foreground)] focus:outline-none focus:border-info-border/50 transition-all" />
      </div>
      <div>
        <label className="block text-xs font-semibold text-[var(--foreground-muted)] mb-1.5 uppercase tracking-wide">Description</label>
        <input type="text" value={description} onChange={(e) => setDescription(e.target.value)}
          className="w-full bg-[var(--surface-hover)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm text-[var(--foreground)] focus:outline-none focus:border-info-border/50 transition-all" />
      </div>
      <div>
        <label className="block text-xs font-semibold text-[var(--foreground-muted)] mb-1.5 uppercase tracking-wide">Unit Type</label>
        <select value={unitType} onChange={(e) => setUnitType(e.target.value)}
          className="w-full bg-[var(--surface-hover)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm text-[var(--foreground)] focus:outline-none focus:border-info-border/50 transition-all">
          {["department","region","team","division","project"].map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs font-semibold text-[var(--foreground-muted)] mb-2 uppercase tracking-wide">Colour</label>
        <div className="flex items-center gap-2 flex-wrap">
          {["#6366f1","#8b5cf6","#ec4899","#f43f5e","#f97316","#eab308","#22c55e","#14b8a6","#3b82f6","#06b6d4","#64748b","#a16207"].map((c) => (
            <button key={c} onClick={() => setColor(c)}
              className={`w-7 h-7 rounded-lg transition-all ${color === c ? "ring-2 ring-offset-2 ring-offset-[var(--card)] ring-white scale-110" : "hover:scale-110"}`}
              style={{ background: c }} />
          ))}
        </div>
      </div>
      <button onClick={handleSave} disabled={saving || !name.trim()}
        className="px-5 py-2 bg-info-text hover:bg-info-text disabled:opacity-50 text-foreground text-sm font-semibold rounded-xl transition-colors flex items-center gap-2">
        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
        {saving ? "Saving…" : "Save Changes"}
      </button>
    </div>
  );
}

// ─── Main Detail Page ─────────────────────────────────────────────────────────

export default function UnitDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [unit, setUnit] = useState<BusinessUnitExtended | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [actionToast, setActionToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [archiving, setArchiving] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const fetchUnit = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/v1/units/${id}`);
      if (res.success === false) { setError(String(res.error || "Failed to load")); return; }
      setUnit(res.data || null);
    } catch {
      setError("Business unit not found.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchUnit(); }, [fetchUnit]);

  const handleArchive = async () => {
    setArchiving(true);
    try {
      const res = await api.post(`/api/v1/units/${id}/archive`, {});
      if (res.success === false) { setActionToast({ message: String(res.error || "Failed to archive"), type: "error" }); return; }
      setActionToast({ message: "Unit archived", type: "success" });
      fetchUnit();
    } catch { setActionToast({ message: "Failed to archive", type: "error" }); } finally { setArchiving(false); }
  };

  const handleRestore = async () => {
    setRestoring(true);
    try {
      const res = await api.post(`/api/v1/units/${id}/restore`, {});
      if (res.success === false) { setActionToast({ message: String(res.error || "Failed to restore"), type: "error" }); return; }
      setActionToast({ message: "Unit restored", type: "success" });
      fetchUnit();
    } catch { setActionToast({ message: "Failed to restore", type: "error" }); } finally { setRestoring(false); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await api.delete(`/api/v1/units/${id}`);
      if (res.success === false) { setActionToast({ message: String(res.error || "Failed to delete"), type: "error" }); setShowDeleteConfirm(false); return; }
      setActionToast({ message: res.archived ? "Unit archived (has dependent data)" : "Unit deleted permanently", type: "success" });
      setTimeout(() => router.push("/access/organization"), 1200);
    } catch { setActionToast({ message: "Failed to delete", type: "error" }); } finally { setDeleting(false); setShowDeleteConfirm(false); }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="h-8 w-48 bg-[var(--card)] border border-[var(--border)] rounded-xl animate-pulse mb-8" />
        <div className="h-6 w-96 bg-[var(--card)] border border-[var(--border)] rounded-xl animate-pulse mb-6" />
        <div className="h-10 w-80 bg-[var(--card)] border border-[var(--border)] rounded-xl animate-pulse mb-8" />
        <div className="h-64 bg-[var(--card)] border border-[var(--border)] rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (error || !unit) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <AlertTriangle className="w-14 h-14 text-red-400 mb-4" />
          <p className="text-[var(--foreground)] font-semibold mb-1">{error || "Unit not found"}</p>
          <button onClick={() => router.push("/access/organization")}
            className="mt-4 px-4 py-2 bg-info-text hover:bg-info-text text-foreground text-sm font-semibold rounded-xl transition-colors">
            Back to Organization
          </button>
        </div>
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[unit.status] || STATUS_CONFIG.DRAFT;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Toast */}
      {actionToast && (
        <div className={`fixed top-6 right-6 z-[9999] px-4 py-3 rounded-2xl shadow-2xl text-sm font-medium transition-all flex items-center gap-2 ${
          actionToast.type === "success"
            ? "bg-success-text/10 border border-success-text/20 text-success-text"
            : "bg-red-500/10 border border-red-500/20 text-red-400"
        }`}>
          {actionToast.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {actionToast.message}
          <button onClick={() => setActionToast(null)} className="ml-2 opacity-60 hover:opacity-100"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* Back button & header */}
      <div className="mb-8">
        <button onClick={() => router.push("/access/organization")}
          className="flex items-center gap-1.5 text-xs text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors mb-4">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Organization
        </button>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: `${unit.color}20` }}>
              <Building2 className="w-5 h-5" style={{ color: unit.color }} />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-bold text-[var(--foreground)]">{unit.name}</h1>
                <span className={`px-2.5 py-1 rounded text-[9px] font-black uppercase ${statusCfg.color}`}>{statusCfg.label}</span>
              </div>
              <p className="text-sm text-[var(--foreground-muted)] mt-0.5 capitalize">{unit.unit_type}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {unit.status === "ACTIVE" && (
              <button onClick={handleArchive} disabled={archiving}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-warning-text/10 border border-warning-border/20 text-warning-text text-xs font-semibold rounded-xl hover:bg-warning-text/20 transition-all disabled:opacity-50">
                {archiving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Archive className="w-3.5 h-3.5" />}
                Archive
              </button>
            )}
            {unit.status === "ARCHIVED" && (
              <button onClick={handleRestore} disabled={restoring}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-success-text/10 border border-success-border/20 text-success-text text-xs font-semibold rounded-xl hover:bg-success-text/20 transition-all disabled:opacity-50">
                {restoring ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                Restore
              </button>
            )}
            <button onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold rounded-xl hover:bg-red-500/20 transition-all">
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
          </div>
        </div>

        {/* Delete confirmation dialog */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(false)}>
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 max-w-sm w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[var(--foreground)]">Delete Unit</h3>
                  <p className="text-xs text-[var(--foreground-muted)]">This action cannot be undone.</p>
                </div>
              </div>
              <p className="text-sm text-[var(--foreground)] mb-2">
                Are you sure you want to delete <strong>{unit.name}</strong>?
              </p>
              <p className="text-xs text-[var(--foreground-muted)] mb-6">
                If the unit has campaigns, evidence, or activity history, it will be archived instead of permanently deleted.
              </p>
              <div className="flex items-center justify-end gap-2">
                <button onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 text-sm text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors">
                  Cancel
                </button>
                <button onClick={handleDelete} disabled={deleting}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors flex items-center gap-2">
                  {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {deleting ? "Deleting…" : "Delete"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 p-1 bg-[var(--surface-hover)] rounded-xl w-fit mb-8 overflow-x-auto">
        {DETAIL_TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === t.key
                  ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm"
                  : "text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
              }`}>
              <Icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="min-h-[300px]">
        {activeTab === "overview" && <OverviewTab unit={unit} />}
        {activeTab === "members" && <MembersTab unitId={unit.id} />}
        {activeTab === "brands" && <BrandsTab unitId={unit.id} />}
        {activeTab === "evidence" && <EvidenceScopesTab unitId={unit.id} />}
        {activeTab === "activity" && <ActivityLogTab unitId={unit.id} />}
        {activeTab === "settings" && <SettingsTab unit={unit} onUpdated={fetchUnit} />}
      </div>
    </div>
  );
}
