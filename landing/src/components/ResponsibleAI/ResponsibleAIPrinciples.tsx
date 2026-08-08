import {
  BackdropImage,
  CONTAINER,
  Eyebrow,
  Icon,
  ProductControlTag,
} from "./shared";

const PRINCIPLES: { icon: string; title: string; text: string }[] = [
  {
    icon: "boundedAutonomy",
    title: "Bounded Autonomy",
    text: "AI agents operate within defined permissions, approved tools, policy rules, and workflow scope — never beyond the authority granted by role and governance configuration.",
  },
  {
    icon: "humanAccountability",
    title: "Human Accountability",
    text: "Humans remain accountable for sensitive approvals, publishing, policy overrides, and high-risk execution. AI assists — it does not replace human judgment where it matters.",
  },
  {
    icon: "evidenceByDefault",
    title: "Evidence by Default",
    text: "Important AI actions create records that can be reviewed, searched, sealed, exported, or investigated. Evidence is captured inside the workflow — not collected after the fact.",
  },
  {
    icon: "noBlackBoxExecution",
    title: "No Black-Box Execution",
    text: "AI actions surface source context, policy result, agent identity, workflow state, and evidence reference where relevant. Explainability is operational, not aspirational.",
  },
  {
    icon: "dataMinimization",
    title: "Data Minimization",
    text: "ZoikoVertex collects and retains only data required for execution, evidence duties, security, billing, support, or legal obligations. Retention is tied to defined policy, not indefinite storage.",
  },
  {
    icon: "continuousAssurance",
    title: "Continuous Assurance",
    text: "Responsible AI is an operating posture — not a one-time review. ZoikoVertex is designed to support ongoing monitoring, measurement, policy review, and governance improvement.",
  },
];

export default function ResponsibleAIPrinciples() {
  return (
    <section className={`${CONTAINER} py-20`}>
      <Eyebrow>What Responsible AI Means at ZoikoVertex</Eyebrow>

      <div className="relative mt-9 overflow-hidden rounded-2xl">
        <BackdropImage
          slot="principles"
          className="saturate-[0.2]"
          sizes="(max-width: 1136px) 100vw, 1072px"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#080d1a]/95 via-[#080d1a]/70 to-[#080d1a]/25" />
        <div className="relative px-8 py-12 sm:px-10 sm:py-14">
          <h2 className="max-w-[470px] text-[clamp(1.7rem,3.4vw,2.4rem)] font-extrabold leading-[1.16] tracking-tight text-white font-[family-name:var(--font-bricolage)]">
            Governance built into the product architecture,{" "}
            <span className="text-[#20E7F2]">
              not bolted on as marketing language.
            </span>
          </h2>
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PRINCIPLES.map(({ icon, title, text }) => (
          <article
            key={title}
            className="flex flex-col rounded-2xl border border-white/10 bg-[#111827] p-7"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-orange-400/25 bg-orange-400/10">
              <Icon name={icon} size={16} />
            </div>
            <h3 className="mt-7 text-base font-extrabold text-white/90 font-[family-name:var(--font-bricolage)]">
              {title}
            </h3>
            <p className="mt-3 flex-1 text-xs font-light leading-5 text-white/50">
              {text}
            </p>
            <div className="mt-6">
              <ProductControlTag />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
