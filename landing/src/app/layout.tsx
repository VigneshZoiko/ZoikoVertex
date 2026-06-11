import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "./providers";
import Script from "next/script";
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
      <head>
        <Script id="meta-pixel" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '1006709255052325');
            fbq('track', 'PageView');
          `}
        </Script>
      </head>
      <body suppressHydrationWarning>
        <noscript>
          <img height="1" width="1" style={{ display: "none" }} src="https://www.facebook.com/tr?id=1006709255052325&ev=PageView&noscript=1" alt="" />
        </noscript>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
