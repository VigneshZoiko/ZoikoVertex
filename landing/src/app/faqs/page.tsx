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
