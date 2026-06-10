"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import ConfirmActionModal from "@/components/ConfirmActionModal";
import {
  ArrowLeft, Clock, AlertTriangle, CheckCircle2, Shield, Lock, Download,
  Hash, Link2, Activity, Eye, EyeOff, FileSearch, User, Bot, Server, Key,
  Copy, ExternalLink, Archive, Info, Share2, ChevronRight, ShieldAlert,
  Globe, Gavel, Fingerprint, FileText, History,
} from "lucide-react";

interface AuditEvent {
  id: string;
  event_id: string;
  workspace_id: string;
  chain_id: string;
  block_number: number;
  hash: string;
  prev_hash: string | null;
  event_category: string;
  event_type: string;
  event_title: string;
  event_summary: string;
  timestamp_utc: string;
  received_at: string;
  actor: Record<string, string>;
  object: Record<string, string>;
  related_objects?: Array<{ type: string; id: string }>;
  correlation?: Record<string, string>;
  authority?: Record<string, unknown>;
  change?: Record<string, unknown>;
  ai_context?: Record<string, unknown>;
  risk_level: string;
  status: string;
  evidence_state: string;
  retention_class: string;
  retention_until: string | null;
  sealed_at: string | null;
  sealed_by: string | null;
  schema_version: string;
  data_residency?: string;
  created_at: string;
}

type TabId = "overview" | "timeline" | "diff" | "authority" | "integrity" | "evidence" | "access-log";

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "overview", label: "Overview", icon: Info },
  { id: "timeline", label: "Timeline", icon: Activity },
  { id: "diff", label: "Diff", icon: Eye },
  { id: "authority", label: "Authority", icon: Shield },
  { id: "integrity", label: "Integrity", icon: Hash },
  { id: "evidence", label: "Evidence", icon: Lock },
  { id: "access-log", label: "Access Log", icon: EyeOff },
];

const riskCfg: Record<string, string> = {
  low: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  medium: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  high: "text-orange-400 bg-orange-400/10 border-orange-400/20",
  critical: "text-red-400 bg-red-400/10 border-red-400/20",
};

const statusIcon: Record<string, React.ElementType> = {
  success: CheckCircle2, failed: AlertTriangle, blocked: Shield,
  pending: Clock, overridden: AlertTriangle, preserved: Lock, sealed: Archive,
};

const statusColor: Record<string, string> = {
  success: "text-emerald-400", failed: "text-red-400", blocked: "text-orange-400",
  pending: "text-amber-400", overridden: "text-purple-400", preserved: "text-blue-400", sealed: "text-[#666]",
};

function fmt(ts: string) {
  return new Date(ts).toLocaleString("en-US", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).replace(/,/g, "");
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text);
}

export default function FullEventPage() {
  const params = useParams();
  const router = useRouter();
  const [event, setEvent] = useState<AuditEvent | null>(null);
  const [related, setRelated] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  useEffect(() => {
    async function load() {
      try {
        const [eventRes, relRes] = await Promise.all([
          api.get(`/api/audit-events/${params.id}`),
          api.get(`/api/audit-events/${params.id}/related`),
        ]);
        if (eventRes.success) setEvent(eventRes.data);
        if (relRes.success) setRelated(relRes.data.related || []);
      } catch (err: any) {
        setError(err?.message || "Failed to load event");
      } finally {
        setLoading(false);
      }
    }
    if (params.id) load();
  }, [params.id]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-[#222] rounded w-1/3" />
          <div className="h-4 bg-[#222] rounded w-1/2" />
          <div className="h-64 bg-[#222] rounded" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="bg-[#111] border border-[#222] rounded-xl p-12 text-center">
          <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-red-400" />
          <h2 className="text-lg font-medium text-foreground mb-1">Failed to Load Event</h2>
          <p className="text-sm text-[#888] mb-4">{error}</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => router.back()} className="text-amber-500 hover:text-amber-400 text-sm flex items-center gap-1 mx-auto">
              <ArrowLeft className="w-4 h-4" /> Back to Audit Trail
            </button>
            <button onClick={() => { setError(null); setLoading(true); window.location.reload(); }} className="text-amber-500 hover:text-amber-400 text-sm flex items-center gap-1 mx-auto">
              <ArrowLeft className="w-4 h-4" /> Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="bg-[#111] border border-[#222] rounded-xl p-12 text-center">
          <FileSearch className="w-12 h-12 mx-auto mb-3 text-[#444]" />
          <h2 className="text-lg font-medium text-foreground mb-1">Event Not Found</h2>
          <p className="text-sm text-[#888] mb-4">This event may not exist or you may not have permission to view it.</p>
          <button onClick={() => router.back()} className="text-amber-500 hover:text-amber-400 text-sm flex items-center gap-1 mx-auto">
            <ArrowLeft className="w-4 h-4" /> Back to Audit Trail
          </button>
        </div>
      </div>
    );
  }

  const StatusIcon = statusIcon[event.status] || CheckCircle2;
  const sc = statusColor[event.status] || "text-[#888]";
  const rc = riskCfg[event.risk_level] || riskCfg.low;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Back link */}
      <button onClick={() => router.back()} className="text-[#888] hover:text-white text-sm flex items-center gap-1 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Audit Trail
      </button>

      {/* Header */}
      <div className="bg-[#111] border border-[#222] rounded-xl p-6 mb-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h1 className="text-xl font-bold text-foreground">{event.event_title || event.event_type}</h1>
            <p className="text-sm text-[#888] mt-1">{event.event_summary}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 rounded text-xs font-medium border ${rc}`}>
              {event.risk_level.toUpperCase()}
            </span>
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium ${sc}`}>
              <StatusIcon className="w-3.5 h-3.5" />
              {event.status}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-4 text-xs text-[#666]">
          <div className="flex items-center gap-1.5">
            <Hash className="w-3.5 h-3.5" />
            {event.event_id}
            <button onClick={() => copyToClipboard(event.event_id)}><Copy className="w-3 h-3 hover:text-white" /></button>
          </div>
          <div>Block #{event.block_number}</div>
          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> {fmt(event.timestamp_utc)}
          </div>
          <div>{event.event_type}</div>
          <div>{event.event_category.replace("_", " ")}</div>
          {event.data_residency && event.data_residency !== "auto" && (
            <div className="flex items-center gap-1 text-blue-400">
              <Globe className="w-3 h-3" /> {event.data_residency}
            </div>
          )}
          {["security.alert", "security.incident", "chain.integrity_failure", "policy.override", "approval.emergency_used", "user.permission_elevated", "user.role_changed"].includes(event.event_type) && (
            <div className="flex items-center gap-1 text-red-400">
              <ShieldAlert className="w-3 h-3" /> Sensitive
            </div>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-[#222] mb-4 overflow-x-auto">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? "text-amber-400 border-amber-400"
                  : "text-[#666] border-transparent hover:text-white hover:border-[#444]"
              }`}
            >
              <Icon className="w-4 h-4" /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && <OverviewTab event={event} />}
      {activeTab === "timeline" && <TimelineTab event={event} related={related} />}
      {activeTab === "diff" && <DiffTab event={event} />}
      {activeTab === "authority" && <AuthorityTab event={event} />}
      {activeTab === "integrity" && <IntegrityTab event={event} />}
      {activeTab === "evidence" && <EvidenceTab event={event} />}
      {activeTab === "access-log" && <AccessLogTab event={event} />}
    </div>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({ event }: { event: AuditEvent }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="bg-[#111] border border-[#222] rounded-xl p-5">
        <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
          <User className="w-4 h-4 text-amber-500" /> Actor
        </h3>
        <div className="space-y-2 text-sm">
          <Row label="Name" value={event.actor?.actor_name || "-"} />
          <Row label="Type" value={event.actor?.actor_type || "-"} />
          <Row label="Role at Event" value={event.actor?.role_at_event || "-"} />
          <Row label="ID" value={event.actor?.actor_id || "-"} monospace />
        </div>
      </div>
      <div className="bg-[#111] border border-[#222] rounded-xl p-5">
        <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
          <ExternalLink className="w-4 h-4 text-amber-500" /> Object
        </h3>
        <div className="space-y-2 text-sm">
          <Row label="Type" value={event.object?.object_type || "-"} />
          <Row label="ID" value={event.object?.object_id || "-"} monospace />
          <Row label="Name" value={event.object?.object_name || "-"} />
        </div>
      </div>
      <div className="bg-[#111] border border-[#222] rounded-xl p-5">
        <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
          <Shield className="w-4 h-4 text-amber-500" /> Authority
        </h3>
        <div className="space-y-2 text-sm">
          <Row label="Permission Used" value={String(event.authority?.permission_used || "-")} />
          <Row label="Policy Rule" value={String(event.authority?.policy_rule_id || "-")} />
          <Row label="Override Reason" value={String(event.authority?.override_reason || "-")} />
        </div>
      </div>
      <div className="bg-[#111] border border-[#222] rounded-xl p-5">
        <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
          <Hash className="w-4 h-4 text-amber-500" /> Chain
        </h3>
        <div className="space-y-2 text-sm">
          <Row label="Hash" value={event.hash || "-"} monospace small />
          <Row label="Previous" value={event.prev_hash || "Genesis"} monospace small />
          <Row label="Block" value={`#${event.block_number}`} />
          <Row label="Chain" value={event.chain_id} />
        </div>
      </div>
    </div>
  );
}

// ─── Timeline Tab ──────────────────────────────────────────────────────────────

function TimelineTab({ event, related }: { event: AuditEvent; related: AuditEvent[] }) {
  const allEvents = [event, ...related].sort(
    (a, b) => new Date(a.timestamp_utc).getTime() - new Date(b.timestamp_utc).getTime()
  );

  return (
    <div className="bg-[#111] border border-[#222] rounded-xl p-5">
      <h3 className="text-sm font-medium text-foreground mb-4">Event Timeline ({allEvents.length} events)</h3>
      {allEvents.length === 0 ? (
        <p className="text-sm text-[#888]">No related events found.</p>
      ) : (
        <div className="space-y-0">
          {allEvents.map((evt, i) => {
            const isTarget = evt.id === event.id;
            return (
              <div key={evt.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className={`w-3 h-3 rounded-full ${isTarget ? "bg-amber-500" : "bg-[#444]"}`} />
                  {i < allEvents.length - 1 && <div className="w-px flex-1 bg-[#333]" />}
                </div>
                <div className={`pb-4 flex-1 ${isTarget ? "bg-amber-500/5 -mx-3 px-3 rounded" : ""}`}>
                  <div className="text-xs text-[#888]">{fmt(evt.timestamp_utc)}</div>
                  <div className="text-sm text-foreground font-medium">{evt.event_title || evt.event_type}</div>
                  <div className="text-xs text-[#666]">{evt.event_type} · {evt.actor?.actor_name || evt.actor?.actor_type}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Diff Tab ──────────────────────────────────────────────────────────────────

function DiffTab({ event }: { event: AuditEvent }) {
  const change = event.change;
  if (!change || Object.keys(change).length === 0) {
    return (
      <div className="bg-[#111] border border-[#222] rounded-xl p-8 text-center">
        <Eye className="w-8 h-8 mx-auto mb-2 text-[#444]" />
        <p className="text-sm text-[#888]">No change data available for this event.</p>
      </div>
    );
  }

  return (
    <div className="bg-[#111] border border-[#222] rounded-xl p-5">
      <h3 className="text-sm font-medium text-foreground mb-4">Field Changes</h3>
      <div className="space-y-3">
        {change.field_changed ? (
          <div className="border border-[#222] rounded-lg p-3">
            <div className="text-xs text-[#888] uppercase tracking-wider mb-2">Field Changed</div>
            <div className="text-sm text-foreground font-mono">{String(change.field_changed)}</div>
          </div>
        ) : null}
        {change.previous_value !== undefined ? (
          <div className="border border-red-500/20 bg-red-500/5 rounded-lg p-3">
            <div className="text-xs text-red-400 uppercase tracking-wider mb-2">Previous Value</div>
            <div className="text-sm text-red-300 font-mono whitespace-pre-wrap">
              {typeof change.previous_value === "object" ? JSON.stringify(change.previous_value, null, 2) : String(change.previous_value as string)}
            </div>
          </div>
        ) : null}
        {change.new_value !== undefined ? (
          <div className="border border-emerald-500/20 bg-emerald-500/5 rounded-lg p-3">
            <div className="text-xs text-emerald-400 uppercase tracking-wider mb-2">New Value</div>
            <div className="text-sm text-emerald-300 font-mono whitespace-pre-wrap">
              {typeof change.new_value === "object" ? JSON.stringify(change.new_value, null, 2) : String(change.new_value as string)}
            </div>
          </div>
        ) : null}
        {change.change_reason ? (
          <div className="border border-[#222] rounded-lg p-3">
            <div className="text-xs text-[#888] uppercase tracking-wider mb-2">Change Reason</div>
            <div className="text-sm text-[#ccc]">{String(change.change_reason)}</div>
          </div>
        ) : null}
      </div>

      {/* Raw JSON */}
      <details className="mt-4">
        <summary className="text-xs text-[#666] cursor-pointer hover:text-[#888]">Raw event JSON</summary>
        <pre className="mt-2 p-3 bg-[#0a0a0a] border border-[#222] rounded-lg text-xs text-[#888] font-mono overflow-auto max-h-64">
          {JSON.stringify(event, null, 2)}
        </pre>
      </details>
    </div>
  );
}

// ─── Authority Tab ─────────────────────────────────────────────────────────────

function AuthorityTab({ event }: { event: AuditEvent }) {
  const auth = event.authority;
  return (
    <div className="bg-[#111] border border-[#222] rounded-xl p-5">
      <h3 className="text-sm font-medium text-foreground mb-4">Permission & Policy Context</h3>
      {!auth || Object.keys(auth).length === 0 ? (
        <p className="text-sm text-[#888]">No authority data for this event.</p>
      ) : (
        <div className="space-y-3">
          {auth.permission_used ? <Row label="Permission Used" value={String(auth.permission_used)} /> : null}
          {auth.policy_rule_id ? <Row label="Policy Rule ID" value={String(auth.policy_rule_id)} /> : null}
          {auth.approval_required !== undefined ? (
            <Row label="Approval Required" value={String(auth.approval_required)} />
          ) : null}
          {auth.override_reason ? (
            <div className="border border-orange-500/20 bg-orange-500/5 rounded-lg p-3">
              <div className="text-xs text-orange-400 uppercase tracking-wider mb-1">Override Reason</div>
              <div className="text-sm text-orange-300">{String(auth.override_reason)}</div>
            </div>
          ) : null}
          {auth.override_authority ? <Row label="Override Authority" value={String(auth.override_authority)} /> : null}
        </div>
      )}
    </div>
  );
}

// ─── Integrity Tab ─────────────────────────────────────────────────────────────

function IntegrityTab({ event }: { event: AuditEvent }) {
  const [verified, setVerified] = useState<boolean | null>(null);
  const [verifying, setVerifying] = useState(false);

  const handleVerify = async () => {
    setVerifying(true);
    try {
      const res = await api.get(`/api/audit-events/chain/verify?start_block=${event.block_number}&end_block=${event.block_number}`);
      if (res.success) {
        const block = res.data.results?.[0];
        setVerified(block?.chain_verified === true);
      }
    } catch (e: any) {
      setVerified(false);
      console.warn("Integrity verification failed:", e?.message);
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="bg-[#111] border border-[#222] rounded-xl p-5">
      <h3 className="text-sm font-medium text-foreground mb-4">Cryptographic Proof</h3>
      <div className="space-y-3 mb-4">
        <Row label="Event Hash" value={event.hash} monospace small />
        <Row label="Previous Hash" value={event.prev_hash || "Genesis"} monospace small />
        <Row label="Block Number" value={`#${event.block_number}`} />
        <Row label="Chain ID" value={event.chain_id} />
        <Row label="Schema Version" value={event.schema_version || "1.0"} />
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={handleVerify}
          disabled={verifying}
          className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-lg text-sm hover:bg-emerald-500/20 flex items-center gap-2 disabled:opacity-50"
        >
          <Shield className="w-4 h-4" />
          {verifying ? "Verifying..." : "Verify This Block"}
        </button>
        {verified === true && (
          <span className="flex items-center gap-1.5 text-emerald-400 text-sm">
            <CheckCircle2 className="w-4 h-4" /> Verified
          </span>
        )}
        {verified === false && (
          <span className="flex items-center gap-1.5 text-red-400 text-sm">
            <AlertTriangle className="w-4 h-4" /> Integrity Check Failed
          </span>
        )}
        <button onClick={() => copyToClipboard(event.hash)} className="text-[#666] hover:text-white">
          <Copy className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Evidence Tab (Sec 8) ─────────────────────────────────────────────────────

function EvidenceTab({ event }: { event: AuditEvent }) {
  const isPreserved = event.evidence_state !== "not_preserved";
  const isLegalHold = event.retention_class === "LEGAL_HOLD";
  const vaultId = isPreserved ? `vault-${event.chain_id}-${event.block_number}` : null;

  const [actionModal, setActionModal] = useState<{
    step: 'preserve' | 'exportFormat' | 'exportReason';
    format?: string;
  } | null>(null);

  const handleActionModalConfirm = async (value?: string) => {
    if (!actionModal) return;
    const v = value || '';
    switch (actionModal.step) {
      case 'preserve':
        try {
          await api.post('/api/audit-events/preserve', { event_ids: [event.id], reason: v, retention_class: 'EXTENDED' });
        } catch { console.warn('Failed to preserve event'); }
        setActionModal(null);
        break;
      case 'exportFormat':
        if (!v || !['csv', 'json', 'pdf'].includes(v)) { setActionModal(null); break; }
        setActionModal({ ...actionModal, step: 'exportReason', format: v });
        break;
      case 'exportReason':
        try {
          await api.post('/api/audit-events/export', { reason: v, format: actionModal.format, event_ids: [event.id] });
        } catch { console.warn('Failed to create export'); }
        setActionModal(null);
        break;
    }
  };

  return (
    <div className="space-y-4">
      {/* Vault Status */}
      <div className="bg-[#111] border border-[#222] rounded-xl p-5">
        <h3 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
          <Archive className="w-4 h-4 text-amber-500" /> Evidence Lifecycle
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-[#0a0a0a] border border-[#222] rounded-lg p-4 text-center">
            <div className={`text-lg font-bold ${isPreserved ? "text-emerald-400" : "text-[#666]"}`}>
              {event.evidence_state?.replace("_", " ") || "not preserved"}
            </div>
            <div className="text-xs text-[#888] mt-1">Evidence State</div>
          </div>
          <div className="bg-[#0a0a0a] border border-[#222] rounded-lg p-4 text-center">
            <div className={`text-lg font-bold ${isLegalHold ? "text-amber-400" : "text-blue-400"}`}>
              {event.retention_class}
            </div>
            <div className="text-xs text-[#888] mt-1">Retention Class</div>
          </div>
        </div>

        {vaultId && (
          <div className="mt-3 bg-[#0a0a0a] border border-[#222] rounded-lg p-3">
            <div className="text-xs text-[#888]">Vault ID</div>
            <div className="text-sm text-[#ccc] font-mono flex items-center gap-2 mt-0.5">
              <Fingerprint className="w-3.5 h-3.5 text-[#666]" />
              {vaultId}
              <button onClick={() => navigator.clipboard.writeText(vaultId)} className="text-[#555] hover:text-white">
                <Copy className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

        {isLegalHold && (
          <div className="mt-3 bg-amber-500/5 border border-amber-500/20 rounded-lg p-3 flex items-start gap-2">
            <Gavel className="w-4 h-4 text-amber-400 mt-0.5" />
            <div>
              <p className="text-sm text-amber-300 font-medium">Legal Hold Active</p>
              <p className="text-xs text-amber-200/70 mt-0.5">
                Retention expiration is suspended until hold is released by authorized Legal approval.
              </p>
            </div>
          </div>
        )}

        {event.sealed_at && (
          <div className="mt-3 bg-blue-500/5 border border-blue-500/20 rounded-lg p-3 flex items-start gap-2">
            <Archive className="w-4 h-4 text-blue-400 mt-0.5" />
            <div>
              <p className="text-sm text-blue-300 font-medium">Record Sealed</p>
              <p className="text-xs text-blue-200/70 mt-0.5">
                Sealed at {fmt(event.sealed_at)}{event.sealed_by ? ` by ${event.sealed_by}` : ""}.
                Sealed records are immutable and locked from modification.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Custody Timeline */}
      <div className="bg-[#111] border border-[#222] rounded-xl p-5">
        <h3 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
          <History className="w-4 h-4 text-amber-500" /> Custody Timeline
        </h3>
        <div className="space-y-3">
          <div className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <div className="w-px flex-1 bg-[#333]" />
            </div>
            <div>
              <div className="text-xs text-[#888]">{fmt(event.timestamp_utc)}</div>
              <div className="text-sm text-foreground">Event Created</div>
              <div className="text-xs text-[#666]">{event.event_type} · Block #{event.block_number}</div>
            </div>
          </div>
          {isPreserved && (
            <div className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <div className="w-px flex-1 bg-[#333]" />
              </div>
              <div>
                <div className="text-xs text-[#888]">{fmt(event.received_at || event.created_at)}</div>
                <div className="text-sm text-foreground">Preserved to Vault</div>
                <div className="text-xs text-[#666]">Evidence state: {event.evidence_state}</div>
              </div>
            </div>
          )}
          {isLegalHold && (
            <div className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="w-3 h-3 rounded-full bg-amber-500" />
              </div>
              <div>
                <div className="text-xs text-[#888]">Active</div>
                <div className="text-sm text-amber-300">Legal Hold Applied</div>
                <div className="text-xs text-[#666]">Retention suspended until released</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Exports */}
      <div className="bg-[#111] border border-[#222] rounded-xl p-5">
        <h3 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
          <Download className="w-4 h-4 text-amber-500" /> Exports
        </h3>
        <p className="text-xs text-[#888]">
          Exports that include this event will appear here after the export manifest has been processed.
        </p>
        <div className="mt-2 text-xs text-[#555] flex items-center gap-1">
          <FileText className="w-3 h-3" /> Export manifests include the event hash for chain-of-custody verification.
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setActionModal({ step: 'preserve' })}
          className="px-4 py-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-lg text-sm hover:bg-amber-500/20 flex items-center gap-1.5"
        >
          <Lock className="w-4 h-4" /> Preserve
        </button>
        <button
          onClick={() => setActionModal({ step: 'exportFormat' })}
          className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-lg text-sm hover:bg-emerald-500/20 flex items-center gap-1.5"
        >
          <Download className="w-4 h-4" /> Export
        </button>
      </div>

      {actionModal && (
        <ConfirmActionModal
          open={true}
          mode="prompt"
          variant="info"
          title={
            actionModal.step === 'preserve' ? 'Preserve Event' :
            'Export Event'
          }
          message={
            actionModal.step === 'preserve' ? 'Reason for preservation:' :
            actionModal.step === 'exportFormat' ? 'Export format (csv/json/pdf):' :
            'Reason for export:'
          }
          promptPlaceholder={
            actionModal.step === 'exportFormat' ? 'csv, json, or pdf' :
            'Enter reason...'
          }
          promptDefault={
            actionModal.step === 'exportFormat' ? 'csv' :
            undefined
          }
          onConfirm={handleActionModalConfirm}
          onCancel={() => setActionModal(null)}
        />
      )}
    </div>
  );
}

// ─── Access Log Tab (Sec 8) ──────────────────────────────────────────────────

function AccessLogTab({ event }: { event: AuditEvent }) {
  const [accessEvents, setAccessEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAccessLog() {
      try {
        const res = await api.get(`/api/audit-events?search=${event.event_id}&event_type=audit.access&limit=20`);
        if (res.success) setAccessEvents(res.data.events || []);
      } catch (e: any) { console.warn("Failed to load access log:", e?.message); }
      setLoading(false);
    }
    loadAccessLog();
  }, [event.event_id]);

  return (
    <div className="bg-[#111] border border-[#222] rounded-xl p-5">
      <h3 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
        <EyeOff className="w-4 h-4 text-amber-500" /> Access Log
      </h3>
      <p className="text-xs text-[#888] mb-4">
        Every time an elevated view, export preview, or sealed payload retrieval accesses this event, an
        <code className="text-amber-400"> audit.access</code> event is created.
      </p>

      {loading ? (
        <div className="text-center py-6 text-[#888] text-sm">Loading access log...</div>
      ) : accessEvents.length === 0 ? (
        <div className="bg-[#0a0a0a] border border-[#222] rounded-lg p-4 text-center">
          <EyeOff className="w-6 h-6 mx-auto mb-2 text-[#444]" />
          <p className="text-sm text-[#888]">No access events recorded yet.</p>
          <p className="text-xs text-[#666] mt-1">Access is logged for non-admin views of this event.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {accessEvents.map((ae: any) => (
            <div key={ae.id} className="bg-[#0a0a0a] border border-[#222] rounded-lg p-3 flex items-start gap-3">
              <Eye className="w-4 h-4 text-[#555] mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="text-xs text-[#888]">{fmt(ae.timestamp_utc || ae.created_at)}</div>
                <div className="text-sm text-[#ccc]">{ae.event_summary || ae.event_title}</div>
                <div className="text-xs text-[#666]">
                  {ae.actor?.actor_name || ae.actor?.actor_type} · {ae.change?.change_reason || "viewed"}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 text-xs text-[#666] border-t border-[#222] pt-3">
        <p>This view was accessed at: {fmt(new Date().toISOString())}</p>
        <p>Retention class: {event.retention_class}</p>
        {event.sealed_at && <p>Sealed since: {fmt(event.sealed_at)}</p>}
      </div>
    </div>
  );
}

// ─── Shared ────────────────────────────────────────────────────────────────────

function Row({ label, value, monospace, small }: { label: string; value: string; monospace?: boolean; small?: boolean }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-[#666] text-sm flex-shrink-0 w-28">{label}:</span>
      <span className={`text-[#ccc] ${monospace ? "font-mono" : ""} ${small ? "text-xs break-all" : "text-sm"}`}>
        {value}
      </span>
    </div>
  );
}
