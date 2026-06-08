import Navbar from "@/components/navbar/Navbar";
import Footer from "@/components/footer/Footer";

import {
   PriceHero,
   PricingComparison,
   PricingFAQ
  } from "@/components/Pricing/pricing";

export default function Pricing() {
  return (
    <main>
      <Navbar />
      <div className="pt-16">
        <PriceHero />
        <PricingComparison />
        <PricingFAQ />
      </div>
      <Footer />
    </main>
  );
}