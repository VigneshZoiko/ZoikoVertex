"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import {
  ShieldAlert,
  Activity,
  AlertOctagon,
  RefreshCw,
  Power,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  Layers,
} from "lucide-react";

interface SlaExposure {
  breached: number;
  at_risk: number;
  on_track: number;
}

interface SafetyRuleHitSummary {
  rule_name: string;
  severity: string;
  count: number;
  trend: "up" | "down" | "stable";
  impacted_scope: string;
}

interface SafetyComponentHealth {
  name: string;
  health: "healthy" | "watch" | "degraded" | "critical" | "unknown";
  backlog: number;
  owner: string;
}

interface SafetyDecisionSummary {
  decision_id: string;
  content: string;
  platform: string;
  status: string;
  risk_level: string;
  risk_score: number;
  created_at: string;
}

interface SafetyOverviewDTO {
  tenant_id: string;
  workspace_id: string | null;
  evaluated_at: string;
  active_mode: "normal" | "elevated_watch" | "restricted_operations" | "emergency_pause";
  posture_score: number;
  posture_status: "healthy" | "watch" | "degraded" | "critical";
  critical_holds_count: number;
  high_risk_queue_count: number;
  approval_required_count: number;
  quarantined_count: number;
  agent_safety_health: "healthy" | "watch" | "degraded" | "critical";
  sla_exposure: SlaExposure;
  top_rule_hits: SafetyRuleHitSummary[];
  component_health: SafetyComponentHealth[];
  recent_material_decisions: SafetyDecisionSummary[];
  evidence_chain_health: "verified" | "warning" | "degraded" | "unavailable";
  api_status: "healthy" | "degraded";
}

export default function SafetyOverviewPage() {
  // State
  const [data, setData] = useState<SafetyOverviewDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState<string | null>(null);
  
  // Emergency Pause Modal State
  const [isPauseModalOpen, setIsPauseModalOpen] = useState(false);
  const [pauseReason, setPauseReason] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [mfaSent, setMfaSent] = useState(false);
  const [sendingMfa, setSendingMfa] = useState(false);
  const [submittingPause, setSubmittingPause] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  // Fetch Overview Data
  const fetchOverview = async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) setIsRefreshing(true);
    try {
      const res = await api.get("/api/safety/overview");
      if (res.success && res.data) {
        setData(res.data);
        setErrorState(null);
      } else {
        setErrorState("Could not fetch overview metrics. Invalid API response.");
      }
    } catch (err) {
      console.error(err);
      setErrorState("Safety API connection failed. Defaulting to hold-for-review.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const safeFetch = () => { if (!cancelled && document.visibilityState === 'visible') fetchOverview(); };
    safeFetch();
    const interval = setInterval(safeFetch, 60000); // 60s auto-refresh
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  // Send MFA Challenge
  const handleSendMfaCode = async () => {
    setSendingMfa(true);
    setModalError(null);
    try {
      const res = await api.post("/api/safety/actions/send-mfa-challenge", {});
      if (res.success) {
        setMfaSent(true);
      } else {
        setModalError(res.error || "Failed to send MFA code.");
      }
    } catch (err: any) {
      setModalError(err.message || "Failed to send MFA code.");
    } finally {
      setSendingMfa(false);
    }
  };

  // Trigger Emergency Pause Submit
  const handleEmergencyPauseSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setModalError(null);
    if (!pauseReason || pauseReason.trim().length < 10) {
      setModalError("Please provide a justification reason (minimum 10 characters).");
      return;
    }

    setSubmittingPause(true);
    try {
      const isCurrentlyPaused = data?.active_mode === "emergency_pause";
      const res = await api.post("/api/safety/actions/request-emergency-pause", {
        state: isCurrentlyPaused ? "inactive" : "active",
        reason: pauseReason,
        mfa_code: mfaCode,
        scope: "WORKSPACE"
      });

      if (res.success) {
        setIsPauseModalOpen(false);
        setPauseReason("");
        setMfaCode("");
        setMfaSent(false);
        fetchOverview();
      } else {
        setModalError(res.error || "Emergency action failed.");
      }
    } catch (err: any) {
      setModalError(err.message || "Failed to submit emergency control.");
    } finally {
      setSubmittingPause(false);
    }
  };

  // Start Critical Review session
  const handleReviewCriticalQueue = async () => {
    try {
      const res = await api.post("/api/safety/actions/review-critical-queue", {});
      if (res.success) {
        setInfoMessage("Review session initiated. Action logged to audit trail.");
        setTimeout(() => setInfoMessage(null), 5000);
      }
    } catch (err) {
      setInfoMessage("Review session initiation failed.");
      setTimeout(() => setInfoMessage(null), 5000);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-warning-text mb-4"></div>
        <p className="text-foreground-muted font-medium tracking-wide">Assembling safety telemetry...</p>
      </div>
    );
  }

  const isDegraded = data?.api_status === "degraded" || !!errorState;
  const isEmergencyPaused = data?.active_mode === "emergency_pause";

  // Posture Colors helper
  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy":
      case "verified":
        return "text-success-text border-success-border bg-success-bg";
      case "watch":
      case "warning":
        return "text-warning-text border-warning-border bg-warning-bg";
      case "degraded":
        return "text-warning-text border-warning-border bg-warning-bg";
      case "critical":
      case "unavailable":
        return "text-error-text border-error-border bg-error-bg";
      default:
        return "text-neutral-400 border-neutral-800 bg-surface";
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 font-sans selection:bg-warning-bg selection:text-white">
      {/* Global Safety Bar */}
      <div className="bg-surface border-b border-border sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono px-2 py-0.5 bg-surface border border-border rounded text-foreground-muted">
              Tenant: <span className="text-foreground font-bold">{data?.tenant_id}</span>
            </span>
            <span className="text-xs font-mono px-2 py-0.5 bg-surface border border-border rounded text-foreground-muted">
              Workspace: <span className="text-foreground font-bold">{data?.workspace_id?.substring(0, 8)}</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-foreground-muted">Posture:</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full border font-black uppercase ${getStatusColor(data?.posture_status || "healthy")}`}>
                {data?.posture_status}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-foreground-muted">Mode:</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full border font-black uppercase ${
                isEmergencyPaused 
                  ? "text-error-text border-error-border bg-error-bg animate-pulse" 
                  : data?.active_mode === "restricted_operations" 
                  ? "text-warning-text border-warning-border bg-warning-bg" 
                  : "text-success-text border-success-border bg-success-bg"
              }`}>
                {data?.active_mode?.replace("_", " ")}
              </span>
            </div>
            <button onClick={handleReviewCriticalQueue} className="text-[10px] font-bold text-warning-text bg-warning-bg hover:brightness-110 border border-warning-border px-2.5 py-1 rounded">
              Holds: {data?.critical_holds_count ?? 0}
            </button>
            <button onClick={() => setIsPauseModalOpen(true)}
              className={`text-[10px] font-bold px-2.5 py-1 rounded flex items-center gap-1.5 ${
                isEmergencyPaused ? "bg-success-text hover:brightness-110 text-white" : "bg-error-text hover:brightness-110 text-white"
              }`}>
              <Power className="w-3 h-3" />
              {isEmergencyPaused ? "Resume" : "Pause"}
            </button>
          </div>
        </div>
      </div>

      {infoMessage && (
        <div className="bg-success-bg border-b border-success-border text-success-text py-1.5 px-4 text-center text-xs font-semibold flex items-center justify-center gap-1">
          <CheckCircle className="w-3 h-3" />
          <span>{infoMessage}</span>
        </div>
      )}

      {isDegraded && (
        <div className="bg-error-bg border-b border-error-border text-error-text py-1.5 px-4 text-center text-xs font-semibold flex items-center justify-center gap-1 animate-pulse">
          <AlertOctagon className="w-3 h-3" />
           <span>SAFETY LAYER DEGRADED — All operations locked. Fail-closed mode.</span>
        </div>
      )}

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-5 space-y-5">
        
        {/* Header Strip with Page Title, Action Buttons and Simulation Toggle */}
        <div className="flex items-center justify-between gap-4 border-b border-border pb-4">
          <div className="flex items-center gap-2.5">
            <Layers className="w-6 h-6 text-warning-text" />
            <h1 className="text-xl font-extrabold text-foreground">Safety Layer Overview</h1>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => fetchOverview(true)} className="p-2 bg-surface hover:bg-surface-hover border border-border rounded-lg" aria-label="Refresh">
              <RefreshCw className={`w-4 h-4 text-foreground ${isRefreshing ? "animate-spin" : ""}`} />
            </button>
            <button onClick={handleReviewCriticalQueue} className="px-4 py-2 bg-warning-text hover:brightness-110 text-black font-extrabold rounded-lg text-xs">
              Review Critical Queue
            </button>
          </div>
        </div>

        {/* Posture Cards Grid */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-surface border border-border rounded-xl p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-bold text-foreground-muted uppercase tracking-wider">Posture</p>
              <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${getStatusColor(data?.posture_status || "healthy")}`}>
                {data?.posture_status}
              </span>
            </div>
            <h3 className="text-3xl font-black text-foreground mt-2">{data?.posture_score}%</h3>
            <div className="w-full bg-surface h-2 rounded-full mt-2 overflow-hidden">
              <div className={`h-full rounded-full ${(data?.posture_score || 0) > 85 ? "bg-success-text" : (data?.posture_score || 0) > 60 ? "bg-warning-text" : "bg-error-text"}`}
                style={{ width: `${data?.posture_score || 0}%` }} />
            </div>
          </div>

          <div className="bg-surface border border-border rounded-xl p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-bold text-foreground-muted uppercase tracking-wider">Critical Holds</p>
              <ShieldAlert className="w-4 h-4 text-foreground-muted" />
            </div>
            <h3 className={`text-3xl font-black mt-2 ${data?.critical_holds_count && data.critical_holds_count > 0 ? "text-error-text" : "text-foreground"}`}>
              {data?.critical_holds_count || 0}
            </h3>
          </div>

          <div className="bg-surface border border-border rounded-xl p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-bold text-foreground-muted uppercase tracking-wider">Agent Health</p>
              <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${getStatusColor(data?.agent_safety_health || "healthy")}`}>
                {data?.agent_safety_health}
              </span>
            </div>
            <h3 className="text-3xl font-black text-foreground mt-2 capitalize">{data?.agent_safety_health || "healthy"}</h3>
          </div>
        </div>

        {/* Middle Section: Live Safety Queue Summary */}
        <div className="space-y-3">
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-warning-text" />
            Live Safety Queue
          </h2>

          <div className="bg-surface border border-border rounded-xl flex flex-col h-[360px] overflow-hidden">
            <div className="p-3 border-b border-border flex justify-between items-center">
              <span className="text-xs font-bold text-foreground">Telemetry Stream</span>
              <span className="text-[10px] text-foreground-muted">Sorted by criticality & recency</span>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {data?.recent_material_decisions && data.recent_material_decisions.length > 0 ? (
                  data.recent_material_decisions.map((decision) => (
                    <div 
                      key={decision.decision_id} 
                      className="bg-surface border border-border rounded-lg p-3 space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${
                          decision.risk_level === 'CRITICAL' ? 'bg-error-bg text-error-text border border-error-border' : 'bg-warning-bg text-warning-text border border-warning-border'
                        }`}>
                          {decision.risk_level}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] text-foreground-muted font-bold">Score: {decision.risk_score}</span>
                          <span className={`w-2 h-2 rounded-full ${decision.status === 'GOVERNANCE_BLOCKED' ? 'bg-error-text animate-pulse' : 'bg-warning-text'}`} />
                        </div>
                      </div>
                      <p className="text-xs text-foreground line-clamp-1">{decision.content}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] text-foreground-muted">{new Date(decision.created_at).toLocaleTimeString()}</span>
                        <span className="text-[9px] text-foreground-muted font-mono">{decision.platform}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-10 text-xs text-foreground-muted font-mono">
                    No material holds active. Workspace operations stable.
                  </div>
                )}
              </div>
            </div>
        </div>

        {/* Bottom Widget: Top Rule Hits */}
        <div>
          <div className="bg-surface border border-border rounded-xl p-4">
            <h3 className="text-base font-bold text-foreground mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4 text-warning-text" />
              Top Rule Hits
            </h3>
            <div className="space-y-2">
              {data?.top_rule_hits.map((rule) => (
                <div key={rule.rule_name} className="flex items-center justify-between p-2.5 bg-surface border border-border rounded-lg">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-foreground">{rule.rule_name}</h4>
                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase ${
                      rule.severity === 'CRITICAL' ? 'bg-error-bg text-error-text' : 'bg-warning-bg text-warning-text'
                    }`}>
                      {rule.severity}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-foreground">{rule.count}</span>
                    <span className="flex items-center justify-center w-5 h-5 rounded bg-surface">
                      {rule.trend === 'up' ? (
                        <TrendingUp className="w-3 h-3 text-error-text" />
                      ) : rule.trend === 'down' ? (
                        <TrendingDown className="w-3 h-3 text-success-text" />
                      ) : (
                        <Minus className="w-3 h-3 text-neutral-400" />
                      )}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>


        </div>

      </div>

      {/* Footer Strip */}
      <footer className="mt-12 border-t border-border bg-background py-4 text-xs text-foreground-muted">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap items-center gap-4 font-mono">
          <span>Last Evaluated: <strong className="text-foreground-muted">{data?.evaluated_at ? new Date(data.evaluated_at).toLocaleTimeString() : "Pending"}</strong></span>
          <span>Evidence Chain: <strong className={data?.evidence_chain_health === "verified" ? "text-success-text" : "text-error-text"}>{data?.evidence_chain_health?.toUpperCase()}</strong></span>
        </div>
      </footer>

      {/* Emergency Pause / Resume MFA Modal */}
      {isPauseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/85 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="bg-surface border border-border w-full max-w-md rounded-2xl p-6 shadow-2xl relative">
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Power className="w-5 h-5 text-error-text" />
              {isEmergencyPaused ? "Deactivate Emergency Pause" : "Request Emergency Pause"}
            </h3>
            
            <p className="text-foreground-muted text-xs mt-2 leading-relaxed">
              {isEmergencyPaused 
                ? "Resuming workspace publishing requires explicit justification and token re-verification."
                : "You are initiating a global pause. This will halt all scheduled content publishing and agent operations immediately."}
            </p>

            <form onSubmit={handleEmergencyPauseSubmit} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs text-foreground-muted font-bold mb-1.5">Justification Reason *</label>
                <textarea
                  value={pauseReason}
                  onChange={(e) => setPauseReason(e.target.value)}
                  placeholder="Describe why this change is being requested (minimum 10 characters)..."
                  className="w-full h-24 bg-background border border-border focus:border-border rounded-xl p-3 text-xs text-foreground placeholder-foreground-muted focus:outline-none resize-none"
                  required
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs text-foreground-muted font-bold">MFA Verification Code *</label>
                  {mfaSent && (
                    <span className="text-[9px] text-success-text">Code sent to your email</span>
                  )}
                </div>
                {!mfaSent ? (
                  <button
                    type="button"
                    onClick={handleSendMfaCode}
                    disabled={sendingMfa}
                    className="w-full bg-warning-text hover:brightness-110 disabled:bg-neutral-700 text-foreground font-bold rounded-xl px-4 py-2.5 text-xs transition-colors"
                  >
                    {sendingMfa ? "Sending..." : "Send MFA Code to Email"}
                  </button>
                ) : (
                  <input
                    type="text"
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value)}
                    placeholder="Enter 6-digit code"
                    maxLength={6}
                    className="w-full bg-background border border-border focus:border-border rounded-xl px-4 py-2.5 text-sm text-center text-foreground tracking-widest focus:outline-none"
                    required
                  />
                )}
              </div>

              {modalError && (
                <div className="p-3 bg-error-bg border border-error-border text-error-text rounded-xl text-xs font-semibold flex items-center gap-2">
                  <AlertOctagon className="w-4 h-4" />
                  <span>{modalError}</span>
                </div>
              )}

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsPauseModalOpen(false);
                    setModalError(null);
                    setMfaSent(false);
                  }}
                  className="px-4 py-2 bg-surface border border-border hover:bg-neutral-800 text-foreground rounded-xl text-xs font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPause}
                  className={`px-4 py-2 text-xs font-bold rounded-xl text-foreground transition-all shadow-md ${
                    isEmergencyPaused 
                      ? "bg-success-text hover:brightness-110 shadow-success-text/20"
                      : "bg-error-text hover:brightness-110 shadow-error-text/20"
                  }`}
                >
                  {submittingPause ? "Processing..." : isEmergencyPaused ? "Resume Operations" : "Confirm Pause"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
