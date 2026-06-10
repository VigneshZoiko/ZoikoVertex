"use client";

import { useEffect, useState } from "react";
import { 
  ShieldAlert, AlertTriangle, PlayCircle, Eye, 
  Clock, ShieldX, UserX, CheckCircle, Loader2,
  RefreshCw, Lock
} from "lucide-react";
import { api } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";

interface CollusionIncident {
  id: string;
  type: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM";
  details: string;
  timestamp: string;
}

interface CollusionData {
  collusion_index: number;
  rubber_stamps: number;
  segregation_violations: number;
  warning_overrides: number;
  monopolized_approvals: number;
  incidents: CollusionIncident[];
}

export default function CollusionMonitorPage() {
  const [data, setData] = useState<CollusionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchMetrics = async () => {
    try {
      setRefreshing(true);
      setFetchError(null);
      const res = await api.get('/api/v1/governance/collusion/metrics');
      if (res.success) {
        setData(res.data);
      } else {
        setFetchError(res.error || "Failed to load collusion metrics");
      }
    } catch (error) {
      setFetchError("Failed to load collusion metrics");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  const getRiskColor = (index: number) => {
    if (index >= 70) return "text-rose-500 border-rose-500/20 bg-rose-500/5";
    if (index >= 40) return "text-amber-500 border-amber-500/20 bg-amber-500/5";
    return "text-emerald-500 border-emerald-500/20 bg-emerald-500/5";
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-12 pb-32">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-slate-950 border border-rose-500/30 rounded-[3rem] p-12 shadow-[0_0_80px_rgba(244,63,94,0.1)]">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-rose-600/10 blur-[150px] rounded-full -mr-40 -mt-40 animate-pulse" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-12">
          <div className="max-w-2xl space-y-6">
            <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-rose-500/5 border border-rose-500/20 text-rose-400 text-[10px] font-black uppercase tracking-[0.4em] mb-2 shadow-inner">
              <ShieldAlert className="w-4 h-4" />
              Human Accountability Layer
            </div>
            <h1 className="text-6xl font-black text-foreground tracking-tighter leading-[0.85]">
              Collusion &amp; <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-amber-500 italic">Insider Risk.</span>
            </h1>
            <p className="text-lg text-slate-400 leading-relaxed font-medium tracking-tight">
              Real-time heuristic analysis auditing approval behaviors and rubber-stamp triggers. Detects segregation of duties violations, negligent review speeds, and un-remediated high-risk bypasses.
            </p>
          </div>

          <div className="flex flex-col items-center gap-4">
            <button 
              onClick={fetchMetrics} 
              disabled={refreshing}
              className="bg-black hover:bg-slate-900 border border-slate-800 text-xs font-bold text-slate-400 py-3 px-6 rounded-2xl flex items-center gap-2 hover:text-white transition-all shadow-xl"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-rose-400" : ""}`} />
              Re-Scan Workspace
            </button>
          </div>
        </div>
      </div>

      {fetchError && (
        <div className="mx-auto max-w-7xl px-4">
          <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-400 text-sm font-medium flex items-center gap-2">
            <ShieldAlert className="w-5 h-5" />
            {fetchError}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Loader2 className="w-12 h-12 text-rose-500 animate-spin" />
          <p className="text-[var(--foreground-muted)] text-sm font-semibold uppercase tracking-widest">Scanning Heuristic Indexes...</p>
        </div>
      ) : (
        <>
          {/* Main Risk Display */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Risk Index Dial */}
            <div className="lg:col-span-4 bg-[#050505] border border-slate-900 rounded-[3rem] p-10 shadow-2xl flex flex-col items-center text-center space-y-6">
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Workspace Collusion Index</h3>
              
              <div className="relative w-48 h-48 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle 
                    cx="50" cy="50" r="42" 
                    stroke="#111" strokeWidth="8" fill="transparent" 
                  />
                  <circle 
                    cx="50" cy="50" r="42" 
                    stroke="url(#roseGradient)" strokeWidth="8" fill="transparent" 
                    strokeDasharray={263.8}
                    strokeDashoffset={263.8 - (263.8 * (data?.collusion_index || 0)) / 100}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                  />
                  <defs>
                    <linearGradient id="roseGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#f43f5e" />
                      <stop offset="100%" stopColor="#d97706" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-5xl font-black text-foreground tracking-tighter">{data?.collusion_index}%</span>
                  <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-1">Threat Level</span>
                </div>
              </div>

              <div className={`w-full py-3 px-4 border rounded-2xl text-xs font-black uppercase tracking-widest ${getRiskColor(data?.collusion_index || 0)}`}>
                {(data?.collusion_index || 0) >= 70 ? "CRITICAL OUTLIER DETECTED" : (data?.collusion_index || 0) >= 40 ? "ELEVATED INSIDER RISK" : "NOMINAL REVIEW STATE"}
              </div>
            </div>

            {/* Heuristics breakdown */}
            <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-3 gap-8 h-full">
              {[
                { label: 'Rubber-Stamp Approvals', value: data?.rubber_stamps, desc: 'Reviews approved in under 5 seconds.', icon: Clock, color: 'text-amber-400' },
                { label: 'Segregation Breaches', value: data?.segregation_violations, desc: 'Creators self-approving asset outputs.', icon: UserX, color: 'text-rose-400' },
                { label: 'Warning Overrides', value: data?.warning_overrides, desc: 'High-risk items approved without edits.', icon: AlertTriangle, color: 'text-sky-400' },
              ].map((card, i) => (
                <div key={i} className="bg-[#050505] border border-slate-900 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden group hover:border-rose-500/40 transition-all flex flex-col justify-between">
                  <div className="space-y-6">
                    <div className="p-3 w-12 h-12 rounded-xl bg-black border border-slate-800 flex items-center justify-center shadow-inner">
                      <card.icon className={`w-5 h-5 ${card.color}`} />
                    </div>
                    <div>
                      <div className="text-4xl font-black text-foreground tracking-tighter">{card.value}</div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">{card.label}</div>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-6 leading-relaxed">{card.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Section: Live Incident Stream */}
          <div className="bg-[#050505] border border-slate-900 rounded-[3rem] p-10 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-900 pb-6">
              <div className="flex items-center gap-3">
                <ShieldAlert className="w-6 h-6 text-rose-400" />
                <div>
                  <h2 className="text-xl font-black text-foreground uppercase tracking-tighter">Live Incident Feed</h2>
                  <p className="text-xs text-[var(--foreground-muted)]">Real-time attestation scanner of abnormal human approval patterns.</p>
                </div>
              </div>
            </div>

            {!data?.incidents || data.incidents.length === 0 ? (
              <div className="text-center py-16 flex flex-col items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <p className="text-foreground font-bold text-sm">No Insider Risk Incidents Found</p>
                  <p className="text-slate-500 text-xs mt-1">All humans and agents are complying with defined HITL control boundaries.</p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-900 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      <th className="py-4 px-6">Incident Type</th>
                      <th className="py-4 px-6">Calculated Severity</th>
                      <th className="py-4 px-6">Details / Description</th>
                      <th className="py-4 px-6 text-right">Detection Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.incidents.map((incident) => (
                      <tr key={incident.id} className="border-b border-slate-900/50 hover:bg-slate-950/40 transition-colors">
                        <td className="py-5 px-6 font-bold text-foreground flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            incident.severity === 'CRITICAL' ? 'bg-rose-500/10 text-rose-400' :
                            incident.severity === 'HIGH' ? 'bg-amber-500/10 text-amber-400' : 'bg-sky-500/10 text-sky-400'
                          }`}>
                            <AlertTriangle className="w-4 h-4" />
                          </div>
                          {incident.type}
                        </td>
                        <td className="py-5 px-6">
                          <span className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${
                            incident.severity === 'CRITICAL' ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30' :
                            incident.severity === 'HIGH' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' :
                            'bg-sky-500/15 text-sky-400 border border-sky-500/30'
                          }`}>
                            {incident.severity}
                          </span>
                        </td>
                        <td className="py-5 px-6 text-slate-300 text-xs font-medium max-w-md">
                          {incident.details}
                        </td>
                        <td className="py-5 px-6 text-right text-[11px] text-slate-500 font-bold">
                          {incident.timestamp ? formatDateTime(incident.timestamp) : 'Just Now'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Section: Operational Mitigation controls */}
          <div className="bg-slate-950 border border-rose-500/20 rounded-[3rem] p-10 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="space-y-2 max-w-xl">
              <h3 className="text-lg font-black text-foreground uppercase tracking-tighter">Emergency Autonomy Lock</h3>
              <p className="text-xs text-slate-400 leading-relaxed font-medium">
                In the event that the collusion index exceeds safe bounds (70%+), click here to trigger a global Level 3 lock suspending all autonomous model publication pipelines across the workspace.
              </p>
            </div>
            <button className="bg-rose-600 hover:bg-rose-500 text-foreground font-black text-xs uppercase tracking-widest px-8 py-5 rounded-2xl flex items-center gap-3 transition-all shadow-xl shadow-rose-600/20">
              <Lock className="w-4 h-4" /> Lock Autonomous Pipelines
            </button>
          </div>
        </>
      )}
    </div>
  );
}
