import Image from "next/image";

const BUYERS = [
  {
    tag: "For CTOs",
    title: "Agentic execution without losing control.",
    desc: "Modular orchestration, APIs, identity controls, evidence, and audit logs.",
    image: "/images/agentic-architecture/buyer-cto.png",
  },
  {
    tag: "For CMOs",
    title: "Move faster without brand governance risk.",
    desc: "Governed agents accelerate campaigns while approval workflows protect the brand.",
    image: "/images/agentic-architecture/buyer-cmo.jpg",
  },
  {
    tag: "For COOs",
    title: "Standardize execution across teams and regions.",
    desc: "Workflows, roles, SLAs, and dashboards reduce handoff friction and improve accountability.",
    image: "/images/agentic-architecture/buyer-coo.png",
  },
  {
    tag: "For Legal & Compliance",
    title: "Make AI execution explainable and defensible.",
    desc: "Decision traceability, identity binding, policy triggers, and evidence retention.",
    image: "/images/agentic-architecture/buyer-legal.jpg",
  },
  {
    tag: "For Executives",
    title: "Performance, risk, and ROI in one command layer.",
    desc: "Connect agentic activity to governance posture, cycle time, and execution quality.",
    image: "/images/agentic-architecture/buyer-executives.jpg",
  },
];

export default function AgenticArchitectureBuyers() {
  return (
    <section className="bg-[#080d1a] py-24">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="mb-14 max-w-xl">
          <div className="inline-flex items-center gap-2 mb-4">
            <span className="w-4 h-px bg-[#20E7F2]" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#20E7F2]">Built for Every Stakeholder</span>
          </div>
          <h2 className="text-[clamp(1.8rem,3.5vw,2.6rem)] font-black leading-tight text-white">
            The right case for every buyer.
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-px bg-white/[0.06] rounded-2xl overflow-hidden">
          {BUYERS.map((b) => (
            <div key={b.tag} className="relative min-h-[320px] bg-[#0b111e] flex flex-col justify-end p-6 overflow-hidden">
              {b.image && (
                <>
                  <Image src={b.image} alt="" fill className="object-cover" sizes="260px" />
                  <div
                    className="absolute inset-0"
                    style={{
                      background:
                        "linear-gradient(0deg, rgba(8,14,26,0.97) 0%, rgba(8,14,26,0.60) 55%, rgba(8,14,26,0.15) 100%)",
                    }}
                  />
                </>
              )}
              <div className="relative z-10">
                <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#20E7F2] mb-3 block">
                  {b.tag}
                </span>
                <h3 className="text-white font-bold text-[17px] leading-snug mb-3">{b.title}</h3>
                <p className="text-white/50 text-[12.5px] leading-relaxed">{b.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
