"use client";

import { Loader2, XCircle, CheckCircle2, ShieldOff } from "lucide-react";

const card = "rounded-2xl border border-[var(--border)] bg-[var(--card)]";
const muted = "text-[var(--foreground-muted)]";

export function Spinner({ label }: { label?: string }) {
  return (
    <div className={`flex items-center gap-2 p-6 text-sm ${muted}`}>
      <Loader2 className="h-4 w-4 animate-spin" /> {label || "Loading…"}
    </div>
  );
}

export function ErrorNote({ msg }: { msg: string }) {
  return (
    <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">
      {msg}
    </div>
  );
}

export function Empty({ msg }: { msg: string }) {
  return <div className={`p-6 text-sm ${muted}`}>{msg}</div>;
}

export function PermissionDenied() {
  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
      You don&rsquo;t have permission to view this Prompt Governance data. Ask a
      Governance Admin or Agent Architect.
    </div>
  );
}

export function Field({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-[var(--surface)] p-3">
      <p className={`text-[10px] uppercase tracking-wide ${muted}`}>{k}</p>
      <p className="mt-0.5 break-all text-xs font-medium text-[var(--foreground)]">
        {v ?? "—"}
      </p>
    </div>
  );
}

export function PassFail({ ok }: { ok: boolean }) {
  return ok ? (
    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
  ) : (
    <XCircle className="h-4 w-4 text-rose-400 shrink-0" />
  );
}

export function CardSection({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={card}>
      {title && (
        <p className="border-b border-[var(--border)] px-3 py-2 text-xs font-semibold">
          {title}
        </p>
      )}
      <div className="p-3">{children}</div>
    </div>
  );
}

/**
 * ValidationDisabled — banner shown when ENABLE_REAL_MODEL_VALIDATION=false.
 *
 * Prompt Governance core (approval, deployment, commissioning, receipts,
 * shadows, audit) remains fully active even when real model validation is
 * off. This banner makes that distinction explicit: real adversarial + real
 * cross-model evaluation is NOT running, but Phase 1–5 governance is.
 */
export function ValidationDisabled({ scope }: { scope: "evaluation" | "adversarial" | "drift" }) {
  const scopeLabel =
    scope === "adversarial"
      ? "Real adversarial testing"
      : scope === "evaluation"
        ? "Real cross-model evaluation"
        : "Real model validation";
  return (
    <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-3 text-sm text-sky-200">
      <div className="flex items-center gap-2 font-semibold">
        <ShieldOff className="h-4 w-4" /> Validation Disabled
      </div>
      <p className={`mt-1 text-xs ${muted}`}>
        {scopeLabel} is not running. No real model validation was performed against
        this workspace. Governance core (approval, deployment, commissioning,
        receipts, shadows, audit) remains fully active.
      </p>
      <p className={`mt-1 text-[10px] ${muted}`}>
        Set <code>ENABLE_REAL_MODEL_VALIDATION=true</code> on the API server and
        provide at least one of <code>GEMINI_API_KEY</code> or <code>GROQ_API_KEY</code> to
        enable real Gemini/Groq validation.
      </p>
    </div>
  );
}

export function isPermissionError(msg: string): boolean {
  const s = msg.toLowerCase();
  return (
    s.includes("403") ||
    s.includes("forbidden") ||
    s.includes("permission") ||
    s.includes("not allowed") ||
    s.includes("unauthor")
  );
}

export const _styles = { card, muted };
