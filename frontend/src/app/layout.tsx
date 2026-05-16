import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "./providers";
import CacheBuster from "@/components/CacheBuster";
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
  title: "ZoikoVertex | Enterprise Agentic Governance",
  description: "The world's first Governed Autonomous Intelligence network. Sovereign evidence, predictive risk management, and scaleable execution.",
  keywords: ["AI Governance", "Autonomous Agents", "Enterprise AI", "Social Media Automation", "Brand Integrity"],
  authors: [{ name: "Zoiko Group" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark ${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Providers>
          <CacheBuster />
          {children}
        </Providers>
      </body>
    </html>
  );
}
