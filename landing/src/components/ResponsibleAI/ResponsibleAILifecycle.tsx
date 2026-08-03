import { CONTAINER, Eyebrow, Icon, SectionLede, SectionTitle } from "./shared";

const STAGES = [
  {
    icon: "define",
    title: "Define",
    text: "Set use cases, risk appetite, permitted actions, and governance objectives.",
  },
  {
    icon: "govern",
    title: "Govern",
    text: "Encode policy rules, roles, autonomy limits, and approval authority.",
  },
  {
    icon: "execute",
    title: "Execute",
    text: "Run AI agents within bounded scope, approved tools, and workflow controls.",
  },
  {
    icon: "review",
    title: "Review",
    text: "Route sensitive, regulated, or high-impact actions to named human reviewers.",
  },
  {
    icon: "record",
    title: "Record",
    text: "Capture audit trail, decision rationale, sealed evidence, and identity binding.",
  },
  {
    icon: "monitor",
    title: "Monitor",
    text: "Track exceptions, overrides, escalations, drift, and governance posture.",
  },
  {
    icon: "improve",
    title: "Improve",
    text: "Refine policy, thresholds, and controls from measured operating outcomes.",
  },
];

export default function ResponsibleAILifecycle() {
  return (
    <section className="bg-[#111827] py-20">
      <div className={CONTAINER}>
        <div className="flex flex-col items-center text-center">
          <Eyebrow>Responsible AI lifecycle</Eyebrow>

          <SectionTitle className="mt-6 max-w-[700px]">
            Responsible AI as an operating posture — seven continuous stages.
          </SectionTitle>

          {/* Wider than the default lede so the sentence sets on two lines. */}
          <div className="[&>p]:mx-auto [&>p]:max-w-[780px] [&>p]:text-center">
            <SectionLede>
              Responsible AI is not a one-time review. ZoikoVertex supports
              these continuous governance stages across enterprise deployment.
            </SectionLede>
          </div>
        </div>

        <ol className="mt-12 grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          {STAGES.map((s, i) => (
            <li
              key={s.title}
              className="rounded-xl border border-white/10 bg-[#0f172a] p-5"
            >
              <div className="flex items-center justify-between">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#20E7F2]/20 bg-[#20E7F2]/10">
                  <Icon name={s.icon} size={14} />
                </span>
                <span className="text-[10px] font-medium tracking-[0.14em] text-[#20E7F2]/40 font-[family-name:var(--font-jetbrains)]">
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>
              <h3 className="mt-4 text-sm font-bold text-white/90 font-[family-name:var(--font-bricolage)]">
                {s.title}
              </h3>
              <p className="mt-2 text-[11px] font-light leading-4 text-white/50">
                {s.text}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
