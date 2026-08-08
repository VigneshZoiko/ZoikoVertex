"use client";

type Tier = {
  num: string;
  title: string;
  badge: string;
  items: { label: string; desc: string }[];
};

const TIERS: Tier[] = [
  {
    num: "01",
    title: "Central Brand Control — the source of truth",
    badge: "Always enforced",
    items: [
      {
        label: "Brand voice",
        desc: "Approved tone, vocabulary, and messaging frameworks that all regional and store content must align with.",
      },
      {
        label: "Offer rules",
        desc: "Permitted pricing claims, promotional structures, offer terminology, and prohibited discount language.",
      },
      {
        label: "Approved claims",
        desc: "Product claims, sustainability language, performance assertions, and category-specific regulatory guardrails.",
      },
      {
        label: "Channel rules",
        desc: "Platform-specific format, character limits, image standards, and accessibility requirements by channel.",
      },
    ],
  },
  {
    num: "02",
    title: "Regional Adaptation — local context within central rules",
    badge: "Governed variation",
    items: [
      {
        label: "Language",
        desc: "Market-language variants generated under brand rules. Translated copy subject to same policy checks as source.",
      },
      {
        label: "Local regulations",
        desc: "Regional legal requirements, data privacy rules, and jurisdiction-specific offer restrictions automatically applied.",
      },
      {
        label: "Seasonal calendars",
        desc: "Regional event dates, cultural moments, and local promotional calendars integrated into campaign timing.",
      },
      {
        label: "Inventory context",
        desc: "Region-level stock availability informs which products and offers are activated for each market.",
      },
    ],
  },
  {
    num: "03",
    title: "Store Execution — field-ready, evidence-linked",
    badge: "Risk-based approval",
    items: [
      {
        label: "Store copy",
        desc: "Store-ready copy, signage text, and internal briefs generated from central campaign templates under local rules.",
      },
      {
        label: "Local social",
        desc: "Store-specific social content for local pages approved through a lightweight workflow tuned for store speed.",
      },
      {
        label: "Manager approvals",
        desc: "Low-risk local content routed to store manager. High-risk claims escalate to regional or central compliance.",
      },
      {
        label: "Evidence linkage",
        desc: "Every local variant links back to parent campaign, source rules, approver identity, and final output record.",
      },
    ],
  },
];

export default function EnterpriseRetailLocalization() {
  return (
    <section className="bg-[#0E1626] py-24">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="inline-flex items-center gap-2.5 mb-6">
          <span className="w-3.5 h-px bg-[#20E7F2]" />
          <span className="text-xs font-medium uppercase tracking-[0.14em] text-[#20E7F2] font-[family-name:var(--font-jetbrains)]">
            Store, Region &amp; Brand Localization
          </span>
        </div>

        <h2 className="max-w-[515px] text-[clamp(1.9rem,3.6vw,2.5rem)] font-extrabold leading-[1.15] text-white/90 font-[family-name:var(--font-bricolage)]">
          Central brand control. Local relevance. Zero governance compromise.
        </h2>

        <p className="mt-7 max-w-[540px] text-base font-light leading-7 text-white/50 font-[family-name:var(--font-jakarta)]">
          Enterprise retailers need every store and region to feel local — without letting local
          drift from brand, compliance, or campaign standards. ZoikoVertex governs all three tiers
          simultaneously.
        </p>

        <div className="mt-14 space-y-6">
          {TIERS.map((t) => (
            <div key={t.num} className="rounded-xl border border-white/[0.14] p-6">
              <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
                <span className="text-xl font-extrabold leading-5 text-[#20E7F2] opacity-30 font-[family-name:var(--font-bricolage)]">
                  {t.num}
                </span>
                <h3 className="text-base font-bold text-white/90 font-[family-name:var(--font-bricolage)]">
                  {t.title}
                </h3>
                <span className="ml-auto rounded-full border border-[#20E7F2]/30 bg-[#20E7F2]/10 px-3 py-1 text-[9.6px] font-medium text-[#20E7F2] font-[family-name:var(--font-jetbrains)]">
                  {t.badge}
                </span>
              </div>

              <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {t.items.map((i) => (
                  <div
                    key={i.label}
                    className="rounded-[10px] border border-white/[0.14] bg-[#0A111E] p-4"
                  >
                    <div className="text-[9.6px] font-medium uppercase tracking-[0.1em] text-[#20E7F2] font-[family-name:var(--font-jetbrains)]">
                      {i.label}
                    </div>
                    <p className="mt-3 text-xs font-light leading-5 text-white/50 font-[family-name:var(--font-jakarta)]">
                      {i.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
