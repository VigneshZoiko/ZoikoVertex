import type { Metadata } from "next";

import {
  ProductUpdatesHeroSection,
  FeaturedUpdatesSection,
  UpdateFeedSection,
  TrustCriticalImprovementsSection,
  RoadmapTransparencySection,
  AdminActionRequiredSection,
  ProductUpdatesCtaSection,
  ProductUpdatesFaqSection,
} from "@/components/product-updates";

export const metadata: Metadata = {
  title: "AI Product Updates, Features & Releases | ZoikoVertex",
  description:
    "Stay updated with ZoikoVertex product releases, new AI features, integrations, security updates, and platform improvements designed for smarter workflows.",
};

export default function ProductUpdatePage() {
  return (
    <main>
      <ProductUpdatesHeroSection />
      <FeaturedUpdatesSection />
      <UpdateFeedSection />
      <TrustCriticalImprovementsSection />
      <RoadmapTransparencySection />
      <AdminActionRequiredSection />
      <ProductUpdatesFaqSection />
      <ProductUpdatesCtaSection />
    </main>
  );
}
