"use client";

import React from 'react';
import { GitMerge, Loader2, Clock, CheckCircle2, AlertCircle, XCircle, Pause } from 'lucide-react';

interface Orchestration {
  id: string;
  workflowId: string;
  workflowName: string;
  agentAssigned: string;
  status: string;
  timeInStep: string;
  riskScore?: number;
  prompt?: string;
  knowledgeBaseSource?: string;
  nextStep?: string;
  currentStep?: string;
  owner?: string;
  confidenceScore?: number;
  blocker?: string;
  sla?: string;
  post?: { platform?: string; excerpt?: string };
  startedAt?: string;
  kbCollection?: string;
  reviewerName?: string;
  reviewerRole?: string;
  reviewDecision?: string;
  reviewComment?: string;
  reviewedAt?: string;
}

const STATUS_MAP: Record<string, { cls: string; icon: React.ReactNode }> = {
  'In Progress': {
    cls: 'bg-info-text/10 text-info-text border-info-border/20',
    icon: <Loader2 className="w-3 h-3 animate-spin" />,
  },
  Processing: {
    cls: 'bg-warning-text/10 text-warning-text border-warning-border/20',
    icon: <Loader2 className="w-3 h-3 animate-spin" />,
  },
  Pending: {
    cls: 'bg-error-text/10 text-error-text border-error-border/20',
    icon: <Clock className="w-3 h-3" />,
  },
  Waiting: {
    cls: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    icon: <Clock className="w-3 h-3" />,
  },
  Blocked: {
    cls: 'bg-error-text/10 text-error-text border-error-border/20',
    icon: <XCircle className="w-3 h-3" />,
  },
  Paused: {
    cls: 'bg-warning-text/10 text-warning-text border-warning-border/20',
    icon: <Pause className="w-3 h-3" />,
  },
  Completed: {
    cls: 'bg-success-text/10 text-success-text border-success-border/20',
    icon: <CheckCircle2 className="w-3 h-3" />,
  },
  Failed: {
    cls: 'bg-red-600/10 text-red-500 border-red-600/20',
    icon: <AlertCircle className="w-3 h-3" />,
  },
};

const NEXT_STEP_MAP: Record<string, string> = {
  'In Progress': 'Monitor',
  Processing: 'Monitor',
  Pending: 'Queue for Review',
  Waiting: 'Awaiting Approval',
  Blocked: 'Resolve Block',
  Paused: 'Resume',
  Completed: '—',
  Failed: 'Review & Retry',
};

const StatusBadge = ({ status }: { status: string }) => {
  const style = STATUS_MAP[status] ?? { cls: 'bg-gray-500/10 text-gray-400 border-gray-500/20', icon: null };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${style.cls}`}>
      {style.icon}
      {status}
    </span>
  );
};

const RiskBar = ({ score }: { score: number }) => {
  const color = score >= 80 ? 'bg-error-text' : score >= 60 ? 'bg-orange-500' : score >= 40 ? 'bg-warning-text' : 'bg-success-text';
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 rounded-full bg-[var(--border)] overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-[10px] text-[var(--text-muted)]">{score}</span>
    </div>
  );
};

export default function ActiveOrchestrations({
  data,
  onRowClick,
}: {
  data?: Orchestration[];
  onActionComplete?: () => void;
  onRowClick?: (run: Orchestration) => void;
}) {
  if (!data) {
    return <div className="h-64 animate-pulse bg-[var(--surface)] rounded-2xl" />;
  }

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-[var(--border)] flex items-center justify-between bg-[var(--surface)]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-info-text/10 rounded-xl">
            <GitMerge className="w-5 h-5 text-info-text" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-[var(--text-primary)]">Live Workflow Runs</h2>
            <p className="text-xs text-[var(--text-secondary)]">
              Real-time workflow instance monitoring
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-success-text font-medium">
            <span className="w-2 h-2 bg-success-text rounded-full animate-pulse" />
            Live
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto overflow-y-auto max-h-[380px]">
        <table className="w-full text-sm text-left">
          <thead className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] border-b border-[var(--border)] bg-[var(--surface-hover)]/20 sticky top-0 z-10">
            <tr>
              <th className="px-5 py-3 font-medium bg-[var(--surface)]">Name</th>
              <th className="px-5 py-3 font-medium bg-[var(--surface)]">Status</th>
              <th className="px-5 py-3 font-medium bg-[var(--surface)]">Next Step</th>
              <th className="px-5 py-3 font-medium bg-[var(--surface)]">Risk Score</th>

              <th className="px-5 py-3 font-medium bg-[var(--surface)]">Agent Linked</th>
              <th className="px-5 py-3 font-medium bg-[var(--surface)]">Prompt</th>
              <th className="px-5 py-3 font-medium bg-[var(--surface)]">Knowledge Base Source</th>
              <th className="px-5 py-3 font-medium bg-[var(--surface)]">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {data.length === 0 && (
              <tr>
                <td colSpan={8} className="px-5 py-12 text-center text-sm text-[var(--text-muted)]">
                  No active workflow instances. When workflows run, instances appear here in real time.
                </td>
              </tr>
            )}
            {data.map((orch) => (
              <tr
                key={orch.id}
                onClick={() => onRowClick?.(orch)}
                className={`cursor-pointer hover:bg-[var(--surface-hover)] transition-colors ${
                  orch.status === 'Blocked' ? 'bg-error-text/5' : ''
                }`}
              >
                <td className="px-5 py-4">
                  <p className="font-medium text-[var(--text-primary)] truncate max-w-[160px]">{orch.workflowName}</p>
                  <p className="text-[10px] text-[var(--text-muted)] mt-0.5 font-mono">{orch.id.slice(0, 8)}</p>
                </td>
                <td className="px-5 py-4">
                  <StatusBadge status={orch.status} />
                </td>
                <td className="px-5 py-4">
                  <span className="text-xs text-[var(--text-secondary)] font-medium">
                    {orch.nextStep || NEXT_STEP_MAP[orch.status] || '—'}
                  </span>
                </td>
                <td className="px-5 py-4">
                  {orch.riskScore != null ? (
                    <RiskBar score={orch.riskScore} />
                  ) : (
                    <span className="text-xs text-[var(--text-muted)]">—</span>
                  )}
                </td>
                <td className="px-5 py-4 text-xs text-[var(--text-secondary)]">
                  {orch.agentAssigned}
                </td>
                <td className="px-5 py-4">
                  <span className="text-xs text-[var(--text-secondary)] max-w-[140px] block truncate">
                    {orch.prompt || '—'}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <span className="text-xs text-[var(--text-secondary)] max-w-[140px] block truncate">
                    {orch.knowledgeBaseSource || '—'}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <span className="flex items-center gap-1.5 text-[var(--text-secondary)] text-xs whitespace-nowrap">
                    <Clock className="w-3 h-3" />
                    {orch.timeInStep}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
