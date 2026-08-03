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
