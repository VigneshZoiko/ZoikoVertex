"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { MDXRemote, type MDXRemoteSerializeResult } from "next-mdx-remote";
import {
  Search, ChevronRight, BookOpen, Megaphone,
  Bot, ShieldCheck, Archive, Plug, Settings, BarChart2,
  ThumbsUp, ThumbsDown, ExternalLink,
} from "lucide-react";

import * as docsComponents from "@/components/docs/mdx-components";

const C = docsComponents.C;

const CATS = [
  { id: "getting-started",      label: "Getting Started",          icon: BookOpen,     color: "#3b82f6",
    tagline: "Everything you need to go from zero to a fully governed workspace.",
    quickLinks: [
      { title: "What is ZoikoVertex?", desc: "The governed agentic architecture explained.", sectionId: "what-is" },
      { title: "First Steps", desc: "Connect accounts, invite your team, configure governance.", sectionId: "first-steps" },
      { title: "Architecture Deep-Dive", desc: "Three-plane design, autonomy levels, commercial tiers.", sectionId: "architecture" },
      { title: "User Roles Reference", desc: "All 20 RBAC roles and what each one can do.", sectionId: "roles-ref" },
    ],
    sections: [
      { id: "what-is", title: "What is ZoikoVertex?" },
      { id: "first-steps", title: "First Steps" },
      { id: "architecture", title: "Platform Architecture" },
      { id: "roles-ref", title: "User Roles Reference" },
    ] },
  { id: "campaigns-publishing", label: "Campaigns & Publishing",   icon: Megaphone,    color: "#f59e0b",
    tagline: "Paid campaigns, organic content, scheduling, and the social inbox.",
    quickLinks: [
      { title: "Campaigns", desc: "Create and manage Meta and Google Ads campaigns.", sectionId: "campaigns-detail" },
      { title: "Publishing Hub", desc: "Schedule posts, generate AI copy, submit for approval.", sectionId: "publishing-detail" },
      { title: "Social Inbox", desc: "Governed multi-platform inbox with SLA tracking.", sectionId: "inbox-detail" },
      { title: "Media Vault", desc: "Asset library with version control and brand compliance.", sectionId: "media-vault" },
    ],
    sections: [
      { id: "campaigns-detail", title: "Campaigns" },
      { id: "publishing-detail", title: "Publishing Hub" },
      { id: "calendar-detail", title: "Calendar & Review Queue" },
      { id: "inbox-detail", title: "Social Inbox" },
      { id: "media-vault", title: "Media Vault" },
    ] },
  { id: "analytics",           label: "Analytics",                 icon: BarChart2,    color: "#8b5cf6",
    tagline: "Cross-platform performance data, attribution, ROI reporting, and content scoring.",
    quickLinks: [
      { title: "Analytics Overview", desc: "Campaign and content performance across platforms.", sectionId: "analytics-overview" },
      { title: "ROI & Attribution", desc: "Multi-touch attribution models and spend efficiency.", sectionId: "roi-attribution" },
      { title: "Content Performance", desc: "Post-level engagement scoring and A/B results.", sectionId: "content-perf" },
      { title: "Custom Reports", desc: "Build, schedule, and export custom reports.", sectionId: "custom-reports" },
    ],
    sections: [
      { id: "analytics-overview", title: "Analytics Overview" },
      { id: "roi-attribution", title: "ROI & Attribution" },
      { id: "content-perf", title: "Content Performance" },
      { id: "custom-reports", title: "Custom Reports" },
    ] },
  { id: "ai-agents",           label: "AI Agents",                 icon: Bot,          color: "#20E7F2",
    tagline: "Create, govern, and orchestrate autonomous AI agents with full audit trails.",
    quickLinks: [
      { title: "Agents Overview", desc: "Agent identity, autonomy levels D0–D3.", sectionId: "agents-overview" },
      { title: "Agent Studio", desc: "Create, configure, version, and deploy agents.", sectionId: "agent-studio" },
      { title: "Workflow Orchestration", desc: "Multi-step, multi-agent pipelines.", sectionId: "workflows" },
      { title: "Knowledge Bases", desc: "Brand voice, product data, compliance rules.", sectionId: "knowledge" },
    ],
    sections: [
      { id: "agents-overview", title: "Agents Overview" },
      { id: "agent-studio", title: "Agent Studio" },
      { id: "workflows", title: "Workflow Orchestration" },
      { id: "autonomy-controls", title: "Autonomy Controls" },
      { id: "knowledge", title: "Knowledge Bases" },
      { id: "prompt-governance", title: "Prompt Governance" },
    ] },
  { id: "governance",          label: "Governance",                icon: ShieldCheck,  color: "#10b981",
    tagline: "Approval workflows, policies, brand standards, risk controls, and content safety.",
    quickLinks: [
      { title: "Approval Rules", desc: "Define review requirements and SLA policies.", sectionId: "approval-rules" },
      { title: "Policy Center", desc: "Regulatory, legal, and platform compliance policies.", sectionId: "policy-center" },
      { title: "Risk & Safety", desc: "Risk scoring, content safety scanner, intelligence signals.", sectionId: "risk-safety" },
      { title: "Collusion & Forensic", desc: "Inauthentic behaviour detection and investigation.", sectionId: "collusion-forensic" },
    ],
    sections: [
      { id: "governance-overview", title: "Governance Overview" },
      { id: "approval-rules", title: "Approval Rules" },
      { id: "policy-center", title: "Policy Center & Brand Standards" },
      { id: "risk-safety", title: "Risk, Safety & Signals" },
      { id: "collusion-forensic", title: "Collusion Monitor & Forensic Investigation" },
    ] },
  { id: "evidence",            label: "Evidence",                  icon: Archive,      color: "#ef4444",
    tagline: "Immutable audit trail, evidence vault, legal holds, and identity ledger.",
    quickLinks: [
      { title: "Audit Trail", desc: "Append-only log of every action.", sectionId: "audit-trail" },
      { title: "Evidence Vault", desc: "Signed, legally-defensible evidence records.", sectionId: "evidence-vault" },
      { title: "Legal Holds", desc: "Freeze records for legal proceedings.", sectionId: "legal-holds" },
      { title: "Identity Ledger", desc: "Permanent record of every identity.", sectionId: "identity-ledger" },
    ],
    sections: [
      { id: "audit-trail", title: "Audit Trail" },
      { id: "evidence-vault", title: "Evidence Vault" },
      { id: "legal-holds", title: "Legal Holds" },
      { id: "identity-ledger", title: "Identity Ledger" },
    ] },
  { id: "integrations",        label: "Integrations",              icon: Plug,         color: "#06b6d4",
    tagline: "Social platforms, REST API, webhooks, and data connectors.",
    quickLinks: [
      { title: "Platform Accounts", desc: "Connect Meta, Google Ads, LinkedIn, X, etc.", sectionId: "platform-accounts" },
      { title: "REST API", desc: "API keys, authentication, and endpoint reference.", sectionId: "rest-api" },
      { title: "Webhooks", desc: "Real-time event delivery to external systems.", sectionId: "webhooks" },
      { title: "Data Connectors", desc: "BigQuery, Slack, Teams, Zapier, custom HTTP.", sectionId: "data-connectors" },
    ],
    sections: [
      { id: "platform-accounts", title: "Platform Accounts" },
      { id: "rest-api", title: "REST API" },
      { id: "webhooks", title: "Webhooks" },
      { id: "data-connectors", title: "Data Connectors & Health" },
    ] },
  { id: "system-admin",        label: "System & Admin",            icon: Settings,     color: "#64748b",
    tagline: "Workspace settings, billing, security, privacy, and platform administration.",
    quickLinks: [
      { title: "Workspace Settings", desc: "Name, timezone, 2FA policy, session controls.", sectionId: "workspace-settings" },
      { title: "Security & Privacy", desc: "2FA, SSO, data retention, GDPR controls.", sectionId: "security-privacy" },
      { title: "Notifications", desc: "Alert channels, priority thresholds, delivery methods.", sectionId: "notifications" },
      { title: "Developer Console", desc: "API keys, webhooks, system diagnostics.", sectionId: "developer-console" },
    ],
    sections: [
      { id: "workspace-settings", title: "Workspace Settings" },
      { id: "security-privacy", title: "Security & Privacy" },
      { id: "notifications", title: "Notifications" },
      { id: "developer-console", title: "Developer Console" },
    ] },
];

type Cat = (typeof CATS)[number];
type Section = Cat["sections"][number];

export default function DocsClient({ serializedSources }: { serializedSources: Record<string, MDXRemoteSerializeResult> }) {
  const [activeCatId, setActiveCatId]       = useState("getting-started");
  const [activeSectionId, setActiveSectionId] = useState("what-is");
  const [search, setSearch]                 = useState("");
  const [helpful, setHelpful]               = useState<"yes" | "no" | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const mainRef   = useRef<HTMLDivElement>(null);

  const activeCat     = CATS.find(c => c.id === activeCatId)!;
  const activeSection = activeCat.sections.find(s => s.id === activeSectionId);
  const isFirstSection = activeSectionId === activeCat.sections[0].id;

  const allSections = useMemo(() =>
    CATS.flatMap(c => c.sections.map(s => ({ ...s, catId: c.id, catLabel: c.label }))), []);

  const searchResults = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return null;
    return allSections.filter(s => s.title.toLowerCase().includes(q)).slice(0, 8);
  }, [search, allSections]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === "Escape") setSearch("");
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const navigate = (catId: string, sectionId: string) => {
    setActiveCatId(catId);
    setActiveSectionId(sectionId);
    setSearch("");
    setHelpful(null);
    setTimeout(() => {
      const el = document.getElementById(sectionId);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  const mdxSource = serializedSources[activeCatId];

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; overflow: hidden; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(32,231,242,0.15); border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(32,231,242,0.30); }
        .ql { transition: background 120ms, border-color 120ms, color 120ms; }
        .ql:hover { background: rgba(32,231,242,0.06) !important; }
        .nav-tab { transition: all 150ms; border-bottom: 2px solid transparent; }
        .nav-tab:hover { color: #fff !important; }
        .nav-tab.active { border-bottom-color: currentColor !important; }
        .search-result:hover { background: rgba(32,231,242,0.06) !important; }
        .card:hover { border-color: rgba(32,231,242,0.25) !important; background: rgba(32,231,242,0.04) !important; }
        .sidebar-item { transition: background 100ms, border-color 100ms, color 100ms; }
        .sidebar-item:hover { background: rgba(255,255,255,0.03) !important; }
        .docs-content h1, .docs-content h2, .docs-content h3 { scroll-margin-top: 24px; }
      `}</style>

      <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: C.bg, color: C.text, fontFamily: "'Inter', -apple-system, sans-serif" }}>

        {/* ── TOP NAV ── */}
        <header style={{ height: 58, flexShrink: 0, borderBottom: `1px solid ${C.border}`, background: C.bgDeep, display: "flex", alignItems: "center", zIndex: 50 }}>
          <div style={{ width: 232, flexShrink: 0, display: "flex", alignItems: "center", gap: 10, padding: "0 20px", borderRight: `1px solid ${C.border}`, height: "100%" }}>
            <Image src="/images/ZoikoVertex_Logo_SVG 1.svg" alt="ZoikoVertex" width={130} height={28} style={{ objectFit: "contain" }} />
            <span style={{ fontSize: 11, color: C.muted2, fontWeight: 600, background: C.accentDim, border: `1px solid ${C.border}`, padding: "2px 7px", borderRadius: 20, letterSpacing: "0.04em" }}>DOCS</span>
          </div>
          <nav style={{ flex: 1, display: "flex", alignItems: "stretch", height: "100%", overflowX: "auto", padding: "0 8px", gap: 0 }}>
            {CATS.map(cat => {
              const Icon = cat.icon;
              const active = cat.id === activeCatId;
              return (
                <button key={cat.id} onClick={() => navigate(cat.id, cat.sections[0].id)} className={`nav-tab${active ? " active" : ""}`}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 14px", background: "transparent", border: "none", color: active ? cat.color : C.muted, fontSize: 13, fontWeight: active ? 600 : 400, cursor: "pointer", whiteSpace: "nowrap", borderBottom: `2px solid ${active ? cat.color : "transparent"}` }}>
                  <Icon style={{ width: 13, height: 13 }} />
                  {cat.label}
                </button>
              );
            })}
          </nav>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 18px", flexShrink: 0 }}>
            <div style={{ position: "relative" }}>
              <Search style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 13, height: 13, color: C.muted2, pointerEvents: "none" }} />
              <input ref={searchRef} value={search} onChange={e => setSearch(e.target.value)} placeholder="Search docs..."
                style={{ width: 190, paddingLeft: 30, paddingRight: 44, paddingTop: 7, paddingBottom: 7, background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 13, outline: "none" }} />
              <kbd style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", fontSize: 10, color: C.muted2, background: "rgba(255,255,255,0.05)", padding: "2px 5px", borderRadius: 4, border: `1px solid ${C.border}`, pointerEvents: "none" }}>⌘K</kbd>
              {searchResults && (
                <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, width: 320, background: C.bgPanel, border: `1px solid ${C.borderHi}`, borderRadius: 12, boxShadow: "0 24px 48px rgba(0,0,0,0.6)", overflow: "hidden", zIndex: 200 }}>
                  {searchResults.length === 0
                    ? <p style={{ padding: 16, color: C.muted, fontSize: 13, textAlign: "center" }}>No results found</p>
                    : searchResults.map(s => (
                      <button key={s.id} onClick={() => navigate(s.catId, s.id)} className="search-result" style={{ width: "100%", textAlign: "left", padding: "10px 16px", background: "transparent", border: "none", borderBottom: `1px solid ${C.border}`, cursor: "pointer" }}>
                        <p style={{ color: C.text, fontSize: 13, fontWeight: 500, marginBottom: 2 }}>{s.title}</p>
                        <p style={{ color: C.muted2, fontSize: 11 }}>{s.catLabel}</p>
                      </button>
                    ))
                  }
                </div>
              )}
            </div>
            <Link href="/dashboard" style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", background: C.accent, borderRadius: 8, color: C.bgDeep, fontSize: 13, fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap" }}>
              Open App <ExternalLink style={{ width: 11, height: 11 }} />
            </Link>
          </div>
        </header>

        {/* ── BODY ── */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

          {/* LEFT SIDEBAR */}
          <aside style={{ width: 232, flexShrink: 0, borderRight: `1px solid ${C.border}`, background: C.bgPanel, overflowY: "auto", padding: "16px 0 32px" }}>
            <p style={{ padding: "0 16px 6px", fontSize: 10, color: C.accent, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em" }}>{activeCat.label}</p>
            {activeCat.sections.map(s => (
              <button key={s.id} onClick={() => navigate(activeCatId, s.id)} className="sidebar-item"
                style={{ width: "100%", textAlign: "left", padding: "8px 16px 8px 18px", background: "transparent", border: "none", borderLeft: activeSectionId === s.id ? `2px solid ${activeCat.color}` : "2px solid transparent", color: activeSectionId === s.id ? C.text : C.muted, fontSize: 13, fontWeight: activeSectionId === s.id ? 600 : 400, cursor: "pointer" }}>
                {s.title}
              </button>
            ))}
            <div style={{ marginTop: 28, paddingTop: 20, borderTop: `1px solid ${C.border}` }}>
              <p style={{ padding: "0 16px 8px", fontSize: 10, color: C.muted2, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em" }}>Other Sections</p>
              {CATS.filter(c => c.id !== activeCatId).map(cat => {
                const Icon = cat.icon;
                return (
                  <button key={cat.id} onClick={() => navigate(cat.id, cat.sections[0].id)} className="sidebar-item" style={{ width: "100%", textAlign: "left", padding: "7px 16px", display: "flex", alignItems: "center", gap: 8, background: "transparent", border: "none", color: C.muted, fontSize: 12.5, cursor: "pointer" }}>
                    <Icon style={{ width: 13, height: 13, color: cat.color, flexShrink: 0 }} />
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </aside>

          {/* MAIN CONTENT */}
          <main ref={mainRef} style={{ flex: 1, overflowY: "auto", minWidth: 0 }}>
            <div style={{ maxWidth: 780, margin: "0 auto", padding: "40px 52px 100px" }} className="docs-content">

              {/* Category landing hero */}
              {isFirstSection && (
                <>
                  <div style={{ marginBottom: 32 }}>
                    <docsComponents.Badge color={activeCat.color}>{activeCat.label.toUpperCase()}</docsComponents.Badge>
                    <h1 style={{ color: C.text, fontSize: 30, fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 10, lineHeight: 1.2 }}>{activeCat.sections[0].title}</h1>
                    <p style={{ color: C.muted, fontSize: 15, lineHeight: 1.7, marginTop: 6 }}>{activeCat.tagline}</p>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12, marginBottom: 40 }}>
                    {activeCat.quickLinks.map(ql => (
                      <button key={ql.sectionId} onClick={() => navigate(activeCatId, ql.sectionId)} className="card" style={{ textAlign: "left", padding: "18px 18px 16px", borderRadius: 12, border: `1px solid ${C.border}`, background: C.bgCard, cursor: "pointer" }}>
                        <p style={{ color: C.text, fontSize: 13.5, fontWeight: 600, marginBottom: 6 }}>{ql.title}</p>
                        <p style={{ color: C.muted, fontSize: 12, lineHeight: 1.65 }}>{ql.desc}</p>
                        <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 10, color: activeCat.color, fontSize: 12, fontWeight: 600 }}>
                          Read <ChevronRight style={{ width: 12, height: 12 }} />
                        </div>
                      </button>
                    ))}
                  </div>
                  <hr style={{ border: "none", borderTop: `1px solid ${C.border}`, marginBottom: 36 }} />
                </>
              )}

              {/* Section heading for non-first sections */}
              {!isFirstSection && activeSection && (
                <div style={{ marginBottom: 28 }}>
                  <docsComponents.Badge color={activeCat.color}>{activeCat.label.toUpperCase()}</docsComponents.Badge>
                  <h1 style={{ color: C.text, fontSize: 30, fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 10, lineHeight: 1.2 }}>{activeSection.title}</h1>
                </div>
              )}

              {/* MDX Content */}
              <article>
                {mdxSource && <MDXRemote {...mdxSource} components={docsComponents as any} />}
              </article>

              {/* Next section link */}
              {(() => {
                const idx  = activeCat.sections.findIndex(s => s.id === activeSectionId);
                const next = activeCat.sections[idx + 1];
                return next ? (
                  <div style={{ marginTop: 56, paddingTop: 24, borderTop: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <p style={{ fontSize: 11, color: C.muted2, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>Next</p>
                      <button onClick={() => navigate(activeCatId, next.id)} style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: "none", color: activeCat.color, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                        {next.title} <ChevronRight style={{ width: 15, height: 15 }} />
                      </button>
                    </div>
                  </div>
                ) : null;
              })()}
            </div>
          </main>

          {/* RIGHT PANEL */}
          <aside style={{ width: 204, flexShrink: 0, borderLeft: `1px solid ${C.border}`, background: C.bgPanel, overflowY: "auto", padding: "28px 18px 32px", display: "flex", flexDirection: "column", gap: 28 }}>
            <div>
              <p style={{ fontSize: 10, color: C.muted2, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: 10 }}>Is this helpful?</p>
              <div style={{ display: "flex", gap: 8 }}>
                {(["yes", "no"] as const).map(v => (
                  <button key={v} onClick={() => setHelpful(v)} style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 8, border: `1px solid ${helpful === v ? activeCat.color : C.border}`, background: helpful === v ? C.accentDim : "transparent", color: helpful === v ? activeCat.color : C.muted, fontSize: 12, fontWeight: 500, cursor: "pointer" }}>
                    {v === "yes" ? <ThumbsUp style={{ width: 13, height: 13 }} /> : <ThumbsDown style={{ width: 13, height: 13 }} />}
                    {v === "yes" ? "Yes" : "No"}
                  </button>
                ))}
              </div>
              {helpful && <p style={{ marginTop: 8, fontSize: 11, color: C.muted2 }}>{helpful === "yes" ? "Thanks for the feedback!" : "We will work on improving this."}</p>}
            </div>
            <div>
              <p style={{ fontSize: 10, color: C.muted2, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: 10 }}>On this page</p>
              {activeCat.sections.map(s => (
                <button key={s.id} onClick={() => navigate(activeCatId, s.id)} style={{ display: "block", width: "100%", textAlign: "left", padding: "5px 0", background: "transparent", border: "none", borderLeft: `2px solid ${activeSectionId === s.id ? activeCat.color : "transparent"}`, paddingLeft: 8, color: activeSectionId === s.id ? C.text : C.muted, fontSize: 12, fontWeight: activeSectionId === s.id ? 600 : 400, cursor: "pointer", marginBottom: 2 }}>
                  {s.title}
                </button>
              ))}
            </div>
            <div style={{ marginTop: "auto" }}>
              <Link href="/dashboard" style={{ display: "flex", alignItems: "center", gap: 6, color: C.muted2, fontSize: 12, textDecoration: "none" }}>
                <ExternalLink style={{ width: 12, height: 12 }} /> Open ZoikoVertex
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
