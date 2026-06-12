"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { 
  Fingerprint, TrendingDown, TrendingUp, 
  ShieldCheck, Activity, Target, Clock,
  ChevronRight, ArrowRight, BarChart3,
  Dna
} from "lucide-react";

export default function ForensicPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchForensic = async () => {
      try {
        const res = await api.get('/api/v1/governance/forensic/summary');
        if (res.success) setData(res.data);
      } catch (error) {
        console.error("Forensic fetch failed", error);
      } finally {
        setLoading(false);
      }
    };
    fetchForensic();
  }, []);

  if (loading) return <div className="p-8 text-info-text font-mono">Initializing Forensic Trace...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-12 pb-32">
      {/* Hero: Predictive Governance */}
      <div className="relative overflow-hidden bg-slate-950 border border-info-border rounded-[3rem] p-12 shadow-[0_0_80px_rgba(99,102,241,0.15)]">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-info-text/10 blur-[150px] rounded-full -mr-40 -mt-40 animate-pulse" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-12">
          <div className="max-w-2xl space-y-6">
            <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-info-bg border border-info-border text-info-text text-[10px] font-black uppercase tracking-[0.4em] mb-2 shadow-inner">
              <Fingerprint className="w-4 h-4" />
              Forensic Performance Pulse
            </div>
            <h1 className="text-6xl font-black text-foreground tracking-tighter leading-[0.85]">
              Predictive <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-rose-600 italic">Governance.</span>
            </h1>
            <p className="text-lg text-slate-400 leading-relaxed font-medium tracking-tight">
              Deep forensic audit of agent behavioral patterns, trust scores, and long-term compliance drift. 
              Eliminate hallucinations and brand voice degradation before they impact the network.
            </p>
          </div>
          
          <div className="flex gap-4">
             <div className="bg-black border border-slate-800 rounded-3xl p-8 text-center space-y-2 shadow-2xl">
                <div className="text-5xl font-black text-foreground tracking-tighter">{data?.trust_score}%</div>
                <div className="text-[10px] font-bold text-info-text uppercase tracking-widest">Aggregate Trust</div>
             </div>
          </div>
        </div>
      </div>

      {/* Metric Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          { label: 'Agent Faithfulness', value: `${data?.faithfulness}%`, icon: Dna, color: 'text-cyan-400', trend: 'STABLE' },
          { label: 'Compliance Drift', value: `${data?.compliance_drift}%`, icon: TrendingDown, color: 'text-error-text', trend: 'LOW RISK' },
          { label: 'Incident Velocity', value: `${data?.incident_rate}%`, icon: Activity, color: 'text-warning-text', trend: 'NOMINAL' },
        ].map((stat, i) => (
          <div key={i} className="bg-[#050505] border border-slate-900 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden group hover:border-info-border transition-all">
             <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                <stat.icon className="w-24 h-24 text-foreground" />
             </div>
             <div className="relative z-10 space-y-8">
                <div className={`p-4 w-14 h-14 rounded-2xl bg-black border border-slate-800 flex items-center justify-center ${stat.color} shadow-inner`}>
                   <stat.icon className="w-6 h-6" />
                </div>
                <div>
                   <div className="text-4xl font-black text-foreground tracking-tighter">{stat.value}</div>
                   <div className="flex items-center gap-2 mt-2">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{stat.label}</span>
                      <span className={`text-[8px] font-black px-2 py-0.5 rounded bg-white/5 border border-white/10 ${stat.color}`}>{stat.trend}</span>
                   </div>
                </div>
             </div>
          </div>
        ))}
      </div>

      {/* Main Analysis Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Historical Trace */}
        <div className="lg:col-span-8 bg-[#050505] border border-slate-900 rounded-[3rem] p-10 shadow-2xl space-y-10">
           <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                 <Clock className="w-5 h-5 text-info-text" />
                 <h2 className="text-xl font-black text-foreground uppercase tracking-tighter italic">Faithfulness History</h2>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-black border border-slate-800 rounded-xl">
                 <div className="w-2 h-2 rounded-full bg-success-text animate-pulse" />
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Real-time Feed</span>
              </div>
           </div>

           <div className="h-64 flex items-end gap-2 px-4 border-b border-slate-900 pb-2">
              {data?.performance_history?.map((p: any, i: number) => (
                <div 
                  key={i} 
                  className="flex-1 bg-info-bg rounded-t-xl group relative hover:bg-info-text transition-all cursor-crosshair"
                  style={{ height: `${p.score}%` }}
                >
                   <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-info-text text-foreground text-[8px] font-black px-2 py-1 rounded shadow-xl z-20">
                      Score: {p.score}
                   </div>
                </div>
              ))}
           </div>
           <div className="flex justify-between text-[9px] font-black text-slate-600 uppercase tracking-widest px-4">
              <span>Historical T-0</span>
              <span>Current Performance Trace</span>
           </div>
        </div>

        {/* Behavioral Flags */}
        <div className="lg:col-span-4 space-y-8">
           <div className="bg-[#050505] border border-slate-900 rounded-[3rem] p-10 shadow-2xl relative overflow-hidden">
              <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em] mb-10">Behavioral Anomaly Flags</h3>
              
              <div className="space-y-4">
                 {[
                   { type: 'Style Drift', msg: 'Subtle shift in tone toward aggressive engagement detected in Agent #42.', severity: 'text-warning-text', bg: 'border-warning-border' },
                   { type: 'Identity Blur', msg: 'Confusion between personal and brand persona in Threads cluster.', severity: 'text-error-text', bg: 'border-error-border' },
                   { type: 'Optimal Pattern', msg: 'Performance baseline maintains 98% faithfulness in EU cluster.', severity: 'text-success-text', bg: 'border-success-border' },
                 ].map((flag, i) => (
                   <div key={i} className={`bg-black border ${flag.bg} rounded-3xl p-6 space-y-2 group hover:scale-[1.02] transition-transform cursor-pointer`}>
                      <div className={`text-[10px] font-black uppercase tracking-widest ${flag.severity}`}>{flag.type}</div>
                      <p className="text-xs text-slate-400 leading-relaxed font-medium">{flag.msg}</p>
                   </div>
                 ))}
              </div>

              <button className="w-full mt-10 bg-info-text hover:bg-info-text text-foreground py-5 rounded-[1.5rem] font-black text-xs uppercase tracking-[0.3em] shadow-xl transition-all shadow-info-bg">
                 Run Forensic Re-Audit
              </button>
           </div>
        </div>
      </div>
    </div>
  );
}
