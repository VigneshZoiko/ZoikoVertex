import Navbar from "@/components/navbar/Navbar";
import Footer from "@/components/footer/Footer";
import { RequestDemoHero, RequestDemoNext, RequestDemoFAQ } from "@/components/demo/demo";

export default function RequestDemoPage() {
  return (
    <main>
      <Navbar />
      <RequestDemoHero />
      <RequestDemoNext />
      <RequestDemoFAQ />
      <Footer />
    </main>
  );
}