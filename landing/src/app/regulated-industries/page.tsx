import type { Metadata } from "next";

import {
  HeroSection,
  FeaturesSection,
  IndustryVerticalsSection,
  WorkflowArchitectureSection,
  RegulatoryFrameworkSection,
  RegulatedIndustryValueSection,
  RegulatedIndustryRolesSection,
  RegulatedIndustriesFaqSection,
  RegulatedIndustriesCtaSection,
} from "@/components/regulated-industries";

export const metadata: Metadata = {
  title: "Regulated AI Workflows & Governance | Zoiko Vertex",
  description:
    "Deploy regulated AI workflows with Zoiko Vertex. Features NIST-aligned compliance, configurable policy engines, and complete regulatory evidence capture.",
};

export default function RegulatedIndustriesPage() {
  return (
    <main>
      <HeroSection />
      <FeaturesSection />
      <IndustryVerticalsSection />
      <WorkflowArchitectureSection />
      <RegulatoryFrameworkSection />
      <RegulatedIndustryValueSection />
      <RegulatedIndustryRolesSection />
      <RegulatedIndustriesFaqSection />
      <RegulatedIndustriesCtaSection />
    </main>
  );
}
