"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

const LINK_HREFS: Record<string, string> = {
  "About ZoikoVertex": "/about",
  "About Zoiko Group": "/zoiko-group",
  "Agentic Architecture": "/agentic-architecture",
  "ROI Engine":"/roi-engine",
  "Integrations":"/integrations",
  "Executive Command Center":"/executive-command-center",
  "Vision & Mission": "/vision-and-mission",
  "Use Cases":"/use-cases",
  "Security": "/security",
  "Demo Library":"/demo-library",
  "Enterprise Retail":"/enterprise-retail",
  "Privacy Policy": "/privacy",
  "Terms of Service": "/terms",
  "Leadership": "/leadership",
  "B2B SaaS": "/b2b-saas",
  "FinTech": "/fintech",
  "Agencies & Multi-Brand Teams": "/agencies",
  "Platform Overview": "/platform",
  "Pricing": "/pricing",
  "ROI & Governance Audit":"/roi-governance-audit",
  "Press & Media": "/press",
  "Healthcare": "/healthcare",
  "Logistics": "/logistics",
  "Telecom": "/telecom",
  "Compliance & Governance": "/governance",
  "Resource Center": "/resources-hub",
  "AI Workflow Orchestration": "/ai-workflow-orchestration",
  "Approval Workflows": "/approval-workflows",
  "Buyer Guides":"/buyer-guides",
  "Product Updates":"/product-updates",
  "FAQs":"/faqs",
  "Competitor Benchmark":"/competeter-benchmark",
  "Careers":"/careers",
  "Cookie Preferences": "/cookie-preferences",
  "Responsible AI": "/responsible-ai",
  "Auditability": "/auditability",
};

export default function Footer() {
  const pathname = usePathname();
  if (pathname === "/press") return null;

  const cols = [
    {
      heading: "Product",
      links: [
        "Platform Overview",
        "Agentic Architecture",
        "Executive Command Center",
        "AI Workflow Orchestration",
        "Approval Workflows",
        "ROI Engine",
        "Integrations",
      ],
    },
    {
      heading: "Solutions",
      links: [
        "Enterprise Retail",
        "FinTech",
        "Healthcare",
        "B2B SaaS",
        "Logistics",
        "Telecom",
        "Agencies & Multi-Brand Teams",
      ],
    },
    {
      heading: "Resources",
      links: [
        "Resource Center",
        "Use Cases",
        "Demo Library",
        "ROI & Governance Audit",
        "Buyer Guides",
        "Product Updates",
        "FAQs",
      ],
    },
    {
      heading: "Company",
      links: [
        "About ZoikoVertex",
        "About Zoiko Group",
        "Leadership",
        "Vision & Mission",
        "Press & Media",
        "Competitor Benchmark",
        "Careers",
      ],
    },
    {
      heading: "Trust & Legal",
      links: [
        "Security",
        "Privacy Policy",
        "Terms of Service",
        "Cookie Preferences",
        "Compliance & Governance",
        "Responsible AI",
        "Auditability",
        "Data Processing Addendum",
      ],
    },
  ];

  const badges = [
    "SOC 2 TYPE II",
    "ISO 27001",
    "GDPR",
    "RESPONSIBLE AI",
    "AUDIT-READY",
  ];

  return (
    <footer style={{ background: "#061B2C" }} className="px-6 pt-16 pb-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid sm:grid-cols-2 lg:grid-cols-6 gap-6 lg:gap-10 pb-14 border-b border-white/5">
          <div className="lg:col-span-1">
            <div className="flex items-center mb-4">
              <Image src="/images/logos/logo-wordmark.svg" alt="ZoikoVertex" width={180} height={28} />
            </div>
            <p className="text-white/40 text-xs leading-relaxed mb-6">
              <span className="text-white/70 font-semibold">
                The governed autonomous digital marketing operating system
              </span>{" "}
              where marketing becomes measurable infrastructure.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {badges.map((b) => (
                <span
                  key={b}
                  className="text-[8px] font-bold tracking-widest text-white/30 px-2 py-1 rounded-full"
                  style={{ border: "1px solid rgba(255,255,255,0.1)" }}
                >
                  • {b}
                </span>
              ))}
            </div>
          </div>
          {cols.map((col) => (
            <div key={col.heading}>
              <p className="text-white text-[10px] font-black tracking-widest uppercase mb-4">
                {col.heading}
              </p>
              <ul className="space-y-2.5">
                {col.links.map((l) => (
                  <li key={l}>
                    <Link
                      href={LINK_HREFS[l] ?? "#"}
                      className="text-white/70 text-xs font-medium hover:text-white transition-colors"
                    >
                      {l}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-10 py-10 border-b border-white/5">
          <div>
            <p className="text-white/50 text-[10px] font-bold tracking-widest uppercase mb-4">
              Contact & Locations
            </p>
            <ul className="space-y-2.5">
              {["Contact Sales", "Support", "Partnerships"].map((l) => (
                <li key={l}>
                  <a
                    href="#"
                    className="text-white/40 text-xs hover:text-white/70 transition-colors"
                  >
                    {l}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p
              className="text-[9px] font-bold tracking-widest uppercase mb-3 flex items-center gap-1.5"
              style={{ color: "#00c8f0" }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />{" "}
              Headquarters
            </p>
            <p className="text-white/40 text-xs leading-relaxed">
              1401 21st Street, Suite R,
              <br />
              Sacramento, CA 95811, USA
            </p>
          </div>
          <div>
            <p
              className="text-[9px] font-bold tracking-widest uppercase mb-3 flex items-center gap-1.5"
              style={{ color: "#00c8f0" }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" /> EU
              Headquarters
            </p>
            <p className="text-white/40 text-xs leading-relaxed">
              67–69 Great Portland Street,
              <br />
              5th Floor, London W1W 5PF, UK
            </p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-8 text-white/20 text-xs">
          <p>
            2026 ZoikoVertex | All rights reserved | ZoikoVertex is a platform
            operated by Zoiko Tech Inc.
          </p>
          <div className="flex flex-wrap gap-4">
            {[
              "Privacy Policy",
              "Terms of Service",
              "Cookie Preferences",
              "Security",
            ].map((l) => (
              <a
                key={l}
                href="#"
                className="hover:text-white/50 transition-colors"
              >
                {l}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
