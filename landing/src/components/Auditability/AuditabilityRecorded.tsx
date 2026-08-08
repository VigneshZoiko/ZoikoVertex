import { CONTAINER, Eyebrow, SectionLede, SectionTitle } from "./shared";

const ROWS = [
  {
    cls: "Governance audit events",
    stored:
      "Event ID, tenant, actor, action, object, timestamp, status, risk, policy, evidence links, hash references",
    retention: "7-year default for governance-grade records",
  },
  {
    cls: "Decision records",
    stored:
      "Decision ID, rationale reference, approver, policy basis, review stage, timestamp",
    retention: "7 years or match contract / legal hold",
  },
  {
    cls: "Evidence records",
    stored:
      "Prompt/output snapshots, approvals, final content, export manifest, package hash, retention class",
    retention: "7 years where evidence-linked; shorter for drafts",
  },
  {
    cls: "Identity / access records",
    stored:
      "Role at time of action, MFA state, session, privileged access, permission changes",
    retention: "2–7 years by risk and privilege",
  },
  {
    cls: "Forensic case records",
    stored:
      "Case timeline, source event, evidence bundle, investigator notes, outcome",
    retention: "7 years after closure or legal hold",
  },
  {
    cls: "Export & access records",
    stored:
      "Export reason, exported by, recipient/destination, manifest hash, access history",
    retention: "7 years for audit-sensitive exports",
  },
];

export default function AuditabilityRecorded() {
  return (
    <section className="bg-[#0b1120] py-20">
      <div className={CONTAINER}>
        <div className="flex max-w-[640px] flex-col gap-3.5 pt-2">
          <Eyebrow>What gets recorded</Eyebrow>
          <SectionTitle>Only what makes an action defensible.</SectionTitle>
          <SectionLede className="max-w-[556px]">
            Governance-grade records capture enough to prove accountability —
            without over-collecting. Retention is set by class, contract, and
            lawful requirement.
          </SectionLede>
        </div>

        <div className="mt-8 overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full border-collapse" style={{ minWidth: 880 }}>
            <thead>
              <tr className="bg-[#131c2e]">
                {["Data class", "What is stored", "Retention position"].map((h) => (
                  <th
                    key={h}
                    className="border-b border-r border-white/10 px-5 py-4 text-left text-xs font-normal uppercase leading-4 tracking-wider text-white/55 last:border-r-0 font-[family-name:var(--font-jetbrains)]"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r) => (
                <tr key={r.cls} className="align-top">
                  <td className="border-b border-r border-white/10 px-5 py-4 text-sm font-bold leading-5 text-slate-100">
                    {r.cls}
                  </td>
                  <td className="border-b border-r border-white/10 px-5 py-4 text-xs font-normal leading-4 text-white/55 font-[family-name:var(--font-jetbrains)]">
                    {r.stored}
                  </td>
                  <td className="border-b border-white/10 px-5 py-4 text-xs font-normal leading-4 text-[#E8B768] font-[family-name:var(--font-jetbrains)]">
                    {r.retention}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
