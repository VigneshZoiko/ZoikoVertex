"use client";

const TOPICS = [
  {
    lead: "Governed",
    highlight: "AI Marketing",
    desc: "How organizations can adopt AI in marketing while preserving approval controls, evidence, and human oversight.",
  },
  {
    lead: "Responsible",
    highlight: "AI in Public Workflows",
    desc: "Why AI-assisted marketing needs review, policy boundaries, and accountability before public distribution.",
  },
  {
    lead: "Marketing",
    highlight: "Approval Governance",
    desc: "How modern teams can replace fragmented approvals across email, chat, and disconnected tools with structured governance.",
  },
  {
    lead: "Brand Governance",
    highlight: "at Scale",
    desc: "How enterprises, agencies, and multi-brand organizations can protect brand consistency while moving faster with AI.",
  },
  {
    lead: "Auditability &",
    highlight: "Evidence Records",
    desc: "Why marketing teams need clearer records of who created, reviewed, approved, changed, and published work.",
  },
  {
    lead: "AI and",
    highlight: "Enterprise Trust",
    desc: "How AI platforms can support security, privacy, procurement review, and executive confidence in enterprise settings.",
  },
  {
    lead: "Marketing",
    highlight: "Operations Transformation",
    desc: "Why marketing teams are moving from content tools to governed operating systems for controlled execution.",
  },
  {
    lead: "Human Oversight",
    highlight: "in Automation",
    desc: "Why people remain accountable for judgment, ethics, approvals, and publication decisions — regardless of AI capability.",
  },
];

export default function PressTopics() {
  return (
    <section className="bg-[#0A0F1C] border-t border-white/[0.06] py-20 md:py-24">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="inline-flex items-center gap-2 mb-4">
          <span className="w-4 h-px bg-[#C9A84C]" />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#C9A84C]">Commentary Topics</span>
        </div>
        <h2 className="text-[clamp(1.9rem,4vw,2.8rem)] font-black leading-tight text-white mb-4">
          Topics ZoikoVertex can speak on.
        </h2>
        <p className="text-white/50 text-[15px] leading-relaxed max-w-2xl mb-12">
          These are the areas where ZoikoVertex leadership can offer credible, considered commentary for editorial coverage, podcasts, panels, and events.
        </p>

        <div className="rounded-2xl border border-white/[0.08] bg-[#0C1523] overflow-hidden">
          {TOPICS.map((t, i) => (
            <div
              key={t.highlight}
              className={`flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-8 px-6 lg:px-8 py-6 ${
                i !== TOPICS.length - 1 ? "border-b border-white/[0.06]" : ""
              }`}
            >
              <span className="text-white/10 text-3xl font-black w-14 shrink-0 font-mono">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="text-white font-bold text-[17px] sm:w-[300px] shrink-0">
                {t.lead} <span className="text-[#C9A84C]">{t.highlight}</span>
              </h3>
              <p className="text-white/50 text-[14px] leading-relaxed">{t.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
