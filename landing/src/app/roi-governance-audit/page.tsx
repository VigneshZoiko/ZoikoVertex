import type { Metadata } from "next";

import {
  ROIAuditHeroSection,
  WhyMeasureBothTogetherSection,
  RunROIAuditSection,
  WhatTheAuditMeasuresSection,
  SampleExecutiveReportSection,
  EvidenceBehindEstimateSection,
  RoleBasedValuePathsSection,
  EnterpriseUseCasesSection,
  MethodologyAssumptionsSection,
  SecurityPrivacyDataRetentionSection,
  FaqSection,
  CtaSection,
} from "@/components/roi-governance-audit";

export const metadata: Metadata = {
  title: "ROI & Governance Audit for Agentic Execution | ZoikoVertex",
  description:
    "Calculate the ROI of governed agentic execution with ZoikoVertex. Assess time savings, approval velocity, risk reduction, and governance readiness.",
};

export default function RoiGovernanceAuditPage() {
  return (
    <main>
      <ROIAuditHeroSection />
      <WhyMeasureBothTogetherSection />
      <RunROIAuditSection />
      <WhatTheAuditMeasuresSection />
      <SampleExecutiveReportSection />
      <EvidenceBehindEstimateSection />
      <RoleBasedValuePathsSection />
      <EnterpriseUseCasesSection />
      <MethodologyAssumptionsSection />
      <SecurityPrivacyDataRetentionSection />
      <FaqSection />
      <CtaSection />
    </main>
  );
}
