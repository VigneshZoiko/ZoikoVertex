import { Icon } from "./shared";

const PILLARS: { icon: string; tile: string; title: string; text: string }[] = [
  {
    icon: "policyGuardrails",
    tile: "border-orange-400/25 bg-orange-400/10",
    title: "Policy Guardrails",
    text: "Rules that review, block, escalate, or require approval before AI actions proceed.",
  },
  {
    icon: "humanOversight",
    tile: "border-[#20E7F2]/20 bg-[#20E7F2]/10",
    title: "Human Oversight",
    text: "Defined review gates for sensitive, regulated, or high-impact actions.",
  },
  {
    icon: "evidenceLayer",
    tile: "border-red-500/20 bg-red-500/10",
    title: "Evidence Layer",
    text: "Audit Trail, Forensic Hub, Evidence Vault, and Identity Ledger preserve proof.",
  },
  {
    icon: "roleBasedAuthority",
    tile: "border-violet-500/20 bg-violet-500/10",
    title: "Role-Based Authority",
    text: "Actions depend on user role, workspace authority, and governance scope.",
  },
  {
    icon: "riskClassification",
    tile: "border-amber-500/20 bg-amber-500/10",
    title: "Risk Classification",
    text: "AI activities categorized by risk, autonomy, sensitivity, channel, and impact.",
  },
  {
    icon: "exportableGovernance",
    tile: "border-green-500/20 bg-green-500/10",
    title: "Exportable Governance",
    text: "Evidence bundles and audit views support legal, compliance, and client review.",
  },
];

export default function ResponsibleAIPillars() {
  return (
    <section className="border-y border-white/10 bg-[#0f172a]">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {PILLARS.map(({ icon, tile, title, text }) => (
          <div
            key={title}
            className="border-b border-white/10 px-5 py-6 last:border-b-0 sm:nth-last-[-n+2]:border-b-0 xl:border-b-0 xl:border-r xl:last:border-r-0"
          >
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-lg border ${tile}`}
            >
              <Icon name={icon} size={14} />
            </div>
            <h3 className="mt-5 text-sm font-bold text-white/90 font-[family-name:var(--font-bricolage)]">
              {title}
            </h3>
            <p className="mt-2 text-xs font-light leading-4 text-white/50">
              {text}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
