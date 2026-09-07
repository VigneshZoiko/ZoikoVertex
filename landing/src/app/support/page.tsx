import {
  SupportHero,
  SupportPathways,
  SupportTicketIntake,
  SupportSeveritySla,
  SupportKnowledge,
  SupportStatusTrust,
  SupportEnterprise,
  SupportFeedback,
  SupportCta,
} from "@/components/support";

export const metadata = {
  title: "AI Workflow Support Center | ZoikoVertex",
  description:
    "Get support for governed agentic execution, AI workflows, approval routing, integrations, evidence, auditability, privacy, billing, and enterprise needs.",
};

export default function SupportPage() {
  return (
    <main className="bg-[#080d1a]">
      <SupportHero />
      <SupportPathways />
      <SupportTicketIntake />
      <SupportSeveritySla />
      <SupportKnowledge />
      <SupportStatusTrust />
      <SupportEnterprise />
      <SupportFeedback />
      <SupportCta />
    </main>
  );
}
