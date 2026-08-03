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
