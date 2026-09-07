import type { Metadata } from "next";

import {
  ResourcesHero,
  ResourcesEditorPick,
  ResourcesTrustLibrary,
  ResourcesToolkit,
  ResourcesLearningPaths,
} from "@/components/resources/resources";

export const metadata: Metadata = {
  title: "AI Marketing Resources & Insights | ZoikoVertex",
  description:
    "Explore AI marketing resources, expert insights, guides, and tools to build smarter strategies, strengthen governance & drive better results with ZoikoVertex.",
};

export default function ResourcesPage() {
  return (
    <main>
      <ResourcesHero />
      <ResourcesEditorPick />
      <ResourcesTrustLibrary />
      <ResourcesToolkit />
      <ResourcesLearningPaths />
    </main>
  );
}
