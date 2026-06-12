"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, BarChart3 } from "lucide-react";
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
import { phase6DashboardApi, EvaluationView, ProviderId, PDIBand } from "./phase6DashboardApi";

const { muted } = _styles;

const BAND_LABELS: Record<PDIBand, string> = {
  EXCELLENT: "Excellent",
  STRONG: "Strong",
  MODERATE: "Moderate",
  WEAK: "Weak",
};
const BAND_COLOR: Record<PDIBand, string> = {
  EXCELLENT: "bg-success-bg text-success-text border-success-border",
  STRONG: "bg-info-bg text-info-text border-info-border",
  MODERATE: "bg-warning-bg text-warning-text border-warning-border",
  WEAK: "bg-error-bg text-error-text border-error-border",
};
const PROVIDER_DISPLAY: Record<ProviderId, string> = {
  google: "Google Gemini 2.5 Flash",
  groq: "Groq Llama 3.3 70B",
};

export function EvaluationDashboard({ embedded = false }: { embedded?: boolean } = {}) {
  const { hasRole } = useRoleContext();
  const allowed = hasRole(["ADMIN", "WORKSPACE_OWNER", "GOVERNANCE_ADMIN", "AGENT_ARCHITECT"]);
  const [data, setData] = useState<EvaluationView | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!allowed) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    phase6DashboardApi
      .getEvaluation()
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((e) => {
        if (!cancelled) setErr(e?.message || "Unable to load evaluation dashboard.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [allowed]);

  if (!allowed) return <PermissionDenied />;
  if (loading) return <Spinner label="Loading evaluation dashboard…" />;
  if (err) return isPermissionError(err) ? <PermissionDenied /> : <ErrorNote msg={err} />;
  if (!data) return <Empty msg="No evaluation data available for this workspace yet." />;

  const { pdi, evaluation, cross_model } = data;
  const sortedRankings = [...cross_model.rankings].sort((a, b) => b.wins - a.wins);
  const topWinner = sortedRankings[0];

  return (
    <div className="space-y-4">
      {!embedded && (
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-[var(--foreground)] flex items-center gap-2">
              <BarChart3 className="h-5 w-5" /> Evaluation Dashboard
            </h1>
            <p className={`text-sm ${muted}`}>
              PDI scores, evaluation pass rates, and cross-model rankings across the workspace.
              Read-only rollup of governed prompt evaluation activity.
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

      {!data.validation_enabled && <ValidationDisabled scope="evaluation" />}

      {/* PDI summary */}
      <CardSection title="Prompt Defensibility Index (PDI)">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Field k="Versions computed" v={pdi.summary.total_computed} />
          <Field k="Average PDI score" v={pdi.summary.average_score} />
          <Field
            k="Excellent / Strong"
            v={`${pdi.summary.band_distribution.EXCELLENT} / ${pdi.summary.band_distribution.STRONG}`}
          />
          <Field
            k="Moderate / Weak"
            v={`${pdi.summary.band_distribution.MODERATE} / ${pdi.summary.band_distribution.WEAK}`}
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {(Object.keys(BAND_LABELS) as PDIBand[]).map((band) => (
            <span
              key={band}
              className={`inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[11px] font-semibold ${BAND_COLOR[band]}`}
            >
              {BAND_LABELS[band]} · {pdi.summary.band_distribution[band]}
            </span>
          ))}
        </div>
        {pdi.trend.length > 0 && (
          <div className="mt-3">
            <p className={`mb-1 text-[11px] ${muted}`}>Recent PDI points ({pdi.trend.length})</p>
            <div className="space-y-1">
              {pdi.trend.slice(0, 10).map((p, i) => (
                <div
                  key={i}
                  className="grid grid-cols-[1fr_auto_auto] items-center gap-2 rounded-lg border border-[var(--border)] px-2 py-1 text-[11px]"
                >
                  <span className="font-mono">
                    {p.version_id ? `${p.version_id.slice(0, 12)}…` : "—"}
                  </span>
                  <span className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${BAND_COLOR[p.band]}`}>
                    {p.score} · {BAND_LABELS[p.band]}
                  </span>
                  <span className={muted}>{new Date(p.at).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardSection>

      {/* Evaluation pass rate */}
      <CardSection title="Evaluation Pass Rate">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Field k="Total runs" v={evaluation.total_runs} />
          <Field k="Pass rate" v={`${evaluation.pass_rate}%`} />
          <Field k="Passed" v={evaluation.passed} />
          <Field k="Failed / Warnings" v={`${evaluation.failed} / ${evaluation.warnings}`} />
        </div>
        {evaluation.trend.length > 0 && (
          <div className="mt-3">
            <p className={`mb-1 text-[11px] ${muted}`}>
              Recent run results ({evaluation.trend.length})
            </p>
            <div className="space-y-1">
              {evaluation.trend.slice(0, 10).map((r, i) => (
                <div
                  key={i}
                  className="grid grid-cols-[1fr_auto_auto] items-center gap-2 rounded-lg border border-[var(--border)] px-2 py-1 text-[11px]"
                >
                  <span className="font-mono">score {r.score}</span>
                  <PassFail ok={r.pass_fail === "PASS"} />
                  <span className={muted}>{new Date(r.at).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardSection>

      {/* Cross-model */}
      <CardSection title="Cross-Model Comparison">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Field k="Providers evaluated" v={cross_model.providers_evaluated} />
          <Field
            k="Most recent winner"
            v={cross_model.most_recent_winner ? PROVIDER_DISPLAY[cross_model.most_recent_winner] : "—"}
          />
          <Field
            k="Last evaluation"
            v={cross_model.last_evaluation_at ? new Date(cross_model.last_evaluation_at).toLocaleString() : "—"}
          />
          <Field
            k="Top winner"
            v={topWinner ? `${PROVIDER_DISPLAY[topWinner.provider]} (${topWinner.wins} wins)` : "—"}
          />
        </div>
        {sortedRankings.length > 0 && (
          <div className="mt-3 space-y-1">
            {sortedRankings.map((r) => (
              <div
                key={r.provider}
                className="grid grid-cols-[1fr_auto] items-center gap-2 rounded-lg border border-[var(--border)] px-2 py-1 text-[11px]"
              >
                <span className="font-medium">{PROVIDER_DISPLAY[r.provider]}</span>
                <span className={muted}>{r.wins} wins</span>
              </div>
            ))}
          </div>
        )}
      </CardSection>
    </div>
  );
}
