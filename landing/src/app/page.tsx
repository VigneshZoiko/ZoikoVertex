import type { Metadata } from "next";

import {
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
} from "@/components/landing";

export const metadata: Metadata = {
  title: "Agentic Marketing Operating System | ZoikoVertex",
  description:
    "ZoikoVertex delivers an agentic marketing operating system with AI workflows, approval controls, ROI optimization, and audit-ready enterprise governance.",
};

export default function LandingPage() {
  return (
    <main className="min-h-screen">
      <Hero /> {/* dark  #080812 */}
      <TrustedBy /> {/* dark  #0f1b2e */}
      <Stats /> {/* light #F5F7FA */}
      <Pricing /> {/* dark  #080E1A */}
      <FeatureBlock /> {/* light #FFFFFF */}
      <Architecture /> {/* light #FFFFFF */}
      <PainPoints /> {/* dark  #080812 */}
      <AgentsGrid /> {/* light #FFFFFF */}
      <Accountability /> {/* dark  #152238 */}
      <EnterpriseBanner />
      {/* dark  #0f1b2e */}
      <EnterpriseFeatures />
      <Industries /> {/* light #F5F7FA */}
      <StackComparison />
      {/* dark  #0f1b2e */}
      <TrustModel /> {/* light #F5F7FA */}
      <Testimonials />
      {/* dark  #152238 */}
      <FooterCTA /> {/* dark  gradient */}
    </main>
  );
}
