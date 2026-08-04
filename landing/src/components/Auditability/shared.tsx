import Image from "next/image";

/**
 * Server-safe primitives — deliberately NOT "use client", so server components
 * can interpolate CONTAINER into className strings.
 *
 * Figma grid: 1440 frame, max-w 1180 with 28px inset → 1124px content column.
 */
export const CONTAINER = "mx-auto w-full max-w-[1180px] px-5 sm:px-6 lg:px-7";

const ASSET_DIR = "/images/auditability";

/** Figma tokens → site palette. */
export const CYAN = "#20E7F2";
export const AMBER = "#E8B768";

/**
 * Photography slots. Drop files into public/images/auditability/ and set the
 * filename here; until then each slot renders its gradient panel alone.
 */
export const IMAGES: Record<string, string | null> = {
  hero: "hero.png",
};

/**
 * Figma icon exports. The files are named after the glyph each one draws,
 * so the map below records which slot uses which.
 */
const ICON_FILE: Record<string, string> = {
  // Section 06 — Enterprise controls
  retentionClasses: "◷.png", // clock quadrant
  legalHolds: "⚖.png", // scales
  roleBasedAccess: "◐.png", // half-filled circle
  redaction: "▨.png", // hatched square
  exportManifests: "⇱.png", // arrow to corner
  tamperEvident: "◆.png", // filled diamond
  // Section 09 — Prove it to your committee
  demo: "▶.png", // play
  brief: "▤.png", // lined document
  roiAudit: "◈.png", // diamond outline
};

export function Icon({
  name,
  size = 16,
  className = "",
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const file = ICON_FILE[name];
  if (!file) return null;
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

export function BackdropImage({
  slot,
  className = "",
  priority = false,
  sizes = "100vw",
}: {
  slot: string;
  className?: string;
  priority?: boolean;
  sizes?: string;
}) {
  const file = IMAGES[slot];
  if (!file) return null;
  return (
    <Image
      src={`${ASSET_DIR}/${encodeURIComponent(file)}`}
      alt=""
      fill
      priority={priority}
      sizes={sizes}
      className={`object-cover ${className}`}
    />
  );
}

/** Short rule + uppercase mono label that opens every section. */
export function Eyebrow({
  children,
  tone = "cyan",
  center = false,
}: {
  children: React.ReactNode;
  tone?: "cyan" | "amber";
  center?: boolean;
}) {
  const color = tone === "amber" ? "text-[#E8B768]" : "text-[#20E7F2]";
  const rule = tone === "amber" ? "bg-[#E8B768]" : "bg-[#20E7F2]";
  return (
    <div className={`flex items-center gap-2 ${center ? "justify-center" : ""}`}>
      <span className={`h-px w-5 shrink-0 opacity-60 ${rule}`} />
      <span
        className={`text-[11px] font-bold uppercase leading-4 tracking-[0.21em] font-[family-name:var(--font-jetbrains)] ${color}`}
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
      className={`text-[clamp(1.85rem,3.5vw,2.5rem)] font-extrabold leading-[1.14] tracking-tight text-slate-100 font-[family-name:var(--font-bricolage)] ${className}`}
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
    <p
      className={`text-base font-normal leading-7 text-white/55 ${className}`}
    >
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
  tone?: "cyan" | "amber";
  title: React.ReactNode;
  lede?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <Eyebrow tone={tone} center>
        {eyebrow}
      </Eyebrow>
      <SectionTitle className="mt-3.5 max-w-[820px]">{title}</SectionTitle>
      {lede && (
        <SectionLede className="mt-4 max-w-[620px]">{lede}</SectionLede>
      )}
    </div>
  );
}

/** Small mono chip used for surface names, tags, and record fields. */
export function Chip({
  children,
  tone = "muted",
}: {
  children: React.ReactNode;
  tone?: "muted" | "cyan" | "amber";
}) {
  const tones = {
    muted: "border-white/10 bg-white/[0.02] text-white/70",
    cyan: "border-[#20E7F2]/30 bg-[#20E7F2]/[0.06] text-[#20E7F2]",
    amber: "border-[#E8B768]/30 bg-[#E8B768]/[0.06] text-[#E8B768]",
  };
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2.5 py-1.5 text-xs font-normal leading-4 font-[family-name:var(--font-jetbrains)] ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
