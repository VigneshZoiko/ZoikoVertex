import {
  AgencyWorkflowsHeroSection,
  AgencyWorkflowsFeaturesSection,
  AgencyPainPointsSection,
  AgencyWorkflowPlatformSection,
  AgencyCampaignLifecycleSection,
  AgencyBusinessValueSection,
  AgencyRolesSection,
  AgencyWorkflowsFAQSection,
  AgencyWorkflowsCTASection,
} from "@/components/agency-workflows";

export default function AgencyWorkflowsPage() {
  return (
    <main>
      <AgencyWorkflowsHeroSection />
      <AgencyWorkflowsFeaturesSection />
      <AgencyPainPointsSection />
      <AgencyWorkflowPlatformSection />
      <AgencyCampaignLifecycleSection />
      <AgencyBusinessValueSection />
      <AgencyRolesSection />
      <AgencyWorkflowsFAQSection />
      <AgencyWorkflowsCTASection />
    </main>
  );
}
