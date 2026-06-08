"use client";
import Link from "next/link";

/* Figma chart — clear ascending staircase with slight variation */
const BAR_HEIGHTS = [22, 32, 26, 42, 36, 55, 48, 68, 58, 80, 72, 60];

function SidebarIcon({ name }: { name: string }) {
  const s: React.CSSProperties = { width: 15, height: 15, flexShrink: 0 };
  if (name === "grid") return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={s}>
      <rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/>
      <rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/>
    </svg>
  );
  if (name === "zap") return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={s}><polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>;
  if (name === "bar") return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={s}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>;
  if (name === "user") return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={s}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
  if (name === "shield") return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={s}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={s}><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>;
}

const SIDEBAR_ITEMS = [
  { label: "Command Center", icon: "grid", active: true },
  { label: "AI Agents", icon: "zap", active: false },
  { label: "Revenue Evidence", icon: "bar", active: false },
  { label: "Approvals", icon: "user", active: false },
  { label: "Governance", icon: "shield", active: false },
  { label: "Integrations", icon: "link", active: false },
];

const STATUS_BADGES = [
  { label: "Policy Check Passed",  color: "#22C55E", border: "rgba(34,197,94,0.45)",   bg: "rgba(34,197,94,0.08)"   },
  { label: "3 Awaiting Approval",  color: "#F59E0B", border: "rgba(245,158,11,0.45)",  bg: "rgba(245,158,11,0.08)"  },
  { label: "Evidence Captured",    color: "#20D4D4", border: "rgba(32,212,212,0.45)",  bg: "rgba(32,212,212,0.08)"  },
  { label: "Integrations: Healthy",color: "#64748B", border: "rgba(100,116,139,0.4)",  bg: "transparent"            },
];

/* dark palette */
const D = {
  titleBar:  "#0A111C",
  sidebar:   "#0A111C",
  body:      "#0F1A28",
  card:      "#0C1520",
  border:    "rgba(255,255,255,0.07)",
  textMuted: "rgba(255,255,255,0.35)",
};

function DashboardMockup() {
  return (
    <div style={{
      borderRadius: 14,
      overflow: "hidden",
      boxShadow: "0 32px 100px rgba(0,0,0,0.7), 0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06)",
      width: "100%",
      fontFamily: "var(--font-jetbrains), 'JetBrains Mono', monospace",
      background: D.body,
    }}>
      {/* ── Title bar — dark ── */}
      <div style={{
        background: D.titleBar,
        padding: "11px 18px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        borderBottom: `1px solid ${D.border}`,
      }}>
        <div style={{ display: "flex", gap: 7, flexShrink: 0 }}>
          <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#FF5F57" }} />
          <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#FEBC2E" }} />
          <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#28C840" }} />
        </div>
        <span style={{ flex: 1, textAlign: "center", fontSize: 11, color: "rgba(255,255,255,0.45)", letterSpacing: "0.04em" }}>
          ZoikoVertex — Executive Command Center
        </span>
        <span style={{ fontSize: 11, color: "#22C55E", fontWeight: 600, flexShrink: 0, letterSpacing: "0.01em" }}>
          ● Governed Mode
        </span>
      </div>

      {/* ── Body ── */}
      <div style={{ display: "flex" }}>
        {/* Sidebar — dark navy */}
        <div style={{
          width: 190,
          background: D.sidebar,
          padding: "10px 0",
          flexShrink: 0,
          borderRight: `1px solid ${D.border}`,
        }}>
          {SIDEBAR_ITEMS.map((item) => (
            <div key={item.label} style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 16px",
              color: item.active ? "#FFFFFF" : "rgba(255,255,255,0.38)",
              background: item.active ? "rgba(255,255,255,0.05)" : "transparent",
              borderLeft: `3px solid ${item.active ? "#20D4D4" : "transparent"}`,
              fontSize: 12,
              cursor: "default",
            }}>
              <SidebarIcon name={item.icon} />
              {item.label}
            </div>
          ))}
        </div>

        {/* Main content */}
        <div style={{
          flex: 1,
          background: D.body,
          padding: "18px 22px 22px",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}>

          {/* Header row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{
              fontFamily: "var(--font-jakarta), 'Plus Jakarta Sans', sans-serif",
              fontSize: 14,
              fontWeight: 700,
              color: "#FFFFFF",
            }}>
              Campaign Performance Snapshot
            </span>
            <div style={{
              fontSize: 9.5,
              fontWeight: 700,
              color: "#D97706",
              background: "rgba(217,119,6,0.08)",
              border: "1px solid rgba(217,119,6,0.5)",
              borderRadius: 6,
              padding: "4px 10px",
              letterSpacing: "0.1em",
            }}>
              SAMPLE DATA
            </div>
          </div>

          {/* Status cards — 3 cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
            {/* Ready */}
            <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 10, padding: "16px 18px" }}>
              <div style={{
                fontFamily: "var(--font-jakarta), 'Plus Jakarta Sans', sans-serif",
                fontSize: 26,
                fontWeight: 800,
                color: "#14B8A6",
                lineHeight: 1,
                marginBottom: 6,
              }}>Ready</div>
              <div style={{ fontSize: 9.5, color: D.textMuted, letterSpacing: "0.09em" }}>ROI EVIDENCE</div>
            </div>
            {/* 3 */}
            <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 10, padding: "16px 18px" }}>
              <div style={{
                fontFamily: "var(--font-jakarta), 'Plus Jakarta Sans', sans-serif",
                fontSize: 26,
                fontWeight: 800,
                color: "#F59E0B",
                lineHeight: 1,
                marginBottom: 6,
              }}>3</div>
              <div style={{ fontSize: 9.5, color: D.textMuted, letterSpacing: "0.09em" }}>APPROVAL QUEUE</div>
            </div>
            {/* Active */}
            <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 10, padding: "16px 18px" }}>
              <div style={{
                fontFamily: "var(--font-jakarta), 'Plus Jakarta Sans', sans-serif",
                fontSize: 26,
                fontWeight: 800,
                color: "#22C55E",
                lineHeight: 1,
                marginBottom: 6,
              }}>Active</div>
              <div style={{ fontSize: 9.5, color: D.textMuted, letterSpacing: "0.09em" }}>POLICY STATUS</div>
            </div>
          </div>

          {/* Chart */}
          <div>
            <div style={{ fontSize: 10, color: D.textMuted, marginBottom: 10, letterSpacing: "0.02em" }}>
              Spend efficiency — indicative model output
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 82, paddingBottom: 0 }}>
              {BAR_HEIGHTS.map((h, i) => {
                const highlight = [5, 7, 9, 10].includes(i);
                return (
                  <div key={i} style={{
                    width: 14,
                    flexShrink: 0,
                    height: `${h}%`,
                    borderRadius: "4px 4px 0 0",
                    background: highlight
                      ? "#22D3EE"
                      : `rgba(14,42,62,${0.6 + (h / 80) * 0.35})`,
                  }} />
                );
              })}
            </div>
          </div>

          {/* Agent recommendation card */}
          <div style={{
            background: "rgba(20,184,166,0.05)",
            border: "1px solid rgba(20,184,166,0.2)",
            borderRadius: 10,
            padding: "14px 16px",
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
          }}>
            <div style={{
              width: 30, height: 30,
              borderRadius: 8,
              background: "rgba(20,184,166,0.1)",
              border: "1px solid rgba(20,184,166,0.25)",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#14B8A6" strokeWidth="2.2">
                <polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{
                fontFamily: "var(--font-jakarta), 'Plus Jakarta Sans', sans-serif",
                fontSize: 12,
                lineHeight: 1.55,
                marginBottom: 12,
                color: "rgba(255,255,255,0.75)",
              }}>
                <span style={{ color: "#FFFFFF", fontWeight: 700 }}>Agent recommendation: </span>
                Suggested spend reallocation across active channels requires approval before deployment.
              </div>
              <div style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: 9.5,
                fontWeight: 700,
                color: "#F59E0B",
                background: "rgba(245,158,11,0.08)",
                border: "1px solid rgba(245,158,11,0.45)",
                borderRadius: 6,
                padding: "5px 12px",
                letterSpacing: "0.09em",
              }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2">
                  <path d="M6 9H3V3h18v6h-3"/><path d="M12 15c-3.31 0-6-2.69-6-6V3h12v6c0 3.31-2.69 6-6 6z"/>
                  <path d="M12 15v4"/><path d="M8 21h8"/>
                </svg>
                APPROVAL REQUIRED
              </div>
            </div>
          </div>

          {/* Status badge pills */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
            {STATUS_BADGES.map((b) => (
              <span key={b.label} style={{
                fontFamily: "var(--font-jetbrains), 'JetBrains Mono', monospace",
                fontSize: 10.5,
                fontWeight: 600,
                color: b.color,
                background: b.bg,
                border: `1px solid ${b.border}`,
                borderRadius: 999,
                padding: "6px 14px",
                whiteSpace: "nowrap",
              }}>
                {b.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Footer bar — dark ── */}
      <div style={{
        background: D.titleBar,
        padding: "8px 18px",
        display: "flex",
        gap: 20,
        alignItems: "center",
        borderTop: `1px solid ${D.border}`,
      }}>
        <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: "rgba(255,255,255,0.38)" }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          Evidence log updated
        </span>
        <span style={{ color: "rgba(255,255,255,0.18)", fontSize: 10 }}>·</span>
        <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: "rgba(255,255,255,0.38)" }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><circle cx="12" cy="16" r="0.5" fill="#F59E0B"/></svg>
          Approval required
        </span>
        <span style={{ color: "rgba(255,255,255,0.18)", fontSize: 10 }}>·</span>
        <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: "rgba(255,255,255,0.38)" }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#14B8A6" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          Policy check passed
        </span>
      </div>
    </div>
  );
}

export default function Hero() {
  return (
    <section style={{
      background: "#152238",
      paddingTop: 116,
      paddingBottom: 64,
      paddingLeft: 24,
      paddingRight: 24,
      overflow: "hidden",
    }}>
      <div style={{
        maxWidth: 1280,
        margin: "0 auto",
        display: "grid",
        alignItems: "center",
        gap: 48,
        gridTemplateColumns: "42% 58%",
      }}>

        {/* ── Left — copy ── */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{
            display: "inline-flex",
            width: "fit-content",
            alignItems: "center",
            gap: 10,
            border: "1px solid rgba(32,231,242,0.3)",
            background: "rgba(32,231,242,0.05)",
            color: "#20E7F2",
            fontSize: 10,
            fontFamily: "var(--font-jetbrains), 'JetBrains Mono', monospace",
            fontWeight: 600,
            letterSpacing: "0.12em",
            textTransform: "uppercase" as const,
            padding: "8px 16px",
            borderRadius: 999,
            marginBottom: 28,
          }}>
            <span style={{ width: 6, height: 6, background: "#20E7F2", borderRadius: "50%", flexShrink: 0 }} />
            Governed Agentic Marketing Operating System
          </div>

          <h1 style={{
            fontFamily: "var(--font-bricolage), 'Bricolage Grotesque', sans-serif",
            fontSize: "clamp(2.8rem, 4vw, 4.2rem)",
            fontWeight: 900,
            color: "#FFFFFF",
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
            marginBottom: 20,
          }}>
            Run Marketing<br />
            with{" "}
            <span style={{ color: "#20E7F2" }}>Financial<br />Control</span>
          </h1>

          <p style={{
            fontFamily: "var(--font-jakarta), 'Plus Jakarta Sans', sans-serif",
            color: "#5E7A92",
            fontSize: 15,
            lineHeight: 1.7,
            marginBottom: 28,
            maxWidth: 460,
          }}>
            ZoikoVertex helps teams{" "}
            <span style={{ color: "#A9B8C7", fontWeight: 600 }}>plan, execute, govern, and optimize</span>{" "}
            digital marketing with AI agent workflows, approval controls, ROI evidence, and audit-ready operating discipline.
          </p>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 28 }}>
            <Link href="/request-demo" style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "#20E7F2",
              color: "#000",
              fontFamily: "var(--font-jakarta), 'Plus Jakarta Sans', sans-serif",
              fontWeight: 700,
              fontSize: 13.4,
              padding: "12px 24px",
              borderRadius: 999,
              textDecoration: "none",
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
              Request Demo
            </Link>
            <a href="#pricing" style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "#A9B8C7",
              fontFamily: "var(--font-jakarta), 'Plus Jakarta Sans', sans-serif",
              fontWeight: 600,
              fontSize: 13.4,
              padding: "12px 24px",
              borderRadius: 999,
              textDecoration: "none",
            }}>
              Find Your Ideal Plan →
            </a>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {["AI-agent workflows", "Approval-controlled execution", "Audit-ready governance", "ROI evidence"].map((label) => (
              <span key={label} style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                color: "#5E7A92",
                fontSize: 11,
                border: "1px solid rgba(255,255,255,0.08)",
                padding: "6px 12px",
                borderRadius: 999,
                fontFamily: "var(--font-jakarta), 'Plus Jakarta Sans', sans-serif",
              }}>
                <span style={{ width: 5, height: 5, background: "rgba(32,231,242,0.5)", borderRadius: "50%", flexShrink: 0 }} />
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* ── Right — dashboard + blue glow orb ── */}
        <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
          {/* Glow orb — matches the blue sphere in screenshot */}
          <div style={{
            position: "absolute",
            top: "50%",
            right: -80,
            transform: "translateY(-50%)",
            width: 560,
            height: 560,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(40,110,255,0.6) 0%, rgba(90,30,240,0.38) 50%, transparent 75%)",
            filter: "blur(48px)",
            zIndex: 0,
            pointerEvents: "none",
          }} />
          <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 680 }}>
            <DashboardMockup />
          </div>
        </div>
      </div>
    </section>
  );
}
