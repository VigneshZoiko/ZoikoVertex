"use client";

import Image from "next/image";

type Moment = {
  num: string;
  title: string;
  desc: string;
  evidence: string;
  num_fg: string;
  ring: string;
  bg: string;
};

const MOMENTS: Moment[] = [
  {
    num: "01",
    title: "Campaign launch in progress",
    desc: "Executive sees campaign velocity, owners, approval state, and publishing readiness across all active markets.",
    evidence: "Evidence: brief version · owner · timestamp",
    num_fg: "text-[#20E7F2]",
    ring: "border-[#20E7F2]/20",
    bg: "bg-[#131F33]",
  },
  {
    num: "02",
    title: "AI agent generates campaign variants",
    desc: "Agent activity is visible with model, prompt version, autonomy level, and human review assignment.",
    evidence: "Evidence: prompt metadata · output confidence · risk markers",
    num_fg: "text-white/10",
    ring: "border-white/10",
    bg: "bg-[#0A111E]",
  },
  {
    num: "03",
    title: "Brand policy triggers warning",
    desc: "Risk feed surfaces restricted claim, severity level, policy version, and the required reviewer — before publish.",
    evidence: "Evidence: policy trigger · severity · reviewer assigned",
    num_fg: "text-amber-500",
    ring: "border-amber-500/20",
    bg: "bg-[#0A111E]",
  },
  {
    num: "04",
    title: "Approval bottleneck appears",
    desc: "Command center highlights approver delay, SLA breach risk, and escalation path with one action available.",
    evidence: "Evidence: SLA status · approver workload · escalation log",
    num_fg: "text-amber-500",
    ring: "border-amber-500/20",
    bg: "bg-[#0A111E]",
  },
  {
    num: "05",
    title: "Decision is made",
    desc: "Approval action captured with actor identity, timestamp, decision rationale, and linked evidence record.",
    evidence: "Evidence: Decision Ledger entry · Evidence Vault link",
    num_fg: "text-green-500",
    ring: "border-green-500/20",
    bg: "bg-[#0A111E]",
  },
  {
    num: "06",
    title: "Content publishes",
    desc: "Integration health confirms channel publish, stores artifact proof, and updates the campaign's evidence package.",
    evidence: "Evidence: publish confirmation · integration proof · final artifact",
    num_fg: "text-green-500",
    ring: "border-green-500/20",
    bg: "bg-[#0A111E]",
  },
  {
    num: "07",
    title: "ROI Engine updates",
    desc: "ROI panel shows early performance signals, cycle-time saving, throughput contribution, and execution-value indicators.",
    evidence: "Evidence: ROI record · performance summary",
    num_fg: "text-green-500",
    ring: "border-green-500/20",
    bg: "bg-[#0A111E]",
  },
];

export default function ExecutiveCommandCenterMoments() {
  return (
    <section className="grid lg:grid-cols-2 bg-[#0E1626]">
      {/* ─── Visual half ────────────────────────────────────────────── */}
      <div className="relative min-h-[280px] lg:min-h-full overflow-hidden">
        <Image
          src="/images/executive-command-center/moments.png"
          alt=""
          fill
          sizes="(max-width: 1024px) 100vw, 50vw"
          className="object-cover saturate-[0.25]"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#080d1a]/5 to-[#080d1a]/60" />
      </div>

      {/* ─── Content half ───────────────────────────────────────────── */}
      <div className="px-6 lg:px-[72px] py-20 lg:py-24">
        <div className="inline-flex items-center gap-2.5 mb-6">
          <span className="w-3.5 h-px bg-[#20E7F2]" />
          <span className="text-xs font-medium uppercase tracking-[0.14em] text-[#20E7F2] font-[family-name:var(--font-jetbrains)]">
            Live Executive Scenario
          </span>
        </div>

        <h2 className="text-[clamp(1.9rem,3.2vw,2.25rem)] font-extrabold leading-[1.15] text-white/90 font-[family-name:var(--font-bricolage)]">
          What a leadership team sees in seven moments.
        </h2>

        <p className="mt-6 max-w-[430px] text-base font-light leading-7 text-white/50 font-[family-name:var(--font-jakarta)]">
          A retail campaign launch. Seven real-time command center moments — from AI draft to
          evidence-backed publish.
        </p>

        <div className="mt-12 space-y-4">
          {MOMENTS.map((m) => (
            <div
              key={m.num}
              className={`flex gap-5 rounded-xl border px-5 py-4 ${m.bg} ${m.ring}`}
            >
              <span
                className={`shrink-0 text-lg font-extrabold leading-4 pt-0.5 font-[family-name:var(--font-bricolage)] ${m.num_fg}`}
              >
                {m.num}
              </span>
              <div>
                <h3 className="text-sm font-bold text-white/90 font-[family-name:var(--font-bricolage)]">
                  {m.title}
                </h3>
                <p className="mt-1.5 text-xs font-light leading-5 text-white/50 font-[family-name:var(--font-jakarta)]">
                  {m.desc}
                </p>
                <p className="mt-3 text-[9.3px] font-medium tracking-tight text-white/25 font-[family-name:var(--font-jetbrains)]">
                  {m.evidence}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
