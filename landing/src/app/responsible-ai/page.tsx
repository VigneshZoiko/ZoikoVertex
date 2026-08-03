import ResponsibleAIHero from "@/components/ResponsibleAI/ResponsibleAIHero";
import ResponsibleAIPillars from "@/components/ResponsibleAI/ResponsibleAIPillars";
import ResponsibleAIPrinciples from "@/components/ResponsibleAI/ResponsibleAIPrinciples";
import ResponsibleAIRiskTiers from "@/components/ResponsibleAI/ResponsibleAIRiskTiers";
import ResponsibleAIOversight from "@/components/ResponsibleAI/ResponsibleAIOversight";
import ResponsibleAICompliance from "@/components/ResponsibleAI/ResponsibleAICompliance";
import ResponsibleAILifecycle from "@/components/ResponsibleAI/ResponsibleAILifecycle";
import ResponsibleAIFaq from "@/components/ResponsibleAI/ResponsibleAIFaq";
import ResponsibleAIFinalCTA from "@/components/ResponsibleAI/ResponsibleAIFinalCTA";
import { Divider } from "@/components/ResponsibleAI/shared";

export const metadata = {
  title: "Responsible AI | ZoikoVertex",
  description:
    "Deploy AI agents with control, oversight, and evidence. Policy guardrails, approval workflows, human oversight, risk classification, audit trails, and evidence vaults for governed enterprise AI.",
  alternates: {
    canonical: "https://www.zoikovertex.com/responsible-ai",
  },
};

export default function ResponsibleAIPage() {
  return (
    <main className="bg-[#080d1a]">
      <ResponsibleAIHero />
      <ResponsibleAIPillars />
      <Divider />
      <ResponsibleAIPrinciples />
      <Divider />
      <ResponsibleAIRiskTiers />
      <Divider />
      <ResponsibleAIOversight />
      <Divider />
      <ResponsibleAICompliance />
      <Divider />
      <ResponsibleAILifecycle />
      <Divider />
      <ResponsibleAIFaq />
      <ResponsibleAIFinalCTA />
    </main>
  );
}
