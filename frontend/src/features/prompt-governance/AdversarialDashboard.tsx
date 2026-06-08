"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { useRoleContext } from "@/lib/context/RoleContext";
import {
  CardSection,
  Empty,
  ErrorNote,
  Field,
  PassFail,
  PermissionDenied,
  Spinner,
  ValidationDisabled,
  isPermissionError,
  _styles,
} from "./_ui";
import {
  phase6DashboardApi,
  AdversarialView,
  AdversarialCategoryId,
  AdversarialCategoryStats,
} from "./phase6DashboardApi";

const { muted } = _styles;

const SEVERITY_COLOR: Record<string, string> = {
  low: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  medium: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  high: "bg-orange-500/15 text-orange-300 border-orange-500/30",
  critical: "bg-rose-500/15 text-rose-300 border-rose-500/30",
};

function StatRow({
  label,
  stats,
}: {
  label: string;
  stats: AdversarialCategoryStats;
}) {
  return (
    <div className="grid grid-cols-[1.6fr_auto_auto_auto_auto] items-center gap-2 rounded-lg border border-[var(--border)] px-2 py-1.5 text-[11px]">
      <span className="font-medium">{label}</span>
      <span className={muted}>{stats.total} total</span>
      <span className="text-emerald-300">{stats.passed} pass</span>
      <span className="text-rose-300">{stats.failed} fail</span>
      <span
        className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${
          stats.pass_rate >= 95
            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
            : stats.pass_rate >= 80
              ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
              : "border-rose-500/30 bg-rose-500/10 text-rose-300"
        }`}
      >
        {stats.pass_rate}%
      </span>
    </div>
  );
}

export function AdversarialDashboard({ embedded = false }: { embedded?: boolean } = {}) {
  const { hasRole } = useRoleContext();
  const allowed = hasRole(["ADMIN", "WORKSPACE_OWNER", "GOVERNANCE_ADMIN", "AGENT_ARCHITECT"]);
  const [data, setData] = useState<AdversarialView | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!allowed) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    phase6DashboardApi
      .getAdversarial()
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((e) => {
        if (!cancelled) setErr(e?.message || "Unable to load adversarial dashboard.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [allowed]);

  if (!allowed) return <PermissionDenied />;
  if (loading) return <Spinner label="Loading adversarial dashboard…" />;
  if (err) return isPermissionError(err) ? <PermissionDenied /> : <ErrorNote msg={err} />;
  if (!data) return <Empty msg="No adversarial data available for this workspace yet." />;

  const { summary, by_category, by_severity, recent_attacks } = data;
  const categoryEntries = Object.entries(by_category) as [AdversarialCategoryId, AdversarialCategoryStats][];
  const sortedByTotal = [...categoryEntries].sort((a, b) => b[1].total - a[1].total);
  const severityEntries = Object.entries(by_severity);
  const sortedBySeverity = [...severityEntries].sort((a, b) => (b[1].failed || 0) - (a[1].failed || 0));

  return (
    <div className="space-y-4">
      {!embedded && (
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-[var(--foreground)] flex items-center gap-2">
              <ShieldAlert className="h-5 w-5" /> Adversarial Dashboard
            </h1>
            <p className={`text-sm ${muted}`}>
              Real adversarial test results across the workspace. Bypasses must be zero
              before a prompt can move to Review Requested.
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

      {!data.validation_enabled && <ValidationDisabled scope="adversarial" />}

      {/* Summary */}
      <CardSection title="Adversarial Summary">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <Field k="Total attacks" v={summary.total_attacks} />
          <Field k="Passed" v={summary.passed} />
          <Field k="Failed" v={summary.failed} />
          <Field k="Pass rate" v={`${summary.pass_rate}%`} />
          <Field
            k="Bypasses detected"
            v={
              <span className={summary.bypasses_detected > 0 ? "text-rose-300" : "text-emerald-300"}>
                {summary.bypasses_detected}
              </span>
            }
          />
        </div>
      </CardSection>

      {/* By category */}
      <CardSection title="By Category">
        {sortedByTotal.length === 0 ? (
          <Empty msg="No adversarial categories have been exercised yet." />
        ) : (
          <div className="space-y-1">
            {sortedByTotal.map(([id, stats]) => {
              const meta = data.category_metadata?.[id];
              return <StatRow key={id} label={meta?.label || id} stats={stats} />;
            })}
          </div>
        )}
      </CardSection>

      {/* By severity */}
      <CardSection title="By Severity">
        {sortedBySeverity.length === 0 ? (
          <Empty msg="No severity breakdown available." />
        ) : (
          <div className="space-y-1">
            {sortedBySeverity.map(([sev, stats]) => (
              <div
                key={sev}
                className="grid grid-cols-[1fr_auto_auto] items-center gap-2 rounded-lg border border-[var(--border)] px-2 py-1.5 text-[11px]"
              >
                <span
                  className={`inline-flex w-fit items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-semibold ${SEVERITY_COLOR[sev.toLowerCase()] || "border-[var(--border)] bg-[var(--surface)]"}`}
                >
                  {sev}
                </span>
                <span className={muted}>{stats.total} total</span>
                <span className="text-rose-300">{stats.failed} failed</span>
              </div>
            ))}
          </div>
        )}
      </CardSection>

      {/* Recent attacks */}
      <CardSection title="Recent Attacks">
        {recent_attacks.length === 0 ? (
          <Empty msg="No adversarial attacks recorded yet." />
        ) : (
          <div className="space-y-1">
            {recent_attacks.slice(0, 20).map((a, i) => (
              <div
                key={i}
                className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-2 rounded-lg border border-[var(--border)] px-2 py-1.5 text-[11px]"
              >
                <span className="font-mono truncate">
                  {a.version_id ? `${a.version_id.slice(0, 12)}…` : "—"}
                </span>
                <span
                  className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${SEVERITY_COLOR[a.severity.toLowerCase()] || "border-[var(--border)] bg-[var(--surface)]"}`}
                >
                  {a.severity}
                </span>
                <span className={muted}>{a.category}</span>
                <PassFail ok={a.verdict === "pass"} />
                <span className={muted}>{new Date(a.at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </CardSection>
    </div>
  );
}
