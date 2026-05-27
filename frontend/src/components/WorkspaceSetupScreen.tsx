"use client";

import { useEffect, useState } from "react";

const BLOCKS: { col: number; row: number; delay: number; shade: string }[] = [
  { col: 0, row: 0, delay: 0.0, shade: "#3f3f46" },
  { col: 0, row: 1, delay: 0.3, shade: "#52525b" },
  { col: 1, row: 0, delay: 0.1, shade: "#3f3f46" },
  { col: 1, row: 1, delay: 0.4, shade: "#52525b" },
  { col: 1, row: 2, delay: 0.7, shade: "#71717a" },
  { col: 1, row: 3, delay: 1.0, shade: "#a1a1aa" },
  { col: 2, row: 0, delay: 0.2, shade: "#3f3f46" },
  { col: 2, row: 1, delay: 0.5, shade: "#52525b" },
  { col: 2, row: 2, delay: 0.8, shade: "#71717a" },
  { col: 3, row: 0, delay: 0.15, shade: "#3f3f46" },
  { col: 3, row: 1, delay: 0.45, shade: "#52525b" },
  { col: 4, row: 0, delay: 0.05, shade: "#3f3f46" },
  { col: 4, row: 1, delay: 0.35, shade: "#52525b" },
  { col: 4, row: 2, delay: 0.65, shade: "#71717a" },
];

const BLOCK_W = 22;
const BLOCK_H = 18;
const GAP = 3;
const COLS = 5;
const MAX_ROWS = 4;
const GRID_W = COLS * (BLOCK_W + GAP) - GAP;
const GRID_H = MAX_ROWS * (BLOCK_H + GAP) - GAP;

const TIPS = [
  "Configuring your workspace permissions…",
  "Setting up governance defaults…",
  "Preparing your brand channels…",
  "Activating your analytics layer…",
  "Almost there…",
];

export default function WorkspaceSetupScreen() {
  const [tick, setTick]     = useState(0);
  const [tipIdx, setTipIdx] = useState(0);

  /* Animate dots and cycle tips */
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 500);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setTipIdx(i => (i + 1) % TIPS.length), 3200);
    return () => clearInterval(t);
  }, []);

  const dots = ".".repeat((tick % 3) + 1).padEnd(3, " ");

  return (
    <>
      <style>{`
        @keyframes zv-hammer {
          0%,100% { transform: rotate(0deg);   }
          20%      { transform: rotate(-58deg); }
          38%      { transform: rotate(-58deg); }
          55%      { transform: rotate(0deg);   }
        }
        @keyframes zv-block-rise {
          from { transform: scaleY(0); opacity: 0; }
          to   { transform: scaleY(1); opacity: 1;  }
        }
        @keyframes zv-fade-up {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        @keyframes zv-spark {
          0%   { opacity: 1; transform: translate(0,0) scale(1);          }
          100% { opacity: 0; transform: translate(var(--dx),var(--dy)) scale(0); }
        }
        @keyframes zv-orb {
          0%,100% { opacity: 0.35; transform: scale(1);   }
          50%      { opacity: 0.6;  transform: scale(1.08);}
        }
        @keyframes zv-tip-in {
          from { opacity:0; transform:translateY(6px); }
          to   { opacity:1; transform:translateY(0);   }
        }
        .zv-hammer     { animation: zv-hammer 1.4s cubic-bezier(.4,0,.2,1) infinite; transform-origin: 88% 88%; }
        .zv-tip-text   { animation: zv-tip-in 0.4s ease both; }
      `}</style>

      <div style={{
        minHeight: "100vh",
        background: "#09090b",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 0,
        position: "relative",
        overflow: "hidden",
      }}>

        {/* Background orbs */}
        <div style={{ position:"absolute", top:-220, right:-160, width:560, height:560, borderRadius:"50%", background:"radial-gradient(circle, rgba(63,63,70,0.35) 0%, transparent 65%)", animation:"zv-orb 11s ease-in-out infinite", pointerEvents:"none" }} />
        <div style={{ position:"absolute", bottom:-260, left:-140, width:620, height:620, borderRadius:"50%", background:"radial-gradient(circle, rgba(39,39,42,0.45) 0%, transparent 65%)", animation:"zv-orb 14s ease-in-out infinite 5s", pointerEvents:"none" }} />

        {/* Construction scene */}
        <div style={{ position:"relative", width: GRID_W + 60, height: GRID_H + 80, marginBottom: 32 }}>

          {/* Ground */}
          <div style={{
            position: "absolute",
            bottom: 20,
            left: 0,
            right: 0,
            height: 3,
            borderRadius: 2,
            background: "linear-gradient(90deg, transparent, #3f3f46 20%, #3f3f46 80%, transparent)",
          }} />

          {/* Building blocks */}
          {BLOCKS.map((b, i) => {
            const x = b.col * (BLOCK_W + GAP);
            const y = GRID_H - (b.row + 1) * (BLOCK_H + GAP) + GAP;
            const isTopmost = !BLOCKS.some(o => o.col === b.col && o.row === b.row + 1);
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: x + 30,
                  top: y + 24,
                  width: BLOCK_W,
                  height: BLOCK_H,
                  background: isTopmost ? "#d97706" : b.shade,
                  border: `1px solid ${isTopmost ? "#f59e0b" : "#52525b"}`,
                  borderRadius: 3,
                  transformOrigin: "bottom center",
                  animation: `zv-block-rise 0.35s cubic-bezier(0.34,1.56,0.64,1) ${b.delay}s both`,
                  boxShadow: isTopmost ? "0 0 10px rgba(217,119,6,0.4)" : "none",
                }}
              />
            );
          })}

          {/* Hammer */}
          <div className="zv-hammer" style={{ position:"absolute", right: 0, top: 10, width: 52, height: 52 }}>
            <svg viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg" width={52} height={52}>
              {/* Handle */}
              <rect x="28" y="22" width="7" height="26" rx="3.5" fill="#a3a3a3" transform="rotate(12 28 22)" />
              {/* Head */}
              <rect x="6" y="8" width="28" height="16" rx="4" fill="#e4e4e7" />
              <rect x="6" y="8" width="10" height="16" rx="3" fill="#d4d4d8" />
              {/* Face highlight */}
              <rect x="8" y="10" width="24" height="4" rx="2" fill="rgba(255,255,255,0.15)" />
            </svg>
          </div>

          {/* Spark particles (4 dots near hammer tip) */}
          {[
            { dx:"-8px", dy:"-12px", delay:"0s"   },
            { dx:"10px",  dy:"-8px",  delay:"0.1s" },
            { dx:"-12px", dy:"4px",  delay:"0.05s" },
            { dx:"6px",   dy:"8px",  delay:"0.15s" },
          ].map((s, i) => (
            <div key={i} style={{
              position: "absolute",
              right: 12,
              top: 40,
              width: 4,
              height: 4,
              borderRadius: "50%",
              background: "#fbbf24",
              // @ts-ignore css vars
              "--dx": s.dx,
              "--dy": s.dy,
              animation: `zv-spark 0.6s ease-out ${s.delay} infinite`,
              opacity: 0,
            } as React.CSSProperties} />
          ))}
        </div>

        {/* Text */}
        <div style={{ textAlign:"center", animation:"zv-fade-up 0.7s ease 0.3s both" }}>
          <h2 style={{ fontSize:"clamp(20px,2.5vw,26px)", fontWeight:800, color:"#fff", letterSpacing:"-0.02em", margin:"0 0 10px 0" }}>
            We&apos;re building your workspace{dots}
          </h2>
          <p key={tipIdx} className="zv-tip-text" style={{ fontSize:13, color:"#71717a", margin:"0 0 6px 0" }}>
            {TIPS[tipIdx]}
          </p>
          <p style={{ fontSize:12, color:"#3f3f46", margin:0 }}>
            This will be ready in under 2 minutes
          </p>
        </div>

        {/* Animated progress bar */}
        <div style={{ marginTop: 36, width: 220, height: 3, background:"#27272a", borderRadius: 999, overflow:"hidden" }}>
          <div style={{
            height: "100%",
            width: "40%",
            background: "linear-gradient(90deg, #d97706, #f59e0b)",
            borderRadius: 999,
            animation: "zv-orb 2s ease-in-out infinite",
            transform: `translateX(${(tick % 10) * 22}px)`,
            transition: "transform 0.5s ease",
          }} />
        </div>

      </div>
    </>
  );
}
