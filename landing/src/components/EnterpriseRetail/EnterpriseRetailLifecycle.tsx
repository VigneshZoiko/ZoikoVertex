"use client";

type Stage = { num: string; title: string; desc: string; evidence: string };

const STAGES: Stage[] = [
  {
    num: "01",
    title: "Brief",
    desc: "Campaign brief with offer, audience, channels, markets, brand rules, and deadlines.",
    evidence: "Evidence: brief version, owner, timestamp",
  },
  {
    num: "02",
    title: "AI Plan",
    desc: "Agent proposes campaign structure, content variants, tasks, and channel dependencies.",
    evidence: "Evidence: prompt, model metadata, risk markers",
  },
  {
    num: "03",
    title: "Localize",
    desc: "Regional and store variations generated under central brand rules with approver mapping.",
    evidence: "Evidence: variant records, region rules",
  },
  {
    num: "04",
    title: "Policy check",
    desc: "Claims, pricing, regulated terms, offer rules, and brand tone checked against policy.",
    evidence: "Evidence: policy trigger results, risk level",
  },
  {
    num: "05",
    title: "Approve",
    desc: "Routed by channel, risk, category, region, spend to reviewer, legal, brand, or executive.",
    evidence: "Evidence: Decision Ledger, identity reference",
  },
  {
    num: "06",
    title: "Publish",
    desc: "Approved content activates to social, ad, email, commerce, DAM, or retail media platform.",
    evidence: "Evidence: integration proof, final artifact",
  },
  {
    num: "07",
    title: "Measure",
    desc: "ROI Engine tracks throughput, cycle-time, conversion, avoided rework, and performance.",
    evidence: "Evidence: performance summary, ROI record",
  },
];

export default function EnterpriseRetailLifecycle() {
  return (
    <section className="bg-[#080d1a] py-24">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="text-center">
          <div className="inline-flex items-center gap-2.5 mb-6">
            <span className="w-3.5 h-px bg-[#20E7F2]" />
            <span className="text-xs font-medium uppercase tracking-[0.14em] text-[#20E7F2] font-[family-name:var(--font-jetbrains)]">
              Omnichannel Campaign Lifecycle
            </span>
          </div>

          <h2 className="mx-auto max-w-[510px] text-[clamp(1.9rem,3.6vw,2.5rem)] font-extrabold leading-[1.15] text-white/90 font-[family-name:var(--font-bricolage)]">
            From campaign brief to ROI record — controlled at every stage.
          </h2>

          <p className="mx-auto mt-7 max-w-[455px] text-base font-light leading-7 text-white/50 font-[family-name:var(--font-jakarta)]">
            Every enterprise retail campaign in ZoikoVertex follows this governed 7-step execution
            model. Evidence is captured at each stage — not assembled after the fact.
          </p>
        </div>

        <div className="mt-14 rounded-2xl border border-white/[0.14] bg-[#0E1626] overflow-hidden">
          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7">
            {STAGES.map((s) => (
              <div
                key={s.num}
                className="flex flex-col px-6 py-8 border-r border-b border-white/[0.14] last:border-r-0 xl:border-b-0"
              >
                <span className="text-3xl font-extrabold leading-8 text-[#C9A94A]/10 font-[family-name:var(--font-bricolage)]">
                  {s.num}
                </span>

                <h3 className="mt-5 text-base font-extrabold text-[#20E7F2] font-[family-name:var(--font-bricolage)]">
                  {s.title}
                </h3>

                <p className="mt-4 text-xs font-light leading-5 text-white/50 font-[family-name:var(--font-jakarta)]">
                  {s.desc}
                </p>

                <p className="mt-auto pt-8 text-[9.3px] font-medium uppercase tracking-[0.08em] leading-[1.5] text-[#C9A94A]/40 font-[family-name:var(--font-jetbrains)]">
                  {s.evidence}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
