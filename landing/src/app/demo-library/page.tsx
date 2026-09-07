import type { Metadata } from "next";

import {
  DemoLibrarySection,
  ExecutiveOverviewSection,
  DemoFinderSection,
  RoleBasedPlaylistsSection,
  ProofInEveryDemoSection,
  BuyingCommitteeSharingSection,
  BookLiveDemoSection,
  DemoLibraryFAQSection,
  ProveItCallToActionSection,
} from "@/components/demo-library";

export const metadata: Metadata = {
  title: "AI Product Demos and Workflows | ZoikoVertex",
  description:
    "Browse AI product demos showing how ZoikoVertex enables governed AI execution, approval workflows, audit-ready evidence, integrations, and measurable ROI.",
};

export default function DemoLibraryPage() {
  return (
    <main>
      <DemoLibrarySection />
      <ExecutiveOverviewSection />
      <DemoFinderSection />
      <RoleBasedPlaylistsSection />
      <ProofInEveryDemoSection />
      <BuyingCommitteeSharingSection />
      <BookLiveDemoSection />
      <DemoLibraryFAQSection />
      <ProveItCallToActionSection />
    </main>
  );
}
