import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ZoikoVertex Leadership Team | AI Governance Vision",
  description:
    "Meet ZoikoVertex leadership driving responsible AI, governance, security, product strategy, and enterprise accountability with a trusted technology vision.",
};

export default function LeadershipLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
