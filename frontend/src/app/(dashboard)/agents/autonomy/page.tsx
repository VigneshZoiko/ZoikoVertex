"use client";

import { useState, useEffect } from "react";
import { 
  ToggleRight, 
  ToggleLeft, 
  ShieldAlert, 
  ShieldCheck, 
  Zap, 
  UserCheck, 
  Bot, 
  AlertTriangle,
  Settings2,
  ChevronRight,
  Info,
  Activity,
  History,
  Lock,
  Unlock,
  Loader2,
  Sliders
} from "lucide-react";
import { api } from "@/lib/api";

type AutonomyLevel = 'L0' | 'L1' | 'L2' | 'L3' | 'L4';

interface Agent {
  id: string;
  name: string;
  type: string;
  autonomy_level: AutonomyLevel;
  status: string;
  trust_score: number;
}

const AUTONOMY_LEVELS = [
  { 
    id: 'L1', 
    name: 'Human-Led', 
    desc: 'Agents only generate drafts. Every action must be manually approved by a human DRI.',
    icon: UserCheck,
    color: 'text-zinc-400',
    bgColor: 'bg-zinc-500/10'
  },
  { 
    id: 'L2', 
    name: 'Human-Assisted', 
    desc: 'Agents handle routine tasks but require confirmation for any market-facing content.',
    icon: Bot,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10'
  },
  { 
    id: 'L3', 
    name: 'Semi-Autonomous', 
    desc: 'Agents publish low-risk content automatically. High-risk content is routed to human review.',
    icon: Zap,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10'
  },
  { 
    id: 'L4', 
    name: 'Fully Autonomous', 
    desc: 'Agents operate independently across all channels. Humans only intervene in case of critical failure.',
    icon: ShieldCheck,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10'
  }
];

export default function AutonomyPage() {
  const [globalPause, setGlobalPause] = useState(false);
  const [loading, setLoading] = useState(true);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [riskThreshold, setRiskThreshold] = useState('MEDIUM');

  const fetchAgents = async () => {
    setLoading(true);
    try {
      // First get context for workspaceId
      const contextRes = await api.get('/api/v1/user/context');
      if (contextRes.success) {
        const workspaceId = contextRes.data.workspace_id;
        const result = await api.get(`/api/v1/agents?workspaceId=${workspaceId}`);
        if (result.success) {
          setAgents(result.data);
        }
      }
    } catch (err) {
      console.error("Failed to fetch agents", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  const handleLevelChange = async (agentId: string, newLevel: AutonomyLevel) => {
    setUpdatingId(agentId);
    try {
      const result = await api.patch(`/api/v1/agents/${agentId}/autonomy`, { 
        autonomy_level: newLevel 
      });
      
      if (result.success) {
        setAgents(prev => prev.map(a => a.id === agentId ? { ...a, autonomy_level: newLevel } : a));
      } else {
        alert(result.message || "Failed to update autonomy level");
      }
    } catch (err) {
      console.error("Failed to update autonomy level", err);
      alert("A network error occurred while updating autonomy level.");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-12 animate-in fade-in duration-700">
      
      {/* Header & Global Kill Switch */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 bg-zinc-900/50 border border-zinc-800 p-8 rounded-[2.5rem] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-[80px] rounded-full -mr-20 -mt-20" />
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
          <div className="p-4 bg-indigo-500/10 rounded-3xl border border-indigo-500/20">
            <ToggleRight className="w-8 h-8 text-indigo-500" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight">Autonomy Controls</h1>
            <p className="text-zinc-500 mt-1 font-medium">Define the operational boundaries and decision rights for your AI agents.</p>
          </div>
        </div>

        <div className="relative z-10 flex flex-col items-end gap-3">
          <div className="flex items-center gap-4 bg-black/40 border border-zinc-800 p-2 rounded-2xl">
            <span className={`text-[10px] font-black uppercase tracking-widest ml-4 ${globalPause ? 'text-rose-500' : 'text-emerald-500'}`}>
              {globalPause ? 'AUTONOMY PAUSED' : 'SYSTEM ACTIVE'}
            </span>
            <button 
              onClick={() => setGlobalPause(!globalPause)}
              className={`w-14 h-8 rounded-full relative transition-all duration-300 shadow-lg ${globalPause ? 'bg-rose-600' : 'bg-emerald-600'}`}
            >
              <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all duration-300 shadow-md flex items-center justify-center ${globalPause ? 'left-7' : 'left-1'}`}>
                {globalPause ? <Lock className="w-3 h-3 text-rose-600" /> : <Unlock className="w-3 h-3 text-emerald-600" />}
              </div>
            </button>
          </div>
          <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-tighter">Emergency Master Guardrail</p>
        </div>
      </div>

      {/* Autonomy Level Definitions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {AUTONOMY_LEVELS.map((level) => (
          <div key={level.id} className="bg-zinc-900/30 border border-zinc-800 rounded-3xl p-8 space-y-4 hover:border-zinc-700 transition-all group">
            <div className={`w-12 h-12 ${level.bgColor} ${level.color} rounded-2xl flex items-center justify-center shadow-inner`}>
              <level.icon className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <h3 className="font-black text-white uppercase tracking-tight">{level.name}</h3>
                <span className="text-[10px] font-black text-zinc-600">{level.id}</span>
              </div>
              <p className="text-xs text-zinc-500 mt-2 leading-relaxed font-medium">
                {level.desc}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Agent Autonomy Management */}
      <div className="bg-zinc-900/30 border border-zinc-800 rounded-[2.5rem] overflow-hidden">
        <div className="p-8 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/20">
          <div className="flex items-center gap-3">
            <Activity className="w-5 h-5 text-indigo-400" />
            <h2 className="text-xl font-black text-white uppercase tracking-tighter">Active Agent Configuration</h2>
          </div>
          <div className="flex items-center gap-2">
             <div className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-xl text-[10px] font-black text-zinc-400 uppercase tracking-widest">
               {agents.length} AGENTS ONLINE
             </div>
          </div>
        </div>

        <div className="p-0">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-zinc-800/50">
                <th className="px-8 py-5 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Agent Identity</th>
                <th className="px-8 py-5 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-center">Status</th>
                <th className="px-8 py-5 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-center">Trust Index</th>
                <th className="px-8 py-5 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Autonomy Level</th>
                <th className="px-8 py-5 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center">
                    <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto" />
                  </td>
                </tr>
              ) : agents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center">
                    <p className="text-zinc-600 font-bold italic uppercase tracking-widest">No active agents found in this cluster.</p>
                  </td>
                </tr>
              ) : agents.map((agent) => (
                <tr key={agent.id} className="group hover:bg-zinc-800/20 transition-all">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-500">
                        <Bot className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-sm font-black text-white">{agent.name}</div>
                        <div className="text-[10px] font-bold text-zinc-600 uppercase tracking-tighter">{agent.type}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 text-emerald-500 rounded-lg text-[9px] font-black uppercase border border-emerald-500/20">
                      <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" />
                      {agent.status}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex flex-col items-center gap-1.5">
                      <div className="text-xs font-black text-white">{agent.trust_score * 100}%</div>
                      <div className="w-20 h-1 bg-zinc-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-indigo-500" 
                          style={{ width: `${agent.trust_score * 100}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2">
                      {AUTONOMY_LEVELS.map((lvl) => (
                        <button
                          key={lvl.id}
                          disabled={updatingId === agent.id}
                          onClick={() => handleLevelChange(agent.id, lvl.id as AutonomyLevel)}
                          className={`
                            px-3 py-1.5 rounded-xl text-[10px] font-black transition-all border
                            ${agent.autonomy_level === lvl.id 
                              ? 'bg-white text-black border-white shadow-xl' 
                              : 'bg-zinc-900 text-zinc-600 border-zinc-800 hover:border-zinc-600'}
                          `}
                          title={lvl.name}
                        >
                          {lvl.id}
                        </button>
                      ))}
                      {updatingId === agent.id && <Loader2 className="w-3 h-3 text-indigo-500 animate-spin ml-2" />}
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <button className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-500 hover:text-white hover:border-zinc-700 transition-all">
                      <Settings2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Safety Guardrails */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 bg-zinc-900/30 border border-zinc-800 rounded-[2.5rem] p-10 space-y-10 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <ShieldAlert className="w-32 h-32 text-rose-500" />
          </div>
          
          <div className="flex items-center gap-4 border-b border-zinc-800 pb-8">
            <div className="p-3 bg-amber-500/10 rounded-2xl border border-amber-500/20 text-amber-500">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white uppercase tracking-tighter">Automatic Escalation Rules</h2>
              <p className="text-xs text-zinc-500 mt-1 font-medium">Triggers that bypass autonomy and force human intervention.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            <div className="space-y-4">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block">Risk Threshold Handoff</label>
              <div className="flex gap-2 p-1.5 bg-black/40 border border-zinc-800 rounded-2xl">
                {['LOW', 'MEDIUM', 'HIGH'].map((level) => (
                  <button
                    key={level}
                    onClick={() => setRiskThreshold(level)}
                    className={`flex-1 py-2.5 rounded-xl text-[10px] font-black tracking-widest transition-all ${riskThreshold === level ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-zinc-600 hover:text-zinc-400'}`}
                  >
                    {level}
                  </button>
                ))}
              </div>
              <p className="text-[9px] text-zinc-600 italic">Always require human review if risk score exceeds this level.</p>
            </div>

            <div className="space-y-4">
               <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block">Financial Safety Limit</label>
               <div className="relative">
                  <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                    <span className="text-xs font-black text-zinc-600">$</span>
                  </div>
                  <input 
                    type="number" 
                    defaultValue="50.00"
                    className="w-full bg-black/40 border border-zinc-800 rounded-2xl py-3 pl-8 pr-4 text-sm font-black text-white outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all"
                  />
               </div>
               <p className="text-[9px] text-zinc-600 italic">Auto-pause agent actions if predicted campaign spend exceeds limit.</p>
            </div>
          </div>

          <div className="space-y-4 pt-4">
             <div className="flex items-center justify-between p-6 bg-zinc-900/50 border border-zinc-800 rounded-3xl">
                <div className="flex items-center gap-4">
                   <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400">
                      <AlertTriangle className="w-4 h-4" />
                   </div>
                   <div>
                      <h4 className="text-sm font-bold">Negative Sentiment Guard</h4>
                      <p className="text-[10px] text-zinc-600 font-medium">Always escalate if generated content has &gt;15% negative sentiment score.</p>
                   </div>
                </div>
                <div className="w-10 h-6 bg-indigo-600 rounded-full relative shadow-inner">
                   <div className="absolute top-1 right-1 w-4 h-4 bg-white rounded-full shadow-sm" />
                </div>
             </div>
          </div>
        </div>

        <div className="bg-indigo-600 rounded-[2.5rem] p-10 flex flex-col justify-between relative overflow-hidden shadow-[0_30px_60px_-15px_rgba(79,70,229,0.4)]">
           <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-[60px] rounded-full -mr-32 -mt-32" />
           
           <div className="space-y-6 relative z-10">
              <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center text-white backdrop-blur-md border border-white/20">
                <Zap className="w-8 h-8" />
              </div>
              <h3 className="text-4xl font-black text-white tracking-tighter leading-none italic">Vertex<br/>Trust Score.</h3>
              <p className="text-indigo-100 text-sm font-medium leading-relaxed opacity-80">
                Agents with a trust score below 85% are restricted from L3+ autonomy levels by global policy.
              </p>
           </div>

           <div className="space-y-4 relative z-10 pt-10">
              <div className="flex items-center justify-between text-[10px] font-black text-white uppercase tracking-widest">
                 <span>Global Trust Avg</span>
                 <span>91.4%</span>
              </div>
              <div className="flex items-center h-2 w-full bg-indigo-900/40 rounded-full overflow-hidden">
                 <div className="h-full bg-white shadow-[0_0_15px_white]" style={{ width: '91.4%' }} />
              </div>
              <button className="w-full py-4 bg-white text-indigo-600 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-indigo-50 transition-all flex items-center justify-center gap-2">
                 VIEW AUDIT LOG <History className="w-4 h-4" />
              </button>
           </div>
        </div>
      </div>

    </div>
  );
}
