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
  title: "Support | ZoikoVertex",
  description:
    "Get help with AI workflows, approval routing, integrations, evidence, auditability, privacy, billing, and enterprise implementation. Intent-based routing sends every request to the right specialist queue.",
  alternates: {
    canonical: "https://www.zoikovertex.com/support",
  },
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
