"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";

const LANDING = "https://zoikovertex.com";

const PLATFORM_ITEMS = [
  { label: "Overview", desc: "Platform architecture\nand capabilities", href: `${LANDING}/platform` },
  { label: "Architecture", desc: "Governed execution\ninfrastructure layers", href: `${LANDING}/platform#architecture` },
  { label: "Command Center", desc: "Executive performance\ndashboard", href: `${LANDING}/platform#command-center` },
  { label: "AI Workflow\nOrchestration", desc: "Cross-channel\nexecution control", href: `${LANDING}/platform#ai-workflow` },
  { label: "Audit Engine", desc: "Immutable decision\nledger", href: `${LANDING}/platform#audit-engine` },
  { label: "Integrations", desc: "Connect your existing\nstack", href: `${LANDING}/platform#integrations` },
  { label: "Platform Security", desc: "SOC 2, ISO 27001, zero-\ntrust", href: `${LANDING}/platform#security` },
];

const SOLUTION_ITEMS = [
  { label: "Overview", desc: "All solutions\nat a glance", href: `${LANDING}/solution` },
  { label: "Enterprise\nGovernance", desc: "Controlled AI\nfor large teams", href: `${LANDING}/solution#governance` },
  { label: "Brand\nCompliance", desc: "Policy-bound\ncontent execution", href: `${LANDING}/solution#brand` },
  { label: "Agency\nWorkflows", desc: "Multi-client\nisolation & control", href: `${LANDING}/solution#agency` },
  { label: "Regulated\nIndustries", desc: "Audit-ready\nfor finance & legal", href: `${LANDING}/solution#regulated` },
  { label: "Marketing\nOps Teams", desc: "Approval gates\nand evidence trails", href: `${LANDING}/solution#marketing-ops` },
];

const NAV_ITEMS = [
  { label: "Platform", hasDropdown: true, href: `${LANDING}/platform` },
  { label: "AI Agents", hasDropdown: false, href: `${LANDING}/ai-agents` },
  { label: "Solutions", hasDropdown: true, href: `${LANDING}/solution` },
  { label: "Resources", hasDropdown: false, href: `${LANDING}/resources-hub` },
  { label: "About Us", hasDropdown: false, href: `${LANDING}/about` },
  { label: "Pricing", hasDropdown: false, href: `${LANDING}/pricing` },
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
        <Link href={viewAllHref} style={{ fontFamily: "var(--font-jakarta), 'Plus Jakarta Sans', sans-serif", fontWeight: 600, fontSize: 12.5, color: "#20E7F2", display: "flex", alignItems: "center", gap: 4, textDecoration: "none" }}>
          {viewAllLabel}
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M2.29 5.5h6.42M6.42 2.29l3.21 3.21-3.21 3.21" stroke="#20E7F2" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
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

  return (
    <nav
      ref={navRef}
      style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 50, background: "rgba(21,34,56,0.9)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}
    >
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px", height: 68, display: "flex", alignItems: "center", justifyContent: "space-between" }}>

        {/* Logo */}
        <Link href={LANDING} style={{ display: "flex", alignItems: "center" }}>
          <Image src="/images/logo-wordmark.svg" alt="ZoikoVertex" width={235} height={36} priority />
        </Link>

        {/* Nav links */}
        <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
          {NAV_ITEMS.map((item) => (
            <div key={item.label} style={{ position: "relative" }}>
              {item.hasDropdown ? (
                <button
                  onClick={() => setOpenMenu(openMenu === item.label ? null : item.label)}
                  style={{ fontFamily: "var(--font-jakarta), 'Plus Jakarta Sans', sans-serif", fontWeight: 400, fontSize: 13.4, letterSpacing: "0.01em", color: openMenu === item.label ? "#FFFFFF" : "#A9B8C7", background: "none", border: "none", cursor: "pointer", padding: "25.6px 14px", display: "flex", alignItems: "center", gap: 4, transition: "color 0.15s", height: 68 }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#FFFFFF")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = openMenu === item.label ? "#FFFFFF" : "#A9B8C7")}
                >
                  {item.label}
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ transform: openMenu === item.label ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s", opacity: 0.6 }}>
                    <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              ) : (
                <Link
                  href={item.href}
                  style={{ fontFamily: "var(--font-jakarta), 'Plus Jakarta Sans', sans-serif", fontWeight: 400, fontSize: 13.4, letterSpacing: "0.01em", color: "#A9B8C7", textDecoration: "none", padding: "25.6px 14px", display: "flex", alignItems: "center", height: 68, transition: "color 0.15s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#FFFFFF")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#A9B8C7")}
                >
                  {item.label}
                </Link>
              )}

              {item.label === "Platform" && openMenu === "Platform" && (
                <DropdownMenu items={PLATFORM_ITEMS} title="Platform" viewAllLabel="View Platform →" viewAllHref={`${LANDING}/platform`} />
              )}
              {item.label === "Solutions" && openMenu === "Solutions" && (
                <DropdownMenu items={SOLUTION_ITEMS} title="Solutions" viewAllLabel="View All Solutions →" viewAllHref={`${LANDING}/solution`} />
              )}
            </div>
          ))}
        </div>

        {/* CTA buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <Link
            href="/login"
            style={{ fontFamily: "var(--font-jakarta), 'Plus Jakarta Sans', sans-serif", fontWeight: 400, fontSize: 13.4, letterSpacing: "0.01em", color: "#A9B8C7", textDecoration: "none", transition: "color 0.15s" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#FFFFFF")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#A9B8C7")}
          >
            Sign in
          </Link>
          <Link
            href={`${LANDING}/request-demo`}
            style={{ fontFamily: "var(--font-jakarta), 'Plus Jakarta Sans', sans-serif", fontWeight: 600, fontSize: 13.4, color: "#FFFFFF", background: "transparent", padding: "9px 22px", borderRadius: 24, border: "1.5px solid rgba(255,255,255,0.3)", textDecoration: "none", transition: "border-color 0.15s", whiteSpace: "nowrap" }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.6)")}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)")}
          >
            Request a Demo
          </Link>
          <Link
            href="/signup"
            style={{ fontFamily: "var(--font-jakarta), 'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 13.4, color: "#000000", background: "#20E7F2", padding: "9px 22px", borderRadius: 24, textDecoration: "none", transition: "background 0.15s", whiteSpace: "nowrap" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#4AECF5")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#20E7F2")}
          >
            Get Started
          </Link>
        </div>
      </div>
    </nav>
  );
}
