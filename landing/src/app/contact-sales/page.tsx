import type { Metadata } from "next";

import {
  TalkToSalesSection,
  WhoShouldContactSales,
  WhatToExpectNext,
  HowWeRouteYou,
  ImplementationPathway,
  WhatProcurementAsksFirst,
  BeforeYouSubmitForm,
  MarketingInfrastructureCTA,
} from "@/components/contact-sales";

export const metadata: Metadata = {
  title: "Contact ZoikoVertex Sales | Enterprise AI Solutions",
  description:
    "Contact ZoikoVertex sales to explore governed AI workflows, enterprise deployment, governance, ROI, security, and autonomous marketing solutions.",
};

export default function ContactSalesPage() {
  return (
    <main>
      <TalkToSalesSection />
      <WhoShouldContactSales />
      <WhatToExpectNext />
      <HowWeRouteYou />
      <ImplementationPathway />
      <WhatProcurementAsksFirst />
      <BeforeYouSubmitForm />
      <MarketingInfrastructureCTA />
    </main>
  );
}
