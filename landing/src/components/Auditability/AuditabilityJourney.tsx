import { CONTAINER, Eyebrow, SectionLede, SectionTitle } from "./shared";

const STEPS = [
  {
    n: 1,
    title: "Event occurs",
    text: "An AI agent generates, edits, approves, publishes, blocks, exports, or escalates content.",
  },
  {
    n: 2,
    title: "Decision captured",
    text: "A decision badge appears when approval or policy judgment exists.",
  },
  { n: 3, title: "Evidence sealed", text: "The evidence package is stored and sealed." },
  {
    n: 4,
    title: "Actor verified",
    text: "The identity badge shows role, session, and authority.",
  },
  {
    n: 5,
    title: "Case opened",
    tag: "conditional",
    text: "Optional — escalate to a Forensic Hub case if flagged or disputed.",
  },
  {
    n: 6,
    title: "Bundle exported",
    text: "An audit bundle is generated with a manifest; the export is itself logged.",
  },
];

/**
 * The record panel mirrors all five surfaces. Only the surface belonging to the
 * active step is lit; the rest are dimmed until their step is reached.
 */
const GROUPS: {
  surface: string;
  active?: boolean;
  rows: { label: string; value: string; tone?: "cyan" | "amber" | "plain" }[];
}[] = [
  {
    surface: "Audit Trail",
    active: true,
    rows: [
      { label: "Actor", value: "Agent · Campaign Copywriter" },
      { label: "Action", value: "Draft generated", tone: "cyan" },
      { label: "Object", value: "Q3 Regulated Claim / #1204" },
      { label: "Timestamp", value: "2026-07-08 14:22:07 UTC" },
    ],
  },
  {
    surface: "Decision Ledger",
    rows: [
      { label: "Approver", value: "J. Reyes · Clinical Reviewer" },
      { label: "Policy basis", value: "Regulated Claims Policy v4" },
      { label: "Review stage", value: "Approved with edits", tone: "cyan" },
    ],
  },
  {
    surface: "Evidence Vault",
    rows: [
      { label: "Package", value: "EVP-1204-A" },
      { label: "Contents", value: "Prompt · Output · Approval · Policy" },
      { label: "Retention class", value: "Governance · 7yr", tone: "amber" },
    ],
  },
  {
    surface: "Identity Ledger",
    rows: [
      { label: "Role at action", value: "Reviewer" },
      { label: "MFA state", value: "Passed", tone: "cyan" },
      { label: "Privileged access", value: "No" },
    ],
  },
  {
    surface: "Forensic Hub",
    rows: [
      { label: "Case", value: "CASE-0731 · optional" },
      { label: "Source event", value: "ZV-EV-8842190" },
      { label: "Status", value: "Under review", tone: "amber" },
    ],
  },
];

export default function AuditabilityJourney() {
  return (
    <section className="bg-[#080d1a] py-20">
      <div className={CONTAINER}>
        <div className="flex max-w-[640px] flex-col gap-3.5 pt-2">
          <Eyebrow tone="amber">Audit journey</Eyebrow>
          <SectionTitle>Watch one event become defensible proof.</SectionTitle>
          <SectionLede className="max-w-[556px]">
            Step through a real governed workflow event. Each step activates a
            surface, links a record, and stamps a status — ending in an
            exportable, verifiable bundle.
          </SectionLede>
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-2">
          {/* ── Stepper ─────────────────────────────────────────────── */}
          <ol className="rounded-2xl border border-white/10 bg-[#111827] p-3">
            {STEPS.map((s, i) => {
              const active = i === 0;
              return (
                <li
                  key={s.n}
                  className={`relative flex items-start gap-3.5 rounded-xl px-3.5 py-4 ${
                    active ? "bg-[#20E7F2]/[0.08]" : ""
                  }`}
                >
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold leading-4 font-[family-name:var(--font-jetbrains)] ${
                      active
                        ? "bg-[#20E7F2] text-[#080d1a]"
                        : "border border-white/25 text-white/55"
                    }`}
                  >
                    {s.n}
                  </span>

                  <span className="min-w-0 flex flex-col gap-0.5">
                    <span className="flex flex-wrap items-center gap-2">
                      <span
                        className={`text-sm font-semibold leading-5 ${
                          active ? "text-[#20E7F2]" : "text-slate-100"
                        }`}
                      >
                        {s.title}
                      </span>
                      {s.tag && (
                        <span className="rounded-[5px] border border-[#E8B768]/30 px-1.5 py-0.5 text-[9px] font-medium leading-3 tracking-tight text-[#E8B768] font-[family-name:var(--font-jetbrains)]">
                          {s.tag}
                        </span>
                      )}
                    </span>
                    <span className="text-xs font-normal leading-4 text-white/55">
                      {s.text}
                    </span>
                  </span>

                  {i < STEPS.length - 1 && (
                    <span
                      aria-hidden
                      className="absolute left-[26px] top-[44px] h-8 w-px bg-white/10"
                    />
                  )}
                </li>
              );
            })}
          </ol>

          {/* ── Live audit record ───────────────────────────────────── */}
          <div className="overflow-hidden rounded-2xl border border-white/25 bg-gradient-to-b from-[#131c2e] to-[#0a0f1c] shadow-[0_30px_70px_-40px_rgba(0,0,0,0.7)]">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-5 py-4">
              <span className="text-xs font-normal uppercase leading-4 tracking-wider text-white/55 font-[family-name:var(--font-jetbrains)]">
                Audit record · live
              </span>
              <span className="text-xs font-normal leading-4 text-[#20E7F2] font-[family-name:var(--font-jetbrains)]">
                ZV-EV-8842190
              </span>
            </div>

            <div className="flex min-h-12 flex-wrap items-start gap-2 border-b border-white/10 px-5 py-3.5">
              <span className="rounded-md border border-[#20E7F2]/30 bg-[#20E7F2]/[0.06] px-2 py-1 text-[10px] font-bold leading-4 tracking-wide text-[#20E7F2] font-[family-name:var(--font-jetbrains)]">
                Logged
              </span>
            </div>

            <div className="px-5 pt-1.5 pb-4">
              <p className="border-b border-white/10 pt-3 pb-3.5 text-xs leading-5 text-white/70">
                You see: an{" "}
                <span className="font-bold text-slate-100">
                  agent generated a regulated Q3 claim
                </span>{" "}
                and it entered the workflow.
              </p>

              {GROUPS.map((g) => (
                <div key={g.surface} className="border-b border-white/10 py-3.5">
                  <div className="flex items-center gap-[15px]">
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        g.active
                          ? "bg-[#E8B768] shadow-[0_0_8px_rgba(232,183,104,1)]"
                          : "bg-white/20"
                      }`}
                    />
                    <span
                      className={`text-xs font-normal uppercase leading-4 tracking-wide font-[family-name:var(--font-jetbrains)] ${
                        g.active ? "text-[#E8B768]" : "text-white/30"
                      }`}
                    >
                      {g.surface}
                    </span>
                  </div>

                  <dl className="mt-3.5 space-y-2.5">
                    {g.rows.map((r) => (
                      <div
                        key={r.label}
                        className="flex items-start justify-between gap-4"
                      >
                        <dt
                          className={`text-xs font-normal leading-4 ${
                            g.active ? "text-white/55" : "text-white/35"
                          }`}
                        >
                          {r.label}
                        </dt>
                        <dd
                          className={`text-right text-xs font-normal leading-4 font-[family-name:var(--font-jetbrains)] ${
                            r.tone === "cyan"
                              ? "text-[#20E7F2]"
                              : r.tone === "amber"
                                ? "text-[#E8B768]"
                                : g.active
                                  ? "text-slate-100"
                                  : "text-white/45"
                          }`}
                        >
                          {r.value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ))}

              <div className="flex items-center justify-between pt-4">
                <span className="text-[10px] font-normal uppercase leading-4 tracking-wider text-white/35 font-[family-name:var(--font-jetbrains)]">
                  Step 1 / 6
                </span>
                <span className="rounded-md bg-[#20E7F2] px-3 py-1.5 text-[10px] font-bold leading-4 text-[#080d1a] font-[family-name:var(--font-jetbrains)]">
                  Next step
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
