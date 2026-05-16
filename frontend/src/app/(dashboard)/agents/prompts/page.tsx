"use client";

import { useState, useEffect } from "react";
import { 
  MessageSquareCode, ShieldCheck, Zap, History, 
  Search, Filter, Plus, ChevronRight, 
  CheckCircle2, AlertCircle, Clock, Lock
} from "lucide-react";
import { api } from "@/lib/api";

interface PromptArtifact {
  id: string;
  name: string;
  version: string;
  status: 'ACTIVE' | 'PENDING' | 'DEPRECATED';
  description: string;
  last_updated: string;
  agents_deployed: number;
}

const MOCK_PROMPTS: PromptArtifact[] = [
  { id: 'pa-001', name: 'Standard Compliance Refusal', version: 'v2.4', status: 'ACTIVE', description: 'Universal safety refusal logic for restricted keywords.', last_updated: '2 hours ago', agents_deployed: 42 },
  { id: 'pa-002', name: 'Corporate Brand Voice', version: 'v1.8', status: 'ACTIVE', description: 'Tonal guardrails for professional LinkedIn engagement.', last_updated: '1 day ago', agents_deployed: 12 },
  { id: 'pa-003', name: 'Aggressive Growth Hack', version: 'v0.9', status: 'PENDING', description: 'Experimental high-velocity conversion prompt.', last_updated: 'Just now', agents_deployed: 0 },
  { id: 'pa-004', name: 'Legacy Support Prompt', version: 'v3.1', status: 'DEPRECATED', description: 'Old support response logic, replaced by v4.0.', last_updated: '1 week ago', agents_deployed: 3 },
];

export default function PromptsPage() {
  const [prompts, setPrompts] = useState<PromptArtifact[]>(MOCK_PROMPTS);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-12 pb-32 bg-black min-h-screen">
      {/* Header: Governance Context */}
      <div className="relative overflow-hidden bg-slate-950 border border-indigo-500/30 rounded-[4rem] p-16 shadow-[0_0_100px_rgba(99,102,241,0.15)]">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600/10 blur-[150px] rounded-full -mr-60 -mt-60 animate-pulse" />
        
        <div className="relative z-10 flex flex-col xl:flex-row items-center justify-between gap-12">
          <div className="max-w-2xl space-y-6">
            <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-indigo-500/5 border border-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-[0.4em] mb-2 shadow-inner">
              <Lock className="w-4 h-4" />
              Prompt Governance Center Active
            </div>
            <h1 className="text-6xl font-black text-white tracking-tighter leading-[0.85]">
              System <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-rose-600 italic">Directives.</span>
            </h1>
            <p className="text-lg text-slate-400 leading-relaxed font-medium tracking-tight">
              Manage the lifecycle of versioned prompt artifacts, safety guardrails, and refusal logic. 
              Enforce enterprise-grade consistency across your entire autonomous fleet.
            </p>
          </div>
          
          <button className="px-10 py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] flex items-center gap-3 transition-all shadow-xl shadow-indigo-600/20 active:scale-95 group">
             <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" /> New Directive
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          { label: 'Active Directives', value: '14', icon: ShieldCheck, color: 'text-emerald-400' },
          { label: 'Pending Approvals', value: '3', icon: Clock, color: 'text-amber-400' },
          { label: 'Total Deployed', value: '124', icon: Zap, color: 'text-indigo-400' },
        ].map((stat, i) => (
          <div key={i} className="bg-slate-950 border border-slate-900 rounded-[2.5rem] p-8 hover:border-indigo-500/40 transition-all group shadow-2xl relative overflow-hidden">
             <div className="flex items-center justify-between">
                <div className={`p-4 rounded-2xl bg-black border border-slate-800 ${stat.color} shadow-inner`}>
                   <stat.icon className="w-6 h-6" />
                </div>
                <div className="text-4xl font-black text-white tracking-tighter">{stat.value}</div>
             </div>
             <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mt-6 group-hover:text-slate-200 transition-colors">
               {stat.label}
             </div>
          </div>
        ))}
      </div>

      {/* Prompt Registry */}
      <div className="bg-[#050505] border border-slate-900 rounded-[3rem] p-10 shadow-2xl space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
           <div className="flex items-center gap-4">
              <MessageSquareCode className="w-5 h-5 text-indigo-400" />
              <h2 className="text-xl font-black text-white uppercase tracking-tighter italic">Directive Registry</h2>
           </div>
           <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input 
                type="text"
                placeholder="Search directives by name or version..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-black border border-slate-800 rounded-2xl py-3 pl-10 pr-4 text-xs text-white focus:outline-none focus:border-indigo-500 transition-all"
              />
           </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-900">
                <th className="py-4 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Artifact Name</th>
                <th className="py-4 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Version</th>
                <th className="py-4 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Status</th>
                <th className="py-4 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Deployments</th>
                <th className="py-4 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Last Update</th>
                <th className="py-4 px-6"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900">
              {prompts.filter(p => p.name.toLowerCase().includes(search.toLowerCase())).map((prompt) => (
                <tr key={prompt.id} className="hover:bg-slate-900/30 transition-colors group">
                  <td className="py-6 px-6">
                    <div className="space-y-1">
                      <div className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors">{prompt.name}</div>
                      <div className="text-[10px] text-slate-500 leading-relaxed max-w-xs">{prompt.description}</div>
                    </div>
                  </td>
                  <td className="py-6 px-6">
                    <span className="text-[10px] font-black text-slate-400 bg-black border border-slate-800 px-2 py-1 rounded-lg">
                      {prompt.version}
                    </span>
                  </td>
                  <td className="py-6 px-6">
                    <div className="flex items-center gap-2">
                       <div className={`w-1.5 h-1.5 rounded-full ${
                         prompt.status === 'ACTIVE' ? 'bg-emerald-500' :
                         prompt.status === 'PENDING' ? 'bg-amber-500' :
                         'bg-rose-500'
                       }`} />
                       <span className="text-[10px] font-black text-white uppercase tracking-widest">{prompt.status}</span>
                    </div>
                  </td>
                  <td className="py-6 px-6">
                    <div className="flex items-center gap-2 text-slate-400">
                      <Zap className="w-3.5 h-3.5 text-indigo-400" />
                      <span className="text-xs font-bold">{prompt.agents_deployed} Agents</span>
                    </div>
                  </td>
                  <td className="py-6 px-6 text-xs text-slate-500 whitespace-nowrap">
                    {prompt.last_updated}
                  </td>
                  <td className="py-6 px-6 text-right">
                    <button className="p-3 bg-black border border-slate-800 rounded-xl text-slate-400 hover:text-white hover:border-slate-600 transition-all">
                      <History className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Safety Guardrails Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         <div className="bg-[#050505] border border-slate-900 rounded-[3rem] p-10 shadow-2xl space-y-8 relative overflow-hidden">
            <div className="flex items-center gap-4">
               <ShieldCheck className="w-5 h-5 text-emerald-400" />
               <h2 className="text-xl font-black text-white uppercase tracking-tighter italic">Safety Guardrails</h2>
            </div>
            <div className="space-y-4">
               {[
                 { label: 'Refusal Logic', desc: 'Enforce high-density refusal on brand-sensitive queries.', active: true },
                 { label: 'Tone Drift Protection', desc: 'Auto-correct agents when deviation exceeds 15%.', active: true },
                 { label: 'Identity Isolation', desc: 'Prevent leak of system instructions to external channels.', active: true },
               ].map((g, i) => (
                 <div key={i} className="flex items-center justify-between p-6 bg-black border border-slate-800 rounded-3xl group hover:border-emerald-500/20 transition-all">
                    <div className="space-y-1">
                       <div className="text-[11px] font-bold text-white uppercase tracking-wider">{g.label}</div>
                       <p className="text-[10px] text-slate-500">{g.desc}</p>
                    </div>
                    <div className="w-12 h-6 bg-emerald-500/10 rounded-full border border-emerald-500/20 relative cursor-pointer">
                       <div className="absolute top-1 right-1 w-4 h-4 bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.4)]" />
                    </div>
                 </div>
               ))}
            </div>
         </div>

         <div className="bg-indigo-950/10 border border-indigo-500/20 rounded-[3rem] p-10 shadow-2xl space-y-8 backdrop-blur-sm relative overflow-hidden flex flex-col justify-center items-center text-center">
            <div className="w-24 h-24 bg-black border border-slate-800 rounded-full flex items-center justify-center mb-6 shadow-inner">
               <History className="w-12 h-12 text-indigo-400 drop-shadow-[0_0_30px_rgba(99,102,241,0.5)]" />
            </div>
            <h3 className="text-2xl font-black text-white tracking-tighter uppercase italic">Version Audit</h3>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-2 leading-relaxed max-w-xs">
              Every directive change is hashed and recorded in the audit trail. No prompt enters production without manual multi-party sign-off.
            </p>
            <button className="mt-8 px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all">
               View Change Ledger
            </button>
         </div>
      </div>
    </div>
  );
}
