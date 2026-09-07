import type { Metadata } from "next";

import {
  CompetitorBenchmarkHero,
  BenchmarkScoringFilter,
  BenchmarkMatrixTable,
  CategoryDeepDives,
  WhyItMattersByRole,
  EvaluationPathQualifier,
  ProcurementAndTrust,
  RoiAndRetention,
  BuyerQuestionsFaq,
} from "@/components/competeter-benchmark";

export const metadata: Metadata = {
  title: "AI Competitor Benchmarking & Comparison | ZoikoVertex",
  description:
    "Compare ZoikoVertex with enterprise AI platforms across workflows, approvals, and execution, including governance, evidence, auditability, ROI, and control.",
};

export default function CompeteterBenchmark() {
  return (
    <main>
      <CompetitorBenchmarkHero />
      <BenchmarkScoringFilter />
      <BenchmarkMatrixTable />
      <CategoryDeepDives />
      <WhyItMattersByRole />
      <EvaluationPathQualifier />
      <ProcurementAndTrust />
      <RoiAndRetention />
      <BuyerQuestionsFaq />
    </main>
  );
}
