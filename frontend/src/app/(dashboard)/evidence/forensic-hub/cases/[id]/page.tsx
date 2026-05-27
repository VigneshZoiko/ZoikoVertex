"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import {
  ArrowLeft, Clock, AlertTriangle, CheckCircle2, Shield, Lock, Unlock,
  Activity, Eye, EyeOff, FileSearch, User, Bot, Server, Key,
  Copy, ExternalLink, Archive, Info, Share2, ChevronRight, Plus, X,
  Fingerprint, Gavel, Bookmark, Download, RefreshCw, MessageSquare,
  ClipboardList, Send, GitBranch, FileText, Sparkles, Lightbulb,
} from "lucide-react";

interface ForensicCase {
  id: string; case_id: string; case_type: string; title: string; summary: string;
  severity: string; status: string; owner_user_id: string | null;
  participants?: any[]; source: string; source_event_ids: string[];
  legal_hold_active: boolean; privilege_flag: boolean; retention_class: string;
  sla_due_at: string | null; closed_at: string | null; closure: any;
  created_at: string; updated_at: string;
}

interface EvidenceItem {
  id: string; source_type: string; source_id: string; relevance: string;
  vault_status: string; hash: string | null; added_by: string; added_reason: string;
  is_pinned: boolean; pin_reason: string | null; added_at: string;
  metadata: Record<string, any>;
}

interface CaseNote {
  id: string; note_class: string; content: string; author_id: string;
  created_at: string;
}

interface CaseAction {
  id: string; action_type: string; actor_id: string; reason: string;
  before_state: any; after_state: any; audit_event_id: string | null; created_at: string;
}

interface TimelineItem {
  type: string; timestamp: string; label: string; actor: string;
  detail: string; confidence: string; source_id: string;
}

interface CaseTask {
  id: string; title: string; description: string | null; owner_id: string;
  status: string; due_at: string | null; created_at: string; completed_at: string | null;
}

type TabId = "overview" | "timeline" | "evidence" | "notes" | "tasks" | "actions" | "export" | "graph" | "ai" | "close";

const SEVERITY_COLORS: Record<string, string> = {
  critical: "text-red-400 bg-red-400/10 border-red-400/30",
  high: "text-orange-400 bg-orange-400/10 border-orange-400/30",
  medium: "text-amber-400 bg-amber-400/10 border-amber-400/30",
  low: "text-blue-400 bg-blue-400/10 border-blue-400/30",
};

const STATUS_LABELS: Record<string, string> = {
  new: "New", triage: "Triage", active_investigation: "Active Investigation",
  awaiting_information: "Awaiting Info", legal_review: "Legal Review",
  legal_hold: "Legal Hold", remediation: "Remediation",
  validation: "Validation", escalated: "Escalated",
  closed: "Closed", reopened: "Reopened",
};

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "overview", label: "Overview", icon: Info },
  { id: "timeline", label: "Timeline", icon: Activity },
  { id: "evidence", label: "Evidence", icon: Archive },
  { id: "notes", label: "Notes", icon: MessageSquare },
  { id: "tasks", label: "Tasks", icon: ClipboardList },
  { id: "actions", label: "Actions", icon: Eye },
  { id: "export", label: "Export", icon: Share2 },
  { id: "graph", label: "Graph", icon: GitBranch },
  { id: "ai", label: "AI Assist", icon: Sparkles },
  { id: "close", label: "Close Case", icon: CheckCircle2 },
];

function fmt(ts: string) {
  try { return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }); }
  catch { return ts; }
}

export default function CaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [caseData, setCaseData] = useState<ForensicCase | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  // Sub-resources
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [notes, setNotes] = useState<CaseNote[]>([]);
  const [actions, setActions] = useState<CaseAction[]>([]);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [tasks, setTasks] = useState<CaseTask[]>([]);
  const [loading, setLoading] = useState(true);

  // Note form
  const [noteContent, setNoteContent] = useState("");
  const [noteClass, setNoteClass] = useState("internal_investigation");

  // Evidence form
  const [showEvidenceForm, setShowEvidenceForm] = useState(false);
  const [evidenceForm, setEvidenceForm] = useState({ source_type: "audit_event", source_id: "", added_reason: "" });

  // Task form
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: "", description: "", owner_id: "" });

  // Close form
  const [closeForm, setCloseForm] = useState({ outcome: "substantiated", rationale: "", findings: "" });

  // Status update
  const [newStatus, setNewStatus] = useState("");
  const [updateReason, setUpdateReason] = useState("");

  // Phase 2: Vault preserve
  const [selectedEvidence, setSelectedEvidence] = useState<Set<string>>(new Set());
  const [preserving, setPreserving] = useState(false);
  const [preserveResult, setPreserveResult] = useState<any>(null);

  // Phase 2: Legal hold
  const [legalHoldReason, setLegalHoldReason] = useState("");
  const [showLegalHold, setShowLegalHold] = useState(false);

  // Phase 3: Export
  const [exports, setExports] = useState<any[]>([]);
  const [exportForm, setExportForm] = useState({ package_type: "internal_investigation", format: "json", redaction_profile: "standard", reason: "" });
  const [showExportForm, setShowExportForm] = useState(false);
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  // Phase 3: Graph
  const [graphData, setGraphData] = useState<{ nodes: any[]; edges: any[] } | null>(null);
  const [graphLoading, setGraphLoading] = useState(false);

  // Phase 4: AI Assist
  const [aiSummaries, setAiSummaries] = useState<any[]>([]);
  const [timelineExplanation, setTimelineExplanation] = useState<string | null>(null);
  const [anomalies, setAnomalies] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [generatingExplanation, setGeneratingExplanation] = useState(false);
  const [generatingAnomalies, setGeneratingAnomalies] = useState(false);
  const [generatingRecommendations, setGeneratingRecommendations] = useState(false);

  const fetchCase = async () => {
    try {
      const res = await api.get(`/api/forensic/cases/${id}`);
      if (res.success) setCaseData(res.data);
    } catch { /* ignore */ }
  };

  const fetchAll = async () => {
    setLoading(true);
    await Promise.all([
      fetchCase(),
      api.get(`/api/forensic/cases/${id}/evidence`).then(r => { if (r.success) setEvidence(r.data); }),
      api.get(`/api/forensic/cases/${id}/notes`).then(r => { if (r.success) setNotes(r.data); }),
      api.get(`/api/forensic/cases/${id}/actions`).then(r => { if (r.success) setActions(r.data); }),
      api.get(`/api/forensic/cases/${id}/timeline`).then(r => { if (r.success) setTimeline(r.data); }),
      api.get(`/api/forensic/cases/${id}/tasks`).then(r => { if (r.success) setTasks(r.data); }),
      api.get(`/api/forensic/cases/${id}/exports`).then(r => { if (r.success) setExports(r.data); }),
    ]);
    setLoading(false);
  };

  // Phase 3: Export handlers
  const handleCreateExport = async () => {
    if (!exportForm.reason || !exportForm.package_type) return;
    try {
      const res = await api.post(`/api/forensic/cases/${id}/exports`, exportForm);
      if (res.success) {
        setExports(prev => [res.data, ...prev]);
        setShowExportForm(false);
        setExportForm({ package_type: "internal_investigation", format: "json", redaction_profile: "standard", reason: "" });
      }
    } catch { /* ignore */ }
  };

  const handleGenerateExport = async (exportId: string) => {
    setGeneratingId(exportId);
    try {
      const res = await api.post(`/api/forensic/cases/${id}/exports/${exportId}/generate`, {});
      if (res.success) {
        setExports(prev => prev.map(e => e.id === exportId ? res.data : e));
      }
    } catch { /* ignore */ }
    setGeneratingId(null);
  };

  const handleApproveExport = async (exportId: string) => {
    try {
      const res = await api.post(`/api/forensic/cases/${id}/exports/${exportId}/approve`, {});
      if (res.success) {
        setExports(prev => prev.map(e => e.id === exportId ? res.data : e));
      }
    } catch { /* ignore */ }
  };

  // Phase 3: Graph
  const fetchGraph = async () => {
    setGraphLoading(true);
    try {
      const res = await api.get(`/api/forensic/cases/${id}/graph`);
      if (res.success) setGraphData(res.data);
    } catch { /* ignore */ }
    setGraphLoading(false);
  };

  // Phase 4: AI Assist handlers
  const handleGenerateSummary = async () => {
    setGeneratingSummary(true);
    try {
      const res = await api.post(`/api/forensic/cases/${id}/ai/summary`, {});
      if (res.success) {
        setAiSummaries(prev => [res.data, ...prev]);
      }
    } catch { /* ignore */ }
    setGeneratingSummary(false);
  };

  const handleApproveSummary = async (summaryId: string) => {
    try {
      const res = await api.post(`/api/forensic/cases/${id}/ai/summaries/${summaryId}/approve`, {});
      if (res.success) {
        setAiSummaries(prev => prev.map(s => s.id === summaryId ? res.data : s));
      }
    } catch { /* ignore */ }
  };

  const handleRejectSummary = async (summaryId: string) => {
    const reason = prompt("Rejection reason:");
    if (!reason) return;
    try {
      const res = await api.post(`/api/forensic/cases/${id}/ai/summaries/${summaryId}/reject`, { reason });
      if (res.success) {
        setAiSummaries(prev => prev.map(s => s.id === summaryId ? res.data : s));
      }
    } catch { /* ignore */ }
  };

  const handleGenerateExplanation = async () => {
    setGeneratingExplanation(true);
    try {
      const res = await api.post(`/api/forensic/cases/${id}/ai/timeline-explanation`, {});
      if (res.success) setTimelineExplanation(res.data.explanation);
    } catch { /* ignore */ }
    setGeneratingExplanation(false);
  };

  const handleDetectAnomalies = async () => {
    setGeneratingAnomalies(true);
    try {
      const res = await api.post(`/api/forensic/cases/${id}/ai/anomalies`, {});
      if (res.success) setAnomalies(prev => [...res.data, ...prev]);
    } catch { /* ignore */ }
    setGeneratingAnomalies(false);
  };

  const handleGenerateRecommendations = async () => {
    setGeneratingRecommendations(true);
    try {
      const res = await api.post(`/api/forensic/cases/${id}/ai/recommendations`, {});
      if (res.success) setRecommendations(res.data);
    } catch { /* ignore */ }
    setGeneratingRecommendations(false);
  };

  // Fetch AI summaries on load
  const fetchAiSummaries = async () => {
    try {
      const res = await api.get(`/api/forensic/cases/${id}/ai/summaries`);
      if (res.success) setAiSummaries(res.data);
    } catch { /* ignore */ }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchAiSummaries(); }, [id]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchAll(); }, [id]);

  const handleAddNote = async () => {
    if (!noteContent.trim()) return;
    try {
      await api.post(`/api/forensic/cases/${id}/notes`, { note_class: noteClass, content: noteContent });
      setNoteContent("");
      api.get(`/api/forensic/cases/${id}/notes`).then(r => { if (r.success) setNotes(r.data); });
    } catch { /* ignore */ }
  };

  const handleAddEvidence = async () => {
    if (!evidenceForm.source_id || !evidenceForm.added_reason) return;
    try {
      await api.post(`/api/forensic/cases/${id}/evidence`, evidenceForm);
      setEvidenceForm({ source_type: "audit_event", source_id: "", added_reason: "" });
      setShowEvidenceForm(false);
      api.get(`/api/forensic/cases/${id}/evidence`).then(r => { if (r.success) setEvidence(r.data); });
    } catch { /* ignore */ }
  };

  const handleAddTask = async () => {
    if (!taskForm.title || !taskForm.owner_id) return;
    try {
      await api.post(`/api/forensic/cases/${id}/tasks`, taskForm);
      setTaskForm({ title: "", description: "", owner_id: "" });
      setShowTaskForm(false);
      api.get(`/api/forensic/cases/${id}/tasks`).then(r => { if (r.success) setTasks(r.data); });
    } catch { /* ignore */ }
  };

  const handleStatusUpdate = async () => {
    if (!newStatus || !updateReason) return;
    try {
      const res = await api.patch(`/api/forensic/cases/${id}`, { status: newStatus, reason: updateReason });
      if (res.success) { setCaseData(res.data); setNewStatus(""); setUpdateReason(""); fetchCase(); }
    } catch { /* ignore */ }
  };

  const handleClose = async () => {
    if (!closeForm.outcome || !closeForm.rationale) return;
    try {
      const res = await api.post(`/api/forensic/cases/${id}/close`, closeForm);
      if (res.success) { setCaseData(res.data); fetchCase(); }
    } catch { /* ignore */ }
  };

  const handleReopen = async () => {
    const reason = prompt("Reason for reopening:");
    if (!reason) return;
    try {
      const res = await api.post(`/api/forensic/cases/${id}/reopen`, { reason });
      if (res.success) { setCaseData(res.data); fetchCase(); }
    } catch { /* ignore */ }
  };

  const handlePinEvidence = async (evidenceId: string) => {
    const reason = prompt("Pin reason:");
    if (!reason) return;
    try {
      await api.post(`/api/forensic/cases/${id}/evidence/${evidenceId}/pin`, { reason });
      api.get(`/api/forensic/cases/${id}/evidence`).then(r => { if (r.success) setEvidence(r.data); });
    } catch { /* ignore */ }
  };

  // Phase 2: Vault preserve
  const handlePreserveToVault = async () => {
    if (selectedEvidence.size === 0) return;
    setPreserving(true);
    setPreserveResult(null);
    try {
      const res = await api.post(`/api/forensic/cases/${id}/preserve`, {
        evidence_ids: Array.from(selectedEvidence),
        retention_class: "standard",
        preservation_reason: "Phase 2 preservation from investigation",
      });
      if (res.success) {
        setPreserveResult(res.data);
        setSelectedEvidence(new Set());
        api.get(`/api/forensic/cases/${id}/evidence`).then(r => { if (r.success) setEvidence(r.data); });
      }
    } catch { /* ignore */ }
    setPreserving(false);
  };

  // Phase 2: Legal hold
  const handleApplyLegalHold = async () => {
    if (!legalHoldReason) return;
    try {
      const res = await api.post(`/api/forensic/cases/${id}/legal-hold`, { reason: legalHoldReason });
      if (res.success) { setCaseData(res.data); setLegalHoldReason(""); setShowLegalHold(false); fetchCase(); }
    } catch { /* ignore */ }
  };

  const handleReleaseLegalHold = async () => {
    const reason = prompt("Reason to release legal hold:");
    if (!reason) return;
    try {
      const res = await api.post(`/api/forensic/cases/${id}/legal-hold/release`, { reason });
      if (res.success) { setCaseData(res.data); fetchCase(); }
    } catch { /* ignore */ }
  };

  const toggleEvidenceSelection = (id: string) => {
    setSelectedEvidence(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (loading) return <div className="p-8 text-[#888]">Loading case...</div>;
  if (!caseData) return <div className="p-8 text-red-400">Case not found.</div>;

  const c = caseData;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Back */}
      <button onClick={() => router.push("/evidence/forensic-hub")} className="flex items-center gap-1.5 text-xs text-[#888] hover:text-white mb-4">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Forensic Hub
      </button>

      {/* Case Header */}
      <div className="bg-[#111] border border-[#222] rounded-xl p-6 mb-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-xl font-bold text-white">{c.title}</h1>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs border ${SEVERITY_COLORS[c.severity]}`}>
                {c.severity}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded border ${
                c.status === "escalated" ? "bg-red-400/10 border-red-400/30 text-red-400" :
                c.status === "legal_hold" ? "bg-amber-400/10 border-amber-400/30 text-amber-400" :
                c.status === "closed" ? "bg-emerald-400/10 border-emerald-400/30 text-emerald-400" :
                c.status === "reopened" ? "bg-blue-400/10 border-blue-400/30 text-blue-400" :
                "bg-[#0a0a0a] border-[#222] text-[#888]"
              }`}>
                {STATUS_LABELS[c.status]}
              </span>
            </div>
            <p className="text-sm text-[#888]">{c.summary}</p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            {c.legal_hold_active && (
              <span className="flex items-center gap-1 px-2 py-1 bg-amber-400/10 border border-amber-400/30 rounded text-amber-400">
                <Lock className="w-3 h-3" /> Legal Hold
              </span>
            )}
            {c.privilege_flag && (
              <span className="flex items-center gap-1 px-2 py-1 bg-purple-400/10 border border-purple-400/30 rounded text-purple-400">
                <EyeOff className="w-3 h-3" /> Privileged
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-4 text-xs text-[#666]">
          <div className="flex items-center gap-1.5">
            <Fingerprint className="w-3.5 h-3.5" /> {c.case_id}
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> {fmt(c.created_at)}
          </div>
          <div>Type: {c.case_type.replace(/_/g, " ")}</div>
          <div>Source: {c.source}</div>
          {c.owner_user_id && <div>Owner: {c.owner_user_id}</div>}
          {c.sla_due_at && (
            <div className={`flex items-center gap-1 ${new Date(c.sla_due_at) < new Date() ? "text-red-400" : "text-amber-400"}`}>
              <Clock className="w-3 h-3" />
              SLA: {fmt(c.sla_due_at)}
              {new Date(c.sla_due_at) < new Date() && <span className="text-[10px] px-1 bg-red-400/10 rounded">BREACHED</span>}
            </div>
          )}
          {c.closed_at && <div>Closed: {fmt(c.closed_at)}</div>}
        </div>
      </div>

      {/* Status Update Bar */}
      {c.status !== "closed" && (
        <div className="bg-[#111] border border-[#222] rounded-xl p-4 mb-4">
          <div className="flex items-center gap-3">
            <select value={newStatus} onChange={e => setNewStatus(e.target.value)}
              className="bg-[#0a0a0a] border border-[#333] rounded-lg px-3 py-2 text-xs text-white">
              <option value="">Update status...</option>
              {["triage", "active_investigation", "awaiting_information", "legal_review", "remediation", "validation"].map(s => (
                <option key={s} value={s}>{STATUS_LABELS[s] || s}</option>
              ))}
            </select>
            <input placeholder="Reason for change"
              value={updateReason} onChange={e => setUpdateReason(e.target.value)}
              className="flex-1 bg-[#0a0a0a] border border-[#333] rounded-lg px-3 py-2 text-xs text-white" />
            <button onClick={handleStatusUpdate} disabled={!newStatus || !updateReason}
              className="px-4 py-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-lg text-xs hover:bg-amber-500/20 disabled:opacity-50">
              Update
            </button>
            <button onClick={() => router.push(`/evidence/audit-trail?create_case=${c.id}`)}
              className="px-3 py-2 border border-[#333] rounded-lg text-xs text-[#888] hover:text-white flex items-center gap-1">
              <Plus className="w-3 h-3" /> Add from Audit Trail
            </button>
            <button
              onClick={() => setShowLegalHold(!showLegalHold)}
              className={`px-3 py-2 rounded-lg text-xs border flex items-center gap-1 ${
                c.legal_hold_active
                  ? "bg-amber-400/10 border-amber-400/30 text-amber-400"
                  : "border-[#333] text-[#888] hover:text-white"
              }`}
            >
              <Gavel className="w-3 h-3" />
              {c.legal_hold_active ? "Release Legal Hold" : "Legal Hold"}
            </button>
          </div>
        </div>
      )}

      {/* Legal Hold Form */}
      {showLegalHold && (
        <div className="bg-[#111] border border-[#222] rounded-xl p-4 mb-4">
          {c.legal_hold_active ? (
            <button onClick={handleReleaseLegalHold}
              className="px-4 py-2 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-xs hover:bg-red-500/20">
              <Gavel className="w-3 h-3 inline mr-1" /> Release Legal Hold
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <input placeholder="Reason for legal hold"
                value={legalHoldReason} onChange={e => setLegalHoldReason(e.target.value)}
                className="flex-1 bg-[#0a0a0a] border border-[#333] rounded-lg px-3 py-2 text-xs text-white" />
              <button onClick={handleApplyLegalHold} disabled={!legalHoldReason}
                className="px-4 py-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-lg text-xs hover:bg-amber-500/20 disabled:opacity-50">
                <Lock className="w-3 h-3 inline mr-1" /> Apply Legal Hold
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex border-b border-[#222] mb-4 overflow-x-auto">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id ? "text-amber-400 border-amber-400" : "text-[#666] border-transparent hover:text-white hover:border-[#444]"
              }`}>
              <Icon className="w-3.5 h-3.5" /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* ======== OVERVIEW TAB ======== */}
      {activeTab === "overview" && (
        <div className="space-y-4">
          {c.closure && (
            <div className="bg-[#111] border border-[#222] rounded-xl p-4">
              <h3 className="text-sm font-medium text-white mb-2">Case Closure</h3>
              <div className="text-xs text-[#888] space-y-1">
                <p>Outcome: <span className="text-white">{c.closure.outcome}</span></p>
                <p>Rationale: {c.closure.rationale}</p>
                {c.closure.findings && <p>Findings: {c.closure.findings}</p>}
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#111] border border-[#222] rounded-xl p-4">
              <h3 className="text-sm font-medium text-white mb-2">Case Info</h3>
              <dl className="space-y-2 text-xs">
                {[
                  ["Case ID", c.case_id], ["Type", c.case_type.replace(/_/g, " ")],
                  ["Severity", c.severity], ["Status", STATUS_LABELS[c.status]],
                  ["Source", c.source], ["Retention", c.retention_class],
                  ["Legal Hold", c.legal_hold_active ? "Active" : "Inactive"],
                  ["Privileged", c.privilege_flag ? "Yes" : "No"],
                  ["Data Residency", "auto"],
                ].map(([k, v]) => (
                  <div key={k as string} className="flex justify-between">
                    <span className="text-[#888]">{k as string}</span>
                    <span className="text-[#ccc]">{v as string}</span>
                  </div>
                ))}
              </dl>
            </div>
            <div className="bg-[#111] border border-[#222] rounded-xl p-4">
              <h3 className="text-sm font-medium text-white mb-2">Quick Actions</h3>
              <div className="space-y-2">
                {c.status !== "closed" ? (
                  <button onClick={() => setActiveTab("close")}
                    className="w-full px-3 py-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-lg text-xs hover:bg-emerald-500/20 flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Close Case
                  </button>
                ) : (
                  <button onClick={handleReopen}
                    className="w-full px-3 py-2 bg-orange-500/10 border border-orange-500/30 text-orange-400 rounded-lg text-xs hover:bg-orange-500/20 flex items-center justify-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5" /> Reopen Case
                  </button>
                )}
                <button onClick={() => setShowEvidenceForm(true)}
                  className="w-full px-3 py-2 border border-[#333] rounded-lg text-xs text-[#888] hover:text-white flex items-center justify-center gap-1.5">
                  <Plus className="w-3.5 h-3.5" /> Add Evidence
                </button>
                <button onClick={() => setActiveTab("notes")}
                  className="w-full px-3 py-2 border border-[#333] rounded-lg text-xs text-[#888] hover:text-white flex items-center justify-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5" /> Add Note
                </button>
              </div>
            </div>
          </div>
          {c.source_event_ids && c.source_event_ids.length > 0 && (
            <div className="bg-[#111] border border-[#222] rounded-xl p-4">
              <h3 className="text-sm font-medium text-white mb-2">Source Events</h3>
              <div className="flex flex-wrap gap-2">
                {c.source_event_ids.map((eid: string) => (
                  <span key={eid} className="px-2 py-1 bg-[#0a0a0a] border border-[#222] rounded text-xs font-mono text-[#888]">
                    {eid}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Phase 4: AI Recommendations */}
          <div className="bg-gradient-to-r from-purple-500/5 to-transparent border border-purple-500/20 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-white flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-purple-400" /> AI Recommendations
              </h3>
              <button onClick={handleGenerateRecommendations} disabled={generatingRecommendations}
                className="px-3 py-1.5 bg-purple-500/10 border border-purple-500/30 text-purple-400 rounded text-[10px] hover:bg-purple-500/20 disabled:opacity-50 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> {generatingRecommendations ? "Generating..." : "Generate"}
              </button>
            </div>
            {recommendations.length === 0 ? (
              <p className="text-xs text-[#888]">Click Generate for AI-suggested next actions based on case type and severity.</p>
            ) : (
              <ul className="space-y-1.5">
                {recommendations.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-[#ccc]">
                    <span className="text-purple-400 mt-0.5">•</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Phase 4: Anomalies */}
          <div className="bg-gradient-to-r from-red-500/5 to-transparent border border-red-500/20 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-white flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400" /> Anomaly Detection
              </h3>
              <button onClick={handleDetectAnomalies} disabled={generatingAnomalies}
                className="px-3 py-1.5 bg-red-500/10 border border-red-500/30 text-red-400 rounded text-[10px] hover:bg-red-500/20 disabled:opacity-50 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> {generatingAnomalies ? "Scanning..." : "Scan"}
              </button>
            </div>
            {anomalies.length === 0 ? (
              <p className="text-xs text-[#888]">Click Scan to detect anomaly patterns in case data.</p>
            ) : (
              <div className="space-y-2">
                {anomalies.map((a: any, i: number) => (
                  <div key={i} className="bg-[#0a0a0a] border border-[#222] rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                        a.severity === "high" ? "bg-red-400/10 text-red-400" : "bg-amber-400/10 text-amber-400"
                      }`}>{a.anomaly_type}</span>
                      <span className="text-xs text-white">{a.label}</span>
                    </div>
                    {a.description && <p className="text-[10px] text-[#888]">{a.description}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======== TIMELINE TAB (Phase 2 Enhanced) ======== */}
      {activeTab === "timeline" && (
        <div className="bg-[#111] border border-[#222] rounded-xl p-6">
          <h3 className="text-sm font-medium text-white mb-4">Reconstructed Timeline</h3>
          <p className="text-xs text-[#888] mb-4">
            Deterministic correlation from audit event keys. Confidence labels: <span className="text-emerald-400">Deterministic</span>, <span className="text-blue-400">High</span>, <span className="text-amber-400">Medium</span>, <span className="text-[#666]">Suggestive</span>.
          </p>
          {timeline.length === 0 ? (
            <p className="text-xs text-[#888]">No timeline events yet.</p>
          ) : (
            <div className="space-y-3">
              {timeline.map((item: any, i: number) => (
                <div key={i} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-2.5 h-2.5 rounded-full border-2 ${
                      item.confidence === "deterministic" ? "bg-emerald-400 border-emerald-600" :
                      item.confidence === "high" ? "bg-blue-400 border-blue-600" :
                      item.confidence === "medium" ? "bg-amber-400 border-amber-600" :
                      "bg-[#555] border-[#444]"
                    }`} />
                    {i < timeline.length - 1 && <div className="w-px flex-1 bg-[#222]" />}
                  </div>
                  <div className="flex-1 pb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-medium text-white">{item.label}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                        item.confidence === "deterministic" ? "text-emerald-400 bg-emerald-400/10" :
                        item.confidence === "high" ? "text-blue-400 bg-blue-400/10" :
                        item.confidence === "medium" ? "text-amber-400 bg-amber-400/10" :
                        "text-[#666] bg-[#0a0a0a]"
                      }`}>{item.confidence}</span>
                      {item.correlation_label && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-400/10 text-purple-400">
                          {item.correlation_label}
                        </span>
                      )}
                      {item.is_pinned && (
                        <span className="text-[10px] text-amber-400">📌</span>
                      )}
                      {item.vault_status && item.vault_status !== "not_preserved" && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-400/10 text-emerald-400">
                          Vault: {item.vault_status}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#888] mt-0.5">{item.detail}</p>
                    <div className="flex gap-3 text-[10px] text-[#555] mt-1">
                      <span>{fmt(item.timestamp)}</span>
                      <span>by {item.actor}</span>
                      {item.source_id && <span className="font-mono">#{item.source_id.substring(0, 8)}</span>}
                      {item.audit_event_id && (
                        <span className="font-mono text-amber-400/60">audit:{item.audit_event_id.substring(0, 12)}</span>
                      )}
                    </div>
                    {item.nearby_events && item.nearby_events.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {item.nearby_events.map((ne: any, j: number) => (
                          <span key={j} className="text-[10px] px-1.5 py-0.5 bg-[#0a0a0a] border border-[#222] rounded text-[#666]">
                            Nearby: {ne.event_type} ({ne.event_id.substring(0, 8)})
                          </span>
                        ))}
                      </div>
                    )}
                    {item.audit_source && (
                      <div className="mt-1.5 text-[10px] text-[#555] bg-[#0a0a0a] rounded p-2">
                        <div>Event: {item.audit_source.event_type} | {item.audit_source.event_category}</div>
                        {item.audit_source.actor && <div>Actor: {item.audit_source.actor.actor_id}</div>}
                        {item.audit_source.object && <div>Object: {item.audit_source.object.object_type}:{item.audit_source.object.object_id}</div>}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ======== EVIDENCE TAB ======== */}
      {activeTab === "evidence" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowEvidenceForm(!showEvidenceForm)}
              className="px-4 py-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-lg text-xs hover:bg-amber-500/20 flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" /> {showEvidenceForm ? "Cancel" : "Add Evidence"}
            </button>
          </div>

          {showEvidenceForm && (
            <div className="bg-[#111] border border-[#222] rounded-xl p-4 space-y-3">
              <select value={evidenceForm.source_type} onChange={e => setEvidenceForm(p => ({ ...p, source_type: e.target.value }))}
                className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg px-3 py-2 text-xs text-white">
                <option value="audit_event">Audit Event</option>
                <option value="vault_item">Vault Item</option>
                <option value="file">File</option>
                <option value="content_snapshot">Content Snapshot</option>
                <option value="platform_receipt">Platform Receipt</option>
              </select>
              <input placeholder="Source ID (event_id, file_id, etc.)"
                value={evidenceForm.source_id} onChange={e => setEvidenceForm(p => ({ ...p, source_id: e.target.value }))}
                className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg px-3 py-2 text-xs text-white" />
              <input placeholder="Reason for adding"
                value={evidenceForm.added_reason} onChange={e => setEvidenceForm(p => ({ ...p, added_reason: e.target.value }))}
                className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg px-3 py-2 text-xs text-white" />
              <button onClick={handleAddEvidence}
                className="px-4 py-2 bg-amber-500 text-black rounded-lg text-xs font-medium hover:bg-amber-400">
                Add to Case
              </button>
            </div>
          )}

          <div className="flex items-center gap-2">
            {selectedEvidence.size > 0 && (
              <button onClick={handlePreserveToVault} disabled={preserving}
                className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-lg text-xs hover:bg-emerald-500/20 disabled:opacity-50 flex items-center gap-1.5">
                <Archive className="w-3.5 h-3.5" />
                {preserving ? "Preserving..." : `Preserve to Vault (${selectedEvidence.size})`}
              </button>
            )}
            {preserveResult && (
              <div className="text-xs text-emerald-400">
                Preserved in manifest: {preserveResult.manifest_id}
              </div>
            )}
          </div>

          {evidence.length === 0 ? (
            <div className="bg-[#111] border border-[#222] rounded-xl p-8 text-center">
              <Archive className="w-8 h-8 mx-auto mb-2 text-[#444]" />
              <p className="text-xs text-[#888]">No evidence added yet.</p>
            </div>
          ) : (
            <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-xs text-[#888] uppercase tracking-wider border-b border-[#222]">
                    <th className="py-3 px-4 w-8"></th>
                    <th className="py-3 px-4">Source</th>
                    <th className="py-3 px-4">ID</th>
                    <th className="py-3 px-4">Relevance</th>
                    <th className="py-3 px-4">Vault</th>
                    <th className="py-3 px-4">Pinned</th>
                    <th className="py-3 px-4">Added</th>
                    <th className="py-3 px-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#222]">
                  {evidence.map(e => (
                    <tr key={e.id} className={`text-xs text-[#ccc] ${selectedEvidence.has(e.id) ? "bg-emerald-400/5" : ""}`}>
                      <td className="py-3 px-4">
                        <input type="checkbox"
                          checked={selectedEvidence.has(e.id)}
                          onChange={() => toggleEvidenceSelection(e.id)}
                          className="accent-amber-500" />
                      </td>
                      <td className="py-3 px-4">{e.source_type.replace(/_/g, " ")}</td>
                      <td className="py-3 px-4 font-mono">{e.source_id.substring(0, 16)}</td>
                      <td className="py-3 px-4">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                          e.relevance === "primary" ? "text-emerald-400 bg-emerald-400/10" :
                          e.relevance === "supporting" ? "text-blue-400 bg-blue-400/10" :
                          e.relevance === "disputed" ? "text-red-400 bg-red-400/10" :
                          "text-[#888] bg-[#0a0a0a]"
                        }`}>{e.relevance}</span>
                      </td>
                      <td className="py-3 px-4">
                        {e.vault_status === "preserved" || e.metadata?.legal_hold_at ? (
                          <span className="text-emerald-400 text-[10px] bg-emerald-400/10 px-1.5 py-0.5 rounded">
                            {e.metadata?.legal_hold_at ? "Legal Hold" : "Preserved"}
                          </span>
                        ) : (
                          <span className="text-[#555]">{e.vault_status}</span>
                        )}
                      </td>
                      <td className="py-3 px-4">{e.is_pinned ? <Bookmark className="w-3.5 h-3.5 text-amber-400" /> : "—"}</td>
                      <td className="py-3 px-4 text-[#888]">{fmt(e.added_at)}</td>
                      <td className="py-3 px-4">
                        {!e.is_pinned && (
                          <button onClick={() => handlePinEvidence(e.id)}
                            className="text-[#888] hover:text-amber-400">
                            <Bookmark className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ======== NOTES TAB ======== */}
      {activeTab === "notes" && (
        <div className="space-y-4">
          <div className="bg-[#111] border border-[#222] rounded-xl p-4 space-y-3">
            <select value={noteClass} onChange={e => setNoteClass(e.target.value)}
              className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg px-3 py-2 text-xs text-white">
              <option value="internal_investigation">Internal Investigation Note</option>
              <option value="legal_privileged">Legal Privileged Note</option>
              <option value="external_shareable">External Shareable Note</option>
            </select>
            <textarea placeholder="Note content"
              value={noteContent} onChange={e => setNoteContent(e.target.value)}
              className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg px-3 py-2 text-xs text-white resize-none h-24" />
            <button onClick={handleAddNote}
              className="px-4 py-2 bg-amber-500 text-black rounded-lg text-xs font-medium hover:bg-amber-400">
              Add Note
            </button>
          </div>

          {notes.length === 0 ? (
            <div className="bg-[#111] border border-[#222] rounded-xl p-8 text-center">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 text-[#444]" />
              <p className="text-xs text-[#888]">No notes yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notes.map(n => (
                <div key={n.id} className="bg-[#111] border border-[#222] rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                      n.note_class === "legal_privileged" ? "text-purple-400 bg-purple-400/10" :
                      n.note_class === "external_shareable" ? "text-blue-400 bg-blue-400/10" :
                      "text-[#888] bg-[#0a0a0a]"
                    }`}>
                      {n.note_class.replace(/_/g, " ")}
                    </span>
                    <span className="text-[10px] text-[#555]">{fmt(n.created_at)}</span>
                    <span className="text-[10px] text-[#555]">by {n.author_id}</span>
                  </div>
                  <p className="text-sm text-[#ccc] whitespace-pre-wrap">{n.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ======== TASKS TAB ======== */}
      {activeTab === "tasks" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowTaskForm(!showTaskForm)}
              className="px-4 py-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-lg text-xs hover:bg-amber-500/20 flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" /> {showTaskForm ? "Cancel" : "Add Task"}
            </button>
          </div>

          {showTaskForm && (
            <div className="bg-[#111] border border-[#222] rounded-xl p-4 space-y-3">
              <input placeholder="Task title" value={taskForm.title}
                onChange={e => setTaskForm(p => ({ ...p, title: e.target.value }))}
                className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg px-3 py-2 text-xs text-white" />
              <input placeholder="Description" value={taskForm.description}
                onChange={e => setTaskForm(p => ({ ...p, description: e.target.value }))}
                className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg px-3 py-2 text-xs text-white" />
              <input placeholder="Owner ID" value={taskForm.owner_id}
                onChange={e => setTaskForm(p => ({ ...p, owner_id: e.target.value }))}
                className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg px-3 py-2 text-xs text-white" />
              <button onClick={handleAddTask}
                className="px-4 py-2 bg-amber-500 text-black rounded-lg text-xs font-medium hover:bg-amber-400">
                Create Task
              </button>
            </div>
          )}

          {tasks.length === 0 ? (
            <div className="bg-[#111] border border-[#222] rounded-xl p-8 text-center">
              <ClipboardList className="w-8 h-8 mx-auto mb-2 text-[#444]" />
              <p className="text-xs text-[#888]">No tasks yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {tasks.map(t => (
                <div key={t.id} className="bg-[#111] border border-[#222] rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <div className="text-sm text-white">{t.title}</div>
                    {t.description && <p className="text-xs text-[#888] mt-0.5">{t.description}</p>}
                    <div className="flex gap-3 text-[10px] text-[#555] mt-1">
                      <span>Owner: {t.owner_id}</span>
                      {t.due_at && <span>Due: {fmt(t.due_at)}</span>}
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                    t.status === "completed" ? "text-emerald-400 bg-emerald-400/10" :
                    t.status === "open" ? "text-amber-400 bg-amber-400/10" :
                    "text-[#888] bg-[#0a0a0a]"
                  }`}>{t.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ======== ACTIONS TAB ======== */}
      {activeTab === "actions" && (
        <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-[#222]">
            <h3 className="text-sm font-medium text-white">Case Action Log</h3>
          </div>
          {actions.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#888]">No actions recorded.</div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs text-[#888] uppercase tracking-wider border-b border-[#222]">
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-4">Audit Event</th>
                  <th className="py-3 px-4">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222]">
                {actions.map(a => (
                  <tr key={a.id} className="text-xs text-[#ccc]">
                    <td className="py-3 px-4">{a.action_type.replace(/_/g, " ")}</td>
                    <td className="py-3 px-4">{a.actor_id}</td>
                    <td className="py-3 px-4 text-[#888]">{a.reason}</td>
                    <td className="py-3 px-4">
                      {a.audit_event_id
                        ? <span className="font-mono text-[10px] text-amber-400">{a.audit_event_id.substring(0, 12)}</span>
                        : <span className="text-[#555]">—</span>
                      }
                    </td>
                    <td className="py-3 px-4 text-[#888]">{fmt(a.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ======== EXPORT TAB (Phase 3) ======== */}
      {activeTab === "export" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-medium text-white">Export Packages</h3>
            <button onClick={() => setShowExportForm(!showExportForm)}
              className="px-4 py-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-lg text-xs hover:bg-amber-500/20 flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" /> {showExportForm ? "Cancel" : "New Export"}
            </button>
          </div>

          {showExportForm && (
            <div className="bg-[#111] border border-[#222] rounded-xl p-4 space-y-3">
              <select value={exportForm.package_type} onChange={e => setExportForm(p => ({ ...p, package_type: e.target.value }))}
                className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg px-3 py-2 text-xs text-white">
                <option value="internal_investigation">Internal Investigation Pack</option>
                <option value="legal">Legal Pack</option>
                <option value="regulator">Regulator Pack</option>
                <option value="customer_assurance">Customer Assurance Pack</option>
                <option value="board">Board Pack</option>
              </select>
              <div className="flex gap-3">
                <select value={exportForm.format} onChange={e => setExportForm(p => ({ ...p, format: e.target.value }))}
                  className="flex-1 bg-[#0a0a0a] border border-[#333] rounded-lg px-3 py-2 text-xs text-white">
                  <option value="json">JSON</option>
                  <option value="pdf">PDF</option>
                  <option value="csv">CSV</option>
                  <option value="zip">ZIP</option>
                </select>
                <select value={exportForm.redaction_profile} onChange={e => setExportForm(p => ({ ...p, redaction_profile: e.target.value }))}
                  className="flex-1 bg-[#0a0a0a] border border-[#333] rounded-lg px-3 py-2 text-xs text-white">
                  <option value="none">No Redaction</option>
                  <option value="standard">Standard</option>
                  <option value="legal">Legal</option>
                  <option value="regulator">Regulator</option>
                  <option value="board">Board</option>
                  <option value="customer">Customer</option>
                </select>
              </div>
              <input placeholder="Reason for export"
                value={exportForm.reason} onChange={e => setExportForm(p => ({ ...p, reason: e.target.value }))}
                className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg px-3 py-2 text-xs text-white" />
              <button onClick={handleCreateExport} disabled={!exportForm.reason}
                className="px-4 py-2 bg-amber-500 text-black rounded-lg text-xs font-medium hover:bg-amber-400">
                Request Export
              </button>
            </div>
          )}

          {exports.length === 0 ? (
            <div className="bg-[#111] border border-[#222] rounded-xl p-8 text-center">
              <Share2 className="w-8 h-8 mx-auto mb-2 text-[#444]" />
              <p className="text-xs text-[#888]">No export packages created yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {exports.map((exp: any) => (
                <div key={exp.id} className="bg-[#111] border border-[#222] rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-amber-400" />
                      <span className="text-sm font-medium text-white">{exp.package_type.replace(/_/g, " ")}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                        exp.status === "ready" ? "text-emerald-400 bg-emerald-400/10" :
                        exp.status === "generating" ? "text-blue-400 bg-blue-400/10" :
                        exp.status === "approved" ? "text-green-400 bg-green-400/10" :
                        exp.status === "rejected" ? "text-red-400 bg-red-400/10" :
                        exp.status === "draft" ? "text-[#888] bg-[#0a0a0a]" :
                        "text-amber-400 bg-amber-400/10"
                      }`}>{exp.status}</span>
                    </div>
                    <span className="text-[10px] text-[#555]">{exp.format.toUpperCase()}</span>
                  </div>
                  <p className="text-xs text-[#888] mb-1">{exp.reason}</p>
                  <div className="flex items-center gap-3 text-[10px] text-[#555]">
                    <span>Redaction: {exp.redaction_profile}</span>
                    {exp.manifest && <span>Items: {exp.manifest.evidence_count || "—"}</span>}
                    {exp.hash && <span className="font-mono">#{exp.hash.substring(0, 16)}</span>}
                    <span>{fmt(exp.created_at)}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    {(exp.status === "draft" || exp.status === "approved") && (
                      <button onClick={() => handleGenerateExport(exp.id)} disabled={generatingId === exp.id}
                        className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded text-[10px] hover:bg-emerald-500/20 disabled:opacity-50">
                        {generatingId === exp.id ? "Generating..." : "Generate"}
                      </button>
                    )}
                    {exp.status === "pending_approval" && (
                      <button onClick={() => handleApproveExport(exp.id)}
                        className="px-3 py-1.5 bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded text-[10px] hover:bg-blue-500/20">
                        Approve
                      </button>
                    )}
                    {exp.status === "ready" && exp.hash && (
                      <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Package ready
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ======== GRAPH TAB (Phase 3) ======== */}
      {activeTab === "graph" && (
        <div className="bg-[#111] border border-[#222] rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-white">Entity Graph</h3>
            <button onClick={fetchGraph} disabled={graphLoading}
              className="px-3 py-1.5 bg-[#0a0a0a] border border-[#333] text-[#888] rounded text-[10px] hover:text-white flex items-center gap-1">
              <RefreshCw className={`w-3 h-3 ${graphLoading ? "animate-spin" : ""}`} /> Refresh
            </button>
          </div>

          {!graphData && !graphLoading && (
            <div className="text-center py-8">
              <GitBranch className="w-8 h-8 mx-auto mb-2 text-[#444]" />
              <p className="text-xs text-[#888]">Click Refresh to load the entity graph.</p>
            </div>
          )}

          {graphLoading && (
            <div className="text-center py-8">
              <RefreshCw className="w-8 h-8 mx-auto mb-2 text-[#444] animate-spin" />
              <p className="text-xs text-[#888]">Building entity graph...</p>
            </div>
          )}

          {graphData && !graphLoading && (
            <div className="space-y-4">
              <div className="flex gap-2 text-[10px] text-[#555]">
                <span>{graphData.nodes.length} nodes</span>
                <span>|</span>
                <span>{graphData.edges.length} edges</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Nodes by type */}
                <div className="bg-[#0a0a0a] border border-[#222] rounded-xl p-4">
                  <h4 className="text-xs font-medium text-white mb-3">Nodes by Type</h4>
                  {Object.entries(
                    graphData.nodes.reduce((acc: Record<string, number>, n: any) => {
                      acc[n.type] = (acc[n.type] || 0) + 1;
                      return acc;
                    }, {})
                  ).map(([type, count]) => (
                    <div key={type} className="flex justify-between text-xs py-1">
                      <span className="text-[#888]">{type}</span>
                      <span className="text-white font-mono">{count}</span>
                    </div>
                  ))}
                </div>

                {/* Node list */}
                <div className="bg-[#0a0a0a] border border-[#222] rounded-xl p-4 max-h-64 overflow-y-auto">
                  <h4 className="text-xs font-medium text-white mb-3">All Nodes</h4>
                  {graphData.nodes.map((node: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-xs py-1">
                      <span className={`w-2 h-2 rounded-full ${
                        node.type === "case" ? "bg-amber-400" :
                        node.type === "user" ? "bg-blue-400" :
                        node.type === "evidence" ? "bg-emerald-400" :
                        node.type === "audit_event" ? "bg-purple-400" :
                        "bg-[#555]"
                      }`} />
                      <span className="text-white flex-1 truncate">{node.label}</span>
                      <span className="text-[10px] text-[#555]">{node.type}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Edge list */}
              <div className="bg-[#0a0a0a] border border-[#222] rounded-xl p-4">
                <h4 className="text-xs font-medium text-white mb-3">Relationships ({graphData.edges.length})</h4>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {graphData.edges.map((edge: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-[11px]">
                      <span className="text-blue-400 truncate max-w-[120px]">{edge.from.substring(0, 16)}</span>
                      <span className="text-amber-400/60 text-[10px]">—{edge.relation}→</span>
                      <span className="text-emerald-400 truncate max-w-[120px]">{edge.to.substring(0, 16)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======== AI ASSIST TAB (Phase 4) ======== */}
      {activeTab === "ai" && (
        <div className="space-y-4">
          {/* AI Case Summary */}
          <div className="bg-gradient-to-r from-purple-500/5 to-transparent border border-purple-500/20 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" /> AI Case Summary
              </h3>
              <button onClick={handleGenerateSummary} disabled={generatingSummary}
                className="px-3 py-1.5 bg-purple-500/10 border border-purple-500/30 text-purple-400 rounded text-[10px] hover:bg-purple-500/20 disabled:opacity-50">
                {generatingSummary ? "Generating..." : "Generate Summary"}
              </button>
            </div>

            {aiSummaries.length === 0 ? (
              <p className="text-xs text-[#888]">No AI summaries generated yet. Summaries include evidence citations, timeline overview, and task status.</p>
            ) : (
              <div className="space-y-3">
                {aiSummaries.map((s: any) => (
                  <div key={s.id} className="bg-[#0a0a0a] border border-[#222] rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-medium text-white">{s.summary_type.replace(/_/g, " ")}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                          s.status === "approved" ? "bg-emerald-400/10 text-emerald-400" :
                          s.status === "rejected" ? "bg-red-400/10 text-red-400" :
                          "bg-amber-400/10 text-amber-400"
                        }`}>{s.status}</span>
                      </div>
                      <span className="text-[10px] text-[#555]">{fmt(s.created_at)}</span>
                    </div>
                    <pre className="text-xs text-[#aaa] whitespace-pre-wrap font-sans leading-relaxed">{s.content}</pre>
                    {s.citations && s.citations.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {s.citations.map((c: any, j: number) => (
                          <span key={j} className="text-[10px] px-1.5 py-0.5 bg-[#111] border border-[#222] rounded text-[#666]">
                            {c.type}:{c.id?.substring(0, 8)}
                          </span>
                        ))}
                      </div>
                    )}
                    {s.status === "draft" && (
                      <div className="flex gap-2 mt-3">
                        <button onClick={() => handleApproveSummary(s.id)}
                          className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded text-[10px] hover:bg-emerald-500/20">
                          Approve
                        </button>
                        <button onClick={() => handleRejectSummary(s.id)}
                          className="px-3 py-1 bg-red-500/10 border border-red-500/30 text-red-400 rounded text-[10px] hover:bg-red-500/20">
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Timeline Explanation */}
          <div className="bg-[#111] border border-[#222] rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-400" /> Timeline Explanation
              </h3>
              <button onClick={handleGenerateExplanation} disabled={generatingExplanation}
                className="px-3 py-1.5 bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded text-[10px] hover:bg-blue-500/20 disabled:opacity-50">
                {generatingExplanation ? "Generating..." : "Explain Timeline"}
              </button>
            </div>
            {timelineExplanation ? (
              <pre className="text-xs text-[#aaa] whitespace-pre-wrap font-sans leading-relaxed">{timelineExplanation}</pre>
            ) : (
              <p className="text-xs text-[#888]">Generate an AI explanation of the timeline sequence, highlighting gaps and actor activity.</p>
            )}
          </div>
        </div>
      )}

      {/* ======== CLOSE TAB ======== */}
      {activeTab === "close" && (
        <div className="bg-[#111] border border-[#222] rounded-xl p-6 space-y-4">
          <h3 className="text-sm font-medium text-white">Close Investigation Case</h3>
          {c.status === "closed" ? (
            <div className="text-center py-8">
              <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-emerald-400" />
              <p className="text-sm text-[#888]">This case is already closed.</p>
              <button onClick={handleReopen} className="mt-3 px-4 py-2 bg-orange-500/10 border border-orange-500/30 text-orange-400 rounded-lg text-xs hover:bg-orange-500/20">
                Reopen Case
              </button>
            </div>
          ) : (
            <>
              <select value={closeForm.outcome} onChange={e => setCloseForm(p => ({ ...p, outcome: e.target.value }))}
                className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg px-3 py-2 text-sm text-white">
                <option value="substantiated">Substantiated</option>
                <option value="unsubstantiated">Unsubstantiated</option>
                <option value="no_action">No Action Taken</option>
                <option value="duplicate">Duplicate</option>
                <option value="merged">Merged</option>
              </select>
              <textarea placeholder="Rationale (required)"
                value={closeForm.rationale} onChange={e => setCloseForm(p => ({ ...p, rationale: e.target.value }))}
                className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg px-3 py-2 text-sm text-white resize-none h-20" />
              <textarea placeholder="Findings"
                value={closeForm.findings} onChange={e => setCloseForm(p => ({ ...p, findings: e.target.value }))}
                className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg px-3 py-2 text-sm text-white resize-none h-20" />
              <button onClick={handleClose} disabled={!closeForm.outcome || !closeForm.rationale}
                className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-lg text-sm hover:bg-emerald-500/20 disabled:opacity-50">
                Close Case
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
