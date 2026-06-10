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
      <Hero />           {/* dark  #080812  — page 1 */}
      <TrustedBy />      {/* dark  #0f1b2e */}
      <Stats />          {/* light #F5F7FA  — page 2/3 */}
      <Pricing />        {/* dark  #080E1A  — page 4/5 */}
      <PainPoints />     {/* dark  #080812  — page 6 */}
      <AgentsGrid />     {/* light #FFFFFF  — page 7 */}
      <Accountability /> {/* dark  #152238  — page 8 */}
      <FeatureBlock />   {/* light #FFFFFF */}
      <Architecture />   {/* light #FFFFFF */}
      <EnterpriseBanner />{/* dark  #0f1b2e */}
      <EnterpriseFeatures />
      <Industries />  {/* light #F5F7FA */}
      <StackComparison />{/* dark  #0f1b2e */}
      <TrustModel />  {/* light #F5F7FA */}
      <Testimonials />{/* dark  #152238 */}
      <FooterCTA />   {/* dark  gradient */}
      <Footer />      {/* dark  #080f1e */}
    </main>
  );
}
