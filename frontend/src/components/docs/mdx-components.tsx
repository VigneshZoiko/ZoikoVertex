import { type ReactNode } from "react";

export const C = {
  bg:        "#0d1a30",
  bgDeep:    "#080e1a",
  bgPanel:   "#0a1526",
  bgCard:    "#0f1e35",
  bgHover:   "#1a2d48",
  border:    "rgba(32,231,242,0.10)",
  borderHi:  "rgba(32,231,242,0.22)",
  accent:    "#20E7F2",
  accentDim: "rgba(32,231,242,0.15)",
  accentGlow:"rgba(32,231,242,0.06)",
  text:      "#ffffff",
  muted:     "#A9B8C7",
  muted2:    "#5E7A92",
};

export function H1({ children }: { children: ReactNode }) {
  return <h1 style={{ color: C.text, fontSize: 30, fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 10, lineHeight: 1.2 }}>{children}</h1>;
}
export function H2({ id, children }: { id?: string; children: ReactNode }) {
  return <h2 id={id} style={{ color: C.text, fontSize: 20, fontWeight: 700, marginTop: 36, marginBottom: 10, paddingTop: id ? 8 : 0 }}>{children}</h2>;
}
export function H3({ children }: { children: ReactNode }) {
  return <h3 style={{ color: C.text, fontSize: 14, fontWeight: 600, marginTop: 22, marginBottom: 8 }}>{children}</h3>;
}
export function P({ children }: { children: ReactNode }) {
  return <p style={{ color: C.muted, fontSize: 14, lineHeight: 1.8, marginBottom: 12 }}>{children}</p>;
}
export function UL({ items }: { items: string[] }) {
  return (
    <ul style={{ marginBottom: 16, paddingLeft: 0, listStyle: "none" }}>
      {items.map((item, i) => (
        <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 7 }}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: C.accent, marginTop: 8, flexShrink: 0 }} />
          <span style={{ color: C.muted, fontSize: 13.5, lineHeight: 1.75 }} dangerouslySetInnerHTML={{ __html: item }} />
        </li>
      ))}
    </ul>
  );
}
export function Note({ children, type = "info" }: { children: ReactNode; type?: "info" | "warning" | "success" }) {
  const m = {
    info:    { bg: "rgba(32,231,242,0.06)",  border: "rgba(32,231,242,0.20)",  iconColor: C.accent },
    warning: { bg: "rgba(251,191,36,0.06)",  border: "rgba(251,191,36,0.25)",  iconColor: "#FBBF24" },
    success: { bg: "rgba(52,211,153,0.06)",  border: "rgba(52,211,153,0.25)",  iconColor: "#34D399" },
  }[type];
  return (
    <div style={{ display: "flex", gap: 10, padding: "10px 14px", borderRadius: 10, border: `1px solid ${m.border}`, background: m.bg, marginBottom: 16 }}>
      <span style={{ color: C.muted, fontSize: 13, lineHeight: 1.65 }}>{children}</span>
    </div>
  );
}
export function T({ headers, rows }: { headers: string[]; rows: (string | ReactNode)[][] }) {
  return (
    <div style={{ overflowX: "auto", marginBottom: 20, borderRadius: 10, border: `1px solid ${C.border}` }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: C.accentGlow }}>
            {headers.map((h, i) => (
              <th key={i} style={{ textAlign: "left", padding: "9px 14px", fontSize: 11, fontWeight: 700, color: C.accent, textTransform: "uppercase", letterSpacing: "0.07em", borderBottom: `1px solid ${C.border}` }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ borderBottom: i < rows.length - 1 ? `1px solid ${C.border}` : "none", background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)" }}>
              {row.map((cell, j) => (
                <td key={j} style={{ padding: "10px 14px", fontSize: 13, color: C.muted, lineHeight: 1.55, verticalAlign: "top" }}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export function Badge({ children, color = C.accent }: { children: string; color?: string }) {
  return <span style={{ display: "inline-flex", alignItems: "center", padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 700, color, background: `${color}18`, border: `1px solid ${color}30`, marginRight: 6 }}>{children}</span>;
}
export function CodeBlock({ children }: { children: string }) {
  return (
    <pre style={{ background: C.bgDeep, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 16px", fontSize: 12.5, color: "#a5f3fc", overflowX: "auto", marginBottom: 16, lineHeight: 1.7 }}>
      <code>{children}</code>
    </pre>
  );
}
