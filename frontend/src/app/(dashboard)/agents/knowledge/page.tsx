"use client";

import { useState } from "react";
import { 
  BookOpen, 
  Plus, 
  Search, 
  Database, 
  FileText, 
  Globe, 
  MessageSquare, 
  RefreshCw,
  Layers,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  Clock
} from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";

const MOCK_KNOWLEDGE_BASES = [
  {
    id: "kb-001",
    name: "Core Brand Standards v1.4",
    type: "Document Set",
    source: "Google Drive",
    chunks: 1240,
    status: "SYNCED",
    last_sync: "2 hours ago",
    reliability: 0.98
  },
  {
    id: "kb-002",
    name: "Global Market Research 2024",
    type: "Market Intelligence",
    source: "Web Crawler",
    chunks: 8500,
    status: "SYNCING",
    last_sync: "Just now",
    reliability: 0.92
  },
  {
    id: "kb-003",
    name: "EU Advertising Compliance",
    type: "Legal Registry",
    source: "SQL Database",
    chunks: 450,
    status: "SYNCED",
    last_sync: "1 day ago",
    reliability: 1.0
  }
];

export default function KnowledgePage() {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredKBs = MOCK_KNOWLEDGE_BASES.filter(kb => 
    kb.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)] flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-indigo-500" />
            Knowledge Bases
          </h1>
          <p className="text-[var(--foreground-muted)] mt-1">
            Ground your agents in verified enterprise data and brand intelligence.
          </p>
        </div>
        <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl font-semibold transition-all shadow-lg shadow-indigo-600/20 active:scale-95 group">
          <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
          Connect Data Source
        </button>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: "Total Knowledge", val: "10.2k", sub: "Embeddings", icon: Layers, color: "text-indigo-500" },
          { label: "Active Sources", val: "12", sub: "Synced", icon: Database, color: "text-emerald-500" },
          { label: "Verification", val: "99.4%", sub: "Accuracy", icon: ShieldCheck, color: "text-amber-500" },
          { label: "Sync Health", val: "100%", sub: "No Errors", icon: RefreshCw, color: "text-blue-500" },
        ].map((stat, i) => (
          <div key={i} className="bg-[var(--card)] border border-[var(--card-border)] p-6 rounded-3xl space-y-2">
            <div className="flex items-center justify-between">
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
              <span className="text-[10px] font-black text-[var(--foreground-muted)] uppercase tracking-widest">{stat.label}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-black">{stat.val}</span>
              <span className="text-[10px] text-[var(--foreground-muted)] font-bold uppercase">{stat.sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Registry Table */}
      <div className="bg-[var(--card)] border border-[var(--card-border)] rounded-3xl overflow-hidden">
        <div className="p-6 border-b border-[var(--card-border)] flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[var(--surface)]/30">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--foreground-muted)]" />
            <input 
              type="text" 
              placeholder="Search knowledge bases..." 
              className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl py-2 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[var(--foreground-muted)] uppercase tracking-widest">Sort:</span>
            <select className="bg-transparent text-xs font-bold outline-none cursor-pointer">
              <option>Last Synced</option>
              <option>Reliability</option>
              <option>Source Type</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--card-border)] bg-[var(--surface)]/50">
                <th className="py-4 px-6 text-[10px] font-black text-[var(--foreground-muted)] uppercase tracking-widest">Knowledge Base</th>
                <th className="py-4 px-6 text-[10px] font-black text-[var(--foreground-muted)] uppercase tracking-widest">Source / Type</th>
                <th className="py-4 px-6 text-[10px] font-black text-[var(--foreground-muted)] uppercase tracking-widest text-center">Vectors</th>
                <th className="py-4 px-6 text-[10px] font-black text-[var(--foreground-muted)] uppercase tracking-widest">Sync Status</th>
                <th className="py-4 px-6 text-[10px] font-black text-[var(--foreground-muted)] uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredKBs.map((kb) => (
                <tr key={kb.id} className="border-b border-[var(--card-border)] hover:bg-[var(--surface)]/30 transition-all group">
                  <td className="py-5 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 group-hover:scale-110 transition-transform">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-bold text-sm text-[var(--foreground)]">{kb.name}</div>
                        <div className="text-[10px] text-[var(--foreground-muted)] font-medium">Reliability: {(kb.reliability * 100).toFixed(0)}%</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-5 px-6">
                    <div className="flex items-center gap-2">
                      {kb.source === 'Slack' ? <MessageSquare className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
                      <span className="text-xs font-medium text-[var(--foreground)]">{kb.source}</span>
                    </div>
                    <div className="text-[10px] text-[var(--foreground-muted)] uppercase tracking-tight">{kb.type}</div>
                  </td>
                  <td className="py-5 px-6 text-center">
                    <span className="text-sm font-black text-indigo-500">{kb.chunks.toLocaleString()}</span>
                  </td>
                  <td className="py-5 px-6">
                    <div className="flex flex-col gap-1">
                      <StatusBadge status={kb.status} />
                      <div className="flex items-center gap-1 text-[9px] text-[var(--foreground-muted)]">
                        <Clock className="w-2.5 h-2.5" />
                        {kb.last_sync}
                      </div>
                    </div>
                  </td>
                  <td className="py-5 px-6 text-right">
                    <button className="p-2 text-[var(--foreground-muted)] hover:text-indigo-400 hover:bg-indigo-400/10 rounded-lg transition-all">
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Connectors Grid */}
        <div className="p-8 bg-[var(--surface)]/20 border-t border-[var(--card-border)]">
          <h3 className="text-xs font-black uppercase tracking-widest text-[var(--foreground-muted)] mb-6 flex items-center gap-2">
            <Layers className="w-4 h-4" />
            Available Connectors
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            {[
              { name: "Slack", icon: MessageSquare },
              { name: "Notion", icon: FileText },
              { name: "Drive", icon: Globe },
              { name: "Database", icon: Database },
              { name: "Upload", icon: Plus },
              { name: "API", icon: RefreshCw },
            ].map((conn, i) => (
              <button key={i} className="flex flex-col items-center gap-3 p-4 bg-[var(--card)] border border-[var(--card-border)] rounded-2xl hover:border-indigo-500/50 hover:shadow-lg transition-all group">
                <div className="w-10 h-10 rounded-full bg-[var(--surface)] flex items-center justify-center text-[var(--foreground-muted)] group-hover:text-indigo-500 transition-colors">
                  <conn.icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest">{conn.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
