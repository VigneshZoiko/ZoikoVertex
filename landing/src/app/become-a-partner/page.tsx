import BecomePartnerApp from "@/components/BecomePartner/BecomePartnerApp";

export const metadata = {
  title: "Become a Partner | ZoikoVertex",
  description:
    "Apply to the ZoikoVertex partner programme. A four-step application covering company and contact details, partner type and market focus, capability and technical fit, and commercial intent.",
  alternates: {
    canonical: "https://www.zoikovertex.com/become-a-partner",
  },
};

export default function BecomeAPartnerPage() {
  return (
    <main className="bg-slate-100">
      <BecomePartnerApp />
    </main>
  );
}
