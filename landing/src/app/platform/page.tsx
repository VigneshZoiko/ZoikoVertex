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
import Navbar from "@/components/navbar/Navbar";
import Footer from "@/components/footer/Footer";

export default function PlatformPage() {
  return (
    <main>
      <Navbar />
      <div className="pt-16">   {/* 👈 this pushes content below fixed navbar */}
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
      <Footer />
    </main>
  );
}