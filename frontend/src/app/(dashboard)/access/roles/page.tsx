"use client";

import { useState } from "react";
import { 
  Shield, 
  Search, 
  Filter, 
  Info, 
  CheckCircle2, 
  Cpu, 
  Scale, 
  CheckSquare, 
  Lock, 
  Eye, 
  Zap, 
  Users,
  AlertTriangle
} from "lucide-react";
import { ROLE_ARCHITECTURE, CONTROL_LAYERS } from "@/lib/roles";

export default function RolesPage() {
  const [search, setSearch] = useState("");
  const [activeLayer, setActiveLayer] = useState<string | null>(null);

  const filteredRoles = ROLE_ARCHITECTURE.filter(role => {
    const matchesSearch = role.name.toLowerCase().includes(search.toLowerCase()) || 
                         role.description.toLowerCase().includes(search.toLowerCase());
    const matchesLayer = activeLayer ? role.layer === activeLayer : true;
    return matchesSearch && matchesLayer;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
            <Shield className="w-5 h-5 text-indigo-400" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Role Architecture</h1>
        </div>
        <p className="text-[#888888] max-w-3xl leading-relaxed">
          ZoikoVertex enforces an accountable execution model through granular role separation. 
          Our architecture is divided into three distinct <span className="text-white font-medium">Control Layers</span> to prevent permission collapse and ensure audit-ready enterprise operations.
        </p>
      </div>

      {/* Control Layers Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {Object.entries(CONTROL_LAYERS).map(([key, layer]) => (
          <button
            key={key}
            onClick={() => setActiveLayer(activeLayer === key ? null : key)}
            className={`text-left p-6 rounded-2xl border transition-all relative overflow-hidden group ${
              activeLayer === key 
                ? "bg-[#1f1f1f] border-indigo-500/50 shadow-lg shadow-indigo-500/10" 
                : "bg-[#161616] border-[#2d2d2d] hover:border-[#444444]"
            }`}
          >
            <div className={`w-10 h-10 rounded-lg mb-4 flex items-center justify-center ${
              key === 'BUILD' ? 'bg-emerald-500/10 text-emerald-400' :
              key === 'GOVERNANCE' ? 'bg-amber-500/10 text-amber-400' :
              'bg-indigo-500/10 text-indigo-400'
            }`}>
              {key === 'BUILD' ? <Cpu className="w-5 h-5" /> :
               key === 'GOVERNANCE' ? <Scale className="w-5 h-5" /> :
               <CheckSquare className="w-5 h-5" />}
            </div>
            <h3 className="text-white font-bold mb-2">{layer.name}</h3>
            <p className="text-[#888888] text-xs leading-relaxed">{layer.description}</p>
            
            {activeLayer === key && (
              <div className="absolute top-4 right-4">
                <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Search & Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#444444]" />
          <input 
            type="text"
            placeholder="Search roles or capabilities..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#161616] border border-[#2d2d2d] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-all"
          />
        </div>
        <div className="flex items-center gap-2 text-[#666666] text-xs font-medium">
          <Info className="w-3.5 h-3.5" />
          Showing {filteredRoles.length} Accountable Roles
        </div>
      </div>

      {/* Roles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRoles.map((role) => (
          <div 
            key={role.id}
            className="bg-[#161616] border border-[#2d2d2d] rounded-2xl p-6 flex flex-col hover:border-[#444444] transition-all group"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-white font-bold">{role.name}</h3>
                  {role.id === 'WORKSPACE_OWNER' && <Lock className="w-3 h-3 text-amber-400" />}
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#666666] px-2 py-0.5 rounded bg-[#111111] border border-[#2d2d2d]">
                  {role.category}
                </span>
              </div>
              <div className={`px-2 py-1 rounded text-[10px] font-black uppercase ${
                role.layer === 'Build' ? 'bg-emerald-500/10 text-emerald-400' :
                role.layer === 'Governance' ? 'bg-amber-500/10 text-amber-400' :
                'bg-indigo-500/10 text-indigo-400'
              }`}>
                {role.layer}
              </div>
            </div>

            <p className="text-[#888888] text-sm leading-relaxed mb-6 flex-1">
              {role.description}
            </p>

            <div className="space-y-2 mt-auto">
              <span className="text-[10px] font-bold text-[#444444] uppercase tracking-widest">Key Responsibilities</span>
              <div className="grid grid-cols-1 gap-1.5">
                {role.responsibilities.map((resp, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-[#888888] text-[11px]">
                    <CheckCircle2 className="w-3 h-3 text-[#333333] group-hover:text-indigo-400 transition-colors" />
                    {resp}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Separation of Duties Warning */}
      <div className="mt-16 p-8 rounded-3xl bg-indigo-500/5 border border-indigo-500/10 flex flex-col md:flex-row items-center gap-8">
        <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center shrink-0">
          <AlertTriangle className="w-8 h-8 text-indigo-400" />
        </div>
        <div>
          <h3 className="text-white font-bold text-lg mb-2">Separation of Duties Policy</h3>
          <p className="text-[#888888] text-sm leading-relaxed max-w-3xl">
            To maintain enterprise integrity, certain roles are restricted from overlapping. For example, a <span className="text-white font-medium">Contributor</span> who drafts an asset cannot act as its <span className="text-white font-medium">Approver</span>. These guardrails are automatically enforced during the publishing lifecycle to prevent privilege escalation and ensure total accountability.
          </p>
        </div>
        <button className="whitespace-nowrap px-6 py-3 bg-white text-black font-bold rounded-xl hover:bg-zinc-200 transition-all text-sm">
          View Governance Matrix
        </button>
      </div>
    </div>
  );
}
