import type { Metadata } from "next";

import {
  BuyerGuidesHeroSection,
  StartWithYourRoleSection,
  FeaturedGuideLibrarySection,
  EnterpriseEvaluationFrameworkSection,
  GovernanceReadinessChecklistSection,
  BusinessCaseAndProcurementSection,
  ComparisonFrameworkSection,
  GuidedDemoPathSection,
  BuyerFaqSection,
  BuyerGuidesCtaSection,
} from "@/components/buyer-guides";

export const metadata: Metadata = {
  title: "Governed Agentic AI Buyer Guides | ZoikoVertex",
  description:
    "Explore ZoikoVertex buyer guides for governed agentic AI, covering governance, ROI, orchestration, auditability, integrations, and enterprise readiness.",
};

export default function BuyerGuidesPage() {
  return (
    <main>
      <BuyerGuidesHeroSection />
      <StartWithYourRoleSection />
      <FeaturedGuideLibrarySection />
      <EnterpriseEvaluationFrameworkSection />
      <GovernanceReadinessChecklistSection />
      <BusinessCaseAndProcurementSection />
      <ComparisonFrameworkSection />
      <GuidedDemoPathSection />
      <BuyerFaqSection />
      <BuyerGuidesCtaSection />
    </main>
  );
}
