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
