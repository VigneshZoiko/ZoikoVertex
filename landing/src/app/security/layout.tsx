import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Marketing Security & Governance | ZoikoVertex",
  description:
    "ZoikoVertex delivers AI marketing security with governed workflows, access controls, audit trails, human approvals, and enterprise-grade data protection.",
};

export default function SecurityLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
