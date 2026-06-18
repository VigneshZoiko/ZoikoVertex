import { PlatformSection,
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
    FAQSection
  } from "@/components/Platform/platform";
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