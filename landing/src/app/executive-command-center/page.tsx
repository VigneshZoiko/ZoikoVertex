import ExecutiveCommandCenterHero from "@/components/ExecutiveCommandCenter/ExecutiveCommandCenterHero";
import ExecutiveCommandCenterSignals from "@/components/ExecutiveCommandCenter/ExecutiveCommandCenterSignals";
import ExecutiveCommandCenterMoments from "@/components/ExecutiveCommandCenter/ExecutiveCommandCenterMoments";
import ExecutiveCommandCenterGovernance from "@/components/ExecutiveCommandCenter/ExecutiveCommandCenterGovernance";
import ExecutiveCommandCenterDataLayers from "@/components/ExecutiveCommandCenter/ExecutiveCommandCenterDataLayers";
import ExecutiveCommandCenterRoi from "@/components/ExecutiveCommandCenter/ExecutiveCommandCenterRoi";
import ExecutiveCommandCenterBuyerPaths from "@/components/ExecutiveCommandCenter/ExecutiveCommandCenterBuyerPaths";
import ExecutiveCommandCenterIntegrationHealth from "@/components/ExecutiveCommandCenter/ExecutiveCommandCenterIntegrationHealth";
import ExecutiveCommandCenterFaq from "@/components/ExecutiveCommandCenter/ExecutiveCommandCenterFaq";
import ExecutiveCommandCenterFinalCTA from "@/components/ExecutiveCommandCenter/ExecutiveCommandCenterFinalCTA";

export const metadata = {
  title: "Executive Command Center | ZoikoVertex",
  description:
    "See every agent, workflow, approval, risk and ROI signal in one governed command center. A real-time operating view of AI-assisted execution, governance exceptions, approval bottlenecks, and measurable business outcomes.",
};

export default function ExecutiveCommandCenterPage() {
  return (
    <main className="bg-[#080d1a]">
      <ExecutiveCommandCenterHero />
      <ExecutiveCommandCenterSignals />
      <ExecutiveCommandCenterMoments />
      <ExecutiveCommandCenterGovernance />
      <ExecutiveCommandCenterDataLayers />
      <ExecutiveCommandCenterRoi />
      <ExecutiveCommandCenterBuyerPaths />
      <ExecutiveCommandCenterIntegrationHealth />
      <ExecutiveCommandCenterFaq />
      <ExecutiveCommandCenterFinalCTA />
    </main>
  );
}
