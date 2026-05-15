"use client";

import React from 'react';
import { GitMerge, Loader2, Clock, CheckCircle2, AlertCircle } from 'lucide-react';

interface Orchestration {
  id: string;
  workflowId: string;
  workflowName: string;
  currentStep: string;
  agentAssigned: string;
  status: string;
  timeInStep: string;
  startedAt: string;
}

const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, { cls: string; icon: React.ReactNode }> = {
    'In Progress': {
      cls: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
      icon: <Loader2 className="w-3 h-3 animate-spin" />
    },
    Processing: {
      cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      icon: <Loader2 className="w-3 h-3 animate-spin" />
    },
    Pending: {
      cls: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
      icon: <Clock className="w-3 h-3" />
    },
    Completed: {
      cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      icon: <CheckCircle2 className="w-3 h-3" />
    },
    Failed: {
      cls: 'bg-rose-600/10 text-rose-500 border-rose-600/20',
      icon: <AlertCircle className="w-3 h-3" />
    }
  };
  const style = map[status] ?? { cls: 'bg-gray-500/10 text-gray-400 border-gray-500/20', icon: null };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${style.cls}`}>
      {style.icon}
      {status}
    </span>
  );
};

export default function ActiveOrchestrations({ data }: { data?: Orchestration[] }) {
  if (!data) {
    return <div className="h-64 animate-pulse bg-[var(--surface)] rounded-2xl" />;
  }

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-[var(--border)] flex items-center justify-between bg-[var(--surface-hover)]/30">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-500/10 rounded-xl">
            <GitMerge className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-[var(--text-primary)]">Live Orchestrations</h2>
            <p className="text-xs text-[var(--text-secondary)]">Real-time multi-agent task routing feed</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium">
          <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
          Live
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] border-b border-[var(--border)] bg-[var(--surface-hover)]/20">
            <tr>
              <th className="px-6 py-3 font-medium">Orchestration</th>
              <th className="px-6 py-3 font-medium">Current Step</th>
              <th className="px-6 py-3 font-medium">Agent Assigned</th>
              <th className="px-6 py-3 font-medium">Time in Step</th>
              <th className="px-6 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {data.map((orch) => (
              <tr key={orch.id} className="hover:bg-[var(--surface-hover)] transition-colors group">
                <td className="px-6 py-4">
                  <p className="font-medium text-[var(--text-primary)] truncate max-w-[220px]">{orch.workflowName}</p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">{orch.id}</p>
                </td>
                <td className="px-6 py-4">
                  <span className="px-2.5 py-1 rounded-lg bg-[var(--sidebar-active)] text-indigo-400 text-xs font-medium border border-indigo-500/20">
                    {orch.currentStep}
                  </span>
                </td>
                <td className="px-6 py-4 text-[var(--text-secondary)] text-sm">
                  {orch.agentAssigned}
                </td>
                <td className="px-6 py-4">
                  <span className="flex items-center gap-1.5 text-[var(--text-secondary)] text-xs">
                    <Clock className="w-3.5 h-3.5" />
                    {orch.timeInStep}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <StatusBadge status={orch.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
