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
import Navbar from "@/components/navbar/Navbar";
import Footer from "@/components/footer/Footer";

export default function SolutionPage() {
  return (
    <main>
      <Navbar />
      <div className="pt-16">   {/* 👈 this pushes content below fixed navbar */}
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
      <Footer />
    </main>
  );
}