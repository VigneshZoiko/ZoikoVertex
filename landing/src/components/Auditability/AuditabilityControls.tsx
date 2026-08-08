import { CONTAINER, Icon, SectionHead } from "./shared";

const CONTROLS: {
  icon: string;
  title: string;
  text: string;
  tag: string;
  tone: "amber" | "cyan" | "muted";
}[] = [
  {
    icon: "retentionClasses",
    title: "Retention classes",
    text: "Records retained by class, contract, and lawful requirement — with defaults for governance-grade evidence.",
    tag: "Held",
    tone: "amber",
  },
  {
    icon: "legalHolds",
    title: "Legal holds",
    text: "Preserve evidence during disputes, investigations, and regulatory requests; suspend deletion where required.",
    tag: "On hold",
    tone: "amber",
  },
  {
    icon: "roleBasedAccess",
    title: "Role-based access",
    text: "Scope who can view, export, and act on audit records across tenants and workspaces.",
    tag: "◆ Role-bound",
    tone: "amber",
  },
  {
    icon: "redaction",
    title: "Redaction",
    text: "Protect sensitive fields in exports and reviews without breaking the integrity of the record.",
    tag: "Redacted",
    tone: "muted",
  },
  {
    icon: "exportManifests",
    title: "Export manifests",
    text: "Controlled bundles with reason, recipient, manifest, and hash — every export logged as a new audit event.",
    tag: "Exported",
    tone: "cyan",
  },
  {
    icon: "tamperEvident",
    title: "Tamper-evident verification",
    text: "Hash references let reviewers verify that an evidence package has not been altered since sealing.",
    tag: "▤ Sealed",
    tone: "muted",
  },
];

const TAG_TONES = {
  amber: "border-[#E8B768]/30 bg-[#E8B768]/[0.06] text-[#E8B768]",
  cyan: "border-[#20E7F2]/30 bg-[#20E7F2]/[0.06] text-[#20E7F2]",
  muted: "border-white/15 bg-white/[0.03] text-white/60",
};

export default function AuditabilityControls() {
  return (
    <section className="bg-[#0a0f1c] py-20">
      <div className={CONTAINER}>
        <SectionHead
          eyebrow="Enterprise controls"
          tone="amber"
          title="Records that legal and security can rely on."
          lede="The controls procurement asks about — retention, holds, access, redaction, export, and tamper evidence — built in, not bolted on."
        />

        <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CONTROLS.map(({ icon, title, text, tag, tone }) => (
            <article
              key={title}
              className="flex flex-col rounded-xl border border-white/10 bg-[#111827] p-6"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#E8B768]/20 bg-[#E8B768]/[0.08]">
                <Icon name={icon} size={16} />
              </span>

              <h3 className="mt-6 text-base font-extrabold leading-5 text-slate-100 font-[family-name:var(--font-bricolage)]">
                {title}
              </h3>
              <p className="mt-3 flex-1 text-xs font-normal leading-5 text-white/55">
                {text}
              </p>
              <span
                className={`mt-5 inline-flex w-fit items-center rounded-md border px-2 py-1 text-[10px] font-bold leading-4 tracking-wide font-[family-name:var(--font-jetbrains)] ${TAG_TONES[tone]}`}
              >
                {tag}
              </span>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
