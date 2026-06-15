import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | ZoikoVertex",
  description:
    "Terms of Service for ZoikoVertex — Governed Autonomous Agentic-Intelligence Marketing Platform. Governing access, subscriptions, customer content, AI workflows, and enterprise agreements.",
  alternates: {
    canonical: "https://www.zoikovertex.com/terms",
  },
};

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
