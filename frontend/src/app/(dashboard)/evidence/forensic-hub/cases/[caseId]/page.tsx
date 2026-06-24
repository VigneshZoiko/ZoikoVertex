"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import {
  ChevronLeft, AlertTriangle, AlertCircle, Activity, Clock, Lock, Unlock,
  RefreshCw, Plus, X, CheckCircle2, FileText, ListTodo, History,
  Archive, Download, User, Gavel, Brain, Shield,
} from "lucide-react";

type TabId = "overview" | "timeline" | "evidence" | "notes" | "tasks" | "exports";

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "overview", label: "Overview", icon: Activity },
  { id: "timeline", label: "Timeline", icon: History },
  { id: "evidence", label: "Evidence", icon: Archive },
  { id: "notes", label: "Notes", icon: FileText },
  { id: "tasks", label: "Tasks", icon: ListTodo },
  { id: "exports", label: "Exports", icon: Download },
];

const SEVERITY_COLORS: Record<string, string> = {
  critical: "text-red-400 bg-red-500/10 border-red-500/20",
  high: "text-orange-400 bg-orange-500/10 border-orange-500/20",
  medium: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
  low: "text-blue-400 bg-blue-500/10 border-blue-500/20",
};

const STATUS_LABELS: Record<string, string> = {
  new: "New", triage: "Triage", active_investigation: "In Progress",
  awaiting_information: "Awaiting Info", legal_review: "Legal Review",
  legal_hold: "Legal Hold", remediation: "Remediation",
  validation: "Under Review", escalated: "Escalated", closed: "Closed", reopened: "Reopened",
};

const TYPE_LABELS: Record<string, string> = {
  ai_agent_misfire: "AI Misfire", unauthorized_publish: "Unauth. Publish",
  policy_override_review: "Policy Override", security_incident: "Security Incident",
  brand_regulatory_risk: "Brand/Reg Risk", evidence_request: "Evidence Request",
  operational_failure: "Ops Failure", chain_integrity_alert: "Chain Integrity",
};

function fmt(ts: string | null) {
  if (!ts) return "—";
  try { return new Date(ts).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }); }
  catch { return "—"; }
}

function fmtShort(ts: string | null) {
  if (!ts) return "—";
  try { return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }); }
  catch { return "—"; }
}

interface ForensicCase {
  id: string; case_id: string; case_type: string; title: string; summary: string;
  severity: string; status: string; owner_user_id: string | null; source: string;
  legal_hold_active: boolean; sla_due_at: string | null; created_at: string; updated_at: string;
}

export default function ForensicCaseDetailPage() {
  const params = useParams();
  const caseId = params.caseId as string;
  const router = useRouter();
  const [tab, setTab] = useState<TabId>("overview");
  const [kase, setKase] = useState<ForensicCase | null>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [evidence, setEvidence] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [exports, setExports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tabLoading, setTabLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Action modals
  const [showAssign, setShowAssign] = useState(false);
  const [showClose, setShowClose] = useState(false);
  const [showAddEvidence, setShowAddEvidence] = useState(false);
  const [showAddNote, setShowAddNote] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [showExport, setShowExport] = useState(false);

  const loadCase = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/forensic/cases/${caseId}`);
      if (res.success) setKase(res.data);
      else setError(res.error || "Case not found");
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [caseId]);

  const loadTab = useCallback(async (t: TabId) => {
    setTabLoading(true);
    try {
      if (t === "timeline") {
        const res = await api.get(`/api/forensic/cases/${caseId}/timeline`);
        if (res.success) setTimeline(res.data || []);
      } else if (t === "evidence") {
        const res = await api.get(`/api/forensic/cases/${caseId}/evidence`);
        if (res.success) setEvidence(res.data || []);
      } else if (t === "notes") {
        const res = await api.get(`/api/forensic/cases/${caseId}/notes`);
        if (res.success) setNotes(res.data || []);
      } else if (t === "tasks") {
        const res = await api.get(`/api/forensic/cases/${caseId}/tasks`);
        if (res.success) setTasks(res.data || []);
      } else if (t === "exports") {
        const res = await api.get(`/api/forensic/cases/${caseId}/exports`);
        if (res.success) setExports(res.data || []);
      }
    } catch (e: any) { setError(e.message); }
    finally { setTabLoading(false); }
  }, [caseId]);

  useEffect(() => { loadCase(); }, [loadCase]);
  useEffect(() => { if (tab !== "overview") loadTab(tab); }, [tab, loadTab]);

  const handleReopen = async () => {
    try {
      const res = await api.post(`/api/forensic/cases/${caseId}/reopen`, {});
      if (res.success) loadCase();
      else setError(res.error || "Failed to reopen");
    } catch (e: any) { setError(e.message); }
  };

  const handleApplyLegalHold = async () => {
    try {
      const res = await api.post(`/api/forensic/cases/${caseId}/legal-hold`, {});
      if (res.success) loadCase();
      else setError(res.error || "Failed");
    } catch (e: any) { setError(e.message); }
  };

  const handlePreserveToVault = async () => {
    try {
      const res = await api.post(`/api/forensic/cases/${caseId}/preserve`, {});
      if (res.success) setError(null);
      else setError(res.error || "Failed to preserve");
    } catch (e: any) { setError(e.message); }
  };

  if (loading) return <div className="p-8 text-center text-foreground-muted text-sm">Loading case…</div>;
  if (!kase) return <div className="p-8 text-center text-red-400 text-sm">Case not found</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 pb-24">
      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          <p className="text-xs text-red-400 flex-1">{error}</p>
          <button onClick={() => setError(null)}><X className="w-3.5 h-3.5 text-red-400/60 hover:text-red-400" /></button>
        </div>
      )}

      {/* Back + Header */}
      <div className="mb-6">
        <button onClick={() => router.push("/evidence/forensic-hub")}
          className="flex items-center gap-1 text-xs text-foreground-muted hover:text-foreground mb-3">
          <ChevronLeft className="w-3.5 h-3.5" /> Back to Forensic Hub
        </button>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs border ${SEVERITY_COLORS[kase.severity] || ""}`}>
                {kase.severity === "critical" ? <AlertTriangle className="w-3 h-3" /> :
                 kase.severity === "high" ? <AlertCircle className="w-3 h-3" /> :
                 <Activity className="w-3 h-3" />}
                {kase.severity}
              </span>
              <span className="text-xs text-foreground-muted px-2 py-0.5 bg-surface border border-border rounded">
                {STATUS_LABELS[kase.status] || kase.status}
              </span>
              {kase.legal_hold_active && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-amber-500/10 border border-amber-500/20 text-amber-400">
                  <Lock className="w-3 h-3" /> Legal Hold
                </span>
              )}
            </div>
            <h1 className="text-xl font-bold text-foreground">{kase.title}</h1>
            <p className="text-xs text-foreground-muted font-mono mt-0.5">{kase.case_id} · {TYPE_LABELS[kase.case_type] || kase.case_type}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button onClick={() => setShowAssign(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-surface border border-border rounded-lg hover:bg-surface-hover text-foreground-muted">
              <User className="w-3.5 h-3.5" /> Assign
            </button>
            {!kase.legal_hold_active && (
              <button onClick={handleApplyLegalHold} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-lg hover:bg-amber-500/20">
                <Gavel className="w-3.5 h-3.5" /> Apply Hold
              </button>
            )}
            <button onClick={handlePreserveToVault} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-surface border border-border rounded-lg hover:bg-surface-hover text-foreground-muted">
              <Archive className="w-3.5 h-3.5" /> Preserve
            </button>
            {kase.status !== "closed" ? (
              <button onClick={() => setShowClose(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg hover:bg-red-500/20">
                <X className="w-3.5 h-3.5" /> Close Case
              </button>
            ) : (
              <button onClick={handleReopen} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-green-500/10 border border-green-500/20 text-green-400 rounded-lg hover:bg-green-500/20">
                <RefreshCw className="w-3.5 h-3.5" /> Reopen
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border mb-6 overflow-x-auto">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs border-b-2 transition-colors ${
              tab === t.id ? "text-amber-400 border-amber-500" : "text-foreground-muted border-transparent hover:text-foreground"
            }`}>
            <t.icon className="w-3.5 h-3.5" /> {t.label}
          </button>
        ))}
      </div>

      {tabLoading && <div className="py-12 text-center text-xs text-foreground-muted">Loading…</div>}

      {/* Overview */}
      {!tabLoading && tab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-surface border border-border rounded-xl p-5">
              <h3 className="text-xs font-medium text-foreground-muted uppercase tracking-wider mb-3">Summary</h3>
              <p className="text-sm text-foreground leading-relaxed">{kase.summary || <span className="text-foreground-muted italic">No summary provided.</span>}</p>
            </div>
            <div className="bg-surface border border-border rounded-xl p-5">
              <h3 className="text-xs font-medium text-foreground-muted uppercase tracking-wider mb-3">Source</h3>
              <p className="text-sm text-foreground font-mono">{kase.source || "—"}</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="bg-surface border border-border rounded-xl p-5 space-y-3">
              <h3 className="text-xs font-medium text-foreground-muted uppercase tracking-wider">Details</h3>
              {[
                ["Owner", kase.owner_user_id || "Unassigned"],
                ["SLA Due", fmtShort(kase.sla_due_at)],
                ["Created", fmt(kase.created_at)],
                ["Last Updated", fmt(kase.updated_at)],
              ].map(([label, value]) => (
                <div key={label} className="flex items-start justify-between gap-2">
                  <span className="text-xs text-foreground-muted">{label}</span>
                  <span className="text-xs text-foreground text-right font-mono max-w-[160px] truncate">{value}</span>
                </div>
              ))}
            </div>
            {kase.sla_due_at && new Date(kase.sla_due_at) < new Date() && kase.status !== "closed" && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                <p className="text-xs text-red-400">SLA breached</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Timeline */}
      {!tabLoading && tab === "timeline" && (
        <div>
          {timeline.length === 0 ? (
            <div className="py-16 text-center text-foreground-muted">
              <History className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No timeline events yet</p>
            </div>
          ) : (
            <div className="relative pl-6 border-l border-border space-y-4">
              {timeline.map((event: any, i: number) => (
                <div key={i} className="relative">
                  <div className="absolute -left-[25px] w-3 h-3 rounded-full bg-amber-500/30 border border-amber-500 top-1" />
                  <div className="bg-surface border border-border rounded-xl p-4">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="text-xs font-medium text-foreground">{event.event_type || event.action || "Event"}</p>
                      <p className="text-[11px] text-foreground-muted shrink-0">{fmtShort(event.created_at || event.timestamp)}</p>
                    </div>
                    {event.description && <p className="text-xs text-foreground-muted">{event.description}</p>}
                    {event.actor_id && <p className="text-[10px] text-foreground-muted font-mono mt-1">by {event.actor_id}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Evidence */}
      {!tabLoading && tab === "evidence" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs text-foreground-muted">{evidence.length} evidence item{evidence.length !== 1 ? "s" : ""}</p>
            <button onClick={() => setShowAddEvidence(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-surface border border-border rounded-lg hover:bg-surface-hover text-foreground-muted">
              <Plus className="w-3.5 h-3.5" /> Add Evidence
            </button>
          </div>
          {evidence.length === 0 ? (
            <div className="py-16 text-center text-foreground-muted bg-surface border border-border rounded-xl">
              <Archive className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No evidence attached yet</p>
              <p className="text-xs mt-1 opacity-60">Add evidence items from the audit trail or vault</p>
            </div>
          ) : (
            <div className="bg-surface border border-border rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-foreground-muted">
                    <th className="text-left p-3 font-medium">Evidence ID</th>
                    <th className="text-left p-3 font-medium">Type</th>
                    <th className="text-left p-3 font-medium">Source</th>
                    <th className="text-left p-3 font-medium">Added</th>
                    <th className="text-left p-3 font-medium">Privileged</th>
                  </tr>
                </thead>
                <tbody>
                  {evidence.map((e: any) => (
                    <tr key={e.id} className="border-b border-border last:border-0 hover:bg-surface-hover">
                      <td className="p-3 font-mono text-[11px] text-foreground">{e.evidence_id || e.id}</td>
                      <td className="p-3 text-foreground-muted">{e.evidence_type || "—"}</td>
                      <td className="p-3 text-foreground-muted font-mono text-[11px] max-w-[200px] truncate">{e.source_ref || e.source_id || "—"}</td>
                      <td className="p-3 text-foreground-muted">{fmtShort(e.created_at)}</td>
                      <td className="p-3">
                        {e.is_privileged
                          ? <span className="text-amber-400 text-[11px] flex items-center gap-1"><Shield className="w-3 h-3" /> Privileged</span>
                          : <span className="text-foreground-muted text-[11px]">No</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Notes */}
      {!tabLoading && tab === "notes" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs text-foreground-muted">{notes.length} note{notes.length !== 1 ? "s" : ""}</p>
            <button onClick={() => setShowAddNote(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-surface border border-border rounded-lg hover:bg-surface-hover text-foreground-muted">
              <Plus className="w-3.5 h-3.5" /> Add Note
            </button>
          </div>
          {notes.length === 0 ? (
            <div className="py-16 text-center text-foreground-muted bg-surface border border-border rounded-xl">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No notes yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notes.map((note: any) => (
                <div key={note.id} className="bg-surface border border-border rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] text-foreground-muted font-mono">{note.author_id || "—"}</span>
                    <span className="text-[11px] text-foreground-muted">{fmtShort(note.created_at)}</span>
                  </div>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{note.content || note.body || note.note}</p>
                  {note.is_privileged && (
                    <span className="mt-2 inline-flex items-center gap-1 text-[10px] text-amber-400"><Shield className="w-2.5 h-2.5" /> Privileged</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tasks */}
      {!tabLoading && tab === "tasks" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs text-foreground-muted">{tasks.length} task{tasks.length !== 1 ? "s" : ""}</p>
            <button onClick={() => setShowAddTask(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-surface border border-border rounded-lg hover:bg-surface-hover text-foreground-muted">
              <Plus className="w-3.5 h-3.5" /> Add Task
            </button>
          </div>
          {tasks.length === 0 ? (
            <div className="py-16 text-center text-foreground-muted bg-surface border border-border rounded-xl">
              <ListTodo className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No tasks yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {tasks.map((task: any) => (
                <div key={task.id} className="bg-surface border border-border rounded-xl p-4 flex items-start gap-3">
                  <button
                    onClick={async () => {
                      try {
                        const newStatus = task.status === "done" ? "open" : "done";
                        const res = await api.patch(`/api/forensic/cases/${caseId}/tasks/${task.id}`, { status: newStatus });
                        if (res.success) loadTab("tasks");
                      } catch {}
                    }}
                    className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                      task.status === "done" ? "bg-green-500 border-green-500" : "border-border hover:border-foreground-muted"
                    }`}
                  >
                    {task.status === "done" && <CheckCircle2 className="w-3 h-3 text-white" />}
                  </button>
                  <div className="flex-1">
                    <p className={`text-sm text-foreground ${task.status === "done" ? "line-through text-foreground-muted" : ""}`}>
                      {task.title || task.description}
                    </p>
                    {task.assigned_to && <p className="text-[10px] text-foreground-muted font-mono mt-0.5">→ {task.assigned_to}</p>}
                    {task.due_at && (
                      <p className={`text-[10px] mt-0.5 ${new Date(task.due_at) < new Date() && task.status !== "done" ? "text-red-400" : "text-foreground-muted"}`}>
                        Due {fmtShort(task.due_at)}
                      </p>
                    )}
                  </div>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded border ${
                    task.priority === "critical" ? "text-red-400 border-red-500/20 bg-red-500/10" :
                    task.priority === "high" ? "text-orange-400 border-orange-500/20 bg-orange-500/10" :
                    "text-foreground-muted border-border"
                  }`}>{task.priority || "normal"}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Exports */}
      {!tabLoading && tab === "exports" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs text-foreground-muted">{exports.length} export{exports.length !== 1 ? "s" : ""}</p>
            <button onClick={() => setShowExport(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-surface border border-border rounded-lg hover:bg-surface-hover text-foreground-muted">
              <Plus className="w-3.5 h-3.5" /> Request Export
            </button>
          </div>
          {exports.length === 0 ? (
            <div className="py-16 text-center text-foreground-muted bg-surface border border-border rounded-xl">
              <Download className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No exports yet</p>
            </div>
          ) : (
            <div className="bg-surface border border-border rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-foreground-muted">
                    <th className="text-left p-3 font-medium">Export ID</th>
                    <th className="text-left p-3 font-medium">Format</th>
                    <th className="text-left p-3 font-medium">Status</th>
                    <th className="text-left p-3 font-medium">Requested</th>
                    <th className="text-left p-3 font-medium">Approved By</th>
                  </tr>
                </thead>
                <tbody>
                  {exports.map((exp: any) => (
                    <tr key={exp.id} className="border-b border-border last:border-0 hover:bg-surface-hover">
                      <td className="p-3 font-mono text-[11px] text-foreground">{exp.export_id || exp.id}</td>
                      <td className="p-3 text-foreground-muted uppercase">{exp.format || "—"}</td>
                      <td className="p-3">
                        <span className={`text-[11px] px-1.5 py-0.5 rounded border ${
                          exp.status === "approved" || exp.status === "completed" ? "text-green-400 border-green-500/20 bg-green-500/10" :
                          exp.status === "rejected" ? "text-red-400 border-red-500/20 bg-red-500/10" :
                          "text-amber-400 border-amber-500/20 bg-amber-500/10"
                        }`}>{exp.status}</span>
                      </td>
                      <td className="p-3 text-foreground-muted">{fmtShort(exp.created_at)}</td>
                      <td className="p-3 text-foreground-muted font-mono text-[11px]">{exp.approver_id ? exp.approver_id.substring(0, 8) + "…" : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {showAssign && <AssignModal caseId={caseId} onClose={() => setShowAssign(false)} onDone={() => { setShowAssign(false); loadCase(); }} />}
      {showClose && <CloseModal caseId={caseId} onClose={() => setShowClose(false)} onDone={() => { setShowClose(false); loadCase(); }} />}
      {showAddEvidence && <AddEvidenceModal caseId={caseId} onClose={() => setShowAddEvidence(false)} onDone={() => { setShowAddEvidence(false); loadTab("evidence"); }} />}
      {showAddNote && <AddNoteModal caseId={caseId} onClose={() => setShowAddNote(false)} onDone={() => { setShowAddNote(false); loadTab("notes"); }} />}
      {showAddTask && <AddTaskModal caseId={caseId} onClose={() => setShowAddTask(false)} onDone={() => { setShowAddTask(false); loadTab("tasks"); }} />}
      {showExport && <RequestExportModal caseId={caseId} onClose={() => setShowExport(false)} onDone={() => { setShowExport(false); loadTab("exports"); }} />}
    </div>
  );
}

function ModalShell({ title, icon: Icon, onClose, children }: { title: string; icon: React.ElementType; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-background/60 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-surface border border-border rounded-xl p-6 w-full max-w-md mx-4 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2"><Icon className="w-4 h-4 text-amber-400" />{title}</h2>
          <button onClick={onClose}><X className="w-4 h-4 text-foreground-muted hover:text-foreground" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function AssignModal({ caseId, onClose, onDone }: { caseId: string; onClose: () => void; onDone: () => void }) {
  const [userId, setUserId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function handle() {
    if (!userId.trim()) { setError("User ID is required"); return; }
    setSaving(true);
    try {
      const res = await api.post(`/api/forensic/cases/${caseId}/assign`, { user_id: userId.trim() });
      if (res.success) onDone(); else setError(res.error || "Failed");
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  }
  return (
    <ModalShell title="Assign Case" icon={User} onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="text-xs text-foreground-muted mb-1 block">Assignee User ID</label>
          <input value={userId} onChange={e => setUserId(e.target.value)} placeholder="UUID of the user"
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground" />
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="px-3 py-2 text-xs text-foreground-muted bg-surface-hover rounded-lg border border-border">Cancel</button>
          <button onClick={handle} disabled={saving} className="px-3 py-2 text-xs text-white bg-amber-600 rounded-lg hover:bg-amber-700 disabled:opacity-50">
            {saving ? "Assigning…" : "Assign"}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

function CloseModal({ caseId, onClose, onDone }: { caseId: string; onClose: () => void; onDone: () => void }) {
  const [resolution, setResolution] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function handle() {
    if (!resolution.trim()) { setError("Resolution summary is required"); return; }
    setSaving(true);
    try {
      const res = await api.post(`/api/forensic/cases/${caseId}/close`, { resolution });
      if (res.success) onDone(); else setError(res.error || "Failed");
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  }
  return (
    <ModalShell title="Close Case" icon={X} onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="text-xs text-foreground-muted mb-1 block">Resolution Summary <span className="text-red-400">*</span></label>
          <textarea value={resolution} onChange={e => setResolution(e.target.value)}
            placeholder="Describe what was found and what action was taken"
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground" rows={3} />
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="px-3 py-2 text-xs text-foreground-muted bg-surface-hover rounded-lg border border-border">Cancel</button>
          <button onClick={handle} disabled={saving} className="px-3 py-2 text-xs text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50">
            {saving ? "Closing…" : "Close Case"}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

function AddEvidenceModal({ caseId, onClose, onDone }: { caseId: string; onClose: () => void; onDone: () => void }) {
  const [sourceRef, setSourceRef] = useState("");
  const [evidenceType, setEvidenceType] = useState("audit_event");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function handle() {
    if (!sourceRef.trim()) { setError("Source reference is required"); return; }
    setSaving(true);
    try {
      const res = await api.post(`/api/forensic/cases/${caseId}/evidence`, { source_ref: sourceRef, evidence_type: evidenceType, description });
      if (res.success) onDone(); else setError(res.error || "Failed");
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  }
  return (
    <ModalShell title="Add Evidence" icon={Archive} onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="text-xs text-foreground-muted mb-1 block">Evidence Type</label>
          <select value={evidenceType} onChange={e => setEvidenceType(e.target.value)}
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground">
            <option value="audit_event">Audit Event</option>
            <option value="vault_item">Vault Item</option>
            <option value="screenshot">Screenshot</option>
            <option value="log_export">Log Export</option>
            <option value="external_document">External Document</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-foreground-muted mb-1 block">Source Reference (ID or URL) <span className="text-red-400">*</span></label>
          <input value={sourceRef} onChange={e => setSourceRef(e.target.value)} placeholder="event UUID, item ID, or URL"
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground" />
        </div>
        <div>
          <label className="text-xs text-foreground-muted mb-1 block">Description</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)}
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground" rows={2} />
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="px-3 py-2 text-xs text-foreground-muted bg-surface-hover rounded-lg border border-border">Cancel</button>
          <button onClick={handle} disabled={saving} className="px-3 py-2 text-xs text-white bg-amber-600 rounded-lg hover:bg-amber-700 disabled:opacity-50">
            {saving ? "Adding…" : "Add Evidence"}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

function AddNoteModal({ caseId, onClose, onDone }: { caseId: string; onClose: () => void; onDone: () => void }) {
  const [content, setContent] = useState("");
  const [isPrivileged, setIsPrivileged] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function handle() {
    if (!content.trim()) { setError("Note content is required"); return; }
    setSaving(true);
    try {
      const res = await api.post(`/api/forensic/cases/${caseId}/notes`, { content, is_privileged: isPrivileged });
      if (res.success) onDone(); else setError(res.error || "Failed");
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  }
  return (
    <ModalShell title="Add Note" icon={FileText} onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="text-xs text-foreground-muted mb-1 block">Note <span className="text-red-400">*</span></label>
          <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Investigation note…"
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground" rows={4} />
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={isPrivileged} onChange={e => setIsPrivileged(e.target.checked)}
            className="w-3.5 h-3.5 rounded border-border" />
          <span className="text-xs text-foreground-muted">Mark as legally privileged</span>
        </label>
        {error && <p className="text-xs text-red-400">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="px-3 py-2 text-xs text-foreground-muted bg-surface-hover rounded-lg border border-border">Cancel</button>
          <button onClick={handle} disabled={saving} className="px-3 py-2 text-xs text-white bg-amber-600 rounded-lg hover:bg-amber-700 disabled:opacity-50">
            {saving ? "Saving…" : "Save Note"}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

function AddTaskModal({ caseId, onClose, onDone }: { caseId: string; onClose: () => void; onDone: () => void }) {
  const [title, setTitle] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [priority, setPriority] = useState("normal");
  const [dueAt, setDueAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function handle() {
    if (!title.trim()) { setError("Task title is required"); return; }
    setSaving(true);
    try {
      const body: Record<string, any> = { title, priority };
      if (assignedTo) body.assigned_to = assignedTo;
      if (dueAt) body.due_at = new Date(dueAt).toISOString();
      const res = await api.post(`/api/forensic/cases/${caseId}/tasks`, body);
      if (res.success) onDone(); else setError(res.error || "Failed");
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  }
  return (
    <ModalShell title="Add Task" icon={ListTodo} onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="text-xs text-foreground-muted mb-1 block">Task Title <span className="text-red-400">*</span></label>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="What needs to be done?"
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-foreground-muted mb-1 block">Priority</label>
            <select value={priority} onChange={e => setPriority(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground">
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-foreground-muted mb-1 block">Due Date</label>
            <input type="date" value={dueAt} onChange={e => setDueAt(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground" />
          </div>
        </div>
        <div>
          <label className="text-xs text-foreground-muted mb-1 block">Assign To (User ID)</label>
          <input value={assignedTo} onChange={e => setAssignedTo(e.target.value)} placeholder="UUID"
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground" />
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="px-3 py-2 text-xs text-foreground-muted bg-surface-hover rounded-lg border border-border">Cancel</button>
          <button onClick={handle} disabled={saving} className="px-3 py-2 text-xs text-white bg-amber-600 rounded-lg hover:bg-amber-700 disabled:opacity-50">
            {saving ? "Adding…" : "Add Task"}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

function RequestExportModal({ caseId, onClose, onDone }: { caseId: string; onClose: () => void; onDone: () => void }) {
  const [format, setFormat] = useState("pdf");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function handle() {
    if (!reason.trim()) { setError("Reason is required"); return; }
    setSaving(true);
    try {
      const res = await api.post(`/api/forensic/cases/${caseId}/exports`, { format, reason });
      if (res.success) onDone(); else setError(res.error || "Failed");
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  }
  return (
    <ModalShell title="Request Export" icon={Download} onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="text-xs text-foreground-muted mb-1 block">Format</label>
          <select value={format} onChange={e => setFormat(e.target.value)}
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground">
            <option value="pdf">PDF</option>
            <option value="json">JSON</option>
            <option value="csv">CSV</option>
            <option value="zip">ZIP (full package)</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-foreground-muted mb-1 block">Reason <span className="text-red-400">*</span></label>
          <textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Why is this export being requested?"
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground" rows={2} />
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="px-3 py-2 text-xs text-foreground-muted bg-surface-hover rounded-lg border border-border">Cancel</button>
          <button onClick={handle} disabled={saving} className="px-3 py-2 text-xs text-white bg-amber-600 rounded-lg hover:bg-amber-700 disabled:opacity-50">
            {saving ? "Requesting…" : "Request Export"}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
