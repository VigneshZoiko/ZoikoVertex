import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | ZoikoVertex",
  description:
    "Privacy Policy for ZoikoVertex — Governed Agentic Marketing OS. How we collect, use, share, and protect personal information under GDPR, CCPA, and global data protection law.",
  alternates: {
    canonical: "https://www.zoikovertex.com/privacy",
  },
};

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
