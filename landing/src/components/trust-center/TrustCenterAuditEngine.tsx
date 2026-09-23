import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CONTAINER, Eyebrow, Photo, SectionLede, SectionTitle, type ImageSlot } from "./shared";

const COMPONENTS: { image: ImageSlot; label: string; title: string; area: string }[] = [
  {
    image: "decisionLedger",
    label: "Component 02 · Decision Ledger",
    title: "The human-readable record of why every material decision was made.",
    area: "sm:col-span-2 lg:col-span-2",
  },
  {
    image: "evidenceVault",
    label: "Component 03 · Evidence Vault",
    title: "Sealed, exportable evidence packages per campaign.",
    area: "",
  },
  {
    image: "forensicHub",
    label: "Component 04 · Forensic Hub",
    title: "Cross-referenced reconstruction for disputes and investigations.",
    area: "",
  },
  {
    image: "identityLedger",
    label: "Component 05 · Identity Ledger",
    title: "Every privileged action bound to actor, role, and session.",
    area: "",
  },
  {
    image: "evidenceExports",
    label: "Evidence Exports",
    title: "Export-ready packages for legal, regulatory, and audit use.",
    area: "",
  },
];

export default function TrustCenterAuditEngine() {
  return (
    <section id="audit-engine" className={`${CONTAINER} scroll-mt-24 py-14 sm:py-20`}>
      <Eyebrow>Audit Engine &amp; Evidence Architecture</Eyebrow>
      <SectionTitle className="max-w-[560px]">
        Five layers. Every event. Complete traceability.
      </SectionTitle>
      <SectionLede>
        The ZoikoVertex Audit Engine creates linked evidence records across five
        components for every governed workflow event — automatically, by
        platform architecture, not by configuration.
      </SectionLede>

      <div className="mt-10 sm:mt-12 grid gap-0.5 overflow-hidden rounded-2xl bg-[#080d1a] sm:grid-cols-2 lg:grid-cols-4 lg:grid-rows-[290px_230px]">
        {/* Component 01 — tall feature tile */}
        <article className="relative flex min-h-[420px] flex-col justify-end overflow-hidden p-6 sm:col-span-2 lg:col-span-1 lg:row-span-2">
          <Photo slot="auditTrail" sizes="(max-width: 1024px) 100vw, 266px" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#080d1a]/20 via-[#080d1a]/70 to-[#080d1a]/95" />
          <div className="relative">
            <span className="text-[9.5px] font-medium uppercase tracking-[0.14em] text-[#E8B768] font-[family-name:var(--font-jetbrains)]">
              Component 01 · Audit Trail
            </span>
            <h3 className="mt-2 text-[22px] font-extrabold leading-[1.25] text-white font-[family-name:var(--font-bricolage)]">
              The complete, immutable event log of everything that happened.
            </h3>
            <p className="mt-2 text-[13px] font-light leading-[1.6] text-white/50">
              Every AI task, workflow transition, approval action, policy
              check, integration call, user action, and configuration change —
              timestamped, actor-referenced, and cross-linked to related
              evidence records. Append-only, tamper-evident, and export-ready.
            </p>
            <Link
              href="/audit-engine"
              className="mt-5 inline-flex items-center gap-1.5 text-[11px] text-[#E8B768] transition-colors hover:text-[#E8B768]/80 font-[family-name:var(--font-jetbrains)]"
            >
              <ArrowRight className="h-3 w-3" strokeWidth={2} />
              Explore Audit Engine
            </Link>
          </div>
        </article>

        {COMPONENTS.map(({ image, label, title, area }) => (
          <article
            key={label}
            className={`relative flex min-h-[230px] flex-col justify-end overflow-hidden p-6 ${area}`}
          >
            <Photo slot={image} sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 540px" />
            <div className="absolute inset-0 bg-gradient-to-b from-[#080d1a]/10 via-[#080d1a]/60 to-[#080d1a]/90" />
            <div className="relative">
              <span className="text-[9.5px] font-medium uppercase tracking-[0.14em] text-[#20E7F2] font-[family-name:var(--font-jetbrains)]">
                {label}
              </span>
              <h3 className="mt-2 text-[15px] font-bold leading-snug text-white font-[family-name:var(--font-bricolage)]">
                {title}
              </h3>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
