/**
 * Server-safe presentational primitives and layout constants.
 *
 * Deliberately NOT a "use client" module: server components interpolate
 * CONTAINER into className strings, and a client module would hand them a
 * client reference instead of the string, silently dropping every class.
 */

/**
 * Figma grid: 1440 frame, content column 1072px wide inset 184px each side.
 * 1136 + 32px padding each side lands on exactly that at desktop widths.
 */
export const CONTAINER = "mx-auto w-full max-w-[1136px] px-4 sm:px-6 lg:px-8";

/** The pre-publication band sits on the wider 1160px / 140px inset grid. */
export const CONTAINER_WIDE = "mx-auto w-full max-w-[1224px] px-4 sm:px-6 lg:px-8";

/* ── Section chrome ──────────────────────────────────────────────── */

type BadgeTone = "cyan" | "gray" | "amber" | "violet" | "green";

const BADGE_TONES: Record<BadgeTone, string> = {
  cyan: "bg-[#20E7F2]/[0.06] text-[#0d8d9a] border-[#20E7F2]/30",
  gray: "bg-gray-100 text-gray-500 border-gray-300",
  amber: "bg-amber-500/10 text-amber-600 border-amber-500/25",
  violet: "bg-violet-500/10 text-violet-600 border-violet-500/25",
  green: "bg-green-500/10 text-green-600 border-green-500/25",
};

export function SectionBadge({
  label,
  tone = "gray",
}: {
  label: string;
  tone?: BadgeTone;
}) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-1 text-[10px] font-medium font-[family-name:var(--font-jetbrains)] ${BADGE_TONES[tone]}`}
    >
      {label}
    </span>
  );
}

export function SectionHeader({
  id,
  num,
  title,
  badge,
}: {
  id: string;
  num: number;
  title: string;
  badge?: { label: string; tone?: BadgeTone };
}) {
  return (
    <header className="border-t border-slate-200 pt-8">
      <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-gray-400 font-[family-name:var(--font-jetbrains)]">
        Section {String(num).padStart(2, "0")}
      </p>
      <div className="mt-2.5 flex flex-wrap items-center gap-3">
        <h2
          id={id}
          className="scroll-mt-28 text-[clamp(1.15rem,2.4vw,1.35rem)] font-extrabold tracking-tight text-slate-900 font-[family-name:var(--font-bricolage)]"
        >
          {title}
        </h2>
        {badge && <SectionBadge label={badge.label} tone={badge.tone} />}
      </div>
    </header>
  );
}

export function Lede({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-6 text-[15px] font-light leading-[1.85] text-slate-700">
      {children}
    </p>
  );
}

export function Callout({
  tone,
  lead,
  children,
}: {
  tone: "cyan" | "green" | "amber";
  lead: string;
  children: React.ReactNode;
}) {
  // Figma: white fill, accent border on all four sides, 3px on the left.
  const tones = {
    cyan: "border-[#20E7F2]",
    green: "border-green-500",
    amber: "border-amber-400",
  };
  return (
    <div
      className={`mt-6 rounded-r-xl border border-l-[3px] bg-white px-5 py-4 sm:px-6 sm:py-5 ${tones[tone]}`}
    >
      <p className="text-[13.5px] font-light leading-[1.7] text-slate-700">
        <span className="font-semibold text-slate-900">{lead}</span> {children}
      </p>
    </div>
  );
}

export function Bullets({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="mt-6 space-y-3.5">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-3">
          <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#20E7F2]" />
          <span className="text-[13.5px] font-light leading-[1.7] text-slate-700">
            {item}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function DataTable({
  headers,
  rows,
  minWidth = 720,
}: {
  headers: string[];
  rows: React.ReactNode[][];
  minWidth?: number;
}) {
  return (
    <div className="mt-7 overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full border-collapse" style={{ minWidth }}>
        <thead>
          <tr className="bg-gray-100">
            {headers.map((h) => (
              <th
                key={h}
                className="whitespace-nowrap border border-slate-200 px-4 py-2.5 text-left text-[10px] font-medium uppercase tracking-[0.14em] text-gray-400 font-[family-name:var(--font-jetbrains)]"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="bg-white transition-colors hover:bg-gray-50/70">
              {row.map((cell, j) => (
                <td
                  key={j}
                  className={`border border-slate-200 px-4 py-3.5 align-top text-[13px] leading-[1.55] text-slate-700 ${
                    j === 0 ? "font-medium text-slate-800" : "font-light"
                  }`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
