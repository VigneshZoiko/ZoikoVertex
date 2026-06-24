"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import {
  Archive, Shield, AlertTriangle, CheckCircle2, Clock, Hash, FileText,
  Gavel, Eye, RefreshCw, Lock, BarChart3, HardDrive, Activity, User,
  Calendar, Server, Globe, Key, FileWarning, FileCheck, FileClock,
  Link2, Download, ChevronLeft, RotateCcw, ExternalLink, ImageIcon,
  MessageSquare, Info, Package, Layers, Database,
} from "lucide-react";

type TabId = "summary" | "case" | "integrity" | "custody" | "contents" | "redaction" | "retention" | "exports";

function buildTabs(isRevisionCase: boolean): { id: TabId; label: string; icon: React.ElementType }[] {
  return [
    { id: "summary", label: "Summary", icon: FileText },
    ...(isRevisionCase ? [{ id: "case" as TabId, label: "Case Details", icon: Gavel }] : []),
    { id: "integrity", label: "Integrity", icon: Hash },
    { id: "custody", label: "Custody", icon: Shield },
    { id: "contents", label: "Contents", icon: FileCheck },
    { id: "redaction", label: "Redaction", icon: FileWarning },
    { id: "retention", label: "Retention & Holds", icon: Lock },
    { id: "exports", label: "Exports & Shares", icon: Download },
  ];
}

interface EvidenceItemDetail {
  id: string;
  item_id: string;
  schema_version: string;
  tenant_id: string;
  workspace_id: string;
  data_residency: string;
  source_type: string;
  source_id: string;
  source_system: string;
  source_timestamp_utc: string | null;
  evidence_type: string | null;
  risk_level: string;
  sensitivity: string;
  contains_pii: boolean;
  contains_ai_output: boolean;
  jurisdictions: string[];
  original_content_hash: string | null;
  normalized_content_hash: string | null;
  metadata_hash: string | null;
  preservation_receipt_hash: string | null;
  hash_algorithm: string;
  preserved_by_actor_id: string;
  authority: string | null;
  preservation_reason: string;
  origin_ip_hash: string | null;
  retention_class: string;
  retention_until: string | null;
  legal_hold: boolean;
  hold_ids: string[];
  vault_state: string;
  access_policy_id: string | null;
  payload_ref: string | null;
  payload_size: number;
  mime_type: string | null;
  metadata: any;
  verification_count: number;
  last_verified_at: string | null;
  last_verified_by: string | null;
  captured_at: string;
  created_at: string;
  updated_at: string;
}

function fmt(ts: string) {
  try { return new Date(ts).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }); }
  catch { return "Invalid date"; }
}

const VAULT_STATE_COLOR: Record<string, string> = {
  preserved: "text-success-text border-success-border bg-success-bg",
  sealed: "text-info-text border-info-border bg-info-bg",
  legal_hold: "text-error-text border-error-border bg-error-bg",
  archived: "text-[#666] border-[#333] bg-[#111]",
  quarantined: "text-warning-text border-warning-border bg-warning-bg",
  failed: "text-error-text border-error-border bg-error-bg",
};

const RISK_COLOR: Record<string, string> = {
  low: "text-success-text", medium: "text-warning-text",
  high: "text-orange-400", critical: "text-error-text",
};

const SENSITIVITY_ICON: Record<string, React.ElementType> = {
  public: Globe, internal: Lock, restricted: Key,
  confidential: Shield, legal_privileged: Gavel,
};

function Badge({ label, color }: { label: string; color: string }) {
  return <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border ${color}`}>{label}</span>;
}

function Section({ title, children, className, icon: Icon }: { title: string; children: React.ReactNode; className?: string; icon?: React.ElementType }) {
  return (
    <div className={`bg-[#0d0d0d] border border-[#1e1e1e] rounded-2xl p-5 ${className || ''}`}>
      <div className="flex items-center gap-2 mb-4">
        {Icon && <Icon className="w-3.5 h-3.5 text-[#555]" />}
        <h3 className="text-[11px] font-semibold text-[#666] uppercase tracking-widest">{title}</h3>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Row({ label, value, mono, highlight }: { label: string; value: string; mono?: boolean; highlight?: boolean }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-[11px] text-[#555] w-28 sm:w-44 shrink-0 pt-0.5">{label}</span>
      <span className={`text-[11px] break-all leading-relaxed ${
        mono ? 'font-mono text-[10px] text-[#888]' :
        highlight ? 'text-warning-text font-medium' : 'text-[#ccc]'
      }`}>{value}</span>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: unknown }) {
  const display = value === null || value === undefined ? '—'
    : typeof value === 'boolean' ? (value ? 'Yes' : 'No')
    : typeof value === 'object' ? JSON.stringify(value)
    : String(value);
  return (
    <div className="flex items-start gap-3 py-1.5 border-b border-[#1a1a1a] last:border-0">
      <span className="text-[11px] text-[#555] w-28 sm:w-44 shrink-0">{label.replace(/_/g, ' ')}</span>
      <span className="text-[11px] text-[#ccc] break-all">{display}</span>
    </div>
  );
}

export default function EvidenceItemDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [item, setItem] = useState<EvidenceItemDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("summary");
  const [verifyResult, setVerifyResult] = useState<any>(null);
  const [verifying, setVerifying] = useState(false);

  const fetchItem = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/evidence-vault/items/${id}`);
      if (res.success) setItem(res.data);
      else setError(res.error || "Not found");
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [id]);

  const handleVerify = async () => {
    setVerifying(true);
    try {
      const res = await api.post(`/api/evidence-vault/items/${id}/verify`, {});
      if (res.success) setVerifyResult(res.data);
    } catch (e: any) { setVerifyResult({ verified: false, error: e.message }); }
    finally { setVerifying(false); }
  };

  useEffect(() => { fetchItem(); }, [fetchItem]);

  // Auto-show Case Details tab for revision cases — must be above early returns
  useEffect(() => {
    if (item?.evidence_type === 'media_revision_request') setActiveTab("case");
  }, [item?.evidence_type]);

  if (loading) return (
    <div className="p-8 flex items-center gap-2 text-[#555]">
      <RefreshCw className="w-4 h-4 animate-spin" /> Loading evidence item…
    </div>
  );
  if (error) return <div className="p-8 text-error-text">{error}</div>;
  if (!item) return <div className="p-8 text-[#555]">Item not found</div>;

  const isRevisionCase = item.evidence_type === 'media_revision_request';
  const meta = item.metadata || {};
  const stateColor = VAULT_STATE_COLOR[item.vault_state] || "text-info-text border-info-border bg-info-bg";
  const SensIcon = SENSITIVITY_ICON[item.sensitivity] || Shield;
  const TABS = buildTabs(isRevisionCase);

  return (
    <div className="px-4 sm:p-6 max-w-7xl mx-auto pb-24">
      {/* Back */}
      <button onClick={() => router.push('/evidence/evidence-vault')}
        className="flex items-center gap-1 text-xs text-[#555] hover:text-[#aaa] mb-5 transition-colors">
        <ChevronLeft className="w-3.5 h-3.5" /> Back to Evidence Vault
      </button>

      {/* Revision Case Banner */}
      {isRevisionCase && (
        <div className="mb-5 flex items-start gap-4 p-4 rounded-2xl border border-orange-500/20 bg-orange-500/5">
          <div className="w-9 h-9 rounded-xl bg-orange-500/15 flex items-center justify-center shrink-0">
            <RotateCcw className="w-4 h-4 text-orange-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-xs font-semibold text-orange-400">Media Revision Evidence Case</span>
              <span className="text-[10px] text-[#555] bg-[#1a1a1a] border border-[#2a2a2a] px-2 py-0.5 rounded-full uppercase tracking-wider">
                org-private · confidential
              </span>
            </div>
            <p className="text-[11px] text-[#888] leading-relaxed">
              {meta.review_item_title && <span className="text-[#ccc] font-medium">&ldquo;{meta.review_item_title}&rdquo;</span>} was returned for revision.
              {meta.return_note && <> Reviewer note: <span className="text-orange-300">&ldquo;{meta.return_note}&rdquo;</span></>}
            </p>
          </div>
          {meta.review_item_id && (
            <button
              onClick={() => router.push(`/review-queue?item=${meta.review_item_id}`)}
              className="flex items-center gap-1.5 text-[11px] text-[#555] hover:text-orange-400 shrink-0 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" /> View Review Item
            </button>
          )}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#161616] border border-[#222] flex items-center justify-center shrink-0">
            <Archive className="w-4 h-4 text-[#666]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base font-semibold text-foreground font-mono">{item.item_id}</h1>
              <Badge label={item.vault_state.replace(/_/g, ' ')} color={stateColor} />
              {item.legal_hold && <Badge label="LEGAL HOLD" color="text-error-text border-error-border bg-error-bg" />}
              {item.sensitivity === 'confidential' && (
                <span className="flex items-center gap-1 text-[10px] text-[#555] bg-[#111] border border-[#222] px-2 py-0.5 rounded-full">
                  <SensIcon className="w-2.5 h-2.5" /> {item.sensitivity}
                </span>
              )}
            </div>
            <p className="text-[11px] text-[#555] mt-0.5">{item.source_system} / {item.source_id}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={fetchItem}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#161616] border border-[#222] text-[11px] text-[#888] rounded-xl hover:bg-[#1e1e1e] transition-all">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
          <button onClick={handleVerify} disabled={verifying}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#161616] border border-[#222] text-[11px] text-[#888] rounded-xl hover:bg-[#1e1e1e] disabled:opacity-40 transition-all">
            <Hash className={`w-3.5 h-3.5 ${verifying ? 'animate-spin' : ''}`} />
            {verifying ? "Verifying…" : "Verify Integrity"}
          </button>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { icon: Activity, label: "Risk Level", value: item.risk_level, color: RISK_COLOR[item.risk_level] || "text-[#ccc]" },
          { icon: SensIcon, label: "Sensitivity", value: item.sensitivity, color: "text-[#ccc]" },
          { icon: FileClock, label: "Retention", value: item.retention_class.replace(/_/g, ' '), color: "text-[#ccc]" },
          { icon: item.legal_hold ? Lock : Key, label: "Legal Hold", value: item.legal_hold ? "Active" : "None", color: item.legal_hold ? "text-error-text" : "text-[#555]" },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Icon className="w-3 h-3 text-[#444]" />
              <span className="text-[10px] text-[#555] uppercase tracking-wider">{label}</span>
            </div>
            <span className={`text-xs font-semibold capitalize ${color}`}>{value}</span>
          </div>
        ))}
      </div>

      {/* Tab Bar */}
      <div className="flex items-center gap-0.5 mb-5 border-b border-[#1a1a1a] overflow-x-auto">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-[11px] border-b-2 whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? "text-warning-text border-warning-border font-medium"
                : "text-[#555] border-transparent hover:text-[#aaa] hover:border-[#333]"
            }`}>
            <tab.icon className="w-3 h-3" /> {tab.label}
            {tab.id === "case" && <span className="w-1.5 h-1.5 rounded-full bg-orange-500 ml-0.5" />}
          </button>
        ))}
      </div>

      {/* ─── Summary Tab ─────────────────────────────────────── */}
      {activeTab === "summary" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Section title="Evidence Details" icon={Archive}>
            <Row label="Item ID" value={item.item_id} mono />
            <Row label="Schema Version" value={item.schema_version} />
            <Row label="Vault State" value={item.vault_state.replace(/_/g, ' ')} />
            <Row label="Evidence Type" value={item.evidence_type?.replace(/_/g, ' ') || '—'} highlight={!!item.evidence_type} />
            <Row label="Risk Level" value={item.risk_level} />
            <Row label="Sensitivity" value={item.sensitivity} />
            <Row label="Contains PII" value={item.contains_pii ? 'Yes' : 'No'} />
            <Row label="Contains AI Output" value={item.contains_ai_output ? 'Yes' : 'No'} />
            <Row label="Jurisdictions" value={item.jurisdictions?.join(', ') || '—'} />
          </Section>
          <Section title="Source Information" icon={Server}>
            <Row label="Source Type" value={item.source_type.replace(/_/g, ' ')} />
            <Row label="Source ID" value={item.source_id} mono />
            <Row label="Source System" value={item.source_system} />
            <Row label="Source Timestamp" value={item.source_timestamp_utc ? fmt(item.source_timestamp_utc) : '—'} />
            <Row label="Captured At" value={fmt(item.captured_at)} />
            <Row label="Tenant" value={item.tenant_id} mono />
            <Row label="Workspace" value={item.workspace_id} mono />
            <Row label="Data Residency" value={item.data_residency} />
          </Section>
          <Section title="Preservation" icon={Shield} className="md:col-span-2">
            <Row label="Preserved By" value={item.preserved_by_actor_id} mono />
            <Row label="Authority" value={item.authority?.replace(/_/g, ' ') || '—'} />
            <Row label="Reason" value={item.preservation_reason} highlight />
            <Row label="Access Policy" value={item.access_policy_id || 'Default vault policy'} />
            <Row label="Created" value={fmt(item.created_at)} />
            <Row label="Last Updated" value={fmt(item.updated_at)} />
          </Section>
          {verifyResult && (
            <Section title="Verification Result" icon={CheckCircle2} className="md:col-span-2">
              <div className={`flex items-center gap-2 mb-3 text-xs font-semibold ${verifyResult.verified ? 'text-success-text' : 'text-error-text'}`}>
                {verifyResult.verified ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                {verifyResult.verified ? 'Integrity Verified — All hashes match' : 'Verification Failed — Hash mismatch detected'}
              </div>
              <Row label="Original Hash Match" value={verifyResult.original_hash_match !== undefined ? (verifyResult.original_hash_match ? '✓ Match' : '✗ Mismatch') : 'N/A'} />
              <Row label="Metadata Hash Match" value={verifyResult.metadata_hash_match !== undefined ? (verifyResult.metadata_hash_match ? '✓ Match' : '✗ Mismatch') : 'N/A'} />
            </Section>
          )}
        </div>
      )}

      {/* ─── Case Details Tab (revision cases only) ─────────── */}
      {activeTab === "case" && isRevisionCase && (
        <div className="space-y-4">
          {/* Hero card */}
          <div className="p-5 rounded-2xl border border-orange-500/20 bg-orange-500/5">
            <div className="flex items-center gap-2 mb-4">
              <RotateCcw className="w-4 h-4 text-orange-400" />
              <span className="text-sm font-semibold text-orange-400">Media Revision Request Case</span>
              <span className="text-[10px] text-[#555] bg-[#1a1a1a] border border-[#2a2a2a] px-2 py-0.5 rounded-full">ORG-PRIVATE</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-[10px] text-[#555] uppercase tracking-wider">Asset Title</p>
                <p className="text-sm font-medium text-[#eee]">{meta.review_item_title || '—'}</p>
              </div>
              <div className="space-y-2">
                <p className="text-[10px] text-[#555] uppercase tracking-wider">Item Type</p>
                <p className="text-sm font-medium text-[#eee] capitalize">{meta.item_type?.replace(/_/g, ' ') || '—'}</p>
              </div>
              <div className="space-y-2">
                <p className="text-[10px] text-[#555] uppercase tracking-wider">Revision Note from Reviewer</p>
                <div className="p-3 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a]">
                  <div className="flex items-start gap-2">
                    <MessageSquare className="w-3.5 h-3.5 text-orange-400 mt-0.5 shrink-0" />
                    <p className="text-xs text-orange-200 leading-relaxed">{meta.return_note || 'No note provided'}</p>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-[10px] text-[#555] uppercase tracking-wider">Revision Reason</p>
                <p className="text-xs text-[#ccc]">{meta.return_reason || '—'}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Section title="Parties" icon={User}>
              <Row label="Review Item ID" value={meta.review_item_id || '—'} mono />
              <Row label="Media Creator (Submitted By)" value={meta.submitted_by || '—'} mono />
              <Row label="Returned By (Reviewer)" value={meta.returned_by || '—'} mono />
              <Row label="Risk Level" value={meta.risk_level || item.risk_level} />
            </Section>
            <Section title="Media Content Snapshot" icon={ImageIcon}>
              {meta.content_snapshot ? (
                <>
                  {(meta.content_snapshot.urls || []).slice(0, 3).map((url: string, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-[11px]">
                      <Link2 className="w-3 h-3 text-[#444] shrink-0" />
                      <a href={url} target="_blank" rel="noreferrer"
                        className="text-info-text truncate hover:underline max-w-xs"
                        title={url}>{url}</a>
                    </div>
                  ))}
                  {meta.content_snapshot.copy && (
                    <Row label="Ad Copy" value={meta.content_snapshot.copy} />
                  )}
                  {meta.content_snapshot.file_type && (
                    <Row label="File Type" value={meta.content_snapshot.file_type} />
                  )}
                </>
              ) : (
                <p className="text-[11px] text-[#555]">No content snapshot available</p>
              )}
            </Section>

            <Section title="Timeline" icon={Calendar} className="md:col-span-2">
              <Row label="Returned At" value={item.source_timestamp_utc ? fmt(item.source_timestamp_utc) : fmt(item.captured_at)} />
              <Row label="Evidence Preserved At" value={fmt(item.captured_at)} />
              <Row label="Retention Until" value={item.retention_until ? fmt(item.retention_until) : 'Extended (7 years)'} />
              <Row label="Legal Hold Review Date" value="30 days from preservation (auto-set)" />
              <Row label="Vault State" value={item.vault_state.replace(/_/g, ' ')} highlight />
              <Row label="Legal Hold Active" value={item.legal_hold ? 'Yes — cannot be deleted' : 'No'} />
            </Section>

            <Section title="Governance Classification" icon={Shield} className="md:col-span-2">
              <Row label="Evidence Type" value="media_revision_request" highlight />
              <Row label="Sensitivity" value={item.sensitivity} highlight />
              <Row label="Jurisdiction" value={item.jurisdictions?.join(', ') || 'internal'} />
              <Row label="Authority" value={item.authority?.replace(/_/g, ' ') || '—'} />
              <Row label="Preservation Reason" value={item.preservation_reason} />
              <Row label="Retention Class" value={item.retention_class.replace(/_/g, ' ')} />
              <Row label="Contains PII" value={item.contains_pii ? 'Yes' : 'No'} />
              <Row label="Contains AI Output" value={item.contains_ai_output ? 'Yes' : 'No'} />
            </Section>
          </div>

          {/* Navigate to review item */}
          {meta.review_item_id && (
            <div className="flex items-center gap-3 p-4 rounded-xl border border-[#1e1e1e] bg-[#0d0d0d]">
              <Info className="w-4 h-4 text-[#444] shrink-0" />
              <p className="text-[11px] text-[#555] flex-1">This evidence case is linked to review item <span className="text-[#aaa] font-mono">{meta.review_item_id}</span></p>
              <button
                onClick={() => router.push(`/review-queue?item=${meta.review_item_id}`)}
                className="flex items-center gap-1.5 text-[11px] text-info-text hover:underline"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Open Review Item
              </button>
            </div>
          )}
        </div>
      )}

      {/* ─── Integrity Tab ──────────────────────────────────── */}
      {activeTab === "integrity" && (
        <div className="space-y-4">
          <Section title="Hash Values" icon={Hash}>
            <Row label="Algorithm" value={item.hash_algorithm} />
            <Row label="Original Content Hash" value={item.original_content_hash || '—'} mono />
            <Row label="Normalized Content Hash" value={item.normalized_content_hash || '—'} mono />
            <Row label="Metadata Hash" value={item.metadata_hash || '—'} mono />
            <Row label="Preservation Receipt Hash" value={item.preservation_receipt_hash || '—'} mono />
            <Row label="Payload Ref" value={item.payload_ref || '—'} mono />
          </Section>
          <Section title="Verification History" icon={Activity}>
            <Row label="Verification Count" value={String(item.verification_count)} />
            <Row label="Last Verified At" value={item.last_verified_at ? fmt(item.last_verified_at) : 'Never'} />
            <Row label="Last Verified By" value={item.last_verified_by || '—'} mono />
          </Section>
          {verifyResult && (
            <Section title="Last Verify Result" icon={CheckCircle2}>
              <div className={`flex items-center gap-2 mb-2 text-xs font-semibold ${verifyResult.verified ? 'text-success-text' : 'text-error-text'}`}>
                {verifyResult.verified ? '✓ Integrity Verified' : '✗ Verification Failed'}
              </div>
              <Row label="Original Hash Match" value={verifyResult.original_hash_match !== undefined ? (verifyResult.original_hash_match ? '✓ Match' : '✗ Mismatch') : 'N/A'} />
              <Row label="Metadata Hash Match" value={verifyResult.metadata_hash_match !== undefined ? (verifyResult.metadata_hash_match ? '✓ Match' : '✗ Mismatch') : 'N/A'} />
            </Section>
          )}
          <div className="p-4 rounded-xl border border-[#1e1e1e] bg-[#0d0d0d]">
            <p className="text-[11px] text-[#555]">Hash mismatch blocks export and sharing. Run Verify Integrity to confirm current state.</p>
          </div>
        </div>
      )}

      {/* ─── Custody Tab ───────────────────────────────────── */}
      {activeTab === "custody" && (
        <div className="space-y-4">
          <Section title="Custody Chain" icon={Shield}>
            <Row label="Preserved By" value={item.preserved_by_actor_id} mono />
            <Row label="Authority" value={item.authority?.replace(/_/g, ' ') || 'Standard preservation'} />
            <Row label="Preservation Reason" value={item.preservation_reason} highlight />
            <Row label="Origin IP Hash" value={item.origin_ip_hash || 'Not recorded'} mono />
          </Section>
          <Section title="Payload" icon={HardDrive}>
            <Row label="Payload Size" value={item.payload_size ? `${item.payload_size.toLocaleString()} bytes` : 'No payload'} />
            <Row label="MIME Type" value={item.mime_type || '—'} />
            <Row label="Payload Ref" value={item.payload_ref || '—'} mono />
          </Section>
          <Section title="Access History" icon={Eye}>
            <Row label="Verifications Performed" value={String(item.verification_count)} />
            <Row label="Active Legal Holds" value={String(item.hold_ids?.length || 0)} />
          </Section>
        </div>
      )}

      {/* ─── Contents Tab ──────────────────────────────────── */}
      {activeTab === "contents" && (
        <div className="space-y-4">
          <Section title="Source References" icon={Server}>
            <Row label="Source Type" value={item.source_type.replace(/_/g, ' ')} />
            <Row label="Source ID" value={item.source_id} mono />
            <Row label="Source System" value={item.source_system} />
            <Row label="Source Timestamp" value={item.source_timestamp_utc ? fmt(item.source_timestamp_utc) : '—'} />
          </Section>
          <Section title="Classification" icon={BarChart3}>
            <Row label="Evidence Type" value={item.evidence_type?.replace(/_/g, ' ') || 'Not classified'} highlight={!!item.evidence_type} />
            <Row label="Risk Level" value={item.risk_level} />
            <Row label="Sensitivity" value={item.sensitivity} />
            <Row label="PII Present" value={item.contains_pii ? 'Yes' : 'No'} />
            <Row label="AI Generated" value={item.contains_ai_output ? 'Yes' : 'No'} />
            <Row label="Jurisdictions" value={item.jurisdictions?.join(', ') || 'None specified'} />
          </Section>

          {/* Rich metadata rendering */}
          {item.metadata && Object.keys(item.metadata).length > 0 && (
            <Section title="Metadata Fields" icon={Database}>
              {Object.entries(item.metadata).map(([key, val]) => (
                <MetaRow key={key} label={key} value={val} />
              ))}
            </Section>
          )}
        </div>
      )}

      {/* ─── Redaction Tab ─────────────────────────────────── */}
      {activeTab === "redaction" && (
        <div className="space-y-4">
          <Section title="Redaction Status" icon={FileWarning}>
            <Row label="Access Policy" value={item.access_policy_id || 'Default vault policy'} />
            <Row label="Sensitivity Level" value={item.sensitivity} highlight />
            <Row label="Contains PII" value={item.contains_pii ? 'Yes — redaction recommended for external sharing' : 'No'} />
            <Row label="Contains AI Output" value={item.contains_ai_output ? 'Yes — AI governance redaction may apply' : 'No'} />
          </Section>
          <div className="p-4 rounded-xl border border-[#1e1e1e] bg-[#0d0d0d]">
            <p className="text-[11px] text-[#555]">Server-side redaction is applied during export. Raw values are never sent to unauthorized recipients. Apply a redaction policy before external sharing.</p>
          </div>
        </div>
      )}

      {/* ─── Retention & Holds Tab ─────────────────────────── */}
      {activeTab === "retention" && (
        <div className="space-y-4">
          <Section title="Retention Schedule" icon={Calendar}>
            <Row label="Retention Class" value={item.retention_class.replace(/_/g, ' ')} highlight />
            <Row label="Retention Until" value={item.retention_until ? fmt(item.retention_until) : 'Indefinite (legal hold or custom)'} />
            <Row label="Legal Hold Active" value={item.legal_hold ? 'Yes — item cannot be deleted or expired' : 'No'} />
          </Section>
          <Section title="Active Holds" icon={Lock}>
            {item.hold_ids && item.hold_ids.length > 0 ? (
              <div className="space-y-1.5">
                {item.hold_ids.map((hid, i) => (
                  <div key={i} className="flex items-center gap-2 text-[11px] text-error-text font-mono bg-error-bg border border-error-border rounded-lg px-3 py-1.5">
                    <Lock className="w-3 h-3 shrink-0" /> {hid}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-[#555]">No active legal holds on this item.</p>
            )}
          </Section>
        </div>
      )}

      {/* ─── Exports & Shares Tab ──────────────────────────── */}
      {activeTab === "exports" && (
        <div className="space-y-4">
          <Section title="Export Information" icon={Download}>
            <Row label="Payload Exportable" value={item.payload_ref ? 'Yes — payload captured' : 'No payload to export'} />
            <Row label="Integrity Verified" value={item.verification_count > 0 ? `Yes (${item.verification_count}× verified)` : 'Not yet verified — run Verify Integrity first'} />
            <Row label="Sensitivity Gate" value={item.sensitivity === 'confidential' || item.sensitivity === 'legal_privileged' ? 'Restricted — internal only' : 'Standard policy applies'} />
          </Section>
          <div className="p-4 rounded-xl border border-[#1e1e1e] bg-[#0d0d0d] space-y-2">
            <p className="text-[11px] text-[#555]">Export workflow: add item to a collection → create a sealed package → generate an export. External shares are managed from the package detail view and require a redaction policy for confidential items.</p>
            <p className="text-[11px] text-orange-500/70">This item is marked <strong className="text-orange-400">confidential</strong> and is org-private. Sharing with external parties requires an approved redaction policy.</p>
          </div>
        </div>
      )}
    </div>
  );
}
