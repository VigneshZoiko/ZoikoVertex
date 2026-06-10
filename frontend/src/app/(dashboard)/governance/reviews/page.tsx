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
    
    if (diff < 0) return { text: "BREACHED", color: "text-rose-500 bg-rose-500/10 border-rose-500/20 animate-pulse" };
    if (diff < 30 * 60 * 1000) return { text: "AT RISK", color: "text-orange-500 bg-orange-500/10 border-orange-500/20" }; // < 30 mins
    return { text: "ON TRACK", color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" };
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
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a0a0a] text-foreground">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500 mb-4"></div>
        <p className="text-[#888] font-medium font-mono text-sm">Initializing Human-in-the-Loop Console...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#ddd] flex font-sans overflow-hidden h-screen selection:bg-amber-500/30 selection:text-white">
      
      {/* -------------------------------------------------------------
          LEFT PANEL: REVIEW QUEUE
          ------------------------------------------------------------- */}
      <div className="w-[450px] border-r border-[#222] bg-[#111] flex flex-col h-full flex-shrink-0">
        <div className="p-4 border-b border-[#222] bg-[#141414]">
          <h2 className="text-lg font-black text-foreground flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-500" />
            Active Review Queue
          </h2>
          <div className="flex items-center justify-between mt-3">
            <div className="relative flex-1 mr-3">
              <Search className="w-3.5 h-3.5 text-[#666] absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Filter items..." 
                className="w-full bg-black border border-[#2d2d2d] focus:border-[#555] rounded-lg pl-9 pr-4 py-1.5 text-xs text-foreground focus:outline-none"
              />
            </div>
            <button onClick={fetchQueue} className="p-2 bg-[#222] hover:bg-[#333] border border-[#333] rounded-lg text-foreground transition-colors">
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
                    ? "bg-[#1a1a1a] border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.1)]" 
                    : "bg-[#141414] border-[#222] hover:border-[#444]"
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex gap-2">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${
                      item.priority === 'Critical' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                      item.priority === 'High' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                      'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    }`}>
                      {item.priority}
                    </span>
                    {item.priority === 'Critical' && <span className="text-[10px] text-[#666] font-bold">📌 Pinned</span>}
                  </div>
                  <div className={`flex items-center gap-1 px-2 py-0.5 rounded border text-[9px] font-bold ${sla.color}`}>
                    <Clock className="w-3 h-3" />
                    {new Date(item.sla_due_at).getTime() < now ? '-' : ''}{formatTimeDiff(item.sla_due_at)}
                  </div>
                </div>

                <h4 className="text-xs font-bold text-foreground leading-tight mb-1">{item.brand} — {item.item_type}</h4>
                <p className="text-[10px] text-[#888] line-clamp-2 leading-relaxed mb-3">{item.trigger_summary}</p>

                <div className="flex justify-between items-center pt-2 border-t border-[#222]">
                  <span className="text-[9px] font-mono text-[#666]">{item.id}</span>
                  <div className="flex gap-2">
                    {item.owner === 'Unassigned' ? (
                      <button className="px-2 py-1 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 rounded border border-amber-500/30 text-[9px] font-bold">
                        Assign Self
                      </button>
                    ) : (
                      <span className="text-[9px] text-[#888] bg-[#222] px-2 py-1 rounded">
                        <User className="w-2.5 h-2.5 inline mr-1" />{item.owner}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          }) : (
            <div className="text-center py-10 text-xs text-[#666] font-mono">No items in queue.</div>
          )}
        </div>
      </div>

      {/* -------------------------------------------------------------
          CENTER PANEL: DECISION CANVAS
          ------------------------------------------------------------- */}
      <div className="flex-1 bg-[#0a0a0a] flex flex-col h-full relative z-10 overflow-hidden">
        {selectedItem ? (
          <>
            <div className="p-6 border-b border-[#222] bg-[#111]/80 backdrop-blur flex justify-between items-center">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono text-amber-500">Decision Canvas</span>
                  <span className="px-2 py-0.5 bg-[#222] text-[#888] text-[9px] font-bold rounded uppercase">{selectedItem.decision_state}</span>
                </div>
                <h1 className="text-2xl font-black text-foreground">{selectedItem.item_type} Review</h1>
              </div>
              {isConflictOfInterest && (
                <div className="px-4 py-2 bg-rose-500/10 border border-rose-500/30 rounded-lg flex items-center gap-2">
                  <Lock className="w-4 h-4 text-rose-400" />
                  <span className="text-xs font-bold text-rose-400">Conflict of Interest: Self-Approval Disabled</span>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              
              {/* Content Preview */}
              <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden">
                <div className="bg-[#141414] px-4 py-3 border-b border-[#222] flex justify-between items-center">
                  <span className="text-xs font-bold text-[#888] uppercase tracking-wider flex items-center gap-2">
                    <Eye className="w-4 h-4" /> Content / Action Preview
                  </span>
                  <span className="text-[10px] text-[#666] font-mono">Autonomy Band: {selectedItem.autonomy_band}</span>
                </div>
                <div className="p-6 text-sm text-foreground font-serif leading-relaxed italic border-l-4 border-amber-500/50 bg-[#151515]">
                  {"\u201C"}{selectedItem.content_preview}{"\u201D"}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                {/* Risk Summary */}
                <div className="bg-[#111] border border-[#222] rounded-xl p-5">
                  <h3 className="text-xs font-bold text-[#888] uppercase tracking-wider mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-orange-500" /> Risk Summary
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center border-b border-[#222] pb-2">
                      <span className="text-[11px] text-[#666]">Base Tier</span>
                      <span className="text-xs font-black text-rose-400">{selectedItem.priority}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-[#222] pb-2">
                      <span className="text-[11px] text-[#666]">Risk Factors</span>
                      <div className="flex flex-wrap gap-1 justify-end">
                        {selectedItem.risk_factors?.map(rf => (
                          <span key={rf} className="px-1.5 py-0.5 bg-[#222] text-[#ddd] text-[9px] rounded font-medium">{rf}</span>
                        ))}
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] text-[#666]">Jurisdictions</span>
                      <div className="flex flex-wrap gap-1 justify-end">
                        {selectedItem.jurisdictions?.map(j => (
                          <span key={j} className="px-1.5 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[9px] rounded font-medium">{j}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* AI Rec & Policy Trigger */}
                <div className="space-y-6">
                  <div className="bg-[#141414] border border-[#222] rounded-xl p-4 flex gap-3">
                    <Cpu className="w-5 h-5 text-purple-500 flex-shrink-0" />
                    <div>
                      <span className="text-[10px] font-bold text-[#888] uppercase block mb-1">AI Recommendation (Informational)</span>
                      <span className="text-sm font-black text-purple-400 uppercase tracking-wide">{selectedItem.ai_recommendation?.replace(/_/g, ' ')}</span>
                      <p className="text-[9px] text-[#666] mt-1 italic">AI recommendations do not pre-select decision buttons.</p>
                    </div>
                  </div>

                  <div className="bg-[#111] border border-rose-500/20 rounded-xl p-4">
                    <span className="text-[10px] font-bold text-rose-400 uppercase block mb-1 flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5" /> Policy Trigger Stack
                    </span>
                    <span className="text-xs text-foreground font-mono">{selectedItem.policy_match}</span>
                    <p className="text-[10px] text-[#888] mt-2 line-clamp-2">{selectedItem.trigger_summary}</p>
                  </div>
                </div>
              </div>

              {/* Action Area */}
              <div className="bg-[#111] border border-[#333] rounded-2xl p-6 shadow-2xl relative">
                
                {requiresDualControl && (
                  <div className="absolute -top-3 left-6 px-3 py-1 bg-indigo-500/20 border border-indigo-500/50 text-indigo-400 text-[10px] font-black rounded uppercase tracking-wider flex items-center gap-1.5 backdrop-blur-md">
                    <Lock className="w-3 h-3" /> Dual-Control Validation Required
                  </div>
                )}

                <div className="mb-5">
                  <label className="block text-xs font-bold text-[#888] mb-2">Mandatory Rationale *</label>
                  <textarea 
                    value={rationale}
                    onChange={(e) => setRationale(e.target.value)}
                    placeholder="Provide explicit reasoning for the decision. This is immutable and visible in audits."
                    className="w-full h-24 bg-[#050505] border border-[#333] focus:border-amber-500/50 rounded-xl p-4 text-xs text-foreground placeholder-[#555] resize-none focus:outline-none focus:ring-1 focus:ring-amber-500/50"
                  />
                  {actionError && (
                    <div className="mt-2 text-[10px] text-rose-400 font-semibold flex items-center gap-1">
                      <AlertOctagon className="w-3 h-3" /> {actionError}
                    </div>
                  )}
                </div>

                {/* Downstream Impact Preview */}
                <div className="bg-[#050505] border border-[#222] rounded-lg p-3 mb-6 min-h-[48px] flex items-center gap-2">
                  <CornerDownRight className="w-4 h-4 text-[#555]" />
                  <span className={`text-[10px] font-mono ${hoveredAction ? 'text-amber-400' : 'text-[#666]'}`}>
                    {getDownstreamPreview()}
                  </span>
                </div>

                {/* Decision Buttons */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <button 
                    onMouseEnter={() => setHoveredAction('Approve')} onMouseLeave={() => setHoveredAction(null)}
                    onClick={() => handleDecision('Approve')}
                    disabled={isConflictOfInterest || submitting}
                    className="py-3 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-foreground text-xs font-black rounded-xl transition-all shadow-lg flex flex-col items-center justify-center gap-1"
                  >
                    <CheckCircle className="w-4 h-4" />
                    {requiresDualControl && !isFirstKeyTurned ? "Submit First Approval" : "Approve & Release"}
                  </button>
                  
                  <button 
                    onMouseEnter={() => setHoveredAction('Reject')} onMouseLeave={() => setHoveredAction(null)}
                    onClick={() => handleDecision('Reject')}
                    disabled={submitting}
                    className="py-3 px-4 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-foreground text-xs font-black rounded-xl transition-all flex flex-col items-center justify-center gap-1"
                  >
                    <XCircle className="w-4 h-4" />
                    Reject & Block
                  </button>

                  <button 
                    onMouseEnter={() => setHoveredAction('Request Changes')} onMouseLeave={() => setHoveredAction(null)}
                    onClick={() => handleDecision('Request Changes')}
                    disabled={submitting}
                    className="py-3 px-4 bg-[#222] hover:bg-[#333] border border-[#444] text-foreground text-xs font-bold rounded-xl transition-all flex flex-col items-center justify-center gap-1"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Request Changes
                  </button>

                  <button 
                    onMouseEnter={() => setHoveredAction('Escalate')} onMouseLeave={() => setHoveredAction(null)}
                    onClick={() => handleDecision('Escalate')}
                    disabled={submitting}
                    className="py-3 px-4 bg-orange-600 hover:bg-orange-700 text-foreground text-xs font-bold rounded-xl transition-all flex flex-col items-center justify-center gap-1"
                  >
                    <AlertTriangle className="w-4 h-4" />
                    Escalate
                  </button>
                </div>

                <div className="flex justify-center mt-4">
                   <button 
                    onMouseEnter={() => setHoveredAction('Quarantine')} onMouseLeave={() => setHoveredAction(null)}
                    onClick={() => handleDecision('Quarantine')}
                    className="text-[10px] text-[#666] hover:text-white transition-colors uppercase font-bold tracking-widest mr-4"
                  >
                    Quarantine
                  </button>
                  <button 
                    onMouseEnter={() => setHoveredAction('Pause Agent')} onMouseLeave={() => setHoveredAction(null)}
                    onClick={() => handleDecision('Pause Agent')}
                    className="text-[10px] text-rose-500 hover:text-rose-400 transition-colors uppercase font-bold tracking-widest"
                  >
                    Emergency Pause Agent
                  </button>
                </div>
              </div>

            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-[#555]">
            <ShieldCheck className="w-16 h-16 mb-4 opacity-20" />
            <p className="text-sm font-medium">Select an item from the queue to begin review.</p>
          </div>
        )}
      </div>

      {/* -------------------------------------------------------------
          RIGHT PANEL: EVIDENCE DRAWER
          ------------------------------------------------------------- */}
      <div className="w-[380px] border-l border-[#222] bg-[#111] flex flex-col h-full flex-shrink-0 z-20 shadow-[-10px_0_30px_rgba(0,0,0,0.5)]">
        <div className="p-4 border-b border-[#222] bg-[#141414] flex justify-between items-center">
          <h2 className="text-sm font-black text-foreground flex items-center gap-2 uppercase tracking-widest">
            <Archive className="w-4 h-4 text-[#888]" />
            Evidence Drawer
          </h2>
        </div>

        {selectedItem ? (
          <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
            
            {/* Export Hash */}
            <div className="p-3 bg-blue-500/5 border border-blue-500/20 rounded-xl flex items-start gap-3">
              <Download className="w-4 h-4 text-blue-400 mt-0.5" />
              <div>
                <span className="text-[10px] font-bold text-blue-400 block mb-0.5">Export Immutable Evidence</span>
                <span className="text-[9px] text-[#666] font-mono block break-all">{selectedItem.evidence_hash}</span>
              </div>
            </div>

            {/* Provenance */}
            <div>
              <h4 className="text-[10px] font-bold text-[#888] uppercase tracking-wider mb-3">Provenance & Lineage</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-[#666]">Agent Identity</span>
                  <span className="text-foreground font-mono">{selectedItem.agent_id}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[#666]">Source Workspace</span>
                  <span className="text-foreground font-mono">{selectedItem.workspace_id?.substring(0,8)}</span>
                </div>
                <div className="mt-3">
                  <span className="text-[10px] text-[#666] block mb-1">Execution Chain:</span>
                  <div className="flex gap-2 font-mono text-[9px] text-amber-500">
                    {selectedItem.provenance?.map((p, i) => (
                      <span key={i} className="px-1.5 py-0.5 bg-[#222] border border-[#333] rounded">{p}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="h-px bg-[#222] w-full" />

            {/* Classification */}
            <div>
              <h4 className="text-[10px] font-bold text-[#888] uppercase tracking-wider mb-3">Intake Classification</h4>
              <div className="bg-[#141414] border border-[#222] rounded-lg p-3 space-y-2">
                <div className="flex justify-between text-[10px]">
                  <span className="text-[#666]">Outcome Code</span>
                  <span className="text-emerald-400 font-mono font-bold">hold_for_review</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-[#666]">Intake Confidence</span>
                  <span className="text-foreground">99.4%</span>
                </div>
              </div>
            </div>
            
            <div className="h-px bg-[#222] w-full" />

            {/* Prior Decisions */}
            <div>
              <h4 className="text-[10px] font-bold text-[#888] uppercase tracking-wider mb-3">Prior Decisions (Context)</h4>
              <div className="space-y-2">
                <div className="p-2 border border-[#333] rounded bg-[#1a1a1a] text-[10px]">
                  <div className="flex justify-between mb-1">
                    <span className="text-rose-400 font-bold uppercase">Block</span>
                    <span className="text-[#666]">14d ago</span>
                  </div>
                  <p className="text-[#888] truncate">Same policy triggered by AGT-FIN-01.</p>
                </div>
              </div>
            </div>

          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-[#555]">
            <FileText className="w-10 h-10 mb-3 opacity-20" />
            <p className="text-xs">Context will populate automatically upon review selection.</p>
          </div>
        )}
      </div>

    </div>
  );
}
