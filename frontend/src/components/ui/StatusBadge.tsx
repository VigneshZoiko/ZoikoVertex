import React from 'react';
import { Clock, Archive, ShieldAlert, CheckCircle } from 'lucide-react';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md' | 'lg';
}

const AGENT_STATUS_MAP: Record<string, { color: string; label: string }> = {
  // Agent lifecycle states
  INCOMPLETE_SETUP:       { color: 'bg-rose-500/10 border-rose-500/20 text-rose-500',    label: 'Incomplete Setup' },
  READY_FOR_SANDBOX:      { color: 'bg-amber-500/10 border-amber-500/20 text-amber-500', label: 'Ready for Sandbox' },
  PENDING_CERTIFICATION:  { color: 'bg-amber-500/10 border-amber-500/20 text-amber-500', label: 'Pending Cert' },
  APPROVED_SHADOW:        { color: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-500', label: 'Shadow Mode' },
  APPROVED_ASSISTED:      { color: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-500', label: 'Assisted' },
  APPROVED_LIMITED_AUTONOMY: { color: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-500', label: 'Limited Autonomy' },
  ACTIVE:                 { color: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500', label: 'Active' },
  PAUSED:                 { color: 'bg-amber-500/10 border-amber-500/20 text-amber-500',  label: 'Paused' },
  SUSPENDED:              { color: 'bg-rose-500/10 border-rose-500/20 text-rose-500',     label: 'Suspended' },
  DEAUTHORIZED:           { color: 'bg-rose-500/10 border-rose-500/20 text-rose-500',     label: 'Deauthorized' },
  DISABLED:               { color: 'bg-[var(--surface)] border-[var(--border)] text-[var(--foreground-muted)]', label: 'Disabled' },
  DRAFT:                  { color: 'bg-[var(--surface)] border-[var(--border)] text-[var(--foreground-muted)]', label: 'Draft' },
  BLOCKED:                { color: 'bg-rose-500/10 border-rose-500/20 text-rose-500',     label: 'Blocked' },
  DEPRECATED:             { color: 'bg-[var(--surface)] border-[var(--border)] text-[var(--foreground-muted)]', label: 'Deprecated' },
  RETIRED:                { color: 'bg-[var(--surface)] border-[var(--border)] text-[var(--foreground-muted)]', label: 'Retired' },
  // Generic workflow states
  PENDING:                { color: 'bg-amber-500/10 border-amber-500/20 text-amber-500', label: 'Pending' },
  PENDING_ADMIN:          { color: 'bg-amber-500/10 border-amber-500/20 text-amber-500', label: 'Pending Admin' },
  PENDING_MANAGER:        { color: 'bg-amber-500/10 border-amber-500/20 text-amber-500', label: 'Pending Manager' },
  APPROVED:               { color: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500', label: 'Approved' },
  REJECTED:               { color: 'bg-rose-500/10 border-rose-500/20 text-rose-500', label: 'Rejected' },
  NEEDS_REVISION:         { color: 'bg-amber-500/10 border-amber-500/20 text-amber-500 font-black', label: 'Needs Revision' },
  RETURNED:               { color: 'bg-amber-500/10 border-amber-500/20 text-amber-500 font-black', label: 'Returned' },
  BLOCK:                  { color: 'bg-rose-500/10 border-rose-500/20 text-rose-500', label: 'Block' },
  WARNING:                { color: 'bg-amber-500/10 border-amber-500/20 text-amber-500', label: 'Warning' },
  CRITICAL:               { color: 'bg-rose-500/10 border-rose-500/20 text-rose-500', label: 'Critical' },
  ESCALATED:              { color: 'bg-rose-500/10 border-rose-500/20 text-rose-500', label: 'Escalated' },
  EVIDENCE_INCOMPLETE:    { color: 'bg-violet-500/10 border-violet-500/20 text-violet-400', label: 'Evidence Incomplete' },
  OVERRIDE_ACTIVE:        { color: 'bg-amber-500/10 border-amber-500/20 text-amber-500', label: 'Override Active' },
  EXPIRED:                { color: 'bg-[var(--surface)] border-[var(--border)] text-[var(--foreground-muted)]', label: 'Expired' },
  RESTRICTED:             { color: 'bg-amber-500/10 border-amber-500/20 text-amber-500', label: 'Restricted' },
  IN_REVIEW:              { color: 'bg-amber-500/10 border-amber-500/20 text-amber-500', label: 'In Review' },
};

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'sm' }) => {
  const upper = status.toUpperCase().replace(/\s+/g, '_');
  const mapped = AGENT_STATUS_MAP[upper];
  const colorClass = mapped?.color || 'bg-[var(--surface)] border-[var(--border)] text-[var(--foreground-muted)]';
  const label = mapped?.label || status.replace(/_/g, ' ');

  const sizeClass = size === 'lg'
    ? 'px-3 py-1.5 text-xs font-black uppercase tracking-widest'
    : size === 'md'
    ? 'px-2.5 py-1 text-[10px] font-black uppercase tracking-widest'
    : 'px-2 py-0.5 text-[9px] font-black uppercase tracking-widest';

  return (
    <div className={`inline-flex items-center rounded border ${colorClass} ${sizeClass}`}>
      {label}
    </div>
  );
};

export default StatusBadge;
