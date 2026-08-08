import {
  MarketingOpsHeroSection,
  MarketingOpsFeaturesSection,
  MarketingOpsChallengesSection,
  MarOpsPlatformModulesSection,
  MarOpsExecutionModelSection,
  MarketingStackIntegrationsSection,
  MarOpsBusinessValueSection,
  MarOpsRolesSection,
  MarOpsFAQSection,
  MarOpsCallToActionSection,
} from "@/components/marketing-ops";

export default function MarketingPage() {
  return (
    <main>
      <MarketingOpsHeroSection />
      <MarketingOpsFeaturesSection />
      <MarketingOpsChallengesSection />
      <MarOpsPlatformModulesSection />
      <MarOpsExecutionModelSection />
      <MarketingStackIntegrationsSection />
      <MarOpsBusinessValueSection />
      <MarOpsRolesSection />
      <MarOpsFAQSection />
      <MarOpsCallToActionSection />
    </main>
  );
}
