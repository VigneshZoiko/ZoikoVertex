import TelecomHero from "@/components/Telecom/TelecomHero";
import TelecomChallenges from "@/components/Telecom/TelecomChallenges";
import TelecomPricingClaims from "@/components/Telecom/TelecomPricingClaims";
import TelecomMultiMarket from "@/components/Telecom/TelecomMultiMarket";
import TelecomEvidenceRecords from "@/components/Telecom/TelecomEvidenceRecords";
import TelecomCapabilities from "@/components/Telecom/TelecomCapabilities";
import TelecomProcess from "@/components/Telecom/TelecomProcess";
import TelecomTestimonial from "@/components/Telecom/TelecomTestimonial";
import TelecomTrustDocs from "@/components/Telecom/TelecomTrustDocs";
import TelecomFinalCTA from "@/components/Telecom/TelecomFinalCTA";

export default function TelecomPage() {
  return (
    <main className="bg-[#080d1a]">
      <TelecomHero />
      <TelecomChallenges />
      <TelecomPricingClaims />
      <TelecomMultiMarket />
      <TelecomEvidenceRecords />
      <TelecomCapabilities />
      <TelecomProcess />
      <TelecomTestimonial />
      <TelecomTrustDocs />
      <TelecomFinalCTA />
    </main>
  );
}
