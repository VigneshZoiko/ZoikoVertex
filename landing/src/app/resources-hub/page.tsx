import Navbar from "@/components/navbar/Navbar";
import Footer from "@/components/footer/Footer";
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
      <Navbar />
      <ResourcesHero />
      <ResourcesEditorPick />
      <ResourcesTrustLibrary />
      <ResourcesToolkit />
      <ResourcesLearningPaths />
      <Footer />
    </main>
  );
}