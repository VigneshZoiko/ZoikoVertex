"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Eye, Download, Database, Lock, Clock,
  AlertCircle, Loader2, CheckCircle2, ExternalLink,
  Play, History, Shield, FileSearch, Fingerprint,
  ScrollText, Users, MessageSquare, BarChart3,
  Receipt, HardDrive, RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";

interface RetentionCategory {
  key: string;
  label: string;
  months: number;
  description: string;
  badge: string;
}

const RETENTION_CATEGORIES: RetentionCategory[] = [
  { key: "audit_events_months",          label: "Audit Events",              months: 84,  description: "Governance audit trail — every privileged action logged", badge: "7 years" },
  { key: "evidence_vault_months",        label: "Evidence Vault Records",   months: 84,  description: "Sealed or evidence-linked proof", badge: "7 years" },
  { key: "forensic_cases_months",        label: "Forensic Cases",           months: 84,  description: "After case closure (longer if legal hold)", badge: "7 years after closure" },
  { key: "decision_ledger_months",       label: "Decision Ledger",          months: 84,  description: "Stores decision rationale — every approve/reject logged", badge: "7 years" },
  { key: "identity_access_months",       label: "Identity & Access Logs",   months: 84,  description: "Privileged, admin, break-glass and export access", badge: "7 years" },
  { key: "content_history_months",       label: "Content History",          months: 36,  description: "Published content (7 years if evidence-linked)", badge: "3 years default" },
  { key: "inbox_messages_months",        label: "Inbox Messages",           months: 12,  description: "Social inbox archive (24 months enterprise option)", badge: "12 months default" },
  { key: "analytics_identifiable_months", label: "Analytics (Identifiable)", months: 24,  description: "Campaign performance data — identifiable", badge: "24 months" },
  { key: "analytics_aggregated_months",  label: "Analytics (Aggregated)",    months: 60,  description: "Anonymized trend intelligence", badge: "60 months" },
  { key: "billing_records_months",       label: "Billing, Tax & Contracts", months: 84,  description: "Tax, accounting & contract records", badge: "7 years minimum" },
  { key: "backups_days",                 label: "Backups",                  months: 3,   description: "Rolling resilience copies — not an archive", badge: "90 days rolling" },
];

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  audit_events_months:           FileSearch,
  evidence_vault_months:         Shield,
  forensic_cases_months:         Fingerprint,
  decision_ledger_months:        ScrollText,
  identity_access_months:        Users,
  content_history_months:        Database,
  inbox_messages_months:         MessageSquare,
  analytics_identifiable_months: BarChart3,
  analytics_aggregated_months:   BarChart3,
  billing_records_months:        Receipt,
  backups_days:                  HardDrive,
};

interface RetentionLog {
  id: string;
  executed_at: string;
  category: string;
  records_before: number;
  records_deleted: number;
  records_held: number;
  retention_months: number;
  status: string;
  error_message?: string;
}

export default function PrivacyDataPage() {
  const [exporting, setExporting]   = useState(false);
  const [exportData, setExportData] = useState<{ exported_at: string; members: unknown[]; connected_accounts: unknown[]; audit_trail: unknown[] } | null>(null);
  const [error, setError]           = useState<string | null>(null);
  const [retentionLogs, setRetentionLogs] = useState<RetentionLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [runningRetention, setRunningRetention] = useState(false);
  const [runMessage, setRunMessage] = useState<string | null>(null);

  const fetchRetentionLogs = async () => {
    setLogsLoading(true);
    try {
      const res = await api.get("/api/v1/retention/logs?limit=10");
      if (res.success) {
        setRetentionLogs(res.data || []);
      }
    } catch {
      // silently fail — table may not exist yet
    } finally {
      setLogsLoading(false);
    }
  };

  // Load retention logs on mount
  useEffect(() => {
    fetchRetentionLogs();
  }, []);

  const handleExport = useCallback(async () => {
    setExporting(true);
    setError(null);
    try {
      const res = await api.get("/api/v1/workspace/data-export");
      if (res.success) {
        setExportData(res.data);
        const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: "application/json" });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement("a");
        a.href     = url;
        a.download = `workspace-export-${new Date().toISOString().split("T")[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExporting(false);
    }
  }, []);

  const handleRunRetention = async () => {
    setRunningRetention(true);
    setRunMessage(null);
    try {
      const res = await api.post("/api/v1/retention/run-now", {});
      if (res.success) {
        setRunMessage("Retention enforcement started — check logs below for results.");
        setTimeout(() => fetchRetentionLogs(), 2000);
      }
    } catch (err: unknown) {
      setRunMessage(err instanceof Error ? `Error: ${err.message}` : "Failed to trigger retention run");
    } finally {
      setRunningRetention(false);
    }
  };

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto space-y-6 sm:space-y-8 pb-24">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-foreground tracking-tight flex items-center gap-3">
          <Eye className="w-8 h-8 text-info-text" />
          Privacy &amp; Data
        </h1>
        <p className="text-foreground-muted mt-1 text-sm">
          Data retention, privacy compliance, and workspace data management.
        </p>
        <p className="text-xs text-foreground-muted mt-1 italic">
          Retention varies by data class, jurisdiction, contract, risk and legal hold status.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 bg-error-bg border border-error-border rounded-xl text-error-text text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Data Retention Policy — Expanded Matrix */}
      <div className="bg-card border border-border rounded-3xl overflow-hidden">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-foreground">Data Retention Policy</h2>
            <p className="text-foreground-muted text-xs mt-0.5">
              Retention periods enforce ZoikoVertex&apos;s governed execution doctrine. Legal holds override ordinary expiry.
            </p>
          </div>
          <button
            onClick={handleRunRetention}
            disabled={runningRetention}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-surface-hover hover:bg-surface text-foreground rounded-xl border border-border transition-colors disabled:opacity-40"
          >
            {runningRetention ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
            {runningRetention ? "Running..." : "Run Retention Now"}
          </button>
        </div>

        {runMessage && (
          <div className={`mx-6 mt-4 p-3 rounded-xl text-sm flex items-center gap-2 ${
            runMessage.startsWith("Error") ? "bg-error-bg border border-error-border text-error-text" : "bg-info-bg border border-info-border text-info-text"
          }`}>
            {runMessage.startsWith("Error") ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
            {runMessage}
          </div>
        )}

        <div className="divide-y divide-border">
          {RETENTION_CATEGORIES.map((cat) => {
            const Icon = CATEGORY_ICONS[cat.key] || Database;
            return (
              <div key={cat.key} className="px-6 py-4 flex items-center gap-4 hover:bg-surface-hover/30 transition-colors">
                <div className="p-2 rounded-lg bg-surface border border-border shrink-0">
                  <Icon className="w-4 h-4 text-info-text" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground flex items-center gap-2">
                    {cat.label}
                    {['audit_events_months', 'evidence_vault_months', 'decision_ledger_months', 'identity_access_months'].includes(cat.key) && (
                      <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20">Evidence</span>
                    )}
                  </p>
                  <p className="text-xs text-foreground-muted mt-0.5">{cat.description}</p>
                </div>
                <span className="text-xs font-bold px-3 py-1.5 rounded-lg bg-surface text-foreground whitespace-nowrap shrink-0 min-w-[80px] text-center">
                  {cat.badge}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Retention Execution Logs */}
      <div className="bg-card border border-border rounded-3xl overflow-hidden">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <History className="w-5 h-5 text-info-text" />
            <div>
              <h2 className="text-lg font-bold text-foreground">Retention Execution History</h2>
              <p className="text-foreground-muted text-xs mt-0.5">Records deleted by the automated retention worker (runs every 24h).</p>
            </div>
          </div>
          <button
            onClick={fetchRetentionLogs}
            disabled={logsLoading}
            className="p-2 rounded-lg hover:bg-surface-hover text-foreground-muted hover:text-foreground transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${logsLoading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {retentionLogs.length === 0 ? (
          <div className="p-10 text-center text-foreground-muted">
            <History className="w-8 h-8 mx-auto mb-3 opacity-40" />
            <p className="text-sm font-medium">No retention runs recorded yet</p>
            <p className="text-xs mt-1">Run retention manually or wait for the daily worker.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-foreground-muted">
                  <th className="text-left px-4 py-3 font-semibold">Time</th>
                  <th className="text-left px-4 py-3 font-semibold">Category</th>
                  <th className="text-right px-4 py-3 font-semibold">Deleted</th>
                  <th className="text-right px-4 py-3 font-semibold">Held</th>
                  <th className="text-center px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {retentionLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-surface-hover/30 transition-colors">
                    <td className="px-4 py-3 text-foreground whitespace-nowrap">
                      {new Date(log.executed_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="px-4 py-3 text-foreground font-medium">{log.category.replace(/_/g, " ")}</td>
                    <td className="px-4 py-3 text-right text-foreground">{log.records_deleted.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-foreground-muted">{log.records_held.toLocaleString()}</td>
                    <td className="px-4 py-3 text-center">
                      {log.status === "completed" ? (
                        <span className="text-success-text font-semibold">Completed</span>
                      ) : (
                        <span className="text-error-text font-semibold" title={log.error_message || ""}>Failed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Data Export */}
      <div className="bg-card border border-border rounded-3xl overflow-hidden">
        <div className="p-6 border-b border-border">
          <h2 className="text-lg font-bold text-foreground">Data Export</h2>
          <p className="text-foreground-muted text-sm mt-0.5">
            Download a full export of your workspace data — members, accounts, and audit trail.
          </p>
        </div>
        <div className="p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { icon: Database, label: "Connected Accounts", desc: "Platform integrations" },
              { icon: Lock,     label: "Audit Trail",        desc: "Last 1,000 events" },
              { icon: Clock,    label: "Team Members",       desc: "Roles &amp; access log" },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="p-3 bg-surface rounded-xl border border-border">
                <Icon className="w-4 h-4 text-info-text mb-1.5" />
                <p className="text-xs font-bold text-foreground">{label}</p>
                <p className="text-xs text-foreground-muted" dangerouslySetInnerHTML={{ __html: desc }} />
              </div>
            ))}
          </div>

          {exportData && (
            <div className="flex items-start gap-2 p-3 bg-success-bg border border-success-border rounded-xl text-success-text text-sm">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Export complete — {new Date(exportData.exported_at).toLocaleString()}
                <span className="text-success-text ml-1">
                  ({exportData.members.length} members · {exportData.connected_accounts.length} accounts · {exportData.audit_trail.length} audit events)
                </span>
              </span>
            </div>
          )}

          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-2 px-6 py-3 bg-info-text hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed text-foreground font-bold rounded-xl transition-all"
          >
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {exporting ? "Exporting\u2026" : "Export Workspace Data"}
          </button>
        </div>
      </div>

      {/* Compliance */}
      <div className="bg-card border border-border rounded-3xl p-6">
        <h2 className="text-lg font-bold text-foreground mb-4">Compliance &amp; Privacy</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { title: "GDPR Compliant",     desc: "Data processed in accordance with EU regulations",   active: true,  action: null },
            { title: "SOC 2 Ready",        desc: "Security controls aligned with SOC 2 Type II",       active: true,  action: null },
            { title: "Data Encryption",    desc: "All data encrypted at rest and in transit",          active: true,  action: null },
            { title: "Right to Erasure",   desc: "Submit a deletion request via support",              active: false, action: "/support" },
          ].map(({ title, desc, active, action }) => (
            <div key={title} className="flex items-start gap-3 p-4 bg-surface rounded-xl border border-border">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${active ? "bg-success-bg" : "bg-surface"}`}>
                {active
                  ? <CheckCircle2 className="w-3 h-3 text-success-text" />
                  : <AlertCircle  className="w-3 h-3 text-foreground-muted" />
                }
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-foreground">{title}</p>
                <p className="text-xs text-foreground-muted mt-0.5">{desc}</p>
              </div>
              {action && (
                <Link href={action} className="flex items-center gap-1 text-xs text-info-text hover:underline font-medium shrink-0 mt-0.5">
                  Request <ExternalLink className="w-3 h-3" />
                </Link>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
