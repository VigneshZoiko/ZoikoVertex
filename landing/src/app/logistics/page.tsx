import LogisticsHero from "@/components/Logistics/LogisticsHero";
import LogisticsChallenges from "@/components/Logistics/LogisticsChallenges";
import LogisticsServiceClaims from "@/components/Logistics/LogisticsServiceClaims";
import LogisticsMultiRegion from "@/components/Logistics/LogisticsMultiRegion";
import LogisticsEvidenceRecords from "@/components/Logistics/LogisticsEvidenceRecords";
import LogisticsCapabilities from "@/components/Logistics/LogisticsCapabilities";
import LogisticsProcess from "@/components/Logistics/LogisticsProcess";
import LogisticsTestimonial from "@/components/Logistics/LogisticsTestimonial";
import LogisticsTrustDocs from "@/components/Logistics/LogisticsTrustDocs";
import LogisticsFinalCTA from "@/components/Logistics/LogisticsFinalCTA";

export default function LogisticsPage() {
  return (
    <main className="bg-[#080d1a]">
      <LogisticsHero />
      <LogisticsChallenges />
      <LogisticsServiceClaims />
      <LogisticsMultiRegion />
      <LogisticsEvidenceRecords />
      <LogisticsCapabilities />
      <LogisticsProcess />
      <LogisticsTestimonial />
      <LogisticsTrustDocs />
      <LogisticsFinalCTA />
    </main>
  );
}
