import Image from "next/image";

/**
 * Server-safe primitives and layout constants — deliberately NOT "use client",
 * so server components can interpolate CONTAINER into className strings.
 *
 * Figma grid: 1440 frame, 1072px content column inset 184px each side.
 */
export const CONTAINER = "mx-auto w-full max-w-[1136px] px-4 sm:px-6 lg:px-8";

const ASSET_DIR = "/images/responsible-ai";

/**
 * Background photography slots. Drop files into
 * public/images/responsible-ai/ using these names and they appear
 * automatically; until then each slot renders its gradient panel alone.
 */
export const IMAGES: Record<string, string | null> = {
  hero: "hero-bg.png",
  principles: "Responsible-AI-governance-commitments.png",
  riskLow: "1d.png",
  riskMedium: "2d.png",
  riskHigh: "3d.png",
  riskCritical: "4d.png",
  privacy: "Data-protection-privacy-controls.png",
  faq: "Enterprise-governance-review.png",
  finalCta: "cta-bg.png",
};

/** Renders the photo layer only when an asset has been supplied. */
export function BackdropImage({
  slot,
  className = "",
  priority = false,
  sizes = "100vw",
}: {
  slot: keyof typeof IMAGES | string;
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

/**
 * Figma icon exports live in public/images/responsible-ai as "Icon (n).png".
 * Mapped here by what each glyph depicts, so a slot can be re-pointed in one
 * place. Colours are baked into the PNGs.
 */
const ICON_FILE: Record<string, string> = {
  // Pillars
  policyGuardrails: "Policy-Guardrails.png",
  humanOversight: "Human-Oversight.png",
  evidenceLayer: "Evidence-Layer.png",
  roleBasedAuthority: "Role-Based-Authority.png",
  riskClassification: "Risk-Classification.png",
  exportableGovernance: "Exportable-Governance.png",
  // Principles
  boundedAutonomy: "Bounded-Autonomy.png",
  humanAccountability: "Human-Accountability.png",
  evidenceByDefault: "Evidence-by- Default.png",
  noBlackBoxExecution: "No-Black-Box-Execution.png",
  dataMinimization: "Data-Minimization.png",
  continuousAssurance: "Continuous- Assurance.png",
  // Approval ladder
  draftedByAI: "Drafted-by-AI.png",
  reviewedByOwner: "Reviewed-by-Owner.png",
  approvedByAuthorizedRole: "Approved-by-Authorized-Role.png",
  loggedAndSealed: "Logged-and-Sealed.png",
  publishedOrBlocked: "Published-or-Blocked.png",
  // Evidence records
  auditTrail: "Audit-Trail.png",
  decisionLedger: "Decision-Ledger.png",
  evidenceVault: "Evidence-Vault.png",
  forensicHub: "Forensic-Hub.png",
  identityLedger: "Identity-Ledger.png",
  // Data protection
  encryptionAccessControls: "Encryption-Access-Controls.png",
  retentionLegalHolds: "Retention-Legal-Holds.png",
  userRights: "User-Rights.png",
  // Lifecycle
  define: "Define.png",
  govern: "Govern.png",
  execute: "Execute.png",
  review: "Review.png",
  record: "Record.png",
  monitor: "Monitor.png",
  improve: "Improve.png",
  // Link affordances
  exploreApprovalWorkflows: "Explore-Approval-Workflows.png",
  viewAuditability: "View-Auditability.png",
};
export type IconName = keyof typeof ICON_FILE;

/** Renders a Figma-exported icon at the given pixel size. */
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

/** Cyan rule + uppercase mono label used above every section heading. */
export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="h-px w-3.5 shrink-0 bg-[#20E7F2]" />
      <span className="text-[11.5px] font-medium uppercase tracking-[0.14em] text-[#20E7F2] font-[family-name:var(--font-jetbrains)]">
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
      className={`text-[clamp(1.9rem,3.6vw,2.6rem)] font-extrabold leading-[1.12] tracking-tight text-white/90 font-[family-name:var(--font-bricolage)] ${className}`}
    >
      {children}
    </h2>
  );
}

export function SectionLede({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-6 max-w-[560px] text-[15px] font-light leading-[1.85] text-white/50">
      {children}
    </p>
  );
}

/** Faint gradient hairline separating full-bleed sections. */
export function Divider() {
  return (
    <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />
  );
}

/** Small pill used on principle cards. */
export function ProductControlTag({ label = "Product control" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-400/25 bg-orange-400/[0.05] px-2.5 py-1 text-[9.5px] font-medium uppercase tracking-[0.12em] text-[#20E7F2] font-[family-name:var(--font-jetbrains)]">
      <span className="h-1 w-1 rounded-full bg-[#20E7F2]" />
      {label}
    </span>
  );
}
