import type { Metadata } from "next";

import {
  FaqHeroSection,
  RoleBasedQuickPathsSection,
  FeaturedQuestions,
  CategoryNavigation,
  PlatformOverviewAccordion,
  AgenticArchitectureAccordion,
  WorkflowsAndApprovalsAccordion,
  GovernanceAuditabilityAccordion,
  SecurityPrivacyDataAccordion,
  IntegrationsAndImplementationAccordion,
  RoiPricingProcurementAccordion,
  RoiBannerCallout,
  SupportUpdatesCustomersAccordion,
  GetRoutedToRightTeam,
  DidntFindAnswerCallout,
} from "@/components/faqs";

export const metadata: Metadata = {
  title: "ZoikoVertex FAQs | Enterprise AI Governance Questions",
  description:
    "Find answers on how ZoikoVertex governs agentic AI, manages approvals, retains evidence, supports auditability, and helps enterprises measure ROI.",
};

export default function FaqPage() {
  return (
    <main>
      <FaqHeroSection />
      <RoleBasedQuickPathsSection />
      <FeaturedQuestions />
      <CategoryNavigation />
      <PlatformOverviewAccordion />
      <AgenticArchitectureAccordion />
      <WorkflowsAndApprovalsAccordion />
      <GovernanceAuditabilityAccordion />
      <SecurityPrivacyDataAccordion />
      <IntegrationsAndImplementationAccordion />
      <RoiPricingProcurementAccordion />
      <RoiBannerCallout />
      <SupportUpdatesCustomersAccordion />
      <GetRoutedToRightTeam />
      <DidntFindAnswerCallout />
    </main>
  );
}
