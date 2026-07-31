import EnterpriseRetailSplitFeature from "./EnterpriseRetailSplitFeature";

export default function EnterpriseRetailAgents() {
  return (
    <EnterpriseRetailSplitFeature
      eyebrow="Retail Execution Operating System"
      heading="AI agents that plan, create, and route — with humans approving every step."
      body="ZoikoVertex deploys governed retail agents for campaign planning, content variation, localization, QA, and performance summaries. Every AI action stays within policy boundaries and requires human sign-off before activation."
      chips={[
        "Campaign briefing agents",
        "Content variation",
        "Localization at scale",
        "Policy compliance checks",
        "Human approval gates",
      ]}
      image="/images/enterprise-retail/Enterprise retail AI workflow orchestration and governed campaign planning.png"
      imageSide="left"
      bg="bg-[#0E1626]"
      minHeight="lg:min-h-[581px]"
    />
  );
}
