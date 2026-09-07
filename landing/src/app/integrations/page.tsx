import type { Metadata } from "next";

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

export const metadata = {
  title: "Enterprise AI Integration Platform | ZoikoVertex",
  description:
    "ZoikoVertex provides enterprise AI integrations that connect your marketing stack, AI workflows, data, approvals, governance, and audit trails in one layer.",
};

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
