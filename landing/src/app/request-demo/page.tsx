import type { Metadata } from "next";

import {
  RequestDemoHero,
  RequestDemoNext,
  RequestDemoFAQ,
} from "@/components/demo/demo";

export const metadata: Metadata = {
  title: "Request Demo | ZoikoVertex Agentic Marketing OS",
  description:
    "Request a demo of ZoikoVertex and see how AI marketing automation, governed workflows, and approvals improve ROI and enterprise campaign performance.",
};

export default function RequestDemoPage() {
  return (
    <main>
      <RequestDemoHero />
      <RequestDemoNext />
      <RequestDemoFAQ />
    </main>
  );
}
