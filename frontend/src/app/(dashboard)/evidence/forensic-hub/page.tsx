"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useRoles } from "@/lib/hooks/useRoles";
import {
  Fingerprint, AlertTriangle, AlertCircle, CheckCircle2, Clock,
  Plus, Search, Filter, X, ChevronRight, User, Shield, Activity,
  FileSearch, Archive, Gavel, RefreshCw, Eye, Lock, Unlock,
  BarChart3, ArrowUpDown,
} from "lucide-react";

interface ForensicCase {
  id: string;
  case_id: string;
  case_type: string;
  title: string;
  summary: string;
  severity: string;
  status: string;
  owner_user_id: string | null;
  source: string;
  legal_hold_active: boolean;
  sla_due_at: string | null;
  created_at: string;
  updated_at: string;
}

interface Stats {
  total_cases: number;
  critical_cases: number;
  legal_hold_cases: number;
  open_cases: number;
  awaiting_info: number;
  legal_review: number;
  closed_cases: number;
  by_status: Record<string, number>;
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: "text-red-400 bg-red-400/10 border-red-400/30",
  high: "text-orange-400 bg-orange-400/10 border-orange-400/30",
  medium: "text-amber-400 bg-amber-400/10 border-amber-400/30",
  low: "text-blue-400 bg-blue-400/10 border-blue-400/30",
};

const STATUS_LABELS: Record<string, string> = {
  new: "New", triage: "Triage (Assigning)",
  active_investigation: "In Progress",
  awaiting_information: "Awaiting Info", legal_review: "Legal Review",
  legal_hold: "Legal Hold", remediation: "Remediation",
  validation: "Under Review", escalated: "Pending Closure",
  closed: "Closed", reopened: "Reopened",
};

const TYPE_LABELS: Record<string, string> = {
  ai_agent_misfire: "AI Misfire", unauthorized_publish: "Unauth. Publish",
  policy_override_review: "Policy Override", security_incident: "Security",
  brand_regulatory_risk: "Brand/Reg Risk", evidence_request: "Evidence Request",
  operational_failure: "Ops Failure", chain_integrity_alert: "Chain Integrity",
};

function fmt(ts: string) {
  try { return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }); }
  catch { return "Invalid date"; }
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-[#111] border border-[#222] rounded-xl p-4">
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-[#888] mt-1">{label}</div>
    </div>
  );
}

export default function ForensicHubPage() {
  const { hasRole, isLoading: rolesLoading } = useRoles();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [cases, setCases] = useState<ForensicCase[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterSeverity, setFilterSeverity] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterType, setFilterType] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ case_type: "", title: "", summary: "", severity: "medium" });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, casesRes] = await Promise.all([
        api.get("/api/forensic/cases/stats"),
        api.get("/api/forensic/cases"),
      ]);
      if (statsRes.success) setStats(statsRes.data);
      if (casesRes.success) { setCases(casesRes.data); setTotal(casesRes.total); }
    } catch (e: any) { setError(e?.message || "Failed to fetch cases"); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    api.get(`/api/forensic/cases?${new URLSearchParams(
      Object.fromEntries(Object.entries({
        search: search || "",
        severity: filterSeverity,
        status: filterStatus,
        case_type: filterType,
      }).filter(([_, v]) => v))
    ).toString()}`)
      .then(res => { if (res.success) { setCases(res.data); setTotal(res.total); } })
      .catch((e: any) => setError(e?.message || "Search failed"));
  }, [search, filterSeverity, filterStatus, filterType]);

  const handleCreate = async () => {
    if (!createForm.case_type || !createForm.title) return;
    try {
      const res = await api.post("/api/forensic/cases", createForm);
      if (res.success) {
        setShowCreate(false);
        setCreateForm({ case_type: "", title: "", summary: "", severity: "medium" });
        fetchData();
      }
    } catch (e: any) { setError(e?.message || "Failed to create case"); }
  };

  if (rolesLoading) return <div className="p-8 text-[#888]">Loading...</div>;
  if (!hasRole(["ADMIN", "WORKSPACE_OWNER", "GOVERNANCE_ADMIN", "AUDITOR", "COMPLIANCE_REVIEWER", "SECURITY_ADMIN"])) {
    return <div className="p-8 text-red-400">Unauthorized.</div>;
  }

  const severityIcon = (sev: string) => {
    if (sev === "critical") return <AlertTriangle className="w-3.5 h-3.5" />;
    if (sev === "high") return <AlertCircle className="w-3.5 h-3.5" />;
    return <Activity className="w-3.5 h-3.5" />;
  };

  const clearFilters = () => { setSearch(""); setFilterSeverity(""); setFilterStatus(""); setFilterType(""); };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          <p className="text-xs text-red-400">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto text-red-400/60 hover:text-red-400"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Fingerprint className="w-6 h-6 text-amber-500" />
            Forensic Hub
          </h1>
          <p className="text-[#888] mt-1">
            Investigation command center for reconstructing governed AI activity and managing cases.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-lg text-sm hover:bg-amber-500/20 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> {showCreate ? "Cancel" : "Create Case"}
        </button>
      </div>

      {/* Metric Strip */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-4">
          <StatCard label="Open Cases" value={stats.open_cases} color="text-gray-900 dark:text-white" />
          <StatCard label="Critical" value={stats.critical_cases} color="text-red-400" />
          <StatCard label="Legal Hold" value={stats.legal_hold_cases} color="text-amber-400" />
          <StatCard label="Awaiting Info" value={stats.awaiting_info} color="text-blue-400" />
          <StatCard label="Legal Review" value={stats.legal_review} color="text-purple-400" />
          <StatCard label="Closed This.." value={stats.closed_cases} color="text-emerald-400" />
          <StatCard label="Total" value={stats.total_cases} color="text-[#888]" />
        </div>
      )}

      {/* Create Case Form */}
      {showCreate && (
        <div className="bg-[#111] border border-[#222] rounded-xl p-6 mb-4 space-y-3">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white">New Investigation Case</h3>
          <select
            value={createForm.case_type}
            onChange={e => setCreateForm(p => ({ ...p, case_type: e.target.value }))}
            className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white"
          >
            <option value="">Select case type...</option>
            {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <input
            placeholder="Case title"
            value={createForm.title}
            onChange={e => setCreateForm(p => ({ ...p, title: e.target.value }))}
            className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white"
          />
          <textarea
            placeholder="Summary"
            value={createForm.summary}
            onChange={e => setCreateForm(p => ({ ...p, summary: e.target.value }))}
            className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white resize-none h-20"
          />
          <select
            value={createForm.severity}
            onChange={e => setCreateForm(p => ({ ...p, severity: e.target.value }))}
            className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
          <button onClick={handleCreate} className="px-4 py-2 bg-amber-500 text-black rounded-lg text-sm font-medium hover:bg-amber-400">
            Create Case
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#555]" />
          <input
            placeholder="Search cases by title or summary..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-[#111] border border-[#222] rounded-lg pl-9 pr-3 py-2 text-sm text-gray-900 dark:text-white"
          />
        </div>
        <select value={filterSeverity} onChange={e => setFilterSeverity(e.target.value)}
          className="bg-[#111] border border-[#222] rounded-lg px-3 py-2 text-xs text-[#888]">
          <option value="">Severity</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="bg-[#111] border border-[#222] rounded-lg px-3 py-2 text-xs text-[#888]">
          <option value="">Status</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          className="bg-[#111] border border-[#222] rounded-lg px-3 py-2 text-xs text-[#888]">
          <option value="">Type</option>
          {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        {(search || filterSeverity || filterStatus || filterType) && (
          <button onClick={clearFilters}
            className="px-3 py-2 text-xs text-[#888] hover:text-white flex items-center gap-1">
            <X className="w-3 h-3" /> Clear
          </button>
        )}
      </div>

      {/* Unassigned Critical Banner */}
      {cases.some(c => c.severity === "critical" && c.status !== "closed" && !c.owner_user_id) && (
        <div className="mb-4 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-400">Unassigned Critical Cases</p>
            <p className="text-xs text-red-300">Critical cases require immediate assignment. No silent queueing.</p>
          </div>
        </div>
      )}

      {/* Case Queue */}
      <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-[#222] flex items-center justify-between">
          <span className="text-sm text-[#888]">{total} case{total !== 1 ? "s" : ""}</span>
          <button onClick={fetchData} className="text-xs text-[#888] hover:text-white flex items-center gap-1">
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-[#888]">Loading cases...</div>
        ) : cases.length === 0 ? (
          <div className="p-12 text-center">
            <Fingerprint className="w-10 h-10 mx-auto mb-3 text-[#444]" />
            <p className="text-sm text-[#888]">No cases found.</p>
            <p className="text-xs text-[#666] mt-1">
              {search || filterSeverity || filterStatus || filterType
                ? "No cases match current filters. Try clearing filters."
                : "Cases appear from manual creation, rule triggers, or selected audit events."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs text-[#888] uppercase tracking-wider border-b border-[#222]">
                  <th className="py-3 px-4">Case</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Severity</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Owner</th>
                  <th className="py-3 px-4">Legal</th>
                  <th className="py-3 px-4">Created</th>
                  <th className="py-3 px-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222]">
                {cases.map(c => (
                  <tr
                    key={c.id}
                    onClick={() => router.push(`/evidence/forensic-hub/cases/${c.id}`)}
                    className="text-sm text-[#ccc] hover:bg-white/[0.02] cursor-pointer"
                  >
                    <td className="py-3 px-4">
                      <div className="font-medium text-gray-900 dark:text-white">{c.title}</div>
                      <div className="text-[10px] text-[#666] font-mono">{c.case_id}</div>
                    </td>
                    <td className="py-3 px-4 text-xs">{TYPE_LABELS[c.case_type] || c.case_type}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs border ${SEVERITY_COLORS[c.severity] || "text-[#888]"}`}>
                        {severityIcon(c.severity)}
                        {c.severity}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                        c.status === "escalated" ? "bg-red-400/10 text-red-400" :
                        c.status === "legal_hold" ? "bg-amber-400/10 text-amber-400" :
                        c.status === "closed" ? "bg-emerald-400/10 text-emerald-400" :
                        ""
                      }`}>{STATUS_LABELS[c.status] || c.status}</span>
                    </td>
                    <td className="py-3 px-4 text-xs">{c.owner_user_id || <span className="text-[#555]">—</span>}</td>
                    <td className="py-3 px-4">
                      {c.legal_hold_active
                        ? <Lock className="w-4 h-4 text-amber-400" />
                        : <Unlock className="w-4 h-4 text-[#444]" />
                      }
                    </td>
                    <td className="py-3 px-4 text-xs text-[#888]">{fmt(c.created_at)}</td>
                    <td className="py-3 px-4"><ChevronRight className="w-4 h-4 text-[#444]" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
