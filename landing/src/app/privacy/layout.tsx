import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy & Data Protection | ZoikoVertex",
  description:
    "Read the ZoikoVertex privacy policy to understand data collection, AI-assisted workflows, security measures, user rights & how your information is protected.",
};

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
