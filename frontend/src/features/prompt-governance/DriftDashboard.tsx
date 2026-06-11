"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Activity } from "lucide-react";
import { useRoleContext } from "@/lib/context/RoleContext";
import {
  CardSection,
  Empty,
  ErrorNote,
  Field,
  PermissionDenied,
  Spinner,
  ValidationDisabled,
  isPermissionError,
  _styles,
} from "./_ui";
import {
  phase6DashboardApi,
  DriftView,
  BehavioralDriftCategory,
} from "./phase6DashboardApi";

const { muted } = _styles;

const SEVERITY_COLOR: Record<string, string> = {
  low: "bg-info-bg text-info-text border-info-border",
  medium: "bg-warning-bg text-warning-text border-warning-border",
  high: "bg-warning-bg text-warning-text border-warning-border",
  critical: "bg-error-bg text-error-text border-error-border",
};

const CATEGORY_LABELS: Record<BehavioralDriftCategory, string> = {
  output_quality: "Output quality",
  rejection_rate: "Rejection rate",
  hallucination: "Hallucination",
  faithfulness: "Faithfulness",
  brand_alignment: "Brand alignment",
  policy_trigger: "Policy trigger",
  tone_shift: "Tone shift",
  length_drift: "Length drift",
  vocabulary_shift: "Vocabulary shift",
  format_drift: "Format drift",
};

export function DriftDashboard({ embedded = false }: { embedded?: boolean } = {}) {
  const { hasRole } = useRoleContext();
  const allowed = hasRole(["ADMIN", "WORKSPACE_OWNER", "GOVERNANCE_ADMIN", "AGENT_ARCHITECT"]);
  const [data, setData] = useState<DriftView | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!allowed) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    phase6DashboardApi
      .getDrift()
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((e) => {
        if (!cancelled) setErr(e?.message || "Unable to load drift dashboard.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [allowed]);

  if (!allowed) return <PermissionDenied />;
  if (loading) return <Spinner label="Loading drift dashboard…" />;
  if (err) return isPermissionError(err) ? <PermissionDenied /> : <ErrorNote msg={err} />;
  if (!data) return <Empty msg="No drift data available for this workspace yet." />;

  const { summary, by_category, incidents, reports } = data;
  const categoryEntries = (Object.entries(by_category) as [BehavioralDriftCategory, { total: number; by_severity: Record<string, number> }][])
    .filter(([, v]) => v.total > 0)
    .sort((a, b) => b[1].total - a[1].total);

  return (
    <div className="space-y-4">
      {!embedded && (
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-[var(--foreground)] flex items-center gap-2">
              <Activity className="h-5 w-5" /> Behavioral Drift Dashboard
            </h1>
            <p className={`text-sm ${muted}`}>
              Runtime drift findings across the workspace. Prompts exceeding drift thresholds
              are locked from autonomy-level upgrades until a regression suite passes.
            </p>
          </div>
          <a
            href="/agents/prompts"
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs ${muted} hover:text-[var(--foreground)]`}
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Prompt Registry
          </a>
        </div>
      )}

      {!data.validation_enabled && <ValidationDisabled scope="drift" />}

      {/* Summary */}
      <CardSection title="Drift Summary">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
          <Field k="Total findings" v={summary.total_findings} />
          <Field k="Prompts with drift" v={summary.prompts_with_drift} />
          <Field k="Low" v={summary.by_severity.low} />
          <Field k="Medium" v={summary.by_severity.medium} />
          <Field k="High" v={summary.by_severity.high} />
          <Field k="Critical" v={summary.by_severity.critical} />
        </div>
      </CardSection>

      {/* By category */}
      <CardSection title="By Category">
        {categoryEntries.length === 0 ? (
          <Empty msg="No drift findings recorded yet." />
        ) : (
          <div className="space-y-1">
            {categoryEntries.map(([id, stats]) => (
              <div
                key={id}
                className="grid grid-cols-[1.6fr_auto_auto_auto_auto] items-center gap-2 rounded-lg border border-[var(--border)] px-2 py-1.5 text-[11px]"
              >
                <span className="font-medium">{CATEGORY_LABELS[id] || id}</span>
                <span className={muted}>{stats.total} total</span>
                {(["low", "medium", "high", "critical"] as const).map((sev) => {
                  const count = stats.by_severity[sev] || 0;
                  if (count === 0) return null;
                  return (
                    <span
                      key={sev}
                      className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${SEVERITY_COLOR[sev]}`}
                    >
                      {count} {sev}
                    </span>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </CardSection>

      {/* Incidents */}
      <CardSection title="Open Incidents">
        {incidents.length === 0 ? (
          <Empty msg="No open drift incidents." />
        ) : (
          <div className="space-y-1">
            {incidents.slice(0, 20).map((inc) => (
              <div
                key={inc.incident_id}
                className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-2 rounded-lg border border-[var(--border)] px-2 py-1.5 text-[11px]"
              >
                <span className="font-mono truncate">{inc.incident_id}</span>
                <span
                  className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${SEVERITY_COLOR[inc.severity.toLowerCase()] || "border-[var(--border)] bg-[var(--surface)]"}`}
                >
                  {inc.severity}
                </span>
                <span className={muted}>{CATEGORY_LABELS[inc.category] || inc.category}</span>
                <span className={muted}>{new Date(inc.opened_at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </CardSection>

      {/* Reports */}
      <CardSection title="Drift Reports">
        {reports.length === 0 ? (
          <Empty msg="No drift reports available." />
        ) : (
          <div className="space-y-1">
            {reports.slice(0, 20).map((r, i) => (
              <div
                key={i}
                className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-2 rounded-lg border border-[var(--border)] px-2 py-1.5 text-[11px]"
              >
                <span className="font-mono truncate">{r.prompt_id}</span>
                <span className={muted}>drift {r.drift_score}</span>
                <span className={muted}>{r.findings_count} findings</span>
                <span className={muted}>{new Date(r.opened_at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </CardSection>
    </div>
  );
}
