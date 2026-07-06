"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";

const PLATFORM_ITEMS = [
  { label: "Overview", desc: "Platform architecture\nand capabilities", href: "/platform" },
  { label: "Architecture", desc: "Governed execution\ninfrastructure layers", href: "/platform#architecture" },
  { label: "Command Center", desc: "Executive performance\ndashboard", href: "/platform#command-center" },
  { label: "AI Workflow\nOrchestration", desc: "Cross-channel\nexecution control", href: "/platform#ai-workflow" },
  { label: "Audit Engine", desc: "Immutable decision\nledger", href: "/platform#audit-engine" },
  { label: "Integrations", desc: "Connect your existing\nstack", href: "/platform#integrations" },
  { label: "Platform Security", desc: "SOC 2, ISO 27001, zero-\ntrust", href: "/platform#security" },
];

const SOLUTION_ITEMS = [
  { label: "Overview", desc: "All solutions\nat a glance", href: "/solution" },
  { label: "Enterprise\nGovernance", desc: "Controlled AI\nfor large teams", href: "/solution#governance" },
  { label: "Brand\nCompliance", desc: "Policy-bound\ncontent execution", href: "/solution#brand" },
  { label: "Agency\nWorkflows", desc: "Multi-client\nisolation & control", href: "/solution#agency" },
  { label: "Regulated\nIndustries", desc: "Audit-ready\nfor finance & legal", href: "/solution#regulated" },
  { label: "Marketing\nOps Teams", desc: "Approval gates\nand evidence trails", href: "/solution#marketing-ops" },
  { label: "B2B SaaS", desc: "Governed marketing\nfor SaaS teams", href: "/b2b-saas" },
  { label: "Agencies &\nMulti-Brand Teams", desc: "Client-isolated\napproval workflows", href: "/agencies" },
];

const NAV_ITEMS = [
  { label: "Platform", hasDropdown: true, href: "/platform" },
  { label: "AI Agents", hasDropdown: false, href: "/ai-agents" },
  { label: "Solutions", hasDropdown: true, href: "/solution" },
  { label: "Resources", hasDropdown: false, href: "/resources-hub" },
  { label: "About Us", hasDropdown: false, href: "/about" },
  { label: "Pricing", hasDropdown: false, href: "/pricing" },
];

function IconBox({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ width: 30, height: 30, borderRadius: 7, background: "rgba(32,231,242,0.08)", border: "1px solid rgba(32,231,242,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      {children}
    </div>
  );
}

function PlaceholderIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="1.75" y="1.75" width="4.08" height="4.08" rx="1" fill="rgba(32,231,242,0.6)" />
      <rect x="8.17" y="1.75" width="4.08" height="4.08" rx="1" fill="rgba(32,231,242,0.6)" />
      <rect x="8.17" y="8.17" width="4.08" height="4.08" rx="1" fill="rgba(32,231,242,0.6)" />
      <rect x="1.75" y="8.17" width="4.08" height="4.08" rx="1" fill="rgba(32,231,242,0.6)" />
    </svg>
  );
}

function DropdownMenu({ items, viewAllLabel, viewAllHref, title }: { items: typeof PLATFORM_ITEMS; viewAllLabel: string; viewAllHref: string; title: string }) {
  return (
    <div style={{ position: "absolute", left: -120, top: 45, width: items.length > 5 ? 680 : 620, background: "#152238", border: "1px solid rgba(32,231,242,0.12)", borderRadius: 14, boxShadow: "0px 0px 0px 1px rgba(32,231,242,0.05), 0px 20px 60px 0px rgba(0,0,0,0.55)", zIndex: 100, overflow: "hidden" }}>
      <div style={{ height: 44, background: "rgba(32,231,242,0.04)", borderBottom: "0.8px solid rgba(32,231,242,0.12)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px" }}>
        <span style={{ fontFamily: "var(--font-jetbrains), 'JetBrains Mono', monospace", fontWeight: 500, fontSize: 10.4, letterSpacing: "12%", textTransform: "uppercase" as const, color: "#20E7F2" }}>{title}</span>
        <Link href={viewAllHref} style={{ fontFamily: "var(--font-jakarta), 'Plus Jakarta Sans', sans-serif", fontWeight: 600, fontSize: 12.5, color: "#20E7F2", textDecoration: "none" }}>
          {viewAllLabel}
        </Link>
      </div>
      <div style={{ padding: "24px 28.8px 28px", display: "grid", gridTemplateColumns: `repeat(${items.length > 5 ? 4 : 3}, 1fr)`, rowGap: 28, columnGap: 16 }}>
        {items.map((item) => (
          <Link key={item.label} href={item.href} style={{ textDecoration: "none" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 10.8 }}>
              <IconBox><PlaceholderIcon /></IconBox>
              <span style={{ fontFamily: "var(--font-jakarta), 'Plus Jakarta Sans', sans-serif", fontWeight: 600, fontSize: 13, lineHeight: "15.6px", color: "#FFFFFF", whiteSpace: "pre-line" }}>{item.label}</span>
              <span style={{ fontFamily: "var(--font-jakarta), 'Plus Jakarta Sans', sans-serif", fontWeight: 300, fontSize: 11.8, lineHeight: "17.17px", color: "#5E7A92", whiteSpace: "pre-line" }}>{item.desc}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function Navbar() {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (mobileOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const fontJakarta = "var(--font-jakarta), 'Plus Jakarta Sans', sans-serif";

  return (
    <nav
      ref={navRef}
      style={{ position: "sticky", top: 0, left: 0, right: 0, zIndex: 50, background: "rgba(4,10,23,0.95)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}
    >
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 20px", height: 68, display: "flex", alignItems: "center", justifyContent: "space-between" }}>

        {/* Logo */}
        <Link href="/" style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
          <Image src="/images/logos/logo-wordmark.svg" alt="ZoikoVertex" width={180} height={28} priority />
        </Link>

        {/* Desktop nav links */}
        <div className="hidden lg:flex" style={{ alignItems: "center", gap: 0 }}>
          {NAV_ITEMS.map((item) => {
            const chevron = (
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ transform: openMenu === item.label ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s", opacity: 0.6 }}>
                <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            );
            const linkStyle = { fontFamily: fontJakarta, fontWeight: 400, fontSize: 13.4, letterSpacing: "0.01em", color: "#A9B8C7", textDecoration: "none", padding: "25.6px 14px", display: "flex", alignItems: "center", gap: 4, height: 68, transition: "color 0.15s" };
            return (
              <div
                key={item.label}
                style={{ position: "relative" }}
                onMouseEnter={() => item.hasDropdown && setOpenMenu(item.label)}
                onMouseLeave={() => item.hasDropdown && setOpenMenu(null)}
              >
                {item.hasDropdown ? (
                  <button
                    onClick={() => setOpenMenu(openMenu === item.label ? null : item.label)}
                    style={{ ...linkStyle, background: "none", border: "none", cursor: "pointer", color: openMenu === item.label ? "#FFFFFF" : "#A9B8C7" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "#FFFFFF")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = openMenu === item.label ? "#FFFFFF" : "#A9B8C7")}
                  >
                    {item.label}{chevron}
                  </button>
                ) : (
                  <Link href={item.href} style={linkStyle} onMouseEnter={(e) => (e.currentTarget.style.color = "#FFFFFF")} onMouseLeave={(e) => (e.currentTarget.style.color = "#A9B8C7")}>
                    {item.label}
                  </Link>
                )}
                {openMenu === item.label && item.label === "Platform" && (
                  <DropdownMenu items={PLATFORM_ITEMS} title="Platform" viewAllLabel="Platform Overview →" viewAllHref="/platform" />
                )}
                {openMenu === item.label && item.label === "Solutions" && (
                  <DropdownMenu items={SOLUTION_ITEMS} title="Solutions" viewAllLabel="View All Solutions →" viewAllHref="/solution" />
                )}
              </div>
            );
          })}
        </div>

        {/* Desktop CTAs */}
        <div className="hidden lg:flex" style={{ alignItems: "center", gap: 20 }}>
          <Link href="https://getzoikovertex.com/login" style={{ fontFamily: fontJakarta, fontWeight: 400, fontSize: 13.4, color: "#A9B8C7", textDecoration: "none", transition: "color 0.15s" }} onMouseEnter={(e) => (e.currentTarget.style.color = "#FFFFFF")} onMouseLeave={(e) => (e.currentTarget.style.color = "#A9B8C7")}>
            Sign in
          </Link>
          <Link href="/request-demo" style={{ fontFamily: fontJakarta, fontWeight: 600, fontSize: 13.4, color: "#FFFFFF", background: "transparent", padding: "9px 22px", borderRadius: 24, border: "1.5px solid rgba(255,255,255,0.3)", textDecoration: "none", whiteSpace: "nowrap" }} onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.6)")} onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)")}>
            Request a Demo
          </Link>
          <Link href="https://getzoikovertex.com/signup" style={{ fontFamily: fontJakarta, fontWeight: 700, fontSize: 13.4, color: "#000000", background: "#20E7F2", padding: "9px 22px", borderRadius: 24, textDecoration: "none", whiteSpace: "nowrap" }} onMouseEnter={(e) => (e.currentTarget.style.background = "#4AECF5")} onMouseLeave={(e) => (e.currentTarget.style.background = "#20E7F2")}>
            Get Started
          </Link>
        </div>

        {/* Mobile: CTA + hamburger */}
        <div className="flex lg:hidden items-center gap-3">
          <Link href="/request-demo" style={{ fontFamily: fontJakarta, fontWeight: 700, fontSize: 13, color: "#000000", background: "#20E7F2", padding: "8px 18px", borderRadius: 24, textDecoration: "none", whiteSpace: "nowrap" }}>
            Request Demo
          </Link>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            style={{ padding: "6px", background: "none", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, cursor: "pointer", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center" }}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            {mobileOpen ? (
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M1 1l16 16M17 1L1 17" stroke="white" strokeWidth="1.8" strokeLinecap="round" /></svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M1 4h16M1 9h16M1 14h16" stroke="white" strokeWidth="1.8" strokeLinecap="round" /></svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden" style={{ background: "#040A17", borderTop: "1px solid rgba(255,255,255,0.08)", padding: "8px 20px 24px", maxHeight: "calc(100vh - 68px)", overflowY: "auto" }}>
          {NAV_ITEMS.map((item, i) => (
            <Link
              key={item.label}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 0", fontFamily: fontJakarta, fontSize: 15, fontWeight: 500, color: "#A9B8C7", textDecoration: "none", borderBottom: i < NAV_ITEMS.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none" }}
            >
              {item.label}
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 7h8M7 3l4 4-4 4" stroke="#A9B8C7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </Link>
          ))}
          <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 10 }}>
            <Link href="https://getzoikovertex.com/login" onClick={() => setMobileOpen(false)} style={{ display: "block", textAlign: "center", padding: "12px 24px", fontFamily: fontJakarta, color: "#A9B8C7", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 24, fontSize: 14, textDecoration: "none" }}>
              Sign in
            </Link>
            <Link href="https://getzoikovertex.com/signup" onClick={() => setMobileOpen(false)} style={{ display: "block", textAlign: "center", padding: "12px 24px", fontFamily: fontJakarta, color: "#000", background: "#20E7F2", borderRadius: 24, fontSize: 14, fontWeight: 700, textDecoration: "none" }}>
              Get Started
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
