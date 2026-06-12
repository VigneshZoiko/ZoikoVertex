'use client';
import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { AlertCircle, Loader2, CheckCircle, XCircle, Clock, User, Shield, Key } from 'lucide-react';

interface KeyEntry {
  approver_role: string;
  approver_name?: string;
  decision: 'approved' | 'rejected' | 'pending' | 'abstained' | 'needs_revision' | 'returned';
  decided_at?: string;
  evidence_ref?: string;
  note?: string;
}

interface Quorum {
  required: number;
  completed: number;
  total: number;
  completed_roles: string[];
  pending_roles: string[];
}

const DECISION_STYLES: Record<string, { bg: string; label: string }> = {
  approved:       { bg: 'bg-success-text/10 border-success-border/20 text-success-text', label: 'Approved' },
  rejected:       { bg: 'bg-error-text/10 border-error-border/20 text-error-text',      label: 'Rejected' },
  pending:        { bg: 'bg-warning-text/10 border-warning-border/20 text-warning-text',     label: 'Pending' },
  abstained:      { bg: 'bg-gray-500/10 border-gray-500/20 text-gray-400',         label: 'Abstained' },
  needs_revision: { bg: 'bg-warning-text/10 border-warning-border/20 text-warning-text',     label: 'Needs Revision' },
  returned:       { bg: 'bg-warning-text/10 border-warning-border/20 text-warning-text',     label: 'Returned' },
};

export default function ApprovalChainPanel({ versionId }: { versionId: string | null }) {
  const [keys, setKeys] = useState<KeyEntry[]>([]);
  const [quorum, setQuorum] = useState<Quorum | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchChain = useCallback(async () => {
    if (!versionId) return;
    setLoading(true);
    setError(null);
    try {
      const [chainRes, quorumRes] = await Promise.all([
        api.getThreeKeyChain(versionId),
        api.getThreeKeyQuorum(versionId),
      ]);
      if (chainRes?.success) setKeys(chainRes.data || []);
      else setError(chainRes?.error || 'Failed to load approval chain');
      if (quorumRes?.success) setQuorum(quorumRes.data);
    } catch {
      setError('Failed to load approval chain');
    } finally {
      setLoading(false);
    }
  }, [versionId]);

  useEffect(() => { fetchChain(); }, [fetchChain]);

  if (loading) return (
    <div className="p-6 text-center text-xs text-[var(--text-muted)]">
      <Loader2 className="w-4 h-4 animate-spin mx-auto mb-2" />Loading approval chain…
    </div>
  );

  if (error) return (
    <div className="flex items-start gap-2 p-3 rounded-xl bg-error-text/10 border border-error-border/20 text-error-text text-xs">
      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />{error}
    </div>
  );

  if (!keys.length && !quorum) return (
    <div className="p-4 rounded-xl border border-[var(--border)] text-center text-xs text-[var(--text-muted)]">
      No Three-Key approval chain configured for this workflow version.
    </div>
  );

  const required = quorum?.required || 0;
  const completed = quorum?.completed || 0;
  const pct = required > 0 ? Math.round((completed / required) * 100) : 0;
  const isComplete = quorum ? completed >= required : false;

  return (
    <div className="space-y-3">
      {/* Header badges */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-[var(--border)] text-xs text-[var(--text-primary)]">
          <Key className="w-3.5 h-3.5" />{quorum?.total || keys.length} Keys Required
        </span>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-[var(--border)] text-xs text-[var(--text-primary)]">
          <CheckCircle className="w-3.5 h-3.5 text-success-text" />{completed} Completed
        </span>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-[var(--border)] text-xs text-[var(--text-primary)]">
          <Clock className="w-3.5 h-3.5 text-warning-text" />{required - completed} Pending
        </span>
      </div>

      {/* Quorum meter bar */}
      {required > 0 && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-hover)]/10 p-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-[var(--text-primary)]">Quorum</span>
            <span className={`text-xs font-bold ${isComplete ? 'text-success-text' : 'text-warning-text'}`}>
              {pct}%{isComplete ? ' — Complete' : ' — Incomplete'}
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-[var(--surface-hover)]/40 overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-500 ${isComplete ? 'bg-success-text' : 'bg-warning-text'}`} style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      {/* Keys table */}
      {keys.map((entry, i) => {
        const style = DECISION_STYLES[entry.decision] || DECISION_STYLES.pending;
        return (
          <div key={i} className="rounded-xl border border-[var(--border)] bg-[var(--surface-hover)]/10 p-3 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Shield className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
                <span className="text-xs font-semibold text-[var(--text-primary)]">{entry.approver_role}</span>
              </div>
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold uppercase border shrink-0 ${style.bg}`}>
                {entry.decision === 'approved' ? <CheckCircle className="w-3 h-3 mr-1" /> : entry.decision === 'rejected' ? <XCircle className="w-3 h-3 mr-1" /> : null}
                {style.label}
              </span>
            </div>
            {entry.approver_name && (
              <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
                <User className="w-3 h-3" />{entry.approver_name}
              </div>
            )}
            <div className="flex items-center gap-3 text-[10px] text-[var(--text-muted)]">
              {entry.decided_at && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(entry.decided_at).toLocaleString()}</span>}
              {entry.evidence_ref && <span className="font-mono">ev:{entry.evidence_ref}</span>}
            </div>
            {entry.note && <p className="text-[11px] text-[var(--text-secondary)] italic mt-1">{entry.note}</p>}
          </div>
        );
      })}

      {/* Quorum completed/incomplete indicator */}
      {quorum && (
        <div className={`flex items-center gap-2 p-3 rounded-xl border text-xs font-bold ${isComplete ? 'bg-success-text/10 border-success-border/20 text-success-text' : 'bg-warning-text/10 border-warning-border/20 text-warning-text'}`}>
          {isComplete ? <CheckCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
          {isComplete ? 'Quorum Met — All required approvals received.' : `Quorum Not Met — ${required - completed} more approval${required - completed !== 1 ? 's' : ''} needed.`}
        </div>
      )}
    </div>
  );
}
