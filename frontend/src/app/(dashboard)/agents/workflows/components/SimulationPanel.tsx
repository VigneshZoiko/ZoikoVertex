'use client';
import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { AlertCircle, CheckCircle, AlertTriangle, XCircle, RefreshCw, Play, Loader2 } from 'lucide-react';

interface SimulationData {
  id: string;
  result: 'pass' | 'warning' | 'block' | 'escalation' | 'missing_dependency' | 'failed_integration';
  warnings: { type: string; step_name?: string; message: string }[];
  blocks: { type: string; step_name?: string; message: string }[];
  failed_steps: { step_name: string; step_type: string; reason: string }[];
  missing_dependencies: { dependency_type: string; dependency_id: string; dependency_name: string; impact: string }[];
  policy_results: { step_name: string; policy_check: string; status: string }[];
  dependency_results: any[];
  evidence_ref: string;
}

const RESULT_STYLES: Record<string, string> = {
  pass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  block: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  escalation: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  missing_dependency: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  failed_integration: 'bg-red-500/10 text-red-400 border-red-500/20',
};

export default function SimulationPanel({ versionId }: { versionId: string | null }) {
  const [runs, setRuns] = useState<SimulationData[]>([]);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSimulations = useCallback(async () => {
    if (!versionId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.getWorkflowSimulations(versionId);
      if (res?.success) setRuns(res.data || []);
      else setError(res?.error || 'Failed to load simulations');
    } catch {
      setError('Failed to load simulations');
    } finally {
      setLoading(false);
    }
  }, [versionId]);

  useEffect(() => { fetchSimulations(); }, [fetchSimulations]);

  const runSimulation = async () => {
    if (!versionId) return;
    setRunning(true);
    setError(null);
    try {
      const res = await api.simulateWorkflowVersion(versionId);
      if (res?.success) {
        if (res.data) setRuns(prev => [res.data, ...prev]);
      } else {
        setError(res?.error || 'Simulation failed');
      }
    } catch {
      setError('Simulation request failed');
    } finally {
      setRunning(false);
    }
  };

  const latest = runs[0];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Simulation Runs</p>
        <button onClick={runSimulation} disabled={running || !versionId}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-foreground bg-sky-500 hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
          {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
          {running ? 'Running…' : 'Run Simulation'}
        </button>
      </div>
      {error && <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs"><AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />{error}</div>}
      {loading && <div className="p-6 text-center text-xs text-[var(--text-muted)]"><Loader2 className="w-4 h-4 animate-spin mx-auto mb-2" />Loading simulations…</div>}
      {!loading && !latest && <div className="p-4 rounded-xl border border-[var(--border)] text-center text-xs text-[var(--text-muted)]">No simulations yet. Click &quot;Run Simulation&quot; to start.</div>}
      {!loading && latest && (
        <div className="space-y-3">
          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold uppercase ${RESULT_STYLES[latest.result] || 'bg-gray-500/10 text-gray-400'}`}>
            {latest.result === 'pass' ? <CheckCircle className="w-4 h-4" /> : latest.result === 'block' ? <XCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            Result: {latest.result}
            {latest.evidence_ref && <span className="ml-auto font-mono text-[10px] opacity-60">ev:{latest.evidence_ref}</span>}
          </div>
          {latest.blocks.length > 0 && <Section title="Blocks" color="rose">
            {latest.blocks.map((b, i) => <Item key={i} icon={<XCircle className="w-3.5 h-3.5 text-rose-400" />} label={b.message} sub={b.type} />)}
          </Section>}
          {latest.warnings.length > 0 && <Section title="Warnings" color="amber">
            {latest.warnings.map((w, i) => <Item key={i} icon={<AlertTriangle className="w-3.5 h-3.5 text-amber-400" />} label={w.message} sub={w.step_name} />)}
          </Section>}
          {latest.failed_steps.length > 0 && <Section title="Failed Steps" color="rose">
            {latest.failed_steps.map((f, i) => <Item key={i} icon={<XCircle className="w-3.5 h-3.5 text-rose-400" />} label={`${f.step_name} (${f.step_type})`} sub={f.reason} />)}
          </Section>}
          {latest.missing_dependencies.length > 0 && <Section title="Missing Dependencies" color="orange">
            {latest.missing_dependencies.map((m, i) => <Item key={i} icon={<AlertCircle className="w-3.5 h-3.5 text-orange-400" />} label={`${m.dependency_type}: ${m.dependency_name}`} sub={`Impact: ${m.impact}`} />)}
          </Section>}
          {latest.policy_results.length > 0 && <Section title="Policy Check Results" color="indigo">
            {latest.policy_results.map((p, i) => (
              <div key={i} className="flex items-center gap-2 p-2 rounded-lg border border-[var(--border)] bg-[var(--surface-hover)]/20">
                <span className={`w-2 h-2 rounded-full ${p.status === 'passed' ? 'bg-emerald-400' : p.status === 'failed' ? 'bg-rose-400' : 'bg-amber-400'}`} />
                <span className="flex-1 text-xs text-[var(--text-primary)]">{p.policy_check}</span>
                <span className={`text-[10px] font-bold uppercase ${p.status === 'passed' ? 'text-emerald-400' : p.status === 'failed' ? 'text-rose-400' : 'text-amber-400'}`}>{p.status}</span>
              </div>
            ))}
          </Section>}
          {latest.dependency_results.length > 0 && <Section title="Dependency Results" color="steel">
            {latest.dependency_results.slice(0, 5).map((d: any, i: number) => (
              <div key={i} className="flex items-center gap-2 p-2 rounded-lg border border-[var(--border)] bg-[var(--surface-hover)]/20">
                <HealthDot health={d.health} />
                <span className="flex-1 text-xs text-[var(--text-primary)]">{d.dependency_name || d.dependency_id_ref}</span>
                <span className="text-[10px] text-[var(--text-muted)]">{d.health}</span>
                {d.blocking && <XCircle className="w-3 h-3 text-rose-400" />}
              </div>
            ))}
          </Section>}
        </div>
      )}
    </div>
  );
}

function Section({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  const borderColor = `border-${color}-500/10`;
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1.5">{title}</p>
      <div className={`space-y-1.5 p-3 rounded-xl border ${borderColor} bg-[var(--surface-hover)]/10`}>{children}</div>
    </div>
  );
}

function Item({ icon, label, sub }: { icon: React.ReactNode; label: string; sub?: string }) {
  return (
    <div className="flex items-start gap-2 p-2 rounded-lg">
      <div className="shrink-0 mt-0.5">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-[var(--text-primary)]">{label}</p>
        {sub && <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function HealthDot({ health }: { health: string }) {
  const colors: Record<string, string> = { healthy: 'bg-emerald-400', stale: 'bg-amber-400', paused: 'bg-blue-400', missing: 'bg-gray-400', deprecated: 'bg-purple-400', critical_failure: 'bg-rose-400' };
  return <span className={`w-2 h-2 rounded-full shrink-0 ${colors[health] || 'bg-gray-500'}`} />;
}
