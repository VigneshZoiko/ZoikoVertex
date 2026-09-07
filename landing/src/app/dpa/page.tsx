import type { Metadata } from "next";

import {
  DataProcessingAddendumHero,
  LegalPrepublicationNotice,
  DpaAtAGlance,
  DpaDocumentationLayout,
} from "@/components/dpa";

export const metadata = {
  title: "Data Processing Addendum for AI Workflows | ZoikoVertex",
  description:
    "Review ZoikoVertex Data Processing Addendum covering customer data, subprocessors, security, international transfers, deletion, audits, and privacy rights.",
};

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
