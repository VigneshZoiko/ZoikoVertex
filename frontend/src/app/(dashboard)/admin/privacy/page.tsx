"use client";

import { useState, useCallback } from "react";
import {
  Eye, Download, Database, Lock, Clock,
  AlertCircle, Loader2, CheckCircle2, ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";

interface WorkspaceExport {
  exported_at: string;
  workspace_id: string;
  members: unknown[];
  connected_accounts: unknown[];
  audit_trail: unknown[];
}

export default function PrivacyDataPage() {
  const [exporting, setExporting]   = useState(false);
  const [exportData, setExportData] = useState<WorkspaceExport | null>(null);
  const [error, setError]           = useState<string | null>(null);

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

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-black text-foreground tracking-tight flex items-center gap-3">
          <Eye className="w-8 h-8 text-info-text" />
          Privacy &amp; Data
        </h1>
        <p className="text-gray-500 dark:text-zinc-400 mt-1 text-sm">
          Manage data privacy, retention policies, and workspace exports.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 bg-error-bg border border-error-border rounded-xl text-error-text text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Data Export */}
      <div className="bg-white dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800 rounded-3xl overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-zinc-800">
          <h2 className="text-lg font-bold text-foreground">Data Export</h2>
          <p className="text-gray-500 dark:text-zinc-500 text-sm mt-0.5">
            Download a full export of your workspace data — members, accounts, and audit trail.
          </p>
        </div>
        <div className="p-6 space-y-5">
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: Database, label: "Connected Accounts", desc: "Platform integrations" },
              { icon: Lock,     label: "Audit Trail",        desc: "Last 1,000 events" },
              { icon: Clock,    label: "Team Members",       desc: "Roles &amp; access log" },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="p-3 bg-white dark:bg-zinc-950/50 rounded-xl border border-gray-200 dark:border-zinc-800/50">
                <Icon className="w-4 h-4 text-info-text mb-1.5" />
                <p className="text-xs font-bold text-gray-700 dark:text-zinc-300">{label}</p>
                <p className="text-xs text-gray-400 dark:text-zinc-600" dangerouslySetInnerHTML={{ __html: desc }} />
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
            {exporting ? "Exporting…" : "Export Workspace Data"}
          </button>
        </div>
      </div>

      {/* Data Retention */}
      <div className="bg-white dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800 rounded-3xl overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-zinc-800">
          <h2 className="text-lg font-bold text-foreground">Data Retention Policy</h2>
        </div>
        <div className="divide-y divide-gray-200 dark:divide-zinc-800">
          {[
            { label: "Audit Events",    value: "90 days",   desc: "Governance audit trail" },
            { label: "Content History", value: "12 months", desc: "Published content records" },
            { label: "Inbox Messages",  value: "6 months",  desc: "Social inbox archive" },
            { label: "Analytics Data",  value: "24 months", desc: "Campaign performance data" },
          ].map(({ label, value, desc }) => (
            <div key={label} className="px-6 py-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">{label}</p>
                <p className="text-xs text-gray-500 dark:text-zinc-500 mt-0.5">{desc}</p>
              </div>
              <span className="text-xs font-bold px-3 py-1.5 rounded-lg bg-gray-200 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Compliance */}
      <div className="bg-white dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800 rounded-3xl p-6">
        <h2 className="text-lg font-bold text-foreground mb-4">Compliance &amp; Privacy</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { title: "GDPR Compliant",     desc: "Data processed in accordance with EU regulations",   active: true,  action: null },
            { title: "SOC 2 Ready",        desc: "Security controls aligned with SOC 2 Type II",       active: true,  action: null },
            { title: "Data Encryption",    desc: "All data encrypted at rest and in transit",          active: true,  action: null },
            { title: "Right to Erasure",   desc: "Submit a deletion request via support",              active: false, action: "/support" },
          ].map(({ title, desc, active, action }) => (
            <div key={title} className="flex items-start gap-3 p-4 bg-white dark:bg-zinc-950/50 rounded-xl border border-gray-200 dark:border-zinc-800/50">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${active ? "bg-success-bg" : "bg-gray-300 dark:bg-zinc-700/50"}`}>
                {active
                  ? <CheckCircle2 className="w-3 h-3 text-success-text" />
                  : <AlertCircle  className="w-3 h-3 text-gray-500 dark:text-zinc-500" />
                }
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-foreground">{title}</p>
                <p className="text-xs text-gray-500 dark:text-zinc-500 mt-0.5">{desc}</p>
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
