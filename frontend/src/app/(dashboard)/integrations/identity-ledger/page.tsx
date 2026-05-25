"use client";

import { useEffect, useState } from "react";
import { 
  Fingerprint, ShieldCheck, Database, Cpu, 
  Globe, Key, Layers, Activity, AlertCircle, 
  Bot, Cable, Loader2, CheckCircle2, UserCheck,
  Search, Filter, Lock, Unlock, Zap, Clock, ShieldAlert,
  ChevronRight, ArrowRightLeft, Shield
} from "lucide-react";
import { api } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";

// Types
interface IdentityActor {
  id: string;
  actor_id: string;
  actor_type: string;
  display_name: string;
  state: string;
  authority_class: string;
  risk_level: string;
  current_roles: string[];
}

interface Delegation {
  id: string;
  delegator_id: string;
  delegatee_id: string;
  status: string;
  starts_at: string;
  expires_at: string;
  reason: string;
}

interface BreakGlassSession {
  id: string;
  actor_id: string;
  status: string;
  reason: string;
  starts_at: string;
  ends_at: string | null;
}

export default function IdentityLedgerDashboard() {
  const [activeTab, setActiveTab] = useState<'actors' | 'delegations' | 'breakglass' | 'verify'>('actors');
  
  // State
  const [actors, setActors] = useState<IdentityActor[]>([]);
  const [delegations, setDelegations] = useState<Delegation[]>([]);
  const [breakGlassSessions, setBreakGlassSessions] = useState<BreakGlassSession[]>([]);
  const [verificationResult, setVerificationResult] = useState<any>(null);
  
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);

  // Modals / Drawers
  const [selectedActor, setSelectedActor] = useState<string | null>(null);
  const [actorDetails, setActorDetails] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'actors') {
        const res = await api.get('/api/identity-ledger/actors');
        if (res.success) setActors(res.data);
      } else if (activeTab === 'delegations') {
        const res = await api.get('/api/identity-ledger/delegations');
        if (res.success) setDelegations(res.data);
      } else if (activeTab === 'breakglass') {
        const res = await api.get('/api/identity-ledger/break-glass');
        if (res.success) setBreakGlassSessions(res.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const verifyChain = async () => {
    setVerifying(true);
    try {
      const res = await api.get('/api/identity-ledger/chain/verify');
      if (res.success) setVerificationResult(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setVerifying(false);
    }
  };

  const loadActorDetails = async (actorId: string) => {
    setSelectedActor(actorId);
    try {
      const res = await api.get(`/api/identity-ledger/actors/${actorId}`);
      if (res.success) setActorDetails(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-12 pb-32">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-slate-950 border border-teal-500/30 rounded-[3rem] p-12 shadow-[0_0_80px_rgba(20,184,166,0.15)]">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-teal-600/10 blur-[150px] rounded-full -mr-40 -mt-40 animate-pulse" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-12">
          <div className="max-w-2xl space-y-6">
            <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-teal-500/5 border border-teal-500/20 text-teal-400 text-[10px] font-black uppercase tracking-[0.4em] mb-2 shadow-inner">
              <Fingerprint className="w-4 h-4" />
              Identity Ledger
            </div>
            <h1 className="text-6xl font-black text-white tracking-tighter leading-[0.85]">
              Identity <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-500 italic">Ledger.</span>
            </h1>
            <p className="text-lg text-slate-400 leading-relaxed font-medium tracking-tight">
              Cryptographically verified identity registry with dynamic delegation context, break-glass emergency elevation, and point-in-time authority snapshots.
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-2 p-1.5 bg-slate-900/50 backdrop-blur rounded-2xl border border-slate-800/50 w-fit">
        {[
          { id: 'actors', label: 'Directory', icon: UserCheck },
          { id: 'delegations', label: 'Delegations', icon: ArrowRightLeft },
          { id: 'breakglass', label: 'Break-Glass', icon: ShieldAlert },
          { id: 'verify', label: 'Chain Verification', icon: ShieldCheck }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all ${
              activeTab === tab.id 
                ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20 shadow-[0_0_20px_rgba(20,184,166,0.1)]' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content Areas */}
      <div className="min-h-[400px]">
        {loading && activeTab !== 'verify' ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Loader2 className="w-12 h-12 text-teal-500 animate-spin" />
            <p className="text-slate-500 text-sm font-semibold uppercase tracking-widest">Syncing Ledger...</p>
          </div>
        ) : (
          <>
            {/* Actors Directory */}
            {activeTab === 'actors' && (
              <div className="bg-[#050505] border border-slate-900 rounded-[3rem] p-10 shadow-2xl space-y-6">
                <div className="flex items-center justify-between border-b border-slate-900 pb-6">
                  <div className="flex items-center gap-3">
                    <Database className="w-6 h-6 text-teal-400" />
                    <div>
                      <h2 className="text-xl font-black text-white uppercase tracking-tighter">Unified Actor Directory</h2>
                      <p className="text-xs text-slate-500">Humans, Agents, Services, and Systems.</p>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-900 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                        <th className="py-4 px-6">Actor</th>
                        <th className="py-4 px-6">Type</th>
                        <th className="py-4 px-6 text-center">State</th>
                        <th className="py-4 px-6 text-center">Class</th>
                        <th className="py-4 px-6 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {actors.map(actor => (
                        <tr key={actor.id} className="border-b border-slate-900/50 hover:bg-slate-950/40 transition-colors">
                          <td className="py-5 px-6 font-bold text-white">{actor.display_name}</td>
                          <td className="py-5 px-6 text-slate-400 text-xs uppercase tracking-wider">{actor.actor_type.replace('_', ' ')}</td>
                          <td className="py-5 px-6 text-center">
                            <span className={`inline-flex px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest ${
                              actor.state === 'break_glass_active' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                              actor.state === 'active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                              'bg-slate-800 text-slate-400'
                            }`}>
                              {actor.state.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="py-5 px-6 text-center text-slate-400 text-xs">{actor.authority_class}</td>
                          <td className="py-5 px-6 text-right">
                            <button 
                              onClick={() => loadActorDetails(actor.actor_id)}
                              className="text-teal-400 hover:text-teal-300 text-xs font-bold uppercase tracking-widest inline-flex items-center gap-1"
                            >
                              Inspect <ChevronRight className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {actors.length === 0 && (
                        <tr><td colSpan={5} className="py-12 text-center text-slate-500">No actors found</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Delegations */}
            {activeTab === 'delegations' && (
              <div className="bg-[#050505] border border-slate-900 rounded-[3rem] p-10 shadow-2xl space-y-6">
                <div className="flex items-center justify-between border-b border-slate-900 pb-6">
                  <div className="flex items-center gap-3">
                    <ArrowRightLeft className="w-6 h-6 text-indigo-400" />
                    <div>
                      <h2 className="text-xl font-black text-white uppercase tracking-tighter">Authority Delegations</h2>
                      <p className="text-xs text-slate-500">Active and historical delegation chains.</p>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-900 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                        <th className="py-4 px-6">Delegator</th>
                        <th className="py-4 px-6">Delegatee</th>
                        <th className="py-4 px-6 text-center">Status</th>
                        <th className="py-4 px-6 text-center">Expires</th>
                      </tr>
                    </thead>
                    <tbody>
                      {delegations.map(del => (
                        <tr key={del.id} className="border-b border-slate-900/50 hover:bg-slate-950/40">
                          <td className="py-5 px-6 font-mono text-xs text-slate-300">{del.delegator_id}</td>
                          <td className="py-5 px-6 font-mono text-xs text-slate-300">{del.delegatee_id}</td>
                          <td className="py-5 px-6 text-center">
                            <span className={`inline-flex px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest ${
                              del.status === 'ACTIVE' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'bg-slate-800 text-slate-400'
                            }`}>
                              {del.status}
                            </span>
                          </td>
                          <td className="py-5 px-6 text-center text-slate-400 text-xs">
                            {new Date(del.expires_at).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                      {delegations.length === 0 && (
                        <tr><td colSpan={4} className="py-12 text-center text-slate-500">No active delegations</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Break Glass */}
            {activeTab === 'breakglass' && (
              <div className="bg-[#050505] border border-slate-900 rounded-[3rem] p-10 shadow-2xl space-y-6">
                <div className="flex items-center justify-between border-b border-slate-900 pb-6">
                  <div className="flex items-center gap-3">
                    <ShieldAlert className="w-6 h-6 text-amber-500" />
                    <div>
                      <h2 className="text-xl font-black text-white uppercase tracking-tighter">Emergency Break-Glass</h2>
                      <p className="text-xs text-slate-500">Active and audited emergency elevated sessions.</p>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-900 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                        <th className="py-4 px-6">Actor ID</th>
                        <th className="py-4 px-6">Reason</th>
                        <th className="py-4 px-6 text-center">Status</th>
                        <th className="py-4 px-6 text-center">Started</th>
                      </tr>
                    </thead>
                    <tbody>
                      {breakGlassSessions.map(session => (
                        <tr key={session.id} className="border-b border-slate-900/50 hover:bg-slate-950/40">
                          <td className="py-5 px-6 font-mono text-xs text-slate-300">{session.actor_id}</td>
                          <td className="py-5 px-6 text-slate-400 text-sm">{session.reason}</td>
                          <td className="py-5 px-6 text-center">
                            <span className={`inline-flex px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest ${
                              session.status === 'ACTIVE' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20 animate-pulse' : 'bg-slate-800 text-slate-400'
                            }`}>
                              {session.status}
                            </span>
                          </td>
                          <td className="py-5 px-6 text-center text-slate-400 text-xs">
                            {new Date(session.starts_at).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                      {breakGlassSessions.length === 0 && (
                        <tr><td colSpan={4} className="py-12 text-center text-slate-500">No emergency sessions</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Verification */}
            {activeTab === 'verify' && (
              <div className="bg-[#050505] border border-slate-900 rounded-[3rem] p-10 shadow-2xl space-y-8 text-center max-w-3xl mx-auto">
                <Shield className="w-20 h-20 text-teal-500/20 mx-auto" />
                <div className="space-y-4">
                  <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Ledger Cryptographic Verification</h2>
                  <p className="text-slate-400">Verify the unbroken chain of authority snapshots and ledger entries to assure zero tampering in the identity state.</p>
                </div>
                
                <button
                  onClick={verifyChain}
                  disabled={verifying}
                  className="bg-teal-500 hover:bg-teal-400 text-black font-black uppercase tracking-widest px-8 py-4 rounded-xl transition-all disabled:opacity-50"
                >
                  {verifying ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" /> Verifying Chain...
                    </span>
                  ) : "Run Chain Integrity Scan"}
                </button>

                {verificationResult && (
                  <div className={`mt-8 p-6 rounded-2xl border text-left ${
                    verificationResult.status === 'verified' 
                      ? 'bg-emerald-500/10 border-emerald-500/30' 
                      : 'bg-red-500/10 border-red-500/30'
                  }`}>
                    <div className="flex items-center gap-4 mb-4">
                      {verificationResult.status === 'verified' ? (
                        <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                      ) : (
                        <AlertCircle className="w-8 h-8 text-red-400" />
                      )}
                      <div>
                        <h3 className={`text-xl font-black uppercase tracking-widest ${
                          verificationResult.status === 'verified' ? 'text-emerald-400' : 'text-red-400'
                        }`}>
                          Chain {verificationResult.status}
                        </h3>
                        <p className="text-sm text-slate-400">
                          {verificationResult.verified_entry_count} ledger entries verified.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Actor Details Modal */}
      {selectedActor && actorDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0a0a0a] border border-slate-800 rounded-3xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-start mb-8 border-b border-slate-900 pb-6">
              <div>
                <h3 className="text-2xl font-black text-white">{actorDetails.actor.display_name}</h3>
                <p className="text-teal-400 font-mono text-xs tracking-widest mt-1">{actorDetails.actor.actor_id}</p>
              </div>
              <button 
                onClick={() => setSelectedActor(null)}
                className="text-slate-500 hover:text-white"
              >
                Close
              </button>
            </div>
            
            <div className="space-y-6">
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Authority Snapshot</h4>
                <div className="bg-slate-900/50 rounded-xl p-4 font-mono text-[10px] text-emerald-400 overflow-x-auto whitespace-pre">
                  {JSON.stringify(actorDetails.current_authority_snapshot, null, 2)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
