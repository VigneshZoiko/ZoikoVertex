'use client';
import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { AlertCircle, Loader2, ChevronDown, ChevronRight, ExternalLink, XCircle } from 'lucide-react';

interface Dependency {
  dependency_type: string;
  dependency_id_ref: string;
  dependency_name?: string;
  required_status: string;
  current_status: string;
  health: 'healthy' | 'stale' | 'paused' | 'missing' | 'deprecated' | 'critical_failure';
  impact_level?: string;
  blocking: boolean;
  recommended_action?: string;
  last_checked_at?: string;
}

const HEALTH_STYLES: Record<string, { dot: string; bg: string; label: string }> = {
  healthy:          { dot: 'bg-success-text', bg: 'bg-success-text/10 border-success-border/20 text-success-text', label: 'Healthy' },
  stale:            { dot: 'bg-warning-text',   bg: 'bg-warning-text/10 border-warning-border/20 text-warning-text',    label: 'Stale' },
  paused:           { dot: 'bg-blue-400',    bg: 'bg-blue-500/10 border-blue-500/20 text-blue-400',        label: 'Paused' },
  missing:          { dot: 'bg-gray-400',    bg: 'bg-gray-500/10 border-gray-500/20 text-gray-400',        label: 'Missing' },
  deprecated:       { dot: 'bg-purple-400',  bg: 'bg-purple-500/10 border-purple-500/20 text-purple-400',  label: 'Deprecated' },
  critical_failure: { dot: 'bg-error-text',    bg: 'bg-error-text/10 border-error-border/20 text-error-text',        label: 'Critical' },
};

const IMPACT_COLORS: Record<string, string> = {
  low: 'text-[var(--text-muted)]',
  medium: 'text-warning-text',
  high: 'text-error-text',
  critical: 'text-error-text font-bold',
};

export default function DependencyHealthPanel({ workflowId }: { workflowId: string | null }) {
  const [deps, setDeps] = useState<Dependency[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  const fetchDeps = useCallback(async () => {
    if (!workflowId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.getWorkflowDependencies(workflowId);
      if (res?.success) setDeps(res.data || []);
      else setError(res?.error || 'Failed to load dependencies');
    } catch {
      setError('Failed to load dependencies');
    } finally {
      setLoading(false);
    }
  }, [workflowId]);

  useEffect(() => { fetchDeps(); }, [fetchDeps]);

  if (loading) return (
    <div className="p-6 text-center text-xs text-[var(--text-muted)]">
      <Loader2 className="w-4 h-4 animate-spin mx-auto mb-2" />Loading dependencies…
    </div>
  );

  if (error) return (
    <div className="flex items-start gap-2 p-3 rounded-xl bg-error-text/10 border border-error-border/20 text-error-text text-xs">
      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />{error}
    </div>
  );

  if (!deps.length) return (
    <div className="p-4 rounded-xl border border-[var(--border)] text-center text-xs text-[var(--text-muted)]">
      No dependencies found for this workflow.
    </div>
  );

  const blockingCount = deps.filter(d => d.blocking).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Dependencies ({deps.length})</p>
        {blockingCount > 0 && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-error-text/10 border border-error-border/20 text-error-text text-[10px] font-bold">
            <XCircle className="w-3 h-3" />{blockingCount} Blocking
          </span>
        )}
      </div>
      {deps.map((dep, i) => {
        const style = HEALTH_STYLES[dep.health] || HEALTH_STYLES.missing;
        const isExpanded = expanded[i];
        return (
          <div key={i} className="rounded-xl border border-[var(--border)] bg-[var(--surface-hover)]/10 overflow-hidden">
            <button onClick={() => setExpanded(prev => ({ ...prev, [i]: !prev[i] }))}
              className="w-full flex items-center gap-2.5 p-3 text-left hover:bg-[var(--surface-hover)]/30 transition-colors">
              {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />}
              <span className={`w-2 h-2 rounded-full shrink-0 ${style.dot}`} />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-[var(--text-primary)] truncate">{dep.dependency_name || dep.dependency_id_ref}</p>
                <p className="text-[10px] text-[var(--text-muted)]">{dep.dependency_type}</p>
              </div>
              <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold uppercase ${style.bg}`}>{style.label}</span>
              {dep.blocking && <XCircle className="w-3.5 h-3.5 text-error-text shrink-0" />}
            </button>
            {isExpanded && (
              <div className="px-3 pb-3 space-y-1.5">
                <div className="h-px bg-[var(--border)] mb-2" />
                <Row label="Type" value={dep.dependency_type} />
                <Row label="ID" value={dep.dependency_id_ref} mono />
                <Row label="Required Status" value={dep.required_status} />
                <Row label="Current Status" value={dep.current_status} />
                <Row label="Impact" value={dep.impact_level || '—'} color={IMPACT_COLORS[dep.impact_level || '']} />
                {dep.recommended_action && <Row label="Recommendation" value={dep.recommended_action} />}
                {dep.last_checked_at && <Row label="Last Checked" value={new Date(dep.last_checked_at).toLocaleString()} />}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Row({ label, value, mono, color }: { label: string; value: string; mono?: boolean; color?: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] w-28 shrink-0">{label}</span>
      <span className={`text-xs text-[var(--text-primary)] ${mono ? 'font-mono' : ''} ${color || ''}`}>{value}</span>
    </div>
  );
}
