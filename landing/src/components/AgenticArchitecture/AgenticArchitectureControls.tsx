import Image from "next/image";

const CONTROLS = [
  {
    tag: "Control",
    color: "#20E7F2",
    title: "Autonomy Levels",
    desc: "Defines what agents can recommend, draft, execute, or escalate. Prevents uncontrolled automation.",
    image: "/images/agentic-architecture/control-01.jpg",
  },
  {
    tag: "Permission",
    color: "#8B5CF6",
    title: "Role-Based Authority",
    desc: "Maps users and agents to permitted actions and approval rights. Aligns execution with organizational authority.",
    image: "/images/agentic-architecture/control-02.jpg",
  },
  {
    tag: "Policy",
    color: "#C9A84C",
    title: "Policy Gates",
    desc: "Blocks, warns, escalates, or requires review based on brand, legal, and compliance rules.",
    image: "/images/agentic-architecture/control-03.jpg",
  },
  {
    tag: "Approval",
    color: "#22C55E",
    title: "Approval Workflows",
    desc: "Routes work through reviewers, validators, approvers, and publishers. Keeps judgment accountable.",
    image: "/images/agentic-architecture/control-04.jpg",
  },
  {
    tag: "Evidence",
    color: "#20E7F2",
    title: "Evidence Capture",
    desc: "Stores proof of prompts, outputs, decisions, approvals, and integrations for audit and governance.",
    image: "/images/agentic-architecture/control-05.jpg",
  },
  {
    tag: "Forensic",
    color: "#F59E0B",
    title: "Forensic Reconstruction",
    desc: "Escalates disputed or high-risk events into formal cases. Improves incident response and defensibility.",
    image: "/images/agentic-architecture/control-06.png",
  },
  {
    tag: "Legal",
    color: "#F87171",
    title: "Legal Holds",
    desc: "Freezes evidence where needed for dispute or legal preservation. Protects the company during investigations.",
    image: "/images/agentic-architecture/control-07.jpg",
  },
];

export default function AgenticArchitectureControls() {
  return (
    <section className="bg-[#080812] py-24">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="mb-12 max-w-2xl">
          <div className="inline-flex items-center gap-2 mb-4">
            <span className="w-4 h-px bg-[#20E7F2]" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#20E7F2]">Governance & Control Plane</span>
          </div>
          <h2 className="text-[clamp(1.8rem,3.5vw,2.6rem)] font-black leading-tight text-white mb-4">
            Autonomy that stays controlled.
          </h2>
          <p className="text-white/45 text-[14.5px] leading-relaxed">
            Enterprise fear: AI agents acting without accountability. ZoikoVertex addresses this through seven concrete control types built into every governed execution.
          </p>
        </div>

        <div className="flex flex-wrap gap-x-2 gap-y-4">
          {CONTROLS.slice(0, 4).map((c) => (
            <ControlCard key={c.title} c={c} fixedSize />
          ))}
        </div>
        <div className="flex flex-wrap gap-x-2 gap-y-4 mt-4">
          <ControlCard c={CONTROLS[4]} fixedSize />
          <ControlCard c={CONTROLS[5]} fixedSize />
          <ControlCard c={CONTROLS[6]} fixedSize />
        </div>
      </div>
    </section>
  );
}

function ControlCard({
  c,
  fixedSize,
}: {
  c: (typeof CONTROLS)[number];
  fixedSize?: boolean;
}) {
  return (
    <div
      className="rounded-2xl border border-white/10 bg-[#0d1420] overflow-hidden"
      style={fixedSize ? { width: "254.5px", height: "313.47px" } : undefined}
    >
      <div className="relative h-32">
        <Image src={c.image} alt="" fill className="object-cover grayscale" sizes="300px" />
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(180deg, rgba(8,14,26,0.00) 40%, rgba(8,14,26,0.95) 100%)",
          }}
        />
      </div>
      <div className="p-5">
        <span
          className="inline-flex text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full mb-3"
          style={{ color: c.color, background: `${c.color}1A`, border: `1px solid ${c.color}40` }}
        >
          {c.tag}
        </span>
        <h3 className="text-white font-bold text-[15px] mb-2">{c.title}</h3>
        <p className="text-white/50 text-[12.5px] leading-relaxed">{c.desc}</p>
      </div>
    </div>
  );
}
