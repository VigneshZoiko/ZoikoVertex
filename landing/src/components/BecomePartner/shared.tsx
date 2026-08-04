import Image from "next/image";

/**
 * Server-safe primitives for the partner application.
 *
 * Figma grid: 1440 frame — 720px form card + 40px gutter + 384px rail = 1144.
 */
export const CONTAINER = "mx-auto w-full max-w-[1144px] px-5 sm:px-6";

export const STEPS = [
  { n: 1, label: "Company & contact" },
  { n: 2, label: "Partner type & market focus" },
  { n: 3, label: "Capability & technical fit" },
  { n: 4, label: "Commercial intent & consent" },
];

/** Uppercase mono divider that opens each fieldset. */
export function FieldsetLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-5 border-b border-slate-300 pb-1.5 text-[9.6px] font-medium uppercase tracking-wide text-gray-400 font-[family-name:var(--font-jetbrains)]">
      {children}
    </p>
  );
}

/** Label row: name + required marker on the left, mono hint on the right. */
export function FieldLabel({
  htmlFor,
  children,
  required = false,
  hint,
}: {
  htmlFor: string;
  children: React.ReactNode;
  required?: boolean;
  hint?: string;
}) {
  return (
    <div className="mb-2 flex items-baseline justify-between gap-3">
      <label
        htmlFor={htmlFor}
        className="text-xs font-medium text-slate-700"
      >
        {children}
        {required && <span className="ml-1 text-rose-500">*</span>}
      </label>
      {hint && (
        <span className="shrink-0 text-[9.6px] font-medium text-gray-400 font-[family-name:var(--font-jetbrains)]">
          {hint}
        </span>
      )}
    </div>
  );
}

export const INPUT_CLASS =
  "w-full rounded-[10px] border border-slate-300 bg-slate-100 px-4 py-3 text-sm text-slate-900 outline-none transition-colors placeholder:text-gray-400 focus:border-[#20E7F2] focus:ring-2 focus:ring-[#20E7F2]/25";

/* ── Figma icon exports ──────────────────────────────────────────── */

const ASSET_DIR = "/images/become-partner";

const ICON_FILE: Record<string, string> = {
  companyContact: "Company-contact.png", // form card header
  yourApplication: "your-application.png", // rail card 1
  partnerReviewProcess: "partner-review-process.png", // rail card 2
  selectiveProgram: "selective-program.png", // rail card 3
  apply: "apply.png", // "Apply" step badge glyph
  warning: "warning.png", // privacy notice
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
