import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Leadership | ZoikoVertex",
  description:
    "A governance-led leadership model connecting founder oversight, product discipline, engineering execution, responsible AI, security, design authority, and customer accountability.",
};

export default function LeadershipLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
