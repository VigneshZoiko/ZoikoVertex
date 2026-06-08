"use client";

import { useEffect, useRef, useState } from "react";

const TOTAL_SECONDS = 120;

const TIPS = [
  "Configuring your workspace permissions…",
  "Setting up governance defaults…",
  "Preparing your brand channels…",
  "Activating your analytics layer…",
  "Finalising your team structure…",
  "Almost there…",
];

/* Gear SVG — drawn with teeth as polygon points */
function GearIcon({ size = 72, className = "" }: { size?: number; className?: string }) {
  const teeth = 10;
  const outerR = size / 2;
  const innerR = outerR * 0.68;
  const holeR  = outerR * 0.28;
  const toothH = outerR * 0.18;

  const pts: string[] = [];
  for (let i = 0; i < teeth; i++) {
    const base  = (i / teeth) * Math.PI * 2;
    const half  = (0.5 / teeth) * Math.PI * 2;
    const quart = half * 0.38;

    const angle = (deg: number) => {
      const x = Math.cos(deg) * innerR + outerR;
      const y = Math.sin(deg) * innerR + outerR;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    };
    const outer = (deg: number) => {
      const r = innerR + toothH;
      const x = Math.cos(deg) * r + outerR;
      const y = Math.sin(deg) * r + outerR;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    };

    pts.push(angle(base - half / 2));
    pts.push(outer(base - quart));
    pts.push(outer(base + quart));
    pts.push(angle(base + half / 2));
  }

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      className={className}
      style={{ display: "block" }}
    >
      <defs>
        <radialGradient id="gearGrad" cx="38%" cy="38%">
          <stop offset="0%"   stopColor="#a1a1aa" />
          <stop offset="100%" stopColor="#52525b" />
        </radialGradient>
        <filter id="gearGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      {/* Gear body */}
      <polygon points={pts.join(" ")} fill="url(#gearGrad)" filter="url(#gearGlow)" />
      {/* Rim highlight */}
      <polygon points={pts.join(" ")} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
      {/* Center hole */}
      <circle cx={outerR} cy={outerR} r={holeR} fill="#09090b" stroke="#3f3f46" strokeWidth="1.5" />
      {/* Crosshair inside hole */}
      <line x1={outerR} y1={outerR - holeR * 0.55} x2={outerR} y2={outerR + holeR * 0.55} stroke="#3f3f46" strokeWidth="1" />
      <line x1={outerR - holeR * 0.55} y1={outerR} x2={outerR + holeR * 0.55} y2={outerR} stroke="#3f3f46" strokeWidth="1" />
    </svg>
  );
}

/* Small second gear */
function SmallGear({ size = 44, className = "" }: { size?: number; className?: string }) {
  const teeth = 7;
  const outerR = size / 2;
  const innerR = outerR * 0.70;
  const holeR  = outerR * 0.28;
  const toothH = outerR * 0.17;

  const pts: string[] = [];
  for (let i = 0; i < teeth; i++) {
    const base  = (i / teeth) * Math.PI * 2;
    const half  = (0.5 / teeth) * Math.PI * 2;
    const quart = half * 0.38;

    const angle = (deg: number) => {
      const x = Math.cos(deg) * innerR + outerR;
      const y = Math.sin(deg) * innerR + outerR;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    };
    const outer = (deg: number) => {
      const r = innerR + toothH;
      const x = Math.cos(deg) * r + outerR;
      const y = Math.sin(deg) * r + outerR;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    };

    pts.push(angle(base - half / 2));
    pts.push(outer(base - quart));
    pts.push(outer(base + quart));
    pts.push(angle(base + half / 2));
  }

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className={className} style={{ display: "block" }}>
      <polygon points={pts.join(" ")} fill="#3f3f46" stroke="rgba(255,255,255,0.08)" strokeWidth="0.8" />
      <circle cx={outerR} cy={outerR} r={holeR} fill="#09090b" stroke="#52525b" strokeWidth="1" />
    </svg>
  );
}

export default function WorkspaceSetupScreen() {
  const [remaining, setRemaining] = useState(TOTAL_SECONDS);
  const [tipIdx,    setTipIdx]    = useState(0);
  const startRef = useRef<number>(0);

  useEffect(() => {
    startRef.current = Date.now();
    const tick = () => {
      const elapsed = Math.floor((Date.now() - startRef.current) / 1000);
      setRemaining(Math.max(0, TOTAL_SECONDS - elapsed));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setTipIdx(i => (i + 1) % TIPS.length), 3500);
    return () => clearInterval(id);
  }, []);

  const elapsed   = TOTAL_SECONDS - remaining;
  const progress  = Math.min(elapsed / TOTAL_SECONDS, 1);
  const mins      = Math.floor(remaining / 60);
  const secs      = remaining % 60;
  const timerStr  = `${mins}:${secs.toString().padStart(2, "0")}`;
  const overtime  = remaining === 0;

  return (
    <>
      <style>{`
        /* ── Hammer ── */
        @keyframes zv-hammer {
          0%,100% { transform: rotate(0deg); }
          18%     { transform: rotate(-62deg); }
          38%     { transform: rotate(-62deg); }
          55%     { transform: rotate(0deg); }
        }

        /* ── Main gear rotates CW, synced to hammer period ── */
        @keyframes zv-gear-main {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }

        /* ── Small gear counter-CW (meshed) ── */
        @keyframes zv-gear-small {
          from { transform: rotate(0deg); }
          to   { transform: rotate(-360deg); }
        }

        /* ── Impact pulse on the gear when hammer lands ── */
        @keyframes zv-impact {
          0%,100% { filter: drop-shadow(0 0 0px #f59e0b); }
          38%,42% { filter: drop-shadow(0 0 14px #f59e0b); }
        }

        /* ── Sparks ── */
        @keyframes zv-spark {
          0%   { opacity: 1; transform: translate(0,0) scale(1); }
          100% { opacity: 0; transform: translate(var(--dx),var(--dy)) scale(0.15); }
        }

        /* ── Ring ping on impact ── */
        @keyframes zv-ring {
          0%   { transform: scale(0.7); opacity: 0.9; }
          100% { transform: scale(2.2); opacity: 0;   }
        }

        /* ── Progress bar shimmer ── */
        @keyframes zv-shimmer {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }

        /* ── Tip text fade ── */
        @keyframes zv-tip-in {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0);   }
        }

        /* ── Background orb pulse ── */
        @keyframes zv-orb {
          0%,100% { opacity: 0.4; transform: scale(1);    }
          50%     { opacity: 0.65; transform: scale(1.07); }
        }

        /* ── Fade up entry ── */
        @keyframes zv-fade-up {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0);    }
        }

        /* ── Floating particles ── */
        @keyframes zv-float {
          0%   { opacity: 0;   transform: translateY(0); }
          20%  { opacity: 0.5; }
          80%  { opacity: 0.2; }
          100% { opacity: 0;   transform: translateY(-80px); }
        }

        /* ── Dot pulse on status row ── */
        @keyframes zv-dot-pulse {
          0%,100% { opacity: 0.3; transform: scale(0.8); }
          50%     { opacity: 1;   transform: scale(1.2); }
        }

        /* ── Ellipsis ── */
        @keyframes zv-ellipsis {
          0%  { content: '.';   }
          33% { content: '..';  }
          66% { content: '...'; }
        }

        .zv-hammer      { animation: zv-hammer 1.6s cubic-bezier(.4,0,.2,1) infinite; transform-origin: 84% 84%; }
        .zv-gear-main   { animation: zv-gear-main  6.4s linear infinite; transform-origin: 50% 50%; }
        .zv-gear-small  { animation: zv-gear-small 4.57s linear infinite; transform-origin: 50% 50%; }
        .zv-impact      { animation: zv-impact 1.6s ease-in-out infinite; }
        .zv-tip-text    { animation: zv-tip-in 0.45s ease both; }
        .zv-bar-fill {
          background: linear-gradient(90deg, #92400e, #d97706, #fbbf24, #d97706, #92400e);
          background-size: 200% auto;
          animation: zv-shimmer 2.2s linear infinite;
        }
        .zv-ellipsis::after {
          content: '.';
          animation: zv-ellipsis 1.5s steps(1,end) infinite;
        }
      `}</style>

      <div style={{
        minHeight: "100vh",
        background: "#09090b",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
        padding: "0 24px",
      }}>

        {/* ── Background orbs ── */}
        <div style={{ position:"absolute", top:-200, right:-160, width:580, height:580, borderRadius:"50%", background:"radial-gradient(circle, rgba(63,63,70,0.35) 0%, transparent 65%)", animation:"zv-orb 11s ease-in-out infinite", pointerEvents:"none" }} />
        <div style={{ position:"absolute", bottom:-240, left:-130, width:640, height:640, borderRadius:"50%", background:"radial-gradient(circle, rgba(39,39,42,0.45) 0%, transparent 65%)", animation:"zv-orb 14s ease-in-out infinite 5s", pointerEvents:"none" }} />
        <div style={{ position:"absolute", top:"40%", left:"50%", width:320, height:320, borderRadius:"50%", background:"radial-gradient(circle, rgba(217,119,6,0.06) 0%, transparent 70%)", transform:"translate(-50%,-50%)", animation:"zv-orb 8s ease-in-out infinite 2s", pointerEvents:"none" }} />

        {/* ── Floating particles ── */}
        {[
          { l:"8%",  t:"25%", d:"0s",   dur:"7s"   },
          { l:"18%", t:"68%", d:"1.4s", dur:"6s"   },
          { l:"32%", t:"42%", d:"0.7s", dur:"8s"   },
          { l:"52%", t:"80%", d:"2.1s", dur:"6.5s" },
          { l:"70%", t:"30%", d:"0.3s", dur:"7.5s" },
          { l:"82%", t:"65%", d:"1.8s", dur:"6s"   },
          { l:"91%", t:"50%", d:"0.9s", dur:"8s"   },
        ].map((p, i) => (
          <div key={i} style={{ position:"absolute", left:p.l, top:p.t, width:3, height:3, borderRadius:"50%", background:"rgba(113,113,122,0.5)", animation:`zv-float ${p.dur} ease-in ${p.d} infinite`, pointerEvents:"none" }} />
        ))}

        {/* ── Main scene ── */}
        <div style={{ animation:"zv-fade-up 0.7s ease 0.1s both", display:"flex", flexDirection:"column", alignItems:"center" }}>

          {/* Gear + Hammer scene */}
          <div style={{ position:"relative", width:220, height:180, marginBottom:32 }}>

            {/* Small gear — top-right, meshed with main */}
            <div className="zv-gear-small" style={{ position:"absolute", top:10, right:18 }}>
              <SmallGear size={44} />
            </div>

            {/* Main gear — centre-left */}
            <div className="zv-gear-main zv-impact" style={{ position:"absolute", bottom:16, left:16 }}>
              <GearIcon size={88} />
            </div>

            {/* Ground line */}
            <div style={{
              position:"absolute", bottom:10, left:0, right:0, height:2,
              borderRadius:2,
              background:"linear-gradient(90deg, transparent, #3f3f46 20%, #52525b 50%, #3f3f46 80%, transparent)",
            }} />

            {/* Impact ring — bursts from gear center on hammer hit */}
            {[0, 0.5, 1.0].map((delay, i) => (
              <div key={i} style={{
                position:"absolute",
                bottom: 16 + 44 - 4,
                left:   16 + 44 - 4,
                width: 8, height: 8,
                borderRadius:"50%",
                border:"1.5px solid rgba(251,191,36,0.7)",
                pointerEvents:"none",
                animation:`zv-ring 1.6s ease-out ${delay + 0.36}s infinite`,
              }} />
            ))}

            {/* Hammer — positioned above gear */}
            <div className="zv-hammer" style={{ position:"absolute", bottom: 16 + 88 - 14, left: 16 + 60 }}>
              <svg viewBox="0 0 56 56" fill="none" width={56} height={56}>
                {/* Handle */}
                <rect x="30" y="24" width="7" height="28" rx="3.5" fill="#78716c" />
                {/* Handle highlight */}
                <rect x="30" y="24" width="3" height="28" rx="1.5" fill="rgba(255,255,255,0.1)" />
                {/* Head body */}
                <rect x="5" y="8" width="30" height="18" rx="5" fill="#e4e4e7" />
                {/* Head left face */}
                <rect x="5" y="8" width="11" height="18" rx="4" fill="#d4d4d8" />
                {/* Head gloss */}
                <rect x="7" y="10" width="26" height="5" rx="2.5" fill="rgba(255,255,255,0.18)" />
                {/* Strike face amber tint */}
                <rect x="32" y="10" width="3" height="14" rx="1.5" fill="rgba(251,191,36,0.35)" />
              </svg>
            </div>

            {/* Sparks — from hammer impact point */}
            {[
              { dx:"-10px", dy:"-14px", delay:"0s",    size: 4 },
              { dx:"12px",  dy:"-9px",  delay:"0.14s", size: 3 },
              { dx:"-14px", dy:"6px",   delay:"0.07s", size: 3.5 },
              { dx:"8px",   dy:"11px",  delay:"0.21s", size: 3 },
              { dx:"-6px",  dy:"-18px", delay:"0.28s", size: 2.5 },
              { dx:"16px",  dy:"-4px",  delay:"0.35s", size: 2.5 },
            ].map((s, i) => (
              <div key={i} style={{
                position:"absolute",
                bottom: 16 + 88 - 6,
                left:   16 + 70,
                width:  s.size, height: s.size,
                borderRadius:"50%",
                background:"#fbbf24",
                // @ts-ignore
                "--dx": s.dx, "--dy": s.dy,
                animation:`zv-spark 0.7s ease-out ${s.delay} infinite`,
                opacity:0,
                boxShadow:"0 0 4px #f59e0b",
              } as React.CSSProperties} />
            ))}

          </div>

          {/* ── Headline ── */}
          <div style={{ textAlign:"center", marginBottom:20 }}>
            <h2 style={{
              fontSize:"clamp(20px,2.6vw,26px)",
              fontWeight:800,
              color:"#fff",
              letterSpacing:"-0.025em",
              margin:"0 0 10px 0",
              lineHeight:1.2,
            }}>
              {overtime
                ? "Still building your workspace…"
                : <span>Building your workspace<span className="zv-ellipsis" /></span>
              }
            </h2>

            {/* Animated tip line */}
            <p
              key={tipIdx}
              className="zv-tip-text"
              style={{ fontSize:13, color:"#71717a", margin:0, minHeight:20 }}
            >
              {overtime ? "Taking a little longer than usual — please wait." : TIPS[tipIdx]}
            </p>
          </div>

          {/* ── Status dots row ── */}
          <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:24 }}>
            {["Auth", "DB", "Roles", "Channels", "Ready"].map((label, i) => {
              const done = progress > (i + 1) / 6;
              return (
                <div key={label} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                  <div style={{
                    width:8, height:8, borderRadius:"50%",
                    background: done ? "#22c55e" : "#3f3f46",
                    boxShadow: done ? "0 0 6px rgba(34,197,94,0.6)" : "none",
                    transition:"background 0.5s, box-shadow 0.5s",
                    animation: !done ? `zv-dot-pulse 1.4s ease-in-out ${i * 0.28}s infinite` : "none",
                  }} />
                  <span style={{ fontSize:9, color: done ? "#52525b" : "#3f3f46", fontWeight:600, letterSpacing:"0.06em", textTransform:"uppercase" }}>{label}</span>
                </div>
              );
            })}
          </div>

          {/* ── Progress bar ── */}
          <div style={{ width:280 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
              <span style={{ fontSize:11, color:"#52525b", fontWeight:600, letterSpacing:"0.04em", textTransform:"uppercase" }}>
                {overtime ? "Waiting…" : "Setting up"}
              </span>
              <span style={{
                fontSize:13, fontWeight:800,
                color: overtime ? "#ef4444" : "#d97706",
                fontVariantNumeric:"tabular-nums",
                letterSpacing:"0.05em",
              }}>
                {timerStr}
              </span>
            </div>

            {/* Track */}
            <div style={{ width:"100%", height:5, background:"#1c1c1f", borderRadius:999, overflow:"hidden", border:"1px solid #27272a" }}>
              <div
                className="zv-bar-fill"
                style={{
                  height:"100%",
                  width:`${Math.round(progress * 100)}%`,
                  borderRadius:999,
                  transition:"width 1s linear",
                }}
              />
            </div>

            <p style={{ fontSize:11, color:"#3f3f46", marginTop:10, textAlign:"center", lineHeight:1.6 }}>
              {overtime
                ? "Your dashboard will open automatically once ready."
                : "Your dashboard opens automatically — usually under 2 minutes."}
            </p>
          </div>

        </div>
      </div>
    </>
  );
}
