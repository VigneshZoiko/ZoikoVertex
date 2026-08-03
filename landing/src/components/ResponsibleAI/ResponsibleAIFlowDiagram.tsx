/** The "AI Governance Flow" schematic that sits beside the hero copy. */

function Node({
  title,
  sub,
  tone,
  className = "",
}: {
  title: string;
  sub: string;
  tone: "cyan" | "orange" | "green" | "amber" | "red" | "violet";
  className?: string;
}) {
  const tones = {
    cyan: "border-[#20E7F2]/20 bg-[#20E7F2]/[0.05] text-[#20E7F2]/90",
    orange: "border-orange-400/30 bg-orange-400/10 text-orange-400/95",
    green: "border-green-500/20 bg-green-500/10 text-green-500/90",
    amber: "border-amber-500/20 bg-amber-500/10 text-amber-500/90",
    red: "border-red-500/20 bg-red-500/[0.05] text-red-500/90",
    violet: "border-violet-500/20 bg-violet-500/10 text-violet-500/90",
  };
  return (
    <div
      className={`flex flex-col items-center justify-center border px-3 py-2 text-center ${tones[tone]} ${className}`}
    >
      <span className="text-[11px] font-bold leading-tight">{title}</span>
      <span className="mt-1 text-[9px] font-normal leading-tight text-white/30">
        {sub}
      </span>
    </div>
  );
}

function Connector({ tone = "orange" }: { tone?: "orange" | "amber" }) {
  const c = tone === "amber" ? "bg-amber-500/40" : "bg-orange-400/25";
  return <span className={`mx-auto h-4 w-px ${c}`} />;
}

export default function ResponsibleAIFlowDiagram() {
  return (
    <div className="w-full max-w-[420px]">
      <p className="text-center text-[10px] font-normal text-white/20">
        AI GOVERNANCE FLOW
      </p>

      <div className="mt-3 flex flex-col">
        <Node
          title="AI Agent Action"
          sub="Instruction received"
          tone="cyan"
          className="mx-auto w-[150px]"
        />
        <Connector />
        <Node
          title="Policy Gate"
          sub="Risk classification · rules · guardrails"
          tone="orange"
          className="mx-auto w-[215px]"
        />
        <Connector />

        {/* three-way branch */}
        <div className="grid grid-cols-3 gap-3">
          <Node title="Allowed" sub="Within policy" tone="green" className="h-[46px]" />
          <Node
            title="Needs Review"
            sub="Human required"
            tone="amber"
            className="h-[46px]"
          />
          <Node title="Blocked" sub="Policy violated" tone="red" className="h-[46px]" />
        </div>

        <Connector tone="amber" />

        <div className="grid grid-cols-3 gap-3">
          <span aria-hidden />
          <Node
            title="Approval"
            sub="Human decision"
            tone="cyan"
            className="h-[46px]"
          />
          <Node
            title="Escalate"
            sub="Forensic Hub"
            tone="violet"
            className="h-[46px]"
          />
        </div>

        <Connector />
        <Node
          title="Evidence Layer"
          sub="Audit Trail · Decision Ledger · Evidence Vault · Identity Ledger"
          tone="orange"
          className="w-full"
        />
        <Connector />
        <Node
          title="Executive Command Center"
          sub="ROI · risk posture · governance visibility"
          tone="cyan"
          className="w-full"
        />
      </div>

      <p className="mt-5 text-center text-[9px] font-normal text-white/20">
        Every AI action authorized · bounded · evidenced
      </p>
    </div>
  );
}
