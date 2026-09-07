import type { Metadata } from "next";

import {
  UseCasesMainHero,
  UseCaseFinder,
  FlagshipEnterpriseJourneys,
  OutcomeMap,
  WorkflowPreview,
  GovernanceTrust,
  LandExpand,
  ChooseYourNextStep,
  CommonQuestions,
  UseCasesCta,
} from "@/components/use-cases";

export const metadata: Metadata = {
  title: "AI Use Cases for Enterprise Workflows | ZoikoVertex",
  description:
    "Discover governed AI use cases for enterprise workflows. Automate high-value work, control AI agents, manage approvals, and prove ROI with ZoikoVertex.",
};

export default function UseCasesPage() {
  return (
    <main>
      <UseCasesMainHero />
      <UseCaseFinder />
      <FlagshipEnterpriseJourneys />
      <OutcomeMap />
      <WorkflowPreview />
      <GovernanceTrust />
      <LandExpand />
      <ChooseYourNextStep />
      <CommonQuestions />
      <UseCasesCta />
    </main>
  );
}
