import Link from "next/link";
import { CONTAINER, DISPLAY, Eyebrow } from "./shared";

export default function SupportCta() {
  return (
    <section className="relative overflow-hidden bg-[#080d1a] py-20">
      <div
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(32,231,242,0.10),transparent_60%)]"
        aria-hidden
      />

      <div
        className={`${CONTAINER} relative z-10 flex flex-col items-center text-center`}
      >
        <Eyebrow center>ZoikoVertex Support</Eyebrow>

        <h2
          className={`mt-4 max-w-[620px] text-[clamp(1.9rem,3.8vw,2.75rem)] font-extrabold leading-[1.12] tracking-tight text-slate-100 ${DISPLAY}`}
        >
          Need help choosing the right support path?
        </h2>

        <p className="mt-5 max-w-[560px] text-base font-normal leading-7 text-white/55">
          Contact ZoikoVertex Support or speak with our enterprise team.
          We&apos;ll route you to the right specialist.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3.5">
          <a
            href="#new-request"
            className="inline-flex items-center justify-center rounded-[10px] bg-gradient-to-b from-[#20E7F2] to-[#12c9d4] px-5 py-3.5 text-sm font-semibold text-[#080d1a] shadow-[0_10px_30px_-12px_rgba(32,231,242,0.55)] ring-1 ring-[#20E7F2]/40 transition-opacity hover:opacity-90"
          >
            Contact Support
          </a>
          <Link
            href="/contact-sales"
            className="inline-flex items-center justify-center rounded-[10px] bg-gradient-to-b from-[#EFC77E] to-[#D9A253] px-5 py-3.5 text-sm font-semibold text-[#080d1a] shadow-[0_10px_30px_-12px_rgba(232,183,104,0.45)] transition-opacity hover:opacity-90"
          >
            Talk to Enterprise Team
          </Link>
          <Link
            href="/roi-governance-audit"
            className="inline-flex items-center justify-center rounded-[10px] border border-white/25 px-5 py-3.5 text-sm font-semibold text-slate-100 transition-colors hover:border-white/45"
          >
            Book a Support Review
          </Link>
        </div>
      </div>
    </section>
  );
}
