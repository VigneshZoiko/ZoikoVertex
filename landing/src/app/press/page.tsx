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
  title: "Press & Media | ZoikoVertex",
  description:
    "Official media resources, approved company descriptions, brand assets, spokesperson access, and newsroom updates for ZoikoVertex.",
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
