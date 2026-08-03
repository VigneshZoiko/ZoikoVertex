import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cookie Preferences | ZoikoVertex",
  description:
    "Control how ZoikoVertex uses cookies and similar technologies for essential site operation, analytics, personalization, marketing, and integrations. Manage consent, review vendor categories, and exercise Do Not Sell or Share rights.",
  alternates: {
    canonical: "https://www.zoikovertex.com/cookie-preferences",
  },
};

export default function CookiePreferencesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
