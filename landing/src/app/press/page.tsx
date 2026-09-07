import PressHero from "@/components/Press/PressHero";
import PressDescriptions from "@/components/Press/PressDescriptions";
import PressReleases from "@/components/Press/PressReleases";
import PressMediaKit from "@/components/Press/PressMediaKit";
import PressMessaging from "@/components/Press/PressMessaging";
import PressSpokesperson from "@/components/Press/PressSpokesperson";
import PressTopics from "@/components/Press/PressTopics";
import PressSnapshot from "@/components/Press/PressSnapshot";
import PressRequestForm from "@/components/Press/PressRequestForm";
import PressFAQ from "@/components/Press/PressFAQ";
import PressRelatedPages from "@/components/Press/PressRelatedPages";
import PressFinalCTA from "@/components/Press/PressFinalCTA";
import PressMiniFooter from "@/components/Press/PressMiniFooter";

export const metadata = {
  title: "Latest Press Releases & News | Zoiko Vertex",
  description:
    "Discover the latest Zoiko Vertex press releases, company news, media announcements, and official updates about our innovations, partnerships, and growth.",
};

export default function PressPage() {
  return (
    <main className="bg-[#080D1A]">
      <PressHero />
      <PressDescriptions />
      <PressReleases />
      <PressMediaKit />
      <PressMessaging />
      <PressSpokesperson />
      <PressTopics />
      <PressSnapshot />
      <PressRequestForm />
      <PressFAQ />
      <PressRelatedPages />
      <PressFinalCTA />
      <PressMiniFooter />
    </main>
  );
}
