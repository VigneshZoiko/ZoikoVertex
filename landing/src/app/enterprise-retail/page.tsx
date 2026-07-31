import EnterpriseRetailHero from "@/components/EnterpriseRetail/EnterpriseRetailHero";
import EnterpriseRetailChallenges from "@/components/EnterpriseRetail/EnterpriseRetailChallenges";
import EnterpriseRetailAgents from "@/components/EnterpriseRetail/EnterpriseRetailAgents";
import EnterpriseRetailOmnichannel from "@/components/EnterpriseRetail/EnterpriseRetailOmnichannel";
import EnterpriseRetailEvidence from "@/components/EnterpriseRetail/EnterpriseRetailEvidence";
import EnterpriseRetailUseCases from "@/components/EnterpriseRetail/EnterpriseRetailUseCases";
import EnterpriseRetailLifecycle from "@/components/EnterpriseRetail/EnterpriseRetailLifecycle";
import EnterpriseRetailLocalization from "@/components/EnterpriseRetail/EnterpriseRetailLocalization";
import EnterpriseRetailGovernance from "@/components/EnterpriseRetail/EnterpriseRetailGovernance";
import EnterpriseRetailIntegrations from "@/components/EnterpriseRetail/EnterpriseRetailIntegrations";
import EnterpriseRetailRoi from "@/components/EnterpriseRetail/EnterpriseRetailRoi";
import EnterpriseRetailTestimonial from "@/components/EnterpriseRetail/EnterpriseRetailTestimonial";
import EnterpriseRetailCapabilities from "@/components/EnterpriseRetail/EnterpriseRetailCapabilities";
import EnterpriseRetailFaq from "@/components/EnterpriseRetail/EnterpriseRetailFaq";

export const metadata = {
  title: "Enterprise Retail | ZoikoVertex",
  description:
    "Govern AI-powered retail execution across brands, stores, regions, and channels. Orchestrate governed AI workflows, approvals, omnichannel campaigns, store-level localization, evidence, auditability, and ROI from one platform.",
};

export default function EnterpriseRetailPage() {
  return (
    <main className="bg-[#080d1a]">
      <EnterpriseRetailHero />
      <EnterpriseRetailChallenges />
      <EnterpriseRetailAgents />
      <EnterpriseRetailOmnichannel />
      <EnterpriseRetailEvidence />
      <EnterpriseRetailUseCases />
      <EnterpriseRetailLifecycle />
      <EnterpriseRetailLocalization />
      <EnterpriseRetailGovernance />
      <EnterpriseRetailIntegrations />
      <EnterpriseRetailRoi />
      <EnterpriseRetailTestimonial />
      <EnterpriseRetailCapabilities />
      <EnterpriseRetailFaq />
    </main>
  );
}
