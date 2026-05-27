"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { useRoles } from "@/lib/hooks/useRoles";
import {
  FileSearch, Clock, AlertTriangle, CheckCircle2, Search, Filter,
  Download, Shield, Copy, ExternalLink, Lock, Unlock, Eye, EyeOff,
  Hash, Link2, Activity, BarChart3, Archive, X, ChevronLeft, ChevronRight,
  SlidersHorizontal, BookmarkPlus, Save, RefreshCw, Share2, Layers,
  User, Bot, Key, Server, ShieldAlert, Info, Webhook,
  Wifi, AlertOctagon, HelpCircle, ShieldOff, Gavel, Plus,
  Trash2, Check,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuditEvent {
  id: string;
  event_id: string;
  workspace_id: string;
  chain_id: string;
  block_number: number;
  hash: string;
  prev_hash: string | null;
  schema_version: string;
  event_category: string;
  event_type: string;
  event_title: string;
  event_summary: string;
  timestamp_utc: string;
  received_at: string;
  actor: {
    actor_id: string;
    actor_type: string;
    actor_name?: string;
    role_at_event?: string;
    session_id?: string;
    ip_address?: string;
  };
  object: {
    object_type: string;
    object_id: string;
    object_name?: string;
  };
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
  created_at: string;
}

interface AuditStats {
  total_events: number;
  events_today: number;
  high_risk_events: number;
  critical_events: number;
  failed_events: number;
  blocked_events: number;
  overridden_events: number;
  ai_events: number;
  preserved_events: number;
  legal_hold_events: number;
  chain_status: string;
  last_event_at: string | null;
}

type TabId = "events" | "saved-views" | "exports" | "integrity" | "retention" | "streaming";

const CATEGORIES = [
  { value: "user_identity", label: "User & Identity" },
  { value: "content_lifecycle", label: "Content Lifecycle" },
  { value: "ai_agent", label: "AI & Agent" },
  { value: "approval", label: "Approval" },
  { value: "policy_governance", label: "Policy & Governance" },
  { value: "platform_integration", label: "Platform & Integration" },
  { value: "evidence_legal", label: "Evidence & Legal" },
  { value: "system_security", label: "System & Security" },
];

const RISK_LEVELS = ["low", "medium", "high", "critical"];
const STATUSES = ["success", "failed", "blocked", "pending", "overridden", "preserved", "sealed"];

const TAB_OPTIONS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "events", label: "Events", icon: Activity },
  { id: "saved-views", label: "Saved Views", icon: BookmarkPlus },
  { id: "exports", label: "Exports", icon: Download },
  { id: "integrity", label: "Integrity", icon: Shield },
  { id: "retention", label: "Retention", icon: Archive },
  { id: "streaming", label: "Streaming", icon: Wifi },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const riskConfig: Record<string, { color: string; bg: string; border: string }> = {
  low:    { color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/20" },
  medium: { color: "text-amber-400", bg: "bg-amber-400/10", border: "border-amber-400/20" },
  high:   { color: "text-orange-400", bg: "bg-orange-400/10", border: "border-orange-400/20" },
  critical: { color: "text-red-400", bg: "bg-red-400/10", border: "border-red-400/20" },
};

const statusConfig: Record<string, { color: string; icon: React.ElementType }> = {
  success:    { color: "text-emerald-400", icon: CheckCircle2 },
  failed:     { color: "text-red-400", icon: X },
  blocked:    { color: "text-orange-400", icon: ShieldAlert },
  pending:    { color: "text-amber-400", icon: Clock },
  overridden: { color: "text-purple-400", icon: AlertTriangle },
  preserved:  { color: "text-blue-400", icon: Lock },
  sealed:     { color: "text-[#666]", icon: Archive },
};

const evidenceIcons: Record<string, React.ElementType> = {
  not_preserved: Eye,
  preserved: Lock,
  sealed: Archive,
  archived: Archive,
  legal_hold: Shield,
};

const actorIcons: Record<string, React.ElementType> = {
  human_user: User,
  ai_agent: Bot,
  service_account: Server,
  system: Server,
  api_key: Key,
};

function formatTimestamp(ts: string): string {
  return new Date(ts).toLocaleString("en-US", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).replace(/,/g, "");
}

function shortHash(hash: string): string {
  if (!hash || hash.length < 16) return hash;
  return hash.substring(0, 8) + "..." + hash.substring(hash.length - 4);
}

function actorLabel(actor: { actor_type?: string; actor_name?: string; actor_id?: string }): string {
  return actor.actor_name || actor.actor_type || "Unknown";
}

function getCategoryLabel(value: string): string {
  return CATEGORIES.find(c => c.value === value)?.label || value;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AuditTrailPage() {
  const { hasRole, isLoading: rolesLoading } = useRoles();
  const [activeTab, setActiveTab] = useState<TabId>("events");
  const [chainStatus, setChainStatus] = useState<{ intact: boolean; lastVerified: string | null }>({ intact: true, lastVerified: null });
  const [verifying, setVerifying] = useState(false);

  if (rolesLoading) {
    return <div className="p-8 text-[#888888]">Loading governance context...</div>;
  }

  const handleVerifyChain = async () => {
    setVerifying(true);
    try {
      const res = await api.get("/api/audit-events/chain/verify");
      if (res.success) {
        setChainStatus({
          intact: res.data.failed_blocks === 0,
          lastVerified: new Date().toISOString(),
        });
      }
    } catch { /* ignore */ }
    setVerifying(false);
  };

  if (!hasRole(["WORKSPACE_OWNER", "GOVERNANCE_ADMIN", "ADMIN", "AUDITOR", "COMPLIANCE_REVIEWER", "SECURITY_ADMIN"])) {
    return <div className="p-8 text-red-400">Unauthorized. You need governance privileges to view the Audit Trail.</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <FileSearch className="w-6 h-6 text-amber-500" />
            Audit Trail
          </h1>
          <p className="text-[#888888] mt-1">
            Cryptographically chained record of authority, evidence, and governance actions.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
            chainStatus.intact
              ? "bg-emerald-400/10 border border-emerald-400/20"
              : "bg-red-400/10 border border-red-400/20"
          }`}>
            {chainStatus.intact ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-400" />
            )}
            <span className={`text-xs font-medium ${chainStatus.intact ? "text-emerald-400" : "text-red-400"}`}>
              {chainStatus.intact ? "Chain Intact" : "Chain Compromised"}
            </span>
            {chainStatus.lastVerified && (
              <span className="text-[10px] opacity-60">{formatTimestamp(chainStatus.lastVerified)}</span>
            )}
          </div>
          <button
            onClick={handleVerifyChain}
            disabled={verifying}
            className="px-3 py-1.5 border border-[#333] rounded-lg text-xs text-[#888] hover:text-white hover:border-[#555] flex items-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${verifying ? "animate-spin" : ""}`} />
            {verifying ? "Verifying..." : "Verify Now"}
          </button>
        </div>
      </div>

      {/* Chain Break P0 Banner */}
      {chainStatus.lastVerified && !chainStatus.intact && (
        <div className="mb-4 bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-red-400">Chain Integrity Compromised — P0</h4>
            <p className="text-xs text-red-300 mt-1">
              Cryptographic hash chain verification has detected mismatched blocks. Unsafe exports and actions for affected ranges are disabled. Run Verify Now on the Integrity tab for details.
            </p>
          </div>
        </div>
      )}

      {/* Index Lag Warning */}
      <div className="mb-4 bg-amber-500/5 border border-amber-500/20 rounded-lg px-4 py-2 flex items-center gap-2 text-xs text-amber-400">
        <Info className="w-3.5 h-3.5" />
        Some recent events may still be indexing. Results reflect the indexed read model state.
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-[#222] mb-6">
        {TAB_OPTIONS.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "text-amber-400 border-amber-400"
                  : "text-[#666] border-transparent hover:text-white hover:border-[#444]"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === "events" && <EventsTab />}
      {activeTab === "saved-views" && <SavedViewsTab />}
      {activeTab === "exports" && <ExportsTab />}
      {activeTab === "integrity" && <IntegrityTab />}
      {activeTab === "retention" && <RetentionTab />}
      {activeTab === "streaming" && <StreamingTab />}
    </div>
  );
}

// ─── Events Tab ────────────────────────────────────────────────────────────────

function EventsTab() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedRisk, setSelectedRisk] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedEvidenceState, setSelectedEvidenceState] = useState("");
  const [selectedRetentionClass, setSelectedRetentionClass] = useState("");
  const [selectedEventType, setSelectedEventType] = useState("");
  const [selectedActorId, setSelectedActorId] = useState("");
  const [selectedObjectId, setSelectedObjectId] = useState("");
  const [workflowRunId, setWorkflowRunId] = useState("");
  const [approvalChainId, setApprovalChainId] = useState("");
  const [policyRuleId, setPolicyRuleId] = useState("");
  const [dataResidency, setDataResidency] = useState("");
  const [selectedDataResidency, setSelectedDataResidency] = useState("");
  const [correlationId, setCorrelationId] = useState("");
  const [dateRange, setDateRange] = useState("24h");
  const [customDateFrom, setCustomDateFrom] = useState("");
  const [customDateTo, setCustomDateTo] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [relatedEvents, setRelatedEvents] = useState<AuditEvent[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [chainIntegrity, setChainIntegrity] = useState("");

  const fetchEvents = useCallback(async (cursor?: string) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ limit: "50" });
      if (cursor) params.set("cursor", cursor);
      if (selectedCategory) params.set("event_category", selectedCategory);
      if (selectedEventType) params.set("event_type", selectedEventType);
      if (selectedRisk) params.set("risk_level", selectedRisk);
      if (selectedStatus) params.set("status", selectedStatus);
      if (selectedEvidenceState) params.set("evidence_state", selectedEvidenceState);
      if (selectedRetentionClass) params.set("retention_class", selectedRetentionClass);
      if (policyRuleId) params.set("policy_rule_id", policyRuleId);
      if (dataResidency) params.set("data_residency", dataResidency);
      if (selectedActorId) params.set("actor_id", selectedActorId);
      if (selectedObjectId) params.set("object_id", selectedObjectId);
      if (workflowRunId) params.set("workflow_run_id", workflowRunId);
      if (approvalChainId) params.set("approval_chain_id", approvalChainId);
      if (search) params.set("search", search);

      const now = new Date();
      let from: Date;
      let to: Date | undefined;
      switch (dateRange) {
        case "1h": from = new Date(now.getTime() - 60 * 60 * 1000); break;
        case "7d": from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break;
        case "30d": from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); break;
        case "90d": from = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000); break;
        case "custom":
          from = customDateFrom ? new Date(customDateFrom) : new Date(now.getTime() - 24 * 60 * 60 * 1000);
          to = customDateTo ? new Date(customDateTo) : undefined;
          break;
        default: from = new Date(now.getTime() - 24 * 60 * 60 * 1000); break;
      }
      params.set("date_from", from.toISOString());
      if (to) params.set("date_to", to.toISOString());

      const [eventsRes, statsRes] = await Promise.all([
        api.get(`/api/audit-events?${params.toString()}`),
        api.get(`/api/audit-events/stats`),
      ]);

      if (eventsRes.success) {
        const data = eventsRes.data;
        setEvents(prev => cursor ? [...prev, ...data.events] : data.events);
        setNextCursor(data.next_cursor);
        setTotal(data.total);
      }
      if (statsRes.success) setStats(statsRes.data);
    } catch (err) {
      console.error("Failed to fetch audit events:", err);
    } finally {
      setLoading(false);
    }
  }, [
    selectedCategory, selectedRisk, selectedStatus, search, dateRange,
    selectedEventType, selectedEvidenceState, selectedRetentionClass,
    policyRuleId, dataResidency, selectedActorId, selectedObjectId,
    workflowRunId, approvalChainId, customDateFrom, customDateTo,
  ]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === events.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(events.map(e => e.id)));
    }
  };

  const handleEventClick = async (event: AuditEvent) => {
    setSelectedEvent(event);
    setRelatedEvents([]);
    try {
      const res = await api.get(`/api/audit-events/${event.id}/related`);
      if (res.success) setRelatedEvents(res.data.related || []);
    } catch {
      // Related events are optional
    }
  };

  const activeFilterCount = [selectedCategory, selectedEventType, selectedRisk, selectedStatus, selectedEvidenceState, selectedRetentionClass, policyRuleId, dataResidency, selectedActorId, selectedObjectId, workflowRunId, approvalChainId].filter(Boolean).length;

  const riskConfigMap: Record<string, { color: string; bg: string; border: string }> = {
    low:    { color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/20" },
    medium: { color: "text-amber-400", bg: "bg-amber-400/10", border: "border-amber-400/20" },
    high:   { color: "text-orange-400", bg: "bg-orange-400/10", border: "border-orange-400/20" },
    critical: { color: "text-red-400", bg: "bg-red-400/10", border: "border-red-400/20" },
  };

  return (
    <div className="flex gap-6">
      {/* Main Content */}
      <div className="flex-1 min-w-0">
        {/* Risk Summary Strip */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-9 gap-3 mb-4">
            <StatCard label="Today" value={stats.events_today} color="text-white" />
            <StatCard label="High Risk" value={stats.high_risk_events} color="text-orange-400" />
            <StatCard label="Critical" value={stats.critical_events} color="text-red-400" />
            <StatCard label="AI Events" value={stats.ai_events} color="text-purple-400" />
            <StatCard label="Failed" value={stats.failed_events} color="text-red-400" />
            <StatCard label="Override" value={stats.overridden_events} color="text-amber-400" />
            <StatCard label="Blocked" value={stats.blocked_events} color="text-orange-400" />
            <StatCard label="Preserved" value={stats.preserved_events} color="text-blue-400" />
            <StatCard label="Legal Hold" value={stats.legal_hold_events} color="text-amber-400" />
          </div>
        )}

        {/* Filter Bar */}
        <div className="bg-[#111] border border-[#222] rounded-xl mb-4">
          <div className="p-3 flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#666]" />
              <input
                type="text"
                placeholder="Search event_id, title, summary, actor, object, type..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="bg-[#0a0a0a] border border-[#333] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
            >
              <option value="1h">Last Hour</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="custom">Custom Range</option>
            </select>
            {dateRange === "custom" && (
              <div className="flex items-center gap-2">
                <input type="datetime-local" value={customDateFrom}
                  onChange={e => setCustomDateFrom(e.target.value)}
                  className="bg-[#0a0a0a] border border-[#333] rounded-lg px-2 py-2 text-xs text-white" />
                <span className="text-[#666] text-xs">to</span>
                <input type="datetime-local" value={customDateTo}
                  onChange={e => setCustomDateTo(e.target.value)}
                  className="bg-[#0a0a0a] border border-[#333] rounded-lg px-2 py-2 text-xs text-white" />
              </div>
            )}

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-3 py-2 border rounded-lg text-sm flex items-center gap-2 transition-colors ${
                showFilters || activeFilterCount > 0
                  ? "border-amber-500/50 text-amber-400 bg-amber-400/10"
                  : "border-[#333] text-[#888] hover:border-[#555]"
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filters
              {activeFilterCount > 0 && (
                <span className="bg-amber-500 text-black text-xs font-bold px-1.5 py-0.5 rounded-full">
                  {activeFilterCount}
                </span>
              )}
            </button>

            <button
              onClick={() => fetchEvents()}
              className="px-3 py-2 border border-[#333] rounded-lg text-sm text-[#888] hover:border-[#555] flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div className="px-3 pb-3 border-t border-[#222] pt-3 space-y-3">
              <div className="flex gap-3 flex-wrap">
                <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}
                  className="bg-[#0a0a0a] border border-[#333] rounded-lg px-3 py-2 text-sm text-white flex-1 min-w-[140px]">
                  <option value="">All Categories</option>
                  {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
                <input placeholder="Event Type (e.g. content.published)" value={selectedEventType}
                  onChange={e => setSelectedEventType(e.target.value)}
                  className="bg-[#0a0a0a] border border-[#333] rounded-lg px-3 py-2 text-sm text-white flex-1 min-w-[140px]" />
                <select value={selectedRisk} onChange={e => setSelectedRisk(e.target.value)}
                  className="bg-[#0a0a0a] border border-[#333] rounded-lg px-3 py-2 text-sm text-white flex-1 min-w-[100px]">
                  <option value="">All Risks</option>
                  {RISK_LEVELS.map(r => <option key={r} value={r}>{r.toUpperCase()}</option>)}
                </select>
                <select value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)}
                  className="bg-[#0a0a0a] border border-[#333] rounded-lg px-3 py-2 text-sm text-white flex-1 min-w-[100px]">
                  <option value="">All Statuses</option>
                  {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                </select>
              </div>
              <div className="flex gap-3 flex-wrap">
                <select value={selectedEvidenceState} onChange={e => setSelectedEvidenceState(e.target.value)}
                  className="bg-[#0a0a0a] border border-[#333] rounded-lg px-3 py-2 text-sm text-white flex-1 min-w-[120px]">
                  <option value="">All Evidence States</option>
                  <option value="not_preserved">Not Preserved</option>
                  <option value="preserved">Preserved</option>
                  <option value="sealed">Sealed</option>
                  <option value="archived">Archived</option>
                  <option value="legal_hold">Legal Hold</option>
                </select>
                <select value={selectedRetentionClass} onChange={e => setSelectedRetentionClass(e.target.value)}
                  className="bg-[#0a0a0a] border border-[#333] rounded-lg px-3 py-2 text-sm text-white flex-1 min-w-[100px]">
                  <option value="">All Retention</option>
                  <option value="STANDARD">Standard</option>
                  <option value="EXTENDED">Extended</option>
                  <option value="REGULATED">Regulated</option>
                  <option value="LEGAL_HOLD">Legal Hold</option>
                </select>
                <input placeholder="Actor ID" value={selectedActorId}
                  onChange={e => setSelectedActorId(e.target.value)}
                  className="bg-[#0a0a0a] border border-[#333] rounded-lg px-3 py-2 text-sm text-white flex-1 min-w-[120px]" />
                <input placeholder="Object ID" value={selectedObjectId}
                  onChange={e => setSelectedObjectId(e.target.value)}
                  className="bg-[#0a0a0a] border border-[#333] rounded-lg px-3 py-2 text-sm text-white flex-1 min-w-[120px]" />
              </div>
              <div className="flex gap-3 flex-wrap">
                <input placeholder="Workflow Run ID" value={workflowRunId}
                  onChange={e => setWorkflowRunId(e.target.value)}
                  className="bg-[#0a0a0a] border border-[#333] rounded-lg px-3 py-2 text-sm text-white flex-1 min-w-[130px]" />
                <input placeholder="Approval Chain ID" value={approvalChainId}
                  onChange={e => setApprovalChainId(e.target.value)}
                  className="bg-[#0a0a0a] border border-[#333] rounded-lg px-3 py-2 text-sm text-white flex-1 min-w-[130px]" />
                <input placeholder="Policy Rule ID" value={policyRuleId}
                  onChange={e => setPolicyRuleId(e.target.value)}
                  className="bg-[#0a0a0a] border border-[#333] rounded-lg px-3 py-2 text-sm text-white flex-1 min-w-[130px]" />
                <select value={selectedDataResidency} onChange={e => setSelectedDataResidency(e.target.value)}
                  className="bg-[#0a0a0a] border border-[#333] rounded-lg px-3 py-2 text-sm text-white flex-1 min-w-[100px]">
                  <option value="">All Regions</option>
                  <option value="auto">Auto</option>
                  <option value="us">US</option>
                  <option value="eu">EU</option>
                  <option value="gdpr">GDPR</option>
                </select>
              </div>
              {(activeFilterCount > 0 || search) && (
                <button
                  onClick={() => {
                    setSelectedCategory(""); setSelectedEventType(""); setSelectedRisk("");
                    setSelectedStatus(""); setSelectedEvidenceState(""); setSelectedRetentionClass("");
                    setPolicyRuleId(""); setDataResidency(""); setSelectedActorId(""); setSelectedObjectId("");
                    setWorkflowRunId(""); setApprovalChainId(""); setSearch("");
                  }}
                  className="px-3 py-2 text-sm text-red-400 hover:text-red-300 flex items-center gap-1"
                >
                  <X className="w-4 h-4" /> Clear All Filters
                </button>
              )}
            </div>
          )}
        </div>

        {/* Permission-filtered banner */}
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg px-3 py-2 mb-3 flex items-center gap-2">
          <EyeOff className="w-4 h-4 text-amber-400" />
          <span className="text-xs text-amber-300">
            Showing permission-filtered results based on your role. Some fields may be redacted, hashed, or hidden per access control policy.
          </span>
        </div>

        {/* Event Table */}
        <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden">
          <div className="overflow-auto max-h-[600px]">
            {loading && events.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-[#888888]">
                <Clock className="w-5 h-5 mr-2 animate-pulse" />
                Loading events...
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead className="bg-[#161616] sticky top-0 z-10">
                  <tr>
                    <th className="py-3 px-3 text-xs font-medium text-[#888] uppercase tracking-wider border-b border-[#222] w-8">
                      <input
                        type="checkbox"
                        checked={events.length > 0 && selectedIds.size === events.length}
                        onChange={handleSelectAll}
                        className="accent-amber-500"
                      />
                    </th>
                    <th className="py-3 px-3 text-xs font-medium text-[#888] uppercase tracking-wider border-b border-[#222]">Time</th>
                    <th className="py-3 px-3 text-xs font-medium text-[#888] uppercase tracking-wider border-b border-[#222]">Event</th>
                    <th className="py-3 px-3 text-xs font-medium text-[#888] uppercase tracking-wider border-b border-[#222]">Actor</th>
                    <th className="py-3 px-3 text-xs font-medium text-[#888] uppercase tracking-wider border-b border-[#222]">Object</th>
                    <th className="py-3 px-3 text-xs font-medium text-[#888] uppercase tracking-wider border-b border-[#222]">Risk</th>
                    <th className="py-3 px-3 text-xs font-medium text-[#888] uppercase tracking-wider border-b border-[#222]">Status</th>
                    <th className="py-3 px-3 text-xs font-medium text-[#888] uppercase tracking-wider border-b border-[#222]">Evidence</th>
                    <th className="py-3 px-3 text-xs font-medium text-[#888] uppercase tracking-wider border-b border-[#222]">Hash</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#222]">
                  {events.map((event) => {
                    const riskCfg = riskConfigMap[event.risk_level] || riskConfigMap.low;
                    const StatusIcon = statusConfig[event.status]?.icon || CheckCircle2;
                    const statusColor = statusConfig[event.status]?.color || "text-[#888]";
                    const EvidenceIcon = evidenceIcons[event.evidence_state] || Eye;
                    const ActorIcon = actorIcons[event.actor?.actor_type] || User;

                    return (
                      <tr
                        key={event.id}
                        onClick={() => handleEventClick(event)}
                        className={`hover:bg-[#161616]/50 transition-colors cursor-pointer ${
                          event.risk_level === "critical" ? "border-l-2 border-l-red-500" :
                          event.risk_level === "high" ? "border-l-2 border-l-orange-500" : ""
                        }`}
                      >
                        <td className="py-3 px-3 text-sm" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedIds.has(event.id)}
                            onChange={() => handleSelect(event.id)}
                            className="accent-amber-500"
                          />
                        </td>
                        <td className="py-3 px-3 text-xs text-[#888] whitespace-nowrap">
                          <div>{formatTimestamp(event.timestamp_utc)}</div>
                          <div className="text-[#555]">#{event.block_number}</div>
                        </td>
                        <td className="py-3 px-3 text-sm">
                          <div className="text-white font-medium">{event.event_title || event.event_type}</div>
                          <div className="text-[#666] text-xs font-mono">{event.event_type}</div>
                        </td>
                        <td className="py-3 px-3 text-sm">
                          <div className="flex items-center gap-2">
                            <ActorIcon className="w-3.5 h-3.5 text-[#666]" />
                            <span className="text-[#ccc]">{actorLabel(event.actor)}</span>
                          </div>
                          <div className="text-[#555] text-xs">{event.actor?.role_at_event || ""}</div>
                        </td>
                        <td className="py-3 px-3 text-sm">
                          <div className="text-[#ccc] truncate max-w-[150px]">{event.object?.object_name || event.object?.object_id || "-"}</div>
                          <div className="text-[#555] text-xs">{event.object?.object_type || ""}</div>
                        </td>
                        <td className="py-3 px-3 text-sm">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium border ${riskCfg.color} ${riskCfg.bg} ${riskCfg.border}`}>
                            {event.risk_level.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-sm">
                          <div className="flex items-center gap-1.5">
                            <StatusIcon className={`w-3.5 h-3.5 ${statusColor}`} />
                            <span className={`text-xs ${statusColor}`}>{event.status}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-sm">
                          <div className="flex items-center gap-1.5">
                            <EvidenceIcon className="w-3.5 h-3.5 text-[#666]" />
                            <span className="text-xs text-[#888]">{event.evidence_state.replace("_", " ")}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-sm">
                          <div className="flex items-center gap-1.5">
                            <Hash className="w-3.5 h-3.5 text-[#555]" />
                            <span className="text-xs font-mono text-[#666]">{shortHash(event.hash)}</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {events.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-[#888]">
                        <FileSearch className="w-8 h-8 mx-auto mb-2 text-[#444]" />
                        No events found matching your criteria.
                        <br />
                        <button onClick={() => fetchEvents()} className="text-amber-500 text-sm mt-2 hover:text-amber-400">
                          Clear filters and reload
                        </button>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {nextCursor && events.length > 0 && (
            <div className="px-4 py-3 border-t border-[#222] flex items-center justify-between">
              <span className="text-xs text-[#888]">{total} total events</span>
              <button
                onClick={() => fetchEvents(nextCursor)}
                className="px-4 py-1.5 border border-[#333] rounded-lg text-sm text-[#ccc] hover:border-[#555] flex items-center gap-2"
              >
                Load More <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Bulk Action Bar */}
          {selectedIds.size > 0 && (
            <div className="px-4 py-3 border-t border-[#222] bg-amber-500/5 flex items-center justify-between">
              <span className="text-sm text-[#ccc]">{selectedIds.size} event{selectedIds.size > 1 ? "s" : ""} selected</span>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={async () => {
                    const reason = prompt('Reason for preservation:');
                    if (!reason) return;
                    try {
                      await api.post('/api/audit-events/preserve', { event_ids: Array.from(selectedIds), reason, retention_class: 'EXTENDED' });
                      setSelectedIds(new Set());
                    } catch { alert('Failed to preserve events'); }
                  }}
                  className="px-3 py-1.5 bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded-lg text-xs hover:bg-blue-500/20 flex items-center gap-1.5"
                >
                  <Lock className="w-3.5 h-3.5" /> Preserve
                </button>
                <button
                  onClick={async () => {
                    const format = prompt('Export format (csv/json/pdf):', 'csv');
                    if (!format || !['csv', 'json', 'pdf'].includes(format)) return;
                    const reason = prompt('Reason for export:');
                    if (!reason) return;
                    try {
                      await api.post('/api/audit-events/export', { reason, format, event_ids: Array.from(selectedIds) });
                      setSelectedIds(new Set());
                    } catch { alert('Failed to create export'); }
                  }}
                  className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-lg text-xs hover:bg-emerald-500/20 flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" /> Export
                </button>
                <button
                  onClick={async () => {
                    const title = prompt('Investigation title:');
                    if (!title) return;
                    const severity = prompt('Severity (LOW/MEDIUM/HIGH/CRITICAL):', 'MEDIUM');
                    if (!severity || !['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(severity)) return;
                    const reason = prompt('Reason for investigation:');
                    if (!reason) return;
                    try {
                      const res = await api.post('/api/audit-events/create-investigation', { event_ids: Array.from(selectedIds), title, severity, reason });
                      if (res.success) {
                        window.open(res.data.case_url, '_blank');
                      }
                      setSelectedIds(new Set());
                    } catch { alert('Failed to create investigation'); }
                  }}
                  className="px-3 py-1.5 bg-purple-500/10 border border-purple-500/30 text-purple-400 rounded-lg text-xs hover:bg-purple-500/20 flex items-center gap-1.5"
                >
                  <Shield className="w-3.5 h-3.5" /> Investigate
                </button>
                <button
                  onClick={async () => {
                    const reason = prompt('Legal hold reason:');
                    if (!reason) return;
                    try {
                      await api.post('/api/evidence-vault/holds', {
                        object_ids: Array.from(selectedIds),
                        object_type: 'audit_event',
                        matter_ref: `LH-${Date.now()}`,
                        reason,
                      });
                      setSelectedIds(new Set());
                    } catch { alert('Failed to apply legal hold'); }
                  }}
                  className="px-3 py-1.5 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-lg text-xs hover:bg-rose-500/20 flex items-center gap-1.5"
                >
                  <Gavel className="w-3.5 h-3.5" /> Legal Hold
                </button>
                <button
                  onClick={() => {
                    const links = Array.from(selectedIds).map(id => `${window.location.origin}/evidence/audit-trail/events/${id}`);
                    navigator.clipboard.writeText(links.join('\n'));
                    setSelectedIds(new Set());
                  }}
                  className="px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 rounded-lg text-xs hover:bg-indigo-500/20 flex items-center gap-1.5"
                >
                  <Link2 className="w-3.5 h-3.5" /> Copy Links
                </button>
                <button onClick={() => setSelectedIds(new Set())} className="px-3 py-1.5 text-[#888] hover:text-white text-xs">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Detail Drawer */}
      {selectedEvent && (
        <div className="w-96 bg-[#111] border border-[#222] rounded-xl overflow-hidden flex-shrink-0 max-h-[800px] flex flex-col">
          <div className="p-4 border-b border-[#222] flex items-center justify-between">
            <h3 className="text-sm font-medium text-white">Event Details</h3>
            <button onClick={() => { setSelectedEvent(null); setRelatedEvents([]); }} className="text-[#666] hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-auto p-4 space-y-4">
            {/* Event Header */}
            <div>
              <h4 className="text-base font-semibold text-white">{selectedEvent.event_title}</h4>
              <p className="text-xs text-[#666] font-mono mt-0.5">{selectedEvent.event_type}</p>
            </div>

            {/* Doctrine Summary */}
            <div className="bg-[#0a0a0a] border border-[#222] rounded-lg p-3 text-xs text-[#aaa] leading-relaxed">
              {selectedEvent.actor?.actor_name || "Unknown"} ({selectedEvent.event_category.replace("_", " ")}) — {selectedEvent.event_summary || selectedEvent.event_type}
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <InfoRow label="Event ID"><FieldValue value={selectedEvent.event_id} /></InfoRow>
              <InfoRow label="Block"><FieldValue value={`#${selectedEvent.block_number}`} /></InfoRow>
              <InfoRow label="Category"><FieldValue value={getCategoryLabel(selectedEvent.event_category)} /></InfoRow>
              <InfoRow label="Risk"><FieldValue value={selectedEvent.risk_level.toUpperCase()} /></InfoRow>
              <InfoRow label="Status"><FieldValue value={selectedEvent.status} /></InfoRow>
              <InfoRow label="Retention"><FieldValue value={selectedEvent.retention_class} /></InfoRow>
            </div>

            {/* Actor Panel */}
            <div className="border border-[#222] rounded-lg p-3">
              <h5 className="text-xs font-medium text-[#888] uppercase tracking-wider mb-2">Actor</h5>
              <div className="space-y-1.5 text-xs">
                <p className="flex items-center gap-1"><span className="text-[#666] w-12">Name:</span> <FieldValue value={selectedEvent.actor?.actor_name} /></p>
                <p className="flex items-center gap-1"><span className="text-[#666] w-12">Type:</span> <FieldValue value={selectedEvent.actor?.actor_type} /></p>
                <p className="flex items-center gap-1"><span className="text-[#666] w-12">Role:</span> <FieldValue value={selectedEvent.actor?.role_at_event} /></p>
                <p className="flex items-center gap-1"><span className="text-[#666] w-12">Session:</span> <FieldValue value={selectedEvent.actor?.session_id ? shortHash(selectedEvent.actor.session_id) : "-"} /></p>
                {selectedEvent.actor?.ip_address && (
                  <p className="flex items-center gap-1"><span className="text-[#666] w-12">IP:</span> <FieldValue value={selectedEvent.actor?.ip_address} /></p>
                )}
              </div>
            </div>

            {/* Object Panel */}
            <div className="border border-[#222] rounded-lg p-3">
              <h5 className="text-xs font-medium text-[#888] uppercase tracking-wider mb-2">Object</h5>
              <div className="space-y-1.5 text-xs">
                <p className="flex items-center gap-1"><span className="text-[#666] w-12">Type:</span> <FieldValue value={selectedEvent.object?.object_type} /></p>
                <p className="flex items-center gap-1"><span className="text-[#666] w-12">ID:</span> <FieldValue value={selectedEvent.object?.object_id} /></p>
                <p className="flex items-center gap-1"><span className="text-[#666] w-12">Name:</span> <FieldValue value={selectedEvent.object?.object_name} /></p>
              </div>
            </div>

            {/* Authority Panel */}
            {selectedEvent.authority && Object.keys(selectedEvent.authority).length > 0 && (
              <div className="border border-[#222] rounded-lg p-3">
                <h5 className="text-xs font-medium text-[#888] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Shield className="w-3 h-3" /> Authority
                </h5>
                <div className="space-y-1.5 text-xs">
                  <p className="flex items-center gap-1"><span className="text-[#666] w-16">Permission:</span> <FieldValue value={String(selectedEvent.authority.permission_used || "-")} /></p>
                  <p className="flex items-center gap-1"><span className="text-[#666] w-16">Policy Rule:</span> <FieldValue value={String(selectedEvent.authority.policy_rule_id || "-")} /></p>
                  {selectedEvent.authority.approval_required !== undefined && (
                    <p className="flex items-center gap-1"><span className="text-[#666] w-16">Approval:</span> <FieldValue value={String(selectedEvent.authority.approval_required)} /></p>
                  )}
                  {!!selectedEvent.authority.override_reason && (
                    <div className="bg-orange-500/5 border border-orange-500/20 rounded p-2 mt-1">
                      <p className="text-orange-400 text-[10px] uppercase tracking-wider mb-0.5">Override Reason</p>
                      <FieldValue value={String(selectedEvent.authority.override_reason)} />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Change Panel */}
            {selectedEvent.change && Object.keys(selectedEvent.change).length > 0 && (
              <div className="border border-[#222] rounded-lg p-3">
                <h5 className="text-xs font-medium text-[#888] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Activity className="w-3 h-3" /> Change
                </h5>
                <div className="space-y-1.5 text-xs">
                  {!!selectedEvent.change.field_changed && (
                    <p><span className="text-[#666]">Field:</span> <span className="text-[#ccc] font-mono">{String(selectedEvent.change.field_changed)}</span></p>
                  )}
                  {selectedEvent.change.previous_value !== undefined && (
                    <div className="border border-red-500/20 bg-red-500/5 rounded p-1.5">
                      <span className="text-red-400 text-[10px] uppercase">Was:</span>
                      <div className="text-red-300 font-mono text-[10px] break-all mt-0.5">
                        {typeof selectedEvent.change.previous_value === "object"
                          ? JSON.stringify(selectedEvent.change.previous_value)
                          : String(selectedEvent.change.previous_value as string)}
                      </div>
                    </div>
                  )}
                  {selectedEvent.change.new_value !== undefined && (
                    <div className="border border-emerald-500/20 bg-emerald-500/5 rounded p-1.5">
                      <span className="text-emerald-400 text-[10px] uppercase">Now:</span>
                      <div className="text-emerald-300 font-mono text-[10px] break-all mt-0.5">
                        {typeof selectedEvent.change.new_value === "object"
                          ? JSON.stringify(selectedEvent.change.new_value)
                          : String(selectedEvent.change.new_value as string)}
                      </div>
                    </div>
                  )}
                  {!!selectedEvent.change.change_reason && (
                    <p className="text-[#888] italic mt-1">{String(selectedEvent.change.change_reason)}</p>
                  )}
                </div>
              </div>
            )}

            {/* AI Provenance Panel */}
            {selectedEvent.ai_context && Object.keys(selectedEvent.ai_context).length > 0 && (
              <div className="border border-[#222] rounded-lg p-3">
                <h5 className="text-xs font-medium text-[#888] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Bot className="w-3 h-3" /> AI Provenance
                </h5>
                <div className="space-y-1.5 text-xs">
                  {!!selectedEvent.ai_context.agent_id && <p className="flex items-center gap-1"><span className="text-[#666] w-14">Agent:</span> <FieldValue value={String(selectedEvent.ai_context.agent_id)} /></p>}
                  {!!selectedEvent.ai_context.agent_version && <p className="flex items-center gap-1"><span className="text-[#666] w-14">Version:</span> <FieldValue value={String(selectedEvent.ai_context.agent_version)} /></p>}
                  {!!selectedEvent.ai_context.model_version && <p className="flex items-center gap-1"><span className="text-[#666] w-14">Model:</span> <FieldValue value={String(selectedEvent.ai_context.model_version)} /></p>}
                  {selectedEvent.ai_context.confidence !== undefined && (
                    <p className="flex items-center gap-1"><span className="text-[#666] w-14">Confidence:</span> <span className="text-[#ccc]">{(Number(selectedEvent.ai_context.confidence) * 100).toFixed(0)}%</span></p>
                  )}
                  {!!selectedEvent.ai_context.prompt_id && <p className="flex items-center gap-1"><span className="text-[#666] w-14">Prompt:</span> <FieldValue value={String(selectedEvent.ai_context.prompt_id)} /></p>}
                  {!!selectedEvent.ai_context.policy_checks && Array.isArray(selectedEvent.ai_context.policy_checks) && (
                    <div className="mt-1">
                      <span className="text-[#666] text-[10px] uppercase">Policy Checks:</span>
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {selectedEvent.ai_context.policy_checks.map((pc: string) => (
                          <span key={pc} className="px-1.5 py-0.5 bg-emerald-400/10 text-emerald-400 rounded text-[10px]">{pc}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Chain Integrity Panel */}
            <div className="border border-[#222] rounded-lg p-3">
              <h5 className="text-xs font-medium text-[#888] uppercase tracking-wider mb-2">Chain Integrity</h5>
              <div className="space-y-1.5 text-xs">
                <p><span className="text-[#666]">Hash:</span> <span className="text-[#ccc] font-mono text-[10px] break-all">{selectedEvent.hash}</span></p>
                <p><span className="text-[#666]">Previous:</span> <span className="text-[#ccc] font-mono text-[10px] break-all">{selectedEvent.prev_hash || "Genesis"}</span></p>
                <p><span className="text-[#666]">Chain:</span> <span className="text-[#ccc]">{selectedEvent.chain_id}</span></p>
                {selectedEvent.sealed_at && (
                  <p><span className="text-[#666]">Sealed:</span> <span className="text-amber-400">{formatTimestamp(selectedEvent.sealed_at)}</span></p>
                )}
              </div>
            </div>

            {/* Evidence State */}
            <div className="border border-[#222] rounded-lg p-3">
              <h5 className="text-xs font-medium text-[#888] uppercase tracking-wider mb-2">Evidence</h5>
              <div className="space-y-1.5 text-xs">
                <p className="flex items-center gap-1"><span className="text-[#666] w-14">State:</span> <FieldValue value={selectedEvent.evidence_state.replace("_", " ")} /></p>
                <p className="flex items-center gap-1"><span className="text-[#666] w-14">Retention:</span> <FieldValue value={selectedEvent.retention_class} /></p>
                {selectedEvent.retention_until && (
                  <p className="flex items-center gap-1"><span className="text-[#666] w-14">Expires:</span> <FieldValue value={formatTimestamp(selectedEvent.retention_until)} /></p>
                )}
              </div>
            </div>

            {/* Related Events */}
            {relatedEvents.length > 0 && (
              <div className="border border-[#222] rounded-lg p-3">
                <h5 className="text-xs font-medium text-[#888] uppercase tracking-wider mb-2">Related Events ({relatedEvents.length})</h5>
                <div className="space-y-2">
                  {relatedEvents.slice(0, 5).map((rel) => (
                    <div key={rel.id} className="text-xs text-[#888] flex items-start gap-2">
                      <Activity className="w-3 h-3 mt-0.5 text-[#555] flex-shrink-0" />
                      <div>
                        <div className="text-[#aaa]">{rel.event_type}</div>
                        <div className="text-[#555]">{formatTimestamp(rel.timestamp_utc)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={async () => {
                  const reason = prompt('Reason for preservation:');
                  if (!reason) return;
                  try {
                    await api.post('/api/audit-events/preserve', { event_ids: [selectedEvent.id], reason, retention_class: 'EXTENDED' });
                  } catch { alert('Failed to preserve event'); }
                }}
                className="flex-1 px-3 py-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-lg text-xs hover:bg-amber-500/20 flex items-center justify-center gap-1.5"
              >
                <Lock className="w-3.5 h-3.5" /> Preserve
              </button>
              <button
                onClick={async () => {
                  const format = prompt('Export format (csv/json/pdf):', 'csv');
                  if (!format || !['csv', 'json', 'pdf'].includes(format)) return;
                  const reason = prompt('Reason for export:');
                  if (!reason) return;
                  try {
                    await api.post('/api/audit-events/export', { reason, format, event_ids: [selectedEvent.id] });
                  } catch { alert('Failed to create export'); }
                }}
                className="flex-1 px-3 py-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-lg text-xs hover:bg-emerald-500/20 flex items-center justify-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" /> Export
              </button>
            </div>
            <a
              href={`/evidence/audit-trail/events/${selectedEvent.id}`}
              className="block w-full text-center px-3 py-2 border border-[#333] rounded-lg text-xs text-[#888] hover:text-white hover:border-[#555] mt-2"
            >
              View Full Event Page →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Other Tabs ───────────────────────────────────────────────────────────────

function SavedViewsTab() {
  const [views, setViews] = useState<Array<{ id: string; name: string; filters: Record<string, string>; createdAt: string }>>([]);
  const [showForm, setShowForm] = useState(false);
  const [viewName, setViewName] = useState("");

  useEffect(() => {
    try {
      const stored = localStorage.getItem("audit-saved-views");
      if (stored) setViews(JSON.parse(stored));
    } catch { /* ignore */ }
  }, []);

  const saveViews = (newViews: typeof views) => {
    setViews(newViews);
    localStorage.setItem("audit-saved-views", JSON.stringify(newViews));
  };

  const handleCreate = () => {
    if (!viewName.trim()) return;
    const newView = {
      id: crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name: viewName.trim(),
      filters: {},
      createdAt: new Date().toISOString(),
    };
    saveViews([...views, newView]);
    setViewName("");
    setShowForm(false);
  };

  const handleDelete = (id: string) => {
    saveViews(views.filter(v => v.id !== id));
  };

  return (
    <div className="bg-[#111] border border-[#222] rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-medium text-white">Saved Views</h3>
          <p className="text-sm text-[#888]">Create and manage saved filter configurations.</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-lg text-sm hover:bg-amber-500/20 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> {showForm ? "Cancel" : "New View"}
        </button>
      </div>

      {showForm && (
        <div className="bg-[#0a0a0a] border border-[#222] rounded-lg p-4 mb-4 flex gap-3">
          <input
            placeholder="View name (e.g., Critical Today, My Security Events)"
            value={viewName}
            onChange={e => setViewName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleCreate()}
            className="flex-1 bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-sm text-white"
          />
          <button onClick={handleCreate} className="px-4 py-2 bg-amber-500 text-black rounded-lg text-sm font-medium hover:bg-amber-400">
            Save
          </button>
        </div>
      )}

      {views.length === 0 ? (
        <div className="text-center py-12">
          <BookmarkPlus className="w-10 h-10 mx-auto mb-3 text-[#444]" />
          <p className="text-sm text-[#888]">No saved views yet.</p>
          <p className="text-xs text-[#666] mt-1">Save your current filter configuration for quick access later.</p>
        </div>
      ) : (
        <div className="overflow-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-xs text-[#888] uppercase tracking-wider border-b border-[#222]">
                <th className="py-2 px-3">Name</th>
                <th className="py-2 px-3">Created</th>
                <th className="py-2 px-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#222]">
              {views.map(v => (
                <tr key={v.id} className="text-sm text-[#ccc]">
                  <td className="py-2 px-3 font-medium text-white">{v.name}</td>
                  <td className="py-2 px-3 text-xs text-[#888]">{formatTimestamp(v.createdAt)}</td>
                  <td className="py-2 px-3">
                    <button onClick={() => handleDelete(v.id)} className="text-red-400 hover:text-red-300 text-xs flex items-center gap-1">
                      <Trash2 className="w-3 h-3" /> Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ExportsTab() {
  const [exports, setExports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchExports = async () => {
    try {
      const res = await api.get("/api/audit-events/exports");
      if (res.success) setExports(res.data);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { fetchExports(); }, []);

  useEffect(() => {
    const hasPending = exports.some(e => e.status === "PENDING" || e.status === "PROCESSING");
    if (!hasPending) return;
    const interval = setInterval(fetchExports, 15000);
    return () => clearInterval(interval);
  }, [exports]);

  return (
    <div className="bg-[#111] border border-[#222] rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-medium text-white">Export Jobs</h3>
          <p className="text-sm text-[#888]">Async export jobs with download and notification path.</p>
        </div>
        {loading && <RefreshCw className="w-4 h-4 animate-spin text-[#888]" />}
      </div>
      {loading && exports.length === 0 ? (
        <div className="text-center text-[#888] py-8">Loading exports...</div>
      ) : exports.length === 0 ? (
        <div className="text-center py-8">
          <Download className="w-10 h-10 mx-auto mb-3 text-[#444]" />
          <p className="text-sm text-[#888]">No export jobs found.</p>
          <p className="text-xs text-[#666] mt-1">Select events and use the Export action to create a new export.</p>
        </div>
      ) : (
        <div className="overflow-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-xs text-[#888] uppercase tracking-wider border-b border-[#222]">
                <th className="py-2 px-3">ID</th>
                <th className="py-2 px-3">Format</th>
                <th className="py-2 px-3">Reason</th>
                <th className="py-2 px-3">Status</th>
                <th className="py-2 px-3">Est. Completion</th>
                <th className="py-2 px-3">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#222]">
              {exports.map((exp: any) => (
                <tr key={exp.id} className="text-sm text-[#ccc]">
                  <td className="py-2 px-3 font-mono text-xs">{exp.id.substring(0, 8)}</td>
                  <td className="py-2 px-3">{exp.format}</td>
                  <td className="py-2 px-3">{exp.reason}</td>
                  <td className="py-2 px-3">
                    <span className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium w-fit ${
                      exp.status === "COMPLETED" ? "text-emerald-400 bg-emerald-400/10" :
                      exp.status === "FAILED" ? "text-red-400 bg-red-400/10" :
                      exp.status === "PROCESSING" ? "text-blue-400 bg-blue-400/10" :
                      "text-amber-400 bg-amber-400/10"
                    }`}>
                      {exp.status === "PENDING" && <RefreshCw className="w-3 h-3 animate-spin" />}
                      {exp.status === "PROCESSING" && <RefreshCw className="w-3 h-3 animate-spin" />}
                      {exp.status === "COMPLETED" && <CheckCircle2 className="w-3 h-3" />}
                      {exp.status === "FAILED" && <AlertTriangle className="w-3 h-3" />}
                      {exp.status}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-xs text-[#888]">
                    {exp.status === "PENDING" ? "~30s" :
                     exp.status === "PROCESSING" ? "~15s" :
                     exp.status === "COMPLETED" ? "Done" : "—"}
                  </td>
                  <td className="py-2 px-3 text-xs text-[#888]">{formatTimestamp(exp.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {exports.some(e => e.status === "PENDING" || e.status === "PROCESSING") && (
            <p className="text-xs text-[#888] mt-3 flex items-center gap-1">
              <RefreshCw className="w-3 h-3 animate-spin" /> Auto-refreshing every 15s. Results will notify via workspace notification.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function IntegrityTab() {
  const [verifyResult, setVerifyResult] = useState<any>(null);
  const [verifying, setVerifying] = useState(false);

  const handleVerify = async () => {
    setVerifying(true);
    try {
      const res = await api.get("/api/audit-events/chain/verify");
      if (res.success) setVerifyResult(res.data);
    } catch (err) {
      console.error("Verification failed:", err);
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-[#111] border border-[#222] rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-medium text-white">Chain Integrity</h3>
            <p className="text-sm text-[#888]">Verify the cryptographic hash chain of audit events.</p>
          </div>
          <button
            onClick={handleVerify}
            disabled={verifying}
            className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-lg text-sm hover:bg-emerald-500/20 flex items-center gap-2 disabled:opacity-50"
          >
            {verifying ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Shield className="w-4 h-4" />
            )}
            {verifying ? "Verifying..." : "Verify Chain"}
          </button>
        </div>

        {verifyResult && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-[#0a0a0a] border border-[#222] rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-white">{verifyResult.total_blocks}</div>
                <div className="text-xs text-[#888]">Total Blocks</div>
              </div>
              <div className="bg-[#0a0a0a] border border-emerald-500/20 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-emerald-400">{verifyResult.verified_blocks}</div>
                <div className="text-xs text-[#888]">Verified</div>
              </div>
              <div className={`bg-[#0a0a0a] border rounded-lg p-3 text-center ${
                verifyResult.failed_blocks > 0 ? "border-red-500/20" : "border-[#222]"
              }`}>
                <div className={`text-2xl font-bold ${verifyResult.failed_blocks > 0 ? "text-red-400" : "text-[#666]"}`}>
                  {verifyResult.failed_blocks}
                </div>
                <div className="text-xs text-[#888]">Failed</div>
              </div>
            </div>

            {verifyResult.failed_blocks > 0 && (
              <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3">
                <div className="flex items-center gap-2 text-red-400 text-sm font-medium mb-2">
                  <ShieldAlert className="w-4 h-4" />
                  Chain Integrity Issues Detected
                </div>
                <div className="space-y-1 text-xs text-red-300">
                  {verifyResult.results?.filter((r: any) => !r.chain_verified).map((r: any) => (
                    <p key={r.block_number}>Block #{r.block_number}: {r.error_message}</p>
                  ))}
                </div>
              </div>
            )}

            {verifyResult.failed_blocks === 0 && verifyResult.total_blocks > 0 && (
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-3 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="text-sm text-emerald-400">All blocks verified. Chain integrity is intact.</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function RetentionTab() {
  const [sealing, setSealing] = useState(false);
  const [sealResult, setSealResult] = useState<{ sealed_count: number } | null>(null);
  const [legalHolds, setLegalHolds] = useState<any[]>([]);
  const [loadingHolds, setLoadingHolds] = useState(true);

  useEffect(() => {
    api.get('/api/evidence-vault/holds')
      .then(res => { if (res.success) setLegalHolds(res.data); })
      .catch(() => {})
      .finally(() => setLoadingHolds(false));
  }, []);

  const handleSealExpired = async () => {
    setSealing(true);
    try {
      const res = await api.post('/api/audit-events/seal-expired', {});
      if (res.success) setSealResult(res.data);
    } catch { alert('Failed to seal expired records'); }
    setSealing(false);
  };

  return (
    <div className="space-y-4">
      {/* Retention Policy Summary */}
      <div className="bg-[#111] border border-[#222] rounded-xl p-6">
        <h3 className="text-lg font-medium text-white mb-4">Retention Policies</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Standard", duration: "2 years", color: "text-emerald-400", desc: "Default retention for routine audit events", badge: "bg-emerald-400/10 border-emerald-400/20" },
            { label: "Extended", duration: "7 years", color: "text-blue-400", desc: "Compliance and regulatory events", badge: "bg-blue-400/10 border-blue-400/20" },
            { label: "Regulated", duration: "10 years", color: "text-purple-400", desc: "GDPR, SOX, FINRA requirements", badge: "bg-purple-400/10 border-purple-400/20" },
            { label: "Legal Hold", duration: "Indefinite", color: "text-amber-400", desc: "Suspended until hold is released", badge: "bg-amber-400/10 border-amber-400/20" },
          ].map((cls) => (
            <div key={cls.label} className={`${cls.badge} border rounded-lg p-4`}>
              <div className={`text-sm font-medium ${cls.color}`}>{cls.label}</div>
              <div className="text-xs text-[#888] mt-0.5">{cls.duration}</div>
              <p className="text-xs text-[#666] mt-2">{cls.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Seal Expired Records */}
      <div className="bg-[#111] border border-[#222] rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-medium text-white">Seal Expired Records</h3>
            <p className="text-sm text-[#888]">
              Seal records whose retention period has expired. Sealed records are locked from modification and can only be viewed by ADMIN, SECURITY, COMPLIANCE, and LEGAL roles, with all access logged.
            </p>
          </div>
          <button
            onClick={handleSealExpired}
            disabled={sealing}
            className="px-4 py-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-lg text-sm hover:bg-amber-500/20 flex items-center gap-2 disabled:opacity-50"
          >
            <Archive className="w-4 h-4" />
            {sealing ? "Sealing..." : "Seal Expired"}
          </button>
        </div>
        {sealResult && (
          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-3 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span className="text-sm text-emerald-400">{sealResult.sealed_count} record(s) sealed</span>
          </div>
        )}
      </div>

      {/* Legal Holds */}
      <div className="bg-[#111] border border-[#222] rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-medium text-white">Active Legal Holds</h3>
            <p className="text-sm text-[#888]">Records under legal hold have their retention expiration suspended indefinitely.</p>
          </div>
        </div>
        {loadingHolds ? (
          <div className="text-center py-6 text-[#888] text-sm">Loading legal holds...</div>
        ) : legalHolds.length === 0 ? (
          <div className="text-center py-8">
            <Gavel className="w-10 h-10 mx-auto mb-3 text-[#444]" />
            <p className="text-sm text-[#888]">No active legal holds.</p>
            <p className="text-xs text-[#666] mt-1">Apply legal holds from the event detail view or via the Legal Holds page.</p>
          </div>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs text-[#888] uppercase tracking-wider border-b border-[#222]">
                  <th className="py-2 px-3">Matter Ref</th>
                  <th className="py-2 px-3">Object</th>
                  <th className="py-2 px-3">Reason</th>
                  <th className="py-2 px-3">Applied By</th>
                  <th className="py-2 px-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222]">
                {legalHolds.map((lh: any) => (
                  <tr key={lh.id} className="text-sm text-[#ccc]">
                    <td className="py-2 px-3 font-mono text-xs">{lh.matter_ref}</td>
                    <td className="py-2 px-3">{lh.object_type}:{lh.object_id?.substring(0, 12)}</td>
                    <td className="py-2 px-3 text-xs text-[#888]">{lh.reason}</td>
                    <td className="py-2 px-3 text-xs">{lh.applied_by?.substring(0, 12)}</td>
                    <td className="py-2 px-3 text-xs text-[#888]">{lh.created_at ? formatTimestamp(lh.created_at) : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Streaming Tab ─────────────────────────────────────────────────────────────

function StreamingTab() {
  const [subs, setSubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", endpoint_url: "", event_filters: "" });

  useEffect(() => {
    api.get("/api/audit-events/subscriptions")
      .then(res => { if (res.success) setSubs(res.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async () => {
    try {
      const res = await api.post("/api/audit-events/subscriptions", {
        name: form.name, endpoint_url: form.endpoint_url,
        event_filters: form.event_filters ? JSON.parse(form.event_filters) : {},
      });
      if (res.success) {
        setSubs(prev => [...prev, res.data]);
        setShowForm(false);
        setForm({ name: "", endpoint_url: "", event_filters: "" });
      }
    } catch { /* ignore */ }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/api/audit-events/subscriptions/${id}`);
      setSubs(prev => prev.filter(s => s.id !== id));
    } catch { /* ignore */ }
  };

  return (
    <div className="space-y-4">
      {/* Streaming Backlog Warning */}
      <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg px-4 py-3 flex items-start gap-3 text-xs">
        <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
        <div>
          <span className="text-amber-400 font-medium">Degraded Streaming</span>
          <span className="text-amber-300 ml-1">
            Events may be backlogged. 3 of {subs.length} subscriptions may be affected.
          </span>
          <p className="text-[#888] mt-0.5">Admin/Security review recommended if backlog persists.</p>
        </div>
      </div>

      <div className="bg-[#111] border border-[#222] rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-medium text-white">Real‑Time Event Streaming</h3>
            <p className="text-sm text-[#888]">
              Subscribe to audit events via SSE or webhook for real‑time monitoring, SIEM ingestion, and automated responses.
            </p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-lg text-sm hover:bg-amber-500/20 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> {showForm ? "Cancel" : "New Subscription"}
          </button>
        </div>

        {showForm && (
          <div className="bg-[#0a0a0a] border border-[#222] rounded-lg p-4 mb-4 space-y-3">
            <input
              placeholder="Subscription name"
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              className="w-full bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-sm text-white"
            />
            <input
              placeholder="Webhook endpoint URL"
              value={form.endpoint_url}
              onChange={e => setForm(p => ({ ...p, endpoint_url: e.target.value }))}
              className="w-full bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-sm text-white"
            />
            <input
              placeholder='Event filters (JSON, e.g. {"risk_levels":["critical","high"]})'
              value={form.event_filters}
              onChange={e => setForm(p => ({ ...p, event_filters: e.target.value }))}
              className="w-full bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-sm text-white font-mono"
            />
            <div className="flex gap-2 text-xs text-[#888]">
              <span className="px-2 py-1 bg-[#111] rounded">SSE: <code className="text-amber-400">GET /api/audit-events/subscribe</code></span>
              <span className="px-2 py-1 bg-[#111] rounded">Webhook: POST to your endpoint</span>
            </div>
            <button onClick={handleCreate} className="px-4 py-2 bg-amber-500 text-black rounded-lg text-sm font-medium hover:bg-amber-400">
              Create Subscription
            </button>
          </div>
        )}

        {loading ? (
          <div className="text-center py-8 text-[#888]">Loading subscriptions...</div>
        ) : subs.length === 0 ? (
          <div className="text-center py-8">
            <Wifi className="w-10 h-10 mx-auto mb-3 text-[#444]" />
            <p className="text-sm text-[#888]">No subscriptions configured.</p>
            <p className="text-xs text-[#666] mt-1">Create a webhook subscription or connect via SSE to start streaming audit events.</p>
          </div>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs text-[#888] uppercase tracking-wider border-b border-[#222]">
                  <th className="py-2 px-3">Name</th>
                  <th className="py-2 px-3">Type</th>
                  <th className="py-2 px-3">Endpoint</th>
                  <th className="py-2 px-3">Status</th>
                  <th className="py-2 px-3">Deliveries</th>
                  <th className="py-2 px-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222]">
                {subs.map((s: any) => (
                  <tr key={s.id} className="text-sm text-[#ccc]">
                    <td className="py-2 px-3">{s.name}</td>
                    <td className="py-2 px-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        s.subscription_type === 'webhook' ? 'text-blue-400 bg-blue-400/10' :
                        s.subscription_type === 'sse' ? 'text-emerald-400 bg-emerald-400/10' :
                        'text-purple-400 bg-purple-400/10'
                      }`}>{s.subscription_type}</span>
                    </td>
                    <td className="py-2 px-3 text-xs font-mono text-[#888]">{s.endpoint_url || "SSE (direct)"}</td>
                    <td className="py-2 px-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        s.status === 'ACTIVE' ? 'text-emerald-400 bg-emerald-400/10' : 'text-[#666] bg-[#222]'
                      }`}>{s.status}</span>
                    </td>
                    <td className="py-2 px-3 text-xs text-[#888]">{s.delivery_count || 0}</td>
                    <td className="py-2 px-3">
                      <button onClick={() => handleDelete(s.id)} className="text-red-400 hover:text-red-300 text-xs flex items-center gap-1">
                        <Trash2 className="w-3 h-3" /> Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Field Microcopy ──────────────────────────────────────────────────────────

const REDACTED_MARKER = "REDACTED_BY_ACCESS_POLICY";
const HASHED_MARKER_PREFIX = "hash:";

function FieldValue({ value, label }: { value: unknown; label?: string }) {
  if (value === undefined || value === null) return <span className="text-[#555]">-</span>;
  if (typeof value === "string" && value === REDACTED_MARKER) {
    return (
      <span className="inline-flex items-center gap-1 text-amber-500" title="This field has been redacted due to access control policy">
        <EyeOff className="w-3 h-3" />
        <span className="text-xs italic">Redacted</span>
      </span>
    );
  }
  if (typeof value === "string" && value.startsWith(HASHED_MARKER_PREFIX)) {
    const prefix = value.substring(0, 24);
    return (
      <span className="inline-flex items-center gap-1 text-orange-400" title="This field has been hashed for privacy protection">
        <ShieldOff className="w-3 h-3" />
        <span className="text-xs font-mono">{prefix}…</span>
      </span>
    );
  }
  if (typeof value === "string" && value === "SEALED_BY_RETENTION_POLICY") {
    return (
      <span className="inline-flex items-center gap-1 text-blue-400" title="This record has been sealed by retention policy">
        <Archive className="w-3 h-3" />
        <span className="text-xs italic">Sealed</span>
      </span>
    );
  }
  return <span className="text-[#ccc]">{String(value)}</span>;
}

// ─── Shared Sub-components ─────────────────────────────────────────────────────

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-[#111] border border-[#222] rounded-lg p-3" title={`${value} ${label}`}>
      <div className="text-[#888] text-xs font-medium uppercase tracking-wider">{label}</div>
      <div className={`text-lg font-bold ${color}`}>{value}</div>
    </div>
  );
}

function InfoRow({ label, children, value }: { label: string; children?: React.ReactNode; value?: string }) {
  return (
    <div>
      <span className="text-[#666]">{label}:</span>{" "}
      {children || <span className="text-[#ccc]">{value}</span>}
    </div>
  );
}
