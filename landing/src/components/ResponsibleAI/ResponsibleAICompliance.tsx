import Link from "next/link";
import { FileText } from "lucide-react";
import {
  BackdropImage,
  CONTAINER,
  Eyebrow,
  Icon,
  SectionLede,
  SectionTitle,
} from "./shared";

const PRIVACY: { icon: string; tile: string; title: string; text: string }[] = [
  {
    icon: "dataMinimization",
    tile: "border-[#20E7F2]/20 bg-[#20E7F2]/10",
    title: "Data Minimization",
    text: "Collect and retain only what is required for execution, evidence duties, security, billing, support, or legal obligations.",
  },
  {
    icon: "encryptionAccessControls",
    tile: "border-orange-400/25 bg-orange-400/10",
    title: "Encryption & Access Controls",
    text: "Encryption in transit and at rest, role-based and attribute-based scope, least-privilege access, and identity provider integration.",
  },
  {
    icon: "retentionLegalHolds",
    tile: "border-amber-500/20 bg-amber-500/10",
    title: "Retention & Legal Holds",
    text: "Retention tied to defined policy rather than indefinite storage, with legal hold and evidence preservation where required.",
  },
  {
    icon: "userRights",
    tile: "border-green-500/20 bg-green-500/10",
    title: "User Rights",
    text: "Support for access, correction, deletion, and portability requests in line with applicable data protection law.",
  },
];

const FRAMEWORKS = [
  {
    tag: "NIST AI RMF",
    title: "AI Risk Management Framework",
    text: "Governance, mapping, measurement, and management practices for identifying and treating AI risk across the lifecycle.",
  },
  {
    tag: "ISO/IEC 42001",
    title: "AI Management System Standard",
    text: "Structured management-system approach to AI governance, policy, roles, controls, monitoring, and continual improvement.",
  },
  {
    tag: "EU AI ACT",
    title: "Risk-Based AI Legal Framework",
    text: "Risk-tiered obligations covering transparency, human oversight, documentation, and record-keeping for AI systems.",
  },
  {
    tag: "GDPR / UK GDPR",
    title: "Data Protection Principles",
    text: "Lawfulness, purpose limitation, data minimization, accuracy, storage limitation, integrity, and accountability.",
  },
];

export default function ResponsibleAICompliance() {
  return (
    <section className="relative overflow-hidden bg-[#080d1a] py-20">
      {/* Photo is anchored to the left column and fades into the section fill. */}
      <div className="absolute inset-y-0 left-0 w-full lg:w-1/2">
        <BackdropImage
          slot="privacy"
          className="saturate-[0.2]"
          sizes="(max-width: 1024px) 100vw, 50vw"
        />
        {/* Dark over the heading, opening up below the cards so the photo reads. */}
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(8,13,26,0.97)_0%,rgba(8,13,26,0.92)_40%,rgba(8,13,26,0.72)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(8,13,26,0)_55%,rgba(8,13,26,0.85)_100%)]" />
      </div>

      <div className={`${CONTAINER} relative`}>
        <Eyebrow>Data Protection &amp; Global Standards</Eyebrow>

        <SectionTitle className="mt-6 max-w-[560px]">
          Designed to support compliance — built for global enterprise
          deployment.
        </SectionTitle>

        <SectionLede>
          ZoikoVertex uses &ldquo;alignment&rdquo;, &ldquo;designed to
          support&rdquo;, and &ldquo;informed by&rdquo; language for frameworks
          — not formal certification claims unless certification exists.
          Implementation obligations depend on customer use case, configuration,
          and jurisdiction.
        </SectionLede>

        <div className="mt-12 grid gap-10 lg:grid-cols-2">
          {/* ── Privacy ──────────────────────────────────────────── */}
          <div>
            <Eyebrow>Data protection &amp; privacy</Eyebrow>
            <h3 className="mt-6 text-[22px] font-extrabold tracking-tight text-white/90 font-[family-name:var(--font-bricolage)]">
              Privacy by design, not by policy.
            </h3>

            <ul className="mt-6 space-y-3">
              {PRIVACY.map(({ icon, tile, title, text }) => (
                <li
                  key={title}
                  className="flex gap-4 rounded-xl border border-white/10 bg-[#111827] p-5"
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md border ${tile}`}
                  >
                    <Icon name={icon} size={14} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-white/90 font-[family-name:var(--font-bricolage)]">
                      {title}
                    </span>
                    <span className="mt-2 block text-xs font-light leading-5 text-white/50">
                      {text}
                    </span>
                  </span>
                </li>
              ))}
            </ul>

            <Link
              href="/terms"
              className="mt-7 inline-flex items-center gap-2.5 rounded-full border border-white/10 px-7 py-3 text-sm font-normal text-white/90 transition-colors hover:border-white/30"
            >
              <FileText className="h-[14px] w-[14px]" strokeWidth={2} />
              Read Data Processing Addendum
            </Link>
          </div>

          {/* ── Frameworks ───────────────────────────────────────── */}
          <div>
            <Eyebrow>Global framework alignment</Eyebrow>
            <h3 className="mt-6 text-[22px] font-extrabold tracking-tight text-white/90 font-[family-name:var(--font-bricolage)]">
              Informed by leading AI governance standards.
            </h3>

            <ul className="mt-6 space-y-3">
              {FRAMEWORKS.map(({ tag, title, text }) => (
                <li
                  key={tag}
                  className="rounded-xl border border-white/10 bg-[#111827] p-5"
                >
                  <span className="inline-flex items-center rounded-full border border-[#20E7F2]/20 bg-[#20E7F2]/[0.05] px-2.5 py-1 text-[9.5px] font-bold uppercase tracking-[0.12em] text-[#20E7F2] font-[family-name:var(--font-jetbrains)]">
                    {tag}
                  </span>
                  <h4 className="mt-3 text-sm font-bold text-white/90 font-[family-name:var(--font-bricolage)]">
                    {title}
                  </h4>
                  <p className="mt-2 text-xs font-light leading-5 text-white/50">
                    {text}
                  </p>
                </li>
              ))}
            </ul>

            <p className="mt-6 rounded-xl border border-amber-400/25 bg-amber-400/[0.06] px-5 py-4 text-[10.5px] leading-5 text-amber-300/70 font-[family-name:var(--font-jetbrains)]">
              Legal reference: these entries describe governance alignment, not
              certification. Do not present ZoikoVertex as certified,
              accredited, or audited against any framework unless a current,
              in-scope certificate or independent report exists.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
