import { CONTAINER, SectionHead } from "./shared";

const SURFACES = [
  {
    n: "01",
    name: "Audit Trail",
    question: "What happened?",
    text: "A chronological record of human, AI, workflow, policy, integration, and system events.",
  },
  {
    n: "02",
    name: "Decision Ledger",
    question: "Why was it decided?",
    text: "A structured record of rationale, approvals, policy basis, and human judgment.",
  },
  {
    n: "03",
    name: "Evidence Vault",
    question: "What proof exists?",
    text: "Sealed packages of prompts, outputs, approvals, published content, policies, and manifests.",
  },
  {
    n: "04",
    name: "Forensic Hub",
    question: "What can be reconstructed?",
    text: "Case-based reconstruction of flagged, disputed, escalated, or high-risk events.",
  },
  {
    n: "05",
    name: "Identity Ledger",
    question: "Who acted, with what authority?",
    text: "Role, session, permission, MFA, and privileged-action records linked to audit events.",
  },
];

export default function AuditabilitySurfaces() {
  return (
    <section className="bg-[#080d1a] py-20">
      <div className={CONTAINER}>
        <SectionHead
          eyebrow="Five-surface evidence model"
          tone="amber"
          title="A system of connected records — not a flat log."
          lede="Auditability is five linked surfaces. Each answers a distinct question, and every event threads through them."
        />

        <div className="mt-12 grid overflow-hidden rounded-2xl border border-white/25 sm:grid-cols-2 lg:grid-cols-5">
          {SURFACES.map((s, i) => (
            <div
              key={s.n}
              className="relative flex flex-col gap-2 border-b border-white/10 px-5 pt-6 pb-10 last:border-b-0 sm:border-r sm:nth-[2n]:border-r-0 lg:border-b-0 lg:border-r lg:nth-[2n]:border-r lg:last:border-r-0"
            >
              <span className="text-xs font-normal leading-4 tracking-wide text-[#E8B768] font-[family-name:var(--font-jetbrains)]">
                Surface {s.n}
              </span>
              <h3 className="text-base font-extrabold leading-5 text-slate-100 font-[family-name:var(--font-bricolage)]">
                {s.name}
              </h3>
              <p className="text-xs font-normal leading-4 tracking-tight text-[#20E7F2] font-[family-name:var(--font-jetbrains)]">
                {s.question}
              </p>
              <p className="text-xs font-normal leading-5 text-white/55">
                {s.text}
              </p>

              {/* Threading arrow between surfaces */}
              {i < SURFACES.length - 1 && (
                <span
                  aria-hidden
                  className="absolute right-0 top-[38px] hidden h-4 w-4 translate-x-1/2 items-center justify-center bg-[#080d1a] text-xs leading-4 text-[#20E7F2] lg:flex"
                >
                  →
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
