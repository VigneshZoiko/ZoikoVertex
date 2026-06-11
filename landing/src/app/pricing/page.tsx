import Footer from "@/components/footer/Footer";

import {
   PriceHero,
   PricingComparison,
   PricingFAQ
  } from "@/components/Pricing/pricing";

export default function Pricing() {
  return (
    <main>
      <div className="pt-16">
        <PriceHero />
        <PricingComparison />
        <PricingFAQ />
      </div>
      <Footer />
    </main>
  );
}