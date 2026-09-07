import AgenciesHero from "@/components/Agencies/AgenciesHero";
import AgenciesChallenges from "@/components/Agencies/AgenciesChallenges";
import AgenciesApprovalWorkflows from "@/components/Agencies/AgenciesApprovalWorkflows";
import AgenciesWorkspaceSeparation from "@/components/Agencies/AgenciesWorkspaceSeparation";
import AgenciesAIGovernance from "@/components/Agencies/AgenciesAIGovernance";
import AgenciesCapabilities from "@/components/Agencies/AgenciesCapabilities";
import AgenciesProcess from "@/components/Agencies/AgenciesProcess";
import AgenciesTestimonial from "@/components/Agencies/AgenciesTestimonial";
import AgenciesTrustDocs from "@/components/Agencies/AgenciesTrustDocs";
import AgenciesFinalCTA from "@/components/Agencies/AgenciesFinalCTA";

export const metadata = {
  title: "Marketing Agency Workflow | ZoikoVertex",
  description:
    "Improve marketing agency workflow with ZoikoVertex. Manage client approvals, AI-assisted content, brand workspaces, and audit-ready evidence in one platform.",
};

export default function AgenciesPage() {
  return (
    <main className="bg-[#080d1a]">
      <AgenciesHero />
      <AgenciesChallenges />
      <AgenciesApprovalWorkflows />
      <AgenciesWorkspaceSeparation />
      <AgenciesAIGovernance />
      <AgenciesCapabilities />
      <AgenciesProcess />
      <AgenciesTestimonial />
      <AgenciesTrustDocs />
      <AgenciesFinalCTA />
    </main>
  );
}
