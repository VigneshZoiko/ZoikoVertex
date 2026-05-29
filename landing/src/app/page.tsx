import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PlatformSection from "@/components/Banner";
import PlatformPainPoint from "@/components/PlatformPainPoint";
import PlatformCategory from "@/components/PlatformCategory";
import PlatformCapabilities from "@/components/PlatformCapabilitie";
import RoleWorkspaces from "@/components/RoleWorkspace";
import AIAgentsSection from "@/components/AIAgentsSection";
import InboxEngagementSection from "@/components/InboxEngagementSection";
import BrandLibrarySection from "@/components/BrandLibrarySection";
import EvidenceCrisisSection from "@/components/EvidenceCrisisSection";
import IntegrationsSection from "@/components/IntegrationsSection";
import PricingSection from "@/components/PricingSection";
import SecurityTrustSection from "@/components/SecurityTrustSection";
import FAQSection from "@/components/FAQSection";

export default function LandingPage() {
  return (
    <main>
      <Navbar />
      <div className="pt-16">
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
