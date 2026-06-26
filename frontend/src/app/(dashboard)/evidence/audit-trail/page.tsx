"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import {
  Activity, AlertTriangle, Search, X, RefreshCw,
} from "lucide-react";

interface AuditEvent {
  id: string;
  event_title: string;
  event_summary: string;
  event_type: string;
  timestamp_utc: string;
  actor: { actor_name?: string; actor_type: string; actor_id: string };
  object: { object_type: string; object_name?: string };
  risk_level: string;
  status: string;
  action?: { category?: string; type?: string };
  evidence_id?: string;
  forensic_case_id?: string;
  decision_id?: string;
  policy?: { policy_id?: string; version?: string };
}

const ACTOR_BADGE: Record<string, { label: string; cls: string }> = {
  ai_agent:       { label: "AI",  cls: "bg-purple-500/15 text-purple-300 border-purple-500/25" },
  human_user:     { label: "HU",  cls: "bg-blue-500/15 text-blue-300 border-blue-500/25" },
  workflow:       { label: "WF",  cls: "bg-green-500/15 text-green-300 border-green-500/25" },
  system:         { label: "SY",  cls: "bg-surface-hover text-foreground-muted border-border" },
  integration:    { label: "IN",  cls: "bg-cyan-500/15 text-cyan-300 border-cyan-500/25" },
  api_key:        { label: "API", cls: "bg-indigo-500/15 text-indigo-300 border-indigo-500/25" },
  service_account:{ label: "SVC", cls: "bg-teal-500/15 text-teal-300 border-teal-500/25" },
  governance:     { label: "PO",  cls: "bg-amber-500/15 text-amber-300 border-amber-500/25" },
  policy:         { label: "PO",  cls: "bg-amber-500/15 text-amber-300 border-amber-500/25" },
};

const RISK_BADGE: Record<string, { label: string; cls: string }> = {
  low:      { label: "LOW",  cls: "bg-transparent text-green-400 border-green-500/60" },
  medium:   { label: "MED",  cls: "bg-transparent text-yellow-400 border-yellow-500/60" },
  high:     { label: "HIGH", cls: "bg-transparent text-orange-400 border-orange-500/60" },
  critical: { label: "CRIT", cls: "bg-transparent text-red-400 border-red-500/60" },
};

function rowTint(ev: AuditEvent) {
  if (ev.risk_level === "critical") return "bg-red-500/5 border-red-500/15 hover:bg-red-500/10";
  if (ev.status === "failed")       return "bg-red-500/5 border-red-500/10 hover:bg-red-500/10";
  if (ev.status === "blocked")      return "bg-orange-500/5 border-orange-500/10 hover:bg-orange-500/10";
  if (ev.status === "escalated")    return "bg-amber-500/5 border-amber-500/10 hover:bg-amber-500/10";
  return "bg-surface border-border hover:bg-surface-hover";
}

function fmtShort(ts: string) {
  try {
    const d = new Date(ts);
    return {
      date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      time: d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }) + " UTC",
    };
  } catch { return { date: "—", time: "" }; }
}

// Canonical lookup — six sources per M1 spec §03
const EVENT_TYPE_MAP: Record<string, { category: string; type: string }> = {
  // Source A — Human Actions
  login:                      { category: "HUMAN_ACTIVITY",       type: "SESSION_LOGIN" },
  logout:                     { category: "HUMAN_ACTIVITY",       type: "SESSION_ENDED" },
  session_started:            { category: "HUMAN_ACTIVITY",       type: "SESSION_STARTED" },
  session_ended:              { category: "HUMAN_ACTIVITY",       type: "SESSION_ENDED" },
  campaign_created:           { category: "HUMAN_ACTIVITY",       type: "CAMPAIGN_CREATED" },
  campaign_edited:            { category: "HUMAN_ACTIVITY",       type: "CAMPAIGN_EDITED" },
  content_approved:           { category: "HUMAN_ACTIVITY",       type: "CONTENT_APPROVED" },
  content_rejected:           { category: "HUMAN_ACTIVITY",       type: "CONTENT_REJECTED" },
  permission_changed:         { category: "HUMAN_ACTIVITY",       type: "PERMISSION_CHANGED" },
  evidence_exported:          { category: "HUMAN_ACTIVITY",       type: "EVIDENCE_EXPORTED" },
  policy_warning_overridden:  { category: "HUMAN_ACTIVITY",       type: "POLICY_OVERRIDE" },
  content_published:          { category: "HUMAN_ACTIVITY",       type: "CONTENT_PUBLISHED" },
  // Source B — AI Agent Actions
  agent_content_generated:    { category: "AGENT_ACTIVITY",       type: "CONTENT_GENERATED" },
  content_generated:          { category: "AGENT_ACTIVITY",       type: "CONTENT_GENERATED" },
  brand_risk_flagged:         { category: "AGENT_ACTIVITY",       type: "BRAND_RISK_FLAGGED" },
  policy_review_triggered:    { category: "AGENT_ACTIVITY",       type: "POLICY_REVIEW_TRIGGERED" },
  approval_requested:         { category: "AGENT_ACTIVITY",       type: "APPROVAL_REQUESTED" },
  autonomy_limit_reached:     { category: "AGENT_ACTIVITY",       type: "AUTONOMY_LIMIT_REACHED" },
  prompt_version_used:        { category: "AGENT_ACTIVITY",       type: "PROMPT_VERSION_USED" },
  hitl_handoff:               { category: "AGENT_ACTIVITY",       type: "HITL_HANDOFF" },
  // Source C — Workflow Actions
  approval_workflow_started:  { category: "WORKFLOW_ACTIVITY",    type: "WORKFLOW_STARTED" },
  workflow_started:           { category: "WORKFLOW_ACTIVITY",    type: "WORKFLOW_STARTED" },
  reviewer_assigned:          { category: "WORKFLOW_ACTIVITY",    type: "REVIEWER_ASSIGNED" },
  sla_timer:                  { category: "WORKFLOW_ACTIVITY",    type: "SLA_TIMER" },
  sla_breach:                 { category: "WORKFLOW_ACTIVITY",    type: "SLA_BREACH" },
  workflow_escalated:         { category: "WORKFLOW_ACTIVITY",    type: "WORKFLOW_ESCALATED" },
  state_transition:           { category: "WORKFLOW_ACTIVITY",    type: "STATE_TRANSITION" },
  workflow_paused:            { category: "WORKFLOW_ACTIVITY",    type: "WORKFLOW_PAUSED" },
  workflow_resumed:           { category: "WORKFLOW_ACTIVITY",    type: "WORKFLOW_RESUMED" },
  workflow_completed:         { category: "WORKFLOW_ACTIVITY",    type: "WORKFLOW_COMPLETED" },
  // Source D — Governance & Policy
  restricted_term_detected:   { category: "POLICY_ACTIVITY",     type: "RESTRICTED_TERM_DETECTED" },
  brand_rule_triggered:       { category: "POLICY_ACTIVITY",     type: "BRAND_RULE_TRIGGERED" },
  jurisdiction_rule_applied:  { category: "POLICY_ACTIVITY",     type: "JURISDICTION_RULE_APPLIED" },
  regulated_content_warning:  { category: "POLICY_ACTIVITY",     type: "REGULATED_CONTENT_WARNING" },
  autonomy_threshold_exceeded:{ category: "POLICY_ACTIVITY",     type: "AUTONOMY_THRESHOLD_EXCEEDED" },
  publishing_blocked:         { category: "POLICY_ACTIVITY",     type: "PUBLISHING_BLOCKED" },
  compliance_hold_applied:    { category: "POLICY_ACTIVITY",     type: "COMPLIANCE_HOLD_APPLIED" },
  // Source E — Integration & API
  platform_connected:         { category: "INTEGRATION_ACTIVITY", type: "PLATFORM_CONNECTED" },
  token_refreshed:            { category: "INTEGRATION_ACTIVITY", type: "TOKEN_REFRESHED" },
  token_expired:              { category: "INTEGRATION_ACTIVITY", type: "TOKEN_EXPIRED" },
  publish_confirmed:          { category: "INTEGRATION_ACTIVITY", type: "PUBLISH_CONFIRMED" },
  publish_failed:             { category: "INTEGRATION_ACTIVITY", type: "PUBLISH_FAILED" },
  webhook_received:           { category: "INTEGRATION_ACTIVITY", type: "WEBHOOK_RECEIVED" },
  webhook_failed:             { category: "INTEGRATION_ACTIVITY", type: "WEBHOOK_FAILED" },
  crm_sync_completed:         { category: "INTEGRATION_ACTIVITY", type: "CRM_SYNC_COMPLETED" },
  api_key_created:            { category: "INTEGRATION_ACTIVITY", type: "API_KEY_CREATED" },
  data_imported:              { category: "INTEGRATION_ACTIVITY", type: "DATA_IMPORTED" },
  data_exported:              { category: "INTEGRATION_ACTIVITY", type: "DATA_EXPORTED" },
  // Source F — System Actions
  scheduled_job_completed:    { category: "SYSTEM_ACTIVITY",     type: "SCHEDULED_JOB_COMPLETED" },
  evidence_snapshot_generated:{ category: "SYSTEM_ACTIVITY",     type: "EVIDENCE_SNAPSHOT_GENERATED" },
  policy_version_updated:     { category: "SYSTEM_ACTIVITY",     type: "POLICY_VERSION_UPDATED" },
  model_version_changed:      { category: "SYSTEM_ACTIVITY",     type: "MODEL_VERSION_CHANGED" },
  failed_auth_detected:       { category: "SYSTEM_ACTIVITY",     type: "FAILED_AUTH_DETECTED" },
  permission_recalculated:    { category: "SYSTEM_ACTIVITY",     type: "PERMISSION_RECALCULATED" },
  retention_rule_applied:     { category: "SYSTEM_ACTIVITY",     type: "RETENTION_RULE_APPLIED" },
};

// Actor-type → canonical source category fallback
const ACTOR_CATEGORY: Record<string, string> = {
  human:       "HUMAN_ACTIVITY",
  ai_agent:    "AGENT_ACTIVITY",
  workflow:    "WORKFLOW_ACTIVITY",
  governance:  "POLICY_ACTIVITY",
  policy:      "POLICY_ACTIVITY",
  integration: "INTEGRATION_ACTIVITY",
  api:         "INTEGRATION_ACTIVITY",
  system:      "SYSTEM_ACTIVITY",
};

function deriveCategory(ev: AuditEvent): string {
  if (ev.action?.category) return ev.action.category;
  const key = (ev.event_type || "").toLowerCase().replace(/ /g, "_");
  if (EVENT_TYPE_MAP[key]) return EVENT_TYPE_MAP[key].category;
  if (ev.actor?.actor_type && ACTOR_CATEGORY[ev.actor.actor_type]) return ACTOR_CATEGORY[ev.actor.actor_type];
  const t = key.toUpperCase();
  if (t.includes("AGENT"))  return "AGENT_ACTIVITY";
  if (t.includes("APPROV") || t.includes("APPROVED")) return "HUMAN_ACTIVITY";
  if (t.includes("WORKFLOW")) return "WORKFLOW_ACTIVITY";
  if (t.includes("INTEGR") || t.includes("PUBLISH") || t.includes("WEBHOOK") || t.includes("TOKEN")) return "INTEGRATION_ACTIVITY";
  if (t.includes("SYSTEM") || t.includes("AUTH") || t.includes("LOGIN")) return "SYSTEM_ACTIVITY";
  if (t.includes("POLICY") || t.includes("RULE") || t.includes("BLOCK") || t.includes("BRAND") || t.includes("COMPLIANCE")) return "POLICY_ACTIVITY";
  return "HUMAN_ACTIVITY";
}

function deriveType(ev: AuditEvent): string {
  if (ev.action?.type) return ev.action.type;
  const key = (ev.event_type || "").toLowerCase().replace(/ /g, "_");
  if (EVENT_TYPE_MAP[key]) return EVENT_TYPE_MAP[key].type;
  return ev.event_type?.toUpperCase().replace(/ /g, "_") || "ACTION";
}

function subContext(ev: AuditEvent): string | null {
  if (ev.policy?.policy_id) return `${ev.policy.policy_id}${ev.policy.version ? ` ${ev.policy.version}` : ""}`;
  if (ev.decision_id) return `links ${ev.decision_id}`;
  if (ev.status === "failed") return "reconnect required";
  if (ev.status === "blocked") return "review required";
  if (ev.status === "escalated") return "security review recommended";
  return null;
}

export default function AuditTrailPage() {
  const router = useRouter();
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [actorFilter, setActorFilter] = useState("");

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (search) p.set("search", search);
      if (riskFilter) p.set("risk_level", riskFilter);
      if (statusFilter) p.set("status", statusFilter);
      if (actorFilter) p.set("actor_type", actorFilter);
      p.set("limit", "100");
      const res = await api.get(`/api/audit-events?${p}`);
      if (res.success) {
        const evs = res.data?.events || [];
        setEvents(evs);
        setTotal(res.data?.total ?? res.total ?? evs.length);
      }
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [search, riskFilter, statusFilter, actorFilter]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const highRisk    = events.filter(e => e.risk_level === "high" || e.risk_level === "critical").length;
  const blocked     = events.filter(e => e.status === "blocked").length;
  const failed      = events.filter(e => e.status === "failed").length;
  const escalated   = events.filter(e => e.status === "escalated").length;
  const agentActions = events.filter(e => e.actor?.actor_type === "ai_agent").length;

  const sorted = [...events].sort((a, b) => {
    const score = (e: AuditEvent) => {
      if (e.risk_level === "critical") return 4;
      if (e.risk_level === "high") return 3;
      if (e.status === "failed" || e.status === "blocked") return 2;
      if (e.risk_level === "medium") return 1;
      return 0;
    };
    const ds = score(b) - score(a);
    if (ds !== 0) return ds;
    return new Date(b.timestamp_utc).getTime() - new Date(a.timestamp_utc).getTime();
  });

  const hasFilters = !!(search || riskFilter || statusFilter || actorFilter);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-400" /> Audit Trail
          </h1>
          <p className="text-xs text-foreground-muted mt-0.5">
            Immutable hash-chained record of every event across ZoikoVertex
          </p>
        </div>
        <button
          onClick={fetchEvents}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-surface border border-border rounded-lg hover:bg-surface-hover text-foreground-muted"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          <p className="text-xs text-red-400 flex-1">{error}</p>
          <button onClick={() => setError(null)}><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* Metrics Bar */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-px mb-5 bg-border rounded-xl overflow-hidden border border-border">
        {[
          { label: "TOTAL EVENTS",  value: total || events.length, cls: "text-foreground" },
          { label: "HIGH RISK",     value: highRisk,               cls: "text-orange-400" },
          { label: "BLOCKED",       value: blocked,                cls: "text-orange-400" },
          { label: "FAILED",        value: failed,                 cls: "text-red-400" },
          { label: "ESCALATED",     value: escalated,              cls: "text-amber-400" },
          { label: "AGENT ACTIONS", value: agentActions,           cls: "text-purple-400" },
        ].map(m => (
          <div key={m.label} className="bg-surface px-3 py-4 text-center">
            <p className={`text-2xl font-bold tracking-tight ${m.cls}`}>{m.value.toLocaleString()}</p>
            <p className="text-[9px] tracking-widest uppercase text-foreground-muted mt-1">{m.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground-muted" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search events…"
            className="bg-surface border border-border rounded-lg pl-8 pr-8 py-1.5 text-xs text-foreground w-44"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2">
              <X className="w-3 h-3 text-foreground-muted" />
            </button>
          )}
        </div>
        <select
          value={riskFilter}
          onChange={e => setRiskFilter(e.target.value)}
          className="bg-surface border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground"
        >
          <option value="">All Risk</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="bg-surface border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground"
        >
          <option value="">All Status</option>
          <option value="completed">Completed</option>
          <option value="blocked">Blocked</option>
          <option value="failed">Failed</option>
          <option value="escalated">Escalated</option>
          <option value="pending">Pending</option>
          <option value="reversed">Reversed</option>
        </select>
        <select
          value={actorFilter}
          onChange={e => setActorFilter(e.target.value)}
          className="bg-surface border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground"
        >
          <option value="">All Actors</option>
          <option value="human_user">Human</option>
          <option value="ai_agent">AI Agent</option>
          <option value="service_account">Service Account</option>
          <option value="workflow">Workflow</option>
          <option value="system">System</option>
          <option value="api_key">API Key</option>
        </select>
        {hasFilters && (
          <button
            onClick={() => { setSearch(""); setRiskFilter(""); setStatusFilter(""); setActorFilter(""); }}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-foreground-muted hover:text-foreground"
          >
            <X className="w-3 h-3" /> Clear
          </button>
        )}
      </div>

      {/* Timeline */}
      <div className="space-y-1">
        {loading ? (
          <div className="py-12 text-center text-xs text-foreground-muted">Loading…</div>
        ) : sorted.length === 0 ? (
          <div className="py-16 text-center text-foreground-muted">
            <Activity className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No events found</p>
          </div>
        ) : (
          sorted.map(ev => {
            const actor = ACTOR_BADGE[ev.actor?.actor_type] ?? {
              label: (ev.actor?.actor_type || "SY").substring(0, 3).toUpperCase(),
              cls: "bg-surface-hover text-foreground-muted border-border",
            };
            const risk = RISK_BADGE[ev.risk_level] ?? RISK_BADGE.low;
            const { date, time } = fmtShort(ev.timestamp_utc);
            const category = deriveCategory(ev);
            const type = deriveType(ev);
            const ctx = subContext(ev);

            return (
              <button
                key={ev.id}
                onClick={() => router.push(`/evidence/audit-trail/events/${ev.id}`)}
                className={`w-full flex items-start gap-3 px-4 py-3 rounded-lg text-left transition-colors border ${rowTint(ev)}`}
              >
                {/* Timestamp */}
                <div className="shrink-0 text-right min-w-[64px] pt-0.5">
                  <p className="text-[10px] text-foreground-muted">{date}</p>
                  <p className="text-[10px] text-foreground-muted/60">{time}</p>
                </div>

                {/* Actor badge */}
                <div className={`shrink-0 mt-0.5 px-1.5 py-0.5 rounded border text-[10px] font-mono font-semibold ${actor.cls}`}>
                  {actor.label}
                </div>

                {/* Event content */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium leading-snug ${ev.risk_level === "critical" ? "text-red-300" : "text-foreground"}`}>
                    {ev.event_title || ev.event_type?.replace(/_/g, " ")}
                  </p>
                  {ev.event_summary && (
                    <p className="text-xs text-foreground-muted mt-0.5 line-clamp-1">{ev.event_summary}</p>
                  )}
                  <p className="text-[10px] text-foreground-muted/60 mt-1 font-mono">
                    {category} · {type}{ctx ? ` · ${ctx}` : ""}
                  </p>
                </div>

                {/* Risk badge */}
                <div className={`shrink-0 mt-0.5 px-2.5 py-1 rounded border text-[10px] font-bold tracking-wider ${risk.cls}`}>
                  {risk.label}
                </div>

              </button>
            );
          })
        )}
      </div>

    </div>
  );
}
