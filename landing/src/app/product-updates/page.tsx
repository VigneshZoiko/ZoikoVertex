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
