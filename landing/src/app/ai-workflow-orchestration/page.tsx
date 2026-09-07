import type { Metadata } from "next";

import WorkflowOrchestrationHero from "@/components/WorkflowOrchestration/WorkflowOrchestrationHero";
import WorkflowOrchestrationFeatures from "@/components/WorkflowOrchestration/WorkflowOrchestrationFeatures";
import WorkflowOrchestrationProblem from "@/components/WorkflowOrchestration/WorkflowOrchestrationProblem";
import WorkflowOrchestrationStages from "@/components/WorkflowOrchestration/WorkflowOrchestrationStages";
import WorkflowOrchestrationControls from "@/components/WorkflowOrchestration/WorkflowOrchestrationControls";
import WorkflowOrchestrationIntegrations from "@/components/WorkflowOrchestration/WorkflowOrchestrationIntegrations";
import WorkflowOrchestrationEvidence from "@/components/WorkflowOrchestration/WorkflowOrchestrationEvidence";
import WorkflowOrchestrationROI from "@/components/WorkflowOrchestration/WorkflowOrchestrationROI";
import WorkflowOrchestrationUseCases from "@/components/WorkflowOrchestration/WorkflowOrchestrationUseCases";
import WorkflowOrchestrationFAQ from "@/components/WorkflowOrchestration/WorkflowOrchestrationFAQ";

export const metadata = {
  title: "AI Workflow Orchestration Platform | ZoikoVertex",
  description:
    "Streamline AI workflow orchestration with ZoikoVertex, combining governed AI execution, automated approvals, policy controls, and complete audit trails.",
};

export default function AIWorkflowOrchestrationPage() {
  return (
    <main className="bg-[#080d1a]">
      <WorkflowOrchestrationHero />
      <WorkflowOrchestrationFeatures />
      <WorkflowOrchestrationProblem />
      <WorkflowOrchestrationStages />
      <WorkflowOrchestrationControls />
      <WorkflowOrchestrationIntegrations />
      <WorkflowOrchestrationEvidence />
      <WorkflowOrchestrationROI />
      <WorkflowOrchestrationUseCases />
      <WorkflowOrchestrationFAQ />
    </main>
  );
}
