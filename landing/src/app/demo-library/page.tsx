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
