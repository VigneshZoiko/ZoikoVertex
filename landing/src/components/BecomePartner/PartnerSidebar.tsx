import Link from "next/link";
import { Check, CircleX } from "lucide-react";
import { Icon } from "./shared";

const REVIEW = [
  { title: "Apply", meta: "~15 min" },
  { title: "Qualification", meta: "Response within 5 biz days" },
  { title: "Legal & security review", meta: "2–4 weeks" },
  { title: "Enablement", meta: "Guided onboarding" },
  { title: "Launch & co-sell", meta: "QBR at activation" },
];

const CRITERIA = [
  { ok: true, text: "Enterprise delivery or market access capability" },
  { ok: true, text: "Security and compliance maturity" },
  { ok: true, text: "Responsible AI messaging standards" },
  { ok: false, text: "Consumer or SMB-only organizations" },
  { ok: false, text: "No verifiable enterprise customer base" },
];

export type SummaryRow = { label: string; value: string };

export default function PartnerSidebar({ summary }: { summary: SummaryRow[] }) {
  return (
    <aside className="flex flex-col gap-6">
      {/* ── Your application ────────────────────────────────────── */}
      <section className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950">
        <header className="flex items-center gap-4 border-b border-white/5 px-6 py-5">
          <span className="flex h-7 w-7 items-center justify-center rounded-md border border-[#20E7F2]/20 bg-[#20E7F2]/10">
            <Icon name="yourApplication" size={14} />
          </span>
          <h2 className="text-sm font-bold text-white/90 font-[family-name:var(--font-bricolage)]">
            Your application
          </h2>
        </header>

        <dl className="px-6 py-2">
          {summary.map((row, i) => (
            <div
              key={row.label}
              className={`flex items-center justify-between gap-4 py-3 ${
                i < summary.length - 1 ? "border-b border-white/5" : ""
              }`}
            >
              <dt className="text-[9.6px] font-medium uppercase tracking-wide text-white/30 font-[family-name:var(--font-jetbrains)]">
                {row.label}
              </dt>
              <dd
                className={`truncate text-right text-xs font-light leading-5 ${
                  row.value === "—" ? "text-white/20" : "text-white/80"
                }`}
              >
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* ── Partner review process ──────────────────────────────── */}
      <section className="rounded-2xl border border-white/10 bg-gray-900 p-6">
        <div className="flex items-center gap-3.5">
          <Icon name="partnerReviewProcess" size={14} />
          <h2 className="text-sm font-bold text-white/90 font-[family-name:var(--font-bricolage)]">
            Partner review process
          </h2>
        </div>

        <ol className="mt-5">
          {REVIEW.map((r, i) => {
            const first = i === 0;
            return (
              <li key={r.title} className="relative flex gap-4 pb-5 last:pb-0">
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-xl border text-xs ${
                    first
                      ? "border-[#20E7F2] bg-[#20E7F2] text-slate-950"
                      : "border-white/10 bg-white/5 text-white/30"
                  }`}
                >
                  {first ? (
                    <Icon name="apply" size={10} />
                  ) : (
                    i + 1
                  )}
                </span>

                <span>
                  <span
                    className={`block text-xs font-bold font-[family-name:var(--font-bricolage)] ${
                      first ? "text-white/90" : "text-white/50"
                    }`}
                  >
                    {r.title}
                  </span>
                  <span className="mt-1 block text-[9.6px] font-medium text-white/25 font-[family-name:var(--font-jetbrains)]">
                    {r.meta}
                  </span>
                </span>

                {i < REVIEW.length - 1 && (
                  <span
                    aria-hidden
                    className="absolute left-3 top-7 h-[calc(100%-1.75rem)] w-px bg-white/10"
                  />
                )}
              </li>
            );
          })}
        </ol>
      </section>

      {/* ── Selective program ───────────────────────────────────── */}
      <section className="rounded-2xl border border-white/10 bg-gray-900 p-6">
        <div className="flex items-center gap-3.5">
          <Icon name="selectiveProgram" size={14} />
          <h2 className="text-sm font-bold text-white/90 font-[family-name:var(--font-bricolage)]">
            Selective program
          </h2>
        </div>

        <ul className="mt-4 space-y-2.5">
          {CRITERIA.map((c) => (
            <li key={c.text} className="flex items-start gap-3">
              {c.ok ? (
                <Check
                  className="mt-1 h-3 w-3 shrink-0 text-green-500"
                  strokeWidth={3}
                />
              ) : (
                <CircleX
                  className="mt-1 h-3 w-3 shrink-0 text-red-500"
                  strokeWidth={2.5}
                />
              )}
              <span className="text-xs font-light leading-5 text-white/50">
                {c.text}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* ── Privacy notice ──────────────────────────────────────── */}
      <div className="flex gap-3 rounded-xl border border-orange-400/20 bg-orange-400/5 px-5 py-4">
        <span className="mt-0.5 shrink-0"><Icon name="warning" size={16} /></span>
        <p className="text-[10px] font-medium leading-4 text-orange-400/75 font-[family-name:var(--font-jetbrains)]">
          Data submitted is processed under our{" "}
          <Link href="/privacy" className="text-orange-400 underline">
            Privacy Policy
          </Link>
          . Partner applications are reviewed internally and not shared publicly.
          You may request deletion at any time.
        </p>
      </div>
    </aside>
  );
}
