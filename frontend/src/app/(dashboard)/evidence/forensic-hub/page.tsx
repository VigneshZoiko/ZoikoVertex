"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useRoles } from "@/lib/hooks/useRoles";
import { Fingerprint, AlertTriangle, Search, X, ChevronRight, Lock, RefreshCw, Plus } from "lucide-react";

interface ForensicCase {
  id: string;
  case_type: string;
  title: string;
  severity: string;
  status: string;
  legal_hold_active: boolean;
  created_at: string;
}

const SEVERITY_STYLE: Record<string, string> = {
  critical: "text-red-400 bg-red-500/10 border-red-500/20",
  high: "text-orange-400 bg-orange-500/10 border-orange-500/20",
  medium: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
  low: "text-blue-400 bg-blue-500/10 border-blue-500/20",
};

const STATUS_LABEL: Record<string, string> = {
  new: "New", triage: "Assigning", active_investigation: "In Progress",
  awaiting_information: "Awaiting Info", legal_review: "Legal Review",
  legal_hold: "Legal Hold", remediation: "Remediation",
  validation: "Under Review", escalated: "Pending Closure", closed: "Closed",
};

const TYPE_LABEL: Record<string, string> = {
  ai_agent_misfire: "AI Misfire", unauthorized_publish: "Unauth. Publish",
  policy_override_review: "Policy Override", security_incident: "Security",
  brand_regulatory_risk: "Brand/Reg Risk", evidence_request: "Evidence Request",
  operational_failure: "Ops Failure", chain_integrity_alert: "Chain Issue",
};

function fmt(ts: string) {
  try { return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" }); }
  catch { return "—"; }
}

interface Member { id: string; full_name: string; email: string; }

export default function ForensicHubPage() {
  const { hasRole, isLoading: rolesLoading } = useRoles();
  const router = useRouter();
  const [cases, setCases] = useState<ForensicCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ case_type: "", title: "", severity: "medium", owner_user_id: "" });
  const [members, setMembers] = useState<Member[]>([]);

  const handleCreate = async () => {
    if (!createForm.case_type || !createForm.title) return;
    try {
      const payload = { ...createForm, owner_user_id: createForm.owner_user_id || undefined };
      const res = await api.post("/api/forensic/cases", payload);
      if (res.success) { setShowCreate(false); setCreateForm({ case_type: "", title: "", severity: "medium", owner_user_id: "" }); fetchData(); }
    } catch (e: any) { setError(e?.message || "Create failed"); }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/forensic/cases");
      if (res.success) { setCases(res.data); }
    } catch (e: any) { setError(e?.message || "Failed to load"); }
    setLoading(false);
  };

  const fetchedRef = useRef(false);
  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    fetchData();
    api.get("/api/team/members").then(res => { if (res.success) setMembers(res.data || []); }).catch(() => {});
  }, []);

  useEffect(() => {
    api.get(`/api/forensic/cases?${new URLSearchParams(search ? { search } : {}).toString()}`)
      .then(res => { if (res.success) setCases(res.data); })
      .catch((e: any) => setError(e?.message || "Search failed"));
  }, [search]);

  const sorted = [...cases].sort((a, b) => {
    const order: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    const aRank = order[a.severity] ?? 99;
    const bRank = order[b.severity] ?? 99;
    if (aRank !== bRank) return aRank - bRank;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  if (rolesLoading) return <div className="p-8 text-foreground-muted">Loading...</div>;
  if (!hasRole(["ADMIN", "WORKSPACE_OWNER", "GOVERNANCE_ADMIN", "AUDITOR", "COMPLIANCE_REVIEWER", "SECURITY_ADMIN"])) {
    return <div className="p-8 text-red-400">Unauthorized.</div>;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 pb-24">
      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          <p className="text-xs text-red-400 flex-1">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Fingerprint className="w-5 h-5 text-amber-400" /> Investigations
          </h1>
          <p className="text-xs text-foreground-muted mt-0.5">Open cases that need attention</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowCreate(!showCreate)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-lg hover:brightness-110">
            <Plus className="w-3.5 h-3.5" /> New Case
          </button>
          <button onClick={fetchData} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-surface border border-border rounded-lg hover:bg-surface-hover text-foreground-muted">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="bg-surface border border-border rounded-xl p-4 mb-4 space-y-2.5">
          <h3 className="text-sm font-medium text-foreground">New Investigation</h3>
          <select value={createForm.case_type} onChange={e => setCreateForm(p => ({ ...p, case_type: e.target.value }))}
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground">
            <option value="">Type of case…</option>
            {Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <input placeholder="Case title" value={createForm.title} onChange={e => setCreateForm(p => ({ ...p, title: e.target.value }))}
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground" />
          <select value={createForm.severity} onChange={e => setCreateForm(p => ({ ...p, severity: e.target.value }))}
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground">
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
          <select value={createForm.owner_user_id} onChange={e => setCreateForm(p => ({ ...p, owner_user_id: e.target.value }))}
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground">
            <option value="">Assign owner (optional — defaults to you)</option>
            {members.map(m => (
              <option key={m.id} value={m.id}>{m.full_name} — {m.email}</option>
            ))}
          </select>
          <div className="flex gap-2 pt-1">
            <button onClick={handleCreate}
              className="px-3 py-1.5 text-xs bg-amber-500 text-black rounded-lg font-medium hover:brightness-110">
              Create
            </button>
            <button onClick={() => setShowCreate(false)}
              className="px-3 py-1.5 text-xs text-foreground-muted hover:text-foreground">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Critical alert */}
      {sorted.some(c => c.severity === "critical" && c.status !== "closed") && (
        <div className="mb-4 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
          <p className="text-xs text-red-400">Critical cases require immediate attention</p>
        </div>
      )}

      {/* Search */}
      <div className="relative mb-4 max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground-muted" />
        <input placeholder="Search cases…" value={search} onChange={e => setSearch(e.target.value)}
          className="w-full bg-surface border border-border rounded-lg pl-9 pr-3 py-1.5 text-xs text-foreground" />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2">
            <X className="w-3 h-3 text-foreground-muted" />
          </button>
        )}
      </div>

      {/* Case List */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-foreground-muted text-sm">Loading…</div>
        ) : sorted.length === 0 ? (
          <div className="p-12 text-center">
            <Fingerprint className="w-10 h-10 mx-auto mb-3 text-foreground-muted opacity-30" />
            <p className="text-sm text-foreground-muted">No cases found</p>
          </div>
        ) : (
          <div>
            {sorted.map(c => (
              <button
                key={c.id}
                onClick={() => router.push(`/evidence/forensic-hub/cases/${c.id}`)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface-hover border-b border-border last:border-0 transition-colors"
              >
                <div className={`w-2 h-2 rounded-full shrink-0 ${
                  c.severity === "critical" ? "bg-red-500" :
                  c.severity === "high" ? "bg-orange-500" :
                  c.severity === "medium" ? "bg-yellow-500" : "bg-blue-500"
                }`} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{c.title}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${SEVERITY_STYLE[c.severity] || ""}`}>
                      {c.severity}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-foreground-muted">{TYPE_LABEL[c.case_type] || c.case_type}</span>
                    <span className="text-[10px] text-foreground-muted">·</span>
                    <span className={`text-[10px] ${
                      c.status === "closed" ? "text-green-400" :
                      c.status === "escalated" || c.status === "legal_hold" ? "text-amber-400" :
                      "text-foreground-muted"
                    }`}>
                      {STATUS_LABEL[c.status] || c.status}
                    </span>
                    <span className="text-[10px] text-foreground-muted">·</span>
                    <span className="text-[10px] text-foreground-muted">{fmt(c.created_at)}</span>
                    {c.legal_hold_active && <Lock className="w-3 h-3 text-amber-400" />}
                  </div>
                </div>

                <ChevronRight className="w-4 h-4 text-foreground-muted shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
