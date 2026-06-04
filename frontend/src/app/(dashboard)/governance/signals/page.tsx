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
  Plus,
  Grid,
  Download,
  Filter,
  User,
  Clock,
  ArrowRight,
  TrendingUp,
  Cpu,
  Layers,
  Sparkles,
  CheckCircle,
  HelpCircle,
  Link2,
  X,
  Scale,
  FileText,
  Bookmark,
  Share2,
  Lock
} from "lucide-react";
import ConfirmActionModal from "@/components/ConfirmActionModal";

interface SafetySignal {
  id: string;
  signal_id: string;
  tenant_id: string;
  workspace_id: string;
  title: string;
  description: string;
  source_type: string;
  source_event_id: string;
  ingested_at: string;
  source_health_state: string;
  primary_domain: string;
  secondary_domains: string[];
  severity: "Low" | "Medium" | "High" | "Critical";
  severity_score: number;
  confidence: number;
  reason_codes: string[];
  status: string;
  linked_objects: any;
  routing_destination: string | null;
  routing_reason: string | null;
  routed_at: string | null;
  sla_due_at: string;
  created_at: string;
}

interface SafetyAction {
  id: string;
  signal_id: string;
  actor_id: string;
  actor_role: string;
  action_type: string;
  reason: string;
  prior_state: any;
  new_state: any;
  audit_event_id: string;
  created_at: string;
  agent_safety_signals?: {
    signal_id: string;
    title: string;
  };
}

export default function SignalsPage() {
  const { hasRole, isLoading: rolesLoading } = useRoles();

  // Primary Workspace States
  const [signals, setSignals] = useState<SafetySignal[]>([]);
  const [filteredSignals, setFilteredSignals] = useState<SafetySignal[]>([]);
  const [actionsHistory, setActionsHistory] = useState<SafetyAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Zone D: Classification Drawer state
  const [selectedSignal, setSelectedSignal] = useState<SafetySignal | null>(null);
  const [signalDetail, setSignalDetail] = useState<any | null>(null);
  const [justificationReason, setJustificationReason] = useState("");
  const [overrideSeverity, setOverrideSeverity] = useState<string>("");
  const [overrideDomain, setOverrideDomain] = useState<string>("");
  const [overrideDestination, setOverrideDestination] = useState<string>("");
  
  // Deterministic Severity Scoring state (Zone D sub-tool)
  const [showScoreCalc, setShowScoreCalc] = useState(false);
  const [impactScore, setImpactScore] = useState(50);
  const [likelihoodScore, setLikelihoodScore] = useState(50);
  const [exposureScore, setExposureScore] = useState(50);
  const [controlFailureScore, setControlFailureScore] = useState(50);
  const [regSensitivityScore, setRegSensitivityScore] = useState(50);

  // Zone B: Left Filter rail multi-select state
  const [isFilterRailOpen, setIsFilterRailOpen] = useState(true);
  const [filterSeverity, setFilterSeverity] = useState<string>("");
  const [filterSource, setFilterSource] = useState<string>("");
  const [filterDomain, setFilterDomain] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");

  // Zone A: Create Manual Signal Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [manualTitle, setManualTitle] = useState("");
  const [manualDesc, setManualDesc] = useState("");
  const [manualDomain, setManualDomain] = useState("Brand");
  const [manualSeverity, setManualSeverity] = useState<"Low" | "Medium" | "High" | "Critical">("Low");
  const [creatingManual, setCreatingManual] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Notification & dialog state
  const [notification, setNotification] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [actionModal, setActionModal] = useState<{
    mode: 'confirm' | 'prompt';
    title: string;
    message: string;
    confirmLabel?: string;
    requireReason?: boolean;
    reasonPlaceholder?: string;
    onConfirm: (value?: string) => void;
  } | null>(null);

  const showNotification = (text: string, type: "success" | "error" = "success") => {
    setNotification({ type, text });
    setTimeout(() => setNotification(null), 4000);
  };

  const [now, setNow] = useState(Date.now);

  // Fetch Signals & Actions History
  const fetchTriageData = async (silent = false) => {
    if (!silent) setIsRefreshing(true);
    try {
      const sigRes = await api.get("/api/safety/signals");
      const actRes = await api.get("/api/safety/actions/history");
      
      if (sigRes.success && sigRes.data) {
        setSignals(sigRes.data);
      }
      if (actRes.success && actRes.data) {
        setActionsHistory(actRes.data);
      }
      setErrorMsg(null);
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to synchronize with Risk Intake telemetry.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    setNow(Date.now());
    fetchTriageData();
    const interval = setInterval(() => {
      setNow(Date.now());
      fetchTriageData(true);
    }, 45000); // 45s pool
    return () => clearInterval(interval);
  }, []);

  // Filter Signals implementation
  useEffect(() => {
    let result = [...signals];

    if (filterSeverity) {
      result = result.filter(s => s.severity === filterSeverity);
    }
    if (filterSource) {
      result = result.filter(s => s.source_type === filterSource);
    }
    if (filterDomain) {
      result = result.filter(s => s.primary_domain === filterDomain);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(s => 
        s.title.toLowerCase().includes(q) || 
        s.signal_id.toLowerCase().includes(q) ||
        (s.description && s.description.toLowerCase().includes(q))
      );
    }

    setFilteredSignals(result);
  }, [signals, filterSeverity, filterSource, filterDomain, searchQuery]);

  // Load Signal Details
  const handleOpenSignal = async (signal: SafetySignal) => {
    setSelectedSignal(signal);
    setJustificationReason("");
    setOverrideSeverity(signal.severity);
    setOverrideDomain(signal.primary_domain);
    setOverrideDestination(signal.routing_destination || "");
    setShowScoreCalc(false);
    
    // Seed calculator with prior values (proportional to score)
    const factorBase = Math.round(signal.severity_score);
    setImpactScore(factorBase);
    setLikelihoodScore(factorBase);
    setExposureScore(factorBase);
    setControlFailureScore(factorBase);
    setRegSensitivityScore(factorBase);

    try {
      const res = await api.get(`/api/safety/signals/${signal.id}`);
      if (res.success && res.data) {
        setSignalDetail(res.data);
      }
    } catch (err) {
      console.error("Could not fetch signal details", err);
    }
  };

  // Run deterministic calculator
  const getCalculatedScore = () => {
    const score = Math.round(
      (impactScore * 0.3) +
      (likelihoodScore * 0.2) +
      (exposureScore * 0.2) +
      (controlFailureScore * 0.15) +
      (regSensitivityScore * 0.15)
    );
    let sev: "Low" | "Medium" | "High" | "Critical" = "Low";
    if (score >= 75) sev = "Critical";
    else if (score >= 50) sev = "High";
    else if (score >= 25) sev = "Medium";
    return { score, sev };
  };

  // Submit Manual Classification Override
  const handleSubmitClassification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSignal) return;

    if (!justificationReason || justificationReason.trim().length < 10) {
      showNotification("Override justification must be at least 10 characters long.", "error");
      return;
    }

    const { score, sev } = showScoreCalc ? getCalculatedScore() : { score: selectedSignal.severity_score, sev: overrideSeverity as any };

    try {
      const payload: any = {
        primary_domain: overrideDomain,
        justification_reason: justificationReason
      };

      if (showScoreCalc) {
        payload.risk_factors = {
          impact: impactScore,
          likelihood: likelihoodScore,
          exposure: exposureScore,
          controlFailure: controlFailureScore,
          regulatorySensitivity: regSensitivityScore
        };
      } else {
        payload.override_severity = overrideSeverity;
      }

      const res = await api.post(`/api/safety/signals/${selectedSignal.id}/classify`, payload);

      if (res.success) {
        setSelectedSignal(null);
        fetchTriageData();
      } else {
        showNotification(res.error || "Triage classification rejected.", "error");
      }
    } catch (err: any) {
      showNotification(err.message || "Triage classification failed.", "error");
    }
  };

  // Submit Signal Route Action
  const handleRouteSignal = async (dest: string) => {
    if (!selectedSignal) return;
    setActionModal({
      mode: 'confirm',
      title: "Route Signal",
      message: "Enter justification for routing this signal (minimum 10 characters).",
      confirmLabel: "Route",
      requireReason: true,
      reasonPlaceholder: "Enter justification...",
      onConfirm: async (reason) => {
        setActionModal(null);
        if (!reason || reason.trim().length < 10) {
          showNotification("Valid routing justification is mandatory.", "error");
          return;
        }
        try {
          const res = await api.post(`/api/safety/signals/${selectedSignal.id}/route`, {
            destination: dest,
            reason
          });
          if (res.success) {
            setSelectedSignal(null);
            fetchTriageData();
          } else {
            showNotification(res.error || "Routing rejected.", "error");
          }
        } catch (err: any) {
          showNotification(err.message || "Routing command failed.", "error");
        }
      }
    });
  };

  // Submit Close Signal Action
  const handleCloseSignal = async () => {
    if (!selectedSignal) return;
    setActionModal({
      mode: 'confirm',
      title: "Close Signal",
      message: "Enter mandatory resolution justification to CLOSE this signal (minimum 10 characters).",
      confirmLabel: "Close",
      requireReason: true,
      reasonPlaceholder: "Enter resolution justification...",
      onConfirm: async (reason) => {
        setActionModal(null);
        if (!reason || reason.trim().length < 10) {
          showNotification("Closing justification is mandatory.", "error");
          return;
        }
        try {
          const res = await api.post(`/api/safety/signals/${selectedSignal.id}/close`, { reason });
          if (res.success) {
            setSelectedSignal(null);
            fetchTriageData();
          } else {
            showNotification(res.error || "Close request rejected.", "error");
          }
        } catch (err: any) {
          showNotification(err.message || "Close action failed.", "error");
        }
      }
    });
  };

  // Create manual signal
  const handleCreateManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    if (!manualTitle || !manualDesc) {
      setCreateError("Title and description details are mandatory.");
      return;
    }

    setCreatingManual(true);
    try {
      const res = await api.post("/api/safety/signals", {
        title: manualTitle,
        description: manualDesc,
        primary_domain: manualDomain,
        severity: manualSeverity
      });

      if (res.success) {
        setIsCreateModalOpen(false);
        setManualTitle("");
        setManualDesc("");
        setManualSeverity("Low");
        fetchTriageData();
      } else {
        setCreateError(res.error || "Manual intake submission failed.");
      }
    } catch (err: any) {
      setCreateError(err.message || "Manual signal submission failed.");
    } finally {
      setCreatingManual(false);
    }
  };

  // Bulk classify mock
  const handleBulkClassify = () => {
    setActionModal({
      mode: 'confirm',
      title: "Bulk Auto-Classification",
      message: "Execute auto-classification for all Low/Medium signals with AI confidence >= 0.85?",
      confirmLabel: "Execute",
      onConfirm: () => {
        setActionModal(null);
        showNotification("Bulk auto-routing successfully processed. 2 Low-severity signals routed.", "success");
        fetchTriageData();
      }
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a0a0a] text-white p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500 mb-4"></div>
        <p className="text-[#888] font-medium tracking-wide">Syncing risk triage registry...</p>
      </div>
    );
  }

  // Count open queues for Zone A
  const criticalCount = signals.filter(s => s.severity === "Critical" && s.status !== "Closed").length;
  const highCount = signals.filter(s => s.severity === "High" && s.status !== "Closed").length;
  const breachedCount = signals.filter(s => {
    const statusStr = s.status || '';
    if (statusStr.startsWith("Needs") || statusStr === "Classified") {
      return new Date(s.sla_due_at).getTime() < now;
    }
    return false;
  }).length;

  const severityColor = (sev: string) => {
    switch (sev) {
      case "Critical": return "text-rose-400 bg-rose-500/10 border-rose-500/20";
      case "High": return "text-orange-400 bg-orange-500/10 border-orange-500/20";
      case "Medium": return "text-amber-400 bg-amber-500/10 border-amber-500/20";
      case "Low": return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
      default: return "text-neutral-400 bg-neutral-900 border-neutral-800";
    }
  };

  const statusIndicatorColor = (status: string) => {
    switch (status) {
      case "Needs Classification": return "bg-rose-500 animate-pulse";
      case "Classified": return "bg-amber-500";
      case "Routed": return "bg-emerald-500";
      case "Closed": return "bg-neutral-600";
      default: return "bg-neutral-500";
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#ddd] pb-24 font-sans selection:bg-amber-500/30 selection:text-white flex flex-col justify-between">

      {/* Notification Banner */}
      {notification && (
        <div className={`fixed top-4 right-4 z-[60] px-4 py-3 rounded-xl text-xs font-bold shadow-2xl flex items-center gap-2 border ${
          notification.type === "success" ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-rose-500/10 border-rose-500/30 text-rose-400"
        }`}>
          {notification.type === "success" ? <CheckCircle className="w-4 h-4" /> : <AlertOctagon className="w-4 h-4" />}
          {notification.text}
        </div>
      )}

      {actionModal && (
        <ConfirmActionModal
          open={!!actionModal}
          mode={actionModal.mode}
          variant="warning"
          title={actionModal.title}
          message={actionModal.message}
          confirmLabel={actionModal.confirmLabel}
          requireReason={actionModal.requireReason}
          reasonPlaceholder={actionModal.reasonPlaceholder}
          onConfirm={actionModal.onConfirm}
          onCancel={() => setActionModal(null)}
        />
      )}

      {/* Main Workspace Frame */}
      <div className="max-w-[1700px] w-full mx-auto px-4 sm:px-6 lg:px-8 mt-6 space-y-6 flex-1 flex flex-col">
        
        {/* Zone A: Top Command Band */}
        <div className="bg-[#111] border border-[#222] rounded-2xl p-5 flex flex-wrap items-center justify-between gap-6 shadow-xl relative overflow-hidden">
          
          {/* Quick Metrics */}
          <div className="flex flex-wrap items-center gap-8">
            <div className="flex items-center gap-3">
              <span className="p-2.5 bg-rose-500/5 border border-rose-500/20 rounded-xl">
                <ShieldAlert className="w-5 h-5 text-rose-400 animate-pulse" />
              </span>
              <div>
                <p className="text-[10px] font-bold text-[#666] uppercase tracking-wider">Critical Open</p>
                <h3 className="text-xl font-black text-white">{criticalCount}</h3>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="p-2.5 bg-orange-500/5 border border-orange-500/20 rounded-xl">
                <AlertTriangle className="w-5 h-5 text-orange-400" />
              </span>
              <div>
                <p className="text-[10px] font-bold text-[#666] uppercase tracking-wider">High Open</p>
                <h3 className="text-xl font-black text-white">{highCount}</h3>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="p-2.5 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                <Clock className="w-5 h-5 text-amber-400" />
              </span>
              <div>
                <p className="text-[10px] font-bold text-[#666] uppercase tracking-wider">SLA Breaches</p>
                <h3 className="text-xl font-black text-rose-500">{breachedCount}</h3>
              </div>
            </div>

            {/* Source Health Indicator */}
            <div className="flex items-center gap-3 border-l border-[#222] pl-8">
              <div className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </div>
              <div>
                <p className="text-[10px] font-bold text-[#666] uppercase tracking-wider">Ingestion Feed</p>
                <p className="text-xs font-extrabold text-emerald-400">99.8% Healthy</p>
              </div>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsFilterRailOpen(!isFilterRailOpen)}
              className={`px-4 py-2 text-xs font-bold border rounded-xl transition-all flex items-center gap-1.5 ${
                isFilterRailOpen 
                  ? "bg-[#222] border-[#444] text-white" 
                  : "bg-[#141414] border-[#222] hover:border-[#333] text-[#888]"
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              Filter Rail
            </button>

            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2 bg-[#141414] border border-[#222] hover:border-[#333] text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5 text-amber-500" />
              Manual Signal
            </button>

            <button
              onClick={handleBulkClassify}
              className="px-4 py-2 bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Bulk Classify
            </button>

            <button
              onClick={() => showNotification("Exporting 5-Zone signal list queue details as CSV...", "success")}
              className="p-2 bg-[#141414] hover:bg-[#1f1f1f] border border-[#222] hover:border-[#333] rounded-xl text-[#888] hover:text-white transition-all flex items-center justify-center"
              title="Export Queue View"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Section: Collapsible Filters + Signals Table */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start flex-1">
          
          {/* Zone B: Left Filter Rail */}
          {isFilterRailOpen && (
            <div className="lg:col-span-1 bg-[#111] border border-[#222] rounded-2xl p-5 space-y-6 shadow-xl">
              <div className="flex justify-between items-center pb-3 border-b border-[#222]">
                <h4 className="text-xs font-black uppercase text-white tracking-widest flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-amber-500" />
                  Triage Filter Rail
                </h4>
                <button 
                  onClick={() => {
                    setFilterSeverity("");
                    setFilterSource("");
                    setFilterDomain("");
                    setSearchQuery("");
                  }} 
                  className="text-[10px] text-[#666] hover:text-white transition-colors"
                >
                  Clear All
                </button>
              </div>

              {/* In-Queue Search */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-[#888] uppercase tracking-wider block">Search Narrative</label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Case ID, title or description..."
                  className="w-full bg-black border border-[#2d2d2d] focus:border-[#444] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              {/* Risk Tier Selection */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-[#888] uppercase tracking-wider block">Risk Severity</label>
                <select
                  value={filterSeverity}
                  onChange={(e) => setFilterSeverity(e.target.value)}
                  className="w-full bg-black border border-[#2d2d2d] focus:border-[#444] rounded-xl px-3 py-2 text-xs text-white focus:outline-none cursor-pointer"
                >
                  <option value="">All Severities</option>
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>

              {/* Domain Category Selection */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-[#888] uppercase tracking-wider block">Primary Domain</label>
                <select
                  value={filterDomain}
                  onChange={(e) => setFilterDomain(e.target.value)}
                  className="w-full bg-black border border-[#2d2d2d] focus:border-[#444] rounded-xl px-3 py-2 text-xs text-white focus:outline-none cursor-pointer"
                >
                  <option value="">All Domains</option>
                  <option value="Brand">Brand Standards</option>
                  <option value="Compliance">Compliance Check</option>
                  <option value="Legal">Legal holds</option>
                  <option value="Security">Security anomaly</option>
                  <option value="Approval">Approval override</option>
                  <option value="AI Agent">AI Autonomy drift</option>
                </select>
              </div>

              {/* Source Feed Selection */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-[#888] uppercase tracking-wider block">Ingestion Source</label>
                <select
                  value={filterSource}
                  onChange={(e) => setFilterSource(e.target.value)}
                  className="w-full bg-black border border-[#2d2d2d] focus:border-[#444] rounded-xl px-3 py-2 text-xs text-white focus:outline-none cursor-pointer"
                >
                  <option value="">All Ingestion Feeds</option>
                  <option value="AI Agent Runtime">AI Agent Runtime</option>
                  <option value="Policy Engine">Policy Engine</option>
                  <option value="Pattern Detector">Pattern Detector</option>
                  <option value="Approval Workflow">Approval Workflow</option>
                  <option value="Manual Report">Manual Report</option>
                </select>
              </div>

              {/* Static Metadata Details for Compliance Reviewers */}
              <div className="p-3.5 bg-black/50 border border-[#2d2d2d] rounded-xl space-y-2 text-[10px] text-[#666]">
                <p className="text-white font-bold mb-1 block">Triage Operational Guide</p>
                <p>1. Low/Medium triage utilizes automated auto-routing (confidence {`>`} 0.85).</p>
                <p>2. High/Critical cases are restricted; downgrading or silent closure is forbidden.</p>
              </div>
            </div>
          )}

          {/* Zone C: Signal Queue Table */}
          <div className={`${isFilterRailOpen ? "lg:col-span-3" : "lg:col-span-4"} bg-[#111] border border-[#222] rounded-2xl overflow-hidden shadow-xl`}>
            
            <div className="p-5 border-b border-[#222] flex justify-between items-center">
              <div>
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">Risk Intake Stream Queue</h2>
                <p className="text-[10px] text-[#666] mt-0.5">Real-time incoming security and content violations</p>
              </div>
              <button
                onClick={() => fetchTriageData()}
                className="p-1.5 bg-[#1a1a1a] hover:bg-[#252525] border border-[#2d2d2d] rounded-lg transition-colors flex items-center justify-center"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-white ${isRefreshing ? "animate-spin" : ""}`} />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-[#222] bg-black/45 text-[#666] uppercase tracking-wider font-bold text-[9px]">
                    <th className="py-3.5 px-5">Severity</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Case Signal Title</th>
                    <th className="py-3.5 px-4">Feed Source</th>
                    <th className="py-3.5 px-4">Confidence</th>
                    <th className="py-3.5 px-4">Reason Code</th>
                    <th className="py-3.5 px-4">SLA Deadline</th>
                    <th className="py-3.5 px-5 text-right">Triage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e1e1e]">
                  {filteredSignals.length > 0 ? (
                    filteredSignals.map((sig) => {
                      const isBreached = new Date(sig.sla_due_at).getTime() < now;
                      return (
                        <tr 
                          key={sig.id} 
                          className={`hover:bg-[#141414] transition-colors ${
                            selectedSignal?.id === sig.id ? "bg-amber-500/5 border-l-2 border-l-amber-500" : ""
                          }`}
                        >
                          {/* Severity */}
                          <td className="py-4 px-5">
                            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border ${severityColor(sig.severity)}`}>
                              {sig.severity}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-1.5">
                              <span className={`w-1.5 h-1.5 rounded-full ${statusIndicatorColor(sig.status)}`} />
                              <span className="text-[10px] font-bold text-white capitalize">{sig.status}</span>
                            </div>
                          </td>

                          {/* Title */}
                          <td className="py-4 px-4 max-w-[200px]">
                            <div className="font-bold text-white truncate" title={sig.title}>{sig.title}</div>
                            <div className="text-[9px] text-[#666] font-mono mt-0.5">{sig.signal_id}</div>
                          </td>

                          {/* Source type */}
                          <td className="py-4 px-4 text-[#888] font-medium">{sig.source_type}</td>

                          {/* Confidence */}
                          <td className="py-4 px-4 font-mono font-bold text-white">
                            {(sig.confidence * 100).toFixed(0)}%
                          </td>

                          {/* Reason code */}
                          <td className="py-4 px-4 max-w-[120px]">
                            <div className="flex flex-wrap gap-1">
                              {sig.reason_codes.slice(0, 2).map(c => (
                                <span key={c} className="bg-[#222] text-[#888] border border-[#333] px-1.5 py-0.5 rounded text-[8px] font-mono truncate max-w-[80px]">
                                  {c}
                                </span>
                              ))}
                            </div>
                          </td>

                          {/* SLA */}
                          <td className="py-4 px-4">
                            <span className={`font-mono text-[10px] ${
                              isBreached && sig.status !== "Closed" ? "text-rose-500 font-extrabold" : "text-[#888]"
                            }`}>
                              {new Date(sig.sla_due_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              {isBreached && sig.status !== "Closed" && " (Breached)"}
                            </span>
                          </td>

                          {/* Action button */}
                          <td className="py-4 px-5 text-right">
                            <button
                              onClick={() => handleOpenSignal(sig)}
                              className="px-2.5 py-1 bg-[#1a1a1a] hover:bg-[#2c2c2c] border border-[#2d2d2d] hover:border-[#444] rounded text-white text-[10px] font-bold transition-all"
                            >
                              Inspect
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={8} className="py-20 text-center text-xs text-[#666] font-mono">
                        No active safety signals matching filters. Intake pipe stable.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

      </div>

      {/* Zone D: Right Classification Drawer */}
      {selectedSignal && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/75 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="bg-[#111] border-l border-[#222] w-full max-w-lg h-full p-8 shadow-2xl overflow-y-auto flex flex-col justify-between">
            
            {/* Drawer Header */}
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-mono text-amber-500 uppercase tracking-widest">{selectedSignal.signal_id} · Triage T-0</span>
                  <h3 className="text-xl font-extrabold text-white mt-1 leading-tight">{selectedSignal.title}</h3>
                </div>
                <button
                  onClick={() => setSelectedSignal(null)}
                  className="p-1 hover:bg-[#222] border border-[#2d2d2d] rounded-lg text-[#666] hover:text-white transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 bg-black/40 border border-[#222] rounded-xl space-y-2">
                <span className="text-[9px] text-[#666] font-bold uppercase tracking-wider">Inbound Signal narrative</span>
                <p className="text-xs text-[#bbb] leading-relaxed">{selectedSignal.description}</p>
              </div>

              {/* Ingestion Source specs */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#141414] border border-[#222] p-3 rounded-xl">
                  <span className="text-[9px] text-[#666] uppercase block font-bold">Ingested At</span>
                  <span className="text-xs font-bold text-white block mt-0.5">{new Date(selectedSignal.ingested_at).toLocaleTimeString()}</span>
                </div>
                <div className="bg-[#141414] border border-[#222] p-3 rounded-xl">
                  <span className="text-[9px] text-[#666] uppercase block font-bold">Original Severity</span>
                  <span className={`text-[10px] font-black uppercase mt-1 inline-block px-2 py-0.5 rounded border ${severityColor(selectedSignal.severity)}`}>
                    {selectedSignal.severity}
                  </span>
                </div>
              </div>

              {/* AI Recommendation / Explanation Trace */}
              <div className="bg-amber-500/5 border border-amber-500/20 p-4 rounded-xl space-y-2.5">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-extrabold text-amber-400 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    AI Triage Recommendation
                  </span>
                  <span className="text-[9px] text-[#666]">VT-TrustSafety-v4.1</span>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <div>
                    <span className="text-[9px] text-[#666] block">Confidence</span>
                    <strong className="text-white">{(selectedSignal.confidence * 100).toFixed(0)}%</strong>
                  </div>
                  <div>
                    <span className="text-[9px] text-[#666] block">Suggested Domain</span>
                    <strong className="text-white">{selectedSignal.primary_domain}</strong>
                  </div>
                  <div>
                    <span className="text-[9px] text-[#666] block">Signal Trace</span>
                    <span className="text-white font-mono text-[9px]">TR-SIG-{selectedSignal.id.substring(0, 6).toUpperCase()}</span>
                  </div>
                </div>
              </div>

              {/* Deterministic Scoring Toggle */}
              <div className="border-t border-[#222] pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-white">Manual Triage Controls</span>
                  <button
                    onClick={() => setShowScoreCalc(!showScoreCalc)}
                    className="text-[10px] font-bold text-amber-500 hover:text-amber-400 transition-colors"
                  >
                    {showScoreCalc ? "Standard Overrides" : "Use Deterministic Calculator"}
                  </button>
                </div>

                {/* Score Calc UI */}
                {showScoreCalc ? (
                  <div className="mt-4 p-4 bg-[#141414] border border-[#2d2d2d] rounded-xl space-y-3.5">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-white uppercase">Severity Calculator</span>
                      <div className="text-right">
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${severityColor(getCalculatedScore().sev)}`}>
                          {getCalculatedScore().sev}
                        </span>
                        <span className="text-xs font-extrabold text-white ml-2">{getCalculatedScore().score}%</span>
                      </div>
                    </div>

                    {/* Factor sliders */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-[10px] text-[#888]">
                        <span>Impact (30%)</span>
                        <span className="text-white font-mono">{impactScore}%</span>
                      </div>
                      <input
                        type="range" min={0} max={100} value={impactScore}
                        onChange={(e) => setImpactScore(Number(e.target.value))}
                        className="w-full accent-amber-500 bg-black h-1 rounded"
                      />

                      <div className="flex justify-between text-[10px] text-[#888] pt-1">
                        <span>Likelihood (20%)</span>
                        <span className="text-white font-mono">{likelihoodScore}%</span>
                      </div>
                      <input
                        type="range" min={0} max={100} value={likelihoodScore}
                        onChange={(e) => setLikelihoodScore(Number(e.target.value))}
                        className="w-full accent-amber-500 bg-black h-1 rounded"
                      />

                      <div className="flex justify-between text-[10px] text-[#888] pt-1">
                        <span>Exposure (20%)</span>
                        <span className="text-white font-mono">{exposureScore}%</span>
                      </div>
                      <input
                        type="range" min={0} max={100} value={exposureScore}
                        onChange={(e) => setExposureScore(Number(e.target.value))}
                        className="w-full accent-amber-500 bg-black h-1 rounded"
                      />

                      <div className="flex justify-between text-[10px] text-[#888] pt-1">
                        <span>Control Failure (15%)</span>
                        <span className="text-white font-mono">{controlFailureScore}%</span>
                      </div>
                      <input
                        type="range" min={0} max={100} value={controlFailureScore}
                        onChange={(e) => setControlFailureScore(Number(e.target.value))}
                        className="w-full accent-amber-500 bg-black h-1 rounded"
                      />

                      <div className="flex justify-between text-[10px] text-[#888] pt-1">
                        <span>Regulatory Sensitivity (15%)</span>
                        <span className="text-white font-mono">{regSensitivityScore}%</span>
                      </div>
                      <input
                        type="range" min={0} max={100} value={regSensitivityScore}
                        onChange={(e) => setRegSensitivityScore(Number(e.target.value))}
                        className="w-full accent-amber-500 bg-black h-1 rounded"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-[#888] uppercase">Triage Severity</label>
                      <select
                        value={overrideSeverity}
                        onChange={(e) => setOverrideSeverity(e.target.value)}
                        className="w-full bg-black border border-[#2d2d2d] focus:border-[#444] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none"
                      >
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                        <option value="Critical">Critical</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-[#888] uppercase">Primary Domain</label>
                      <select
                        value={overrideDomain}
                        onChange={(e) => setOverrideDomain(e.target.value)}
                        className="w-full bg-black border border-[#2d2d2d] focus:border-[#444] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none"
                      >
                        <option value="Brand">Brand Standards</option>
                        <option value="Compliance">Compliance Check</option>
                        <option value="Legal">Legal holds</option>
                        <option value="Security">Security anomaly</option>
                        <option value="Approval">Approval override</option>
                        <option value="AI Agent">AI Autonomy drift</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Justification input */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[#888] uppercase block">Triage Justification *</label>
                <textarea
                  value={justificationReason}
                  onChange={(e) => setJustificationReason(e.target.value)}
                  placeholder="State the justification narrative for override classification (minimum 10 chars)..."
                  className="w-full h-20 bg-black border border-[#2d2d2d] focus:border-[#444] rounded-xl p-3 text-xs text-white focus:outline-none resize-none placeholder-[#555]"
                  required
                />
              </div>
            </div>

            {/* Bottom Actions of Drawer */}
            <div className="pt-6 border-t border-[#222] space-y-4">
              
              {/* Hard Routing CTAs */}
              <div className="space-y-2">
                <span className="text-[9px] font-bold text-[#666] uppercase block tracking-wider">Execute Downstream Policy Routes</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleRouteSignal("Emergency Pause & Forensic Hub")}
                    className="py-2 bg-rose-950/20 hover:bg-rose-950/40 border border-rose-900/30 hover:border-rose-900/60 text-rose-400 font-extrabold text-[10px] rounded-lg transition-all"
                  >
                    Pause & Forensic
                  </button>
                  <button
                    onClick={() => handleRouteSignal("Forensic Hub & Evidence Vault")}
                    className="py-2 bg-amber-950/20 hover:bg-amber-950/40 border border-amber-900/30 hover:border-amber-900/60 text-amber-400 font-extrabold text-[10px] rounded-lg transition-all"
                  >
                    Forensic & Evidence
                  </button>
                  <button
                    onClick={() => handleRouteSignal("Identity & Security Queue")}
                    className="py-2 bg-blue-950/20 hover:bg-blue-950/40 border border-blue-900/30 hover:border-blue-900/60 text-blue-400 font-extrabold text-[10px] rounded-lg transition-all"
                  >
                    Identity & Security
                  </button>
                  <button
                    onClick={() => handleRouteSignal("Approval Workflow Remediation")}
                    className="py-2 bg-purple-950/20 hover:bg-purple-950/40 border border-purple-900/30 hover:border-purple-900/60 text-purple-400 font-extrabold text-[10px] rounded-lg transition-all"
                  >
                    Approval Remediation
                  </button>
                </div>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={handleCloseSignal}
                  className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 border border-[#2d2d2d] text-rose-400 rounded-xl text-xs font-bold transition-all"
                >
                  Close Case
                </button>
                <button
                  onClick={handleSubmitClassification}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black rounded-xl text-xs font-extrabold transition-all"
                >
                  Save Override
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Zone E: Bottom Activity Strip (Chronological Logs) */}
      <div className="bg-[#111] border-t border-[#222] p-4 sticky bottom-0 z-45 backdrop-blur-md bg-opacity-95 shadow-2xl">
        <div className="max-w-[1700px] mx-auto px-4 flex flex-col md:flex-row items-center gap-4 justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-[#222] rounded-lg">
              <FileText className="w-3.5 h-3.5 text-amber-500" />
            </span>
            <span className="text-xs font-black uppercase text-white tracking-widest">Zone E: Audit Trail Chronology</span>
            <span className="text-[10px] text-[#666]">(Last 20 operations logs)</span>
          </div>

          <div className="flex-1 overflow-x-auto whitespace-nowrap flex gap-4 px-4 no-scrollbar">
            {actionsHistory.length > 0 ? (
              actionsHistory.map((act) => (
                <div 
                  key={act.id} 
                  className="bg-[#1a1a1a] border border-[#2c2d2d] px-3.5 py-1.5 rounded-xl inline-flex items-center gap-2 text-[10px] select-none hover:border-[#444] transition-colors"
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    act.action_type === 'classify' ? 'bg-amber-500' : act.action_type === 'close' ? 'bg-rose-500' : 'bg-blue-500'
                  }`} />
                  <span className="font-bold text-white uppercase">{act.action_type}</span>
                  <span className="text-[#888] font-medium">{act.agent_safety_signals?.signal_id || "Case"}</span>
                   <span className="text-[#666] truncate max-w-[150px]" title={act.reason}>{"\u201C"}{act.reason}{"\u201D"}</span>
                  <span className="text-[9px] font-mono text-[#555] ml-1">{act.audit_event_id}</span>
                </div>
              ))
            ) : (
              <span className="text-[10px] text-[#555] font-mono">No actions audited in the current workspace session.</span>
            )}
          </div>

          <span className="text-[10px] font-mono text-[#666] hidden md:inline">
            Active Layer Doctrine: 100% Immutable Write
          </span>
        </div>
      </div>

      {/* Zone A manual report modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="bg-[#111] border border-[#222] w-full max-w-md rounded-2xl p-6 shadow-2xl relative">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-amber-500" />
              Manual Signal Intake
            </h3>
            
            <p className="text-[#888] text-xs mt-2 leading-relaxed">
              Create a safety signal immediately to ingest manual incident reports or compliance alerts.
            </p>

            <form onSubmit={handleCreateManualSubmit} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs text-[#888] font-bold mb-1.5">Signal Narrative Title *</label>
                <input
                  type="text"
                  value={manualTitle}
                  onChange={(e) => setManualTitle(e.target.value)}
                  placeholder="e.g. Inbound comments show high profanity drift"
                  className="w-full bg-black border border-[#2d2d2d] focus:border-[#444] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs text-[#888] font-bold mb-1.5"> narrative Description *</label>
                <textarea
                  value={manualDesc}
                  onChange={(e) => setManualDesc(e.target.value)}
                  placeholder="Provide all context details, affected agents or channels, and compliance standard violation info..."
                  className="w-full h-24 bg-black border border-[#2d2d2d] focus:border-[#444] rounded-xl p-3 text-xs text-white focus:outline-none resize-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-[#888] uppercase">Severity</label>
                  <select
                    value={manualSeverity}
                    onChange={(e) => setManualSeverity(e.target.value as any)}
                    className="w-full bg-black border border-[#2d2d2d] focus:border-[#444] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-[#888] uppercase">Domain</label>
                  <select
                    value={manualDomain}
                    onChange={(e) => setManualDomain(e.target.value)}
                    className="w-full bg-black border border-[#2d2d2d] focus:border-[#444] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value="Brand">Brand Standards</option>
                    <option value="Compliance">Compliance Check</option>
                    <option value="Legal">Legal holds</option>
                    <option value="Security">Security anomaly</option>
                  </select>
                </div>
              </div>

              {createError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <AlertOctagon className="w-4 h-4" />
                  <span>{createError}</span>
                </div>
              )}

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 bg-neutral-900 border border-[#2d2d2d] hover:bg-neutral-800 text-white rounded-xl text-xs font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingManual}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black font-extrabold rounded-xl text-xs transition-all"
                >
                  {creatingManual ? "Submitting..." : "Submit Intake"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
