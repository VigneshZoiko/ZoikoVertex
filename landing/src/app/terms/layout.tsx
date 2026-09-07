import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service and Usage Policy | ZoikoVertex",
  description:
    "Learn ZoikoVertex terms of service to understand platform usage rules, user responsibilities, legal agreements, service conditions, and important policies.",
};

export default function TermsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
