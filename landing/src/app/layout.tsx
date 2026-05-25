import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "ZoikoVertex | Governed Agentic Marketing OS",
  description:
    "Run marketing with financial control. AI agent workflows, approval controls, ROI evidence, and audit-ready governance for enterprise teams.",
  keywords: [
    "AI Governance",
    "Agentic Marketing",
    "Enterprise AI",
    "Social Media Automation",
    "Brand Integrity",
    "Marketing OS",
  ],
  authors: [{ name: "Zoiko Group" }],
  metadataBase: new URL("https://zoikovertex.com"),
  openGraph: {
    title: "ZoikoVertex | Governed Agentic Marketing OS",
    description:
      "Run marketing with financial control. AI agent workflows, approval controls, ROI evidence, and audit-ready governance.",
    url: "https://zoikovertex.com",
    siteName: "ZoikoVertex",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ZoikoVertex | Governed Agentic Marketing OS",
    description:
      "Run marketing with financial control. AI agent workflows, approval controls, ROI evidence, and audit-ready governance.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark ${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
