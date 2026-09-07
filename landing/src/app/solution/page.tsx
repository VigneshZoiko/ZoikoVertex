import type { Metadata } from "next";

import {
  SolutionHero,
  SolutionStats,
  SolutionPathways,
  SolutionIndustries,
  SolutionOutcomes,
  SolutionGovernance,
  SolutionImplementation,
  SolutionTrustBar,
  SolutionFAQ,
} from "@/components/Solution/solution";

export const metadata: Metadata = {
  title: "Governed AI Marketing Solutions | ZoikoVertex",
  description:
    "Discover governed AI marketing solutions for enterprise teams. Connect workflows, approvals, compliance, integrations & evidence for accountable execution.",
};

export default function SolutionPage() {
  return (
    <main>
      <div>
        <SolutionHero />
        <SolutionStats />
        <SolutionPathways />
        <SolutionIndustries />
        <SolutionOutcomes />
        <SolutionGovernance />
        <SolutionImplementation />
        <SolutionTrustBar />
        <SolutionFAQ />
      </div>
    </main>
  );
}
