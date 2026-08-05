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
