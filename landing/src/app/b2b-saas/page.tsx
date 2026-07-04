import B2BSaaSHero from "@/components/B2BSaaS/B2BSaaSHero";
import B2BSaaSChallenges from "@/components/B2BSaaS/B2BSaaSChallenges";
import B2BSaaSFeatures from "@/components/B2BSaaS/B2BSaaSFeatures";
import B2BSaaSCapabilities from "@/components/B2BSaaS/B2BSaaSCapabilities";
import B2BSaaSProcess from "@/components/B2BSaaS/B2BSaaSProcess";
import B2BSaaSTestimonial from "@/components/B2BSaaS/B2BSaaSTestimonial";
import B2BSaaSTrustDocs from "@/components/B2BSaaS/B2BSaaSTrustDocs";
import B2BSaaSFinalCTA from "@/components/B2BSaaS/B2BSaaSFinalCTA";

export const metadata = {
  title: "B2B SaaS Marketing Governance | ZoikoVertex",
  description:
    "Govern product claims, security messaging, competitive positioning, and customer proof — with approval workflows, brand controls, and evidence records built for enterprise procurement scrutiny.",
};

export default function B2BSaaSPage() {
  return (
    <main className="bg-[#080d1a]">
      <B2BSaaSHero />
      <B2BSaaSChallenges />
      <B2BSaaSFeatures />
      <B2BSaaSCapabilities />
      <B2BSaaSProcess />
      <B2BSaaSTestimonial />
      <B2BSaaSTrustDocs />
      <B2BSaaSFinalCTA />
    </main>
  );
}
