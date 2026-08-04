/**
 * Server-safe primitives for the Support page — deliberately NOT "use client",
 * so server components can interpolate CONTAINER into className strings.
 *
 * Figma grid: 1440 frame, max-w 1180 with 28px inset → 1124px content column.
 * Same system as the Auditability page; token mapping is kept identical so the
 * two pages stay visually consistent.
 *
 *   Figma            → here
 *   azure-5/6-2      → #080d1a   (page + text on cyan buttons)
 *   azure-9-2        → #0a1020   (alternating section band)
 *   azure-12/12-2    → #0b1120   (card surface)
 *   azure-43         → white/35  (muted / meta text)
 *   azure-60         → white/60  (body copy)
 *   azure-80-2       → white/70  (form labels, chip text)
 *   azure-61 @14/26% → white/10, white/25 (hairlines, control borders)
 *   cyan-54 / 47     → #20E7F2 / #12c9d4
 *   orange-66 / 59   → #E8B768 / #E8944B
 */

import Image from "next/image";

export const CONTAINER = "mx-auto w-full max-w-[1180px] px-5 sm:px-6 lg:px-7";

const ASSET_DIR = "/images/support";

/** Figma icon exports from public/images/support. */
export function SupportIcon({
  file,
  size = 20,
  className = "",
}: {
  file: string;
  size?: number;
  className?: string;
}) {
  return (
    <Image
      src={`${ASSET_DIR}/${encodeURIComponent(file)}`}
      alt=""
      width={size}
      height={size}
      className={className}
      style={{ width: size, height: size }}
    />
  );
}

/** Figma tokens → site palette. */
export const PAGE_BG = "#080d1a";
export const BAND_BG = "#0a1020";
export const CARD_BG = "#0b1120";
export const CYAN = "#20E7F2";
export const CYAN_DEEP = "#12c9d4";
export const AMBER = "#E8B768";
export const AMBER_WARN = "#E8944B";
export const GREEN = "#34D399";
export const RED = "#F87171";

export const MONO = "font-[family-name:var(--font-jetbrains)]";
export const DISPLAY = "font-[family-name:var(--font-bricolage)]";

export type Tone = "cyan" | "amber";

/** Short rule + uppercase mono label that opens every section. */
export function Eyebrow({
  children,
  tone = "cyan",
  center = false,
}: {
  children: React.ReactNode;
  tone?: Tone;
  center?: boolean;
}) {
  const color = tone === "amber" ? "text-[#E8B768]" : "text-[#20E7F2]";
  const rule = tone === "amber" ? "bg-[#E8B768]" : "bg-[#20E7F2]";
  return (
    <div className={`flex items-center gap-2 ${center ? "justify-center" : ""}`}>
      <span className={`h-px w-5 shrink-0 opacity-60 ${rule}`} />
      <span
        className={`text-[11px] font-bold uppercase leading-4 tracking-[0.21em] ${MONO} ${color}`}
      >
        {children}
      </span>
    </div>
  );
}

export function SectionTitle({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h2
      className={`text-[clamp(1.85rem,3.5vw,2.5rem)] font-extrabold leading-[1.14] tracking-tight text-slate-100 ${DISPLAY} ${className}`}
    >
      {children}
    </h2>
  );
}

export function SectionLede({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p className={`text-base font-normal leading-7 text-white/55 ${className}`}>
      {children}
    </p>
  );
}

/** Centred eyebrow + title + lede block used by most sections. */
export function SectionHead({
  eyebrow,
  tone = "cyan",
  title,
  lede,
}: {
  eyebrow: string;
  tone?: Tone;
  title: React.ReactNode;
  lede?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <Eyebrow tone={tone} center>
        {eyebrow}
      </Eyebrow>
      <SectionTitle className="mt-3.5 max-w-[820px]">{title}</SectionTitle>
      {lede && <SectionLede className="mt-4 max-w-[620px]">{lede}</SectionLede>}
    </div>
  );
}

/** Left-aligned variant for the split sections (ticket intake, feedback). */
export function SectionHeadLeft({
  eyebrow,
  tone = "cyan",
  title,
  lede,
  className = "",
}: {
  eyebrow: string;
  tone?: Tone;
  title: React.ReactNode;
  lede?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-start ${className}`}>
      <Eyebrow tone={tone}>{eyebrow}</Eyebrow>
      <SectionTitle className="mt-3.5">{title}</SectionTitle>
      {lede && <SectionLede className="mt-4 max-w-[560px]">{lede}</SectionLede>}
    </div>
  );
}

/** Card shell shared by the pathway and knowledge grids. */
export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-white/10 bg-[#0b1120] p-6 transition-colors hover:border-white/20 ${className}`}
    >
      {children}
    </div>
  );
}

/** Square tinted tile that holds a section icon. */
export function IconTile({
  children,
  tone = "cyan",
}: {
  children: React.ReactNode;
  tone?: Tone;
}) {
  const tones = {
    cyan: "bg-[#20E7F2]/10 text-[#20E7F2]",
    amber: "bg-[#E8B768]/12 text-[#E8B768]",
  };
  return (
    <span
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
