import type { Metadata } from "next";
import ZoikoGroupHero from "@/components/ZoikoGroup/ZoikoGroupHero";
import ZoikoGroupPlatforms from "@/components/ZoikoGroup/ZoikoGroupPlatforms";
import ZoikoGroupPhilosophy from "@/components/ZoikoGroup/ZoikoGroupPhilosophy";
import ZoikoGroupPrinciples from "@/components/ZoikoGroup/ZoikoGroupPrinciples";
import ZoikoGroupCTA from "@/components/ZoikoGroup/ZoikoGroupCTA";

export const metadata: Metadata = {
  title: "About Zoiko Group | Enterprise Platform Innovation",
  description:
    "Learn about Zoiko Group technology ecosystem, creating AI-powered platforms for enterprises across communications, operations, workforce, and automation.",
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
