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
  title: "AI Executive Command Center | ZoikoVertex",
  description:
    "Manage AI-powered marketing from one executive command center. Track execution, governance, approvals, risks, performance, and ROI with ZoikoVertex.",
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
