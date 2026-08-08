import Link from "next/link";
import { BackdropImage, Chip, CONTAINER, Eyebrow } from "./shared";

const SURFACES = [
  "Audit Trail",
  "Decision Ledger",
  "Evidence Vault",
  "Identity Ledger",
  "Forensic Hub",
  "Legal Holds",
];

export default function AuditabilityHero() {
  return (
    <section className="relative overflow-hidden bg-[#080d1a]">
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_-8%,rgba(32,231,242,0.13),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_30%,rgba(0,0,0,0.9),transparent_78%)]" />
        <div className="absolute inset-0 opacity-50 bg-gradient-to-b from-white/[0.04] to-transparent" />
      </div>

      <div className={`${CONTAINER} relative z-10 py-16 lg:py-20`}>
        <div className="grid items-start gap-12 lg:grid-cols-[547px_1fr] lg:items-center">
          <div className="flex flex-col gap-5 pt-2">
            <Eyebrow>Auditability for governed agentic execution</Eyebrow>

            <h1 className="max-w-[420px] text-[clamp(2.1rem,4.4vw,3rem)] font-extrabold leading-[1.15] tracking-tight text-slate-100 font-[family-name:var(--font-bricolage)]">
              Make every AI workflow traceable, reviewable, and{" "}
              <span className="text-[#20E7F2]">evidence-backed.</span>
            </h1>

            <p className="max-w-[515px] text-base font-normal leading-7 text-white/60">
              ZoikoVertex records the actions, decisions, approvals, identities,
              evidence, exports, and exceptions behind agentic workflows — so
              enterprise teams can move faster without losing accountability.
            </p>

            <div className="flex flex-wrap gap-3.5 pt-2.5 pb-3.5">
              <Link
                href="/request-demo"
                className="inline-flex items-center justify-center rounded-[10px] bg-gradient-to-b from-[#20E7F2] to-[#12c9d4] px-5 py-3.5 text-sm font-semibold text-[#080d1a] shadow-[0_10px_30px_-12px_rgba(32,231,242,0.55)] ring-1 ring-[#20E7F2]/40 transition-opacity hover:opacity-90"
              >
                Request an Auditability Demo
              </Link>
              <Link
                href="/governance"
                className="inline-flex items-center justify-center rounded-[10px] border border-white/25 px-5 py-3.5 text-sm font-semibold text-slate-100 transition-colors hover:border-white/45"
              >
                Download Auditability Brief
              </Link>
            </div>

            <div className="border-t border-white/10 pt-6">
              <p className="text-[11px] font-normal uppercase leading-4 tracking-[0.14em] text-white/35 font-[family-name:var(--font-jetbrains)]">
                Five connected evidence surfaces + legal holds
              </p>
              <div className="mt-4 flex flex-wrap gap-2.5">
                {SURFACES.map((s) => (
                  <Chip key={s}>{s}</Chip>
                ))}
              </div>
            </div>
          </div>

          {/* Centred on the right of the hero, on the Figma's 525×394 ratio. */}
          <div className="flex justify-center lg:justify-end">
            <div className="relative aspect-[525/394] w-full max-w-[525px] overflow-hidden rounded-[20px] border border-white/10 bg-[#0b1120] shadow-[0_0_4px_rgba(0,0,0,0.25)]">
              <BackdropImage
                slot="hero"
                priority
                sizes="(max-width: 1024px) 100vw, 525px"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
