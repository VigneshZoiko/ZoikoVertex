import Image from "next/image";
import Link from "next/link";

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3.5 2.34C3.18 2.34 2.89 2.41 2.63 2.57C2.36 2.72 2.15 2.94 1.99 3.21C1.83 3.48 1.75 3.77 1.75 4.09H12.25C12.25 3.77 12.17 3.48 12.01 3.21C11.85 2.94 11.64 2.72 11.38 2.57C11.11 2.41 10.82 2.34 10.5 2.34H3.5Z" fill="currentColor" />
      <path d="M1.75 4.99V11.09C1.75 11.4 1.83 11.7 1.99 11.96C2.15 12.23 2.36 12.44 2.63 12.6C2.89 12.76 3.18 12.84 3.5 12.84H10.5C10.82 12.84 11.11 12.76 11.38 12.6C11.64 12.44 11.85 12.23 12.01 11.96C12.17 11.7 12.25 11.4 12.25 11.09V4.99H1.75ZM4.66 8.75H4.09C3.93 8.75 3.8 8.7 3.69 8.59C3.58 8.48 3.53 8.35 3.53 8.19C3.53 8.03 3.58 7.9 3.69 7.79C3.8 7.68 3.93 7.63 4.09 7.63H4.66C4.82 7.63 4.95 7.68 5.06 7.79C5.17 7.9 5.23 8.03 5.23 8.19C5.23 8.35 5.17 8.48 5.06 8.59C4.95 8.7 4.82 8.75 4.66 8.75Z" fill="currentColor" />
    </svg>
  );
}

const FLOW = [
  { id: "output", label: "Agent Output", sub: "AI-generated work", color: "#20E7F2" },
  { id: "risk", label: "Risk Classification", sub: "Policy · channel · jurisdiction · content type", color: "#C9A84C" },
];

const BRANCHES = [
  { label: "Auto-approve", sub: "Low risk", color: "#22C55E" },
  { label: "Reviewer", sub: "Medium risk", color: "#C9A84C" },
  { label: "Escalate", sub: "High / Critical", color: "#EF4444" },
];

const OUTCOMES = [
  { label: "Publish", sub: "Approved action", color: "#22C55E" },
  { label: "Block / Revise", sub: "Rejected or changed", color: "#EF4444" },
];

export default function ApprovalWorkflowsHero() {
  return (
    <section className="relative overflow-hidden bg-[#101D2F] pt-[68px]">
      <div className="absolute inset-0">
        <Image
          src="/images/approval-workflows/hero-bg.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-50"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#101D2F] via-[#101D2F]/85 to-[#101D2F]/40" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#101D2F] via-transparent to-[#101D2F]/40" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-12 pt-14 lg:pt-16 pb-16 grid lg:grid-cols-[1fr_auto] gap-12 items-center">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#20E7F2]/25 bg-[#20E7F2]/[0.08] mb-7">
            <span className="w-1.5 h-1.5 rounded-full bg-[#20E7F2]" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#20E7F2]">
              Governed AI Approvals · Human-in-the-Loop
            </span>
          </div>

          <h1 className="text-[clamp(2.2rem,4.4vw,3.2rem)] font-black leading-[1.1] tracking-tight mb-6 text-white">
            Approve AI-generated work before it{" "}
            <span className="text-[#20E7F2]">reaches customers.</span>
          </h1>

          <p className="text-[16px] text-white/55 leading-relaxed mb-8 max-w-[520px]">
            ZoikoVertex gives enterprise teams role-based, policy-aware
            approval workflows for AI outputs, campaigns, content, publishing
            actions, and operational decisions — with evidence, auditability,
            and human accountability built in.
          </p>

          <Link
            href="/request-demo"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#20E7F2] text-[#101D2F] text-sm font-bold hover:bg-[#20E7F2]/90 transition"
          >
            <CalendarIcon className="w-3.5 h-3.5" />
            Request Demo
          </Link>
        </div>

        <div className="hidden lg:flex flex-col items-center gap-2 w-[380px]">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40 mb-2">
            Approval Workflow
          </span>

          {FLOW.map((f) => (
            <FlowNode key={f.id} label={f.label} sub={f.sub} color={f.color} />
          ))}

          <div className="grid grid-cols-3 gap-2 w-full">
            {BRANCHES.map((b) => (
              <FlowNode key={b.label} label={b.label} sub={b.sub} color={b.color} compact />
            ))}
          </div>

          <FlowNode label="Decision" sub="Approved · Rejected · Needs Changes · Escalated" color="#C9A84C" />
          <FlowNode label="Evidence Capture" sub="Audit Trail · Decision Ledger · Evidence Vault" color="#EF4444" />

          <div className="grid grid-cols-2 gap-2 w-full">
            {OUTCOMES.map((o) => (
              <FlowNode key={o.label} label={o.label} sub={o.sub} color={o.color} compact />
            ))}
          </div>

          <p className="text-white/35 text-[10.5px] uppercase tracking-[0.1em] mt-2 text-center">
            Every decision evidenced · Every action traced
          </p>
        </div>
      </div>
    </section>
  );
}

function FlowNode({
  label,
  sub,
  color,
  compact,
}: {
  label: string;
  sub: string;
  color: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`w-full rounded-lg text-center ${compact ? "px-2 py-2.5" : "px-4 py-3"}`}
      style={{ background: `${color}14`, border: `1px solid ${color}4D` }}
    >
      <p className="font-bold text-white" style={{ fontSize: compact ? 11.5 : 13 }}>
        {label}
      </p>
      <p className="text-white/45" style={{ fontSize: compact ? 9.5 : 10.5, lineHeight: 1.3 }}>
        {sub}
      </p>
    </div>
  );
}
