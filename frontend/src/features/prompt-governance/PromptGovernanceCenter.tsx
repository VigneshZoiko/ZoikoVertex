"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  FileCode2, GitCompare, ReceiptText, ShieldCheck, History,
  Lock, Loader2, CheckCircle2, XCircle, KeyRound, Copy, Check, ArrowLeft,
} from "lucide-react";
import { useRoleContext } from "@/lib/context/RoleContext";
import { promptGovApi, PromptRow, PromptVersion, PreflightResult } from "./api";

type View = "code" | "diff" | "receipt" | "commission" | "audit";

const VIEWS: { id: View; label: string; icon: React.ReactNode }[] = [
  { id: "code", label: "Prompt-as-Code", icon: <FileCode2 className="h-4 w-4" /> },
  { id: "diff", label: "Diff Viewer", icon: <GitCompare className="h-4 w-4" /> },
  { id: "receipt", label: "Governance Receipt", icon: <ReceiptText className="h-4 w-4" /> },
  { id: "commission", label: "Commissioning", icon: <ShieldCheck className="h-4 w-4" /> },
  { id: "audit", label: "Audit Reconstruction", icon: <History className="h-4 w-4" /> },
];

const card = "rounded-2xl border border-[var(--border)] bg-[var(--card)]";
const muted = "text-[var(--foreground-muted)]";

function Spinner({ label }: { label?: string }) {
  return <div className={`flex items-center gap-2 p-6 text-sm ${muted}`}><Loader2 className="h-4 w-4 animate-spin" /> {label || "Loading…"}</div>;
}
function ErrorNote({ msg }: { msg: string }) {
  return <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">{msg}</div>;
}
function Empty({ msg }: { msg: string }) {
  return <div className={`p-6 text-sm ${muted}`}>{msg}</div>;
}
function PassFail({ ok }: { ok: boolean }) {
  return ok
    ? <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
    : <XCircle className="h-4 w-4 text-rose-400 shrink-0" />;
}
function Field({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-[var(--surface)] p-3">
      <p className={`text-[10px] uppercase tracking-wide ${muted}`}>{k}</p>
      <p className="mt-0.5 break-all text-xs font-medium text-[var(--foreground)]">{v ?? "—"}</p>
    </div>
  );
}
function CopyButton({ text }: { text?: string | null }) {
  const [copied, setCopied] = useState(false);
  if (!text) return null;
  return (
    <button
      type="button"
      onClick={() => { navigator.clipboard?.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1200); }}
      className={`inline-flex items-center rounded p-0.5 ${muted} hover:text-[var(--foreground)]`}
      title="Copy"
    >
      {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
    </button>
  );
}
function ReadyBadge({ ready }: { ready: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[11px] font-semibold ${ready ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-rose-500/30 bg-rose-500/10 text-rose-300"}`}>
      {ready ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />} {ready ? "Ready" : "Blocked"}
    </span>
  );
}
function Skeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-2 p-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-8 animate-pulse rounded-lg bg-[var(--surface)]" />
      ))}
    </div>
  );
}
function PermissionDenied() {
  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
      You don’t have permission to view this Prompt Governance data. Ask a Governance Admin or Agent Architect.
    </div>
  );
}
function isPermissionError(msg: string): boolean {
  const s = msg.toLowerCase();
  return s.includes("403") || s.includes("forbidden") || s.includes("permission") || s.includes("not allowed") || s.includes("unauthor");
}

// ─── Prompt-as-Code ──────────────────────────────────────────────────────────
function PromptAsCode({ prompt, version }: { prompt: PromptRow | null; version: PromptVersion | null }) {
  if (!prompt) return <Empty msg="Select a prompt." />;
  const locked = Boolean(version?.immutable) || ["locked", "retired", "archived", "superseded"].includes(String(prompt.status));
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Field k="Prompt" v={prompt.name} />
        <Field k="use_case_key" v={prompt.use_case_key || "—"} />
        <Field k="Lifecycle status" v={prompt.status} />
        <Field k="Risk tier" v={prompt.risk_tier} />
        <Field k="Current version" v={version?.version_number ?? "—"} />
        <Field k="Body hash" v={version?.body_hash ? <span className="inline-flex items-center gap-1">{`${version.body_hash.slice(0, 16)}…`}<CopyButton text={version.body_hash} /></span> : "—"} />
      </div>
      <div className="flex items-center gap-2">
        {locked
          ? <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-xs text-amber-300"><Lock className="h-3.5 w-3.5" /> Read-only (immutable / locked version)</span>
          : <span className={`text-xs ${muted}`}>Editable drafts are created as new governed versions via the repository — this viewer is read-only.</span>}
      </div>
      <div>
        <p className={`mb-1 text-xs ${muted}`}>Prompt body (Prompt-as-Code)</p>
        <pre className="max-h-80 overflow-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 font-mono text-xs text-[var(--foreground)] whitespace-pre-wrap">{version?.body || "No body for this version."}</pre>
      </div>
      <div>
        <p className={`mb-1 text-xs ${muted}`}>Governed variables</p>
        <pre className="max-h-48 overflow-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 font-mono text-xs text-[var(--foreground)]">{JSON.stringify(version?.variables_json ?? {}, null, 2)}</pre>
      </div>
    </div>
  );
}

// ─── Diff Viewer ─────────────────────────────────────────────────────────────
function lineDiff(a: string, b: string) {
  const aL = a.split("\n"); const bL = b.split("\n");
  const bSet = new Set(bL); const aSet = new Set(aL);
  const rows: { type: "same" | "add" | "del"; text: string }[] = [];
  aL.forEach((l) => { if (!bSet.has(l)) rows.push({ type: "del", text: l }); });
  bL.forEach((l) => { if (!aSet.has(l)) rows.push({ type: "add", text: l }); });
  if (rows.length === 0) rows.push({ type: "same", text: "(identical body)" });
  return rows;
}
function shortHash(v: unknown): string { const s = v == null ? "" : String(v); return s ? `${s.slice(0, 16)}…` : ""; }
function SealedCompareTable({ a, b }: { a: Record<string, any> | null; b: Record<string, any> | null }) {
  if (!a && !b) return <p className={`text-[11px] ${muted}`}>Sealed history unavailable for the selected versions.</p>;
  const rows: { label: string; key: string; hash?: boolean }[] = [
    { label: "Version status", key: "version_status" },
    { label: "Body hash", key: "body_hash", hash: true },
    { label: "Governance receipt hash", key: "governance_receipt_hash", hash: true },
    { label: "Constraint Shadow hash", key: "constraint_shadow_hash", hash: true },
    { label: "Evaluation hash", key: "evaluation_hash", hash: true },
    { label: "Evaluation score", key: "evaluation_score" },
    { label: "PDI score", key: "pdi_score" },
    { label: "Deployment status", key: "deployment_status" },
    { label: "Deployment environment", key: "deployment_environment" },
    { label: "Commissioned at", key: "commissioned_at" },
    { label: "Locked at", key: "locked_at" },
  ];
  const cell = (obj: Record<string, any> | null, key: string, hash?: boolean) => {
    const raw = obj ? obj[key] : undefined;
    if (raw == null || raw === "") return <span className="inline-flex items-center gap-1 rounded border border-[var(--border)] px-1.5 py-0.5 text-[10px] text-[var(--foreground-muted)]"><XCircle className="h-3 w-3" /> missing</span>;
    if (hash) return <span className="inline-flex items-center gap-1 font-mono text-[11px]">{shortHash(raw)}<CopyButton text={String(raw)} /></span>;
    return <span className="text-[11px]">{String(raw)}</span>;
  };
  return (
    <div className={`${card} overflow-hidden`}>
      <p className="border-b border-[var(--border)] px-3 py-2 text-xs font-semibold">Sealed metadata comparison (audit-grade)</p>
      <div className="divide-y divide-[var(--border)]">
        {rows.map((r) => {
          const av = a?.[r.key]; const bv = b?.[r.key];
          const changed = JSON.stringify(av ?? null) !== JSON.stringify(bv ?? null);
          return (
            <div key={r.key} className="grid grid-cols-[1.4fr_1fr_1fr_auto] items-center gap-2 px-3 py-1.5 text-xs">
              <span className={muted}>{r.label}</span>
              <span className="break-all text-[var(--foreground)]">{cell(a, r.key, r.hash)}</span>
              <span className="break-all text-[var(--foreground)]">{cell(b, r.key, r.hash)}</span>
              <span className={`text-[10px] font-semibold ${changed ? "text-amber-300" : muted}`}>{changed ? "changed" : "same"}</span>
            </div>
          );
        })}
        <div className="grid grid-cols-[1.4fr_1fr_1fr_auto] items-center gap-2 px-3 py-1.5 text-xs">
          <span className={muted}>Evidence links / audit events</span>
          <span className="text-[11px] text-[var(--foreground)]">{a?.evidence_links?.length ?? 0} / {a?.audit_events?.count ?? 0}</span>
          <span className="text-[11px] text-[var(--foreground)]">{b?.evidence_links?.length ?? 0} / {b?.audit_events?.count ?? 0}</span>
          <span className={`text-[10px] ${muted}`}>—</span>
        </div>
      </div>
    </div>
  );
}
function DiffViewer({ promptId, versions }: { promptId: string; versions: PromptVersion[] }) {
  const [aId, setAId] = useState<string>("");
  const [bId, setBId] = useState<string>("");
  const [a, setA] = useState<PromptVersion | null>(null);
  const [b, setB] = useState<PromptVersion | null>(null);
  const [sa, setSa] = useState<Record<string, any> | null>(null);
  const [sb, setSb] = useState<Record<string, any> | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (versions.length >= 2 && !aId && !bId) { setBId(versions[0].id); setAId(versions[1].id); }
  }, [versions, aId, bId]);
  useEffect(() => {
    if (!aId || !bId) return;
    setBusy(true); setErr(null);
    Promise.all([
      promptGovApi.getVersion(promptId, aId),
      promptGovApi.getVersion(promptId, bId),
      promptGovApi.sealedHistory(aId).catch(() => null),
      promptGovApi.sealedHistory(bId).catch(() => null),
    ])
      .then(([va, vb, ha, hb]) => { setA(va); setB(vb); setSa(ha); setSb(hb); })
      .catch((e) => setErr(e instanceof Error ? e.message : "Failed to load versions"))
      .finally(() => setBusy(false));
  }, [promptId, aId, bId]);

  if (versions.length < 2) return <Empty msg="Need at least two versions to diff." />;
  const sel = "rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs";
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className={muted}>Base (A)</span>
        <select className={sel} value={aId} onChange={(e) => setAId(e.target.value)}>
          {versions.map((v) => <option key={v.id} value={v.id}>v{v.version_number} · {v.id.slice(0, 8)}</option>)}
        </select>
        <span className={muted}>Compare (B)</span>
        <select className={sel} value={bId} onChange={(e) => setBId(e.target.value)}>
          {versions.map((v) => <option key={v.id} value={v.id}>v{v.version_number} · {v.id.slice(0, 8)}</option>)}
        </select>
      </div>
      {err && <ErrorNote msg={err} />}
      {busy ? <Spinner /> : a && b && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Field k="A body hash" v={a.body_hash ? `${a.body_hash.slice(0, 16)}…` : "—"} />
            <Field k="B body hash" v={b.body_hash ? `${b.body_hash.slice(0, 16)}…` : "—"} />
          </div>
          <div>
            <p className={`mb-1 text-xs ${muted}`}>Body diff</p>
            <pre className="max-h-72 overflow-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 font-mono text-xs">
              {lineDiff(a.body || "", b.body || "").map((r, i) => (
                <div key={i} className={r.type === "add" ? "text-emerald-400" : r.type === "del" ? "text-rose-400" : muted}>
                  {r.type === "add" ? "+ " : r.type === "del" ? "- " : "  "}{r.text}
                </div>
              ))}
            </pre>
          </div>
          <div>
            <p className={`mb-1 text-xs ${muted}`}>Variable diff (A → B)</p>
            <div className="grid grid-cols-2 gap-3">
              <pre className="max-h-40 overflow-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2 font-mono text-[11px]">{JSON.stringify(a.variables_json ?? {}, null, 2)}</pre>
              <pre className="max-h-40 overflow-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2 font-mono text-[11px]">{JSON.stringify(b.variables_json ?? {}, null, 2)}</pre>
            </div>
          </div>
          <SealedCompareTable a={sa} b={sb} />
        </>
      )}
    </div>
  );
}

// ─── Governance Receipt Viewer ───────────────────────────────────────────────
function ReceiptViewer({ prompt, versionId, role }: { prompt: PromptRow; versionId: string | null; role: string | null }) {
  const [snap, setSnap] = useState<Record<string, any> | null>(null);
  const [evidence, setEvidence] = useState<any[]>([]);
  const [threeKey, setThreeKey] = useState<Record<string, any> | null>(null);
  const [sod, setSod] = useState<Record<string, any> | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setBusy(true); setErr(null);
    const tasks: Promise<any>[] = [
      promptGovApi.governanceSnapshot(prompt.id).catch(() => null),
      promptGovApi.evidence(prompt.id).catch(() => []),
    ];
    if (versionId) {
      tasks.push(promptGovApi.threeKeyStatus(versionId).catch(() => null));
      tasks.push(promptGovApi.sodCheck(versionId, role || "GOVERNANCE_ADMIN").catch(() => null));
    }
    Promise.all(tasks)
      .then((res) => { setSnap(res[0]); setEvidence(Array.isArray(res[1]) ? res[1] : []); setThreeKey(res[2] ?? null); setSod(res[3] ?? null); })
      .catch((e) => setErr(e instanceof Error ? e.message : "Failed to load governance receipt"))
      .finally(() => setBusy(false));
  }, [prompt.id, versionId, role]);

  if (busy) return <Spinner label="Loading governance receipt…" />;
  if (err) return <ErrorNote msg={err} />;

  const receiptLink = evidence.find((e) => String(e.event_type || "").includes("governance_receipt"));
  const exportLink = evidence.find((e) => String(e.event_type || "").includes("evidence.export") || String(e.event_type || "").includes("exported"));
  const runtime = snap?.runtime || {};
  const gov = snap?.governance || snap?.governanceResults || {};

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Field k="Prompt ID" v={prompt.id.slice(0, 12) + "…"} />
        <Field k="Version ID" v={versionId ? versionId.slice(0, 12) + "…" : "—"} />
        <Field k="Receipt hash" v={receiptLink?.evidence_hash ? <span className="inline-flex items-center gap-1">{`${String(receiptLink.evidence_hash).slice(0, 16)}…`}<CopyButton text={String(receiptLink.evidence_hash)} /></span> : "not generated"} />
        <Field k="Constraint Shadow hash" v={(() => { const h = receiptLink?.metadata?.constraint_shadow_hash || snap?.constraint_shadow_hash; return h ? <span className="inline-flex items-center gap-1">{`${String(h).slice(0, 16)}…`}<CopyButton text={String(h)} /></span> : "—"; })()} />
        <Field k="PDI / evaluation" v={snap?.pdi_score ?? gov?.pdiScore ?? snap?.defensibility ?? "—"} />
        <Field k="Evidence link" v={receiptLink ? "captured" : "—"} />
      </div>

      <div className={`${card} p-3`}>
        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold"><KeyRound className="h-3.5 w-3.5" /> Three-Key & Separation of Duties</p>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="flex items-center gap-2"><PassFail ok={Boolean(threeKey?.completed)} /> Three-Key {threeKey ? `(${threeKey.approvedCount ?? 0}/${threeKey.keysRequired ?? 3})` : "(n/a)"}</div>
          <div className="flex items-center gap-2"><PassFail ok={sod ? Boolean(sod.allowed) : true} /> Separation of Duties {sod ? (sod.allowed ? "passed" : "VIOLATION") : "(n/a)"}</div>
        </div>
        {Array.isArray(threeKey?.keys) && (
          <div className="mt-2 space-y-1">
            {threeKey!.keys.map((k: any, i: number) => (
              <div key={i} className={`flex items-center gap-2 text-[11px] ${muted}`}>
                <PassFail ok={String(k.status).toLowerCase() === "approved"} /> {k.role}{k.userId ? ` · ${String(k.userId).slice(0, 8)}` : ""}{k.timestamp ? ` · ${new Date(k.timestamp).toLocaleString()}` : ""}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={`${card} p-3`}>
        <p className="mb-2 text-xs font-semibold">Evidence chain ({evidence.length})</p>
        {evidence.length === 0 ? <Empty msg="No evidence links yet." /> : (
          <div className="max-h-56 space-y-1 overflow-auto">
            {evidence.slice(0, 50).map((e, i) => (
              <div key={i} className="flex items-center justify-between gap-2 rounded-lg bg-[var(--surface)] px-2 py-1 text-[11px]">
                <span className="truncate text-[var(--foreground)]">{e.event_type}</span>
                <span className={muted}>{e.created_at ? new Date(e.created_at).toLocaleString() : ""}</span>
              </div>
            ))}
          </div>
        )}
        <p className={`mt-2 text-[11px] ${muted}`}>Export state: {exportLink ? "exported" : "not exported"} · runtime governed executions: {runtime.runtime_trace_count ?? "—"}</p>
      </div>
    </div>
  );
}

// ─── Commissioning ───────────────────────────────────────────────────────────
function CommissioningPanel({ promptId }: { promptId: string }) {
  const [pf, setPf] = useState<PreflightResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const runPreflight = useCallback(async () => {
    setBusy(true); setErr(null); setNotice(null);
    try { setPf(await promptGovApi.commissionPreflight(promptId)); }
    catch (e) { setErr(e instanceof Error ? e.message : "Preflight failed"); }
    finally { setBusy(false); }
  }, [promptId]);

  useEffect(() => { setPf(null); runPreflight(); }, [promptId, runPreflight]);

  const commission = async () => {
    setCommitting(true); setErr(null); setNotice(null);
    try {
      const r = await promptGovApi.commission(promptId, "Commissioned via Governance Center");
      setNotice(`Commissioned (${r?.status || "ok"}${r?.receiptId ? ` · receipt ${r.receiptId}` : ""}).`);
      await runPreflight();
    } catch (e) { setErr(e instanceof Error ? e.message : "Commissioning blocked by backend governance"); }
    finally { setCommitting(false); }
  };

  return (
    <div className="space-y-4">
      {err && <ErrorNote msg={err} />}
      {notice && <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">{notice}</div>}
      {busy ? <Skeleton rows={9} /> : pf ? (
        <>
          <div className={`flex items-center gap-2 ${card} p-3`}>
            <ReadyBadge ready={pf.canCommission} />
            <span className="text-sm font-semibold">{pf.canCommission ? "All governance checks passed" : "Governance checks failing"}</span>
          </div>
          <div className="space-y-1">
            {pf.checks.map((c, i) => (
              <div key={i} className="flex items-start gap-2 rounded-xl bg-[var(--surface)] p-2 text-xs">
                <PassFail ok={c.passed} />
                <div><p className="font-medium text-[var(--foreground)]">{c.check}</p><p className={muted}>{c.details}</p></div>
              </div>
            ))}
          </div>
          <button
            onClick={commission}
            disabled={!pf.canCommission || committing}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-black disabled:cursor-not-allowed disabled:opacity-40"
          >
            {committing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />} Commission prompt
          </button>
          <p className={`text-[11px] ${muted}`}>The action is gated server-side; this button cannot bypass backend preflight/fail-closed enforcement.</p>
        </>
      ) : <Empty msg="No preflight result." />}
    </div>
  );
}

// ─── Audit Reconstruction ────────────────────────────────────────────────────
const LIFECYCLE_ORDER = ["created", "draft", "review", "approval", "approved", "deploy", "commission", "active", "rollback", "retire", "archive"];
function eventTone(t: string): string {
  const s = t.toLowerCase();
  if (s.includes("blocked") || s.includes("denied") || s.includes("violation") || s.includes("reject")) return "text-rose-400";
  if (s.includes("receipt") || s.includes("commission")) return "text-emerald-400";
  if (s.includes("governed_execution")) return "text-indigo-400";
  if (s.includes("export")) return "text-amber-300";
  return "text-[var(--foreground)]";
}
function AuditReconstruction({ promptId }: { promptId: string }) {
  const [events, setEvents] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setBusy(true); setErr(null);
    Promise.all([
      promptGovApi.auditTimeline(promptId).catch(() => promptGovApi.audit(promptId).catch(() => [])),
      promptGovApi.runtimeTraces(promptId).catch(() => []),
      promptGovApi.evidence(promptId).catch(() => []),
    ]).then(([audit, traces, evidence]) => {
      const norm = (arr: any[], src: string) => (Array.isArray(arr) ? arr : []).map((e) => ({
        ts: e.created_at || e.timestamp || e.opened_at || "",
        type: e.event_type || e.action || src,
        actor: e.actor_id || e.actor_name || e.requested_by || e.reviewer_role || "—",
        reason: e.reason || e.violation_reason || "",
        src,
      }));
      const all = [...norm(audit, "audit"), ...norm(traces, "runtime"), ...norm(evidence, "evidence")]
        .filter((e) => e.ts)
        .sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime());
      setEvents(all);
    }).catch((e) => setErr(e instanceof Error ? e.message : "Failed to reconstruct audit timeline"))
      .finally(() => setBusy(false));
  }, [promptId]);

  if (busy) return <Spinner label="Reconstructing lifecycle timeline…" />;
  if (err) return <ErrorNote msg={err} />;
  if (events.length === 0) return <Empty msg="No audit/runtime/evidence events recorded for this prompt." />;

  return (
    <div className="space-y-1">
      <p className={`mb-2 text-[11px] ${muted}`}>Chronological: draft → review → approve → deploy → commission → active → rollback/retire, with governance blocks, receipts, governed executions, and evidence exports.</p>
      {events.map((e, i) => (
        <div key={i} className="flex items-start gap-3 rounded-xl bg-[var(--surface)] p-2 text-xs">
          <span className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${e.src === "runtime" ? "bg-indigo-400" : e.src === "evidence" ? "bg-amber-300" : "bg-[var(--border)]"}`} />
          <div className="min-w-0 flex-1">
            <p className={`font-medium ${eventTone(e.type)}`}>{e.type} <span className={`ml-1 text-[10px] uppercase ${muted}`}>{e.src}</span></p>
            <p className={`${muted} truncate`}>{e.actor}{e.reason ? ` · ${e.reason}` : ""}</p>
          </div>
          <span className={`shrink-0 text-[10px] ${muted}`}>{e.ts ? new Date(e.ts).toLocaleString() : ""}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Center ──────────────────────────────────────────────────────────────────
export function PromptGovernanceCenter({
  embedded = false,
  initialPromptId,
  initialVersionId,
}: {
  embedded?: boolean;
  initialPromptId?: string;
  initialVersionId?: string;
} = {}) {
  const { role } = useRoleContext();
  const [prompts, setPrompts] = useState<PromptRow[]>([]);
  const [promptId, setPromptId] = useState<string>("");
  const [prompt, setPrompt] = useState<PromptRow | null>(null);
  const [versions, setVersions] = useState<PromptVersion[]>([]);
  const [versionId, setVersionId] = useState<string>("");
  const [version, setVersion] = useState<PromptVersion | null>(null);
  const [view, setView] = useState<View>("code");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pendingVersionRef = useRef<string | null>(null);
  // Capture the initial target (prop or URL query) once so the list-load
  // effect below resolves to it without a re-fetch race.
  const initialTargetRef = useRef<{ promptId?: string; versionId?: string }>({
    promptId: initialPromptId,
    versionId: initialVersionId,
  });

  useEffect(() => {
    let qpPrompt: string | null = null;
    let qpVersion: string | null = null;
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      qpPrompt = sp.get("promptId");
      qpVersion = sp.get("versionId");
    }
    const targetPrompt = initialTargetRef.current.promptId || qpPrompt;
    pendingVersionRef.current = initialTargetRef.current.versionId ?? qpVersion;
    promptGovApi.listPrompts()
      .then((list) => {
        setPrompts(list);
        const initial = targetPrompt && list.some((p) => p.id === targetPrompt) ? targetPrompt : list[0]?.id || "";
        if (initial) setPromptId(initial);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Unable to load prompts"))
      .finally(() => setLoading(false));
  }, []);

  // When the embedding parent selects a different prompt (e.g. via the
  // registry drawer's "Open in Governance Center" action), retarget in-place.
  useEffect(() => {
    if (!initialPromptId) return;
    pendingVersionRef.current = initialVersionId ?? null;
    setPromptId(initialPromptId);
  }, [initialPromptId, initialVersionId]);

  useEffect(() => {
    if (!promptId) return;
    setError(null);
    Promise.all([promptGovApi.getPrompt(promptId), promptGovApi.listVersions(promptId)])
      .then(([p, vs]) => {
        setPrompt(p);
        const list = Array.isArray(vs) ? vs : [];
        setVersions(list);
        const want = pendingVersionRef.current;
        const cur = want && list.some((v) => v.id === want) ? want : (p as any).current_version_id || list[0]?.id || "";
        pendingVersionRef.current = null;
        setVersionId(cur);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Unable to load prompt detail"));
  }, [promptId]);

  useEffect(() => {
    if (!promptId || !versionId) { setVersion(null); return; }
    promptGovApi.getVersion(promptId, versionId).then(setVersion).catch(() => setVersion(null));
  }, [promptId, versionId]);

  if (loading) return <Spinner label="Loading Prompt Governance…" />;

  const sel = "rounded-lg border border-[var(--border)] bg-[var(--card)] px-2 py-1.5 text-xs";
  return (
    <div className="space-y-4">
      {!embedded && (
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-[var(--foreground)]">Prompt Governance Center</h1>
            <p className={`text-sm ${muted}`}>Prompt-as-Code, version diffs, governance receipts, commissioning, and audit reconstruction.</p>
          </div>
          <a href="/agents/prompts" className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs ${muted} hover:text-[var(--foreground)]`}>
            <ArrowLeft className="h-3.5 w-3.5" /> Prompt Registry
          </a>
        </div>
      )}

      {error && (isPermissionError(error) ? <PermissionDenied /> : <ErrorNote msg={error} />)}

      <div className="flex flex-wrap items-center gap-2">
        <select className={sel} value={promptId} onChange={(e) => setPromptId(e.target.value)}>
          {prompts.length === 0 && <option value="">No prompts</option>}
          {prompts.map((p) => <option key={p.id} value={p.id}>{p.name}{p.use_case_key ? ` · ${p.use_case_key}` : ""}</option>)}
        </select>
        {versions.length > 0 && (
          <select className={sel} value={versionId} onChange={(e) => setVersionId(e.target.value)}>
            {versions.map((v) => <option key={v.id} value={v.id}>v{v.version_number} · {v.id.slice(0, 8)}</option>)}
          </select>
        )}
      </div>

      <div className="flex flex-wrap gap-1 border-b border-[var(--border)]">
        {VIEWS.map((v) => (
          <button
            key={v.id}
            onClick={() => setView(v.id)}
            className={`inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-medium transition ${view === v.id ? "border-indigo-400 text-[var(--foreground)]" : `border-transparent ${muted} hover:text-[var(--foreground)]`}`}
          >
            {v.icon} {v.label}
          </button>
        ))}
      </div>

      <div className={`${card} p-4`}>
        {!prompt ? <Empty msg="Select a prompt to begin." /> : (
          <>
            {view === "code" && <PromptAsCode prompt={prompt} version={version} />}
            {view === "diff" && <DiffViewer promptId={prompt.id} versions={versions} />}
            {view === "receipt" && <ReceiptViewer prompt={prompt} versionId={versionId || null} role={role} />}
            {view === "commission" && <CommissioningPanel promptId={prompt.id} />}
            {view === "audit" && <AuditReconstruction promptId={prompt.id} />}
          </>
        )}
      </div>
    </div>
  );
}
