"use client";

import React, { useState } from 'react';
import { GitMerge, Loader2, Clock, CheckCircle2, AlertCircle, XCircle, Pause, ShieldAlert, BarChart2 } from 'lucide-react';
import { api } from '@/lib/api';
import ConfirmActionModal from '@/components/ConfirmActionModal';

// Per doc section 8 — Runtime Operations Requirements
// Visible data: workflow name, instance ID, current step, owner, SLA, risk score,
// confidence score, status, blocker
// User actions: Open, assign, pause, escalate, view evidence.

interface Orchestration {
  id: string;
  workflowId: string;
  workflowName: string;
  currentStep: string;
  agentAssigned: string;
  owner?: string;
  status: string;
  timeInStep: string;
  startedAt: string;
  riskScore?: number;
  confidenceScore?: number;
  sla?: string;
  blocker?: string;
}

const STATUS_MAP: Record<string, { cls: string; icon: React.ReactNode }> = {
  'In Progress': {
    cls: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    icon: <Loader2 className="w-3 h-3 animate-spin" />,
  },
  Processing: {
    cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    icon: <Loader2 className="w-3 h-3 animate-spin" />,
  },
  Pending: {
    cls: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    icon: <Clock className="w-3 h-3" />,
  },
  Waiting: {
    cls: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    icon: <Clock className="w-3 h-3" />,
  },
  Blocked: {
    cls: 'bg-rose-600/10 text-rose-500 border-rose-600/20',
    icon: <XCircle className="w-3 h-3" />,
  },
  Paused: {
    cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    icon: <Pause className="w-3 h-3" />,
  },
  Completed: {
    cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    icon: <CheckCircle2 className="w-3 h-3" />,
  },
  Failed: {
    cls: 'bg-red-600/10 text-red-500 border-red-600/20',
    icon: <AlertCircle className="w-3 h-3" />,
  },
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
  const color = score >= 80 ? 'bg-rose-500' : score >= 60 ? 'bg-orange-500' : score >= 40 ? 'bg-amber-500' : 'bg-emerald-500';
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
  onActionComplete,
}: {
  data?: Orchestration[];
  onActionComplete?: () => void;
}) {
  // Track per-instance loading state: key = `${instanceId}:pause` or `${instanceId}:escalate`
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pauseTarget, setPauseTarget] = useState<Orchestration | null>(null);
  const [escalateTarget, setEscalateTarget] = useState<Orchestration | null>(null);

  const setLoading = (id: string, action: string, val: boolean) =>
    setActionLoading((prev) => ({ ...prev, [`${id}:${action}`]: val }));

  const handlePause = (orch: Orchestration) => {
    setPauseTarget(orch);
  };

  const handleEscalate = (orch: Orchestration) => {
    setEscalateTarget(orch);
  };

  const handlePauseConfirm = async () => {
    if (!pauseTarget) return;
    setLoading(pauseTarget.id, 'pause', true);
    try {
      const res = await api.transitionWorkflowInstance(pauseTarget.id, { status: 'PAUSED', reason: 'Manually paused from Live Orchestrations panel' });
      if (res?.success) {
        onActionComplete?.();
      } else {
        setErrorMessage(res?.error || 'Failed to pause instance. Please try again.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Network error pausing instance.');
    } finally {
      setLoading(pauseTarget.id, 'pause', false);
      setPauseTarget(null);
    }
  };

  const handleEscalateConfirm = async (value?: string) => {
    if (!escalateTarget || !value?.trim()) return;
    setLoading(escalateTarget.id, 'escalate', true);
    try {
      const res = await api.escalateRun(escalateTarget.id, value.trim());
      if (res?.success) {
        onActionComplete?.();
      } else {
        setErrorMessage(res?.error || 'Failed to escalate instance. Please try again.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Network error escalating instance.');
    } finally {
      setLoading(escalateTarget.id, 'escalate', false);
      setEscalateTarget(null);
    }
  };

  if (!data) {
    return <div className="h-64 animate-pulse bg-[var(--surface)] rounded-2xl" />;
  }

  const blockedCount = data.filter((o) => o.status === 'Blocked').length;

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
            <p className="text-xs text-[var(--text-secondary)]">
              Real-time workflow instance monitoring — step, owner, risk, confidence, blocker
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {blockedCount > 0 && (
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
              {blockedCount} Blocked
            </span>
          )}
          <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            Live
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="px-6 py-3 border-b border-[var(--border)] bg-rose-500/5 flex items-center gap-2 text-xs text-rose-400">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          {errorMessage}
          <button onClick={() => setErrorMessage(null)} className="ml-auto opacity-60 hover:opacity-100">
            <XCircle className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] border-b border-[var(--border)] bg-[var(--surface-hover)]/20">
            <tr>
              <th className="px-5 py-3 font-medium">Instance</th>
              <th className="px-5 py-3 font-medium">Current Step</th>
              <th className="px-5 py-3 font-medium">Agent / Owner</th>
              <th className="px-5 py-3 font-medium">Risk</th>
              <th className="px-5 py-3 font-medium">Confidence</th>
              <th className="px-5 py-3 font-medium">Time in Step</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Actions</th>
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
                className={`hover:bg-[var(--surface-hover)] transition-colors ${
                  orch.status === 'Blocked' ? 'bg-rose-500/5' : ''
                }`}
              >
                <td className="px-5 py-4">
                  <p className="font-medium text-[var(--text-primary)] truncate max-w-[180px]">{orch.workflowName}</p>
                  <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{orch.id}</p>
                  {orch.blocker && (
                    <p className="text-[10px] text-rose-400 mt-0.5 flex items-center gap-1">
                      <XCircle className="w-3 h-3" /> {orch.blocker}
                    </p>
                  )}
                </td>
                <td className="px-5 py-4">
                  <span className="px-2.5 py-1 rounded-lg bg-[var(--sidebar-active)] text-indigo-400 text-xs font-medium border border-indigo-500/20">
                    {orch.currentStep}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <p className="text-xs text-[var(--text-secondary)]">{orch.agentAssigned}</p>
                  {orch.owner && (
                    <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Owner: {orch.owner}</p>
                  )}
                </td>
                <td className="px-5 py-4">
                  {orch.riskScore != null ? (
                    <RiskBar score={orch.riskScore} />
                  ) : (
                    <span className="text-xs text-[var(--text-muted)]">—</span>
                  )}
                </td>
                <td className="px-5 py-4">
                  {orch.confidenceScore != null ? (
                    <div className="flex items-center gap-1.5">
                      <BarChart2 className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                      <span className="text-xs text-[var(--text-secondary)]">{orch.confidenceScore}%</span>
                    </div>
                  ) : (
                    <span className="text-xs text-[var(--text-muted)]">—</span>
                  )}
                </td>
                <td className="px-5 py-4">
                  <span className="flex items-center gap-1.5 text-[var(--text-secondary)] text-xs">
                    <Clock className="w-3.5 h-3.5" />
                    {orch.timeInStep}
                  </span>
                  {orch.sla && (
                    <p className="text-[10px] text-[var(--text-muted)] mt-0.5">SLA: {orch.sla}</p>
                  )}
                </td>
                <td className="px-5 py-4">
                  <StatusBadge status={orch.status} />
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-1.5">
                    <button
                      title="Pause instance"
                      disabled={actionLoading[`${orch.id}:pause`] || orch.status === 'Paused' || orch.status === 'Completed'}
                      onClick={() => handlePause(orch)}
                      className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--text-muted)] hover:text-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      {actionLoading[`${orch.id}:pause`]
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <Pause className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      title="Escalate instance"
                      disabled={actionLoading[`${orch.id}:escalate`] || orch.status === 'Completed'}
                      onClick={() => handleEscalate(orch)}
                      className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--text-muted)] hover:text-rose-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      {actionLoading[`${orch.id}:escalate`]
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <ShieldAlert className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmActionModal
        open={pauseTarget !== null}
        mode="confirm"
        variant="warning"
        title="Pause Instance"
        message={`Pause instance "${pauseTarget?.workflowName}" (${pauseTarget?.id})?\n\nThis will suspend execution at the current step. State is preserved and the run can be resumed.`}
        confirmLabel="Pause"
        loading={pauseTarget ? actionLoading[`${pauseTarget.id}:pause`] || false : false}
        onConfirm={handlePauseConfirm}
        onCancel={() => setPauseTarget(null)}
      />
      <ConfirmActionModal
        open={escalateTarget !== null}
        mode="prompt"
        variant="warning"
        title="Escalate Instance"
        message={`Escalate instance "${escalateTarget?.workflowName}" (${escalateTarget?.id})?`}
        promptPlaceholder="Enter escalation reason..."
        confirmLabel="Escalate"
        loading={escalateTarget ? actionLoading[`${escalateTarget.id}:escalate`] || false : false}
        onConfirm={handleEscalateConfirm}
        onCancel={() => setEscalateTarget(null)}
      />
    </div>
  );
}