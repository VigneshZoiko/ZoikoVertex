import type { Metadata } from "next";

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

export const metadata = {
  title: "ROI Engine for Governed AI Execution | ZoikoVertex",
  description:
    "ZoikoVertex AI ROI Engine proves the business value of every AI workflow with transparent estimates for productivity, governance ROI, savings, and payback.",
};

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
