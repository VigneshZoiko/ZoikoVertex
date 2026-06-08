import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import TrustedBy from "@/components/TrustedBy";
import Stats from "@/components/Stats";
import Pricing from "@/components/Pricing";
import FeatureBlock from "@/components/FeatureBlock";
import Architecture from "@/components/Architecture";
import PainPoints from "@/components/PainPoints";
import AgentsGrid from "@/components/AgentsGrid";
import Accountability from "@/components/Accountability";
import EnterpriseBanner from "@/components/EnterpriseBanner";
import EnterpriseFeatures from "@/components/EnterpriseFeatures";
import Industries from "@/components/Industries";
import StackComparison from "@/components/StackComparison";
import TrustModel from "@/components/TrustModel";
import Testimonials from "@/components/Testimonials";
import FooterCTA from "@/components/FooterCTA";
import Footer from "@/components/Footer";

export default function LandingPage() {
  return (
    <main className="min-h-screen">
      <Navbar />
      <Hero />
      <TrustedBy />
      <Stats />
      <FeatureBlock />
      <Pricing />
      <Architecture />
      <PainPoints />
      <AgentsGrid />
      <Accountability />
      <EnterpriseBanner />
      <EnterpriseFeatures />
      <Industries />
      <StackComparison />
      <TrustModel />
      <Testimonials />
      <FooterCTA />
      <Footer />
    </main>
  );
}
