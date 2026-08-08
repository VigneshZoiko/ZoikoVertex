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
  title: "Auditability | ZoikoVertex",
  description:
    "Make every AI workflow traceable, reviewable, and evidence-backed. Audit Trail, Decision Ledger, Evidence Vault, Forensic Hub, and Identity Ledger record the actions, decisions, approvals, and exports behind agentic workflows.",
  alternates: {
    canonical: "https://www.zoikovertex.com/auditability",
  },
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
