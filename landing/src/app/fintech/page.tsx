import FintechHero from "@/components/Fintech/FintechHero";
import FintechChallenges from "@/components/Fintech/FintechChallenges";
import FintechRegulatedContent from "@/components/Fintech/FintechRegulatedContent";
import FintechAIGovernance from "@/components/Fintech/FintechAIGovernance";
import FintechAuditTrail from "@/components/Fintech/FintechAuditTrail";
import FintechCapabilities from "@/components/Fintech/FintechCapabilities";
import FintechProcess from "@/components/Fintech/FintechProcess";
import FintechTestimonial from "@/components/Fintech/FintechTestimonial";
import FintechTrustDocs from "@/components/Fintech/FintechTrustDocs";
import FintechFinalCTA from "@/components/Fintech/FintechFinalCTA";

export const metadata = {
  title: "FinTech Marketing Governance | ZoikoVertex",
  description:
    "ZoikoVertex governs AI-assisted FinTech marketing with claims review, compliance routing, human oversight, and complete audit trails for every decision.",
};

export default function FintechPage() {
  return (
    <main className="bg-[#080d1a]">
      <FintechHero />
      <FintechChallenges />
      <FintechRegulatedContent />
      <FintechAIGovernance />
      <FintechAuditTrail />
      <FintechCapabilities />
      <FintechProcess />
      <FintechTestimonial />
      <FintechTrustDocs />
      <FintechFinalCTA />
    </main>
  );
}
