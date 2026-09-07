import type { Metadata } from "next";

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

export const metadata: Metadata = {
  title: "Marketing Operations Platform | ZoikoVertex",
  description:
    "ZoikoVertex delivers a marketing operations platform that connects AI workflows, approvals, MarTech tools, and campaign performance in one governed system.",
};

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
