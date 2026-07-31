import {
  ZoikoIntegrationsHeroSection,
  IntegrationsGrid,
  GovernanceArchitecture,
  WorkflowUseCases,
  SecurityControlsSection,
  ApiFirstPath,
  IntegrationHealthObservability,
  AnswersForEveryReviewer,
  IntegrationsFaq,
  ZoikovertexIntegrations,
} from "@/components/integrations";

export default function IntegrationsPage() {
  return (
    <main>
      <ZoikoIntegrationsHeroSection />
      <IntegrationsGrid />
      <GovernanceArchitecture />
      <WorkflowUseCases />
      <SecurityControlsSection />
      <ApiFirstPath />
      <IntegrationHealthObservability />
      <AnswersForEveryReviewer />
      <IntegrationsFaq />
      <ZoikovertexIntegrations />
    </main>
  );
}
