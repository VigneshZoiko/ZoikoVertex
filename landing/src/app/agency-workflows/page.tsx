import type { Metadata } from "next";

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

export const metadata: Metadata = {
  title: "Governed AI Workflows for Agencies | ZoikoVertex",
  description:
    "Zoiko Vertex offers AI workflows for agencies that optimize operations, automate routines, and improve project delivery for increased client satisfaction.",
};

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
