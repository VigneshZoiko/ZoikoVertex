import { CircleCheck, AlertTriangle, ShieldAlert, Ban } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  BackdropImage,
  CONTAINER,
  Eyebrow,
  SectionLede,
  SectionTitle,
} from "./shared";

const TIERS: {
  slot: string;
  icon: LucideIcon;
  level: string;
  action: string;
  title: string;
  text: string;
  footnote: string;
  accent: string;
  badge: string;
  chip: string;
}[] = [
  {
    slot: "riskLow",
    icon: CircleCheck,
    level: "Low Risk",
    action: "Proceed",
    title: "Standard proceed",
    text: "Routine drafting, summaries, internal suggestions, non-sensitive analysis. Output may proceed with standard review.",
    footnote: "Auto-approve within policy",
    accent: "text-green-500",
    badge: "border-green-500/20 bg-green-500/10",
    chip: "border-green-500/30 bg-green-500/20 text-green-500",
  },
  {
    slot: "riskMedium",
    icon: AlertTriangle,
    level: "Medium Risk",
    action: "Review",
    title: "Policy check required",
    text: "Brand-visible content, client-facing recommendations, campaign actions with moderate business impact. Requires policy checks and optional human review.",
    footnote: "Policy checks + optional reviewer",
    accent: "text-amber-500",
    badge: "border-amber-500/20 bg-amber-500/10",
    chip: "border-amber-500/30 bg-amber-500/20 text-amber-500",
  },
  {
    slot: "riskHigh",
    icon: ShieldAlert,
    level: "High Risk",
    action: "Approve",
    title: "Human approval + evidence",
    text: "Public publishing, regulated claims, client-sensitive approvals, budget changes, legal-sensitive outputs. Requires named approver and sealed evidence capture.",
    footnote: "Approver required · evidence sealed",
    accent: "text-red-500",
    badge: "border-red-500/20 bg-red-500/10",
    chip: "border-red-500/30 bg-red-500/10 text-red-500",
  },
  {
    slot: "riskCritical",
    icon: Ban,
    level: "Critical Risk",
    action: "Block / Escalate",
    title: "Block, escalate, or Forensic Hub",
    text: "Security events, policy overrides, high-impact external actions, legal holds, or material reputational risk. Immediately blocked, escalated, or routed to Forensic Hub.",
    footnote: "Block + Forensic Hub escalation",
    accent: "text-violet-500",
    badge: "border-violet-500/20 bg-violet-500/10",
    chip: "border-violet-500/30 bg-violet-500/20 text-violet-500",
  },
];

export default function ResponsibleAIRiskTiers() {
  return (
    <section className="bg-[#111827] py-20">
      <div className={CONTAINER}>
        <Eyebrow>Risk Classification &amp; Guardrails</Eyebrow>

        <SectionTitle className="mt-6 max-w-[520px]">
          Not every AI action gets the same treatment.
        </SectionTitle>

        <SectionLede>
          Risk level is calculated from policy rules, content type, channel,
          jurisdiction, and agent autonomy level — routing each action to
          exactly the right control response.
        </SectionLede>

        <div className="mt-10 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {TIERS.map((t) => {
            const Icon = t.icon;
            return (
              <article
                key={t.level}
                className="relative flex min-h-[320px] flex-col overflow-hidden rounded-2xl"
              >
                <BackdropImage
                  slot={t.slot}
                  className="saturate-[0.3]"
                  sizes="(max-width: 640px) 100vw, 268px"
                />
                <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(8,13,26,0.95)_0%,rgba(8,13,26,0.60)_55%,rgba(8,13,26,0.20)_100%)]" />

                <div className="relative flex flex-1 flex-col p-7">
                  <div className="flex justify-end">
                    <span
                      className={`inline-flex items-center rounded-full border px-3 py-1 text-[9.5px] font-bold uppercase tracking-[0.12em] backdrop-blur-xs font-[family-name:var(--font-jetbrains)] ${t.chip}`}
                    >
                      {t.action}
                    </span>
                  </div>

                  <div className="mt-auto">
                    <span
                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 ${t.badge}`}
                    >
                      <Icon className={`h-3 w-3 ${t.accent}`} strokeWidth={2.5} />
                      <span
                        className={`text-[10px] font-bold uppercase tracking-[0.12em] font-[family-name:var(--font-jetbrains)] ${t.accent}`}
                      >
                        {t.level}
                      </span>
                    </span>

                    <h3 className="mt-4 text-base font-extrabold leading-tight text-white font-[family-name:var(--font-bricolage)]">
                      {t.title}
                    </h3>
                    <p className="mt-3 text-xs font-light leading-5 text-white/60">
                      {t.text}
                    </p>
                    <p className="mt-6 text-[9.5px] font-medium tracking-tight text-white/30 font-[family-name:var(--font-jetbrains)]">
                      {t.footnote}
                    </p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
