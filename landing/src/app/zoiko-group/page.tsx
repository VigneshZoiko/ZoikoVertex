import type { Metadata } from "next";
import ZoikoGroupHero from "@/components/ZoikoGroup/ZoikoGroupHero";
import ZoikoGroupPlatforms from "@/components/ZoikoGroup/ZoikoGroupPlatforms";
import ZoikoGroupPhilosophy from "@/components/ZoikoGroup/ZoikoGroupPhilosophy";
import ZoikoGroupPrinciples from "@/components/ZoikoGroup/ZoikoGroupPrinciples";
import ZoikoGroupCTA from "@/components/ZoikoGroup/ZoikoGroupCTA";

export const metadata: Metadata = {
  title: "About Zoiko Group | ZoikoVertex",
  description:
    "Zoiko Group is a technology-led holding group building category-defining platforms across AI, telecommunications, workforce intelligence, and enterprise operations.",
};

export default function ZoikoGroupPage() {
  return (
    <main className="bg-[#080d1a]">
      <ZoikoGroupHero />
      <ZoikoGroupPlatforms />
      <ZoikoGroupPhilosophy />
      <ZoikoGroupPrinciples />
      <ZoikoGroupCTA />
    </main>
  );
}
