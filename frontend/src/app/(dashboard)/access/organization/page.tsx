"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Building2, GitBranch, Shield, Users, Search, Plus, X,
  Archive, RotateCcw, Trash2, AlertTriangle, CheckCircle2,
  Info, ChevronRight, Loader2,
} from "lucide-react";
import { api } from "@/lib/api";
import dynamic from "next/dynamic";

// ─── API response type ─────────────────────────────────────────────────────

interface ApiResponse {
  success: boolean;
  error?: string;
  archived?: boolean;
  data?: unknown;
}

const CreateUnitWizard = dynamic(() => import("./CreateUnitWizard"), {
  loading: () => null,
});

// ─── Types ────────────────────────────────────────────────────────────────────

interface BusinessUnit {
  id: string;
  name: string;
  description: string | null;
  color: string;
  status: string;
  unit_type: string;
  owner_id: string | null;
  parent_id: string | null;
  created_at: string;
  updated_at: string | null;
  archived_at: string | null;
  member_count: number;
  brand_count: number;
  owner_name: string | null;
}

interface UnitStats {
  total: number;
  active: number;
  archived: number;
  noOwner: number;
  totalMembers: number;
}

const UNIT_TYPES = [
  { value: "department", label: "Department" },
  { value: "region", label: "Region" },
  { value: "team", label: "Team" },
  { value: "division", label: "Division" },
  { value: "project", label: "Project" },
];

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  ACTIVE:   { label: "Active",   color: "bg-success-text/10 text-success-text" },
  ARCHIVED: { label: "Archived", color: "bg-[var(--foreground-muted)]/10 text-[var(--foreground-muted)]" },
  DRAFT:    { label: "Draft",    color: "bg-warning-text/10 text-warning-text" },
};

// ─── Time helper ──────────────────────────────────────────────────────────────

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

// ─── Summary Card ─────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, color }: {
  icon: React.ElementType; label: string; value: number | string; color: string;
}) {
  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-2xl font-bold text-[var(--foreground)]">{value}</p>
          <p className="text-xs text-[var(--foreground-muted)] font-medium">{label}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Create Wizard Drawer ─────────────────────────────────────────────────────
// Extracted to CreateUnitWizard.tsx for lazy loading

// ─── Main Page ────────────────────────────────────────────────────────────────

type OrgTab = "business-units" | "role-architecture";

export default function OrganizationStructurePage() {
  const [tab, setTab] = useState<OrgTab>("business-units");
  const [units, setUnits] = useState<BusinessUnit[]>([]);
  const [stats, setStats] = useState<UnitStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showWizard, setShowWizard] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterOwner, setFilterOwner] = useState("all");
  const [filterParent, setFilterParent] = useState("all");

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [unitsRes, statsRes] = await Promise.all([
        api.get("/api/v1/units"),
        api.get("/api/v1/units/stats"),
      ]);
      if (unitsRes.success === false) { setError(String(unitsRes.error || "Failed to load units")); setLoading(false); return; }
      if (statsRes.success === false) { setError(String(statsRes.error || "Failed to load stats")); setLoading(false); return; }
      setUnits(unitsRes.data || []);
      setStats(statsRes.data || null);
    } catch {
      setError("Failed to load organization data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAction = async (
    action: "archive" | "restore" | "delete",
    id: string,
    name: string,
  ) => {
    try {
      const res: ApiResponse = action === "delete"
        ? await api.delete(`/api/v1/units/${id}`)
        : await api.post(`/api/v1/units/${id}/${action}`, {});
      if (res.success === false) {
        setToast({ message: String(res.error || `Failed to ${action} "${name}"`), type: "error" });
        return;
      }
      const msg = action === "archive" ? `"${name}" archived`
        : action === "restore" ? `"${name}" restored`
        : res.archived ? `"${name}" archived (has dependent data)`
        : `"${name}" deleted permanently`;
      setToast({ message: msg, type: "success" });
      fetchData();
    } catch {
      setToast({ message: `Failed to ${action} "${name}"`, type: "error" });
    }
  };

  const handleArchive = (id: string, name: string) => handleAction("archive", id, name);
  const handleRestore = (id: string, name: string) => handleAction("restore", id, name);
  const handleDelete = (id: string, name: string) => handleAction("delete", id, name);

  // Filter
  const filteredUnits = units.filter((u) => {
    const matchesSearch = !search || u.name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === "all" || u.status === filterStatus;
    const matchesType = filterType === "all" || u.unit_type === filterType;
    const matchesOwner = filterOwner === "all" || (filterOwner === "none" && !u.owner_id) || u.owner_id === filterOwner;
    return matchesSearch && matchesStatus && matchesType && matchesOwner;
  });

  // Unique owners for filter dropdown
  const ownerOptions = units.reduce<{ id: string; name: string }[]>((acc, u) => {
    if (u.owner_id && !acc.find(o => o.id === u.owner_id)) {
      acc.push({ id: u.owner_id, name: u.owner_name || u.owner_id.slice(0, 8) });
    }
    return acc;
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-[9999] px-4 py-3 rounded-2xl shadow-2xl text-sm font-medium transition-all ${toast.type === "success" ? "bg-success-text/10 border border-success-text/20 text-success-text" : "bg-red-500/10 border border-red-500/20 text-red-400"} flex items-center gap-2`}>
          {toast.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {toast.message}
          <button onClick={() => setToast(null)} className="ml-2 opacity-60 hover:opacity-100"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* Page header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-info-text/10 flex items-center justify-center">
            <GitBranch className="w-5 h-5 text-info-text" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">Organization Structure</h1>
        </div>
        <p className="text-[var(--foreground-muted)] max-w-3xl leading-relaxed text-sm">
          Govern how your workspace is organised — who owns work, who can act on it,
          who approves it, and who can see evidence.
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 p-1 bg-[var(--surface-hover)] rounded-xl w-fit mb-8">
        <button onClick={() => setTab("business-units")}
          className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${tab === "business-units" ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm" : "text-[var(--foreground-muted)] hover:text-[var(--foreground)]"}`}>
          Business Units
        </button>
        <button onClick={() => setTab("role-architecture")}
          className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${tab === "role-architecture" ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm" : "text-[var(--foreground-muted)] hover:text-[var(--foreground)]"}`}>
          Role Architecture
        </button>
      </div>

      {/* Role Architecture Tab */}
      {tab === "role-architecture" && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Shield className="w-14 h-14 text-[var(--foreground-muted)] mb-4" />
          <p className="text-[var(--foreground)] font-semibold mb-1">Role Architecture</p>
          <p className="text-[var(--foreground-muted)] text-sm max-w-xs mb-6">
            Manage workspace roles, permissions, and control layers.
          </p>
          <a href="/access/roles"
            className="px-5 py-2 bg-info-text hover:bg-info-text text-foreground text-sm font-semibold rounded-xl transition-colors inline-flex items-center gap-2">
            Open Role Architecture <ChevronRight className="w-4 h-4" />
          </a>
        </div>
      )}

      {/* Business Units Tab */}
      {tab === "business-units" && (
        <>
          {/* Summary cards */}
          {stats && !loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
              <StatCard icon={Building2} label="Total Units" value={stats.total} color="bg-info-text/10 text-info-text" />
              <StatCard icon={CheckCircle2} label="Active" value={stats.active} color="bg-success-text/10 text-success-text" />
              <StatCard icon={Archive} label="Archived" value={stats.archived} color="bg-[var(--foreground-muted)]/10 text-[var(--foreground-muted)]" />
              <StatCard icon={Users} label="Total Members" value={stats.totalMembers} color="bg-warning-text/10 text-warning-text" />
              <StatCard icon={AlertTriangle} label="No Owner" value={stats.noOwner} color="bg-red-500/10 text-red-400" />
            </div>
          )}

          {/* Toolbar */}
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--foreground-muted)]" />
                <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search units…"
                  className="w-56 bg-[var(--surface-hover)] border border-[var(--border)] rounded-xl pl-9 pr-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--foreground-muted)] focus:outline-none focus:border-info-border/50 transition-all" />
              </div>
              {/* Status filter */}
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-[var(--surface-hover)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:border-info-border/50 transition-all">
                <option value="all">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="ARCHIVED">Archived</option>
                <option value="DRAFT">Draft</option>
              </select>
              {/* Type filter */}
              <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
                className="bg-[var(--surface-hover)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:border-info-border/50 transition-all">
                <option value="all">All Types</option>
                {UNIT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              {/* Owner filter */}
              <select value={filterOwner} onChange={(e) => setFilterOwner(e.target.value)}
                className="bg-[var(--surface-hover)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:border-info-border/50 transition-all">
                <option value="all">All Owners</option>
                <option value="none">No Owner</option>
                {ownerOptions.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </div>
            <button onClick={() => setShowWizard(true)}
              className="flex items-center gap-2 px-4 py-2 bg-info-text hover:bg-info-text text-foreground text-sm font-semibold rounded-xl transition-colors">
              <Plus className="w-4 h-4" /> New Unit
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center justify-between">
              {error}
              <button onClick={() => setError(null)}><X className="w-4 h-4" /></button>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-16 bg-[var(--card)] border border-[var(--border)] rounded-2xl animate-pulse" />
              ))}
            </div>
          )}

          {/* Empty state */}
          {!loading && filteredUnits.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-14 h-14 rounded-2xl bg-[var(--surface-hover)] flex items-center justify-center mb-4">
                <Building2 className="w-7 h-7 text-[var(--foreground-muted)]" />
              </div>
              <p className="text-[var(--foreground)] font-semibold mb-1">
                {search || filterStatus !== "all" || filterType !== "all" ? "No matching units" : "No business units yet"}
              </p>
              <p className="text-[var(--foreground-muted)] text-sm max-w-xs">
                {search || filterStatus !== "all" || filterType !== "all"
                  ? "Try adjusting your search or filter criteria."
                  : "Create your first unit to organise teams, regions, or departments."}
              </p>
            </div>
          )}

          {/* Table */}
          {!loading && filteredUnits.length > 0 && (
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--surface-hover)]/50">
                    <th className="py-3 px-4 text-[9px] font-black text-[var(--foreground-muted)] uppercase tracking-widest">Name</th>
                    <th className="py-3 px-4 text-[9px] font-black text-[var(--foreground-muted)] uppercase tracking-widest">Owner</th>
                    <th className="py-3 px-4 text-[9px] font-black text-[var(--foreground-muted)] uppercase tracking-widest">Type</th>
                    <th className="py-3 px-4 text-[9px] font-black text-[var(--foreground-muted)] uppercase tracking-widest">Status</th>
                    <th className="py-3 px-4 text-[9px] font-black text-[var(--foreground-muted)] uppercase tracking-widest">Members</th>
                    <th className="py-3 px-4 text-[9px] font-black text-[var(--foreground-muted)] uppercase tracking-widest">Brands</th>
                    <th className="py-3 px-4 text-[9px] font-black text-[var(--foreground-muted)] uppercase tracking-widest">Created</th>
                    <th className="py-3 px-4 text-[9px] font-black text-[var(--foreground-muted)] uppercase tracking-widest">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {filteredUnits.map((unit) => {
                    const statusCfg = STATUS_CONFIG[unit.status] || STATUS_CONFIG.DRAFT;
                    return (
                      <tr key={unit.id} className="hover:bg-[var(--surface-hover)]/30 transition-colors">
                        <td className="py-3 px-4">
                          <Link href={`/access/organization/units/${unit.id}`}
                            className="flex items-center gap-2.5 group cursor-pointer">
                            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: unit.color }} />
                            <div>
                              <p className="text-sm font-semibold text-[var(--foreground)] group-hover:text-info-text transition-colors">
                                {unit.name}
                              </p>
                              {unit.description && (
                                <p className="text-[10px] text-[var(--foreground-muted)] mt-0.5 line-clamp-1">{unit.description}</p>
                              )}
                            </div>
                          </Link>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-xs text-[var(--foreground-muted)]">{unit.owner_name || (unit.owner_id ? "Assigned" : "—")}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-xs text-[var(--foreground-muted)] capitalize">{unit.unit_type}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${statusCfg.color}`}>
                            {statusCfg.label}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-xs text-[var(--foreground)] font-medium">{unit.member_count}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-xs text-[var(--foreground)] font-medium">{unit.brand_count}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-xs text-[var(--foreground-muted)]">{timeAgo(unit.created_at)}</span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1">
                            <Link href={`/access/organization/units/${unit.id}`}
                              className="p-1.5 rounded-lg text-[var(--foreground-muted)] hover:text-info-text hover:bg-info-text/10 transition-all" title="View details">
                              <Info className="w-3.5 h-3.5" />
                            </Link>
                            {unit.status === "ACTIVE" && (
                              <button onClick={() => handleArchive(unit.id, unit.name)}
                                className="p-1.5 rounded-lg text-[var(--foreground-muted)] hover:text-warning-text hover:bg-warning-text/10 transition-all" title="Archive">
                                <Archive className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {unit.status === "ARCHIVED" && (
                              <button onClick={() => handleRestore(unit.id, unit.name)}
                                className="p-1.5 rounded-lg text-[var(--foreground-muted)] hover:text-success-text hover:bg-success-text/10 transition-all" title="Restore">
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button onClick={() => setDeleteTarget({ id: unit.id, name: unit.name })}
                              className="p-1.5 rounded-lg text-[var(--foreground-muted)] hover:text-red-400 hover:bg-red-500/10 transition-all" title="Delete">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Create Wizard */}
      {showWizard && (
        <CreateUnitWizard onClose={() => setShowWizard(false)} onCreated={fetchData} />
      )}

      {/* Delete confirmation dialog */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setDeleteTarget(null)}>
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
              Are you sure you want to delete <strong>{deleteTarget.name}</strong>?
            </p>
            <p className="text-xs text-[var(--foreground-muted)] mb-6">
              If the unit has campaigns, evidence, or activity history, it will be archived instead of permanently deleted.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-sm text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors">
                Cancel
              </button>
              <button onClick={() => { const t = deleteTarget; handleDelete(t.id, t.name); setDeleteTarget(null); }}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-xl transition-colors">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
