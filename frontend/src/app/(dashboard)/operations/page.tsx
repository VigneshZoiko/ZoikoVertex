"use client";

import { useState, useEffect, useMemo } from "react";
import { 
  Activity, Cpu, Database, Globe, 
  Layers, Zap, ShieldCheck, Terminal,
  RefreshCcw, BarChart3, Target, Compass,
  Server, Network, Radio, ZapOff,
  ChevronRight, ArrowRight, Eye, Search
} from "lucide-react";

const CHART_MOCK_DATA = [45, 52, 38, 65, 48, 55, 60, 42, 35, 70, 58, 62, 40, 50, 45, 68, 72, 55, 48, 60, 55, 50, 42, 58];

export default function OperationsPage() {
  const [activeSystem, setActiveSystem] = useState("Vertex Core");
  
  const chartData = CHART_MOCK_DATA;
  
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-12 pb-32 bg-black min-h-screen">
      {/* Hero: Global Operations Control */}
      <div className="relative overflow-hidden bg-slate-950 border border-cyan-500/30 rounded-[4rem] p-16 shadow-[0_0_100px_rgba(6,182,212,0.15)]">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-cyan-600/10 blur-[200px] rounded-full -mr-80 -mt-80 animate-pulse" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-600/5 blur-[150px] rounded-full -ml-40 -mb-40" />
        
        <div className="relative z-10 flex flex-col xl:flex-row items-center justify-between gap-16">
          <div className="max-w-3xl space-y-8">
            <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-cyan-500/5 border border-cyan-500/20 text-cyan-400 text-[10px] font-black uppercase tracking-[0.4em] mb-2 shadow-inner backdrop-blur-md">
              <Activity className="w-4 h-4 animate-pulse" />
              Global Mission Control Active
            </div>
            <h1 className="text-7xl font-black text-white tracking-tighter leading-[0.85] drop-shadow-2xl">
              System <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-600 italic">Operations.</span>
            </h1>
            <p className="text-xl text-slate-400 leading-relaxed max-w-2xl font-medium tracking-tight">
              Monitor, orchestrate, and optimize the entire ZoikoVertex intelligence network. 
              Real-time resource allocation and autonomous agent management at scale.
            </p>
            <div className="flex flex-wrap items-center gap-8 pt-4">
              <div className="flex flex-col">
                <span className="text-white font-black text-3xl tracking-tighter">99.99%</span>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Uptime Pulse</span>
              </div>
              <div className="w-px h-12 bg-slate-800" />
              <div className="flex flex-col">
                <span className="text-cyan-400 font-black text-3xl tracking-tighter">42ms</span>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Global Latency</span>
              </div>
              <div className="w-px h-12 bg-slate-800" />
              <div className="flex flex-col">
                <span className="text-indigo-400 font-black text-3xl tracking-tighter">Healthy</span>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Core Integrity</span>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col items-center gap-6">
            <div className="relative group">
              <div className="absolute -inset-2 bg-cyan-500 rounded-full blur opacity-20 group-hover:opacity-40 transition-all duration-1000 animate-pulse" />
              <div className="relative w-56 h-56 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center shadow-2xl overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-cyan-500/10 via-transparent to-transparent" />
                <Globe className="w-28 h-28 text-cyan-500 drop-shadow-[0_0_40px_rgba(6,182,212,0.6)] animate-[spin_60s_linear_infinite]" />
                <div className="absolute inset-4 rounded-full border border-cyan-500/10 animate-[spin_20s_linear_infinite]" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Real-time Telemetry Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Intelligence Load', value: '42%', icon: Cpu, color: 'text-cyan-400', glow: 'shadow-cyan-500/20' },
          { label: 'Data Throughput', value: '1.2 GB/s', icon: Database, color: 'text-indigo-400', glow: 'shadow-indigo-500/20' },
          { label: 'Network Mesh', value: 'Active', icon: Network, color: 'text-emerald-400', glow: 'shadow-emerald-500/20' },
          { label: 'Cloud Capacity', value: 'High', icon: Server, color: 'text-amber-400', glow: 'shadow-amber-500/20' },
        ].map((stat, i) => (
          <div key={i} className={`bg-slate-950 border border-slate-900 rounded-[2.5rem] p-8 hover:border-cyan-500/40 transition-all group shadow-2xl hover:${stat.glow}`}>
            <div className="flex items-center justify-between mb-8">
               <div className={`p-4 rounded-2xl bg-black border border-slate-800 ${stat.color} group-hover:scale-110 transition-transform shadow-inner`}>
                  <stat.icon className="w-6 h-6" />
               </div>
               <div className="text-3xl font-black text-white tracking-tighter">{stat.value}</div>
            </div>
            <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 group-hover:text-slate-200 transition-colors">
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Operational Hub */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: System Health & Monitoring */}
        <div className="lg:col-span-8 space-y-8">
           <div className="bg-slate-950 border border-slate-900 rounded-[3rem] p-10 shadow-2xl relative overflow-hidden">
              <div className="flex items-center justify-between mb-10">
                 <div className="flex items-center gap-4">
                    <Radio className="w-5 h-5 text-cyan-400" />
                    <h2 className="text-xl font-black text-white uppercase tracking-tighter italic">Operational Health</h2>
                 </div>
                 <div className="flex items-center gap-2 px-4 py-2 bg-black border border-slate-800 rounded-xl">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">All Systems Operational</span>
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                 {/* Visual Pulse Chart Simulator */}
                 <div className="space-y-6">
                    <div className="flex items-center justify-between">
                       <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">System Latency Trace</span>
                       <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">Real-time</span>
                    </div>
                    <div className="h-40 bg-black/60 rounded-[2rem] border border-slate-900/60 p-6 flex items-end gap-1.5 shadow-inner overflow-hidden">
                       {chartData.map((h, i) => (
                         <div 
                           key={i} 
                           className="flex-1 bg-cyan-500/20 rounded-full group-hover:bg-cyan-500/40 transition-all animate-pulse" 
                           style={{ 
                             height: `${h}%`,
                             animationDelay: `${i * 100}ms`
                           }} 
                         />
                       ))}
                    </div>
                    <div className="flex justify-between text-[8px] font-bold text-slate-600 uppercase tracking-[0.2em]">
                       <span>T-60s</span>
                       <span>Current State</span>
                    </div>
                 </div>

                 {/* Metric Breakdown */}
                 <div className="space-y-6">
                    {[
                      { label: 'API Response', value: '124ms', score: 98, color: 'bg-emerald-500' },
                      { label: 'AI Inference', value: '0.8s', score: 85, color: 'bg-cyan-500' },
                      { label: 'Database I/O', value: '1.2ms', score: 92, color: 'bg-indigo-500' },
                    ].map((m, i) => (
                      <div key={i} className="space-y-3">
                         <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{m.label}</span>
                            <span className="text-xs font-black text-white">{m.value}</span>
                         </div>
                         <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                            <div className={`h-full ${m.color}`} style={{ width: `${m.score}%` }} />
                         </div>
                      </div>
                    ))}
                 </div>
              </div>
           </div>

           {/* Live Operational Logs */}
           <div className="bg-black border border-slate-900 rounded-[3rem] p-10 shadow-2xl space-y-8">
              <div className="flex items-center justify-between">
                 <div className="flex items-center gap-4">
                    <Terminal className="w-5 h-5 text-indigo-400" />
                    <h2 className="text-xl font-black text-white uppercase tracking-tighter italic">Mission Log Trace</h2>
                 </div>
                 <button className="text-[10px] font-black text-slate-600 hover:text-white uppercase tracking-widest transition-all">Clear Logs</button>
              </div>

              <div className="bg-slate-950/40 border border-slate-900/60 rounded-[2.5rem] p-8 font-mono text-[11px] leading-relaxed space-y-3 h-64 overflow-y-auto no-scrollbar shadow-inner">
                 <div className="flex gap-4">
                    <span className="text-slate-700 shrink-0">[14:22:01]</span>
                    <span className="text-indigo-400 font-bold uppercase tracking-widest">System</span>
                    <span className="text-slate-400 italic">Initializing autonomous agent handoff for EU cluster...</span>
                 </div>
                 <div className="flex gap-4">
                    <span className="text-slate-700 shrink-0">[14:22:05]</span>
                    <span className="text-emerald-400 font-bold uppercase tracking-widest">Auth</span>
                    <span className="text-slate-400 italic">Cryptographic signature verified for user: Kailanaresh</span>
                 </div>
                 <div className="flex gap-4">
                    <span className="text-slate-700 shrink-0">[14:22:12]</span>
                    <span className="text-cyan-400 font-bold uppercase tracking-widest">Vertex</span>
                    <span className="text-slate-400 italic">Content optimization engine deployed to production pipeline.</span>
                 </div>
                 <div className="flex gap-4">
                    <span className="text-slate-700 shrink-0">[14:22:18]</span>
                    <span className="text-amber-400 font-bold uppercase tracking-widest">Gov</span>
                    <span className="text-slate-400 italic">Policy conflict detected in Rule: R1-EU-FINANCIAL. Neutralizing...</span>
                 </div>
                 <div className="flex gap-4">
                    <span className="text-slate-700 shrink-0">[14:22:25]</span>
                    <span className="text-cyan-400 font-bold uppercase tracking-widest">Vertex</span>
                    <span className="text-slate-400 italic">Threat neutralized. Resolution log: #X42.</span>
                 </div>
              </div>
           </div>
        </div>

        {/* Right: Operational Controls */}
        <div className="lg:col-span-4 space-y-8">
           {/* Active Agent Status */}
           <div className="bg-slate-950 border border-slate-800 rounded-[3rem] p-10 shadow-2xl relative overflow-hidden">
              <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em] mb-10">Active Intelligence</h3>
              
              <div className="space-y-4">
                 {[
                   { name: 'Forensic Engine', status: 'Optimal', load: '12%', color: 'text-cyan-400' },
                   { name: 'Governance Core', status: 'Active', load: '24%', color: 'text-indigo-400' },
                   { name: 'Publishing Automata', status: 'Idle', load: '0%', color: 'text-slate-500' },
                 ].map((agent, i) => (
                   <div key={i} className="bg-slate-900/40 border border-slate-800/60 rounded-3xl p-6 flex items-center justify-between group hover:border-cyan-500/30 transition-all cursor-pointer shadow-xl">
                      <div className="space-y-1">
                         <div className="text-xs font-black text-white uppercase tracking-widest">{agent.name}</div>
                         <div className={`text-[9px] font-bold uppercase tracking-[0.2em] ${agent.color}`}>{agent.status}</div>
                      </div>
                      <div className="text-right">
                         <div className="text-sm font-black text-white">{agent.load}</div>
                         <div className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Load</div>
                      </div>
                   </div>
                 ))}
              </div>

              <button className="w-full mt-10 bg-white hover:bg-cyan-600 text-black hover:text-white py-5 rounded-[1.5rem] font-black text-xs uppercase tracking-[0.3em] shadow-xl transition-all active:scale-95">
                 Optimize Network
              </button>
           </div>

           {/* Global Compliance Lock */}
           <div className="bg-cyan-950/20 border border-cyan-500/20 rounded-[3rem] p-10 shadow-2xl space-y-8 backdrop-blur-sm relative overflow-hidden text-center">
              <div className="w-20 h-20 bg-black border border-slate-800 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                 <ShieldCheck className="w-10 h-10 text-cyan-400 drop-shadow-[0_0_20px_rgba(6,182,212,0.4)]" />
              </div>
              <div>
                 <h3 className="text-xl font-black text-white tracking-tighter uppercase italic">Secure Protocol</h3>
                 <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-2 leading-relaxed">System-wide governance lock is currently active.</p>
              </div>
              <div className="flex justify-center gap-3">
                 <div className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-[9px] font-black text-slate-400 uppercase tracking-widest">TLS 1.3</div>
                 <div className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-[9px] font-black text-slate-400 uppercase tracking-widest">AES-256</div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
