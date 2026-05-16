"use client";

import { useState, useEffect, useCallback } from "react";
import { 
  AlertOctagon, ShieldAlert, Zap, Filter, 
  ArrowUpRight, AlertTriangle, CheckCircle2, 
  XCircle, Clock, Search, MoreVertical,
  ShieldCheck, Terminal, History, Loader2,
  Activity, ShieldX, Info, Database,
  Cpu, Lock, Fingerprint, RefreshCcw,
  Skull, Siren, Radio, Target
} from "lucide-react";
import { api } from "@/lib/api";

interface GovernanceException {
  id: string;
  exception_type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  status: string;
  content: string;
  risk_level: string;
  feedback: string;
  created_at: string;
  platform: string;
  creator: {
    full_name: string;
    email: string;
  };
}

export default function ExceptionsPage() {
  const [exceptions, setExceptions] = useState<GovernanceException[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [selectedIncident, setSelectedIncident] = useState<string | null>(null);

  const fetchExceptions = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.get('/api/v1/governance/exceptions');
      if (result.success) {
        setExceptions(result.data);
      }
    } catch (err) {
      console.error("Failed to fetch exceptions:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleResolve = async (id: string) => {
    try {
      const result = await api.post('/api/v1/governance/exceptions/resolve', { 
        intentId: id, 
        resolution: "Manually resolved via Incident Command Center",
        override: true 
      });
      if (result.success) {
        setExceptions(prev => prev.filter(ex => ex.id !== id));
        if (selectedIncident === id) setSelectedIncident(null);
      }
    } catch (err) {
      console.error("Failed to resolve exception:", err);
    }
  };

  useEffect(() => {
    fetchExceptions();
  }, [fetchExceptions]);

  const filteredExceptions = exceptions.filter(ex => {
    if (filter === 'ALL') return true;
    return ex.exception_type.toUpperCase().includes(filter);
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-12 pb-32 bg-black min-h-screen">
      {/* Hero: Incident Command & Control */}
      <div className="relative overflow-hidden bg-slate-950 border border-rose-500/30 rounded-[4rem] p-16 shadow-[0_0_100px_rgba(244,63,94,0.15)]">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-rose-600/10 blur-[200px] rounded-full -mr-80 -mt-80 animate-pulse" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-amber-600/5 blur-[150px] rounded-full -ml-40 -mb-40" />
        
        <div className="relative z-10 flex flex-col xl:flex-row items-center justify-between gap-16">
          <div className="max-w-3xl space-y-8">
            <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-rose-500/5 border border-rose-500/20 text-rose-400 text-[10px] font-black uppercase tracking-[0.4em] mb-2 shadow-inner backdrop-blur-md">
              <Siren className="w-4 h-4 animate-pulse" />
              Vertex Incident Response Protocol Active
            </div>
            <h1 className="text-7xl font-black text-white tracking-tighter leading-[0.85] drop-shadow-2xl">
              Incident <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-rose-600 italic">Command.</span>
            </h1>
            <p className="text-xl text-slate-400 leading-relaxed max-w-2xl font-medium tracking-tight">
              Monitor, investigate, and neutralize governance anomalies. Vertex Identity ensures 
              absolute forensic accountability for every override and resolution.
            </p>
            <div className="flex flex-wrap items-center gap-8 pt-4">
              <div className="flex flex-col">
                <span className="text-white font-black text-3xl tracking-tighter">{exceptions.length}</span>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Active Threats</span>
              </div>
              <div className="w-px h-12 bg-slate-800" />
              <div className="flex flex-col">
                <span className="text-rose-400 font-black text-3xl tracking-tighter">
                  {exceptions.filter(e => e.severity === 'HIGH').length}
                </span>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Critical Alarms</span>
              </div>
              <div className="w-px h-12 bg-slate-800" />
              <div className="flex flex-col">
                <span className="text-emerald-400 font-black text-3xl tracking-tighter">Locked</span>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Forensic Vault</span>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col items-center gap-6">
            <div className="relative group">
              <div className="absolute -inset-2 bg-rose-500 rounded-full blur opacity-20 group-hover:opacity-40 transition-all duration-1000 animate-pulse" />
              <div className="relative w-48 h-48 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center shadow-2xl">
                <Skull className="w-24 h-24 text-rose-500 drop-shadow-[0_0_30px_rgba(244,63,94,0.6)]" />
                <div className="absolute inset-0 rounded-full border-2 border-dashed border-rose-500/20 animate-[spin_15s_linear_infinite]" />
              </div>
            </div>
            <button className="px-8 py-3 bg-rose-600/10 border border-rose-500/20 text-rose-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-600 hover:text-white transition-all">
              Initiate Lockdown
            </button>
          </div>
        </div>
      </div>

      {/* Incident Ticker */}
      <div className="bg-black/80 border-y border-rose-950 overflow-hidden py-3 whitespace-nowrap flex items-center gap-8 relative">
        <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-black to-transparent z-10" />
        <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-black to-transparent z-10" />
        <div className="flex items-center gap-12 animate-[marquee_40s_linear_infinite]">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="flex items-center gap-4">
              <Radio className="w-3 h-3 text-rose-500 animate-pulse" />
              <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest">
                ALERT: Anomalous Activity Detected in EU Region // Code: RED-42
              </span>
              <div className="w-2 h-2 rounded-full bg-slate-800" />
            </div>
          ))}
        </div>
      </div>

      {/* Strategic Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Incident List */}
        <div className="lg:col-span-8 space-y-8">
          <div className="flex items-center justify-between px-6">
            <div className="flex items-center gap-4">
              <Activity className="w-5 h-5 text-rose-500" />
              <h2 className="text-xl font-black text-white uppercase tracking-tighter italic">Threat Feed</h2>
            </div>
            <div className="flex items-center gap-2">
              {['ALL', 'POLICY', 'TECHNICAL', 'QA'].map(f => (
                <button 
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${filter === f ? 'bg-rose-600 text-white shadow-lg' : 'bg-slate-900 text-slate-500 hover:text-white'}`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 bg-slate-900/10 border border-slate-800 border-dashed rounded-[3rem]">
                <Loader2 className="w-8 h-8 text-rose-500 animate-spin mb-4" />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Synchronizing Intelligence...</span>
              </div>
            ) : filteredExceptions.length === 0 ? (
              <div className="py-32 text-center bg-slate-900/10 border border-slate-800 border-dashed rounded-[3rem]">
                <ShieldCheck className="w-16 h-16 mx-auto mb-6 text-emerald-500/20" />
                <h3 className="text-2xl font-black text-slate-400 uppercase tracking-tighter italic">Status: SECURE</h3>
                <p className="text-xs text-slate-600 mt-2 font-bold uppercase tracking-widest">No active governance breaches detected.</p>
              </div>
            ) : (
              filteredExceptions.map((ex) => (
                <div 
                  key={ex.id} 
                  onClick={() => setSelectedIncident(ex.id)}
                  className={`
                    bg-slate-950 border rounded-[3rem] p-8 transition-all cursor-pointer group relative overflow-hidden
                    ${selectedIncident === ex.id ? 'border-rose-500 shadow-[0_0_40px_rgba(244,63,94,0.1)]' : 'border-slate-900 hover:border-rose-500/40 shadow-2xl'}
                  `}
                >
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-rose-600 opacity-0 group-hover:opacity-100 transition-all" />
                  
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
                    <div className="flex items-start gap-6">
                      <div className={`
                        w-16 h-16 rounded-[1.5rem] flex items-center justify-center shrink-0 shadow-inner
                        ${ex.severity === 'HIGH' ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}
                      `}>
                        {ex.severity === 'HIGH' ? <ShieldX className="w-8 h-8" /> : <AlertTriangle className="w-8 h-8" />}
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <h4 className="text-2xl font-black text-white tracking-tighter group-hover:text-rose-400 transition-colors italic">{ex.exception_type}</h4>
                          <span className="text-[10px] px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-500 font-bold uppercase tracking-widest">
                            {ex.platform}
                          </span>
                        </div>
                        <p className="text-sm text-slate-400 line-clamp-1 italic max-w-lg font-medium">
                          &quot;{ex.content}&quot;
                        </p>
                        <div className="flex items-center gap-6 pt-1">
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{ex.creator?.full_name}</span>
                          </div>
                          <div className="flex items-center gap-2 text-slate-600">
                            <Clock className="w-3.5 h-3.5" />
                            <span className="text-[9px] font-bold uppercase">{new Date(ex.created_at).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto">
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleResolve(ex.id); }}
                        className="flex-1 md:flex-none px-8 py-3.5 bg-white text-black hover:bg-rose-600 hover:text-white rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-xl active:scale-95"
                      >
                        Resolve
                      </button>
                      <button className="p-3.5 bg-slate-900 border border-slate-800 rounded-[1.5rem] text-slate-600 hover:text-white transition-all">
                        <MoreVertical className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  
                  {selectedIncident === ex.id && (
                    <div className="mt-8 pt-8 border-t border-slate-900 grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-top-4 duration-500">
                      <div className="bg-black/40 rounded-[2rem] p-6 border border-slate-900 space-y-4">
                        <div className="flex items-center gap-2">
                          <Terminal className="w-4 h-4 text-rose-500" />
                          <span className="text-[9px] font-black text-rose-500 uppercase tracking-[0.2em]">Forensic Trace</span>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed font-medium">
                          Incident triggered by [Rule: GOV-42X] due to restricted keyword detection. 
                          Logical consistency check: <span className="text-rose-400">FAILED</span>.
                        </p>
                      </div>
                      <div className="bg-black/40 rounded-[2rem] p-6 border border-slate-900 space-y-4">
                        <div className="flex items-center gap-2">
                          <Lock className="w-4 h-4 text-rose-500" />
                          <span className="text-[9px] font-black text-rose-500 uppercase tracking-[0.2em]">Resolution Logic</span>
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed italic">
                           {ex.feedback || "Awaiting expert intervention for forensic resolution."}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Intelligence Sidebar */}
        <div className="lg:col-span-4 space-y-8">
          {/* Forensic Health Matrix */}
          <div className="bg-slate-950 border border-slate-800 rounded-[3rem] p-10 shadow-2xl relative overflow-hidden">
             <div className="absolute top-0 right-0 p-6 opacity-5">
                <Target className="w-32 h-32 text-rose-500" />
             </div>
             
             <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em] mb-10">Forensic Matrix</h3>
             
             <div className="space-y-10">
                <div className="space-y-4">
                   <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Threat Neutralization</span>
                      <span className="text-xs font-black text-rose-400">92%</span>
                   </div>
                   <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden shadow-inner">
                      <div className="h-full bg-rose-500 w-[92%] shadow-[0_0_10px_rgba(244,63,94,0.5)]" />
                   </div>
                </div>
                
                <div className="space-y-4">
                   <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Audit Accuracy</span>
                      <span className="text-xs font-black text-rose-400">100%</span>
                   </div>
                   <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden shadow-inner">
                      <div className="h-full bg-rose-500 w-[100%] shadow-[0_0_10px_rgba(244,63,94,0.5)]" />
                   </div>
                </div>

                <div className="pt-6 grid grid-cols-2 gap-4">
                   <div className="p-4 bg-slate-900/60 border border-slate-800/60 rounded-2xl text-center">
                      <div className="text-2xl font-black text-white tracking-tighter">0.8s</div>
                      <div className="text-[8px] font-black text-slate-600 uppercase tracking-widest mt-1">Mean Response</div>
                   </div>
                   <div className={`p-4 rounded-2xl text-center border ${exceptions.length > 0 ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : 'bg-slate-900/60 border-slate-800/60 text-white'}`}>
                      <div className="text-2xl font-black tracking-tighter">{exceptions.length}</div>
                      <div className="text-[8px] font-black uppercase tracking-widest mt-1">Active Alerts</div>
                   </div>
                </div>
             </div>
          </div>

          {/* Audit History Timeline */}
          <div className="bg-rose-950/10 border border-rose-500/20 rounded-[3rem] p-10 shadow-2xl space-y-8 backdrop-blur-sm relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-10">
                <History className="w-12 h-12 text-rose-500" />
             </div>
             <div>
                <h3 className="text-[11px] font-black text-rose-400 uppercase tracking-[0.4em] mb-2">Resolution Chain</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed">Cryptographic audit trail of all neutralized threats.</p>
             </div>
             
             <div className="space-y-6 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-px before:bg-rose-950">
                {[
                  { label: 'Incident #42 Resolved', time: '12m ago', icon: ShieldCheck, color: 'text-emerald-400' },
                  { label: 'Security Override Initiated', time: '1.4h ago', icon: Zap, color: 'text-amber-400' },
                  { label: 'Threat Cluster Detected', time: '3.2h ago', icon: Radio, color: 'text-rose-400' }
                ].map((item, i) => (
                  <div key={i} className="relative pl-10 group">
                    <div className="absolute left-0 top-1.5 w-8 h-8 rounded-xl bg-black border border-slate-800 flex items-center justify-center group-hover:border-rose-500 transition-all">
                       <item.icon className={`w-4 h-4 ${item.color}`} />
                    </div>
                    <div className="text-[10px] font-black text-white uppercase tracking-widest">{item.label}</div>
                    <div className="text-[8px] text-slate-600 font-bold uppercase tracking-tighter">{item.time}</div>
                  </div>
                ))}
             </div>

             <button className="w-full bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all">
                Download Global Incident Report
             </button>
          </div>
        </div>
      </div>
    </div>
  );
}
