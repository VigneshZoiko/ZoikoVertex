import Image from "next/image";
import type { LucideIcon } from "lucide-react";

/**
 * Server-safe primitives and layout constants for the Trust Center page.
 *
 * Figma grid: 1440 frame, 1072px content column inset 184px each side.
 */
export const CONTAINER = "mx-auto w-full max-w-[1136px] px-4 sm:px-6 lg:px-8";

export const SECURITY_EMAIL = "security@zoikovertex.com";
export const SECURITY_MAILTO = `mailto:${SECURITY_EMAIL}`;

const ASSET_DIR = "/images/trustcenter";

/** Photography in public/images/trustcenter (WebP, compressed). */
const IMAGES = {
  hero: "hero.webp",
  // Security architecture cards
  dataEncryption: "security-data-encryption.webp",
  networkSecurity: "security-network.webp",
  applicationSecurity: "security-application.webp",
  incidentResponse: "security-incident-response.webp",
  vulnerabilityManagement: "security-vulnerability-management.webp",
  peopleSecurity: "security-people.webp",
  // Split sections
  privacy: "data-privacy.webp",
  infrastructure: "infrastructure-reliability.webp",
  // Audit engine bento
  auditTrail: "audit-trail.webp",
  decisionLedger: "decision-ledger.webp",
  evidenceVault: "evidence-vault.webp",
  forensicHub: "forensic-hub.webp",
  identityLedger: "identity-ledger.webp",
  evidenceExports: "evidence-exports.webp",
  // FAQ side card
  securityReview: "security-review.webp",
} as const;

export type ImageSlot = keyof typeof IMAGES;

/** Fills its (relative) parent with a cover-fit photo. */
export function Photo({
  slot,
  className = "",
  priority = false,
  sizes = "100vw",
}: {
  slot: ImageSlot;
  className?: string;
  priority?: boolean;
  sizes?: string;
}) {
  return (
    <Image
      src={`${ASSET_DIR}/${encodeURIComponent(IMAGES[slot])}`}
      alt=""
      fill
      priority={priority}
      sizes={sizes}
      className={`object-cover ${className}`}
    />
  );
}

/**
 * Accent palette. Class strings are written out in full so Tailwind can
 * detect them at build time.
 */
export const TONES = {
  cyan: {
    text: "text-[#20E7F2]",
    tile: "bg-[#20E7F2]/10 border-[#20E7F2]/20",
    pill: "bg-[#20E7F2]/[0.06] border-[#20E7F2]/20",
    bar: "bg-[#20E7F2]",
  },
  green: {
    text: "text-[#22C55E]",
    tile: "bg-[#22C55E]/10 border-[#22C55E]/20",
    pill: "bg-[#22C55E]/[0.08] border-[#22C55E]/25",
    bar: "bg-[#22C55E]",
  },
  gold: {
    text: "text-[#E8B768]",
    tile: "bg-[#E8B768]/10 border-[#E8B768]/25",
    pill: "bg-[#E8B768]/[0.08] border-[#E8B768]/25",
    bar: "bg-[#E8B768]",
  },
  amber: {
    text: "text-[#F59E0B]",
    tile: "bg-[#F59E0B]/10 border-[#F59E0B]/25",
    pill: "bg-[#F59E0B]/[0.08] border-[#F59E0B]/25",
    bar: "bg-[#F59E0B]",
  },
  violet: {
    text: "text-[#A78BFA]",
    tile: "bg-[#A78BFA]/10 border-[#A78BFA]/25",
    pill: "bg-[#A78BFA]/[0.08] border-[#A78BFA]/25",
    bar: "bg-[#A78BFA]",
  },
  red: {
    text: "text-[#F87171]",
    tile: "bg-[#F87171]/10 border-[#F87171]/20",
    pill: "bg-[#F87171]/[0.08] border-[#F87171]/20",
    bar: "bg-[#F87171]",
  },
} as const;

export type Tone = keyof typeof TONES;

/** Rule + uppercase mono label used above every section heading. */
export function Eyebrow({
  children,
  tone = "cyan",
}: {
  children: React.ReactNode;
  tone?: Tone;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className={`h-[1.5px] w-3.5 shrink-0 ${TONES[tone].bar}`} />
      <span
        className={`text-[11.5px] font-medium uppercase tracking-[0.14em] font-[family-name:var(--font-jetbrains)] ${TONES[tone].text}`}
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
      className={`mt-4 text-[clamp(1.9rem,3.6vw,2.6rem)] font-extrabold leading-[1.1] tracking-tight text-white/90 font-[family-name:var(--font-bricolage)] ${className}`}
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
      className={`mt-5 max-w-[540px] text-[15px] font-light leading-[1.8] text-white/50 ${className}`}
    >
      {children}
    </p>
  );
}

/** Rounded, tinted square holding a lucide icon. */
export function IconTile({
  icon: Icon,
  tone = "cyan",
  size = "md",
}: {
  icon: LucideIcon;
  tone?: Tone;
  size?: "sm" | "md" | "lg";
}) {
  const box =
    size === "sm" ? "h-8 w-8 rounded-lg" : size === "lg" ? "h-[52px] w-[52px] rounded-xl" : "h-10 w-10 rounded-lg";
  const glyph = size === "lg" ? "h-5 w-5" : size === "sm" ? "h-4 w-4" : "h-[18px] w-[18px]";
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center border ${box} ${TONES[tone].tile}`}
    >
      <Icon className={`${glyph} ${TONES[tone].text}`} strokeWidth={1.75} />
    </span>
  );
}

/** Small rounded mono pill (status badges, tags). */
export function Pill({
  children,
  tone = "cyan",
  icon: Icon,
  className = "",
}: {
  children: React.ReactNode;
  tone?: Tone;
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-[3px] text-[10px] font-medium font-[family-name:var(--font-jetbrains)] ${TONES[tone].pill} ${TONES[tone].text} ${className}`}
    >
      {Icon && <Icon className="h-2.5 w-2.5" strokeWidth={2.25} />}
      {children}
    </span>
  );
}

/** Faint gradient hairline separating full-bleed sections. */
export function Divider() {
  return (
    <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />
  );
}
