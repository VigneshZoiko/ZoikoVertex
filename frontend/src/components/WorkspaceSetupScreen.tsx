"use client";

import { Loader2 } from "lucide-react";

export default function WorkspaceSetupScreen() {
  return (
    <div
      style={{
        height: "100vh",
        background: "#09090b",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 24,
        padding: "0 24px",
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 16,
          background: "#18181b",
          border: "1px solid #27272a",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Loader2
          style={{
            width: 22,
            height: 22,
            color: "#a1a1aa",
            animation: "sp 0.8s linear infinite",
          }}
        />
      </div>

      <div style={{ textAlign: "center" }}>
        <p
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: "#fff",
            margin: 0,
            letterSpacing: "-0.01em",
          }}
        >
          Setting up your workspace
        </p>
        <p
          style={{
            fontSize: 13,
            color: "#71717a",
            margin: "6px 0 0",
          }}
        >
          This should only take a moment…
        </p>
      </div>

      <style>{`
        @keyframes sp {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
