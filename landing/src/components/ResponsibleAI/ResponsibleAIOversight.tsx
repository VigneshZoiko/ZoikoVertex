import Link from "next/link";
import { CONTAINER, Eyebrow, Icon, SectionTitle } from "./shared";

const LADDER: { icon: string; tile: string; title: string; text: string }[] = [
  {
    icon: "draftedByAI",
    tile: "border-[#20E7F2]/20 bg-[#20E7F2]/10",
    title: "Drafted by AI",
    text: "AI agent produces output within authorized scope and policy boundaries.",
  },
  {
    icon: "reviewedByOwner",
    tile: "border-amber-500/20 bg-amber-500/10",
    title: "Reviewed by Owner",
    text: "First-pass review against brief accuracy, brand alignment, and policy requirements.",
  },
  {
    icon: "approvedByAuthorizedRole",
    tile: "border-orange-400/25 bg-orange-400/10",
    title: "Approved by Authorized Role",
    text: "Named approver with the correct role and authority gives final sign-off. Identity is bound at the moment of decision.",
  },
  {
    icon: "loggedAndSealed",
    tile: "border-red-500/20 bg-red-500/10",
    title: "Logged and Sealed",
    text: "Decision is evidenced, sealed in the Evidence Vault, and linked to the Audit Trail and Decision Ledger.",
  },
  {
    icon: "publishedOrBlocked",
    tile: "border-green-500/20 bg-green-500/10",
    title: "Published or Blocked",
    text: "Approved work executes. Blocked or rejected work is held with a complete record of the reason and responsible actor.",
  },
];

const RECORDS: {
  icon: string;
  tile: string;
  title: string;
  text: string;
  fields: string;
  chip: string;
}[] = [
  {
    icon: "auditTrail",
    tile: "border-[#20E7F2]/20 bg-[#20E7F2]/10",
    title: "Audit Trail",
    text: "Records what happened: who, what, when, and every state change across the workflow.",
    fields: "event_id · actor · timestamp",
    chip: "border-[#20E7F2]/20 bg-[#20E7F2]/[0.05]",
  },
  {
    icon: "decisionLedger",
    tile: "border-orange-400/25 bg-orange-400/10",
    title: "Decision Ledger",
    text: "Records why: rationale, conditions, policy state, and decision outcome at sign-off.",
    fields: "decision_id · rationale · conditions",
    chip: "border-orange-400/25 bg-orange-400/[0.05]",
  },
  {
    icon: "evidenceVault",
    tile: "border-red-500/20 bg-red-500/10",
    title: "Evidence Vault",
    text: "Seals proof: prompts, outputs, approvals, policy results, and version references.",
    fields: "sealed · versioned · exportable",
    chip: "border-red-500/20 bg-red-500/[0.05]",
  },
  {
    icon: "forensicHub",
    tile: "border-violet-500/20 bg-violet-500/10",
    title: "Forensic Hub",
    text: "Investigates incidents: escalations, overrides, security events, and policy breaches.",
    fields: "incident_id · severity · chain",
    chip: "border-violet-500/20 bg-violet-500/[0.05]",
  },
  {
    icon: "identityLedger",
    tile: "border-green-500/20 bg-green-500/10",
    title: "Identity Ledger",
    text: "Binds identity: which human or agent acted, under which role, with which authority.",
    fields: "identity · role · authority",
    chip: "border-green-500/20 bg-green-500/[0.05]",
  },
];

export default function ResponsibleAIOversight() {
  return (
    <section className={`${CONTAINER} py-20`}>
      <Eyebrow>Human Oversight &amp; Evidence</Eyebrow>

      <SectionTitle className="mt-6 max-w-[480px]">
        Responsible AI routes the right actions to the right humans at the right
        time.
      </SectionTitle>

      <div className="mt-12 grid gap-10 lg:grid-cols-2">
        {/* ── Approval ladder ─────────────────────────────────────── */}
        <div>
          <Eyebrow>Approval ladder</Eyebrow>

          <ol className="mt-7 overflow-hidden rounded-xl border border-white/10">
            {LADDER.map(({ icon, tile, title, text }, i) => (
              <li
                key={title}
                className="flex gap-4 border-b border-white/10 bg-[#111827] px-5 py-6 last:border-b-0"
              >
                <span className="w-6 shrink-0 text-xl font-extrabold leading-5 text-[#20E7F2]/10 font-[family-name:var(--font-bricolage)]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${tile}`}
                >
                  <Icon name={icon} size={14} />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-white/90 font-[family-name:var(--font-bricolage)]">
                    {title}
                  </span>
                  <span className="mt-1.5 block text-xs font-light leading-4 text-white/50">
                    {text}
                  </span>
                </span>
              </li>
            ))}
          </ol>

          <Link
            href="/approval-workflows"
            className="mt-7 inline-flex items-center gap-2.5 rounded-full border border-white/10 px-7 py-3 text-sm font-normal text-white/90 transition-colors hover:border-white/30"
          >
            <Icon name="exploreApprovalWorkflows" size={14} />
            Explore Approval Workflows
          </Link>
        </div>

        {/* ── Evidence records ────────────────────────────────────── */}
        <div>
          <Eyebrow>Evidence records per decision</Eyebrow>

          <div className="mt-6 space-y-3">
            {RECORDS.map(({ icon, tile, title, text, fields, chip }, i) => (
              <article
                key={title}
                className="rounded-xl border border-white/10 bg-[#111827] p-5"
              >
                <div className="flex gap-4">
                  <span className="w-6 shrink-0 text-lg font-extrabold leading-4 text-orange-400/10 font-[family-name:var(--font-bricolage)]">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md border ${tile}`}
                  >
                    <Icon name={icon} size={14} />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-white/90 font-[family-name:var(--font-bricolage)]">
                      {title}
                    </h3>
                    <p className="mt-2 text-xs font-light leading-5 text-white/50">
                      {text}
                    </p>
                    <span
                      className={`mt-3 inline-flex items-center rounded-full border px-3 py-1 text-[9.5px] font-medium text-[#20E7F2] font-[family-name:var(--font-jetbrains)] ${chip}`}
                    >
                      {fields}
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <Link
            href="/auditability"
            className="mt-7 inline-flex items-center gap-2 text-xs font-medium text-white/50 transition-colors hover:text-white/90 font-[family-name:var(--font-jetbrains)]"
          >
            <Icon name="viewAuditability" size={12} />
            View Auditability
          </Link>
        </div>
      </div>
    </section>
  );
}
