"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useRoles } from "@/lib/hooks/useRoles";
import {
  ShieldAlert,
  Activity,
  AlertTriangle,
  AlertOctagon,
  RefreshCw,
  Power,
  CheckCircle,
  HelpCircle,
  Clock,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Minus,
  Lock,
  Unlock,
  Layers,
  Settings,
  BookOpen,
  Scale,
  Database,
  Search,
  ExternalLink,
  Info
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

const PIPELINE_STAGES = [
  { id: "01", name: "Intent Captured", desc: "User/Agent proposal received" },
  { id: "02", name: "Context Assembly", desc: "Compile brand, rule & tenant context" },
  { id: "03", name: "Risk Classification", desc: "Assign risk class and score" },
  { id: "04", name: "Guardrail Evaluation", desc: "Brand, compliance & legal rules check" },
  { id: "05", name: "Decision Issuance", desc: "Allow, block, warn, approval-route" },
  { id: "06", name: "Human Accountability", desc: "HITL reviews, owner & SLA tracking" },
  { id: "07", name: "Evidence Write", desc: "Immutable write to Evidence Vault" },
  { id: "08", name: "Runtime Monitoring", desc: "Live channel drift & error monitor" }
];

export default function SafetyOverviewPage() {
  const { hasRole, isLoading: rolesLoading } = useRoles();
  
  // State
  const [data, setData] = useState<SafetyOverviewDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState<string | null>(null);
  
  // Emergency Pause Modal State
  const [isPauseModalOpen, setIsPauseModalOpen] = useState(false);
  const [pauseReason, setPauseReason] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [submittingPause, setSubmittingPause] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  
  // Component Detail Modal/Drawer State
  const [selectedComponent, setSelectedComponent] = useState<any | null>(null);
  
  // Simulation States
  const [isSimulatingDegradation, setIsSimulatingDegradation] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  // Fetch Overview Data
  const fetchOverview = async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) setIsRefreshing(true);
    try {
      const res = await api.get("/api/v1/safety/overview");
      if (res.success && res.data) {
        setData(res.data);
        setIsSimulatingDegradation(res.data.api_status === "degraded");
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

  // Handle Simulation Toggle
  const handleToggleDegradation = async (checked: boolean) => {
    setIsSimulatingDegradation(checked);
    try {
      await api.post("/api/v1/safety/actions/toggle-degraded", { degraded: checked });
      await fetchOverview();
    } catch (err) {
      console.error("Degradation toggle failed", err);
    }
  };

  // Trigger Emergency Pause Submit
  const handleEmergencyPauseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    if (!pauseReason || pauseReason.trim().length < 10) {
      setModalError("Please provide a justification reason (minimum 10 characters).");
      return;
    }
    if (mfaCode !== "123456") {
      setModalError("MFA Verification failed. Enter '123456' to simulate a valid token.");
      return;
    }

    setSubmittingPause(true);
    try {
      const isCurrentlyPaused = data?.active_mode === "emergency_pause";
      const res = await api.post("/api/v1/safety/actions/request-emergency-pause", {
        state: isCurrentlyPaused ? "inactive" : "active",
        reason: pauseReason,
        mfa_code: mfaCode,
        scope: "WORKSPACE"
      });

      if (res.success) {
        setIsPauseModalOpen(false);
        setPauseReason("");
        setMfaCode("");
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
      const res = await api.post("/api/v1/safety/actions/review-critical-queue", {});
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
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a0a0a] text-white p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500 mb-4"></div>
        <p className="text-[#888] font-medium tracking-wide">Assembling safety telemetry...</p>
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
        return "text-emerald-400 border-emerald-500/20 bg-emerald-500/10";
      case "watch":
      case "warning":
        return "text-amber-400 border-amber-500/20 bg-amber-500/10";
      case "degraded":
        return "text-orange-400 border-orange-500/20 bg-orange-500/10";
      case "critical":
      case "unavailable":
        return "text-rose-400 border-rose-500/20 bg-rose-500/10";
      default:
        return "text-neutral-400 border-neutral-800 bg-neutral-900";
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#ddd] pb-20 font-sans selection:bg-amber-500/30 selection:text-white">
      {/* Global Safety Bar */}
      <div className="bg-[#111] border-b border-[#222] sticky top-0 z-40 backdrop-blur-md bg-opacity-95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono px-2.5 py-1 bg-[#1a1a1a] border border-[#333] rounded text-[#888]">
              Tenant: <span className="text-white font-bold">{data?.tenant_id}</span>
            </span>
            <span className="text-xs font-mono px-2.5 py-1 bg-[#1a1a1a] border border-[#333] rounded text-[#888]">
              Workspace: <span className="text-white font-bold">{data?.workspace_id?.substring(0, 8)}</span>
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#888] font-medium">Posture Status:</span>
              <span className={`text-xs px-2.5 py-0.5 rounded-full border font-black uppercase ${getStatusColor(data?.posture_status || "healthy")}`}>
                {data?.posture_status}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-[#888] font-medium">Active Mode:</span>
              <span className={`text-xs px-2.5 py-0.5 rounded-full border font-black uppercase ${
                isEmergencyPaused 
                  ? "text-rose-400 border-rose-500/20 bg-rose-500/10 animate-pulse" 
                  : data?.active_mode === "restricted_operations" 
                  ? "text-orange-400 border-orange-500/20 bg-orange-500/10" 
                  : "text-emerald-400 border-emerald-500/20 bg-emerald-500/10"
              }`}>
                {data?.active_mode?.replace("_", " ")}
              </span>
            </div>

            {data?.critical_holds_count !== undefined && (
              <button 
                onClick={handleReviewCriticalQueue}
                className="text-xs font-bold text-amber-400 bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded transition-colors"
              >
                Critical Holds: {data.critical_holds_count}
              </button>
            )}

            <button
              onClick={() => setIsPauseModalOpen(true)}
              className={`text-xs font-bold px-3 py-1 rounded flex items-center gap-1.5 transition-all shadow-md ${
                isEmergencyPaused
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-900/10"
                  : "bg-rose-600 hover:bg-rose-700 text-white shadow-rose-900/10"
              }`}
            >
              <Power className="w-3.5 h-3.5" />
              {isEmergencyPaused ? "Resume Operations" : "Emergency Pause"}
            </button>
          </div>
        </div>
      </div>

      {/* Info Message Banner */}
      {infoMessage && (
        <div className="bg-emerald-500/10 border-b border-emerald-500/30 text-emerald-400 py-3 px-4 text-center text-sm font-semibold flex items-center justify-center gap-2">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <span>{infoMessage}</span>
        </div>
      )}

      {/* Degradation Banner / Warning Area */}
      {isDegraded && (
        <div className="bg-rose-500/10 border-b border-rose-500/30 text-rose-400 py-3 px-4 text-center text-sm font-semibold flex items-center justify-center gap-2 animate-pulse">
          <AlertOctagon className="w-5 h-5 flex-shrink-0" />
           <span>SAFETY LAYER DEGRADED: All material operations are locked. System defaulting to fail-closed &ldquo;hold-for-review&rdquo; mode.</span>
        </div>
      )}

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-8">
        
        {/* Header Strip with Page Title, Action Buttons and Simulation Toggle */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[#222] pb-6">
          <div>
            <div className="flex items-center gap-2.5">
              <Layers className="w-8 h-8 text-amber-500" />
              <h1 className="text-3xl font-extrabold text-white tracking-tight">Safety Layer Overview</h1>
            </div>
            <p className="text-[#888] text-sm mt-1">
              Document 01 Command Surface · Tier-0 Real-Time Operational Controls
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {/* Simulation controls */}
            <div className="flex items-center gap-2 bg-[#141414] border border-[#2d2d2d] rounded-xl px-4 py-2">
              <label htmlFor="degrade-toggle" className="text-xs font-semibold text-[#888] cursor-pointer">
                Simulate API Degradation
              </label>
              <input
                id="degrade-toggle"
                type="checkbox"
                checked={isSimulatingDegradation}
                onChange={(e) => handleToggleDegradation(e.target.checked)}
                className="w-4 h-4 rounded text-amber-500 bg-black border-[#333] focus:ring-0 cursor-pointer"
              />
            </div>

            <button
              onClick={() => fetchOverview(true)}
              className="p-2.5 bg-[#141414] hover:bg-[#1f1f1f] border border-[#2d2d2d] hover:border-[#444] rounded-xl transition-all flex items-center justify-center"
              aria-label="Refresh telemetry data"
            >
              <RefreshCw className={`w-4 h-4 text-white ${isRefreshing ? "animate-spin" : ""}`} />
            </button>

            <button
              onClick={handleReviewCriticalQueue}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black font-extrabold rounded-xl transition-all shadow-lg shadow-amber-500/10 text-sm"
            >
              Review Critical Queue
            </button>
          </div>
        </div>

        {/* Posture Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Card 1: Posture Score */}
          <div className="bg-[#111] border border-[#222] rounded-2xl p-6 relative overflow-hidden transition-all hover:border-[#333]">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-bold text-[#888] uppercase tracking-wider">Safety Posture Score</p>
                <h3 className="text-4xl font-black text-white mt-2">{data?.posture_score}%</h3>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${getStatusColor(data?.posture_status || "healthy")}`}>
                {data?.posture_status}
              </span>
            </div>
            {/* Visual Bar Indicator */}
            <div className="w-full bg-[#222] h-2 rounded-full mt-4 overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  (data?.posture_score || 0) > 85 ? "bg-emerald-500" : (data?.posture_score || 0) > 60 ? "bg-amber-500" : "bg-rose-500"
                }`}
                style={{ width: `${data?.posture_score || 0}%` }}
              />
            </div>
            <p className="text-[11px] text-[#666] mt-2">Real-time composite trust score</p>
          </div>

          {/* Card 2: Critical Holds */}
          <div className="bg-[#111] border border-[#222] rounded-2xl p-6 transition-all hover:border-[#333]">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-bold text-[#888] uppercase tracking-wider">Critical Holds</p>
                <h3 className={`text-4xl font-black mt-2 ${data?.critical_holds_count && data.critical_holds_count > 0 ? "text-rose-400" : "text-white"}`}>
                  {data?.critical_holds_count || 0}
                </h3>
              </div>
              <ShieldAlert className="w-5 h-5 text-[#666]" />
            </div>
            <p className="text-[11px] text-[#666] mt-6">Held / quarantined actions pending approval</p>
          </div>

          {/* Card 3: Agent Safety Health */}
          <div className="bg-[#111] border border-[#222] rounded-2xl p-6 transition-all hover:border-[#333]">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-bold text-[#888] uppercase tracking-wider">Agent Safety Health</p>
                <h3 className="text-4xl font-black text-white mt-2 capitalize">{data?.agent_safety_health || "healthy"}</h3>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${getStatusColor(data?.agent_safety_health || "healthy")}`}>
                {data?.agent_safety_health}
              </span>
            </div>
            <p className="text-[11px] text-[#666] mt-6">Tracking autonomy levels & drift</p>
          </div>

          {/* Card 4: SLA Exposure */}
          <div className="bg-[#111] border border-[#222] rounded-2xl p-6 transition-all hover:border-[#333]">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-bold text-[#888] uppercase tracking-wider">SLA Exposure</p>
                <div className="flex items-baseline gap-3 mt-2">
                  <span className="text-3xl font-black text-rose-500" title="Breached SLA">{data?.sla_exposure.breached || 0} <span className="text-xs font-medium text-[#666]">br</span></span>
                  <span className="text-3xl font-black text-amber-500" title="At Risk SLA">{data?.sla_exposure.at_risk || 0} <span className="text-xs font-medium text-[#666]">ar</span></span>
                  <span className="text-3xl font-black text-emerald-500" title="On Track SLA">{data?.sla_exposure.on_track || 0} <span className="text-xs font-medium text-[#666]">ot</span></span>
                </div>
              </div>
              <Clock className="w-5 h-5 text-[#666]" />
            </div>
            <p className="text-[11px] text-[#666] mt-4">Holds exceeding review SLA</p>
          </div>
        </div>

        {/* 8-Stage Decision Pipeline Visual */}
        <div className="bg-[#111] border border-[#222] rounded-2xl p-6">
          <h2 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
            <Activity className="w-5 h-5 text-amber-500" />
            Safety Decision Pipeline
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
            {PIPELINE_STAGES.map((stage, idx) => (
              <div 
                key={stage.id} 
                className="bg-[#151515] border border-[#222] rounded-xl p-4 flex flex-col justify-between hover:border-[#444] transition-all group"
              >
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-mono text-[#666]">{stage.id}</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 opacity-60 group-hover:opacity-100 transition-opacity"></span>
                  </div>
                  <h4 className="text-xs font-extrabold text-white leading-tight group-hover:text-amber-400 transition-colors">{stage.name}</h4>
                  <p className="text-[9px] text-[#666] mt-2 leading-snug">{stage.desc}</p>
                </div>
                {idx < 7 && (
                  <div className="hidden lg:flex items-center justify-end text-[#333] group-hover:text-[#555] transition-colors mt-4">
                    <ArrowRight className="w-4 h-4 translate-x-1" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Middle Section: Component Registry + Live Safety Queue */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Component Registry Card Grid */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-amber-500" />
                Component Registry
              </h2>
              <span className="text-xs text-[#666]">Click component to inspect specification</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {data?.component_health.map((component, idx) => (
                <button
                  key={component.name}
                  onClick={() => setSelectedComponent({ ...component, index: idx + 1 })}
                  className="bg-[#111] hover:bg-[#141414] border border-[#222] hover:border-[#333] rounded-2xl p-5 text-left transition-all flex flex-col justify-between w-full h-36 group"
                >
                  <div className="flex justify-between items-start w-full">
                    <div>
                      <span className="text-[10px] font-mono text-[#555]">Component 0{idx + 1}</span>
                      <h4 className="text-sm font-extrabold text-white mt-1 group-hover:text-amber-400 transition-colors line-clamp-1">{component.name}</h4>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${getStatusColor(component.health)}`}>
                      {component.health}
                    </span>
                  </div>

                  <div className="flex items-center justify-between mt-4 w-full">
                    <span className="text-[10px] text-[#666]">Backlog: <strong className="text-white font-semibold">{component.backlog}</strong></span>
                    <span className="text-[10px] text-[#666]">Owner: <strong className="text-white font-semibold">{component.owner}</strong></span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Live Safety Queue Summary */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-500" />
              Live Safety Queue
            </h2>

            <div className="bg-[#111] border border-[#222] rounded-2xl flex flex-col h-[525px] overflow-hidden">
              <div className="p-4 border-b border-[#222] flex justify-between items-center">
                <span className="text-xs font-bold text-white">Telemetry Stream</span>
                <span className="text-[10px] text-[#666]">Sorted by criticality & recency</span>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {data?.recent_material_decisions && data.recent_material_decisions.length > 0 ? (
                  data.recent_material_decisions.map((decision) => (
                    <div 
                      key={decision.decision_id} 
                      className="bg-[#161616] border border-[#2d2d2d] rounded-xl p-4 hover:border-[#444] transition-all space-y-2.5"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${
                          decision.risk_level === 'CRITICAL' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                          {decision.risk_level}
                        </span>
                        <span className="text-[10px] text-[#666] font-mono capitalize">{decision.platform}</span>
                      </div>

                      <p className="text-xs text-[#ddd] line-clamp-2 leading-relaxed">
                        {decision.content}
                      </p>

                      <div className="flex justify-between items-center pt-1 border-t border-[#222]">
                        <span className="text-[9px] text-[#555]">
                          {new Date(decision.created_at).toLocaleTimeString()}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] text-[#888] font-bold">
                            Score: {decision.risk_score}
                          </span>
                          <span className={`w-2 h-2 rounded-full ${
                            decision.status === 'GOVERNANCE_BLOCKED' ? 'bg-rose-500 animate-pulse' : 'bg-amber-500'
                          }`} title={decision.status} />
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-20 text-xs text-[#666] font-mono">
                    No material holds active. Workspace operations stable.
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Widgets: Top Rule Hits & Containment Modes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Top Rule Hits widget */}
          <div className="bg-[#111] border border-[#222] rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-amber-500" />
              Top Rule Hits
            </h3>
            <div className="space-y-4">
              {data?.top_rule_hits.map((rule) => (
                <div key={rule.rule_name} className="flex items-center justify-between p-3.5 bg-[#141414] border border-[#222] rounded-xl hover:border-[#333] transition-colors">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-white">{rule.rule_name}</h4>
                      <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase ${
                        rule.severity === 'CRITICAL' ? 'bg-rose-500/10 text-rose-400' : 'bg-amber-500/10 text-amber-400'
                      }`}>
                        {rule.severity}
                      </span>
                    </div>
                    <p className="text-[10px] text-[#666] mt-1">Scope: {rule.impacted_scope}</p>
                  </div>

                  <div className="flex items-center gap-3 text-right">
                    <div>
                      <span className="text-sm font-black text-white">{rule.count}</span>
                      <p className="text-[9px] text-[#666]">Hits</p>
                    </div>
                    <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-[#222]">
                      {rule.trend === 'up' ? (
                        <TrendingUp className="w-3.5 h-3.5 text-rose-400" />
                      ) : rule.trend === 'down' ? (
                        <TrendingDown className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Minus className="w-3.5 h-3.5 text-neutral-400" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Containment Modes widget */}
          <div className="bg-[#111] border border-[#222] rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Power className="w-5 h-5 text-amber-500" />
              Containment & Operations Modes
            </h3>
            
            <div className="space-y-4">
              <div className={`p-4 rounded-xl border flex items-start gap-3 transition-colors ${
                data?.active_mode === "normal" 
                  ? "bg-emerald-500/5 border-emerald-500/30 text-emerald-400" 
                  : "bg-neutral-900 border-[#222] text-[#888]"
              }`}>
                <Unlock className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-white">Normal Operations</h4>
                  <p className="text-[10px] text-[#666] mt-1">Full autonomous scheduling and publishing enabled within guardrails.</p>
                </div>
              </div>

              <div className={`p-4 rounded-xl border flex items-start gap-3 transition-colors ${
                data?.active_mode === "elevated_watch" 
                  ? "bg-amber-500/5 border-amber-500/30 text-amber-400" 
                  : "bg-neutral-900 border-[#222] text-[#888]"
              }`}>
                <Info className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-white">Elevated Watch</h4>
                  <p className="text-[10px] text-[#666] mt-1">Heightened safety evaluation latency and enhanced operational telemetry active.</p>
                </div>
              </div>

              <div className={`p-4 rounded-xl border flex items-start gap-3 transition-colors ${
                data?.active_mode === "restricted_operations" 
                  ? "bg-orange-500/5 border-orange-500/30 text-orange-400" 
                  : "bg-neutral-900 border-[#222] text-[#888]"
              }`}>
                <Power className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-white">Restricted Operations Mode</h4>
                  <p className="text-[10px] text-[#666] mt-1">Publishing limited. Only authorized pre-approved campaigns proceed.</p>
                </div>
              </div>

              <div className={`p-4 rounded-xl border flex items-start gap-3 transition-colors ${
                isEmergencyPaused 
                  ? "bg-rose-500/5 border-rose-500/30 text-rose-400 animate-pulse" 
                  : "bg-neutral-900 border-[#222] text-[#888]"
              }`}>
                <Lock className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-white">Emergency Pause</h4>
                  <p className="text-[10px] text-[#666] mt-1">Immediate halt to all autonomous releases. Human clearance required.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Footer Strip */}
      <footer className="mt-20 border-t border-[#222] bg-[#0c0c0c] py-6 text-xs text-[#555]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex flex-wrap items-center gap-4 font-mono">
            <span>Last Evaluated: <strong className="text-[#888]">{data?.evaluated_at ? new Date(data.evaluated_at).toLocaleTimeString() : "Pending"}</strong></span>
            <span>Policy: <strong className="text-[#888]">v1.4.2-Safety</strong></span>
            <span>Evidence Chain: <strong className={data?.evidence_chain_health === "verified" ? "text-emerald-500" : "text-rose-500"}>{data?.evidence_chain_health?.toUpperCase()}</strong></span>
          </div>

          <div className="flex flex-wrap items-center gap-4 font-mono">
            <span>API Latency: <strong className="text-[#888]">124ms</strong></span>
            <span>Residency: <strong className="text-[#888]">US-East</strong></span>
            <span>Support: <strong className="text-[#888]">Tier-0 Escalation</strong></span>
          </div>
        </div>
      </footer>

      {/* Emergency Pause / Resume MFA Modal */}
      {isPauseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="bg-[#111] border border-[#222] w-full max-w-md rounded-2xl p-6 shadow-2xl relative">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Power className="w-5 h-5 text-rose-500" />
              {isEmergencyPaused ? "Deactivate Emergency Pause" : "Request Emergency Pause"}
            </h3>
            
            <p className="text-[#888] text-xs mt-2 leading-relaxed">
              {isEmergencyPaused 
                ? "Resuming workspace publishing requires explicit justification and token re-verification."
                : "You are initiating a global pause. This will halt all scheduled content publishing and agent operations immediately."}
            </p>

            <form onSubmit={handleEmergencyPauseSubmit} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs text-[#888] font-bold mb-1.5">Justification Reason *</label>
                <textarea
                  value={pauseReason}
                  onChange={(e) => setPauseReason(e.target.value)}
                  placeholder="Describe why this change is being requested (minimum 10 characters)..."
                  className="w-full h-24 bg-black border border-[#333] focus:border-[#555] rounded-xl p-3 text-xs text-white placeholder-[#555] focus:outline-none resize-none"
                  required
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs text-[#888] font-bold">MFA Verification Code *</label>
                  <span className="text-[9px] text-[#666]">Enter mock code: <strong>123456</strong></span>
                </div>
                <input
                  type="text"
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value)}
                  placeholder="******"
                  maxLength={6}
                  className="w-full bg-black border border-[#333] focus:border-[#555] rounded-xl px-4 py-2.5 text-sm text-center text-white tracking-widest focus:outline-none"
                  required
                />
              </div>

              {modalError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl text-xs font-semibold flex items-center gap-2">
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
                  }}
                  className="px-4 py-2 bg-neutral-900 border border-[#333] hover:bg-neutral-800 text-white rounded-xl text-xs font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPause}
                  className={`px-4 py-2 text-xs font-bold rounded-xl text-white transition-all shadow-md ${
                    isEmergencyPaused 
                      ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-950/20"
                      : "bg-rose-600 hover:bg-rose-700 shadow-rose-950/20"
                  }`}
                >
                  {submittingPause ? "Processing..." : isEmergencyPaused ? "Resume Operations" : "Confirm Pause"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Component Specification Drawer (Detail view) */}
      {selectedComponent && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/75 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="bg-[#111] border-l border-[#222] w-full max-w-lg h-full p-8 shadow-2xl overflow-y-auto flex flex-col justify-between">
            <div className="space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-xs font-mono text-amber-500">Document 0{selectedComponent.index} Specs</span>
                  <h3 className="text-2xl font-black text-white mt-1">{selectedComponent.name}</h3>
                </div>
                <button
                  onClick={() => setSelectedComponent(null)}
                  className="text-xs px-2.5 py-1 bg-[#222] hover:bg-[#333] border border-[#333] hover:border-[#555] rounded text-white transition-all"
                >
                  Close
                </button>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                  <h4 className="text-xs font-bold text-amber-400">Technical Purpose</h4>
                  <p className="text-xs text-[#aaa] mt-1.5 leading-relaxed">{selectedComponent.description || "Component spec not loaded."}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[#141414] border border-[#222] p-4 rounded-xl">
                    <span className="text-[10px] text-[#666] uppercase block font-bold">Health Status</span>
                    <span className={`text-xs font-black uppercase mt-1 inline-block px-2 py-0.5 rounded ${getStatusColor(selectedComponent.health)}`}>
                      {selectedComponent.health}
                    </span>
                  </div>

                  <div className="bg-[#141414] border border-[#222] p-4 rounded-xl">
                    <span className="text-[10px] text-[#666] uppercase block font-bold">Backlog Size</span>
                    <span className="text-sm font-bold text-white mt-1 inline-block">{selectedComponent.backlog} Items</span>
                  </div>
                </div>

                <div className="bg-[#141414] border border-[#222] p-4 rounded-xl space-y-2">
                  <span className="text-[10px] text-[#666] uppercase block font-bold">Assigned Owner</span>
                  <span className="text-xs font-bold text-white block">{selectedComponent.owner}</span>
                  <span className="text-[10px] text-[#666]">Mandatory SLA escalation active</span>
                </div>

                <div className="bg-rose-500/5 border border-rose-500/10 p-4 rounded-xl flex items-start gap-2">
                  <Info className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                  <p className="text-[10px] text-[#888] leading-relaxed">
                    This component represents a downstream control block. To maintain architecture sequencing rules, direct settings modification is restricted to this document workspace.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-[#222] flex gap-3 justify-end">
              <button
                onClick={() => setSelectedComponent(null)}
                className="px-4 py-2 bg-neutral-900 border border-[#333] hover:bg-neutral-800 text-white rounded-xl text-xs font-bold transition-all"
              >
                Go Back
              </button>
              <button
                onClick={() => {
                  setInfoMessage(`Downstream component deep dive route (/governance/doc-0${selectedComponent.index}) is locked until sequencing is approved.`);
                  setTimeout(() => setInfoMessage(null), 5000);
                }}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black rounded-xl text-xs font-extrabold transition-all"
              >
                Access Deep Dive
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
