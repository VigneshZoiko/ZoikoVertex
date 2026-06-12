"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useRoles } from "@/lib/hooks/useRoles";
import {
  ShieldAlert,
  Clock,
  User,
  CheckCircle,
  XCircle,
  RefreshCw,
  AlertTriangle,
  FileText,
  Search,
  ArrowRight,
  ShieldCheck,
  Lock,
  MessageSquare,
  Cpu,
  Archive,
  Download,
  AlertOctagon,
  Eye,
  CornerDownRight
} from "lucide-react";

interface ReviewItem {
  id: string;
  priority: string;
  sla_due_at: string;
  item_type: string;
  brand: string;
  trigger_summary: string;
  agent_id: string;
  autonomy_band: string;
  owner: string;
  decision_state: string;
  author_id: string;
  content_preview?: string;
  risk_factors?: string[];
  jurisdictions?: string[];
  policy_match?: string;
  ai_recommendation?: string;
  provenance?: string[];
  evidence_hash?: string;
  first_approver_id?: string;
  workspace_id?: string;
}

export default function HumanReviewConsolePage() {
  const { hasRole, isLoading: rolesLoading } = useRoles();
  const currentUser = "USR-042"; // Mocked session user for dual-control evaluation

  
  const [queue, setQueue] = useState<ReviewItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<ReviewItem | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Decision Form State
  const [rationale, setRationale] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  
  // Downstream Preview logic
  const [hoveredAction, setHoveredAction] = useState<string | null>(null);

  const [now, setNow] = useState(Date.now);

  const fetchQueue = async () => {
    try {
      const res = await api.get("/api/safety/reviews");
      if (res.success) {
        setQueue(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDetail = async (id: string) => {
    try {
      const res = await api.get(`/api/safety/reviews/${id}`);
      if (res.success) {
        setSelectedItem(res.data);
        setRationale("");
        setActionError(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const safeFetch = () => {
      if (!cancelled && document.visibilityState === 'visible') {
        setNow(Date.now());
        fetchQueue();
      }
    };
    safeFetch();
    const interval = setInterval(safeFetch, 30000); // 30s auto-refresh
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  const handleDecision = async (decision: string) => {
    if (!selectedItem) return;
    
    // Rationale mandatory for everything except maybe allow? Requirements state: "required Rationale field for High and Critical decisions"
    // To be perfectly safe, enforce for all material actions here.
    if (!rationale || rationale.trim().length < 5) {
      setActionError("A detailed rationale is required to submit this decision.");
      return;
    }

    setSubmitting(true);
    setActionError(null);
    try {
      // Generate idempotency key for this attempt
      const idempotencyKey = `IDMP-${selectedItem.id}-${Date.now()}`;
      
      const res = await api.post(`/api/safety/reviews/${selectedItem.id}/decision`, {
        decision,
        rationale,
        idempotency_key: idempotencyKey
      });

      if (res.success) {
        setSelectedItem(null);
        setRationale("");
        fetchQueue();
      } else {
        setActionError(res.error);
      }
    } catch (err: any) {
      setActionError(err.message || "Failed to submit decision.");
    } finally {
      setSubmitting(false);
    }
  };

  const getSlaStatus = (dueAt: string) => {
    const due = new Date(dueAt).getTime();
    const diff = due - now;
    
    if (diff < 0) return { text: "BREACHED", color: "text-error-text bg-error-bg border-error-border animate-pulse" };
    if (diff < 30 * 60 * 1000) return { text: "AT RISK", color: "text-warning-text bg-warning-bg border-warning-border" }; // < 30 mins
    return { text: "ON TRACK", color: "text-success-text bg-success-bg border-success-border" };
  };

  const formatTimeDiff = (dueAt: string) => {
    const due = new Date(dueAt).getTime();
    const diff = Math.abs(due - now);
    
    const mins = Math.floor(diff / 60000);
    const hrs = Math.floor(mins / 60);
    if (hrs > 0) return `${hrs}h ${mins % 60}m`;
    return `${mins}m`;
  };

  const requiresDualControl = selectedItem?.priority === 'Critical' || selectedItem?.item_type === 'Regulated Claim' || selectedItem?.item_type === 'Crisis Response';
  const isFirstKeyTurned = !!selectedItem?.first_approver_id;
  const isConflictOfInterest = selectedItem?.author_id === currentUser;

  const getDownstreamPreview = () => {
    if (!hoveredAction) return "Hover over a decision to view deterministic downstream impact.";
    switch (hoveredAction) {
      case 'Approve':
        if (requiresDualControl && !isFirstKeyTurned) {
          return "EMITS: require_approval. Transits to 'Awaiting Second Approval'. Downstream remains paused.";
        }
        return "EMITS: allow. Triggers downstream.release_requested to production environments.";
      case 'Reject': return "EMITS: block. Triggers downstream.block_confirmed. Item is permanently halted.";
      case 'Request Changes': return "EMITS: hold_for_review. Notifies assignee to revise. Item remains locked.";
      case 'Escalate': return "EMITS: require_approval. SLA recalculated. Routes to next management tier.";
      case 'Quarantine': return "EMITS: quarantine. Item isolated in Evidence Vault. Forensic analysis engaged.";
      case 'Pause Agent': return "EMITS: emergency_pause_recommendation. Entire agent workflow halts immediately.";
      default: return "";
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-warning-border mb-4"></div>
        <p className="text-foreground-muted font-medium font-mono text-sm">Initializing Human-in-the-Loop Console...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex font-sans overflow-hidden h-screen selection:bg-warning-bg selection:text-white">
      
      {/* -------------------------------------------------------------
          LEFT PANEL: REVIEW QUEUE
          ------------------------------------------------------------- */}
      <div className="w-[450px] border-r border-border bg-surface flex flex-col h-full flex-shrink-0">
        <div className="p-4 border-b border-border bg-surface">
          <h2 className="text-lg font-black text-foreground flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-warning-text" />
            Active Review Queue
          </h2>
          <div className="flex items-center justify-between mt-3">
            <div className="relative flex-1 mr-3">
              <Search className="w-3.5 h-3.5 text-foreground-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Filter items..." 
                className="w-full bg-background border border-border focus:border-border rounded-lg pl-9 pr-4 py-1.5 text-xs text-foreground focus:outline-none"
              />
            </div>
            <button onClick={fetchQueue} className="p-2 bg-surface hover:bg-surface-hover border border-border rounded-lg text-foreground transition-colors">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
          {queue.length > 0 ? queue.map((item) => {
            const sla = getSlaStatus(item.sla_due_at);
            const isSelected = selectedItem?.id === item.id;
            
            return (
              <div 
                key={item.id} 
                onClick={() => fetchDetail(item.id)}
                className={`p-3 rounded-xl border transition-all cursor-pointer select-none group ${
                  isSelected 
                    ? "bg-surface border-warning-border shadow-[0_0_15px_rgba(245,158,11,0.1)]" 
                    : "bg-surface border-border hover:border-border"
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex gap-2">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${
                      item.priority === 'Critical' ? 'bg-error-bg text-error-text border-error-border' :
                      item.priority === 'High' ? 'bg-warning-bg text-warning-text border-warning-border' :
                      'bg-warning-bg text-warning-text border-warning-border'
                    }`}>
                      {item.priority}
                    </span>
                    {item.priority === 'Critical' && <span className="text-[10px] text-foreground-muted font-bold">📌 Pinned</span>}
                  </div>
                  <div className={`flex items-center gap-1 px-2 py-0.5 rounded border text-[9px] font-bold ${sla.color}`}>
                    <Clock className="w-3 h-3" />
                    {new Date(item.sla_due_at).getTime() < now ? '-' : ''}{formatTimeDiff(item.sla_due_at)}
                  </div>
                </div>

                <h4 className="text-xs font-bold text-foreground leading-tight mb-1">{item.brand} — {item.item_type}</h4>
                <p className="text-[10px] text-foreground-muted line-clamp-2 leading-relaxed mb-3">{item.trigger_summary}</p>

                <div className="flex justify-between items-center pt-2 border-t border-border">
                  <span className="text-[9px] font-mono text-foreground-muted">{item.id}</span>
                  <div className="flex gap-2">
                    {item.owner === 'Unassigned' ? (
                      <button className="px-2 py-1 bg-warning-bg text-warning-text hover:brightness-110 rounded border border-warning-border text-[9px] font-bold">
                        Assign Self
                      </button>
                    ) : (
                      <span className="text-[9px] text-foreground-muted bg-surface px-2 py-1 rounded">
                        <User className="w-2.5 h-2.5 inline mr-1" />{item.owner}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          }) : (
            <div className="text-center py-10 text-xs text-foreground-muted font-mono">No items in queue.</div>
          )}
        </div>
      </div>

      {/* -------------------------------------------------------------
          CENTER PANEL: DECISION CANVAS
          ------------------------------------------------------------- */}
      <div className="flex-1 bg-background flex flex-col h-full relative z-10 overflow-hidden">
        {selectedItem ? (
          <>
            <div className="p-6 border-b border-border bg-surface/80 backdrop-blur flex justify-between items-center">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono text-warning-text">Decision Canvas</span>
                  <span className="px-2 py-0.5 bg-surface text-foreground-muted text-[9px] font-bold rounded uppercase">{selectedItem.decision_state}</span>
                </div>
                <h1 className="text-2xl font-black text-foreground">{selectedItem.item_type} Review</h1>
              </div>
              {isConflictOfInterest && (
                <div className="px-4 py-2 bg-error-bg border border-error-border rounded-lg flex items-center gap-2">
                  <Lock className="w-4 h-4 text-error-text" />
                  <span className="text-xs font-bold text-error-text">Conflict of Interest: Self-Approval Disabled</span>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              
              {/* Content Preview */}
              <div className="bg-surface border border-border rounded-xl overflow-hidden">
                <div className="bg-surface px-4 py-3 border-b border-border flex justify-between items-center">
                  <span className="text-xs font-bold text-foreground-muted uppercase tracking-wider flex items-center gap-2">
                    <Eye className="w-4 h-4" /> Content / Action Preview
                  </span>
                  <span className="text-[10px] text-foreground-muted font-mono">Autonomy Band: {selectedItem.autonomy_band}</span>
                </div>
                <div className="p-6 text-sm text-foreground font-serif leading-relaxed italic border-l-4 border-warning-border bg-surface">
                  {"\u201C"}{selectedItem.content_preview}{"\u201D"}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                {/* Risk Summary */}
                <div className="bg-surface border border-border rounded-xl p-5">
                  <h3 className="text-xs font-bold text-foreground-muted uppercase tracking-wider mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-warning-text" /> Risk Summary
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center border-b border-border pb-2">
                      <span className="text-[11px] text-foreground-muted">Base Tier</span>
                      <span className="text-xs font-black text-error-text">{selectedItem.priority}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-border pb-2">
                      <span className="text-[11px] text-foreground-muted">Risk Factors</span>
                      <div className="flex flex-wrap gap-1 justify-end">
                        {selectedItem.risk_factors?.map(rf => (
                          <span key={rf} className="px-1.5 py-0.5 bg-surface text-foreground text-[9px] rounded font-medium">{rf}</span>
                        ))}
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] text-foreground-muted">Jurisdictions</span>
                      <div className="flex flex-wrap gap-1 justify-end">
                        {selectedItem.jurisdictions?.map(j => (
                          <span key={j} className="px-1.5 py-0.5 bg-info-bg text-info-text border border-info-border text-[9px] rounded font-medium">{j}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* AI Rec & Policy Trigger */}
                <div className="space-y-6">
                  <div className="bg-surface border border-border rounded-xl p-4 flex gap-3">
                    <Cpu className="w-5 h-5 text-info-text flex-shrink-0" />
                    <div>
                      <span className="text-[10px] font-bold text-foreground-muted uppercase block mb-1">AI Recommendation (Informational)</span>
                      <span className="text-sm font-black text-info-text uppercase tracking-wide">{selectedItem.ai_recommendation?.replace(/_/g, ' ')}</span>
                      <p className="text-[9px] text-foreground-muted mt-1 italic">AI recommendations do not pre-select decision buttons.</p>
                    </div>
                  </div>

                  <div className="bg-surface border border-error-border rounded-xl p-4">
                    <span className="text-[10px] font-bold text-error-text uppercase block mb-1 flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5" /> Policy Trigger Stack
                    </span>
                    <span className="text-xs text-foreground font-mono">{selectedItem.policy_match}</span>
                    <p className="text-[10px] text-foreground-muted mt-2 line-clamp-2">{selectedItem.trigger_summary}</p>
                  </div>
                </div>
              </div>

              {/* Action Area */}
              <div className="bg-surface border border-border rounded-2xl p-6 shadow-2xl relative">
                
                {requiresDualControl && (
                  <div className="absolute -top-3 left-6 px-3 py-1 bg-info-bg border border-info-border text-info-text text-[10px] font-black rounded uppercase tracking-wider flex items-center gap-1.5 backdrop-blur-md">
                    <Lock className="w-3 h-3" /> Dual-Control Validation Required
                  </div>
                )}

                <div className="mb-5">
                  <label className="block text-xs font-bold text-foreground-muted mb-2">Mandatory Rationale *</label>
                  <textarea 
                    value={rationale}
                    onChange={(e) => setRationale(e.target.value)}
                    placeholder="Provide explicit reasoning for the decision. This is immutable and visible in audits."
                    className="w-full h-24 bg-background border border-border focus:border-warning-border rounded-xl p-4 text-xs text-foreground placeholder-foreground-muted resize-none focus:outline-none focus:ring-warning-border"
                  />
                  {actionError && (
                    <div className="mt-2 text-[10px] text-error-text font-semibold flex items-center gap-1">
                      <AlertOctagon className="w-3 h-3" /> {actionError}
                    </div>
                  )}
                </div>

                {/* Downstream Impact Preview */}
                <div className="bg-background border border-border rounded-lg p-3 mb-6 min-h-[48px] flex items-center gap-2">
                  <CornerDownRight className="w-4 h-4 text-foreground-muted" />
                  <span className={`text-[10px] font-mono ${hoveredAction ? 'text-warning-text' : 'text-foreground-muted'}`}>
                    {getDownstreamPreview()}
                  </span>
                </div>

                {/* Decision Buttons */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <button 
                    onMouseEnter={() => setHoveredAction('Approve')} onMouseLeave={() => setHoveredAction(null)}
                    onClick={() => handleDecision('Approve')}
                    disabled={isConflictOfInterest || submitting}
                    className="py-3 px-4 bg-success-text hover:brightness-110 disabled:opacity-50 text-foreground text-xs font-black rounded-xl transition-all shadow-lg flex flex-col items-center justify-center gap-1"
                  >
                    <CheckCircle className="w-4 h-4" />
                    {requiresDualControl && !isFirstKeyTurned ? "Submit First Approval" : "Approve & Release"}
                  </button>
                  
                  <button 
                    onMouseEnter={() => setHoveredAction('Reject')} onMouseLeave={() => setHoveredAction(null)}
                    onClick={() => handleDecision('Reject')}
                    disabled={submitting}
                    className="py-3 px-4 bg-error-text hover:brightness-110 disabled:opacity-50 text-foreground text-xs font-black rounded-xl transition-all flex flex-col items-center justify-center gap-1"
                  >
                    <XCircle className="w-4 h-4" />
                    Reject & Block
                  </button>

                  <button 
                    onMouseEnter={() => setHoveredAction('Request Changes')} onMouseLeave={() => setHoveredAction(null)}
                    onClick={() => handleDecision('Request Changes')}
                    disabled={submitting}
                    className="py-3 px-4 bg-surface hover:bg-surface-hover border border-border text-foreground text-xs font-bold rounded-xl transition-all flex flex-col items-center justify-center gap-1"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Request Changes
                  </button>

                  <button 
                    onMouseEnter={() => setHoveredAction('Escalate')} onMouseLeave={() => setHoveredAction(null)}
                    onClick={() => handleDecision('Escalate')}
                    disabled={submitting}
                    className="py-3 px-4 bg-warning-text hover:brightness-110 text-foreground text-xs font-bold rounded-xl transition-all flex flex-col items-center justify-center gap-1"
                  >
                    <AlertTriangle className="w-4 h-4" />
                    Escalate
                  </button>
                </div>

                <div className="flex justify-center mt-4">
                   <button 
                    onMouseEnter={() => setHoveredAction('Quarantine')} onMouseLeave={() => setHoveredAction(null)}
                    onClick={() => handleDecision('Quarantine')}
                    className="text-[10px] text-foreground-muted hover:text-foreground transition-colors uppercase font-bold tracking-widest mr-4"
                  >
                    Quarantine
                  </button>
                  <button 
                    onMouseEnter={() => setHoveredAction('Pause Agent')} onMouseLeave={() => setHoveredAction(null)}
                    onClick={() => handleDecision('Pause Agent')}
                    className="text-[10px] text-error-text hover:text-error-text transition-colors uppercase font-bold tracking-widest"
                  >
                    Emergency Pause Agent
                  </button>
                </div>
              </div>

            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-foreground-muted">
            <ShieldCheck className="w-16 h-16 mb-4 opacity-20" />
            <p className="text-sm font-medium">Select an item from the queue to begin review.</p>
          </div>
        )}
      </div>

      {/* -------------------------------------------------------------
          RIGHT PANEL: EVIDENCE DRAWER
          ------------------------------------------------------------- */}
      <div className="w-[380px] border-l border-border bg-surface flex flex-col h-full flex-shrink-0 z-20 shadow-[-10px_0_30px_rgba(0,0,0,0.5)]">
        <div className="p-4 border-b border-border bg-surface flex justify-between items-center">
          <h2 className="text-sm font-black text-foreground flex items-center gap-2 uppercase tracking-widest">
            <Archive className="w-4 h-4 text-foreground-muted" />
            Evidence Drawer
          </h2>
        </div>

        {selectedItem ? (
          <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
            
            {/* Export Hash */}
            <div className="p-3 bg-info-bg border border-info-border rounded-xl flex items-start gap-3">
              <Download className="w-4 h-4 text-info-text mt-0.5" />
              <div>
                <span className="text-[10px] font-bold text-info-text block mb-0.5">Export Immutable Evidence</span>
                <span className="text-[9px] text-foreground-muted font-mono block break-all">{selectedItem.evidence_hash}</span>
              </div>
            </div>

            {/* Provenance */}
            <div>
              <h4 className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider mb-3">Provenance & Lineage</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-foreground-muted">Agent Identity</span>
                  <span className="text-foreground font-mono">{selectedItem.agent_id}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-foreground-muted">Source Workspace</span>
                  <span className="text-foreground font-mono">{selectedItem.workspace_id?.substring(0,8)}</span>
                </div>
                <div className="mt-3">
                  <span className="text-[10px] text-foreground-muted block mb-1">Execution Chain:</span>
                  <div className="flex gap-2 font-mono text-[9px] text-warning-text">
                    {selectedItem.provenance?.map((p, i) => (
                      <span key={i} className="px-1.5 py-0.5 bg-surface border border-border rounded">{p}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="h-px bg-surface w-full" />

            {/* Classification */}
            <div>
              <h4 className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider mb-3">Intake Classification</h4>
              <div className="bg-surface border border-border rounded-lg p-3 space-y-2">
                <div className="flex justify-between text-[10px]">
                  <span className="text-foreground-muted">Outcome Code</span>
                  <span className="text-success-text font-mono font-bold">hold_for_review</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-foreground-muted">Intake Confidence</span>
                  <span className="text-foreground">99.4%</span>
                </div>
              </div>
            </div>
            
            <div className="h-px bg-surface w-full" />

            {/* Prior Decisions */}
            <div>
              <h4 className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider mb-3">Prior Decisions (Context)</h4>
              <div className="space-y-2">
                <div className="p-2 border border-border rounded bg-surface text-[10px]">
                  <div className="flex justify-between mb-1">
                    <span className="text-error-text font-bold uppercase">Block</span>
                    <span className="text-foreground-muted">14d ago</span>
                  </div>
                  <p className="text-foreground-muted truncate">Same policy triggered by AGT-FIN-01.</p>
                </div>
              </div>
            </div>

          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-foreground-muted">
            <FileText className="w-10 h-10 mb-3 opacity-20" />
            <p className="text-xs">Context will populate automatically upon review selection.</p>
          </div>
        )}
      </div>

    </div>
  );
}
