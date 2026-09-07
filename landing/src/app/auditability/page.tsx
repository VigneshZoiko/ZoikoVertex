import AuditabilityHero from "@/components/Auditability/AuditabilityHero";
import AuditabilityQuestions from "@/components/Auditability/AuditabilityQuestions";
import AuditabilitySurfaces from "@/components/Auditability/AuditabilitySurfaces";
import AuditabilityRecorded from "@/components/Auditability/AuditabilityRecorded";
import AuditabilityJourney from "@/components/Auditability/AuditabilityJourney";
import AuditabilityControls from "@/components/Auditability/AuditabilityControls";
import AuditabilityUseCases from "@/components/Auditability/AuditabilityUseCases";
import AuditabilityLayers from "@/components/Auditability/AuditabilityLayers";
import AuditabilityEvaluation from "@/components/Auditability/AuditabilityEvaluation";
import AuditabilityFaq from "@/components/Auditability/AuditabilityFaq";
import AuditabilityFinalCTA from "@/components/Auditability/AuditabilityFinalCTA";

export const metadata = {
  title: "AI Auditability & Evidence | ZoikoVertex",
  description:
    "ZoikoVertex delivers AI auditability for governed agentic workflows, recording actions, decisions, approvals, identities, evidence, exports, and exceptions.",
};

export default function AuditabilityPage() {
  return (
    <main className="bg-[#080d1a]">
      <AuditabilityHero />
      <AuditabilityQuestions />
      <AuditabilitySurfaces />
      <AuditabilityRecorded />
      <AuditabilityJourney />
      <AuditabilityControls />
      <AuditabilityUseCases />
      <AuditabilityLayers />
      <AuditabilityEvaluation />
      <AuditabilityFaq />
      <AuditabilityFinalCTA />
    </main>
  );
}
