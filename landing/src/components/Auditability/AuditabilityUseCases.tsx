import { CONTAINER, SectionHead } from "./shared";

const CASES = [
  {
    label: "Marketing",
    title: "Approval evidence",
    text: "Prove that regulated or brand-sensitive content was reviewed and approved before publishing.",
    evidence: "approval + policy basis",
  },
  {
    label: "Agents",
    title: "AI agent actions",
    text: "Trace what each agent generated, edited, or attempted — bound to role and authority.",
    evidence: "actor + action record",
  },
  {
    label: "Governance",
    title: "Policy blocks",
    text: "Show what was stopped, by which policy, and why — not just what shipped.",
    evidence: "blocked-action record",
  },
  {
    label: "Publishing",
    title: "Publishing proof",
    text: "Preserve the final published artifact alongside its approvals and manifest.",
    evidence: "sealed package",
  },
  {
    label: "Legal",
    title: "Disputes & investigations",
    text: "Reconstruct a disputed event end to end from source event to evidence bundle.",
    evidence: "forensic case",
  },
  {
    label: "Security",
    title: "Privileged activity",
    text: "Log privileged access, identity changes, and exports for security review.",
    evidence: "identity + access log",
  },
];

export default function AuditabilityUseCases() {
  return (
    <section className="bg-[#080d1a] py-20">
      <div className={CONTAINER}>
        <SectionHead
          eyebrow="Where auditability proves itself"
          title="Every material action, evidenced."
        />

        <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CASES.map((c) => (
            <article
              key={c.title}
              className="flex flex-col rounded-xl border border-white/10 bg-[#111827] p-6"
            >
              <span className="text-[10px] font-normal uppercase leading-4 tracking-[0.12em] text-[#20E7F2] font-[family-name:var(--font-jetbrains)]">
                {c.label}
              </span>
              <h3 className="mt-3 text-base font-extrabold leading-5 text-slate-100 font-[family-name:var(--font-bricolage)]">
                {c.title}
              </h3>
              <p className="mt-3 flex-1 text-xs font-normal leading-5 text-white/55">
                {c.text}
              </p>
              <span className="mt-5 text-[10px] font-normal leading-4 text-[#E8B768] font-[family-name:var(--font-jetbrains)]">
                Evidence · {c.evidence}
              </span>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
