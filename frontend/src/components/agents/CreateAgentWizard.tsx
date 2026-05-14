"use client";

import { useState, useEffect } from "react";
import { 
  X, 
  ChevronRight, 
  ChevronLeft, 
  Check, 
  Bot, 
  Shield, 
  User, 
  Target,
  BrainCircuit,
  MessageSquare
} from "lucide-react";
import { api } from "@/lib/api";

interface Member {
  id: string;
  full_name: string;
  email: string;
}

interface CreateAgentWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const STEPS = [
  { id: 1, title: "Identity", icon: Bot },
  { id: 2, title: "Type", icon: BrainCircuit },
  { id: 3, title: "DRI", icon: User },
  { id: 4, title: "Boundaries", icon: Shield },
  { id: 5, title: "Grounding", icon: Target },
  { id: 6, title: "Review", icon: Check },
];

const AGENT_TYPES = [
  { id: "content", label: "Content Agent", description: "Drafts captions, threads, and articles." },
  { id: "research", label: "Research Agent", description: "Analyzes trends and competitor signals." },
  { id: "optimization", label: "Optimization Agent", description: "Recommends posting times and angles." },
  { id: "governance", label: "Governance Agent", description: "Checks claims and policy compliance." },
  { id: "response", label: "Response Agent", description: "Drafts community and engagement copy." },
];

export default function CreateAgentWizard({ isOpen, onClose, onSuccess }: CreateAgentWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    purpose: "",
    type: "content",
    primary_dri_id: "",
    backup_dri_id: "",
    workspace_id: "",
    org_id: "",
    permitted_actions: [] as string[],
    prohibited_actions: [] as string[],
    knowledge_base: "core_brand_v1",
    policy_tier: "standard_compliance"
  });

  const [actionInput, setActionInput] = useState({ permitted: "", prohibited: "" });

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Fetch Members
        const membersRes = await api.get('/api/v1/team/members');
        if (membersRes.success) setMembers(membersRes.data);

        // 2. Fetch User Context for IDs
        const contextRes = await api.get('/api/v1/user/context');
        if (contextRes.success) {
          setFormData(prev => ({
            ...prev,
            org_id: contextRes.data.org_id,
            workspace_id: contextRes.data.workspace_id
          }));
        }
      } catch (err) {
        console.error("Failed to fetch wizard data", err);
      }
    };
    if (isOpen) fetchData();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleNext = () => setCurrentStep(prev => Math.min(prev + 1, STEPS.length));
  const handleBack = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  const addAction = (type: 'permitted' | 'prohibited') => {
    const val = actionInput[type].trim();
    if (val) {
      setFormData(prev => ({
        ...prev,
        [type === 'permitted' ? 'permitted_actions' : 'prohibited_actions']: [
          ...prev[type === 'permitted' ? 'permitted_actions' : 'prohibited_actions'],
          val
        ]
      }));
      setActionInput(prev => ({ ...prev, [type]: "" }));
    }
  };

  const removeAction = (type: 'permitted' | 'prohibited', index: number) => {
    setFormData(prev => ({
      ...prev,
      [type === 'permitted' ? 'permitted_actions' : 'prohibited_actions']: 
        prev[type === 'permitted' ? 'permitted_actions' : 'prohibited_actions'].filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      // Transform data for backend if needed
      const payload = {
        ...formData,
        metadata: {
          permitted_actions: formData.permitted_actions,
          prohibited_actions: formData.prohibited_actions,
          knowledge_base: formData.knowledge_base,
          policy_tier: formData.policy_tier
        }
      };
      const result = await api.post('/api/v1/agents', payload);
      if (result.success) {
        onSuccess();
        onClose();
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to register agent");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--overlay)] backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-[var(--card)] border border-[var(--card-border)] w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--card-border)] flex items-center justify-between bg-[var(--surface)]/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center text-white">
              <Bot className="w-5 h-5" />
            </div>
            <h2 className="font-bold text-lg">Hire New Agent</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[var(--surface-hover)] rounded-full transition-all">
            <X className="w-5 h-5 text-[var(--foreground-muted)]" />
          </button>
        </div>

        {/* Stepper */}
        <div className="px-6 py-4 bg-[var(--surface)]/30 flex justify-between border-b border-[var(--card-border)] overflow-x-auto gap-4">
          {STEPS.map((step) => (
            <div key={step.id} className="flex items-center gap-2 shrink-0">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border transition-all ${
                currentStep >= step.id ? "bg-indigo-500 border-indigo-500 text-white" : "bg-[var(--surface)] border-[var(--border)] text-[var(--foreground-muted)]"
              }`}>
                {currentStep > step.id ? <Check className="w-3.5 h-3.5" /> : step.id}
              </div>
              <span className={`text-xs font-semibold ${currentStep >= step.id ? "text-[var(--foreground)]" : "text-[var(--foreground-muted)]"}`}>
                {step.title}
              </span>
              {step.id < STEPS.length && <div className="w-4 h-[1px] bg-[var(--border)] ml-1" />}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8">
          {currentStep === 1 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <div className="space-y-2">
                <label className="text-sm font-bold uppercase tracking-wider text-[var(--foreground-muted)]">Agent Name</label>
                <input 
                  type="text" 
                  className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl py-3 px-4 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all text-[var(--foreground)]"
                  placeholder="e.g. Nexus Content Lead"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold uppercase tracking-wider text-[var(--foreground-muted)]">Business Purpose</label>
                <textarea 
                  className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl py-3 px-4 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all h-32 resize-none text-[var(--foreground)]"
                  placeholder="What is this agent's primary objective?"
                  value={formData.purpose}
                  onChange={(e) => setFormData(prev => ({ ...prev, purpose: e.target.value }))}
                />
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="grid grid-cols-1 gap-3 animate-in slide-in-from-right-4 duration-300">
              <label className="text-sm font-bold uppercase tracking-wider text-[var(--foreground-muted)] mb-2">Agent Type</label>
              {AGENT_TYPES.map((type) => (
                <button
                  key={type.id}
                  onClick={() => setFormData(prev => ({ ...prev, type: type.id }))}
                  className={`flex items-start gap-4 p-4 rounded-2xl border transition-all text-left group ${
                    formData.type === type.id 
                      ? "bg-indigo-500/10 border-indigo-500 ring-1 ring-indigo-500" 
                      : "bg-[var(--background)] border-[var(--border)] hover:border-indigo-500/50"
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                    formData.type === type.id ? "bg-indigo-500 text-white" : "bg-[var(--surface-hover)] text-[var(--foreground-muted)]"
                  }`}>
                    <Target className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-[var(--foreground)]">{type.label}</div>
                    <div className="text-xs text-[var(--foreground-muted)]">{type.description}</div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <div className="space-y-2">
                <label className="text-sm font-bold uppercase tracking-wider text-[var(--foreground-muted)]">Primary DRI</label>
                <select 
                  className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl py-3 px-4 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all text-[var(--foreground)]"
                  value={formData.primary_dri_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, primary_dri_id: e.target.value }))}
                >
                  <option value="">Select a team member</option>
                  {members.map(m => (
                    <option key={m.id} value={m.id} className="text-black">{m.full_name}</option>
                  ))}
                </select>
                <p className="text-xs text-[var(--foreground-muted)] flex items-center gap-1 mt-1">
                  <Shield className="w-3 h-3 text-emerald-500" />
                  Responsible for all agent actions and policy compliance.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold uppercase tracking-wider text-[var(--foreground-muted)]">Backup DRI</label>
                <select 
                  className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl py-3 px-4 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all text-[var(--foreground)]"
                  value={formData.backup_dri_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, backup_dri_id: e.target.value }))}
                >
                  <option value="">Select a backup</option>
                  {members.map(m => (
                    <option key={m.id} value={m.id} className="text-black">{m.full_name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <div className="space-y-4">
                <label className="text-sm font-bold uppercase tracking-wider text-[var(--foreground-muted)]">Permitted Actions</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    className="flex-1 bg-[var(--background)] border border-[var(--border)] rounded-xl py-2 px-4 text-sm outline-none text-[var(--foreground)]"
                    placeholder="e.g. Generate LinkedIn copy"
                    value={actionInput.permitted}
                    onChange={(e) => setActionInput(prev => ({ ...prev, permitted: e.target.value }))}
                    onKeyDown={(e) => e.key === 'Enter' && addAction('permitted')}
                  />
                  <button onClick={() => addAction('permitted')} className="bg-indigo-500/10 text-indigo-500 px-4 rounded-xl font-bold text-xs hover:bg-indigo-500 hover:text-white transition-all">ADD</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.permitted_actions.map((act, i) => (
                    <span key={i} className="px-3 py-1 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-full text-xs flex items-center gap-2">
                      {act}
                      <X className="w-3 h-3 cursor-pointer" onClick={() => removeAction('permitted', i)} />
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-sm font-bold uppercase tracking-wider text-rose-500">Prohibited Actions</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    className="flex-1 bg-[var(--background)] border border-[var(--border)] rounded-xl py-2 px-4 text-sm outline-none text-[var(--foreground)]"
                    placeholder="e.g. Access financial data"
                    value={actionInput.prohibited}
                    onChange={(e) => setActionInput(prev => ({ ...prev, prohibited: e.target.value }))}
                    onKeyDown={(e) => e.key === 'Enter' && addAction('prohibited')}
                  />
                  <button onClick={() => addAction('prohibited')} className="bg-rose-500/10 text-rose-500 px-4 rounded-xl font-bold text-xs hover:bg-rose-500 hover:text-white transition-all">ADD</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.prohibited_actions.map((act, i) => (
                    <span key={i} className="px-3 py-1 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-full text-xs flex items-center gap-2">
                      {act}
                      <X className="w-3 h-3 cursor-pointer" onClick={() => removeAction('prohibited', i)} />
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {currentStep === 5 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <div className="space-y-2">
                <label className="text-sm font-bold uppercase tracking-wider text-[var(--foreground-muted)]">Knowledge Grounding</label>
                <select 
                  className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl py-3 px-4 outline-none text-[var(--foreground)]"
                  value={formData.knowledge_base}
                  onChange={(e) => setFormData(prev => ({ ...prev, knowledge_base: e.target.value }))}
                >
                  <option value="core_brand_v1">Core Brand Standards v1.4</option>
                  <option value="market_research_global">Global Market Research 2024</option>
                  <option value="legal_compliance_eu">EU Advertising Compliance</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold uppercase tracking-wider text-[var(--foreground-muted)]">Governance Policy Tier</label>
                <select 
                  className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl py-3 px-4 outline-none text-[var(--foreground)]"
                  value={formData.policy_tier}
                  onChange={(e) => setFormData(prev => ({ ...prev, policy_tier: e.target.value }))}
                >
                  <option value="standard_compliance">Standard Corporate Compliance</option>
                  <option value="high_sensitivity">High Sensitivity (Financial/Health)</option>
                  <option value="experimental">Experimental (L0-L2 Only)</option>
                </select>
              </div>
            </div>
          )}

          {currentStep === 6 && (
            <div className="space-y-6 animate-in zoom-in-95 duration-300">
              <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-2xl p-6 space-y-4">
                <h3 className="font-bold text-lg flex items-center gap-2 text-[var(--foreground)]">
                  <Bot className="w-5 h-5 text-indigo-500" />
                  Operating Contract Summary
                </h3>
                <div className="grid grid-cols-2 gap-y-4 gap-x-8 text-sm">
                  <div>
                    <div className="text-[10px] font-bold text-[var(--foreground-muted)] uppercase tracking-widest">Agent</div>
                    <div className="font-bold text-[var(--foreground)]">{formData.name}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-[var(--foreground-muted)] uppercase tracking-widest">Type</div>
                    <div className="font-bold text-[var(--foreground)] capitalize">{formData.type}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-[var(--foreground-muted)] uppercase tracking-widest">Accountable DRI</div>
                    <div className="font-bold text-[var(--foreground)]">{members.find(m => m.id === formData.primary_dri_id)?.full_name}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-[var(--foreground-muted)] uppercase tracking-widest">Grounding</div>
                    <div className="font-bold text-[var(--foreground)]">{formData.knowledge_base.replace(/_/g, ' ')}</div>
                  </div>
                </div>
              </div>
              <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl">
                <div className="text-xs font-bold text-amber-600 mb-2 uppercase tracking-widest">Operational Limits</div>
                <div className="text-[11px] text-[var(--foreground-muted)]">
                  Agent is strictly prohibited from: {formData.prohibited_actions.join(', ') || 'No manual prohibitions set.'}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[var(--card-border)] bg-[var(--surface)]/50 flex justify-between items-center">
          <button 
            onClick={handleBack}
            disabled={currentStep === 1 || loading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-[var(--foreground-muted)] hover:text-[var(--foreground)] disabled:opacity-30 transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>
          
          {currentStep < STEPS.length ? (
            <button 
              onClick={handleNext}
              disabled={(currentStep === 1 && !formData.name) || (currentStep === 3 && !formData.primary_dri_id)}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-xl font-bold transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50"
            >
              Continue
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button 
              onClick={handleSubmit}
              disabled={loading}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-2 rounded-xl font-bold transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50"
            >
              {loading ? "Registering..." : "Finalize & Hire Agent"}
              <Check className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

