"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const LINK_HREFS: Record<string, string> = {
  "About ZoikoVertex": "/about",
  "About Zoiko Group": "/zoiko-group",
  "Agentic Architecture": "/agentic-architecture",
  "ROI Engine": "/roi-engine",
  Integrations: "/integrations",
  "Executive Command Center": "/executive-command-center",
  "Vision & Mission": "/vision-and-mission",
  "Use Cases": "/use-cases",
  Security: "/security",
  "Demo Library": "/demo-library",
  "Enterprise Retail": "/enterprise-retail",
  "Privacy Policy": "/privacy",
  "Terms of Service": "/terms",
  Leadership: "/leadership",
  "B2B SaaS": "/b2b-saas",
  FinTech: "/fintech",
  "Agencies & Multi-Brand Teams": "/agencies",
  "Platform Overview": "/platform",
  Pricing: "/pricing",
  "ROI & Governance Audit": "/roi-governance-audit",
  "Press & Media": "/press",
  Healthcare: "/healthcare",
  Logistics: "/logistics",
  Telecom: "/telecom",
  "Compliance & Governance": "/governance",
  "Resource Center": "/resources-hub",
  "AI Workflow Orchestration": "/ai-workflow-orchestration",
  "Approval Workflows": "/approval-workflows",
  "Buyer Guides": "/buyer-guides",
  "Product Updates": "/product-updates",
  FAQs: "/faqs",
  "Competitor Benchmark": "/competeter-benchmark",
  Careers: "/careers",
  "Cookie Preferences": "/cookie-preferences",
  "Responsible AI": "/responsible-ai",
  Auditability: "/auditability",
  Support: "/support",
  "Data Processing Addendum": "/dpa",
  "Contact Sales": "/contact-sales",
  Partnerships: "/partnerships",
};

const SOCIAL_LINKS: { name: string; href: string; icon: ReactNode }[] = [
  {
    name: "LinkedIn",
    href: "https://www.linkedin.com/company/zoikovertex",
    icon: (
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    ),
  },
  {
    name: "X",
    href: "https://x.com/ZoikoVertex",
    icon: (
      <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
    ),
  },
  {
    name: "Facebook",
    href: "https://www.facebook.com/ZoikoVertex/",
    icon: (
      <path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z" />
    ),
  },
  {
    name: "Instagram",
    href: "https://www.instagram.com/zoikovertex/",
    icon: (
      <g fill="none" stroke="currentColor" strokeWidth="2.2">
        <rect x="2" y="2" width="20" height="20" rx="5.5" />
        <circle cx="12" cy="12" r="4.5" />
        <circle cx="17.6" cy="6.4" r="0.6" fill="currentColor" />
      </g>
    ),
  },
  {
    name: "YouTube",
    href: "https://www.youtube.com/@ZoikoVertex",
    icon: (
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    ),
  },
  {
    name: "Threads",
    href: "http://threads.com/@zoikovertex",
    icon: (
      <g fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
        <circle cx="12" cy="12" r="4" />
        <path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.9 7.9" />
      </g>
    ),
  },
  {
    name: "Pinterest",
    href: "https://in.pinterest.com/zoikovertex/",
    icon: (
      <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.39 18.592.026 11.985.026L12.017 0z" />
    ),
  },
];

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
              <Image
                src="/images/logos/logo-wordmark.svg"
                alt="ZoikoVertex"
                width={180}
                height={28}
              />
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
              {["Contact Sales", "Support", "Partnerships"].map((l) => {
                const href = LINK_HREFS[l];
                return (
                  <li key={l}>
                    {href ? (
                      <Link
                        href={href}
                        className="text-white/40 text-xs hover:text-white/70 transition-colors"
                      >
                        {l}
                      </Link>
                    ) : (
                      <a
                        href="#"
                        className="text-white/40 text-xs hover:text-white/70 transition-colors"
                      >
                        {l}
                      </a>
                    )}
                  </li>
                );
              })}
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
              167–169 Great Portland Street,
              <br />
              5th Floor, London W1W 5PF, UK
            </p>
          </div>
          <div>
            <p className="text-white/50 text-[10px] font-bold tracking-widest uppercase mb-4">
              Follow Us
            </p>
            <div className="flex flex-wrap gap-2">
              {SOCIAL_LINKS.map((s) => (
                <a
                  key={s.name}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`ZoikoVertex on ${s.name}`}
                  className="w-8 h-8 rounded-full flex items-center justify-center border border-white/10 text-white/50 hover:text-[#00c8f0] hover:border-[#00c8f0]/60 transition-colors"
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="14"
                    height="14"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    {s.icon}
                  </svg>
                </a>
              ))}
            </div>
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
              <Link
                key={l}
                href={LINK_HREFS[l] ?? "#"}
                className="hover:text-white/50 transition-colors"
              >
                {l}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
