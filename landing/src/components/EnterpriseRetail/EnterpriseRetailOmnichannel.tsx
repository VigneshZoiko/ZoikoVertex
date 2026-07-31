import EnterpriseRetailSplitFeature from "./EnterpriseRetailSplitFeature";

export default function EnterpriseRetailOmnichannel() {
  return (
    <EnterpriseRetailSplitFeature
      eyebrow="Omnichannel Campaign Governance"
      heading="One governed workflow from brief to publish — across every channel and region."
      body="From initial brief through AI-assisted planning, regional localization, policy checks, approval routing, publication, and ROI measurement — every stage creates a linked evidence record. No step is invisible."
      chips={["Social", "Paid media", "Email", "Commerce", "Retail media", "In-store"]}
      image="/images/enterprise-retail/Omnichannel campaign governance across social, commerce, retail media, and in-store channels.png"
      imageSide="right"
      bg="bg-[#080d1a]"
      minHeight="lg:min-h-[596px]"
    />
  );
}
