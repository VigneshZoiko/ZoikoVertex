import type { Metadata } from "next";

import HealthcareHero from "@/components/Healthcare/HealthcareHero";
import HealthcareChallenges from "@/components/Healthcare/HealthcareChallenges";
import HealthcareClinicalReview from "@/components/Healthcare/HealthcareClinicalReview";
import HealthcareAIGovernance from "@/components/Healthcare/HealthcareAIGovernance";
import HealthcareEvidenceRecords from "@/components/Healthcare/HealthcareEvidenceRecords";
import HealthcareCapabilities from "@/components/Healthcare/HealthcareCapabilities";
import HealthcareProcess from "@/components/Healthcare/HealthcareProcess";
import HealthcareTestimonial from "@/components/Healthcare/HealthcareTestimonial";
import HealthcareTrustDocs from "@/components/Healthcare/HealthcareTrustDocs";
import HealthcareFinalCTA from "@/components/Healthcare/HealthcareFinalCTA";

export const metadata = {
  title: "Healthcare Marketing with AI Governance | ZoikoVertex",
  description:
    "Improve healthcare marketing with ZoikoVertex using governed AI, clinical review, compliance workflows, approval controls, and evidence-ready governance.",
};

export default function HealthcarePage() {
  return (
    <main className="bg-[#080d1a]">
      <HealthcareHero />
      <HealthcareChallenges />
      <HealthcareClinicalReview />
      <HealthcareAIGovernance />
      <HealthcareEvidenceRecords />
      <HealthcareCapabilities />
      <HealthcareProcess />
      <HealthcareTestimonial />
      <HealthcareTrustDocs />
      <HealthcareFinalCTA />
    </main>
  );
}
