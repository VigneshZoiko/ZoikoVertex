"use client";

import { useState } from "react";
import { 
  ShieldCheck, Globe, Zap, Filter, Plus, 
  ChevronRight, Users, Scale, Layout, 
  Smartphone, Flag, Briefcase, Search,
  Settings2, MoreVertical, Edit2, Trash2,
  Activity, Fingerprint, Database, Cpu,
  Eye, Terminal, Code2, Network,
  BarChart3, Target, Sparkles
} from "lucide-react";

interface ApprovalRule {
  id: string;
  name: string;
  dimensions: {
    brand?: string;
    region?: string;
    market?: string;
    platform?: string;
    risk?: string;
    type?: string;
  };
  path: string[];
  status: 'active' | 'draft';
  hits: number;
  latency: string;
}

export default function GovernanceRulesPage() {
  const [rules, setRules] = useState<ApprovalRule[]>([
    {
      id: 'r1',
      name: 'EU High-Risk Financial Protocol',
      dimensions: { region: 'EU', risk: 'HIGH', type: 'Financial' },
      path: ['MANAGER', 'COMPLIANCE', 'LEGAL', 'ADMIN'],
      status: 'active',
      hits: 1242,
      latency: '1.4h'
    },
    {
      id: 'r2',
      name: 'Global Instagram Creative Flow',
      dimensions: { platform: 'Instagram', brand: 'Main' },
      path: ['CREATIVE_DIR', 'MANAGER'],
      status: 'active',
      hits: 8560,
      latency: '0.8h'
    },
    {
      id: 'r3',
      name: 'Standard Twitter Operations',
      dimensions: { platform: 'X (Twitter)', risk: 'LOW' },
      path: ['MANAGER'],
      status: 'active',
      hits: 15201,
      latency: '0.2h'
    },
    {
      id: 'r4',
      name: 'APAC Market Entry Campaign',
      dimensions: { region: 'APAC', market: 'Emerging' },
      path: ['REGION_HEAD', 'MANAGER', 'ADMIN'],
      status: 'active',
      hits: 412,
      latency: '2.5h'
    }
  ]);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-12 pb-32 bg-black min-h-screen">
      {/* Hero Section: Governance Command Center */}
      <div className="relative overflow-hidden bg-slate-950 border border-indigo-500/30 rounded-[4rem] p-16 shadow-[0_0_80px_rgba(79,70,229,0.15)]">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-600/10 blur-[180px] rounded-full -mr-80 -mt-80 animate-pulse" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-emerald-600/5 blur-[120px] rounded-full -ml-40 -mb-40" />
        
        <div className="relative z-10 flex flex-col xl:flex-row items-center justify-between gap-16">
          <div className="max-w-3xl space-y-8">
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-indigo-500/5 border border-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-[0.4em] mb-2 shadow-inner backdrop-blur-md">
              <Cpu className="w-4 h-4 animate-spin-slow" />
              Vertex Governance Logic Engine v4.0
            </div>
            <h1 className="text-7xl font-black text-white tracking-tighter leading-[0.85] drop-shadow-2xl">
              Policy <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-indigo-600 italic">Architect.</span>
            </h1>
            <p className="text-xl text-slate-400 leading-relaxed max-w-2xl font-medium tracking-tight">
              Design granular approval paths using high-dimensional conditional logic. 
              Vertex automatically orchestrates the most secure route for every asset deployment.
            </p>
            <div className="flex flex-wrap items-center gap-8 pt-4">
              <div className="flex flex-col">
                <span className="text-white font-black text-3xl tracking-tighter">42.8k</span>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Decisions/Mo</span>
              </div>
              <div className="w-px h-12 bg-slate-800" />
              <div className="flex flex-col">
                <span className="text-emerald-400 font-black text-3xl tracking-tighter">0.00ms</span>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Routing Latency</span>
              </div>
              <div className="w-px h-12 bg-slate-800" />
              <div className="flex flex-col">
                <span className="text-indigo-400 font-black text-3xl tracking-tighter">Verified</span>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Logic Integrity</span>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <button className="px-10 py-5 bg-white text-black rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] flex items-center gap-3 hover:bg-indigo-600 hover:text-white transition-all shadow-[0_20px_50px_rgba(255,255,255,0.1)] active:scale-95 group">
              <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" /> Create Protocol
            </button>
            <button className="p-5 bg-slate-900 border border-slate-800 rounded-[2rem] text-slate-400 hover:text-white hover:border-slate-600 transition-all shadow-2xl">
              <Settings2 className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>

      {/* Logic Dimension Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-6">
        {[
          { label: 'Brand', icon: Layout, color: 'text-indigo-400', glow: 'shadow-indigo-500/20' },
          { label: 'Market', icon: Briefcase, color: 'text-emerald-400', glow: 'shadow-emerald-500/20' },
          { label: 'Region', icon: Globe, color: 'text-blue-400', glow: 'shadow-blue-500/20' },
          { label: 'Type', icon: Flag, color: 'text-amber-400', glow: 'shadow-amber-500/20' },
          { label: 'Platform', icon: Smartphone, color: 'text-rose-400', glow: 'shadow-rose-500/20' },
          { label: 'Risk', icon: Scale, color: 'text-purple-400', glow: 'shadow-purple-500/20' },
          { label: 'Campaign', icon: Search, color: 'text-cyan-400', glow: 'shadow-cyan-500/20' },
        ].map((dim, i) => (
          <div key={i} className={`bg-slate-900/30 border border-slate-800 rounded-[2rem] p-6 flex flex-col items-center justify-center gap-4 hover:bg-slate-900/60 hover:border-indigo-500/40 transition-all cursor-pointer group shadow-xl hover:${dim.glow}`}>
            <div className={`p-4 rounded-2xl bg-black/40 border border-slate-800/60 ${dim.color} group-hover:scale-110 transition-transform shadow-inner`}>
              <dim.icon className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 group-hover:text-slate-200 transition-colors">
              {dim.label}
            </span>
          </div>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Rules Explorer */}
        <div className="lg:col-span-8 space-y-8">
          <div className="flex items-center justify-between mb-2 px-6">
            <div className="flex items-center gap-4">
              <Network className="w-5 h-5 text-indigo-400" />
              <h2 className="text-xl font-black text-white uppercase tracking-tighter italic">Orchestration Protocols</h2>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />
              <input 
                type="text" 
                placeholder="Search logic..." 
                className="bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-[10px] text-slate-400 focus:outline-none focus:border-indigo-500 transition-all w-64 uppercase tracking-widest"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {rules.map((rule) => (
              <div key={rule.id} className="bg-slate-950 border border-slate-900 rounded-[3rem] p-10 hover:border-indigo-500/30 transition-all group relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-600/0 group-hover:bg-indigo-600 transition-all" />
                
                <div className="flex flex-col gap-10">
                  <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.6)] animate-pulse" />
                        <h3 className="text-2xl font-black text-white tracking-tighter group-hover:text-indigo-400 transition-colors italic">{rule.name}</h3>
                      </div>
                      <div className="flex flex-wrap gap-2 pt-2">
                        {Object.entries(rule.dimensions).map(([key, val]) => (
                          <div key={key} className="flex items-center bg-slate-900/60 border border-slate-800/60 rounded-xl px-4 py-2 gap-2 group-hover:border-slate-700 transition-all">
                             <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">{key}:</span>
                             <span className="text-[10px] font-black text-slate-200 uppercase tracking-widest">{val}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6 shrink-0 bg-slate-900/30 p-4 rounded-3xl border border-slate-800/60">
                       <div className="text-center">
                          <div className="text-xs font-black text-white">{rule.hits.toLocaleString()}</div>
                          <div className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Total Hits</div>
                       </div>
                       <div className="w-px h-8 bg-slate-800" />
                       <div className="text-center">
                          <div className="text-xs font-black text-indigo-400">{rule.latency}</div>
                          <div className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Avg Latency</div>
                       </div>
                    </div>
                  </div>

                  {/* High-Fidelity Path Visualization */}
                  <div className="bg-black/40 rounded-[2.5rem] border border-slate-900/60 p-8 overflow-x-auto no-scrollbar shadow-inner">
                    <div className="flex items-center gap-6">
                      {rule.path.map((step, idx) => (
                        <div key={idx} className="flex items-center gap-6 shrink-0">
                          <div className="relative group/step">
                            <div className={`
                              absolute -inset-2 rounded-3xl blur opacity-0 group-hover/step:opacity-20 transition-all
                              ${idx === 0 ? 'bg-indigo-500' : 'bg-slate-500'}
                            `} />
                            <div className={`
                              relative w-16 h-16 rounded-[1.5rem] flex flex-col items-center justify-center gap-1.5 transition-all border
                              ${idx === 0 ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-slate-900 border-slate-800 text-slate-500 group-hover:border-indigo-500/30'}
                            `}>
                              <Users className="w-6 h-6" />
                              <span className="text-[8px] font-black uppercase tracking-tighter text-center leading-none">
                                {step.replace('_', ' ')}
                              </span>
                            </div>
                            {idx === 0 && (
                               <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-4 border-black" />
                            )}
                          </div>
                          {idx < rule.path.length - 1 && (
                            <div className="flex flex-col items-center gap-1">
                               <ChevronRight className="w-5 h-5 text-slate-800 group-hover:text-indigo-500/50 transition-colors" />
                               <div className="w-8 h-px bg-slate-900" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4">
                    <div className="flex items-center gap-2">
                       <Terminal className="w-3.5 h-3.5 text-slate-600" />
                       <span className="text-[9px] font-black text-slate-600 uppercase tracking-[0.2em]">Logic ID: {rule.id.toUpperCase()}0X42</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <button className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 border border-slate-800 rounded-2xl text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-white hover:border-indigo-500/30 transition-all">
                        <Edit2 className="w-3.5 h-3.5" /> Modify Logic
                      </button>
                      <button className="p-3 bg-slate-900 border border-slate-800 rounded-2xl text-slate-600 hover:text-rose-400 transition-all">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Intelligence Sidebar */}
        <div className="lg:col-span-4 space-y-8">
          {/* Real-time Health Monitor */}
          <div className="bg-slate-950 border border-slate-800 rounded-[3rem] p-10 shadow-2xl relative overflow-hidden">
             <div className="absolute top-0 right-0 p-6 opacity-5">
                <Activity className="w-32 h-32 text-emerald-500" />
             </div>
             
             <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em] mb-10">Governance Health</h3>
             
             <div className="space-y-10">
                <div className="space-y-4">
                   <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Logical Consistency</span>
                      <span className="text-xs font-black text-emerald-400">99.9%</span>
                   </div>
                   <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden shadow-inner">
                      <div className="h-full bg-emerald-500 w-[99.9%] shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                   </div>
                </div>
                
                <div className="space-y-4">
                   <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Enforcement Coverage</span>
                      <span className="text-xs font-black text-indigo-400">100%</span>
                   </div>
                   <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden shadow-inner">
                      <div className="h-full bg-indigo-500 w-[100%] shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
                   </div>
                </div>

                <div className="pt-6 grid grid-cols-2 gap-4">
                   <div className="p-4 bg-slate-900/60 border border-slate-800/60 rounded-2xl text-center">
                      <div className="text-2xl font-black text-white tracking-tighter">0</div>
                      <div className="text-[8px] font-black text-slate-600 uppercase tracking-widest mt-1">Rule Conflicts</div>
                   </div>
                   <div className="p-4 bg-slate-900/60 border border-slate-800/60 rounded-2xl text-center">
                      <div className="text-2xl font-black text-indigo-400 tracking-tighter">4</div>
                      <div className="text-[8px] font-black text-slate-600 uppercase tracking-widest mt-1">Active Clusters</div>
                   </div>
                </div>
             </div>
          </div>

          {/* Logic Sandbox Simulation */}
          <div className="bg-indigo-950/20 border border-indigo-500/20 rounded-[3rem] p-10 shadow-2xl space-y-8 backdrop-blur-sm relative overflow-hidden">
             <div className="absolute -top-4 -right-4">
                <Sparkles className="w-12 h-12 text-indigo-500/20" />
             </div>
             <div>
                <h3 className="text-[11px] font-black text-indigo-400 uppercase tracking-[0.4em] mb-2">Policy Sandbox</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed">Simulate governance routing before deployment.</p>
             </div>
             
             <div className="space-y-4">
                <div className="space-y-2">
                   <label className="text-[8px] font-black text-slate-600 uppercase tracking-[0.2em] ml-2">Test Dimension</label>
                   <select className="w-full bg-black/60 border border-slate-800 rounded-2xl p-4 text-[10px] text-white font-black uppercase tracking-widest outline-none focus:border-indigo-500 transition-all appearance-none">
                      <option>EU - FINANCIAL - HIGH RISK</option>
                      <option>APAC - CREATIVE - LOW RISK</option>
                      <option>GLOBAL - BRAND - MEDIUM RISK</option>
                   </select>
                </div>
                <button className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-4.5 rounded-[2rem] font-black text-[10px] uppercase tracking-[0.3em] shadow-xl shadow-indigo-600/20 transition-all active:scale-95 flex items-center justify-center gap-3">
                   Run Logic Trace <Target className="w-3.5 h-3.5" />
                </button>
             </div>
             
             <div className="p-6 bg-black/40 rounded-[2rem] border border-slate-900/60">
                <div className="flex items-center gap-2 mb-4">
                   <Code2 className="w-3.5 h-3.5 text-slate-700" />
                   <span className="text-[8px] font-black text-slate-700 uppercase tracking-widest">Logic Resolution Trace</span>
                </div>
                <div className="space-y-2 font-mono text-[9px] text-slate-600">
                   <p>&gt; Initializing trace for cluster [EU]...</p>
                   <p>&gt; Matching dimensions [Risk=HIGH]...</p>
                   <p>&gt; Protocol found: [R1-EU-FINANCIAL]</p>
                   <p className="text-indigo-400">&gt; Resolved Path: MANAGER -&gt; LEGAL -&gt; ADMIN</p>
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* Global Logic Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-12 border-t border-slate-900">
        {[
          { label: 'Network Integrity', value: '100%', detail: 'Zero-trust logic active', icon: ShieldCheck, color: 'text-emerald-400' },
          { label: 'Logic Efficiency', value: '0.00ms', detail: 'Real-time execution', icon: Zap, color: 'text-indigo-400' },
          { label: 'Compliance Lock', value: 'Enabled', detail: 'Vertex legal guardrails', icon: Fingerprint, color: 'text-amber-400' },
        ].map((stat, i) => (
          <div key={i} className="bg-slate-900/10 border border-slate-800/60 rounded-[2.5rem] p-8 flex items-center gap-6 group hover:bg-slate-900/30 transition-all shadow-xl">
            <div className="w-16 h-16 rounded-[1.5rem] bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <stat.icon className={`w-7 h-7 ${stat.color}`} />
            </div>
            <div>
              <div className="text-3xl font-black text-white tracking-tighter leading-none mb-1">{stat.value}</div>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">{stat.label}</div>
              <div className="text-[9px] text-slate-700 font-medium mt-2">{stat.detail}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

