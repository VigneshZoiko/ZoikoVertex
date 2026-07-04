"use client";

const STEPS = [
  { n: "01", title: "Plan", desc: "Brief, audience, channel requirements, and governance rules defined upfront." },
  { n: "02", title: "Create", desc: "Content and AI-assisted drafts created within brand and policy boundaries." },
  { n: "03", title: "Validate", desc: "Brand alignment, policy triggers, restricted terms, and completeness checked." },
  { n: "04", title: "Review", desc: "Routed to the right reviewers based on role, risk, and workflow rules." },
  { n: "05", title: "Approve", desc: "Authorized approver sign-off captured with timestamp and evidence record." },
  { n: "06", title: "Publish", desc: "Only approved, evidenced content proceeds to channels or activation." },
  { n: "07", title: "Evidence", desc: "Complete audit trail — who approved, when, under which policy version." },
];

export default function FintechProcess() {
  return (
    <section className="bg-[#080d1a] border-t border-white/[0.06] py-24">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 text-center">
        <div className="inline-flex items-center gap-2 mb-4">
          <span className="w-4 h-px bg-[#20E7F2]" />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#20E7F2]">Governed Execution Model</span>
        </div>
        <h2 className="text-[clamp(1.8rem,3.5vw,2.6rem)] font-black leading-tight text-white mb-5">
          From brief to evidence — controlled at every stage.
        </h2>
        <p className="text-white/50 text-[15px] leading-relaxed max-w-2xl mx-auto mb-14">
          Every fintech marketing workflow in ZoikoVertex follows this governed execution model — with approval controls, evidence records, and human oversight built into each stage.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 rounded-2xl border border-white/[0.08] overflow-hidden text-left">
          {STEPS.map((s, i) => (
            <div
              key={s.n}
              className={`p-6 bg-white/[0.02] border-white/[0.08] ${i < STEPS.length - 1 ? "lg:border-r" : ""} border-b lg:border-b-0`}
            >
              <div className="text-2xl font-black text-white/10 mb-3">{s.n}</div>
              <h3 className="text-white font-bold text-[14px] mb-2">{s.title}</h3>
              <p className="text-white/45 text-[12.5px] leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
