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
