"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import {
  Archive, Shield, AlertTriangle, CheckCircle2, Clock, Plus, Search, Filter,
  X, ChevronLeft, Hash, FileText, Gavel, Eye, RefreshCw, Lock, Unlock,
  BarChart3, HardDrive, Activity, User, Calendar, Server, Globe, Key,
  FileWarning, FileCheck, FileClock, Link2, Download,
} from "lucide-react";

type TabId = "summary" | "integrity" | "custody" | "contents" | "redaction" | "retention" | "exports";

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "summary", label: "Summary", icon: FileText },
  { id: "integrity", label: "Integrity", icon: Hash },
  { id: "custody", label: "Custody", icon: Shield },
  { id: "contents", label: "Contents", icon: FileCheck },
  { id: "redaction", label: "Redaction", icon: FileWarning },
  { id: "retention", label: "Retention & Holds", icon: Lock },
  { id: "exports", label: "Exports & Shares", icon: Download },
];

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
  catch { return ts; }
}

function Badge({ label, color }: { label: string; color: string }) {
  return <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] border ${color}`}>{label}</span>;
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

  if (loading) return <div className="p-8 text-[#888]">Loading item...</div>;
  if (error) return <div className="p-8 text-red-400">{error}</div>;
  if (!item) return <div className="p-8 text-[#888]">Item not found</div>;

  const statusColor = item.vault_state === 'preserved' ? 'text-green-400 border-green-400/30 bg-green-400/10' :
    item.vault_state === 'legal_hold' ? 'text-red-400 border-red-400/30 bg-red-400/10' :
    item.vault_state === 'quarantined' ? 'text-amber-400 border-amber-400/30 bg-amber-400/10' :
    item.vault_state === 'failed' ? 'text-red-500 border-red-500/30 bg-red-500/10' :
    'text-slate-400 border-slate-400/30 bg-slate-400/10';

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Back + Header */}
      <button onClick={() => router.push('/evidence/evidence-vault')} className="flex items-center gap-1 text-xs text-[#888] hover:text-white mb-4">
        <ChevronLeft className="w-3.5 h-3.5" /> Back to Vault
      </button>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Archive className="w-5 h-5 text-[#888]" />
          <div>
            <h1 className="text-lg font-semibold text-white font-mono">{item.item_id}</h1>
            <p className="text-xs text-[#888]">{item.source_system}:{item.source_id}</p>
          </div>
          <Badge label={item.vault_state.replace(/_/g, ' ')} color={statusColor} />
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleVerify} disabled={verifying}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#222] text-xs text-[#aaa] rounded-lg hover:bg-[#333] disabled:opacity-50">
            <RefreshCw className={`w-3.5 h-3.5 ${verifying ? 'animate-spin' : ''}`} /> {verifying ? "Verifying..." : "Verify Integrity"}
          </button>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex items-center gap-1 mb-4 border-b border-[#222] overflow-x-auto">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs border-b-2 whitespace-nowrap transition-colors ${
              activeTab === tab.id ? "text-amber-400 border-amber-400" : "text-[#666] border-transparent hover:text-white hover:border-[#444]"
            }`}>
            <tab.icon className="w-3 h-3" /> {tab.label}
          </button>
        ))}
      </div>

      {/* ─── Summary Tab ───────────────────────────────────── */}
      {activeTab === "summary" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Section title="Evidence Details">
            <Row label="Item ID" value={item.item_id} mono />
            <Row label="Schema Version" value={item.schema_version} />
            <Row label="Vault State" value={item.vault_state} />
            <Row label="Evidence Type" value={item.evidence_type || '—'} />
            <Row label="Risk Level" value={item.risk_level} />
            <Row label="Sensitivity" value={item.sensitivity} />
            <Row label="Contains PII" value={item.contains_pii ? 'Yes' : 'No'} />
            <Row label="Contains AI Output" value={item.contains_ai_output ? 'Yes' : 'No'} />
            <Row label="Jurisdictions" value={item.jurisdictions?.join(', ') || '—'} />
          </Section>
          <Section title="Source Information">
            <Row label="Source Type" value={item.source_type} />
            <Row label="Source ID" value={item.source_id} mono />
            <Row label="Source System" value={item.source_system} />
            <Row label="Source Timestamp" value={item.source_timestamp_utc ? fmt(item.source_timestamp_utc) : '—'} />
            <Row label="Captured At" value={fmt(item.captured_at)} />
            <Row label="Tenant" value={item.tenant_id} mono />
            <Row label="Workspace" value={item.workspace_id} mono />
            <Row label="Data Residency" value={item.data_residency} />
          </Section>
          <Section title="Preservation" className="md:col-span-2">
            <Row label="Preserved By" value={item.preserved_by_actor_id} mono />
            <Row label="Authority" value={item.authority || '—'} />
            <Row label="Reason" value={item.preservation_reason} />
            <Row label="Access Policy" value={item.access_policy_id || '—'} />
            <Row label="Created" value={fmt(item.created_at)} />
            <Row label="Last Updated" value={fmt(item.updated_at)} />
          </Section>
          {verifyResult && (
            <Section title="Verification Result" className="md:col-span-2">
              <div className={`text-xs ${verifyResult.verified ? 'text-green-400' : 'text-red-400'} mb-2`}>
                {verifyResult.verified ? '✓ Integrity Verified' : '✗ Verification Failed'}
              </div>
              <Row label="Original Hash Match" value={verifyResult.original_hash_match !== undefined ? (verifyResult.original_hash_match ? '✓ Match' : '✗ Mismatch') : 'N/A'} />
              <Row label="Metadata Hash Match" value={verifyResult.metadata_hash_match !== undefined ? (verifyResult.metadata_hash_match ? '✓ Match' : '✗ Mismatch') : 'N/A'} />
            </Section>
          )}
        </div>
      )}

      {/* ─── Integrity Tab ──────────────────────────────────── */}
      {activeTab === "integrity" && (
        <div className="space-y-4">
          <Section title="Hash Values">
            <Row label="Algorithm" value={item.hash_algorithm} />
            <Row label="Original Content Hash" value={item.original_content_hash || '—'} mono />
            <Row label="Normalized Content Hash" value={item.normalized_content_hash || '—'} mono />
            <Row label="Metadata Hash" value={item.metadata_hash || '—'} mono />
            <Row label="Preservation Receipt Hash" value={item.preservation_receipt_hash || '—'} mono />
            <Row label="Payload Ref" value={item.payload_ref || '—'} mono />
          </Section>
          <Section title="Verification History">
            <Row label="Verification Count" value={String(item.verification_count)} />
            <Row label="Last Verified At" value={item.last_verified_at ? fmt(item.last_verified_at) : 'Never'} />
            <Row label="Last Verified By" value={item.last_verified_by || '—'} mono />
          </Section>
          <div className="bg-[#111] border border-[#222] rounded-xl p-4">
            <p className="text-xs text-[#555]">Hash mismatch blocks export and sharing. Run Verify Integrity to confirm current state.</p>
          </div>
        </div>
      )}

      {/* ─── Custody Tab ────────────────────────────────────── */}
      {activeTab === "custody" && (
        <div className="space-y-4">
          <Section title="Custody Chain">
            <Row label="Preserved By" value={item.preserved_by_actor_id} mono />
            <Row label="Authority" value={item.authority || 'Standard preservation permission'} />
            <Row label="Preservation Reason" value={item.preservation_reason} />
            <Row label="Origin IP Hash" value={item.origin_ip_hash || 'Not recorded'} mono />
          </Section>
          <Section title="Payload">
            <Row label="Payload Size" value={item.payload_size ? `${item.payload_size} bytes` : 'No payload'} />
            <Row label="MIME Type" value={item.mime_type || '—'} />
            <Row label="Payload Ref" value={item.payload_ref || '—'} mono />
          </Section>
          <Section title="Access History">
            <Row label="Verifications Performed" value={String(item.verification_count)} />
            <Row label="Legal Hold Events" value={String(item.hold_ids?.length || 0)} />
          </Section>
        </div>
      )}

      {/* ─── Contents Tab ───────────────────────────────────── */}
      {activeTab === "contents" && (
        <div className="space-y-4">
          <Section title="Source References">
            <Row label="Source Type" value={item.source_type} />
            <Row label="Source ID" value={item.source_id} mono />
            <Row label="Source System" value={item.source_system} />
            <Row label="Source Timestamp" value={item.source_timestamp_utc ? fmt(item.source_timestamp_utc) : '—'} />
          </Section>
          <Section title="Classification">
            <Row label="Evidence Type" value={item.evidence_type || 'Not classified'} />
            <Row label="Risk Level" value={item.risk_level} />
            <Row label="Sensitivity" value={item.sensitivity} />
            <Row label="PII Present" value={item.contains_pii ? 'Yes' : 'No'} />
            <Row label="AI Generated" value={item.contains_ai_output ? 'Yes' : 'No'} />
            <Row label="Jurisdictions" value={item.jurisdictions?.join(', ') || 'None specified'} />
          </Section>
          <Section title="Metadata">
            <div className="text-xs text-[#aaa] font-mono whitespace-pre-wrap max-h-48 overflow-y-auto">
              {JSON.stringify(item.metadata, null, 2) || '{ }'}
            </div>
          </Section>
        </div>
      )}

      {/* ─── Redaction Tab ──────────────────────────────────── */}
      {activeTab === "redaction" && (
        <div className="space-y-4">
          <Section title="Redaction Status">
            <Row label="Access Policy" value={item.access_policy_id || 'Default vault policy'} />
            <Row label="Sensitivity Level" value={item.sensitivity} />
            <Row label="Contains PII" value={item.contains_pii ? 'Yes — redaction recommended for external sharing' : 'No'} />
            <Row label="Contains AI Output" value={item.contains_ai_output ? 'Yes — AI governance redaction may apply' : 'No'} />
          </Section>
          <div className="bg-[#111] border border-[#222] rounded-xl p-4">
            <p className="text-xs text-[#555]">Server-side redaction is applied during export. Raw values are never sent to unauthorized recipients. Apply a redaction policy before external sharing.</p>
          </div>
        </div>
      )}

      {/* ─── Retention & Holds Tab ──────────────────────────── */}
      {activeTab === "retention" && (
        <div className="space-y-4">
          <Section title="Retention">
            <Row label="Retention Class" value={item.retention_class} />
            <Row label="Retention Until" value={item.retention_until ? fmt(item.retention_until) : 'Indefinite'} />
            <Row label="Legal Hold Active" value={item.legal_hold ? 'Yes — item cannot be deleted or expired' : 'No'} />
          </Section>
          <Section title="Active Holds">
            {item.hold_ids && item.hold_ids.length > 0 ? (
              <div className="space-y-1">
                {item.hold_ids.map((hid, i) => (
                  <div key={i} className="text-xs text-red-400 font-mono bg-red-400/5 rounded px-2 py-1">HLD: {hid}</div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#555]">No active legal holds on this item.</p>
            )}
          </Section>
        </div>
      )}

      {/* ─── Exports & Shares Tab ───────────────────────────── */}
      {activeTab === "exports" && (
        <div className="space-y-4">
          <Section title="Export Information">
            <Row label="Payload Exportable" value={item.payload_ref ? 'Yes' : 'No payload to export'} />
            <Row label="Verification Required" value={item.verification_count > 0 ? 'Verified' : 'Not yet verified'} />
          </Section>
          <div className="bg-[#111] border border-[#222] rounded-xl p-4">
            <p className="text-xs text-[#555]">To export this item, add it to a collection, create a sealed package, then generate an export. External shares are managed from the package detail view.</p>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-[#111] border border-[#222] rounded-xl p-4 ${className || ''}`}>
      <h3 className="text-xs font-semibold text-[#888] mb-3 uppercase tracking-wider">{title}</h3>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-xs text-[#666] w-40 shrink-0">{label}</span>
      <span className={`text-xs text-[#ccc] ${mono ? 'font-mono text-[11px]' : ''} break-all`}>{value}</span>
    </div>
  );
}
