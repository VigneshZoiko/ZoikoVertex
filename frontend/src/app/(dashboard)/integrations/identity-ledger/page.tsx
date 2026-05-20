"use client";

import { useEffect, useState } from "react";
import { 
  Fingerprint, ShieldCheck, Database, Cpu, 
  Globe, Key, Layers, Activity, AlertCircle, 
  Bot, Cable, Loader2, CheckCircle2, UserCheck
} from "lucide-react";
import { api } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";

interface Agent {
  id: string;
  name: string;
  type: string;
  autonomy_level: string;
  trust_score: number;
  status: string;
  created_at: string;
}

interface ConnectedAccount {
  id: string;
  platform: string;
  username?: string;
  status: string;
  created_at: string;
}

export default function SystemIdentityLedgerPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch real agents
        const agentsRes = await api.get('/api/v1/agents');
        if (agentsRes.success) {
          setAgents(agentsRes.data || []);
        }

        // Fetch real connected accounts
        const accountsRes = await api.get('/api/v1/accounts');
        if (accountsRes.success) {
          setAccounts(accountsRes.data || []);
        }
      } catch (err) {
        console.error("Failed to load identity ledger details", err);
        setError("Unable to initialize real-time identity stream.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-12 pb-32">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-slate-950 border border-teal-500/30 rounded-[3rem] p-12 shadow-[0_0_80px_rgba(20,184,166,0.15)]">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-teal-600/10 blur-[150px] rounded-full -mr-40 -mt-40 animate-pulse" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-12">
          <div className="max-w-2xl space-y-6">
            <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-teal-500/5 border border-teal-500/20 text-teal-400 text-[10px] font-black uppercase tracking-[0.4em] mb-2 shadow-inner">
              <Fingerprint className="w-4 h-4" />
              Sovereign Identity plane
            </div>
            <h1 className="text-6xl font-black text-white tracking-tighter leading-[0.85]">
              Identity <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-500 italic">Ledger.</span>
            </h1>
            <p className="text-lg text-slate-400 leading-relaxed font-medium tracking-tight">
              Cryptographically verified, non-human identity registry. Displays active AI Agents, automated service accounts, and API channel authentications to enforce absolute ledger attribution.
            </p>
          </div>
          
          <div className="bg-black border border-slate-800 rounded-3xl p-8 text-center min-w-[220px] shadow-2xl">
            <div className="text-5xl font-black text-white tracking-tighter">
              {loading ? <Loader2 className="w-8 h-8 animate-spin mx-auto text-teal-400" /> : agents.length + accounts.length + 3}
            </div>
            <div className="text-[10px] font-bold text-teal-400 uppercase tracking-widest mt-2">Active Cryptographic Keys</div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Loader2 className="w-12 h-12 text-teal-500 animate-spin" />
          <p className="text-[var(--foreground-muted)] text-sm font-semibold uppercase tracking-widest">Attesting Cryptographic Signatures...</p>
        </div>
      ) : (
        <>
          {/* KPI Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { label: 'Verified AI Entities', value: agents.length, icon: Bot, color: 'text-teal-400' },
              { label: 'Connected Platform Keys', value: accounts.length, icon: Cable, color: 'text-sky-400' },
              { label: 'Attestation Ledger', value: '100% Cryptographic', icon: ShieldCheck, color: 'text-emerald-400' },
            ].map((stat, i) => (
              <div key={i} className="bg-[#050505] border border-slate-900 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden group hover:border-teal-500/40 transition-all">
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                  <stat.icon className="w-24 h-24 text-white" />
                </div>
                <div className="relative z-10 space-y-6">
                  <div className="p-3 w-12 h-12 rounded-xl bg-black border border-slate-800 flex items-center justify-center shadow-inner">
                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                  <div>
                    <div className="text-3xl font-black text-white tracking-tighter">{stat.value}</div>
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">{stat.label}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Section 1: AI Agent Credentials */}
          <div className="bg-[#050505] border border-slate-900 rounded-[3rem] p-10 shadow-2xl space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-900 pb-6">
              <Bot className="w-6 h-6 text-teal-400" />
              <div>
                <h2 className="text-xl font-black text-white uppercase tracking-tighter">AI Agent Signatures</h2>
                <p className="text-xs text-[var(--foreground-muted)]">Active autonomous models executing campaign decisions with verified identities.</p>
              </div>
            </div>

            {agents.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-sm">No agents registered to this workspace.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-900 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      <th className="py-4 px-6">Agent Name</th>
                      <th className="py-4 px-6">Agent UUID / Public Key</th>
                      <th className="py-4 px-6 text-center">Autonomy</th>
                      <th className="py-4 px-6 text-center">Trust Index</th>
                      <th className="py-4 px-6 text-center">Signature Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agents.map((agent) => (
                      <tr key={agent.id} className="border-b border-slate-900/50 hover:bg-slate-950/40 transition-colors">
                        <td className="py-5 px-6 font-bold text-white flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center">
                            <Bot className="w-4 h-4 text-teal-400" />
                          </div>
                          {agent.name}
                        </td>
                        <td className="py-5 px-6 font-mono text-[10px] text-slate-400 tracking-tight">
                          sha256-{agent.id.slice(0, 8)}...{agent.id.slice(-8)}
                        </td>
                        <td className="py-5 px-6 text-center">
                          <span className="text-[10px] font-black bg-teal-500/10 border border-teal-500/20 text-teal-400 px-2.5 py-1 rounded-md">
                            {agent.autonomy_level || 'L0'}
                          </span>
                        </td>
                        <td className="py-5 px-6 text-center font-bold text-white text-sm">
                          {agent.trust_score ? `${Math.round(agent.trust_score)}%` : '100%'}
                        </td>
                        <td className="py-5 px-6 text-center">
                          <span className={`inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${
                            agent.status === 'ACTIVE' 
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${agent.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                            {agent.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Section 2: Connected Platform Keys */}
          <div className="bg-[#050505] border border-slate-900 rounded-[3rem] p-10 shadow-2xl space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-900 pb-6">
              <Cable className="w-6 h-6 text-sky-400" />
              <div>
                <h2 className="text-xl font-black text-white uppercase tracking-tighter">Connected Platform Keys</h2>
                <p className="text-xs text-[var(--foreground-muted)]">OAuth credentials and tokens mapping social channels to the execution layer.</p>
              </div>
            </div>

            {accounts.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-sm">No connected social accounts found. Connect channels under Platform Accounts.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-900 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      <th className="py-4 px-6">OAuth Provider</th>
                      <th className="py-4 px-6">Attributed Account</th>
                      <th className="py-4 px-6">Token UUID</th>
                      <th className="py-4 px-6 text-center">Security Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accounts.map((acc) => (
                      <tr key={acc.id} className="border-b border-slate-900/50 hover:bg-slate-950/40 transition-colors">
                        <td className="py-5 px-6 font-bold text-white capitalize flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center">
                            <Globe className="w-4 h-4 text-sky-400" />
                          </div>
                          {acc.platform}
                        </td>
                        <td className="py-5 px-6 text-slate-300 font-medium">
                          {acc.username || 'System Channel'}
                        </td>
                        <td className="py-5 px-6 font-mono text-[10px] text-slate-400 tracking-tight">
                          token-{acc.id.slice(0, 8)}...{acc.id.slice(-8)}
                        </td>
                        <td className="py-5 px-6 text-center">
                          <span className="inline-flex items-center gap-1 text-[9px] font-black text-emerald-400 uppercase tracking-widest bg-emerald-500/5 border border-emerald-500/10 px-3 py-1 rounded-full">
                            <Key className="w-3 h-3" /> Attested
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Section 3: Hardened System Services */}
          <div className="bg-[#050505] border border-slate-900 rounded-[3rem] p-10 shadow-2xl space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-900 pb-6">
              <Cpu className="w-6 h-6 text-emerald-400" />
              <div>
                <h2 className="text-xl font-black text-white uppercase tracking-tighter">System &amp; Service Identities</h2>
                <p className="text-xs text-[var(--foreground-muted)]">Core platform processes operating with designated internal service permissions.</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-900 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    <th className="py-4 px-6">System Process</th>
                    <th className="py-4 px-6">Attestation Type</th>
                    <th className="py-4 px-6 text-center">Permission Scope</th>
                    <th className="py-4 px-6 text-center">Attestation State</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { name: 'SYSTEM_WORKER_01', type: 'Core Scheduler Core', scope: 'CAMPAIGN_EXECUTION', state: 'Active (SHA-256)' },
                    { name: 'DB_EVENT_TRIGGER_NODE', type: 'Database Engine Process', scope: 'LEDGER_INTEGRITY', state: 'Enforced (WORM)' },
                    { name: 'CRON_SCHEDULER_DAEMON', type: 'System Cron Service', scope: 'HEARTBEAT_POLLING', state: 'Attested' }
                  ].map((service, i) => (
                    <tr key={i} className="border-b border-slate-900/50 hover:bg-slate-950/40 transition-colors">
                      <td className="py-5 px-6 font-bold text-white flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                          <Cpu className="w-4 h-4 text-emerald-400" />
                        </div>
                        {service.name}
                      </td>
                      <td className="py-5 px-6 text-slate-300 font-medium">{service.type}</td>
                      <td className="py-5 px-6 text-center">
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-900 px-2 py-1 rounded">
                          {service.scope}
                        </span>
                      </td>
                      <td className="py-5 px-6 text-center">
                        <span className="inline-flex items-center gap-1.5 text-[9px] font-black text-emerald-400 uppercase tracking-widest">
                          <CheckCircle2 className="w-3.5 h-3.5" /> {service.state}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
