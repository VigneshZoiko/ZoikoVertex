"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useRoles } from "@/lib/hooks/useRoles";
import { ShieldAlert, Activity, AlertTriangle, AlertOctagon, RefreshCw, Power } from "lucide-react";
import ConfirmActionModal from "@/components/ConfirmActionModal";

export default function RiskCommandCenterPage() {
  const { hasRole, isLoading: rolesLoading } = useRoles();
  const [loading, setLoading] = useState(true);
  const [pulse, setPulse] = useState<any>(null);
  const [feed, setFeed] = useState<any[]>([]);
  const [gaps, setGaps] = useState<any[]>([]);
  const [pausing, setPausing] = useState(false);
  const [pauseMsg, setPauseMsg] = useState("");
  const [showPauseConfirm, setShowPauseConfirm] = useState(false);

  const fetchRiskData = async () => {
    setLoading(true);
    // Each endpoint is fetched independently so one failure never blocks the others
    const [pulseRes, feedRes, gapsRes] = await Promise.allSettled([
      api.get("/api/v1/governance/risk/pulse").catch(() => null),
      api.get("/api/v1/governance/risk/feed").catch(() => null),
      api.get("/api/v1/governance/risk/gaps").catch(() => null),
    ]);

    if (pulseRes.status === "fulfilled" && pulseRes.value?.success) {
      setPulse(pulseRes.value.data);
    }
    if (feedRes.status === "fulfilled" && feedRes.value?.success) {
      setFeed(feedRes.value.data ?? []);
    }
    if (gapsRes.status === "fulfilled" && gapsRes.value?.success) {
      setGaps(gapsRes.value.data ?? []);
    }

    setLoading(false);
  };

  useEffect(() => {
    if (!rolesLoading) {
      fetchRiskData();
    }
  }, [rolesLoading]);

  const handleEmergencyPause = () => {
    setShowPauseConfirm(true);
  };

  const handleConfirmPause = async () => {
    setPausing(true);
    try {
      const res = await api.post("/api/v1/governance/risk/emergency-pause", {
        scope: "GLOBAL",
        reason: "Admin triggered from Risk Command Center"
      });
      if (res.success) {
        setPauseMsg(res.message);
        setPulse((prev: any) => ({ ...prev, restricted_operations: true }));
      } else {
        setPauseMsg(res.error || "Emergency pause failed");
      }
    } catch (err) {
      setPauseMsg("Emergency pause failed — network error");
    } finally {
      setPausing(false);
      setShowPauseConfirm(false);
    }
  };

  if (rolesLoading) {
    return <div className="p-8 text-[#888888]">Loading risk context...</div>;
  }

  if (!hasRole(["WORKSPACE_OWNER", "GOVERNANCE_ADMIN", "ADMIN"])) {
    return <div className="p-8 text-error-text">Unauthorized. You need Governance Admin privileges to access the Risk Command Center.</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <ShieldAlert className="w-6 h-6 text-error-text" />
            Risk & Compliance Command Center
          </h1>
          <p className="text-[#888888] mt-1 text-sm">Predictive Risk Intelligence, Incident Control & Enterprise Defense</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={fetchRiskData} 
            className="px-4 py-2 bg-[#1a1a1a] border border-[#333] hover:border-[#555] text-foreground rounded-lg flex items-center gap-2 transition-colors text-sm font-medium"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh Pulse
          </button>
          <button 
            onClick={handleEmergencyPause}
            disabled={pausing || pulse?.restricted_operations}
            className={`px-4 py-2 font-bold rounded-lg flex items-center gap-2 transition-colors text-sm ${pulse?.restricted_operations ? 'bg-error-bg text-error-text cursor-not-allowed border border-error-border' : 'bg-error-text hover:bg-error-text text-foreground shadow-lg shadow-error-bg'}`}
          >
            <Power className="w-4 h-4" />
            {pausing ? "Initiating..." : pulse?.restricted_operations ? "RESTRICTED MODE ACTIVE" : "EMERGENCY PAUSE"}
          </button>
        </div>
      </div>

      {pauseMsg && (
        <div className="p-4 bg-error-bg border border-error-border rounded-xl text-error-text text-sm font-medium flex items-center gap-2">
          <AlertOctagon className="w-5 h-5" />
          {pauseMsg}
        </div>
      )}

      {/* Zone 1: Pulse */}
      {pulse && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-[#111] border border-[#222] rounded-xl p-5 relative overflow-hidden">
            <div className={`absolute top-0 right-0 w-16 h-16 rounded-bl-full opacity-20 ${pulse.posture === 'SECURE' ? 'bg-success-text' : pulse.posture === 'ELEVATED' ? 'bg-warning-text' : 'bg-error-text'}`} />
            <div className="text-[#888888] text-xs font-bold uppercase tracking-wider mb-2">Credit Rating</div>
            <div className="text-3xl font-black text-foreground">{pulse.credit_rating}</div>
            <div className={`text-xs mt-2 font-medium ${pulse.posture === 'SECURE' ? 'text-success-text' : pulse.posture === 'ELEVATED' ? 'text-warning-text' : 'text-error-text'}`}>
              Posture: {pulse.posture}
            </div>
          </div>
          <div className="bg-[#111] border border-[#222] rounded-xl p-5">
            <div className="text-[#888888] text-xs font-bold uppercase tracking-wider mb-2">Critical Risk Events</div>
            <div className={`text-3xl font-black ${pulse.critical_events > 0 ? 'text-error-text' : 'text-foreground'}`}>{pulse.critical_events}</div>
            <div className="text-[#666] text-xs mt-2 font-medium">Requiring immediate action</div>
          </div>
          <div className="bg-[#111] border border-[#222] rounded-xl p-5">
            <div className="text-[#888888] text-xs font-bold uppercase tracking-wider mb-2">Open Risk Cases</div>
            <div className={`text-3xl font-black ${pulse.open_risk_cases > 0 ? 'text-warning-text' : 'text-foreground'}`}>{pulse.open_risk_cases}</div>
            <div className="text-[#666] text-xs mt-2 font-medium">Active investigations</div>
          </div>
          <div className="bg-[#111] border border-[#222] rounded-xl p-5">
            <div className="text-[#888888] text-xs font-bold uppercase tracking-wider mb-2">Defensibility Gaps</div>
            <div className={`text-3xl font-black ${pulse.governance_gaps > 0 ? 'text-warning-text' : 'text-foreground'}`}>{pulse.governance_gaps}</div>
            <div className="text-[#666] text-xs mt-2 font-medium">Missing required evidence</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Zone 2: Active Risk Feed */}
        <div className="bg-[#111] border border-[#222] rounded-xl flex flex-col h-[500px]">
          <div className="p-5 border-b border-[#222] flex items-center gap-2">
            <Activity className="w-5 h-5 text-warning-text" />
            <h2 className="text-lg font-bold text-foreground">Active Risk Feed</h2>
          </div>
          <div className="flex-1 overflow-auto p-2">
            {loading ? (
              <div className="p-8 text-center text-[#666]">Loading risk telemetry...</div>
            ) : feed.length === 0 ? (
              <div className="p-8 text-center text-[#666]">No active risk signals detected.</div>
            ) : (
              <div className="space-y-2">
                {feed.map(event => {
                  const meta = event.meta || {};
                  return (
                    <div key={event.id} className="p-4 rounded-lg bg-[#161616] border border-[#2a2a2a] hover:border-[#444] transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${event.level === 'CRITICAL' ? 'bg-error-bg text-error-text border border-error-border' : 'bg-warning-bg text-warning-text border border-warning-border'}`}>
                            {event.level}
                          </span>
                          <span className="text-xs font-mono text-[#888]">{event.service}</span>
                        </div>
                        <span className="text-xs text-[#555]">
                          {new Date(event.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })}
                        </span>
                      </div>
                      <p className="text-sm text-[#ddd] mb-3">{event.message}</p>
                      <div className="flex gap-2">
                        <button className="px-3 py-1 bg-[#222] hover:bg-[#333] rounded text-xs font-medium text-foreground transition-colors">Acknowledge</button>
                        <button className="px-3 py-1 bg-[#222] hover:bg-[#333] rounded text-xs font-medium text-foreground transition-colors">Create Case</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Zone 3: Governance Gaps */}
        <div className="bg-[#111] border border-[#222] rounded-xl flex flex-col h-[500px]">
          <div className="p-5 border-b border-[#222] flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-warning-text" />
            <h2 className="text-lg font-bold text-foreground">Governance Gap Monitor</h2>
          </div>
          <div className="flex-1 overflow-auto p-2">
            {loading ? (
              <div className="p-8 text-center text-[#666]">Scanning for governance gaps...</div>
            ) : gaps.length === 0 ? (
              <div className="p-8 text-center text-[#666]">No governance gaps identified. Everything is defensible.</div>
            ) : (
              <div className="space-y-2">
                {gaps.map(gap => (
                  <div key={gap.id} className="p-4 rounded-lg bg-[#161616] border border-[#2a2a2a] hover:border-[#444] transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${gap.status === 'REJECTED' ? 'bg-error-bg text-error-text' : 'bg-[#222] text-[#aaa]'}`}>
                          {gap.status}
                        </span>
                        <span className="text-xs font-bold text-warning-text">Risk Score: {gap.risk_score}</span>
                      </div>
                      <span className="text-xs text-[#555] capitalize">{gap.platform}</span>
                    </div>
                    <p className="text-sm text-[#ccc] truncate mb-2">{gap.content}</p>
                    {gap.feedback && <p className="text-xs text-[#888] italic mb-3">Feedback: {gap.feedback}</p>}
                    <div className="flex gap-2">
                      <button className="px-3 py-1 bg-info-bg text-info-text hover:bg-info-text/30 rounded text-xs font-medium transition-colors">Request Evidence</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <ConfirmActionModal
        open={showPauseConfirm}
        variant="danger"
        title="Global Emergency Pause"
        message="WARNING: You are about to initiate a GLOBAL EMERGENCY PAUSE. This will suspend all autonomous publishing. Proceed?"
        confirmLabel="Initiate Emergency Pause"
        loading={pausing}
        hideCancel={pausing}
        onConfirm={handleConfirmPause}
        onCancel={() => { if (!pausing) setShowPauseConfirm(false); }}
      />
    </div>
  );
}
