"use client";

import {
  Layers, CheckCircle2, AlertCircle, Zap, DollarSign, BarChart3,
  ClipboardList, ShieldAlert, FileSearch, Shield, BookOpen, Fingerprint,
  Users, ChevronRight, Bot, MonitorPlay, GitBranch, MessageSquareCode,
  Cpu, Database, Webhook, Link2, HeartPulse, Lock, Eye,
} from "lucide-react";
import { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useRoleContext } from "@/lib/context/RoleContext";

// Mirror backend guard role sets exactly
const CAMPAIGN_ROLES = new Set([
  'ADMIN','WORKSPACE_OWNER','CAMPAIGN_MANAGER','MANAGER','CREATOR','PUBLISHER',
  'ANALYST','VIEWER','EXTERNAL_COLLABORATOR',
]);
const REVIEW_ROLES = new Set([
  'ADMIN','WORKSPACE_OWNER','REVIEWER','VALIDATOR','APPROVER',
  'BRAND_REVIEWER','COMPLIANCE_REVIEWER',
]);
const AUDIT_ROLES = new Set([
  'ADMIN','WORKSPACE_OWNER','GOVERNANCE_ADMIN','KNOWLEDGE_MANAGER',
  'VALIDATOR','COMPLIANCE_REVIEWER','AUDITOR',
]);
const SAFETY_ROLES = new Set([
  'ADMIN','WORKSPACE_OWNER','BRAND_REVIEWER','COMPLIANCE_REVIEWER','SECURITY_ADMIN',
]);

// ── Shared components ──────────────────────────────────────────────────────

function StatCard({ label, value, sub, Icon, iconBg, iconColor }: {
  label: string; value: string | number; sub: string | null;
  Icon: React.ElementType; iconBg: string; iconColor: string;
}) {
  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-[var(--card-border)] transition-all duration-300 group">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-2 ${iconBg} rounded-lg group-hover:scale-110 transition-transform duration-300`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
        {sub && (
          <span className="text-xs text-[var(--foreground-muted)] bg-[var(--surface)] px-2 py-1 rounded-full">
            {sub}
          </span>
        )}
      </div>
      <h3 className="text-[var(--foreground-muted)] text-sm font-medium mb-1">{label}</h3>
      <p className="text-3xl font-bold text-[var(--foreground)] tabular-nums">{value}</p>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 animate-pulse">
      <div className="flex justify-between mb-4">
        <div className="w-9 h-9 bg-[var(--border)] rounded-lg" />
        <div className="w-20 h-5 bg-[var(--border)] rounded-full" />
      </div>
      <div className="w-24 h-3 bg-[var(--border)] rounded mb-3" />
      <div className="w-16 h-8 bg-[var(--border)] rounded" />
    </div>
  );
}

function QuickLinkCard({ href, label, description, Icon }: {
  href: string; label: string; description: string; Icon: React.ElementType;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-4 bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-[var(--card-border)] transition-all duration-300 group"
    >
      <div className="p-3 bg-info-bg rounded-xl group-hover:scale-110 transition-transform duration-300 shrink-0">
        <Icon className="w-5 h-5 text-info-text" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[var(--foreground)] truncate">{label}</p>
        <p className="text-xs text-[var(--foreground-muted)] mt-0.5 truncate">{description}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-[var(--foreground-muted)] shrink-0 group-hover:translate-x-0.5 transition-transform" />
    </Link>
  );
}

// ── Campaign section ───────────────────────────────────────────────────────

interface CampaignStats {
  total: number; draft: number; in_review: number; approval_pending: number;
  active: number; paused: number; completed: number; risk_flags: number;
  budget_allocated: number; spend_recorded: number; needs_action: number;
}

function CampaignSection() {
  const [campaigns, setCampaigns] = useState<CampaignStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/v1/campaigns/stats')
      .then(res => { if (res.success) setCampaigns(res.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const statusBars = campaigns ? [
    { label: 'Draft',            count: campaigns.draft,            color: 'bg-slate-500' },
    { label: 'In Review',        count: campaigns.in_review,        color: 'bg-info-text' },
    { label: 'Approval Pending', count: campaigns.approval_pending, color: 'bg-warning-text' },
    { label: 'Active',           count: campaigns.active,           color: 'bg-success-text' },
    { label: 'Paused',           count: campaigns.paused,           color: 'bg-warning-text' },
    { label: 'Completed',        count: campaigns.completed,        color: 'bg-info-text' },
  ] : [];
  const maxCount = Math.max(...statusBars.map(b => b.count), 1);
  const spendPct = campaigns && campaigns.budget_allocated > 0
    ? Math.min((campaigns.spend_recorded / campaigns.budget_allocated) * 100, 100) : 0;

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)] mb-2">Social Performance</h1>
        <p className="text-[var(--foreground-muted)] text-sm">Campaign lifecycle overview — publishing activity, budget burn, and approval queue.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : campaigns ? (
          <>
            <StatCard label="Total Campaigns"  value={campaigns.total}            sub={`${campaigns.active} active`}                                                          Icon={Layers}       iconBg="bg-info-bg"    iconColor="text-info-text"    />
            <StatCard label="Completed"        value={campaigns.completed}        sub={null}                                                                                   Icon={CheckCircle2} iconBg="bg-success-bg" iconColor="text-success-text" />
            <StatCard label="Pending Approval" value={campaigns.approval_pending} sub={campaigns.needs_action > 0 ? `${campaigns.needs_action} need action` : null}           Icon={AlertCircle}  iconBg="bg-warning-bg" iconColor="text-warning-text" />
            <StatCard label="Risk Flags"       value={campaigns.risk_flags}       sub={null}                                                                                   Icon={Zap}          iconBg="bg-error-bg"   iconColor="text-error-text"   />
          </>
        ) : null}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[var(--card)] border border-[var(--border)] rounded-2xl p-8 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 className="w-5 h-5 text-info-text" />
            <div>
              <h2 className="text-lg font-bold text-[var(--foreground)]">Status Distribution</h2>
              <p className="text-xs text-[var(--foreground-muted)] mt-0.5">Campaign count by lifecycle stage</p>
            </div>
          </div>
          {loading ? (
            <div className="space-y-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="flex justify-between mb-1.5">
                    <div className="w-32 h-3 bg-[var(--border)] rounded" />
                    <div className="w-6 h-3 bg-[var(--border)] rounded" />
                  </div>
                  <div className="h-2 bg-[var(--border)] rounded-full" />
                </div>
              ))}
            </div>
          ) : campaigns ? (
            <div className="space-y-5">
              {statusBars.map(bar => (
                <div key={bar.label}>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-sm font-medium text-[var(--foreground-muted)]">{bar.label}</span>
                    <span className="text-sm font-bold text-[var(--foreground)] tabular-nums">{bar.count}</span>
                  </div>
                  <div className="h-2 bg-[var(--surface)] rounded-full overflow-hidden">
                    <div
                      className={`h-full ${bar.color} rounded-full transition-all duration-700`}
                      style={{ width: `${Math.max((bar.count / maxCount) * 100, bar.count > 0 ? 3 : 0)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--foreground-muted)] italic text-center py-8">No data.</p>
          )}
        </div>

        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-8 shadow-sm flex flex-col gap-6">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-success-text" />
            <div>
              <h2 className="text-lg font-bold text-[var(--foreground)]">Budget Tracker</h2>
              <p className="text-xs text-[var(--foreground-muted)] mt-0.5">Spend vs allocation</p>
            </div>
          </div>
          {loading ? (
            <div className="space-y-4 animate-pulse">
              <div className="w-full h-8 bg-[var(--border)] rounded" />
              <div className="w-full h-2 bg-[var(--border)] rounded-full" />
            </div>
          ) : campaigns ? (
            <>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-xs text-[var(--foreground-muted)]">Spend Recorded</span>
                  <span className="text-xs font-bold text-[var(--foreground)]">${campaigns.spend_recorded.toLocaleString()}</span>
                </div>
                <div className="flex justify-between mb-3">
                  <span className="text-xs text-[var(--foreground-muted)]">Budget Allocated</span>
                  <span className="text-xs font-bold text-[var(--foreground)]">${campaigns.budget_allocated.toLocaleString()}</span>
                </div>
                <div className="h-3 bg-[var(--surface)] rounded-full overflow-hidden">
                  <div className="h-full bg-success-text rounded-full transition-all duration-1000" style={{ width: `${spendPct}%` }} />
                </div>
                <div className="flex justify-between mt-1.5">
                  <span className="text-xs text-[var(--foreground-muted)]">Utilization</span>
                  <span className="text-xs font-bold text-success-text">{spendPct.toFixed(1)}%</span>
                </div>
              </div>
              <div className="border-t border-[var(--border)] pt-4">
                <p className="text-xl font-bold text-[var(--foreground)] tabular-nums mb-1">
                  ${(campaigns.budget_allocated - campaigns.spend_recorded).toLocaleString()}
                </p>
                <p className="text-xs text-[var(--foreground-muted)]">Remaining budget across all campaigns</p>
              </div>
              <div className="space-y-3 pt-1">
                {[
                  { label: 'Risk Flags',   value: campaigns.risk_flags,   color: 'text-error-text' },
                  { label: 'Needs Action', value: campaigns.needs_action, color: 'text-warning-text' },
                  { label: 'In Review',    value: campaigns.in_review,    color: 'text-info-text' },
                ].map(item => (
                  <div key={item.label} className="flex justify-between items-center">
                    <span className="text-xs text-[var(--foreground-muted)]">{item.label}</span>
                    <span className={`text-xs font-bold ${item.color} tabular-nums`}>{item.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-[var(--foreground-muted)] italic">Budget data unavailable.</p>
          )}
        </div>
      </div>
    </>
  );
}

// ── Review Queue section ───────────────────────────────────────────────────

interface ReviewStats {
  pending_review: number; assigned_to_me: number; high_critical_risk: number;
  awaiting_revision: number; escalated: number; approved: number;
  rejected: number; released: number; critical_overdue: number;
}

function ReviewSection() {
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/v1/review-queue/stats')
      .then(res => { if (res.success) setStats(res.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const total = stats ? stats.approved + stats.rejected + stats.released + stats.pending_review + stats.awaiting_revision : 1;
  const statusBars = stats ? [
    { label: 'Pending Review',    count: stats.pending_review,    color: 'bg-warning-text' },
    { label: 'Awaiting Revision', count: stats.awaiting_revision, color: 'bg-info-text' },
    { label: 'Escalated',         count: stats.escalated,         color: 'bg-error-text' },
    { label: 'Approved',          count: stats.approved,          color: 'bg-success-text' },
    { label: 'Rejected',          count: stats.rejected,          color: 'bg-slate-500' },
  ] : [];
  const maxCount = Math.max(...statusBars.map(b => b.count), 1);

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)] mb-2">Review Dashboard</h1>
        <p className="text-[var(--foreground-muted)] text-sm">Your review queue workload — pending items, risk levels, and completion status.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : stats ? (
          <>
            <StatCard label="Pending Review"     value={stats.pending_review}    sub={stats.critical_overdue > 0 ? `${stats.critical_overdue} critical overdue` : null} Icon={ClipboardList}  iconBg="bg-warning-bg" iconColor="text-warning-text" />
            <StatCard label="Assigned To Me"     value={stats.assigned_to_me}    sub={null}                                                                              Icon={Users}          iconBg="bg-info-bg"    iconColor="text-info-text"    />
            <StatCard label="High / Critical"    value={stats.high_critical_risk} sub={null}                                                                             Icon={Zap}            iconBg="bg-error-bg"   iconColor="text-error-text"   />
            <StatCard label="Awaiting Revision"  value={stats.awaiting_revision} sub={null}                                                                              Icon={AlertCircle}    iconBg="bg-warning-bg" iconColor="text-warning-text" />
          </>
        ) : null}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[var(--card)] border border-[var(--border)] rounded-2xl p-8 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 className="w-5 h-5 text-info-text" />
            <div>
              <h2 className="text-lg font-bold text-[var(--foreground)]">Queue Status</h2>
              <p className="text-xs text-[var(--foreground-muted)] mt-0.5">Item count by review stage</p>
            </div>
          </div>
          {loading ? (
            <div className="space-y-5">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="flex justify-between mb-1.5">
                    <div className="w-32 h-3 bg-[var(--border)] rounded" />
                    <div className="w-6 h-3 bg-[var(--border)] rounded" />
                  </div>
                  <div className="h-2 bg-[var(--border)] rounded-full" />
                </div>
              ))}
            </div>
          ) : stats ? (
            <div className="space-y-5">
              {statusBars.map(bar => (
                <div key={bar.label}>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-sm font-medium text-[var(--foreground-muted)]">{bar.label}</span>
                    <span className="text-sm font-bold text-[var(--foreground)] tabular-nums">{bar.count}</span>
                  </div>
                  <div className="h-2 bg-[var(--surface)] rounded-full overflow-hidden">
                    <div
                      className={`h-full ${bar.color} rounded-full transition-all duration-700`}
                      style={{ width: `${Math.max((bar.count / maxCount) * 100, bar.count > 0 ? 3 : 0)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--foreground-muted)] italic text-center py-8">No data.</p>
          )}
        </div>

        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-8 shadow-sm flex flex-col gap-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-5 h-5 text-success-text" />
            <div>
              <h2 className="text-lg font-bold text-[var(--foreground)]">Outcomes</h2>
              <p className="text-xs text-[var(--foreground-muted)] mt-0.5">Final decisions across all items</p>
            </div>
          </div>
          {loading ? (
            <div className="space-y-3 animate-pulse">
              {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-6 bg-[var(--border)] rounded" />)}
            </div>
          ) : stats ? (
            <div className="space-y-4 pt-1">
              {[
                { label: 'Approved',  value: stats.approved,  color: 'text-success-text' },
                { label: 'Rejected',  value: stats.rejected,  color: 'text-error-text' },
                { label: 'Released',  value: stats.released,  color: 'text-info-text' },
                { label: 'Escalated', value: stats.escalated, color: 'text-warning-text' },
              ].map(item => (
                <div key={item.label} className="flex justify-between items-center">
                  <span className="text-sm text-[var(--foreground-muted)]">{item.label}</span>
                  <span className={`text-sm font-bold tabular-nums ${item.color}`}>{item.value}</span>
                </div>
              ))}
              <div className="border-t border-[var(--border)] pt-3 mt-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[var(--foreground-muted)]">Total Items</span>
                  <span className="text-sm font-bold text-[var(--foreground)] tabular-nums">{total}</span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-[var(--foreground-muted)] italic">No outcome data.</p>
          )}
        </div>
      </div>
    </>
  );
}

// ── Audit Trail section ────────────────────────────────────────────────────

interface AuditStats {
  total_events: number; events_today: number; critical_events: number;
  high_risk_events: number; ai_events: number; preserved_events: number;
  legal_hold_events: number; failed_events: number; chain_status: string;
  last_event_at: string | null;
}

function AuditSection() {
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/v1/evidence/audit-trail/events/stats')
      .then(res => { if (res.success) setStats(res.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const chainOk = stats?.chain_status === 'intact';

  if (!loading && !stats) return null;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)] mb-2">Audit Overview</h1>
        <p className="text-[var(--foreground-muted)] text-sm">Immutable event trail — integrity status, risk counts, and preservation metrics.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : stats ? (
          <>
            <StatCard label="Total Events"   value={stats.total_events.toLocaleString()}  sub={`${stats.events_today} today`}                            Icon={FileSearch}   iconBg="bg-info-bg"    iconColor="text-info-text"    />
            <StatCard label="Critical"       value={stats.critical_events}                sub={stats.high_risk_events > 0 ? `${stats.high_risk_events} high risk` : null} Icon={Zap}          iconBg="bg-error-bg"   iconColor="text-error-text"   />
            <StatCard label="AI Events"      value={stats.ai_events.toLocaleString()}     sub={null}                                                     Icon={Bot}          iconBg="bg-warning-bg" iconColor="text-warning-text" />
            <StatCard label="Preserved"      value={stats.preserved_events.toLocaleString()} sub={stats.legal_hold_events > 0 ? `${stats.legal_hold_events} on legal hold` : null} Icon={Shield} iconBg="bg-success-bg" iconColor="text-success-text" />
          </>
        ) : null}
      </div>

      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-[var(--card)] border border-[var(--border)] rounded-2xl p-8 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <BarChart3 className="w-5 h-5 text-info-text" />
              <div>
                <h2 className="text-lg font-bold text-[var(--foreground)]">Event Breakdown</h2>
                <p className="text-xs text-[var(--foreground-muted)] mt-0.5">Distribution by type and status</p>
              </div>
            </div>
            <div className="space-y-5">
              {[
                { label: 'High Risk',  count: stats.high_risk_events,  color: 'bg-error-text' },
                { label: 'AI Events',  count: stats.ai_events,         color: 'bg-warning-text' },
                { label: 'Preserved',  count: stats.preserved_events,  color: 'bg-success-text' },
                { label: 'Failed',     count: stats.failed_events,     color: 'bg-slate-500' },
                { label: 'Legal Hold', count: stats.legal_hold_events, color: 'bg-info-text' },
              ].map(bar => {
                const maxBar = Math.max(stats.high_risk_events, stats.ai_events, stats.preserved_events, stats.failed_events, stats.legal_hold_events, 1);
                return (
                  <div key={bar.label}>
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-sm font-medium text-[var(--foreground-muted)]">{bar.label}</span>
                      <span className="text-sm font-bold text-[var(--foreground)] tabular-nums">{bar.count}</span>
                    </div>
                    <div className="h-2 bg-[var(--surface)] rounded-full overflow-hidden">
                      <div
                        className={`h-full ${bar.color} rounded-full transition-all duration-700`}
                        style={{ width: `${Math.max((bar.count / maxBar) * 100, bar.count > 0 ? 3 : 0)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-8 shadow-sm flex flex-col gap-4">
            <div className="flex items-center gap-2 mb-2">
              <Shield className={`w-5 h-5 ${chainOk ? 'text-success-text' : 'text-error-text'}`} />
              <div>
                <h2 className="text-lg font-bold text-[var(--foreground)]">Chain Integrity</h2>
                <p className="text-xs text-[var(--foreground-muted)] mt-0.5">Hash-chain verification status</p>
              </div>
            </div>
            <div className={`rounded-xl px-4 py-3 ${chainOk ? 'bg-success-bg' : 'bg-error-bg'}`}>
              <p className={`text-sm font-bold ${chainOk ? 'text-success-text' : 'text-error-text'}`}>
                {chainOk ? 'Chain Intact' : 'Chain Broken'}
              </p>
              <p className="text-xs text-[var(--foreground-muted)] mt-0.5 capitalize">{stats.chain_status}</p>
            </div>
            <div className="space-y-3 pt-2">
              {[
                { label: 'Total Events',  value: stats.total_events.toLocaleString(),  color: 'text-[var(--foreground)]' },
                { label: "Today's Events", value: stats.events_today,                  color: 'text-info-text' },
                { label: 'Critical',       value: stats.critical_events,               color: 'text-error-text' },
                { label: 'Failed',         value: stats.failed_events,                 color: 'text-warning-text' },
              ].map(item => (
                <div key={item.label} className="flex justify-between items-center">
                  <span className="text-sm text-[var(--foreground-muted)]">{item.label}</span>
                  <span className={`text-sm font-bold tabular-nums ${item.color}`}>{item.value}</span>
                </div>
              ))}
            </div>
            {stats.last_event_at && (
              <div className="border-t border-[var(--border)] pt-3 mt-1">
                <p className="text-xs text-[var(--foreground-muted)]">Last event</p>
                <p className="text-xs font-medium text-[var(--foreground)] mt-0.5">
                  {new Date(stats.last_event_at).toLocaleString()}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Security quick links section ───────────────────────────────────────────

function SecuritySection() {
  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)] mb-2">Security Overview</h1>
        <p className="text-[var(--foreground-muted)] text-sm">Your security operations panels — safety monitoring, forensic investigation, and identity management.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <QuickLinkCard href="/governance/safety"        label="Safety Overview"  description="Risk monitoring, brand safety flags, policy alerts"          Icon={ShieldAlert}  />
        <QuickLinkCard href="/evidence/forensic-hub"   label="Forensic Hub"     description="Investigate flagged events and escalated incidents"          Icon={Fingerprint}  />
        <QuickLinkCard href="/evidence/identity-ledger" label="Identity Ledger"  description="Actor registry, delegations, break-glass audit"             Icon={Lock}         />
        <QuickLinkCard href="/team"                    label="Users & Access"   description="Manage workspace users, roles, and permissions"              Icon={Users}        />
        <QuickLinkCard href="/admin/security"          label="Security Settings" description="Authentication, session policy, and security configuration" Icon={Shield}       />
      </div>
    </>
  );
}

// ── Welcome / quick links for roles with no primary data section ───────────

const ROLE_LINKS: Record<string, { href: string; label: string; description: string; Icon: React.ElementType }[]> = {
  KNOWLEDGE_MANAGER: [
    { href: '/agents/studio',    label: 'Agent Studio',   description: 'View agents (read-only access)',                   Icon: Bot     },
    { href: '/agents/knowledge', label: 'Knowledge Base', description: 'Manage RAG knowledge sources and vector stores',   Icon: BookOpen },
    { href: '/evidence/audit-trail', label: 'Audit Trail', description: 'Review immutable event history',                 Icon: FileSearch },
  ],
  MANAGER: [],
  DEVELOPER: [
    { href: '/accounts',          label: 'Platform Accounts',  description: 'Connected social and ad platform accounts',    Icon: Link2       },
    { href: '/integrations/api',  label: 'API & Webhooks',     description: 'API keys, webhook endpoints, and sandbox',     Icon: Webhook     },
    { href: '/integrations/data', label: 'Data Connectors',    description: 'Enterprise data pipeline configuration',       Icon: Database    },
    { href: '/integrations/health',label: 'Integration Health', description: 'Connectivity and sync status',                Icon: HeartPulse  },
    { href: '/resources',         label: 'Resource Monitoring', description: 'Token usage and AI compute spend',            Icon: Cpu         },
  ],
  AGENT_ARCHITECT: [
    { href: '/agents/studio',     label: 'Agent Studio',       description: 'Build and configure intelligent agents',       Icon: Bot         },
    { href: '/agents/workflows',  label: 'Workflows',          description: 'Multi-agent orchestration pipelines',          Icon: GitBranch   },
    { href: '/agents/prompts',    label: 'Prompt Governance',  description: 'Governed prompt lifecycle and evaluation',     Icon: MessageSquareCode },
    { href: '/agents/autonomy',   label: 'Autonomy Settings',  description: 'Agent permission and autonomy configuration', Icon: Shield      },
  ],
  AGENT_OPERATOR: [
    { href: '/agents/operations', label: 'Agent Operations',   description: 'Run, supervise, and pause live agents',        Icon: MonitorPlay },
  ],
  PRIVACY_ADMIN: [
    { href: '/admin/privacy',     label: 'Privacy & Data',     description: 'Retention policies, consent, and GDPR config', Icon: Eye         },
  ],
};

function WelcomeSection({ role }: { role: string }) {
  const links = ROLE_LINKS[role] ?? [];
  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)] mb-2">Dashboard</h1>
        <p className="text-[var(--foreground-muted)] text-sm">Welcome. Use the navigation to access your assigned modules.</p>
      </div>
      {links.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {links.map(l => <QuickLinkCard key={l.href} {...l} />)}
        </div>
      ) : (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-12 text-center">
          <Shield className="w-10 h-10 text-[var(--foreground-muted)] mx-auto mb-4" />
          <p className="text-sm text-[var(--foreground-muted)]">
            Your role has limited dashboard access. Use the sidebar to navigate to your assigned areas.
          </p>
        </div>
      )}
    </>
  );
}

// ── Root dashboard page ────────────────────────────────────────────────────

export default function DashboardPage() {
  const { role, isSuperAdmin, isLoading } = useRoleContext();

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 animate-pulse">
          <div className="w-64 h-8 bg-[var(--border)] rounded mb-3" />
          <div className="w-96 h-4 bg-[var(--border)] rounded" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  const upper = (role ?? '').toUpperCase();
  const hasCampaigns = isSuperAdmin || CAMPAIGN_ROLES.has(upper);
  const hasReview    = !hasCampaigns && REVIEW_ROLES.has(upper);
  const hasAudit     = !hasCampaigns && AUDIT_ROLES.has(upper);
  const hasSafety    = !hasCampaigns && !hasReview && !hasAudit && SAFETY_ROLES.has(upper);

  return (
    <div className="max-w-6xl mx-auto">
      {hasCampaigns && <CampaignSection />}

      {!hasCampaigns && (
        <div className="space-y-12">
          {hasReview  && <ReviewSection />}
          {hasAudit   && <AuditSection />}
          {hasSafety  && <SecuritySection />}
          {!hasReview && !hasAudit && !hasSafety && <WelcomeSection role={upper} />}
        </div>
      )}
    </div>
  );
}
