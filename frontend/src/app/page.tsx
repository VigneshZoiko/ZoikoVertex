import {
  Navbar,
  Hero,
  TrustedBy,
  Stats,
  Pricing,
  FeatureBlock,
  Architecture,
  PainPoints,
  AgentsGrid,
  Accountability,
  EnterpriseBanner,
  EnterpriseFeatures,
  Industries,
  StackComparison,
  TrustModel,
  Testimonials,
  FooterCTA,
  Footer,
} from "@/components/landing";

export default function LandingPage() {
  return (
    <main className="min-h-screen">
      <Navbar />
      <Hero />
      <Stats />
      <Pricing />
      <FeatureBlock />
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
