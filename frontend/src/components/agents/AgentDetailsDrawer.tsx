"use client";

import { useState, useEffect } from "react";
import {
  X, Shield, Activity, TrendingUp, AlertTriangle,
  CheckCircle, FileText, User, Pause, Play,
  RotateCcw, Globe, Link2, GitBranch, ShieldCheck, Check,
  Loader2, RotateCcw as RollbackIcon, FileCheck, Archive, ShieldAlert
} from "lucide-react";
import { api } from "@/lib/api";
import StatusBadge from "@/components/ui/StatusBadge";

interface Agent {
  id: string;
  name: string;
  type: string;
  status: string;
  autonomy_level: string;
  trust_score: number;
  faithfulness_score: number;
  risk_level?: string;
  assigned_brand?: string;
  linked_channels?: string[];
  markets?: string[];
  primary_dri?: { full_name: string; email: string } | null | undefined;
  backup_dri?: { full_name: string; email: string };
  permitted_actions?: string[];
  prohibited_actions?: string[];
  linked_prompts?: string[];
  linked_workflows?: string[];
  linked_knowledge_sources?: string[];
  created_at: string;
}

interface Version {
  id: string;
  version: number;
  author_name: string;
  reason: string;
  change_summary: string;
  created_at: string;
}

interface Checklist {
  identity_complete: boolean;
  permissions_configured: boolean;
  prompt_attached: boolean;
  workflow_assigned: boolean;
  knowledge_attached: boolean;
  approval_gates_configured: boolean;
  evidence_enabled: boolean;
  sandbox_passed: boolean;
  all_complete: boolean;
  blockers: string[];
}

interface LinkedResource {
  type: string;
  id: string;
  name: string;
  status: string;
  risk_level?: string;
  version?: number;
  owner_name?: string;
}

interface AgentDetailsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  agent: Agent | null;
  onUpdate: () => void;
}

const CHECKLIST_ITEMS = [
  { key: 'identity_complete', label: 'Identity fields complete', icon: User },
  { key: 'permissions_configured', label: 'Permissions configured', icon: Shield },
  { key: 'prompt_attached', label: 'At least one prompt attached', icon: FileText },
  { key: 'workflow_assigned', label: 'At least one workflow assigned', icon: Activity },
  { key: 'knowledge_attached', label: 'Knowledge sources attached', icon: Globe },
  { key: 'approval_gates_configured', label: 'Approval gates configured', icon: ShieldCheck },
  { key: 'evidence_enabled', label: 'Evidence capture enabled', icon: CheckCircle },
  { key: 'sandbox_passed', label: 'Sandbox test suite passed', icon: CheckCircle },
];

export default function AgentDetailsDrawer({ isOpen, onClose, agent, onUpdate }: AgentDetailsDrawerProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'governance' | 'deployment' | 'checklist' | 'versions' | 'permissions'>('overview');
  const [versions, setVersions] = useState<Version[]>([]);
  const [checklist, setChecklist] = useState<Checklist | null>(null);
  const [linkedResources, setLinkedResources] = useState<{
    prompts: LinkedResource[];
    workflows: LinkedResource[];
    policies: LinkedResource[];
    knowledge_sources: LinkedResource[];
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [rollingBack, setRollingBack] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // ── FIX: depend on agent.id (primitive) instead of the agent object reference.
  //    Parent state updates that re-render the page can produce a fresh agent
  //    object with identical contents, which would re-fire all 4 fetches.
  useEffect(() => {
    if (!isOpen || !agent?.id) return;
    const agentId = agent.id;
    Promise.allSettled([
      api.get(`/api/v1/agents/${agentId}/versions`).then(r => {
        if (r.success) setVersions(r.versions || []);
      }).catch(() => {}),
      api.get(`/api/v1/agents/${agentId}/checklist`).then(r => {
        if (r.success) setChecklist(r.checklist);
      }).catch(() => {}),
      api.get(`/api/v1/agents/${agentId}/resources`).then(r => {
        if (r.success) setLinkedResources(r.resources);
      }).catch(() => {}),
    ]);
  }, [isOpen, agent?.id]);

  if (!isOpen || !agent) return null;

  const handleAgentAction = async (action: 'approval' | 'deploy' | 'pause' | 'resume' | 'retire' | 'clone') => {
    const commandMap = {
      approval: {
        url: `/api/v1/agents/${agent.id}/approval/request`,
        body: { notes: `Approval requested from Agent Details for ${agent.name}.` },
      },
      deploy: {
        url: `/api/v1/agents/${agent.id}/deploy`,
        body: { environment: 'production' },
      },
      pause: {
        url: `/api/v1/agents/${agent.id}/pause`,
        body: { reason: `Paused from Agent Details for ${agent.name}.` },
      },
      resume: {
        url: `/api/v1/agents/${agent.id}/resume`,
        body: { reason: `Resumed from Agent Details for ${agent.name}.` },
      },
      retire: {
        url: `/api/v1/agents/${agent.id}/retire`,
        body: { reason: `Retired from Agent Details for ${agent.name}.` },
      },
      clone: {
        url: `/api/v1/agents/${agent.id}/clone`,
        body: {},
      },
    };

    try {
      setActionError(null);
      setActionBusy(action);
      const r = await api.post(commandMap[action].url, commandMap[action].body);
      if (!r.success) throw new Error(r.error || `Unable to ${action} agent.`);
      onUpdate();
      if (action === 'clone') {
        onClose();
      }
    } catch (error) {
      setActionError(error instanceof Error ? error.message : `Unable to ${action} agent.`);
    } finally {
      setActionBusy(null);
    }
  };

  const handleRollback = async (versionId: string) => {
    try {
      setRollingBack(versionId);
      const result = await api.post(`/api/v1/agents/${agent.id}/rollback`, { version_id: versionId });
      if (result.success) {
        onUpdate();
        setActiveTab('overview');
      }
    } catch (err) {
      console.error("Rollback failed", err);
    } finally {
      setRollingBack(null);
    }
  };

  const TABS = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'checklist', label: 'Checklist', icon: CheckCircle },
    { id: 'versions', label: 'Versions', icon: GitBranch },
    { id: 'permissions', label: 'Permissions', icon: Shield },
    { id: 'governance', label: 'Governance', icon: ShieldAlert },
    { id: 'deployment', label: 'Deployment', icon: Globe },
  ];

  return (
    <div className={`fixed right-0 bottom-0 z-50 w-full max-w-xl bg-[var(--card)] border-l border-[var(--card-border)] shadow-2xl transform transition-transform duration-500 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`} style={{ top: "var(--app-header-height, 64px)" }}>
      <div className="flex flex-col h-full">
        <div className="p-6 border-b border-[var(--card-border)] bg-[var(--surface)] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-info-text/10 flex items-center justify-center text-info-text">
              <Shield className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[var(--foreground)]">{agent.name}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <StatusBadge status={agent.status} />
                <span className="text-xs text-[var(--foreground-muted)] uppercase tracking-widest font-bold">{agent.autonomy_level}</span>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {agent.status === 'DRAFT' && (
                  <button onClick={() => handleAgentAction('approval')} disabled={actionBusy !== null} className="flex items-center gap-1.5 px-2.5 py-1 bg-warning-text/10 text-warning-text border border-warning-border/20 rounded-lg text-[9px] font-bold hover:bg-warning-text/20 transition-all disabled:opacity-50">
                    <FileCheck className="w-3 h-3" />
                    {actionBusy === 'approval' ? 'Requesting...' : 'Request Approval'}
                  </button>
                )}
                {agent.status === 'APPROVED' && (
                  <button onClick={() => handleAgentAction('deploy')} disabled={actionBusy !== null} className="flex items-center gap-1.5 px-2.5 py-1 bg-success-text/10 text-success-text border border-success-border/20 rounded-lg text-[9px] font-bold hover:bg-success-text/20 transition-all disabled:opacity-50">
                    <Play className="w-3 h-3" />
                    {actionBusy === 'deploy' ? 'Deploying...' : 'Deploy'}
                  </button>
                )}
                {agent.status === 'ACTIVE' && (
                  <button onClick={() => handleAgentAction('pause')} disabled={actionBusy !== null} className="flex items-center gap-1.5 px-2.5 py-1 bg-warning-text/10 text-warning-text border border-warning-border/20 rounded-lg text-[9px] font-bold hover:bg-warning-text/20 transition-all disabled:opacity-50">
                    <Pause className="w-3 h-3" />
                    {actionBusy === 'pause' ? 'Pausing...' : 'Pause'}
                  </button>
                )}
                {agent.status === 'PAUSED' && (
                  <button onClick={() => handleAgentAction('resume')} disabled={actionBusy !== null} className="flex items-center gap-1.5 px-2.5 py-1 bg-success-text/10 text-success-text border border-success-border/20 rounded-lg text-[9px] font-bold hover:bg-success-text/20 transition-all disabled:opacity-50">
                    <Play className="w-3 h-3" />
                    {actionBusy === 'resume' ? 'Resuming...' : 'Resume'}
                  </button>
                )}
                {agent.status !== 'RETIRED' && (
                  <button onClick={() => handleAgentAction('retire')} disabled={actionBusy !== null} className="flex items-center gap-1.5 px-2.5 py-1 bg-[var(--surface)] text-[var(--foreground-muted)] border border-[var(--border)] rounded-lg text-[9px] font-bold hover:bg-[var(--surface-hover)] transition-all disabled:opacity-50">
                    <Archive className="w-3 h-3" />
                    {actionBusy === 'retire' ? 'Retiring...' : 'Retire'}
                  </button>
                )}
                <button onClick={() => handleAgentAction('clone')} disabled={actionBusy !== null} className="flex items-center gap-1.5 px-2.5 py-1 bg-[var(--surface)] text-[var(--foreground-muted)] border border-[var(--border)] rounded-lg text-[9px] font-bold hover:bg-[var(--surface-hover)] transition-all disabled:opacity-50">
                  <GitBranch className="w-3 h-3" />
                  {actionBusy === 'clone' ? 'Cloning...' : 'Clone'}
                </button>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[var(--surface-hover)] rounded-full transition-all">
            <X className="w-5 h-5 text-[var(--foreground-muted)]" />
          </button>
        </div>

        <div className="flex px-4 bg-[var(--surface)]/50 border-b border-[var(--card-border)] overflow-x-auto shrink-0">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-1.5 px-3 py-3 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all shrink-0 ${
                activeTab === tab.id
                  ? 'border-info-border text-info-text'
                  : 'border-transparent text-[var(--foreground-muted)] hover:text-[var(--foreground)]'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5 shrink-0" />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {actionError && (
            <div className="rounded-2xl border border-error-border/20 bg-error-text/10 p-3 text-xs text-error-text">
              {actionError}
            </div>
          )}
          {activeTab === 'overview' && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-5 bg-info-text/5 border border-info-border/10 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-info-text uppercase tracking-widest">Trust Score</span>
                    <TrendingUp className="w-4 h-4 text-info-text" />
                  </div>
                  <div className="text-3xl font-black text-info-text">{((agent.trust_score || 0) * 100).toFixed(0)}%</div>
                  <div className="w-full h-1.5 bg-info-text/10 rounded-full">
                    <div className="h-full bg-info-text rounded-full" style={{ width: `${(agent.trust_score || 0) * 100}%` }} />
                  </div>
                </div>
                <div className="p-5 bg-success-text/5 border border-success-border/10 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-success-text uppercase tracking-widest">Faithfulness</span>
                    <CheckCircle className="w-4 h-4 text-success-text" />
                  </div>
                  <div className="text-3xl font-black text-success-text">{((agent.faithfulness_score || 0) * 100).toFixed(0)}%</div>
                  <div className="w-full h-1.5 bg-success-text/10 rounded-full">
                    <div className="h-full bg-success-text rounded-full" style={{ width: `${(agent.faithfulness_score || 0) * 100}%` }} />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--foreground-muted)] border-b border-[var(--card-border)] pb-2">Identity & Scope</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 text-sm">
                  {[
                    { label: 'Primary DRI', value: agent.primary_dri?.full_name || 'Unassigned', icon: User },
                    { label: 'Autonomy Level', value: agent.autonomy_level, icon: Shield },
                    { label: 'Assigned Brand', value: agent.assigned_brand || 'Global System', icon: Globe },
                    { label: 'Risk Level', value: agent.risk_level || 'medium', icon: AlertTriangle },
                  ].map(row => (
                    <div key={row.label}>
                      <div className="text-[9px] font-black text-[var(--foreground-muted)] uppercase mb-0.5">{row.label}</div>
                      <div className="font-semibold text-[var(--foreground)] text-xs capitalize flex items-center gap-1">
                        <row.icon className="w-3 h-3 text-info-text" />
                        {row.value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--foreground-muted)] border-b border-[var(--card-border)] pb-2">DRI Contact</h3>
                <div className="p-4 bg-[var(--background)] border border-[var(--border)] rounded-xl flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-info-text/10 flex items-center justify-center text-info-text">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-[var(--foreground)]">{agent.primary_dri?.full_name || 'Unassigned'}</div>
                    <div className="text-xs text-info-text">{agent.primary_dri?.email || 'No email assigned'}</div>
                  </div>
                </div>
                {agent.backup_dri && (
                  <div className="p-4 bg-[var(--background)] border border-[var(--border)] rounded-xl flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-warning-text/10 flex items-center justify-center text-warning-text">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-[var(--foreground)]">{agent.backup_dri.full_name}</div>
                      <div className="text-xs text-warning-text">{agent.backup_dri.email}</div>
                      <span className="text-[9px] text-[var(--foreground-muted)] font-black uppercase">Backup DRI</span>
                    </div>
                  </div>
                )}
              </div>

              {agent.assigned_brand && (
                <div className="p-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl">
                  <div className="text-[10px] font-black uppercase text-[var(--foreground-muted)]">Brand Binding</div>
                  <div className="text-sm font-semibold text-[var(--foreground)]">{agent.assigned_brand}</div>
                  <div className="text-[10px] text-success-text mt-1 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    Brand voice rules active
                  </div>
                </div>
              )}

              {linkedResources && (
                <div className="space-y-3">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--foreground-muted)] border-b border-[var(--card-border)] pb-2">Linked Resources</h3>
                  <div className="space-y-2">
                    {[
                      { label: 'Prompts', count: linkedResources.prompts.length, color: 'indigo' },
                      { label: 'Workflows', count: linkedResources.workflows.length, color: 'emerald' },
                      { label: 'Policies', count: linkedResources.policies.length, color: 'amber' },
                      { label: 'Knowledge', count: linkedResources.knowledge_sources.length, color: 'violet' },
                    ].map(r => (
                      <div key={r.label} className="flex items-center justify-between p-3 bg-[var(--background)] border border-[var(--border)] rounded-xl">
                        <span className="text-xs font-semibold text-[var(--foreground)]">{r.label}</span>
                        <span className={`text-[10px] font-black px-2 py-0.5 bg-${r.color}-500/10 text-${r.color}-500 rounded-full`}>
                          {r.count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-2 space-y-3">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--foreground-muted)] mb-2">Lifecycle</h3>
                <div className="flex gap-3">
                  <button className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-warning-text/10 text-warning-text border border-warning-border/20 rounded-xl text-[10px] font-black hover:bg-warning-text hover:text-white transition-all">
                    <Pause className="w-3.5 h-3.5" />
                    PAUSE
                  </button>
                  <button className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-error-text/10 text-error-text border border-error-border/20 rounded-xl text-[10px] font-black hover:bg-error-text hover:text-white transition-all">
                    <RotateCcw className="w-3.5 h-3.5" />
                    RESET
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'checklist' && (
            <div className="space-y-5 animate-in slide-in-from-right-4 duration-500">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black uppercase tracking-widest text-[var(--foreground-muted)]">Activation Checklist</h3>
                {checklist && (
                  <span className={`text-[10px] font-black px-2 py-1 rounded-full ${
                    checklist.all_complete
                      ? 'bg-success-text/10 text-success-text'
                      : 'bg-warning-text/10 text-warning-text'
                  }`}>
                    {checklist.all_complete ? 'READY TO ACTIVATE' : `${CHECKLIST_ITEMS.filter(c => (checklist as any)[c.key]).length}/${CHECKLIST_ITEMS.length}`}
                  </span>
                )}
              </div>

              {!checklist ? (
                <div className="text-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-info-text mx-auto mb-2" />
                  <p className="text-xs text-[var(--foreground-muted)]">Loading checklist...</p>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    {CHECKLIST_ITEMS.map(item => {
                      const done = (checklist as any)[item.key];
                      return (
                        <div key={item.key} className="flex items-center gap-3 p-4 bg-[var(--background)] border border-[var(--border)] rounded-xl">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                            done ? "bg-success-text text-foreground" : "bg-[var(--surface)] border border-[var(--border)]"
                          }`}>
                            {done && <Check className="w-3.5 h-3.5" />}
                          </div>
                          <div className="flex-1">
                            <item.icon className={`w-3 h-3 inline mr-1.5 ${done ? "text-success-text" : "text-[var(--foreground-muted)]"}`} />
                            <span className={`text-xs font-semibold ${done ? "text-success-text" : "text-[var(--foreground-muted)]"}`}>{item.label}</span>
                          </div>
                          <span className={`text-[9px] font-black uppercase ${done ? "text-success-text" : "text-warning-text"}`}>
                            {done ? 'Complete' : 'Incomplete'}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {checklist.blockers.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-error-text">Blockers</h4>
                      {checklist.blockers.map((blocker, i) => (
                        <div key={i} className="flex items-start gap-2 p-3 bg-error-text/5 border border-error-border/10 rounded-xl">
                          <AlertTriangle className="w-3.5 h-3.5 text-error-text mt-0.5 shrink-0" />
                          <span className="text-xs text-[var(--foreground-muted)]">{blocker}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === 'versions' && (
            <div className="space-y-4 animate-in slide-in-from-right-4 duration-500">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--foreground-muted)] border-b border-[var(--card-border)] pb-2">
                Version History ({versions.length})
              </h3>
              {versions.length > 0 ? (
                <div className="space-y-3">
                  {versions.map((ver) => (
                    <div key={ver.id} className="p-4 bg-[var(--background)] border border-[var(--card-border)] rounded-2xl space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black px-2 py-0.5 bg-info-text/10 text-info-text rounded">v{ver.version}</span>
                          <span className="text-xs font-semibold text-[var(--foreground)]">{ver.reason}</span>
                        </div>
                        {ver.version !== versions[0].version && (
                          <button
                            onClick={() => handleRollback(ver.id)}
                            disabled={rollingBack === ver.id}
                            className="flex items-center gap-1 text-[10px] font-bold text-info-text hover:underline disabled:opacity-50"
                          >
                            {rollingBack === ver.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <RollbackIcon className="w-3 h-3" />
                            )}
                            ROLLBACK
                          </button>
                        )}
                      </div>
                      <div className="text-[11px] text-[var(--foreground-muted)]">
                        {ver.author_name} · {new Date(ver.created_at).toLocaleDateString()} · {ver.change_summary}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 space-y-3">
                  <GitBranch className="w-12 h-12 text-[var(--foreground-muted)]/20 mx-auto" />
                  <p className="text-xs text-[var(--foreground-muted)]">No version history yet.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'permissions' && (
            <div className="space-y-5 animate-in slide-in-from-right-4 duration-500">
              <div className="space-y-3">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-success-text border-b border-[var(--card-border)] pb-2">Permitted Actions</h3>
                {(agent.permitted_actions || []).length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {(agent.permitted_actions || []).map(action => (
                      <span key={action} className="px-3 py-1.5 bg-success-text/10 text-success-text border border-success-border/20 rounded-full text-xs font-bold">
                        {action}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[var(--foreground-muted)] italic">No permitted actions configured.</p>
                )}
              </div>
              <div className="space-y-3">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-error-text border-b border-[var(--card-border)] pb-2">Prohibited Actions</h3>
                {(agent.prohibited_actions || []).length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {(agent.prohibited_actions || []).map(action => (
                      <span key={action} className="px-3 py-1.5 bg-error-text/10 text-error-text border border-error-border/20 rounded-full text-xs font-bold">
                        {action}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[var(--foreground-muted)] italic">No prohibited actions configured.</p>
                )}
              </div>
              {linkedResources && (
                <div className="space-y-3">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--foreground-muted)] border-b border-[var(--card-border)] pb-2">Policy Attachments</h3>
                  {[...linkedResources.policies, ...linkedResources.prompts].length > 0 ? (
                    <div className="space-y-2">
                      {[...linkedResources.policies, ...linkedResources.prompts].map((r, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-[var(--background)] border border-[var(--border)] rounded-xl">
                          <div className="flex items-center gap-2">
                            <Link2 className="w-3 h-3 text-info-text" />
                            <span className="text-xs font-semibold text-[var(--foreground)]">{r.name}</span>
                          </div>
                          <StatusBadge status={r.status} />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-[var(--foreground-muted)] italic">No policies or prompts attached.</p>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'governance' && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
              <div className="space-y-4">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--foreground-muted)] border-b border-[var(--card-border)] pb-2">Risk Tier & Approval Path</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-4 bg-[var(--background)] border border-[var(--border)] rounded-xl">
                    <div className="text-[10px] font-black uppercase text-[var(--foreground-muted)]">Risk Tier</div>
                    <div className={`text-sm font-bold capitalize mt-1 ${
                      (agent.risk_level || 'medium') === 'low' ? 'text-success-text' :
                      (agent.risk_level || 'medium') === 'high' || (agent.risk_level || 'medium') === 'critical' ? 'text-error-text' :
                      'text-warning-text'
                    }`}>{agent.risk_level || 'medium'}</div>
                  </div>
                  <div className="p-4 bg-[var(--background)] border border-[var(--border)] rounded-xl">
                    <div className="text-[10px] font-black uppercase text-[var(--foreground-muted)]">Approval Path</div>
                    <div className="text-sm font-bold capitalize mt-1 text-[var(--foreground)]">
                      {(agent.risk_level || 'medium') === 'low' ? 'Campaign Owner' :
                       (agent.risk_level || 'medium') === 'medium' ? 'Campaign Owner + AI Gov' :
                       (agent.risk_level || 'medium') === 'high' ? 'Campaign Owner + AI Gov + Brand' :
                       'Full Chain + Compliance'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--foreground-muted)] border-b border-[var(--card-border)] pb-2">Prohibited Actions</h3>
                {(agent.prohibited_actions || []).length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {(agent.prohibited_actions || []).map(action => (
                      <span key={action} className="px-3 py-1.5 bg-error-text/10 text-error-text border border-error-border/20 rounded-full text-xs font-bold">
                        {action}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-3 bg-success-text/5 border border-success-border/10 rounded-xl">
                    <CheckCircle className="w-4 h-4 text-success-text" />
                    <span className="text-xs text-success-text">No prohibited actions configured. Agent operates with full allowed scope.</span>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--foreground-muted)] border-b border-[var(--card-border)] pb-2">HITL Requirements</h3>
                <div className="space-y-2">
                  {[
                    { trigger: 'Risk Score ≥ 60%', action: 'Route to AI Governance Lead', severity: 'medium' },
                    { trigger: 'Faithfulness Score < 85%', action: 'Block from publishing', severity: 'high' },
                    { trigger: 'Brand Risk Detected', action: 'Route to Brand Governance', severity: 'medium' },
                    { trigger: 'Regulated Content Flag', action: 'Route to Compliance Reviewer', severity: 'critical' },
                  ].map((rule, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-[var(--background)] border border-[var(--border)] rounded-xl">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className={`w-3.5 h-3.5 ${
                          rule.severity === 'critical' ? 'text-error-text' : rule.severity === 'high' ? 'text-warning-text' : 'text-info-text'
                        }`} />
                        <div>
                          <div className="text-xs font-semibold text-[var(--foreground)]">{rule.trigger}</div>
                          <div className="text-[10px] text-[var(--foreground-muted)]">{rule.action}</div>
                        </div>
                      </div>
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${
                        rule.severity === 'critical' ? 'bg-error-text/10 text-error-text' :
                        rule.severity === 'high' ? 'bg-warning-text/10 text-warning-text' :
                        'bg-info-text/10 text-info-text'
                      }`}>{rule.severity}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--foreground-muted)] border-b border-[var(--card-border)] pb-2">Compliance Notes</h3>
                <div className="p-4 bg-[var(--background)] border border-[var(--border)] rounded-xl">
                  <div className="text-xs text-[var(--foreground-muted)] leading-relaxed">
                    Agent must comply with all platform-specific content policies, brand voice guidelines, and applicable regulations. Any deviation triggers automatic escalation to the DRI and relevant governance role.
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'deployment' && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
              <div className="bg-[var(--surface)] border border-[var(--card-border)] rounded-3xl p-6 aspect-video flex flex-col items-center justify-center relative overflow-hidden">
                <Globe className="w-32 h-32 text-info-text/10 absolute" />
                <div className="relative z-10 text-center space-y-2">
                  <h4 className="text-sm font-bold">Global Deployment Map</h4>
                  <p className="text-[10px] text-[var(--foreground-muted)] uppercase tracking-widest font-black">Cluster: Active</p>
                </div>
                <div className="absolute top-1/4 left-1/3 w-3 h-3 bg-info-text rounded-full animate-ping" />
                <div className="absolute top-1/2 right-1/4 w-3 h-3 bg-success-text rounded-full animate-ping" />
              </div>

              <div className="space-y-3">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--foreground-muted)] border-b border-[var(--card-border)] pb-2">Regional Compliance</h3>
                {[
                  { market: "North America", regulation: "FTC / CCPA", status: "Certified", color: "emerald" },
                  { market: "European Union", regulation: "GDPR / AI Act", status: "Active", color: "indigo" },
                  { market: "APAC", regulation: "Local Privacy", status: "Pending", color: "amber" },
                  { market: "LATAM", regulation: "Standard", status: "Certified", color: "emerald" },
                ].map((m, i) => (
                  <div key={i} className="p-4 bg-[var(--surface)] border border-[var(--card-border)] rounded-2xl flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-tight">{m.market}</span>
                      <span className={`text-[8px] font-black px-1.5 py-0.5 rounded bg-${m.color}-500/10 text-${m.color}-500 border border-${m.color}-500/20 uppercase`}>{m.status}</span>
                    </div>
                    <div className="text-xs font-bold text-[var(--foreground)]">{m.regulation}</div>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--foreground-muted)]">Regional Performance</h3>
                {[
                  { region: "US-East (Virginia)", latency: "42ms", health: 100 },
                  { region: "EU-Central (Frankfurt)", latency: "112ms", health: 98 },
                  { region: "AP-Southeast (Singapore)", latency: "240ms", health: 94 },
                ].map((reg, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between text-[10px] font-bold">
                      <span className="text-[var(--foreground-muted)] uppercase tracking-tight">{reg.region}</span>
                      <span className="text-info-text">{reg.latency}</span>
                    </div>
                    <div className="w-full h-1 bg-[var(--surface)] rounded-full overflow-hidden">
                      <div className="h-full bg-info-text transition-all" style={{ width: `${reg.health}%` }} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-[var(--foreground)]">Runtime Controls</h4>
                  <button
                    onClick={async () => {
                      const result = await api.patch(`/api/v1/agents/${agent.id}/runtime`, {
                        rate_limit: parseInt((document.getElementById('rate_limit') as HTMLInputElement)?.value || '50'),
                        token_budget: parseInt((document.getElementById('token_budget') as HTMLInputElement)?.value || '10000'),
                        retry_policy: parseInt((document.getElementById('retry_policy') as HTMLInputElement)?.value || '3'),
                        environment: (document.getElementById('env_select') as HTMLSelectElement)?.value || 'production',
                      });
                      if (result.success) onUpdate();
                    }}
                    className="px-3 py-1 bg-info-text hover:bg-info-text text-foreground text-[10px] font-bold rounded-lg transition-all">
                    Save
                  </button>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-[var(--background)] border border-[var(--border)] rounded-xl">
                    <label className="text-[10px] font-black uppercase text-[var(--foreground-muted)] block mb-1">Rate Limit (req/hr)</label>
                    <input id="rate_limit" type="number" defaultValue="50"
                      className="w-full bg-transparent text-sm font-semibold text-[var(--foreground)] outline-none border-b border-[var(--border)] focus:border-info-border" />
                  </div>
                  <div className="p-3 bg-[var(--background)] border border-[var(--border)] rounded-xl">
                    <label className="text-[10px] font-black uppercase text-[var(--foreground-muted)] block mb-1">Token Budget (/day)</label>
                    <input id="token_budget" type="number" defaultValue="10000"
                      className="w-full bg-transparent text-sm font-semibold text-[var(--foreground)] outline-none border-b border-[var(--border)] focus:border-info-border" />
                  </div>
                  <div className="p-3 bg-[var(--background)] border border-[var(--border)] rounded-xl">
                    <label className="text-[10px] font-black uppercase text-[var(--foreground-muted)] block mb-1">Retry Policy (attempts)</label>
                    <input id="retry_policy" type="number" defaultValue="3"
                      className="w-full bg-transparent text-sm font-semibold text-[var(--foreground)] outline-none border-b border-[var(--border)] focus:border-info-border" />
                  </div>
                  <div className="p-3 bg-[var(--background)] border border-[var(--border)] rounded-xl">
                    <label className="text-[10px] font-black uppercase text-[var(--foreground-muted)] block mb-1">Environment</label>
                    <select id="env_select" defaultValue="production"
                      className="w-full bg-transparent text-sm font-semibold text-[var(--foreground)] outline-none">
                      <option value="sandbox">Sandbox</option>
                      <option value="staging">Staging</option>
                      <option value="production">Production</option>
                    </select>
                  </div>
                </div>
                
                <div className="p-3 bg-[var(--background)] border border-[var(--border)] rounded-xl">
                  <label className="text-[10px] font-black uppercase text-[var(--foreground-muted)] block mb-2">Channel Scope</label>
                  <div className="flex flex-wrap gap-1.5">
                    {(agent as any).linked_channels?.map((ch: string) => (
                      <span key={ch} className="px-2 py-0.5 bg-info-text/10 text-info-text text-[10px] font-bold rounded">
                        {ch}
                      </span>
                    )) || <span className="text-xs text-[var(--foreground-muted)]">No channels configured</span>}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-[var(--card-border)] bg-[var(--surface)] shrink-0">
          <button onClick={onClose} className="w-full py-3 border border-[var(--border)] rounded-xl text-sm font-bold text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)] transition-all">
            Close Panel
          </button>
        </div>
      </div>
    </div>
  );
}
