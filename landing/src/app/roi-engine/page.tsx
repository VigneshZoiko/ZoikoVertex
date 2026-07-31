import {
  ZoikoRoiHeroSection,
  ZoikoAudiencePersonaGrid,
  ZoikoRoiCalculatorSection,
  ZoikoValueDriversSection,
  ZoikoGovernanceRoiSection,
  ZoikoEnterpriseRetailSection,
  ZoikoExecutiveReportSection,
  ZoikoFaqCtaSection,
  ZoikoBusinessCaseCtaSection,
} from "@/components/roi-engine";

export default function RoiEnginePage() {
  return (
    <main>
      <ZoikoRoiHeroSection />
      <ZoikoAudiencePersonaGrid />
      <ZoikoRoiCalculatorSection />
      <ZoikoValueDriversSection />
      <ZoikoGovernanceRoiSection />
      <ZoikoEnterpriseRetailSection />
      <ZoikoExecutiveReportSection />
      <ZoikoFaqCtaSection />
      <ZoikoBusinessCaseCtaSection />
    </main>
  );
}
