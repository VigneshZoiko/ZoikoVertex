"use client";

import { useState, useEffect, useMemo } from "react";
import {
  MessageSquareCode,
  ShieldCheck,
  Zap,
  History,
  Search,
  Plus,
  Clock,
  Lock,
  ShieldAlert,
} from "lucide-react";
import { api } from "@/lib/api";

interface PromptArtifact {
  id: string;
  name: string;
  version: string;
  status: "ACTIVE" | "PENDING" | "DEPRECATED";
  description: string;
  last_updated: string;
  agents_deployed: number;
}

interface HitlRule {
  id: string;
  trigger: string;
  action: string;
  route_to_role: string;
  enabled: boolean;
}

interface AuditStats {
  total?: number;
  today?: number;
  errors?: number;
  warnings?: number;
}

interface KnowledgeContext {
  brand_voice: { title: string; guideline: string }[] | null;
  sop_rules: { title: string; rule: string }[];
  meta?: { generated_at?: string };
}

export default function PromptsPage() {
  const [prompts, setPrompts] = useState<PromptArtifact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [auditStats, setAuditStats] = useState<AuditStats | null>(null);
  const [approvalStats, setApprovalStats] = useState<{ counts?: { pending_governance?: number; total_pending?: number } } | null>(null);
  const [hitlRules, setHitlRules] = useState<HitlRule[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPromptGovernance = async () => {
      try {
        setLoading(true);
        setError(null);
        const [contextRes, hitlRes, auditRes, approvalsRes] = await Promise.all([
          api.get("/api/v1/knowledge/ai-context"),
          api.get("/api/v1/autonomy/hitl-rules"),
          api.get("/api/v1/governance/audit/stats"),
          api.get("/api/v1/approvals/stats"),
        ]);

        if (hitlRes.success) setHitlRules(hitlRes.data || []);
        if (auditRes.success) setAuditStats(auditRes.data || null);
        if (approvalsRes.success) setApprovalStats(approvalsRes.data || null);

        if (contextRes.success) {
          const context = contextRes.data as KnowledgeContext;
          const brandDirectives: PromptArtifact[] = (context.brand_voice || []).map((item, index) => ({
            id: `brand-${index}`,
            name: item.title,
            version: `v${index + 1}.0`,
            status: "ACTIVE",
            description: item.guideline,
            last_updated: context.meta?.generated_at ? new Date(context.meta.generated_at).toLocaleString() : "Recently synced",
            agents_deployed: 1,
          }));
          const sopDirectives: PromptArtifact[] = context.sop_rules.map((item, index) => ({
            id: `sop-${index}`,
            name: item.title,
            version: `v${index + 1}.0`,
            status: "PENDING",
            description: item.rule,
            last_updated: context.meta?.generated_at ? new Date(context.meta.generated_at).toLocaleString() : "Recently synced",
            agents_deployed: 0,
          }));
          setPrompts([...brandDirectives, ...sopDirectives]);
        }
      } catch (loadError) {
        console.error("Failed to load prompt governance context", loadError);
        setError("Prompt governance is showing limited data because the live directive sources could not be fully loaded.");
      } finally {
        setLoading(false);
      }
    };

    loadPromptGovernance();
  }, []);

  const filteredPrompts = useMemo(
    () =>
      prompts.filter((prompt) => {
        const term = search.toLowerCase();
        return (
          prompt.name.toLowerCase().includes(term) ||
          prompt.version.toLowerCase().includes(term) ||
          prompt.description.toLowerCase().includes(term)
        );
      }),
    [prompts, search],
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-12 pb-32 bg-black min-h-screen">
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
              Govern prompt artifacts, safety guardrails, and refusal logic using approved knowledge, audit visibility, and explicit human controls.
            </p>
          </div>

          <button className="px-10 py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] flex items-center gap-3 transition-all shadow-xl shadow-indigo-600/20 active:scale-95 group">
            <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
            New Directive
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-[2rem] border border-amber-500/20 bg-amber-500/10 px-6 py-4 text-sm text-amber-400">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          { label: "Active Directives", value: String(prompts.filter((prompt) => prompt.status === "ACTIVE").length), icon: ShieldCheck, color: "text-emerald-400" },
          { label: "Pending Approvals", value: String(approvalStats?.counts?.pending_governance ?? approvalStats?.counts?.total_pending ?? 0), icon: Clock, color: "text-amber-400" },
          { label: "Total Deployed", value: String(prompts.reduce((sum, prompt) => sum + prompt.agents_deployed, 0)), icon: Zap, color: "text-indigo-400" },
        ].map((stat) => (
          <div key={stat.label} className="bg-slate-950 border border-slate-900 rounded-[2.5rem] p-8 hover:border-indigo-500/40 transition-all group shadow-2xl relative overflow-hidden">
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
              {!loading && filteredPrompts.map((prompt) => (
                <tr key={prompt.id} className="hover:bg-slate-900/30 transition-colors group">
                  <td className="py-6 px-6">
                    <div className="space-y-1">
                      <div className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors">{prompt.name}</div>
                      <div className="text-[10px] text-slate-500 leading-relaxed max-w-xs">{prompt.description}</div>
                    </div>
                  </td>
                  <td className="py-6 px-6">
                    <span className="text-[10px] font-black text-slate-400 bg-black border border-slate-800 px-2 py-1 rounded-lg">{prompt.version}</span>
                  </td>
                  <td className="py-6 px-6">
                    <div className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${prompt.status === "ACTIVE" ? "bg-emerald-500" : prompt.status === "PENDING" ? "bg-amber-500" : "bg-rose-500"}`} />
                      <span className="text-[10px] font-black text-white uppercase tracking-widest">{prompt.status}</span>
                    </div>
                  </td>
                  <td className="py-6 px-6">
                    <div className="flex items-center gap-2 text-slate-400">
                      <Zap className="w-3.5 h-3.5 text-indigo-400" />
                      <span className="text-xs font-bold">{prompt.agents_deployed} Agents</span>
                    </div>
                  </td>
                  <td className="py-6 px-6 text-xs text-slate-500 whitespace-nowrap">{prompt.last_updated}</td>
                  <td className="py-6 px-6 text-right">
                    <button className="p-3 bg-black border border-slate-800 rounded-xl text-slate-400 hover:text-white hover:border-slate-600 transition-all">
                      <History className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && filteredPrompts.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-10 px-6 text-center text-sm text-slate-500">
                    No governed directives found in the current knowledge and control sources.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-[#050505] border border-slate-900 rounded-[3rem] p-10 shadow-2xl space-y-8 relative overflow-hidden">
          <div className="flex items-center gap-4">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h2 className="text-xl font-black text-white uppercase tracking-tighter italic">Safety Guardrails</h2>
          </div>
          <div className="space-y-4">
            {(hitlRules.length
              ? hitlRules.slice(0, 3).map((rule) => ({
                  label: rule.trigger,
                  desc: `${rule.action} routed to ${rule.route_to_role}.`,
                  active: rule.enabled,
                }))
              : [{ label: "No live HITL rules", desc: "Human review directives will appear here when configured.", active: false }]).map((guardrail, index) => (
              <div key={index} className="flex items-center justify-between p-6 bg-black border border-slate-800 rounded-3xl group hover:border-emerald-500/20 transition-all">
                <div className="space-y-1">
                  <div className="text-[11px] font-bold text-white uppercase tracking-wider">{guardrail.label}</div>
                  <p className="text-[10px] text-slate-500">{guardrail.desc}</p>
                </div>
                <div className={`w-12 h-6 rounded-full border relative ${guardrail.active ? "bg-emerald-500/10 border-emerald-500/20" : "bg-slate-900 border-slate-800"}`}>
                  <div className={`absolute top-1 w-4 h-4 rounded-full ${guardrail.active ? "right-1 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]" : "left-1 bg-slate-600"}`} />
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
            Every directive change is audit-visible. No prompt enters production without explicit human governance around the underlying source rules.
          </p>
          <div className="mt-4 grid grid-cols-3 gap-3 w-full max-w-md">
            <div className="rounded-2xl border border-slate-800 bg-black px-4 py-3 text-center">
              <p className="text-[10px] text-slate-500 uppercase tracking-widest">Events</p>
              <p className="text-xl font-black text-white mt-1">{auditStats?.total ?? 0}</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-black px-4 py-3 text-center">
              <p className="text-[10px] text-slate-500 uppercase tracking-widest">Warnings</p>
              <p className="text-xl font-black text-white mt-1">{auditStats?.warnings ?? 0}</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-black px-4 py-3 text-center">
              <p className="text-[10px] text-slate-500 uppercase tracking-widest">Errors</p>
              <p className="text-xl font-black text-white mt-1">{auditStats?.errors ?? 0}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
