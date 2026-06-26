"use client";

import { useState, useEffect } from "react";
import {
  X, Shield, Activity, AlertTriangle,
  CheckCircle, FileText, User, Globe, Link2,
  ShieldCheck, Check, Loader2, BookOpen, GitFork,
} from "lucide-react";
import { api } from "@/lib/api";

interface Agent {
  id: string;
  name: string;
  type: string;
  status: string;
  autonomy_level: string;
  trust_score: number;
  faithfulness_score: number;
  risk_level?: string;
  purpose?: string | null;
  assigned_brand?: string | null;
  linked_channels?: string[];
  primary_dri?: { full_name: string; email: string } | null;
  backup_dri?: { full_name: string; email: string };
  permitted_actions?: string[];
  prohibited_actions?: string[];
  linked_prompts?: string[];
  linked_workflows?: string[];
  linked_knowledge_sources?: string[];
  last_activity?: string | null;
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
  { key: "identity_complete",           label: "Identity fields complete",        icon: User },
  { key: "permissions_configured",      label: "Permissions configured",          icon: Shield },
  { key: "prompt_attached",             label: "At least one prompt attached",    icon: FileText },
  { key: "workflow_assigned",           label: "At least one workflow assigned",  icon: Activity },
  { key: "knowledge_attached",          label: "Knowledge sources attached",      icon: Globe },
  { key: "approval_gates_configured",   label: "Approval gates configured",       icon: ShieldCheck },
  { key: "evidence_enabled",            label: "Evidence capture enabled",        icon: CheckCircle },
  { key: "sandbox_passed",              label: "Sandbox test suite passed",       icon: CheckCircle },
];

type Tab = "overview" | "connections" | "checklist";

export default function AgentDetailsDrawer({ isOpen, onClose, agent, onUpdate }: AgentDetailsDrawerProps) {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [checklist, setChecklist] = useState<Checklist | null>(null);
  const [linkedResources, setLinkedResources] = useState<{
    prompts: LinkedResource[];
    workflows: LinkedResource[];
    policies: LinkedResource[];
    knowledge_sources: LinkedResource[];
  } | null>(null);
  const [loadingResources, setLoadingResources] = useState(false);

  useEffect(() => {
    if (!isOpen || !agent?.id) return;
    const agentId = agent.id;
    setLoadingResources(true);
    Promise.allSettled([
      api.get(`/api/v1/agents/${agentId}/checklist`).then(r => {
        if (r.success) setChecklist(r.checklist);
      }).catch(() => {}),
      api.get(`/api/v1/agents/${agentId}/resources`).then(r => {
        if (r.success) setLinkedResources(r.resources);
      }).catch(() => {}),
    ]).finally(() => setLoadingResources(false));
  }, [isOpen, agent?.id]);

  if (!isOpen || !agent) return null;

  const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "overview",     label: "Overview",     icon: Activity },
    { id: "connections",  label: "Connections",  icon: Link2 },
    { id: "checklist",    label: "Checklist",    icon: CheckCircle },
  ];


  return (
    <div className={`fixed right-0 bottom-0 z-50 w-full max-w-lg bg-[var(--card)] border-l border-[var(--card-border)] shadow-2xl transform transition-transform duration-300 ease-in-out ${isOpen ? "translate-x-0" : "translate-x-full"}`} style={{ top: "var(--app-header-height, 64px)" }}>
      <div className="flex h-full flex-col">

        {/* Header */}
        <div className="shrink-0 border-b border-[var(--card-border)] bg-[var(--surface)] px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div className="rounded-xl bg-indigo-500/10 p-2 text-indigo-500">
                  <Shield className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <h2 className="truncate text-base font-bold text-[var(--foreground)]">{agent.name}</h2>
                  <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--foreground-muted)]">{agent.type}</div>
                </div>
              </div>
              {agent.purpose && (
                <p className="mt-3 text-xs leading-relaxed text-[var(--foreground-muted)]">{agent.purpose}</p>
              )}
            </div>
            <button onClick={onClose} className="shrink-0 rounded-lg p-1.5 text-[var(--foreground-muted)] transition hover:bg-[var(--surface-hover)]">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="shrink-0 flex border-b border-[var(--card-border)] bg-[var(--surface)]/50 px-4">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 border-b-2 px-3 py-3 text-[10px] font-black uppercase tracking-widest transition-all shrink-0 ${
                activeTab === tab.id
                  ? "border-indigo-500 text-indigo-500"
                  : "border-transparent text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
              }`}
            >
              <tab.icon className="h-3.5 w-3.5 shrink-0" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* ── Overview ── */}
          {activeTab === "overview" && (
            <div className="space-y-5 animate-in fade-in duration-300">

              {/* Details */}
              <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--background)] divide-y divide-[var(--card-border)]">
                {[
                  { label: "Last Run",   value: agent.last_activity || "Never" },
                  { label: "Risk Level", value: agent.risk_level || "Medium" },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between px-4 py-3">
                    <span className="text-[10px] font-black uppercase tracking-[0.15em] text-[var(--foreground-muted)]">{row.label}</span>
                    <span className="text-xs font-semibold capitalize text-[var(--foreground)]">{row.value}</span>
                  </div>
                ))}
              </div>



              {/* Permitted / Prohibited actions */}
              {((agent.permitted_actions?.length ?? 0) > 0 || (agent.prohibited_actions?.length ?? 0) > 0) && (
                <div className="space-y-3">
                  {(agent.permitted_actions?.length ?? 0) > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-500">Permitted</span>
                      <div className="flex flex-wrap gap-1.5">
                        {agent.permitted_actions!.map(a => (
                          <span key={a} className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600">{a}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {(agent.prohibited_actions?.length ?? 0) > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-black uppercase tracking-[0.18em] text-rose-500">Prohibited</span>
                      <div className="flex flex-wrap gap-1.5">
                        {agent.prohibited_actions!.map(a => (
                          <span key={a} className="rounded-full border border-rose-500/20 bg-rose-500/10 px-2.5 py-0.5 text-[10px] font-bold text-rose-600">{a}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Connections ── */}
          {activeTab === "connections" && (
            <div className="space-y-5 animate-in fade-in duration-300">
              {loadingResources ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
                  <p className="text-xs text-[var(--foreground-muted)]">Loading connections…</p>
                </div>
              ) : (
                <>
                  {/* Knowledge Base */}
                  <ResourceSection
                    title="Knowledge Base"
                    icon={BookOpen}
                    color="violet"
                    items={linkedResources?.knowledge_sources ?? []}
                    fallback={agent.linked_knowledge_sources}
                  />

                  {/* Prompts */}
                  <ResourceSection
                    title="Prompts"
                    icon={FileText}
                    color="indigo"
                    items={linkedResources?.prompts ?? []}
                    fallback={agent.linked_prompts}
                  />

                  {/* Workflows */}
                  <ResourceSection
                    title="Workflows"
                    icon={GitFork}
                    color="emerald"
                    items={linkedResources?.workflows ?? []}
                    fallback={agent.linked_workflows}
                  />
                </>
              )}
            </div>
          )}

          {/* ── Checklist ── */}
          {activeTab === "checklist" && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--foreground-muted)]">Activation Checklist</span>
                {checklist && (
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${
                    checklist.all_complete
                      ? "bg-emerald-500/10 text-emerald-500"
                      : "bg-amber-500/10 text-amber-500"
                  }`}>
                    {checklist.all_complete
                      ? "Ready"
                      : `${CHECKLIST_ITEMS.filter(c => (checklist as any)[c.key]).length}/${CHECKLIST_ITEMS.length}`}
                  </span>
                )}
              </div>

              {!checklist ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
                  <p className="text-xs text-[var(--foreground-muted)]">Loading checklist…</p>
                </div>
              ) : (
                <>
                  <div className="divide-y divide-[var(--card-border)] overflow-hidden rounded-2xl border border-[var(--card-border)]">
                    {CHECKLIST_ITEMS.map(item => {
                      const done = (checklist as any)[item.key];
                      return (
                        <div key={item.key} className="flex items-center gap-3 bg-[var(--background)] px-4 py-3">
                          <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                            done ? "bg-emerald-500 text-white" : "border border-[var(--border)] bg-[var(--surface)]"
                          }`}>
                            {done && <Check className="h-3 w-3" />}
                          </div>
                          <span className={`flex-1 text-xs font-semibold ${done ? "text-[var(--foreground)]" : "text-[var(--foreground-muted)]"}`}>
                            {item.label}
                          </span>
                          <span className={`text-[10px] font-black uppercase ${done ? "text-emerald-500" : "text-amber-500"}`}>
                            {done ? "Done" : "Pending"}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {checklist.blockers.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[10px] font-black uppercase tracking-[0.18em] text-rose-500">Blockers</span>
                      {checklist.blockers.map((blocker, i) => (
                        <div key={i} className="flex items-start gap-2 rounded-xl border border-rose-500/20 bg-rose-500/5 px-3 py-2.5">
                          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-500" />
                          <span className="text-xs text-[var(--foreground-muted)]">{blocker}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-[var(--card-border)] bg-[var(--surface)] px-5 py-4">
          <button
            onClick={onClose}
            className="w-full rounded-xl border border-[var(--border)] py-2.5 text-sm font-semibold text-[var(--foreground-muted)] transition hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── ResourceSection helper ── */
function ResourceSection({
  title,
  icon: Icon,
  color,
  items,
  fallback,
}: {
  title: string;
  icon: React.ElementType;
  color: "violet" | "indigo" | "emerald";
  items: LinkedResource[];
  fallback?: string[];
}) {
  const colorMap = {
    violet:  { pill: "bg-violet-500/10 text-violet-500",  dot: "bg-violet-500" },
    indigo:  { pill: "bg-indigo-500/10 text-indigo-500",  dot: "bg-indigo-500" },
    emerald: { pill: "bg-emerald-500/10 text-emerald-500", dot: "bg-emerald-500" },
  };
  const c = colorMap[color];

  // If the API returned actual resource objects, show them; otherwise fall back
  // to the plain string IDs stored on the agent object.
  const hasItems = items.length > 0;
  const hasFallback = (fallback?.length ?? 0) > 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Icon className="h-3.5 w-3.5 text-[var(--foreground-muted)]" />
          <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--foreground-muted)]">{title}</span>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${c.pill}`}>
          {hasItems ? items.length : hasFallback ? fallback!.length : 0}
        </span>
      </div>

      {hasItems ? (
        <div className="divide-y divide-[var(--card-border)] overflow-hidden rounded-xl border border-[var(--card-border)]">
          {items.map(item => (
            <div key={item.id} className="flex items-center gap-3 bg-[var(--background)] px-4 py-2.5">
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${c.dot}`} />
              <span className="flex-1 truncate text-xs font-semibold text-[var(--foreground)]">{item.name}</span>
              {item.status && (
                <span className="text-[10px] text-[var(--foreground-muted)] capitalize">{item.status}</span>
              )}
            </div>
          ))}
        </div>
      ) : hasFallback ? (
        <div className="divide-y divide-[var(--card-border)] overflow-hidden rounded-xl border border-[var(--card-border)]">
          {fallback!.map(id => (
            <div key={id} className="flex items-center gap-3 bg-[var(--background)] px-4 py-2.5">
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${c.dot}`} />
              <span className="flex-1 truncate font-mono text-[11px] text-[var(--foreground-muted)]">{id}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-4 py-3 text-xs text-[var(--foreground-muted)]">
          No {title.toLowerCase()} connected.
        </div>
      )}
    </div>
  );
}
