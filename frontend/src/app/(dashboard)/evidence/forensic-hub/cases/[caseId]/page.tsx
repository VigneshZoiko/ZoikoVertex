"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { ChevronLeft, AlertTriangle, Clock, Lock, X } from "lucide-react";
import ActorDisplay from "@/components/evidence/ActorDisplay";

interface ForensicCase {
  id: string;
  case_type: string;
  title: string;
  summary: string;
  severity: string;
  status: string;
  owner_user_id: string | null;
  legal_hold_active: boolean;
  sla_due_at: string | null;
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

function fmt(ts: string | null) {
  if (!ts) return "—";
  try { return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }); }
  catch { return "—"; }
}

export default function ForensicCaseDetailPage() {
  const params = useParams();
  const caseId = params.caseId as string;
  const router = useRouter();
  const [kase, setKase] = useState<ForensicCase | null>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showCloseForm, setShowCloseForm] = useState(false);
  const [closeForm, setCloseForm] = useState({ outcome: "", rationale: "" });
  const [showHoldForm, setShowHoldForm] = useState(false);
  const [holdReason, setHoldReason] = useState("");

  const handleClose = async () => {
    if (!closeForm.outcome || !closeForm.rationale) { setError("Outcome and rationale are required"); return; }
    try {
      const res = await api.post(`/api/forensic/cases/${caseId}/close`, closeForm);
      if (res.success) { setShowCloseForm(false); setCloseForm({ outcome: "", rationale: "" }); loadCase(); }
    } catch (e: any) { setError(e.message); }
  };

  const handleLegalHold = async () => {
    if (!holdReason) { setError("Reason is required to apply a legal hold"); return; }
    try {
      const res = await api.post(`/api/forensic/cases/${caseId}/legal-hold`, { reason: holdReason });
      if (res.success) { setShowHoldForm(false); setHoldReason(""); loadCase(); }
    } catch (e: any) { setError(e.message); }
  };

  const loadCase = useCallback(async () => {
    setLoading(true);
    try {
      const [caseRes, timelineRes, evidenceRes] = await Promise.all([
        api.get(`/api/forensic/cases/${caseId}`),
        api.get(`/api/forensic/cases/${caseId}/timeline`),
        api.get(`/api/forensic/cases/${caseId}/evidence`),
      ]);
      if (caseRes.success) setKase(caseRes.data);
      else setError(caseRes.error || "Not found");

      const items: any[] = [];
      if (timelineRes.success && timelineRes.data) {
        timelineRes.data.forEach((t: any) => items.push({ type: "timeline", ...t }));
      }
      if (evidenceRes.success && evidenceRes.data) {
        evidenceRes.data.forEach((e: any) => items.push({ type: "evidence", ...e }));
      }
      items.sort((a, b) => {
        const aTs = a.created_at || a.timestamp || "";
        const bTs = b.created_at || b.timestamp || "";
        return new Date(bTs).getTime() - new Date(aTs).getTime();
      });
      setActivities(items);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [caseId]);

  useEffect(() => { loadCase(); }, [loadCase]);

  if (loading) return <div className="max-w-4xl mx-auto px-4 py-8 text-center text-foreground-muted text-sm">Loading case…</div>;
  if (!kase) return <div className="max-w-4xl mx-auto px-4 py-8 text-center text-red-400 text-sm">Case not found</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 pb-24">
      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          <p className="text-xs text-red-400 flex-1">{error}</p>
          <button onClick={() => setError(null)}><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* Back */}
      <button onClick={() => router.push("/evidence/forensic-hub")}
        className="flex items-center gap-1 text-xs text-foreground-muted hover:text-foreground mb-4">
        <ChevronLeft className="w-3.5 h-3.5" /> Back to Investigations
      </button>

      {/* Case Info Card */}
      <div className="bg-surface border border-border rounded-xl p-5 mb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs border ${SEVERITY_STYLE[kase.severity] || ""}`}>
                <AlertTriangle className="w-3 h-3" /> {kase.severity}
              </span>
              <span className="text-xs px-2 py-0.5 bg-surface-hover border border-border rounded">{STATUS_LABEL[kase.status] || kase.status}</span>
              {kase.legal_hold_active && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-amber-500/10 border border-amber-500/20 text-amber-400">
                  <Lock className="w-3 h-3" /> Legal Hold Active
                </span>
              )}
            </div>
            <h1 className="text-lg font-bold text-foreground">{kase.title}</h1>
            <p className="text-xs text-foreground-muted mt-0.5">{TYPE_LABEL[kase.case_type] || kase.case_type}</p>
            {kase.summary && <p className="text-sm text-foreground-muted mt-2">{kase.summary}</p>}
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            {!kase.legal_hold_active && kase.status !== "closed" && (
              <button onClick={() => setShowHoldForm(true)}
                className="px-3 py-1.5 text-xs bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-lg hover:bg-amber-500/20 flex items-center gap-1">
                <Lock className="w-3 h-3" /> Apply Hold
              </button>
            )}
            {kase.status !== "closed" && (
              <button onClick={() => setShowCloseForm(true)}
                className="px-3 py-1.5 text-xs bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg hover:bg-red-500/20">
                Close Case
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-4 mt-4 pt-3 border-t border-border text-xs text-foreground-muted">
          <span className="flex items-center gap-1">Owner: {kase.owner_user_id ? <ActorDisplay id={kase.owner_user_id} size="sm" /> : "Unassigned"}</span>
          <span>Created: {fmt(kase.created_at)}</span>
          {kase.sla_due_at && (
            <span className={new Date(kase.sla_due_at) < new Date() && kase.status !== "closed" ? "text-red-400" : ""}>
              Due: {fmt(kase.sla_due_at)}{new Date(kase.sla_due_at) < new Date() && kase.status !== "closed" ? " (overdue)" : ""}
            </span>
          )}
        </div>
      </div>

      {/* Close Case Form */}
      {showCloseForm && (
        <div className="bg-surface border border-border rounded-xl p-4 mb-4 space-y-2.5">
          <h3 className="text-sm font-medium text-foreground">Close Investigation</h3>
          <select value={closeForm.outcome} onChange={e => setCloseForm(p => ({ ...p, outcome: e.target.value }))}
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground">
            <option value="">Outcome…</option>
            <option value="resolved">Resolved</option>
            <option value="unsubstantiated">Unsubstantiated</option>
            <option value="mitigated">Mitigated</option>
            <option value="referred">Referred</option>
            <option value="duplicate">Duplicate</option>
          </select>
          <textarea value={closeForm.rationale} onChange={e => setCloseForm(p => ({ ...p, rationale: e.target.value }))}
            placeholder="Why is this being closed?" rows={2}
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground" />
          <div className="flex gap-2">
            <button onClick={handleClose} className="px-3 py-1.5 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700">Close Case</button>
            <button onClick={() => setShowCloseForm(false)} className="px-3 py-1.5 text-xs text-foreground-muted hover:text-foreground">Cancel</button>
          </div>
        </div>
      )}

      {/* Legal Hold Form */}
      {showHoldForm && (
        <div className="bg-surface border border-border rounded-xl p-4 mb-4 space-y-2.5">
          <h3 className="text-sm font-medium text-foreground">Apply Legal Hold</h3>
          <textarea value={holdReason} onChange={e => setHoldReason(e.target.value)}
            placeholder="Why is a legal hold needed?" rows={2}
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground" />
          <div className="flex gap-2">
            <button onClick={handleLegalHold} className="px-3 py-1.5 text-xs bg-amber-600 text-white rounded-lg hover:bg-amber-700">Apply Hold</button>
            <button onClick={() => setShowHoldForm(false)} className="px-3 py-1.5 text-xs text-foreground-muted hover:text-foreground">Cancel</button>
          </div>
        </div>
      )}

      {/* Activity Feed */}
      <h3 className="text-xs font-medium text-foreground-muted mb-3">Activity</h3>
      {activities.length === 0 ? (
        <div className="py-8 text-center text-foreground-muted">
          <Clock className="w-6 h-6 mx-auto mb-2 opacity-30" />
          <p className="text-xs">No activity recorded yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {activities.map((item, i) => (
            <div key={i} className="bg-surface border border-border rounded-xl p-3 flex items-start gap-3">
              {item.type === "evidence" ? (
                <div className="w-5 h-5 rounded bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-[9px] text-blue-400 font-bold">E</span>
                </div>
              ) : (
                <div className="w-5 h-5 rounded bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0 mt-0.5">
                  <Clock className="w-3 h-3 text-amber-400" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                {item.type === "evidence" ? (
                  <>
                    <p className="text-xs font-medium text-foreground">Evidence attached</p>
                    <p className="text-[11px] text-foreground-muted mt-0.5">
                      {item.evidence_type || "Document"} · {fmt(item.created_at)}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-xs font-medium text-foreground">
                      {item.event_type || item.action || "Activity"}
                    </p>
                    {item.description && <p className="text-[11px] text-foreground-muted mt-0.5">{item.description}</p>}
                    <p className="text-[10px] text-foreground-muted mt-0.5">
                      {fmt(item.created_at || item.timestamp)}
                      {item.actor_id && <> · <ActorDisplay id={item.actor_id} size="sm" /></>}
                    </p>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
