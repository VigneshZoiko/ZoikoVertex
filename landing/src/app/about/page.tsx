import type { Metadata } from "next";

import {
  AboutHero,
  AboutStats,
  AboutGEI,
  AboutTeam,
  AboutModules,
  AboutExecutionChain,
  AboutTrust,
  AboutAudit,
} from "@/components/about/about";

export const metadata: Metadata = {
  title: "About ZoikoVertex | Governed Execution Infrastructure",
  description:
    "Learn about ZoikoVertex, a governed execution infrastructure platform that validates, authorizes, and audits every digital marketing action in real time.",
};

export default function AboutPage() {
  return (
    <main>
      <AboutHero />
      <AboutStats />
      <AboutGEI />
      <AboutTeam />
      <AboutModules />
      <AboutExecutionChain />
      <AboutTrust />
      <AboutAudit />
    </main>
  );
}
