import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Bricolage_Grotesque, JetBrains_Mono } from "next/font/google";
import { Providers } from "./providers";
import CacheBuster from "@/components/CacheBuster";
import Navbar from "@/components/Navbar";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["200", "300", "400", "500", "600", "700", "800"],
  style: ["normal", "italic"],
  display: "swap",
});

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  weight: ["200", "300", "400", "500", "600", "700", "800"],
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
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
    <html lang="en" className={`dark ${jakarta.variable} ${bricolage.variable} ${jetbrains.variable}`} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Providers>
          <CacheBuster />
          <Navbar />
          <div className="pt-[68px] min-h-[calc(100vh-68px)]">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}