"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ShieldCheck, RefreshCcw, AlertCircle, Clock,
  FileCheck2, AlertTriangle, ArrowRightLeft, MessageSquare, XCircle, CheckCircle2
} from "lucide-react";
import { api } from "@/lib/api";

interface Intent {
  id: string;
  content: string;
  platform: string;
  status: string;
  risk_level: string;
  risk_score: number;
  risk_factors: string[];
  feedback: string | null;
  created_at: string;
  media_url: string | null;
  creator: { full_name: string; email: string } | null;
}

export default function ValidationDeskPage() {
  const [intents, setIntents] = useState<Intent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIntent, setSelectedIntent] = useState<Intent | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchValidationQueue = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.get("/api/v1/approvals/queue");
      if (result.success) {
        // Filter only items pending validation
        const validationItems = (result.data || []).filter(
          (i: Intent) => i.status === "PENDING_VALIDATION"
        );
        setIntents(validationItems);
        if (validationItems.length > 0) {
          setSelectedIntent(validationItems[0]);
        } else {
          setSelectedIntent(null);
        }
      }
    } catch {
      setMessage({ type: "error", text: "Failed to load validation desk items." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchValidationQueue();
  }, [fetchValidationQueue]);

  const handleAction = async (intentId: string, action: string) => {
    setActionLoading(action);
    setMessage(null);
    try {
      const result = await api.post(`/api/v1/approvals/items/${intentId}/action`, {
        action,
        feedback: feedbackText || undefined
      });
      if (result.success) {
        setMessage({
          type: "success",
          text: action === "validate" ? "Content validated successfully." : "Content returned for revision."
        });
        setFeedbackText("");
        // Remove item from local state
        const remaining = intents.filter(i => i.id !== intentId);
        setIntents(remaining);
        setSelectedIntent(remaining[0] || null);
      }
    } catch {
      setMessage({ type: "error", text: `Failed to complete action: ${action}.` });
    } finally {
      setActionLoading(null);
    }
  };

  const getFaithfulnessBadge = (score: number) => {
    if (score >= 85) return { label: "Faithfulness Strong", style: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" };
    if (score >= 60) return { label: "Faithfulness Moderate", style: "bg-amber-500/10 text-amber-400 border-amber-500/20" };
    return { label: "Faithfulness Weak (Possible Hallucination)", style: "bg-rose-500/10 text-rose-400 border-rose-500/20" };
  };

  return (
    <div className="max-w-6xl mx-auto pb-16 px-4">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Validation Desk</h1>
          <p className="text-[#888] text-sm">Human-in-the-loop validation of AI accuracy, claims, and compliance safety</p>
        </div>
        <button
          onClick={fetchValidationQueue}
          className="p-2.5 bg-[var(--card)] border border-[var(--border)] rounded-xl text-[#888] hover:text-white hover:border-[var(--card-border)] transition-all group"
          title="Refresh Queue"
        >
          <RefreshCcw className={`w-4 h-4 ${loading ? "animate-spin text-indigo-400" : "group-hover:rotate-180 transition-transform duration-500"}`} />
        </button>
      </div>

      {/* Message Toast */}
      {message && (
        <div className={`mb-5 p-3.5 rounded-xl flex items-center gap-3 text-sm font-medium ${
          message.type === "success"
            ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
            : "bg-rose-500/10 border border-rose-500/20 text-rose-400"
        }`}>
          <AlertCircle className="w-4 h-4 shrink-0" />
          {message.text}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center py-24 text-[#666] gap-3">
          <div className="w-7 h-7 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm">Loading validation queue…</p>
        </div>
      ) : intents.length === 0 ? (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-16 text-center">
          <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-7 h-7 text-emerald-400" />
          </div>
          <p className="text-white font-semibold mb-1">Validation Queue is Empty</p>
          <p className="text-[#666] text-sm">All AI claims and high-risk items are validated.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left panel: list of items awaiting validation */}
          <div className="lg:col-span-4 space-y-3">
            <h2 className="text-xs font-semibold text-[#666] uppercase tracking-wider px-1">Awaiting Integrity Checks ({intents.length})</h2>
            <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
              {intents.map(intent => {
                const isSelected = selectedIntent?.id === intent.id;
                const faithfulness = getFaithfulnessBadge(100 - intent.risk_score);
                return (
                  <button
                    key={intent.id}
                    onClick={() => setSelectedIntent(intent)}
                    className={`w-full text-left p-4 rounded-xl border transition-all duration-200 flex flex-col ${
                      isSelected
                        ? "bg-[var(--card-hover)] border-indigo-500/40 shadow-lg shadow-indigo-500/5"
                        : "bg-[var(--card)] border-[var(--border)] hover:border-[var(--border-hover)]"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="px-1.5 py-0.5 bg-white/5 border border-white/10 rounded text-[9px] font-bold uppercase tracking-wider text-[#aaa]">
                        {intent.platform}
                      </span>
                      <span className="text-[10px] text-[#555] flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(intent.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs text-[#ccc] line-clamp-2 leading-relaxed mb-3 flex-1">
                      {intent.content}
                    </p>
                    <div className={`px-2 py-0.5 rounded border text-[9px] font-bold uppercase tracking-wider self-start ${faithfulness.style}`}>
                      {faithfulness.label}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right panel: validation workflow details */}
          {selectedIntent && (
            <div className="lg:col-span-8 bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 space-y-6">
              {/* Content Panel */}
              <div>
                <h3 className="text-xs font-semibold text-[#666] uppercase tracking-wider mb-3">Content Preview</h3>
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 min-h-[100px] text-sm text-[#ccc] leading-relaxed">
                  {selectedIntent.content}
                </div>
              </div>

              {/* Integrity Checklist */}
              <div>
                <h3 className="text-xs font-semibold text-[#666] uppercase tracking-wider mb-3">Integrity Checklist</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3 bg-white/2 border border-white/5 rounded-xl flex items-start gap-3">
                    <FileCheck2 className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-white">Citation Grounding</p>
                      <p className="text-[10px] text-[#666] mt-0.5">Claims verified against approved claims library</p>
                    </div>
                  </div>
                  <div className="p-3 bg-white/2 border border-white/5 rounded-xl flex items-start gap-3">
                    <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-white">Lexicon Check</p>
                      <p className="text-[10px] text-[#666] mt-0.5">Approved brand standard language matched</p>
                    </div>
                  </div>
                  <div className="p-3 bg-white/2 border border-white/5 rounded-xl flex items-start gap-3">
                    <ArrowRightLeft className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-white">Platform Layout Compliance</p>
                      <p className="text-[10px] text-[#666] mt-0.5">Size and characters within guidelines</p>
                    </div>
                  </div>
                  <div className="p-3 bg-white/2 border border-white/5 rounded-xl flex items-start gap-3">
                    <ShieldCheck className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-white">Identity Provenance</p>
                      <p className="text-[10px] text-[#666] mt-0.5">AI agent metadata verified and signed</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action area */}
              <div className="pt-4 border-t border-[var(--border)]/50 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#666] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5" /> Validation / Revision Feedback
                  </label>
                  <textarea
                    placeholder="Enter compliance justification or revision comments for the creator..."
                    value={feedbackText}
                    onChange={e => setFeedbackText(e.target.value)}
                    rows={3}
                    className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3.5 text-sm text-white placeholder-[#555] outline-none focus:border-indigo-500/50 resize-none"
                  />
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => handleAction(selectedIntent.id, "return_revision")}
                    disabled={actionLoading !== null}
                    className="flex items-center gap-2 px-5 py-2.5 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white border border-rose-500/20 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4" />
                    Request Revision
                  </button>
                  <button
                    onClick={() => handleAction(selectedIntent.id, "validate")}
                    disabled={actionLoading !== null}
                    className="flex items-center gap-2 px-5 py-2.5 bg-indigo-500 hover:bg-indigo-400 text-white border border-indigo-500/20 rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-500/15 disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Validate & Pass
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
