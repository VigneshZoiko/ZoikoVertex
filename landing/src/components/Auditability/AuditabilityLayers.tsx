import Link from "next/link";
import { CONTAINER, SectionHead } from "./shared";

const LAYERS = [
  {
    label: "This page",
    title: "Auditability",
    text: "The proof engine: what happened, who acted, why, what evidence exists, and how it's reviewed and exported.",
    answers: "“Can you prove it?”",
    href: null,
    active: true,
  },
  {
    label: "Related",
    title: "Compliance & Governance",
    text: "The policy and control framework: the rules, roles, and processes that govern how AI execution is allowed to happen.",
    answers: "“What are the rules?”",
    href: "/governance",
    active: false,
  },
  {
    label: "Related",
    title: "Responsible AI",
    text: "The principles: bounded, traceable, reviewable AI actions, linked to decisions and supported by evidence.",
    answers: "“Is it done responsibly?”",
    href: "/responsible-ai",
    active: false,
  },
];

export default function AuditabilityLayers() {
  return (
    <section className="bg-[#0a0f1c] py-20">
      <div className={CONTAINER}>
        <SectionHead
          eyebrow="Where auditability fits"
          tone="amber"
          title="Proof, policy, and principles — three distinct layers."
          lede="Auditability is the proof and traceability layer. It works alongside — not instead of — your policy framework and AI principles."
        />

        <div className="mt-12 grid gap-3 lg:grid-cols-3">
          {LAYERS.map((l) => {
            const card = (
              <article
                className={`relative flex h-full flex-col overflow-hidden rounded-xl border p-6 transition-colors ${
                  l.active
                    ? "border-[#20E7F2]/60 bg-[#0e2b33] shadow-[0_0_40px_-16px_rgba(32,231,242,0.55)]"
                    : "border-white/10 bg-[#111827] hover:border-white/25"
                }`}
              >
                {/* Cyan wash on the active card */}
                {l.active && (
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_0%_0%,rgba(32,231,242,0.22),transparent_62%)]"
                  />
                )}

                <span
                  className={`relative text-[10px] font-normal uppercase leading-4 tracking-[0.12em] font-[family-name:var(--font-jetbrains)] ${
                    l.active ? "text-[#20E7F2]" : "text-white/40"
                  }`}
                >
                  {l.label}
                </span>
                <h3
                  className={`relative mt-3 text-lg font-extrabold leading-6 font-[family-name:var(--font-bricolage)] ${
                    l.active ? "text-[#20E7F2]" : "text-slate-100"
                  }`}
                >
                  {l.title}
                </h3>
                <p
                  className={`relative mt-3 flex-1 text-xs font-normal leading-5 ${
                    l.active ? "text-white/70" : "text-white/55"
                  }`}
                >
                  {l.text}
                </p>
                <span
                  className={`relative mt-5 border-t pt-3 text-[10px] font-normal leading-4 font-[family-name:var(--font-jetbrains)] ${
                    l.active
                      ? "border-[#20E7F2]/25 text-[#20E7F2]/80"
                      : "border-white/10 text-white/45"
                  }`}
                >
                  Answers · {l.answers}
                </span>
              </article>
            );

            return l.href ? (
              <Link key={l.title} href={l.href} className="h-full">
                {card}
              </Link>
            ) : (
              <div key={l.title} className="h-full">
                {card}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
