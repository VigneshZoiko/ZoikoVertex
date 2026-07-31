import EnterpriseRetailSplitFeature from "./EnterpriseRetailSplitFeature";

export default function EnterpriseRetailEvidence() {
  return (
    <EnterpriseRetailSplitFeature
      eyebrow="Evidence at Every Stage"
      heading="Every approval, every decision, every AI action — traceable."
      body="ZoikoVertex creates linked evidence records across every campaign stage: who drafted, who reviewed, who approved, under which policy version, on which channel, with what outcome. Ready for internal audit, legal review, or executive inquiry."
      chips={[
        "Audit Trail",
        "Decision Ledger",
        "Evidence Vault",
        "Forensic Hub",
        "Identity Ledger",
      ]}
      image="/images/enterprise-retail/Retail evidence vault and audit trail for campaign decisions and approvals.png"
      imageSide="left"
      bg="bg-[#0E1626]"
      minHeight="lg:min-h-[534px]"
    />
  );
}
