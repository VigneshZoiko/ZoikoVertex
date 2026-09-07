import type { Metadata } from "next";

import {
  BrandComplianceHeroSection,
  BrandComplianceFeaturesStrip,
  BrandGovernanceProblemSection,
  BrandGovernanceModulesSection,
  ComplianceArchitectureSection,
  BrandComplianceBusinessValueSection,
  BrandComplianceWhoThisSolvesForSection,
  BrandComplianceFAQSection,
} from "@/components/brand-compliance";

export const metadata: Metadata = {
  title: "AI Brand Compliance for Marketing | ZoikoVertex",
  description:
    "ZoikoVertex provides AI brand compliance for marketing workflows, checking brand voice, claims, offers, disclosures & advertising standards before approval.",
};

export default function BrandCompliancePage() {
  return (
    <main>
      <BrandComplianceHeroSection />
      <BrandComplianceFeaturesStrip />
      <BrandGovernanceProblemSection />
      <BrandGovernanceModulesSection />
      <ComplianceArchitectureSection />
      <BrandComplianceBusinessValueSection />
      <BrandComplianceWhoThisSolvesForSection />
      <BrandComplianceFAQSection />
    </main>
  );
}
