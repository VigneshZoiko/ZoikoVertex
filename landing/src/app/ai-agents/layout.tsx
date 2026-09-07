import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Governed AI Agent Platform | ZoikoVertex",
  description:
    "ZoikoVertex delivers a governed AI agent platform that automates marketing workflows with role-based access, policy controls, approvals, and audit trails.",
};

export default function AiAgents({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
