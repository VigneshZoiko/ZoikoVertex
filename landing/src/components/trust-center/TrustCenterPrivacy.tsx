import Link from "next/link";
import { FileKey, FileText, Lock } from "lucide-react";
import { Eyebrow, Photo, Pill, SECURITY_MAILTO, SectionLede, SectionTitle } from "./shared";

const CONTROLS: { control: string; covers: string; status: string; architecture?: boolean }[] = [
  {
    control: "Data Processing Agreement",
    covers: "Controller-processor obligations, data subject rights, sub-processing, retention, and security requirements",
    status: "Available",
  },
  {
    control: "Data residency",
    covers: "Customer choice of EU, US, or APAC data residency for primary data storage; replication policy configurable",
    status: "Supported",
  },
  {
    control: "Standard Contractual Clauses",
    covers: "EU SCCs for international personal data transfers; UK IDTA for UK-third country transfers",
    status: "Executed on request",
  },
  {
    control: "Data subject rights",
    covers: "Access, rectification, erasure, portability, restriction, and objection — processed within statutory timelines",
    status: "Operational",
  },
  {
    control: "Data retention",
    covers: "Configurable retention periods per record type and jurisdiction; legal hold functionality; auto-expiry with notification",
    status: "Configurable",
  },
  {
    control: "Subprocessor transparency",
    covers: "Published subprocessor register with category, jurisdiction, and data processing purpose; 30-day change notification",
    status: "Published",
  },
  {
    control: "Data minimisation",
    covers: "Only data required for contracted service scope processed; data classification and handling requirements documented",
    status: "By design",
  },
  {
    control: "Privacy by design",
    covers: "Privacy impact assessments for new features; data minimisation built into workflow architecture; no customer data used for AI model training",
    status: "Architecture",
    architecture: true,
  },
];

export default function TrustCenterPrivacy() {
  return (
    <section id="privacy" className="scroll-mt-24 bg-[#0e1626]">
      <div className="grid lg:grid-cols-[45%_1fr]">
        <div className="relative h-60 sm:h-80 lg:h-auto">
          <Photo slot="privacy" sizes="(max-width: 1024px) 100vw, 45vw" />
        </div>

        <div className="px-4 py-14 sm:px-6 sm:py-16 lg:py-24 lg:pl-14 lg:pr-[max(2rem,calc((100vw-1136px)/2))] xl:pl-[72px]">
          <Eyebrow tone="gold">Data Privacy &amp; Protection</Eyebrow>
          <SectionTitle className="max-w-[420px] text-[clamp(1.6rem,2.6vw,1.75rem)]">
            Your data. Your rules. Our obligations.
          </SectionTitle>
          <SectionLede className="max-w-[420px]">
            ZoikoVertex processes customer data as a data processor. Customers
            remain data controllers for their data. Our privacy architecture
            reflects that relationship — with DPA execution, residency controls,
            and subprocessor transparency at every level.
          </SectionLede>

          {/* Table layout from sm up; stacked rows on phones. */}
          <div className="mt-8" role="table" aria-label="Data privacy controls">
            <div
              role="row"
              className="hidden border-b border-white/10 py-3 text-[9.5px] uppercase tracking-[0.14em] text-white/30 font-[family-name:var(--font-jetbrains)] sm:grid sm:grid-cols-[136px_1fr_128px] sm:gap-4"
            >
              <span role="columnheader">Control</span>
              <span role="columnheader">What it covers</span>
              <span role="columnheader">Status</span>
            </div>
            {CONTROLS.map(({ control, covers, status, architecture }) => (
              <div
                key={control}
                role="row"
                className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1.5 border-b border-white/[0.06] py-4 last:border-b-0 sm:grid-cols-[136px_1fr_128px]"
              >
                <span
                  role="cell"
                  className="text-[11px] leading-4 text-[#20E7F2] font-[family-name:var(--font-jetbrains)]"
                >
                  {control}
                </span>
                <span
                  role="cell"
                  className="col-span-2 row-start-2 text-xs font-light leading-[1.5] text-white/60 sm:col-span-1 sm:row-start-auto"
                >
                  {covers}
                </span>
                <span role="cell" className="col-start-2 row-start-1 sm:col-start-auto sm:row-start-auto">
                  <Pill tone={architecture ? "cyan" : "green"} className="whitespace-nowrap text-[9.5px]">
                    {status}
                  </Pill>
                </span>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <a
              href={SECURITY_MAILTO}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#E8B768] px-7 py-3 text-sm font-bold text-[#080d1a] transition-colors hover:bg-[#E8B768]/90"
            >
              <FileText className="h-3.5 w-3.5" strokeWidth={2.25} />
              Request DPA Execution
            </a>
            <Link
              href="/privacy"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 px-7 py-3 text-sm text-white/90 transition-colors hover:border-white/30"
            >
              <Lock className="h-3.5 w-3.5" strokeWidth={2} />
              Privacy Policy
            </Link>
            <Link
              href="/dpa"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 px-7 py-3 text-sm text-white/90 transition-colors hover:border-white/30"
            >
              <FileKey className="h-3.5 w-3.5" strokeWidth={2} />
              View DPA
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
