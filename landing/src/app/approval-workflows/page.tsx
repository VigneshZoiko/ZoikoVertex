import ApprovalWorkflowsHero from "@/components/ApprovalWorkflows/ApprovalWorkflowsHero";
import ApprovalWorkflowsFeatures from "@/components/ApprovalWorkflows/ApprovalWorkflowsFeatures";
import ApprovalWorkflowsProblem from "@/components/ApprovalWorkflows/ApprovalWorkflowsProblem";
import ApprovalWorkflowsStages from "@/components/ApprovalWorkflows/ApprovalWorkflowsStages";
import ApprovalWorkflowsRiskRoles from "@/components/ApprovalWorkflows/ApprovalWorkflowsRiskRoles";
import ApprovalWorkflowsEvidence from "@/components/ApprovalWorkflows/ApprovalWorkflowsEvidence";
import ApprovalWorkflowsTemplates from "@/components/ApprovalWorkflows/ApprovalWorkflowsTemplates";
import ApprovalWorkflowsROI from "@/components/ApprovalWorkflows/ApprovalWorkflowsROI";
import ApprovalWorkflowsFAQ from "@/components/ApprovalWorkflows/ApprovalWorkflowsFAQ";

export default function ApprovalWorkflowsPage() {
  return (
    <main className="bg-[#101D2F]">
      <ApprovalWorkflowsHero />
      <ApprovalWorkflowsFeatures />
      <ApprovalWorkflowsProblem />
      <ApprovalWorkflowsStages />
      <ApprovalWorkflowsRiskRoles />
      <ApprovalWorkflowsEvidence />
      <ApprovalWorkflowsTemplates />
      <ApprovalWorkflowsROI />
      <ApprovalWorkflowsFAQ />
    </main>
  );
}
