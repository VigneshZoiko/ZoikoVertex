import type { Metadata } from "next";

import {
  PartnerHeroSection,
  PartnerFeaturesGrid,
  PartnerPathways,
  PartnershipMotions,
  WhyPartnersChoose,
  EnterpriseUseCases,
  PartnerEnablement,
  TechnicalReadiness,
  PartnerTestimonialSection,
  GovernanceExpectations,
  PartnerQualification,
  PartnerApplicationProcess,
  PartnerProfilesSection,
  PartnerApplicationForm,
  PartnerFAQ,
  PartnerCtaSection,
} from "@/components/partnerships";

export const metadata: Metadata = {
  title: "ZoikoVertex Partner Ecosystem | Governed AI Execution",
  description:
    "Join the ZoikoVertex partner ecosystem to deliver governed AI execution with approval controls, auditability, enterprise integrations, and measurable ROI.",
};

export default function PartnerShipPage() {
  return (
    <main>
      <PartnerHeroSection />
      <PartnerFeaturesGrid />
      <PartnerPathways />
      <PartnershipMotions />
      <WhyPartnersChoose />
      <EnterpriseUseCases />
      <PartnerEnablement />
      <TechnicalReadiness />
      <PartnerTestimonialSection />
      <GovernanceExpectations />
      <PartnerQualification />
      <PartnerApplicationProcess />
      <PartnerProfilesSection />
      <PartnerApplicationForm />
      <PartnerFAQ />
      <PartnerCtaSection />
    </main>
  );
}
