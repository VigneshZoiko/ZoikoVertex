import {
   PriceHero,
   PricingComparison,
   PricingFAQ
  } from "@/components/Pricing/pricing";

export default function Pricing() {
  return (
    <main>
      <div>
        <PriceHero />
        <PricingComparison />
        <PricingFAQ />
      </div>
    </main>
  );
}