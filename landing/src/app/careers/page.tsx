import type { Metadata } from "next";

import {
  GovernedAgenticHero,
  WhatWeBuildBanner,
  WhoWeHire,
  OperatingPrinciples,
  OpenRoles,
  HiringProcess,
  ResponsibleAiCulture,
  BenefitsAndWorkingModel,
  TalentNetworkPage,
} from "@/components/careers";

export const metadata: Metadata = {
  title: "ZoikoVertex Careers | Build the Future of Governed AI",
  description:
    "Join ZoikoVertex and help build trusted, governed AI for enterprises. Explore open career opportunities and grow with a team shaping the future of AI.",
};

export default function CareersPage() {
  return (
    <main>
      <GovernedAgenticHero />
      <WhatWeBuildBanner />
      <WhoWeHire />
      <OperatingPrinciples />
      <OpenRoles />
      <HiringProcess />
      <ResponsibleAiCulture />
      <BenefitsAndWorkingModel />
      <TalentNetworkPage />
    </main>
  );
}
