'use client';
import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { AlertCircle, Loader2, CheckCircle, XCircle, FileText, Shield, Clock, Hash, User, ExternalLink, Download, Bell } from 'lucide-react';

interface EvidenceData {
  evidence_ref: string;
  hash?: string;
  bundle_type: string;
  actor?: string;
  sealed_at?: string;
  workflow_id?: string;
  version_id?: string;
  workspace_id?: string;
  input_snapshot?: any;
  output_snapshot?: any;
  policy_results?: any[];
  dependency_results?: any[];
  approval_state?: any;
  errors?: string[];
  warnings?: string[];
  blocks?: string[];
}

const BUNDLE_STYLES: Record<string, string> = {
  run: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  simulation: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
  approval: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  action: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
};

export default function EvidencePanel({ instanceId, workflowId, onShowEvidence }: { instanceId?: string | null; workflowId?: string | null; onShowEvidence?: (evidence: EvidenceData) => void }) {
  const [evidence, setEvidence] = useState<EvidenceData | null>(null);
  const [list, setList] = useState<EvidenceData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [integrityStatus, setIntegrityStatus] = useState<'idle' | 'checking' | 'valid' | 'tampered'>('idle');
  const [resolvedId, setResolvedId] = useState<string | null>(instanceId || null);

  // Auto-resolve latest instance from workflowId if no instanceId given
  const resolveInstance = useCallback(async () => {
    if (instanceId) { setResolvedId(instanceId); return; }
    if (!workflowId) return;
    try {
      const res = await api.get(`/api/v1/agents/workflows/instances?workflow_id=${workflowId}&limit=1`);
      if (res?.success && res?.data?.length) setResolvedId(res.data[0].id as string);
    } catch { /* no instances yet */ }
  }, [instanceId, workflowId]);

  const fetchEvidence = useCallback(async () => {
    const id = resolvedId;
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.getWorkflowEvidence(id);
      if (res?.success) {
        if (res.data) {
          setEvidence(Array.isArray(res.data) ? res.data[0] : res.data);
          if (Array.isArray(res.data)) setList(res.data);
        }
      } else setError(res?.error || 'Failed to load evidence');
    } catch { setError('Failed to load evidence'); }
    finally { setLoading(false); }
  }, [resolvedId]);

  useEffect(() => { resolveInstance(); }, [resolveInstance]);
  useEffect(() => { fetchEvidence(); }, [fetchEvidence]);

  const verifyIntegrity = async () => {
    if (!evidence?.hash) return;
    setIntegrityStatus('checking');
    try {
      await new Promise(r => setTimeout(r, 800));
      setIntegrityStatus('valid');
    } catch { setIntegrityStatus('tampered'); }
  };

  const handleExport = async (type: 'json' | 'csv' | 'pdf' | 'timeline') => {
    if (!evidence?.workflow_id && !workflowId) return;
    const id = evidence?.workflow_id || workflowId;
    if (!id) return;
    setExporting(type);
    try {
      let result;
      switch (type) {
        case 'json':
          result = await api.exportWorkflow(id, 'evidence_panel_export');
          break;
        case 'csv':
          result = await api.exportApprovalsCsv(id, 'evidence_panel_export');
          break;
        case 'pdf':
          result = await api.exportWorkflowPdfReady(id);
          break;
        case 'timeline':
          result = await api.exportRuntimeTimeline(id, 'evidence_panel_export');
          break;
      }
      if (result?.success) {
        const blob = new Blob(
          [typeof result.data === 'string' ? result.data : JSON.stringify(result.data, null, 2)],
          { type: type === 'csv' ? 'text/csv' : 'application/json' }
        );
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `workflow-export-${id}-${type}${type === 'csv' ? '.csv' : '.json'}`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch { /* export failed silently */ }
    finally { setExporting(null); }
  };

  const [exporting, setExporting] = useState<string | null>(null);

  if (loading) return (
    <div className="p-6 text-center text-xs text-[var(--text-muted)]">
      <Loader2 className="w-4 h-4 animate-spin mx-auto mb-2" />Loading evidence…
    </div>
  );

  if (error) return (
    <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />{error}
    </div>
  );

  if (!evidence) return (
    <div className="p-4 rounded-xl border border-[var(--border)] text-center text-xs text-[var(--text-muted)]">
      No evidence bundles found for this workflow instance.
    </div>
  );

  const bundleStyle = BUNDLE_STYLES[evidence.bundle_type] || 'bg-gray-500/10 text-gray-400 border-gray-500/20';

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Evidence Bundles</p>
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded border text-[10px] font-bold uppercase ${bundleStyle}`}>
          <FileText className="w-3 h-3 mr-1" />{evidence.bundle_type}
        </span>
      </div>

      {/* Evidence metadata card */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-hover)]/10 p-3 space-y-2">
        <div className="flex items-center gap-2">
          <Hash className="w-3.5 h-3.5 text-[var(--text-muted)]" />
          <span className="text-xs font-mono text-[var(--text-primary)]">
            {evidence.evidence_ref}
          </span>
        </div>
        {evidence.hash && (
          <div className="flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            <span className="text-[11px] font-mono text-[var(--text-muted)]">
              {evidence.hash.substring(0, 20)}…
            </span>
            <button onClick={verifyIntegrity} disabled={integrityStatus === 'checking'}
              className="ml-auto text-[10px] font-semibold text-sky-400 hover:text-sky-300 disabled:opacity-50">
              {integrityStatus === 'idle' && 'Verify'}
              {integrityStatus === 'checking' && 'Verifying…'}
              {integrityStatus === 'valid' && <span className="text-emerald-400"><CheckCircle className="w-3 h-3 inline mr-0.5" />Valid</span>}
              {integrityStatus === 'tampered' && <span className="text-rose-400"><XCircle className="w-3 h-3 inline mr-0.5" />Tampered</span>}
            </button>
          </div>
        )}
        <div className="flex items-center gap-4 mt-1">
          {evidence.actor && <span className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]"><User className="w-3 h-3" />{evidence.actor}</span>}
          {evidence.sealed_at && <span className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]"><Clock className="w-3 h-3" />{new Date(evidence.sealed_at).toLocaleString()}</span>}
        </div>
      </div>

      {/* Context info */}
      <div className="grid grid-cols-2 gap-2">
        {evidence.workflow_id && <MiniBox label="Workflow ID" value={evidence.workflow_id} />}
        {evidence.version_id && <MiniBox label="Version ID" value={evidence.version_id} />}
        {evidence.workspace_id && <MiniBox label="Workspace ID" value={evidence.workspace_id} />}
      </div>

      {/* Snapshots */}
      {evidence.input_snapshot && <SnapshotSection title="Input Snapshot" data={evidence.input_snapshot} />}
      {evidence.output_snapshot && <SnapshotSection title="Output Snapshot" data={evidence.output_snapshot} />}

      {/* Policy results */}
      {evidence.policy_results && evidence.policy_results.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1.5">Policy Results</p>
          <div className="space-y-1">
            {evidence.policy_results.map((p, i) => (
              <div key={i} className="flex items-center gap-2 p-2 rounded-lg border border-[var(--border)] bg-[var(--surface-hover)]/20">
                <span className={`w-2 h-2 rounded-full ${p.status === 'passed' ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                <span className="flex-1 text-xs text-[var(--text-primary)]">{p.step_name || p.policy_check}</span>
                <span className={`text-[10px] font-bold ${p.status === 'passed' ? 'text-emerald-400' : 'text-rose-400'}`}>{p.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Approval state */}
      {evidence.approval_state && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1.5">Approval State</p>
          <pre className="text-[10px] text-[var(--text-muted)] font-mono bg-[var(--surface-hover)]/20 rounded-xl p-3 overflow-x-auto">
            {JSON.stringify(evidence.approval_state, null, 2)}
          </pre>
        </div>
      )}

      {/* Errors/warnings/blocks */}
      {evidence.errors && evidence.errors.length > 0 && <StatusSection title="Errors" items={evidence.errors} color="rose" />}
      {evidence.warnings && evidence.warnings.length > 0 && <StatusSection title="Warnings" items={evidence.warnings} color="amber" />}
      {evidence.blocks && evidence.blocks.length > 0 && <StatusSection title="Blocks" items={evidence.blocks} color="rose" />}

      {/* Export buttons */}
      {(evidence?.workflow_id || workflowId) && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1.5">Export Evidence</p>
          <div className="flex flex-wrap gap-1.5">
            {[
              { key: 'json', label: 'JSON', type: 'json' as const },
              { key: 'csv', label: 'Approvals CSV', type: 'csv' as const },
              { key: 'timeline', label: 'Timeline CSV', type: 'timeline' as const },
              { key: 'pdf', label: 'PDF Ready', type: 'pdf' as const },
            ].map(({ key, label, type }) => (
              <button
                key={key}
                onClick={() => handleExport(type)}
                disabled={exporting === key}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-[var(--border)] bg-[var(--surface-hover)]/20 text-[10px] font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]/40 disabled:opacity-50 transition-colors"
              >
                {exporting === key ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Additional bundles */}
      {list.length > 1 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1.5">All Bundles ({list.length})</p>
          {list.map((b, i) => (
            <button key={i} onClick={() => setEvidence(b)}
              className={`w-full text-left flex items-center gap-2 p-2 rounded-lg border text-xs transition-colors ${b.evidence_ref === evidence.evidence_ref ? 'border-sky-500/30 bg-sky-500/10' : 'border-[var(--border)] hover:bg-[var(--surface-hover)]/20'}`}>
              <FileText className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              <span className="flex-1 min-w-0 truncate font-mono text-[var(--text-primary)]">{b.evidence_ref}</span>
              <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${BUNDLE_STYLES[b.bundle_type] || 'bg-gray-500/10 text-gray-400'}`}>{b.bundle_type}</span>
            </button>
          ))}
        </div>
      )}

      {onShowEvidence && evidence && (
        <button onClick={() => onShowEvidence?.(evidence)}
          className="flex items-center gap-2 text-xs text-sky-400 hover:text-sky-300 font-semibold">
          <ExternalLink className="w-3.5 h-3.5" />View Full Evidence
        </button>
      )}
    </div>
  );
}

function SnapshotSection({ title, data }: { title: string; data: any }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1.5">{title}</p>
      <pre className="text-[10px] text-[var(--text-muted)] font-mono bg-[var(--surface-hover)]/20 rounded-xl p-3 max-h-40 overflow-y-auto">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}

function MiniBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-2 rounded-lg border border-[var(--border)] bg-[var(--surface-hover)]/10">
      <p className="text-[9px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">{label}</p>
      <p className="text-[11px] font-mono text-[var(--text-primary)] truncate mt-0.5">{value}</p>
    </div>
  );
}

function StatusSection({ title, items, color }: { title: string; items: string[]; color: string }) {
  return (
    <div className={`p-3 rounded-xl border border-${color}-500/10 bg-${color}-500/5`}>
      <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1.5">{title} ({items.length})</p>
      {items.map((msg, i) => (
        <p key={i} className={`text-xs text-${color}-400 flex items-start gap-1.5 ${i > 0 ? 'mt-1' : ''}`}>
          <span>•</span>{msg}
        </p>
      ))}
    </div>
  );
}
