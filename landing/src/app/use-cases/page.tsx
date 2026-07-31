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
