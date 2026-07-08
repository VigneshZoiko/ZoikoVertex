import Image from "next/image";

const USE_CASES = [
  {
    tag: "Campaign Governance",
    title: "Governed Campaign Execution",
    desc: "Marketing teams move slowly because approvals, content, compliance, and publishing are fragmented. Agents coordinate work while workflows, approvals, and evidence keep execution controlled.",
    image: "/images/agentic-architecture/usecase-campaign-execution.jpg",
    span: "row-span-2",
  },
  {
    tag: "Brand Safety",
    title: "Brand-Safe AI Content",
    image: "/images/agentic-architecture/usecase-brand-safe-content.jpg",
  },
  {
    tag: "Multi-Region",
    title: "Global Execution Governance",
    image: "/images/agentic-architecture/usecase-global-execution.jpg",
  },
  {
    tag: "Executive Visibility",
    title: "Command Center Oversight",
    image: "/images/agentic-architecture/usecase-command-oversight.jpg",
  },
  {
    tag: "AI Governance",
    title: "Enterprise AI Workflow Control",
    image: "/images/agentic-architecture/usecase-workflow-control.jpg",
  },
];

export default function AgenticArchitectureUseCases() {
  return (
    <section className="bg-[#080812] py-24">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 mb-4">
            <span className="w-4 h-px bg-[#20E7F2]" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#20E7F2]">Use Cases</span>
          </div>
          <h2 className="text-[clamp(1.8rem,3.5vw,2.6rem)] font-black leading-tight text-white">
            Architecture translated into outcomes.
          </h2>
        </div>

        <div
          className="grid grid-cols-1 md:grid-cols-3 gap-1 rounded-2xl overflow-hidden"
          style={{ gridAutoRows: "245px" }}
        >
          {USE_CASES.map((u) => (
            <div
              key={u.title}
              className={`relative overflow-hidden bg-[#0d1420] p-6 flex flex-col justify-end ${u.span ?? ""}`}
            >
              {u.image && (
                <>
                  <Image src={u.image} alt="" fill className="object-cover" sizes="400px" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#080812] via-[#080812]/40 to-transparent" />
                </>
              )}
              <div className="relative z-10">
                <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#20E7F2] mb-2 block">
                  {u.tag}
                </span>
                <h3 className="text-white font-bold text-[19px] leading-snug mb-2">{u.title}</h3>
                {u.desc && (
                  <p className="text-white/50 text-[13px] leading-relaxed max-w-xs">{u.desc}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
