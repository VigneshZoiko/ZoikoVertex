import type { Metadata } from "next";

import {
  PlatformSection,
  PlatformPainPoint,
  PlatformCategory,
  PlatformCapabilities,
  RoleWorkspaces,
  AIAgentsSection,
  InboxEngagementSection,
  BrandLibrarySection,
  EvidenceCrisisSection,
  IntegrationsSection,
  PricingSection,
  SecurityTrustSection,
  FAQSection,
} from "@/components/Platform/platform";

export const metadata: Metadata = {
  title: "Governed AI Marketing Platform | ZoikoVertex",
  description:
    "Scale enterprise marketing with ZoikoVertex, a governed AI marketing platform for AI workflows, approvals, brand compliance, audit evidence, and intelligence.",
};

export default function PlatformPage() {
  return (
    <main>
      <div>
        <PlatformSection />
        <PlatformPainPoint />
        <PlatformCategory />
        <PlatformCapabilities />
        <RoleWorkspaces />
        <AIAgentsSection />
        <InboxEngagementSection />
        <BrandLibrarySection />
        <EvidenceCrisisSection />
        <IntegrationsSection />
        <PricingSection />
        <SecurityTrustSection />
        <FAQSection />
      </div>
    </main>
  );
}
