"use client";

import { useState, useEffect } from "react";
import { 
  X, 
  Shield, 
  Activity, 
  History, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle,
  FileText,
  User,
  ExternalLink,
  Pause,
  Play,
  RotateCcw,
  Globe
} from "lucide-react";
import { api } from "@/lib/api";
import StatusBadge from "@/components/ui/StatusBadge";

interface Incident {
  id: string;
  severity: string;
  incident_type: string;
  description: string;
  created_at: string;
}

interface AgentDetailsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  agent: any; // Using any for now to handle expanded data
  onUpdate: () => void;
}

export default function AgentDetailsDrawer({ isOpen, onClose, agent, onUpdate }: AgentDetailsDrawerProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'incidents' | 'governance' | 'deployment'>('overview');
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && agent) {
      // Mock fetching incidents
      setIncidents([
        {
          id: "inc-001",
          severity: "WARNING",
          incident_type: "BRAND_DRIFT",
          description: "Attempted to use non-standard font color in creative brief.",
          created_at: new Date(Date.now() - 86400000).toISOString()
        },
        {
          id: "inc-002",
          severity: "INFO",
          incident_type: "POLICY_CHECK",
          description: "Routine safety scan passed with 99% confidence.",
          created_at: new Date(Date.now() - 172800000).toISOString()
        }
      ]);
    }
  }, [isOpen, agent]);

  if (!isOpen || !agent) return null;

  return (
    <div className={`fixed inset-y-0 right-0 z-50 w-full max-w-xl bg-[var(--card)] border-l border-[var(--card-border)] shadow-2xl transform transition-transform duration-500 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
      <div className="flex flex-col h-full">
        
        {/* Header */}
        <div className="p-6 border-b border-[var(--card-border)] bg-[var(--surface)] flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
              <Shield className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[var(--foreground)]">{agent.name}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <StatusBadge status={agent.status} />
                <span className="text-xs text-[var(--foreground-muted)] uppercase tracking-widest font-bold">{agent.id.split('-')[0]}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[var(--surface-hover)] rounded-full transition-all">
            <X className="w-5 h-5 text-[var(--foreground-muted)]" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-6 bg-[var(--surface)]/50 border-b border-[var(--card-border)]">
          {[
            { id: 'overview', label: 'Overview', icon: Activity },
            { id: 'incidents', label: 'Incidents', icon: History },
            { id: 'deployment', label: 'Deployment', icon: Globe },
            { id: 'governance', label: 'Governance', icon: Shield },
          ].map(tab => (

            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-4 text-xs font-bold uppercase tracking-widest border-b-2 transition-all ${
                activeTab === tab.id 
                  ? 'border-indigo-500 text-indigo-500' 
                  : 'border-transparent text-[var(--foreground-muted)] hover:text-[var(--foreground)]'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
          {activeTab === 'overview' && (
            <div className="space-y-8 animate-in fade-in duration-500">
              {/* Scores */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-5 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">Trust Score</span>
                    <TrendingUp className="w-4 h-4 text-indigo-500" />
                  </div>
                  <div className="text-3xl font-black text-indigo-600">{(agent.trust_score * 100).toFixed(0)}%</div>
                  <div className="w-full h-1.5 bg-indigo-500/10 rounded-full">
                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${agent.trust_score * 100}%` }} />
                  </div>
                </div>
                <div className="p-5 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Faithfulness</span>
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="text-3xl font-black text-emerald-600">{(agent.faithfulness_score * 100).toFixed(0)}%</div>
                  <div className="w-full h-1.5 bg-emerald-500/10 rounded-full">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${agent.faithfulness_score * 100}%` }} />
                  </div>
                </div>
              </div>

              {/* Identity & Scope */}
              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-[var(--foreground-muted)] border-b border-[var(--card-border)] pb-2">Agent Identity & Scope</h3>
                <div className="grid grid-cols-2 gap-y-4 text-sm">
                  <div>
                    <div className="text-[10px] font-bold text-[var(--foreground-muted)] uppercase mb-1">Primary DRI</div>
                    <div className="flex items-center gap-2 font-medium">
                      <User className="w-4 h-4 text-indigo-500" />
                      {agent.primary_dri?.full_name || 'Unassigned'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-[var(--foreground-muted)] uppercase mb-1">Autonomy Level</div>
                    <div className="font-bold text-indigo-500">{agent.autonomy_level} Certified</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-[var(--foreground-muted)] uppercase mb-1">Assigned Brand</div>
                    <div className="font-medium">{agent.assigned_brand || 'Global System'}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-[var(--foreground-muted)] uppercase mb-1">Markets</div>
                    <div className="flex gap-1">
                      {agent.markets?.map((m: string) => (
                        <span key={m} className="px-2 py-0.5 bg-[var(--surface)] border border-[var(--border)] rounded text-[10px] font-bold">{m}</span>
                      )) || 'Global'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="pt-4 space-y-3">
                <h3 className="text-xs font-black uppercase tracking-widest text-[var(--foreground-muted)] mb-2">Lifecycle Management</h3>
                <div className="flex gap-3">
                  <button className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-amber-500/10 text-amber-600 border border-amber-500/20 rounded-xl text-xs font-bold hover:bg-amber-500 hover:text-white transition-all">
                    <Pause className="w-4 h-4" />
                    PAUSE AGENT
                  </button>
                  <button className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-rose-500/10 text-rose-600 border border-rose-500/20 rounded-xl text-xs font-bold hover:bg-rose-500 hover:text-white transition-all">
                    <RotateCcw className="w-4 h-4" />
                    RESET IDENTITY
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'incidents' && (
            <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-black uppercase tracking-widest text-[var(--foreground-muted)]">Recent Compliance Events</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-rose-500/10 text-rose-500 rounded-full border border-rose-500/20">{incidents.length} Alerts</span>
              </div>
              {incidents.length > 0 ? (
                incidents.map((inc) => (
                  <div key={inc.id} className="p-4 bg-[var(--surface)] border border-[var(--card-border)] rounded-2xl space-y-3 group hover:border-rose-500/30 transition-all">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className={`w-4 h-4 ${inc.severity === 'CRITICAL' ? 'text-rose-500' : 'text-amber-500'}`} />
                        <span className="text-[10px] font-black uppercase tracking-widest text-[var(--foreground)]">{inc.incident_type.replace(/_/g, ' ')}</span>
                      </div>
                      <span className="text-[10px] text-[var(--foreground-muted)] font-medium">{new Date(inc.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-xs text-[var(--foreground-muted)] leading-relaxed group-hover:text-[var(--foreground)] transition-colors">{incidents[0].description}</p>
                    <div className="flex justify-end">
                      <button className="text-[10px] font-bold text-indigo-500 flex items-center gap-1 hover:underline">
                        VIEW EVIDENCE <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-20 text-center space-y-4">
                  <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500 mx-auto">
                    <CheckCircle className="w-8 h-8" />
                  </div>
                  <p className="text-sm text-[var(--foreground-muted)] font-medium">No governance incidents recorded in the last 30 days.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'deployment' && (
            <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
              {/* Market Map Mock */}
              <div className="bg-[var(--surface)] border border-[var(--card-border)] rounded-3xl p-6 aspect-video flex flex-col items-center justify-center relative overflow-hidden group">
                <Globe className="w-32 h-32 text-indigo-500/10 absolute animate-pulse" />
                <div className="relative z-10 text-center space-y-2">
                  <h4 className="text-sm font-bold">Global Deployment Map</h4>
                  <p className="text-[10px] text-[var(--foreground-muted)] uppercase tracking-widest font-black">Cluster: AWS-USEAST-1</p>
                </div>
                {/* Mock Points */}
                <div className="absolute top-1/4 left-1/3 w-3 h-3 bg-indigo-500 rounded-full animate-ping" />
                <div className="absolute top-1/2 right-1/4 w-3 h-3 bg-emerald-500 rounded-full animate-ping" />
              </div>

              {/* Compliance Cards */}
              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-[var(--foreground-muted)] border-b border-[var(--card-border)] pb-2">Regional Compliance</h3>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { market: "North America", regulation: "FTC / CCPA", status: "Certified", color: "emerald" },
                    { market: "European Union", regulation: "GDPR / AI Act", status: "Active", color: "indigo" },
                    { market: "APAC", regulation: "Local Privacy", status: "Pending", color: "amber" },
                    { market: "LATAM", regulation: "Standard", status: "Certified", color: "emerald" },
                  ].map((market, i) => (
                    <div key={i} className="p-4 bg-[var(--surface)] border border-[var(--card-border)] rounded-2xl flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-tight">{market.market}</span>
                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border border-${market.color}-500/20 bg-${market.color}-500/10 text-${market.color}-500 uppercase`}>{market.status}</span>
                      </div>
                      <div className="text-xs font-bold text-[var(--foreground)]">{market.regulation}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Latency Monitoring */}
              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-[var(--foreground-muted)] mb-2">Regional Performance</h3>
                <div className="space-y-3">
                  {[
                    { region: "US-East (Virginia)", latency: "42ms", health: 100 },
                    { region: "EU-Central (Frankfurt)", latency: "112ms", health: 98 },
                    { region: "AP-Southeast (Singapore)", latency: "240ms", health: 94 },
                  ].map((reg, i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex justify-between text-[10px] font-bold">
                        <span className="text-[var(--foreground-muted)] uppercase tracking-tight">{reg.region}</span>
                        <span className="text-indigo-500">{reg.latency}</span>
                      </div>
                      <div className="w-full h-1 bg-[var(--surface)] rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 transition-all duration-1000" style={{ width: `${reg.health}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}


          {activeTab === 'governance' && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
              <div className="p-6 bg-indigo-600 rounded-3xl text-white space-y-4 shadow-xl shadow-indigo-600/20">
                <Shield className="w-10 h-10 opacity-50" />
                <div>
                  <h3 className="text-lg font-bold">Absolute Execution Policy</h3>
                  <p className="text-xs text-indigo-100 mt-1 leading-relaxed">This agent is bound by the platform operating contract v1.4. All actions are proxied through execution services with real-time audit logging.</p>
                </div>
                <button className="w-full py-2 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2">
                  <FileText className="w-4 h-4" />
                  VIEW OPERATING CONTRACT
                </button>
              </div>

              <div className="space-y-4">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-[var(--foreground-muted)]">Active Guardrails</h4>
                {[
                  { name: "Brand Safety Filter", status: "Enabled", type: "Blocking" },
                  { name: "Hallucination Detection", status: "Monitoring", type: "Reporting" },
                  { name: "Financial Data Gate", status: "Locked", type: "Strict" },
                ].map((g, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-[var(--background)] border border-[var(--border)] rounded-2xl">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-xs font-bold">{g.name}</span>
                    </div>
                    <span className="text-[10px] font-black px-2 py-0.5 bg-[var(--surface-hover)] rounded border border-[var(--border)] uppercase">{g.type}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-[var(--card-border)] bg-[var(--surface)] flex gap-4">
          <button onClick={onClose} className="flex-1 py-3 border border-[var(--border)] rounded-xl text-sm font-bold text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)] transition-all">
            Close Panel
          </button>
        </div>
      </div>
    </div>
  );
}
