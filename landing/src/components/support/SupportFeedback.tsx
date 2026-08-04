"use client";

import { CONTAINER, SectionHeadLeft } from "./shared";

const AREAS = [
  "Workflows & approvals",
  "AI agents",
  "Integrations & API",
  "Evidence & auditability",
  "Admin & permissions",
  "Reporting & ROI",
  "Billing & account",
];

const FIELD =
  "w-full rounded-lg border border-white/25 bg-[#080d1a] px-3.5 py-3 text-sm text-slate-100 outline-none transition-colors placeholder:text-white/30 focus:border-[#20E7F2]/60";

export default function SupportFeedback() {
  return (
    <section className="bg-[#0a1020] py-20">
      <div className={CONTAINER}>
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <SectionHeadLeft
            eyebrow="Feedback & product loop"
            title={
              <>
                Support that improves the
                <br className="hidden sm:block" /> product.
              </>
            }
            lede="Recurring friction, integration failures, and unanswered questions feed directly into our roadmap — so the issue you hit once doesn't come back."
          />

          {/*
            Presentational, matching the other landing forms: there is no
            submit endpoint in this app yet, so submit is intentionally a no-op.
          */}
          <form
            onSubmit={(e) => e.preventDefault()}
            className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-[#0b1120] p-6"
          >
            <h3 className="text-base font-bold leading-6 text-slate-100">
              Share product feedback
            </h3>

            <label className="flex flex-col gap-2">
              <span className="text-xs font-semibold leading-5 text-white/70">
                What could work better?
              </span>
              <textarea
                rows={4}
                placeholder="Describe the friction, missing capability, or recurring issue…"
                className={`${FIELD} resize-y`}
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="flex items-center gap-1.5 text-xs font-semibold leading-5 text-white/70">
                Area
                <span className="font-normal text-white/35">optional</span>
              </span>
              <select className={FIELD} defaultValue={AREAS[0]}>
                {AREAS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="submit"
              className="mt-1 w-full rounded-[10px] bg-gradient-to-b from-[#20E7F2] to-[#12c9d4] px-5 py-3 text-sm font-semibold text-[#080d1a] shadow-[0_10px_30px_-12px_rgba(32,231,242,0.55)] ring-1 ring-[#20E7F2]/40 transition-opacity hover:opacity-90"
            >
              Share feedback
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
