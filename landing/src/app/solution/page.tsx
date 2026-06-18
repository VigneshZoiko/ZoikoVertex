import {
    SolutionHero,
    SolutionStats,
    SolutionPathways,
    SolutionIndustries,
    SolutionOutcomes,
    SolutionGovernance,
    SolutionImplementation,
    SolutionTrustBar,
    SolutionFAQ
  } from "@/components/Solution/solution";
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