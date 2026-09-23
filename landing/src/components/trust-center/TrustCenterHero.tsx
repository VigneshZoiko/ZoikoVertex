import Link from "next/link";
import { Mail, ShieldCheck } from "lucide-react";
import { CONTAINER, Photo, SECURITY_MAILTO } from "./shared";

const STATS = [
  { value: "SOC 2", label: "Type II — in progress" },
  { value: "AES-256", label: "Data at rest encryption" },
  { value: "5-layer", label: "Evidence architecture" },
  { value: "NIST", label: "AI RMF aligned" },
];

export default function TrustCenterHero() {
  return (
    <section className="relative overflow-hidden bg-[#080d1a]">
      {/* Overlay stops fitted against the Figma render: photo at ~60%
          saturation under a navy wash fading from ~58% (left) to ~10%. */}
      <div className="absolute inset-0">
        <Photo slot="hero" priority className="saturate-[0.6]" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(8,13,26,0.58)_0%,rgba(8,13,26,0.55)_35%,rgba(8,13,26,0.45)_50%,rgba(8,13,26,0.35)_70%,rgba(8,13,26,0.26)_85%,rgba(8,13,26,0.1)_100%)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#20E7F2]/[0.03] to-transparent to-[2%]" />
        {/* Below lg the copy spans the bright right side of the photo. */}
        <div className="absolute inset-0 bg-[#080d1a]/45 lg:hidden" />
      </div>

      <div className={`${CONTAINER} relative z-10 py-16 lg:py-20`}>
        <div className="inline-flex items-center gap-1.5 rounded-full border border-[#22C55E]/[0.22] bg-[#22C55E]/10 py-[5px] pl-2 pr-3.5">
          <span className="h-[5px] w-[5px] rounded-[2px] bg-[#22C55E]" />
          <span className="text-[11px] font-medium uppercase tracking-[0.1em] text-[#22C55E] font-[family-name:var(--font-jetbrains)]">
            Trust Center · Enterprise Grade
          </span>
        </div>

        <h1 className="mt-5 max-w-[700px] text-[clamp(2.5rem,6vw,4.5rem)] font-extrabold leading-[1.02] tracking-tight text-white font-[family-name:var(--font-bricolage)]">
          Security, compliance, privacy, and AI governance.{" "}
          <span className="text-[#20E7F2]">All in one place.</span>
        </h1>

        <p className="mt-5 max-w-[620px] text-base font-light leading-7 text-white/50">
          The ZoikoVertex Trust Center is the definitive reference for
          enterprise buyers, CISOs, legal teams, compliance officers, data
          protection authorities, and procurement committees evaluating
          ZoikoVertex for enterprise deployment.
        </p>

        <div className="flex flex-col gap-3 pb-8 pt-5 sm:flex-row sm:flex-wrap">
          <Link
            href="#security-review"
            className="inline-flex items-center justify-center gap-1.5 rounded-full bg-[#20E7F2] px-6 py-3 text-sm font-bold text-[#080d1a] transition-colors hover:bg-[#20E7F2]/90"
          >
            <ShieldCheck className="h-3.5 w-3.5" strokeWidth={2.5} />
            Request Security Review
          </Link>
          <a
            href={SECURITY_MAILTO}
            className="inline-flex items-center justify-center gap-1.5 rounded-full bg-[#E8B768] px-6 py-3 text-sm font-bold text-[#080d1a] transition-colors hover:bg-[#E8B768]/90"
          >
            <Mail className="h-3.5 w-3.5" strokeWidth={2.5} />
            Contact Security Team
          </a>
        </div>

        <div className="grid grid-cols-2 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#080d1a]/55 backdrop-blur-[5px] md:grid-cols-4">
          {STATS.map(({ value, label }, i) => (
            <div
              key={value}
              className={`flex flex-col gap-1.5 border-white/[0.08] px-4 py-4 sm:px-6 sm:py-5 ${
                i % 2 === 0 ? "border-r" : ""
              } ${i < 2 ? "border-b md:border-b-0" : ""} ${
                i === 1 ? "md:border-r" : ""
              }`}
            >
              <span className="text-[24px] font-extrabold leading-8 text-[#22C55E] sm:text-[30px] font-[family-name:var(--font-bricolage)]">
                {value}
              </span>
              <span className="text-[9.6px] font-medium uppercase tracking-[0.08em] text-white/[0.32] font-[family-name:var(--font-jetbrains)]">
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
