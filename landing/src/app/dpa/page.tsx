import {
  DataProcessingAddendumHero,
  LegalPrepublicationNotice,
  DpaAtAGlance,
  DpaDocumentationLayout,
} from "@/components/dpa";

export default function DpaPage() {
  return (
    <main>
      <DataProcessingAddendumHero />
      <LegalPrepublicationNotice />
      <DpaAtAGlance />
      <DpaDocumentationLayout />
    </main>
  );
}
