"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useRoles } from "@/lib/hooks/useRoles";
import {
  Shield,
  Activity,
  AlertTriangle,
  FileText,
  Search,
  Filter,
  RefreshCw,
  Plus,
  Play,
  Lock,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  X,
  Settings,
  Scale,
  Cpu,
  Bookmark,
  Users,
  ShieldCheck,
  ShieldAlert,
  Archive,
  Database
} from "lucide-react";

interface PolicySummary {
  active_rules_count: number;
  blocked_last_24h: number;
  escalations_pending: number;
  policy_conflicts: number;
  simulation_failures: number;
  draft_changes: number;
}

interface PolicyRule {
  id: string;
  rule_id: string;
  domain: string;
  risk_category: string;
  severity: string;
  trigger_condition: string;
  enforcement_action: string;
  agent_impact: string;
  evidence_required: boolean;
  escalation_path: string;
  status: string;
  version: string;
  author_id: string;
  approver_id: string;
  created_at: string;
  updated_at: string;
}

interface EnforcementEvent {
  id: string;
  rule_id: string;
  actor: string;
  agent_id: string;
  input_reference: string;
  output_reference: string;
  decision: string;
  reason_code: string;
  created_at: string;
}

export default function PolicyControlMatrixPage() {
  const { hasRole, isLoading: rolesLoading } = useRoles();

  const [summary, setSummary] = useState<PolicySummary | null>(null);
  const [policies, setPolicies] = useState<PolicyRule[]>([]);
  const [events, setEvents] = useState<EnforcementEvent[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Guardrail Builder State
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [builderStep, setBuilderStep] = useState(1);
  const [builderError, setBuilderError] = useState<string | null>(null);
  
  // Simulation Panel State
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [selectedSimRule, setSelectedSimRule] = useState<PolicyRule | null>(null);
  const [simType, setSimType] = useState("Sample Payload Test");
  const [simPayload, setSimPayload] = useState('{\n  "intent": "generate_post",\n  "content": "Our new product guarantees 100% ROI within the first month!"\n}');
  const [simResult, setSimResult] = useState<any | null>(null);
  const [runningSim, setRunningSim] = useState(false);

  // Pagination & Filtering
  const [page, setPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  const fetchDashboardData = async (silent = false) => {
    if (!silent) setIsRefreshing(true);
    try {
      const sumRes = await api.get("/api/safety/policies/summary");
      if (sumRes.success) setSummary(sumRes.data);

      const polRes = await api.get(`/api/safety/policies?page=${page}&limit=20`);
      if (polRes.success) {
        setPolicies(polRes.data);
        setTotalRecords(polRes.meta?.total || 0);
      }

      const evtRes = await api.get("/api/safety/enforcement/events");
      if (evtRes.success) setEvents(evtRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  // Guardrail Builder Form State
  const [formData, setFormData] = useState({
    domain: 'Compliance',
    risk_category: '',
    severity: 'Medium',
    trigger_condition: '',
    enforcement_action: 'Warn',
    rationale: '',
    evidence_required: true,
    escalation_path: '',
    approver_id: '',
    status: 'Draft'
  });

  const handleNextStep = () => {
    if (builderStep < 8) setBuilderStep(builderStep + 1);
  };
  
  const handlePrevStep = () => {
    if (builderStep > 1) setBuilderStep(builderStep - 1);
  };

  const submitGuardrail = async () => {
    setBuilderError(null);
    try {
      const res = await api.post("/api/safety/policies", {
        ...formData,
        status: 'Pending Approval' // Deployment step initiates approval request
      });
      if (res.success) {
        setIsBuilderOpen(false);
        setBuilderStep(1);
        setFormData({
          domain: 'Compliance',
          risk_category: '',
          severity: 'Medium',
          trigger_condition: '',
          enforcement_action: 'Warn',
          rationale: '',
          evidence_required: true,
          escalation_path: '',
          approver_id: '',
          status: 'Draft'
        });
        fetchDashboardData();
        alert("Rule successfully submitted to Pending Approval queue.");
      } else {
        setBuilderError(res.error);
      }
    } catch (err: any) {
      setBuilderError(err.message || "Failed to submit guardrail.");
    }
  };

  const runSimulation = async () => {
    if (!selectedSimRule) return;
    setRunningSim(true);
    setSimResult(null);
    try {
      let parsedPayload = {};
      try { parsedPayload = JSON.parse(simPayload); } catch { parsedPayload = { text: simPayload }; }

      const res = await api.post("/api/safety/policies/simulate", {
        rule_id: selectedSimRule.rule_id,
        simulation_type: simType,
        payload: parsedPayload
      });
      if (res.success) {
        setSimResult(res.data);
      } else {
        alert(res.error || "Simulation failed.");
      }
    } catch (err: any) {
      alert(err.message || "Simulation error.");
    } finally {
      setRunningSim(false);
      fetchDashboardData(true); // refresh failures count
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a0a0a] text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500 mb-4"></div>
        <p className="text-[#888] font-medium tracking-wide">Syncing Policy Control Matrix...</p>
      </div>
    );
  }

  const getSeverityColor = (sev: string) => {
    if (sev === "Critical") return "text-rose-400 bg-rose-500/10 border-rose-500/20";
    if (sev === "High") return "text-orange-400 bg-orange-500/10 border-orange-500/20";
    if (sev === "Medium") return "text-amber-400 bg-amber-500/10 border-amber-500/20";
    return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
  };

  const getStatusColor = (status: string) => {
    if (status === "Active") return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
    if (status === "Pending Approval") return "text-amber-400 bg-amber-500/10 border-amber-500/20 animate-pulse";
    if (status === "Draft") return "text-[#888] bg-[#222] border-[#333]";
    if (status === "Retired" || status === "Superseded") return "text-[#555] bg-transparent border-[#222] line-through";
    return "text-purple-400 bg-purple-500/10 border-purple-500/20"; // Rollback
  };

  const getActionColor = (action: string) => {
    if (action === "Block") return "text-rose-400";
    if (action === "Quarantine" || action === "Escalate") return "text-orange-400";
    if (action === "Warn") return "text-amber-400";
    if (action === "Allow") return "text-emerald-400";
    return "text-blue-400";
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#ddd] pb-24 font-sans selection:bg-amber-500/30 selection:text-white flex flex-col justify-between">
      
      {/* Main Workspace Frame */}
      <div className="max-w-[1700px] w-full mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-8 flex-1 flex flex-col">
        
        {/* Header Strip */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[#222] pb-6">
          <div>
            <div className="flex items-center gap-2.5">
              <Scale className="w-8 h-8 text-amber-500" />
              <h1 className="text-3xl font-extrabold text-white tracking-tight">Policy Control Matrix</h1>
            </div>
            <p className="text-[#888] text-sm mt-1">
              Tier-0 Guardrail Enforcement Engine & Structural Validation
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchDashboardData(true)}
              className="p-2.5 bg-[#141414] hover:bg-[#1f1f1f] border border-[#2d2d2d] hover:border-[#444] rounded-xl transition-all flex items-center justify-center text-[#888] hover:text-white"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-white" : ""}`} />
            </button>
            <button
              onClick={() => setIsBuilderOpen(true)}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black text-sm font-extrabold rounded-xl transition-all flex items-center gap-1.5 shadow-lg shadow-amber-500/10"
            >
              <Plus className="w-4 h-4" />
              New Guardrail
            </button>
          </div>
        </div>

        {/* Control Summary Strip (6 Clickable Cards) */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-[#111] hover:bg-[#141414] border border-[#222] hover:border-[#333] rounded-2xl p-4 cursor-pointer transition-all">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold text-[#888] uppercase tracking-widest">Active Rules</span>
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
            </div>
            <h3 className="text-2xl font-black text-white mt-2">{summary?.active_rules_count || 0}</h3>
          </div>
          
          <div className="bg-[#111] hover:bg-[#141414] border border-[#222] hover:border-[#333] rounded-2xl p-4 cursor-pointer transition-all">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold text-[#888] uppercase tracking-widest">Blocked (24h)</span>
              <ShieldAlert className="w-4 h-4 text-rose-500" />
            </div>
            <h3 className="text-2xl font-black text-white mt-2">{summary?.blocked_last_24h || 0}</h3>
          </div>
          
          <div className="bg-[#111] hover:bg-[#141414] border border-[#222] hover:border-[#333] rounded-2xl p-4 cursor-pointer transition-all">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold text-[#888] uppercase tracking-widest">Escalations</span>
              <AlertTriangle className="w-4 h-4 text-orange-500" />
            </div>
            <h3 className="text-2xl font-black text-white mt-2">{summary?.escalations_pending || 0}</h3>
          </div>
          
          <div className="bg-[#111] hover:bg-[#141414] border border-rose-500/30 rounded-2xl p-4 cursor-pointer transition-all">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold text-rose-400 uppercase tracking-widest">Conflicts</span>
              <Activity className="w-4 h-4 text-rose-500" />
            </div>
            <h3 className="text-2xl font-black text-rose-400 mt-2">{summary?.policy_conflicts || 0}</h3>
          </div>

          <div className="bg-[#111] hover:bg-[#141414] border border-[#222] hover:border-[#333] rounded-2xl p-4 cursor-pointer transition-all">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold text-[#888] uppercase tracking-widest">Sim Failures</span>
              <Cpu className="w-4 h-4 text-amber-500" />
            </div>
            <h3 className="text-2xl font-black text-white mt-2">{summary?.simulation_failures || 0}</h3>
          </div>

          <div className="bg-[#111] hover:bg-[#141414] border border-[#222] hover:border-[#333] rounded-2xl p-4 cursor-pointer transition-all">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold text-[#888] uppercase tracking-widest">Drafts</span>
              <FileText className="w-4 h-4 text-[#555]" />
            </div>
            <h3 className="text-2xl font-black text-white mt-2">{summary?.draft_changes || 0}</h3>
          </div>
        </div>

        {/* Server-Paginated Policy Control Matrix */}
        <div className="bg-[#111] border border-[#222] rounded-2xl overflow-hidden shadow-xl flex-1 flex flex-col">
          <div className="p-4 border-b border-[#222] flex flex-wrap justify-between items-center gap-4 bg-[#141414]">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-white uppercase tracking-wider">Operational Matrix</span>
              <span className="px-2 py-0.5 bg-[#222] text-[#888] rounded text-[10px] font-mono">{totalRecords} Rules</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#666] absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="text" 
                  placeholder="Search Rule ID or condition..." 
                  className="bg-black border border-[#2d2d2d] focus:border-[#555] rounded-lg pl-9 pr-4 py-1.5 text-xs text-white focus:outline-none w-64"
                />
              </div>
              <button className="px-3 py-1.5 bg-[#222] hover:bg-[#333] border border-[#333] rounded-lg text-xs font-bold text-white flex items-center gap-1.5 transition-colors">
                <Filter className="w-3.5 h-3.5" /> Filters
              </button>
            </div>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse min-w-[1200px]">
              <thead>
                <tr className="bg-black/60 border-b border-[#222] text-[#666] text-[9px] uppercase tracking-wider font-bold">
                  <th className="p-4 w-28">Rule ID</th>
                  <th className="p-4">Domain</th>
                  <th className="p-4">Risk Category</th>
                  <th className="p-4">Severity</th>
                  <th className="p-4 w-64">Trigger Condition</th>
                  <th className="p-4">Action</th>
                  <th className="p-4">Impact</th>
                  <th className="p-4 text-center">Evid.</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e1e1e] text-xs">
                {policies.length > 0 ? policies.map(pol => (
                  <tr key={pol.id} className="hover:bg-[#161616] transition-colors group">
                    <td className="p-4 font-mono font-bold text-amber-500/80 group-hover:text-amber-400">{pol.rule_id}</td>
                    <td className="p-4 text-white">{pol.domain}</td>
                    <td className="p-4 text-[#aaa]">{pol.risk_category}</td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${getSeverityColor(pol.severity)}`}>
                        {pol.severity}
                      </span>
                    </td>
                    <td className="p-4 text-[#888] font-mono text-[10px] truncate max-w-[250px]" title={pol.trigger_condition}>
                      {pol.trigger_condition}
                    </td>
                    <td className="p-4 font-bold">
                      <span className={getActionColor(pol.enforcement_action)}>{pol.enforcement_action}</span>
                    </td>
                    <td className="p-4 text-[#666]">{pol.agent_impact}</td>
                    <td className="p-4 text-center">
                      {pol.evidence_required ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500 mx-auto" /> : <X className="w-3.5 h-3.5 text-neutral-600 mx-auto" />}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${getStatusColor(pol.status)}`}>
                        {pol.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => { setSelectedSimRule(pol); setIsSimulatorOpen(true); }}
                          className="px-2 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/30 hover:bg-blue-500/20 rounded font-bold text-[10px] flex items-center gap-1"
                        >
                          <Play className="w-3 h-3" /> Simulate
                        </button>
                        <button className="px-2 py-1 bg-[#222] hover:bg-[#333] border border-[#333] text-white rounded font-bold text-[10px]">
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={10} className="p-12 text-center text-[#666] font-mono text-sm">
                      No policy rules found in the active workspace context.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          <div className="p-3 border-t border-[#222] bg-[#0c0c0c] flex justify-between items-center text-[10px] text-[#666] font-mono">
            <span>Showing Page {page}</span>
            <div className="flex gap-2">
              <button 
                disabled={page === 1} 
                onClick={() => setPage(page - 1)}
                className="px-2 py-1 bg-[#1a1a1a] hover:bg-[#222] disabled:opacity-50 border border-[#222] rounded"
              >
                Previous
              </button>
              <button 
                onClick={() => setPage(page + 1)}
                className="px-2 py-1 bg-[#1a1a1a] hover:bg-[#222] border border-[#222] rounded"
              >
                Next
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Enforcement Decision Events Strip */}
      <div className="bg-[#111] border-t border-[#222] p-4 sticky bottom-0 z-40 backdrop-blur-md bg-opacity-95 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.5)]">
        <div className="max-w-[1700px] mx-auto px-4 flex flex-col md:flex-row items-center gap-4 justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-[#222] rounded-lg">
              <Activity className="w-3.5 h-3.5 text-amber-500" />
            </span>
            <span className="text-xs font-black uppercase text-white tracking-widest">Enforcement Engine Telemetry</span>
            <span className="text-[10px] text-[#666]">(Live Decisions)</span>
          </div>

          <div className="flex-1 overflow-x-auto whitespace-nowrap flex gap-4 px-4 no-scrollbar">
            {events.map((evt) => (
              <div 
                key={evt.id} 
                className="bg-[#1a1a1a] border border-[#2c2d2d] px-3.5 py-1.5 rounded-xl inline-flex items-center gap-2 text-[10px] select-none"
              >
                <span className={`font-bold uppercase ${getActionColor(evt.decision)}`}>[{evt.decision}]</span>
                <span className="text-white font-mono">{evt.rule_id}</span>
                <ArrowRight className="w-3 h-3 text-[#555]" />
                <span className="text-[#888] font-medium">{evt.actor}</span>
                <span className="text-[9px] font-mono text-[#555] ml-1">Ref: {evt.output_reference}</span>
              </div>
            ))}
            {events.length === 0 && <span className="text-[10px] text-[#555] font-mono">No recent enforcement events.</span>}
          </div>
        </div>
      </div>

      {/* Guardrail Builder Drawer (8 Steps) */}
      {isBuilderOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/80 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="bg-[#111] border-l border-[#222] w-full max-w-2xl h-full p-8 shadow-2xl overflow-y-auto flex flex-col justify-between">
            
            <div>
              <div className="flex justify-between items-start mb-8">
                <div>
                  <span className="text-[10px] font-mono text-amber-500 uppercase tracking-widest">Workspace Builder</span>
                  <h3 className="text-2xl font-black text-white mt-1">Guardrail Configuration</h3>
                </div>
                <button
                  onClick={() => setIsBuilderOpen(false)}
                  className="p-1.5 hover:bg-[#222] border border-[#2d2d2d] rounded-lg text-[#666] hover:text-white transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Step indicator */}
              <div className="flex gap-1 mb-8">
                {[1,2,3,4,5,6,7,8].map(s => (
                  <div key={s} className={`h-1 flex-1 rounded-full ${builderStep >= s ? 'bg-amber-500' : 'bg-[#222]'}`} />
                ))}
              </div>

              {/* Form Content Based on Step */}
              <div className="space-y-6">
                
                {builderStep === 1 && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2"><Filter className="w-4 h-4 text-amber-500"/> 1. Scope & Domain</h4>
                    <div>
                      <label className="block text-xs font-bold text-[#888] mb-1.5">Policy Domain</label>
                      <select value={formData.domain} onChange={e => setFormData({...formData, domain: e.target.value})} className="w-full bg-black border border-[#333] rounded-xl px-4 py-3 text-xs text-white">
                        <option value="Compliance">Compliance</option>
                        <option value="Brand">Brand Standards</option>
                        <option value="Security">Security</option>
                        <option value="Legal">Legal</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#888] mb-1.5">Risk Category</label>
                      <input type="text" value={formData.risk_category} onChange={e => setFormData({...formData, risk_category: e.target.value})} placeholder="e.g. Financial Claims, Tone Drift" className="w-full bg-black border border-[#333] rounded-xl px-4 py-3 text-xs text-white" />
                    </div>
                  </div>
                )}

                {builderStep === 2 && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-500"/> 2. Base Severity</h4>
                    <div>
                      <label className="block text-xs font-bold text-[#888] mb-1.5">Severity Rating</label>
                      <select value={formData.severity} onChange={e => setFormData({...formData, severity: e.target.value})} className="w-full bg-black border border-[#333] rounded-xl px-4 py-3 text-xs text-white">
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                        <option value="Critical">Critical</option>
                      </select>
                    </div>
                  </div>
                )}

                {builderStep === 3 && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2"><Search className="w-4 h-4 text-amber-500"/> 3. Trigger Condition</h4>
                    <div>
                      <label className="block text-xs font-bold text-[#888] mb-1.5">Condition Expression (Regex or Natural Logic)</label>
                      <textarea value={formData.trigger_condition} onChange={e => setFormData({...formData, trigger_condition: e.target.value})} placeholder="e.g. Payload matches regex: /(guaranteed returns|100% ROI)/i" className="w-full h-32 bg-black border border-[#333] rounded-xl p-4 text-xs text-white font-mono resize-none" />
                      <p className="text-[10px] text-[#666] mt-2">Natural language allowed. System will map to deterministic structure.</p>
                    </div>
                  </div>
                )}

                {builderStep === 4 && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2"><Shield className="w-4 h-4 text-amber-500"/> 4. Enforcement Action</h4>
                    <div>
                      <label className="block text-xs font-bold text-[#888] mb-1.5">Action Outcome</label>
                      <select value={formData.enforcement_action} onChange={e => setFormData({...formData, enforcement_action: e.target.value})} className="w-full bg-black border border-[#333] rounded-xl px-4 py-3 text-xs text-white">
                        <option value="Allow">Allow (No restriction)</option>
                        <option value="Warn">Warn (Proceed with logged alert)</option>
                        <option value="Require Review">Require Review (HITL Queue)</option>
                        <option value="Block">Block (Halt execution)</option>
                        <option value="Quarantine">Quarantine (Vaulted isolation)</option>
                        <option value="Redact">Redact (Mask output)</option>
                        <option value="Escalate">Escalate (Route to manager)</option>
                        <option value="Pause Agent">Pause Agent (Suspend autonomy)</option>
                      </select>
                    </div>
                  </div>
                )}

                {builderStep === 5 && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2"><FileText className="w-4 h-4 text-amber-500"/> 5. Rationale</h4>
                    <div>
                      <label className="block text-xs font-bold text-[#888] mb-1.5">Business Rationale</label>
                      <textarea value={formData.rationale} onChange={e => setFormData({...formData, rationale: e.target.value})} placeholder="Provide exact reasoning for this rule implementation..." className="w-full h-24 bg-black border border-[#333] rounded-xl p-4 text-xs text-white resize-none" />
                    </div>
                  </div>
                )}

                {builderStep === 6 && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2"><Archive className="w-4 h-4 text-amber-500"/> 6. Evidence</h4>
                    <div className="flex items-center gap-3 bg-[#141414] border border-[#222] p-4 rounded-xl">
                      <input type="checkbox" checked={formData.evidence_required} onChange={e => setFormData({...formData, evidence_required: e.target.checked})} className="w-4 h-4 rounded text-amber-500 bg-black border-[#333]" />
                      <div>
                        <label className="block text-xs font-bold text-white">Require Evidence Snapshot</label>
                        <p className="text-[10px] text-[#888]">Capture immutable forensic snapshot to Evidence Vault when triggered.</p>
                      </div>
                    </div>
                  </div>
                )}

                {builderStep === 7 && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2"><Users className="w-4 h-4 text-amber-500"/> 7. Approval & Escalation</h4>
                    <div>
                      <label className="block text-xs font-bold text-[#888] mb-1.5">Escalation Path (Queue/Role)</label>
                      <input type="text" value={formData.escalation_path} onChange={e => setFormData({...formData, escalation_path: e.target.value})} placeholder="e.g. Legal Counsel, Security Operations" className="w-full bg-black border border-[#333] rounded-xl px-4 py-3 text-xs text-white" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#888] mb-1.5">Designated Approver ID (Mandatory for High/Critical)</label>
                      <input type="text" value={formData.approver_id} onChange={e => setFormData({...formData, approver_id: e.target.value})} placeholder="e.g. USR-042" className="w-full bg-black border border-[#333] rounded-xl px-4 py-3 text-xs text-white font-mono" />
                      <p className="text-[10px] text-rose-400 mt-2 flex items-center gap-1"><Lock className="w-3 h-3"/> Author cannot be sole approver for production deployment.</p>
                    </div>
                  </div>
                )}

                {builderStep === 8 && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-500"/> 8. Deployment Review</h4>
                    <div className="bg-[#141414] border border-[#222] rounded-xl p-5 space-y-3 font-mono text-xs text-[#888]">
                      <div className="flex justify-between"><span className="text-[#666]">Domain:</span> <span className="text-white">{formData.domain}</span></div>
                      <div className="flex justify-between"><span className="text-[#666]">Severity:</span> <span className={getSeverityColor(formData.severity)}>{formData.severity}</span></div>
                      <div className="flex justify-between"><span className="text-[#666]">Action:</span> <span className="text-white font-bold">{formData.enforcement_action}</span></div>
                      <div className="flex justify-between"><span className="text-[#666]">Trigger:</span> <span className="text-white text-right max-w-[200px] truncate">{formData.trigger_condition || 'MISSING'}</span></div>
                    </div>

                    {builderError && (
                      <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl text-xs font-semibold flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>{builderError}</span>
                      </div>
                    )}
                  </div>
                )}

              </div>
            </div>

            <div className="pt-8 border-t border-[#222] flex justify-between items-center mt-8">
              <button
                onClick={handlePrevStep}
                disabled={builderStep === 1}
                className="px-4 py-2 bg-transparent text-[#666] hover:text-white disabled:opacity-30 text-xs font-bold transition-all flex items-center gap-1"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              
              {builderStep < 8 ? (
                <button
                  onClick={handleNextStep}
                  className="px-6 py-2 bg-[#222] hover:bg-[#333] border border-[#333] text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2"
                >
                  Next Step <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={submitGuardrail}
                  className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-black rounded-xl text-xs font-extrabold transition-all shadow-lg shadow-amber-500/10"
                >
                  Submit to Pending Approval
                </button>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Policy Simulation Panel Drawer */}
      {isSimulatorOpen && selectedSimRule && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/80 backdrop-blur-sm" role="dialog">
          <div className="bg-[#111] border-l border-[#222] w-full max-w-2xl h-full p-8 shadow-2xl overflow-y-auto flex flex-col justify-between">
            
            <div className="space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-mono text-blue-400 uppercase tracking-widest flex items-center gap-1.5"><Cpu className="w-3.5 h-3.5"/> Simulation Engine</span>
                  <h3 className="text-xl font-black text-white mt-1">Rule: {selectedSimRule.rule_id}</h3>
                </div>
                <button onClick={() => setIsSimulatorOpen(false)} className="p-1.5 hover:bg-[#222] border border-[#2d2d2d] rounded-lg text-[#666]"><X className="w-4 h-4" /></button>
              </div>

              <div className="p-4 bg-[#141414] border border-[#222] rounded-xl flex flex-col gap-2">
                <span className="text-[10px] text-[#666] font-bold uppercase">Trigger Condition Active</span>
                <code className="text-xs text-amber-400 bg-black p-2 rounded border border-[#333]">{selectedSimRule.trigger_condition}</code>
                <span className="text-[10px] text-[#666] font-bold uppercase mt-2">Configured Action: <span className="text-white">{selectedSimRule.enforcement_action}</span></span>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#888] mb-1.5">Simulation Type</label>
                  <select value={simType} onChange={e => setSimType(e.target.value)} className="w-full bg-black border border-[#333] rounded-xl px-4 py-2 text-xs text-white">
                    <option>Sample Payload Test</option>
                    <option>Historical Replay</option>
                    <option>Agent Workflow Test</option>
                    <option>Conflict Test</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#888] mb-1.5">Input Payload (JSON)</label>
                  <textarea 
                    value={simPayload} 
                    onChange={e => setSimPayload(e.target.value)} 
                    className="w-full h-40 bg-black border border-[#333] focus:border-[#555] rounded-xl p-4 text-xs text-emerald-400 font-mono resize-none" 
                  />
                </div>
                
                <button
                  onClick={runSimulation}
                  disabled={runningSim}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-900/50 text-white font-black text-xs rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  {runningSim ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  {runningSim ? "Computing Deterministic Outcome..." : "Execute Simulation"}
                </button>
              </div>

              {simResult && (
                <div className="mt-6 space-y-3 animate-in slide-in-from-bottom-4 fade-in">
                  <h4 className="text-xs font-bold text-[#888] uppercase tracking-wider border-b border-[#222] pb-2">Execution Result</h4>
                  
                  <div className="flex justify-between items-center p-4 bg-[#141414] border border-[#333] rounded-xl">
                    <span className="text-xs font-mono text-[#666]">Deterministic Outcome:</span>
                    <span className={`text-sm font-black uppercase px-3 py-1 rounded border ${
                      simResult.outcome === 'block' || simResult.outcome === 'conflict' ? 'text-rose-400 bg-rose-500/10 border-rose-500/30' :
                      simResult.outcome === 'warn' || simResult.outcome === 'escalate' || simResult.outcome === 'quarantine' ? 'text-orange-400 bg-orange-500/10 border-orange-500/30' :
                      'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
                    }`}>
                      {simResult.outcome}
                    </span>
                  </div>

                  <div className="p-4 bg-black border border-[#222] rounded-xl font-mono text-[10px] text-[#aaa] space-y-2">
                    <p><span className="text-[#666]">Reason:</span> <span className="text-white">{simResult.reason}</span></p>
                    <p><span className="text-[#666]">Exec Time:</span> {simResult.execution_time_ms}ms</p>
                    <p><span className="text-[#666]">Sim ID:</span> {simResult.simulation_id}</p>
                  </div>
                  
                  <p className="text-[9px] text-[#555] italic text-center">Simulation results attach to the approval package automatically.</p>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
