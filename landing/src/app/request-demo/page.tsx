import Footer from "@/components/footer/Footer";
import { RequestDemoHero, RequestDemoNext, RequestDemoFAQ } from "@/components/demo/demo";

export default function RequestDemoPage() {
  return (
    <main>
      <RequestDemoHero />
      <RequestDemoNext />
      <RequestDemoFAQ />
      <Footer />
    </main>
  );
}