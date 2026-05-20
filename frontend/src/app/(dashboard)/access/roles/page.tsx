"use client";

import { useState, useEffect } from "react";
import {
  Shield,
  Search,
  Info,
  CheckCircle2,
  Cpu,
  Scale,
  CheckSquare,
  Lock,
  AlertTriangle,
  Building2,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { ROLE_ARCHITECTURE, CONTROL_LAYERS } from "@/lib/roles";
import { api } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface BusinessUnit {
  id: string;
  name: string;
  description: string | null;
  color: string;
  created_at: string;
}

// ─── Colour presets for the unit picker ──────────────────────────────────────

const COLOR_PRESETS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e",
  "#f97316", "#eab308", "#22c55e", "#14b8a6",
  "#3b82f6", "#06b6d4", "#64748b", "#a16207",
];

// ─── Roles Tab ────────────────────────────────────────────────────────────────

function RolesTab() {
  const [search, setSearch] = useState("");
  const [activeLayer, setActiveLayer] = useState<string | null>(null);

  const filteredRoles = ROLE_ARCHITECTURE.filter((role) => {
    const matchesSearch =
      role.name.toLowerCase().includes(search.toLowerCase()) ||
      role.description.toLowerCase().includes(search.toLowerCase());
    const matchesLayer = activeLayer ? role.layer === activeLayer : true;
    return matchesSearch && matchesLayer;
  });

  return (
    <div>
      {/* Control Layer Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
        {Object.entries(CONTROL_LAYERS).map(([key, layer]) => (
          <button
            key={key}
            onClick={() => setActiveLayer(activeLayer === key ? null : key)}
            className={`text-left p-5 rounded-2xl border transition-all relative overflow-hidden ${
              activeLayer === key
                ? "bg-[var(--surface-hover)] border-indigo-500/50 shadow-lg shadow-indigo-500/10"
                : "bg-[var(--card)] border-[var(--border)] hover:border-indigo-500/30"
            }`}
          >
            <div
              className={`w-9 h-9 rounded-lg mb-4 flex items-center justify-center ${
                key === "BUILD"
                  ? "bg-emerald-500/10 text-emerald-400"
                  : key === "GOVERNANCE"
                  ? "bg-amber-500/10 text-amber-400"
                  : "bg-indigo-500/10 text-indigo-400"
              }`}
            >
              {key === "BUILD" ? (
                <Cpu className="w-4 h-4" />
              ) : key === "GOVERNANCE" ? (
                <Scale className="w-4 h-4" />
              ) : (
                <CheckSquare className="w-4 h-4" />
              )}
            </div>
            <h3 className="text-[var(--foreground)] font-bold text-sm mb-1">
              {layer.name}
            </h3>
            <p className="text-[var(--foreground-muted)] text-xs leading-relaxed">
              {layer.description}
            </p>
            {activeLayer === key && (
              <div className="absolute top-4 right-4">
                <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Search + count */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--foreground-muted)]" />
          <input
            type="text"
            placeholder="Search roles or capabilities..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[var(--card)] border border-[var(--border)] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--foreground-muted)] focus:outline-none focus:border-indigo-500/50 transition-all"
          />
        </div>
        <div className="flex items-center gap-2 text-[var(--foreground-muted)] text-xs font-medium">
          <Info className="w-3.5 h-3.5" />
          Showing {filteredRoles.length} of {ROLE_ARCHITECTURE.length} roles
        </div>
      </div>

      {/* Role grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredRoles.map((role) => (
          <div
            key={role.id}
            className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 flex flex-col hover:border-indigo-500/30 transition-all group"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-[var(--foreground)] font-bold text-sm">
                    {role.name}
                  </h3>
                  {role.id === "WORKSPACE_OWNER" && (
                    <Lock className="w-3 h-3 text-amber-400" />
                  )}
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)] px-2 py-0.5 rounded bg-[var(--surface-hover)] border border-[var(--border)]">
                  {role.category}
                </span>
              </div>
              <div
                className={`px-2 py-1 rounded text-[10px] font-black uppercase ${
                  role.layer === "Build"
                    ? "bg-emerald-500/10 text-emerald-400"
                    : role.layer === "Governance"
                    ? "bg-amber-500/10 text-amber-400"
                    : "bg-indigo-500/10 text-indigo-400"
                }`}
              >
                {role.layer}
              </div>
            </div>

            <p className="text-[var(--foreground-muted)] text-xs leading-relaxed mb-5 flex-1">
              {role.description}
            </p>

            <div className="space-y-1.5 mt-auto">
              <span className="text-[10px] font-bold text-[var(--foreground-muted)] uppercase tracking-widest">
                Key Responsibilities
              </span>
              <div className="grid grid-cols-1 gap-1">
                {role.responsibilities.map((resp, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 text-[var(--foreground-muted)] text-[11px]"
                  >
                    <CheckCircle2 className="w-3 h-3 text-[var(--foreground-muted)] group-hover:text-indigo-400 transition-colors shrink-0" />
                    {resp}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Separation of duties notice */}
      <div className="mt-14 p-7 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 flex flex-col md:flex-row items-center gap-6">
        <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center shrink-0">
          <AlertTriangle className="w-7 h-7 text-indigo-400" />
        </div>
        <div className="flex-1">
          <h3 className="text-[var(--foreground)] font-bold mb-1">
            Separation of Duties Policy
          </h3>
          <p className="text-[var(--foreground-muted)] text-sm leading-relaxed">
            Certain roles cannot overlap. A{" "}
            <span className="text-[var(--foreground)] font-medium">
              Contributor
            </span>{" "}
            who drafts an asset cannot act as its{" "}
            <span className="text-[var(--foreground)] font-medium">
              Approver
            </span>
            . These guardrails are automatically enforced during the publishing
            lifecycle to prevent privilege escalation.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Units Tab ────────────────────────────────────────────────────────────────

function UnitsTab() {
  const [units, setUnits] = useState<BusinessUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(COLOR_PRESETS[0]);

  useEffect(() => {
    fetchUnits();
  }, []);

  const fetchUnits = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/v1/units");
      setUnits(res.data || []);
    } catch {
      setError("Failed to load business units.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.post("/api/v1/units", {
        name: name.trim(),
        description: description.trim() || null,
        color,
      });
      setUnits((prev) => [...prev, res.data as BusinessUnit]);
      setName("");
      setDescription("");
      setColor(COLOR_PRESETS[0]);
      setShowForm(false);
    } catch {
      setError("Failed to create business unit.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await api.delete(`/api/v1/units/${id}`);
      setUnits((prev) => prev.filter((u) => u.id !== id));
    } catch {
      setError("Failed to delete business unit.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      {/* Header row */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-[var(--foreground)] font-bold">Business Units</h2>
          <p className="text-[var(--foreground-muted)] text-sm mt-0.5">
            Organisational groupings to scope access, assets, and workflows.
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Unit
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center justify-between">
          {error}
          <button onClick={() => setError(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <div className="mb-6 p-5 bg-[var(--card)] border border-[var(--border)] rounded-2xl space-y-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[var(--foreground)] font-semibold text-sm">
              Create Business Unit
            </span>
            <button
              onClick={() => setShowForm(false)}
              className="text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--foreground-muted)] mb-1.5 uppercase tracking-wide">
                Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Marketing, APAC Region"
                className="w-full bg-[var(--surface-hover)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--foreground-muted)] focus:outline-none focus:border-indigo-500/50 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--foreground-muted)] mb-1.5 uppercase tracking-wide">
                Description
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional short description"
                className="w-full bg-[var(--surface-hover)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--foreground-muted)] focus:outline-none focus:border-indigo-500/50 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--foreground-muted)] mb-2 uppercase tracking-wide">
              Colour
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  title={c}
                  className={`w-7 h-7 rounded-lg transition-all ${
                    color === c
                      ? "ring-2 ring-offset-2 ring-offset-[var(--card)] ring-white scale-110"
                      : "hover:scale-110"
                  }`}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={handleCreate}
              disabled={submitting || !name.trim()}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              {submitting ? "Creating…" : "Create Unit"}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-[var(--foreground-muted)] hover:text-[var(--foreground)] text-sm transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Units list */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-24 bg-[var(--card)] border border-[var(--border)] rounded-2xl animate-pulse"
            />
          ))}
        </div>
      ) : units.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[var(--surface-hover)] flex items-center justify-center mb-4">
            <Building2 className="w-7 h-7 text-[var(--foreground-muted)]" />
          </div>
          <p className="text-[var(--foreground)] font-semibold mb-1">
            No business units yet
          </p>
          <p className="text-[var(--foreground-muted)] text-sm max-w-xs">
            Create your first unit to organise teams, regions, or departments.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {units.map((unit) => (
            <div
              key={unit.id}
              className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 flex items-start justify-between group hover:border-indigo-500/30 transition-all"
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-3 h-3 rounded-full mt-1 shrink-0"
                  style={{ background: unit.color }}
                />
                <div>
                  <p className="text-[var(--foreground)] font-semibold text-sm">
                    {unit.name}
                  </p>
                  {unit.description && (
                    <p className="text-[var(--foreground-muted)] text-xs mt-0.5 leading-relaxed">
                      {unit.description}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => handleDelete(unit.id)}
                disabled={deletingId === unit.id}
                className="opacity-0 group-hover:opacity-100 ml-2 p-1.5 rounded-lg text-[var(--foreground-muted)] hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-50"
                title="Delete unit"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type Tab = "roles" | "units";

export default function RolesAndUnitsPage() {
  const [tab, setTab] = useState<Tab>("roles");

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Page header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
            <Shield className="w-5 h-5 text-indigo-400" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
            Roles & Units
          </h1>
        </div>
        <p className="text-[var(--foreground-muted)] max-w-3xl leading-relaxed text-sm">
          ZoikoVertex enforces an accountable execution model through granular
          role separation across three{" "}
          <span className="text-[var(--foreground)] font-medium">
            Control Layers
          </span>
          . Business Units let you organise your workspace into departments,
          regions, or functional teams.
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 p-1 bg-[var(--surface-hover)] rounded-xl w-fit mb-8">
        {(["roles", "units"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all capitalize ${
              tab === t
                ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm"
                : "text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
            }`}
          >
            {t === "roles" ? "Role Architecture" : "Business Units"}
          </button>
        ))}
      </div>

      {tab === "roles" ? <RolesTab /> : <UnitsTab />}
    </div>
  );
}
