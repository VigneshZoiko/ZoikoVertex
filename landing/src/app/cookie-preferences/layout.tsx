import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cookie Preferences & Settings | ZoikoVertex",
  description:
    "Manage your ZoikoVertex cookie preferences for essential site functions, analytics, personalization, marketing, and integrations. Change choices anytime.",
};

export default function CookiePreferencesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
