"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";

/* ── Figma-exact: 243-5165 Platform mega menu ─────────────────────────────── */
const PLATFORM_ITEMS = [
  {
    label: "Overview",
    desc: "Platform architecture\nand capabilities",
    href: "/platform",
  },
  {
    label: "Architecture",
    desc: "Governed execution\ninfrastructure layers",
    href: "/platform#architecture",
  },
  {
    label: "Command Center",
    desc: "Executive performance\ndashboard",
    href: "/platform#command-center",
  },
  {
    label: "AI Workflow\nOrchestration",
    desc: "Cross-channel\nexecution control",
    href: "/platform#ai-workflow",
  },
  {
    label: "Audit Engine",
    desc: "Immutable decision\nledger",
    href: "/platform#audit-engine",
  },
  {
    label: "Integrations",
    desc: "Connect your existing\nstack",
    href: "/platform#integrations",
  },
  {
    label: "Platform Security",
    desc: "SOC 2, ISO 27001, zero-\ntrust",
    href: "/platform#security",
  },
];

/* Figma icon box: 30×30px, bg rgba(32,231,242,0.08), border rgba(32,231,242,0.15), radius 7px */
function IconBox({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        width: 30,
        height: 30,
        borderRadius: 7,
        background: "rgba(32,231,242,0.08)",
        border: "1px solid rgba(32,231,242,0.15)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      {children}
    </div>
  );
}

/* Generic placeholder icon — replace with actual SVGs once rate limit resets */
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

/* ── Platform mega dropdown — exact Figma 243-5165 ───────────────────────── */
function PlatformMenu() {
  return (
    <div
      style={{
        position: "absolute",
        /* Figma: x=-120 relative to nav item, y=63 (below nav bar) */
        left: -120,
        top: 45,
        width: 680,
        background: "#152238",
        border: "1px solid rgba(32,231,242,0.12)",
        borderRadius: 14,
        boxShadow:
          "0px 0px 0px 1px rgba(32,231,242,0.05), 0px 20px 60px 0px rgba(0,0,0,0.55)",
        zIndex: 100,
        overflow: "hidden",
      }}
    >
      {/* Drop header — Figma: 678.4×44px, bg rgba(32,231,242,0.04), border-bottom */}
      <div
        style={{
          height: 44,
          background: "rgba(32,231,242,0.04)",
          borderBottom: "0.8px solid rgba(32,231,242,0.12)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 20px",
        }}
      >
        {/* "PLATFORM" label — JetBrains Mono Medium 10.4px, letter-spacing 12%, uppercase, #20E7F2 */}
        <span
          style={{
            fontFamily: "var(--font-jetbrains), 'JetBrains Mono', monospace",
            fontWeight: 500,
            fontSize: 10.4,
            letterSpacing: "12%",
            textTransform: "uppercase",
            color: "#20E7F2",
          }}
        >
          Platform
        </span>
        {/* "View Platform →" — Plus Jakarta Sans SemiBold 12.5px */}
        <Link
          href="/platform"
          style={{
            fontFamily: "var(--font-jakarta), 'Plus Jakarta Sans', sans-serif",
            fontWeight: 600,
            fontSize: 12.5,
            color: "#20E7F2",
            display: "flex",
            alignItems: "center",
            gap: 4,
            textDecoration: "none",
          }}
        >
          View Platform
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
            <path d="M2.29 5.5h6.42M6.42 2.29l3.21 3.21-3.21 3.21" stroke="#20E7F2" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      </div>

      {/* Grid body — 4-col top row, 3-col bottom row */}
      {/* Figma x positions: 28.8 / 191.4 / 354 / 516.6 ≈ gaps of ~162.6px */}
      <div
        style={{
          padding: "24px 28.8px 28px",
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          rowGap: 28,
          columnGap: 16,
        }}
      >
        {PLATFORM_ITEMS.map((item, i) => (
          <Link
            key={item.label}
            href={item.href}
            style={{ textDecoration: "none" }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10.8,
              }}
            >
              <IconBox>
                <PlaceholderIcon />
              </IconBox>
              {/* Title — Plus Jakarta Sans SemiBold 13px, line-height 15.6px, #FFF */}
              <span
                style={{
                  fontFamily: "var(--font-jakarta), 'Plus Jakarta Sans', sans-serif",
                  fontWeight: 600,
                  fontSize: 13,
                  lineHeight: "15.6px",
                  color: "#FFFFFF",
                  whiteSpace: "pre-line",
                }}
              >
                {item.label}
              </span>
              {/* Desc — Plus Jakarta Sans Light 11.8px, line-height 17.17px, #5E7A92 */}
              <span
                style={{
                  fontFamily: "var(--font-jakarta), 'Plus Jakarta Sans', sans-serif",
                  fontWeight: 300,
                  fontSize: 11.8,
                  lineHeight: "17.17px",
                  color: "#5E7A92",
                  whiteSpace: "pre-line",
                }}
              >
                {item.desc}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

const SOLUTION_ITEMS = [
  { label: "Overview", desc: "All solutions\nat a glance", href: "/solution" },
  { label: "Enterprise\nGovernance", desc: "Controlled AI\nfor large teams", href: "/solution#governance" },
  { label: "Brand\nCompliance", desc: "Policy-bound\ncontent execution", href: "/solution#brand" },
  { label: "Agency\nWorkflows", desc: "Multi-client\nisolation & control", href: "/solution#agency" },
  { label: "Regulated\nIndustries", desc: "Audit-ready\nfor finance & legal", href: "/solution#regulated" },
  { label: "Marketing\nOps Teams", desc: "Approval gates\nand evidence trails", href: "/solution#marketing-ops" },
];

function SolutionsMenu() {
  return (
    <div
      style={{
        position: "absolute",
        left: -120,
        top: 45,
        width: 620,
        background: "#152238",
        border: "1px solid rgba(32,231,242,0.12)",
        borderRadius: 14,
        boxShadow: "0px 0px 0px 1px rgba(32,231,242,0.05), 0px 20px 60px 0px rgba(0,0,0,0.55)",
        zIndex: 100,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          height: 44,
          background: "rgba(32,231,242,0.04)",
          borderBottom: "0.8px solid rgba(32,231,242,0.12)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 20px",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-jetbrains), 'JetBrains Mono', monospace",
            fontWeight: 500,
            fontSize: 10.4,
            letterSpacing: "12%",
            textTransform: "uppercase",
            color: "#20E7F2",
          }}
        >
          Solutions
        </span>
        <Link
          href="/solution"
          style={{
            fontFamily: "var(--font-jakarta), 'Plus Jakarta Sans', sans-serif",
            fontWeight: 600,
            fontSize: 12.5,
            color: "#20E7F2",
            display: "flex",
            alignItems: "center",
            gap: 4,
            textDecoration: "none",
          }}
        >
          View All Solutions
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
            <path d="M2.29 5.5h6.42M6.42 2.29l3.21 3.21-3.21 3.21" stroke="#20E7F2" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      </div>
      <div
        style={{
          padding: "24px 28.8px 28px",
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          rowGap: 28,
          columnGap: 16,
        }}
      >
        {SOLUTION_ITEMS.map((item) => (
          <Link key={item.label} href={item.href} style={{ textDecoration: "none" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 10.8 }}>
              <IconBox><PlaceholderIcon /></IconBox>
              <span
                style={{
                  fontFamily: "var(--font-jakarta), 'Plus Jakarta Sans', sans-serif",
                  fontWeight: 600,
                  fontSize: 13,
                  lineHeight: "15.6px",
                  color: "#FFFFFF",
                  whiteSpace: "pre-line",
                }}
              >
                {item.label}
              </span>
              <span
                style={{
                  fontFamily: "var(--font-jakarta), 'Plus Jakarta Sans', sans-serif",
                  fontWeight: 300,
                  fontSize: 11.8,
                  lineHeight: "17.17px",
                  color: "#5E7A92",
                  whiteSpace: "pre-line",
                }}
              >
                {item.desc}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

const NAV_ITEMS = [
  { label: "Platform", hasDropdown: true, href: "/platform" },
  { label: "AI Agents", hasDropdown: false, href: "/ai-agents" },
  { label: "Solutions", hasDropdown: true, href: "/solution" },
  { label: "Resources", hasDropdown: false, href: "/resources-hub" },
  { label: "About Us", hasDropdown: false, href: "/about" },
  { label: "Pricing", hasDropdown: false, href: "/pricing" },
];

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
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        background: "rgba(21,34,56,0.9)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: "0 24px",
          height: 68,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Logo — Figma: 235×36px */}
        <Link href="/" style={{ display: "flex", alignItems: "center" }}>
          <Image
            src="/images/logo-wordmark.svg"
            alt="ZoikoVertex"
            width={235}
            height={36}
            priority
          />
        </Link>

        {/* Nav links — Figma: Plus Jakarta Sans Regular 13.4px, letter-spacing 1%, #A9B8C7 */}
        <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
          {NAV_ITEMS.map((item) => (
            <div key={item.label} style={{ position: "relative" }}>
              {item.hasDropdown ? (
                <button
                  onClick={() =>
                    setOpenMenu(openMenu === item.label ? null : item.label)
                  }
                  style={{
                    fontFamily: "var(--font-jakarta), 'Plus Jakarta Sans', sans-serif",
                    fontWeight: 400,
                    fontSize: 13.4,
                    letterSpacing: "0.01em",
                    color: openMenu === item.label ? "#FFFFFF" : "#A9B8C7",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "25.6px 14px",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    transition: "color 0.15s",
                    height: 68,
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.color = "#FFFFFF")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.color =
                      openMenu === item.label ? "#FFFFFF" : "#A9B8C7")
                  }
                >
                  {item.label}
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 10 10"
                    fill="none"
                    style={{
                      transform:
                        openMenu === item.label
                          ? "rotate(180deg)"
                          : "rotate(0deg)",
                      transition: "transform 0.2s",
                      opacity: 0.6,
                    }}
                  >
                    <path
                      d="M2 3.5l3 3 3-3"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              ) : (
                <Link
                  href={item.href}
                  style={{
                    fontFamily: "var(--font-jakarta), 'Plus Jakarta Sans', sans-serif",
                    fontWeight: 400,
                    fontSize: 13.4,
                    letterSpacing: "0.01em",
                    color: "#A9B8C7",
                    textDecoration: "none",
                    padding: "25.6px 14px",
                    display: "flex",
                    alignItems: "center",
                    height: 68,
                    transition: "color 0.15s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.color = "#FFFFFF")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.color = "#A9B8C7")
                  }
                >
                  {item.label}
                </Link>
              )}

              {/* Platform mega menu */}
              {item.label === "Platform" && openMenu === "Platform" && (
                <PlatformMenu />
              )}
              {/* Solutions mega menu */}
              {item.label === "Solutions" && openMenu === "Solutions" && (
                <SolutionsMenu />
              )}
            </div>
          ))}
        </div>

        {/* CTA buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <Link
            href="https://getzoikovertex.com/login"
            style={{
              fontFamily: "var(--font-jakarta), 'Plus Jakarta Sans', sans-serif",
              fontWeight: 400,
              fontSize: 13.4,
              letterSpacing: "0.01em",
              color: "#A9B8C7",
              textDecoration: "none",
              transition: "color 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#FFFFFF")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#A9B8C7")}
          >
            Sign in
          </Link>
          <Link
            href="/request-demo"
            style={{
              fontFamily: "var(--font-jakarta), 'Plus Jakarta Sans', sans-serif",
              fontWeight: 600,
              fontSize: 13.4,
              color: "#FFFFFF",
              background: "transparent",
              padding: "8px 20px",
              borderRadius: 10,
              border: "1.5px solid rgba(255,255,255,0.25)",
              textDecoration: "none",
              transition: "border-color 0.15s",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.borderColor = "rgba(255,255,255,0.5)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)")
            }
          >
            Request a Demo
          </Link>
          <Link
            href="/signup"
            style={{
              fontFamily: "var(--font-jakarta), 'Plus Jakarta Sans', sans-serif",
              fontWeight: 700,
              fontSize: 13.4,
              color: "#000000",
              background: "#20E7F2",
              padding: "8px 20px",
              borderRadius: 10,
              textDecoration: "none",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "#4AECF5")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "#20E7F2")
            }
          >
            Get Started
          </Link>
        </div>
      </div>
    </nav>
  );
}
