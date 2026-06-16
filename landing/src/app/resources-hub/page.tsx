import {
  ResourcesHero,
  ResourcesEditorPick,
  ResourcesTrustLibrary,
  ResourcesToolkit,
  ResourcesLearningPaths
 } from "@/components/resources/resources";

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