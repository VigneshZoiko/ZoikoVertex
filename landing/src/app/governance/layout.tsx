import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Governance Platform for Enterprises | ZoikoVertex",
  description:
    "ZoikoVertex provides AI governance for enterprise marketing with policy controls, approval workflows, human oversight, and audit-ready evidence at every step.",
};

export default function GovernanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
